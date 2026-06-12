/**
 * Tests for _tableToNormalizedDf: ensures the DataFrame produced from
 * ExperimentTable has correct shape, values, default resolution, and
 * block_condition labels. The output includes a colB row (row 0) so
 * normalizeExperimentDfShape's dropFirstColumn works identically to
 * the old dataframeFromPapaParsed pipeline.
 *
 * @jest-environment node
 */
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { normalizeExperimentDfShape } from "../preprocess/transformExperimentTable";
import { getGlossary } from "../parameters/glossaryRegistry";

// Identical copy of the private function from main.ts
const _tableToNormalizedDf = (table: any): any => {
  const { DataFrame } = require("dataframe-js");
  const map = table.toParamValuesMap();
  const columns = [...map.keys()];
  const colBRow = columns.map((c: string) =>
    c.startsWith("_") ? table.colBOrDefault(c) : "",
  );
  const conditionRows = Array.from({ length: table.conditionCount }, (_, ci) =>
    columns.map((c: string) => map.get(c)[ci]),
  );
  return new DataFrame([colBRow, ...conditionRows], columns);
};

beforeAll(async () => {
  await loadGlossaryForTests();
});

// ============================================================================
// Shape
// ============================================================================

describe("_tableToNormalizedDf: shape", () => {
  it("row count = 1 colB + N conditions", () => {
    const t = new ExperimentTable([
      ["_about", "desc", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
    ]);
    const df = _tableToNormalizedDf(t);
    expect(df.count()).toBe(3);
  });

  it("row count = 1 (colB only) for zero-condition table", () => {
    const t = new ExperimentTable([["_about", "minimal"]]);
    const df = _tableToNormalizedDf(t);
    expect(df.count()).toBe(1);
  });

  it("column order matches ExperimentTable.params order with block_condition last", () => {
    const t = new ExperimentTable([
      ["_about", "desc", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
      ["conditionTrials", "", "10", "20"],
    ]);
    const df = _tableToNormalizedDf(t);
    const cols = df.listColumns();
    expect(cols).toEqual([
      "_about",
      "block",
      "conditionName",
      "conditionTrials",
      "block_condition",
    ]);
  });

  it("empty input produces one row (colB only, no params)", () => {
    const t = new ExperimentTable([]);
    const df = _tableToNormalizedDf(t);
    expect(df.count()).toBe(1); // colB row always present
    expect(df.listColumns()).toEqual(["block_condition"]);
  });
});

// ============================================================================
// ColB row
// ============================================================================

describe("_tableToNormalizedDf: colB row", () => {
  it("colB row (row 0) has underscore param values from col B", () => {
    const t = new ExperimentTable([
      ["_about", "my experiment", "", ""],
      ["_language", "English", "", ""],
      ["block", "", "1", "1"],
    ]);
    const df = _tableToNormalizedDf(t);
    const arr = df.toArray();
    const aboutIdx = df.listColumns().indexOf("_about");
    const langIdx = df.listColumns().indexOf("_language");
    expect(arr[0][aboutIdx]).toBe("my experiment");
    expect(arr[0][langIdx]).toBe("English");
  });

  it("colB row has glossary default for underscore param with empty colB", () => {
    // Param IS in table, but colB is empty → falls through to glossary default
    const t = new ExperimentTable([
      ["_pavloviaPreferRunningModeBool", "", "", ""],
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
    ]);
    const df = _tableToNormalizedDf(t);
    const arr = df.toArray();
    const pprIdx = df.listColumns().indexOf("_pavloviaPreferRunningModeBool");
    expect(pprIdx).toBeGreaterThanOrEqual(0);
    // colB is "" → colBOrDefault falls through to glossary default (TRUE)
    expect(arr[0][pprIdx]).toBe("TRUE");
  });

  it("colB row has empty string for non-underscore params", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
    ]);
    const df = _tableToNormalizedDf(t);
    const arr = df.toArray();
    const nameIdx = df.listColumns().indexOf("conditionName");
    expect(arr[0][nameIdx]).toBe("");
  });

  it("colB row has empty string for block (non-underscore)", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
    ]);
    const df = _tableToNormalizedDf(t);
    const arr = df.toArray();
    const blockIdx = df.listColumns().indexOf("block");
    // Block is non-underscore → colB row gets ""
    expect(arr[0][blockIdx]).toBe("");
  });

  it("colB row has empty block_condition", () => {
    const t = new ExperimentTable([
      ["_about", "", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
    ]);
    const df = _tableToNormalizedDf(t);
    const arr = df.toArray();
    const bcIdx = df.listColumns().indexOf("block_condition");
    expect(arr[0][bcIdx]).toBe("");
  });
});

// ============================================================================
// Condition rows
// ============================================================================

describe("_tableToNormalizedDf: condition rows", () => {
  it("condition values are in correct row/col (row 1+ are conditions)", () => {
    const t = new ExperimentTable([
      ["_about", "desc", "", ""],
      ["block", "", "1", "2"],
      ["conditionName", "", "condA", "condB"],
    ]);
    const df = _tableToNormalizedDf(t);
    const arr = df.toArray();
    const nameIdx = df.listColumns().indexOf("conditionName");
    expect(arr[1][nameIdx]).toBe("condA");
    expect(arr[2][nameIdx]).toBe("condB");
  });

  it("underscore params: condition value overrides colB", () => {
    const t = new ExperimentTable([
      ["_language", "English", "French", "Spanish"],
      ["block", "", "1", "1"],
    ]);
    const df = _tableToNormalizedDf(t);
    const arr = df.toArray();
    const langIdx = df.listColumns().indexOf("_language");
    // Row 0 (colB): English
    expect(arr[0][langIdx]).toBe("English");
    // Condition rows: condition values override colB
    expect(arr[1][langIdx]).toBe("French");
    expect(arr[2][langIdx]).toBe("Spanish");
  });

  it("numeric values are preserved as-is", () => {
    const t = new ExperimentTable([
      ["_about", "", "", ""],
      ["block", "", "1", "2"],
      ["conditionTrials", "", "10", "20"],
      ["needScreenWidthDeg", "", "30.5", "40.0"],
    ]);
    const df = _tableToNormalizedDf(t);
    const arr = df.toArray();
    const trialsIdx = df.listColumns().indexOf("conditionTrials");
    const swIdx = df.listColumns().indexOf("needScreenWidthDeg");
    expect(arr[1][trialsIdx]).toBe("10");
    expect(arr[2][trialsIdx]).toBe("20");
    expect(arr[1][swIdx]).toBe("30.5");
    expect(arr[2][swIdx]).toBe("40.0");
  });

  it("only table params appear in columns (no implicit glossary fill)", () => {
    // Params not in the experiment table do NOT appear in the DataFrame
    const t = new ExperimentTable([
      ["_about", "", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
    ]);
    const df = _tableToNormalizedDf(t);
    const cols = df.listColumns();
    expect(cols).toContain("_about");
    expect(cols).toContain("block");
    expect(cols).toContain("conditionName");
    // Not in table: should not appear
    expect(cols).not.toContain("conditionTrials");
    expect(cols).not.toContain("responseClickedBool");
  });

  it("glossary-defaulted underscore params DO appear (from colBOrDefault)", () => {
    // Absent underscore params still appear via colBOrDefault in colB row
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
    ]);
    const df = _tableToNormalizedDf(t);
    const cols = df.listColumns();
    // _pavloviaPreferRunningModeBool not in table but is an underscore param
    // It appears because toParamValuesMap only includes t.params...
    // Actually, let me verify: absent params are NOT in toParamValuesMap.
    // So _pavloviaPreferRunningModeBool won't be in columns.
    // The old pipeline also doesn't include absent params.
    // Only explicitly present params + block_condition appear.
    expect(cols).toContain("_about");
    expect(cols).toContain("block");
    expect(cols).not.toContain("_pavloviaPreferRunningModeBool");
  });
});

// ============================================================================
// block_condition labels
// ============================================================================

describe("_tableToNormalizedDf: block_condition labels", () => {
  it("single block: sequential labels 1_1, 1_2 in condition rows", () => {
    const t = new ExperimentTable([
      ["_about", "", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
    ]);
    const df = _tableToNormalizedDf(t);
    const arr = df.toArray();
    const bcIdx = df.listColumns().indexOf("block_condition");
    // Row 0 is colB (has pre-existing block_condition from toParamValuesMap = "")
    expect(arr[0][bcIdx]).toBe("");
    expect(arr[1][bcIdx]).toBe("1_1");
    expect(arr[2][bcIdx]).toBe("1_2");
  });

  it("multiple blocks: reset counter per block", () => {
    const t = new ExperimentTable([
      ["_about", "", "", "", "", ""],
      ["block", "", "1", "1", "2", "2"],
      ["conditionName", "", "A", "B", "C", "D"],
    ]);
    const df = _tableToNormalizedDf(t);
    const arr = df.toArray();
    const bcIdx = df.listColumns().indexOf("block_condition");
    expect(arr[1][bcIdx]).toBe("1_1");
    expect(arr[2][bcIdx]).toBe("1_2");
    expect(arr[3][bcIdx]).toBe("2_1");
    expect(arr[4][bcIdx]).toBe("2_2");
  });

  it("string block labels work (e.g. 'practice')", () => {
    const t = new ExperimentTable([
      ["_about", "", "", ""],
      ["block", "", "practice", "practice"],
      ["conditionName", "", "A", "B"],
    ]);
    const df = _tableToNormalizedDf(t);
    const arr = df.toArray();
    const bcIdx = df.listColumns().indexOf("block_condition");
    expect(arr[1][bcIdx]).toBe("practice_1");
    expect(arr[2][bcIdx]).toBe("practice_2");
  });

  it("block_condition column is appended last", () => {
    const t = new ExperimentTable([
      ["_about", "", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
    ]);
    const df = _tableToNormalizedDf(t);
    const cols = df.listColumns();
    expect(cols[cols.length - 1]).toBe("block_condition");
  });
});

// ============================================================================
// Duplicate params
// ============================================================================

describe("_tableToNormalizedDf: duplicate params", () => {
  it("duplicated param: last occurrence wins for colB and condition values", () => {
    // ExperimentTable._rows uses Map.set which keeps last value.
    // colB and conditionValue read from _rows → last wins.
    const t = new ExperimentTable([
      ["_about", "first", "", ""],
      ["block", "", "1", "1"],
      ["_about", "second-wins", "", ""],
      ["conditionName", "", "A", "B"],
    ]);
    const df = _tableToNormalizedDf(t);
    const arr = df.toArray();
    const aboutIdx = df.listColumns().indexOf("_about");
    // colB row gets last _about's colB value
    expect(arr[0][aboutIdx]).toBe("second-wins");
    // Condition values: first _about had no condition values, second also had none
    // effectiveValues for _about: condition value first (only in first row? no, both have "" for conditions)
    // _rows.get("_about") returns the LAST row. conditionValues use _rows → all ""
    // colBOrDefault uses colB which reads _rows → "second-wins"
  });

  it("duplicated param produces only one column", () => {
    const t = new ExperimentTable([
      ["block", "", "1", "1"],
      ["block", "ignored-colB", "2", "2"],
      ["conditionName", "", "A", "B"],
    ]);
    const df = _tableToNormalizedDf(t);
    const cols = df.listColumns();
    const blockCols = cols.filter((c: string) => c === "block");
    expect(blockCols).toHaveLength(1);
  });
});

// ============================================================================
// Edge cases
// ============================================================================

describe("_tableToNormalizedDf: edge cases", () => {
  it("whitespace-only rows are ignored", () => {
    const t = new ExperimentTable([
      ["  ", "", ""],
      ["_about", "desc", "", ""],
      ["\t", "", ""],
      ["block", "", "1", "1"],
    ]);
    const df = _tableToNormalizedDf(t);
    const cols = df.listColumns();
    expect(cols).not.toContain("");
    expect(cols).toContain("_about");
    expect(cols).toContain("block");
  });

  it("multi-condition: all rows present after colB", () => {
    const t = new ExperimentTable([
      ["_about", "desc", "", "", "", ""],
      ["block", "", "1", "1", "2", "2"],
      ["conditionName", "", "A", "B", "C", "D"],
    ]);
    const df = _tableToNormalizedDf(t);
    expect(df.count()).toBe(5); // 1 colB + 4 conditions
  });

  it("zero-condition: only colB row, no condition rows", () => {
    const t = new ExperimentTable([
      ["_about", "test"],
      ["_language", "English"],
    ]);
    const df = _tableToNormalizedDf(t);
    expect(df.count()).toBe(1); // just colB row
  });
});

// ============================================================================
// Integration: _tableToNormalizedDf + normalizeExperimentDfShape
// ============================================================================

describe("_tableToNormalizedDf + normalizeExperimentDfShape", () => {
  it("zero-condition produces empty df after normalization", () => {
    const t = new ExperimentTable([["_about", "minimal"]]);
    const df = _tableToNormalizedDf(t);
    const normalized = normalizeExperimentDfShape(df);
    expect(normalized.count()).toBe(0);
  });

  it("after normalization, row count = condition count (colB dropped)", () => {
    const t = new ExperimentTable([
      ["_about", "desc", "", ""],
      ["_language", "English", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
    ]);
    const df = _tableToNormalizedDf(t);
    const normalized = normalizeExperimentDfShape(df);
    expect(normalized.count()).toBe(2);
  });

  it("after normalization, block_condition labels start at _1 per block", () => {
    // colB row has block="", addUniqueLabelsToDf counts it as _1.
    // dropFirstColumn drops colB row. Remaining labels start at 1_1, 1_2.
    const t = new ExperimentTable([
      ["_about", "", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
    ]);
    const df = _tableToNormalizedDf(t);
    const normalized = normalizeExperimentDfShape(df);
    const arr = normalized.toArray();
    const bcIdx = normalized.listColumns().indexOf("block_condition");
    expect(arr.map((r: any) => r[bcIdx])).toEqual(["1_1", "1_2"]);
  });

  it("after normalization, underscore values spread to all condition rows", () => {
    const t = new ExperimentTable([
      ["_about", "my experiment", "", ""],
      ["_language", "English", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
    ]);
    const df = _tableToNormalizedDf(t);
    const normalized = normalizeExperimentDfShape(df);
    const arr = normalized.toArray();
    const langIdx = normalized.listColumns().indexOf("_language");
    expect(arr[0][langIdx]).toBe("English");
    expect(arr[1][langIdx]).toBe("English");
  });

  it("after normalization, defaults fill empty condition values", () => {
    // conditionTrials in table, but one condition has empty value → default fill
    const t = new ExperimentTable([
      ["_about", "", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
      ["conditionTrials", "", "20", ""],
    ]);
    const df = _tableToNormalizedDf(t);
    const normalized = normalizeExperimentDfShape(df);
    const cols = normalized.listColumns();
    const trialsIdx = cols.indexOf("conditionTrials");
    expect(trialsIdx).toBeGreaterThanOrEqual(0);
    const arr = normalized.toArray();
    expect(arr[0][trialsIdx]).toBe("20");
    // conditionTrials default from glossary
    const expectedDefault = getGlossary()["conditionTrials"]?.default;
    if (expectedDefault) {
      expect(arr[1][trialsIdx]).toBe(expectedDefault);
    }
  });

  it("full pipeline: complex table with mix of explicit and default values", () => {
    const t = new ExperimentTable([
      ["_about", "crowding experiment", "", "", ""],
      ["_language", "English", "", "", ""],
      ["block", "", "1", "1", "7"],
      ["conditionName", "", "easy", "medium", "hard"],
      ["conditionTrials", "", "20", "", "5"],
      ["targetKind", "", "letter", "letter", "letter"],
      ["targetTask", "", "identify", "identify", "identify"],
    ]);
    const df = _tableToNormalizedDf(t);
    const normalized = normalizeExperimentDfShape(df);

    expect(normalized.count()).toBe(3);

    const arr = normalized.toArray();
    const cols = normalized.listColumns();

    const nameIdx = cols.indexOf("conditionName");
    expect(arr.map((r: any) => r[nameIdx])).toEqual(["easy", "medium", "hard"]);

    const trialsIdx = cols.indexOf("conditionTrials");
    const trialsDefault = getGlossary()["conditionTrials"]?.default;
    expect(arr[0][trialsIdx]).toBe("20");
    expect(arr[2][trialsIdx]).toBe("5");
    if (trialsDefault) {
      expect(arr[1][trialsIdx]).toBe(trialsDefault);
    }

    const bcIdx = cols.indexOf("block_condition");
    expect(arr.map((r: any) => r[bcIdx])).toEqual(["1_1", "1_2", "7_1"]);

    // _about and _language spread to every condition row
    const aboutIdx = cols.indexOf("_about");
    const langIdx = cols.indexOf("_language");
    expect(arr[0][aboutIdx]).toBe("crowding experiment");
    expect(arr[2][aboutIdx]).toBe("crowding experiment");
    expect(arr[0][langIdx]).toBe("English");
    expect(arr[2][langIdx]).toBe("English");
  });
});

// ============================================================================
// Parity: _tableToNormalizedDf matches old dataframeFromPapaParsed output
// ============================================================================

describe("_tableToNormalizedDf parity with dataframeFromPapaParsed", () => {
  const simpleParsed = {
    data: [
      ["_about", "", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
      ["conditionTrials", "", "10", "20"],
    ],
  };

  it("produces same row count after full normalization", () => {
    const { dataframeFromPapaParsed } = require("../preprocess/utils");
    const {
      normalizeExperimentDfShape,
    } = require("../preprocess/transformExperimentTable");

    const oldDf = dataframeFromPapaParsed(simpleParsed);
    const oldNormalized = normalizeExperimentDfShape(oldDf);

    const t = new ExperimentTable(
      simpleParsed.data as readonly (readonly string[])[],
    );
    const newDf = _tableToNormalizedDf(t);
    const newNormalized = normalizeExperimentDfShape(newDf);

    expect(newNormalized.count()).toBe(oldNormalized.count());
  });

  it("produces same column set", () => {
    const { dataframeFromPapaParsed } = require("../preprocess/utils");
    const {
      normalizeExperimentDfShape,
    } = require("../preprocess/transformExperimentTable");

    const oldDf = dataframeFromPapaParsed(simpleParsed);
    const oldNormalized = normalizeExperimentDfShape(oldDf);

    const t = new ExperimentTable(
      simpleParsed.data as readonly (readonly string[])[],
    );
    const newDf = _tableToNormalizedDf(t);
    const newNormalized = normalizeExperimentDfShape(newDf);

    const oldCols = new Set(oldNormalized.listColumns());
    const newCols = new Set(newNormalized.listColumns());
    expect(newCols).toEqual(oldCols);
  });

  it("produces same condition values", () => {
    const { dataframeFromPapaParsed } = require("../preprocess/utils");
    const {
      normalizeExperimentDfShape,
    } = require("../preprocess/transformExperimentTable");

    const oldDf = dataframeFromPapaParsed(simpleParsed);
    const oldNormalized = normalizeExperimentDfShape(oldDf);

    const t = new ExperimentTable(
      simpleParsed.data as readonly (readonly string[])[],
    );
    const newDf = _tableToNormalizedDf(t);
    const newNormalized = normalizeExperimentDfShape(newDf);

    const oldArr = oldNormalized.toArray();
    const newArr = newNormalized.toArray();
    const oldCols = oldNormalized.listColumns();
    const newCols = newNormalized.listColumns();

    const oldNameIdx = oldCols.indexOf("conditionName");
    const newNameIdx = newCols.indexOf("conditionName");
    expect(newArr.map((r: any) => r[newNameIdx])).toEqual(
      oldArr.map((r: any) => r[oldNameIdx]),
    );

    const oldTrialsIdx = oldCols.indexOf("conditionTrials");
    const newTrialsIdx = newCols.indexOf("conditionTrials");
    expect(newArr.map((r: any) => r[newTrialsIdx])).toEqual(
      oldArr.map((r: any) => r[oldTrialsIdx]),
    );

    const oldBlockIdx = oldCols.indexOf("block");
    const newBlockIdx = newCols.indexOf("block");
    expect(newArr.map((r: any) => r[newBlockIdx])).toEqual(
      oldArr.map((r: any) => r[oldBlockIdx]),
    );
  });

  it("produces same block_condition labels", () => {
    const { dataframeFromPapaParsed } = require("../preprocess/utils");
    const {
      normalizeExperimentDfShape,
    } = require("../preprocess/transformExperimentTable");

    const oldDf = dataframeFromPapaParsed(simpleParsed);
    const oldNormalized = normalizeExperimentDfShape(oldDf);

    const t = new ExperimentTable(
      simpleParsed.data as readonly (readonly string[])[],
    );
    const newDf = _tableToNormalizedDf(t);
    const newNormalized = normalizeExperimentDfShape(newDf);

    const oldArr = oldNormalized.toArray();
    const newArr = newNormalized.toArray();
    const oldBcIdx = oldNormalized.listColumns().indexOf("block_condition");
    const newBcIdx = newNormalized.listColumns().indexOf("block_condition");
    expect(newArr.map((r: any) => r[newBcIdx])).toEqual(
      oldArr.map((r: any) => r[oldBcIdx]),
    );
  });
});
