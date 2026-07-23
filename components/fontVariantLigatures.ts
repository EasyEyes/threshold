/**
 * Helper for the `fontVariantLigatures` parameter (multicategorical:
 * normal | none | [no-]common-ligatures | [no-]discretionary-ligatures |
 * [no-]historical-ligatures | [no-]contextual; glossary default "normal").
 *
 * Canvas has no font-variant-ligatures (CSS-only), so the keywords are
 * translated to OpenType feature tags and merged into the feature-settings
 * string baked into the font by the WASM instancer (process_font 4th arg;
 * see fontInstancing and notes/PLAN-opentype-params-nastaliq.md §8).
 * The baker forces tags ON by injecting their GSUB lookups into `calt`
 * (skipping tags already default-on, to avoid double-firing) and forces
 * tags OFF by removing their lookups — so the full CSS keyword semantics
 * (including no-* and none) reach the canvas stimulus.
 *
 * Keyword→tag map (CSS font-variant-ligatures spec):
 *   common-ligatures        → "liga" 1, "clig" 1
 *   no-common-ligatures     → "liga" 0, "clig" 0
 *   discretionary-ligatures → "dlig" 1
 *   no-discretionary-…      → "dlig" 0
 *   historical-ligatures    → "hlig" 1
 *   no-historical-…         → "hlig" 0
 *   contextual              → "calt" 1
 *   no-contextual           → "calt" 0
 *   none                    → all five tags 0
 *   normal                  → no-op
 */

/** Multicategorical values arrive as an array or a comma-separated string. */
export type VariantLigaturesRaw = string | string[] | undefined | null;

/** OpenType [tag, value] pair, e.g. ["dlig", 1]. */
export type FeatureEntry = [string, number];

const KEYWORD_TAGS: Record<string, FeatureEntry[]> = {
  "common-ligatures": [
    ["liga", 1],
    ["clig", 1],
  ],
  "no-common-ligatures": [
    ["liga", 0],
    ["clig", 0],
  ],
  "discretionary-ligatures": [["dlig", 1]],
  "no-discretionary-ligatures": [["dlig", 0]],
  "historical-ligatures": [["hlig", 1]],
  "no-historical-ligatures": [["hlig", 0]],
  contextual: [["calt", 1]],
  "no-contextual": [["calt", 0]],
};

const NONE_ENTRIES: FeatureEntry[] = [
  ["liga", 0],
  ["clig", 0],
  ["dlig", 0],
  ["hlig", 0],
  ["calt", 0],
];

const CONFLICT_PAIRS: [string, string][] = [
  ["common-ligatures", "no-common-ligatures"],
  ["discretionary-ligatures", "no-discretionary-ligatures"],
  ["historical-ligatures", "no-historical-ligatures"],
  ["contextual", "no-contextual"],
];

/**
 * Normalize the multicategorical param value to a keyword list.
 * Accepts an array (paramReader multicategorical shape) or a
 * comma-separated string (cell text).
 */
export const normalizeVariantLigatures = (
  raw: VariantLigaturesRaw,
): string[] => {
  if (raw === undefined || raw === null) return [];
  const items = Array.isArray(raw) ? raw : String(raw).split(",");
  return items.map((s) => String(s).trim()).filter(Boolean);
};

/**
 * Detect contradictory keyword combinations (ambiguous experimenter intent,
 * rejected by the CSS grammar): "normal"/"none" combined with anything
 * else, or a keyword together with its "no-" form. Plain duplicates are
 * harmless and do NOT count as contradictions. Used by the compiler.
 */
export const hasLigatureContradiction = (raw: VariantLigaturesRaw): boolean => {
  const unique = [...new Set(normalizeVariantLigatures(raw))];
  if (unique.length < 2) return false;
  if (unique.includes("normal") || unique.includes("none")) return true;
  const set = new Set(unique);
  return CONFLICT_PAIRS.some(([a, b]) => set.has(a) && set.has(b));
};

/**
 * Translate font-variant-ligatures keywords to OpenType [tag, value]
 * entries. Sequential last-wins per tag (CSS grammar forbids conflicts,
 * but the compiler's multicategorical check allows them — be deterministic).
 * Returns entries in first-appearance tag order.
 */
export const variantLigaturesToFeatureEntries = (
  raw: VariantLigaturesRaw,
): FeatureEntry[] => {
  const byTag = new Map<string, number>();
  for (const keyword of normalizeVariantLigatures(raw)) {
    if (keyword === "normal") continue;
    const entries = keyword === "none" ? NONE_ENTRIES : KEYWORD_TAGS[keyword];
    if (!entries) continue; // unknown keyword: compiler already flagged it
    for (const [tag, value] of entries) byTag.set(tag, value);
  }
  return [...byTag.entries()];
};

/**
 * Merge fontFeatureSettings with translated fontVariantLigatures into the
 * single feature-settings string passed to the WASM baker. Ligature-derived
 * entries are appended AFTER the featureSettings entries and WIN tag
 * conflicts (CSS: font-variant-ligatures has higher priority than
 * font-feature-settings). featureSettings "normal" is a no-op.
 * Returns e.g. '"smcp" 1, "dlig" 1' ("" when nothing to bake).
 */
export const mergeLigatureFeatureSettings = (
  featureSettingsRaw: string,
  variantLigaturesRaw: VariantLigaturesRaw,
): string => {
  const ligatureEntries = variantLigaturesToFeatureEntries(variantLigaturesRaw);
  const overridden = new Set(ligatureEntries.map(([tag]) => tag));

  const featureSettings = String(featureSettingsRaw || "").trim();
  const keptEntries =
    featureSettings === "" || featureSettings === "normal"
      ? []
      : featureSettings
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
          .filter((entry) => {
            const tag = entry.replace(/["']/g, "").split(/\s+/)[0];
            return !overridden.has(tag);
          });

  const ligatureStrings = ligatureEntries.map(
    ([tag, value]) => `"${tag}" ${value}`,
  );
  return [...keptEntries, ...ligatureStrings].join(", ");
};
