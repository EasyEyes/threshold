/**
 * RED tests for liveUpdateTrialCounter (components/trialCounter.js).
 *
 * Bug 4.1 (notes/TODO-arabic-urdu-persian-bugs.md): the update gate
 *   if (Math.floor(t * 1000) % 500 === 0) setText(...)
 * only fires when a ~16.7ms frame lands EXACTLY on a 500ms multiple.
 * Frames straddling the boundary (499.7, 516.4) both miss it, so updates
 * are silently dropped — the counter freezes or goes stale.
 *
 * Desired behavior: wall-clock throttle — first call always paints, then at
 * most once per 500ms, regardless of frame phase. resetTrialCounterThrottle()
 * forces a fresh paint at block start.
 *
 * Mocking pattern mirrors tests/getTrialInfoStr.test.ts.
 */

const phraseStore: Record<string, string> = {
  T_counterTrialBlock: "Trial [[N11]] of [[N22]]. Block [[N33]] of [[N44]].",
  T_counterReadingPageBlock:
    "Page [[N11]] of [[N22]]. Block [[N33]] of [[N44]].",
  T_counterBlock: "Block [[N11]] of [[N22]].",
};

let nowMs = 0;

const makeStim = () => ({ setText: jest.fn() });

const callCounter = (
  liveUpdateTrialCounter: any,
  stim: { setText: jest.Mock },
  trial = 1,
) => {
  liveUpdateTrialCounter(
    "en-US",
    true, // showCounterBool
    false, // showViewingDistanceBool (avoids rc/Screens deps)
    trial, // currentTrialIndex
    10, // currentTrialLength
    1, // currentBlockIndex
    2, // blockCount
    undefined, // viewingDistanceCm
    "letter", // taskKind
    stim,
  );
};

describe("liveUpdateTrialCounter — wall-clock throttle (Bug 4.1)", () => {
  beforeEach(() => {
    jest.resetModules();
    nowMs = 0;
    jest.spyOn(performance, "now").mockImplementation(() => nowMs);
    jest.doMock("../components/global.js", () => ({
      __esModule: true,
      rc: {},
      status: {},
      viewingDistanceCm: { current: undefined, desired: undefined },
    }));
    jest.doMock("../components/multiple-displays/globals.ts", () => ({
      __esModule: true,
      Screens: [],
    }));
    jest.doMock("../preprocess/phrases-loader", () => ({
      __esModule: true,
      phrasesData: { version: "test", phrases: {} },
    }));
    jest.doMock("../components/readPhrases", () => ({
      __esModule: true,
      readi18nPhrases: (name: string) => phraseStore[name] ?? "",
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("paints on the first call, whatever the frame phase", async () => {
    const { liveUpdateTrialCounter } = await import(
      "../components/trialCounter"
    );
    const stim = makeStim();
    nowMs = 16; // first frame, not aligned to anything
    callCounter(liveUpdateTrialCounter, stim);
    expect(stim.setText).toHaveBeenCalledTimes(1);
    expect(stim.setText).toHaveBeenLastCalledWith(
      expect.stringContaining("Trial 1 of 10"),
    );
  });

  it("updates ~2Hz across frames that never hit an exact 500ms multiple", async () => {
    const { liveUpdateTrialCounter } = await import(
      "../components/trialCounter"
    );
    const stim = makeStim();
    // 75 frames at 16.7ms starting at 16ms: floor(t*1000) hits
    // 16,33,…,491,508,…,991,1008 — straddles 500 and 1000 without
    // ever landing on them. The old float-mod gate drops EVERY update.
    for (let f = 1; f <= 75; f++) {
      nowMs = Math.floor(f * 16.7);
      callCounter(liveUpdateTrialCounter, stim, Math.min(1 + (f >> 4), 10));
    }
    expect(stim.setText.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("throttles sub-500ms bursts to a single paint", async () => {
    const { liveUpdateTrialCounter } = await import(
      "../components/trialCounter"
    );
    const stim = makeStim();
    for (let f = 0; f < 10; f++) {
      nowMs = 100 + f * 16; // 10 frames within ~150ms
      callCounter(liveUpdateTrialCounter, stim);
    }
    expect(stim.setText).toHaveBeenCalledTimes(1);
  });

  it("resetTrialCounterThrottle() forces a fresh paint at block start", async () => {
    const { liveUpdateTrialCounter, resetTrialCounterThrottle } = await import(
      "../components/trialCounter"
    );
    const stim = makeStim();
    nowMs = 1000;
    callCounter(liveUpdateTrialCounter, stim); // paints (first call)
    nowMs = 1100; // 100ms later — within throttle window
    callCounter(liveUpdateTrialCounter, stim); // suppressed
    expect(stim.setText).toHaveBeenCalledTimes(1);
    resetTrialCounterThrottle(); // new block begins
    callCounter(liveUpdateTrialCounter, stim); // must paint immediately
    expect(stim.setText).toHaveBeenCalledTimes(2);
  });

  it("reflects the latest trial index when it does paint", async () => {
    const { liveUpdateTrialCounter } = await import(
      "../components/trialCounter"
    );
    const stim = makeStim();
    nowMs = 0;
    callCounter(liveUpdateTrialCounter, stim, 1);
    nowMs = 600;
    callCounter(liveUpdateTrialCounter, stim, 2);
    expect(stim.setText).toHaveBeenLastCalledWith(
      expect.stringContaining("Trial 2 of 10"),
    );
  });
});
