/**
 * Sim-gated per-trial snapshot of the REAL MultiStairHandler/QuestHandler
 * internals (recorded from threshold.js letter trialRoutineEnd into
 * window.__simLoopTrail), plus the iterator-safety invariant checked over
 * the recorded trail by e2e tests.
 *
 * The invariant encodes the guarantee of the TrialHandler exhaustion guard
 * fix: once the sequence pointer reaches the end (thisRepN >= nReps), the
 * staircase must be marked finished, or a subsequent next() can read
 * _trialSequence out of bounds (production crashes: "reading '1'",
 * "reading '0'", "reading '2'").
 */

export interface LoopTrailRow {
  bc: string; // status.block_condition of the trial that just responded
  stair: string; // staircase (condition) name that consumed the response
  thisRepN: number;
  thisTrialN: number;
  nStim: number; // sequence row length (conditionTrials)
  nReps: number;
  nRemaining: number; // staircase nRemaining after the response
  stairFinished: boolean;
  multiFinished: boolean;
  trialKeyLen: number; // MultiStairHandler retry queue length
  nth: number; // 1-based record order
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const snapshotLoopState = (
  stair: any,
  multi: any,
  bc: string,
): LoopTrailRow => ({
  bc,
  stair: stair._name ?? stair.name,
  thisRepN: stair.thisRepN,
  thisTrialN: stair.thisTrialN,
  nStim: stair.nStim,
  nReps: stair.nReps,
  nRemaining: stair.nRemaining,
  stairFinished: !!stair.finished,
  multiFinished: !!multi._finished,
  trialKeyLen: Array.isArray(multi.trialKey) ? multi.trialKey.length : -1,
  nth: 0, // assigned by the recorder
});

/** In-page recorder; no-op unless a browser window exists (sim/e2e only). */
export function recordLoopTrailRow(stair: any, multi: any, bc: string): void {
  if (typeof window === "undefined") return;
  const w = window as any;
  const trail: LoopTrailRow[] = (w.__simLoopTrail ??= []);
  trail.push({ ...snapshotLoopState(stair, multi, bc), nth: trail.length + 1 });
}

export function loopTrailInvariantViolations(rows: LoopTrailRow[]): string[] {
  const v: string[] = [];
  // First row at which each staircase was observed finished.
  const firstFinished = new Map<string, number>();
  for (const r of rows) {
    if (r.stairFinished && !firstFinished.has(r.stair)) {
      firstFinished.set(r.stair, r.nth);
    }
  }
  for (const r of rows) {
    if (r.thisRepN >= r.nReps && !r.stairFinished) {
      v.push(
        `row ${r.nth} (${r.bc}): sequence pointer at end (thisRepN ${r.thisRepN} >= nReps ${r.nReps}) but staircase not finished — iterator could read past _trialSequence`,
      );
    }
    if (r.thisTrialN >= r.nStim) {
      v.push(
        `row ${r.nth} (${r.bc}): thisTrialN ${r.thisTrialN} >= nStim ${r.nStim}`,
      );
    }
    if (r.nRemaining < 0) {
      v.push(`row ${r.nth} (${r.bc}): negative nRemaining ${r.nRemaining}`);
    }
    const fin = firstFinished.get(r.stair);
    if (fin !== undefined && r.nth > fin) {
      v.push(
        `row ${r.nth} (${r.bc}): trial presented for finished staircase ${r.stair} (finished at row ${fin}) — spurious retry-queue trial`,
      );
    }
  }
  return v;
}
