// @ts-nocheck — CLI entry file. Uses .ts import for Node's --experimental-strip-types.
/**
 * A/B screenshot harness — compare an experiment's screens between the
 * current working tree and a clean checkout of a git ref (default HEAD).
 *
 * For each side it runs the full simulated-participant pipeline
 * (server/simulate.ts) with screenshotOnChangeBool, so every distinct screen
 * (instruction overlays, modals, trials) is captured as NN-phase-trial.png.
 *
 * The ref side runs in a temporary git worktree under /tmp (node_modules
 * symlinked, built example copied over), so the working tree is never
 * touched — no stashing needed.
 *
 * Usage:
 *   npm run simulate:ab -- <tableName> [--ref=HEAD] [--out=DIR]
 *          [--seed=1] [--port=5700] [--headful]
 *
 * (Must run via Node's type stripping or ts-node — NOT tsx. tsx/esbuild's
 * keepNames wraps functions in a `__name` helper that does not exist when
 * Playwright stringifies page.evaluate callbacks into the browser.)
 *
 * Prerequisites: the table must already be built in the working tree
 * (examples/generated/<tableName>/). Build with:
 *   (cd examples && npx ts-node buildExamples.ts <tableName>.csv --simulate)
 *
 * Output:
 *   <out>/changes/*.png   — current working tree
 *   <out>/<ref>/*.png     — clean ref checkout
 * Matching NN prefixes are comparable screens (same state signature order).
 */

import { execSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
  cpSync,
  copyFileSync,
} from "fs";
import * as path from "path";
import { simulate } from "./simulate.ts";
import type { SimulateResult } from "./simulate.ts";

interface AbArgs {
  tableName: string;
  ref: string;
  out: string;
  seed: number;
  port: number;
  headless: boolean;
}

function parseArgs(argv: string[]): AbArgs {
  const positional = argv.slice(2).filter((a) => !a.startsWith("--"));
  const get = (name: string, def: string) =>
    argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
  if (positional.length === 0) {
    console.error(
      "Usage: npm run simulate:ab -- <tableName> [--ref=HEAD] [--out=DIR] [--seed=1] [--port=5700] [--headful]",
    );
    process.exit(1);
  }
  const ref = get("ref", "HEAD");
  return {
    tableName: positional[0].replace(/\.csv$/, ""),
    ref,
    out: get(
      "out",
      `/tmp/ee-ab-${positional[0].replace(/\.csv$/, "")}-${ref.replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      )}`,
    ),
    seed: parseInt(get("seed", "1"), 10),
    port: parseInt(get("port", "5700"), 10),
    headless: !argv.includes("--headful"),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const root = execSync("git rev-parse --show-toplevel").toString().trim();
  const refSlug = args.ref.replace(/[^a-zA-Z0-9_-]/g, "_");
  // The worktree must be named like the repo and sit beside a `source` dir,
  // because some imports reach OUT of the repo (e.g. components/
  // save-snapshots/boxIntegration.js imports ../../../source/sentry — the
  // website's source/, a sibling of the repo root). Mirror that layout under
  // /tmp with a symlinked source/.
  const abTmp = `/tmp/ee-ab-${refSlug}-${process.pid}`;
  const worktree = path.join(abTmp, path.basename(root));

  const generatedDir = path.join(root, "examples", "generated", args.tableName);
  const tableCsv = path.join(
    root,
    "examples",
    "tables",
    `${args.tableName}.csv`,
  );
  if (!existsSync(path.join(generatedDir, "index.html"))) {
    console.error(
      `Built example not found: ${generatedDir}\n` +
        `Build first: (cd examples && npx ts-node buildExamples.ts ${args.tableName}.csv --simulate)`,
    );
    process.exit(1);
  }

  mkdirSync(args.out, { recursive: true });
  const dirs = {
    changes: path.join(args.out, "changes"),
    [refSlug]: path.join(args.out, refSlug),
  };

  // Set up the ref worktree: clean checkout + symlinked node_modules +
  // the built example (built output is gitignored, so copy it in).
  console.log(`[ab] Creating worktree of ${args.ref} at ${worktree}`);
  mkdirSync(abTmp, { recursive: true });
  symlinkSync(
    path.join(path.dirname(root), "source"),
    path.join(abTmp, "source"),
  );
  execSync(`git worktree add --detach ${worktree} ${args.ref}`, { cwd: root });
  try {
    symlinkSync(
      path.join(root, "node_modules"),
      path.join(worktree, "node_modules"),
    );
    // The psychojs submodule is not materialized by `git worktree add` (it
    // leaves an empty placeholder dir). A SYMLINK breaks vite module
    // identity (vite realpaths the symlink, so psychojs/src files import
    // ../../components/* from the MAIN repo — duplicate module instances →
    // TDZ crashes). Copy the runtime-needed files instead (src + package.json
    // — the only psychojs paths imported, <1MB). Bare deps inside
    // psychojs/src (e.g. log4javascript) resolve up to the symlinked
    // node_modules; those are leaf packages that never import back into the
    // repo, so sharing them is safe.
    rmSync(path.join(worktree, "psychojs"), { recursive: true, force: true });
    mkdirSync(path.join(worktree, "psychojs"), { recursive: true });
    cpSync(
      path.join(root, "psychojs", "src"),
      path.join(worktree, "psychojs", "src"),
      { recursive: true },
    );
    copyFileSync(
      path.join(root, "psychojs", "package.json"),
      path.join(worktree, "psychojs", "package.json"),
    );
    // psychojs's own dependencies (log4javascript, pixi.js-legacy, howler,
    // tone — leaf packages that never import back into the repo) live in
    // psychojs/node_modules, not the root node_modules.
    symlinkSync(
      path.join(root, "psychojs", "node_modules"),
      path.join(worktree, "psychojs", "node_modules"),
    );
    mkdirSync(path.join(worktree, "examples", "tables"), { recursive: true });
    copyFileSync(
      tableCsv,
      path.join(worktree, "examples", "tables", `${args.tableName}.csv`),
    );
    cpSync(
      generatedDir,
      path.join(worktree, "examples", "generated", args.tableName),
      { recursive: true },
    );

    const sides: Array<{ label: string; cwd: string; port: number }> = [
      { label: "changes", cwd: root, port: args.port },
      { label: refSlug, cwd: worktree, port: args.port + 1 },
    ];

    const results: Record<string, SimulateResult> = {};
    for (const side of sides) {
      const screenshotDir = dirs[side.label as keyof typeof dirs];
      console.log(
        `[ab] Running ${args.tableName} (${side.label}, cwd=${side.cwd}, port=${side.port})`,
      );
      const result = await simulate(args.tableName, {
        port: side.port,
        seed: args.seed,
        cwd: side.cwd,
        headless: args.headless,
        stuckTimeoutMs: 45_000,
        screenshotDir,
        screenshotOnChangeBool: true,
        jsonlPath: "/dev/null",
      });
      results[side.label] = result;
      console.log(
        `[ab] ${side.label}: status=${result.status} ` +
          `trials=${result.trialsCompleted}/${result.trialsTotal} ` +
          `errors=${result.consoleErrors.length} ` +
          `screenshots=${readdirSync(screenshotDir).length}`,
      );
      if (result.consoleErrors.length)
        console.log(
          `[ab] ${side.label} console errors:`,
          result.consoleErrors.slice(0, 5),
        );
    }

    console.log(`\n[ab] Screenshots:`);
    for (const side of sides) {
      const dir = dirs[side.label as keyof typeof dirs];
      console.log(`  ${side.label}: ${dir}`);
      for (const f of readdirSync(dir).sort()) console.log(`    ${f}`);
    }
  } finally {
    console.log(`[ab] Removing worktree ${worktree}`);
    try {
      execSync(`git worktree remove --force ${worktree}`, { cwd: root });
    } catch {
      // fall through to rmSync
    }
    rmSync(abTmp, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
