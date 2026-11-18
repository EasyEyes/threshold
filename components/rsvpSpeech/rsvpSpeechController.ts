import { PcmMicrophoneCapture } from "../speech/audioCapture";
import { GoogleChirp3Transcriber } from "../speech/googleChirp3Transcriber";
import {
  DeepgramRealtimeTranscriber,
  type DeepgramRealtimeTranscriberOptions,
} from "../speech/deepgramRealtimeTranscriber";
import {
  ElevenLabsRealtimeTranscriber,
  type ElevenLabsRealtimeTranscriberOptions,
} from "../speech/elevenLabsRealtimeTranscriber";
import { openMicrophone, type MicrophoneSession } from "../speech/microphone";
import {
  SpeechSession,
  type SpeechSessionState,
  type SpeechUtteranceResult,
  type SpeechSessionListener,
} from "../speech/speechSession";
import { EnergyVoiceActivityDetector } from "../speech/vad";
import {
  RSVP_SPEECH_SILENCE_MS,
  RSVP_SPEECH_CONFIRMATION_MS,
  RSVP_SPEECH_FINISH_PHRASE,
  stripRsvpSpeechFinishPhrase,
  hasAllRsvpSpeechTargets,
} from "./rsvpSpeechFinish";
import {
  createSpeechTokenProvider,
  createSpeechCredentialProvider,
  type SpeechProvider,
  type SpeechTokenRequestContext,
} from "../speech/speechToken";
import type {
  PcmAudioChunk,
  StreamingTranscriber,
} from "../speech/transcriber";

export type RsvpSpeechControllerState =
  | "idle"
  | "preparing"
  | "ready"
  | "capturing"
  | "finalizing"
  | "completed"
  | "failed"
  | "closed";

export type RsvpSpeechControllerErrorCode =
  | "invalidConfiguration"
  | "invalidState"
  | "preparationFailed"
  | "captureFailed"
  | "transcriptionFailed"
  | "closed";

export class RsvpSpeechControllerError extends Error {
  readonly code: RsvpSpeechControllerErrorCode;
  readonly originalError?: unknown;

  constructor(
    code: RsvpSpeechControllerErrorCode,
    message: string,
    originalError?: unknown,
  ) {
    super(message);
    this.name = "RsvpSpeechControllerError";
    this.code = code;
    this.originalError = originalError;
  }
}

export interface RsvpSpeechTrialConfiguration {
  readonly utteranceId: string;
  readonly provider: SpeechProvider;
  readonly targetWords: readonly string[];
  readonly languageCode: string;
  readonly targetKeytermBiasEnabled: boolean;
  readonly maximumResponseDurationMs: number;
  readonly finalizationTimeoutMs?: number;
  readonly deepgramEndpointingMs?: number;
  readonly responseSilenceMs?: number;
  readonly finishPhrase?: string;
  readonly ignoreWordOrder?: boolean;
  readonly requestTokenContext: () => SpeechTokenRequestContext;
}

export interface RsvpSpeechCapturePort {
  initialize(): Promise<void>;
  startInput(): void;
  start(): void;
  stop(): void;
  subscribe(listener: (chunk: PcmAudioChunk) => void): () => void;
  close(): Promise<void>;
}

export interface RsvpSpeechSessionPort {
  readonly state: SpeechSessionState;
  connect(): Promise<unknown>;
  beginUtterance(utteranceId: string): Promise<SpeechUtteranceResult>;
  pushAudio(chunk: PcmAudioChunk): boolean;
  allowProviderFinalization(): void;
  requestCommit(): void;
  subscribe(listener: SpeechSessionListener): () => void;
  cancelUtterance(): void;
  close(): Promise<void>;
}

export interface RsvpSpeechControllerDependencies {
  readonly openMicrophone?: () => Promise<MicrophoneSession>;
  readonly createCapture?: (
    microphone: MicrophoneSession,
  ) => RsvpSpeechCapturePort;
  readonly createTranscriber?: (
    configuration: Readonly<RsvpSpeechTrialConfiguration>,
  ) => StreamingTranscriber;
  readonly createSession?: (
    transcriber: StreamingTranscriber,
    configuration: Readonly<RsvpSpeechTrialConfiguration>,
  ) => RsvpSpeechSessionPort;
}

const RSVP_ENDPOINTING_SILENCE_MS = 1_500;
const DEFAULT_MICROPHONE_PERMISSION_TIMEOUT_MS = 8_000;

const positiveDuration = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      `${name} must be a finite positive number.`,
    );
  }
};

const optionalPositiveDuration = (
  value: number | undefined,
  name: string,
): void => {
  if (value !== undefined) positiveDuration(value, name);
};

const normalizeConfiguration = (
  configuration: RsvpSpeechTrialConfiguration,
): Readonly<RsvpSpeechTrialConfiguration> => {
  if (!configuration || typeof configuration !== "object") {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      "An RSVP speech trial configuration is required.",
    );
  }

  const utteranceId = configuration.utteranceId?.trim();
  const languageCode = configuration.languageCode?.trim();
  const targetWords = configuration.targetWords?.map((word) => word.trim());

  if (!utteranceId) {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      "The RSVP speech utterance identifier cannot be empty.",
    );
  }
  if (
    configuration.provider !== "elevenlabs" &&
    configuration.provider !== "deepgram" &&
    configuration.provider !== "chirp3"
  ) {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      "The RSVP speech provider is not supported.",
    );
  }
  if (!Array.isArray(targetWords) || targetWords.length === 0) {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      "An RSVP speech trial must contain at least one target word.",
    );
  }
  if (targetWords.some((word) => !word)) {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      "RSVP speech target words cannot be empty.",
    );
  }
  if (!languageCode) {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      "The RSVP speech language code cannot be empty.",
    );
  }
  if (typeof configuration.targetKeytermBiasEnabled !== "boolean") {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      "The RSVP speech target-keyterm policy must be a Boolean value.",
    );
  }
  if (typeof configuration.requestTokenContext !== "function") {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      "The RSVP speech token context provider is required.",
    );
  }

  positiveDuration(
    configuration.maximumResponseDurationMs,
    "maximumResponseDurationMs",
  );
  optionalPositiveDuration(
    configuration.finalizationTimeoutMs,
    "finalizationTimeoutMs",
  );
  optionalPositiveDuration(
    configuration.deepgramEndpointingMs,
    "deepgramEndpointingMs",
  );
  optionalPositiveDuration(
    configuration.responseSilenceMs,
    "responseSilenceMs",
  );
  try {
    // Validate normalized targets before presentation, not inside the response
    // timer where a scoring exception could prevent the deadline from running.
    hasAllRsvpSpeechTargets(
      "",
      targetWords,
      languageCode,
      configuration.ignoreWordOrder ?? true,
    );
  } catch (error) {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      "The RSVP speech targets cannot be scored.",
      error,
    );
  }
  if (
    configuration.finishPhrase !== undefined &&
    typeof configuration.finishPhrase !== "string"
  )
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      "The finish phrase must be text.",
    );
  if (
    configuration.ignoreWordOrder !== undefined &&
    typeof configuration.ignoreWordOrder !== "boolean"
  )
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      "The word-order setting must be Boolean.",
    );

  return Object.freeze({
    ...configuration,
    utteranceId,
    languageCode,
    targetWords: Object.freeze([...targetWords]),
  });
};

const createDefaultTranscriber = (
  configuration: Readonly<RsvpSpeechTrialConfiguration>,
): StreamingTranscriber => {
  if (configuration.provider === "chirp3") {
    return new GoogleChirp3Transcriber({
      credentialProvider: createSpeechCredentialProvider("chirp3", {
        requestContext: configuration.requestTokenContext,
      }),
      utteranceId: configuration.utteranceId,
      languageCode: configuration.languageCode,
      keyterms: configuration.targetWords,
      targetKeytermBiasEnabled: configuration.targetKeytermBiasEnabled,
    });
  }
  const tokenProvider = createSpeechTokenProvider(configuration.provider, {
    requestContext: configuration.requestTokenContext,
  });
  const shared = {
    tokenProvider,
    languageCode: configuration.languageCode,
    keyterms: configuration.targetWords,
    targetKeytermBiasEnabled: configuration.targetKeytermBiasEnabled,
  };

  if (configuration.provider === "elevenlabs") {
    return new ElevenLabsRealtimeTranscriber({
      ...shared,
      vad: { silenceThresholdSecs: RSVP_ENDPOINTING_SILENCE_MS / 1000 },
    } satisfies ElevenLabsRealtimeTranscriberOptions);
  }

  return new DeepgramRealtimeTranscriber({
    ...shared,
    endpointingMs:
      configuration.deepgramEndpointingMs ?? RSVP_ENDPOINTING_SILENCE_MS,
  } satisfies DeepgramRealtimeTranscriberOptions);
};

const asControllerError = (
  code: RsvpSpeechControllerErrorCode,
  message: string,
  error: unknown,
): RsvpSpeechControllerError =>
  error instanceof RsvpSpeechControllerError
    ? error
    : new RsvpSpeechControllerError(code, message, error);

/**
 * Owns the speech resources for one RSVP trial. It does not start audio until
 * the timing-sensitive RSVP routine explicitly calls startCapture().
 */
export class RsvpSpeechController {
  readonly configuration: Readonly<RsvpSpeechTrialConfiguration>;

  private readonly dependencies: Required<RsvpSpeechControllerDependencies>;
  private stateValue: RsvpSpeechControllerState = "idle";
  private failureValue?: RsvpSpeechControllerError;
  private microphone?: MicrophoneSession;
  private capture?: RsvpSpeechCapturePort;
  private session?: RsvpSpeechSessionPort;
  private unsubscribeCapture?: () => void;
  private preparationPromise?: Promise<void>;
  private resultPromise?: Promise<SpeechUtteranceResult>;
  private releasePromise?: Promise<void>;
  private closePromise?: Promise<void>;
  private closeRequested = false;
  private unsubscribeSession?: () => void;
  private unsubscribeHealth?: () => void;
  private inputFailure?: RsvpSpeechControllerError;
  private responseWindowStartedAt?: number;
  private lastSpeechAt?: number;
  private allCorrectSince?: number;
  private latestSettledText = "";
  private hasUnsettledText = false;
  private settledAllCorrect = false;
  private finishRequested = false;
  private audioChunkCount = 0;
  private responseTimer?: ReturnType<typeof setInterval>;
  private readonly vad = new EnergyVoiceActivityDetector({
    initialNoiseFloorRms: 0.001,
    absoluteSpeechFloorRms: 0.01,
    speechThresholdDbAboveNoise: 10,
    minimumSpeechDurationMs: 80,
    endOfSpeechSilenceMs: 100,
    noiseFloorTimeConstantMs: 2000,
  });

  constructor(
    configuration: RsvpSpeechTrialConfiguration,
    dependencies: RsvpSpeechControllerDependencies = {},
  ) {
    this.configuration = normalizeConfiguration(configuration);
    this.dependencies = {
      openMicrophone:
        dependencies.openMicrophone ??
        (() =>
          openMicrophone({
            permissionTimeoutMs: DEFAULT_MICROPHONE_PERMISSION_TIMEOUT_MS,
          })),
      createCapture:
        dependencies.createCapture ??
        ((microphone) => new PcmMicrophoneCapture(microphone)),
      createTranscriber:
        dependencies.createTranscriber ?? createDefaultTranscriber,
      createSession:
        dependencies.createSession ??
        ((transcriber, config) =>
          new SpeechSession(transcriber, {
            maximumUtteranceDurationMs: config.maximumResponseDurationMs,
            finalizationTimeoutMs: config.finalizationTimeoutMs,
            externallyControlledEnd: true,
          })),
    };
  }

  get state(): RsvpSpeechControllerState {
    return this.stateValue;
  }

  get failure(): RsvpSpeechControllerError | undefined {
    return this.failureValue;
  }

  prepare(): Promise<void> {
    if (this.stateValue !== "idle") {
      return Promise.reject(
        new RsvpSpeechControllerError(
          "invalidState",
          "RSVP speech can only be prepared from its idle state.",
        ),
      );
    }
    this.stateValue = "preparing";
    this.preparationPromise = this.performPrepare();
    return this.preparationPromise;
  }

  startCapture(): void {
    if (
      this.configuration.provider === "chirp3" &&
      this.stateValue === "failed" &&
      this.failureValue
    )
      throw this.failureValue;
    if (this.stateValue !== "ready" || !this.capture || !this.session) {
      throw new RsvpSpeechControllerError(
        "invalidState",
        "RSVP speech capture can only start after preparation succeeds.",
      );
    }

    let utterance: Promise<SpeechUtteranceResult> | undefined;
    try {
      this.assertMicrophoneReady();
      utterance = this.session.beginUtterance(this.configuration.utteranceId);
      this.capture.start();
      this.stateValue = "capturing";
      this.resultPromise = this.settleUtterance(utterance);
      void this.resultPromise.catch(() => undefined);
    } catch (error) {
      try {
        this.session.cancelUtterance();
      } catch {
        // Resource cleanup below still closes the provider connection.
      }
      void utterance?.catch(() => undefined);
      const mapped = asControllerError(
        "captureFailed",
        "RSVP speech capture could not start.",
        error,
      );
      this.failureValue = mapped;
      this.stateValue = "failed";
      void this.releaseResources();
      throw mapped;
    }
  }

  allowProviderFinalization(): void {
    if (this.stateValue !== "capturing" || !this.session) {
      throw new RsvpSpeechControllerError(
        "invalidState",
        "RSVP speech can only finalize after capture starts.",
      );
    }
    try {
      // A provider segment boundary does not finish an RSVP response. The
      // response clocks begin only at the actual final-word offset.
      this.responseWindowStartedAt = performance.now();
      this.stateValue = "finalizing";
      this.responseTimer = setInterval(() => this.checkResponseEnd(), 50);
      if (typeof window !== "undefined")
        window.addEventListener("keydown", this.handleFinishKey);
      this.checkResponseEnd();
    } catch (error) {
      const mapped = asControllerError(
        "transcriptionFailed",
        "RSVP speech finalization could not start.",
        error,
      );
      this.failureValue = mapped;
      this.stateValue = "failed";
      void this.releaseResources();
      throw mapped;
    }
  }

  /** Stop new audio, flush its tail, then wait for the provider's final result. */
  finishResponse(): boolean {
    if (
      this.responseWindowStartedAt === undefined ||
      this.finishRequested ||
      !this.session ||
      this.session.state !== "listening"
    )
      return false;
    this.finishRequested = true;
    this.clearResponseControls();
    try {
      this.assertMicrophoneReady();
      this.capture?.stop();
      if (this.audioChunkCount === 0)
        throw new Error(
          "No microphone audio reached the transcription session.",
        );
      this.session.requestCommit();
    } catch (error) {
      this.failureValue = asControllerError(
        "captureFailed",
        "RSVP speech could not finish recording.",
        error,
      );
      this.stateValue = "failed";
      try {
        this.session.cancelUtterance();
      } catch {
        /* Cleanup is best effort. */
      }
      void this.releaseResources();
    }
    return true;
  }

  private readonly handleFinishKey = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    if (
      event.defaultPrevented ||
      event.code !== "Space" ||
      event.repeat ||
      event.isComposing ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      target?.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target?.tagName ?? "")
    )
      return;
    if (this.finishResponse()) event.preventDefault();
  };

  private readonly handleSessionEvent: SpeechSessionListener = (event) => {
    if (
      this.configuration.provider === "chirp3" &&
      event.type === "error" &&
      !event.utteranceId &&
      !this.closeRequested &&
      (this.stateValue === "preparing" || this.stateValue === "ready")
    ) {
      this.failureValue = asControllerError(
        "preparationFailed",
        "Chirp 3 disconnected before recording started.",
        event.error,
      );
      if (this.stateValue === "ready") {
        this.stateValue = "failed";
        void this.releaseResources();
      }
      return;
    }
    if (event.type !== "partial" || this.finishRequested) return;
    // Interim hypotheses may be revised; they cannot end the response.
    if (!event.settled) {
      this.hasUnsettledText = true;
      this.allCorrectSince = undefined;
      return;
    }
    this.hasUnsettledText = false;
    this.latestSettledText = event.text;
    const answer = stripRsvpSpeechFinishPhrase(
      event.text,
      this.configuration.languageCode,
      this.configuration.finishPhrase ?? RSVP_SPEECH_FINISH_PHRASE,
    );
    this.settledAllCorrect = hasAllRsvpSpeechTargets(
      answer.text,
      this.configuration.targetWords,
      this.configuration.languageCode,
      this.configuration.ignoreWordOrder ?? true,
    );
    this.allCorrectSince = undefined;
    // Run on the next timer tick: this segment's event must finish dispatching
    // before a new finalization request can be sent.
  };

  private checkResponseEnd(): void {
    if (this.finishRequested || this.responseWindowStartedAt === undefined)
      return;
    const now = performance.now();
    const response = stripRsvpSpeechFinishPhrase(
      this.latestSettledText,
      this.configuration.languageCode,
      this.configuration.finishPhrase ?? RSVP_SPEECH_FINISH_PHRASE,
    );
    if (response.finished && !this.hasUnsettledText) {
      this.finishResponse();
      return;
    }
    const silenceSince = Math.max(
      this.responseWindowStartedAt,
      this.lastSpeechAt ?? 0,
    );
    if (!this.hasUnsettledText && this.settledAllCorrect) {
      this.allCorrectSince ??= now;
      if (
        now - Math.max(silenceSince, this.allCorrectSince) >=
        RSVP_SPEECH_CONFIRMATION_MS
      ) {
        this.finishResponse();
        return;
      }
    } else this.allCorrectSince = undefined;
    if (
      now - this.responseWindowStartedAt >=
        this.configuration.maximumResponseDurationMs ||
      now - silenceSince >=
        (this.configuration.responseSilenceMs ?? RSVP_SPEECH_SILENCE_MS)
    )
      this.finishResponse();
  }

  private clearResponseControls(): void {
    if (this.responseTimer !== undefined) clearInterval(this.responseTimer);
    this.responseTimer = undefined;
    if (typeof window !== "undefined")
      window.removeEventListener("keydown", this.handleFinishKey);
  }

  waitForResult(): Promise<SpeechUtteranceResult> {
    if (!this.resultPromise) {
      return Promise.reject(
        new RsvpSpeechControllerError(
          "invalidState",
          "RSVP speech has no active utterance result.",
        ),
      );
    }
    return this.resultPromise;
  }

  close(): Promise<void> {
    this.closeRequested = true;
    this.closePromise ??= this.performClose();
    return this.closePromise;
  }

  private async performPrepare(): Promise<void> {
    try {
      const transcriber = this.dependencies.createTranscriber(
        this.configuration,
      );
      this.session = this.dependencies.createSession(
        transcriber,
        this.configuration,
      );
      this.unsubscribeSession = this.session.subscribe(this.handleSessionEvent);

      const prepareMicrophone = async (): Promise<void> => {
        this.microphone = await this.dependencies.openMicrophone();
        if (this.closeRequested) {
          throw new RsvpSpeechControllerError(
            "closed",
            "RSVP speech preparation was cancelled.",
          );
        }
        this.assertMicrophoneReady();
        this.unsubscribeHealth = this.microphone.subscribeToHealth((health) => {
          if (
            health.state === "ready" ||
            this.closeRequested ||
            this.finishRequested
          )
            return;
          this.inputFailure = new RsvpSpeechControllerError(
            "captureFailed",
            `The RSVP microphone became ${health.state}.`,
          );
          if (this.session?.state === "listening") {
            this.failureValue = this.inputFailure;
            this.stateValue = "failed";
            this.session.cancelUtterance();
          }
        });
        this.capture = this.dependencies.createCapture(this.microphone);
        await this.capture.initialize();
        if (!this.closeRequested) this.capture.startInput();
      };
      const [microphoneResult, connectionResult] = await Promise.allSettled([
        prepareMicrophone(),
        this.session.connect(),
      ]);

      const preparationError =
        microphoneResult.status === "rejected"
          ? microphoneResult.reason
          : connectionResult.status === "rejected"
          ? connectionResult.reason
          : undefined;
      if (preparationError !== undefined) throw preparationError;
      if (this.failureValue) throw this.failureValue;
      if (this.inputFailure) throw this.inputFailure;
      if (this.closeRequested) {
        throw new RsvpSpeechControllerError(
          "closed",
          "RSVP speech preparation was cancelled.",
        );
      }

      this.unsubscribeCapture = this.capture!.subscribe((chunk) => {
        if (this.session?.pushAudio(chunk)) {
          this.audioChunkCount++;
          const now = performance.now();
          const samples = Float32Array.from(
            chunk.samples,
            (sample) => sample / 32768,
          );
          const decision = this.vad.process(samples, now);
          if (
            decision.state === "speech" ||
            decision.signal.acRms >= decision.speechThresholdRms
          )
            this.lastSpeechAt = now;
        }
      });
      this.stateValue = "ready";
    } catch (error) {
      await this.releaseResources();
      const mapped =
        this.inputFailure ??
        asControllerError(
          this.closeRequested ? "closed" : "preparationFailed",
          this.closeRequested
            ? "RSVP speech preparation was cancelled."
            : "RSVP speech preparation failed.",
          error,
        );
      if (!this.closeRequested) {
        this.failureValue = mapped;
        this.stateValue = "failed";
      }
      throw mapped;
    }
  }

  private async settleUtterance(
    utterance: Promise<SpeechUtteranceResult>,
  ): Promise<SpeechUtteranceResult> {
    try {
      const result = await utterance;
      this.capture?.stop();
      await this.releaseResources();
      if (!this.closeRequested) this.stateValue = "completed";
      return result;
    } catch (error) {
      await this.releaseResources();
      const mapped =
        this.inputFailure ??
        asControllerError(
          this.closeRequested ? "closed" : "transcriptionFailed",
          this.closeRequested
            ? "RSVP speech was closed."
            : "RSVP speech transcription failed.",
          error,
        );
      if (!this.closeRequested) {
        this.failureValue = mapped;
        this.stateValue = "failed";
      }
      throw mapped;
    }
  }

  private async performClose(): Promise<void> {
    await this.preparationPromise?.catch(() => undefined);
    if (
      this.session &&
      (this.stateValue === "capturing" || this.stateValue === "finalizing")
    ) {
      try {
        this.session.cancelUtterance();
      } catch {
        // The provider may already have completed while close was requested.
      }
    }
    await this.releaseResources();
    this.stateValue = "closed";
  }

  private releaseResources(): Promise<void> {
    this.releasePromise ??= this.performReleaseResources();
    return this.releasePromise;
  }

  private assertMicrophoneReady(): void {
    if (this.inputFailure) throw this.inputFailure;
    if (this.microphone?.getHealth().state !== "ready")
      throw new RsvpSpeechControllerError(
        "captureFailed",
        "The RSVP microphone is not ready.",
      );
  }

  private async performReleaseResources(): Promise<void> {
    this.clearResponseControls();
    this.unsubscribeSession?.();
    this.unsubscribeSession = undefined;
    this.unsubscribeHealth?.();
    this.unsubscribeHealth = undefined;
    this.unsubscribeCapture?.();
    this.unsubscribeCapture = undefined;
    try {
      this.capture?.stop();
    } catch {
      // Continue closing the remaining resources.
    }

    const capture = this.capture;
    const session = this.session;
    const microphone = this.microphone;
    this.capture = undefined;
    this.session = undefined;
    this.microphone = undefined;

    await Promise.allSettled([
      capture?.close(),
      session?.close(),
      microphone?.close(),
    ]);
  }
}
