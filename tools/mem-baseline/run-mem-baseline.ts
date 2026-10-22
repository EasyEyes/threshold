/**
 * Memory baseline harness — per-trial JS heap growth during a long
 * letter-identification run, measured ONLY with in-experiment machinery:
 * the simulated participant drives a normal simulated run and we read the
 * heap columns (`heapUsedBeforeDrawing (MB)` etc.) out of the results CSV
 * the experiment itself saves — the same numbers field sessions log.
 *
 * Usage:
 *   npx tsx tools/mem-baseline/run-mem-baseline.ts [options]
 *
 *   --table=<name>     sim table name (default letter-mem-baseline-sim);
 *                      built from tests/sim/assets via `simulate`'s auto-build
 *   --seed=<n>         RNG seed (default 1)
 *   --port=<n>         dev server port (default 5610)
 *   --out=<dir>        CSV + JSON dump dir (default notes/mem-baseline)
 *
 * Output: the run's results CSV (kept verbatim) plus a one-screen summary of
 * the heap columns. Nothing is measured out-of-band: no CDP, no injected
 * sampler, no browser flags — if the summary is thin, the experiment's own
 * instrumentation is what is thin.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import * as path from "node:path";
import { simulate, jsonlPathFor } from "../../server/simulate";
import { parseCsv, csvColumn } from "../../tests/sim/e2e/helpers/csv";

const ROOT = process.cwd();

interface Opts {
  table: string;
  seed: number;
  port: number;
  outDir: string;
}

function parseArgs(argv: string[]): Opts {
  const get = (k: string): string | undefined => {
    const hit = argv.find((a) => a.startsWith(`--${k}=`));
    return hit ? hit.slice(k.length + 3) : undefined;
  };
  return {
    table: get("table") ?? "letter-mem-baseline-sim",
    seed: Number(get("seed") ?? 1),
    port: Number(get("port") ?? 5610),
    outDir: get("out") ?? path.join(ROOT, "notes", "mem-baseline"),
  };
}

const median = (a: number[]): number =>
  a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : NaN;
const mean = (a: number[]): number =>
  a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;

function linfit(y: number[]): { slope: number; r2: number } {
  const n = y.length;
  if (n < 2) return { slope: NaN, r2: NaN };
  const xs = y.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (y[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return { slope: sxy / sxx, r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : NaN };
}

const HEAP_COLUMNS = [
  "heapUsedBeforeDrawing (MB)",
  "heapTotalBeforeDrawing (MB)",
  "heapLimitBeforeDrawing (MB)",
  "heapUsedAfterDrawing (MB)",
  "heapTotalAfterDrawing (MB)",
  "heapLimitAfterDrawing (MB)",
  "heapTotalPreLateness (MB)",
  "heapTotalPostLateness (MB)",
];

const nums = (rows: string[][], col: string): number[] =>
  csvColumn(rows, col)
    .filter((v) => v.trim() !== "")
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

function summarizeHeap(rows: string[][]): string[] {
  const out: string[] = [];
  const present = HEAP_COLUMNS.filter((c) => rows[0]?.includes(c));
  out.push(`heap columns present: ${present.length}/${HEAP_COLUMNS.length}`);
  const used = nums(rows, "heapUsedBeforeDrawing (MB)");
  out.push(`trials with a heap sample: ${used.length} of ${rows.length - 1}`);
  if (used.length < 2) return out;

  const deltas = used.slice(1).map((v, i) => v - used[i]);
  const growth = deltas.filter((d) => d > 0);
  const reclaim = deltas.filter((d) => d < 0);
  const fit = linfit(used);
  out.push(
    `heap MB: first=${used[0].toFixed(1)} last=${used.at(-1)!.toFixed(1)} ` +
      `min=${Math.min(...used).toFixed(1)} max=${Math.max(...used).toFixed(1)}`,
  );
  out.push(
    `growth steps: n=${growth.length} ` +
      `(${((100 * growth.length) / deltas.length).toFixed(0)}%) ` +
      `median=${median(growth).toFixed(1)} mean=${mean(growth).toFixed(1)} MB`,
  );
  out.push(
    `GC steps: n=${reclaim.length} ` +
      `(${((100 * reclaim.length) / deltas.length).toFixed(0)}%) ` +
      `median=${median(reclaim).toFixed(1)} mean=${mean(reclaim).toFixed(
        1,
      )} MB ` +
      `biggest=${Math.min(...reclaim).toFixed(1)} MB`,
  );
  out.push(
    `net slope: endpoint=${(
      (used.at(-1)! - used[0]) /
      (used.length - 1)
    ).toFixed(3)} ` +
      `MB/trial, linear-fit=${fit.slope.toFixed(
        3,
      )} MB/trial (R²=${fit.r2.toFixed(2)})`,
  );
  const totals = nums(rows, "heapTotalBeforeDrawing (MB)");
  if (totals.length > 1)
    out.push(
      `heapTotal MB: first=${totals[0].toFixed(1)} last=${totals
        .at(-1)!
        .toFixed(1)} ` + `max=${Math.max(...totals).toFixed(1)}`,
    );
  const limits = nums(rows, "heapLimitBeforeDrawing (MB)");
  if (limits.length)
    out.push(`heapLimit MB (constant): ${limits[0].toFixed(0)}`);
  const blanks = csvColumn(rows, "heapUsedBeforeDrawing (MB)").filter(
    (v) => v.trim() !== "" && !Number.isFinite(Number(v)),
  ).length;
  if (blanks) out.push(`rows with NO heap sample: ${blanks}`);
  // Post-GC envelope: the sawtooth valleys. Comparing per-block MINIMA
  // (each block's floor ≈ post-GC level) isolates the residue that survives
  // GC from the per-trial churn, which the raw per-trial slope conflates.
  const blockIdx = rows[0]?.indexOf("block") ?? -1;
  const usedIdx = rows[0]?.indexOf("heapUsedBeforeDrawing (MB)") ?? -1;
  if (blockIdx >= 0 && usedIdx >= 0) {
    const perBlock = new Map<string, number[]>();
    for (const r of rows.slice(1)) {
      const v = r[usedIdx]?.trim();
      if (!v) continue;
      const b = r[blockIdx];
      if (!perBlock.has(b)) perBlock.set(b, []);
      perBlock.get(b)!.push(Number(v));
    }
    const mins = [...perBlock.values()].map((v) => Math.min(...v));
    const perBlockTrials = used.length / Math.max(perBlock.size, 1);
    const fit2 = linfit(mins);
    if (mins.length > 1)
      out.push(
        `post-GC envelope (block minima): ${mins[0].toFixed(1)} → ${mins
          .at(-1)!
          .toFixed(1)} MB ` +
          `over ${mins.length} blocks, ${(fit2.slope / perBlockTrials).toFixed(
            3,
          )} MB/trial ` +
          `(R²=${fit2.r2.toFixed(2)})`,
      );
  }
  return out;
}

function summarizeTelemetry(rows: string[][]): string[] {
  const out: string[] = [];
  const live = csvColumn(rows, "heapSampleLiveBool")
    .map((v) => v.trim())
    .filter((v) => v !== "");
  if (live.length) {
    let verdict: string;
    if (live.every((v) => v === "TRUE")) verdict = "TRUE";
    else if (live.some((v) => v === "FALSE"))
      verdict = "FALSE (heap columns are a constant)";
    else verdict = live.join(",");
    out.push(
      `heapSampleLiveBool: ${verdict} (${live.length}/${rows.length - 1} rows)`,
    );
  }
  const counts = nums(rows, "textureCacheCount");
  const mb = nums(rows, "textureCacheMB");
  if (counts.length && mb.length) {
    const cFit = linfit(counts);
    out.push(
      `textures: count ${counts[0]}→${counts.at(-1)} (max ${Math.max(
        ...counts,
      )}, ` +
        `${cFit.slope >= 0 ? "+" : ""}${cFit.slope.toFixed(3)}/trial) ` +
        `MB ${mb[0].toFixed(1)}→${mb.at(-1)!.toFixed(1)} (max ${Math.max(
          ...mb,
        ).toFixed(1)})`,
    );
  }
  return out;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  mkdirSync(opts.outDir, { recursive: true });
  const jsonlPath = jsonlPathFor(opts.table, opts.seed);
  mkdirSync(path.dirname(jsonlPath), { recursive: true });
  // An orphaned dev server on our port makes the run attach to a stale build.
  try {
    execSync(`lsof -ti:${opts.port} | xargs kill -9 2>/dev/null; true`, {
      shell: "zsh",
    });
  } catch {}

  const result = await simulate(opts.table, {
    headless: true,
    port: opts.port,
    seed: opts.seed,
    stuckTimeoutMs: 30_000,
    jsonlPath,
  });

  const csvNames = Object.keys(result.csvFiles);
  const main = csvNames.find((n) => n.endsWith(".csv"));
  if (!main) {
    console.error(`no results CSV captured (status=${result.status})`);
    process.exit(1);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const csvPath = path.join(opts.outDir, `${opts.table}-${stamp}.csv`);
  writeFileSync(csvPath, result.csvFiles[main]);

  const rows = parseCsv(result.csvFiles[main]);
  const lines = [
    `MEM-BASELINE table=${opts.table} seed=${opts.seed} status=${result.status} ` +
      `trials=${result.trialsCompleted}/${result.trialsTotal} ` +
      `duration=${(result.durationMs / 1000).toFixed(0)}s ` +
      `(${(
        result.durationMs /
        1000 /
        Math.max(result.trialsCompleted, 1)
      ).toFixed(1)}s/trial)`,
    `console errors: ${result.consoleErrors.length}`,
    `warnings: ${result.warnings.length}`,
    ...summarizeHeap(rows),
    ...summarizeTelemetry(rows),
    `csv: ${csvPath}`,
  ];
  const text = lines.join("\n");
  console.log("\n" + text + "\n");
  writeFileSync(
    path.join(opts.outDir, `${opts.table}-${stamp}.json`),
    JSON.stringify(
      {
        opts,
        summary: text,
        status: result.status,
        trialsCompleted: result.trialsCompleted,
        trialsTotal: result.trialsTotal,
        durationMs: result.durationMs,
        consoleErrors: result.consoleErrors,
        warnings: result.warnings,
      },
      null,
      1,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
