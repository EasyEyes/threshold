import { rsvpSpeechPreflight } from "../global";
import { readi18nPhrases } from "../readPhrases";
import { calculateAudioSignalMetrics } from "./audioSignal";
import {
  MicrophoneError,
  openMicrophone,
  type MicrophoneSession,
  type OpenMicrophoneOptions,
} from "./microphone";
import { EnergyVoiceActivityDetector } from "./vad";

export type SpeechPreflightPhase =
  | "requestingPermission"
  | "measuringAmbient"
  | "waitingForVoice";

export type SpeechPreflightFailureCode =
  | "permissionDenied"
  | "permissionTimeout"
  | "microphoneNotFound"
  | "microphoneUnavailable"
  | "ambiguousInput"
  | "voiceNotDetected"
  | "clippedInput"
  | "unexpected";

export type SpeechPreflightResult =
  | {
      ok: true;
      sampleRate: number;
      frameDurationMs: number;
      noiseFloorAcRms: number;
      detectedVoiceAcRms: number;
    }
  | { ok: false; code: SpeechPreflightFailureCode };

export interface SpeechPreflightCopy {
  introduction: string;
  startButton: string;
  requestingPermission: string;
  measuringAmbient: string;
  waitingForVoice: string;
  success: string;
  retryButton: string;
  failures: Record<SpeechPreflightFailureCode, string>;
}

interface SpeechPreflightRuntimeOptions {
  ambientDurationMs: number;
  voiceTimeoutMs: number;
  permissionTimeoutMs: number;
  pollIntervalMs: number;
  minimumVoiceDurationMs: number;
  speechThresholdDbAboveNoise: number;
  absoluteSpeechFloorAcRms: number;
  maximumClippedSampleRatio: number;
}

export interface RunSpeechPreflightOptions {
  signal?: AbortSignal;
  onPhaseChange?: (phase: SpeechPreflightPhase) => void;
  runtime?: Partial<SpeechPreflightRuntimeOptions>;
  openMicrophone?: (
    options?: OpenMicrophoneOptions,
  ) => Promise<MicrophoneSession>;
  now?: () => number;
  wait?: (durationMs: number, signal?: AbortSignal) => Promise<void>;
}

export interface MountRsvpSpeechPreflightOptions {
  block: number;
  language: string;
  onPassed: () => void;
  copy?: SpeechPreflightCopy;
  runPreflight?: (
    options: RunSpeechPreflightOptions,
  ) => Promise<SpeechPreflightResult>;
}

const DEFAULT_RUNTIME_OPTIONS: SpeechPreflightRuntimeOptions = {
  ambientDurationMs: 750,
  voiceTimeoutMs: 5000,
  permissionTimeoutMs: 20000,
  pollIntervalMs: 50,
  minimumVoiceDurationMs: 100,
  speechThresholdDbAboveNoise: 9,
  absoluteSpeechFloorAcRms: 0.0025,
  maximumClippedSampleRatio: 0.2,
};

export const DEFAULT_SPEECH_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: { ideal: 1 },
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
};

const PREFLIGHT_ELEMENT_ID = "rsvp-speech-preflight";

class SpeechPreflightCancelledError extends Error {
  constructor() {
    super("Speech preflight was cancelled.");
    this.name = "SpeechPreflightCancelledError";
  }
}

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw new SpeechPreflightCancelledError();
};

const defaultWait = (durationMs: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    throwIfAborted(signal);

    const handleAbort = (): void => {
      globalThis.clearTimeout(timeoutId);
      reject(new SpeechPreflightCancelledError());
    };
    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, durationMs);
    signal?.addEventListener("abort", handleAbort, { once: true });
  });

const percentile = (values: number[], fraction: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(fraction * sorted.length) - 1),
  );
  return sorted[index];
};

const assertUsableTrack = (session: MicrophoneSession): void => {
  if (session.getHealth().state !== "ready") {
    throw new MicrophoneError(
      "deviceUnavailable",
      "The microphone stopped providing usable input during preflight.",
    );
  }
};

const waitForMicrophone = async (
  request: Promise<MicrophoneSession>,
  signal?: AbortSignal,
): Promise<MicrophoneSession> => {
  if (!signal) return request;
  throwIfAborted(signal);

  let handleAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    handleAbort = () => reject(new SpeechPreflightCancelledError());
    signal.addEventListener("abort", handleAbort, { once: true });
  });

  try {
    return await Promise.race([request, aborted]);
  } catch (error) {
    if (error instanceof SpeechPreflightCancelledError) {
      void request.then(
        (session) => session.close().catch(() => undefined),
        () => undefined,
      );
    }
    throw error;
  } finally {
    if (handleAbort) signal.removeEventListener("abort", handleAbort);
  }
};

const mapFailure = (error: unknown): SpeechPreflightFailureCode => {
  if (!(error instanceof MicrophoneError)) return "unexpected";

  switch (error.code) {
    case "permissionDenied":
      return "permissionDenied";
    case "permissionTimeout":
      return "permissionTimeout";
    case "deviceNotFound":
    case "noAudioTrack":
      return "microphoneNotFound";
    case "unsupported":
    case "deviceUnavailable":
    case "constraintsUnsupported":
    case "audioGraphUnavailable":
    case "inputEnded":
    case "sessionClosed":
      return "microphoneUnavailable";
    default:
      return "unexpected";
  }
};

export const readRsvpSpeechPreflightCopy = (
  language: string,
): SpeechPreflightCopy => ({
  introduction: readi18nPhrases("T_rsvpSpeechPreflightIntroduction", language),
  startButton: readi18nPhrases("T_rsvpSpeechPreflightStart", language),
  requestingPermission: readi18nPhrases(
    "T_rsvpSpeechPreflightRequestingPermission",
    language,
  ),
  measuringAmbient: readi18nPhrases(
    "T_rsvpSpeechPreflightMeasuringAmbient",
    language,
  ),
  waitingForVoice: readi18nPhrases(
    "T_rsvpSpeechPreflightWaitingForVoice",
    language,
  ),
  success: readi18nPhrases("T_rsvpSpeechPreflightSuccess", language),
  retryButton: readi18nPhrases("T_rsvpSpeechPreflightRetry", language),
  failures: {
    permissionDenied: readi18nPhrases(
      "T_rsvpSpeechPreflightPermissionDenied",
      language,
    ),
    permissionTimeout: readi18nPhrases(
      "T_rsvpSpeechPreflightPermissionTimeout",
      language,
    ),
    microphoneNotFound: readi18nPhrases(
      "T_rsvpSpeechPreflightMicrophoneNotFound",
      language,
    ),
    microphoneUnavailable: readi18nPhrases(
      "T_rsvpSpeechPreflightMicrophoneUnavailable",
      language,
    ),
    ambiguousInput: readi18nPhrases(
      "T_rsvpSpeechPreflightAmbiguousInput",
      language,
    ),
    voiceNotDetected: readi18nPhrases(
      "T_rsvpSpeechPreflightVoiceNotDetected",
      language,
    ),
    clippedInput: readi18nPhrases(
      "T_rsvpSpeechPreflightClippedInput",
      language,
    ),
    unexpected: readi18nPhrases(
      "T_rsvpSpeechPreflightUnexpectedError",
      language,
    ),
  },
});

export const runSpeechPreflight = async ({
  signal,
  onPhaseChange,
  runtime,
  openMicrophone: acquireMicrophone = openMicrophone,
  now = () => performance.now(),
  wait = defaultWait,
}: RunSpeechPreflightOptions = {}): Promise<SpeechPreflightResult> => {
  const config = { ...DEFAULT_RUNTIME_OPTIONS, ...runtime };
  let session: MicrophoneSession | undefined;

  try {
    throwIfAborted(signal);
    onPhaseChange?.("requestingPermission");
    const request = acquireMicrophone({
      audioConstraints: DEFAULT_SPEECH_AUDIO_CONSTRAINTS,
      permissionTimeoutMs: config.permissionTimeoutMs,
    });
    session = await waitForMicrophone(request, signal);
    assertUsableTrack(session);

    const frame = new Float32Array(session.frameSize);
    const ambientLevels: number[] = [];
    let ambientZeroRatioTotal = 0;
    let ambientFrameCount = 0;

    onPhaseChange?.("measuringAmbient");
    const ambientStartedAt = now();
    do {
      throwIfAborted(signal);
      assertUsableTrack(session);
      session.readFrame(frame);
      const metrics = calculateAudioSignalMetrics(frame);
      ambientLevels.push(metrics.acRms);
      ambientZeroRatioTotal += metrics.zeroSampleRatio;
      ambientFrameCount += 1;
      await wait(config.pollIntervalMs, signal);
    } while (now() - ambientStartedAt < config.ambientDurationMs);

    const noiseFloorAcRms = percentile(ambientLevels, 0.8);
    const vad = new EnergyVoiceActivityDetector({
      initialNoiseFloorRms: noiseFloorAcRms,
      absoluteSpeechFloorRms: config.absoluteSpeechFloorAcRms,
      speechThresholdDbAboveNoise: config.speechThresholdDbAboveNoise,
      minimumSpeechDurationMs: config.minimumVoiceDurationMs,
      endOfSpeechSilenceMs: 300,
      noiseFloorTimeConstantMs: 2000,
    });

    onPhaseChange?.("waitingForVoice");
    const voiceStartedAt = now();
    let maximumVoiceAcRms = 0;
    let maximumClippedSampleRatio = 0;

    do {
      throwIfAborted(signal);
      assertUsableTrack(session);
      session.readFrame(frame);
      const timestampMs = now() - voiceStartedAt;
      const decision = vad.process(frame, timestampMs);
      maximumVoiceAcRms = Math.max(maximumVoiceAcRms, decision.signal.acRms);
      maximumClippedSampleRatio = Math.max(
        maximumClippedSampleRatio,
        decision.signal.clippedSampleRatio,
      );

      if (decision.speechStarted) {
        if (maximumClippedSampleRatio > config.maximumClippedSampleRatio) {
          return { ok: false, code: "clippedInput" };
        }
        return {
          ok: true,
          sampleRate: session.sampleRate,
          frameDurationMs: session.frameDurationMs,
          noiseFloorAcRms,
          detectedVoiceAcRms: maximumVoiceAcRms,
        };
      }
      await wait(config.pollIntervalMs, signal);
    } while (now() - voiceStartedAt < config.voiceTimeoutMs);

    const averageAmbientZeroRatio =
      ambientFrameCount === 0 ? 1 : ambientZeroRatioTotal / ambientFrameCount;
    return {
      ok: false,
      code:
        averageAmbientZeroRatio >= 0.999 && maximumVoiceAcRms === 0
          ? "ambiguousInput"
          : "voiceNotDetected",
    };
  } catch (error) {
    if (error instanceof SpeechPreflightCancelledError) throw error;
    return { ok: false, code: mapFailure(error) };
  } finally {
    await session?.close();
  }
};

interface ActivePreflightController {
  cancel: () => void;
}

let activeController: ActivePreflightController | undefined;

const setMessage = (
  element: HTMLElement,
  message: string,
  isError = false,
): void => {
  element.textContent = message;
  element.setAttribute("role", isError ? "alert" : "status");
  element.setAttribute("aria-live", isError ? "assertive" : "polite");
};

export const mountRsvpSpeechPreflight = ({
  block,
  language,
  onPassed,
  copy = readRsvpSpeechPreflightCopy(language),
  runPreflight = runSpeechPreflight,
}: MountRsvpSpeechPreflightOptions): HTMLElement => {
  activeController?.cancel();
  document.getElementById(PREFLIGHT_ELEMENT_ID)?.remove();

  const container = document.createElement("section");
  container.id = PREFLIGHT_ELEMENT_ID;
  container.className = "rsvp-speech-preflight";

  const message = document.createElement("p");
  message.id = "rsvp-speech-preflight-message";
  message.className = "rsvp-speech-preflight__message";
  setMessage(message, copy.introduction);
  container.setAttribute("aria-labelledby", message.id);

  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "threshold-button threshold-proceed-button rsvp-speech-preflight__button";
  button.textContent = copy.startButton;

  container.append(message, button);
  document.body.appendChild(container);

  rsvpSpeechPreflight.required = true;
  rsvpSpeechPreflight.status = "ready";
  rsvpSpeechPreflight.block = block;
  rsvpSpeechPreflight.lastFailureCode = undefined;

  let runAbortController: AbortController | undefined;
  let cancelled = false;
  const handlePageHide = (): void => controller.cancel();

  const controller: ActivePreflightController = {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      runAbortController?.abort();
      window.removeEventListener("pagehide", handlePageHide);
      container.remove();
      if (!rsvpSpeechPreflight.completed) {
        rsvpSpeechPreflight.required = false;
        rsvpSpeechPreflight.status = "cancelled";
      }
      if (activeController === controller) activeController = undefined;
    },
  };
  activeController = controller;
  window.addEventListener("pagehide", handlePageHide, { once: true });

  button.onclick = async (event): Promise<void> => {
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    if (cancelled || rsvpSpeechPreflight.status === "running") return;

    runAbortController = new AbortController();
    rsvpSpeechPreflight.status = "running";
    rsvpSpeechPreflight.lastFailureCode = undefined;
    button.disabled = true;

    try {
      const result = await runPreflight({
        signal: runAbortController.signal,
        onPhaseChange: (phase) => {
          if (cancelled) return;
          const phaseMessage: Record<SpeechPreflightPhase, string> = {
            requestingPermission: copy.requestingPermission,
            measuringAmbient: copy.measuringAmbient,
            waitingForVoice: copy.waitingForVoice,
          };
          setMessage(message, phaseMessage[phase]);
        },
      });
      if (cancelled) return;

      if (!result.ok) {
        rsvpSpeechPreflight.status = "failed";
        rsvpSpeechPreflight.lastFailureCode = result.code;
        setMessage(message, copy.failures[result.code], true);
        button.textContent = copy.retryButton;
        button.disabled = false;
        button.focus();
        return;
      }

      rsvpSpeechPreflight.completed = true;
      rsvpSpeechPreflight.required = false;
      rsvpSpeechPreflight.status = "passed";
      setMessage(message, copy.success);
      window.removeEventListener("pagehide", handlePageHide);
      container.remove();
      activeController = undefined;
      onPassed();
    } catch (error) {
      if (error instanceof SpeechPreflightCancelledError || cancelled) return;
      rsvpSpeechPreflight.status = "failed";
      rsvpSpeechPreflight.lastFailureCode = "unexpected";
      setMessage(message, copy.failures.unexpected, true);
      button.textContent = copy.retryButton;
      button.disabled = false;
      button.focus();
    }
  };

  button.focus();
  return container;
};

export const cancelActiveRsvpSpeechPreflight = (): void => {
  activeController?.cancel();
};

export const isRsvpSpeechPreflightBlocking = (): boolean =>
  rsvpSpeechPreflight.required && !rsvpSpeechPreflight.completed;

export const isAutomaticSpeechResponseEnabledForBlock = (
  reader: { read: (name: string, block: number) => unknown[] },
  block: number,
): boolean =>
  reader
    .read("responseSpokenBool", block)
    .some((value) => value === true || String(value).toLowerCase() === "true");
