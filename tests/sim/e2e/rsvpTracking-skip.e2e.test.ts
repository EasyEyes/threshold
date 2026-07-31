/**
 * @jest-environment node
 *
 * Regression e2e for the showPercentCorrectBool "Good work! You got NaN%
 * right" bug (card dated Dec 1 2024).
 *
 * Scenario: rsvpReading with responseMustTrackContinuouslyBool=TRUE. The
 * simulated participant never moves its cursor onto the moving fixation
 * during the stimulus, so every trial fails tracking and is skipped. These
 * skipped trials must NOT count as completed trials and must NOT end the
 * block early.
 *
 * Desired behavior (RED on current code):
 *   1. The block runs its full complement of trials (skipped trials are
 *      retried, up to thresholdAllowedTrialRatio), so the experiment
 *      completes rather than ending the block prematurely.
 *   2. The end-of-block percent-correct popup must never show NaN%, and
 *      must not appear at all if zero trials were completed.
 *
 * This test is OFF by default under `npm test`. Opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import { runSimTable } from "./helpers/runSimTable";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "rsvpReading-tracking-sim";
// Unique port: smoke=5599, coverage=5600+, this file=5650.
const E2E_PORT = 5650;

(RUN_E2E ? describe : describe.skip)(
  "rsvpReading tracking-failure skip (bug: NaN% popup mid-block)",
  () => {
    test("tracking failures don't end block early; popup never shows NaN%", async () => {
      const result = await runSimTable(
        {
          name: TABLE_NAME,
          resources: [
            { from: "texts/short-reading.txt", to: "texts/short-reading.txt" },
          ],
        },
        { port: E2E_PORT, seed: 1, stuckTimeoutMs: 45_000 },
      );

      // No console errors (the bug card reported crashes after the popup).
      expect(result.consoleErrors).toHaveLength(0);

      // The percent-correct popup must never show NaN%.
      const percentPopups = result.sweetAlertPopups.filter((t) => /%/.test(t));
      for (const text of percentPopups) {
        expect(text).not.toMatch(/NaN/);
      }

      // The experiment runs to completion (block not ended early).
      expect(result.status).toBe("completed");
    }, 180_000);
  },
);
