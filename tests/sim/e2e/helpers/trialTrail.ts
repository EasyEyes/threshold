/**
 * CSV trail oracle for QUEST retry/practice flows.
 *
 * Given a downloaded results CSV (exactly what a real participant uploads),
 * extractTrail pulls the per-trial decision trail, and trailViolations
 * checks it against the retry/practice/QUEST behavioral contract:
 *
 *   1. trialKind ∈ {good,bad}×{practice,test}, and the good/bad half must
 *      match trialGivenToQuest (kind is derived from the give decision).
 *   2. Attempts per condition never exceed ceil(conditionTrials ×
 *      thresholdAllowedTrialRatio) — the retry budget.
 *   3. A condition ends with its target count of good test trials, OR with
 *      a legitimate early end: retry budget exhausted, or the trial
 *      sequence exhausted (counting calls ≥ conditionTrials — practice
 *      trials consume sequence slots without counting toward the target).
 *   4. Practice rows precede test rows; the practice phase ends on exactly
 *      one correct row that also resets QUEST; no resets elsewhere.
 *   5. A retried row is followed by another row of the same condition —
 *      unless the sequence exhausted on it (the retry could not be honored
 *      because the staircase just finished).
 *   6. Every trial has a finite QUEST level.
 *
 * Pure functions — unit-tested in tests/sim/unit/trialTrail.oracle.test.ts,
 * run against real e2e CSVs by tests/sim/e2e/quest-flows.e2e.test.ts.
 */

export interface TrailRow {
  bc: string; // block_condition
  trialKind: string;
  given: boolean; // trialGivenToQuest
  retrying: boolean; // retryingThisTrialBool
  correct: boolean | null; // key_resp.corr
  reset: boolean; // questResetByThresholdPracticeUntilCorrectBool
  level: number; // QUEST level of the trial
  questCount: number | null; // _jsQuest.trialCount AFTER the response
  nth: number; // 1-based order among trial rows (global)
}

export interface TrailConditionSpec {
  trials: number; // conditionTrials
  ratio: number; // thresholdAllowedTrialRatio
  practice: boolean; // thresholdPracticeUntilCorrectBool
}
export type TrailSpec = Record<string, TrailConditionSpec>;

const KINDS = new Set(["goodtest", "badtest", "goodpractice", "badpractice"]);

export function extractTrail(csvText: string): TrailRow[] {
  // The results CSV quotes fields; use a real CSV parser.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Papa = require("papaparse");
  const parsed = Papa.parse(csvText, { skipEmptyLines: true });
  const rows: string[][] = parsed.data;
  if (rows.length === 0) return [];
  const hdr = new Map<string, number>(
    rows[0].map((h: string, i: number) => [h, i]),
  );
  const col = (name: string) => hdr.get(name);
  const need = [
    "block_condition",
    "trialKind",
    "trialGivenToQuest",
    "retryingThisTrialBool",
    "level",
  ];
  for (const n of need) {
    if (col(n) === undefined) {
      throw new Error(`results CSV missing required column: ${n}`);
    }
  }
  const iBc = col("block_condition")!;
  const iKind = col("trialKind")!;
  const iGiven = col("trialGivenToQuest")!;
  const iRetry = col("retryingThisTrialBool")!;
  const iCorr = col("key_resp.corr");
  const iReset = col("questResetByThresholdPracticeUntilCorrectBool");
  const iLevel = col("level")!;
  const iCount = col("questTrialCountAtEndOfTrial");
  const trail: TrailRow[] = [];
  for (const r of rows.slice(1)) {
    if (!r[iKind] || !KINDS.has(r[iKind])) continue; // non-trial row
    trail.push({
      bc: r[iBc] ?? "",
      trialKind: r[iKind],
      given: r[iGiven] === "TRUE",
      retrying: r[iRetry] === "TRUE",
      correct:
        iCorr === undefined || r[iCorr] === ""
          ? null
          : r[iCorr] === "1" || r[iCorr] === "TRUE",
      reset: iReset !== undefined && r[iReset] === "TRUE",
      level: parseFloat(r[iLevel]),
      // empty ≡ 0 updates so far (jsQUEST may omit trialCount pre-update)
      questCount:
        iCount === undefined || r[iCount] === "" ? null : parseFloat(r[iCount]),
      nth: trail.length + 1,
    });
  }
  return trail;
}

/** Counting calls: next(true) on the staircase — every given-to-QUEST row. */
const countingCalls = (rows: TrailRow[]) => rows.filter((r) => r.given).length;

/**
 * The "given to QUEST is faithful" walk (per condition, in row order):
 *  - the practice flush (reset row) restarts the pdf from the prior →
 *    questCount must read 0 after it;
 *  - a given row increments the pdf-update count by exactly 1;
 *  - a non-given (bad/denied) row must not change it.
 * Empty questCount ≡ 0 updates so far (jsQUEST may omit the field
 * pre-update).
 */
export function questCountViolations(trail: TrailRow[]): string[] {
  const v: string[] = [];
  const counts = new Map<string, number>();
  for (const r of trail) {
    const q = r.questCount ?? 0;
    const prev = counts.get(r.bc) ?? 0;
    if (r.reset) {
      if (q !== 0)
        v.push(
          `row ${r.nth} (${r.bc}): reset row must restart the pdf at 0 updates, got ${q}`,
        );
      counts.set(r.bc, 0);
      continue;
    }
    const expected = prev + (r.given ? 1 : 0);
    if (q !== expected)
      v.push(
        `row ${r.nth} (${r.bc}): pdf updates ${q} but expected ${expected} (given=${r.given})`,
      );
    counts.set(r.bc, expected);
  }
  return v;
}
const budget = (s: TrailConditionSpec) => Math.ceil(s.trials * s.ratio);

export function trailViolations(trail: TrailRow[], spec: TrailSpec): string[] {
  const v: string[] = [];
  const byBc = new Map<string, TrailRow[]>();
  for (const r of trail) {
    if (!KINDS.has(r.trialKind)) {
      v.push(`row ${r.nth}: unknown trialKind "${r.trialKind}"`);
    } else if (r.trialKind.startsWith("good") !== r.given) {
      v.push(
        `row ${r.nth} (${r.bc}): trialKind "${r.trialKind}" contradicts trialGivenToQuest=${r.given}`,
      );
    }
    if (!Number.isFinite(r.level)) {
      v.push(`row ${r.nth} (${r.bc}): non-finite QUEST level`);
    }
    if (!byBc.has(r.bc)) byBc.set(r.bc, []);
    byBc.get(r.bc)!.push(r);
  }

  for (const [bc, s] of Object.entries(spec)) {
    const rows = byBc.get(bc) ?? [];
    if (rows.length === 0) {
      v.push(`${bc}: no trial rows at all`);
      continue;
    }
    const attempts = rows.length;
    const good = rows.filter((r) => r.trialKind === "goodtest").length;
    const given = countingCalls(rows);
    const seqExhausted = given >= s.trials;
    const budgetOut = attempts >= budget(s);
    const earlyEndOk = seqExhausted || budgetOut;

    if (attempts > budget(s)) {
      v.push(
        `${bc}: ${attempts} attempts exceed retry budget ceil(${s.trials}×${
          s.ratio
        })=${budget(s)}`,
      );
    }
    if (good < s.trials && !earlyEndOk) {
      v.push(
        `${bc}: only ${good}/${
          s.trials
        } good test trials with no early-end excuse (attempts ${attempts}<${budget(
          s,
        )}, counting ${given}<${s.trials})`,
      );
    }

    // Practice phase contract. When test rows exist, the practice phase
    // completed: it must end on exactly one correct QUEST-reset row, before
    // any test row. When the condition ended while still practicing
    // (sequence/budget exhausted, no test rows), an unterminated practice
    // phase is legitimate — but a reset can only accompany completion.
    const practiceRows = rows.filter((r) => r.trialKind.endsWith("practice"));
    if (!s.practice && practiceRows.length > 0) {
      v.push(
        `${bc}: ${practiceRows.length} practice rows but spec has practice=false`,
      );
    }
    if (practiceRows.length > 0) {
      const firstTestIdx = rows.findIndex((r) => r.trialKind.endsWith("test"));
      const practiceAfterTest = rows.some(
        (r, i) =>
          r.trialKind.endsWith("practice") &&
          firstTestIdx !== -1 &&
          i > firstTestIdx,
      );
      if (practiceAfterTest) {
        v.push(`${bc}: practice rows after test rows`);
      }
      const resets = rows.filter((r) => r.reset);
      if (firstTestIdx !== -1) {
        const last = practiceRows[practiceRows.length - 1];
        if (resets.length !== 1 || resets[0] !== last) {
          v.push(
            `${bc}: practice must end on exactly one QUEST-reset row; got ${resets.length} reset rows`,
          );
        }
        if (last.correct !== true) {
          v.push(`${bc}: practice phase ended on a row that is not correct`);
        }
      } else if (resets.length > 0) {
        // No test trials: practice completed on the condition's final row
        // (budget/sequence exhausted before any test trial). Legitimate iff
        // the single reset is that final row and it is a correct given row.
        const last = rows[rows.length - 1];
        const legit =
          resets.length === 1 &&
          resets[0] === last &&
          last.correct === true &&
          last.given;
        if (!legit) {
          v.push(`${bc}: QUEST reset without a completed practice phase`);
        }
      }
    }

    // Retry contract: a retried row must be followed by a same-condition
    // row — unless the sequence exhausted on it (staircase finished).
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].retrying) continue;
      const hasFollower = i + 1 < rows.length;
      if (!hasFollower && !(seqExhausted || budgetOut)) {
        v.push(
          `${bc}: last row retried but condition ended without budget/sequence exhaustion`,
        );
      }
    }
  }

  for (const bc of byBc.keys()) {
    if (!(bc in spec)) {
      v.push(`${bc}: trial rows for a condition not in spec`);
    }
  }
  return v;
}
