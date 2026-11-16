/**
 * @jest-environment node
 *
 * TL;DR summary printed at the end of a coverage run: the last history line
 * compared against the previous entry of the SAME tier, formatted as a short
 * human-readable block with a ready-to-paste commit-message line.
 */

import { expect, describe, test } from "@jest/globals";
import { HISTORY_HEADER } from "../../server/coverage/track";
import {
  formatTldr,
  parseHistoryLine,
  tldrFromHistory,
} from "../../server/coverage/tldr";

const line = (
  tier: string,
  pct: number,
  covered: number,
  total: number,
  date = "2026-11-13T10:00:00.000Z",
  fnPct = pct,
  brPct = pct - 5,
) =>
  `${date},${tier},${pct.toFixed(1)},${covered},${total},${fnPct.toFixed(
    1,
  )},${brPct.toFixed(1)}`;

describe("parseHistoryLine", () => {
  test("parses one CSV row", () => {
    const row = parseHistoryLine(
      line("union", 43, 13044, 30339, undefined, 42.4, 31.9),
    );
    expect(row).toEqual({
      date: new Date("2026-11-13T10:00:00.000Z"),
      tier: "union",
      statementsPct: 43,
      covered: 13044,
      total: 30339,
      functionsPct: 42.4,
      branchesPct: 31.9,
    });
  });

  test("returns null for the header or junk", () => {
    expect(parseHistoryLine(HISTORY_HEADER)).toBeNull();
    expect(parseHistoryLine("nope")).toBeNull();
    expect(parseHistoryLine("")).toBeNull();
  });
});

describe("tldrFromHistory", () => {
  test("deltas against the previous entry of the same tier, skipping others", () => {
    const rows = [
      line("jest", 33, 10007, 30352, "2026-11-13T06:28:00Z"),
      line("union", 38.4, 11644, 30323, "2026-11-13T07:04:00Z", 36.4, 28.5),
      line("union", 43, 13044, 30339, "2026-11-13T22:10:00Z", 42.4, 31.9),
    ];
    const t = tldrFromHistory(rows);
    expect(t.tier).toBe("union");
    expect(t.statementsPct).toBe(43);
    expect(t.covered).toBe(13044);
    expect(t.total).toBe(30339);
    expect(t.delta).toEqual({
      statementsPct: 4.6,
      covered: 1400,
      functionsPct: 6,
      branchesPct: 3.4,
    });
  });

  test("no prior same-tier entry → null delta", () => {
    const t = tldrFromHistory([line("union", 43, 1, 2)]);
    expect(t.delta).toBeNull();
  });

  test("regressions are negative", () => {
    const rows = [
      line("jest", 40, 12000, 30000, "2026-11-13T06:28:00Z"),
      line("jest", 38, 11400, 30000, "2026-11-14T06:28:00Z"),
    ];
    expect(tldrFromHistory(rows).delta?.statementsPct).toBeCloseTo(-2, 6);
    expect(tldrFromHistory(rows).delta?.covered).toBe(-600);
  });

  test("empty history → null", () => {
    expect(tldrFromHistory([])).toBeNull();
  });
});

describe("tldrFromHistory with a git-HEAD baseline", () => {
  const history = [
    // committed rows (older) + uncommitted local runs
    line("union", 38.4, 11657, 30323, "2026-11-13T07:06:00Z", 36.4, 28.5),
    line("union", 40.5, 12298, 30338, "2026-11-13T07:29:00Z", 39.5, 30.3),
    line("union", 43, 13044, 30339, "2026-11-13T22:10:00Z", 42.4, 31.9),
  ];
  const head = [
    line("jest", 33, 10007, 30352, "2026-11-13T06:28:00Z"),
    line("union", 38.4, 11657, 30323, "2026-11-13T07:06:00Z", 36.4, 28.5),
  ];

  test("delta prefers the last same-tier row of the baseline (HEAD)", () => {
    const t = tldrFromHistory(history, { baseline: head });
    expect(t.delta).toEqual({
      statementsPct: 4.6,
      covered: 1387,
      functionsPct: 6,
      branchesPct: 3.4,
    });
    expect(t.baseline).toBe("head");
  });

  test("falls back to the previous history row when HEAD has no same-tier row", () => {
    const jestOnlyHead = [
      line("jest", 33, 10007, 30352, "2026-11-13T06:28:00Z"),
    ];
    const t = tldrFromHistory(history, { baseline: jestOnlyHead });
    // fallback: 22:10 vs 07:29 (the previous working-tree union row)
    expect(t.delta?.covered).toBe(746);
    expect(t.baseline).toBe("last-run");
  });

  test("no baseline at all behaves as before (last-run)", () => {
    expect(tldrFromHistory(history)!.baseline).toBe("last-run");
  });
});

describe("formatTldr", () => {
  const rows = [
    line("union", 38.4, 11644, 30323, "2026-11-13T07:04:00Z", 36.4, 28.5),
    line("union", 43, 13044, 30339, "2026-11-13T22:10:00Z", 42.4, 31.9),
  ];

  test("plain text: percentages, counts, deltas, commit line", () => {
    const out = formatTldr(tldrFromHistory(rows)!, { color: false });
    expect(out).toContain("union");
    expect(out).toContain("43.0%");
    expect(out).toContain("13,044/30,339");
    expect(out).toContain("+4.6");
    expect(out).toContain("+1,400");
    expect(out).toContain("fn 42.4%");
    expect(out).toContain("branch 31.9%");
    // baseline is labeled
    expect(out).toContain("vs last-run");
    // ready-to-paste commit message
    expect(out).toMatch(/commit: coverage: statements 38\.4→43\.0%/);
    expect(out).not.toContain("\u001b[");
  });

  test("colored output uses ANSI codes", () => {
    const out = formatTldr(tldrFromHistory(rows)!, { color: true });
    expect(out).toContain("\u001b["); // some escape sequence present
    expect(out).toContain("43.0%");
  });

  test("regression deltas render with a minus sign", () => {
    const regressed = [
      line("jest", 40, 12000, 30000, "2026-11-13T06:28:00Z"),
      line("jest", 38, 11400, 30000, "2026-11-14T06:28:00Z"),
    ];
    const out = formatTldr(tldrFromHistory(regressed)!, { color: false });
    expect(out).toContain("-2.0");
    expect(out).toContain("-600");
    expect(out).toContain("40.0→38.0");
  });

  test("vs-HEAD baseline is labeled and drives the commit line", () => {
    const history = [
      line("union", 38.4, 11657, 30323, "2026-11-13T07:06:00Z", 36.4, 28.5),
      line("union", 43, 13044, 30339, "2026-11-13T22:10:00Z", 42.4, 31.9),
    ];
    const out = formatTldr(tldrFromHistory(history)!, { color: false });
    expect(out).toContain("vs last-run");
    expect(out).toMatch(/commit: coverage: statements 38\.4→43\.0%/);
  });

  test("no delta (first recorded run) still renders", () => {
    const out = formatTldr(tldrFromHistory([line("jest", 33, 100, 300)])!, {
      color: false,
    });
    expect(out).toContain("33.0%");
    expect(out).toContain("commit: coverage: statements 33.0%");
    expect(out).not.toContain("→"); // no comparison shown
  });
});
