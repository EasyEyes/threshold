/**
 * ParamReader: underscore-prefixed (global, experiment-wide) parameters.
 *
 * By spec, underscore params are GLOBAL — identical across all blocks. The
 * compiler replicates provided global values into every condition row of the
 * block CSVs; globals absent from the table resolve via the glossary default
 * at runtime.
 *
 * Bug: both runtime read paths (param present in CSVs → _getParam; param
 * absent → _getParamGlossary) build their result by counting conditions in
 * the requested block. When the requested block has NO conditions (e.g.
 * block 1 fully disabled, experiment starts at block 3), they return [],
 * so `read("_needSoundOutput")?.[0]` is undefined and the compat flow's
 * `|| "headphone"` fallback spuriously enables the Huggins screening, while
 * `read("_needBrowser")[0].split(",")` crashes the study.
 *
 * Fix: for underscore params, an empty requested block must still yield the
 * single global value (any remaining condition's value, else the glossary
 * default). Non-underscore params keep the current per-condition contract
 * (empty block → []).
 *
 * @jest-environment node
 */

import type { GlossaryData } from "../../source/components/types";

const fixture: GlossaryData = {
  version: "1",
  glossary: {
    _needSoundOutput: {
      name: "_needSoundOutput",
      availability: "now",
      type: "categorical",
      default: "speakerOrHeadphone",
      explanation: "",
      example: "",
      categories: ["speaker", "headphone", "speakerOrHeadphone"],
    },
    _needBrowser: {
      name: "_needBrowser",
      availability: "now",
      type: "text",
      default: "Chrome",
      explanation: "",
      example: "",
      categories: [],
    },
    _language: {
      name: "_language",
      availability: "now",
      type: "categorical",
      default: "en",
      explanation: "",
      example: "",
      categories: ["en", "fr"],
    },
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
  },
  glossaryFull: [],
  superMatchingParams: [],
};

/** Conditions as Papa.parse would yield them (block values are strings). */
const populatedConditions = [
  {
    block: "1",
    block_condition: "1_1",
    _needBrowser: "all",
    _language: "en",
    font: "Inter",
  },
  {
    block: "2",
    block_condition: "2_1",
    _needBrowser: "all",
    _language: "en",
    font: "InterFull.ttf",
  },
];

/** The no-google scenario: block-1/2 conditions dropped; first block is 3. */
const sparseConditions = [
  {
    block: "3",
    block_condition: "3_1",
    _needBrowser: "all",
    _language: "en",
    font: "InterFull.ttf",
  },
  {
    block: "4",
    block_condition: "4_1",
    _needBrowser: "all",
    _language: "en",
    font: "InterFull.ttf",
  },
];

const makeReader = async (conditions: any[], blockCount: number) => {
  jest.resetModules();
  jest.doMock("papaparse", () => ({
    __esModule: true,
    default: { parse: () => {} },
  }));
  const { initGlossary } = await import("../parameters/glossaryRegistry");
  const { ParamReader } = await import("../parameters/paramReader");
  initGlossary(fixture);
  const reader: any = new ParamReader("conditions");
  reader._experiment = conditions;
  reader._blockCount = blockCount;
  return reader;
};

// ---------------------------------------------------------------------------
// GREEN: current correct behavior that must be preserved
// ---------------------------------------------------------------------------

describe("GREEN: reads on populated blocks (preservation)", () => {
  it("present non-underscore param, numbered block → per-condition values", async () => {
    const reader = await makeReader(populatedConditions, 2);
    expect(reader.read("font", 1)).toEqual(["Inter"]);
    expect(reader.read("font", 2)).toEqual(["InterFull.ttf"]);
  });

  it("absent non-underscore param, numbered block → glossary default per condition", async () => {
    const reader = await makeReader(populatedConditions, 2);
    expect(reader.read("targetKind", 1)).toEqual(["letter"]);
  });

  it("present underscore param, numbered block → per-condition values", async () => {
    const reader = await makeReader(populatedConditions, 2);
    expect(reader.read("_needBrowser", 1)).toEqual(["all"]);
    expect(reader.read("_needBrowser", 2)).toEqual(["all"]);
  });

  it("absent underscore param, numbered block → glossary default", async () => {
    const reader = await makeReader(populatedConditions, 2);
    expect(reader.read("_needSoundOutput", 1)).toEqual(["speakerOrHeadphone"]);
    expect(reader.read("_needSoundOutput", 2)).toEqual(["speakerOrHeadphone"]);
  });

  it("read() with no block argument ≡ read(name, '__ALL_BLOCKS__')", async () => {
    const reader = await makeReader(populatedConditions, 2);
    expect(reader.read("font")).toEqual(["Inter", "InterFull.ttf"]);
    expect(reader.read("_needSoundOutput")).toEqual([
      "speakerOrHeadphone",
      "speakerOrHeadphone",
    ]);
    // [0] is the first condition in block order — identical to the old
    // block-1 value whenever block 1 is populated.
    expect(reader.read("font")[0]).toBe("Inter");
  });

  it("__ALL_BLOCKS__ returns one value per condition, present and absent params", async () => {
    const reader = await makeReader(populatedConditions, 2);
    expect(reader.read("font", "__ALL_BLOCKS__")).toEqual([
      "Inter",
      "InterFull.ttf",
    ]);
    expect(reader.read("_needSoundOutput", "__ALL_BLOCKS__")).toEqual([
      "speakerOrHeadphone",
      "speakerOrHeadphone",
    ]);
  });

  it("string condition-name reads return a single value", async () => {
    const reader = await makeReader(populatedConditions, 2);
    expect(reader.read("font", "1_1")).toBe("Inter");
    expect(reader.read("_needSoundOutput", "1_1")).toBe("speakerOrHeadphone");
  });

  it("empty block, non-underscore params → [] (contract unchanged)", async () => {
    const reader = await makeReader(sparseConditions, 6);
    expect(reader.read("font", 1)).toEqual([]);
    expect(reader.read("targetKind", 1)).toEqual([]);
  });

  it("sparse experiment: reads on populated blocks still work", async () => {
    const reader = await makeReader(sparseConditions, 6);
    expect(reader.read("font", 3)).toEqual(["InterFull.ttf"]);
    expect(reader.read("_needBrowser", 3)).toEqual(["all"]);
    expect(reader.read("_needSoundOutput", 3)).toEqual(["speakerOrHeadphone"]);
  });
});

// ---------------------------------------------------------------------------
// RED: desired behavior for underscore (global) params on empty blocks
// ---------------------------------------------------------------------------

describe("RED: underscore (global) params when block 1 is empty", () => {
  it("absent global: read('_needSoundOutput') returns the glossary default", async () => {
    const reader = await makeReader(sparseConditions, 6);
    expect(reader.read("_needSoundOutput")).toEqual([
      "speakerOrHeadphone",
      "speakerOrHeadphone",
    ]);
  });

  it("absent global: explicit block-1 read returns the glossary default", async () => {
    const reader = await makeReader(sparseConditions, 6);
    expect(reader.read("_needSoundOutput", 1)).toEqual(["speakerOrHeadphone"]);
  });

  it("present global: read('_needBrowser') returns the value from any remaining condition", async () => {
    const reader = await makeReader(sparseConditions, 6);
    expect(reader.read("_needBrowser")).toEqual(["all", "all"]);
  });

  it("present global: explicit block-1 read returns the global value", async () => {
    const reader = await makeReader(sparseConditions, 6);
    expect(reader.read("_needBrowser", 1)).toEqual(["all"]);
  });

  it("present global: read('_language') returns the global value", async () => {
    const reader = await makeReader(sparseConditions, 6);
    expect(reader.read("_language")).toEqual(["en", "en"]);
  });

  it("empty block 2 (middle gap) also resolves the global", async () => {
    const reader = await makeReader(sparseConditions, 6);
    expect(reader.read("_needBrowser", 2)).toEqual(["all"]);
    expect(reader.read("_needSoundOutput", 2)).toEqual(["speakerOrHeadphone"]);
  });

  it("no-arg read on a sparse experiment returns ALL conditions' values (first = first available block)", async () => {
    const reader = await makeReader(sparseConditions, 6);
    expect(reader.read("font")).toEqual(["InterFull.ttf", "InterFull.ttf"]);
    expect(reader.read("font")[0]).toBe("InterFull.ttf");
  });
});
