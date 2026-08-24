/**
 * Shared helper for sim e2e tests.
 *
 * Copies a table CSV (and optional resource files) from `tests/sim/assets/`
 * into the appropriate `examples/` subdirectories, builds the experiment,
 * runs the simulator, and returns the result.
 *
 * Build output is cached in `examples/generated/<name>/`; the build is
 * redone automatically when the asset CSV or a resource is newer than the
 * cached build. buildExamples clears the target dir itself — never delete
 * `examples/generated/` by hand to force a rebuild.
 *
 * @jest-environment node
 */

import { spawnSync } from "child_process";
import { existsSync, copyFileSync, mkdirSync, statSync } from "fs";
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
 * A cached sim build is stale when the built index.html predates the asset
 * CSV or any copied resource — i.e. an input was edited after the last
 * build, so reusing the cache would silently run the old table.
 */
export function isSimBuildStale(
  spec: SimTableSpec,
  roots?: { assetsDir?: string; examplesDir?: string },
): boolean {
  const assetsDir = roots?.assetsDir ?? ASSETS_DIR;
  const examplesDir = roots?.examplesDir ?? EXAMPLES_DIR;
  const builtIndex = path.join(
    examplesDir,
    "generated",
    spec.name,
    "index.html",
  );
  if (!existsSync(builtIndex)) return true;
  const builtMs = statSync(builtIndex).mtimeMs;
  const sources = [
    path.join(assetsDir, `${spec.name}.csv`),
    ...(spec.resources ?? []).map((r) => path.join(assetsDir, r.from)),
  ];
  return sources.some(
    (src) => existsSync(src) && statSync(src).mtimeMs > builtMs,
  );
}

/**
 * Copy the CSV and any resource files into examples/ and build the table
 * (cached — rebuilt only when missing or stale, see isSimBuildStale).
 * Throws if the build fails. Split from runSimTable so bespoke drivers can
 * reuse it.
 */
export function ensureSimTableBuilt(spec: SimTableSpec): void {
  const { name } = spec;

  // 1. Sync CSV into examples/tables/ (always copy — cheap, and a stale
  // examples/ copy would otherwise shadow the edited asset).
  const assetCsv = path.join(ASSETS_DIR, `${name}.csv`);
  const tablesDir = path.join(EXAMPLES_DIR, "tables");
  const tableCsv = path.join(tablesDir, `${name}.csv`);
  mkdirSync(tablesDir, { recursive: true });
  copyFileSync(assetCsv, tableCsv);

  // 2. Sync resource files into their examples/ subdirs (same reasoning).
  for (const r of spec.resources ?? []) {
    const src = path.join(ASSETS_DIR, r.from);
    const dst = path.join(EXAMPLES_DIR, r.to);
    mkdirSync(path.dirname(dst), { recursive: true });
    copyFileSync(src, dst);
  }

  // 3. Build the table when missing or stale. buildExamples clears the
  // target's generated dir itself, so no manual deletion is ever needed.
  if (isSimBuildStale(spec)) {
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
  ensureSimTableBuilt(spec);

  // 4. Run the simulator.
  const { simulate } = await import("../../../../server/simulate");
  return simulate(spec.name, {
    port: opts.port,
    seed: opts.seed ?? 1,
    stuckTimeoutMs: opts.stuckTimeoutMs ?? 45_000,
    headless: opts.headless ?? true,
  });
}
