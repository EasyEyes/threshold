/** @jest-environment jsdom */
/**
 * transformCore: dependency-free deg<->px transforms with explicit params.
 *
 * RED spec:
 * 1. EQUIVALENCE — for identical inputs, the pure functions reproduce the
 *    Screens-global wrappers (XYPxOfDeg/XYDegOfPx) BIT-EXACTLY, across
 *    randomized configs. This is the GREEN capture that lets the wrappers
 *    delegate to the core without changing any behavior.
 * 2. REPAIR IDENTITIES — the math the repair tool relies on:
 *    a. roundtrip: xyDegOfPxCore(xyPxOfDegCore(p, P), P) === p.
 *    b. deg origin lands exactly on fixation for ANY params (the bug's
 *       defining symptom, now a pinned invariant).
 *    c. buggy->actual repair composition matches the independently computed
 *       blast-radius numbers (cross-checked table).
 */
jest.mock("../components/global", () => ({
  viewingDistanceCm: { current: 50 },
}));
import { Screens } from "../components/multiple-displays/globals";
import { XYDegOfPx, XYPxOfDeg } from "../components/multiple-displays/utils";
import {
  deltaXYDegOfPx,
  deltaXYPxOfDeg,
  xyDegOfPxCore,
  xyPxOfDegCore,
  type TransformParams,
} from "../components/multiple-displays/transformCore";

const setupScreens = (
  pxPerCm: number,
  dist: number,
  nearest: number[],
  fixation: number[],
) => {
  // Wrappers compute with the GLOBAL viewingDistanceCm.current, not
  // Screens[0].viewingDistanceCm — set both so equivalence is exact.
  (require("../components/global") as any).viewingDistanceCm.current = dist;
  Screens[0].pxPerCm = pxPerCm;
  Screens[0].viewingDistanceCm = dist;
  Screens[0].nearestPointXYZPx = nearest;
  Screens[0].fixationXYZPx = [fixation[0], fixation[1], 0];
  Screens[0].fixationConfig.pos = fixation;
  Screens[0].fixationConfig.nominalPos = [0, 0];
};

let seed = 987654321;
const rand = () =>
  (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const range = (a: number, b: number) => a + rand() * (b - a);

const N = 40;

describe("equivalence: core === Screens-global wrappers (bit-exact)", () => {
  test("xyPxOfDegCore === XYPxOfDeg", () => {
    for (let i = 0; i < N; i++) {
      const pxPerCm = range(15, 90);
      const dist = range(30, 80);
      const nearest = [range(-300, 300), range(-200, 200)];
      const fixation = [range(-200, 200), range(-150, 150)];
      setupScreens(pxPerCm, dist, nearest, fixation);
      const params: TransformParams = {
        pxPerCm,
        viewingDistanceCm: dist,
        fixationXYPx: fixation,
        nearestPointXYZPx: nearest,
      };
      const deg = [range(-20, 20), range(-12, 12)];
      const viaWrapper = XYPxOfDeg(0, deg, true, false) as number[];
      const viaCore = xyPxOfDegCore(deg, params) as number[];
      expect(viaCore[0]).toBe(viaWrapper[0]);
      expect(viaCore[1]).toBe(viaWrapper[1]);
    }
  });

  test("xyDegOfPxCore === XYDegOfPx", () => {
    for (let i = 0; i < N; i++) {
      const pxPerCm = range(15, 90);
      const dist = range(30, 80);
      const nearest = [range(-300, 300), range(-200, 200)];
      const fixation = [range(-200, 200), range(-150, 150)];
      setupScreens(pxPerCm, dist, nearest, fixation);
      const params: TransformParams = {
        pxPerCm,
        viewingDistanceCm: dist,
        fixationXYPx: fixation,
        nearestPointXYZPx: nearest,
      };
      const px = [range(-400, 400), range(-250, 250)];
      const viaWrapper = XYDegOfPx(0, px, true, false) as number[];
      const viaCore = xyDegOfPxCore(px, params) as number[];
      expect(viaCore[0]).toBe(viaWrapper[0]);
      expect(viaCore[1]).toBe(viaWrapper[1]);
    }
  });

  test("delta functions match at the extremes (0 and >= 90 deg)", () => {
    setupScreens(40, 50, [0, 0], [0, 0]);
    expect(deltaXYPxOfDeg([0, 0], 40, 50)).toEqual([0, 0]);
    expect(deltaXYDegOfPx([0, 0], 40, 50)).toEqual([0, 0]);
    // >= 90 deg: clamped via recursion, finite
    const big = deltaXYPxOfDeg([100, 0], 40, 50);
    expect(Number.isFinite(big[0])).toBe(true);
    expect(big[0]).toBeGreaterThan(0);
    const bigDiag = deltaXYPxOfDeg([80, 80], 40, 50);
    expect(Number.isFinite(bigDiag[0])).toBe(true);
  });
});

describe("repair identities", () => {
  const W = 1440;
  const H = 900;

  test("roundtrip is exact for any params", () => {
    for (let i = 0; i < N; i++) {
      const params: TransformParams = {
        pxPerCm: range(15, 90),
        viewingDistanceCm: range(30, 80),
        fixationXYPx: [range(-200, 200), range(-150, 150)],
        nearestPointXYZPx: [range(-300, 300), range(-200, 200)],
      };
      const deg = [range(-15, 15), range(-10, 10)];
      const px = xyPxOfDegCore(deg, params) as number[];
      const back = xyDegOfPxCore(px, params) as number[];
      expect(back[0]).toBeCloseTo(deg[0], 9);
      expect(back[1]).toBeCloseTo(deg[1], 9);
    }
  });

  test("deg origin lands exactly on fixation for ANY nearest point", () => {
    for (let i = 0; i < N; i++) {
      const fixation = [range(-200, 200), range(-150, 150)];
      const params: TransformParams = {
        pxPerCm: 45,
        viewingDistanceCm: 50,
        fixationXYPx: fixation,
        nearestPointXYZPx: [range(-800, 800), range(-500, 500)],
      };
      const px = xyPxOfDegCore([0, 0], params) as number[];
      expect(px[0]).toBeCloseTo(fixation[0], 9);
      expect(px[1]).toBeCloseTo(fixation[1], 9);
    }
  });

  test("buggy->actual repair composition matches the blast-radius table", () => {
    // Buggy state: rc raw value [W/2, H/2] used as psychoJS center-origin px.
    const pxPerCm = 45;
    const dist = 50;
    const rawRc = [W / 2, H / 2]; // eye truly centered
    const buggyParams: TransformParams = {
      pxPerCm,
      viewingDistanceCm: dist,
      fixationXYPx: [0, 0],
      nearestPointXYZPx: rawRc,
    };
    const correctParams: TransformParams = {
      ...buggyParams,
      nearestPointXYZPx: [rawRc[0] - W / 2, H / 2 - rawRc[1]],
    };
    const actualOf = (req: number[]) =>
      xyDegOfPxCore(
        xyPxOfDegCore(req, buggyParams) as number[],
        correctParams,
      ) as number[];

    // Cross-checked against the independently computed table (45 px/cm run):
    expect(actualOf([10, 0])[0]).toBeCloseTo(10.54, 2);
    expect(actualOf([10, 0])[1]).toBeCloseTo(0.3, 2);
    expect(actualOf([-10, 0])[0]).toBeCloseTo(-11.78, 2);
    expect(actualOf([-10, 0])[1]).toBeCloseTo(-0.58, 2);
    expect(actualOf([-15, 0])[0]).toBeCloseTo(-18.11, 2);
    expect(actualOf([0, 0])[0]).toBeCloseTo(0, 9);
    // Size: 1-deg-tall at (-10,0) drawn ~11.7% larger (blastRadius table).
    const a = xyPxOfDegCore([-10, 0], buggyParams) as number[];
    const b = xyPxOfDegCore([-10, 1], buggyParams) as number[];
    const drawnPx = b[1] - a[1];
    const a2 = xyPxOfDegCore([-10, 0], correctParams) as number[];
    const b2 = xyPxOfDegCore([-10, 1], correctParams) as number[];
    const truePx = b2[1] - a2[1];
    expect(drawnPx / truePx - 1).toBeCloseTo(0.117, 2);
  });

  test("repair is a no-op when the nearest point was already correct", () => {
    const params: TransformParams = {
      pxPerCm: 45,
      viewingDistanceCm: 50,
      fixationXYPx: [0, 0],
      nearestPointXYZPx: [37, -22], // small real eye offset, correctly converted
    };
    const deg = [7.5, -3.25];
    const px = xyPxOfDegCore(deg, params) as number[];
    const back = xyDegOfPxCore(px, params) as number[];
    expect(back[0]).toBeCloseTo(deg[0], 9);
    expect(back[1]).toBeCloseTo(deg[1], 9);
  });
});
