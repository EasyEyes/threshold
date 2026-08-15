/**
 * Tests for checkScreenDitherRequiresFloat16: the compiler must gate
 * _screenDitherBool=TRUE on _screenFloat16Bool=TRUE. Noisy-bit dithering
 * needs the full-precision (float16) drawing path — dithering an image that
 * has already been rounded to 8 bits adds visible noise without adding any
 * precision, which is worse than not dithering at all.
 *
 * @jest-environment node
 */
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { TABLE_CHECKS } from "../preprocess/validateExperimentTable";

const checkScreenDitherRequiresFloat16 = TABLE_CHECKS.find(
  (c) => c.name === "checkScreenDitherRequiresFloat16",
)!;

const tFromRows = (rows: string[][]): ExperimentTable =>
  new ExperimentTable(rows);

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("checkScreenDitherRequiresFloat16", () => {
  it("errors when _screenDitherBool is TRUE and _screenFloat16Bool is unset (default FALSE)", () => {
    const df = tFromRows([
      ["_screenDitherBool", "TRUE"],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    const errors = checkScreenDitherRequiresFloat16(df);
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("error");
    expect(errors[0].parameters).toEqual([
      "_screenDitherBool",
      "_screenFloat16Bool",
    ]);
  });

  it("errors when _screenDitherBool is TRUE and _screenFloat16Bool is explicitly FALSE", () => {
    const df = tFromRows([
      ["_screenDitherBool", "TRUE"],
      ["_screenFloat16Bool", "FALSE"],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    expect(checkScreenDitherRequiresFloat16(df)).toHaveLength(1);
  });

  it("explains that dithering an 8-bit image only adds noise, and points at the fix", () => {
    const df = tFromRows([
      ["_screenDitherBool", "TRUE"],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    const errors = checkScreenDitherRequiresFloat16(df);
    expect(errors[0].message).toMatch(/8 bits/i);
    expect(errors[0].message).toMatch(/noise/i);
    expect(errors[0].hint).toMatch(/_screenFloat16Bool/);
    expect(errors[0].hint).toMatch(/122/);
  });

  it("no error when both _screenDitherBool and _screenFloat16Bool are TRUE", () => {
    const df = tFromRows([
      ["_screenDitherBool", "TRUE"],
      ["_screenFloat16Bool", "TRUE"],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    expect(checkScreenDitherRequiresFloat16(df)).toHaveLength(0);
  });

  it("no error when _screenDitherBool is FALSE", () => {
    const df = tFromRows([
      ["_screenDitherBool", "FALSE"],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    expect(checkScreenDitherRequiresFloat16(df)).toHaveLength(0);
  });

  it("no error when _screenDitherBool is unset (default FALSE)", () => {
    const df = tFromRows([
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    expect(checkScreenDitherRequiresFloat16(df)).toHaveLength(0);
  });

  it("case-insensitive: lowercase true values still gate", () => {
    const df = tFromRows([
      ["_screenDitherBool", "true"],
      ["_screenFloat16Bool", "true"],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    expect(checkScreenDitherRequiresFloat16(df)).toHaveLength(0);
  });
});
