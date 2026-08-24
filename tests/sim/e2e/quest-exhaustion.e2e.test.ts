/**
 * @jest-environment node
 *
 * Regression e2e for the PersianFontsCrwdngRdngCmfrt573 fatal crash
 * ("Cannot read properties of undefined (reading '1')" at trialRoutineEnd,
 * block 14 condition 2 trial 98, 2026-08-22).
 *
 * Mechanism (confirmed by A/B e2e 2026-08-24, pre-fix 36922e3 vs fix f9f8921):
 * thresholdPracticeUntilCorrect + blind responses → many good-timing practice
 * trials, each a COUNTING next(true) on the condition's QuestHandler, but none
 * completes the condition (wrong answers), so the good-trial target never ends
 * the block. Once counting calls exceed nTrials (rollover thisRepN=1 with
 * nReps=1), the first NON-counting next(false) (a bad-timing trial → retry)
 * skips the pre-fix termination guard (it lived inside `if (doesTrialCount)`)
 * and reads _trialSequence[1][thisTrialN] → TypeError.
 *
 * Fix: TrialHandler.js iterator checks thisRepN >= nReps whether or not the
 * call counts. Verified: seed 2 crashed on pre-fix (reading '2', trail =
 * 11×goodpractice then badpractice) and completes cleanly on the fix.
 *
 * The run below asserts completion on CURRENT code; the crash repro itself is
 * deterministic only against the pre-fix psychojs (see note above for the
 * recipe: tests/sim/assets/quest-exhaustion-sim.csv, seed 2).
 *
 * OFF by default; opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import { runSimTable } from "./helpers/runSimTable";
import { extractTrail, trailViolations } from "./helpers/trialTrail";
import {
  loopTrailInvariantViolations,
  type LoopTrailRow,
} from "../../../components/loopTrailSnapshot";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "quest-exhaustion-sim";
// Unique port: smoke=5599, coverage=5600+, rsvpTracking-skip=5650,
// percentCorrect=5651, this=5652.
const E2E_PORT = 5652;

(RUN_E2E ? describe : describe.skip)(
  "QUEST trial-sequence exhaustion (Persian crash)",
  () => {
    test("practice-heavy block completes without a TrialHandler TypeError", async () => {
      const result = await runSimTable(
        { name: TABLE_NAME },
        { port: E2E_PORT, seed: 2, stuckTimeoutMs: 45_000 },
      );

      // The pre-fix crash surfaces as a console error mentioning the
      // exhausted-sequence read, and the run never finishes.
      const exhaustionErrors = result.consoleErrors.filter((e) =>
        /cannot read properties of undefined/i.test(e),
      );
      expect(exhaustionErrors).toHaveLength(0);
      expect(result.status).toBe("completed");

      // Full CSV behavioral contract + iterator-safety invariants.
      const csvEntry = Object.entries(result.csvFiles).find(([, text]) =>
        text.includes("trialKind"),
      );
      expect(csvEntry).toBeDefined();
      expect(
        trailViolations(extractTrail(csvEntry![1]), {
          "1_1": { trials: 8, ratio: 4, practice: true },
        }),
      ).toEqual([]);
      expect(
        loopTrailInvariantViolations(result.loopTrail as LoopTrailRow[]),
      ).toEqual([]);
    }, 180_000);
  },
);
