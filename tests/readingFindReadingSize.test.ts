/**
 * @jest-environment jsdom
 *
 * Pre-block reading sizing (fd4a5a7a-era regression): threshold.js calls
 * findReadingSize(..., "block"), which resolves `bc` to the ARRAY of the
 * block's condition labels. ParamReader.read(name, <array>) returns []
 * (no glossary fallback — the array matches no block number), so the
 * fontMaxPhysicalPx validation added to readTrialLevelLetterParams threw
 * "fontMaxPhysicalPx must be a positive number" on EVERY reading block's
 * pre-block sizing, before the first trial. The array must be normalized
 * to a real condition label so reads return values/glossary defaults.
 */
jest.mock("../components/global", () => {
  class DefaultMap extends Map {}
  return {
    DefaultMap,
    status: { block: 1, block_condition: "1_1" },
    displayOptions: {},
    font: { name: "TestFont", padding: 0, kerning: 0 },
    fontCharacterSet: { current: ["a", "b"] },
    readingCorpusArchive: {},
    readingFrequencyToWordArchive: {},
    readingPageStats: {},
    readingThisBlockPages: {},
    readingUsedText: {},
    readingWordFrequencyArchive: {},
    readingWordListArchive: {},
    timing: {},
    readingLineLengthUnit: {},
    readingConfig: {},
    targetEccentricityDeg: {},
    readingCorpusDepleted: {},
    readingPageIndex: {},
    readingCorpusPastFoils: {},
    readingCorpusPastTargets: {},
    readingCorpusFoilsArchive: {},
    letterConfig: { fontMaxPhysicalPxByCondition: new Map() },
    psychoJS: { window: {} },
  };
});
jest.mock("../components/bounding", () => ({
  _getCharacterSetBoundingBox: () => ({ width: 10, height: 10 }),
}));
jest.mock("../psychojs/src", () => ({ visual: {} }));
jest.mock("../threshold", () => ({ paramReader: {} }));
jest.mock("../components/globalPsychoJS", () => ({ psychoJS: { window: {} } }));
jest.mock("../components/boundingNew", () => ({ ctx: {} }));
jest.mock("../components/errorHandling", () => ({ warning: () => {} }));
jest.mock("../components/utils", () => ({
  degreesToPixels: (d: number) => d * 60,
  getRandomInt: () => 0,
  logger: { info: () => {}, exp: () => {} },
  Rectangle: class {},
  xyPxOfDeg: () => [0, 0],
  colorRGBASnippetToRGBA: () => [0, 0, 0, 1],
  debug: { value: false },
  getUnionRect: () => ({}),
  isReadingWithSimultaneousQuestionAndAnswer: () => false,
}));
jest.mock("../preprocess/fontPixiMetricsStringDefault", () => ({
  readFontMetricsCharacterSet: () => "ab",
}));

import { findReadingSize } from "../components/readingAddons";

/** Reader mirroring ParamReader's shape-dependent returns. */
const makeReader = () => ({
  block_conditions: ["1_1", "1_2"],
  read: (name: string, key: unknown) => {
    if (Array.isArray(key)) return []; // real behavior: no glossary fallback
    const defaults: Record<string, unknown> = {
      fontMaxPhysicalPx: 2000,
      fontMaxShrinkage: 0.8,
      thresholdParameter: "spacingDeg",
      targetDurationSec: 0.5,
      markingOffsetBeforeTargetOnsetSecs: 0,
      spacingDirection: "radial",
      spacingSymmetry: "symmetric",
      targetSizeDeg: 1,
      targetSizeIsHeightBool: true,
      targetMinPhysicalPx: 10,
      spacingOverSizeRatio: 1.4,
      spacingRelationToSize: "typographic",
      thresholdAllowedBlackoutBool: false,
      responseMaxOptions: 0,
      readingNominalSizePt: 18,
      fontTrackingForLetters: 0,
    };
    const v = defaults[name] ?? 0;
    // String label → scalar; block number → per-condition array (real shape).
    return typeof key === "number" ? [v] : v;
  },
});

describe("findReadingSize — pre-block (block-mode) call", () => {
  it("does not throw: fontMaxPhysicalPx resolves via a real condition label", () => {
    const paragraph = { setPos: () => {}, setCharacterSetRect: () => {} };
    expect(() =>
      findReadingSize(
        "nominalPt",
        makeReader() as any,
        paragraph as any,
        "block",
      ),
    ).not.toThrow();
  });

  it("returns a positive font size for the block", () => {
    const paragraph = { setPos: () => {}, setCharacterSetRect: () => {} };
    const px = findReadingSize(
      "nominalPt",
      makeReader() as any,
      paragraph as any,
      "block",
    );
    expect(typeof px).toBe("number");
    expect(px).toBeGreaterThan(0);
  });
});
