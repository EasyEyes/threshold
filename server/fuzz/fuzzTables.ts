// @ts-nocheck — CLI entry file (run via tsx). Uses .ts import for the sim driver.
/**
 * Table fuzzer (`npm run fuzz`). Two tiers:
 *
 *   compiler — generate tables, run the real local compiler. Findings:
 *     a compile that THREW (crash) or ACCEPTED a planted invalidity.
 *   runtime  — generate (validity-biased) tables from the sim corpus,
 *     compile-filter them, build, simulate twice with the same seed, and
 *     diff the event streams. Findings: invariant violations and
 *     nondeterminism (a third arbitration run separates flakes).
 *
 * Everything is seeded: a batch prints its base seed, and
 * `--seed <base>` reproduces it exactly. History lives in fuzz/ (ledger.jsonl,
 * findings.jsonl; gitignored). Exit 0 = no new open findings, 1 = findings
 * filed, 2 = usage/environment error.
 *
 * Usage: npm run fuzz -- [all|compiler|runtime] [-n count] [--seed n]
 *        [--invalid-frac f] [--no-minimize] [--forever] [--report]
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { join, resolve } from "path";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { spawnSync } from "child_process";
import { parseFuzzArgs, type FuzzArgs } from "./parseArgs";
import {
  loadSpecFromCache,
  initCompiler,
  compileOne,
  stillContainsInvalid,
} from "./tier1";
import { generateTable, parseCsv, type GenResult } from "./tableGen";
import { Ledger } from "./ledger";
import { ddmin } from "./minimizer";
import { checkInvariants, signatureOf, arbitrationOutcome } from "./oracles";
import { diffStreams } from "../diffEvents.ts";

const REPO = resolve(__dirname, "../..");
const EXAMPLES = join(REPO, "examples");
const TABLES = join(EXAMPLES, "tables");
const GENERATED = join(EXAMPLES, "generated");
const LEDGER_DIR = join(REPO, "fuzz");
const FINDINGS_TABLES = join(LEDGER_DIR, "tables");

const FUZZ_PREFIX = "fuzz-TMP-";

const corpus = (suffix?: string): { name: string; csv: string }[] =>
  readdirSync(TABLES)
    .filter(
      (f) =>
        f.endsWith(".csv") &&
        !f.startsWith(FUZZ_PREFIX) &&
        (suffix === undefined || f.endsWith(suffix)),
    )
    .map((f) => ({ name: f, csv: readFileSync(join(TABLES, f), "utf8") }));

const batchName = () =>
  `batch-${new Date().toISOString().replace(/[:.]/g, "-")}`;

/** Minimize a compiler finding and persist the shrunk table for repro. */
const minimizeCompilerFinding = async (
  gen: GenResult,
  keepFailing: (candidate: string[][], out: { outcome: string }) => boolean,
): Promise<{ path: string; calls: number }> => {
  mkdirSync(FINDINGS_TABLES, { recursive: true });
  const rows = parseCsv(gen.csv);
  const { rows: shrunk, calls } = await ddmin(
    rows,
    async (candidate) => {
      if (gen.invalid && !stillContainsInvalid(gen.invalid, candidate))
        return false; // the invalidity must survive minimization
      const dir = mkdtempSync(join(tmpdir(), "fuzz-min-"));
      const p = join(dir, "candidate.csv");
      writeFileSync(p, (await import("./tableGen")).toCsv(candidate));
      try {
        return keepFailing(candidate, await compileOne(p, EXAMPLES));
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    { maxCalls: 24 },
  );
  const path = join(FINDINGS_TABLES, `min-${Date.now()}.csv`);
  writeFileSync(path, (await import("./tableGen")).toCsv(shrunk));
  return { path, calls };
};

const runCompilerTier = async (
  args: FuzzArgs,
  spec,
  ledger: Ledger,
  batch: string,
  baseSeed: number,
): Promise<number> => {
  let newFindings = 0;
  const corp = corpus();
  const counts = ledger.loadCoverage();
  for (let i = 0; i < args.count; i++) {
    const genSeed = (baseSeed + i) >>> 0;
    const gen = generateTable({
      genSeed,
      spec,
      corpus: corp,
      invalidFrac: args.invalidFrac,
      counts,
    });
    const dir = mkdtempSync(join(tmpdir(), "fuzz-t1-"));
    const tablePath = join(dir, `${FUZZ_PREFIX}${genSeed}.csv`);
    writeFileSync(tablePath, gen.csv);
    let out;
    try {
      out = await compileOne(tablePath, EXAMPLES);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    let finding: { kind: string; signature: string } | null = null;
    if (out.outcome === "crashed")
      finding = {
        kind: "compiler-crash",
        signature: signatureOf("compiler-crash", out.errors[0] ?? "unknown"),
      };
    else if (gen.invalid && out.outcome === "accepted")
      finding = {
        kind: "oracle-miss",
        signature: signatureOf(
          "oracle-miss",
          `${gen.invalid.kind} ${gen.invalid.param} accepted`,
        ),
      };

    let tableForFinding = tablePath;
    if (finding && args.minimize) {
      const keepFailing =
        finding.kind === "compiler-crash"
          ? (_c, o) => o.outcome === "crashed"
          : (_c, o) => o.outcome === "accepted";
      const min = await minimizeCompilerFinding(gen, keepFailing);
      tableForFinding = min.path;
      console.log(`  minimized in ${min.calls} predicate calls → ${min.path}`);
    } else if (finding) {
      mkdirSync(FINDINGS_TABLES, { recursive: true });
      tableForFinding = join(FINDINGS_TABLES, `table-${genSeed}.csv`);
      writeFileSync(tableForFinding, gen.csv);
    }

    ledger.appendRecord({
      ts: Date.now(),
      tier: "compiler",
      batch,
      table: `${FUZZ_PREFIX}${genSeed}.csv`,
      genSeed,
      origin: gen.origin,
      outcome: out.outcome,
      glossaryVersion: spec.version,
      params: gen.params,
      signature: finding?.signature,
    });

    if (finding) {
      const { filed } = ledger.recordFinding(
        {
          tier: "compiler",
          kind: finding.kind,
          signature: finding.signature,
          glossaryVersion: spec.version,
          tablePath: tableForFinding,
          repro: `npm run fuzz -- compiler -n 1 --seed ${genSeed}`,
        },
        batch,
      );
      if (filed) newFindings++;
      console.log(`  [${finding.kind}] ${finding.signature}`);
    }
  }
  return newFindings;
};

const buildSimTable = (name: string): void => {
  const res = spawnSync(
    "npm",
    ["run", "example", "--", `${name}.csv`, "--simulate"],
    { cwd: REPO, encoding: "utf8", timeout: 300_000 },
  );
  if (res.status !== 0)
    throw new Error(
      `build failed for ${name}: ${(res.stderr ?? "").slice(-400)}`,
    );
};

/** Remove every fuzz-TMP artifact the runtime tier created. */
const cleanRuntimeArtifacts = (name: string): void => {
  const table = join(TABLES, `${name}.csv`);
  if (existsSync(table)) rmSync(table);
  const built = join(GENERATED, name);
  if (existsSync(built)) rmSync(built, { recursive: true, force: true });
};

const runRuntimeTier = async (
  args: FuzzArgs,
  spec,
  ledger: Ledger,
  batch: string,
  baseSeed: number,
): Promise<number> => {
  const { simulate } = await import("../simulate.ts");
  let newFindings = 0;
  const corp = corpus("-sim.csv");
  const counts = ledger.loadCoverage();
  for (let i = 0; i < args.count; i++) {
    const genSeed = (baseSeed + i) >>> 0;
    const gen = generateTable({
      genSeed,
      spec,
      corpus: corp,
      invalidFrac: 0, // runtime tables must compile — invalid ones are tier 1's job
      counts,
      validityBias: true,
    });
    const name = `${FUZZ_PREFIX}${genSeed}`;
    writeFileSync(join(TABLES, `${name}.csv`), gen.csv);

    let outcome = "accepted";
    let finding: { kind: string; signature: string } | null = null;
    try {
      // Compile filter: only runnable tables reach the browser.
      const compiled = await compileOne(join(TABLES, `${name}.csv`), EXAMPLES);
      if (compiled.outcome !== "accepted") {
        outcome = compiled.outcome;
      } else {
        buildSimTable(name);
        const r1 = await simulate(name, { seed: 1 });
        const r2 = await simulate(name, { seed: 1 });
        const inv = checkInvariants(r1.events);
        if (!inv.ok) {
          outcome = "invariant-violation";
          finding = {
            kind: "invariant-violation",
            signature: signatureOf("invariant", inv.violations.join("; ")),
          };
        } else if (!diffStreams(r1.events, r2.events).equal) {
          const third = await simulate(name, { seed: 1 }).then(
            (events) => ({ threw: null, events: events.events }),
            (threw) => ({ threw, events: null }),
          );
          const verdict = arbitrationOutcome(r1.events, r2.events, third);
          outcome = verdict;
          if (verdict === "nondeterminism")
            finding = {
              kind: "nondeterminism",
              signature: signatureOf(
                "nondeterminism",
                `${name} diverges at seed 1`,
              ),
            };
        } else {
          outcome = r1.status;
        }
      }
    } catch (err) {
      outcome = "crashed";
      finding = {
        kind: "runtime-crash",
        signature: signatureOf("runtime-crash", String(err)),
      };
    } finally {
      cleanRuntimeArtifacts(name);
    }

    ledger.appendRecord({
      ts: Date.now(),
      tier: "runtime",
      batch,
      table: `${name}.csv`,
      genSeed,
      origin: gen.origin,
      outcome,
      glossaryVersion: spec.version,
      params: gen.params,
      signature: finding?.signature,
    });

    if (finding) {
      mkdirSync(FINDINGS_TABLES, { recursive: true });
      const tableForFinding = join(FINDINGS_TABLES, `table-${genSeed}.csv`);
      writeFileSync(tableForFinding, gen.csv);
      const { filed } = ledger.recordFinding(
        {
          tier: "runtime",
          kind: finding.kind,
          signature: finding.signature,
          glossaryVersion: spec.version,
          tablePath: tableForFinding,
          repro: `npm run fuzz -- runtime -n 1 --seed ${genSeed}`,
        },
        batch,
      );
      if (filed) newFindings++;
      console.log(`  [${finding.kind}] ${finding.signature}`);
    }
    console.log(`  ${name}: ${outcome}`);
  }
  return newFindings;
};

const main = async (): Promise<number> => {
  let args: FuzzArgs;
  try {
    args = parseFuzzArgs(process.argv.slice(2));
  } catch (err) {
    console.error(String((err as Error).message ?? err));
    return 2;
  }

  let spec;
  try {
    spec = loadSpecFromCache(EXAMPLES);
    initCompiler(EXAMPLES);
  } catch (err) {
    console.error(String((err as Error).message ?? err));
    return 2;
  }

  const ledger = new Ledger(LEDGER_DIR);
  const tiers =
    args.tier === "all" ? (["compiler", "runtime"] as const) : [args.tier];

  do {
    const batch = batchName();
    const baseSeed = args.seedExplicit
      ? args.seed!
      : Math.floor(Math.random() * 2 ** 31);
    console.log(
      `fuzz tier=${args.tier} count=${args.count} seed=${baseSeed} batch=${batch} glossary=${spec.version}`,
    );
    let newFindings = 0;
    for (const tier of tiers) {
      newFindings +=
        tier === "compiler"
          ? await runCompilerTier(args, spec, ledger, batch, baseSeed)
          : await runRuntimeTier(args, spec, ledger, batch, baseSeed);
    }
    if (args.report || newFindings > 0)
      console.log(ledger.buildReport(spec, batch));
    if (!args.forever) return newFindings > 0 ? 1 : 0;
    if (args.seedExplicit)
      console.log(
        "note: --forever with an explicit --seed replays the same tables",
      );
  } while (true);
};

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(2);
  },
);
