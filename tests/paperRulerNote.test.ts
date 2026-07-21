/**
 * RED tests for the "You'll need a piece of paper 📄 / ruler" note shown on
 * the FINAL compatibility page (checkSystemCompatibility in
 * components/compatibilityCheck.js).
 *
 * Bug: the note was pushed whenever `_calibrateDistance` included
 * "paper"/"paperOrRuler", WITHOUT checking `calibrateDistanceBool`. Since
 * `_calibrateDistance` defaults to "paper", the note appeared on every
 * experiment that never enabled distance calibration.
 *
 * Fix: a shared `getPaperRulerNote(reader, lang)` helper (built on
 * `resolvePaperRulerAlert`, which gates on `calibrateDistanceBool`) used by
 * both the preview page and the final compatibility page.
 *
 * These tests assert the DESIRED behavior; they fail on current code.
 */

jest.mock("../components/readPhrases.js", () => ({
  readi18nPhrases: jest.fn((key: string, _lang: string) => {
    const phrases: Record<string, string> = {
      EE_DeviceCompatibilityPaper: "PAPER",
      EE_DeviceCompatibilityPaperAndRuler:
        "PAPER AND RULER [[Nin]] in [[Ncm]] cm",
      EE_DeviceCompatibilityRuler: "RULER [[Nin]] in [[Ncm]] cm",
      EE_DeviceCompatibilityPaperOrRuler: "PAPER OR RULER",
      EE_LanguageDirection: "LTR",
    };
    return phrases[key] ?? "";
  }),
}));

jest.mock("../components/markdownInline.js", () => ({
  renderMarkdown: jest.fn((s: string) => s),
}));

import { getPaperRulerNote } from "../components/compatibilityUI.js";

// Mimic ParamReader's parsed return values: booleans/numbers are already
// converted by ParamReader.parse, and reads return arrays indexed by
// condition. `_calibrateDistance: ["paper"]` reproduces the glossary default
// that ParamReader returns when the experimenter never sets the parameter.
const makeReader = (values: Record<string, any[]>) => ({
  read: (name: string, _blockOrCondition?: any) => values[name],
});

describe("getPaperRulerNote", () => {
  it("returns null when calibrateDistanceBool is FALSE everywhere, even with the _calibrateDistance default 'paper'", () => {
    // The bug scenario: experimenter never set _calibrateDistance, so
    // ParamReader serves the glossary default "paper". The note must NOT show.
    const reader = makeReader({
      calibrateDistanceBool: [false],
      _calibrateDistance: ["paper"],
      _calibrateDistanceCheckBool: [false],
      _calibrateDistanceCheckMinRulerCm: [60],
    });
    expect(getPaperRulerNote(reader as any, "en")).toBeNull();
  });

  it("returns null when nothing is set at all (all reads undefined)", () => {
    const reader = makeReader({});
    expect(getPaperRulerNote(reader as any, "en")).toBeNull();
  });

  it("returns null when distance calibration uses a non-paper method (blindspot)", () => {
    const reader = makeReader({
      calibrateDistanceBool: [true],
      _calibrateDistance: ["blindspot"],
      _calibrateDistanceCheckBool: [false],
      _calibrateDistanceCheckMinRulerCm: [60],
    });
    expect(getPaperRulerNote(reader as any, "en")).toBeNull();
  });

  it("returns the paper note when any block has calibrateDistanceBool TRUE and method is paper", () => {
    const reader = makeReader({
      calibrateDistanceBool: [false, true],
      _calibrateDistance: ["paper"],
      _calibrateDistanceCheckBool: [false],
      _calibrateDistanceCheckMinRulerCm: [60],
    });
    expect(getPaperRulerNote(reader as any, "en")).toBe("PAPER");
  });

  it("returns paper-and-ruler note with ruler length filled when check is enabled", () => {
    const reader = makeReader({
      calibrateDistanceBool: [true],
      _calibrateDistance: ["paper"],
      _calibrateDistanceCheckBool: [true],
      _calibrateDistanceCheckMinRulerCm: [60],
    });
    expect(getPaperRulerNote(reader as any, "en")).toBe(
      "PAPER AND RULER 24 in 60 cm",
    );
  });

  it("returns paper-or-ruler note when method is paperOrRuler and check is disabled", () => {
    const reader = makeReader({
      calibrateDistanceBool: [true],
      _calibrateDistance: ["paperOrRuler"],
      _calibrateDistanceCheckBool: [false],
      _calibrateDistanceCheckMinRulerCm: [60],
    });
    expect(getPaperRulerNote(reader as any, "en")).toBe("PAPER OR RULER");
  });

  it("returns ruler-only note when method is paperOrRuler and check is enabled", () => {
    const reader = makeReader({
      calibrateDistanceBool: [true],
      _calibrateDistance: ["paperOrRuler"],
      _calibrateDistanceCheckBool: [true],
      _calibrateDistanceCheckMinRulerCm: [60],
    });
    expect(getPaperRulerNote(reader as any, "en")).toBe("RULER 24 in 60 cm");
  });
});
