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

  it("throws instead of falling back to a baked snapshot when the registry is uninitialized", async () => {
    const { readi18nPhrases } = await import("../components/readPhrases.js");
    // "EE_LanguageEnglishName" exists only in the retired static snapshot.
    // With the snapshot fallback removed, an uninitialized registry must throw.
    expect(() => readi18nPhrases("EE_LanguageEnglishName")).toThrow();
  });
});
