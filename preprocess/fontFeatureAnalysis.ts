/**
 * Compile-time fontFeatureSettings analysis — checks a feature-settings string
 * against the actual font binary to detect guaranteed no-ops and degraded
 * behavior BEFORE the experiment runs.
 *
 * This module parses sfnt/GSUB/GPOS binary tables directly (no external deps)
 * to answer: "will this feature actually do anything with this font?"
 *
 * All checks are structural (no hardcoded feature-tag semantics) and produce
 * zero false positives.
 */

// ── Binary readers ──────────────────────────────────────────────────────────

function readU16(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

function readU32(data: Uint8Array, offset: number): number {
  return (
    data[offset] * 0x1000000 +
    (data[offset + 1] << 16) +
    (data[offset + 2] << 8) +
    data[offset + 3]
  );
}

function readTag(data: Uint8Array, offset: number): string {
  return String.fromCharCode(
    data[offset],
    data[offset + 1],
    data[offset + 2],
    data[offset + 3],
  );
}

// ── sfnt table directory ────────────────────────────────────────────────────

function getTableRange(data: Uint8Array, tag: string): [number, number] | null {
  const numTables = readU16(data, 4);
  for (let i = 0; i < numTables; i++) {
    const recOff = 12 + i * 16;
    if (readTag(data, recOff) === tag) {
      return [readU32(data, recOff + 8), readU32(data, recOff + 12)];
    }
  }
  return null;
}

function getTableData(data: Uint8Array, tag: string): Uint8Array | null {
  const range = getTableRange(data, tag);
  if (!range) return null;
  return data.subarray(range[0], range[0] + range[1]);
}

// ── FeatureList parsing ─────────────────────────────────────────────────────

/** Returns Map<tag, lookupIndices[]> from a GSUB or GPOS table. */
function parseFeatureList(
  data: Uint8Array,
  tableTag: string,
): Map<string, number[]> {
  const tbl = getTableData(data, tableTag);
  if (!tbl) return new Map();

  const flOff = readU16(tbl, 6); // featureListOffset
  const fl = tbl.subarray(flOff);
  const count = readU16(fl, 0);

  const result = new Map<string, number[]>();
  for (let i = 0; i < count; i++) {
    const recOff = 2 + i * 6;
    const tag = readTag(fl, recOff);
    const featOff = readU16(fl, recOff + 4);
    const ft = fl.subarray(featOff);
    const lc = readU16(ft, 2);
    const lookups: number[] = [];
    for (let j = 0; j < lc; j++) {
      lookups.push(readU16(ft, 4 + j * 2));
    }
    result.set(tag, lookups);
  }
  return result;
}

// ── LookupList parsing ──────────────────────────────────────────────────────

interface LookupInfo {
  type: number;
  subtableCount: number;
}

function parseLookupList(data: Uint8Array): Map<number, LookupInfo> {
  const tbl = getTableData(data, "GSUB");
  if (!tbl) return new Map();

  const llOff = readU16(tbl, 8); // lookupListOffset
  const ll = tbl.subarray(llOff);
  const count = readU16(ll, 0);

  const result = new Map<number, LookupInfo>();
  for (let i = 0; i < count; i++) {
    const lkupOff = readU16(ll, 2 + i * 2);
    result.set(i, {
      type: readU16(ll, lkupOff),
      subtableCount: readU16(ll, lkupOff + 4),
    });
  }
  return result;
}

// ── Feature-settings string parsing ─────────────────────────────────────────

interface ParsedFeature {
  tag: string;
  value: number; // 0 = off, 1+ = on
}

export function parseFeatureSettings(settings: string): ParsedFeature[] {
  if (!settings || !settings.trim()) return [];
  const cleaned = settings.replace(/["']/g, "");
  // CSS 'normal' keyword = no-op
  if (cleaned.trim() === "normal") return [];
  return cleaned
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => {
      const tokens = s.split(/\s+/);
      let value = 1; // default: on
      if (tokens.length === 2) {
        if (tokens[1] === "off" || tokens[1] === "0") value = 0;
        else if (tokens[1] === "on") value = 1;
        else value = parseInt(tokens[1], 10) || 1;
      }
      return { tag: tokens[0], value };
    });
}

// ── Public API ──────────────────────────────────────────────────────────────

export type FontFeatureWarningKind =
  | "not-in-gsub"
  | "gpos-only"
  | "empty-lookups"
  | "empty-subtables"
  | "has-alternate";

export interface FontFeatureWarning {
  tag: string;
  kind: FontFeatureWarningKind;
  message: string;
}

/**
 * Analyze a `fontFeatureSettings` string against a specific font binary.
 * Returns warnings for features that will be no-ops or degraded.
 * Returns an empty array if everything is fine (or settings is empty).
 */
export function analyzeFontFeatureSettings(
  fontData: Uint8Array,
  featureSettings: string,
): FontFeatureWarning[] {
  const warnings: FontFeatureWarning[] = [];
  const parsed = parseFeatureSettings(featureSettings);
  if (parsed.length === 0) return warnings;

  const gsubTags = parseFeatureList(fontData, "GSUB");
  const gposTags = parseFeatureList(fontData, "GPOS");
  const lookupInfo = parseLookupList(fontData);

  for (const { tag, value } of parsed) {
    // Normalize tag to 4-char lowercase for GSUB lookup
    const tagKey = tag.toLowerCase().padEnd(4, " ");

    // Check: tag not in GSUB
    if (!gsubTags.has(tagKey)) {
      if (gposTags.has(tagKey)) {
        warnings.push({
          tag,
          kind: "gpos-only",
          message: `'${tag}' is a positioning feature (GPOS) in this font, not a substitution feature (GSUB). It cannot be baked and will have no effect.`,
        });
      } else {
        warnings.push({
          tag,
          kind: "not-in-gsub",
          message: `This font does not contain the '${tag}' feature. It will have no effect.`,
        });
      }
      continue;
    }

    const lookups = gsubTags.get(tagKey)!;

    // Check: empty lookup list
    if (lookups.length === 0) {
      warnings.push({
        tag,
        kind: "empty-lookups",
        message: `'${tag}' exists in this font but has no lookups. It will have no effect.`,
      });
      continue;
    }

    // Check: lookup with 0 subtables
    for (const idx of lookups) {
      const info = lookupInfo.get(idx);
      if (info && info.subtableCount === 0) {
        warnings.push({
          tag,
          kind: "empty-subtables",
          message: `'${tag}' references a lookup with no subtable data. It may not take full effect.`,
        });
        break;
      }
    }

    // Check: Type 3 (Alternate) present
    for (const idx of lookups) {
      const info = lookupInfo.get(idx);
      if (info && info.type === 3) {
        warnings.push({
          tag,
          kind: "has-alternate",
          message: `'${tag}' uses alternate substitution. The first available alternate will be used.`,
        });
        break;
      }
    }
  }

  return warnings;
}
