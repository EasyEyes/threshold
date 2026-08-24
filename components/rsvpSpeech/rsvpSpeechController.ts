import { PcmMicrophoneCapture } from "../speech/audioCapture";
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
} from "../speech/speechSession";
import {
  createSpeechTokenProvider,
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
  readonly requestTokenContext: () => SpeechTokenRequestContext;
}

export interface RsvpSpeechCapturePort {
  initialize(): Promise<void>;
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

const DEFAULT_DEEPGRAM_ENDPOINTING_MS = 500;
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
    configuration.provider !== "deepgram"
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
    return new ElevenLabsRealtimeTranscriber(
      shared satisfies ElevenLabsRealtimeTranscriberOptions,
    );
  }

  return new DeepgramRealtimeTranscriber({
    ...shared,
    endpointingMs:
      configuration.deepgramEndpointingMs ?? DEFAULT_DEEPGRAM_ENDPOINTING_MS,
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
    if (this.stateValue !== "ready" || !this.capture || !this.session) {
      throw new RsvpSpeechControllerError(
        "invalidState",
        "RSVP speech capture can only start after preparation succeeds.",
      );
    }

    let utterance: Promise<SpeechUtteranceResult> | undefined;
    try {
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
      this.session.allowProviderFinalization();
      this.stateValue = "finalizing";
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

      const prepareMicrophone = async (): Promise<void> => {
        this.microphone = await this.dependencies.openMicrophone();
        if (this.closeRequested) {
          throw new RsvpSpeechControllerError(
            "closed",
            "RSVP speech preparation was cancelled.",
          );
        }
        this.capture = this.dependencies.createCapture(this.microphone);
        await this.capture.initialize();
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
      if (this.closeRequested) {
        throw new RsvpSpeechControllerError(
          "closed",
          "RSVP speech preparation was cancelled.",
        );
      }

      this.unsubscribeCapture = this.capture!.subscribe((chunk) => {
        this.session?.pushAudio(chunk);
      });
      this.stateValue = "ready";
    } catch (error) {
      await this.releaseResources();
      const mapped = asControllerError(
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
      const mapped = asControllerError(
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

  private async performReleaseResources(): Promise<void> {
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
