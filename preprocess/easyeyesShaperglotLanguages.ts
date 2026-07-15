/**
 * Maps EasyEyes `_language` phrase codes to shaperglot / gflanguages ids.
 * Only languages offered by EasyEyes International Phrases are listed.
 */
export const EASYEYES_SHAPERGLOT_LANGUAGE_IDS: Record<string, string> = {
  ar: "ar_Arab",
  bg: "bg_Cyrl",
  cs: "cs_Latn",
  da: "da_Latn",
  de: "de_Latn",
  el: "el_Grek",
  en: "en_Latn",
  es: "es_Latn",
  fa: "fa_Arab",
  fi: "fi_Latn",
  fr: "fr_Latn",
  he: "he_Hebr",
  hi: "hi_Deva",
  hr: "hr_Latn",
  hu: "hu_Latn",
  hy: "hy_Armn",
  id: "id_Latn",
  is: "is_Latn",
  it: "it_Latn",
  ja: "ja_Jpan",
  kn: "kn_Knda",
  ko: "ko_Kore",
  lt: "lt_Latn",
  ml: "ml_Mlym",
  ms: "ms_Latn",
  nl: "nl_Latn",
  no: "nb_Latn",
  pl: "pl_Latn",
  pt: "pt_Latn",
  "pt-pt": "pt_Latn",
  ro: "ro_Latn",
  ru: "ru_Cyrl",
  sr: "sr_Cyrl",
  sv: "sv_Latn",
  sw: "sw_Latn",
  tl: "fil_Latn",
  tr: "tr_Latn",
  ur: "ur_Arab",
  "zh-CN": "zh_Hans",
  "zh-TW": "zh_Hant",
};

export const shaperglotLanguageIdForEasyEyesCode = (
  languageCode: string,
): string | undefined => EASYEYES_SHAPERGLOT_LANGUAGE_IDS[languageCode];

/**
 * Resolve a `fontLanguage` parameter value (BCP 47-ish code, e.g. "en",
 * "en-US", "ar", "zh-Hans") to a shaperglot / gflanguages id.
 * Returns undefined for empty or unmapped codes.
 */
export const shaperglotLanguageIdForFontLanguage = (
  fontLanguage: string,
): string | undefined => {
  const lower = fontLanguage.trim().toLowerCase();
  if (!lower) return undefined;
  if (lower === "zh-hans") return "zh_Hans";
  if (lower === "zh-hant") return "zh_Hant";
  const exact = EASYEYES_SHAPERGLOT_LANGUAGE_IDS[lower];
  if (exact) return exact;
  // Region subtags (en-UK, en-US, pt-BR, ...) fall back to the base language.
  return EASYEYES_SHAPERGLOT_LANGUAGE_IDS[lower.split("-")[0]];
};
