/**
 * Tests for checkScreenMeasurePrecisionRequiresFloat16: the compiler must
 * gate the visual display-precision test (_screenMeasurePrecision =
 * test1Digit | test2Digits) on _screenFloat16Bool=TRUE. The test presents
 * digits at sub-8-bit code increments and asks whether the display resolves
 * them; without the float16 drawing buffer those increments are rounded off
 * in the browser's own backbuffer before reaching the display, so the test
 * would measure the buffer, not the panel.
 *
 * @jest-environment node
 */
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { TABLE_CHECKS } from "../preprocess/validateExperimentTable";

const checkScreenMeasurePrecisionRequiresFloat16 = TABLE_CHECKS.find(
  (c) => c.name === "checkScreenMeasurePrecisionRequiresFloat16",
)!;

const tFromRows = (rows: string[][]): ExperimentTable =>
  new ExperimentTable(rows);

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("checkScreenMeasurePrecisionRequiresFloat16", () => {
  it("errors when test1Digit is requested and _screenFloat16Bool is unset", () => {
    const df = tFromRows([
      ["_screenMeasurePrecision", "test1Digit"],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    const errors = checkScreenMeasurePrecisionRequiresFloat16(df);
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("error");
    expect(errors[0].parameters).toEqual([
      "_screenMeasurePrecision",
      "_screenFloat16Bool",
    ]);
  });

  it("errors when test2Digits is requested and _screenFloat16Bool is explicitly FALSE", () => {
    const df = tFromRows([
      ["_screenMeasurePrecision", "test2Digits"],
      ["_screenFloat16Bool", "FALSE"],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    expect(checkScreenMeasurePrecisionRequiresFloat16(df)).toHaveLength(1);
  });

  it("tolerates the singular/plural slip (test2Digit)", () => {
    const df = tFromRows([
      ["_screenMeasurePrecision", "test2Digit"],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    expect(checkScreenMeasurePrecisionRequiresFloat16(df)).toHaveLength(1);
  });

  it("explains that an 8-bit buffer rounds the digits off before the display", () => {
    const df = tFromRows([
      ["_screenMeasurePrecision", "test1Digit"],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    const errors = checkScreenMeasurePrecisionRequiresFloat16(df);
    expect(errors[0].message).toMatch(/8-bit/i);
    expect(errors[0].hint).toMatch(/_screenFloat16Bool/);
    expect(errors[0].hint).toMatch(/122/);
    expect(errors[0].hint).toMatch(/assume8Bit/);
  });

  it("no error when both a test mode and _screenFloat16Bool are set", () => {
    const df = tFromRows([
      ["_screenMeasurePrecision", "test2Digits"],
      ["_screenFloat16Bool", "TRUE"],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    expect(checkScreenMeasurePrecisionRequiresFloat16(df)).toHaveLength(0);
  });

  it("no error when _screenMeasurePrecision is assume8Bit (no test)", () => {
    const df = tFromRows([
      ["_screenMeasurePrecision", "assume8Bit"],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    expect(checkScreenMeasurePrecisionRequiresFloat16(df)).toHaveLength(0);
  });

  it("no error when _screenMeasurePrecision is unset (default assume8Bit)", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    expect(checkScreenMeasurePrecisionRequiresFloat16(df)).toHaveLength(0);
  });
});
