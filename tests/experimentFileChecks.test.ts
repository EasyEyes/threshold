import { checkPhraseFilePresence } from "../preprocess/experimentFileChecks";
import { readyResourceAvailabilities } from "../preprocess/resourceCatalog";

const phrases = (names: string[]) =>
  readyResourceAvailabilities({ phrases: names }).phrases;

describe("checkPhraseFilePresence", () => {
  it("returns one error when the named file is not in the uploaded list", () => {
    const result = checkPhraseFilePresence(
      "phrases.xlsx",
      phrases(["other.xlsx"]),
    );
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("error");
  });

  it("returns no errors when the named file is present in the uploaded list", () => {
    const result = checkPhraseFilePresence(
      "phrases.xlsx",
      phrases(["phrases.xlsx"]),
    );
    expect(result).toHaveLength(0);
  });

  it("returns no errors when _languagePhrasesSpreadsheet is not set (empty string)", () => {
    const result = checkPhraseFilePresence("", phrases([]));
    expect(result).toHaveLength(0);
  });
});
