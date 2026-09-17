// @ts-nocheck — CLI entry file. Uses .ts import paths for Node's --experimental-strip-types (see simulate.cli.ts).
/**
 * Gold-standard verification for the nearest-point-bug repair math.
 *
 * Runs a REAL experiment (sim participant) against a worktree of a BUGGY
 * commit, with known rc tracking data injected
 * (improvedDistanceTrackingNearestXYPx), then verifies the two claims the
 * repair tool depends on:
 *
 *   CHECK A (data path): the logged `nearpointXYPxAppleCoords` inverts, via
 *   the window size, to exactly the injected nearest-point value — ie the
 *   CSV carries the exact transform input, recoverable per row.
 *
 *   CHECK B (render path): the pixels actually rendered (deg grid lines in
 *   the screenshot) follow the transformCore math computed with the
 *   recovered input (nearest = injected raw value), and NOT the correctly
 *   converted params — proving the repair math reproduces what buggy code
 *   actually drew, end to end.
 *
 * Usage: npm run verify:repair -- [--ref=c382d63b] [--table=grid-nearest-point-sim]
 *        [--injected=740,300] [--out=/tmp/repairVerify]
 *
 * Run with node --experimental-strip-types (NOT tsx; it shells out to a
 * dev server under Playwright).
 */
import { execSync } from "child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  cpSync,
  writeFileSync,
} from "fs";
import * as path from "path";
import { PNG } from "pngjs";
import { simulate } from "./simulate.ts";
import type { SimulateResult } from "./simulate.ts";
import {
  xyPxOfDegCore,
  type TransformParams,
} from "../components/multiple-displays/transformCore.ts";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const eq = a.indexOf("=");
      return [a.slice(2, eq), a.slice(eq + 1)];
    }),
);
const REF = args.ref ?? "c382d63b"; // last commit with the nearest-point bug
const TABLE = args.table ?? "grid-nearest-point-sim";
const INJECTED = (args.injected ?? "740,300")
  .split(",")
  .map(Number) as number[];
const OUT = args.out ?? "/tmp/repairVerify";
const PORT = Number(args.port ?? 5750);

// The sim viewport (Playwright default) — also the window size the run's
// getScreenDimensions reports for appleCoords. The real repair tool derives
// this from the CSV and flags uncertainty; here it is known by construction.
const WINDOW = [1280, 720];

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

/** Build a runnable worktree of `ref` (pattern proven in abSimulate.ts). */
function buildRefWorktree(root: string, ref: string, tableName: string) {
  const tmp = `/tmp/ee-repairverify-${ref}-${process.pid}`;
  const worktree = path.join(tmp, path.basename(root));
  mkdirSync(tmp, { recursive: true });
  try {
    symlinkSync(
      path.join(path.dirname(root), "source"),
      path.join(tmp, "source"),
    );
  } catch {
    /* already exists from a previous run */
  }
  execSync(`git worktree add --detach ${worktree} ${ref}`, { cwd: root });
  symlinkSync(
    path.join(root, "node_modules"),
    path.join(worktree, "node_modules"),
  );
  // psychojs must be real files, not a symlink (vite module identity).
  rmSync(path.join(worktree, "psychojs"), { recursive: true, force: true });
  mkdirSync(path.join(worktree, "psychojs"));
  cpSync(
    path.join(root, "psychojs", "src"),
    path.join(worktree, "psychojs", "src"),
    {
      recursive: true,
    },
  );
  copyFileSync(
    path.join(root, "psychojs", "package.json"),
    path.join(worktree, "psychojs", "package.json"),
  );
  symlinkSync(
    path.join(root, "psychojs", "node_modules"),
    path.join(worktree, "psychojs", "node_modules"),
  );
  mkdirSync(path.join(worktree, "examples", "tables"), { recursive: true });
  copyFileSync(
    path.join(root, "examples", "tables", `${tableName}.csv`),
    path.join(worktree, "examples", "tables", `${tableName}.csv`),
  );
  cpSync(
    path.join(root, "examples", "generated", tableName),
    path.join(worktree, "examples", "generated", tableName),
    { recursive: true },
  );
  return { tmp, worktree };
}

function parseCsvCell(csv: string, column: string): string | undefined {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  const i = header.indexOf(column);
  if (i < 0) return undefined;
  for (const line of lines.slice(1)) {
    const cells = line
      .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      .map((x) => x.replace(/^"|"$/g, ""));
    const v = cells[i];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

/** Greenish-run centers (deg-grid teal #007056, 0.9 opacity) on one row. */
function greenRunCenters(png: PNG, row: number, minX = 0, maxX = png.width) {
  const centers: number[] = [];
  let runStart = -1;
  const isGridPixel = (x: number) => {
    const idx = (png.width * row + x) << 2;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    // Teal family: blended on white (26,126,103) or black (0,101,77).
    return g > r + 50 && g > b + 10 && b > r;
  };
  for (let x = minX; x < maxX; x++) {
    if (isGridPixel(x)) {
      if (runStart < 0) runStart = x;
    } else if (runStart >= 0) {
      centers.push((runStart + x - 1) / 2);
      runStart = -1;
    }
  }
  if (runStart >= 0) centers.push((runStart + maxX - 1) / 2);
  return centers;
}

async function main() {
  const root = execSync("git rev-parse --show-toplevel").toString().trim();
  mkdirSync(OUT, { recursive: true });
  const { tmp, worktree } = buildRefWorktree(root, REF, TABLE);
  let result: SimulateResult;
  try {
    console.log(
      `[repairVerify] simulating ${TABLE} @ ${REF} (injected nearestXYPx ${INJECTED})`,
    );
    result = await simulate(TABLE, {
      port: PORT,
      seed: 1,
      cwd: worktree,
      headless: true,
      stuckTimeoutMs: 45_000,
      screenshotDir: path.join(OUT, "shots"),
      screenshotOnChangeBool: true,
      jsonlPath: path.join(OUT, "events.jsonl"),
      simOptions: { improvedDistanceTrackingNearestXYPx: INJECTED },
    });
  } finally {
    execSync(`git worktree remove --force ${worktree}`, { cwd: root });
    rmSync(tmp, { recursive: true, force: true });
  }

  console.log(
    `[repairVerify] status=${result.status} trials=${result.trialsCompleted}/${result.trialsTotal}`,
  );
  const mainCsvName = Object.keys(result.csvFiles).find(
    (n) => n.endsWith(".csv") && !/_(stimulus|cursor)\.csv$/.test(n),
  );
  if (!mainCsvName) fail("no results CSV captured from the run");
  const csv = result.csvFiles[mainCsvName];
  writeFileSync(path.join(OUT, "buggy-run.csv"), csv);

  // ---- CHECK A: appleCoords inverts to the injected value -------------
  const appleCoordsRaw = parseCsvCell(csv, "nearpointXYPxAppleCoords");
  if (!appleCoordsRaw) fail("nearpointXYPxAppleCoords missing from CSV");
  const [ax, ay] = appleCoordsRaw.split(",").map((v) => Number(v.trim()));
  const recovered = [ax - WINDOW[0] / 2, WINDOW[1] / 2 - ay];
  const errA = Math.hypot(
    recovered[0] - INJECTED[0],
    recovered[1] - INJECTED[1],
  );
  console.log(
    `  appleCoords "${appleCoordsRaw}" -> recovered nearestUsed [${recovered}] vs injected [${INJECTED}] (err ${errA.toFixed(
      2,
    )}px)`,
  );
  // floor() in the logger costs <1px per axis.
  if (errA > 1.5) fail(`CHECK A failed: recovery error ${errA.toFixed(2)}px`);
  console.log("✓ CHECK A: CSV carries the exact transform input");

  // ---- Params for render-path prediction, from the CSV (as the tool will) --
  const pxPerCm = Number(parseCsvCell(csv, "pxPerCm"));
  const screenWidthPx = Number(parseCsvCell(csv, "screenWidthPx"));
  const screenHeightPx = Number(parseCsvCell(csv, "screenHeightPx"));
  const viewingDistanceCm =
    Number(parseCsvCell(csv, "viewingDistancePredictedCm")) || 50;
  if (!(pxPerCm > 0)) fail(`pxPerCm missing/invalid: ${pxPerCm}`);
  const buggyParams: TransformParams = {
    pxPerCm,
    viewingDistanceCm,
    fixationXYPx: [0, 0], // fixationOriginXYScreen 0.5,0.5; static fixation
    nearestPointXYZPx: recovered, // what buggy code fed the transform
  };
  const correctParams: TransformParams = {
    ...buggyParams,
    nearestPointXYZPx: [
      recovered[0] - screenWidthPx / 2,
      screenHeightPx / 2 - recovered[1],
    ],
  };
  console.log(
    `  params: pxPerCm=${pxPerCm} dist=${viewingDistanceCm} screen=${screenWidthPx}x${screenHeightPx}`,
  );

  // ---- CHECK B: rendered grid lines follow the buggy math -------------
  const shots = readdirSync(path.join(OUT, "shots")).filter((f) =>
    /fixation-t1\.png$/.test(f),
  );
  if (!shots.length) fail("no fixation-t1 screenshot captured");
  const png = PNG.sync.read(readFileSync(path.join(OUT, "shots", shots[0])));
  const row = Math.round(png.height / 2); // y_px = 0 (fixation at center)
  const runs = greenRunCenters(png, row);
  console.log(`  detected ${runs.length} grid-colored runs at row ${row}`);

  // Fat deg-grid lines at x-deg 0, ±5, ±10 (grid.js: i % 5 === 0).
  const fatDegLines = [0, 5, -5, 10, -10];
  // The line at x-deg 0 passes under the fixation cross at the center row
  // (occluded), and the lines are CURVED under the buggy warp — so predict
  // each line's x at two rows by solving for the deg-y whose transform lands
  // on that row (bisection; y_px is strictly increasing in deg-y).
  const lineXAtRow = (degX: number, p: TransformParams, row: number) => {
    const targetY = png.height / 2 - row; // y-up px for this screenshot row
    let lo = -60;
    let hi = 60;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const y = (xyPxOfDegCore([degX, mid], p) as number[])[1];
      if (y < targetY) lo = mid;
      else hi = mid;
    }
    const e = (lo + hi) / 2;
    return (xyPxOfDegCore([degX, e], p) as number[])[0] + png.width / 2;
  };
  const scanRows = [row, row - 60];

  const matches = (p: TransformParams, tol: number) =>
    fatDegLines.filter((d) =>
      scanRows.some((r) => {
        const px = lineXAtRow(d, p, r);
        return greenRunCenters(png, r).some((c) => Math.abs(c - px) <= tol);
      }),
    );

  const buggyMatches = matches(buggyParams, 5);
  const correctMatches = matches(correctParams, 5);
  console.log(
    `  buggy-math matches: ${buggyMatches.length}/${
      fatDegLines.length
    } ${JSON.stringify(buggyMatches)}`,
  );
  console.log(
    `  correct-math matches (should NOT explain rendering): ${correctMatches.length}/${fatDegLines.length}`,
  );
  if (buggyMatches.length < fatDegLines.length)
    fail(
      `CHECK B failed: rendered lines follow buggy math for only ${buggyMatches.length}/${fatDegLines.length} fat lines`,
    );
  if (correctMatches.length >= buggyMatches.length)
    fail("CHECK B failed: correct math explains rendering at least as well");
  console.log(
    "✓ CHECK B: rendered pixels follow transformCore with the recovered buggy input",
  );
  console.log("\n[repairVerify] ALL CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
