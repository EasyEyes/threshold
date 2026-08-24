import { rsvpSpeechRuntime } from "../global";
import {
  RsvpSpeechController,
  RsvpSpeechControllerError,
  type RsvpSpeechTrialConfiguration,
} from "./rsvpSpeechController";
import type {
  SpeechProvider,
  SpeechTokenRequestContext,
} from "../speech/speechToken";
import type { SpeechUtteranceResult } from "../speech/speechSession";

export const RSVP_SPEECH_PARAMETER_NAMES = Object.freeze({
  provider: "rsvpReadingSpeechProvider",
  targetKeytermBiasEnabled: "rsvpReadingTargetKeytermBiasBool",
  responseTimeoutSec: "rsvpReadingSpeechResponseTimeoutSec",
});

export type RsvpSpeechRuntimeStatus =
  | "idle"
  | "preparing"
  | "ready"
  | "capturing"
  | "finalizing"
  | "completed"
  | "failed"
  | "closed";

interface RsvpSpeechRuntimeState {
  controller: RsvpSpeechController | undefined;
  status: RsvpSpeechRuntimeStatus;
  simulated: boolean;
  blockCondition: string | undefined;
  utteranceId: string | undefined;
  result: SpeechUtteranceResult | undefined;
  error: unknown;
  preparationStartedAtMs: number | undefined;
  readyAtMs: number | undefined;
  captureStartedAtMs: number | undefined;
  finalizationAllowedAtMs: number | undefined;
  responseRegistrationStatus: "pending" | "registered" | "invalid";
  responseRegistrationError: string | undefined;
  responseDiagnostics: unknown;
}

export interface RsvpSpeechTrialSetup {
  readonly blockCondition: string;
  readonly trialNumber: number;
  readonly provider: unknown;
  readonly targetWords: readonly string[];
  readonly conditionLanguage: string;
  readonly targetKeytermBiasEnabled: unknown;
  readonly maximumResponseDurationSec: unknown;
  readonly stimulusDurationMs: number;
  readonly requestTokenContext: () => SpeechTokenRequestContext;
}

export interface RsvpSpeechRuntimeDependencies {
  readonly createController?: (
    configuration: RsvpSpeechTrialConfiguration,
  ) => RsvpSpeechController;
  readonly now?: () => number;
}

const runtime = rsvpSpeechRuntime as RsvpSpeechRuntimeState;
let activeResultPromise: Promise<SpeechUtteranceResult> | undefined;
let activePageHideListener: (() => void) | undefined;
let activeClosePromise: Promise<void> | undefined;

const defaultNow = (): number => performance.now();

const normalizeProvider = (value: unknown): SpeechProvider => {
  if (typeof value !== "string") {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      `${RSVP_SPEECH_PARAMETER_NAMES.provider} must select ElevenLabs or Deepgram.`,
    );
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "elevenlabs") return "elevenlabs";
  if (normalized === "deepgram") return "deepgram";
  throw new RsvpSpeechControllerError(
    "invalidConfiguration",
    `${RSVP_SPEECH_PARAMETER_NAMES.provider} must select ElevenLabs or Deepgram.`,
  );
};

const requireBoolean = (value: unknown, name: string): boolean => {
  if (typeof value !== "boolean") {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      `${name} must be a Boolean value.`,
    );
  }
  return value;
};

const responseDurationMs = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      `${RSVP_SPEECH_PARAMETER_NAMES.responseTimeoutSec} must be a positive number.`,
    );
  }
  return value * 1000;
};

export const resolveRsvpSpeechProviderLanguageCode = (
  provider: SpeechProvider,
  conditionLanguage: string,
): string => {
  const normalized = conditionLanguage.trim().replace(/_/g, "-");
  if (!normalized) {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      "The condition language is required for RSVP speech recognition.",
    );
  }
  return provider === "elevenlabs"
    ? normalized.split("-")[0].toLowerCase()
    : normalized;
};

export const createRsvpSpeechUtteranceId = (
  blockCondition: string,
  trialNumber: number,
  uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2)}`,
): string =>
  `rsvp-${blockCondition.replace(
    /[^A-Za-z0-9_-]/g,
    "-",
  )}-${trialNumber}-${uniquePart}`;

export const buildRsvpSpeechTrialConfiguration = (
  setup: RsvpSpeechTrialSetup,
): RsvpSpeechTrialConfiguration => {
  const provider = normalizeProvider(setup.provider);
  const maximumResponseDurationMs = responseDurationMs(
    setup.maximumResponseDurationSec,
  );
  if (
    !Number.isFinite(setup.stimulusDurationMs) ||
    setup.stimulusDurationMs <= 0
  ) {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      "The RSVP stimulus duration must be a positive number.",
    );
  }
  if (maximumResponseDurationMs <= setup.stimulusDurationMs) {
    throw new RsvpSpeechControllerError(
      "invalidConfiguration",
      `${RSVP_SPEECH_PARAMETER_NAMES.responseTimeoutSec} must extend beyond the RSVP stimulus sequence.`,
    );
  }

  return {
    utteranceId: createRsvpSpeechUtteranceId(
      setup.blockCondition,
      setup.trialNumber,
    ),
    provider,
    targetWords: setup.targetWords,
    languageCode: resolveRsvpSpeechProviderLanguageCode(
      provider,
      setup.conditionLanguage,
    ),
    targetKeytermBiasEnabled: requireBoolean(
      setup.targetKeytermBiasEnabled,
      RSVP_SPEECH_PARAMETER_NAMES.targetKeytermBiasEnabled,
    ),
    maximumResponseDurationMs,
    requestTokenContext: setup.requestTokenContext,
  };
};

const removePageHideListener = (): void => {
  if (activePageHideListener && typeof window !== "undefined") {
    window.removeEventListener("pagehide", activePageHideListener);
  }
  activePageHideListener = undefined;
};

const installPageHideListener = (controller: RsvpSpeechController): void => {
  removePageHideListener();
  if (typeof window === "undefined") return;
  activePageHideListener = () => {
    if (runtime.controller === controller) void closeActiveRsvpSpeechTrial();
  };
  window.addEventListener("pagehide", activePageHideListener, { once: true });
};

const resetRuntimeForTrial = (
  configuration: RsvpSpeechTrialConfiguration,
  simulated: boolean,
  blockCondition: string,
): void => {
  runtime.controller = undefined;
  runtime.status = "preparing";
  runtime.simulated = simulated;
  runtime.blockCondition = blockCondition;
  runtime.utteranceId = configuration.utteranceId;
  runtime.result = undefined;
  runtime.error = undefined;
  runtime.preparationStartedAtMs = undefined;
  runtime.readyAtMs = undefined;
  runtime.captureStartedAtMs = undefined;
  runtime.finalizationAllowedAtMs = undefined;
  runtime.responseRegistrationStatus = "pending";
  runtime.responseRegistrationError = undefined;
  runtime.responseDiagnostics = undefined;
  activeResultPromise = undefined;
};

export const prepareRsvpSpeechTrial = async (
  setup: RsvpSpeechTrialSetup,
  dependencies: RsvpSpeechRuntimeDependencies = {},
): Promise<boolean> => {
  await closeActiveRsvpSpeechTrial();
  runtime.status = "preparing";
  runtime.simulated = false;
  runtime.blockCondition = setup.blockCondition;
  runtime.utteranceId = undefined;
  runtime.result = undefined;
  runtime.error = undefined;
  runtime.preparationStartedAtMs = undefined;
  runtime.readyAtMs = undefined;
  runtime.captureStartedAtMs = undefined;
  runtime.finalizationAllowedAtMs = undefined;
  runtime.responseRegistrationStatus = "pending";
  runtime.responseRegistrationError = undefined;
  runtime.responseDiagnostics = undefined;

  let configuration: RsvpSpeechTrialConfiguration;
  try {
    configuration = buildRsvpSpeechTrialConfiguration(setup);
  } catch (error) {
    runtime.status = "failed";
    runtime.error = error;
    return false;
  }

  resetRuntimeForTrial(configuration, false, setup.blockCondition);
  const now = dependencies.now ?? defaultNow;
  runtime.preparationStartedAtMs = now();

  let controller: RsvpSpeechController | undefined;
  try {
    controller =
      dependencies.createController?.(configuration) ??
      new RsvpSpeechController(configuration);
    runtime.controller = controller;
    installPageHideListener(controller);
    await controller.prepare();
    if (runtime.controller !== controller) {
      await controller.close();
      return false;
    }
    runtime.status = "ready";
    runtime.readyAtMs = now();
    return true;
  } catch (error) {
    if (runtime.controller === controller) runtime.controller = undefined;
    removePageHideListener();
    if (controller) {
      const failedController = controller;
      await Promise.resolve()
        .then(() => failedController.close())
        .catch(() => undefined);
    }
    runtime.status = "failed";
    runtime.error = error;
    return false;
  }
};

export const prepareSimulatedRsvpSpeechTrial = (
  setup: Pick<RsvpSpeechTrialSetup, "blockCondition" | "trialNumber">,
): void => {
  const utteranceId = createRsvpSpeechUtteranceId(
    setup.blockCondition,
    setup.trialNumber,
    "simulation",
  );
  resetRuntimeForTrial(
    {
      utteranceId,
      provider: "deepgram",
      targetWords: ["simulation"],
      languageCode: "en",
      targetKeytermBiasEnabled: false,
      maximumResponseDurationMs: 1,
      requestTokenContext: () => ({
        experimentFullPath: "simulation",
        pavloviaSessionToken: "simulation",
      }),
    },
    true,
    setup.blockCondition,
  );
  runtime.status = "ready";
  runtime.readyAtMs = defaultNow();
};

const storeFailure = (error: unknown): false => {
  runtime.status = "failed";
  runtime.error = error;
  removePageHideListener();
  return false;
};

export const startRsvpSpeechCapture = (
  now: () => number = defaultNow,
): boolean => {
  if (runtime.status !== "ready") return false;
  runtime.captureStartedAtMs = now();

  if (runtime.simulated) {
    runtime.status = "capturing";
    return true;
  }
  const controller = runtime.controller;
  if (!controller) return storeFailure(new Error("RSVP speech is not ready."));

  try {
    controller.startCapture();
    runtime.status = "capturing";
    activeResultPromise = controller.waitForResult();
    void activeResultPromise
      .then((result) => {
        if (runtime.controller !== controller) return;
        runtime.result = result;
        runtime.status = "completed";
        removePageHideListener();
      })
      .catch((error) => {
        if (runtime.controller === controller) storeFailure(error);
      });
    return true;
  } catch (error) {
    return storeFailure(error);
  }
};

export const allowRsvpSpeechProviderFinalization = (
  now: () => number = defaultNow,
): boolean => {
  if (runtime.status !== "capturing") return false;
  runtime.finalizationAllowedAtMs = now();
  if (runtime.simulated) {
    runtime.status = "finalizing";
    return true;
  }
  if (!runtime.controller) {
    return storeFailure(new Error("RSVP speech capture is not active."));
  }
  try {
    runtime.controller.allowProviderFinalization();
    runtime.status = "finalizing";
    return true;
  } catch (error) {
    return storeFailure(error);
  }
};

export const injectRsvpSpeechTranscriptForSimulation = (
  text: string,
  now: () => number = defaultNow,
): SpeechUtteranceResult => {
  if (!runtime.simulated || !runtime.utteranceId) {
    throw new Error("No simulated RSVP speech trial is active.");
  }
  if (runtime.captureStartedAtMs === undefined) {
    throw new Error("Simulated RSVP speech capture has not started.");
  }
  const completedAtMs = now();
  const result: SpeechUtteranceResult = {
    utteranceId: runtime.utteranceId,
    text: text.trim(),
    committedSegments: text.trim()
      ? [{ text: text.trim(), receivedAtMs: completedAtMs }]
      : [],
    startedAtMs: runtime.captureStartedAtMs,
    completedAtMs,
    durationMs: Math.max(0, completedAtMs - runtime.captureStartedAtMs),
    finalizationTrigger: "manual",
  };
  runtime.result = result;
  runtime.status = "completed";
  return result;
};

export const getRsvpSpeechResult = (): SpeechUtteranceResult | undefined =>
  runtime.result;

export const hasActiveRsvpSpeechResources = (): boolean =>
  runtime.controller !== undefined || activeClosePromise !== undefined;

export const closeActiveRsvpSpeechTrial = async (): Promise<void> => {
  if (activeClosePromise && runtime.controller === undefined) {
    await activeClosePromise;
    return;
  }

  const controller = runtime.controller;
  runtime.controller = undefined;
  removePageHideListener();
  activeResultPromise = undefined;
  if (controller) {
    const closePromise = Promise.resolve()
      .then(() => controller.close())
      .catch(() => undefined);
    activeClosePromise = closePromise;
    await closePromise;
    if (activeClosePromise === closePromise) activeClosePromise = undefined;
  }
  if (runtime.status !== "completed" && runtime.status !== "failed") {
    runtime.status = "closed";
  }
};

export const clearRsvpSpeechRuntimeState = async (): Promise<void> => {
  await closeActiveRsvpSpeechTrial();
  runtime.controller = undefined;
  runtime.status = "idle";
  runtime.simulated = false;
  runtime.blockCondition = undefined;
  runtime.utteranceId = undefined;
  runtime.result = undefined;
  runtime.error = undefined;
  runtime.preparationStartedAtMs = undefined;
  runtime.readyAtMs = undefined;
  runtime.captureStartedAtMs = undefined;
  runtime.finalizationAllowedAtMs = undefined;
  runtime.responseRegistrationStatus = "pending";
  runtime.responseRegistrationError = undefined;
  runtime.responseDiagnostics = undefined;
};
