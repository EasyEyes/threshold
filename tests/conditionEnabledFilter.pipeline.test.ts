/**
 * Condition-enabled integration pipeline:
 * experiment CSV → compiler → block CSVs → real ParamReader loading/filtering.
 * Includes ragged-input, whitespace, and missing-condition regressions.
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

interface BlockFile {
  name: string;
  csv: string;
}

const readFixture = (filename: string): string =>
  fs.readFileSync(path.join(TABLES_DIR, filename), "utf8");

const parseFixture = (filename: string): string[][] =>
  Papa.parse(readFixture(filename), { skipEmptyLines: true })
    .data as string[][];

const parseBlockCsv = (csv: string): Record<string, string>[] =>
  Papa.parse(csv, { header: true, skipEmptyLines: true }).data as Record<
    string,
    string
  >[];

/** Real compiler path: discard → filter → dataframe → normalize → split. */
function runCorePipeline(filename: string): BlockFile[] {
  const parsed = Papa.parse(readFixture(filename), { skipEmptyLines: true });
  let data = (parsed.data as unknown[][]).filter(
    (row) => !/^%/.test(((row[0] as string) || "").trim()),
  ) as string[][];
  data = data.filter((row) => row.some((x) => x));

  const trailingCount = (row: string[]) => {
    const cells = [...row];
    let count = 0;
    while (cells.pop() === "") count++;
    return count;
  };
  const minTrailing = Math.min(...data.map(trailingCount));
  if (minTrailing > 0) data = data.map((row) => row.slice(0, -minTrailing));

  data = filterDisabledConditionsFromParsed(data).data;
  let df = dataframeFromPapaParsed({ data });
  df = normalizeExperimentDfShape(df);
  df = addNewInternalParam(df, "!experimentFilename", filename);
  const rawFiles = splitIntoBlockFiles(df, "node") as [string, string][];
  return rawFiles.map(([csv, name]) => ({ name, csv }));
}

const compileToMap = (filename: string): Map<string, string> =>
  new Map(
    runCorePipeline(filename).map(({ name, csv }) => [
      `./conditions/${name}`,
      csv,
    ]),
  );

const getBlocks = (data: string[][]): string[] => {
  const row = data.find((r) => r[0] === "block");
  return row ? row.slice(2).filter(Boolean) : [];
};

const conditionCount = (data: string[][]): number =>
  Math.max(...data.map((row) => row.length)) - 2;

const padToLongestLength = (data: string[][]): string[][] => {
  const maxLen = Math.max(...data.map((row) => row.length));
  return data.map((row) => [
    ...row,
    ...new Array(maxLen - row.length).fill(""),
  ]);
};

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("Full pipeline: core compile → block CSVs", () => {
  it("disabled conditions are absent from generated block CSVs", () => {
    const blockFiles = runCorePipeline("test-conditionEnabled-e2e.csv");
    expect(blockFiles.length).toBeGreaterThan(0);
    const block1 = blockFiles.find((f) => f.name === "block_1.csv");
    expect(block1).toBeDefined();
    expect(blockFiles.find((f) => f.name === "block_2.csv")).toBeUndefined();
    expect(blockFiles.find((f) => f.name === "block_3.csv")).toBeUndefined();
    expect(parseBlockCsv(block1!.csv).map((r) => r.block_condition)).toEqual([
      "1_1",
      "1_2",
    ]);
  });

  it("conditionEnabledBool is always 'true' in block CSV output", () => {
    for (const file of runCorePipeline("test-conditionEnabled-e2e.csv")) {
      if (!file.name.startsWith("block_") || file.name === "blockCount.csv")
        continue;
      for (const row of parseBlockCsv(file.csv)) {
        const value = row.conditionEnabledBool;
        if (value !== undefined) expect(value.toLowerCase()).toBe("true");
      }
    }
  });

  it("block CSV parameter values match original experiment table", () => {
    const block1 = runCorePipeline("test-conditionEnabled-e2e.csv").find(
      (f) => f.name === "block_1.csv",
    )!;
    const rows = parseBlockCsv(block1.csv);
    const cond1 = rows.find((r) => r.block_condition === "1_1")!;
    const cond2 = rows.find((r) => r.block_condition === "1_2")!;
    expect(cond1.font).toBe("Roboto Mono");
    expect(cond1.spacingDirection).toBe("radial");
    expect(cond1.targetEccentricityXDeg).toBe("-5");
    expect(cond2.targetEccentricityXDeg).toBe("5");
  });

  it("blockCount.csv reflects only enabled blocks", () => {
    const blockCount = runCorePipeline("test-conditionEnabled-e2e.csv").find(
      (f) => f.name === "blockCount.csv",
    )!;
    expect(parseBlockCsv(blockCount.csv).map((r) => r.block)).toEqual(["1"]);
  });

  it("mixed enabled/disabled within a block: only enabled conditions survive", () => {
    const block1 = runCorePipeline("test-conditionEnabled-mixed.csv").find(
      (f) => f.name === "block_1.csv",
    )!;
    const rows = parseBlockCsv(block1.csv);
    expect(rows.map((r) => r.block_condition)).toEqual(["1_1", "1_2"]);
    const names = rows.map((r) => r.conditionName);
    expect(names).toContain("enabled-A");
    expect(names).toContain("enabled-C");
    expect(names).not.toContain("disabled-B");
    expect(names).not.toContain("disabled-D");
  });

  it("an all-disabled experiment produces no block CSVs (synthetic)", () => {
    const data = [
      ["_about", "all disabled", "", ""],
      ["block", "", "1", "1"],
      ["conditionEnabledBool", "", "FALSE", "FALSE"],
      ["conditionTrials", "", "10", "10"],
      ["font", "", "Arial", "Courier"],
    ];
    const filtered = filterDisabledConditionsFromParsed(data).data;
    expect(filtered[0]).toHaveLength(2);
    const normalized = normalizeExperimentDfShape(
      dataframeFromPapaParsed({ data: filtered }),
    );
    const files = splitIntoBlockFiles(
      addNewInternalParam(normalized, "!experimentFilename", "test"),
      "node",
    ) as [string, string][];
    expect(files.filter((f) => f[1].startsWith("block_"))).toHaveLength(0);
  });

  it("real all-disabled CSV produces only a header-only blockCount.csv", () => {
    const blockFiles = runCorePipeline(
      "test-conditionEnabled-all-disabled.csv",
    );
    expect(blockFiles.filter((f) => f.name.startsWith("block_"))).toHaveLength(
      0,
    );
    const blockCount = blockFiles.find((f) => f.name === "blockCount.csv")!;
    expect(parseBlockCsv(blockCount.csv)).toHaveLength(0);
  });
});

describe("Integration: block CSVs → ParamReader runtime filter", () => {
  let ParamReader: any;
  let mockFileMap: Map<string, string>;

  beforeAll(async () => {
    mockFileMap = new Map();
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: {
        parse: (url: string, config: any) => {
          const result = Papa.parse(mockFileMap.get(url) ?? "", {
            skipEmptyLines: true,
          });
          config.complete({ data: result.data });
        },
      },
    }));
    ParamReader = (await import("../parameters/paramReader")).ParamReader;
  });

  afterAll(() => {
    jest.dontMock("papaparse");
  });

  const loadCompiledReader = (filename: string) => {
    mockFileMap = compileToMap(filename);
    return new ParamReader("conditions", () => {});
  };

  it("compiled experiment loads only enabled conditions into _experiment", () => {
    const reader = loadCompiledReader("test-conditionEnabled-e2e.csv");
    expect(reader._experiment).toHaveLength(2);
    expect(reader._experiment.map((c: any) => c.block_condition)).toEqual([
      "1_1",
      "1_2",
    ]);
    expect(
      reader._experiment.every((c: any) => c.conditionEnabledBool !== false),
    ).toBe(true);
  });

  it("runtime filter passes all enabled conditions after clean compile", () => {
    const reader = loadCompiledReader("test-conditionEnabled-e2e.csv");
    const rawConditions = parseBlockCsv(
      mockFileMap.get("./conditions/block_1.csv")!,
    );
    const filtered = rawConditions.filter((c) =>
      reader.read("conditionEnabledBool", c.block_condition),
    );
    expect(filtered.map((c) => c.block_condition)).toEqual(["1_1", "1_2"]);
  });

  it("disabled condition in block CSV excluded by runtime filter", () => {
    mockFileMap = new Map([
      [
        "./conditions/blockCount.csv",
        "block,targetKind,targetTask\n1,letter,identify",
      ],
      [
        "./conditions/block_1.csv",
        [
          "block_condition,block,conditionEnabledBool,conditionTrials,font",
          "1_1,1,TRUE,10,Arial",
          "1_2,1,FALSE,10,Courier",
          "1_3,1,TRUE,10,Times",
        ].join("\n"),
      ],
    ]);
    const reader = new ParamReader("conditions", () => {});
    expect(reader._experiment.map((c: any) => c.block_condition)).toEqual([
      "1_1",
      "1_3",
    ]);
    const rawConditions = parseBlockCsv(
      mockFileMap.get("./conditions/block_1.csv")!,
    );
    expect(rawConditions).toHaveLength(3);
    const filtered = rawConditions.filter((c) =>
      reader.read("conditionEnabledBool", c.block_condition),
    );
    expect(filtered.map((c) => c.block_condition)).toEqual(["1_1", "1_3"]);
  });

  it("two-clause filter (conditionEnabledBool && conditionTrials>0) excludes disabled", () => {
    mockFileMap = new Map([
      [
        "./conditions/blockCount.csv",
        "block,targetKind,targetTask\n1,letter,identify",
      ],
      [
        "./conditions/block_1.csv",
        [
          "block_condition,block,conditionEnabledBool,conditionTrials,font",
          "1_1,1,TRUE,10,Arial",
          "1_2,1,FALSE,10,Courier",
          "1_3,1,TRUE,10,Times",
        ].join("\n"),
      ],
    ]);
    const reader = new ParamReader("conditions", () => {});
    const rawConditions = parseBlockCsv(
      mockFileMap.get("./conditions/block_1.csv")!,
    );
    const filtered = rawConditions.filter(
      (c) =>
        reader.read("conditionEnabledBool", c.block_condition) &&
        reader.read("conditionTrials", c.block_condition) > 0,
    );
    expect(filtered.map((c) => c.block_condition)).toEqual(["1_1", "1_3"]);
  });
});

describe("Ragged and whitespace CSV inputs", () => {
  it("reduces conditionCount from 6 to 2 (disabled blocks removed)", () => {
    const data = parseFixture("test-conditionEnabled-e2e.csv");
    expect(data[0][0]).toBe("_about");
    expect(data[0]).toHaveLength(2);
    expect(conditionCount(filterDisabledConditionsFromParsed(data).data)).toBe(
      2,
    );
  });

  it("leaves no FALSE values in conditionEnabledBool row after filter", () => {
    const filtered = filterDisabledConditionsFromParsed(
      parseFixture("test-conditionEnabled-e2e.csv"),
    ).data;
    const row = padToLongestLength(filtered).find(
      (r) => r[0] === "conditionEnabledBool",
    )!;
    expect(row.slice(2).some((v) => v.trim().toUpperCase() === "FALSE")).toBe(
      false,
    );
  });

  it("removes disabled blocks from the block row", () => {
    const filtered = filterDisabledConditionsFromParsed(
      parseFixture("test-conditionEnabled-e2e.csv"),
    ).data;
    expect([...new Set(getBlocks(padToLongestLength(filtered)))]).toEqual([
      "1",
    ]);
  });

  it("'conditionEnabledBool ' (trailing space) is still found", () => {
    const data = padToLongestLength(
      parseFixture("test-conditionEnabled-whitespace-bug.csv"),
    );
    const row = data.find((r) => r[0]?.startsWith("conditionEnabledBool"))!;
    expect(row[0]).toBe("conditionEnabledBool ");
    expect(row[0]).not.toBe("conditionEnabledBool");
    expect(conditionCount(filterDisabledConditionsFromParsed(data).data)).toBe(
      1,
    );
  });

  it("leaves no FALSE values after filtering whitespace param names", () => {
    const filtered = filterDisabledConditionsFromParsed(
      padToLongestLength(
        parseFixture("test-conditionEnabled-whitespace-bug.csv"),
      ),
    ).data;
    const row = filtered.find((r) => r[0]?.startsWith("conditionEnabledBool"))!;
    expect(row.slice(2).some((v) => v.trim().toUpperCase() === "FALSE")).toBe(
      false,
    );
  });

  it("filters disabled conditions from a padded real CSV", () => {
    const data = padToLongestLength(
      parseFixture("test-conditionEnabled-e2e.csv"),
    );
    expect(conditionCount(data)).toBe(6);
    const filtered = filterDisabledConditionsFromParsed(data).data;
    expect(conditionCount(filtered)).toBe(2);
    expect(getBlocks(filtered)).toEqual(["1", "1"]);
  });

  it("results in no FALSE values after filtering a padded real CSV", () => {
    const filtered = filterDisabledConditionsFromParsed(
      padToLongestLength(parseFixture("test-conditionEnabled-e2e.csv")),
    ).data;
    const row = filtered.find((r) => r[0] === "conditionEnabledBool")!;
    expect(row.slice(2).some((v) => v.toUpperCase() === "FALSE")).toBe(false);
  });

  it("conserves block numbers after filtering a padded real CSV", () => {
    const filtered = filterDisabledConditionsFromParsed(
      padToLongestLength(parseFixture("test-conditionEnabled-e2e.csv")),
    ).data;
    expect(getBlocks(filtered)).toEqual(["1", "1"]);
  });
});
