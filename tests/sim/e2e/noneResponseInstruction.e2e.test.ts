/**
 * @jest-environment node
 *
 * Spec e2e — instructionForResponse = #NONE must SUPPRESS response
 * instructions (glossary: "An empty field requests the default text, so
 * write #NONE to suppress response instructions for this condition").
 *
 * Bug: the canonical response-instruction path (trialRoutineEachFrame)
 * checked `customInstructions.length`, and "#NONE".length is 6, so the
 * literal string "#NONE" was rendered on screen during the response phase.
 *
 * Table: letter-none-instruction-sim (letter-sim + instructionForResponse
 * #NONE). Expect: experiment completes, no instruction overlay shows the
 * literal "#NONE", and the DEFAULT respond instruction ("Please identify
 * the middle letter...") is suppressed too — #NONE means NO response
 * instructions at all. (The control run, letter-sim, records that default
 * respond text; see smoke.e2e.test.ts.)
 *
 * OFF by default; opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import { runSimTable } from "./helpers/runSimTable";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "letter-none-instruction-sim";
// Unique port: smoke=5599, coverage=5600+, rsvpTracking-skip=5650,
// percentCorrect=5651, qaInstructions=5652, qaInstructionsFont=5653,
// this=5654.
const E2E_PORT = 5654;

(RUN_E2E ? describe : describe.skip)(
  "instructionForResponse #NONE suppresses response instructions (spec)",
  () => {
    test("neither literal #NONE nor the default respond instruction shows", async () => {
      const result = await runSimTable(
        { name: TABLE_NAME },
        { port: E2E_PORT, seed: 1, stuckTimeoutMs: 45_000 },
      );

      expect(result.consoleErrors).toHaveLength(0);
      expect(result.status).toBe("completed");

      // The literal parameter value must never be rendered.
      expect(result.instructionTexts.some((t) => t.includes("#NONE"))).toBe(
        false,
      );

      // #NONE suppresses ALL response instructions, including the default
      // (recorded verbatim in the letter-sim control run).
      expect(
        result.instructionTexts.some((t) =>
          t.includes("Please identify the middle letter by clicking it below"),
        ),
      ).toBe(false);
    }, 180_000);
  },
);
