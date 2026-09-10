/**
 * Tests for checkScreenMeasurePrecisionFlicker: the compiler validates the
 * display-precision test's flicker parameters. _screenMeasurePrecisionFlickerHz
 * must be a number in (0, 30] — a complete cycle is two color swaps and a
 * 60 Hz display can swap at most once per frame. Enabling
 * _screenMeasurePrecisionFlickerBool without a test mode draws a caution:
 * nothing would flicker.
 *
 * @jest-environment node
 */
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { TABLE_CHECKS } from "../preprocess/validateExperimentTable";

const check = TABLE_CHECKS.find(
  (c) => c.name === "checkScreenMeasurePrecisionFlicker",
)!;

const table = (rows: Array<[string, string]>) =>
  new ExperimentTable([
    ...rows.map(([name, value]) => [name, value]),
    ["block", "", "1"],
    ["conditionName", "", "A"],
  ]);

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("checkScreenMeasurePrecisionFlicker", () => {
  test("is registered", () => {
    expect(check).toBeDefined();
  });

  test("errors on a rate above 30 Hz, zero, negative, or non-numeric", () => {
    for (const bad of ["45", "30.5", "0", "-8", "fast"]) {
      const errors = check(
        table([
          ["_screenMeasurePrecision", "test2Digits"],
          ["_screenMeasurePrecisionFlickerBool", "TRUE"],
          ["_screenMeasurePrecisionFlickerHz", bad],
        ]),
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].kind).toBe("error");
      expect(errors[0].name).toMatch(
        /Invalid _screenMeasurePrecisionFlickerHz/,
      );
      expect(errors[0].message).toMatch(/two color swaps/);
    }
  });

  test("the rate is validated even when flicker is off (a bad value is a bad value)", () => {
    expect(
      check(table([["_screenMeasurePrecisionFlickerHz", "100"]])),
    ).toHaveLength(1);
  });

  test("accepts rates in (0, 30], including the default 8 and the 30 Hz ceiling", () => {
    for (const ok of ["8", "0.5", "30", "12.5"])
      expect(
        check(
          table([
            ["_screenMeasurePrecision", "test1Digit"],
            ["_screenMeasurePrecisionFlickerBool", "TRUE"],
            ["_screenMeasurePrecisionFlickerHz", ok],
          ]),
        ),
      ).toHaveLength(0);
  });

  test("cautions when flicker is on but no precision test is requested", () => {
    const errors = check(
      table([
        ["_screenMeasurePrecision", "assume8Bit"],
        ["_screenMeasurePrecisionFlickerBool", "TRUE"],
      ]),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("warning");
    expect(errors[0].name).toMatch(/without a precision test/);
    expect(errors[0].parameters).toEqual([
      "_screenMeasurePrecisionFlickerBool",
      "_screenMeasurePrecision",
    ]);
    // Unset _screenMeasurePrecision (default assume8Bit) cautions too.
    expect(
      check(table([["_screenMeasurePrecisionFlickerBool", "TRUE"]])),
    ).toHaveLength(1);
  });

  test("no message for flicker off, or flicker on with a test mode", () => {
    expect(check(table([]))).toHaveLength(0);
    expect(
      check(
        table([
          ["_screenMeasurePrecision", "assume8Bit"],
          ["_screenMeasurePrecisionFlickerBool", "FALSE"],
        ]),
      ),
    ).toHaveLength(0);
    expect(
      check(
        table([
          ["_screenMeasurePrecision", "test2Digits"],
          ["_screenMeasurePrecisionFlickerBool", "TRUE"],
        ]),
      ),
    ).toHaveLength(0);
  });
});
