/**
 * GREEN preservation suite — captures PRE-EXISTING desired behavior of
 * ParamReader, independent of the 2026-07-16 changes (underscore globals,
 * Option A no-arg reads, adversarial bug fixes).
 *
 * CRITERION: every test here must pass on BOTH the base paramReader.js
 * (git HEAD) and the fixed paramReader.js. That is what proves the fixes
 * preserved already-correct behavior. If a test here fails on either side,
 * the suite is encoding the wrong contract (fix the test) or the fix
 * regressed behavior (fix the code).
 *
 * Deliberately EXCLUDED (intentional behavior changes, covered elsewhere):
 *   - no-arg read() array shape (Option A — tests/paramReaderGlobalParams)
 *   - empty-block underscore/`!` reads (same file)
 *   - unknown-label glossary-path reads, string-digit labels, load-failure
 *     paths (tests/paramReaderAdversarial.test.ts)
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
    conditionTrials: {
      name: "conditionTrials",
      availability: "now",
      type: "numerical",
      default: "2",
      explanation: "",
      example: "",
      categories: [],
    },
    conditionEnabledBool: {
      name: "conditionEnabledBool",
      availability: "now",
      type: "boolean",
      default: "TRUE",
      explanation: "",
      example: "",
      categories: [],
    },
    showConditionNameBool: {
      name: "showConditionNameBool",
      availability: "now",
      type: "boolean",
      default: "FALSE",
      explanation: "",
      example: "",
      categories: [],
    },
    questionAndAnswer01: {
      name: "questionAndAnswer01",
      availability: "now",
      type: "text",
      default: "",
      explanation: "",
      example: "",
      categories: [],
    },
  },
  glossaryFull: [],
  superMatchingParams: ["questionAndAnswer@@"],
};

let papaBehavior: Record<string, { data: string[][] }>;
const installPapaMock = () => {
  jest.doMock("papaparse", () => ({
    __esModule: true,
    default: {
      parse: (url: string, config: any) => {
        const key = url.includes("blockCount")
          ? "blockCount"
          : url.replace(/^\.\/conditions\//, "").replace(".csv", "");
        config.complete({ data: papaBehavior[key].data });
      },
    },
  }));
};

const loadReader = async (
  behavior: Record<string, { data: string[][] }>,
  callback?: any,
) => {
  jest.resetModules();
  papaBehavior = behavior;
  installPapaMock();
  const { initGlossary } = await import("../parameters/glossaryRegistry");
  const { ParamReader } = await import("../parameters/paramReader");
  initGlossary(fixture);
  const reader: any = callback
    ? new ParamReader("conditions", callback)
    : new ParamReader("conditions");
  return reader;
};

const blockCountCsv = (blocks: number[][]) => [
  ["block"],
  ...blocks.map((b) => b.map(String)),
];

// ---------------------------------------------------------------------------

describe("GREEN: _loadFile happy path", () => {
  it("loads block files, parses cell types, fires callback with reader", async () => {
    const cb = jest.fn();
    await loadReader(
      {
        blockCount: { data: blockCountCsv([[1], [2]]) },
        block_1: {
          data: [
            [
              "block",
              "block_condition",
              "font",
              "conditionTrials",
              "conditionEnabledBool",
            ],
            ["1", "1_1", "Inter", "3", "TRUE"],
            ["1", "1_2", "InterFull.ttf", "1.5", "TRUE"],
          ],
        },
        block_2: {
          data: [
            [
              "block",
              "block_condition",
              "font",
              "conditionTrials",
              "conditionEnabledBool",
            ],
            ["2", "2_1", "Sloan", "2", "TRUE"],
          ],
        },
      },
      cb,
    );
    await new Promise((r) => setTimeout(r, 700));
    expect(cb).toHaveBeenCalledTimes(1);
    const reader = cb.mock.calls[0][0];
    expect(reader.blockCount).toBe(2);
    expect(reader.read("font", 1)).toEqual(["Inter", "InterFull.ttf"]);
    expect(reader.read("conditionTrials", 1)).toEqual([3, 1.5]);
    expect(reader.read("conditionEnabledBool", 1)).toEqual([true, true]);
  });

  it("runtime safety net: conditionEnabledBool === false rows are skipped", async () => {
    const reader = await loadReader({
      blockCount: { data: blockCountCsv([[1]]) },
      block_1: {
        data: [
          ["block", "block_condition", "font", "conditionEnabledBool"],
          ["1", "1_1", "Inter", "TRUE"],
          ["1", "1_2", "Sloan", "FALSE"],
        ],
      },
    });
    expect(reader.read("font", 1)).toEqual(["Inter"]);
  });

  it("sparse block numbers load with conservation (gaps allowed)", async () => {
    const reader = await loadReader({
      blockCount: { data: blockCountCsv([[1], [3]]) },
      block_1: {
        data: [
          ["block", "block_condition", "font", "conditionEnabledBool"],
          ["1", "1_1", "Inter", "TRUE"],
        ],
      },
      block_3: {
        data: [
          ["block", "block_condition", "font", "conditionEnabledBool"],
          ["3", "3_1", "Sloan", "TRUE"],
        ],
      },
    });
    expect(reader.blockCount).toBe(3);
    expect(reader.read("font", 1)).toEqual(["Inter"]);
    expect(reader.read("font", 3)).toEqual(["Sloan"]);
    // gap block, non-underscore param: [] (iteration callers rely on this)
    expect(reader.read("font", 2)).toEqual([]);
  });

  it("block_conditions getter returns labels in load order", async () => {
    const reader = await loadReader({
      blockCount: { data: blockCountCsv([[1]]) },
      block_1: {
        data: [
          ["block", "block_condition", "font", "conditionEnabledBool"],
          ["1", "1_1", "Inter", "TRUE"],
          ["1", "1_2", "Sloan", "TRUE"],
        ],
      },
    });
    expect(reader.block_conditions).toEqual(["1_1", "1_2"]);
  });
});

describe("GREEN: parse conversions at load", () => {
  it("converts booleans/numbers/empty/text and preserves text", async () => {
    const reader = await loadReader({
      blockCount: { data: blockCountCsv([[1]]) },
      block_1: {
        data: [
          [
            "block",
            "block_condition",
            "font",
            "conditionTrials",
            "showConditionNameBool",
            "conditionEnabledBool",
          ],
          ["1", "1_1", "Douglass Pen", "0", "FALSE", "TRUE"],
          ["1", "1_2", "Inter", "-2.5", "TRUE", "TRUE"],
        ],
      },
    });
    expect(reader.read("conditionTrials", 1)).toEqual([0, -2.5]);
    expect(reader.read("showConditionNameBool", 1)).toEqual([false, true]);
    expect(reader.read("conditionEnabledBool", 1)).toEqual([true, true]);
    expect(reader.read("font", 1)).toEqual(["Douglass Pen", "Inter"]);
  });
});

describe("GREEN: read() contracts on populated experiments", () => {
  const populated = {
    blockCount: { data: blockCountCsv([[1], [2]]) },
    block_1: {
      data: [
        [
          "block",
          "block_condition",
          "font",
          "conditionEnabledBool",
          "questionAndAnswer01",
        ],
        ["1", "1_1", "Inter", "TRUE", "q1"],
        ["1", "1_2", "InterFull.ttf", "TRUE", "q2"],
      ],
    },
    block_2: {
      data: [
        [
          "block",
          "block_condition",
          "font",
          "conditionEnabledBool",
          "questionAndAnswer01",
        ],
        ["2", "2_1", "Sloan", "TRUE", "q3"],
      ],
    },
  };

  it("numbered read returns all of a block's condition values in order", async () => {
    const reader = await loadReader(populated);
    expect(reader.read("font", 1)).toEqual(["Inter", "InterFull.ttf"]);
    expect(reader.read("font", 2)).toEqual(["Sloan"]);
  });

  it("string label read returns the single value; unknown label → undefined", async () => {
    const reader = await loadReader(populated);
    expect(reader.read("font", "1_1")).toBe("Inter");
    expect(reader.read("font", "1_2")).toBe("InterFull.ttf");
    expect(reader.read("font", "no-such-label")).toBeUndefined();
  });

  it("__ALL_BLOCKS__ returns every condition's value in order", async () => {
    const reader = await loadReader(populated);
    expect(reader.read("font", "__ALL_BLOCKS__")).toEqual([
      "Inter",
      "InterFull.ttf",
      "Sloan",
    ]);
  });

  it("absent param, numbered read → glossary default per condition", async () => {
    const reader = await loadReader(populated);
    expect(reader.read("targetKind", 1)).toEqual(["letter", "letter"]);
    expect(reader.read("targetKind", 2)).toEqual(["letter"]);
  });

  it("no-arg read [0] is block 1's first condition value", async () => {
    const reader = await loadReader(populated);
    expect(reader.read("font")[0]).toBe("Inter");
  });

  it("valid label + absent param → glossary default", async () => {
    const reader = await loadReader(populated);
    expect(reader.read("targetKind", "1_1")).toBe("letter");
  });

  it("superMatching numbered param present in CSVs reads normally", async () => {
    const reader = await loadReader(populated);
    expect(reader.read("questionAndAnswer01", "1_2")).toBe("q2");
    expect(reader.read("questionAndAnswer01", 1)).toEqual(["q1", "q2"]);
  });

  it("out-of-range block number throws Invalid Block Number", async () => {
    const reader = await loadReader(populated);
    expect(() => reader.read("font", 99)).toThrow("Invalid Block Number");
  });

  it("unknown parameter name throws", async () => {
    const reader = await loadReader(populated);
    expect(() => reader.read("notAParameter")).toThrow(
      "Invalid parameter name",
    );
  });
});
