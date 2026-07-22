/**
 * Integration tests: compile pipeline → ParamReader._loadFile → runtime filter.
 *
 * These tests bridge compile-time filtering and runtime behavior. They:
 *   1. Compile experiment tables through the real pipeline (or craft block CSVs)
 *   2. Feed the resulting block CSVs to a real ParamReader via Papa.parse mock
 *   3. Simulate the TrialHandler.importConditions + .filter() logic from threshold.js
 *
 * The RED tests demonstrate the _getParam fallthrough bug: when _loadFile
 * correctly filters a disabled condition out of _experiment, but
 * TrialHandler.importConditions still returns it (reads raw CSV), the runtime
 * filter calls read("conditionEnabledBool", missingConditionName) which returns
 * [] (truthy) instead of undefined (falsy), causing the disabled condition
 * to erroneously pass the filter.
 *
 * @jest-environment node
 */

import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { normalizeExperimentDfShape } from "../preprocess/transformExperimentTable";
import { splitIntoBlockFiles } from "../preprocess/blockGen";
import {
  dataframeFromPapaParsed,
  addNewInternalParam,
} from "../preprocess/utils";
import { filterDisabledConditionsFromParsed } from "../preprocess/main";

const TABLES_DIR = path.resolve(__dirname, "fixtures");

/** Compile a CSV file through the real pipeline → map of URL → CSV string. */
function compileCsvToFiles(filename: string): Map<string, string> {
  const filePath = path.join(TABLES_DIR, filename);
  const csvRaw = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse(csvRaw, { skipEmptyLines: true });

  let data = (parsed.data as unknown[][]).filter(
    (row) => !/^%/.test(((row[0] as string) || "").trim()),
  ) as string[][];
  data = data.filter((row) => row.some((x) => x));

  const numTrailing = (r: string[]) => {
    const v = [...r];
    let n = 0;
    while (v.pop() === "") n++;
    return n;
  };
  const minTrailing = Math.min(...data.map(numTrailing));
  if (minTrailing > 0) {
    data = data.map((row) => row.slice(0, -minTrailing));
  }

  data = filterDisabledConditionsFromParsed(data).data;

  let df = dataframeFromPapaParsed({ data });
  df = normalizeExperimentDfShape(df);
  df = addNewInternalParam(df, "!experimentFilename", filename);
  const rawFiles = splitIntoBlockFiles(df, "node") as [string, string][];

  const fileMap = new Map<string, string>();
  for (const [csv, name] of rawFiles) {
    fileMap.set(`./conditions/${name}`, csv);
  }
  return fileMap;
}

/** Parse a block CSV string as TrialHandler.importConditions would (header → objects). */
function importConditionsLike(csv: string): Record<string, string>[] {
  return Papa.parse(csv, { header: true, skipEmptyLines: true }).data as Record<
    string,
    string
  >[];
}

describe("Integration: compile → ParamReader._loadFile → runtime filter", () => {
  let ParamReader: any;
  let mockFileMap: Map<string, string>;

  beforeAll(async () => {
    await loadGlossaryForTests();

    // Mutable file map — each test populates it with block CSV strings.
    // The mock reads from this map when _loadFile calls Papa.parse(url).
    mockFileMap = new Map();

    // Mock PapaParse for ParamReader._loadFile.
    // The top-level `import Papa` is the REAL module (resolved before doMock),
    // so we can use it inside the mock to parse CSV strings.
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: {
        parse: (url: string, config: any) => {
          const csv = mockFileMap.get(url) ?? "";
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

  // ── GREEN: happy path — compile filter removes disabled conditions ──

  it("GREEN: compiled experiment loads only enabled conditions into _experiment", () => {
    const fileMap = compileCsvToFiles("test-conditionEnabled-e2e.csv");
    mockFileMap.clear();
    for (const [k, v] of fileMap) mockFileMap.set(k, v);

    const reader = new ParamReader("conditions", () => {});

    // Blocks 2 and 3 were disabled → only block 1 survives with 2 conditions
    expect(reader._experiment).toHaveLength(2);
    expect(reader._experiment.map((c: any) => c.block_condition)).toEqual([
      "1_1",
      "1_2",
    ]);
    expect(
      reader._experiment.every((c: any) => c.conditionEnabledBool !== false),
    ).toBe(true);
  });

  it("GREEN: runtime filter passes all enabled conditions after clean compile", () => {
    const fileMap = compileCsvToFiles("test-conditionEnabled-e2e.csv");
    mockFileMap.clear();
    for (const [k, v] of fileMap) mockFileMap.set(k, v);

    const reader = new ParamReader("conditions", () => {});

    // Simulate TrialHandler.importConditions (reads raw block CSV)
    const blockCsv = mockFileMap.get("./conditions/block_1.csv")!;
    const rawConditions = importConditionsLike(blockCsv);

    // Runtime filter (threshold.js:2852 pattern)
    const filtered = rawConditions.filter((c) =>
      reader.read("conditionEnabledBool", c.block_condition),
    );

    expect(filtered).toHaveLength(2);
    expect(filtered.map((c) => c.block_condition)).toEqual(["1_1", "1_2"]);
  });

  // ── Regression: disabled condition in block CSV — the mismatch scenario ──
  // Simulates a compile filter failure: a disabled condition survives in the
  // block CSV. _loadFile filters it from _experiment, but
  // TrialHandler.importConditions returns it from the raw CSV, so the runtime
  // filter must exclude it.

  it("disabled condition in block CSV excluded by runtime filter", () => {
    // Craft a block CSV with a disabled condition (simulating compile filter failure)
    const blockCsv = [
      "block_condition,block,conditionEnabledBool,conditionTrials,font",
      "1_1,1,TRUE,10,Arial",
      "1_2,1,FALSE,10,Courier",
      "1_3,1,TRUE,10,Times",
    ].join("\n");

    const blockCountCsv = [
      "block,targetKind,targetTask",
      "1,letter,identify",
    ].join("\n");

    mockFileMap.clear();
    mockFileMap.set("./conditions/blockCount.csv", blockCountCsv);
    mockFileMap.set("./conditions/block_1.csv", blockCsv);

    const reader = new ParamReader("conditions", () => {});

    // _loadFile should have filtered out the disabled condition (1_2)
    expect(reader._experiment).toHaveLength(2);
    expect(reader._experiment.map((c: any) => c.block_condition)).toEqual([
      "1_1",
      "1_3",
    ]);

    // Simulate TrialHandler.importConditions — returns ALL rows from raw CSV
    const rawConditions = importConditionsLike(blockCsv);
    expect(rawConditions).toHaveLength(3); // includes disabled 1_2

    // Runtime filter (threshold.js:2852 pattern)
    const filtered = rawConditions.filter((c) =>
      reader.read("conditionEnabledBool", c.block_condition),
    );

    // Only 2 conditions (1_2 excluded by the runtime filter)
    expect(filtered).toHaveLength(2);
    expect(filtered.map((c) => c.block_condition)).toEqual(["1_1", "1_3"]);
  });

  it("REGRESSION: two-clause filter (conditionEnabledBool && conditionTrials>0) excludes disabled", () => {
    // Same mismatch scenario, but tests the trialsLoopBegin filter pattern.
    // Currently this works BY ACCIDENT: [] > 0 is false, saving the filter.
    // After the fix (returns undefined), undefined && ... is still falsy.
    // This test ensures the behavior is correct regardless of mechanism.

    const blockCsv = [
      "block_condition,block,conditionEnabledBool,conditionTrials,font",
      "1_1,1,TRUE,10,Arial",
      "1_2,1,FALSE,10,Courier",
      "1_3,1,TRUE,10,Times",
    ].join("\n");

    const blockCountCsv = [
      "block,targetKind,targetTask",
      "1,letter,identify",
    ].join("\n");

    mockFileMap.clear();
    mockFileMap.set("./conditions/blockCount.csv", blockCountCsv);
    mockFileMap.set("./conditions/block_1.csv", blockCsv);

    const reader = new ParamReader("conditions", () => {});

    const rawConditions = importConditionsLike(blockCsv);

    // Two-clause filter (threshold.js:3017-3021 pattern)
    const filtered = rawConditions.filter(
      (c) =>
        reader.read("conditionEnabledBool", c.block_condition) &&
        reader.read("conditionTrials", c.block_condition) > 0,
    );

    expect(filtered).toHaveLength(2);
    expect(filtered.map((c) => c.block_condition)).toEqual(["1_1", "1_3"]);
  });
});
