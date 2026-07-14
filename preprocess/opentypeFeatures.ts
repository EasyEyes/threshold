/**
 * OpenType feature-settings validation (compile-time).
 *
 * `fontFeatureSettings` accepts a CSS `font-feature-settings` string, e.g.
 *   "calt" 1   |   "smcp"   |   "calt" 1, "smcp", "zero"
 * The Canvas 2D API has no such property, so at runtime the value is "baked"
 * into the font via the Rust GSUB baker (Phase 2). An invalid string must never
 * reach that baker: typos, malformed tags, and unknown tags are caught here and
 * surfaced as a single compiler error (with a closest-match suggestion).
 *
 * This module is pure (no glossary / df dependency) so it is trivially testable.
 */

export type FeatureOffenseReason =
  | "unknown-tag"
  | "malformed-tag"
  | "bad-value";

export interface FeatureOffense {
  /** The tag as written by the experimenter (unquoted). */
  tag: string;
  reason: FeatureOffenseReason;
  /** Closest registered tag, when reason === "unknown-tag". */
  suggestion?: string;
}

/** A feature tag is 1–4 ASCII letters or digits (case-insensitive). */
const TAG_RE = /^[A-Za-z0-9]{1,4}$/;
/** A feature value is `on`, `off`, or a non-negative integer (CSS grammar). */
const VALUE_RE = /^(on|off|0|[1-9][0-9]*)$/;

/**
 * Curated registry of registered OpenType feature tags (4-byte tags, lowercase,
 * space-padded). Source: notes/RESEARCH-opentype-feature-tag-registry.md
 * (mined from the official Microsoft/OpenType spec featurelist).
 */
const REGISTERED_FEATURE_TAGS: ReadonlySet<string> = new Set(
  [
    "aalt",
    "abvf",
    "abvm",
    "abvs",
    "afrc",
    "akhn",
    "apkn",
    "blwf",
    "blwm",
    "blws",
    "c2pc",
    "c2sc",
    "calt",
    "case",
    "ccmp",
    "ccpa",
    "cfar",
    "chws",
    "cjct",
    "clig",
    "cpct",
    "cpsp",
    "cswh",
    "curs",
    "dist",
    "dlig",
    "dnom",
    "dtls",
    "expt",
    "falt",
    "fina",
    "fin2",
    "fin3",
    "flac",
    "frac",
    "fwid",
    "half",
    "haln",
    "halt",
    "hist",
    "hkna",
    "hlig",
    "hngl",
    "hojo",
    "hwid",
    "init",
    "isol",
    "ital",
    "jalt",
    "kern",
    "lfbd",
    "liga",
    "ljmo",
    "lnum",
    "locl",
    "ltra",
    "ltrm",
    "mark",
    "medi",
    "med2",
    "mkmk",
    "mgrk",
    "mset",
    "nalt",
    "nlck",
    "nukt",
    "numr",
    "opbd",
    "onum",
    "ordn",
    "ornm",
    "palt",
    "pcap",
    "pkna",
    "pnum",
    "pref",
    "pres",
    "pstf",
    "psts",
    "pwid",
    "qwid",
    "rand",
    "rclt",
    "rlig",
    "rkrf",
    "rphf",
    "rtla",
    "rtlm",
    "rtbd",
    "rvrn",
    "ruby",
    "salt",
    "sinf",
    "smcp",
    "smpl",
    "ssty",
    "stch",
    "subs",
    "sups",
    "swsh",
    "titl",
    "tjmo",
    "tnum",
    "tnam",
    "trad",
    "twid",
    "unic",
    "valt",
    "vapk",
    "vatu",
    "vchw",
    "vhal",
    "vert",
    "vjmo",
    "vkna",
    "vkrn",
    "vpal",
    "vrtr",
    "vrt2",
    "zero",
    // generated ranges
    ...range(1, 20).map((n) => `ss${pad2(n)}`), // ss01..ss20
    ...range(1, 99).map((n) => `cv${pad2(n)}`), // cv01..cv99
  ].map((t) => t.padEnd(4, " ")),
);

/** Normalize a written tag for registry lookup: lowercase, space-pad to 4. */
export function normalizeTag(raw: string): string {
  return raw.toLowerCase().padEnd(4, " ");
}

/** Return true iff `raw` is a registered OpenType feature tag. */
export function isRegisteredFeatureTag(raw: string): boolean {
  return TAG_RE.test(raw) && REGISTERED_FEATURE_TAGS.has(normalizeTag(raw));
}

/**
 * Validate a full `fontFeatureSettings` string. Returns one offense per bad
 * tag/value. An empty string is valid (no-op) → []. Tags may be quoted
 * (`"calt"`) or bare (`calt`); values are optional (default on).
 */
export function validateFeatureSettingsString(value: string): FeatureOffense[] {
  const offenses: FeatureOffense[] = [];
  if (!value || !value.trim()) return offenses;

  // Strip surrounding quotes the way CSS / our Rust parser does.
  const cleaned = value.replace(/["']/g, "");
  // CSS 'normal' keyword = no-op (same as empty string)
  if (cleaned.trim() === "normal") return offenses;
  const entries = cleaned
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const entry of entries) {
    const tokens = entry.split(/\s+/);
    if (tokens.length === 0 || tokens.length > 2) {
      offenses.push({ tag: entry, reason: "malformed-tag" });
      continue;
    }
    const tagRaw = tokens[0];
    if (!TAG_RE.test(tagRaw)) {
      offenses.push({ tag: tagRaw, reason: "malformed-tag" });
      continue;
    }
    if (tokens.length === 2 && !VALUE_RE.test(tokens[1])) {
      offenses.push({ tag: tagRaw, reason: "bad-value" });
      continue;
    }
    if (!REGISTERED_FEATURE_TAGS.has(normalizeTag(tagRaw))) {
      offenses.push({
        tag: tagRaw,
        reason: "unknown-tag",
        suggestion: closestTag(tagRaw),
      });
    }
  }
  return offenses;
}

/** Levenshtein distance (small, self-contained). */
function levDist(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = range(0, n);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Tags preferred when edit-distance ties (more commonly used first). */
const COMMON_TAGS: readonly string[] = [
  "liga",
  "calt",
  "dlig",
  "clig",
  "hlig",
  "rlig",
  "kern",
  "smcp",
  "pcap",
  "salt",
  "swsh",
  "frac",
  "tnum",
  "sups",
  "subs",
  "case",
  "zero",
  "locl",
  "ss01",
  "cv01",
];

/** Find the closest registered tag (≤ 2 edits), breaking ties toward common tags. */
function closestTag(raw: string): string | undefined {
  const target = raw.toLowerCase();
  // min distance across the registry
  let minDist = 3; // only suggest within 2 edits
  const dists = new Map<string, number>();
  for (const tag of REGISTERED_FEATURE_TAGS) {
    const t = tag.trim();
    const d = levDist(target, t);
    dists.set(t, d);
    if (d < minDist) minDist = d;
  }
  if (minDist > 2) return undefined;
  // among all tags at min distance, prefer the common one (lowest priority index)
  const atMin = [...REGISTERED_FEATURE_TAGS]
    .map((t) => t.trim())
    .filter((t) => dists.get(t) === minDist);
  atMin.sort((a, b) => commonRank(a) - commonRank(b));
  return atMin[0];
}

function commonRank(tag: string): number {
  const i = COMMON_TAGS.indexOf(tag);
  return i === -1 ? COMMON_TAGS.length : i;
}

function range(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
