// @ts-nocheck — CLI entry file. Uses .ts import for Node's --experimental-strip-types.
// TS 4.9 rejects .ts import paths (fixed in 5.0+ via allowImportingTsExtensions).
/**
 * CLI entry point for `npm run simulate`.
 *
 * Splits the import.meta-dependent logic out of simulate.ts so the latter is
 * a pure importable module (testable in Jest without experimental ESM flags).
 *
 * Usage:
 *   npm run simulate -- <table> [<table>...] [options]
 *
 * Options:
 *   --seed=N           Seed for deterministic responses (default 1).
 *   --no-headless      Show the browser window(s).
 *   --interactive      Alias for --no-headless.
 *   --json             Emit one JSON object per table (default: key=value lines).
 *   --screenshots      Save trial screenshots to examples/simulated/<table>/.
 *   --port=N           Base port; parallel tables use N, N+1, N+2… (default 5500).
 *   --stuck-timeout-ms=N  Per-table stuck-detection timeout (default 20000).
 *   --jobs=N           Max parallel tables (default: all, capped at 4).
 *   --no-build         Skip auto-build (assume examples/generated/<table>/ exists
 *                      AND has simulateParticipantBool=TRUE compiled in).
 *   --fail-on-warnings Exit non-zero if any warnings were recorded (stuck trials).
 *
 * Multiple tables run in parallel on sequential ports. The script auto-builds
 * each table with `npm run examples -- <table> --simulate` first — this
 * injects simulateParticipantBool=TRUE into the compiled output, so any
 * table (even a normally non-simulated one) can be simulated for debugging.
 *
 * Exit code: 0 if ALL tables completed, 1 if any failed/incomplete.
 */

import { fileURLToPath } from "url";
import * as path from "path";
import { existsSync, mkdirSync } from "fs";
import { spawnSync } from "child_process";
import {
  simulate,
  parseArgs,
  jsonlPathFor,
  type SimulateResult,
} from "./simulate.ts";

if (process.argv[1] !== fileURLToPath(import.meta.url)) {
  // Allow import for tests without running the CLI.
} else {
  main();
}

async function main() {
  const args = parseArgs(process.argv);
  const tables = args.experimentNames;

  if (tables.length === 0) {
    console.error(
      "Usage: npm run simulate -- <table> [<table>...] [--seed=N] [--jobs=N] ...",
    );
    process.exit(1);
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const examplesRoot = path.join(__dirname, "..", "examples");

  // Auto-build phase: ensure each table is compiled with simulateParticipantBool.
  // Idempotent — injectSimulateParticipantIfMissing skips tables that already
  // have the row. Use --no-build to skip (e.g. for a hand-edited table).
  if (!args.noBuild) {
    for (const table of tables) {
      const csvName = table.endsWith(".csv") ? table : `${table}.csv`;
      const tablePath = path.join(examplesRoot, "tables", csvName);
      if (!existsSync(tablePath)) {
        console.error(`:( table not found: examples/tables/${csvName}`);
        process.exit(1);
      }
      process.stdout.write(`[build] ${table} ... `);
      const result = spawnSync(
        "npx",
        ["ts-node", "buildExamples.ts", csvName, "--simulate"],
        { cwd: examplesRoot, stdio: ["ignore", "pipe", "pipe"] },
      );
      if (result.status !== 0) {
        process.stdout.write("FAIL\n");
        process.stderr.write(
          (result.stdout?.toString() ?? "") + (result.stderr?.toString() ?? ""),
        );
        process.exit(1);
      }
      process.stdout.write("ok\n");
    }
  }

  // Run simulations. Single table → sequential (simplest output). Multiple
  // tables → parallel with --jobs cap. Each table uses a unique port derived
  // from the base --port flag.
  const runs: {
    table: string;
    port: number;
    result?: SimulateResult;
    error?: string;
  }[] = tables.map((table, i) => ({ table, port: args.port + i }));

  const jobs = Math.min(args.jobs, tables.length);
  const queue = [...runs];

  async function worker() {
    while (queue.length > 0) {
      const run = queue.shift()!;
      const screenshotDir = args.screenshots
        ? path.join(examplesRoot, "simulated", run.table)
        : undefined;
      const jsonlPath = jsonlPathFor(run.table, args.seed);
      mkdirSync(path.dirname(jsonlPath), { recursive: true });
      const headless = args.interactive ? false : args.headless;
      try {
        run.result = await simulate(run.table, {
          headless,
          port: run.port,
          seed: args.seed,
          stuckTimeoutMs: args.stuckTimeoutMs,
          screenshotDir,
          jsonlPath,
        });
      } catch (err: any) {
        run.error = err?.message ?? String(err);
      }
    }
  }

  await Promise.all(Array.from({ length: jobs }, () => worker()));

  // Report phase: one block per table for text mode; one JSON array for --json.
  const allOk = printReport(runs, args);
  process.exit(allOk ? 0 : 1);
}

function printReport(
  runs: {
    table: string;
    port: number;
    result?: SimulateResult;
    error?: string;
  }[],
  args: { json: boolean; failOnWarnings: boolean },
): boolean {
  if (args.json) {
    const out = runs.map((r) => ({
      table: r.table,
      ...(r.result ?? { status: "failed", error: r.error }),
    }));
    console.log(JSON.stringify(out, null, 2));
    return runs.every(
      (r) =>
        r.result?.status === "completed" &&
        (!args.failOnWarnings || !r.result.warnings.length),
    );
  }

  let allOk = true;
  for (const r of runs) {
    const res = r.result;
    const icon = !res
      ? "ERROR"
      : res.status === "completed"
      ? "OK"
      : res.status === "failed"
      ? "FAIL"
      : "INCOMPLETE";
    // With --fail-on-warnings, a completed run that logged warnings is not OK.
    const warningsDisqualify =
      args.failOnWarnings && res && res.warnings.length > 0;
    if (icon !== "OK" || warningsDisqualify) allOk = false;
    console.log(`---- ${r.table} ----`);
    console.log(`status=${icon}${warningsDisqualify ? " (warnings)" : ""}`);
    console.log(`port=${r.port}`);
    if (!res) {
      console.log(`error=${r.error}`);
      continue;
    }
    console.log(`seed=${res.seed}`);
    console.log(`trials=${res.trialsCompleted}/${res.trialsTotal}`);
    console.log(`strategy=${res.responseStrategy}`);
    console.log(`duration_ms=${res.durationMs}`);
    console.log(`jsonl=${jsonlPathFor(r.table, res.seed)}`);
    if (res.consoleErrors.length)
      console.log(`errors=${res.consoleErrors.length}`);
    if (res.sweetAlertPopups.length)
      console.log(`popups=${res.sweetAlertPopups.length}`);
    if (res.warnings.length) {
      console.log(`warnings=${res.warnings.length}`);
      for (const w of res.warnings) console.log(`  - ${w}`);
    }
  }

  // Summary line for at-a-glance reading when running many tables.
  if (runs.length > 1) {
    const summary = runs
      .map((r) => {
        const icon = !r.result
          ? "ERR"
          : r.result.status === "completed"
          ? "OK"
          : r.result.status === "failed"
          ? "FAIL"
          : "INC";
        return `${r.table}=${icon}`;
      })
      .join(" ");
    console.log(`\nsummary: ${summary}`);
  }
  return allOk;
}
