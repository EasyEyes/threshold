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
 * Formerly blocked on multi-condition pure-Q&A question gathering (fixed via
 * planPureQaBlockQuestions, see notes/DONE-questionAndAnswer-multi-condition-
 * blocks.md); also required the sim participant's dialogs dedupe counter.
 *
 * OFF by default; opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import { runSimTable } from "./helpers/runSimTable";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "qa-instructions-font-sim";
// Unique port: smoke=5599, coverage=5600+, rsvpTracking-skip=5650,
// percentCorrect=5651, qaInstructions=5652, this=5653.
const E2E_PORT = 5653;

(RUN_E2E ? describe : describe.skip)(
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
