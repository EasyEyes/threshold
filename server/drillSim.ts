// @ts-nocheck — CLI entry file. Uses .ts import for Node's --experimental-strip-types.
/**
 * Determinism drill (1g-LITE): run one table N times with the SAME seed,
 * diff every run's event stream against run 1, report the first divergence
 * if any. Streams are ALWAYS saved to /tmp (so diff:events can re-examine
 * them); --keep additionally prints every run's stream path on success.
 *
 * Usage: npm run drill:sim -- [table] [runs=3] [--seed=1] [--keep]
 * Exit 0 = all identical, 1 = divergence, 2 = a run failed to complete.
 */
import { mkdirSync, writeFileSync } from "fs";
import * as path from "path";
import * as os from "os";
import { simulate } from "./simulate.ts";
import {
  diffStreams,
  serializeStream,
  envelopeSummary,
  type EventEnvelope,
} from "./diffEvents.ts";

const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith("--"));
const getNum = (name: string, def: number) => {
  const found = argv.find((a) => a.startsWith(`--${name}=`));
  return found ? parseInt(found.split("=")[1], 10) : def;
};

const table = (positional[0] ?? "letter-sim").replace(/\.csv$/, "");
const RUNS = Math.max(
  2,
  positional[1] ? parseInt(positional[1], 10) : getNum("runs", 3),
);
const SEED = getNum("seed", 1);
const keep = argv.includes("--keep");

const dir = path.join(os.tmpdir(), "easyeyes-sim", table, `drill-${SEED}`);
mkdirSync(dir, { recursive: true });

console.log(`drill: ${table} × ${RUNS} runs, seed=${SEED}`);
const streams: EventEnvelope[][] = [];
for (let i = 0; i < RUNS; i++) {
  const t0 = Date.now();
  const r = await simulate(table, { seed: SEED, headless: true });
  console.log(
    `  run ${i + 1}: ${r.status}, ${r.trialsCompleted}/${
      r.trialsTotal
    } trials, ` +
      `${r.events.length} events, ${((Date.now() - t0) / 1000).toFixed(0)}s`,
  );
  const streamPath = path.join(dir, `run-${i + 1}.jsonl`);
  writeFileSync(streamPath, serializeStream(r.events));
  if (keep || r.status !== "completed")
    console.log(`    stream: ${streamPath}`);
  if (r.status !== "completed") {
    console.error(`  run ${i + 1} FAILED — drill aborts (stream saved)`);
    process.exit(2);
  }
  streams.push(r.events);
}

let diverged = false;
for (let i = 1; i < RUNS; i++) {
  const d = diffStreams(streams[0], streams[i]);
  if (d.equal) {
    console.log(`  diff run1↔run${i + 1}: identical (${d.totalA} events)`);
    continue;
  }
  diverged = true;
  console.error(`  diff run1↔run${i + 1}: DIVERGENCE —`);
  console.error(`    common prefix: ${d.commonPrefix}`);
  console.error(
    `    first divergence: seq ${d.divergence?.seq} [${d.divergence?.channel}] ` +
      `${d.divergence?.type} (${d.divergence?.reason})`,
  );
  for (const fd of d.divergence?.fieldDiffs ?? []) {
    console.error(
      `      ${fd.field}: ${JSON.stringify(fd.a)} ≠ ${JSON.stringify(fd.b)}`,
    );
  }
  const first = streams[0][Math.max(0, d.commonPrefix - 1)];
  if (first)
    console.error(`    last agreeing event: ${envelopeSummary(first)}`);
  console.error(
    `    streams saved: ${dir}/run-{1,${
      i + 1
    }}.jsonl (npm run diff:events -- …)`,
  );
}
console.log(
  diverged ? "DRILL: DIVERGED ✗" : `DRILL: identical across ${RUNS} runs ✓`,
);
process.exit(diverged ? 1 : 0);
