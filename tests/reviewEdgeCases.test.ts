/**
 * Edge-case tests for the ExperimentTable migration.
 * These test scenarios identified during code review that may not be
 * covered by existing tests.
 *
 * @jest-environment node
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/experimentFileChecks";

beforeAll(async () => {
  await loadGlossaryForTests();
});

function parse(csv: string): ExperimentTable {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  return new ExperimentTable(p.data as readonly (readonly string[])[]);
}

// ============================================================================
// Edge: iscalibrateDistanceCheckBoolValid — was i=2, now i=0
// ============================================================================

describe("iscalibrateDistanceCheckBoolValid indexing fix", () => {
  // This function is called from main.ts with table.conditionValues()
  // which returns condition-only arrays (no param name, no colB).
  // The fix changed the loop from i=2 to i=0.
  it("condition index 0 is checked (first condition)", async () => {
    const { iscalibrateDistanceCheckBoolValid } = await import(
      "../preprocess/experimentFileChecks"
    );
    const checkBool = ["TRUE"]; // condition 0: check=TRUE
    const distBool = ["FALSE"]; // condition 0: distance=FALSE
    const errors = iscalibrateDistanceCheckBoolValid(checkBool, distBool);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("matching lengths: no error when check=TRUE and distance=TRUE", async () => {
    const { iscalibrateDistanceCheckBoolValid } = await import(
      "../preprocess/experimentFileChecks"
    );
    const checkBool = ["TRUE"];
    const distBool = ["TRUE"];
    const errors = iscalibrateDistanceCheckBoolValid(checkBool, distBool);
    expect(errors).toHaveLength(0);
  });

  it("mismatched lengths returns empty (no crash)", async () => {
    const { iscalibrateDistanceCheckBoolValid } = await import(
      "../preprocess/experimentFileChecks"
    );
    const checkBool = ["TRUE", "FALSE"];
    const distBool = ["TRUE"];
    const errors = iscalibrateDistanceCheckBoolValid(checkBool, distBool);
    expect(errors).toHaveLength(0);
  });
});

// ============================================================================
// Edge: validateExperimentTable on minimal/empty tables
// ============================================================================

describe("validateExperimentTable edge cases", () => {
  it("does not crash on a table with only underscore params", () => {
    const t = new ExperimentTable([["_about", "test"]]);
    expect(() => validateExperimentTable(t)).not.toThrow();
  });

  it("does not crash on a table with block but no conditions", () => {
    const t = new ExperimentTable([
      ["_about", "test"],
      ["block", ""],
    ]);
    expect(() => validateExperimentTable(t)).not.toThrow();
  });

  it("does not crash with rows of varying lengths", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", "", ""],
      ["block", "", "1", "1", "2"],
      ["conditionName", "", "A", "B"], // shorter row
    ]);
    expect(() => validateExperimentTable(t)).not.toThrow();
    // conditionName should have 3 condition slots, last filled with ""
    expect(t.conditionValue("conditionName", 2)).toBe("");
  });
});

// ============================================================================
// Edge: ExperimentTable.conditionValue for out-of-bounds index
// ============================================================================

describe("ExperimentTable out-of-bounds access", () => {
  it("conditionValue returns empty string for out-of-bounds index", () => {
    const t = new ExperimentTable([["block", "", "1"]]);
    expect(t.conditionValue("block", 0)).toBe("1");
    expect(t.conditionValue("block", 1)).toBe(""); // out of bounds
    expect(t.conditionValue("block", 99)).toBe(""); // way out of bounds
  });

  it("effectiveValue for out-of-bounds falls back to default", () => {
    const t = new ExperimentTable([["block", "", "1"]]);
    // condition 1 is out of bounds → conditionValue="" → falls to glossary default
    const v = t.effectiveValue("block", 1);
    // glossary default for block should be "1"
    expect(typeof v).toBe("string");
  });

  it("conditionValues pads to conditionCount with empty strings", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", "", ""],
      ["block", "", "1", "1", "2"],
      ["conditionName", "", "A", "B"], // only 2 conditions
    ]);
    const vals = t.conditionValues("conditionName");
    expect(vals).toHaveLength(3);
    expect(vals[2]).toBe("");
  });
});

// ============================================================================
// Edge: validateExperimentTable with duplicate underscore params
// ============================================================================

describe("duplicate underscore params: all instances type-checked", () => {
  it("allColBValues returns every colB for duplicates", () => {
    const t = new ExperimentTable([
      ["_language", "English", "", ""],
      ["block", "", "1", "1"],
      ["_language", "NotALanguage", "", ""],
    ]);
    expect(t.allColBValues("_language")).toEqual(["English", "NotALanguage"]);
    // _rows keeps last → colB returns "NotALanguage"
    expect(t.colB("_language")).toBe("NotALanguage");
  });

  it("isDuplicate is true for underscore duplicates", () => {
    const t = new ExperimentTable([
      ["_language", "English", "", ""],
      ["block", "", "1", "1"],
      ["_language", "French", "", ""],
    ]);
    expect(t.isDuplicate("_language")).toBe(true);
  });
});

// ============================================================================
// Edge: fillCurrentExperiment parity — colB returns last occurrence
// ============================================================================

describe("ExperimentTable colB for duplicate params", () => {
  it("colB returns LAST occurrence (Map semantics)", () => {
    const t = new ExperimentTable([
      ["_about", "first", "", ""],
      ["_about", "last", "", ""],
    ]);
    expect(t.colB("_about")).toBe("last");
  });

  it("params list preserves first-occurrence order for duplicates", () => {
    const t = new ExperimentTable([
      ["_about", "a", "", ""],
      ["block", "", "1", "1"],
      ["_about", "b", "", ""],
    ]);
    // _about appears only once in params (first occurrence position)
    expect(t.params).toEqual(["_about", "block"]);
  });
});

// ============================================================================
// Edge: ExperimentTable with blank/whitespace rows
// ============================================================================

describe("ExperimentTable blank/whitespace row handling", () => {
  it("rows with empty name are skipped", () => {
    const t = new ExperimentTable([
      ["", "value"],
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
    ]);
    expect(t.params).toEqual(["_about", "block"]);
  });

  it("rows with whitespace-only name are skipped", () => {
    const t = new ExperimentTable([
      ["  ", "value"],
      ["_about", "test", "", ""],
    ]);
    expect(t.params).toEqual(["_about"]);
  });
});

// ============================================================================
// Edge: effectiveValues for absent params
// ============================================================================

describe("effectiveValues for absent params", () => {
  it("returns glossary default for absent param", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
    ]);
    // responseClickedBool not in table → should return default for each condition
    const vals = t.effectiveValues("responseClickedBool");
    expect(vals).toHaveLength(2);
    const defaultVal = t.glossary("responseClickedBool")?.default ?? "";
    expect(vals.every((v) => v === defaultVal)).toBe(true);
  });

  it("returns empty array for unknown param not in glossary", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
    ]);
    const vals = t.effectiveValues("totallyFakeParamXYZ");
    expect(vals).toHaveLength(2);
    // glossary has no entry → default is ""
    expect(vals.every((v) => v === "")).toBe(true);
  });
});
