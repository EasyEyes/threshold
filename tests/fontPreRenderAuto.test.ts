/**
 * fontPreRender=auto decision core — per-trial choice between "none"
 * (native re-raster on each tracking-gate re-arm: pixel-perfect, but the
 * raster blocks the main thread inside the gate window) and "buffer"
 * (reuse the trial-start raster with GPU renderScale: no block, small
 * resample artifacts). The basis is the trial's OWN measured raster
 * cost against a parameter-derived threshold: one frame period floor (a
 * raster under a frame cannot miss a frame, so blur is never worth it),
 * raised to the experiment's own thresholdAllowedLatenessSec when the
 * scientist declared a looser onset tolerance.
 *
 * @jest-environment node
 */
import {
  autoThresholdSec,
  beginAutoTrial,
  recordAutoRasterSec,
  resolveAutoMode,
} from "../components/fontPreRenderAuto";

beforeEach(() => beginAutoTrial());

describe("autoThresholdSec", () => {
  it("floors at one frame period", () => {
    expect(autoThresholdSec(60, "")).toBeCloseTo(1 / 60, 9);
  });

  it("keeps the frame budget when the declared tolerance is looser than a frame", () => {
    // auto is opt-in: risking a dropped frame is reason enough to buffer,
    // so a generous lateness tolerance never loosens the frame budget.
    expect(autoThresholdSec(60, 0.1)).toBeCloseTo(1 / 60, 9);
  });

  it("tightens to thresholdAllowedLatenessSec when it is tighter than a frame", () => {
    expect(autoThresholdSec(60, 0.005)).toBeCloseTo(0.005, 9);
  });

  it("falls back to 60Hz when the measured rate is unusable", () => {
    for (const bad of [NaN, 0, undefined, -30])
      expect(autoThresholdSec(bad, "")).toBeCloseTo(1 / 60, 9);
  });
});

describe("resolveAutoMode", () => {
  it("resolves none when nothing was measured (status-quo bias)", () => {
    expect(resolveAutoMode(60, "").mode).toBe("none");
  });

  it("resolves buffer when the measured raster exceeds the threshold", () => {
    recordAutoRasterSec(0.05); // 50ms > 16.7ms frame
    expect(resolveAutoMode(60, "").mode).toBe("buffer");
  });

  it("resolves none when the raster fits", () => {
    recordAutoRasterSec(0.004);
    expect(resolveAutoMode(60, "").mode).toBe("none");
  });

  it("decides on the TRIAL TOTAL, not per-stim (3 x 10ms > 1 frame)", () => {
    recordAutoRasterSec(0.01);
    recordAutoRasterSec(0.01);
    recordAutoRasterSec(0.01);
    expect(resolveAutoMode(60, "").mode).toBe("buffer");
  });

  it("latches: later recordings never flip the trial's decision", () => {
    recordAutoRasterSec(0.004);
    expect(resolveAutoMode(60, "").mode).toBe("none");
    recordAutoRasterSec(0.5); // load spike after the decision
    expect(resolveAutoMode(60, "").mode).toBe("none");
  });

  it("beginAutoTrial resets both the total and the latch", () => {
    recordAutoRasterSec(0.05);
    expect(resolveAutoMode(60, "").mode).toBe("buffer");
    beginAutoTrial();
    recordAutoRasterSec(0.004);
    expect(resolveAutoMode(60, "").mode).toBe("none");
  });

  it("ignores non-finite or non-positive measurements", () => {
    recordAutoRasterSec(NaN);
    recordAutoRasterSec(-1);
    recordAutoRasterSec(0);
    expect(resolveAutoMode(60, "").mode).toBe("none");
  });

  it("a loose lateness tolerance never loosens the frame budget", () => {
    recordAutoRasterSec(0.05); // 50ms: over one frame, under a 100ms tolerance
    expect(resolveAutoMode(60, 0.1).mode).toBe("buffer");
  });

  it("reports the decision's evidence pair: measured raster vs threshold", () => {
    recordAutoRasterSec(0.012);
    recordAutoRasterSec(0.028);
    const d = resolveAutoMode(60, "");
    expect(d.mode).toBe("buffer");
    expect(d.measuredRasterSec).toBeCloseTo(0.04, 9);
    expect(d.thresholdRasterSec).toBeCloseTo(1 / 60, 6);
  });

  it("the evidence pair is latched with the mode", () => {
    recordAutoRasterSec(0.004);
    const first = resolveAutoMode(60, "");
    recordAutoRasterSec(0.5); // post-decision spike must not rewrite the pair
    const again = resolveAutoMode(60, "");
    expect(again).toEqual(first);
    expect(again.measuredRasterSec).toBeCloseTo(0.004, 9);
  });

  it("rounds the reported pair to microseconds (CSV noise)", () => {
    recordAutoRasterSec(0.004000000000000001);
    expect(resolveAutoMode(60, "").measuredRasterSec).toBe(0.004);
  });

  it("a tight lateness tolerance tightens the budget below one frame", () => {
    recordAutoRasterSec(0.01); // 10ms: under one 60Hz frame, over 5ms
    expect(resolveAutoMode(60, 0.005).mode).toBe("buffer");
  });
});
