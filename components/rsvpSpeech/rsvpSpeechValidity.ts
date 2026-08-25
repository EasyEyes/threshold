import type { RsvpReadingResponseMode } from "./rsvpSpeechMode";
import type { RsvpSpeechRuntimeStatus } from "./rsvpSpeechRuntime";

export type RsvpSpeechInvalidReason =
  | "preExposureTechnicalFailure"
  | "postExposureTechnicalFailure"
  | "responseNotRegistered";

export interface RsvpSpeechTrialValidityInput {
  readonly responseMode: RsvpReadingResponseMode;
  readonly runtimeStatus: RsvpSpeechRuntimeStatus;
  readonly captureStarted: boolean;
  readonly registeredResponseCount: number;
  readonly expectedResponseCount: number;
}

export interface RsvpSpeechTrialValidity {
  readonly validForQuest: boolean;
  readonly consumeTargetWords: boolean;
  readonly invalidReason?: RsvpSpeechInvalidReason;
}

export const resolveRsvpSpeechTrialValidity = (
  input: RsvpSpeechTrialValidityInput,
): RsvpSpeechTrialValidity => {
  if (input.responseMode !== "automaticSpeech") {
    return { validForQuest: true, consumeTargetWords: true };
  }

  const responseWasRegistered =
    input.runtimeStatus === "completed" &&
    input.registeredResponseCount === input.expectedResponseCount;
  if (responseWasRegistered) {
    return { validForQuest: true, consumeTargetWords: true };
  }

  if (!input.captureStarted) {
    return {
      validForQuest: false,
      consumeTargetWords: false,
      invalidReason: "preExposureTechnicalFailure",
    };
  }

  return {
    validForQuest: false,
    consumeTargetWords: true,
    invalidReason:
      input.runtimeStatus === "completed"
        ? "responseNotRegistered"
        : "postExposureTechnicalFailure",
  };
};
