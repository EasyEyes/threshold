/**
 * blockCount.csv targetKind/targetTask column alignment.
 *
 * When the experiment table lacks a targetTask (or targetKind) row,
 * blockGen must keep the block/targetKind/targetTask columns aligned and
 * must not invent values: the glossary default for both params is "".
 *
 * @jest-environment node
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { normalizeExperimentDfShape } from "../preprocess/transformExperimentTable";
import { splitIntoBlockFiles } from "../preprocess/blockGen";
import {
  dataframeFromPapaParsed,
  addNewInternalParam,
} from "../preprocess/utils";
import { getGlossary } from "../parameters/glossaryRegistry";

function compile(csvRaw: string): [string, string][] {
  const parsed = Papa.parse(csvRaw, { skipEmptyLines: true });
  const data = (parsed.data as string[][]).filter((row) => row.some((x) => x));
  let df = dataframeFromPapaParsed({ data });
  df = normalizeExperimentDfShape(df);
  df = addNewInternalParam(df, "!experimentFilename", "test.csv");
  return splitIntoBlockFiles(df, "node") as [string, string][];
}

function blockCountRows(files: [string, string][]): Record<string, string>[] {
  const bc = files.find(([, name]) => name === "blockCount.csv");
  expect(bc).toBeDefined();
  return Papa.parse(bc![0], { header: true, skipEmptyLines: true })
    .data as Record<string, string>[];
}

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("blockGen: blockCount.csv targetKind/targetTask columns", () => {
  it("missing targetTask row: columns stay aligned, no spurious values", () => {
    const files = compile(`_about,test,,
block,,1,1,2,2,3
targetKind,,letter,letter,letter,letter,letter
targetEccentricityXDeg,,0,0,0,0,0
thresholdParameter,,spacingDeg,spacingDeg,spacingDeg,spacingDeg,spacingDeg`);
    const rows = blockCountRows(files);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r["block"])).toEqual(["1", "2", "3"]);
    expect(rows.map((r) => r["targetKind"])).toEqual([
      "letter",
      "letter",
      "letter",
    ]);
    // Fallback comes from the live glossary default, not a hardcoded string.
    const ttDefault = (getGlossary()["targetTask"]?.default as string) ?? "";
    expect(rows.map((r) => r["targetTask"])).toEqual([
      ttDefault,
      ttDefault,
      ttDefault,
    ]);
  });

  it("missing targetKind row: glossary default, not forced to letter", () => {
    const files = compile(`_about,test,,
block,,1,2
targetTask,,identify,identify
targetEccentricityXDeg,,0,0
thresholdParameter,,spacingDeg,spacingDeg`);
    const rows = blockCountRows(files);
    expect(rows).toHaveLength(2);
    const tkDefault = (getGlossary()["targetKind"]?.default as string) ?? "";
    expect(rows.map((r) => r["targetKind"])).toEqual([tkDefault, tkDefault]);
    expect(rows.map((r) => r["targetTask"])).toEqual(["identify", "identify"]);
  });

  it("per-block values: differing kinds/tasks stay aligned per block", () => {
    const files = compile(`_about,test,,
block,,1,1,2,2
targetKind,,letter,letter,gabor,gabor
targetTask,,identify,identify,detect,detect
targetEccentricityXDeg,,0,0,0,0
thresholdParameter,,spacingDeg,spacingDeg,spacingDeg,spacingDeg`);
    const rows = blockCountRows(files);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r["block"])).toEqual(["1", "2"]);
    expect(rows.map((r) => r["targetKind"])).toEqual(["letter", "gabor"]);
    expect(rows.map((r) => r["targetTask"])).toEqual(["identify", "detect"]);
  });
});
