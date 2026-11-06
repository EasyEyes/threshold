/**
 * @jest-environment node
 *
 * Full simulated run of the field experiment table itself (31 blocks: Q&A,
 * reading, crowding, RSVP, beauty reading+Q&A). The field data's failure
 * classes (silent Q&A trap, crashes) should all be gone; the simulated
 * participant must drive the whole experiment to completion.
 *
 * OFF by default; opt in with RUN_E2E=1.
 */

import { jest, expect, describe, test, beforeAll } from "@jest/globals";
import { simE2EPort } from "./helpers/ports";
import { ensureSimTableBuilt } from "./helpers/runSimTable";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "Compare3Languages";
const E2E_PORT = simE2EPort("c3lFullRun");

(RUN_E2E ? describe : describe.skip)(
  "Compare3Languages full simulated run",
  () => {
    beforeAll(() => {
      ensureSimTableBuilt({
        name: TABLE_NAME,
        tableFile: `${TABLE_NAME}.xlsx`,
        copyTable: false,
        buildTimeoutMs: 240_000,
      });
    }, 300_000);

    test(
      "completes all 31 blocks without getting stuck",
      async () => {
        const { simulate } = await import("../../../server/simulate");
        const result = await simulate(TABLE_NAME, {
          port: E2E_PORT,
          seed: 1,
          // Crowding QUEST blocks run 35 trials each; beauty reading pages
          // are long. Generous per-step budget before declaring "stuck".
          stuckTimeoutMs: 120_000,
          headless: true,
        });
        // Surface the failure detail in the jest output.
        if (result.status !== "completed")
          console.error(
            "simulate result:",
            JSON.stringify(
              { ...result },
              (_k, v) => (typeof v === "string" ? v.slice(0, 300) : v),
              1,
            ),
          );
        expect(result.status).toBe("completed");
        expect(result.trialsCompleted).toBeGreaterThan(0);
        expect(result.warnings).toHaveLength(0);
      },
      45 * 60_000,
    );
  },
);
