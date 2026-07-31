/**
 * @jest-environment node
 *
 * Spec e2e for showPercentCorrectBool: the end-of-block percent-correct
 * popup must appear if the flag is TRUE for ANY condition in the block
 * (glossary spec), even when the LAST condition has it FALSE. The old code
 * read the flag only for the current (last) condition, so it would not show
 * the popup for this table.
 *
 * Table: two rsvpReading conditions, flag TRUE on the first, FALSE on the
 * last. Expect: experiment completes, and exactly one percent popup with a
 * valid (non-NaN) percentage appears at the end of the block.
 *
 * OFF by default; opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import { runSimTable } from "./helpers/runSimTable";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "rsvpReading-percentcorrect-sim";
// Unique port: smoke=5599, coverage=5600+, rsvpTracking-skip=5650, this=5651.
const E2E_PORT = 5651;

(RUN_E2E ? describe : describe.skip)(
  "showPercentCorrectBool TRUE for any condition in block (spec)",
  () => {
    test("popup shows at end of block with a valid percent", async () => {
      const result = await runSimTable(
        {
          name: TABLE_NAME,
          resources: [
            { from: "texts/short-reading.txt", to: "texts/short-reading.txt" },
          ],
        },
        { port: E2E_PORT, seed: 1, stuckTimeoutMs: 45_000 },
      );

      expect(result.consoleErrors).toHaveLength(0);
      expect(result.status).toBe("completed");

      // Exactly one percent popup, with a valid integer percent (no NaN).
      // The percent-correct popup is a custom EasyEyes popup
      // (#threshold-container), not SweetAlert, so check eePopupTitles.
      const percentPopups = result.eePopupTitles.filter((t) => /%/.test(t));
      expect(percentPopups).toHaveLength(1);
      expect(percentPopups[0]).toMatch(/\d+%/);
      expect(percentPopups[0]).not.toMatch(/NaN/);
    }, 180_000);
  },
);
