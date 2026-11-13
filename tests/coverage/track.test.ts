/**
 * @jest-environment node
 *
 * One CSV line per run in coverage-history.csv, so coverage progress is
 * visible over time. The file is meant to be committed; consecutive runs with
 * unchanged numbers must not spam it.
 */

import { expect, describe, test, beforeEach } from "@jest/globals";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import {
  appendCoverageHistory,
  HISTORY_HEADER,
  trackCoverage,
  trackLine,
} from "../../server/coverage/track";
import {
  summarizeCoverage,
  type CoverageMap,
} from "../../server/coverage/mergeCoverage";

const statement = (line: number, count: number) =>
  [
    {
      start: { line, column: 0 },
      end: { line, column: 5 },
    },
    count,
  ] as const;

const fileCoverage = (statements: any[], functions: any[] = []) => {
  const statementMap: Record<string, unknown> = {};
  const s: Record<string, number> = {};
  statements.forEach(([loc, count], i) => {
    statementMap[i] = loc;
    s[i] = count;
  });
  const fnMap: Record<string, unknown> = {};
  const f: Record<string, number> = {};
  functions.forEach(([loc, count], i) => {
    fnMap[i] = { decl: loc, loc };
    f[i] = count;
  });
  return { path: "/src/a.js", statementMap, s, fnMap, f, branchMap: {}, b: {} };
};

const jestMap = (covered: number): CoverageMap => ({
  "/src/a.js": fileCoverage([
    statement(1, 1),
    statement(2, covered),
    statement(3, 0),
  ]),
});

const historyDir = () => mkdtempSync(path.join(tmpdir(), "ee-track-"));

describe("trackLine", () => {
  test("formats one CSV row: date, tier, statement pct + counts, fn and branch pct", () => {
    const summary = summarizeCoverage(jestMap(1), {}, "/repo");
    const line = trackLine(summary, "jest", new Date("2026-11-13T10:00:00Z"));
    expect(line).toBe("2026-11-13T10:00:00.000Z,jest,66.7,2,3,100.0,100.0");
  });
});

describe("appendCoverageHistory", () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = historyDir();
    file = path.join(dir, "history.csv");
  });

  test("creates the file with a header row before the first line", () => {
    expect(
      appendCoverageHistory(file, "2026-01-01,jest,33.0,1,3,0.0,0.0"),
    ).toBe(true);
    expect(readFileSync(file, "utf8")).toBe(
      `${HISTORY_HEADER}\n2026-01-01,jest,33.0,1,3,0.0,0.0\n`,
    );
  });

  test("does not append when the numbers match the last line", () => {
    appendCoverageHistory(file, "2026-01-01,jest,33.0,1,3,0.0,0.0");
    expect(
      appendCoverageHistory(file, "2026-02-02,jest,33.0,1,3,0.0,0.0"),
    ).toBe(false);
    expect(readFileSync(file, "utf8").trim().split("\n")).toHaveLength(2);
  });

  test("appends when the numbers change, without repeating the header", () => {
    appendCoverageHistory(file, "2026-01-01,jest,33.0,1,3,0.0,0.0");
    expect(
      appendCoverageHistory(file, "2026-02-02,jest,50.0,2,4,0.0,0.0"),
    ).toBe(true);
    const lines = readFileSync(file, "utf8").trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(HISTORY_HEADER);
    expect(lines[2]).toBe("2026-02-02,jest,50.0,2,4,0.0,0.0");
  });

  test("appends across tiers even with equal numbers", () => {
    appendCoverageHistory(file, "2026-01-01,jest,33.0,1,3,0.0,0.0");
    expect(
      appendCoverageHistory(file, "2026-02-02,union,33.0,1,3,0.0,0.0"),
    ).toBe(true);
  });

  test("a pre-existing file without our header is still appended to", () => {
    writeFileSync(file, "some,older,format\n");
    expect(
      appendCoverageHistory(file, "2026-01-01,jest,33.0,1,3,0.0,0.0"),
    ).toBe(true);
    expect(readFileSync(file, "utf8").trim().split("\n")).toHaveLength(2);
  });

  test("cleans up", () => {
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("trackCoverage", () => {
  test("records a jest-only run as tier jest", () => {
    const dir = historyDir();
    const result = trackCoverage({
      jestMap: jestMap(1),
      browserMap: {},
      historyFile: path.join(dir, "history.csv"),
      now: new Date("2026-11-13T10:00:00Z"),
    });
    expect(result.tier).toBe("jest");
    expect(result.appended).toBe(true);
    expect(result.line).toContain(",jest,66.7,2,3,");
    rmSync(dir, { recursive: true, force: true });
  });

  test("records a browser-only run as tier browser", () => {
    const dir = historyDir();
    const browserMap = jestMap(1); // same numbers, different source
    const result = trackCoverage({
      jestMap: {},
      browserMap,
      historyFile: path.join(dir, "history.csv"),
      now: new Date("2026-11-13T10:00:00Z"),
    });
    expect(result.tier).toBe("browser");
    expect(result.appended).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  test("records a run with both sources as tier union", () => {
    const dir = historyDir();
    const result = trackCoverage({
      jestMap: jestMap(1),
      browserMap: jestMap(1),
      historyFile: path.join(dir, "history.csv"),
      now: new Date("2026-11-13T10:00:00Z"),
    });
    expect(result.tier).toBe("union");
    expect(result.appended).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  test("refuses to record when there is no coverage at all", () => {
    const dir = historyDir();
    expect(() =>
      trackCoverage({
        jestMap: {},
        browserMap: {},
        historyFile: path.join(dir, "history.csv"),
      }),
    ).toThrow(/no coverage/i);
    expect(() =>
      trackCoverage({
        jestMap: {},
        browserMap: {},
        historyFile: path.join(dir, "history.csv"),
      }),
    ).toThrow(/Run `npm run coverage`/);
    rmSync(dir, { recursive: true, force: true });
  });
});
