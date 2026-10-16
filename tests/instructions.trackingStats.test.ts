/**
 * Tracking statistics — numberOfTimesTrackingStarted (cursor entered
 * fixation, tracking began demanding continuous presence) and
 * numberOfTimesTrackingStopped (cursor left before the required duration —
 * an early break; satisfying the duration is a completion, not a stop).
 * Acuity24FontsAddSloan9 postmortem: mustTrackSec is OVERWRITTEN per start
 * by addData semantics, so the field stalls were never countable from
 * results; these columns make them countable and classifiable.
 *
 * @jest-environment node
 */

jest.mock("../components/utils", () => ({
  hideCursor: jest.fn(),
  logger: { debug() {}, info() {}, error() {}, warn() {} },
  cursorNearFixation: jest.fn(),
  readi18nPhrasesHTML: jest.fn(),
}));
jest.mock("../components/errorHandling", () => ({ warning: jest.fn() }));
jest.mock("../components/globalPsychoJS", () => ({
  psychoJS: {
    experiment: { addData: jest.fn() },
    window: { size: [1920, 1080] },
  },
}));
jest.mock("../components/multiple-displays/globals.ts", () => ({
  Screens: [{ fixationConfig: {} }],
}));
jest.mock("../components/fixation.ts", () => ({
  computeFixationPosNow: jest.fn(() => [1, 2]),
}));
jest.mock("../components/rng", () => ({ random: jest.fn(() => 0.5) }));
// TLA-bearing deps (fonts/response/photometry) can't load under the plain
// jest transform; mock them with just what instructions.js touches.
jest.mock("../components/fonts.js", () => ({
  cleanFontName: (s: string) => s,
}));
jest.mock("../components/response", () => ({ _onlyClick: jest.fn() }));
jest.mock("../components/photometry", () => ({
  colorCALReadyForBlock: jest.fn(),
}));
jest.mock("../components/global", () => ({
  clickedContinue: { current: false, timestamps: [] },
  fixationConfig: {},
  instructionFont: {},
  modalButtonTriggeredViaKeyboard: { current: false },
  targetKind: { current: "" },
  status: {},
  displayOptions: {},
  fontCharacterSet: "",
}));
jest.mock("../components/readPhrases.js", () => ({
  readi18nPhrases: jest.fn(() => ""),
}));
jest.mock("../components/multiLang.js", () => ({
  replacePlaceholders: jest.fn(() => ""),
}));

import {
  checkIfCursorIsTrackingFixation,
  resetTrackingStats,
} from "../components/instructions";
import { cursorNearFixation } from "../components/utils";
import { psychoJS } from "../components/globalPsychoJS";
import { Screens } from "../components/multiple-displays/globals.ts";

const reader = () =>
  ({
    read: jest.fn((name: string) => {
      if (name === "responseMustTrackMaxSec") return 1.25;
      if (name === "responseMustTrackMinSec") return 0.75;
      if (name === "responseMustTrackContinuouslyBool") return true;
      return "";
    }),
  }) as never;

const addDataCalls = (col?: string) =>
  (psychoJS.experiment.addData as jest.Mock).mock.calls.filter(
    (c) => !col || c[0] === col,
  );

beforeEach(() => {
  jest.clearAllMocks();
  (Screens[0] as any).fixationConfig = {};
});

describe("numberOfTimesTrackingStarted", () => {
  it("logs 1 on the first tracking start", () => {
    (cursorNearFixation as jest.Mock).mockReturnValue(true);
    checkIfCursorIsTrackingFixation(0, reader());
    const calls = addDataCalls("numberOfTimesTrackingStarted");
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe(1);
  });

  it("increments across miss→restart cycles within one trial", () => {
    // start at t=0
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(true);
    checkIfCursorIsTrackingFixation(0, reader());
    // miss at t=2 (t >= deadline 1.0 resets the timer)
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(false);
    checkIfCursorIsTrackingFixation(2, reader());
    // restart at t=3
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(true);
    checkIfCursorIsTrackingFixation(3, reader());
    const calls = addDataCalls("numberOfTimesTrackingStarted");
    expect(calls.map((c: never[]) => c[1])).toEqual([1, 2]);
  });

  it("counts a stop when the cursor leaves before the required duration", () => {
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(true);
    checkIfCursorIsTrackingFixation(1, reader());
    // Started. Now the cursor leaves -> a genuine stop (not an idle absence).
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(false);
    checkIfCursorIsTrackingFixation(2, reader());
    const stopped = addDataCalls("numberOfTimesTrackingStopped").pop();
    expect(stopped?.[1]).toBe(1);
  });

  it("does NOT count a stop when the cursor is merely absent before tracking starts", () => {
    // Cursor never near: idle else-branch must not tally misses, or a
    // participant who simply hasn't found the crosshair yet would look
    // like a thrash.
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(false);
    checkIfCursorIsTrackingFixation(1, reader());
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(false);
    checkIfCursorIsTrackingFixation(2, reader());
    const stopped = addDataCalls("numberOfTimesTrackingStopped").pop();
    expect(stopped).toBeUndefined();
  });

  it("flags a NaN fixation position (fixationEverInvalidBool) — the marker cannot be drawn", () => {
    (Screens[0] as any).fixationConfig.pos = [NaN, 0];
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(false);
    checkIfCursorIsTrackingFixation(1, reader());
    const flagged = addDataCalls("fixationEverInvalidBool").pop();
    expect(flagged?.[1]).toBe(true);
  });

  it("flags an off-screen fixation position", () => {
    // psychoJS px units are centered: ±window.size/2. 5000px is far out.
    (Screens[0] as any).fixationConfig.pos = [5000, 0];
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(false);
    checkIfCursorIsTrackingFixation(1, reader());
    const flagged = addDataCalls("fixationEverInvalidBool").pop();
    expect(flagged?.[1]).toBe(true);
  });

  it("does not flag a valid on-screen position", () => {
    (Screens[0] as any).fixationConfig.pos = [100, -50];
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(true);
    checkIfCursorIsTrackingFixation(1, reader());
    expect(addDataCalls("fixationEverInvalidBool")).toHaveLength(0);
  });

  it("logs tracking duration since first start (trackingDurationSec)", () => {
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(true);
    checkIfCursorIsTrackingFixation(1.5, reader());
    // t=2.4: still tracking (deadline 1.5 + 1.0 = 2.5), duration 0.9.
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(true);
    checkIfCursorIsTrackingFixation(2.4, reader());
    const dur = addDataCalls("trackingDurationSec").pop();
    expect(dur?.[1]).toBeCloseTo(0.9, 5);
  });

  it("tallies main-thread blocking while tracking is required (trackingBlockedSec)", () => {
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(true);
    checkIfCursorIsTrackingFixation(1, reader());
    // Started. Next call arrives 1.2s later (a raster-sized freeze
    // during tracking) with the cursor still near.
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(true);
    checkIfCursorIsTrackingFixation(2.2, reader());
    const sec = addDataCalls("trackingBlockedSec").pop();
    expect(sec?.[1]).toBeCloseTo(1.2, 5);
  });

  it("counters reset between trials via resetTrackingStats", () => {
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(true);
    checkIfCursorIsTrackingFixation(0, reader());
    resetTrackingStats();
    // New trial: cursor starts away (clears any stale state), then near.
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(false);
    checkIfCursorIsTrackingFixation(2, reader());
    (cursorNearFixation as jest.Mock).mockReturnValueOnce(true);
    checkIfCursorIsTrackingFixation(3, reader());
    const calls = addDataCalls("numberOfTimesTrackingStarted");
    expect(calls.map((c: never[]) => c[1])).toEqual([1, 1]);
  });
});

describe("adversarial: fixation validity with unknown window size", () => {
  it("does not flag a finite on-screen position when window size is unavailable", async () => {
    const gjs = await import("../components/globalPsychoJS");
    const saved = (gjs.psychoJS as any).window;
    (gjs.psychoJS as any).window = {};
    try {
      (Screens[0] as any).fixationConfig.pos = [100, -50];
      (cursorNearFixation as jest.Mock).mockReturnValueOnce(true);
      checkIfCursorIsTrackingFixation(1, reader());
      expect(addDataCalls("fixationEverInvalidBool")).toHaveLength(0);
    } finally {
      (gjs.psychoJS as any).window = saved;
    }
  });
});
