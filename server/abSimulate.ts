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
 *          [--seed=1] [--port=5700] [--headful] [--video]
 *          [--sim-opt=KEY=VALUE...]
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
  writeFileSync,
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
  video: boolean;
  simOptions: Record<string, unknown>;
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
    video: argv.includes("--video"),
    simOptions: parseAbSimOpts(argv),
  };
}

function parseAbSimOpts(argv: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const a of argv) {
    if (!a.startsWith("--sim-opt=")) continue;
    const kv = a.slice("--sim-opt=".length);
    const eq = kv.indexOf("=");
    if (eq <= 0) continue;
    const raw = kv.slice(eq + 1);
    try {
      out[kv.slice(0, eq)] = JSON.parse(raw);
    } catch {
      out[kv.slice(0, eq)] = raw;
    }
  }
  return out;
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
        video: args.video,
        simOptions: args.simOptions,
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

    const guardrails = writeAbReport({
      out: args.out,
      tableName: args.tableName,
      ref: args.ref,
      seed: args.seed,
      dirs,
      refSlug,
      results,
    });
    if (guardrails.statusRegressed || guardrails.errorsRegressed) {
      process.exitCode = 2; // guardrail regression — see report.md
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

// ---------------------------------------------------------------------------
// Ground-truth report: report.md (human/LLM-readable side-by-side) +
// ground-truth.json (structured diff input). Screenshots are paired by their
// NN- order prefix (the sim numbers screens in state-signature order), so a
// screen present on one side only shows as a gap — exactly the A/B signal.
// ---------------------------------------------------------------------------
function csvColumns(csv: string): { header: string[]; rows: number } {
  const firstLine = csv.split(/\r?\n/, 1)[0] ?? "";
  // XLSX-style quoting: split on commas outside quotes (good enough for
  // header detection).
  const header = firstLine
    .replace(/^\ufeff/, "")
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((c) => c.replace(/^"|"$/g, ""));
  return { header, rows: csv.split(/\r?\n/).filter(Boolean).length - 1 };
}

function writeAbReport({
  out,
  tableName,
  ref,
  seed,
  dirs,
  refSlug,
  results,
}: {
  out: string;
  tableName: string;
  ref: string;
  seed: number;
  dirs: Record<string, string>;
  refSlug: string;
  results: Record<string, SimulateResult>;
}) {
  const before = results[refSlug];
  const after = results.changes;
  const shot = (side: string) =>
    readdirSync(dirs[side])
      .filter((f) => f.endsWith(".png"))
      .sort();
  const beforeShots = shot(refSlug);
  const afterShots = shot("changes");
  const nn = (f: string) => f.split("-", 1)[0];
  const allNn = Array.from(
    new Set([...beforeShots, ...afterShots].map(nn)),
  ).sort();

  const textSets = (r?: SimulateResult, k?: "swalPopupTexts") =>
    (r?.[k] ?? []) as string[];
  const beforeSwal = textSets(before, "swalPopupTexts");
  const afterSwal = textSets(after, "swalPopupTexts");
  const beforeTitles = before?.eePopupTitles ?? [];
  const afterTitles = after?.eePopupTitles ?? [];

  const mainCsvName = (r?: SimulateResult) =>
    Object.keys(r?.csvFiles ?? {}).find(
      (n) => n.endsWith(".csv") && !/_(stimulus|cursor)\.csv$/.test(n),
    );
  const beforeCsv = mainCsvName(before);
  const afterCsv = mainCsvName(after);
  const beforeCols = beforeCsv
    ? csvColumns(before.csvFiles[beforeCsv]).header
    : [];
  const afterCols = afterCsv ? csvColumns(after.csvFiles[afterCsv]).header : [];
  const colsAdded = afterCols.filter((c) => !beforeCols.includes(c));
  const colsRemoved = beforeCols.filter((c) => !afterCols.includes(c));

  // Guardrails: the CHANGES side must not regress vs the ref side. New
  // screens/popups/columns are expected and fine; failures and console-error
  // growth are not.
  const statusRegressed =
    before?.status === "completed" && after?.status !== "completed";
  const errorsRegressed =
    (after?.consoleErrors.length ?? 0) > (before?.consoleErrors.length ?? 0);

  const L: string[] = [];
  L.push(`# A/B ground-truth report — ${tableName}`);
  L.push("");
  L.push(
    `- ref: \`${ref}\` · seed: ${seed} · generated: ${new Date().toISOString()}`,
  );
  L.push(
    `- status: before=${before?.status ?? "?"} after=${
      after?.status ?? "?"
    } · trials: ${before?.trialsCompleted ?? "?"}/${
      before?.trialsTotal ?? "?"
    } → ${after?.trialsCompleted ?? "?"}/${after?.trialsTotal ?? "?"}`,
  );
  L.push(
    `- console errors: before=${before?.consoleErrors.length ?? "?"} after=${
      after?.consoleErrors.length ?? "?"
    }`,
  );
  L.push(
    `- videos: ${before?.videoPath ? `before=${before.videoPath} ` : ""}${
      after?.videoPath ? `after=${after.videoPath}` : ""
    }`,
  );
  L.push(
    `- guardrails: ${
      statusRegressed || errorsRegressed ? "**REGRESSION**" : "ok"
    }`,
  );
  L.push("");

  L.push("## Screens (paired by order prefix)");
  L.push("");
  L.push("| # | before (ref) | after (changes) | note |");
  L.push("|---|---|---|---|");
  for (const n of allNn) {
    const b = beforeShots.find((f) => nn(f) === n);
    const a = afterShots.find((f) => nn(f) === n);
    const note = !b
      ? "only-after (new screen)"
      : !a
      ? "only-before (removed screen)"
      : b === a
      ? ""
      : "same index, different screen";
    L.push(
      `| ${n} | ${b ? `![before](../${refSlug}/${b})<br/>\`${b}\`` : "—"} | ${
        a ? `![after](../changes/${a})<br/>\`${a}\`` : "—"
      } | ${note} |`,
    );
  }
  L.push("");

  const diffList = (name: string, b: string[], a: string[]) => {
    L.push(`### ${name}`);
    const added = a.filter((x) => !b.includes(x));
    const removed = b.filter((x) => !a.includes(x));
    L.push(`- added (${added.length}):`);
    for (const x of added) L.push(`  - ${JSON.stringify(x.slice(0, 200))}`);
    L.push(`- removed (${removed.length}):`);
    for (const x of removed) L.push(`  - ${JSON.stringify(x.slice(0, 200))}`);
    L.push("");
  };
  L.push("## Popup/title diffs");
  L.push("");
  diffList("Swal popup texts", beforeSwal, afterSwal);
  diffList("EasyEyes popup titles", beforeTitles, afterTitles);

  L.push("## Results CSV diffs");
  L.push("");
  L.push(`- file: ${beforeCsv ?? "—"} → ${afterCsv ?? "—"}`);
  L.push(`- columns added: ${JSON.stringify(colsAdded)}`);
  L.push(`- columns removed: ${JSON.stringify(colsRemoved)}`);
  const soundCols = afterCols.filter((c) =>
    /sound|Sink|speaker|headphone/i.test(c),
  );
  for (const c of soundCols) {
    const vals = Array.from(
      new Set(
        (after?.csvFiles[afterCsv!] ?? "")
          .split(/\r?\n/)
          .slice(1)
          .map(
            (line) =>
              line
                .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
                .map((x) => x.replace(/^"|"$/g, ""))[afterCols.indexOf(c)] ??
              "",
          ),
      ),
    ).filter(Boolean);
    L.push(`- ${c}: ${JSON.stringify(vals.slice(0, 5))}`);
  }
  L.push("");

  L.push("## Sound-output ground truth (after side)");
  L.push("");
  L.push(
    `- sink calls: ${JSON.stringify(after?.sinkCalls ?? [], null, 0).slice(
      0,
      2000,
    )}`,
  );
  L.push(
    `- driver actions: ${JSON.stringify(
      after?.soundOutputActions ?? [],
      null,
      0,
    ).slice(0, 2000)}`,
  );
  L.push("");

  const reportPath = path.join(out, "report.md");
  writeFileSync(reportPath, L.join("\n"));
  writeFileSync(
    path.join(out, "ground-truth.json"),
    JSON.stringify(
      {
        table: tableName,
        ref,
        seed,
        before: before && {
          status: before.status,
          trials: [before.trialsCompleted, before.trialsTotal],
          consoleErrors: before.consoleErrors,
          warnings: before.warnings,
          swalPopupTexts: before.swalPopupTexts,
          eePopupTitles: before.eePopupTitles,
          csvColumns: beforeCols,
          sinkCalls: before.sinkCalls,
          soundOutputActions: before.soundOutputActions,
          mediaPlays: before.mediaPlays,
          videoPath: before.videoPath,
          screenshots: beforeShots,
        },
        after: after && {
          status: after.status,
          trials: [after.trialsCompleted, after.trialsTotal],
          consoleErrors: after.consoleErrors,
          warnings: after.warnings,
          swalPopupTexts: after.swalPopupTexts,
          eePopupTitles: after.eePopupTitles,
          csvColumns: afterCols,
          sinkCalls: after.sinkCalls,
          soundOutputActions: after.soundOutputActions,
          mediaPlays: after.mediaPlays,
          videoPath: after.videoPath,
          screenshots: afterShots,
        },
        guardrails: { statusRegressed, errorsRegressed },
      },
      null,
      2,
    ),
  );
  console.log(`[ab] Report: ${reportPath}`);
  console.log(`[ab] Ground truth: ${path.join(out, "ground-truth.json")}`);
  if (statusRegressed || errorsRegressed) {
    console.log(`[ab] GUARDRAIL REGRESSION — see report.md`);
  }
  return { statusRegressed, errorsRegressed };
}
