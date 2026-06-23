import { isPhraseFileMissing } from "../preprocess/experimentFileChecks";

describe("isPhraseFileMissing", () => {
  it("returns one error when the named file is not in the uploaded list", () => {
    const result = isPhraseFileMissing("phrases.xlsx", ["other.xlsx"]);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("error");
  });

  it("returns no errors when the named file is present in the uploaded list", () => {
    const result = isPhraseFileMissing("phrases.xlsx", ["phrases.xlsx"]);
    expect(result).toHaveLength(0);
  });

  it("returns no errors when _languagePhrasesSpreadsheet is not set (empty string)", () => {
    const result = isPhraseFileMissing("", []);
    expect(result).toHaveLength(0);
  });
});
