/**
 * TL;DR block printed after a coverage run: the latest history entry versus
 * the previous entry of the same tier, plus a ready-to-paste commit-message
 * line for coverage-increase pushes.
 *
 *   statements 43.0%  (+4.6 pts, +1,400)  13,044/30,339
 *   commit: coverage: statements 38.4→43.0% (+4.6 pts, +1,400 stmts)
 */

export interface HistoryRow {
  date: Date;
  tier: string;
  statementsPct: number;
  covered: number;
  total: number;
  functionsPct: number;
  branchesPct: number;
}

export interface TldrDelta {
  statementsPct: number;
  covered: number;
  functionsPct: number;
  branchesPct: number;
}

export interface Tldr {
  tier: string;
  statementsPct: number;
  covered: number;
  total: number;
  functionsPct: number;
  branchesPct: number;
  delta: TldrDelta | null;
  /** what the delta is measured against */
  baseline: "head" | "last-run" | "none";
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Parse one coverage-history CSV row; null for the header or junk. */
export function parseHistoryLine(line: string): HistoryRow | null {
  const fields = line.split(",");
  if (fields.length !== 7 || fields[1] === "tier") return null;
  const numbers = fields.slice(2).map(Number);
  if (numbers.some((n) => !Number.isFinite(n))) return null;
  const date = new Date(fields[0]);
  if (isNaN(date.getTime())) return null;
  return {
    date,
    tier: fields[1],
    statementsPct: numbers[0],
    covered: numbers[1],
    total: numbers[2],
    functionsPct: numbers[3],
    branchesPct: numbers[4],
  };
}

const rowsOf = (lines: string[]) =>
  lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseHistoryLine)
    .filter((r): r is HistoryRow => r !== null);

const lastSameTier = (rows: HistoryRow[], tier: string) =>
  [...rows].reverse().find((r) => r.tier === tier);

/**
 * Summarize the last history row. The delta is measured against the last
 * same-tier row of `baseline` (the committed coverage-history.csv, i.e.
 * git HEAD) when one is provided — the number a commit message wants —
 * falling back to the previous same-tier row of `lines` (last local run).
 */
export function tldrFromHistory(
  lines: string[],
  { baseline }: { baseline?: string[] } = {},
): Tldr | null {
  const rows = rowsOf(lines);
  const last = rows[rows.length - 1];
  if (!last) return null;

  const headRow = baseline ? lastSameTier(rowsOf(baseline), last.tier) : null;
  const priorRow = headRow ?? lastSameTier(rows.slice(0, -1), last.tier);
  const kind: Tldr["baseline"] = headRow
    ? "head"
    : priorRow
    ? "last-run"
    : "none";
  const delta = priorRow
    ? {
        statementsPct: round1(last.statementsPct - priorRow.statementsPct),
        covered: last.covered - priorRow.covered,
        functionsPct: round1(last.functionsPct - priorRow.functionsPct),
        branchesPct: round1(last.branchesPct - priorRow.branchesPct),
      }
    : null;
  return {
    tier: last.tier,
    statementsPct: last.statementsPct,
    covered: last.covered,
    total: last.total,
    functionsPct: last.functionsPct,
    branchesPct: last.branchesPct,
    delta,
    baseline: kind,
  };
}

const fmtDelta = (label: string, pts: number) => {
  if (pts === 0) return `${label} +0.0`;
  return `${label} ${pts > 0 ? "+" : ""}${pts.toFixed(1)}`;
};

/** Format the TL;DR block; `color` adds ANSI escapes (TTY output). */
export function formatTldr(
  t: Tldr,
  { color = false }: { color?: boolean } = {},
): string {
  const c = (code: string, s: string) =>
    color ? `\u001b[${code}m${s}\u001b[0m` : s;
  const tone = (s: string, delta: number | null) =>
    delta === null
      ? c("2", s)
      : delta > 0
      ? c("32", s)
      : delta < 0
      ? c("31", s)
      : c("33", s);
  const n = (value: number) => value.toLocaleString("en-US");

  const rule = c("2", "─".repeat(58));
  const head = `${c("1", "coverage TL;DR")} · ${c("1", t.tier)}   ${c(
    "2",
    `${n(t.covered)}/${n(t.total)} stmts`,
  )}`;
  const pcts = `statements ${tone(
    `${t.statementsPct.toFixed(1)}%`,
    t.delta?.statementsPct ?? null,
  )}   fn ${tone(
    `${t.functionsPct.toFixed(1)}%`,
    t.delta?.functionsPct ?? null,
  )}   branch ${tone(
    `${t.branchesPct.toFixed(1)}%`,
    t.delta?.branchesPct ?? null,
  )}`;

  const lines = [rule, head, pcts];
  if (t.delta) {
    const d = t.delta;
    const coveredDelta = `${d.covered > 0 ? "+" : ""}${n(d.covered)}`;
    lines.push(
      `Δ vs ${t.baseline}: ${fmtDelta(
        "stmts",
        d.statementsPct,
      )} pts (${coveredDelta}) · ${fmtDelta("fn", d.functionsPct)} · ${fmtDelta(
        "branch",
        d.branchesPct,
      )}`,
    );
    lines.push(
      c(
        "36",
        `commit: coverage: statements ${(
          t.statementsPct - d.statementsPct
        ).toFixed(1)}→${t.statementsPct.toFixed(1)}% (${fmtDelta(
          "",
          d.statementsPct,
        ).trim()} pts, ${coveredDelta} stmts)`,
      ),
    );
  } else {
    lines.push(
      c("36", `commit: coverage: statements ${t.statementsPct.toFixed(1)}%`),
    );
  }
  lines.push(rule);
  return lines.join("\n");
}
