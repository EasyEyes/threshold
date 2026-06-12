/**
 * @jest-environment node
 */
import { ExperimentTable } from "../preprocess/experimentTable";
import { loadGlossaryForTests } from "./helpers/glossary";

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("ExperimentTable basic", () => {
  it("parses simple 2-condition table", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "condA", "condB"],
    ]);
    expect(t.params).toEqual(["_about", "block", "conditionName"]);
    expect(t.conditionCount).toBe(2);
  });

  it("colB returns value", () => {
    const t = new ExperimentTable([["_about", "desc"]]);
    expect(t.colB("_about")).toBe("desc");
  });

  it("colB returns empty for missing param", () => {
    const t = new ExperimentTable([["_about", "desc"]]);
    expect(t.colB("block")).toBe("");
  });

  it("conditionValue returns correct value", () => {
    const t = new ExperimentTable([["block", "", "1", "2"]]);
    expect(t.conditionValue("block", 0)).toBe("1");
    expect(t.conditionValue("block", 1)).toBe("2");
  });

  it("effectiveValue uses condition value first", () => {
    const t = new ExperimentTable([["block", "5", "1", "2"]]);
    expect(t.effectiveValue("block", 0)).toBe("1");
    expect(t.effectiveValue("block", 1)).toBe("2");
  });

  it("effectiveValue falls back to colB for underscore params", () => {
    const t = new ExperimentTable([["_lang", "English", "", ""]]);
    expect(t.effectiveValue("_lang", 0)).toBe("English");
  });

  it("effectiveValue uses condition value over glossary default", () => {
    const t = new ExperimentTable([["block", "", "1", "1"]]);
    const v = t.effectiveValue("block", 0);
    expect(v).toBe("1");
  });

  it("isDuplicate detects duplicates", () => {
    const t = new ExperimentTable([
      ["block", "", "1", "1"],
      ["block", "", "2", "2"],
    ]);
    expect(t.isDuplicate("block")).toBe(true);
  });

  it("isDuplicate false for non-duplicate", () => {
    const t = new ExperimentTable([["block", "", "1", "1"]]);
    expect(t.isDuplicate("block")).toBe(false);
  });

  it("allColBValues returns all raw colB values", () => {
    const t = new ExperimentTable([
      ["_foo", "a", "", ""],
      ["_foo", "b", "", ""],
    ]);
    expect(t.allColBValues("_foo")).toEqual(["a", "b"]);
  });

  it("conditionCount with no conditions", () => {
    const t = new ExperimentTable([["_about", "desc"]]);
    expect(t.conditionCount).toBe(0);
  });

  it("blockLabels generates unique labels", () => {
    const t = new ExperimentTable([
      ["block", "", "1", "1", "2"],
      ["conditionName", "", "a", "b", "c"],
    ]);
    expect(t.blockLabels()).toEqual(["1_1", "1_2", "2_1"]);
  });

  it("toParamValuesMap includes block_condition", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
    ]);
    const m = t.toParamValuesMap();
    expect(m.has("block_condition")).toBe(true);
    expect(m.get("block_condition")).toEqual(["1_1", "1_2"]);
  });

  it("colBBool returns true for TRUE", () => {
    const t = new ExperimentTable([["_stepperBool", "TRUE"]]);
    expect(t.colBBool("_stepperBool")).toBe(true);
  });

  it("colBBool returns false for FALSE", () => {
    const t = new ExperimentTable([["_stepperBool", "FALSE"]]);
    expect(t.colBBool("_stepperBool")).toBe(false);
  });

  it("colBOrDefault returns value when present", () => {
    const t = new ExperimentTable([["_lang", "French"]]);
    expect(t.colBOrDefault("_lang")).toBe("French");
  });

  it("colBOrDefault returns glossary default when colB empty", () => {
    const t = new ExperimentTable([["_language", ""]]);
    const v = t.colBOrDefault("_language");
    expect(typeof v).toBe("string");
  });

  it("handles rows of different lengths", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
    ]);
    expect(t.conditionCount).toBe(2);
  });
});

describe("ExperimentTable: effectiveValues", () => {
  it("returns glossary default for absent underscore param", () => {
    const t = new ExperimentTable([["block", "", "1", "1"]]);
    const vals = t.effectiveValues("_language");
    expect(vals.every((v) => v.length > 0)).toBe(true);
  });

  it("_about with condition value: effectiveValue returns condition value", () => {
    const t = new ExperimentTable([["_about", "colB", "condC"]]);
    expect(t.effectiveValue("_about", 0)).toBe("condC");
  });

  it("_about colB + empty conditions: effectiveValue falls back to colB", () => {
    const t = new ExperimentTable([["_about", "colB", "", ""]]);
    expect(t.effectiveValue("_about", 0)).toBe("colB");
  });
});

describe("ExperimentTable: colBBool edge cases", () => {
  it("colBBool returns false when param absent from glossary too", () => {
    const t = new ExperimentTable([["block", "", "1", "1"]]);
    // colBOrDefault → empty + glossary miss → "". "".toUpperCase() === "TRUE" → false
    expect(t.colBBool("notARealParam")).toBe(false);
  });

  it("colBOrDefault returns empty string when param is absent from glossary too", () => {
    const t = new ExperimentTable([["block", "", "1", "1"]]);
    expect(t.colBOrDefault("notARealParam")).toBe("");
  });
});
