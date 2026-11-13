/**
 * @jest-environment jsdom
 *
 * Timing calibration: the experimenter's "intervals" request string (pairs of
 * repetition count + duration) is expanded into a list of requested durations,
 * each of which is measured by sleeping and reading the wall clock.
 */

import { jest, expect, describe, test } from "@jest/globals";

// calibrateTiming imports `logger` from utils, which pulls in psychoJS.
jest.mock("../components/utils", () => ({ logger: { info: jest.fn() } }));

import {
  calibrateTiming,
  interpretCalibrateTimingIntervalsString,
  sleep,
} from "../components/calibrateTiming";

describe("interpretCalibrateTimingIntervalsString", () => {
  test("expands repetition, duration pairs", () => {
    expect(interpretCalibrateTimingIntervalsString("3,0.01")).toEqual([
      0.01, 0.01, 0.01,
    ]);
    expect(interpretCalibrateTimingIntervalsString("2,0.01,3,0.02")).toEqual([
      0.01, 0.01, 0.02, 0.02, 0.02,
    ]);
  });

  test("rounds a fractional repetition count", () => {
    expect(interpretCalibrateTimingIntervalsString("2.4,0.5")).toEqual([
      0.5, 0.5,
    ]);
    expect(interpretCalibrateTimingIntervalsString("2.6,0.5")).toEqual([
      0.5, 0.5, 0.5,
    ]);
  });

  test("an odd number of fields is rejected outright", () => {
    expect(interpretCalibrateTimingIntervalsString("3,0.01,2")).toEqual([]);
    expect(interpretCalibrateTimingIntervalsString("")).toEqual([]);
  });

  test("zero repetitions expand to nothing", () => {
    expect(interpretCalibrateTimingIntervalsString("0,0.5")).toEqual([]);
  });
});

describe("calibrateTiming", () => {
  test("returns one measured duration per requested interval, in order", async () => {
    const measured = await calibrateTiming([0.005, 0.02]);
    expect(measured).toHaveLength(2);
    // Each measurement is a real elapsed time, never shorter than requested.
    expect(measured[0]).toBeGreaterThanOrEqual(0.005);
    expect(measured[1]).toBeGreaterThanOrEqual(0.02);
  });

  test("an empty request measures nothing", async () => {
    await expect(calibrateTiming([])).resolves.toEqual([]);
  });
});

describe("sleep", () => {
  test("resolves after at least the requested delay", async () => {
    const start = performance.now();
    await sleep(20);
    expect(performance.now() - start).toBeGreaterThanOrEqual(19);
  });
});
