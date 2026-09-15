/** @jest-environment jsdom */
/**
 * INVESTIGATION ONLY (no fix yet): is deg<->px coordinate conversion correct,
 * and where does the reported asymmetric grid distortion come from?
 */
jest.mock("../components/global", () => ({
  viewingDistanceCm: { current: 50 },
}));
import { Screens } from "../components/multiple-displays/globals";
import { XYPxOfDeg, XYDegOfPx } from "../components/multiple-displays/utils";

const setupScreen = (
  fixationPos: number[] = [0, 0],
  nearestPoint: number[] = [0, 0],
) => {
  Screens[0].pxPerCm = 20;
  Screens[0].viewingDistanceCm = 50;

  Screens[0].nearestPointXYZPx = nearestPoint;
  Screens[0].fixationXYZPx = [fixationPos[0], fixationPos[1], 0];
  Screens[0].fixationConfig.pos = fixationPos;
  Screens[0].fixationConfig.nominalPos = [0, 0];
};

describe("coordinate conversion sanity", () => {
  beforeEach(() => setupScreen());

  test("perspective formula: 10 deg at 50cm, 20px/cm", () => {
    const [x] = XYPxOfDeg(0, [10, 0]) as number[];
    expect(x).toBeCloseTo(20 * 50 * Math.tan((10 * Math.PI) / 180), 6);
  });

  test("left/right symmetry about fixation at screen center", () => {
    const right = XYPxOfDeg(0, [10, 0]) as number[];
    const left = XYPxOfDeg(0, [-10, 0]) as number[];
    expect(right[0]).toBeCloseTo(-left[0], 10);
    expect(right[1]).toBeCloseTo(0, 10);
    expect(left[1]).toBeCloseTo(0, 10);
  });

  test("square near origin stays square (1x1 deg)", () => {
    // a small square in deg should map to ~equal px sides near fixation
    const dx = (XYPxOfDeg(0, [1, 0]) as number[])[0];
    const dy = (XYPxOfDeg(0, [0, 1]) as number[])[1];
    expect(dx).toBeCloseTo(dy, 6);
  });

  test("equal eccentricity => equal distortion in every direction", () => {
    // Points at 10 deg in 8 compass directions should all land at same px radius
    const radii = [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
      const p = XYPxOfDeg(0, [
        10 * Math.cos((a * Math.PI) / 180),
        10 * Math.sin((a * Math.PI) / 180),
      ]) as number[];
      return Math.hypot(p[0], p[1]);
    });
    for (const r of radii) expect(r).toBeCloseTo(radii[0], 6);
  });

  test("roundtrip XYPxOfDeg -> XYDegOfPx", () => {
    const deg: number[] = [7.3, -4.1];
    const px = XYPxOfDeg(0, deg) as number[];
    const back = XYDegOfPx(0, px) as number[];
    expect(back[0]).toBeCloseTo(deg[0], 6);
    expect(back[1]).toBeCloseTo(deg[1], 6);
  });

  test("static grid (nominal fixation) vs vertices (real fixation) mismatch", () => {
    // If real fixation pos differs from nominal (random offset), does the
    // static 'deg' grid use a mix of the two?
    setupScreen([100, 0]); // real fixation 100px right of nominal center
    // grid._getDegGridPathVertices calls XYPxOfDeg WITHOUT the dynamic flag,
    // i.e. always useRealFixationXY=true
    const lineAtPlus5 = (XYPxOfDeg(0, [5, 0]) as number[])[0];
    const lineAtMinus5 = (XYPxOfDeg(0, [-5, 0]) as number[])[0];
    // ~Symmetric about REAL fixation pos (100px), not screen center.
    // Small (<1px) deviation from exact 100 is the genuine second-order
    // effect of fixation being offset from the nearest point.
    expect(Math.abs((lineAtPlus5 + lineAtMinus5) / 2 - 100)).toBeLessThan(1);
  });

  test("QUANTIFY: rc nearestXYPx (top-left origin) assigned to nearestPointXYZPx (center origin)", () => {
    // rc reports nearestXYPx with origin at TOP-LEFT, y down;
    // threshold assigns it verbatim to nearestPointXYZPx, which XYPxOfDeg
    // treats as psychoJS center-origin, y up.
    const W = 1440,
      H = 900;
    const eyeOffsetCm = [2, 1]; // eye 2cm right, 1cm above screen center
    const pxPerCm = 20;
    // What rc delivers (top-left origin, y down):
    const rcNearestXYPx = [
      W / 2 + eyeOffsetCm[0] * pxPerCm,
      H / 2 - eyeOffsetCm[1] * pxPerCm,
    ];
    // Correct value in psychoJS center-origin, y up:
    const correctNearest = [eyeOffsetCm[0] * pxPerCm, eyeOffsetCm[1] * pxPerCm];

    const lineSpacing = (nearest: number[]) => {
      setupScreen([0, 0], nearest);
      const pxOf = (deg: number) => (XYPxOfDeg(0, [deg, 0]) as number[])[0];
      const sp = (a: number, b: number) => Math.abs(pxOf(b) - pxOf(a));
      return {
        leftEdge: sp(-15, -14), // px per 1 deg near left edge
        rightEdge: sp(14, 15), // px per 1 deg near right edge
        nearOrigin: sp(-0.5, 0.5),
      };
    };
    const buggy = lineSpacing(rcNearestXYPx);
    const correct = lineSpacing(correctNearest);
    console.log("buggy (top-left origin assigned):", buggy);
    console.log("correct (center origin):", correct);
    // Correct: edges symmetric within a few % (residual is the genuine
    // 2cm eye offset from center, not a bug)
    expect(
      Math.abs(correct.leftEdge - correct.rightEdge) / correct.rightEdge,
    ).toBeLessThan(0.15);
    // Buggy: left edge massively more stretched than right edge
    expect(buggy.leftEdge).toBeGreaterThan(2 * buggy.rightEdge);
  });
});
