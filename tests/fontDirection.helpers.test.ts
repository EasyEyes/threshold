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
