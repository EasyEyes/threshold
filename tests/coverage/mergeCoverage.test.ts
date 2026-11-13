/**
 * @jest-environment node
 *
 * Merge jest (istanbul) coverage with browser-harvested istanbul coverage into
 * one report. The point is the blind spot: 39.5% of `components/` statements
 * live in files jest scores 0% because pixi/tone/log4javascript are mocked,
 * yet those same files run in the simulated participant's browser.
 */

import { expect, describe, test } from "@jest/globals";
import {
  mergeCoverageMaps,
  summarizeCoverage,
  formatCoverageReport,
  type CoverageMap,
} from "../../server/coverage/mergeCoverage";

/** Minimal istanbul FileCoverage: one statement per (line, count) pair. */
const fileCoverage = (
  path: string,
  statements: Array<{ line: number; column: number; count: number }>,
  opts: {
    functions?: Array<{ line: number; count: number }>;
    branches?: Array<{ line: number; counts: number[] }>;
  } = {},
) => {
  const statementMap: Record<string, unknown> = {};
  const s: Record<string, number> = {};
  statements.forEach((st, i) => {
    statementMap[i] = {
      start: { line: st.line, column: st.column },
      end: { line: st.line, column: st.column + 5 },
    };
    s[i] = st.count;
  });
  const fnMap: Record<string, unknown> = {};
  const f: Record<string, number> = {};
  (opts.functions ?? []).forEach((fn, i) => {
    fnMap[i] = {
      name: `fn${i}`,
      decl: {
        start: { line: fn.line, column: 0 },
        end: { line: fn.line, column: 1 },
      },
      loc: {
        start: { line: fn.line, column: 0 },
        end: { line: fn.line, column: 9 },
      },
      line: fn.line,
    };
    f[i] = fn.count;
  });
  const branchMap: Record<string, unknown> = {};
  const b: Record<string, number[]> = {};
  (opts.branches ?? []).forEach((br, i) => {
    branchMap[i] = {
      loc: {
        start: { line: br.line, column: 0 },
        end: { line: br.line, column: 3 },
      },
      locations: [
        {
          start: { line: br.line, column: 0 },
          end: { line: br.line, column: 3 },
        },
      ],
    };
    b[i] = br.counts;
  });
  return [path, { path, statementMap, s, fnMap, f, branchMap, b }] as const;
};

const mapOf = (...entries: Array<[string, any]>): CoverageMap =>
  Object.fromEntries(entries);

describe("mergeCoverageMaps", () => {
  test("sums counts for statements at the same source position", () => {
    const jestMap = mapOf(
      fileCoverage("/repo/components/a.js", [
        { line: 1, column: 0, count: 0 },
        { line: 2, column: 0, count: 1 },
      ]),
    );
    const browserMap = mapOf(
      fileCoverage("/repo/components/a.js", [
        { line: 1, column: 0, count: 3 },
        { line: 2, column: 0, count: 0 },
      ]),
    );
    const merged = mergeCoverageMaps(jestMap, browserMap);
    const file = merged["/repo/components/a.js"];
    expect(Object.values(file.s)).toEqual([3, 1]);
  });

  test("keeps a file measured by only one source", () => {
    const merged = mergeCoverageMaps(
      mapOf(
        fileCoverage("/repo/components/onlyJest.js", [
          { line: 1, column: 0, count: 2 },
        ]),
      ),
      mapOf(
        fileCoverage("/repo/components/onlyBrowser.js", [
          { line: 1, column: 0, count: 5 },
        ]),
      ),
    );
    expect(Object.keys(merged).sort()).toEqual([
      "/repo/components/onlyBrowser.js",
      "/repo/components/onlyJest.js",
    ]);
    expect(Object.values(merged["/repo/components/onlyBrowser.js"].s)).toEqual([
      5,
    ]);
  });

  test("projects later maps onto the first map's statements", () => {
    // jest and vite instrument through different pipelines, so the two maps
    // describe slightly different statement sets. The first map (jest) is the
    // skeleton: positions it lacks are dropped rather than diluting the pct.
    const jestMap = mapOf(
      fileCoverage("/repo/components/a.ts", [
        { line: 10, column: 4, count: 1 },
      ]),
    );
    const browserMap = mapOf(
      fileCoverage("/repo/components/a.ts", [
        { line: 2, column: 0, count: 0 },
        { line: 10, column: 4, count: 2 },
      ]),
    );
    const merged = mergeCoverageMaps(jestMap, browserMap);
    const file = merged["/repo/components/a.ts"];
    expect(Object.keys(file.statementMap)).toHaveLength(1);
    expect(Object.values(file.s)).toEqual([3]);
  });

  test("a file only the later map measured keeps all of its statements", () => {
    const merged = mergeCoverageMaps(
      {},
      mapOf(
        fileCoverage("/repo/components/browserOnly.js", [
          { line: 2, column: 0, count: 1 },
          { line: 9, column: 0, count: 0 },
        ]),
      ),
    );
    expect(
      Object.keys(merged["/repo/components/browserOnly.js"].statementMap),
    ).toHaveLength(2);
  });

  test("sums function counts for functions at the same source position", () => {
    const merged = mergeCoverageMaps(
      mapOf(
        fileCoverage("/src/a.js", [{ line: 1, column: 0, count: 1 }], {
          functions: [
            { line: 5, count: 0 },
            { line: 9, count: 2 },
          ],
        }),
      ),
      mapOf(
        fileCoverage("/src/a.js", [{ line: 1, column: 0, count: 0 }], {
          functions: [
            { line: 5, count: 3 },
            { line: 9, count: 0 },
          ],
        }),
      ),
    );
    expect(merged["/src/a.js"].f).toEqual({ "0": 3, "1": 2 });
  });

  test("sums branch-path counts for branches at the same source position", () => {
    const merged = mergeCoverageMaps(
      mapOf(
        fileCoverage("/src/a.js", [{ line: 1, column: 0, count: 1 }], {
          branches: [{ line: 20, counts: [0, 1] }],
        }),
      ),
      mapOf(
        fileCoverage("/src/a.js", [{ line: 1, column: 0, count: 0 }], {
          branches: [{ line: 20, counts: [2, 0] }],
        }),
      ),
    );
    expect(merged["/src/a.js"].b).toEqual({ "0": [2, 1] });
  });

  test("tolerates empty input", () => {
    expect(mergeCoverageMaps()).toEqual({});
    expect(mergeCoverageMaps({}, {})).toEqual({});
  });
});

describe("summarizeCoverage", () => {
  const jestMap = mapOf(
    fileCoverage("/repo/components/mockedOut.js", [
      { line: 1, column: 0, count: 0 },
      { line: 2, column: 0, count: 0 },
    ]),
    fileCoverage("/repo/components/shared.js", [
      { line: 1, column: 0, count: 0 },
      { line: 2, column: 0, count: 2 },
    ]),
  );
  const browserMap = mapOf(
    fileCoverage("/repo/components/mockedOut.js", [
      { line: 1, column: 0, count: 4 },
      { line: 2, column: 0, count: 1 },
    ]),
    fileCoverage("/repo/components/shared.js", [
      { line: 1, column: 0, count: 0 },
    ]),
  );

  test("reports per-source pct and the union pct", () => {
    const summary = summarizeCoverage(jestMap, browserMap, "/repo");
    const shared = summary.files.find(
      (f) => f.file === "components/shared.js",
    )!;
    expect(shared.jestPct).toBe(50);
    // browser map has 1 of 1 statements covered for its own statement set
    expect(shared.browserPct).toBe(0);
    expect(shared.unionPct).toBe(50);
  });

  test("reports null (not 0) when a source never measured a file", () => {
    const summary = summarizeCoverage(
      jestMap,
      mapOf(
        fileCoverage("/repo/components/browserOnly.js", [
          { line: 1, column: 0, count: 1 },
        ]),
      ),
      "/repo",
    );
    const browserOnly = summary.files.find(
      (f) => f.file === "components/browserOnly.js",
    )!;
    expect(browserOnly.jestPct).toBeNull();
    expect(browserOnly.browserPct).toBe(100);
  });

  test("file paths are repo-relative and windows-safe", () => {
    const summary = summarizeCoverage(
      mapOf(
        fileCoverage("/repo/components/win.js", [
          { line: 1, column: 0, count: 1 },
        ]),
      ),
      {},
      "/repo",
    );
    expect(summary.files[0].file).toBe("components/win.js");
  });

  test("union never falls below either source's own pct", () => {
    const summary = summarizeCoverage(jestMap, browserMap, "/repo");
    for (const file of summary.files) {
      for (const own of [file.jestPct, file.browserPct]) {
        if (own === null) continue;
        expect(file.unionPct).toBeGreaterThanOrEqual(own);
      }
    }
  });

  test("totals aggregate statements across both sources without double counting", () => {
    const summary = summarizeCoverage(jestMap, browserMap, "/repo");
    // statements: mockedOut 2, shared {1,2} = 2 → 4 unique positions
    expect(summary.total.statements).toBe(4);
    expect(summary.total.coveredStatements).toBe(3);
  });

  test("counts the jest blind spot", () => {
    const summary = summarizeCoverage(jestMap, browserMap, "/repo");
    expect(summary.blindSpotFiles).toBe(1);
    expect(summary.blindSpotStatements).toBe(2);
  });
});

describe("formatCoverageReport", () => {
  test("lists browser-only files as jest 0%/unmeasured and sorts by uncovered desc", () => {
    const summary = summarizeCoverage(
      mapOf(
        fileCoverage("/repo/components/bigUntested.js", [
          { line: 1, column: 0, count: 0 },
          { line: 2, column: 0, count: 0 },
          { line: 3, column: 0, count: 0 },
        ]),
      ),
      mapOf(
        fileCoverage("/repo/components/browserOnly.js", [
          { line: 1, column: 0, count: 1 },
          { line: 2, column: 0, count: 0 },
        ]),
      ),
      "/repo",
    );
    const out = formatCoverageReport(summary);
    const lines = out.split("\n");
    const bigIndex = lines.findIndex((l) => l.includes("bigUntested.js"));
    const browserIndex = lines.findIndex((l) => l.includes("browserOnly.js"));
    expect(bigIndex).toBeGreaterThan(-1);
    expect(browserIndex).toBeGreaterThan(-1);
    expect(bigIndex).toBeLessThan(browserIndex);
    expect(lines[browserIndex]).toMatch(/\bn\/a\b/);
    expect(out).toMatch(/blind spot/i);
  });

  test("keeps the table narrow enough to read in a terminal", () => {
    const summary = summarizeCoverage(
      mapOf(
        fileCoverage("/repo/components/a.js", [
          { line: 1, column: 0, count: 1 },
        ]),
      ),
      {},
      "/repo",
    );
    for (const line of formatCoverageReport(summary).split("\n")) {
      expect(line.length).toBeLessThanOrEqual(110);
    }
  });
});
