import { DefaultMap } from "./types";

/**
 * Mutable global experiment status.
 *
 * `resetBlockScopedStatus` (called on a recalibration block-restart) resets
 * the block-scoped fields below but leaves the run-level fields (`block`,
 * `nthBlock`, `consentGiven`): `block` is re-set by filterRoutineBegin, and a
 * restart decrements `nthBlock` so filterRoutineBegin's increment keeps the
 * restarted block a REDO of the same sequential block.
 */
export const status = {
  block: 0, // 1-based; may run out of order (shuffling)
  nthBlock: undefined as number | undefined, // sequential block count in this run
  trial: undefined as number | undefined, // 1-based trial number
  block_condition: undefined as string | undefined,
  condition: undefined as object | undefined,
  trialCorrect_thisBlock: 0,
  trialCompleted_thisBlock: 0,
  trialAttempted_thisBlock: 0,
  // Per-condition mirrors of the thisBlock counters (end-of-block %correct popup).
  nthTrialCorrectThisBlockByCondition: new DefaultMap<string, number>(
    () => 0,
    null,
  ),
  nthTrialCompletedThisBlockByCondition: new DefaultMap<string, number>(
    () => 0,
    null,
  ),
  nthTrialByCondition: new DefaultMap<string, number>(() => 1, null), // current trial # per condition
  nthTrialAttemptedByCondition: new DefaultMap<string, number>(() => 0, null),
  currentFunction: "", // current routine fn, e.g. trialRoutineEachFrame
  retryThisTrialBool: false,
  consentGiven: undefined as boolean | undefined,
};

/** Reset status's block-scoped fields; run-level fields are left untouched. */
export const resetBlockScopedStatus = (): void => {
  status.trial = undefined;
  status.block_condition = undefined;
  status.condition = undefined;
  status.trialCorrect_thisBlock = 0;
  status.trialCompleted_thisBlock = 0;
  status.trialAttempted_thisBlock = 0;
  status.nthTrialCorrectThisBlockByCondition.clear();
  status.nthTrialCompletedThisBlockByCondition.clear();
  status.nthTrialByCondition.clear();
  status.nthTrialAttemptedByCondition.clear();
  status.currentFunction = "";
  status.retryThisTrialBool = false;
};
