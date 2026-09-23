/**
 * fontBoundingBoxReNominalRect must be logged in em (re nominal font size),
 * NOT px→pt converted. Both V1 (CharacterSetRect) and V2
 * (stimulusRectPerFontSize) rects are unit-less ratios — pxToPt multiplies
 * them by a device-dependent pt/px factor, so the same font logs different
 * "ReNominal" values on different screens and contradicts the sibling em
 * columns (fontXHeightReNominal etc.) logged in the same call.
 *
 * @jest-environment node
 */

jest.mock("webfontloader", () => ({ load: jest.fn() }));
jest.mock("../threshold", () => ({ paramReader: { read: jest.fn() } }));
jest.mock("../components/utils", () => ({
  isBlockLabel: (bc: string) => /^[0-9]+$/.test(String(bc)),
  toFixedNumber: (v: number, n: number) => Number(Number(v).toFixed(n)),
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

/** Minimal rect with production Rectangle.toString(nDigits, toPt) semantics:
 * toPt=true scales by ptPerPx (device-dependent), toPt=false returns em. */
const makeRect = (w: number, h: number) => ({
  toString: jest.fn((nDigits: number, toPt: boolean) => {
    const ptPerPx = 72 / 2.54 / 41.83; // pxPerCm=41.83 → 0.6776…
    const s = (v: number) => Number((toPt ? v * ptPerPx : v).toFixed(nDigits));
    return `[(-${s(w / 2)}, -${s(h / 2)}), (${s(w / 2)}, ${s(h / 2)})]`;
  }),
});

const makeBoundingBox = (rect: ReturnType<typeof makeRect>) => ({
  stimulusRectPerFontSize: rect,
  xHeight: 0.548,
  spacing: 0.495,
  characterSetHeight: 0.974,
  toString: rect.toString, // V1 legacy CharacterSetRect exposes toString
});

describe("addFontGeometryToOutputData logs re-nominal (em) rect", () => {
  let addData: jest.Mock;
  beforeEach(() => {
    addData = jest.fn();
    mockedReader.read.mockReset();
  });

  const loggedRect = () =>
    addData.mock.calls.find(
      (c) => c[0] === "fontBoundingBoxReNominalRect",
    )?.[1];

  it.each([
    ["V2 (EasyEyesLettersVersion=2, targetKind=letter)", "2"],
    ["V1 legacy (CharacterSetRect)", "1"],
  ])("%s: no px→pt conversion", (_name, version) => {
    mockedReader.read.mockReturnValue(version);
    const rect = makeRect(0.7412, 0.9736); // Roboto, Mac: em
    addFontGeometryToOutputData(
      makeBoundingBox(rect) as any,
      { experiment: { addData } } as any,
    );
    // em values, not scaled by pt/px (0.6776 would give ±0.2512/±0.3298)
    expect(loggedRect()).toBe("[(-0.3706, -0.4868), (0.3706, 0.4868)]");
    expect(rect.toString.mock.calls[0][1]).not.toBe(true); // no toPt
  });

  it("logs sibling columns as raw em (regression guard)", () => {
    mockedReader.read.mockReturnValue("2");
    addFontGeometryToOutputData(
      makeBoundingBox(makeRect(1, 1)) as any,
      {
        experiment: { addData },
      } as any,
    );
    const byKey = Object.fromEntries(addData.mock.calls);
    expect(byKey["fontXHeightReNominal"]).toBe("0.548");
    expect(byKey["fontSpacingReNominal"]).toBe("0.495");
    expect(byKey["fontCharacterSetHeightReNominal"]).toBe("0.974");
  });
});
