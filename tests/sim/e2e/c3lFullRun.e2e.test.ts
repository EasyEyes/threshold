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
import { spawnSync } from "child_process";
import { existsSync, statSync, readFileSync } from "fs";
import * as path from "path";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "Compare3Languages";
const ROOT = process.cwd();
const EXAMPLES_DIR = path.join(ROOT, "examples");
const BUILT_INDEX = path.join(
  EXAMPLES_DIR,
  "generated",
  TABLE_NAME,
  "index.html",
);
const TABLE = path.join(EXAMPLES_DIR, "tables", `${TABLE_NAME}.xlsx`);
const BLOCK_1 = path.join(
  EXAMPLES_DIR,
  "generated",
  TABLE_NAME,
  "conditions",
  "block_1.csv",
);
const E2E_PORT = 5663;

/** Sim build must exist AND carry the simulate marker (a manual non-sim
 * rebuild strands the simulated participant at the welcome screen). */
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
    ["ts-node", "buildExamples.ts", `${TABLE_NAME}.xlsx`, "--simulate"],
    { cwd: EXAMPLES_DIR, stdio: "pipe", timeout: 240_000 },
  );
  if (r.status !== 0)
    throw new Error(
      "build failed: " + (r.stderr?.toString() ?? "").slice(0, 400),
    );
};

(RUN_E2E ? describe : describe.skip)(
  "Compare3Languages full simulated run",
  () => {
    beforeAll(() => ensureSimBuild(), 300_000);

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
