/**
 * Shared helper for sim e2e tests.
 *
 * Copies a table CSV (and optional resource files) from `tests/sim/assets/`
 * into the appropriate `examples/` subdirectories, builds the experiment,
 * runs the simulator, and returns the result.
 *
 * Build output is cached in `examples/generated/<name>/`. Subsequent runs
 * with the same table name skip the ~15s compile step.
 *
 * @jest-environment node
 */

import { spawnSync } from "child_process";
import { existsSync, copyFileSync, mkdirSync } from "fs";
import * as path from "path";
import type { SimulateResult } from "../../../../server/simulate";

const ROOT = process.cwd();
const ASSETS_DIR = path.join(ROOT, "tests", "sim", "assets");
const EXAMPLES_DIR = path.join(ROOT, "examples");

export interface RunSimTableOptions {
  /** Dev server port. Use unique ports per test file to avoid conflicts. */
  port: number;
  /** RNG seed for deterministic responses. Default: 1. */
  seed?: number;
  /**
   * Max ms to wait for the experiment to make progress before declaring it
   * stuck. Default: 45_000 (45s). Use a shorter value (~20s) for tables
   * expected to hang, so the RED signal fires faster.
   */
  stuckTimeoutMs?: number;
  /** Run in headed mode for debugging. Default: false (headless). */
  headless?: boolean;
}

export interface SimTableSpec {
  /** Table name (without .csv extension). Must exist in tests/sim/assets/. */
  name: string;
  /**
   * Resource files to copy from tests/sim/assets/<from> to examples/<to>.
   * Paths are relative to their respective roots.
   * Example: [{ from: "texts/short-reading.txt", to: "texts/short-reading.txt" }]
   */
  resources?: Array<{ from: string; to: string }>;
}

/**
 * Copy the CSV and any resource files into examples/, build the table,
 * then run simulate(). Returns the SimulateResult.
 *
 * Throws if the build fails. Does NOT throw if simulate reports
 * status="incomplete" or "failed" — the caller asserts on the result.
 */
export async function runSimTable(
  spec: SimTableSpec,
  opts: RunSimTableOptions,
): Promise<SimulateResult> {
  const { name } = spec;

  // 1. Copy CSV into examples/tables/.
  const assetCsv = path.join(ASSETS_DIR, `${name}.csv`);
  const tablesDir = path.join(EXAMPLES_DIR, "tables");
  const tableCsv = path.join(tablesDir, `${name}.csv`);
  if (!existsSync(tableCsv)) {
    mkdirSync(tablesDir, { recursive: true });
    copyFileSync(assetCsv, tableCsv);
  }

  // 2. Copy resource files into their respective examples/ subdirs.
  for (const r of spec.resources ?? []) {
    const src = path.join(ASSETS_DIR, r.from);
    const dst = path.join(EXAMPLES_DIR, r.to);
    if (!existsSync(dst)) {
      mkdirSync(path.dirname(dst), { recursive: true });
      copyFileSync(src, dst);
    }
  }

  // 3. Build the table (cached — skip if index.html already exists).
  const builtIndex = path.join(EXAMPLES_DIR, "generated", name, "index.html");
  if (!existsSync(builtIndex)) {
    const result = spawnSync(
      "npx",
      ["ts-node", "buildExamples.ts", `${name}.csv`, "--simulate"],
      {
        cwd: EXAMPLES_DIR,
        stdio: "pipe",
        timeout: 90_000,
      },
    );
    if (result.status !== 0) {
      throw new Error(
        `Build failed for ${name}:\n` +
          (result.stderr?.toString() ?? "").slice(0, 500),
      );
    }
  }

  // 4. Run the simulator.
  const { simulate } = await import("../../../../server/simulate");
  return simulate(name, {
    port: opts.port,
    seed: opts.seed ?? 1,
    stuckTimeoutMs: opts.stuckTimeoutMs ?? 45_000,
    headless: opts.headless ?? true,
  });
}
