import type { PhrasesData } from "../../source/components/types";

const mockData: PhrasesData = {
  version: "t",
  phrases: {
    greeting: { en: "Hello", fr: "Bonjour" },
  },
};

describe("readi18nPhrases", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("resolves a phrase from the initialized Firebase registry", async () => {
    const reg = await import("../parameters/phrasesRegistry");
    reg.initPhrases(mockData);
    const { readi18nPhrases } = await import("../components/readPhrases.js");
    expect(readi18nPhrases("greeting", "fr")).toBe("Bonjour");
  });

  it("reads the spacing phrase from current and older pinned catalogs", async () => {
    const reg = await import("../parameters/phrasesRegistry");
    const { readi18nPhrases } = await import("../components/readPhrases.js");
    reg.initPhrases({
      version: "current",
      phrases: { EE_LanguageUsesSpacesBool: { en: "TRUE" } },
    });
    expect(readi18nPhrases("EE_languageUsesSpacesBool", "en")).toBe("TRUE");
    reg.initPhrases({
      version: "older",
      phrases: { EE_languageUsesSpacesBool: { en: "FALSE" } },
    });
    expect(readi18nPhrases("EE_languageUsesSpacesBool", "en")).toBe("FALSE");
  });

  it("throws instead of falling back to a baked snapshot when the registry is uninitialized", async () => {
    const { readi18nPhrases } = await import("../components/readPhrases.js");
    // "EE_LanguageEnglishName" exists only in the retired static snapshot.
    // With the snapshot fallback removed, an uninitialized registry must throw.
    expect(() => readi18nPhrases("EE_LanguageEnglishName")).toThrow();
  });
});
