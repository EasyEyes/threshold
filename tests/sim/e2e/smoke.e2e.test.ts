/**
 * @jest-environment node
 *
 * End-to-end smoke test for the full simulator pipeline.
 *
 * This test is OFF by default under `npm test`. It builds a tiny 3-trial
 * letter experiment (caching the build), starts the dev server, opens
 * Playwright, and verifies the simulated participant drives the experiment
 * to completion.
 *
 * First run: ~45s (build ~15s + simulate ~30s).
 * Subsequent runs: ~30s (build cached in examples/generated/letter-sim/).
 *
 * Opt in with: RUN_E2E=1 npm test
 */

import { jest, expect, describe, test, beforeAll } from "@jest/globals";
import { spawnSync } from "child_process";
import { existsSync, copyFileSync, mkdirSync } from "fs";
import * as path from "path";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "letter-sim";
const ROOT = process.cwd();
const ASSET_CSV = path.join(
  ROOT,
  "tests",
  "sim",
  "assets",
  `${TABLE_NAME}.csv`,
);
const EXAMPLES_DIR = path.join(ROOT, "examples");
const TABLES_DIR = path.join(EXAMPLES_DIR, "tables");
const TABLE_CSV = path.join(TABLES_DIR, `${TABLE_NAME}.csv`);
const BUILT_INDEX = path.join(
  EXAMPLES_DIR,
  "generated",
  TABLE_NAME,
  "index.html",
);

// Unique port unlikely to conflict with a developer's dev server (5500).
const E2E_PORT = 5599;

/** Lightweight unit-level smoke checks (always run, <100ms). */
describe("Simulator smoke (unit)", () => {
  test("simulate module loads", async () => {
    const { simulate } = await import("../../../server/simulate");
    expect(typeof simulate).toBe("function");
  });

  test("buildExamples exports --simulate helper", async () => {
    const { injectSimulateParticipantIfMissing } = await import(
      "../../../examples/simulateInject"
    );
    const out = injectSimulateParticipantIfMissing(
      [
        ["block", "", "1"],
        ["font", "", "A"],
      ],
      true,
    );
    expect(
      out.find((r: unknown[]) => r[0] === "simulateParticipantBool"),
    ).toBeDefined();
  });
});

/** Full E2E: build table → start server → drive browser → assert completion. */
(RUN_E2E ? describe : describe.skip)("Simulator end-to-end", () => {
  beforeAll(() => {
    // Copy test table into examples/tables/ if missing.
    if (!existsSync(TABLE_CSV)) {
      mkdirSync(TABLES_DIR, { recursive: true });
      copyFileSync(ASSET_CSV, TABLE_CSV);
    }

    // Build the table if the generated output doesn't exist yet.
    // Subsequent runs reuse the cached build (skip the ~15s compile step).
    if (existsSync(BUILT_INDEX)) return;

    const result = spawnSync(
      "npx",
      ["ts-node", "buildExamples.ts", `${TABLE_NAME}.csv`, "--simulate"],
      {
        cwd: EXAMPLES_DIR,
        stdio: "pipe",
        timeout: 90_000,
      },
    );
    if (result.status !== 0) {
      throw new Error(
        `Build failed for ${TABLE_NAME}:\n` +
          (result.stderr?.toString() ?? "").slice(0, 500),
      );
    }
  }, 120_000);

  test("builds letter-sim and runs to completion", async () => {
    expect(existsSync(BUILT_INDEX)).toBe(true);

    const { simulate } = await import("../../../server/simulate");
    const result = await simulate(TABLE_NAME, {
      port: E2E_PORT,
      seed: 1,
      stuckTimeoutMs: 45_000,
      headless: true,
    });

    // The experiment should finish cleanly.
    expect(result.status).toBe("completed");
    // At least one trial should have run (QUEST may run more than the
    // configured 3).
    expect(result.trialsCompleted).toBeGreaterThan(0);
    // No stuck-detection warnings.
    expect(result.warnings).toHaveLength(0);
  }, 120_000); // 2-minute Jest timeout (build is cached, sim ~30s).
});
