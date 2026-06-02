import type { PhrasesData } from "../../source/components/types";

const mockData: PhrasesData = {
  version: "1.0",
  phrases: {
    greeting: { en: "Hello", fr: "Bonjour" },
    farewell: { en: "Goodbye", fr: "Au revoir" },
  },
};

describe("phrasesRegistry", () => {
  let mod: typeof import("../parameters/phrasesRegistry");

  beforeEach(async () => {
    jest.resetModules();
    mod = await import("../parameters/phrasesRegistry");
  });

  it("getPhrases() throws before initPhrases is called", () => {
    expect(() => mod.getPhrases()).toThrow();
  });

  it("getPhrases() returns data.phrases after initPhrases(data)", () => {
    mod.initPhrases(mockData);
    expect(mod.getPhrases()).toEqual(mockData.phrases);
  });

  it("getPhrasesVersion() returns null before initPhrases is called", () => {
    expect(mod.getPhrasesVersion()).toBeNull();
  });

  it("getPhrasesVersion() returns the version after initPhrases(data)", () => {
    mod.initPhrases(mockData);
    expect(mod.getPhrasesVersion()).toBe("1.0");
  });

  it("calling initPhrases twice overwrites the first value", () => {
    const secondData: PhrasesData = {
      version: "2.0",
      phrases: { hello: { en: "Hi", de: "Hallo" } },
    };
    mod.initPhrases(mockData);
    mod.initPhrases(secondData);
    expect(mod.getPhrases()).toEqual(secondData.phrases);
    expect(mod.getPhrasesVersion()).toBe("2.0");
  });
});
