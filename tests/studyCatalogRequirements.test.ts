import {
  buildStudyCatalogRequirements,
  validateStudyCatalogRequirements,
} from "../threshold-engine/src/studyCatalogRequirements";
import { initGlossary } from "../parameters/glossaryRegistry";

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
      {
        glossary: { _language: {}, font: {}, custom: {}, instruction: {} },
        superMatchingParams: [],
      },
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

  it("returns every missing parameter in one stable diagnostic", () => {
    initGlossary({
      version: "resolved-test-version",
      glossary: { _language: {}, font: {} } as any,
      glossaryFull: [],
      superMatchingParams: [],
    });

    const diagnostics = validateStudyCatalogRequirements(
      {
        schemaVersion: 1,
        phraseKeys: [],
        phraseFamilies: [],
        parameterNames: ["unknownZ", "font", "unknownA", "unknownZ"],
        languages: [],
        customPhraseKeys: [],
      },
      { glossary: { _language: {}, font: {} }, superMatchingParams: [] },
      {},
    );

    expect(
      diagnostics.map(({ code, parameters }) => ({ code, parameters })),
    ).toEqual([
      {
        code: "PARAMETER_DEFINITION_MISSING",
        parameters: ["unknownA", "unknownZ"],
      },
    ]);
  });

  it("accepts exact Glossary definitions and registered super-matching parameters", () => {
    initGlossary({
      version: "resolved-test-version",
      glossary: { targetKind: {} } as any,
      glossaryFull: [],
      superMatchingParams: ["questionAndAnswer@@"],
      aliases: { target: "targetKind" },
    });

    const diagnostics = validateStudyCatalogRequirements(
      {
        schemaVersion: 1,
        phraseKeys: [],
        phraseFamilies: [],
        parameterNames: ["targetKind", "target", "questionAndAnswer12"],
        languages: [],
        customPhraseKeys: [],
      },
      {
        glossary: { targetKind: {} },
        superMatchingParams: ["questionAndAnswer@@"],
        aliases: { target: "targetKind" },
      },
      {},
    );

    expect(diagnostics).toEqual([]);
  });

  it("does not accept patterns from a different Glossary registry version", () => {
    initGlossary({
      version: "stale-version",
      glossary: {} as any,
      glossaryFull: [],
      superMatchingParams: ["stalePattern@@"],
    });

    const diagnostics = validateStudyCatalogRequirements(
      {
        schemaVersion: 1,
        phraseKeys: [],
        phraseFamilies: [],
        parameterNames: ["stalePattern12"],
        languages: [],
        customPhraseKeys: [],
      },
      { glossary: {}, superMatchingParams: [] },
      {},
    );

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "PARAMETER_DEFINITION_MISSING",
        parameters: ["stalePattern12"],
      }),
    ]);
  });
});
