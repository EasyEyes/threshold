/**
 * RED tests for checkBlackoutScreenColorConflict: the compiler must error
 * when blackout detection is on (thresholdAllowedBlackoutBool FALSE/unset)
 * and screenColorRGBA is pure black (0,0,0,1) in a letter/repeatedLetters
 * condition — every trial would false-positive as a blackout and be discarded.
 *
 * @jest-environment node
 */
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { TABLE_CHECKS } from "../preprocess/validateExperimentTable";

const checkBlackoutScreenColorConflict = TABLE_CHECKS.find(
  (c) => c.name === "checkBlackoutScreenColorConflict",
)!;

const tFromRows = (rows: string[][]): ExperimentTable =>
  new ExperimentTable(rows);

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("checkBlackoutScreenColorConflict", () => {
  it("errors when screen is pure black and blackout param is unset (detection on by default)", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["screenColorRGBA", "", "0,0,0,1"],
    ]);
    const errors = checkBlackoutScreenColorConflict(df);
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("error");
    expect(errors[0].parameters).toEqual(
      expect.arrayContaining([
        "thresholdAllowedBlackoutBool",
        "screenColorRGBA",
      ]),
    );
  });

  it("suggests a dark-gray screenColorRGBA in the hint", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["screenColorRGBA", "", "0,0,0,1"],
    ]);
    const errors = checkBlackoutScreenColorConflict(df);
    expect(errors[0].hint).toMatch(/dark gray/i);
    expect(errors[0].hint).toMatch(/1\/256|0\.0039|0\.004/);
  });

  it("errors for repeatedLetters with explicit thresholdAllowedBlackoutBool FALSE", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "repeatedLetters"],
      ["thresholdAllowedBlackoutBool", "", "FALSE"],
      ["screenColorRGBA", "", "0, 0, 0, 1"],
    ]);
    expect(checkBlackoutScreenColorConflict(df)).toHaveLength(1);
  });

  it("lists all offending condition columns in one error", () => {
    const df = tFromRows([
      ["block", "", "1", "1", "1"],
      ["conditionName", "", "A", "B", "C"],
      ["targetKind", "", "letter", "letter", "letter"],
      ["screenColorRGBA", "", "0,0,0,1", "0.92,0.92,0.92,1", "0,0,0,1"],
    ]);
    const errors = checkBlackoutScreenColorConflict(df);
    expect(errors).toHaveLength(1);
    expect(errors[0].hint).toMatch(/C/);
    expect(errors[0].hint).toMatch(/E/);
    expect(errors[0].hint).not.toMatch(/\bD\b/);
  });

  it("no error when screenColorRGBA is unset (default light gray)", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
    ]);
    expect(checkBlackoutScreenColorConflict(df)).toHaveLength(0);
  });

  it("no error when experimenter opts out with thresholdAllowedBlackoutBool TRUE", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["thresholdAllowedBlackoutBool", "", "TRUE"],
      ["screenColorRGBA", "", "0,0,0,1"],
    ]);
    expect(checkBlackoutScreenColorConflict(df)).toHaveLength(0);
  });

  it("no error for non-text targetKind (blackout check never runs)", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "gabor"],
      ["screenColorRGBA", "", "0,0,0,1"],
    ]);
    expect(checkBlackoutScreenColorConflict(df)).toHaveLength(0);
  });

  it("no error for near-black dark gray (only exact 0,0,0 is confounded)", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["screenColorRGBA", "", "0.0039, 0.0039, 0.0039, 1"],
    ]);
    expect(checkBlackoutScreenColorConflict(df)).toHaveLength(0);
  });
});
