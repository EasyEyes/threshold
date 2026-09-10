/**
 * Tests for checkScreenMeasurePrecisionBackground: the compiler validates
 * _screenMeasurePrecisionBackground, the gray field the display-precision
 * test's digits sit on. Out-of-range values are errors (the brightest digit,
 * background + 1/127, must stay within white). Values off the display's code
 * grid (anything but 0, 1/3, 2/3) draw a CAUTION when a test mode is
 * requested: on an 8-bit display, sub-8-bit digit increments can then round
 * up to a whole code and the measured precision is overestimated — the
 * error that a first-cut background of 0.08 produced.
 *
 * @jest-environment node
 */
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { TABLE_CHECKS } from "../preprocess/validateExperimentTable";

const check = TABLE_CHECKS.find(
  (c) => c.name === "checkScreenMeasurePrecisionBackground",
)!;

const tFromRows = (rows: string[][]): ExperimentTable =>
  new ExperimentTable(rows);

const table = (background: string | null, mode: string | null) =>
  tFromRows([
    ...(mode !== null ? [["_screenMeasurePrecision", mode]] : []),
    ...(background !== null
      ? [["_screenMeasurePrecisionBackground", background]]
      : []),
    ["block", "", "1"],
    ["conditionName", "", "A"],
  ]);

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("checkScreenMeasurePrecisionBackground", () => {
  test("is registered", () => {
    expect(check).toBeDefined();
  });

  test("errors on a background above 1 − 1/127 (brightest digit would exceed white)", () => {
    const errors = check(table("1.5", "test2Digits"));
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("error");
    expect(errors[0].name).toMatch(/Invalid _screenMeasurePrecisionBackground/);
    expect(errors[0].parameters).toEqual(["_screenMeasurePrecisionBackground"]);
  });

  test("errors on 0.995 (just above the limit), negative, and non-numeric values", () => {
    for (const bad of ["0.995", "-0.1", "abc"]) {
      const errors = check(table(bad, "test1Digit"));
      expect(errors).toHaveLength(1);
      expect(errors[0].kind).toBe("error");
    }
  });

  test("the range error applies even when no test is requested", () => {
    expect(check(table("2", "assume8Bit"))).toHaveLength(1);
    expect(check(table("2", null))).toHaveLength(1);
  });

  test("cautions (not errors) about an off-grid background when a test is requested", () => {
    const errors = check(table("0.08", "test2Digits"));
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("warning");
    expect(errors[0].name).toMatch(/off the display's code grid/);
    expect(errors[0].message).toMatch(/20\.40/); // 0.08 × 255
    expect(errors[0].hint).toMatch(/0\.3333/);
    expect(errors[0].parameters).toEqual([
      "_screenMeasurePrecisionBackground",
      "_screenMeasurePrecision",
    ]);
  });

  test("no caution for an off-grid background when the test is not run", () => {
    expect(check(table("0.08", "assume8Bit"))).toHaveLength(0);
    expect(check(table("0.08", null))).toHaveLength(0);
  });

  test("the on-grid values pass silently: 0, 1/3 (as 0.3333 or 0.333251953125), 2/3", () => {
    for (const ok of ["0", "0.3333", "0.333251953125", "0.6667"]) {
      expect(check(table(ok, "test2Digits"))).toHaveLength(0);
      expect(check(table(ok, "test1Digit"))).toHaveLength(0);
    }
  });

  test("an unset background (glossary default) passes", () => {
    expect(check(table(null, "test2Digits"))).toHaveLength(0);
    expect(check(table(null, null))).toHaveLength(0);
  });
});
