/**
 * Track coverage over time: append one CSV line per run to a history file
 * (meant to be committed), so progress is visible without a coverage service.
 * Consecutive runs with unchanged numbers do not add lines.
 */

import { appendFileSync, existsSync, readFileSync } from "fs";
import {
  summarizeCoverage,
  type CoverageMap,
  type CoverageSummary,
} from "./mergeCoverage";

export const HISTORY_HEADER =
  "date,tier,statements_pct,covered,total,functions_pct,branches_pct";

/** One CSV row. Counts ride along so a changing denominator is visible. */
export function trackLine(
  summary: CoverageSummary,
  tier: string,
  now: Date = new Date(),
): string {
  const { total } = summary;
  const pct = (value: number) => value.toFixed(1);
  return [
    now.toISOString(),
    tier,
    pct(total.unionPct),
    total.coveredStatements,
    total.statements,
    pct(total.functionsPct),
    pct(total.branchesPct),
  ].join(",");
}

/**
 * Append `line`, creating the file (with header) when missing. Returns false
 * (and writes nothing) when everything but the date matches the last line.
 */
export function appendCoverageHistory(
  historyFile: string,
  line: string,
): boolean {
  const fields = line.slice(line.indexOf(",") + 1);
  if (existsSync(historyFile)) {
    const lines = readFileSync(historyFile, "utf8")
      .split(/\r?\n/)
      .filter(Boolean);
    const last = lines[lines.length - 1];
    if (last && last.slice(last.indexOf(",") + 1) === fields) return false;
  } else {
    appendFileSync(historyFile, HISTORY_HEADER + "\n");
  }
  appendFileSync(historyFile, line + "\n");
  return true;
}

export interface TrackOptions {
  jestMap: CoverageMap;
  browserMap: CoverageMap;
  historyFile: string;
  now?: Date;
}

export interface TrackResult {
  tier: "jest" | "browser" | "union";
  line: string;
  /** false = numbers unchanged since the last recorded run. */
  appended: boolean;
}

export function trackCoverage({
  jestMap,
  browserMap,
  historyFile,
  now,
}: TrackOptions): TrackResult {
  if (
    Object.keys(jestMap).length === 0 &&
    Object.keys(browserMap).length === 0
  ) {
    throw new Error(
      "No coverage found. Run `npm run coverage` (and optionally `npm run coverage:sim`) first.",
    );
  }
  const hasJest = Object.keys(jestMap).length > 0;
  const hasBrowser = Object.keys(browserMap).length > 0;
  const summary = summarizeCoverage(jestMap, browserMap, "/");
  const tier = hasBrowser ? (hasJest ? "union" : "browser") : "jest";
  const line = trackLine(summary, tier, now);
  return { tier, line, appended: appendCoverageHistory(historyFile, line) };
}
