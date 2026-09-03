import { phraseIdentificationResponse, rsvpSpeechRuntime } from "../global";
import type { SpeechUtteranceResult } from "../speech/speechSession";
import {
  scoreRsvpSpeechResponse,
  type RsvpSpeechScoringDiagnostics,
  type RsvpSpeechScoringPolicy,
} from "./rsvpSpeechScoring";

export const DEFAULT_RSVP_SPEECH_SCORING_POLICY: RsvpSpeechScoringPolicy = {
  wordOrder: "anyOrder",
  repetition: "ignore",
  selfCorrection: "accept",
};

export type RsvpSpeechRegistrationStatus = "waiting" | "registered" | "invalid";

export interface RsvpSpeechRegistrationResult {
  readonly status: RsvpSpeechRegistrationStatus;
  readonly diagnostics?: RsvpSpeechScoringDiagnostics;
  readonly errorCode?: string;
}

interface RuntimeWithRegistration {
  status: string;
  result?: SpeechUtteranceResult;
  responseRegistrationStatus?: "pending" | "registered" | "invalid";
  responseRegistrationError?: string;
  responseDiagnostics?: RsvpSpeechScoringDiagnostics;
}

const runtime = rsvpSpeechRuntime as unknown as RuntimeWithRegistration;
const response = phraseIdentificationResponse as unknown as {
  current: string[];
  targetWord: string[];
  correct: (0 | 1)[];
  clickTime: number[];
};

const resolveScoringPolicy = (input: {
  readonly ignoreWordOrder?: unknown;
  readonly policy?: RsvpSpeechScoringPolicy;
}): RsvpSpeechScoringPolicy => {
  if (input.policy) return input.policy;
  if (typeof input.ignoreWordOrder !== "boolean") {
    throw new Error("rsvpReadingSTTIgnoreOrderBool must be a Boolean value.");
  }
  return {
    ...DEFAULT_RSVP_SPEECH_SCORING_POLICY,
    wordOrder: input.ignoreWordOrder ? "anyOrder" : "strict",
  };
};

export const resetRsvpSpeechResponseRegistration = (): void => {
  runtime.responseRegistrationStatus = "pending";
  runtime.responseRegistrationError = undefined;
  runtime.responseDiagnostics = undefined;
};

const markInvalid = (errorCode: string): RsvpSpeechRegistrationResult => {
  runtime.responseRegistrationStatus = "invalid";
  runtime.responseRegistrationError = errorCode;
  runtime.responseDiagnostics = undefined;
  return { status: "invalid", errorCode };
};

export const registerRsvpSpeechResult = (input: {
  readonly targetWords: readonly string[];
  readonly languageCode: string;
  readonly ignoreWordOrder?: unknown;
  readonly policy?: RsvpSpeechScoringPolicy;
  readonly speechResult?: SpeechUtteranceResult;
}): RsvpSpeechRegistrationResult => {
  if (runtime.responseRegistrationStatus === "registered") {
    return {
      status: "registered",
      diagnostics: runtime.responseDiagnostics,
    };
  }
  if (runtime.responseRegistrationStatus === "invalid") {
    return {
      status: "invalid",
      errorCode: runtime.responseRegistrationError,
    };
  }

  const speechResult = input.speechResult ?? runtime.result;
  if (runtime.status !== "completed" || !speechResult) {
    if (runtime.status === "failed" || runtime.status === "closed") {
      return markInvalid("postExposureTechnicalFailure");
    }
    return { status: "waiting" };
  }

  try {
    const policy = resolveScoringPolicy(input);
    const scored = scoreRsvpSpeechResponse({
      targetWords: input.targetWords,
      transcript: speechResult.text,
      languageCode: input.languageCode,
      policy,
    });

    response.current = scored.targetResults.map(
      (target) => target.responseText ?? "",
    );
    response.targetWord = scored.targetResults.map(
      (target) => target.targetWord,
    );
    response.correct = [...scored.responseVector];
    // A continuous utterance does not provide trustworthy per-word reaction
    // times. Leave the legacy click-time register empty instead of inventing
    // identical timestamps for every target.
    response.clickTime = [];

    runtime.responseRegistrationStatus = "registered";
    runtime.responseRegistrationError = undefined;
    runtime.responseDiagnostics = scored.diagnostics;
    return { status: "registered", diagnostics: scored.diagnostics };
  } catch (error) {
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "scoringError";
    return markInvalid(errorCode);
  }
};
