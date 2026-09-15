/** @jest-environment jsdom */
/**
 * RED: rc.improvedDistanceTrackingData.nearestXYPx is delivered in
 * top-left-origin, y-down screen px (remote-calibrator convention:
 * cameraXYPx referenced to [window.screen.width/2, window.screen.height/2],
 * pupil offsets measured with video y down). threshold consumes
 * Screens[0].nearestPointXYZPx as psychoJS center-origin, y-up px.
 * updateNearestPointFromRc must convert between the two.
 */
jest.mock("../components/global", () => ({
  viewingDistanceCm: { current: 50 },
}));
import { Screens } from "../components/multiple-displays/globals";
import {
  rcScreenXYPxToPsychoJSXYPx,
  setRcBoundaryWarningHandler,
  updateNearestPointFromRc,
  XYPxOfDeg,
} from "../components/multiple-displays/utils";

const W = 1440;
const H = 900;

const setupScreen = () => {
  Screens[0].pxPerCm = 20;
  Screens[0].viewingDistanceCm = 50;
  Screens[0].nearestPointXYZPx = [0, 0];
  Screens[0].fixationXYZPx = [0, 0, 0];
  Screens[0].fixationConfig.pos = [0, 0];
  Screens[0].fixationConfig.nominalPos = [0, 0];
  // psychoJS window size (pix units)
  (Screens[0] as any).window = { _size: [W, H] };
};

const makeRc = (nearestXYPx?: number[]) =>
  nearestXYPx === undefined
    ? ({} as any)
    : ({ improvedDistanceTrackingData: { nearestXYPx } } as any);

describe("updateNearestPointFromRc", () => {
  beforeEach(setupScreen);

  test("converts top-left/y-down rc px to center-origin/y-up psychoJS px", () => {
    // Eye 2cm right (=40px) and 1cm above (=20px) screen center.
    // rc reports: x = W/2 + 40, y = H/2 - 20 (y down).
    updateNearestPointFromRc(0, makeRc([W / 2 + 40, H / 2 - 20]));
    expect(Screens[0].nearestPointXYZPx[0]).toBeCloseTo(40, 10);
    expect(Screens[0].nearestPointXYZPx[1]).toBeCloseTo(20, 10);
  });

  test("eye at screen center maps to [0,0]", () => {
    updateNearestPointFromRc(0, makeRc([W / 2, H / 2]));
    expect(Screens[0].nearestPointXYZPx).toEqual([0, 0]);
  });

  test("no improvedDistanceTrackingData leaves nearestPoint untouched", () => {
    Screens[0].nearestPointXYZPx = [7, -3];
    updateNearestPointFromRc(0, makeRc(undefined));
    expect(Screens[0].nearestPointXYZPx).toEqual([7, -3]);
  });

  test("deg grid symmetric after conversion (the reported distortion)", () => {
    // Eye 2cm right, 1cm above center, as rc would deliver it.
    updateNearestPointFromRc(0, makeRc([W / 2 + 40, H / 2 - 20]));
    const pxOf = (deg: number) => (XYPxOfDeg(0, [deg, 0]) as number[])[0];
    const sp = (a: number, b: number) => Math.abs(pxOf(b) - pxOf(a));
    const leftEdge = sp(-15, -14);
    const rightEdge = sp(14, 15);
    // Equal eccentricity from fixation must stretch ~equally on both sides;
    // the small residual is the genuine 2cm eye offset, not half a screen.
    expect(Math.abs(leftEdge - rightEdge) / rightEdge).toBeLessThan(0.15);
  });

  test("falls back to DOM window size when psychoJS window absent", () => {
    (Screens[0] as any).window = {};
    (window as any).innerWidth = W;
    (window as any).innerHeight = H;
    updateNearestPointFromRc(0, makeRc([W / 2 + 40, H / 2 - 20]));
    expect(Screens[0].nearestPointXYZPx[0]).toBeCloseTo(40, 10);
    expect(Screens[0].nearestPointXYZPx[1]).toBeCloseTo(20, 10);
  });

  test("rcScreenXYPxToPsychoJSXYPx converts rc screen px to psychoJS px", () => {
    expect(
      rcScreenXYPxToPsychoJSXYPx([W / 2 + 40, H / 2 - 20], [W, H]),
    ).toEqual([40, 20]);
    expect(rcScreenXYPxToPsychoJSXYPx([0, 0], [W, H])).toEqual([-W / 2, H / 2]);
    expect(rcScreenXYPxToPsychoJSXYPx([W, H], [W, H])).toEqual([W / 2, -H / 2]);
    expect(rcScreenXYPxToPsychoJSXYPx([W / 2, H / 2], [W, H])).toEqual([0, 0]);
  });

  test("warns via registered handler (warning() -> output data) on wildly off-screen point", () => {
    const handler = jest.fn();
    setRcBoundaryWarningHandler(handler);
    // On-screen eye: no warning.
    updateNearestPointFromRc(0, makeRc([W - 10, H - 10]));
    expect(handler).not.toHaveBeenCalled();
    // Double-width input (e.g. a future rc returning device px on a 2x
    // display, or a different origin) trips the canary.
    updateNearestPointFromRc(0, makeRc([2 * W, 2 * H]));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatch(/nearestXYPx/);
    setRcBoundaryWarningHandler((m: string) => console.warn(m));
  });
});
