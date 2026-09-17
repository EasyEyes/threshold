/** @jest-environment jsdom */
/**
 * QUANTIFY the blast radius of the wrong-convention nearestPointXYZPx
 * (buggy state: rc top-left/y-down value assigned verbatim).
 * For a requested target at (x,y) deg relative to fixation, compute where
 * it ACTUALLY appeared (deg, evaluated against the true near point),
 * and the size error of a 1-deg stimulus at that location.
 */
jest.mock("../components/global", () => ({
  viewingDistanceCm: { current: 50 },
}));
jest.mock("../components/errorHandling", () => ({ warning: jest.fn() }));
import { Screens } from "../components/multiple-displays/globals";
import { XYDegOfPx, XYPxOfDeg } from "../components/multiple-displays/utils";

const W = 1440;
const H = 900;
const setup = (nearest: number[]) => {
  Screens[0].pxPerCm = 45;
  Screens[0].viewingDistanceCm = 50;
  Screens[0].nearestPointXYZPx = nearest;
  Screens[0].fixationXYZPx = [0, 0, 0];
  Screens[0].fixationConfig.pos = [0, 0];
  Screens[0].fixationConfig.nominalPos = [0, 0];
  (Screens[0] as any).window = { _size: [W, H] };
};

// Eye truly centered, but buggy code stores the raw rc value [W/2, H/2].
const TRUE_NEAREST = [0, 0];
const BUGGY_NEAREST = [W / 2, H / 2];

const requestedToActualDeg = (requested: number[]) => {
  setup(BUGGY_NEAREST);
  const px = XYPxOfDeg(0, requested) as number[]; // where it was drawn
  setup(TRUE_NEAREST);
  return XYDegOfPx(0, px) as number[]; // what eccentricity that really is
};

const sizeErrorPct = (atDeg: number[]) => {
  const h = 1; // 1 deg stimulus
  setup(BUGGY_NEAREST);
  const a = XYPxOfDeg(0, atDeg) as number[];
  const b = XYPxOfDeg(0, [atDeg[0], atDeg[1] + h]) as number[];
  const buggyPx = Math.hypot(b[0] - a[0], b[1] - a[1]);
  setup(TRUE_NEAREST);
  const a2 = XYPxOfDeg(0, atDeg) as number[];
  const b2 = XYPxOfDeg(0, [atDeg[0], atDeg[1] + h]) as number[];
  const truePx = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]);
  // drawn at the buggy position; report drawn size vs correct size there
  return (buggyPx / truePx - 1) * 100;
};

test("blast radius table", () => {
  console.log("\nrequested deg -> actual deg (error)");
  for (const req of [
    [0, 0],
    [5, 0],
    [-5, 0],
    [10, 0],
    [-10, 0],
    [15, 0],
    [-15, 0],
    [0, 5],
    [0, -5],
    [0, 10],
    [0, -10],
    [10, 10],
    [-10, -10],
    [-10, 10],
    [10, -10],
  ]) {
    const act = requestedToActualDeg(req);
    const err = Math.hypot(act[0] - req[0], act[1] - req[1]);
    console.log(
      `  (${req[0]}, ${req[1]}) -> (${act[0].toFixed(2)}, ${act[1].toFixed(
        2,
      )})  err=${err.toFixed(2)} deg`,
    );
  }
  console.log("\nsize error of 1-deg-tall stimulus, by location:");
  for (const loc of [
    [0, 0],
    [10, 0],
    [-10, 0],
    [0, 10],
    [0, -10],
    [-15, 0],
    [15, 0],
  ]) {
    console.log(
      `  at (${loc[0]}, ${loc[1]}): ${sizeErrorPct(loc).toFixed(1)}%`,
    );
  }
});
