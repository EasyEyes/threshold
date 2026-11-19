/**
 * fontTransparency (components/fontTransparency.ts).
 *
 * Glossary: fontTransparency (default 1, range 0 to 1) scales the "A" of
 * fontColorRGBA: with color A and fontTransparency a, the effective
 * transparency is a*A. thresholdParameter=fontTransparency lets QUEST
 * control it, in log10 units.
 */
import { initGlossary } from "../parameters/glossaryRegistry";
import type { GlossaryData } from "../../source/components/types";
import {
  alphaOfColorRGBA,
  constrainFontTransparencyLevel,
  getFontOpacity,
  isFontTransparencyThreshold,
  readFontTransparency,
} from "../components/fontTransparency";

const BC = "1_1";

const useGlossary = (names: string[]) =>
  initGlossary({
    version: "test",
    superMatchingParams: [],
    glossaryFull: [],
    glossary: Object.fromEntries(names.map((n) => [n, { name: n }])),
  } as unknown as GlossaryData);

/** A reader over one condition's cells; reading an absent cell throws. */
const readerOf = (cells: Record<string, unknown>) => ({
  read: (name: string, _blockCondition: string) => {
    if (!(name in cells)) throw new Error(`unexpected read of ${name}`);
    return cells[name];
  },
});

describe("alphaOfColorRGBA", () => {
  test("is the fourth number of the color", () => {
    expect(alphaOfColorRGBA("1, 0, 0, 0.5")).toBe(0.5);
    expect(alphaOfColorRGBA("0,0,0,1")).toBe(1);
    expect(alphaOfColorRGBA(" 0, 1,  0,  0.25")).toBe(0.25);
  });

  test("accepts a color already parsed into numbers", () => {
    expect(alphaOfColorRGBA([0, 0, 1, 0.75])).toBe(0.75);
  });

  test("a color without a usable A is opaque", () => {
    expect(alphaOfColorRGBA("1, 0, 0")).toBe(1);
    expect(alphaOfColorRGBA("1, 0, 0, ")).toBe(1);
    expect(alphaOfColorRGBA("1, 0, 0, x")).toBe(1);
    expect(alphaOfColorRGBA("")).toBe(1);
    expect(alphaOfColorRGBA(undefined)).toBe(1);
  });

  test("is confined to 0…1", () => {
    expect(alphaOfColorRGBA("1, 0, 0, 2")).toBe(1);
    expect(alphaOfColorRGBA("1, 0, 0, -1")).toBe(0);
  });
});

describe("getFontOpacity", () => {
  test("glossary example: A=0.5 and fontTransparency=0.1 give 0.05", () => {
    expect(getFontOpacity("0, 0, 0, 0.5", 0.1)).toBeCloseTo(0.05, 12);
  });

  test("fontTransparency=1 presents the font color faithfully", () => {
    expect(getFontOpacity("1, 0, 0, 1", 1)).toBe(1);
    expect(getFontOpacity("1, 0, 0, 0.4", 1)).toBe(0.4);
  });

  test("an opaque color takes the transparency unchanged", () => {
    expect(getFontOpacity("0, 1, 0, 1", 0.2)).toBe(0.2);
  });

  test("the transparency is confined to 0…1", () => {
    expect(getFontOpacity("0, 0, 0, 1", 3)).toBe(1);
    expect(getFontOpacity("0, 0, 0, 1", -3)).toBe(0);
  });

  test("an unusable transparency leaves the font color as specified", () => {
    expect(getFontOpacity("0, 0, 0, 0.5", NaN)).toBe(0.5);
  });
});

describe("readFontTransparency", () => {
  test("returns the condition's value", () => {
    useGlossary(["fontTransparency"]);
    expect(readFontTransparency(readerOf({ fontTransparency: 0.2 }), BC)).toBe(
      0.2,
    );
  });

  test("reads nothing but fontTransparency (targetContrast plays no part)", () => {
    useGlossary(["fontTransparency", "targetContrast"]);
    // readerOf throws on any other read.
    expect(readFontTransparency(readerOf({ fontTransparency: 0.3 }), BC)).toBe(
      0.3,
    );
  });

  test("is confined to 0…1", () => {
    useGlossary(["fontTransparency"]);
    expect(readFontTransparency(readerOf({ fontTransparency: 7 }), BC)).toBe(1);
    expect(readFontTransparency(readerOf({ fontTransparency: -1 }), BC)).toBe(
      0,
    );
  });

  test("an experiment compiled before the parameter existed is unaffected", () => {
    useGlossary([]);
    // Reading the parameter would throw, as the real reader does for a
    // name its glossary lacks.
    expect(readFontTransparency(readerOf({}), BC)).toBe(1);
  });
});

describe("isFontTransparencyThreshold", () => {
  test("is true only when QUEST controls fontTransparency", () => {
    expect(
      isFontTransparencyThreshold(
        readerOf({ thresholdParameter: "fontTransparency" }),
        BC,
      ),
    ).toBe(true);
    for (const other of ["targetDurationSec", "targetContrast", ""])
      expect(
        isFontTransparencyThreshold(
          readerOf({ thresholdParameter: other }),
          BC,
        ),
      ).toBe(false);
  });
});

describe("constrainFontTransparencyLevel", () => {
  test("a level at or below 0 (transparency ≤ 1) is kept", () => {
    expect(constrainFontTransparencyLevel(-0.7)).toBe(-0.7);
    expect(constrainFontTransparencyLevel(0)).toBe(0);
    expect(constrainFontTransparencyLevel(-6)).toBe(-6);
  });

  test("a level above 0 is brought down to transparency 1", () => {
    expect(constrainFontTransparencyLevel(0.4)).toBe(0);
    expect(Math.pow(10, constrainFontTransparencyLevel(2))).toBe(1);
  });

  test("a non-finite level is passed on for the trial-end guard", () => {
    expect(constrainFontTransparencyLevel(NaN)).toBeNaN();
  });
});
