/**
 * Glossary adapter for the table fuzzer. Derives everything the generator
 * needs from the glossary payload AT FUZZ TIME — no parameter name is
 * hardcoded here, so glossary drift requires no upkeep: new params appear
 * with coverage count 0 (and are immediately favored), removed params age
 * out, and `obsolete`-typed params are excluded from valid generation.
 *
 * The glossary shape (payload.glossary: name → {name, type, default,
 * categories, example}) is schema-checked on load; a reshaped glossary fails
 * loudly instead of generating garbage.
 */

export interface ParamSpec {
  name: string;
  scope: "global" | "condition";
  type: string;
  obsolete: boolean;
  default: string;
  categories: string[];
  example: string;
}

export interface GlossarySpec {
  version: string;
  /** Non-obsolete params. */
  params: ParamSpec[];
  obsolete: ParamSpec[];
}

const TEXT_POOL = ["fuzz-üñí ✓", "a,b", "line1 *md* <b>x</b>"];

const clean = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const uniq = (xs: string[]): string[] => [...new Set(xs)];

function toParamSpec(name: string, entry: Record<string, unknown>): ParamSpec {
  const type = clean(entry.type);
  if (!type)
    throw new Error(
      `Glossary schema: entry "${name}" is missing its type field — the glossary format may have changed; refusing to fuzz.`,
    );
  const categories = Array.isArray(entry.categories)
    ? entry.categories.map(clean).filter((c) => c !== "")
    : [];
  return {
    name,
    scope: name.startsWith("_") ? "global" : "condition",
    type,
    obsolete: type === "obsolete",
    default: clean(entry.default),
    categories,
    example: clean(entry.example),
  };
}

/** Schema-check and convert a glossary payload ({version, glossary, …}). */
export function toSpec(payload: unknown): GlossarySpec {
  if (typeof payload !== "object" || payload === null)
    throw new Error("Glossary payload is not an object.");
  const p = payload as Record<string, unknown>;
  const glossary = p.glossary;
  if (typeof glossary !== "object" || glossary === null)
    throw new Error("Glossary payload has no .glossary map — refusing to fuzz.");
  const params: ParamSpec[] = [];
  const obsolete: ParamSpec[] = [];
  for (const [name, entry] of Object.entries(glossary as Record<string, unknown>)) {
    if (typeof entry !== "object" || entry === null)
      throw new Error(`Glossary schema: entry "${name}" is not an object.`);
    const spec = toParamSpec(name, entry as Record<string, unknown>);
    (spec.obsolete ? obsolete : params).push(spec);
  }
  return { version: clean(p.version) || "unknown", params, obsolete };
}

/** Deterministic candidate-value pool for a param (valid values only). */
export function valuePool(p: ParamSpec): string[] {
  switch (p.type) {
    case "boolean":
      return ["TRUE", "FALSE"];
    case "categorical":
    case "multicategorical": {
      const fromCats = p.categories.length > 0 ? p.categories : [p.default, p.example];
      return uniq([...fromCats, ...(p.default ? [p.default] : [])]).filter((v) => v !== "");
    }
    case "numerical": {
      const pool = uniq([p.default, "0", "1", "-1", "1000", "0.001"]);
      return pool.filter((v) => v !== "" && Number.isFinite(Number(v)));
    }
    case "integer": {
      const pool = uniq([p.default, "0", "1", "-1", "7"]);
      return pool.filter((v) => v !== "" && Number.isInteger(Number(v)));
    }
    default:
      // text and any unknown type: degrade to text pool + defaults
      return uniq([p.default, p.example, ...TEXT_POOL]).filter((v) => v !== "");
  }
}

/** Invalid-class values for tier-1 planting (empty = no invalid class). */
export function bogusValues(p: ParamSpec): string[] {
  switch (p.type) {
    case "boolean":
      return ["yes", "1maybe"];
    case "numerical":
    case "integer":
      return ["abc", "-"];
    case "categorical":
    case "multicategorical":
      return ["zzz-not-a-category"];
    default:
      return [];
  }
}
