/**
 * @jest-environment node
 *
 * Spec e2e — pure questionAndAnswer blocks with UNEQUAL question counts
 * across conditions (glossary questionAnswer: "Any number of conditions can
 * each have up to 99 questions" — nothing requires the counts to match).
 *
 * One trial per question: the trialList repeats each condition's entry once
 * per ITS questions, randomly interleaved (MultiStairHandler-FULLRANDOM-
 * style scheduling), so conditions drop out as their questions end. Table:
 * qa-unequal-counts-sim (2 conditions, 2 vs 1 questions) → exactly 3
 * trials, no empty question dialogs, and the counter total is 3.
 *
 * OFF by default; opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import { runSimTable } from "./helpers/runSimTable";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "qa-unequal-counts-sim";
// Unique port: qaInstructions=5653, this=5654.
const E2E_PORT = 5654;

(RUN_E2E ? describe : describe.skip)(
  "questionAndAnswer blocks with unequal per-condition question counts",
  () => {
    test("asks every condition exactly its own questions (2 vs 1 → 3 trials)", async () => {
      const result = await runSimTable(
        { name: TABLE_NAME },
        { port: E2E_PORT, seed: 1, stuckTimeoutMs: 45_000 },
      );

      expect(result.consoleErrors).toHaveLength(0);
      expect(result.status).toBe("completed");
      // One trial per question: 2 + 1 = 3.
      expect(result.trialsCompleted).toBe(3);
      expect(result.trialsTotal).toBe(3);

      // Every question was asked and recorded — no empty modals.
      const csv = Object.values(result.csvFiles)[0] ?? "";
      for (const nick of ["Q1M", "Q1F", "Q2M"]) {
        expect(csv).toContain(`${nick}-qa`);
      }
    }, 180_000);
  },
);
