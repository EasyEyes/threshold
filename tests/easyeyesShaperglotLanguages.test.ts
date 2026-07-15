import {
  EASYEYES_SHAPERGLOT_LANGUAGE_IDS,
  shaperglotLanguageIdForEasyEyesCode,
  shaperglotLanguageIdForFontLanguage,
} from "../preprocess/easyeyesShaperglotLanguages";

describe("EasyEyes shaperglot language ids", () => {
  it("maps common study languages", () => {
    expect(shaperglotLanguageIdForEasyEyesCode("en")).toBe("en_Latn");
    expect(shaperglotLanguageIdForEasyEyesCode("ar")).toBe("ar_Arab");
    expect(shaperglotLanguageIdForEasyEyesCode("fa")).toBe("fa_Arab");
    expect(shaperglotLanguageIdForEasyEyesCode("ur")).toBe("ur_Arab");
    expect(shaperglotLanguageIdForEasyEyesCode("zh-CN")).toBe("zh_Hans");
  });

  it("lists only EasyEyes-supported languages", () => {
    expect(Object.keys(EASYEYES_SHAPERGLOT_LANGUAGE_IDS).length).toBe(40);
  });
});

describe("fontLanguage code resolution", () => {
  it("maps plain fontLanguage codes", () => {
    expect(shaperglotLanguageIdForFontLanguage("en")).toBe("en_Latn");
    expect(shaperglotLanguageIdForFontLanguage("ar")).toBe("ar_Arab");
    expect(shaperglotLanguageIdForFontLanguage("fa")).toBe("fa_Arab");
    expect(shaperglotLanguageIdForFontLanguage("ur")).toBe("ur_Arab");
  });

  it("maps region and script subtags", () => {
    expect(shaperglotLanguageIdForFontLanguage("en-US")).toBe("en_Latn");
    expect(shaperglotLanguageIdForFontLanguage("en-UK")).toBe("en_Latn");
    expect(shaperglotLanguageIdForFontLanguage("zh-Hans")).toBe("zh_Hans");
    expect(shaperglotLanguageIdForFontLanguage("zh-Hant")).toBe("zh_Hant");
  });

  it("returns undefined for empty or unknown codes", () => {
    expect(shaperglotLanguageIdForFontLanguage("")).toBeUndefined();
    expect(shaperglotLanguageIdForFontLanguage("  ")).toBeUndefined();
    expect(shaperglotLanguageIdForFontLanguage("xx")).toBeUndefined();
  });
});
