/**
 * Unified single-screen `npm run coverage`.
 *
 * Stage 1 — jest (stdio inherited): the grid reporter owns the screen on a
 *           TTY; classic output when piped. Failure stops the chain.
 * Stage 2 — sim tier: a static 3-cell row in the same grid aesthetic.
 *           Per-table child output is swallowed; a failing table's captured
 *           tail prints below the row. Failure degrades to jest-only
 *           tracking (the report still runs).
 * Stage 3 — merged report: the giant istanbul table is swallowed on a TTY
 *           (files still written); the HTML path is echoed.
 * Stage 4 — track + TL;DR: concise, final.
 *
 * Non-TTY runs (pipes/CI) inherit every child's output unchanged.
 */

import { spawnSync } from "child_process";
import { existsSync, readdirSync, unlinkSync } from "fs";
import path from "path";

const grid = require("./jestGridReporter.js");

export const SIM_TABLES = [
  "image-identify-sim",
  "reading-identify-sim",
  "rsvpReading-identify-sim",
];

/** Mirrors the coverage:jest npm script (no shell quoting — argv is
 * literal). The per-file text table is intentionally omitted: the merged
 * union report at the end supersedes it. */
export const JEST_ARGS = [
  "--coverage",
  "--coverageReporters=json",
  "--coverageDirectory=coverage/jest",
  "--collectCoverageFrom=components/**/*.{js,ts}",
  "--collectCoverageFrom=!components/addons/**",
  "--collectCoverageFrom=threshold.js",
  "--collectCoverageFrom=first.js",
];

/** Last n lines of captured child output, for failure tails. */
export const tailOf = (text: string, n = 15): string =>
  text.trim().split("\n").slice(-n).join("\n");

/**
 * Static sim-tier region: one cell + one name per table, positions fixed,
 * only colors/statuses flip. Reuses the grid reporter's cell machinery.
 */
export const createSimTier = ({
  color,
  tables,
}: {
  color: boolean;
  tables: string[];
}) => {
  const state = grid.createGridState({ color, columns: 4096 });
  state.setTotalSuites(tables.length);
  tables.forEach((t) => state.onFileStart(t));
  const marks: (null | { ok: boolean; sec: number })[] = tables.map(() => null);
  const done = (i: number, ok: boolean, sec: number) => {
    marks[i] = { ok, sec };
    state.onFileResult(tables[i], {
      numFailingTests: ok ? 0 : 1,
      numPassingTests: ok ? 1 : 0,
      numPendingTests: 0,
    });
  };
  const lines = () => [
    `sim tier ${marks.filter(Boolean).length}/${tables.length}`,
    state.cells().join(" "),
    tables
      .map((t, i) => {
        const m = marks[i];
        return m ? `${t} ${m.ok ? "✓" : "✕"} ${m.sec}s` : `${t} ⏳`;
      })
      .join(" · "),
  ];
  return { done, lines, failed: () => marks.some((m) => m && !m.ok) };
};

const ROOT = process.cwd();
const isTTY = () => !!process.stdout.isTTY && !process.env.NO_COLOR;

const wipeBrowserDumps = () => {
  const dir = path.join(ROOT, "coverage", "browser");
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir))
    if (f.endsWith(".json")) unlinkSync(path.join(dir, f));
};

const bin = (name: string) => path.join(ROOT, "node_modules", ".bin", name);
const run = (
  name: string,
  args: string[],
  opts: Record<string, unknown> = {},
) => spawnSync(bin(name), args, { cwd: ROOT, ...opts } as any);

const main = () => {
  const tty = isTTY();

  // 1 — jest tier (json coverage only on a TTY — the union report
  // supersedes the per-file jest table; piped runs keep it)
  const jestArgs = tty ? JEST_ARGS : [...JEST_ARGS, "--coverageReporters=text"];
  const jestRun = run("jest", jestArgs, { stdio: "inherit" });
  if (jestRun.status !== 0) {
    console.error("jest tier failed — coverage report not updated");
    process.exit(1);
  }

  // 2 — sim tier
  wipeBrowserDumps();
  if (!tty) {
    const r = run(
      "tsx",
      ["server/simulate.cli.ts", ...SIM_TABLES, "--no-build", "--jobs=1"],
      { stdio: "inherit", env: { ...process.env, EE_COVERAGE: "1" } },
    );
    if (r.status !== 0) console.error("sim tier failed; tracking jest only");
  } else {
    console.log(); // one blank line below the jest grid
    const tier = createSimTier({ color: true, tables: SIM_TABLES });
    const renderer = grid.createRenderer(process.stdout);
    renderer.render(tier.lines());
    const failures: { table: string; out: string }[] = [];
    SIM_TABLES.forEach((table, i) => {
      const t0 = Date.now();
      const r = run("tsx", ["server/simulate.cli.ts", table, "--no-build"], {
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
        env: { ...process.env, EE_COVERAGE: "1" },
      });
      tier.done(i, r.status === 0, Math.round((Date.now() - t0) / 1000));
      renderer.render(tier.lines());
      if (r.status !== 0)
        failures.push({
          table,
          out: `${r.stdout ?? ""}${r.stderr ?? ""}`,
        });
    });
    if (failures.length) {
      console.log();
      for (const f of failures) {
        console.log(`✕ ${f.table}`);
        console.log(
          tailOf(f.out)
            .split("\n")
            .map((l) => `  ${l}`)
            .join("\n"),
        );
      }
      console.error("sim tier failed; tracking jest only");
    } else {
      console.log(); // close the sim region
    }
  }

  // 3 — merged report (files still written; the text table is TTY-swallowed)
  const report = tty
    ? run("tsx", ["server/coverageReport.ts"], {
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      })
    : run("tsx", ["server/coverageReport.ts"], { stdio: "inherit" });
  if (report.status !== 0) {
    if (tty)
      console.error(tailOf(`${report.stdout ?? ""}${report.stderr ?? ""}`, 25));
    process.exit(1);
  }
  if (tty) {
    const html = (report.stdout ?? "")
      .split("\n")
      .find((l) => l.startsWith("HTML:"));
    if (html) console.log(html.trim());
  }

  // 4 — track + TL;DR
  const track = run("tsx", ["server/coverageTrack.ts"], { stdio: "inherit" });
  process.exit(track.status ?? 0);
};

if (
  process.env.JEST_WORKER_ID === undefined &&
  process.argv[1]?.endsWith("coverageRun.ts")
)
  main();
