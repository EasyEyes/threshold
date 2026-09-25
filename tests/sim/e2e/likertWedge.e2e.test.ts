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
import { spawnSync } from "child_process";
import { existsSync, statSync, readFileSync } from "fs";
import * as path from "path";

const RUN_E2E = process.env.RUN_E2E === "1";
const TABLE_NAME = "likert-sim";
const ROOT = process.cwd();
const EXAMPLES_DIR = path.join(ROOT, "examples");
const BUILT_INDEX = path.join(
  EXAMPLES_DIR,
  "generated",
  TABLE_NAME,
  "index.html",
);
const TABLE = path.join(EXAMPLES_DIR, "tables", `${TABLE_NAME}.csv`);
const BLOCK_1 = path.join(
  EXAMPLES_DIR,
  "generated",
  TABLE_NAME,
  "conditions",
  "block_1.csv",
);
const E2E_PORT = 5664;

/** Sim build must exist AND carry the simulate marker. */
const ensureSimBuild = () => {
  const isSim =
    existsSync(BLOCK_1) &&
    readFileSync(BLOCK_1, "utf8").includes("simulateParticipantBool");
  if (
    isSim &&
    existsSync(BUILT_INDEX) &&
    statSync(BUILT_INDEX).mtimeMs > statSync(TABLE).mtimeMs
  )
    return;
  const r = spawnSync(
    "npx",
    ["ts-node", "buildExamples.ts", `${TABLE_NAME}.csv`, "--simulate"],
    { cwd: EXAMPLES_DIR, stdio: "pipe", timeout: 240_000 },
  );
  if (r.status !== 0)
    throw new Error(
      "build failed: " + (r.stderr?.toString() ?? "").slice(0, 400),
    );
};

(RUN_E2E ? describe : describe.skip)(
  "likert-wedge regression — identical-prefix consecutive questions",
  () => {
    beforeAll(() => ensureSimBuild(), 300_000);

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
