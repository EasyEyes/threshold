/**
 * Tests for the compiler check: markingOffsetBeforeTargetOnsetSecs must be 0
 * when target eccentricity is nonzero (peripheral target). A nonzero offset
 * gives participants time to move their eyes to the "peripheral" target,
 * collapsing its eccentricity to zero and invalidating the data.
 *
 * Spec:
 *   peripheralBool = targetEccentricityXDeg!==0 || targetEccentricityYDeg!==0
 *   if (peripheralBool && markingOffsetBeforeTargetOnsetSecs!==0) ERROR
 *
 * @jest-environment node
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import {
  TABLE_CHECKS,
  validateExperimentTable,
} from "../preprocess/validateExperimentTable";

const checkMarkingOffsetZeroForPeripheralTarget = TABLE_CHECKS.find(
  (c) => c.name === "checkMarkingOffsetZeroForPeripheralTarget",
)!;

const tFromRows = (rows: string[][]): ExperimentTable =>
  new ExperimentTable(rows);

const parse = (csv: string): ExperimentTable => {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  return new ExperimentTable(p.data as readonly (readonly string[])[]);
};

// The offset/peripheral error is the one naming BOTH the offset and an
// eccentricity parameter (excludes unrelated noise, eg alphabetical-order).
const isOffsetPeripheralError = (e: any): boolean =>
  e.parameters.includes("markingOffsetBeforeTargetOnsetSecs") &&
  (e.parameters.includes("targetEccentricityXDeg") ||
    e.parameters.includes("targetEccentricityYDeg"));

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("wiring: check must actually run during compilation", () => {
  it("validateExperimentTable errors when offset=0.5 and targetEccentricityXDeg=5.1", () => {
    const csv = `_about,test,,
block,,1
conditionName,,periph
markingOffsetBeforeTargetOnsetSecs,,0.5
targetEccentricityXDeg,,5.1
targetEccentricityYDeg,,0
targetKind,,letter`;
    const errors = validateExperimentTable(parse(csv));
    const err = errors.find(isOffsetPeripheralError);
    expect(err).toBeDefined();
    expect(err!.kind).toBe("error");
  });

  it("validateExperimentTable errors when only targetEccentricityYDeg is nonzero", () => {
    const csv = `_about,test,,
block,,1
conditionName,,periph
markingOffsetBeforeTargetOnsetSecs,,0.5
targetEccentricityXDeg,,0
targetEccentricityYDeg,,-3
targetKind,,letter`;
    const errors = validateExperimentTable(parse(csv));
    expect(errors.some(isOffsetPeripheralError)).toBe(true);
  });

  it("validateExperimentTable is silent for a foveal condition with offset 0", () => {
    const csv = `_about,test,,
block,,1
conditionName,,foveal
markingOffsetBeforeTargetOnsetSecs,,0
targetEccentricityXDeg,,0
targetEccentricityYDeg,,0
targetKind,,letter`;
    const errors = validateExperimentTable(parse(csv));
    expect(errors.some(isOffsetPeripheralError)).toBe(false);
  });
});

describe("checkMarkingOffsetZeroForPeripheralTarget (unit)", () => {
  it("errors when X eccentricity is nonzero and offset is nonzero", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["markingOffsetBeforeTargetOnsetSecs", "", "0.5"],
      ["targetEccentricityXDeg", "", "5.1"],
      ["targetEccentricityYDeg", "", "0"],
    ]);
    const errors = checkMarkingOffsetZeroForPeripheralTarget(df);
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("error");
    // Only the nonzero eccentricity component is cited — no zero-value noise.
    expect(errors[0].parameters).toEqual([
      "markingOffsetBeforeTargetOnsetSecs",
      "targetEccentricityXDeg",
    ]);
    expect(errors[0].hint).toBe(
      "Check column C (markingOffsetBeforeTargetOnsetSecs=0.5, targetEccentricityXDeg=5.1).",
    );
  });

  it("errors when only Y eccentricity is nonzero", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["markingOffsetBeforeTargetOnsetSecs", "", "0.5"],
      ["targetEccentricityXDeg", "", "0"],
      ["targetEccentricityYDeg", "", "4"],
    ]);
    const errors = checkMarkingOffsetZeroForPeripheralTarget(df);
    expect(errors).toHaveLength(1);
    expect(errors[0].parameters).toEqual([
      "markingOffsetBeforeTargetOnsetSecs",
      "targetEccentricityYDeg",
    ]);
    expect(errors[0].hint).toBe(
      "Check column C (markingOffsetBeforeTargetOnsetSecs=0.5, targetEccentricityYDeg=4).",
    );
  });

  it("errors for a negative offset (nonzero is nonzero)", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["markingOffsetBeforeTargetOnsetSecs", "", "-0.5"],
      ["targetEccentricityXDeg", "", "5"],
      ["targetEccentricityYDeg", "", "0"],
    ]);
    expect(checkMarkingOffsetZeroForPeripheralTarget(df)).toHaveLength(1);
  });

  it("no error when offset is 0 and target is foveal", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["markingOffsetBeforeTargetOnsetSecs", "", "0"],
      ["targetEccentricityXDeg", "", "0"],
      ["targetEccentricityYDeg", "", "0"],
    ]);
    expect(checkMarkingOffsetZeroForPeripheralTarget(df)).toHaveLength(0);
  });

  it("no error when target is peripheral but offset is 0", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["markingOffsetBeforeTargetOnsetSecs", "", "0"],
      ["targetEccentricityXDeg", "", "5.1"],
      ["targetEccentricityYDeg", "", "0"],
    ]);
    expect(checkMarkingOffsetZeroForPeripheralTarget(df)).toHaveLength(0);
  });

  it("no error when offset is nonzero but target is foveal (marking is fine at fixation)", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["markingOffsetBeforeTargetOnsetSecs", "", "0.5"],
      ["targetEccentricityXDeg", "", "0"],
      ["targetEccentricityYDeg", "", "0"],
    ]);
    expect(checkMarkingOffsetZeroForPeripheralTarget(df)).toHaveLength(0);
  });

  it("no error when markingOffsetBeforeTargetOnsetSecs is unset (default 0), even if peripheral", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["targetEccentricityXDeg", "", "5.1"],
      ["targetEccentricityYDeg", "", "0"],
    ]);
    expect(checkMarkingOffsetZeroForPeripheralTarget(df)).toHaveLength(0);
  });

  it("lists only the offending condition columns in the hint", () => {
    const df = tFromRows([
      ["block", "", "1", "1", "1"],
      ["conditionName", "", "A", "B", "C"],
      ["targetKind", "", "letter", "letter", "letter"],
      ["markingOffsetBeforeTargetOnsetSecs", "", "0.5", "0", "0.5"],
      ["targetEccentricityXDeg", "", "5", "5", "5"],
      ["targetEccentricityYDeg", "", "0", "0", "0"],
    ]);
    const errors = checkMarkingOffsetZeroForPeripheralTarget(df);
    expect(errors).toHaveLength(1);
    expect(errors[0].hint).toMatch(/C/);
    expect(errors[0].hint).toMatch(/E/);
    expect(errors[0].hint).not.toMatch(/\bD\b/);
  });

  it("does not fire on non-numeric offset values (type checking's job, not this check's)", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["markingOffsetBeforeTargetOnsetSecs", "", "abc"],
      ["targetEccentricityXDeg", "", "5"],
      ["targetEccentricityYDeg", "", "0"],
    ]);
    expect(checkMarkingOffsetZeroForPeripheralTarget(df)).toHaveLength(0);
  });

  it("does not fire on non-numeric eccentricity values", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["markingOffsetBeforeTargetOnsetSecs", "", "0.5"],
      ["targetEccentricityXDeg", "", "abc"],
      ["targetEccentricityYDeg", "", "0"],
    ]);
    expect(checkMarkingOffsetZeroForPeripheralTarget(df)).toHaveLength(0);
  });

  it("error name references the correct parameter (markingOffsetBeforeTargetOnsetSecs)", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["markingOffsetBeforeTargetOnsetSecs", "", "0.5"],
      ["targetEccentricityXDeg", "", "5"],
      ["targetEccentricityYDeg", "", "0"],
    ]);
    const errors = checkMarkingOffsetZeroForPeripheralTarget(df);
    expect(errors[0].name).toMatch(/markingOffsetBeforeTargetOnsetSecs/);
  });

  it("reports the offending eccentricity values, per spec", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
      ["targetKind", "", "letter"],
      ["markingOffsetBeforeTargetOnsetSecs", "", "0.5"],
      ["targetEccentricityXDeg", "", "5.1"],
      ["targetEccentricityYDeg", "", "0"],
    ]);
    const errors = checkMarkingOffsetZeroForPeripheralTarget(df);
    const text = `${errors[0].message} ${errors[0].hint}`;
    expect(text).toMatch(/5\.1/);
  });
});
