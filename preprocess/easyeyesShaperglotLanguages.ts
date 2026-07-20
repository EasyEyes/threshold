/**
 * Maps EasyEyes language codes (legal BCP 47 tags, in canonical case) to
 * shaperglot / gflanguages ids.
 *
 * Covers the codes accepted by the `_language` parameter (International
 * Phrases) and the `fontLanguage` parameter (glossary categories), e.g.
 * "fil", "pt-PT", "zh-Hans". Per BCP 47 (RFC 5646 §2.1.1) tags match
 * case-insensitively, so the lookup helpers below fold case.
 *
 * Keep in sync with the glossary's fontLanguage categories. Every id must
 * exist in the gflanguages database bundled into the EasyEyes WASM (the
 * google-fonts-languages crate pinned in @rust/Cargo.lock), otherwise the
 * language check is skipped with a console warning. After adding ids,
 * verify them against the wasm: `node @rust/verify-language-ids.mjs`.
 */
export const EASYEYES_SHAPERGLOT_LANGUAGE_IDS: Record<string, string> = {
  af: "af_Latn", // Afrikaans
  ar: "ar_Arab", // Arabic
  az: "az_Latn", // Azerbaijani
  be: "be_Cyrl", // Belarusian
  bg: "bg_Cyrl", // Bulgarian
  bn: "bn_Beng", // Bengali
  bo: "bo_Tibt", // Tibetan
  ca: "ca_Latn", // Catalan
  cs: "cs_Latn", // Czech
  da: "da_Latn", // Danish
  de: "de_Latn", // German
  el: "el_Grek", // Greek
  en: "en_Latn", // English
  es: "es_Latn", // Spanish
  eu: "eu_Latn", // Basque
  fa: "fa_Arab", // Persian
  fi: "fi_Latn", // Finnish
  fil: "fil_Latn", // Filipino
  fr: "fr_Latn", // French
  gsw: "gsw_Latn", // Swiss German
  gu: "gu_Gujr", // Gujarati
  he: "he_Hebr", // Hebrew
  hi: "hi_Deva", // Hindi
  hr: "hr_Latn", // Croatian
  hu: "hu_Latn", // Hungarian
  hy: "hy_Armn", // Armenian
  id: "id_Latn", // Indonesian
  is: "is_Latn", // Icelandic
  it: "it_Latn", // Italian
  ja: "ja_Jpan", // Japanese
  ka: "ka_Geor", // Georgian
  kl: "kl_Latn", // Greenlandic
  kn: "kn_Knda", // Kannada
  ko: "ko_Kore", // Korean
  ky: "ky_Cyrl", // Kyrgyz
  lt: "lt_Latn", // Lithuanian
  lv: "lv_Latn", // Latvian
  mk: "mk_Cyrl", // Macedonian
  ml: "ml_Mlym", // Malayalam
  mn: "mn_Cyrl", // Mongolian (Cyrillic)
  ms: "zlm_Latn", // Malay (gflanguages has no ms_Latn; zlm is Malay proper)
  mt: "mt_Latn", // Maltese
  my: "my_Mymr", // Burmese
  ne: "ne_Deva", // Nepali
  nl: "nl_Latn", // Dutch
  no: "nb_Latn", // Norwegian (Bokmål)
  pa: "pa_Guru", // Punjabi (Gurmukhi)
  pl: "pl_Latn", // Polish
  ps: "ps_Arab", // Pashto
  pt: "pt_Latn", // Portuguese
  "pt-PT": "pt_Latn", // Portuguese (Portugal)
  ro: "ro_Latn", // Romanian
  ru: "ru_Cyrl", // Russian
  sk: "sk_Latn", // Slovak
  sl: "sl_Latn", // Slovenian
  sq: "sq_Latn", // Albanian
  sr: "sr_Cyrl", // Serbian
  sv: "sv_Latn", // Swedish
  sw: "sw_Latn", // Swahili
  ta: "ta_Taml", // Tamil
  te: "te_Telu", // Telugu
  th: "th_Thai", // Thai
  tl: "fil_Latn", // Tagalog (phrase code for Filipino)
  tr: "tr_Latn", // Turkish
  ug: "ug_Arab", // Uyghur
  uk: "uk_Cyrl", // Ukrainian
  ur: "ur_Arab", // Urdu
  uz: "uz_Latn", // Uzbek
  vi: "vi_Latn", // Vietnamese
  "zh-CN": "zh_Hans", // Chinese (Simplified, region tag)
  "zh-Hans": "zh_Hans", // Chinese (Simplified)
  "zh-Hant": "zh_Hant", // Chinese (Traditional)
  "zh-TW": "zh_Hant", // Chinese (Traditional, region tag)
};

// BCP 47 tags are case-insensitive; index by lowercase for lookups.
const LOWERCASE_LANGUAGE_IDS: Record<string, string> = Object.fromEntries(
  Object.entries(EASYEYES_SHAPERGLOT_LANGUAGE_IDS).map(([code, id]) => [
    code.toLowerCase(),
    id,
  ]),
);

/** Resolve an EasyEyes `_language` phrase code (BCP 47, e.g. "zh-CN"). */
export const shaperglotLanguageIdForEasyEyesCode = (
  languageCode: string,
): string | undefined =>
  LOWERCASE_LANGUAGE_IDS[languageCode.trim().toLowerCase()];

/**
 * Resolve a `fontLanguage` parameter value (BCP 47 tag, e.g. "en",
 * "en-US", "ar", "zh-Hans") to a shaperglot / gflanguages id.
 * Returns undefined for empty or unmapped codes (including "none",
 * which disables language checking).
 */
export const shaperglotLanguageIdForFontLanguage = (
  fontLanguage: string,
): string | undefined => {
  const lower = fontLanguage.trim().toLowerCase();
  if (!lower) return undefined;
  const exact = LOWERCASE_LANGUAGE_IDS[lower];
  if (exact) return exact;
  // Unmapped subtag combinations (en-UK, en-US, pt-BR, ...) fall back to
  // the primary language subtag.
  return LOWERCASE_LANGUAGE_IDS[lower.split("-")[0]];
};
