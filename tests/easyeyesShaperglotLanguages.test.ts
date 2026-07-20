import {
  EASYEYES_SHAPERGLOT_LANGUAGE_IDS,
  shaperglotLanguageIdForEasyEyesCode,
  shaperglotLanguageIdForFontLanguage,
} from "../preprocess/easyeyesShaperglotLanguages";
import { loadGlossaryForTests } from "./helpers/glossary";
import { getGlossary } from "../parameters/glossaryRegistry";

/**
 * fontLanguage categories from glossary 16.5 (excluding "none", which
 * disables language checking). Every code the glossary offers must resolve
 * to a shaperglot id, otherwise the compiler silently skips the font
 * language check for that language.
 */
const FONT_LANGUAGE_CATEGORIES = [
  "af",
  "sq",
  "ar",
  "hy",
  "az",
  "eu",
  "be",
  "bn",
  "bg",
  "my",
  "ca",
  "zh-Hans",
  "zh-Hant",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "en-UK",
  "en-US",
  "fil",
  "fi",
  "fr",
  "ka",
  "de",
  "el",
  "kl",
  "gu",
  "he",
  "hi",
  "hu",
  "is",
  "id",
  "it",
  "ja",
  "kn",
  "ko",
  "ky",
  "lv",
  "lt",
  "mk",
  "ms",
  "ml",
  "mt",
  "mn",
  "ne",
  "no",
  "ps",
  "fa",
  "pl",
  "pt",
  "pa",
  "ro",
  "ru",
  "sr",
  "sk",
  "sl",
  "es",
  "sv",
  "gsw",
  "ta",
  "te",
  "th",
  "bo",
  "tr",
  "uk",
  "ur",
  "ug",
  "uz",
  "vi",
];

describe("EasyEyes shaperglot language ids", () => {
  it("maps common study languages", () => {
    expect(shaperglotLanguageIdForEasyEyesCode("en")).toBe("en_Latn");
    expect(shaperglotLanguageIdForEasyEyesCode("ar")).toBe("ar_Arab");
    expect(shaperglotLanguageIdForEasyEyesCode("fa")).toBe("fa_Arab");
    expect(shaperglotLanguageIdForEasyEyesCode("ur")).toBe("ur_Arab");
    expect(shaperglotLanguageIdForEasyEyesCode("zh-CN")).toBe("zh_Hans");
    expect(shaperglotLanguageIdForEasyEyesCode("pt-PT")).toBe("pt_Latn");
    expect(shaperglotLanguageIdForEasyEyesCode("tl")).toBe("fil_Latn");
  });

  it("lists only EasyEyes-supported languages", () => {
    expect(Object.keys(EASYEYES_SHAPERGLOT_LANGUAGE_IDS).length).toBe(73);
  });

  it("uses legal BCP 47 tags in canonical case as keys", () => {
    // language (lowercase), optional script (Titlecase) or region (UPPERCASE)
    const canonicalBcp47 = /^[a-z]{2,3}(-(?:[A-Z][a-z]{3}|[A-Z]{2}))?$/;
    for (const code of Object.keys(EASYEYES_SHAPERGLOT_LANGUAGE_IDS)) {
      expect(code).toMatch(canonicalBcp47);
    }
  });

  it("matches codes case-insensitively per BCP 47", () => {
    expect(shaperglotLanguageIdForEasyEyesCode("zh-cn")).toBe("zh_Hans");
    expect(shaperglotLanguageIdForEasyEyesCode("PT-pt")).toBe("pt_Latn");
  });

  it("uses well-formed gflanguages ids (lang_Script)", () => {
    for (const id of Object.values(EASYEYES_SHAPERGLOT_LANGUAGE_IDS)) {
      expect(id).toMatch(/^[a-z]{2,3}_[A-Z][a-z]{3}$/);
    }
  });
});

describe("fontLanguage code resolution", () => {
  it("maps plain fontLanguage codes", () => {
    expect(shaperglotLanguageIdForFontLanguage("en")).toBe("en_Latn");
    expect(shaperglotLanguageIdForFontLanguage("ar")).toBe("ar_Arab");
    expect(shaperglotLanguageIdForFontLanguage("fa")).toBe("fa_Arab");
    expect(shaperglotLanguageIdForFontLanguage("ur")).toBe("ur_Arab");
  });

  it("maps the languages added in glossary 16.5", () => {
    expect(shaperglotLanguageIdForFontLanguage("af")).toBe("af_Latn");
    expect(shaperglotLanguageIdForFontLanguage("fil")).toBe("fil_Latn");
    expect(shaperglotLanguageIdForFontLanguage("gsw")).toBe("gsw_Latn");
    expect(shaperglotLanguageIdForFontLanguage("bo")).toBe("bo_Tibt");
    expect(shaperglotLanguageIdForFontLanguage("th")).toBe("th_Thai");
    expect(shaperglotLanguageIdForFontLanguage("uk")).toBe("uk_Cyrl");
    expect(shaperglotLanguageIdForFontLanguage("pa")).toBe("pa_Guru");
    expect(shaperglotLanguageIdForFontLanguage("ug")).toBe("ug_Arab");
    expect(shaperglotLanguageIdForFontLanguage("kl")).toBe("kl_Latn");
    expect(shaperglotLanguageIdForFontLanguage("mn")).toBe("mn_Cyrl");
  });

  it("maps region and script subtags", () => {
    expect(shaperglotLanguageIdForFontLanguage("en-US")).toBe("en_Latn");
    expect(shaperglotLanguageIdForFontLanguage("en-UK")).toBe("en_Latn");
    expect(shaperglotLanguageIdForFontLanguage("zh-Hans")).toBe("zh_Hans");
    expect(shaperglotLanguageIdForFontLanguage("zh-Hant")).toBe("zh_Hant");
  });

  it("resolves every glossary fontLanguage category", () => {
    for (const code of FONT_LANGUAGE_CATEGORIES) {
      expect(shaperglotLanguageIdForFontLanguage(code)).toBeDefined();
    }
  });

  it("returns undefined for empty, none, or unknown codes", () => {
    expect(shaperglotLanguageIdForFontLanguage("")).toBeUndefined();
    expect(shaperglotLanguageIdForFontLanguage("  ")).toBeUndefined();
    expect(shaperglotLanguageIdForFontLanguage("none")).toBeUndefined();
    expect(shaperglotLanguageIdForFontLanguage("xx")).toBeUndefined();
  });
});

describe("live glossary fontLanguage coverage", () => {
  // Guards against drift: when a new language is added to the glossary's
  // fontLanguage categories, the shaperglot map must gain a mapping too.
  // (Delete tests/__cache__/glossary.json to test against the live glossary.)
  it("resolves every fontLanguage category in the loaded glossary", async () => {
    await loadGlossaryForTests();
    const categories = (getGlossary()["fontLanguage"]?.categories ??
      []) as string[];
    expect(categories.length).toBeGreaterThan(0);
    const unmapped = categories.filter(
      (code) =>
        code !== "none" &&
        shaperglotLanguageIdForFontLanguage(code) === undefined,
    );
    expect(unmapped).toEqual([]);
  });
});
