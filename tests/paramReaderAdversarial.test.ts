/**
 * ADVERSARIAL regression tests — ParamReader / parameter-resolution bugs.
 *
 * Written as RED tests (each encoded desired behavior and failed on the
 * buggy code). All are now GREEN after the 2026-07-16 fixes in
 * parameters/paramReader.js. See notes/adversarial-paramReader-findings.md.
 *
 * Bugs covered (see notes/adversarial-paramReader-findings.md):
 *   1. Read-before-load → confusing TypeError instead of a clear error.
 *   2. Missing/unreadable block CSVs → no error handler; silent hang,
 *      silent empty run, or garbage experiment — never a loud error.
 *   3. String block number ("1") silently treated as a condition NAME.
 *   4. Ragged consecutive short rows: splice-while-iterating skips a row,
 *      leaving a condition with undefined cells.
 *   5. Internal param ("!…") absent from CSVs → throws instead of using
 *      INTERNAL_GLOSSARY's default (read()'s own guard admits it).
 *   6. Duplicate block numbers in blockCount.csv → conditions duplicated.
 *   7. Unknown condition-label (block_condition) read: glossary-default
 *      path returned the default, present-param path returned undefined —
 *      asymmetric. (Invalid labels are undefined behavior; unified to
 *      undefined.)
 *   8. parse() does not trim: " TRUE" stays a string → boolean params
 *      silently read as truthy-string instead of boolean true.
 *   9. Empty block 1, non-underscore param set by the experimenter →
 *      silently lost on pseudo-global read("X") (fixed via Option A).
 *
 * @jest-environment node
 */

import type { GlossaryData } from "../../source/components/types";

const fixture: GlossaryData = {
  version: "1",
  glossary: {
    font: {
      name: "font",
      availability: "now",
      type: "text",
      default: "Arial",
      explanation: "",
      example: "",
      categories: [],
    },
    targetKind: {
      name: "targetKind",
      availability: "now",
      type: "categorical",
      default: "letter",
      explanation: "",
      example: "",
      categories: ["letter", "reading"],
    },
    calibrateScreenSizeCheckBool: {
      name: "calibrateScreenSizeCheckBool",
      availability: "now",
      type: "boolean",
      default: "FALSE",
      explanation: "",
      example: "",
      categories: [],
    },
  },
  glossaryFull: [],
  superMatchingParams: [],
};

/** Programmable Papa.parse fake. Key: "blockCount" or "block_N". */
let papaBehavior: Record<string, { data?: string[][]; httpError?: boolean }>;
let papaConfigs: Record<string, any>;

const installPapaMock = () => {
  jest.doMock("papaparse", () => ({
    __esModule: true,
    default: {
      parse: (url: string, config: any) => {
        const key = url.includes("blockCount")
          ? "blockCount"
          : url.replace(/^\.\/conditions\//, "").replace(".csv", "");
        papaConfigs[key] = config;
        const b = papaBehavior[key];
        if (!b || b.httpError) {
          if (config.error) config.error(new Error("HTTP 404"));
          return; // Papa does not call complete on hard HTTP error
        }
        config.complete({ data: b.data });
      },
    },
  }));
};

const makeReader = async (behavior: typeof papaBehavior, callback?: any) => {
  jest.resetModules();
  papaBehavior = behavior;
  papaConfigs = {};
  installPapaMock();
  const { initGlossary } = await import("../parameters/glossaryRegistry");
  const { ParamReader } = await import("../parameters/paramReader");
  initGlossary(fixture);
  const reader: any = callback
    ? new ParamReader("conditions", callback)
    : new ParamReader("conditions");
  return reader;
};

const blockCountCsv = (blocks: (string | number)[][]) => [
  ["block"],
  ...blocks.map((b) => b.map(String)),
];

// ---------------------------------------------------------------------------

describe("Bug 1: read before conditions finish loading", () => {
  it("gives a CLEAR error (not a confusing TypeError about iterables)", async () => {
    // blockCount.csv never completes → _experiment stays null (truly unloaded)
    const reader = await makeReader({});
    expect(() => reader.read("font", 1)).toThrow(
      /not.*(loaded|initialized|ready)/i,
    );
  });
});

describe("Bug 2: missing/unreadable block files must surface a loud error", () => {
  it("blockCount.csv HTTP error: an error handler is registered", async () => {
    await makeReader({ blockCount: { httpError: true } });
    expect(typeof papaConfigs["blockCount"].error).toBe("function");
  });

  it("block_N.csv HTTP error: an error handler is registered", async () => {
    await makeReader({
      blockCount: { data: blockCountCsv([[1]]) },
      block_1: { httpError: true },
    });
    expect(typeof papaConfigs["block_1"].error).toBe("function");
  });

  it("empty/garbage blockCount.csv must NOT silently run a zero-block experiment", async () => {
    const cb = jest.fn();
    const reader = await makeReader(
      { blockCount: { data: [["<html>404</html>"]] } },
      cb,
    );
    // Desired: refuse to proceed (no callback with a zero-condition reader).
    // Current: callback fires with blockCount=0 → experiment "runs" empty.
    expect(cb).not.toHaveBeenCalled();
    expect(reader._loadError).toBeTruthy();
  });

  it("zero surviving conditions (all rows disabled) fails loudly instead of hanging", async () => {
    const cb = jest.fn();
    const reader = await makeReader(
      {
        blockCount: { data: blockCountCsv([[1]]) },
        block_1: {
          data: [
            ["block", "font", "conditionEnabledBool"],
            ["1", "Inter", "FALSE"],
          ],
        },
      },
      cb,
    );
    // Desired: loud failure (no callback, no infinite 500ms validate poll).
    expect(cb).not.toHaveBeenCalled();
    expect(reader._loadError).toBeTruthy();
  });
});

describe("Bug 3: string block number", () => {
  it("read(name, '1') is treated as block 1, not as a condition name", async () => {
    const reader = await makeReader({
      blockCount: { data: blockCountCsv([[1]]) },
    });
    reader._experiment = [
      { block: "1", block_condition: "1_1", font: "Inter" },
    ];
    reader._blockCount = 1;
    expect(reader.read("font", "1")).toEqual(["Inter"]);
  });
});

describe("Bug 4: ragged consecutive short rows", () => {
  it("removes BOTH short rows (splice-while-iterating must not skip)", async () => {
    const reader = await makeReader({
      blockCount: { data: blockCountCsv([[1]]) },
      block_1: {
        data: [
          ["block", "font", "conditionEnabledBool"],
          ["1", "Inter"], // short (missing col 3)
          ["1", "Inter"], // short AND consecutive → survives today
          ["1", "Inter", "TRUE"],
        ],
      },
    });
    // Desired: both malformed rows dropped (or a loud error) — never a
    // condition with undefined cells silently kept.
    const bad = reader._experiment.some(
      (c: any) => c.conditionEnabledBool === undefined,
    );
    expect(bad).toBe(false);
    expect(reader._experiment).toHaveLength(1);
  });
});

describe("Bug 5: internal params absent from CSVs", () => {
  it("read('!experimentFilename') falls back to INTERNAL_GLOSSARY default", async () => {
    const reader = await makeReader({
      blockCount: { data: blockCountCsv([[1]]) },
    });
    reader._experiment = [
      { block: "1", block_condition: "1_1", font: "Inter" },
    ];
    reader._blockCount = 1;
    // read()'s guard admits internal params; the glossary-default path
    // must honor INTERNAL_GLOSSARY rather than throwing.
    expect(reader.read("!experimentFilename", 1)).toEqual([""]);
  });

  it("internal params behave as globals: no-arg read and empty-block reads resolve", async () => {
    // sparse experiment: block 1 empty (conditions start at block 3)
    const reader = await makeReader({
      blockCount: { data: blockCountCsv([[3]]) },
    });
    reader._experiment = [
      {
        block: "3",
        block_condition: "3_1",
        font: "Inter",
        "!experimentFilename": "table.csv",
      },
      {
        block: "4",
        block_condition: "4_1",
        font: "Inter",
        "!experimentFilename": "table.csv",
      },
    ];
    reader._blockCount = 6;
    // present in CSVs, empty block 1 → fallback to any condition's value
    expect(reader.read("!experimentFilename", 1)).toEqual(["table.csv"]);
    // no-arg read → all conditions' values
    expect(reader.read("!experimentFilename")).toEqual([
      "table.csv",
      "table.csv",
    ]);
  });

  it("internal param absent from CSVs on a sparse experiment → INTERNAL_GLOSSARY default", async () => {
    const reader = await makeReader({
      blockCount: { data: blockCountCsv([[3]]) },
    });
    reader._experiment = [
      { block: "3", block_condition: "3_1", font: "Inter" },
      { block: "4", block_condition: "4_1", font: "Inter" },
    ];
    reader._blockCount = 6;
    expect(reader.read("!experimentFilename", 1)).toEqual([""]);
    expect(reader.read("!experimentFilename")).toEqual(["", ""]);
  });
});

describe("Bug 6: duplicate block numbers in blockCount.csv", () => {
  it("loads each block exactly once", async () => {
    const cb = jest.fn();
    await makeReader(
      {
        blockCount: { data: blockCountCsv([[1], [1]]) },
        block_1: {
          data: [
            ["block", "font", "conditionEnabledBool"],
            ["1", "Inter", "TRUE"],
          ],
        },
      },
      cb,
    );
    await new Promise((r) => setTimeout(r, 700));
    expect(cb).toHaveBeenCalledTimes(1);
    const reader = cb.mock.calls[0][0];
    expect(reader.read("font", 1)).toEqual(["Inter"]);
  });
});

describe("Bug 7: unknown condition-label (block_condition) reads are asymmetric", () => {
  it("absent-from-CSVs param on unknown label → undefined (not the default)", async () => {
    const reader = await makeReader({
      blockCount: { data: blockCountCsv([[1]]) },
    });
    reader._experiment = [
      { block: "1", block_condition: "1_1", font: "Inter" },
    ];
    reader._blockCount = 1;
    // Present param returns undefined for unknown labels; the
    // glossary-default path behaves the same way.
    expect(reader.read("font", "no-such-condition")).toBeUndefined();
    expect(reader.read("targetKind", "no-such-condition")).toBeUndefined();
  });
});

describe("Bug 8: parse() does not trim cell whitespace", () => {
  it("boolean cell ' TRUE' parses to boolean true", async () => {
    const reader = await makeReader({
      blockCount: { data: blockCountCsv([[1]]) },
      block_1: {
        data: [
          ["block", "calibrateScreenSizeCheckBool"],
          ["1", " TRUE"],
        ],
      },
    });
    expect(reader.read("calibrateScreenSizeCheckBool", 1)).toEqual([true]);
  });
});

describe("Bug 9: empty block 1 silently drops experimenter-set non-underscore params", () => {
  it("pseudo-global read('calibrateScreenSizeCheckBool') still finds the set value", async () => {
    const reader = await makeReader({
      blockCount: { data: blockCountCsv([[3]]) },
    });
    // Experimenter SET this param; it lives on block 3 because blocks 1-2
    // were disabled. A block-1-defaulted read must not silently lose it.
    reader._experiment = [
      {
        block: "3",
        block_condition: "3_1",
        calibrateScreenSizeCheckBool: true,
      },
    ];
    reader._blockCount = 3;
    expect(reader.read("calibrateScreenSizeCheckBool")).toEqual([true]);
  });
});
