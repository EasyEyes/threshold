/**
 * Tests for the fontDirection helpers (B1).
 *
 * These are the cornerstone of the migration: `isFontLTR` must reproduce the
 * EXACT boolean semantics of the old `fontLeftToRightBool`, so that every
 * legacy `bool ? A : B` becomes `isFontLTR(dir) ? A : B` with identical
 * behavior. `readFontDirection` normalizes paramReader's array/scalar return
 * shapes; `fontDirectionToDirAttr` maps to an HTML `dir` value.
 *
 * RED until components/fontDirection.js exists.
 *
 * @jest-environment node
 */
import {
  readFontDirection,
  isFontLTR,
  fontDirectionToDirAttr,
} from "../components/fontDirection";

describe("readFontDirection", () => {
  it("returns the scalar string the reader returns for a condition", () => {
    const reader = { read: (_n: string, _bc: string) => "rtl" };
    expect(readFontDirection(reader as any, "1_2")).toBe("rtl");
  });

  it("unwraps an array (paramReader.read with a numeric block returns [])", () => {
    const reader = { read: () => ["rtl"] };
    expect(readFontDirection(reader as any, 1)).toBe("rtl");
  });

  it("defaults to 'ltr' when the reader returns an empty/blank value", () => {
    const reader = { read: () => "" };
    expect(readFontDirection(reader as any, "1_1")).toBe("ltr");
  });

  it("defaults to 'ltr' when the array's first element is blank", () => {
    const reader = { read: () => [""] };
    expect(readFontDirection(reader as any, 1)).toBe("ltr");
  });

  it("defaults to 'ltr' when the reader returns undefined", () => {
    const reader = { read: () => undefined };
    expect(readFontDirection(reader as any, "1_1")).toBe("ltr");
  });

  it("passes vertical-* values through unchanged", () => {
    const reader = { read: () => "vertical-rl" };
    expect(readFontDirection(reader as any, "1_1")).toBe("vertical-rl");
  });

  // --- case-insensitivity for HORIZONTAL values (rtl≈RTL, ltr≈LTR) ---
  // Denis's request: the glossary accepts rtl/ltr in upper OR lower case.
  // Vertical-* stay lowercase-only. Normalization happens here so every
  // downstream consumer (isFontLTR, fontDirectionToDirAttr) sees the
  // canonical lowercase form.
  it("normalizes RTL → rtl", () => {
    const reader = { read: () => "RTL" };
    expect(readFontDirection(reader as any, "1_1")).toBe("rtl");
  });
  it("normalizes LTR → ltr", () => {
    const reader = { read: () => "LTR" };
    expect(readFontDirection(reader as any, "1_1")).toBe("ltr");
  });
  it("normalizes mixed case Rtl → rtl", () => {
    const reader = { read: () => "Rtl" };
    expect(readFontDirection(reader as any, "1_1")).toBe("rtl");
  });
  it("normalizes mixed case Ltr → ltr", () => {
    const reader = { read: () => "Ltr" };
    expect(readFontDirection(reader as any, "1_1")).toBe("ltr");
  });
  it("does NOT normalize vertical-rl (lowercase-only per spec)", () => {
    // Vertical-RL in uppercase is NOT a valid category; pass it through
    // unchanged so the glossary's categorical validation catches it, rather
    // than silently treating an unknown value as something valid.
    const reader = { read: () => "Vertical-RL" };
    expect(readFontDirection(reader as any, "1_1")).toBe("Vertical-RL");
  });
});

describe("isFontLTR — mirrors the old fontLeftToRightBool", () => {
  it("ltr → true", () => {
    expect(isFontLTR("ltr")).toBe(true);
  });
  it("rtl → false", () => {
    expect(isFontLTR("rtl")).toBe(false);
  });
  it("vertical-lr → true (start edge is left)", () => {
    expect(isFontLTR("vertical-lr")).toBe(true);
  });
  it("vertical-rl → false (start edge is right)", () => {
    expect(isFontLTR("vertical-rl")).toBe(false);
  });
  // Case-insensitivity flows through readFontDirection's normalization, so
  // isFontLTR sees the canonical lowercase. (Callers should normalize via
  // readFontDirection; these pin that uppercase would be MIShandled if a
  // caller bypassed normalization — documenting the contract.)
  it("RTL passed directly is NOT recognized (caller must normalize)", () => {
    // isFontLTR does not itself lowercase; it relies on readFontDirection.
    // "RTL" is not in RTL_DIRECTIONS → treated as LTR. This documents WHY
    // normalization must happen at read time.
    expect(isFontLTR("RTL")).toBe(true);
  });
});

describe("fontDirectionToDirAttr — maps to an HTML dir value", () => {
  it("rtl → 'rtl'", () => {
    expect(fontDirectionToDirAttr("rtl")).toBe("rtl");
  });
  it("ltr → 'ltr'", () => {
    expect(fontDirectionToDirAttr("ltr")).toBe("ltr");
  });
  it("vertical-rl → 'ltr' (horizontal fallback; canvas/html have no vertical dir)", () => {
    expect(fontDirectionToDirAttr("vertical-rl")).toBe("ltr");
  });
  it("vertical-lr → 'ltr'", () => {
    expect(fontDirectionToDirAttr("vertical-lr")).toBe("ltr");
  });
});
