/**
 * fontVariantLigatures — pure translation tests (RED for Phase 3).
 *
 * The glossary type is multicategorical (comma-separated keywords, array or
 * string from paramReader). Canvas has no font-variant-ligatures, so keywords
 * are translated to OpenType feature tags and merged into the string baked
 * by the WASM font instancer (process_font 4th arg) — the Phase-2 mechanism.
 *
 * CSS font-variant-ligatures spec mapping:
 *   common-ligatures       → "liga" 1, "clig" 1
 *   no-common-ligatures    → "liga" 0, "clig" 0
 *   discretionary-ligatures→ "dlig" 1
 *   no-discretionary-…     → "dlig" 0
 *   historical-ligatures   → "hlig" 1
 *   no-historical-…        → "hlig" 0
 *   contextual             → "calt" 1
 *   no-contextual          → "calt" 0
 *   none                   → all five tags 0
 *   normal                 → no-op (browser/font defaults)
 *
 * CSS precedence: font-variant-ligatures overrides font-feature-settings
 * for the same tag, so ligature-derived entries win merge conflicts.
 *
 * @jest-environment node
 */

import {
  normalizeVariantLigatures,
  variantLigaturesToFeatureEntries,
  mergeLigatureFeatureSettings,
} from "../components/fontVariantLigatures";

describe("normalizeVariantLigatures — input shapes", () => {
  it("single keyword string", () => {
    expect(normalizeVariantLigatures("discretionary-ligatures")).toEqual([
      "discretionary-ligatures",
    ]);
  });

  it("comma-separated string (multicategorical cell)", () => {
    expect(
      normalizeVariantLigatures("discretionary-ligatures, contextual"),
    ).toEqual(["discretionary-ligatures", "contextual"]);
  });

  it("array (paramReader multicategorical shape)", () => {
    expect(
      normalizeVariantLigatures(["discretionary-ligatures", "contextual"]),
    ).toEqual(["discretionary-ligatures", "contextual"]);
  });

  it.each(["", undefined, null])("blank %p → []", (raw) => {
    expect(normalizeVariantLigatures(raw)).toEqual([]);
  });

  it("trims whitespace", () => {
    expect(normalizeVariantLigatures("  normal ")).toEqual(["normal"]);
  });
});

describe("variantLigaturesToFeatureEntries — keyword→tag map", () => {
  it("blank → []", () => {
    expect(variantLigaturesToFeatureEntries("")).toEqual([]);
  });

  it("normal → [] (no-op: browser/font defaults)", () => {
    expect(variantLigaturesToFeatureEntries("normal")).toEqual([]);
  });

  it("common-ligatures → liga+clig on", () => {
    expect(variantLigaturesToFeatureEntries("common-ligatures")).toEqual([
      ["liga", 1],
      ["clig", 1],
    ]);
  });

  it("no-common-ligatures → liga+clig off", () => {
    expect(variantLigaturesToFeatureEntries("no-common-ligatures")).toEqual([
      ["liga", 0],
      ["clig", 0],
    ]);
  });

  it("discretionary-ligatures → dlig on", () => {
    expect(variantLigaturesToFeatureEntries("discretionary-ligatures")).toEqual(
      [["dlig", 1]],
    );
  });

  it("no-discretionary-ligatures → dlig off", () => {
    expect(
      variantLigaturesToFeatureEntries("no-discretionary-ligatures"),
    ).toEqual([["dlig", 0]]);
  });

  it("historical-ligatures → hlig on", () => {
    expect(variantLigaturesToFeatureEntries("historical-ligatures")).toEqual([
      ["hlig", 1],
    ]);
  });

  it("contextual → calt on", () => {
    expect(variantLigaturesToFeatureEntries("contextual")).toEqual([
      ["calt", 1],
    ]);
  });

  it("no-contextual → calt off", () => {
    expect(variantLigaturesToFeatureEntries("no-contextual")).toEqual([
      ["calt", 0],
    ]);
  });

  it("none → all five tags off", () => {
    expect(variantLigaturesToFeatureEntries("none")).toEqual([
      ["liga", 0],
      ["clig", 0],
      ["dlig", 0],
      ["hlig", 0],
      ["calt", 0],
    ]);
  });

  it("multiple keywords combine", () => {
    expect(
      variantLigaturesToFeatureEntries(
        "discretionary-ligatures, historical-ligatures",
      ),
    ).toEqual([
      ["dlig", 1],
      ["hlig", 1],
    ]);
  });

  it("conflicting keywords: last wins (deterministic)", () => {
    expect(
      variantLigaturesToFeatureEntries([
        "discretionary-ligatures",
        "no-discretionary-ligatures",
      ]),
    ).toEqual([["dlig", 0]]);
  });

  it("none then re-enable: later keyword overrides", () => {
    expect(
      variantLigaturesToFeatureEntries(["none", "discretionary-ligatures"]),
    ).toEqual([
      ["liga", 0],
      ["clig", 0],
      ["dlig", 1],
      ["hlig", 0],
      ["calt", 0],
    ]);
  });
});

describe("mergeLigatureFeatureSettings — union with fontFeatureSettings", () => {
  it("ligatures alone → translated tag string", () => {
    expect(mergeLigatureFeatureSettings("", "discretionary-ligatures")).toBe(
      '"dlig" 1',
    );
  });

  it("union: featureSettings entries kept, ligature tags appended", () => {
    expect(
      mergeLigatureFeatureSettings('"smcp" 1', "discretionary-ligatures"),
    ).toBe('"smcp" 1, "dlig" 1');
  });

  it("CSS precedence: ligature keyword wins a tag conflict", () => {
    // font-variant-ligatures overrides font-feature-settings (CSS spec).
    expect(
      mergeLigatureFeatureSettings(
        '"dlig" 0, "smcp"',
        "discretionary-ligatures",
      ),
    ).toBe('"smcp", "dlig" 1');
  });

  it("featureSettings 'normal' is a no-op (normalizes to empty)", () => {
    expect(mergeLigatureFeatureSettings("normal", "normal")).toBe("");
    expect(
      mergeLigatureFeatureSettings(" normal ", "discretionary-ligatures"),
    ).toBe('"dlig" 1');
  });

  it("none → all-off entries appended after featureSettings", () => {
    expect(mergeLigatureFeatureSettings('"smcp"', "none")).toBe(
      '"smcp", "liga" 0, "clig" 0, "dlig" 0, "hlig" 0, "calt" 0',
    );
  });

  it("featureSettings alone passes through (trimmed)", () => {
    expect(mergeLigatureFeatureSettings(' "smcp" ', "")).toBe('"smcp"');
  });

  it("both blank → empty string", () => {
    expect(mergeLigatureFeatureSettings("", "")).toBe("");
  });

  it("array-shaped ligatures input", () => {
    expect(mergeLigatureFeatureSettings("", ["discretionary-ligatures"])).toBe(
      '"dlig" 1',
    );
  });
});
