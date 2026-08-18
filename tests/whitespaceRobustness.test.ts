/**
 * Whitespace-robustness battery: compiler + runtime.
 *
 * Spreadsheet apps mutate experiment tables with innocent-looking
 * whitespace changes. In a 2024-11-21 report, an Apple Numbers round-trip
 * of SoundCalibrationScientist.xlsx changed exactly two cells (a boolean
 * cell became text "FALSE", and interior spaces were removed from a numeric
 * list) and the experiment failed at runtime. Investigation showed the two
 * diffed cells were semantically inert; robustness now rests on boundary
 * trimming (compiler: dataframeFromPapaParsed + trimParameterNames; runtime:
 * ParamReader.parse) plus per-consumer item trimming.
 *
 * This GREEN suite pins that behavior end-to-end so a refactor cannot
 * silently regress it. Every test asserts CURRENT behavior:
 *  - space-class mutations compile clean (or are explicitly FLAGGED when
 *    the mutated string is genuinely different, e.g. an interior invisible
 *    character),
 *  - the compiled block CSVs are runtime-safe: a real ParamReader loading
 *    them yields values the runtime idioms (split(","), parseFloat, item
 *    trim) consume correctly.
 *
 * @jest-environment node
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { loadPhrasesForTests } from "./helpers/phrases";
import { compileExperimentTableLocally } from "../examples/localCompile";

jest.setTimeout(300_000);

/* -------------------------------------------------------------------------- */
/* Base table: minimal sound-calibration table modeled on the 2024 report.    */
/* Covers every value class involved: boolean, categorical, multicategorical  */
/* (plus a %-commented row), integer, text, and the obsolete-typed numeric    */
/* list that was the report's exact cell.                                     */
/* -------------------------------------------------------------------------- */

const BASE: Record<string, string> = {
  // Underscore (global) parameters — value in column B.
  _about: "space robustness battery",
  _authorAffiliations: "NYU",
  _authorEmails: "scientist@example.org",
  _authors: "A Scientist",
  _calibrateMicrophonesBool: "TRUE", // requires the three _author* rows above
  _calibrateSoundCheck: "speakerAndMic",
  _needBrowser: "Chrome,Safari,Edge",
  _needDeviceType: "desktop",
  _needProcessorCoresMinimum: "4",
  // Condition parameters — value in column C.
  block: "1",
  calibrateScreenSizeBool: "FALSE",
  calibrateSound1000HzDB: "-50,-40,-30,-25,-20,-15,-10,-3.1",
  conditionEnabledBool: "TRUE",
  conditionName: "Q&A",
  conditionTrials: "1",
  questionAndAnswer01: "Comment||Click Ok to continue.",
  targetSoundFolder: "DecimalSineSounds",
  targetTask: "questionAndAnswer",
};

const PERCENT_PARAMS: Record<string, string> = {
  // %-prefixed rows are COMMENTS (discardCommentedLines strips /^%/) — kept
  // to pin that commented rows, whatever their content, neither break the
  // compile nor reach the block CSVs.
  "%_needCalibratedSound": "loudspeaker, microphone",
};

/** Column-major rows: [paramName, globalValue(B), "", conditionValue(C)]. */
const tableRows = (
  overrides: Record<string, string> = {},
): (string | boolean)[][] => {
  const merged: Record<string, string> = {
    ...BASE,
    ...PERCENT_PARAMS,
    ...overrides,
  };
  const rank = (n: string) =>
    n.startsWith("%") ? 1 : n.startsWith("_") ? 0 : 2;
  return Object.keys(merged)
    .sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0))
    .map((name) =>
      name.startsWith("_") || name.startsWith("%")
        ? [name, merged[name], ""]
        : [name, "", merged[name]],
    );
};

const makeTableCsv = (overrides: Record<string, string> = {}): string =>
  Papa.unparse(tableRows(overrides));

/* -------------------------------------------------------------------------- */
/* Compile harness                                                            */
/* -------------------------------------------------------------------------- */

let tmpRoot: string;
const compileCache = new Map<string, any>();

beforeAll(async () => {
  await loadGlossaryForTests();
  await loadPhrasesForTests();

  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ee-space-robust-"));
  fs.mkdirSync(path.join(tmpRoot, "tables"), { recursive: true });
  fs.mkdirSync(path.join(tmpRoot, "folders"), { recursive: true });

  // Sound-folder resource: the structure check only needs one file with an
  // acceptable extension (.wav/.aac) at the zip root — generate it locally.
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("01000.0Hz.wav", Buffer.alloc(44));
  fs.writeFileSync(
    path.join(tmpRoot, "folders", "DecimalSineSounds.zip"),
    await zip.generateAsync({ type: "nodebuffer" }),
  );
});

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

const compileVariant = async (
  label: string,
  overrides: Record<string, string> = {},
  mutateRows?: (rows: (string | boolean)[][]) => (string | boolean)[][],
): Promise<any> => {
  const cached = compileCache.get(label);
  if (cached) return cached;
  let rows = tableRows(overrides);
  if (mutateRows) rows = mutateRows(rows);
  const tablePath = path.join(tmpRoot, "tables", `${label}.csv`);
  fs.writeFileSync(tablePath, Papa.unparse(rows));
  const result = await compileExperimentTableLocally(tablePath, {
    resourcesRoot: tmpRoot,
  });
  compileCache.set(label, result);
  return result;
};

/** Write an .xlsx with the given (typed) rows and compile it. */
const compileVariantXlsx = async (
  label: string,
  rows: (string | boolean)[][],
): Promise<any> => {
  const cached = compileCache.get(label);
  if (cached) return cached;
  const { utils, write } = await import("xlsx");
  const sheet = utils.aoa_to_sheet(rows);
  const book = utils.book_new();
  utils.book_append_sheet(book, sheet, "Sheet1");
  const tablePath = path.join(tmpRoot, "tables", `${label}.xlsx`);
  fs.writeFileSync(
    tablePath,
    write(book, { type: "buffer", bookType: "xlsx" }),
  );
  const result = await compileExperimentTableLocally(tablePath, {
    resourcesRoot: tmpRoot,
  });
  compileCache.set(label, result);
  return result;
};

const errorNames = (result: any): string[] =>
  result.blockingErrors.map((e: any) => e.name);

/** Parse compiled block_1.csv → its single condition, raw strings. */
const blockCondition = (result: any): Record<string, string> => {
  const [csv] = result.fileStringList.find(
    (f: any[]) => f[1] === "block_1.csv",
  );
  return Papa.parse(csv as string, {
    header: true,
    skipEmptyLines: true,
  }).data[0] as Record<string, string>;
};

/* -------------------------------------------------------------------------- */
/* Compiler: space-class mutations must compile clean (GREEN pins)            */
/* -------------------------------------------------------------------------- */

describe("GREEN: space-class mutations compile clean", () => {
  it("base table (control) has no blocking errors", async () => {
    const result = await compileVariant("base");
    expect(errorNames(result)).toEqual([]);
    expect(result.fileStringList.length).toBeGreaterThan(0);
  });

  it('the 2024 Numbers scenario: boolean CELL → text "FALSE" and interior spaces removed from a numeric list are both inert', async () => {
    // The good file stored a real boolean cell (and MORE spaces); Numbers
    // rewrote them as text / fewer spaces. Build both as xlsx with typed
    // cells so the cell-type difference exists at the workbook level.
    const good = tableRows();
    const booleanRow = good.findIndex(
      (r) => r[0] === "calibrateScreenSizeBool",
    );
    const dbRow = good.findIndex((r) => r[0] === "calibrateSound1000HzDB");
    good[booleanRow] = ["calibrateScreenSizeBool", "", false]; // boolean cell
    good[dbRow] = [
      "calibrateSound1000HzDB",
      "",
      " -50, -40,-30,-25,-20,-15,-10,-3.1",
    ];
    const mangled = good.map((r) => [...r]) as (string | boolean)[][];
    mangled[booleanRow] = ["calibrateScreenSizeBool", "", "FALSE"]; // text cell
    mangled[dbRow] = [
      "calibrateSound1000HzDB",
      "",
      "-50,-40,-30,-25,-20,-15,-10,-3.1",
    ];

    const goodResult = await compileVariantXlsx("numbers-good", good);
    const mangledResult = await compileVariantXlsx("numbers-mangled", mangled);

    // Both compile clean…
    expect(errorNames(goodResult)).toEqual([]);
    expect(errorNames(mangledResult)).toEqual([]);

    // …and the cell-type change is invisible: the xlsx → CSV boundary
    // renders both as the string "FALSE".
    expect(blockCondition(goodResult).calibrateScreenSizeBool).toBe("FALSE");
    expect(blockCondition(mangledResult).calibrateScreenSizeBool).toBe("FALSE");

    // The space change is semantically inert under the runtime idiom
    // (split(",") + parseFloat, as in useCalibration/soundTest).
    const toLevels = (r: any) =>
      (blockCondition(r).calibrateSound1000HzDB as string)
        .split(",")
        .map(parseFloat);
    expect(toLevels(mangledResult)).toEqual(toLevels(goodResult));
    expect(toLevels(goodResult).every(Number.isFinite)).toBe(true);
  });

  it("odd spaces in a numeric list value: ends trimmed, interior preserved, runtime-parseable", async () => {
    const result = await compileVariant("db-oddspaces", {
      calibrateSound1000HzDB: "  -50 , -40 ,-30,-25,-20,-15,-10,-3.1  ",
    });
    expect(errorNames(result)).toEqual([]);
    const value = blockCondition(result).calibrateSound1000HzDB;
    expect(value).toBe("-50 , -40 ,-30,-25,-20,-15,-10,-3.1"); // ends trimmed only
    expect(value.split(",").map(parseFloat)).toEqual([
      -50, -40, -30, -25, -20, -15, -10, -3.1,
    ]);
  });

  it("spaces and tabs around commas in multicategorical lists are accepted", async () => {
    const result = await compileVariant("multicat-spaces", {
      _needBrowser: "Chrome, Safari,\tEdge",
    });
    expect(errorNames(result)).toEqual([]);
    // Values pass through to the block CSV as written (ends trimmed only);
    // the runtime trims per item (components/compatibilityCheck.js).
    const cond = blockCondition(result);
    expect(cond._needBrowser).toBe("Chrome, Safari,\tEdge");
    // Commented (%-prefixed) rows never reach the block CSV.
    expect(cond).not.toHaveProperty("%_needCalibratedSound");
  });

  it("padded and lowercase boolean values are accepted", async () => {
    const result = await compileVariant("bool-padding", {
      conditionEnabledBool: "  TRUE  ",
      calibrateScreenSizeBool: "False",
      _needProcessorCoresMinimum: " 4 ",
    });
    expect(errorNames(result)).toEqual([]);
    const cond = blockCondition(result);
    expect(cond.conditionEnabledBool).toBe("TRUE"); // trimmed, uppercased form
    expect(cond.calibrateScreenSizeBool).toBe("False"); // case preserved
    expect(cond._needProcessorCoresMinimum).toBe("4");
  });

  it("trailing NBSP on a categorical value is trimmed away", async () => {
    // JS String.trim() strips NBSP (U+00A0), so a trailing invisible space
    // must not reject an otherwise-valid category.
    const result = await compileVariant("nbsp-trailing", {
      _calibrateSoundCheck: "speakerAndMic\u00a0",
    });
    expect(errorNames(result)).toEqual([]);
    expect(blockCondition(result)._calibrateSoundCheck).toBe("speakerAndMic");
  });

  it("RED: trailing INVISIBLE character (ZWSP) on a value is stripped — same end-rule as parameter names", async () => {
    // ZWSP is not JS \s, so plain trim() keeps it and the value fails
    // validation today. The name rule (stripBlankEnds) strips \s AND
    // invisible chars; values must follow the SAME rule at their ends.
    const result = await compileVariant("zwsp-trailing", {
      _calibrateSoundCheck: "speakerAndMic\u200b",
      conditionEnabledBool: "TRUE\u00ad", // soft hyphen, same class
    });
    expect(errorNames(result)).toEqual([]);
    const cond = blockCondition(result);
    expect(cond._calibrateSoundCheck).toBe("speakerAndMic");
    expect(cond.conditionEnabledBool).toBe("TRUE");
  });

  it("trailing whitespace on a parameter NAME (column A) is normalized away, never a duplicate", async () => {
    // Replace the clean row with a space-padded copy of the SAME parameter
    // (not an extra row) — normalization must make it identical.
    const result = await compileVariant("name-trailing-space", {}, (rows) =>
      rows.map((r) =>
        r[0] === "conditionTrials" ? ["conditionTrials ", r[1], r[2]] : r,
      ),
    );
    expect(errorNames(result)).toEqual([]);
    const cond = blockCondition(result);
    expect(Object.keys(cond)).toContain("conditionTrials");
    expect(Object.keys(cond)).not.toContain("conditionTrials ");
  });
});

/* -------------------------------------------------------------------------- */
/* Compiler: genuinely different strings must be FLAGGED, not accepted        */
/* -------------------------------------------------------------------------- */

describe("GREEN: interior corruption is flagged, not accepted", () => {
  it("interior NBSP in a categorical value → wrong-type error naming the parameter", async () => {
    const result = await compileVariant("nbsp-interior", {
      _calibrateSoundCheck: "speakerAnd\u00a0Mic",
    });
    expect(errorNames(result)).toContain(
      "Parameter contains values of the wrong type",
    );
    const err = result.blockingErrors.find(
      (e: any) => e.name === "Parameter contains values of the wrong type",
    );
    expect(err.parameters).toContain("_calibrateSoundCheck");
  });

  it("interior space in a parameter name → unrecognized-parameter error", async () => {
    const result = await compileVariant("name-interior-space", {}, (rows) =>
      rows.map((r) =>
        r[0] === "conditionTrials" ? ["condition Trial", r[1], r[2]] : r,
      ),
    );
    expect(errorNames(result)).toContain("Parameter is unrecognized");
  });
});

/* -------------------------------------------------------------------------- */
/* Runtime: a real ParamReader loads the mutated compiled tables safely       */
/* -------------------------------------------------------------------------- */

describe("GREEN: runtime ParamReader consumes mutated tables safely", () => {
  let ParamReader: any;
  let readerFiles: Map<string, string>;

  beforeAll(async () => {
    // Mock PapaParse only for the paramReader module (its _loadFile
    // downloads blockCount.csv + block_N.csv). compileExperimentTableLocally
    // was imported statically above and keeps the REAL PapaParse.
    readerFiles = new Map();
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: {
        parse: (url: string, config: any) => {
          const csv = readerFiles.get(url) ?? "";
          const result = Papa.parse(csv, { skipEmptyLines: true });
          config.complete({ data: result.data });
        },
      },
    }));
    const mod = await import("../parameters/paramReader");
    ParamReader = mod.ParamReader;
  });

  afterAll(() => {
    jest.dontMock("papaparse");
  });

  const makeReader = (result: any): any => {
    readerFiles.clear();
    for (const [csv, name] of result.fileStringList)
      readerFiles.set(`./conditions/${name}`, csv);
    readerFiles.set("./conditions/blockCount.csv", "block\n1");
    return new ParamReader("conditions", () => {});
  };

  it('padded boolean cell parses to boolean true; "False" to boolean false', async () => {
    const result = await compileVariant("bool-padding", {
      conditionEnabledBool: "  TRUE  ",
      calibrateScreenSizeBool: "False",
      _needProcessorCoresMinimum: " 4 ",
    });
    const reader = makeReader(result);
    expect(reader.read("conditionEnabledBool")[0]).toBe(true);
    expect(reader.read("calibrateScreenSizeBool")[0]).toBe(false);
  });

  it("spaced integer cell parses to a number", async () => {
    const result = await compileVariant("bool-padding", {
      conditionEnabledBool: "  TRUE  ",
      calibrateScreenSizeBool: "False",
      _needProcessorCoresMinimum: " 4 ",
    });
    const reader = makeReader(result);
    expect(reader.read("_needProcessorCoresMinimum")[0]).toBe(4);
  });

  it("numeric list value is returned as a string the split/parseFloat idiom parses", async () => {
    const result = await compileVariant("db-oddspaces", {
      calibrateSound1000HzDB: "  -50 , -40 ,-30,-25,-20,-15,-10,-3.1  ",
    });
    const reader = makeReader(result);
    const value = reader.read("calibrateSound1000HzDB")[0];
    expect(typeof value).toBe("string");
    expect(value.split(",").map(parseFloat)).toEqual([
      -50, -40, -30, -25, -20, -15, -10, -3.1,
    ]);
  });

  it("spaced multicategorical list splits+trims to the required browsers (compat idiom)", async () => {
    const result = await compileVariant("multicat-spaces", {
      _needBrowser: "Chrome, Safari,\tEdge",
    });
    const reader = makeReader(result);
    // components/compatibilityCheck.js: read()[0].split(",").map(trim)
    const browsers = reader
      .read("_needBrowser")[0]
      .split(",")
      .map((s: string) => s.trim());
    expect(browsers).toEqual(["Chrome", "Safari", "Edge"]);
  });

  it("trailing-NBSP categorical value reads back as the clean category", async () => {
    const result = await compileVariant("nbsp-trailing", {
      _calibrateSoundCheck: "speakerAndMic\u00a0",
    });
    const reader = makeReader(result);
    expect(reader.read("_calibrateSoundCheck")[0]).toBe("speakerAndMic");
  });
});
