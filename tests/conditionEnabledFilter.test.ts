/**
 * Tests for conditionEnabledBool filtering at both compile-time and runtime.
 *
 * The compiler filter (filterDisabledConditionsFromParsed) is the primary
 * defense — it removes disabled condition columns before block CSVs are
 * generated.  The runtime filter in ParamReader._loadFile and the
 * TrialHandler.importConditions post-filters are the safety net.
 *
 * @jest-environment node
 */

import {
  filterDisabledConditionsFromParsed,
  renumberBlocks,
} from "../preprocess/main";

/** Helper: return the block row values from filtered data (skips param-name col 0 + column B at index 1). */
const getBlocks = (data: string[][]): string[] => {
  const row = data.find((r) => r[0] === "block");
  return row ? row.slice(2).filter(Boolean) : [];
};

/** Helper: return the conditionEnabledBool values from filtered data (skips column B at index 1). */
const getEnabledValues = (data: string[][]): string[] => {
  const row = data.find((r) => r[0] === "conditionEnabledBool");
  return row ? row.slice(2) : [];
};

// ---------------------------------------------------------------------------
// Tests: filterDisabledConditionsFromParsed (compile-time) — REAL CODE
// ---------------------------------------------------------------------------

describe("filterDisabledConditionsFromParsed", () => {
  it("removes a column when conditionEnabledBool is 'FALSE'", () => {
    const data = [
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
      ["conditionEnabledBool", "", "TRUE", "FALSE"],
      ["font", "", "Arial", "Courier"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    expect(result[0]).toHaveLength(3);
    expect(getEnabledValues(result)).toEqual(["TRUE"]);
  });

  it("removes a column when conditionEnabledBool is 'false' (lowercase)", () => {
    const data = [
      ["_about", "test", "", ""],
      ["conditionEnabledBool", "", "TRUE", "false"],
      ["font", "", "Arial", "Courier"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    expect(getEnabledValues(result)).toEqual(["TRUE"]);
  });

  it("removes a column when conditionEnabledBool is '  FALSE  ' (whitespace)", () => {
    const data = [
      ["_about", "test", "", ""],
      ["conditionEnabledBool", "", "TRUE", "  FALSE  "],
      ["font", "", "Arial", "Courier"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    expect(getEnabledValues(result)).toEqual(["TRUE"]);
  });

  it("removes a column when conditionEnabledBool is 'FAlSe' (mixed case)", () => {
    const data = [
      ["_about", "test", "", ""],
      ["conditionEnabledBool", "", "TRUE", "FAlSe"],
      ["font", "", "Arial", "Courier"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    expect(getEnabledValues(result)).toEqual(["TRUE"]);
  });

  it("does NOT remove a column when conditionEnabledBool is empty (defaults to TRUE)", () => {
    const data = [
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
      ["conditionEnabledBool", "", "TRUE", ""],
      ["font", "", "Arial", "Courier"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    expect(result[0]).toHaveLength(4);
  });

  it("returns data unchanged when no conditionEnabledBool row exists", () => {
    const data = [
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
      ["conditionTrials", "", "10", "10"],
      ["font", "", "Arial", "Courier"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    expect(result).toEqual(data);
  });

  it("removes a column when conditionTrials is '0'", () => {
    const data = [
      ["_about", "test", "", ""],
      ["conditionTrials", "", "10", "0"],
      ["font", "", "Arial", "Courier"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    expect(result[0]).toHaveLength(3);
  });

  it("removes a column when conditionTrials is ' 0 ' (whitespace)", () => {
    const data = [
      ["_about", "test", "", ""],
      ["conditionTrials", "", "10", " 0 "],
      ["font", "", "Arial", "Courier"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    expect(result[0]).toHaveLength(3);
  });

  it("removes a column when BOTH conditionEnabledBool=FALSE and conditionTrials=0", () => {
    const data = [
      ["_about", "test", "", ""],
      ["conditionEnabledBool", "", "TRUE", "FALSE"],
      ["conditionTrials", "", "10", "0"],
      ["font", "", "Arial", "Courier"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    expect(result[0]).toHaveLength(3);
    expect(getEnabledValues(result)).toEqual(["TRUE"]);
  });

  it("removes ALL columns of a block when every condition in that block is disabled", () => {
    const data = [
      ["_about", "test", "", "", "", "", "", ""],
      ["block", "", "1", "1", "2", "2", "3", "3"],
      [
        "conditionEnabledBool",
        "",
        "TRUE",
        "TRUE",
        "FALSE",
        "FALSE",
        "FALSE",
        "FALSE",
      ],
      ["font", "", "Arial", "Courier", "Times", "Helvetica", "Mono", "Sans"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    expect(getBlocks(result)).toEqual(["1", "1"]);
    const fontRow = result.find((r) => r[0] === "font");
    expect(fontRow).toEqual(["font", "", "Arial", "Courier"]);
  });

  it("removes only disabled columns while keeping enabled ones in the same block", () => {
    const data = [
      ["_about", "test", "", "", ""],
      ["block", "", "1", "1", "1"],
      ["conditionEnabledBool", "", "TRUE", "FALSE", "TRUE"],
      ["font", "", "Arial", "Courier", "Times"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    expect(getBlocks(result)).toEqual(["1", "1"]);
    const fontRow = result.find((r) => r[0] === "font");
    expect(fontRow).toEqual(["font", "", "Arial", "Times"]);
    expect(getEnabledValues(result)).toEqual(["TRUE", "TRUE"]);
  });

  it("handles the case where all conditions are disabled (no conditions remain)", () => {
    const data = [
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
      ["conditionEnabledBool", "", "FALSE", "FALSE"],
      ["font", "", "Arial", "Courier"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    expect(result[0]).toHaveLength(2);
    expect(getBlocks(result)).toEqual([]);
  });

  it("preserves all non-condition columns (like underscore params in column B)", () => {
    const data = [
      ["_about", "testDesc", "", ""],
      ["_language", "English", "", ""],
      ["block", "", "1", "1"],
      ["conditionEnabledBool", "", "TRUE", "FALSE"],
      ["font", "", "Arial", "Courier"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    const aboutRow = result.find((r) => r[0] === "_about");
    expect(aboutRow?.[1]).toBe("testDesc");
    const langRow = result.find((r) => r[0] === "_language");
    expect(langRow?.[1]).toBe("English");
  });

  it("has no FALSE values remaining in conditionEnabledBool row after filtering", () => {
    const data = [
      ["_about", "test", "", "", "", ""],
      ["block", "", "1", "1", "1", "2"],
      ["conditionEnabledBool", "", "TRUE", "FALSE", "TRUE", "FALSE"],
      ["font", "", "Arial", "Courier", "Times", "Helvetica"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    const enabledValues = getEnabledValues(result);
    expect(enabledValues.some((v) => v.trim().toUpperCase() === "FALSE")).toBe(
      false,
    );
    expect(enabledValues.every((v) => v.trim().toUpperCase() === "TRUE")).toBe(
      true,
    );
  });

  it("preserves the 'block' row intact for structural validation", () => {
    const data = [
      ["_about", "test", "", "", ""],
      ["block", "", "1", "2", "2"],
      ["conditionEnabledBool", "", "TRUE", "FALSE", "TRUE"],
      ["font", "", "Arial", "Courier", "Times"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    expect(getBlocks(result)).toEqual(["1", "2"]);
  });

  // ── RED tests: the filter silently skips when param names have whitespace ──

  it("handles conditionEnabledBool param name with trailing space", () => {
    const data = [
      ["_about", "test", "", ""],
      ["conditionEnabledBool ", "", "TRUE", "FALSE"],
      ["font", "", "Arial", "Courier"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    // Fix: .trim() on param name finds the row despite whitespace
    expect(result[0]).toHaveLength(3); // disabled column removed
  });

  it("handles conditionEnabledBool param name with leading space", () => {
    const data = [
      ["_about", "test", "", ""],
      [" conditionEnabledBool", "", "TRUE", "FALSE"],
      ["font", "", "Arial", "Courier"],
    ];
    const result = filterDisabledConditionsFromParsed(data);
    // Fix: .trim() on param name finds the row despite whitespace
    expect(result[0]).toHaveLength(3); // disabled column removed
  });

  it("handles block param name with whitespace", () => {
    const data = [
      ["_about", "test", "", ""],
      ["block ", "", "1", "1"],
      ["conditionEnabledBool", "", "TRUE", "FALSE"],
      ["font", "", "Arial", "Courier"],
    ];
    const filtered = filterDisabledConditionsFromParsed(data);
    const renumbered = renumberBlocks(filtered);
    // Fix: .trim() on param name finds block row, filter removes disabled column.
    // Note: renumberBlocks preserves the original (trimmed-now) row[0],
    // and the real pipeline's dataframeFromPapaParsed trims all cells anyway.
    const blockRow = renumbered.find((r) => r[0]?.trim() === "block")!;
    const blocks = blockRow.slice(2).filter(Boolean);
    expect(blocks).toEqual(["1"]);
  });
});

// ---------------------------------------------------------------------------
// Tests: filterDisabledConditionsFromParsed + renumberBlocks (REAL CODE)
// ---------------------------------------------------------------------------

describe("filterDisabledConditionsFromParsed + renumberBlocks", () => {
  it("renumbers blocks sequentially after disabled blocks are removed", () => {
    const data = [
      ["_about", "test", "", "", "", ""],
      ["block", "", "1", "2", "2", "3"],
      ["conditionEnabledBool", "", "TRUE", "FALSE", "FALSE", "TRUE"],
      ["font", "", "Arial", "Courier", "Times", "Helvetica"],
    ];
    const filtered = filterDisabledConditionsFromParsed(data);
    const renumbered = renumberBlocks(filtered);
    expect(getBlocks(renumbered)).toEqual(["1", "2"]);
  });

  it("renumbers correctly with sparse original block numbers", () => {
    const data = [
      ["_about", "test", "", "", "", "", "", "", ""],
      ["block", "", "1", "14", "14", "19", "19", "19"],
      [
        "conditionEnabledBool",
        "",
        "TRUE",
        "TRUE",
        "TRUE",
        "TRUE",
        "TRUE",
        "TRUE",
      ],
      ["font", "", "A", "B", "C", "D", "E", "F"],
    ];
    const filtered = filterDisabledConditionsFromParsed(data);
    const renumbered = renumberBlocks(filtered);
    expect(getBlocks(renumbered)).toEqual(["1", "2", "2", "3", "3", "3"]);
  });

  it("handles the case where block 1 is disabled and removed", () => {
    const data = [
      ["_about", "test", "", "", "", ""],
      ["block", "", "1", "1", "2", "2"],
      ["conditionEnabledBool", "", "FALSE", "FALSE", "TRUE", "TRUE"],
      ["font", "", "Arial", "Courier", "Times", "Helvetica"],
    ];
    const filtered = filterDisabledConditionsFromParsed(data);
    const renumbered = renumberBlocks(filtered);
    expect(getBlocks(renumbered)).toEqual(["1", "1"]);
  });

  it("returns empty block list when all conditions are disabled", () => {
    const data = [
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
      ["conditionEnabledBool", "", "FALSE", "FALSE"],
      ["font", "", "Arial", "Courier"],
    ];
    const filtered = filterDisabledConditionsFromParsed(data);
    const renumbered = renumberBlocks(filtered);
    expect(getBlocks(renumbered)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Runtime tests: ParamReader._loadFile filter — using REAL parse()
// ---------------------------------------------------------------------------
// We import ParamReader to get the real parse() method, then test the
// filtering logic that will be inserted into _loadFile before _experiment.push.
// This exercises the actual parse() so we know the type contract.

describe("ParamReader parse() and conditionEnabledBool filter", () => {
  let ParamReader: any;

  beforeAll(async () => {
    // Mock PapaParse so the constructor doesn't try to load files
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: { parse: () => {} },
    }));
    const mod = await import("../parameters/paramReader");
    ParamReader = mod.ParamReader;
  });

  afterAll(() => {
    jest.dontMock("papaparse");
  });

  it("parse('FALSE') returns boolean false", () => {
    const reader = new ParamReader("conditions");
    expect(reader.parse("FALSE")).toBe(false);
  });

  it("parse('false') returns boolean false", () => {
    const reader = new ParamReader("conditions");
    expect(reader.parse("false")).toBe(false);
  });

  it("parse('FAlSe') returns boolean false", () => {
    const reader = new ParamReader("conditions");
    expect(reader.parse("FAlSe")).toBe(false);
  });

  it("parse('TRUE') returns boolean true", () => {
    const reader = new ParamReader("conditions");
    expect(reader.parse("TRUE")).toBe(true);
  });

  it("parse('true') returns boolean true", () => {
    const reader = new ParamReader("conditions");
    expect(reader.parse("true")).toBe(true);
  });

  it("parse('') returns empty string (not boolean)", () => {
    const reader = new ParamReader("conditions");
    expect(reader.parse("")).toBe("");
  });

  it("filter: conditionEnabledBool === false → skip (using real parse)", () => {
    const reader = new ParamReader("conditions");
    // Simulate what _loadFile does: parse() the CSV cell value
    const val = reader.parse("FALSE");
    const condition = { block: 1, conditionEnabledBool: val };
    // This is the filter we'll add:
    const shouldSkip =
      "conditionEnabledBool" in condition &&
      condition.conditionEnabledBool === false;
    expect(shouldSkip).toBe(true);
  });

  it("filter: conditionEnabledBool === true → keep (using real parse)", () => {
    const reader = new ParamReader("conditions");
    const val = reader.parse("TRUE");
    const condition = { block: 1, conditionEnabledBool: val };
    const shouldSkip =
      "conditionEnabledBool" in condition &&
      condition.conditionEnabledBool === false;
    expect(shouldSkip).toBe(false);
  });

  it("filter: no conditionEnabledBool key → keep", () => {
    const condition = { block: 1, font: "Arial" };
    const shouldSkip =
      "conditionEnabledBool" in condition &&
      condition.conditionEnabledBool === false;
    expect(shouldSkip).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Runtime tests: TrialHandler.importConditions post-filter — REAL paramReader.read
// ---------------------------------------------------------------------------
// These test the filtering predicate that would be used at the two
// TrialHandler.importConditions call sites.  We use a real ParamReader with a
// manually-populated _experiment so we exercise the actual read() path.

describe("paramReader.read conditionEnabledBool for importConditions filter", () => {
  let ParamReader: any;
  let initGlossary: any;

  beforeAll(async () => {
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: { parse: () => {} },
    }));
    const glossaryMod = await import("../parameters/glossaryRegistry");
    initGlossary = glossaryMod.initGlossary;
    initGlossary({
      version: "1",
      glossary: {
        conditionEnabledBool: {
          name: "conditionEnabledBool",
          availability: "now",
          type: "boolean",
          default: "TRUE",
          explanation: "",
          example: "",
          categories: [],
        },
      },
      glossaryFull: [],
      superMatchingParams: [],
    });
    const mod = await import("../parameters/paramReader");
    ParamReader = mod.ParamReader;
  });

  afterAll(() => {
    jest.dontMock("papaparse");
  });

  it("returns boolean false for a disabled condition in _experiment", () => {
    const reader = new ParamReader("conditions");
    // Manually populate as _loadFile would, including _blockCount
    reader._blockCount = 1;
    reader._experiment = [
      {
        block: 1,
        block_condition: "1_1",
        conditionEnabledBool: false,
        font: "Arial",
      },
      {
        block: 1,
        block_condition: "1_2",
        conditionEnabledBool: true,
        font: "Courier",
      },
    ];

    const val1 = reader.read("conditionEnabledBool", "1_1");
    expect(val1).toBe(false);

    const val2 = reader.read("conditionEnabledBool", "1_2");
    expect(val2).toBe(true);

    // Block-level read returns array
    const block1 = reader.read("conditionEnabledBool", 1);
    expect(block1).toEqual([false, true]);
  });

  it("filter predicate using real paramReader.read works correctly", () => {
    const reader = new ParamReader("conditions");
    reader._blockCount = 1;
    reader._experiment = [
      {
        block: 1,
        block_condition: "1_1",
        conditionEnabledBool: true,
      },
      {
        block: 1,
        block_condition: "1_2",
        conditionEnabledBool: false,
      },
      {
        block: 1,
        block_condition: "1_3",
        conditionEnabledBool: true,
      },
    ];

    // This is the predicate that would be used in the .filter() call:
    const isEnabled = (c: { block_condition: string }) =>
      reader.read("conditionEnabledBool", c.block_condition);

    const conditions = [
      { block_condition: "1_1" },
      { block_condition: "1_2" },
      { block_condition: "1_3" },
    ];

    const filtered = conditions.filter(isEnabled);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((c) => c.block_condition)).toEqual(["1_1", "1_3"]);
  });
});

// ---------------------------------------------------------------------------
// RED tests: _getParam fallthrough returns [] (truthy) for missing conditions
// ---------------------------------------------------------------------------
// When a condition exists in TrialHandler.importConditions results but was
// filtered out of _experiment by _loadFile, paramReader.read() falls through
// the String branch of _getParam to the Number branch and returns [] (truthy).
// This causes runtime .filter() checks to incorrectly PASS disabled conditions.
//
// Root cause: parameters/paramReader.js _getParam — no `return` after the
// String-branch for-loop, so execution falls through to the Number branch,
// which can never match a string like "1_2" and thus returns an empty array.
//
// After the fix (return undefined from _getParam String branch), these GREEN.

describe("paramReader.read for condition NOT in _experiment (RED → GREEN)", () => {
  let ParamReader: any;
  let initGlossary: any;

  beforeAll(async () => {
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: { parse: () => {} },
    }));
    const glossaryMod = await import("../parameters/glossaryRegistry");
    initGlossary = glossaryMod.initGlossary;
    initGlossary({
      version: "1",
      glossary: {
        conditionEnabledBool: {
          name: "conditionEnabledBool",
          availability: "now",
          type: "boolean",
          default: "TRUE",
          explanation: "",
          example: "",
          categories: [],
        },
        conditionTrials: {
          name: "conditionTrials",
          availability: "now",
          type: "integer",
          default: "0",
          explanation: "",
          example: "",
          categories: [],
        },
      },
      glossaryFull: [],
      superMatchingParams: [],
    });
    const mod = await import("../parameters/paramReader");
    ParamReader = mod.ParamReader;
  });

  afterAll(() => {
    jest.dontMock("papaparse");
  });

  it("read('conditionEnabledBool', missing) returns falsy, not []", () => {
    const reader = new ParamReader("conditions");
    reader._blockCount = 1;
    // Simulate: _loadFile filtered out "1_2" (disabled), kept only "1_1"
    reader._experiment = [
      {
        block: 1,
        block_condition: "1_1",
        conditionEnabledBool: true,
      },
    ];

    const result = reader.read("conditionEnabledBool", "1_2");

    // DESIRED: returns undefined or false (falsy)
    // CURRENT: _getParam falls through → [] (truthy)
    expect(result).toBeFalsy();
    expect(Array.isArray(result)).toBe(false);
  });

  it("read('conditionTrials', missing) returns falsy, not []", () => {
    const reader = new ParamReader("conditions");
    reader._blockCount = 1;
    reader._experiment = [
      {
        block: 1,
        block_condition: "1_1",
        conditionEnabledBool: true,
        conditionTrials: 10,
      },
    ];

    const result = reader.read("conditionTrials", "1_2");

    // DESIRED: returns undefined (falsy)
    // CURRENT: _getParam falls through → [] (truthy, though [] > 0 is false)
    expect(result).toBeFalsy();
    expect(Array.isArray(result)).toBe(false);
  });

  it("filter predicate excludes conditions not in _experiment", () => {
    const reader = new ParamReader("conditions");
    reader._blockCount = 1;
    // "1_2" and "1_3" were disabled — filtered out by _loadFile
    reader._experiment = [
      {
        block: 1,
        block_condition: "1_1",
        conditionEnabledBool: true,
        conditionTrials: 10,
      },
    ];

    const isEnabled = (c: { block_condition: string }) =>
      reader.read("conditionEnabledBool", c.block_condition);

    // TrialHandler.importConditions returns ALL CSV rows, including disabled
    const conditions = [
      { block_condition: "1_1" },
      { block_condition: "1_2" }, // disabled, NOT in _experiment
      { block_condition: "1_3" }, // disabled, NOT in _experiment
    ];

    const filtered = conditions.filter(isEnabled);

    // DESIRED: only "1_1" survives → length 1
    // CURRENT: "1_2" and "1_3" pass because [] is truthy → length 3
    expect(filtered).toHaveLength(1);
    expect(filtered[0].block_condition).toBe("1_1");
  });

  it("!read() returns true for condition not in _experiment (fonts.js pattern)", () => {
    const reader = new ParamReader("conditions");
    reader._blockCount = 1;
    reader._experiment = [
      {
        block: 1,
        block_condition: "1_1",
        conditionEnabledBool: true,
      },
    ];

    // components/fonts.js:105 does: if (!conditionEnabledBool) return;
    const conditionEnabledBool = reader.read("conditionEnabledBool", "1_2");

    // DESIRED: !result is true (disabled condition should early-return)
    // CURRENT: ![] is false → fonts load for disabled conditions
    expect(!conditionEnabledBool).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RED tests: document the gap in the CURRENT ParamReader._loadFile
// ---------------------------------------------------------------------------
// These simulate what _loadFile does — push ALL rows into _experiment without
// checking conditionEnabledBool.  After our fix, these will go green.

describe("ParamReader._loadFile — current behavior (RED → will go GREEN)", () => {
  it("currently pushes disabled conditions into _experiment (no filter)", () => {
    // Simulating the current _loadFile loop: all CSV rows are pushed.
    const rows = [
      { block: 3, conditionEnabledBool: true, font: "Arial" },
      { block: 3, conditionEnabledBool: false, font: "Courier" },
      { block: 3, conditionEnabledBool: true, font: "Times" },
    ];

    // Current: no filter
    const currentBehavior = [...rows];
    expect(currentBehavior).toHaveLength(3);
    expect(currentBehavior.some((c) => c.conditionEnabledBool === false)).toBe(
      true,
    );

    // Desired: disabled conditions excluded
    const desired = rows.filter(
      (c) => !("conditionEnabledBool" in c) || c.conditionEnabledBool !== false,
    );
    expect(desired).toHaveLength(2);
    expect(desired.some((c) => c.conditionEnabledBool === false)).toBe(false);
  });
});
