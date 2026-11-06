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
import {
  existsSync,
  copyFileSync,
  mkdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "fs";
import * as path from "path";
import type { SimulateResult } from "../../../../server/simulate";
import { readRemoteCalibratorPin } from "../../../../examples/remoteCalibratorVersion";
import { parseCsv } from "./csv";

const ROOT = process.cwd();
const ASSETS_DIR = path.join(ROOT, "tests", "sim", "assets");
const EXAMPLES_DIR = path.join(ROOT, "examples");
const BUILD_INPUTS = [
  path.join(ROOT, "preprocess"),
  path.join(ROOT, "parameters"),
  path.join(EXAMPLES_DIR, "buildExamples.ts"),
  path.join(EXAMPLES_DIR, "localCompile.ts"),
  path.join(EXAMPLES_DIR, "localAnalysisIndex.ts"),
  path.join(EXAMPLES_DIR, "simulateInject.ts"),
  path.join(EXAMPLES_DIR, "remoteCalibratorVersion.ts"),
  path.join(ROOT, "index.html"),
  path.join(EXAMPLES_DIR, ".cache", "glossary.json"),
  path.join(EXAMPLES_DIR, ".cache", "phrases.json"),
];

const filesUnder = (input: string): string[] => {
  if (!existsSync(input)) return [];
  if (statSync(input).isFile()) return [input];
  return readdirSync(input, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(input, entry.name);
    return entry.isDirectory() ? filesUnder(child) : [child];
  });
};

const hasSimulatedParticipantEnabled = (
  examplesDir: string,
  name: string,
): boolean => {
  const conditionsDir = path.join(examplesDir, "generated", name, "conditions");
  if (!existsSync(conditionsDir)) return false;
  const files = readdirSync(conditionsDir).filter((file) =>
    /^block_\d+\.csv$/.test(file),
  );
  if (files.length === 0) return false;
  return files.every((file) => {
    const rows = parseCsv(readFileSync(path.join(conditionsDir, file), "utf8"));
    const index = rows[0]?.indexOf("simulateParticipantBool") ?? -1;
    return (
      index >= 0 &&
      rows.length > 1 &&
      rows
        .slice(1)
        .every((row) => String(row[index]).trim().toUpperCase() === "TRUE")
    );
  });
};

export interface RunSimTableOptions {
  /** Dev server port. Take it from the shared registry (helpers/ports.ts). */
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
  /** Extra query params for the experiment URL (e.g. { chaos: "3" }). */
  urlParams?: Record<string, string>;
  /** Passed through to simulate() as window.__SIM_OPTIONS__ (e.g. cameraScenario). */
  simOptions?: Record<string, unknown>;
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
  /** Source filename. Defaults to `${name}.csv` (XLSX also supported). */
  tableFile?: string;
  /** Copy tableFile from sim assets? false = use existing examples/tables file. */
  copyTable?: boolean;
  /** Compiler timeout. Defaults to 90 seconds. */
  buildTimeoutMs?: number;
}

/**
 * A cached sim build is stale when its table, resources, or compiler/simulation
 * inputs are newer than index.html, or when any generated condition is not
 * explicitly simulated.
 */
export function isSimBuildStale(
  spec: SimTableSpec,
  roots?: {
    assetsDir?: string;
    examplesDir?: string;
    buildInputs?: string[];
  },
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
  if (!hasSimulatedParticipantEnabled(examplesDir, spec.name)) return true;

  const tableFile = spec.tableFile ?? `${spec.name}.csv`;
  const tableSource =
    spec.copyTable === false
      ? path.join(examplesDir, "tables", tableFile)
      : path.join(assetsDir, tableFile);
  const buildInputs = (roots?.buildInputs ?? BUILD_INPUTS).flatMap(filesUnder);
  const sources = [
    tableSource,
    ...(spec.resources ?? []).map((r) => path.join(assetsDir, r.from)),
    ...buildInputs,
  ];
  const builtMs = statSync(builtIndex).mtimeMs;
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
  const { name, tableFile = `${name}.csv`, copyTable = true } = spec;
  const tableCsv = path.join(EXAMPLES_DIR, "tables", tableFile);

  if (copyTable) {
    const assetCsv = path.join(ASSETS_DIR, tableFile);
    mkdirSync(path.dirname(tableCsv), { recursive: true });
    copyFileSync(assetCsv, tableCsv);
  } else if (!existsSync(tableCsv)) {
    throw new Error(`Table not found: ${tableCsv}`);
  }

  for (const r of spec.resources ?? []) {
    const src = path.join(ASSETS_DIR, r.from);
    const dst = path.join(EXAMPLES_DIR, r.to);
    mkdirSync(path.dirname(dst), { recursive: true });
    copyFileSync(src, dst);
  }

  // buildExamples clears the target dir itself — never delete generated output.
  if (isSimBuildStale(spec)) {
    const result = spawnSync(
      "npx",
      ["tsx", "buildExamples.ts", tableFile, "--simulate"],
      {
        cwd: EXAMPLES_DIR,
        stdio: "pipe",
        timeout: spec.buildTimeoutMs ?? 90_000,
      },
    );
    if (result.status !== 0) {
      throw new Error(
        `Build failed for ${name}:\n` +
          (result.stderr?.toString() ?? "").slice(0, 500),
      );
    }
  }
  if (!hasSimulatedParticipantEnabled(EXAMPLES_DIR, name)) {
    throw new Error(
      `Build did not enable simulation for every condition: ${name}`,
    );
  }

  const generatedIndex = path.join(
    EXAMPLES_DIR,
    "generated",
    name,
    "index.html",
  );
  const pin = readRemoteCalibratorPin();
  if (pin && existsSync(generatedIndex)) {
    const html = readFileSync(generatedIndex, "utf8");
    const pinned = html.replace(
      // Bare-version forms only: @latest or a previous rewrite of this
      // helper, both followed by the closing quote of the URL. The
      // deliberate old-style pin `remote-calibrator@0.8.881/lib/...`
      // (_stepperBool FALSE tables) is left untouched.
      /remote-calibrator@(?:latest|\d+\.\d+\.\d+)(?=["'])/g,
      `remote-calibrator@${pin}`,
    );
    if (pinned !== html) writeFileSync(generatedIndex, pinned);
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
    urlParams: opts.urlParams,
    simOptions: opts.simOptions,
  });
}
