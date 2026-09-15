/** @jest-environment jsdom */
/**
 * Property-sweep invariants for the deg↔px conversion and the rc nearest-point
 * boundary. Complements the fixed-case tests in nearestPointFromRc.test.ts and
 * gridCoordinateInvestigation.test.ts with randomized configurations, so the
 * invariants are guarded across the whole input space, not just examples.
 */
jest.mock("../components/global", () => ({
  viewingDistanceCm: { current: 50 },
}));
import { Screens } from "../components/multiple-displays/globals";
import {
  updateNearestPointFromRc,
  XYDegOfPx,
  XYPxOfDeg,
} from "../components/multiple-displays/utils";

const W = 1440;
const H = 900;

// Deterministic LCG so failures are reproducible.
let seed = 12345;
const rand = () =>
  (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const range = (a: number, b: number) => a + rand() * (b - a);

const setup = (
  fixation: number[],
  nearest: number[],
  pxPerCm: number,
  distCm: number,
) => {
  Screens[0].pxPerCm = pxPerCm;
  Screens[0].viewingDistanceCm = distCm;
  (require("../components/global") as any).viewingDistanceCm.current = distCm;
  Screens[0].nearestPointXYZPx = nearest;
  Screens[0].fixationXYZPx = [fixation[0], fixation[1], 0];
  Screens[0].fixationConfig.pos = fixation;
  Screens[0].fixationConfig.nominalPos = [0, 0];
  (Screens[0] as any).window = { _size: [W, H] };
};

describe("conversion invariants (randomized sweep)", () => {
  const N = 50;

  test("roundtrip XYPxOfDeg -> XYDegOfPx holds for random configs", () => {
    for (let i = 0; i < N; i++) {
      setup(
        [range(-200, 200), range(-150, 150)],
        [range(-300, 300), range(-200, 200)],
        range(15, 60),
        range(30, 80),
      );
      const deg = [range(-20, 20), range(-12, 12)];
      const px = XYPxOfDeg(0, deg) as number[];
      const back = XYDegOfPx(0, px) as number[];
      expect(back[0]).toBeCloseTo(deg[0], 6);
      expect(back[1]).toBeCloseTo(deg[1], 6);
    }
  });

  test("fixation == nearest point => four-quadrant symmetry", () => {
    for (let i = 0; i < N; i++) {
      const f = [range(-300, 300), range(-200, 200)];
      setup(f, [...f], range(15, 60), range(30, 80));
      const r = XYPxOfDeg(0, [10, 7]) as number[];
      const l = XYPxOfDeg(0, [-10, -7]) as number[];
      // Symmetric about the shared fixation/nearest point.
      expect((r[0] + l[0]) / 2).toBeCloseTo(f[0], 4);
      expect((r[1] + l[1]) / 2).toBeCloseTo(f[1], 4);
    }
  });

  test("deg origin always lands exactly on fixation", () => {
    for (let i = 0; i < N; i++) {
      const f = [range(-300, 300), range(-200, 200)];
      setup(
        f,
        [range(-300, 300), range(-200, 200)],
        range(15, 60),
        range(30, 80),
      );
      const px = XYPxOfDeg(0, [0, 0]) as number[];
      expect(px[0]).toBeCloseTo(f[0], 6);
      expect(px[1]).toBeCloseTo(f[1], 6);
    }
  });

  test("px eccentricity from nearest point increases monotonically with deg", () => {
    for (let i = 0; i < N; i++) {
      const nearest = [range(-300, 300), range(-200, 200)];
      setup([...nearest], nearest, range(15, 60), range(30, 80));
      let prev = 0;
      for (const deg of [1, 5, 10, 20, 30]) {
        const px = XYPxOfDeg(0, [deg, 0]) as number[];
        const r = Math.hypot(px[0] - nearest[0], px[1] - nearest[1]);
        expect(r).toBeGreaterThan(prev);
        prev = r;
      }
    }
  });

  test("updateNearestPointFromRc sweep: on-screen rc input => on-screen result, correct quadrant", () => {
    for (let i = 0; i < N; i++) {
      setup([0, 0], [0, 0], 20, 50);
      // rc convention: top-left origin, y down, anywhere on screen.
      const rcNearest = [range(0, W), range(0, H)];
      updateNearestPointFromRc(0, {
        improvedDistanceTrackingData: { nearestXYPx: rcNearest },
      });
      const [x, y] = Screens[0].nearestPointXYZPx;
      // Center-origin result must be within the half-extents...
      expect(Math.abs(x)).toBeLessThanOrEqual(W / 2);
      expect(Math.abs(y)).toBeLessThanOrEqual(H / 2);
      // ...and in the right quadrant: rc right of center => +x; rc BELOW
      // center (y down) => NEGATIVE psychoJS y.
      expect(Math.sign(x)).toBe(Math.sign(rcNearest[0] - W / 2));
      expect(Math.sign(y)).toBe(Math.sign(H / 2 - rcNearest[1]));
    }
  });
});
