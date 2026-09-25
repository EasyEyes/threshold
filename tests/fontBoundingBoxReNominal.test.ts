/**
 * `fontBoundingBoxReNominalRect` and sibling font-geometry CSV columns.
 *
 * Contract (Denis Pelli's spec, Acuity24Fonts review 2026-09-23):
 * - The rect is re-nominal (dimensionless em): NO px→pt conversion (bug fixed
 *   same day; toPt scaled em values by a device-dependent pt/px factor).
 * - The rect is horizontally centered but BASELINE-anchored vertically:
 *   y ∈ [-maxDescent, +maxAscent] of fontCharacterSet on a shared baseline.
 *   (The placement rect in boundingNew.js is centered on both axes; the
 *   baseline split lives in ascentPxPerFontSize/descentPxPerFontSize.)
 * - Sloan check: width & height 1 (ascent 1, descent 0 → y ∈ [0, 1]).
 * - Column order (Denis 2026-09-23 #3): fontBoundingBoxReNominalRect,
 *   fontBoundingBoxWidthReNominal, fontBoundingBoxHeightReNominal, then the
 *   other …ReNominal params (xHeight, spacing, averageWidth), then
 *   fontNominalSizePx/Pt (not ReNominal). fontBoundingBoxHeightReNominal is
 *   renamed from fontCharacterSetHeightReNominal; fontBoundingBoxWidthReNominal
 *   and fontAverageWidthReNominal are new (latter: mean per-character ink
 *   width).
 *
 * @jest-environment node
 */

jest.mock("webfontloader", () => ({ load: jest.fn() }));
jest.mock("../threshold", () => ({ paramReader: { read: jest.fn() } }));
jest.mock("../components/utils", () => ({
  isBlockLabel: (bc: string) => /^[0-9]+$/.test(String(bc)),
  // Mirror production toFixedNumber (Math.round-based), not toFixed.
  toFixedNumber: (v: number, n: number) => Math.round(v * 10 ** n) / 10 ** n,
}));
jest.mock("../parameters/glossaryRegistry", () => ({
  getGlossary: () => ({}),
}));
jest.mock("../psychojs/src/visual/punctuationRTL.js", () => ({
  setPunctuationRTL: jest.fn(),
}));
jest.mock("../components/global", () => ({
  font: {},
  status: { block_condition: "1_1" },
  targetKind: { current: "letter" },
  typekit: { fonts: new Map() },
  skipTrialOrBlock: {
    skipTrial: false,
    skipBlock: false,
    trialId: -1,
    blockId: -1,
  },
}));

import { paramReader } from "../threshold";
import { addFontGeometryToOutputData } from "../components/fonts";

const mockedReader = paramReader as { read: jest.Mock };

/** V2 placement rect (centered on both axes), as mutated by boundingNew. */
const makePlacementRect = (w: number, h: number) => ({
  toArray: () => [
    [-w / 2, -h / 2],
    [w / 2, h / 2],
  ],
});

/** V2 bounding object (fields from boundingNew getCharacterSetBoundingBox). */
const makeBoundingBox = (over: Record<string, unknown> = {}) => ({
  stimulusRectPerFontSize: makePlacementRect(0.7412, 0.9736),
  ascentPxPerFontSize: 0.7312,
  descentPxPerFontSize: 0.2424,
  meanWidthPxPerFontSize: 0.5521,
  xHeight: 0.548,
  spacing: 0.495,
  characterSetHeight: 0.9736,
  ...over,
});

/** V1 legacy CharacterSetRect: baseline-anchored toString + toArray. */
const makeLegacyRect = () => ({
  toString: jest.fn(
    (nDigits: number) =>
      `[(-0.3706, -0.2424), (0.3706, 0.7312)] (digits ${nDigits})`,
  ),
  toArray: () => [
    [-0.3706, -0.2424],
    [0.3706, 0.7312],
  ],
  xHeight: 0.548,
  spacing: 0.495,
  characterSetHeight: 0.9736,
});

const NOMINAL_PX = 164.6598823;
const NOMINAL_PT = 111.5830009;

describe("addFontGeometryToOutputData", () => {
  let addData: jest.Mock;
  const keys = () => addData.mock.calls.map((c) => c[0]);
  const value = (k: string) => addData.mock.calls.find((c) => c[0] === k)?.[1];

  beforeEach(() => {
    addData = jest.fn();
    mockedReader.read.mockReset();
  });

  describe("V2 (EasyEyesLettersVersion=2, targetKind=letter)", () => {
    beforeEach(() => mockedReader.read.mockReturnValue(2));

    it("logs baseline-anchored, horizontally-centered rect (em, no toPt)", () => {
      addFontGeometryToOutputData(
        makeBoundingBox() as any,
        {
          experiment: { addData },
        } as any,
      );
      expect(value("fontBoundingBoxReNominalRect")).toBe(
        "[(-0.3706, -0.2424), (0.3706, 0.7312)]",
      );
    });

    it("Sloan check: width and height 1, bottom on the baseline", () => {
      addFontGeometryToOutputData(
        makeBoundingBox({
          stimulusRectPerFontSize: makePlacementRect(1, 1),
          ascentPxPerFontSize: 1,
          descentPxPerFontSize: 0,
          characterSetHeight: 1,
          meanWidthPxPerFontSize: 1,
        }) as any,
        { experiment: { addData } } as any,
      );
      expect(value("fontBoundingBoxReNominalRect")).toBe(
        "[(-0.5, 0), (0.5, 1)]",
      );
      expect(value("fontBoundingBoxWidthReNominal")).toBe("1");
      expect(value("fontBoundingBoxHeightReNominal")).toBe("1");
    });

    it("column order, renames, and new columns", () => {
      addFontGeometryToOutputData(
        makeBoundingBox() as any,
        { experiment: { addData } } as any,
        NOMINAL_PX,
        NOMINAL_PT,
      );
      expect(keys()).toEqual([
        "fontBoundingBoxReNominalRect",
        "fontBoundingBoxWidthReNominal",
        "fontBoundingBoxHeightReNominal",
        "fontXHeightReNominal",
        "fontSpacingReNominal",
        "fontAverageWidthReNominal",
        "fontNominalSizePx",
        "fontNominalSizePt",
      ]);
      expect(keys()).not.toContain("fontCharacterSetHeightReNominal");
      expect(value("fontNominalSizePx")).toBe(NOMINAL_PX);
      expect(value("fontNominalSizePt")).toBe(NOMINAL_PT);
      expect(value("fontXHeightReNominal")).toBe("0.548");
      expect(value("fontSpacingReNominal")).toBe("0.495");
      expect(value("fontBoundingBoxHeightReNominal")).toBe("0.9736");
      expect(value("fontBoundingBoxWidthReNominal")).toBe("0.7412");
      expect(value("fontAverageWidthReNominal")).toBe("0.5521");
    });

    it("omits nominal columns when nominal size not passed", () => {
      addFontGeometryToOutputData(
        makeBoundingBox() as any,
        {
          experiment: { addData },
        } as any,
      );
      expect(keys()).not.toContain("fontNominalSizePx");
      expect(keys()).not.toContain("fontNominalSizePt");
    });

    it("rect extents match width/height columns (Denis 2026-09-23 #1)", () => {
      addFontGeometryToOutputData(
        makeBoundingBox() as any,
        { experiment: { addData } } as any,
        NOMINAL_PX,
        NOMINAL_PT,
      );
      const rectString = value("fontBoundingBoxReNominalRect") as string;
      const nums = rectString.match(/-?[\d.]+/g)!.map(Number);
      const [x0, y0, x1, y1] = nums;
      expect(x1 - x0).toBeCloseTo(
        Number(value("fontBoundingBoxWidthReNominal")),
        3,
      );
      expect(y1 - y0).toBeCloseTo(
        Number(value("fontBoundingBoxHeightReNominal")),
        3,
      );
    });

    it("omits average-width column when mean width undefined", () => {
      const bb = makeBoundingBox();
      delete (bb as any).meanWidthPxPerFontSize;
      addFontGeometryToOutputData(
        bb as any,
        {
          experiment: { addData },
        } as any,
      );
      expect(keys()).not.toContain("fontAverageWidthReNominal");
    });
  });

  describe("V1 legacy (CharacterSetRect)", () => {
    beforeEach(() => mockedReader.read.mockReturnValue(1));

    it("V1 + plain V2-shaped object (non-typographic V1 config) must not crash", () => {
      // generateCharacterSetBoundingRects_New runs for ALL versions; a V1
      // table with spacingRelationToSize != typographic never replaces the
      // entry with the legacy CharacterSetRect, so the plain object reaches
      // this function. Desired: derive from its fields, not crash on toArray.
      const plain = makeBoundingBox(); // has stimulusRectPerFontSize etc.
      expect(() =>
        addFontGeometryToOutputData(
          plain as any,
          {
            experiment: { addData },
          } as any,
        ),
      ).not.toThrow();
      expect(value("fontBoundingBoxReNominalRect")).toBe(
        "[(-0.3706, -0.2424), (0.3706, 0.7312)]",
      );
      expect(value("fontBoundingBoxWidthReNominal")).toBe("0.7412");
    });

    it("logs its own (baseline-anchored) rect without toPt", () => {
      const rect = makeLegacyRect();
      addFontGeometryToOutputData(
        rect as any,
        {
          experiment: { addData },
        } as any,
      );
      expect(value("fontBoundingBoxReNominalRect")).toBe(
        "[(-0.3706, -0.2424), (0.3706, 0.7312)] (digits 4)",
      );
      expect(rect.toString.mock.calls[0][1]).not.toBe(true); // no toPt
    });

    it("column order: no average width (legacy object lacks it)", () => {
      addFontGeometryToOutputData(
        makeLegacyRect() as any,
        {
          experiment: { addData },
        } as any,
      );
      expect(keys()).toEqual([
        "fontBoundingBoxReNominalRect",
        "fontBoundingBoxWidthReNominal",
        "fontBoundingBoxHeightReNominal",
        "fontXHeightReNominal",
        "fontSpacingReNominal",
      ]);
      expect(value("fontBoundingBoxWidthReNominal")).toBe("0.7412");
    });
  });
});
