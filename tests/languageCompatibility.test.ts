import {
  isCompatibleLanguageCode,
  resolveLanguageCode,
} from "../components/languageCompatibility";

describe("language compatibility", () => {
  const currentCodes = [
    "ar",
    "bn",
    "zh-CN",
    "zh-TW",
    "cs",
    "da",
    "nl",
    "en",
    "fil",
    "fi",
    "fr",
    "de",
    "el",
    "ha",
    "he",
    "hi",
    "hu",
    "id",
    "it",
    "ja",
    "jv",
    "ko",
    "ms",
    "mr",
    "pcm",
    "no",
    "fa",
    "pl",
    "pt-pt",
    "pa",
    "ro",
    "ru",
    "es",
    "sw",
    "sv",
    "ta",
    "te",
    "th",
    "tr",
    "uk",
    "ur",
    "vi",
  ];

  it("accepts every code in the authoritative final allowlist", () => {
    expect(currentCodes).toHaveLength(42);
    expect(
      currentCodes.every((code) =>
        isCompatibleLanguageCode(code, currentCodes),
      ),
    ).toBe(true);
  });

  it.each([
    ["zh-HK", "zh-TW"],
    ["tl", "fil"],
    ["en-US", "en"],
    ["en-UK", "en"],
    ["pt", "pt-pt"],
  ])("maps the historical code %s to %s", (historical, current) => {
    expect(resolveLanguageCode(historical, currentCodes)).toEqual({
      requested: historical,
      resolved: current,
      reason: "alias",
    });
  });

  it("uses English when a historical language has no replacement", () => {
    expect(resolveLanguageCode("hy", currentCodes)).toEqual({
      requested: "hy",
      resolved: "en",
      reason: "fallback",
    });
  });

  it("keeps Swahili as a current language without a warning-worthy fallback", () => {
    expect(resolveLanguageCode("sw", currentCodes)).toEqual({
      requested: "sw",
      resolved: "sw",
      reason: "current",
    });
  });

  it("accepts current and historical codes during authoring validation", () => {
    expect(isCompatibleLanguageCode("zh-CN", currentCodes)).toBe(true);
    expect(isCompatibleLanguageCode("zh-HK", currentCodes)).toBe(true);
    expect(isCompatibleLanguageCode("hy", currentCodes)).toBe(true);
    expect(isCompatibleLanguageCode("not-a-language", currentCodes)).toBe(
      false,
    );
  });
});
