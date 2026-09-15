import {
  buildStudyCatalogRequirements,
  validateStudyCatalogRequirements,
} from "../threshold-engine/src/studyCatalogRequirements";

describe("study catalog requirements", () => {
  const rows = [
    ["block", "1", "2"],
    ["_language", "French", "English"],
    ["font", "Arial", "Arial"],
    ["instruction", "EE_questionAndAnswer02", "EE_questionAndAnswer01"],
    ["custom", "~Welcome", "~welcome"],
  ];

  it("is deterministic, sorted, and keeps released and custom phrases separate", () => {
    expect(buildStudyCatalogRequirements(rows)).toEqual({
      schemaVersion: 1,
      phraseKeys: ["EE_questionAndAnswer01", "EE_questionAndAnswer02"],
      phraseFamilies: ["EE_questionAndAnswer"],
      parameterNames: ["_language", "custom", "font", "instruction"],
      languages: ["English", "French"],
      customPhraseKeys: ["welcome"],
    });
  });

  it("returns all missing released definitions with stable codes", () => {
    const diagnostics = validateStudyCatalogRequirements(
      buildStudyCatalogRequirements(rows),
      { _language: {}, font: {}, custom: {}, instruction: {} },
      { EE_questionAndAnswer01: {} },
    );
    expect(
      diagnostics.map(({ code, parameters }) => ({ code, parameters })),
    ).toEqual([
      {
        code: "PHRASE_DEFINITION_MISSING",
        parameters: ["EE_questionAndAnswer02"],
      },
    ]);
  });
});
