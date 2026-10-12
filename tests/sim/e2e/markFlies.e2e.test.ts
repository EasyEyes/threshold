/**
 * @jest-environment node
 *
 * E2E: the markFlies transparent-naming migration (new scalar parameters)
 * end-to-end in a real browser against the LIVE deployed glossary — unit
 * tests mock the glossary, so this is the only place that catches
 * glossary-shape drift (e.g. a param renamed/removed server-side).
 *
 * Table: mark-flies-sim (letter-sim + markFliesNumber 4 and friends — the
 * full Hu et al. crowded-dynamic-fixation configuration, incl.
 * markFliesBool TRUE since glossary 36.0).
 *
 * Expect: the experiment completes; no console errors; and no
 * "skipping flies" warning from resolveFliesSpec (the spec must resolve
 * cleanly with the live glossary's names and defaults).
 *
 * OFF by default; opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import { runSimTable } from "./helpers/runSimTable";
import { simE2EPort } from "./helpers/ports";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "mark-flies-sim";
const E2E_PORT = simE2EPort("markFlies");

(RUN_E2E ? describe : describe.skip)(
  "markFlies new parameters (live glossary)",
  () => {
    test("flies spec resolves cleanly and the run completes", async () => {
      const result = await runSimTable(
        { name: TABLE_NAME },
        { port: E2E_PORT, seed: 1, stuckTimeoutMs: 45_000 },
      );

      expect(result.consoleErrors).toHaveLength(0);
      expect(result.status).toBe("completed");
      expect(result.trialsCompleted).toBeGreaterThan(0);
      expect(
        result.warnings.filter((w) => w.includes("skipping flies")),
      ).toHaveLength(0);
    }, 180_000);
  },
);
