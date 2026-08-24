/**
 * @jest-environment node
 *
 * Unit tests for the sim-gated loop-trail recorder wired into threshold.js
 * (components/loopTrailSnapshot.ts). At every letter trialRoutineEnd, the
 * REAL MultiStairHandler/QuestHandler internals are snapshotted in-page
 * (window.__simLoopTrail) so e2e tests can check the iterator-safety
 * invariant on genuine runtime state — the crash class of
 * PersianFontsCrwdngRdngCmfrt573 (reading '1') and CrowdingTimeVsSpacing
 * (reading '0').
 *
 * Invariant (guaranteed by the TrialHandler guard fix): whenever the
 * sequence pointer reaches/passes the end (thisRepN >= nReps), the
 * staircase must be marked finished — otherwise some future next() could
 * read _trialSequence out of bounds.
 */

import {
  snapshotLoopState,
  loopTrailInvariantViolations,
  type LoopTrailRow,
} from "../../../components/loopTrailSnapshot";

const R = (over: Partial<LoopTrailRow>): LoopTrailRow => ({
  bc: "1_1",
  stair: "1_1",
  thisRepN: 0,
  thisTrialN: 0,
  nStim: 8,
  nReps: 1,
  nRemaining: 8,
  stairFinished: false,
  multiFinished: false,
  trialKeyLen: 8,
  nth: 1,
  ...over,
});

describe("snapshotLoopState", () => {
  test("reads live stair + multi state", () => {
    const stair = {
      name: "14_2",
      thisRepN: 0,
      thisTrialN: 3,
      nStim: 35,
      nReps: 1,
      nRemaining: 31,
      finished: false,
    };
    const multi = { _finished: false, trialKey: Array(31) };
    expect(snapshotLoopState(stair, multi, "14_2")).toEqual({
      bc: "14_2",
      stair: "14_2",
      thisRepN: 0,
      thisTrialN: 3,
      nStim: 35,
      nReps: 1,
      nRemaining: 31,
      stairFinished: false,
      multiFinished: false,
      trialKeyLen: 31,
      nth: 0, // assigned by recordLoopTrailRow, not the snapshot
    });
  });
});

describe("loopTrailInvariantViolations", () => {
  test("healthy rows pass", () => {
    expect(
      loopTrailInvariantViolations([
        R({ nth: 1 }),
        R({ thisTrialN: 7, nRemaining: 1, trialKeyLen: 1, nth: 2 }),
      ]),
    ).toEqual([]);
  });

  test("pointer at sequence end without finished flag is the crash class", () => {
    // Pre-fix Persian state: rollover happened (thisRepN === nReps) but the
    // staircase was never marked finished — the next next(false) read
    // _trialSequence[nReps][thisTrialN] and crashed.
    expect(
      loopTrailInvariantViolations([
        R({
          thisRepN: 1,
          thisTrialN: 1,
          nRemaining: 2,
          stairFinished: false,
          nth: 1,
        }),
      ]),
    ).toEqual([expect.stringContaining("1_1")]);
  });

  test("pointer at sequence end WITH finished flag is legitimate termination", () => {
    expect(
      loopTrailInvariantViolations([
        R({
          thisRepN: 1,
          thisTrialN: 0,
          nRemaining: 2,
          stairFinished: true,
          nth: 1,
        }),
      ]),
    ).toEqual([]);
  });

  test("thisTrialN must stay within the sequence row", () => {
    expect(
      loopTrailInvariantViolations([R({ thisTrialN: 8, nth: 1 })]),
    ).toEqual([expect.stringContaining("thisTrialN")]);
  });

  test("negative nRemaining is reported", () => {
    expect(
      loopTrailInvariantViolations([R({ nRemaining: -1, nth: 1 })]),
    ).toEqual([expect.stringContaining("nRemaining")]);
  });

  test("trials presented for a staircase AFTER it finished are spurious (retry-queue leak)", () => {
    // A finished staircase must never consume another trial: its queued
    // retries are void. Rows recording the same stair after the first
    // finished=true row = spurious trials shown to the participant.
    expect(
      loopTrailInvariantViolations([
        R({ nth: 1 }),
        R({
          thisRepN: 1,
          thisTrialN: 0,
          nRemaining: 2,
          stairFinished: true,
          nth: 2,
        }), // rollover row
        R({
          thisRepN: 1,
          thisTrialN: 0,
          nRemaining: 2,
          stairFinished: true,
          nth: 3,
        }), // spurious!
      ]),
    ).toEqual([expect.stringContaining("finished staircase")]);
  });

  test("the rollover row itself (first finished row) is not spurious", () => {
    expect(
      loopTrailInvariantViolations([
        R({ nth: 1 }),
        R({
          thisRepN: 1,
          thisTrialN: 0,
          nRemaining: 2,
          stairFinished: true,
          nth: 2,
        }),
        R({ stair: "1_2", nth: 3 }), // different staircase: fine
      ]),
    ).toEqual([]);
  });

  test("two independent staircases each finishing once is clean", () => {
    expect(
      loopTrailInvariantViolations([
        R({ stair: "1_1", nth: 1 }),
        R({ stair: "1_2", nth: 2 }),
        R({ stair: "1_1", thisRepN: 1, stairFinished: true, nth: 3 }),
        R({ stair: "1_2", thisRepN: 1, stairFinished: true, nth: 4 }),
      ]),
    ).toEqual([]);
  });
});
