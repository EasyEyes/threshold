/**
 * Tier 1 (compiler) driver for the table fuzzer. Runs the real local
 * compiler against the real glossary cache (examples/.cache/), so generated
 * tables are judged exactly as the web compiler would judge them.
 *
 * Outcomes:
 *  - accepted: no blocking errors
 *  - rejected: blocking errors (the compiler's normal verdict for a bad table)
 *  - crashed: the compile threw — always a finding; the compiler must report
 *    errors, never die.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { initGlossary } from "../../parameters/glossaryRegistry";
import { initPhrases } from "../../parameters/phrasesRegistry";
import { compileExperimentTableLocally } from "../../examples/localCompile";
import { toSpec, type GlossarySpec } from "./glossaryAdapter";
import type { EasyEyesError } from "../../preprocess/errorMessages";
import type { GlossaryData } from "../../../source/components/types";

export interface CompileOutcome {
  outcome: "accepted" | "rejected" | "crashed";
  /** Human-readable one-liners, one per blocking error (or the crash). */
  errors: string[];
}

const cachePath = (examplesDir: string, name: string) =>
  join(examplesDir, ".cache", name);

const readCachePayload = (examplesDir: string, name: string): any => {
  const file = cachePath(examplesDir, name);
  if (!existsSync(file))
    throw new Error(
      `Missing ${file} — run \`npm run examples\` once to populate the glossary/phrases cache.`,
    );
  return JSON.parse(readFileSync(file, "utf8")).payload;
};

/** The fuzzable spec: version + per-param pools, from the cached glossary. */
export const loadSpecFromCache = (examplesDir: string): GlossarySpec => {
  const payload = readCachePayload(examplesDir, "glossary.json");
  return toSpec({ ...payload, version: String(payload.version ?? "") });
};

/** Initialize the compiler's glossary/phrase registries from the cache. */
export const initCompiler = (examplesDir: string): void => {
  initGlossary(readCachePayload(examplesDir, "glossary.json") as GlossaryData);
  try {
    initPhrases(readCachePayload(examplesDir, "phrases.json"));
  } catch {
    // Phrases are only needed for ~symbol resolution; fuzz without them.
  }
};

const stripHtml = (s: string): string => s.replace(/<[^>]*>/g, "");

/**
 * Does the table still exhibit the planted invalidity? The oracle-miss
 * minimizer predicate MUST require this: ddmin removes whole rows (never
 * edits cells), so row presence is equivalent to the invalidity surviving —
 * without the check, minimization would drop the offending row and file a
 * "repro" table that compiles correctly.
 */
export const stillContainsInvalid = (
  invalid: { kind: "bogus-param" | "bogus-value"; param: string },
  rows: string[][],
): boolean => rows.some((r) => (r[0] ?? "").trim() === invalid.param);

const describeError = (e: EasyEyesError): string =>
  [e.name, stripHtml(e.message ?? ""), stripHtml(e.hint ?? "")]
    .filter(Boolean)
    .join(" — ") + ` [${(e.parameters ?? []).join(", ")}]`;

/** Compile one table; never throw. */
export const compileOne = async (
  tablePath: string,
  examplesDir: string,
): Promise<CompileOutcome> => {
  try {
    const result = await compileExperimentTableLocally(tablePath, {
      resourcesRoot: examplesDir,
    });
    const blocking = result.blockingErrors ?? [];
    return blocking.length
      ? { outcome: "rejected", errors: blocking.map(describeError) }
      : { outcome: "accepted", errors: [] };
  } catch (err) {
    return { outcome: "crashed", errors: [String(err)] };
  }
};
