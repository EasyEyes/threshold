import { tokenizeSpeechTranscript } from "../speech/textNormalization";
import { scoreRsvpSpeechResponse } from "./rsvpSpeechScoring";

export const RSVP_SPEECH_SILENCE_MS = 8_000;
export const RSVP_SPEECH_CONFIRMATION_MS = 800;
export const RSVP_SPEECH_FINISH_PHRASE = "don't know";

/** Recognize a bounded set of spelling variants, never fuzzy-match targets. */
export const stripRsvpSpeechFinishPhrase = (
  text: string,
  languageCode: string,
  phrase = RSVP_SPEECH_FINISH_PHRASE,
): { text: string; finished: boolean } => {
  if (!phrase.trim()) return { text, finished: false };
  const tokens = tokenizeSpeechTranscript(text, languageCode).tokens;
  const keys = tokens.map((token) => token.normalized.replace(/'/g, ""));
  const phraseKeys = tokenizeSpeechTranscript(phrase, languageCode).tokens.map(
    (token) => token.normalized.replace(/'/g, ""),
  );
  const variants = [phraseKeys];
  if (
    languageCode.toLowerCase().split(/[-_]/)[0] === "en" &&
    phraseKeys.join(" ") === "dont know"
  ) {
    variants.push(["do", "not", "know"], ["dont", "no"], ["dunno"]);
  }
  for (const variant of variants) {
    if (!variant.length || variant.length > keys.length) continue;
    const offset = keys.length - variant.length;
    if (!variant.every((key, index) => keys[offset + index] === key)) continue;
    // "I" belongs to the English command, not to the preceding answer.
    const start =
      languageCode.toLowerCase().startsWith("en") &&
      offset > 0 &&
      keys[offset - 1] === "i"
        ? offset - 1
        : offset;
    return {
      text: tokens
        .slice(0, start)
        .map((token) => token.original)
        .join(" "),
      finished: true,
    };
  }
  return { text, finished: false };
};

export const hasAllRsvpSpeechTargets = (
  text: string,
  targetWords: readonly string[],
  languageCode: string,
  ignoreOrder: boolean,
): boolean =>
  scoreRsvpSpeechResponse({
    transcript: text,
    targetWords,
    languageCode,
    policy: {
      wordOrder: ignoreOrder ? "anyOrder" : "strict",
      repetition: "ignore",
      selfCorrection: "accept",
    },
  }).responseVector.every((correct) => correct === 1);
