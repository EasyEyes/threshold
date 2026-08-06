/**
 * @jest-environment node
 *
 * Spec e2e — instructionForResponse must be styled per condition, exactly
 * like every other instruction. Normal trials refresh the instruction font
 * per condition (updateInstructionFont in trialRoutineBegin); pure
 * questionAndAnswer trials must do the same, so the response instruction
 * honors each condition's instructionFont/instructionFontSource.
 *
 * Table: one pure Q&A block with TWO conditions, each with a distinct
 * instructionFont (Georgia vs Courier New) and a distinct marker in
 * instructionForResponse. Expect: each response-instruction overlay renders
 * in ITS condition's instructionFont.
 *
 * BLOCKED: pure questionAndAnswer blocks with multiple conditions are broken
 * upstream — question gathering reads only the first condition's questions
 * (threshold.js `paramReader.read(qName, status.block)[0]`), so condition 2's
 * trial logs "thisQuestionAndAnswer is undefined". This test is the
 * ready-made RED for both that gathering bug and the per-condition
 * instructionFont refresh; enable it once multi-condition Q&A blocks work.
 *
 * OFF by default; opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import { runSimTable } from "./helpers/runSimTable";

const RUN_E2E = process.env.RUN_E2E === "1";

// Skipped even under RUN_E2E: blocked on multi-condition pure-Q&A question
// gathering (see header comment).
const RUN_BLOCKED = false;

const TABLE_NAME = "qa-instructions-font-sim";
// Unique port: smoke=5599, coverage=5600+, rsvpTracking-skip=5650,
// percentCorrect=5651, qaInstructions=5652, this=5653.
const E2E_PORT = 5653;

(RUN_E2E && RUN_BLOCKED ? describe : describe.skip)(
  "questionAndAnswer instructionForResponse uses each condition's instructionFont (spec)",
  () => {
    test("response instruction font follows the condition", async () => {
      const result = await runSimTable(
        { name: TABLE_NAME },
        { port: E2E_PORT, seed: 1, stuckTimeoutMs: 45_000 },
      );

      expect(result.consoleErrors).toHaveLength(0);
      expect(result.status).toBe("completed");

      const cond1 = Object.keys(result.instructionFonts).find((t) =>
        t.includes("RESPONSE MARKER cond1"),
      );
      const cond2 = Object.keys(result.instructionFonts).find((t) =>
        t.includes("RESPONSE MARKER cond2"),
      );
      expect(cond1).toBeDefined();
      expect(cond2).toBeDefined();
      expect(result.instructionFonts[cond1!]).toContain("Georgia");
      expect(result.instructionFonts[cond2!]).toContain("Courier New");
    }, 180_000);
  },
);
