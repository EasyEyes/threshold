/**
 * @jest-environment node
 *
 * End-to-end RTL smoke test for the fontDirection migration.
 *
 * OFF by default (like smoke.e2e.test.ts); opt in with RUN_E2E=1.
 *
 * Rationale: the fontDirection-replaces-fontLeftToRightBool migration has no
 * browser-level execution coverage — unit tests verify the helpers and the
 * setFontGlobalState <html dir> side effect, but nothing exercises the full
 * path (paramReader reads fontDirection → setFontGlobalState sets global +
 * <html dir> → boundingNew/stimulusGeneration use it → a trial completes). This
 * test drives the existing bug1-rtl-sim table (fontDirection=rtl) end-to-end
 * and asserts the experiment reaches the COMPLETE phase with no errors.
 *
 * It reuses the build/simulate helpers from smoke.e2e.test.ts's harness.
 */

import { jest, expect, describe, test, beforeAll } from "@jest/globals";
import { spawnSync } from "child_process";
import { existsSync, copyFileSync, mkdirSync } from "fs";
import * as path from "path";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "bug1-rtl-sim";
const ROOT = process.cwd();
const EXAMPLES_DIR = path.join(ROOT, "examples");
const TABLES_DIR = path.join(EXAMPLES_DIR, "tables");
const TABLE_CSV = path.join(TABLES_DIR, `${TABLE_NAME}.csv`);
const BUILT_INDEX = path.join(
  EXAMPLES_DIR,
  "generated",
  TABLE_NAME,
  "index.html",
);

// A different port from smoke.e2e (5599) so the two can run concurrently.
const E2E_PORT = 5601;

/** Unit-level guard (always runs, <100ms): the table is migrated to fontDirection. */
describe("RTL sim table migration (unit)", () => {
  test("bug1-rtl-sim uses fontDirection=rtl, not fontLeftToRightBool", () => {
    // The table ships in examples/tables/ (migrated in this change).
    const csv = require("fs").readFileSync(TABLE_CSV, "utf8");
    expect(csv).toMatch(/^\s*fontDirection\s*,/m);
    expect(csv).toMatch(/^\s*fontDirection\s*,,\s*rtl\s*$/m);
    expect(csv).not.toMatch(/fontLeftToRightBool/);
  });
});

(RUN_E2E ? describe : describe.skip)("RTL simulator end-to-end", () => {
  beforeAll(() => {
    mkdirSync(TABLES_DIR, { recursive: true });
    // The table is committed under examples/tables/; nothing to copy.

    if (existsSync(BUILT_INDEX)) return; // cached build

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
          (result.stderr?.toString() ?? "").slice(0, 1000),
      );
    }
  }, 120_000);

  test("fontDirection=rtl experiment builds and runs to completion", async () => {
    expect(existsSync(BUILT_INDEX)).toBe(true);

    const { simulate } = await import("../../../server/simulate");
    const result = await simulate(TABLE_NAME, {
      port: E2E_PORT,
      seed: 1,
      stuckTimeoutMs: 45_000,
      headless: true,
    });

    // Completes cleanly — no crash from the fontDirection read path,
    // <html dir>, boundingNew, etc. (NOTE: this E2E suite is environment-
    // gated — it needs the dev server + live resources; in environments where
    // those 404 the sim stalls at `instructions`. That is a pre-existing
    // harness limitation, not a fontDirection regression — the untouched
    // letter-sim smoke test fails identically. Where the harness works, this
    // asserts the full RTL path runs to completion.)
    expect(result.status).toBe("completed");
    expect(result.trialsCompleted).toBeGreaterThan(0);
    // No runtime errors and no stuck-detection warnings.
    expect(result.warnings).toHaveLength(0);
    expect((result as any).error ?? null).toBeNull();
  }, 180_000); // 3-minute Jest timeout (first build + sim).
});
