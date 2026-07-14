/**
 * Tests for compile-time fontFeatureSettings analysis.
 *
 * Two test layers:
 * 1. Synthetic GSUB data — precise control over every field, zero ambiguity
 * 2. Real fonts — validate against ground-truth font binaries
 *
 * @jest-environment node
 */

import * as fs from "fs";
import * as path from "path";
import {
  analyzeFontFeatureSettings,
  parseFeatureSettings,
  FontFeatureWarningKind,
} from "../preprocess/fontFeatureAnalysis";

// ════════════════════════════════════════════════════════════════════════════
// SYNTHETIC GSUB BUILDER — minimal sfnt with controlled GSUB structure
// ════════════════════════════════════════════════════════════════════════════

function u16(n: number): number[] {
  return [(n >> 8) & 0xff, n & 0xff];
}
function u32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
function tag(s: string): number[] {
  return s
    .padEnd(4, " ")
    .slice(0, 4)
    .split("")
    .map((c) => c.charCodeAt(0));
}

interface SyntheticFeature {
  tag: string;
  lookups: number[];
}
interface SyntheticLookup {
  type: number;
  subtableCount?: number;
}

/**
 * Build a minimal sfnt font wrapping a GSUB table (and optionally GPOS).
 */
function buildFont(
  gsubFeatures: SyntheticFeature[],
  gsubLookups: SyntheticLookup[],
  gposFeatures: SyntheticFeature[] = [],
): Uint8Array {
  const gsub = buildGsub(gsubFeatures, gsubLookups);
  const gpos = gposFeatures.length > 0 ? buildGpos(gposFeatures) : null;

  const numTables = gpos ? 2 : 1;
  const headerSize = 12 + numTables * 16;

  // Calculate table positions (4-byte aligned)
  let gsubOff = headerSize;
  let gposOff = gsubOff + gsub.length;
  // align
  if (gposOff % 4 !== 0) gposOff += 4 - (gposOff % 4);

  const totalLen = gpos ? gposOff + gpos.length : gsubOff + gsub.length;

  const o: number[] = [];

  // sfnt header
  o.push(0, 1, 0, 0); // version TrueType
  o.push(...u16(numTables));
  o.push(...u16(16), ...u16(0), ...u16(0)); // searchRange, entrySelector, rangeShift (placeholder)

  // Table records (contiguous, before any data)
  o.push(...tag("GSUB"), ...u32(0), ...u32(gsubOff), ...u32(gsub.length));
  if (gpos) {
    o.push(...tag("GPOS"), ...u32(0), ...u32(gposOff), ...u32(gpos.length));
  }

  // GSUB data
  o.push(...gsub);

  // GPOS data (with padding)
  if (gpos) {
    while (o.length < gposOff) o.push(0);
    o.push(...gpos);
  }

  return new Uint8Array(o);
}

function buildGsub(
  features: SyntheticFeature[],
  lookups: SyntheticLookup[],
): number[] {
  const o: number[] = [];
  // GSUB header (10 bytes)
  const headerSize = 10;
  const numFeatures = features.length;
  const scriptListSize = 2 + 6 + 4 + 2 + 2 + 2 + numFeatures * 2;
  // FeatureList: 2 + numFeatures * 6 + numFeatures * (2 + 2 + lookupsPerFeature * 2)
  let featureListSize = 2 + numFeatures * 6;
  for (const f of features) {
    featureListSize += 4 + f.lookups.length * 2; // params(2) + count(2) + indices
  }
  // LookupList: offset array + lookup data
  const numLookups = lookups.length;
  const lookupListSize =
    2 +
    numLookups * 2 +
    lookups.reduce((s, lk) => s + 6 + (lk.subtableCount ?? 0) * 2, 0);

  const scriptListOff = headerSize;
  const featureListOff = scriptListOff + scriptListSize;
  const lookupListOff = featureListOff + featureListSize;

  // GSUB header
  o.push(...u32(0x00010000)); // version 1.0
  o.push(...u16(scriptListOff));
  o.push(...u16(featureListOff));
  o.push(...u16(lookupListOff));

  // ScriptList
  o.push(...u16(1)); // scriptCount
  o.push(...tag("DFLT")); // scriptTag
  o.push(...u16(8)); // scriptOffset → Script at scriptListOff + 8
  // Script
  o.push(...u16(4)); // defaultLangSysOffset → LangSys at +4
  o.push(...u16(0)); // langSysCount
  // LangSys
  o.push(...u16(0)); // lookupOrder
  o.push(...u16(0xffff)); // reqFeatureIndex
  o.push(...u16(numFeatures)); // featureIndexCount
  for (let i = 0; i < numFeatures; i++) {
    o.push(...u16(i));
  }

  // FeatureList
  let featTableStart = 2 + numFeatures * 6; // relative to featureListOff
  o.push(...u16(numFeatures)); // featureCount
  for (let i = 0; i < numFeatures; i++) {
    o.push(...tag(features[i].tag));
    o.push(...u16(featTableStart));
    featTableStart += 4 + features[i].lookups.length * 2;
  }
  // Feature tables
  for (const f of features) {
    o.push(...u16(0)); // featureParams
    o.push(...u16(f.lookups.length)); // lookupCount
    for (const l of f.lookups) {
      o.push(...u16(l));
    }
  }

  // LookupList
  let lookupDataStart = 2 + numLookups * 2;
  o.push(...u16(numLookups));
  for (let i = 0; i < numLookups; i++) {
    o.push(...u16(lookupDataStart));
    lookupDataStart += 6 + (lookups[i].subtableCount ?? 0) * 2;
  }
  for (const lk of lookups) {
    const sc = lk.subtableCount ?? 0;
    o.push(...u16(lk.type));
    o.push(...u16(0)); // lookupFlag
    o.push(...u16(sc));
    for (let j = 0; j < sc; j++) {
      o.push(...u16(6 + j * 2)); // dummy subtable offset
    }
  }

  return o;
}

function buildGpos(features: SyntheticFeature[]): number[] {
  // Minimal GPOS with just a FeatureList (enough for tag-existence checks)
  const numFeatures = features.length;
  const headerSize = 10;
  const scriptListSize = 2; // just scriptCount=0
  let featureListSize = 2 + numFeatures * 6;
  for (const f of features) {
    featureListSize += 4; // featureParams(2) + lookupCount(2)
  }

  const o: number[] = [];
  o.push(...u32(0x00010000));
  o.push(...u16(headerSize)); // scriptListOff
  o.push(...u16(headerSize + scriptListSize)); // featureListOff
  o.push(...u16(headerSize + scriptListSize + featureListSize)); // lookupListOff

  // ScriptList (empty)
  o.push(...u16(0));

  // FeatureList
  let featOff = 2 + numFeatures * 6;
  o.push(...u16(numFeatures));
  for (const f of features) {
    o.push(...tag(f.tag));
    o.push(...u16(featOff));
    featOff += 4;
  }
  for (const f of features) {
    o.push(...u16(0)); // featureParams
    o.push(...u16(0)); // lookupCount = 0
  }

  // LookupList (empty)
  o.push(...u16(0));

  return o;
}

// ════════════════════════════════════════════════════════════════════════════
// TESTS — parseFeatureSettings
// ════════════════════════════════════════════════════════════════════════════

describe("parseFeatureSettings", () => {
  it("parses empty string", () => {
    expect(parseFeatureSettings("")).toEqual([]);
    expect(parseFeatureSettings("  ")).toEqual([]);
  });

  it("parses single tag (default on)", () => {
    expect(parseFeatureSettings("zero")).toEqual([{ tag: "zero", value: 1 }]);
  });

  it("parses quoted tag", () => {
    expect(parseFeatureSettings('"smcp"')).toEqual([{ tag: "smcp", value: 1 }]);
  });

  it("parses tag with explicit value", () => {
    expect(parseFeatureSettings('"cv11" 1')).toEqual([
      { tag: "cv11", value: 1 },
    ]);
    expect(parseFeatureSettings('"liga" off')).toEqual([
      { tag: "liga", value: 0 },
    ]);
    expect(parseFeatureSettings('"ss01" 0')).toEqual([
      { tag: "ss01", value: 0 },
    ]);
  });

  it("parses multiple tags", () => {
    const result = parseFeatureSettings('"zero", "smcp", "cv11" 1');
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.tag)).toEqual(["zero", "smcp", "cv11"]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TESTS — analyzeFontFeatureSettings (synthetic)
// ════════════════════════════════════════════════════════════════════════════

describe("analyzeFontFeatureSettings — synthetic fonts", () => {
  it("returns no warnings for a feature that exists with valid lookups", () => {
    const font = buildFont(
      [{ tag: "zero", lookups: [0] }],
      [{ type: 1, subtableCount: 1 }],
    );
    const warnings = analyzeFontFeatureSettings(font, "zero");
    expect(warnings).toEqual([]);
  });

  it("warns not-in-gsub when feature tag is absent", () => {
    const font = buildFont(
      [{ tag: "zero", lookups: [0] }],
      [{ type: 1, subtableCount: 1 }],
    );
    const warnings = analyzeFontFeatureSettings(font, "smcp");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].kind).toBe("not-in-gsub");
    expect(warnings[0].tag).toBe("smcp");
  });

  it("warns gpos-only when tag exists in GPOS but not GSUB", () => {
    const font = buildFont(
      [{ tag: "zero", lookups: [0] }],
      [{ type: 1, subtableCount: 1 }],
      [{ tag: "kern", lookups: [] }],
    );
    const warnings = analyzeFontFeatureSettings(font, "kern");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].kind).toBe("gpos-only");
  });

  it("warns empty-lookups when feature has 0 lookups", () => {
    const font = buildFont([{ tag: "rvrn", lookups: [] }], []);
    const warnings = analyzeFontFeatureSettings(font, "rvrn");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].kind).toBe("empty-lookups");
  });

  it("warns empty-subtables when lookup has 0 subtables", () => {
    const font = buildFont(
      [{ tag: "salt", lookups: [0] }],
      [{ type: 1, subtableCount: 0 }], // 0 subtables!
    );
    const warnings = analyzeFontFeatureSettings(font, "salt");
    expect(warnings.some((w) => w.kind === "empty-subtables")).toBe(true);
  });

  it("warns has-alternate when Type 3 lookup present", () => {
    const font = buildFont(
      [{ tag: "aalt", lookups: [0] }],
      [{ type: 3, subtableCount: 1 }], // Alternate!
    );
    const warnings = analyzeFontFeatureSettings(font, "aalt");
    expect(warnings.some((w) => w.kind === "has-alternate")).toBe(true);
  });

  it("returns empty for empty settings string", () => {
    const font = buildFont(
      [{ tag: "zero", lookups: [0] }],
      [{ type: 1, subtableCount: 1 }],
    );
    expect(analyzeFontFeatureSettings(font, "")).toEqual([]);
    expect(analyzeFontFeatureSettings(font, "  ")).toEqual([]);
  });

  it("handles multiple features with mixed results", () => {
    const font = buildFont(
      [{ tag: "zero", lookups: [0] }],
      [{ type: 1, subtableCount: 1 }],
      [{ tag: "kern", lookups: [] }],
    );
    const warnings = analyzeFontFeatureSettings(font, '"zero", "smcp", "kern"');
    expect(warnings).toHaveLength(2);
    const kinds = warnings.map((w) => w.kind);
    expect(kinds).toContain("not-in-gsub"); // smcp
    expect(kinds).toContain("gpos-only"); // kern
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TESTS — analyzeFontFeatureSettings (real fonts)
// ════════════════════════════════════════════════════════════════════════════

const FONT_DIR = path.join(__dirname, "..", "examples", "fonts");

function loadFont(name: string): Uint8Array | null {
  const fpath = path.join(FONT_DIR, name);
  if (!fs.existsSync(fpath)) return null;
  return new Uint8Array(fs.readFileSync(fpath));
}

// Conditional describe — skip if font files don't exist (e.g. CI)
const describeWithFonts = (name: string, fn: () => void) => {
  const plex = path.join(FONT_DIR, "IBMPlexSans.ttf");
  const testDescribe = fs.existsSync(plex) ? describe : describe.skip;
  testDescribe(name, fn);
};

describeWithFonts("analyzeFontFeatureSettings — real fonts", () => {
  test("IBM Plex Sans: smcp → not-in-gsub", () => {
    const font = loadFont("IBMPlexSans.ttf")!;
    const w = analyzeFontFeatureSettings(font, "smcp");
    expect(w.some((x) => x.kind === "not-in-gsub" && x.tag === "smcp")).toBe(
      true,
    );
  });

  test("IBM Plex Sans: kern → gpos-only", () => {
    const font = loadFont("IBMPlexSans.ttf")!;
    const w = analyzeFontFeatureSettings(font, "kern");
    expect(w.some((x) => x.kind === "gpos-only")).toBe(true);
  });

  test("IBM Plex Sans: rvrn → empty-lookups", () => {
    const font = loadFont("IBMPlexSans.ttf")!;
    const w = analyzeFontFeatureSettings(font, "rvrn");
    expect(w.some((x) => x.kind === "empty-lookups")).toBe(true);
  });

  test("IBM Plex Sans: frac → no warnings (has chain context)", () => {
    const font = loadFont("IBMPlexSans.ttf")!;
    const w = analyzeFontFeatureSettings(font, "frac");
    expect(w).toEqual([]);
  });

  test("IBM Plex Sans: zero → no warnings", () => {
    const font = loadFont("IBMPlexSans.ttf")!;
    const w = analyzeFontFeatureSettings(font, "zero");
    expect(w).toEqual([]);
  });

  test("IBM Plex Sans: ordn → no warnings (bare Type 1, will fire — just unexpectedly)", () => {
    const font = loadFont("IBMPlexSans.ttf")!;
    const w = analyzeFontFeatureSettings(font, "ordn");
    expect(w).toEqual([]);
  });

  test("IBM Plex Sans: aalt → has-alternate", () => {
    const font = loadFont("IBMPlexSans.ttf")!;
    const w = analyzeFontFeatureSettings(font, "aalt");
    expect(w.some((x) => x.kind === "has-alternate")).toBe(true);
  });

  test("Spectral: smcp → no warnings", () => {
    const font = loadFont("Spectral-Regular.ttf");
    if (!font) return; // skip if not present
    const w = analyzeFontFeatureSettings(font, "smcp");
    expect(w).toEqual([]);
  });

  test("Spectral: ordn → no warnings (has Lig+ChainCtx)", () => {
    const font = loadFont("Spectral-Regular.ttf");
    if (!font) return;
    const w = analyzeFontFeatureSettings(font, "ordn");
    expect(w).toEqual([]);
  });

  test("Spectral: frac → no warnings (has ChainCtx)", () => {
    const font = loadFont("Spectral-Regular.ttf");
    if (!font) return;
    const w = analyzeFontFeatureSettings(font, "frac");
    expect(w).toEqual([]);
  });

  test("Inter: frac → no warnings", () => {
    const font = loadFont("InterFull.ttf");
    if (!font) return;
    const w = analyzeFontFeatureSettings(font, "frac");
    expect(w).toEqual([]);
  });

  test("Inter: ordn → no warnings (has Lig+ChainCtx)", () => {
    const font = loadFont("InterFull.ttf");
    if (!font) return;
    const w = analyzeFontFeatureSettings(font, "ordn");
    expect(w).toEqual([]);
  });

  test("Inter: smcp → not-in-gsub", () => {
    const font = loadFont("InterFull.ttf");
    if (!font) return;
    const w = analyzeFontFeatureSettings(font, "smcp");
    expect(w.some((x) => x.kind === "not-in-gsub")).toBe(true);
  });

  test("Noto Naskh Arabic: ordn → no warnings (has ChainCtx)", () => {
    const font = loadFont("NotoNaskhArabic-Regular.ttf");
    if (!font) return;
    const w = analyzeFontFeatureSettings(font, "ordn");
    expect(w).toEqual([]);
  });
});
