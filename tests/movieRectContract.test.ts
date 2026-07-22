/**
 * RED test: movie evaluateJSCode rect-contract bug (movie-identify-sim crash).
 *
 * The canonical experimenter movie program (tiltedFlickeringGabor.js, shipped
 * in examples/code/ and used by demoFlickeringGaborMovie) treats rects as
 * [left, bottom, right, top] ARRAYS:
 *   - movieRectPx is built as a plain array,
 *   - ClipRect indexes screenRectPx numerically (b[0..3]).
 * But evaluateJSCode passes:
 *   - screenRectPx as a Rectangle OBJECT (named props, no numeric indices),
 *   - isRectInRect, which reads .left/.bottom/.right/.top off BOTH args.
 * Result: isRectInRect(arrayMovieRect, …) is always false → ClipRect runs →
 * Math.max(a[3], undefined) → NaN → XYDegOfPx throws
 * "invalid x coordinate: NaN" and the study ends in error.
 *
 * These tests run the REAL canonical movie JS through evaluateJSCode with the
 * REAL XYPxOfDeg/XYDegOfPx coordinate math and assert the desired outcome:
 * finite imageNit, no throw — for both the in-screen case and the clip case.
 *
 * @jest-environment jsdom
 */

import * as fs from "fs";
import * as path from "path";
import { jest, expect, describe, test, beforeAll } from "@jest/globals";

// ── Mocks ──────────────────────────────────────────────────────────────────
// components/utils.js imports all of threshold.js (circular, heavy), so we
// mock it with FAITHFUL copies of the two rect utilities under test.
jest.mock("../components/utils", () => {
  const isInRect = (x: number, y: number, rect: any) =>
    x >= rect.left && x <= rect.right && y >= rect.bottom && y <= rect.top;
  const isRectInRect = (smallRect: any, bigRect: any) =>
    isInRect(smallRect.left, smallRect.bottom, bigRect) &&
    isInRect(smallRect.right, smallRect.top, bigRect);
  class Rectangle {
    left: number;
    right: number;
    bottom: number;
    top: number;
    width: number;
    height: number;
    constructor(lowerLeft: number[], upperRight: number[]) {
      this.left = lowerLeft[0];
      this.right = upperRight[0];
      this.bottom = lowerLeft[1];
      this.top = upperRight[1];
      this.height = this.top - this.bottom;
      this.width = this.right - this.left;
    }
  }
  return {
    logger: { log: jest.fn() },
    xyPxOfDeg: jest.fn(),
    xyDegOfPx: jest.fn(),
    isRectInRect,
    Rectangle,
  };
});

jest.mock("../components/global", () => ({
  displayOptions: { window: { _size: [800, 600] } },
  viewingDistanceCm: { current: 40, desired: 40, max: 40 },
}));

let mockAxiosGet = jest.fn();
jest.mock("axios", () => ({
  get: (...args: unknown[]) => mockAxiosGet(...args),
  default: { get: (...args: unknown[]) => mockAxiosGet(...args) },
}));

jest.mock("../components/reading.ts", () => ({
  preprocessRawCorpus: (s: string) => s,
}));

jest.mock("../components/transformColorSpace.js", () => ({
  im_ctrans: jest.fn(),
}));

jest.mock("image-js", () => ({
  Image: { load: jest.fn() },
}));

// REAL multiple-displays/utils.ts (XYPxOfDeg / XYDegOfPx) and
// multiple-displays/globals.ts (Screens) — the crash lives in their
// interaction with the experimenter's movie JS.
import { Screens } from "../components/multiple-displays/globals";
import { evaluateJSCode } from "../components/imageAndVideoGeneration.js";

// ── Canonical experimenter movie program (copy of examples/code/) ──────────
const MOVIE_JS = fs.readFileSync(
  path.join(__dirname, "sim/assets/code/tiltedFlickeringGabor.js"),
  "utf8",
);

const TABLE_VALUES: Record<string, any> = {
  movieComputeJS: "tiltedFlickeringGabor.js",
  movieHz: "1",
  movieSec: "1",
  movieRectDeg: "-5,-5,5,5",
  movieRectPxContainsRectDegBool: false,
  targetDelaySec: "0",
  targetTimeConstantSec: "1",
  targetHz: "2",
  targetEccentricityXDeg: "0",
  targetEccentricityYDeg: "0",
  targetSpaceConstantDeg: "2",
  targetCyclePerDeg: "3",
  targetContrast: "0.5",
  targetPhaseSpatialDeg: "0",
  targetPhaseTemporalDeg: "0",
};

const makeParamReader = (over: Record<string, any> = {}) => ({
  read: (name: string, _bc?: string) => ({ ...TABLE_VALUES, ...over })[name],
});

const displayOptions = { window: { _size: [800, 600] } };
const psychoJS: any = { experiment: { addData: jest.fn() } };
const status = { block_condition: "1_1" };

const allFinite = (a: any): boolean =>
  Array.isArray(a) ? a.every(allFinite) : Number.isFinite(a);

beforeAll(() => {
  // Calibrated screen: 40 px/cm at 40 cm viewing distance, fixation at
  // screen center — the values sim calibration injection would provide.
  const s = Screens[0] as any;
  s.pxPerCm = 40;
  s.viewingDistanceCm = 40;
  s.nearestPointXYZPx = [0, 0];
  s.fixationXYZPx = [0, 0];
  s.fixationConfig.pos = [0, 0];
  s.fixationConfig.nominalPos = [0, 0];

  mockAxiosGet.mockImplementation(async () => ({ data: MOVIE_JS }));
});

describe("evaluateJSCode — rect contract with canonical tiltedFlickeringGabor.js", () => {
  test("movie rect inside screen: resolves with finite imageNit (no clip)", async () => {
    // 40 px/cm × 40 cm × tan(5°) ≈ 140 px — well inside the 800×600 screen.
    const [imageNit, , actualStimulusLevel] = (await evaluateJSCode(
      makeParamReader(),
      status,
      displayOptions,
      "V",
      -1,
      psychoJS,
    )) as any;
    expect(Number.isFinite(actualStimulusLevel)).toBe(true);
    expect(imageNit.length).toBeGreaterThan(0);
    expect(allFinite(imageNit)).toBe(true);
  });

  test("movie rect overflowing screen: clip branch yields finite imageNit", async () => {
    // y: 40×40×tan(12°) ≈ 340 px > 300 px half-height → ClipRect must run.
    const [imageNit] = (await evaluateJSCode(
      makeParamReader({ movieRectDeg: "-8,-12,8,12" }),
      status,
      displayOptions,
      "V",
      -1,
      psychoJS,
    )) as any;
    expect(imageNit.length).toBeGreaterThan(0);
    expect(allFinite(imageNit)).toBe(true);
  });

  test("screenRectPx supports BOTH access styles used by experimenter code", async () => {
    // getMovieValues.js uses named props (.width/.height);
    // tiltedFlickeringGabor.js ClipRect uses numeric indices ([0..3] =
    // [left, bottom, right, top]). screenRectPx must satisfy both.
    let seen: any = null;
    const probeJS = `function probe(screenRectPx, isRectInRect) {
      seen = {
        namedWidth: screenRectPx.width,
        idx0: screenRectPx[0],
        idx3: screenRectPx[3],
        arrayRectInside: isRectInRect([0, 0, 10, 10], screenRectPx),
        arrayRectOutside: isRectInRect([-99999, -99999, 99999, 99999], screenRectPx),
      };
      return [[0], 0];
    }`;
    mockAxiosGet.mockImplementationOnce(async () => ({ data: probeJS }));
    const orig = (globalThis as any).seen;
    await evaluateJSCode(
      makeParamReader(),
      status,
      displayOptions,
      "V",
      -1,
      psychoJS,
    );
    // The eval'd function assigns to its own scope; read via returned trick:
    // probeJS declared `seen` without var → becomes global.
    seen = (globalThis as any).seen ?? seen;
    expect(seen.namedWidth).toBe(800);
    expect(seen.idx0).toBe(-400); // left
    expect(seen.idx3).toBe(300); // top
    expect(seen.arrayRectInside).toBe(true);
    expect(seen.arrayRectOutside).toBe(false);
    (globalThis as any).seen = orig;
  });
});
