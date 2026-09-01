/**
 * Seeded experiment-table generator for the fuzzer. Hybrid strategy:
 *  - mutation (60%): copy a corpus table, apply 1-2 structure-preserving ops
 *  - reroll (40%): keep a corpus table's structure, redraw every recognized
 *    value from its glossary pool
 * All randomness flows from mulberry32(genSeed) — a generated table is a pure
 * function of (genSeed, spec, corpus, invalidFrac, counts), so any finding is
 * reproducible. No parameter names are hardcoded; pools come from the adapter.
 *
 * Invalid planting (tier 1 only): either a bogus global param name (unknown to
 * the glossary) or a type-invalid value, tagged in the sidecar `invalid`.
 */
import Papa from "papaparse";
import { mulberry32 } from "../../components/simulationModel";
import type { GlossarySpec, ParamSpec } from "./glossaryAdapter";
import { valuePool, bogusValues } from "./glossaryAdapter";

export interface GenOptions {
  genSeed: number;
  spec: GlossarySpec;
  corpus: { name: string; csv: string }[];
  /** Fraction [0,1] of tables that get a planted invalidity (tier 1). */
  invalidFrac: number;
  /** Coverage counts (param → times fuzzed) for under-coverage biasing. */
  counts: Map<string, number>;
  /** Bias mutations toward validity (runtime tier: rare-global insertion and
   *  row deletion break cross-param pairings more often than value swaps). */
  validityBias?: boolean;
}
export interface GenResult {
  csv: string;
  /** Glossary params present in the generated table (for the coverage ledger). */
  params: string[];
  origin: string;
  invalid?: { kind: "bogus-param" | "bogus-value"; param: string };
}

/** Parse a CSV table into rows (cells), exactly like the compiler's Papa path. */
export function parseCsv(text: string): string[][] {
  return Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
}

/** Serialize rows back to CSV with proper quoting. */
export function toCsv(rows: string[][]): string {
  return Papa.unparse(rows);
}

const draw = <T>(rng: () => number, xs: T[]): T => xs[Math.floor(rng() * xs.length)];

/** Coverage-biased pick: favors rarely-fuzzed params (1/sqrt(1+count)). */
function pickWeighted(rng: () => number, candidates: ParamSpec[], counts: Map<string, number>): ParamSpec {
  const weights = candidates.map((c) => 1 / Math.sqrt(1 + (counts.get(c.name) ?? 0)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/** Non-empty value cell indices (col 1 and beyond) in a row. */
function valueCells(row: string[]): number[] {
  const cells: number[] = [];
  for (let i = 1; i < row.length; i++) if (row[i] !== undefined && row[i] !== "") cells.push(i);
  return cells;
}

const isProtected = (row: string[]) => {
  const name = (row[0] ?? "").trim();
  // The block row is table structure (block labels / condition names), not a
  // parameter row — never mutate or delete it.
  return name === "block" || name.startsWith("_");
};

function insertGlobal(rows: string[][], name: string, value: string): string[][] {
  // Underscore globals live above the block row and must stay alphabetical.
  const out = rows.map((r) => [...r]);
  let insertAt = 0;
  for (let i = 0; i < out.length; i++) {
    const cell = (out[i][0] ?? "").trim();
    if (cell === "block") break;
    if (cell.startsWith("_")) {
      insertAt = cell < name ? i + 1 : insertAt;
      if (cell > name) break;
    }
  }
  out.splice(insertAt, 0, [name, value]);
  return out;
}

export function generateTable(opts: GenOptions): GenResult {
  const { genSeed, spec, invalidFrac, counts } = opts;
  if (opts.corpus.length === 0)
    throw new Error(
      "fuzz corpus is empty — no example tables found under examples/tables/",
    );
  // The seed is the table's identity: sort the corpus so filesystem listing
  // order can never leak into generation (repro commands stay portable).
  const corpus = [...opts.corpus].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const rng = mulberry32(genSeed >>> 0);
  const lookup = new Map(spec.params.map((p) => [p.name, p]));
  // Values observed in the corpus are asset-valid (real fonts, folders,
  // texts…): prefer them over type-derived pools when drawing.
  const observed = new Map<string, string[]>();
  const drawValue = (p: { name: string; type: string }): string => {
    const seen = observed.get(p.name);
    if (seen && seen.length > 0 && rng() < 0.8) return draw(rng, seen);
    const pool = valuePool(p as ParamSpec);
    return pool.length > 0 ? draw(rng, pool) : "";
  };
  // Prefer small corpus tables (fast sims): weight by 1/line count.
  const weights = corpus.map((c) => 1 / Math.max(1, parseCsv(c.csv).length));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  let pickIdx = corpus.length - 1;
  for (let i = 0; i < corpus.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      pickIdx = i;
      break;
    }
  }
  const origin = corpus[pickIdx].name;
  let rows = parseCsv(corpus[pickIdx].csv).map((row) => [...row]);
  for (const row of rows) {
    const name = (row[0] ?? "").trim();
    if (!observed.has(name)) observed.set(name, []);
    for (const cell of valueCells(row)) {
      const v = row[cell];
      if (v !== undefined && v !== "") observed.get(name)!.push(v);
    }
  }
  const present = () => new Set(rows.map((row) => (row[0] ?? "").trim()));

  const mutateValue = (bogus: boolean): string | null => {
    const candidates = rows.filter(
      (row) => (row[0] ?? "").trim() !== "block" && lookup.has((row[0] ?? "").trim()),
    );
    if (candidates.length === 0) return null;
    const row = draw(rng, candidates);
    const specP = lookup.get((row[0] ?? "").trim())!;
    const pool = bogus
      ? bogusValues(specP)
      : [
          ...(observed.get(specP.name) ?? []),
          ...valuePool(specP).filter((v) => !(observed.get(specP.name) ?? []).includes(v)),
        ];
    if (pool.length === 0) return null;
    const cells = valueCells(row);
    if (cells.length === 0) return null;
    const cell = draw(rng, cells);
    const options = pool.filter((v) => v !== row[cell]);
    row[cell] = options.length > 0 ? draw(rng, options) : draw(rng, pool);
    return specP.name;
  };

  const addGlobal = (): ParamSpec | null => {
    const have = present();
    const candidates = spec.params.filter(
      (p) => p.scope === "global" && !have.has(p.name) && valuePool(p).length > 0,
    );
    if (candidates.length === 0) return null;
    const p = pickWeighted(rng, candidates, counts);
    const pool = [...(observed.get(p.name) ?? []), ...valuePool(p)];
    rows = insertGlobal(rows, p.name, pool.length > 0 ? draw(rng, pool) : "");
    return p;
  };

  const deleteRow = (): boolean => {
    const candidates = rows.map((row, i) => ({ row, i })).filter(({ row }) => !isProtected(row));
    if (candidates.length === 0) return false;
    const victim = draw(rng, candidates);
    rows = rows.filter((_, i) => i !== victim.i);
    return true;
  };

  const mode = rng() < 0.6 ? "mutate" : "reroll";
  if (mode === "reroll") {
    for (const row of rows) {
      // Redraw only a random half of the rows: keeps cross-param pairings
      // (e.g. font ↔ fontSource) intact more often, raising valid yield.
      if (rng() < 0.5) continue;
      const name = (row[0] ?? "").trim();
      const specP = name === "block" ? undefined : lookup.get(name);
      if (!specP) continue;
      for (const cell of valueCells(row)) row[cell] = drawValue(specP);
    }
  } else {
    const ops = 1 + (rng() < 0.5 ? 1 : 0);
    for (let i = 0; i < ops; i++) {
      const op = rng();
      const w = opts.validityBias
        ? { mutate: 0.8, add: 0.9 }
        : { mutate: 0.45, add: 0.8 };
      if (op < w.mutate) mutateValue(false);
      else if (op < w.add) addGlobal();
      else deleteRow();
    }
  }

  let invalid: GenResult["invalid"];
  if (rng() < invalidFrac) {
    if (rng() < 0.5) {
      rows = insertGlobal(rows, "_fuzzBogusParam123", "x");
      invalid = { kind: "bogus-param", param: "_fuzzBogusParam123" };
    } else {
      const param = mutateValue(true);
      if (param) invalid = { kind: "bogus-value", param };
      else {
        rows = insertGlobal(rows, "_fuzzBogusParam123", "x");
        invalid = { kind: "bogus-param", param: "_fuzzBogusParam123" };
      }
    }
  }

  const have = present();
  const params = spec.params.map((p) => p.name).filter((n) => have.has(n));
  return { csv: toCsv(rows), params, origin, invalid };
}
