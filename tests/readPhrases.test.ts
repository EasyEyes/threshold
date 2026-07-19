import type { PhrasesData } from "../../source/components/types";

const captureMessage = jest.fn();

jest.mock("../components/sentry.js", () => ({ captureMessage }));

const mockData: PhrasesData = {
  version: "t",
  phrases: {
    greeting: {
      en: "Hello",
      fr: "Bonjour",
      fil: "Kumusta",
      "zh-TW": "\u4f60\u597d",
    },
  },
};

describe("readi18nPhrases", () => {
  beforeEach(() => {
    jest.resetModules();
    captureMessage.mockClear();
  });

  it("resolves a phrase from the initialized Firebase registry", async () => {
    const reg = await import("../parameters/phrasesRegistry");
    reg.initPhrases(mockData);
    const { readi18nPhrases } = await import("../components/readPhrases.js");
    expect(readi18nPhrases("greeting", "fr")).toBe("Bonjour");
  });

  it("throws instead of falling back to a baked snapshot when the registry is uninitialized", async () => {
    const { readi18nPhrases } = await import("../components/readPhrases.js");
    // "EE_languageNameEnglish" exists only in the retired static snapshot.
    // With the snapshot fallback removed, an uninitialized registry must throw.
    expect(() => readi18nPhrases("EE_languageNameEnglish")).toThrow();
  });

  it("reads a current phrase through a historical language alias", async () => {
    const reg = await import("../parameters/phrasesRegistry");
    reg.initPhrases(mockData);
    const { readi18nPhrases } = await import("../components/readPhrases.js");

    expect(readi18nPhrases("greeting", "zh-HK")).toBe("\u4f60\u597d");
    expect(captureMessage).toHaveBeenCalledWith(
      "Language code compatibility alias used",
      "warning",
      expect.objectContaining({
        requestedLanguage: "zh-HK",
        resolvedLanguage: "zh-TW",
      }),
    );
  });

  it("falls back to English and reports a missing translation", async () => {
    const reg = await import("../parameters/phrasesRegistry");
    reg.initPhrases(mockData);
    const { readi18nPhrases } = await import("../components/readPhrases.js");

    expect(readi18nPhrases("greeting", "hy")).toBe("Hello");
    expect(captureMessage).toHaveBeenCalledWith(
      "Language phrase fallback used",
      "warning",
      expect.objectContaining({
        phraseName: "greeting",
        requestedLanguage: "hy",
        resolvedLanguage: "en",
      }),
    );
  });
});
