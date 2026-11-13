/**
 * Merge istanbul coverage from two independent sources — the jest suite and a
 * simulated-participant browser run — into one view.
 *
 * The two sources instrument through different pipelines (ts-jest/babel vs a
 * vite dev transform), so statement indices are not comparable. Source
 * position is: maps are aligned on `(start.line, start.column)`.
 */

export interface Position {
  line: number;
  column: number;
}

export interface StatementLocation {
  start: Position;
  end: Position;
}

export interface FileCoverage {
  path: string;
  statementMap: Record<string, StatementLocation>;
  s: Record<string, number>;
  fnMap?: Record<
    string,
    { name?: string; decl?: StatementLocation; loc?: StatementLocation }
  >;
  f?: Record<string, number>;
  branchMap?: Record<
    string,
    { loc?: StatementLocation; locations?: StatementLocation[] }
  >;
  b?: Record<string, number[]>;
}

export type CoverageMap = Record<string, FileCoverage>;

export interface FileCoverageSummary {
  /** Repo-relative, POSIX separators. */
  file: string;
  statements: number;
  coveredStatements: number;
  uncoveredStatements: number;
  functions: number;
  coveredFunctions: number;
  branches: number;
  coveredBranches: number;
  /** null = this source never measured the file (not the same as 0%). */
  jestPct: number | null;
  browserPct: number | null;
  unionPct: number;
}

export interface CoverageSummary {
  root: string;
  files: FileCoverageSummary[];
  /** The merged map these numbers come from (single merge pass). */
  merged: CoverageMap;
  total: {
    statements: number;
    coveredStatements: number;
    functions: number;
    coveredFunctions: number;
    branches: number;
    coveredBranches: number;
    unionPct: number;
    functionsPct: number;
    branchesPct: number;
  };
  /** Files jest scores 0%/unmeasured but the browser reaches. */
  blindSpotFiles: number;
  blindSpotStatements: number;
}

const positionKey = (loc: StatementLocation | undefined): string =>
  loc ? `${loc.start.line}:${loc.start.column}` : "?";

/**
 * Union of every source's coverage on ONE shared skeleton: the first map's
 * statements. The two sources instrument through different pipelines (ts-jest
 * vs vite/esbuild), so for TypeScript files their statement sets differ
 * slightly; projecting onto the first map keeps the union monotone instead of
 * letting the other source's extra statements dilute the percentage.
 *
 * Call as `mergeCoverageMaps(jestMap, browserMap)` — jest is the skeleton when
 * it measured the file, the browser map when it did not.
 *
 * The result is a valid istanbul FileCoverage, so it can feed istanbul-reports.
 */
export function mergeCoverageMaps(...maps: CoverageMap[]): CoverageMap {
  const out: CoverageMap = {};

  for (const map of maps) {
    for (const [file, fc] of Object.entries(map ?? {})) {
      if (!fc || !fc.statementMap) continue;
      const target = out[file];
      if (!target) {
        // First source to describe this file defines its statements.
        out[file] = {
          path: fc.path ?? file,
          statementMap: { ...fc.statementMap },
          s: Object.fromEntries(
            Object.keys(fc.statementMap).map((index) => [
              index,
              fc.s?.[index] ?? 0,
            ]),
          ),
          fnMap: { ...(fc.fnMap ?? {}) },
          f: { ...(fc.f ?? {}) },
          branchMap: { ...(fc.branchMap ?? {}) },
          b: Object.fromEntries(
            Object.entries(fc.b ?? {}).map(([key, counts]) => [
              key,
              [...counts],
            ]),
          ),
        };
        continue;
      }

      // Later sources add their counts wherever the skeleton has a statement.
      const byPosition = new Map<string, string>();
      for (const [index, loc] of Object.entries(target.statementMap)) {
        byPosition.set(positionKey(loc), index);
      }
      for (const [index, loc] of Object.entries(fc.statementMap)) {
        const targetIndex = byPosition.get(positionKey(loc));
        if (targetIndex === undefined) continue;
        target.s[targetIndex] =
          (target.s[targetIndex] ?? 0) + (fc.s?.[index] ?? 0);
      }

      const fnPosition = (fn: {
        decl?: StatementLocation;
        loc?: StatementLocation;
      }) => positionKey(fn?.decl ?? fn?.loc);
      const fnByPosition = new Map<string, string>();
      for (const [index, fn] of Object.entries(target.fnMap ?? {})) {
        fnByPosition.set(fnPosition(fn), index);
      }
      for (const [index, fn] of Object.entries(fc.fnMap ?? {})) {
        const targetIndex = fnByPosition.get(fnPosition(fn));
        if (targetIndex === undefined) continue;
        target.f![targetIndex] =
          (target.f![targetIndex] ?? 0) + (fc.f?.[index] ?? 0);
      }

      const branchPosition = (br: {
        loc?: StatementLocation;
        locations?: StatementLocation[];
      }) => positionKey(br?.loc ?? br?.locations?.[0]);
      const branchByPosition = new Map<string, string>();
      for (const [index, br] of Object.entries(target.branchMap ?? {})) {
        branchByPosition.set(branchPosition(br), index);
      }
      for (const [index, br] of Object.entries(fc.branchMap ?? {})) {
        const targetIndex = branchByPosition.get(branchPosition(br));
        if (targetIndex === undefined) continue;
        const existing = target.b![targetIndex] ?? [];
        (fc.b?.[index] ?? []).forEach((count, i) => {
          if (i < existing.length) existing[i] += count;
        });
      }
    }
  }

  return out;
}

const relative = (file: string, root: string): string => {
  const normalized = file.replace(/\\/g, "/");
  const prefix = root.replace(/\\/g, "/").replace(/\/$/, "") + "/";
  return normalized.startsWith(prefix)
    ? normalized.slice(prefix.length)
    : normalized;
};

const pct = (covered: number, total: number): number =>
  total === 0 ? 100 : Math.round((covered / total) * 1000) / 10;
const counts = (fc: FileCoverage) => {
  const statementValues = Object.keys(fc.statementMap ?? {}).map(
    (key) => fc.s?.[key] ?? 0,
  );
  const functionValues = Object.values(fc.f ?? {});
  const branchCounts = Object.values(fc.b ?? {}).flat();
  return {
    statements: statementValues.length,
    coveredStatements: statementValues.filter((n) => n > 0).length,
    functions: functionValues.length,
    coveredFunctions: functionValues.filter((n) => n > 0).length,
    branches: branchCounts.length,
    coveredBranches: branchCounts.filter((n) => n > 0).length,
  };
};

const filePct = (fc: FileCoverage | undefined): number | null => {
  if (!fc || !fc.statementMap) return null;
  const c = counts(fc);
  return pct(c.coveredStatements, c.statements);
};

/**
 * Jest + browser coverage on one statement skeleton per file. The skeleton is
 * whichever source covered more of the file, so the union can never report
 * less than either source alone.
 */
export function mergeForReport(
  jestMap: CoverageMap,
  browserMap: CoverageMap,
): CoverageMap {
  const skeleton: CoverageMap = {};
  const projected: CoverageMap = {};
  for (const file of new Set([
    ...Object.keys(jestMap),
    ...Object.keys(browserMap),
  ])) {
    const jestFile = jestMap[file];
    const browserFile = browserMap[file];
    if (!jestFile || !browserFile) {
      skeleton[file] = jestFile ?? browserFile;
      continue;
    }
    const preferBrowser =
      (filePct(browserFile) ?? 0) > (filePct(jestFile) ?? 0);
    skeleton[file] = preferBrowser ? browserFile : jestFile;
    projected[file] = preferBrowser ? jestFile : browserFile;
  }
  return mergeCoverageMaps(skeleton, projected);
}

export function summarizeCoverage(
  jestMap: CoverageMap,
  browserMap: CoverageMap,
  root: string,
): CoverageSummary {
  const merged = mergeForReport(jestMap, browserMap);
  const files: FileCoverageSummary[] = [];
  const total = {
    statements: 0,
    coveredStatements: 0,
    functions: 0,
    coveredFunctions: 0,
    branches: 0,
    coveredBranches: 0,
    unionPct: 0,
    functionsPct: 0,
    branchesPct: 0,
  };
  let blindSpotFiles = 0;
  let blindSpotStatements = 0;

  for (const [file, fc] of Object.entries(merged)) {
    const c = counts(fc);
    const jestPct = filePct(jestMap[file]);
    const browserPct = filePct(browserMap[file]);
    files.push({
      file: relative(file, root),
      statements: c.statements,
      coveredStatements: c.coveredStatements,
      uncoveredStatements: c.statements - c.coveredStatements,
      functions: c.functions,
      coveredFunctions: c.coveredFunctions,
      branches: c.branches,
      coveredBranches: c.coveredBranches,
      jestPct,
      browserPct,
      unionPct: pct(c.coveredStatements, c.statements),
    });

    total.statements += c.statements;
    total.coveredStatements += c.coveredStatements;
    total.functions += c.functions;
    total.coveredFunctions += c.coveredFunctions;
    total.branches += c.branches;
    total.coveredBranches += c.coveredBranches;

    if ((jestPct === null || jestPct === 0) && (browserPct ?? 0) > 0) {
      blindSpotFiles += 1;
      blindSpotStatements += c.statements;
    }
  }

  files.sort((a, b) => b.uncoveredStatements - a.uncoveredStatements);
  total.unionPct = pct(total.coveredStatements, total.statements);
  total.functionsPct = pct(total.coveredFunctions, total.functions);
  total.branchesPct = pct(total.coveredBranches, total.branches);
  return { root, files, total, blindSpotFiles, blindSpotStatements, merged };
}

const pad = (value: string | number, width: number): string =>
  String(value).padStart(width);

const percent = (value: number | null): string =>
  value === null ? "n/a" : `${value.toFixed(1)}%`;

const FILE_COL = 56;

export function formatCoverageReport(summary: CoverageSummary): string {
  const lines: string[] = [];
  const { total } = summary;
  lines.push(
    `coverage: ${percent(total.unionPct)} statements (${
      total.coveredStatements
    }/${total.statements}), ` +
      `${percent(total.functionsPct)} functions, ` +
      `${percent(total.branchesPct)} branches`,
  );
  lines.push(
    `jest blind spot: ${summary.blindSpotFiles} files / ${summary.blindSpotStatements} statements ` +
      `the browser reaches and jest does not`,
  );
  lines.push("");
  lines.push(
    `${"file".padEnd(FILE_COL)} ${pad("stmts", 6)} ${pad("jest", 7)} ${pad(
      "browser",
      8,
    )} ${pad("union", 7)} ${pad("miss", 5)}`,
  );

  for (const file of summary.files) {
    const name =
      file.file.length > FILE_COL
        ? `…${file.file.slice(-(FILE_COL - 1))}`
        : file.file;
    lines.push(
      [
        name.padEnd(FILE_COL),
        pad(file.statements, 6),
        pad(percent(file.jestPct), 7),
        pad(percent(file.browserPct), 8),
        pad(percent(file.unionPct), 7),
        pad(file.uncoveredStatements, 5),
      ].join(" "),
    );
  }

  return lines.join("\n");
}
