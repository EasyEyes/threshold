/**
 * Run-time reporting helpers and the prestimulus re-run guard.
 *
 * `logQuest` is gated on the per-block `logQuestBool`; `logNotice` skips the
 * per-frame firehose (`*EachFrame` messages) and stamps a fixed-precision
 * timestamp. `viewingDistanceOutOfBounds` is the guard that decides whether a
 * measured viewing distance is outside the tolerated ratio around the nominal
 * one.
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

const read = jest.fn();
jest.mock("../parameters/paramReader.ts", () => ({
  paramReader: { read },
}));

// logging.js only needs toFixedNumber from utils; the real module pulls in
// psychoJS + log4javascript, which is irrelevant here.
jest.mock("../components/utils", () => ({
  toFixedNumber: (value: number, digits: number) =>
    Number(value.toFixed(digits)),
}));

jest.mock("../components/global", () => ({
  status: { block_condition: "2_1" },
  viewingDistanceCm: {
    get desired() {
      return 60;
    },
    get max() {
      return 150;
    },
  },
}));

import { logQuest, logNotice } from "../components/logging";
import { viewingDistanceOutOfBounds } from "../components/rerunPrestimulus";

let logged: unknown[][];

beforeEach(() => {
  read.mockReset();
  logged = [];
  jest.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logged.push(args);
  });
});

describe("logQuest", () => {
  test("logs only when the block asks for it", () => {
    read.mockReturnValue(false);
    logQuest("threshold step", 0.5);
    expect(logged).toHaveLength(0);

    read.mockReturnValue(true);
    logQuest("threshold step", 0.5);
    expect(logged).toHaveLength(1);
    expect(String(logged[0][0])).toContain("QUEST. threshold step");
    expect(logged[0][2]).toBe(0.5);
  });

  test("reads logQuestBool for the given block condition, defaulting to the current block", () => {
    read.mockReturnValue(true);
    logQuest("msg");
    expect(read).toHaveBeenLastCalledWith("logQuestBool", "2_1");
    logQuest("msg", "", "7_1");
    expect(read).toHaveBeenLastCalledWith("logQuestBool", "7_1");
  });
});

describe("logNotice", () => {
  test("drops the per-frame firehose", () => {
    logNotice("letterRoutineEachFrame");
    logNotice("someRoutineEachFrame extra");
    expect(logged).toHaveLength(0);
  });

  test("logs a message with a precision-3 timestamp in seconds", () => {
    logNotice("block start", { block: 3 });
    expect(logged).toHaveLength(1);
    const line = String(logged[0][0]);
    expect(line).toContain("block start");
    expect(line).toMatch(/\d+\.\d{3}\(sec\)/);
    expect(logged[0][2]).toEqual({ block: 3 });
  });
});

describe("viewingDistanceOutOfBounds", () => {
  const nominal = Math.min(60, 150); // desired, capped by max

  test("a ratio above 1 is symmetric around the nominal distance", () => {
    expect(viewingDistanceOutOfBounds(nominal, 1)).toBe(false);
    expect(viewingDistanceOutOfBounds(nominal / 2, 2)).toBe(false);
    expect(viewingDistanceOutOfBounds(nominal * 2, 2)).toBe(false);
    expect(viewingDistanceOutOfBounds(nominal / 2 - 1, 2)).toBe(true);
    expect(viewingDistanceOutOfBounds(nominal * 2 + 1, 2)).toBe(true);
  });

  test("a ratio below 1 inverts the bounds", () => {
    // 0.5 → [30, 120]
    expect(viewingDistanceOutOfBounds(60, 0.5)).toBe(false);
    expect(viewingDistanceOutOfBounds(31, 0.5)).toBe(false);
    expect(viewingDistanceOutOfBounds(29, 0.5)).toBe(true);
    expect(viewingDistanceOutOfBounds(121, 0.5)).toBe(true);
  });

  test("the bounds are exclusive: a value exactly on a bound is inside", () => {
    expect(viewingDistanceOutOfBounds(nominal / 2, 2)).toBe(false);
    expect(viewingDistanceOutOfBounds(nominal * 2, 2)).toBe(false);
  });
});
