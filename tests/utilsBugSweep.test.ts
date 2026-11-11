/**
 * Adversarial bug-sweep RED tests for pure utilities in components/utils.js.
 *
 * Each describe block captures ONE confirmed bug (asserting DESIRED behavior).
 * These tests are RED on current code — see notes/TODO-BUG-*.md companions.
 *
 * utils.js pulls in psychojs/browser-only modules; only those seams are
 * mocked. The functions under test (getGCD, createSignalingMap,
 * getValuesEvenlySpacedWithinInterval, CharacterSetRect) run for real.
 *
 * @jest-environment node
 */

jest.mock("../components/global", () => ({
  displayOptions: { pixPerCm: 40 },
  eyeTrackingStimulusRecords: [],
  fixationConfig: { pos: [0, 0], nominalPos: [0, 0] },
  skipTrialOrBlock: {},
  status: { trial: 1, block: 1 },
  targetEccentricityDeg: { x: 0, y: 0 },
  thisExperimentInfo: {},
  viewingDistanceCm: { current: 40 },
}));
jest.mock("../components/globalPsychoJS", () => ({
  psychoJS: {
    window: { _size: [1920, 1080] },
    experiment: { addData: jest.fn() },
  },
  psychojsMouse: { getPos: () => [0, 0] },
  to_px: () => [0, 0],
}));
jest.mock("../parameters/paramReader", () => ({
  paramReader: { read: jest.fn(), has: jest.fn() },
}));
jest.mock("../psychojs/src/data/MultiStairHandler.js", () => ({
  MultiStairHandler: class {},
}));
jest.mock("../components/eyeTrackingFacilitation", () => ({
  getAppleCoordinatePosition: jest.fn(() => 0),
}));
jest.mock("../components/readingAddons", () => ({
  pxToPt: (px: number) => px,
}));
jest.mock("../components/errorHandling", () => ({
  warning: jest.fn(),
}));
jest.mock("../components/multiple-displays/globals.ts", () => ({
  Screens: [
    {
      pxPerCm: 40,
      fixationConfig: { pos: [0, 0], nominalPos: [0, 0] },
      nearestPointXYZDeg: [0, 0],
      nearestPointXYZPx: [0, 0],
    },
  ],
}));
jest.mock("../components/multiple-displays/utils.ts", () => ({
  XYDegOfPx: jest.fn(() => [0, 0]),
  XYPxOfDeg: jest.fn(() => [0, 0]),
}));
jest.mock("../components/readPhrases.js", () => ({
  useWordDigitBool: { current: false },
}));
jest.mock("../components/letter", () => ({
  logWebGLInfoToFormspree: jest.fn(),
}));
jest.mock("../components/webglRequirements", () => ({
  measureWebGLCapabilities: jest.fn(() => ({ supported: false })),
}));
jest.mock("../components/fontInstancing", () => ({
  getFontInstancingTimesMs: jest.fn(() => null),
  getFontInstancingTotalTimeMs: jest.fn(() => null),
}));
jest.mock("../components/longTaskRecorder", () => ({
  createLongTaskRecorder: () => ({ flushTrial: jest.fn(), record: jest.fn() }),
}));

import {
  getGCD,
  createSignalingMap,
  getValuesEvenlySpacedWithinInterval,
  CharacterSetRect,
} from "../components/utils";

// ---------------------------------------------------------------------------
// BUG: getGCD divides by the decimal COUNT, not by 10^decimalCount.
// getGCD(0.5, 0.25) must be 0.25 (50 & 25 → gcd 25 → /100). Current code
// returns 25/2 = 12.5.
// ---------------------------------------------------------------------------
describe("getGCD (float GCD)", () => {
  it("integer args pass through the integer gcd (control)", () => {
    expect(getGCD(12, 18)).toBe(6);
  });

  it("floats: gcd is scaled back down by 10^maxDecimals", () => {
    // 0.5 = 50/100, 0.25 = 25/100 → gcd(50,25)/100 = 0.25
    expect(getGCD(0.5, 0.25)).toBe(0.25);
  });

  it("floats with one decimal: gcd(0.2, 0.3) = 0.1", () => {
    // 2/10 and 3/10 → gcd(2,3)/10 = 1/10
    expect(getGCD(0.2, 0.3)).toBe(0.1);
  });
});

// ---------------------------------------------------------------------------
// BUG: createSignalingMap's keycode pool omits '9' (57) and 'Z' (90) —
// digit range is 48..56 and letter range is 65..89 (both off by one).
// Documented contract: keys [0..9,A..Z]. The 10th response must get 57
// ('9'), the 36th must get 90 ('Z'); today the 36th gets undefined.
// ---------------------------------------------------------------------------
describe("createSignalingMap (ascii keycode pool)", () => {
  it("single response maps to '0' (48)", () => {
    expect(createSignalingMap(["a"])).toEqual({ a: 48 });
  });

  it("10th response maps to '9' (57), not 'A' (65)", () => {
    const responses = Array.from({ length: 10 }, (_, i) => `r${i}`);
    const map = createSignalingMap(responses);
    expect(map["r9"]).toBe(57);
  });

  it("36 responses: last maps to 'Z' (90), not undefined", () => {
    const responses = Array.from({ length: 36 }, (_, i) => `r${i}`);
    const map = createSignalingMap(responses);
    expect(map["r35"]).toBe(90);
  });

  it("every response gets a defined keycode", () => {
    const responses = Array.from({ length: 36 }, (_, i) => `r${i}`);
    const map = createSignalingMap(responses);
    expect(Object.values(map).every((c) => typeof c === "number")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BUG: getValuesEvenlySpacedWithinInterval does not honor its documented
// inclusive-endpoints contract: (4,[1,4]) must be [1,2,3,4] and (3,[0,1])
// must be [0,0.5,1]. Current code divides the range by n instead of n-1,
// never placing values at the interval endpoints.
// ---------------------------------------------------------------------------
describe("getValuesEvenlySpacedWithinInterval (documented examples)", () => {
  it("(4, [1,4]) => [1,2,3,4]", () => {
    expect(getValuesEvenlySpacedWithinInterval(4, [1, 4])).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it("(3, [0,1]) => [0,0.5,1]", () => {
    expect(getValuesEvenlySpacedWithinInterval(3, [0, 1])).toEqual([0, 0.5, 1]);
  });

  it("(2, [1,4]) => [1,4] (endpoints included, control)", () => {
    expect(getValuesEvenlySpacedWithinInterval(2, [1, 4])).toEqual([1, 4]);
  });
});

// ---------------------------------------------------------------------------
// BUG: CharacterSetRect.scale/offset/inset silently drop the subclass's
// metadata. scale() passes `this.xHeightPt`/`this.spacingPt` — properties
// that do not exist (constructor stores xHeight/spacing) — and omits
// characterSetHeight, characterOffsetPxPerFontSize, typographicFactor,
// ascentPxPerFontSize, meanWidthPxPerFontSize entirely. offset()/inset()
// share the truncation. A transformed CharacterSetRect must keep the
// metadata (size-per-font-size fields scaled for scale(); untouched for
// offset()/inset(); typographicFactor is dimensionless — always preserved).
// ---------------------------------------------------------------------------
describe("CharacterSetRect metadata survives transforms", () => {
  const makeRect = () =>
    new CharacterSetRect(
      [-10, -10],
      [10, 10],
      "pix",
      "AB",
      { A: [1, 2], B: [-1, -2] },
      2.5, // ascentToDescent (dimensionless ratio — preserved)
      0.7, // xHeight
      1.1, // spacing
      0.9, // characterSetHeight
      0.05, // characterOffsetPxPerFontSize
      1.3, // typographicFactor (dimensionless)
      0.72, // ascentPxPerFontSize
      0.8, // meanWidthPxPerFontSize
    );

  it("constructor stores all metadata (control)", () => {
    const r = makeRect();
    expect(r.characterSet).toBe("AB");
    expect(r.xHeight).toBe(0.7);
    expect(r.spacing).toBe(1.1);
    expect(r.characterSetHeight).toBe(0.9);
    expect(r.characterOffsetPxPerFontSize).toBe(0.05);
    expect(r.typographicFactor).toBe(1.3);
    expect(r.ascentPxPerFontSize).toBe(0.72);
    expect(r.meanWidthPxPerFontSize).toBe(0.8);
  });

  it("scale() scales per-font-size size fields and preserves ratios", () => {
    const s = makeRect().scale(2);
    expect(s.xHeight).toBeCloseTo(1.4);
    expect(s.spacing).toBeCloseTo(2.2);
    expect(s.characterSetHeight).toBeCloseTo(1.8);
    expect(s.characterOffsetPxPerFontSize).toBeCloseTo(0.1);
    expect(s.ascentPxPerFontSize).toBeCloseTo(1.44);
    expect(s.meanWidthPxPerFontSize).toBeCloseTo(1.6);
    expect(s.ascentToDescent).toBe(2.5); // dimensionless ratio
    expect(s.typographicFactor).toBe(1.3); // dimensionless ratio
    expect(s.characterSet).toBe("AB");
  });

  it("offset() preserves metadata untouched", () => {
    const o = makeRect().offset([5, 7]);
    expect(o.xHeight).toBe(0.7);
    expect(o.spacing).toBe(1.1);
    expect(o.characterSetHeight).toBe(0.9);
    expect(o.characterOffsetPxPerFontSize).toBe(0.05);
    expect(o.typographicFactor).toBe(1.3);
    expect(o.ascentPxPerFontSize).toBe(0.72);
    expect(o.meanWidthPxPerFontSize).toBe(0.8);
    expect(o.characterSet).toBe("AB");
    expect(o.centers).toEqual({ A: [1, 2], B: [-1, -2] }); // see offset TODO
  });

  it("inset() preserves metadata untouched", () => {
    const i = makeRect().inset(1, 1);
    expect(i.xHeight).toBe(0.7);
    expect(i.typographicFactor).toBe(1.3);
    expect(i.characterSet).toBe("AB");
  });
});
