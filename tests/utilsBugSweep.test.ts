/**
 * Adversarial bug-sweep tests for utilities in components/utils.js.
 *
 * The getGCD / createSignalingMap / getValuesEvenlySpacedWithinInterval
 * utilities were removed as dead code after verifying they are referenced
 * nowhere in the website repo or the EasyEyes org.
 * The CharacterSetRect metadata bug is fixed (tests below, GREEN).
 *
 * utils.js pulls in psychojs/browser-only modules; only those seams are
 * mocked. The class under test runs for real.
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

import { CharacterSetRect } from "../components/utils";

// ---------------------------------------------------------------------------
// CharacterSetRect metadata survives transforms (fixed 2026-11-11)
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
