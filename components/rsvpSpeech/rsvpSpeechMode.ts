export type RsvpReadingResponseMode = "silent" | "spoken" | "automaticSpeech";

export interface RsvpReadingResponseModeParameters {
  readonly responseSpokenBool: boolean;
  readonly responseSpokenToExperimenterBool: boolean;
}

export interface RsvpReadingBlockResponseModeParameters {
  readonly responseSpokenBool: readonly boolean[];
  readonly responseSpokenToExperimenterBool: readonly boolean[];
}

export class RsvpReadingResponseModeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RsvpReadingResponseModeConfigurationError";
  }
}

const requireBoolean = (value: unknown, parameterName: string): boolean => {
  if (typeof value !== "boolean") {
    throw new RsvpReadingResponseModeConfigurationError(
      `${parameterName} must be a Boolean value for RSVP reading.`,
    );
  }
  return value;
};

/**
 * Resolves the RSVP-specific response path while preserving the existing
 * matrix (`silent`) and human-scored (`spoken`) mode identifiers.
 */
export const resolveRsvpReadingResponseMode = ({
  responseSpokenBool: rawResponseSpokenBool,
  responseSpokenToExperimenterBool: rawResponseSpokenToExperimenterBool,
}: RsvpReadingResponseModeParameters): RsvpReadingResponseMode => {
  const responseSpokenBool = requireBoolean(
    rawResponseSpokenBool,
    "responseSpokenBool",
  );
  const responseSpokenToExperimenterBool = requireBoolean(
    rawResponseSpokenToExperimenterBool,
    "responseSpokenToExperimenterBool",
  );

  if (responseSpokenBool && responseSpokenToExperimenterBool) {
    throw new RsvpReadingResponseModeConfigurationError(
      "RSVP reading cannot use automatic speech recognition and human experimenter scoring at the same time.",
    );
  }

  if (responseSpokenBool) return "automaticSpeech";
  return responseSpokenToExperimenterBool ? "spoken" : "silent";
};

/**
 * Resolves one mode per condition without collapsing block-level parameters
 * into a single setting.
 */
export const resolveRsvpReadingBlockResponseModes = ({
  responseSpokenBool,
  responseSpokenToExperimenterBool,
}: RsvpReadingBlockResponseModeParameters): RsvpReadingResponseMode[] => {
  if (
    !Array.isArray(responseSpokenBool) ||
    !Array.isArray(responseSpokenToExperimenterBool)
  ) {
    throw new RsvpReadingResponseModeConfigurationError(
      "RSVP reading block response parameters must be arrays.",
    );
  }
  if (responseSpokenBool.length !== responseSpokenToExperimenterBool.length) {
    throw new RsvpReadingResponseModeConfigurationError(
      "RSVP reading block response parameters must contain one value per condition.",
    );
  }

  return responseSpokenBool.map((automaticSpeech, index) =>
    resolveRsvpReadingResponseMode({
      responseSpokenBool: automaticSpeech,
      responseSpokenToExperimenterBool: responseSpokenToExperimenterBool[index],
    }),
  );
};

export const isRsvpReadingMatrixResponseMode = (
  mode: RsvpReadingResponseMode,
): mode is "silent" => mode === "silent";

export const isRsvpReadingExperimenterResponseMode = (
  mode: RsvpReadingResponseMode,
): mode is "spoken" => mode === "spoken";

export const isRsvpReadingAutomaticSpeechResponseMode = (
  mode: RsvpReadingResponseMode,
): mode is "automaticSpeech" => mode === "automaticSpeech";

/**
 * The shared reading-question builder uses `spoken` to mean that no choice
 * foils are needed. Automatic RSVP speech follows that same question policy
 * without changing its task-level response mode.
 */
export const getRsvpReadingQuestionResponseType = (
  mode: RsvpReadingResponseMode,
): "silent" | "spoken" =>
  isRsvpReadingMatrixResponseMode(mode) ? "silent" : "spoken";
