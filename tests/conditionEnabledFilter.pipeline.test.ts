/**
 * Full-pipeline compile tests for conditionEnabledBool filtering.
 *
 * Runs real CSV files through the core compile pipeline:
 * discard → filter → dataframe → normalize → splitIntoBlockFiles.
 * Block numbers are conserved (never renumbered) from the spreadsheet.
 * Uses the live EasyEyes glossary (cached to disk after first fetch).
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

const TABLES_DIR = path.resolve(__dirname, "../examples/tables");

// ── Core pipeline ──

interface BlockFile {
  name: string;
  csv: string;
}

/**
 * Run the core compile pipeline on a CSV file:
 *   PapaParse → discard whitespace → filter disabled →
 *   dataframe → normalize shape → split into block CSVs.
 * Block numbers are conserved from the spreadsheet (never renumbered).
 */
function runCorePipeline(filename: string): {
  blockFiles: BlockFile[];
  warnings: string[];
} {
  // 1. Parse CSV with PapaParse (same as real pipeline)
  const filePath = path.join(TABLES_DIR, filename);
  const csvRaw = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse(csvRaw, { skipEmptyLines: true });

  // 2. Discard commented lines (rows starting with %)
  const commentRegex = /^%/;
  let data: string[][] = (parsed.data as unknown[][]).filter(
    (row) => !commentRegex.test(((row[0] as string) || "").trim()),
  ) as string[][];
  // Discard trailing whitespace lines (all-empty rows)
  data = data.filter((row) => row.some((x: any) => x));

  // discardTrailingWhitespaceColumns
  const numTrailing = (r: string[]) => {
    const v = [...r];
    let n = 0;
    while (v.pop() === "") n++;
    return n;
  };
  const trailingCounts = data.map(numTrailing);
  const minTrailing = Math.min(...trailingCounts);
  if (minTrailing > 0) {
    data = data.map((row: string[]) => row.slice(0, -minTrailing));
  }

  // 3. Filter disabled conditions (block numbers are conserved, not renumbered)
  data = filterDisabledConditionsFromParsed(data);

  // 4. Build dataframe (pads to longest length internally)
  let df = dataframeFromPapaParsed({ data });

  // 5. Normalize shape: add block_condition labels, populate defaults, drop column B
  df = normalizeExperimentDfShape(df);
  df = addNewInternalParam(df, "!experimentFilename", filename);

  // 6. Split into per-block CSV files
  const rawFiles = splitIntoBlockFiles(df, "node") as [string, string][];
  const blockFiles: BlockFile[] = rawFiles.map(([csv, name]) => ({
    name,
    csv,
  }));

  return { blockFiles, warnings: [] };
}

/** Parse a block CSV string into rows of objects (header → values). */
function parseBlockCsv(csvString: string): Record<string, string>[] {
  const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
  return parsed.data as Record<string, string>[];
}

// ── Tests ──

describe("Full pipeline: core compile → block CSVs", () => {
  beforeAll(async () => {
    await loadGlossaryForTests();
  });

  it("disabled conditions are absent from generated block CSVs", () => {
    const { blockFiles } = runCorePipeline("test-conditionEnabled-e2e.csv");

    expect(blockFiles.length).toBeGreaterThan(0);

    const block1 = blockFiles.find((f) => f.name === "block_1.csv");
    const block2 = blockFiles.find((f) => f.name === "block_2.csv");
    const block3 = blockFiles.find((f) => f.name === "block_3.csv");

    // Block 1 enabled → should exist
    expect(block1).toBeDefined();
    // Blocks 2 and 3 all disabled → should NOT exist
    expect(block2).toBeUndefined();
    expect(block3).toBeUndefined();

    const rows = parseBlockCsv(block1!.csv);
    const blockConditions = rows.map((r) => r["block_condition"]);
    expect(blockConditions).toEqual(["1_1", "1_2"]);
  });

  it("conditionEnabledBool is always 'true' in block CSV output", () => {
    const { blockFiles } = runCorePipeline("test-conditionEnabled-e2e.csv");

    for (const file of blockFiles) {
      if (!file.name.startsWith("block_") || file.name === "blockCount.csv")
        continue;
      for (const row of parseBlockCsv(file.csv)) {
        const val = row["conditionEnabledBool"];
        if (val !== undefined) {
          expect(val.toLowerCase()).toBe("true");
        }
      }
    }
  });

  it("block CSV parameter values match original experiment table", () => {
    const { blockFiles } = runCorePipeline("test-conditionEnabled-e2e.csv");
    const block1 = blockFiles.find((f) => f.name === "block_1.csv")!;
    const rows = parseBlockCsv(block1.csv);

    const cond1 = rows.find((r) => r["block_condition"] === "1_1")!;
    const cond2 = rows.find((r) => r["block_condition"] === "1_2")!;

    expect(cond1["font"]).toBe("Roboto Mono");
    expect(cond1["spacingDirection"]).toBe("radial");
    expect(cond1["targetEccentricityXDeg"]).toBe("-5");
    expect(cond2["targetEccentricityXDeg"]).toBe("5");
  });

  it("blockCount.csv reflects only enabled blocks", () => {
    const { blockFiles } = runCorePipeline("test-conditionEnabled-e2e.csv");
    const blockCount = blockFiles.find((f) => f.name === "blockCount.csv")!;
    const rows = Papa.parse(blockCount.csv, {
      header: true,
      skipEmptyLines: true,
    }).data as Record<string, string>[];

    const blocks = rows.map((r) => r["block"]);
    // blockCount.csv stores the conserved block number (block 1), not a 0-based index.
    expect(blocks).toEqual(["1"]);
  });

  it("mixed enabled/disabled within a block: only enabled conditions survive", () => {
    const { blockFiles } = runCorePipeline("test-conditionEnabled-mixed.csv");

    // All 4 conditions in block 1 — 2 enabled (A,C), 2 disabled (B,D)
    const block1 = blockFiles.find((f) => f.name === "block_1.csv")!;
    expect(block1).toBeDefined();

    const rows = parseBlockCsv(block1.csv);
    const conditions = rows.map((r) => r["block_condition"]);
    // Only A and C survive. The block number (1) is conserved; the within-block
    // condition index is reassigned, so C becomes the 2nd condition: 1_2.
    expect(conditions.length).toBe(2);
    expect(conditions).toEqual(["1_1", "1_2"]);

    // Verify conditionName: should be enabled-A and enabled-C
    const names = rows.map((r) => r["conditionName"]);
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

    const commentRegex = /^%/;
    let d = data.filter((row) => !commentRegex.test((row[0] || "").trim()));
    d = d.filter((row) => row.some((x: any) => x));

    d = filterDisabledConditionsFromParsed(d);

    // Only param name + column B remain (no conditions)
    expect(d[0].length).toBe(2);

    const df = dataframeFromPapaParsed({ data: d });
    const normalized = normalizeExperimentDfShape(df);
    const files = splitIntoBlockFiles(
      addNewInternalParam(normalized, "!experimentFilename", "test"),
      "node",
    ) as [string, string][];

    const blockFiles = files.filter((f) => f[1].startsWith("block_"));
    expect(blockFiles).toHaveLength(0);
  });

  it("real all-disabled CSV produces only a header-only blockCount.csv", () => {
    const { blockFiles } = runCorePipeline(
      "test-conditionEnabled-all-disabled.csv",
    );
    // No block files — no blocks to build
    expect(blockFiles.filter((f) => f.name.startsWith("block_"))).toHaveLength(
      0,
    );
    // blockCount.csv still exists (needed for Pavlovia resource loading)
    // but contains only headers, no block data
    const blockCount = blockFiles.find((f) => f.name === "blockCount.csv")!;
    expect(blockCount).toBeDefined();
    const rows = Papa.parse(blockCount.csv, {
      header: true,
      skipEmptyLines: true,
    }).data as Record<string, string>[];
    // Headers only — no block rows
    expect(rows).toHaveLength(0);
  });
});
