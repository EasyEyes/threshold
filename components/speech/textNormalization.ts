export type SpeechLanguageProfileId = "default" | "en" | "fa" | "ar";

export interface NormalizedSpeechToken {
  readonly original: string;
  readonly normalized: string;
  readonly comparisonKey: string;
  readonly languageCode: string;
  readonly profileId: SpeechLanguageProfileId;
  readonly profileVersion: string;
  readonly phoneticKeys: readonly string[];
}

export type SpeechTokenSplitMatchKind =
  | "explicitJoinControl"
  | "persianAffixBoundary";

export interface SpeechTranscriptTokenization {
  readonly rawText: string;
  readonly languageCode: string;
  readonly profileId: SpeechLanguageProfileId;
  readonly profileVersion: string;
  readonly tokens: readonly NormalizedSpeechToken[];
}

interface SpeechLanguageProfile {
  readonly id: SpeechLanguageProfileId;
  readonly version: string;
  prepareText(text: string): string;
  normalizeToken(token: string, languageCode: string): NormalizedSpeechToken;
}

const ZWNJ = "\u200C";
const NON_STANDARD_JOIN_CONTROLS = /[\u200B\u200D\u2060\uFEFF]/g;
const ALL_JOIN_CONTROLS = /[\u200B-\u200D\u2060\uFEFF]/g;
const JOIN_CONTROL_CHARACTER = /[\u200B-\u200D\u2060\uFEFF]/u;
const APOSTROPHE_VARIANTS = /[\u2018\u2019\u02BC\u0060\u00B4]/g;
const DASH_VARIANTS = /[\u2010-\u2015\u2212]/g;
const EDGE_NON_WORD =
  /^[^\p{L}\p{N}\p{M}\u200C\u200D]+|[^\p{L}\p{N}\p{M}\u200C\u200D]+$/gu;
const CONTAINS_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;
const NUMBER = /\p{N}/u;
const PUNCTUATION_RUN_BETWEEN_WORD_CHARACTERS =
  /([\p{L}\p{N}\p{M}])(\p{P}+)(?=([\p{L}\p{N}\p{M}]))/gu;

const LEXICAL_INTERNAL_PUNCTUATION = new Set([
  "'",
  "\u2018",
  "\u2019",
  "\u02BC",
  "\u0060",
  "\u00B4",
  "-",
  "\u2010",
  "\u2011",
]);

const NUMERIC_INTERNAL_PUNCTUATION = new Set([
  ".",
  ",",
  ":",
  "/",
  "\u066B",
  "\u066C",
  "\uFF0E",
  "\uFF0C",
  "\uFF1A",
  "\uFF0F",
]);

const ARABIC_YEH = /\u064A/g;
const PERSIAN_YEH = "\u06CC";
const PERSIAN_YEH_PATTERN = /\u06CC/g;
const ARABIC_KAF = /\u0643/g;
const PERSIAN_KAF = "\u06A9";
const PERSIAN_KAF_PATTERN = /\u06A9/g;
const TATWEEL = /\u0640/g;
const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

const PERSIAN_PHONETIC_EQUIVALENTS: Readonly<Record<string, string>> =
  Object.freeze({
    "\u0633": "S",
    "\u0635": "S",
    "\u062B": "S",
    "\u0632": "Z",
    "\u0630": "Z",
    "\u0636": "Z",
    "\u0638": "Z",
    "\u062A": "T",
    "\u0637": "T",
    "\u0642": "Q",
    "\u063A": "Q",
    "\u0647": "H",
    "\u062D": "H",
    "\u0627": "A",
    "\u0622": "A",
    "\u0623": "A",
    "\u0625": "A",
    "\u06A9": "K",
    "\u0643": "K",
    "\u06CC": "Y",
    "\u064A": "Y",
    "\u0648": "V",
    "\u0639": "E",
  });

const PERSIAN_SEPARABLE_PREFIXES = new Set([
  "\u0645\u06CC",
  "\u0646\u0645\u06CC",
]);
const PERSIAN_SEPARABLE_SUFFIXES = new Set([
  "\u0647\u0627",
  "\u0647\u0627\u06CC",
  "\u0647\u0627\u06CC\u06CC",
  "\u062A\u0631",
  "\u062A\u0631\u06CC\u0646",
]);

const normalizeLanguageCode = (languageCode: string): string => {
  const normalized = String(languageCode ?? "")
    .trim()
    .replace(/_/g, "-");
  if (!normalized) throw new Error("A speech language code is required.");
  return normalized;
};

const baseLanguage = (languageCode: string): string =>
  normalizeLanguageCode(languageCode).split("-")[0].toLowerCase();

const localeLowerCase = (text: string, languageCode: string): string => {
  try {
    return text.toLocaleLowerCase(languageCode);
  } catch {
    return text.toLowerCase();
  }
};

const prepareJoinControls = (text: string): string =>
  text
    .normalize("NFC")
    .replace(NON_STANDARD_JOIN_CONTROLS, ZWNJ)
    .replace(/[\t ]*\u200C+[\t ]*/g, ZWNJ);

const preparePunctuationBoundaries = (text: string): string =>
  text.replace(
    PUNCTUATION_RUN_BETWEEN_WORD_CHARACTERS,
    (match, left: string, punctuation: string, right: string) => {
      const characters = [...punctuation];
      if (
        characters.length === 1 &&
        LEXICAL_INTERNAL_PUNCTUATION.has(characters[0])
      ) {
        return match;
      }
      const numericExpression =
        NUMBER.test(left) &&
        NUMBER.test(right) &&
        characters.every((character) =>
          NUMERIC_INTERNAL_PUNCTUATION.has(character),
        );
      return numericExpression ? match : `${left} `;
    },
  );

const tokenResult = (
  original: string,
  normalized: string,
  comparisonKey: string,
  languageCode: string,
  profile: Pick<SpeechLanguageProfile, "id" | "version">,
  phoneticKeys: readonly string[] = [],
): NormalizedSpeechToken => ({
  original,
  normalized,
  comparisonKey,
  languageCode,
  profileId: profile.id,
  profileVersion: profile.version,
  phoneticKeys,
});

const persianPhoneticKey = (normalized: string): string =>
  [...normalized]
    .filter((character) => !JOIN_CONTROL_CHARACTER.test(character))
    .map((character) => PERSIAN_PHONETIC_EQUIVALENTS[character] ?? character)
    .join("");

const defaultProfile: SpeechLanguageProfile = {
  id: "default",
  version: "unicode-nfc-v1",
  prepareText: (text) => text.normalize("NFC"),
  normalizeToken: (token, languageCode) => {
    const normalized = localeLowerCase(
      token.normalize("NFC").replace(EDGE_NON_WORD, ""),
      languageCode,
    );
    return tokenResult(
      token,
      normalized,
      normalized.replace(ALL_JOIN_CONTROLS, ""),
      languageCode,
      defaultProfile,
    );
  },
};

const englishProfile: SpeechLanguageProfile = {
  id: "en",
  version: "english-nfkc-v1",
  prepareText: (text) => text.normalize("NFKC"),
  normalizeToken: (token, languageCode) => {
    const normalized = token
      .normalize("NFKC")
      .replace(APOSTROPHE_VARIANTS, "'")
      .replace(DASH_VARIANTS, "-")
      .toLocaleLowerCase("en-US")
      .replace(EDGE_NON_WORD, "");
    return tokenResult(
      token,
      normalized,
      normalized,
      languageCode,
      englishProfile,
    );
  },
};

const persianProfile: SpeechLanguageProfile = {
  id: "fa",
  version: "persian-orthographic-v1",
  prepareText: prepareJoinControls,
  normalizeToken: (token, languageCode) => {
    const normalized = prepareJoinControls(token)
      .replace(ARABIC_YEH, PERSIAN_YEH)
      .replace(ARABIC_KAF, PERSIAN_KAF)
      .replace(TATWEEL, "")
      .replace(ARABIC_DIACRITICS, "")
      .replace(EDGE_NON_WORD, "");
    return tokenResult(
      token,
      normalized,
      normalized.replace(ALL_JOIN_CONTROLS, ""),
      languageCode,
      persianProfile,
      normalized ? [persianPhoneticKey(normalized)] : [],
    );
  },
};

const arabicProfile: SpeechLanguageProfile = {
  id: "ar",
  version: "arabic-orthographic-v1",
  prepareText: prepareJoinControls,
  normalizeToken: (token, languageCode) => {
    const normalized = prepareJoinControls(token)
      .replace(PERSIAN_YEH_PATTERN, "\u064A")
      .replace(PERSIAN_KAF_PATTERN, "\u0643")
      .replace(TATWEEL, "")
      .replace(ARABIC_DIACRITICS, "")
      .replace(EDGE_NON_WORD, "");
    return tokenResult(
      token,
      normalized,
      normalized.replace(ALL_JOIN_CONTROLS, ""),
      languageCode,
      arabicProfile,
    );
  },
};

const resolveProfile = (languageCode: string): SpeechLanguageProfile => {
  switch (baseLanguage(languageCode)) {
    case "en":
      return englishProfile;
    case "fa":
    case "fas":
      return persianProfile;
    case "ar":
    case "ara":
      return arabicProfile;
    default:
      return defaultProfile;
  }
};

export const normalizeSpeechToken = (
  token: string,
  languageCode: string,
): NormalizedSpeechToken => {
  const normalizedLanguageCode = normalizeLanguageCode(languageCode);
  return resolveProfile(normalizedLanguageCode).normalizeToken(
    String(token ?? ""),
    normalizedLanguageCode,
  );
};

export const tokenizeSpeechTranscript = (
  text: string,
  languageCode: string,
): SpeechTranscriptTokenization => {
  const normalizedLanguageCode = normalizeLanguageCode(languageCode);
  const profile = resolveProfile(normalizedLanguageCode);
  const rawText = String(text ?? "");
  const preparedText = preparePunctuationBoundaries(
    profile.prepareText(rawText),
  );
  const tokens = preparedText
    .split(/\s+/u)
    .filter(Boolean)
    .map((token) => profile.normalizeToken(token, normalizedLanguageCode))
    .filter(
      (token) =>
        token.comparisonKey.length > 0 &&
        CONTAINS_LETTER_OR_NUMBER.test(token.comparisonKey),
    );

  return {
    rawText,
    languageCode: normalizedLanguageCode,
    profileId: profile.id,
    profileVersion: profile.version,
    tokens,
  };
};

export const speechTokenSplitMatchKind = (
  target: NormalizedSpeechToken,
  transcriptParts: readonly NormalizedSpeechToken[],
): SpeechTokenSplitMatchKind | null => {
  if (
    transcriptParts.length < 2 ||
    transcriptParts.some((part) => part.profileId !== target.profileId) ||
    transcriptParts.map((part) => part.comparisonKey).join("") !==
      target.comparisonKey
  ) {
    return null;
  }

  if (
    (target.profileId === "fa" || target.profileId === "ar") &&
    target.normalized.includes(ZWNJ)
  ) {
    return "explicitJoinControl";
  }

  if (target.profileId !== "fa") return null;
  const firstPart = transcriptParts[0].comparisonKey;
  const lastPart = transcriptParts[transcriptParts.length - 1].comparisonKey;
  if (
    PERSIAN_SEPARABLE_PREFIXES.has(firstPart) ||
    PERSIAN_SEPARABLE_SUFFIXES.has(lastPart)
  ) {
    return "persianAffixBoundary";
  }
  return null;
};
