import type { GlossaryData } from "../../source/components/types";
import type { ParamReader } from "../parameters/paramReader";

const entry = (name: string, type: string, defaultValue: string) => ({
  name,
  availability: "now",
  type,
  default: defaultValue,
  explanation: "",
  example: "",
  categories: [],
});

const fixture: GlossaryData = {
  version: "test",
  glossary: {
    targetKind: entry("targetKind", "categorical", "letter"),
    conditionTrials: entry("conditionTrials", "integer", "3"),
    thresholdAllowedTrialRatio: entry(
      "thresholdAllowedTrialRatio",
      "numerical",
      "1.5",
    ),
    showCounterBool: entry("showCounterBool", "boolean", "FALSE"),
    "questionAndAnswer@@": entry("questionAndAnswer@@", "text", ""),
  },
  glossaryFull: [],
  superMatchingParams: ["questionAndAnswer@@"],
};

const makeReader = async (): Promise<ParamReader> => {
  jest.resetModules();
  jest.doMock("papaparse", () => ({
    __esModule: true,
    default: { parse: () => {} },
  }));
  const { initGlossary } = await import("../parameters/glossaryRegistry");
  const { ParamReader } = await import("../parameters/paramReader");
  initGlossary(fixture);
  const reader = new ParamReader("conditions");
  reader._experiment = [
    {
      block: 1,
      block_condition: "1_1",
      targetKind: "letter",
      conditionTrials: 3,
      thresholdAllowedTrialRatio: 1.5,
      showCounterBool: false,
      questionAndAnswer01: "Q1",
    },
    {
      block: 1,
      block_condition: "1_2",
      targetKind: "letter",
      conditionTrials: 4,
      thresholdAllowedTrialRatio: 2,
      showCounterBool: true,
      questionAndAnswer01: "Q2",
    },
  ];
  reader._blockCount = 1;
  return reader;
};

describe("glossary-driven typed parameter reads", () => {
  it("preserves numeric- and boolean-looking text through real CSV loading", async () => {
    jest.resetModules();
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: {
        parse: (
          url: string,
          config: { complete: (result: { data: string[][] }) => void },
        ) => {
          config.complete({
            data: url.includes("blockCount")
              ? [["block"], ["1"]]
              : [
                  [
                    "block",
                    "block_condition",
                    "conditionName",
                    "instructionForResponse",
                  ],
                  ["1", "1_1", "123", "456"],
                  ["1", "1_2", "TRUE", "FALSE"],
                ],
          });
        },
      },
    }));
    const { initGlossary } = await import("../parameters/glossaryRegistry");
    const { ParamReader } = await import("../parameters/paramReader");
    initGlossary({
      version: "test",
      glossary: {
        block: entry("block", "numerical", "1"),
        block_condition: entry("block_condition", "text", ""),
        conditionName: entry("conditionName", "text", ""),
        instructionForResponse: entry("instructionForResponse", "text", ""),
      },
      glossaryFull: [],
      superMatchingParams: [],
    });
    const reader = new ParamReader("conditions");

    expect(reader.read("conditionName", 1)).toEqual(["123", "TRUE"]);
    expect(reader.readString("conditionName", 1)).toEqual(["123", "TRUE"]);
    expect(reader.readString("conditionName", "1_1")).toBe("123");
    expect(reader.readString("instructionForResponse", 1)).toEqual([
      "456",
      "FALSE",
    ]);
  });

  it("preserves super-matched text types through real CSV loading", async () => {
    jest.resetModules();
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: {
        parse: (
          url: string,
          config: { complete: (result: { data: string[][] }) => void },
        ) => {
          config.complete({
            data: url.includes("blockCount")
              ? [["block"], ["1"]]
              : [
                  ["block", "block_condition", "questionAndAnswer01"],
                  ["1", "1_1", "1"],
                ],
          });
        },
      },
    }));
    const { initGlossary } = await import("../parameters/glossaryRegistry");
    const { ParamReader } = await import("../parameters/paramReader");
    initGlossary({
      version: "test",
      glossary: {
        block: entry("block", "numerical", "1"),
        block_condition: entry("block_condition", "text", ""),
        "questionAndAnswer@@": entry("questionAndAnswer@@", "text", ""),
      },
      glossaryFull: [],
      superMatchingParams: ["questionAndAnswer@@"],
    });
    const reader = new ParamReader("conditions");

    expect(reader.read("questionAndAnswer01", "1_1")).toBe("1");
    expect(reader.readString("questionAndAnswer01", "1_1")).toBe("1");
  });

  it("reads strings by condition and by block", async () => {
    const reader = await makeReader();
    expect(reader.readString("targetKind", "1_1")).toBe("letter");
    expect(reader.readString("targetKind", 1)).toEqual(["letter", "letter"]);
  });

  it("accepts both integer and numerical glossary types as numbers", async () => {
    const reader = await makeReader();
    expect(reader.readNumber("conditionTrials", "1_1")).toBe(3);
    expect(reader.readNumber("thresholdAllowedTrialRatio", "1_1")).toBe(1.5);
  });

  it("reads booleans without using truthiness", async () => {
    const reader = await makeReader();
    expect(reader.readBoolean("showCounterBool", "1_1")).toBe(false);
    expect(reader.readBoolean("showCounterBool", 1)).toEqual([false, true]);
  });

  it("validates super-matched string reads against their glossary entry", async () => {
    const reader = await makeReader();
    const re = /(questionAndAnswer|questionAnswer)(\d*|\@\@)$/g;
    expect(
      reader.readStringMatching(re, "1_1").get("questionAndAnswer01"),
    ).toBe("Q1");
    expect(reader.readStringMatching(re, 1).get("questionAndAnswer01")).toEqual(
      ["Q1", "Q2"],
    );
  });

  it("rejects a typed read that contradicts the glossary type", async () => {
    const reader = await makeReader();
    expect(() => reader.readString("conditionTrials", "1_1")).toThrow(
      'glossary type "integer"',
    );
  });

  it("rejects an array where a condition-scoped scalar is required", async () => {
    const reader = await makeReader();
    reader._experiment[0].conditionTrials = [3, 4];
    expect(() => reader.readNumber("conditionTrials", "1_1")).toThrow(
      "Expected conditionTrials to be a number; received array.",
    );
  });

  it("rejects a runtime value that contradicts its glossary-declared type", async () => {
    const reader = await makeReader();
    reader._experiment[0].conditionTrials = "3";
    expect(() => reader.readNumber("conditionTrials", "1_1")).toThrow(
      "Expected conditionTrials to be a number; received string.",
    );
  });
});

describe("numeric categorical values keep their historic numeric reads", () => {
  // EasyEyesLettersVersion (categorical, categories "1"/"2") dispatches the
  // letter pipeline with strict === comparisons (boundingNew.js,
  // threshold.js, onStimulusGenerated.ts, fonts.js). A regression that
  // returned the string "2" silently routed every letter table to the legacy
  // V1 bounding path, whose plain Rectangle lacks stimulusRectPerFontSize —
  // every trial then died with "Failed to get viable stimulus".
  const loadNumericCategorical = async (withColumn: boolean) => {
    jest.resetModules();
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: {
        parse: (
          url: string,
          config: { complete: (result: { data: string[][] }) => void },
        ) => {
          config.complete({
            data: url.includes("blockCount")
              ? [["block"], ["1"]]
              : withColumn
              ? [
                  ["block", "block_condition", "EasyEyesLettersVersion"],
                  ["1", "1_1", "1"],
                ]
              : [
                  ["block", "block_condition"],
                  ["1", "1_1"],
                ],
          });
        },
      },
    }));
    const { initGlossary } = await import("../parameters/glossaryRegistry");
    const { ParamReader } = await import("../parameters/paramReader");
    initGlossary({
      version: "test",
      glossary: {
        block: entry("block", "numerical", "1"),
        block_condition: entry("block_condition", "text", ""),
        EasyEyesLettersVersion: entry(
          "EasyEyesLettersVersion",
          "categorical",
          "2",
        ),
      },
      glossaryFull: [],
      superMatchingParams: [],
    });
    return new ParamReader("conditions");
  };

  it("glossary default of a numeric categorical reads as a number (table omits the param)", async () => {
    const reader = await loadNumericCategorical(false);
    expect(reader.read("EasyEyesLettersVersion", "1_1")).toBe(2);
  });

  it("a table cell of a numeric categorical reads as a number", async () => {
    const reader = await loadNumericCategorical(true);
    expect(reader.read("EasyEyesLettersVersion", "1_1")).toBe(1);
  });

  it("readString exposes numeric categorical labels without changing legacy reads", async () => {
    const reader = await loadNumericCategorical(true);
    expect(reader.read("EasyEyesLettersVersion", "1_1")).toBe(1);
    expect(reader.readString("EasyEyesLettersVersion", "1_1")).toBe("1");
    expect(reader.readString("EasyEyesLettersVersion", 1)).toEqual(["1"]);
  });

  it("non-numeric categorical values stay strings", async () => {
    jest.resetModules();
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: {
        parse: (
          url: string,
          config: { complete: (result: { data: string[][] }) => void },
        ) => {
          config.complete({
            data: url.includes("blockCount")
              ? [["block"], ["1"]]
              : [
                  ["block", "block_condition"],
                  ["1", "1_1"],
                ],
          });
        },
      },
    }));
    const { initGlossary } = await import("../parameters/glossaryRegistry");
    const { ParamReader } = await import("../parameters/paramReader");
    initGlossary({
      version: "test",
      glossary: {
        block: entry("block", "numerical", "1"),
        block_condition: entry("block_condition", "text", ""),
        targetKind: entry("targetKind", "categorical", "letter"),
      },
      glossaryFull: [],
      superMatchingParams: [],
    });
    const reader = new ParamReader("conditions");
    expect(reader.read("targetKind", "1_1")).toBe("letter");
  });
});
