/**
 * @jest-environment node
 *
 * Regression: consecutive Likert questions whose first 60 chars are identical
 * (a shared scale preamble) wedged the simulated participant — the mid-run
 * Swal dedupe keyed on the title slice, so the second modal was skipped
 * forever. Surfaces only across TWO blocks (a stale reading phase entering
 * the Q&A block), which is why no single-block test caught it. The full
 * Compare3Languages e2e proves it at 31 blocks; this 2-block table proves
 * it in seconds.
 *
 * OFF by default; opt in with RUN_E2E=1.
 */
import { jest, expect, describe, test, beforeAll } from "@jest/globals";
import { simE2EPort } from "./helpers/ports";
import { ensureSimTableBuilt } from "./helpers/runSimTable";

const RUN_E2E = process.env.RUN_E2E === "1";
const TABLE_NAME = "likert-sim";
const E2E_PORT = simE2EPort("likertWedge");

(RUN_E2E ? describe : describe.skip)(
  "likert-wedge regression — identical-prefix consecutive questions",
  () => {
    beforeAll(() => {
      ensureSimTableBuilt({
        name: TABLE_NAME,
        copyTable: false,
        buildTimeoutMs: 240_000,
      });
    }, 300_000);

    test("completes the reading + Q&A run with all 4 trials", async () => {
      const { simulate } = await import("../../../server/simulate");
      const result = await simulate(TABLE_NAME, {
        port: E2E_PORT,
        seed: 7,
        stuckTimeoutMs: 60_000,
        headless: true,
      });
      if (result.status !== "completed")
        console.error(
          "simulate result:",
          JSON.stringify(
            { ...result },
            (_k, v) => (typeof v === "string" ? v.slice(0, 300) : v),
            1,
          ),
        );
      expect(result.stuck).toBeUndefined();
      expect(result.status).toBe("completed");
      expect(result.trialsCompleted).toBeGreaterThanOrEqual(4);
      expect(result.warnings).toHaveLength(0);
    }, 300_000);
  },
);
