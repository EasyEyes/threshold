/**
 * @jest-environment node
 *
 * Spec e2e — ALLOW questionAndAnswer WITH instructionForBlock &
 * instructionForResponse.
 *
 * Card: a questionAndAnswer experiment with instructionForBlock and
 * instructionForResponse set did not show the instructions. They should
 * ALWAYS show, regardless of the task.
 *
 * Table: one pure questionAndAnswer block (no targetKind) with both
 * instruction parameters set to unique marker strings. Expect: experiment
 * completes, the block-instruction marker appears in an instruction overlay
 * at block start, and the response-instruction marker appears in the
 * instruction overlay while each Q&A modal is up (shown via the normal
 * instruction stim, like other tasks' response instructions).
 *
 * OFF by default; opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import { runSimTable } from "./helpers/runSimTable";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "qa-instructions-sim";
// Unique port: smoke=5599, coverage=5600+, rsvpTracking-skip=5650,
// percentCorrect=5651, this=5652.
const E2E_PORT = 5652;

(RUN_E2E ? describe : describe.skip)(
  "questionAndAnswer shows instructionForBlock and instructionForResponse (spec)",
  () => {
    test("block-start and per-question instruction overlays both show", async () => {
      const result = await runSimTable(
        { name: TABLE_NAME },
        { port: E2E_PORT, seed: 1, stuckTimeoutMs: 45_000 },
      );

      expect(result.consoleErrors).toHaveLength(0);
      expect(result.status).toBe("completed");

      // instructionForBlock: shown once at the beginning of the block, in an
      // instruction overlay (.ee-html-text-stim), recorded in-page.
      expect(
        result.instructionTexts.some((t) => t.includes("BLOCK MARKER")),
      ).toBe(true);

      // instructionForResponse: shown via the normal instruction stim while
      // each question modal is up (backdrop:false keeps it visible).
      expect(
        result.instructionTexts.some((t) => t.includes("RESPONSE MARKER")),
      ).toBe(true);

      // Sanity: the Q&A modals themselves did appear (questions were asked).
      expect(result.swalPopupTexts.length).toBeGreaterThan(0);
    }, 180_000);
  },
);
