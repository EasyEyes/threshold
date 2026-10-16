/**
 * longTaskRecorder — a complete per-trial census of long tasks. The
 * existing `longTask` column survives only the LAST entry per trial row
 * (addData overwrite semantics), which sampled rather than recorded the
 * field sessions' freeze activity. The recorder buffers every entry and
 * writes the running census — one JSON array column — through to the
 * current row, resetting at each trial boundary.
 *
 * @jest-environment node
 */
import { createLongTaskRecorder } from "../components/longTaskRecorder";

/** The census the current row holds (the last longTaskList write). */
const lastCensus = (calls: [string, unknown][]) => {
  const last = calls.filter(([k]) => k === "longTaskList").at(-1);
  return JSON.parse(String(last?.[1] ?? "null"));
};

describe("createLongTaskRecorder", () => {
  it("write-throughs every entry; flush resets the census", () => {
    const calls: [string, unknown][] = [];
    const r = createLongTaskRecorder((k, v) => calls.push([k, v]));
    // startTime in ms, as PerformanceEntry delivers; output in sec.
    r.record([
      { startTime: 10200, duration: 500 },
      { startTime: 11400, duration: 102 },
    ]);
    r.record([{ startTime: 12900, duration: 1459 }]);
    // Write-through: each record() writes the running census into the
    // current row; flushTrial() at the next trial's begin resets it.
    expect(lastCensus(calls)).toEqual([
      [10.2, 500],
      [11.4, 102],
      [12.9, 1459],
    ]);
    r.flushTrial();
    expect(lastCensus(calls)).toEqual([]);
  });

  it("caps the buffer (bounded memory even in a stalled trial)", () => {
    const r = createLongTaskRecorder(() => {});
    const many = Array.from({ length: 3000 }, (_, i) => ({
      startTime: i,
      duration: 50,
    }));
    r.record(many);
    r.flushTrial();
    // Capped, not fatal; and cleared.
    r.flushTrial();
    expect(r.bufferedCount()).toBeLessThanOrEqual(3000);
  });
});

describe("adversarial: census stays in its own row", () => {
  it("a quiet trial does not inherit the previous trial's census", () => {
    const calls: [string, unknown][] = [];
    const r = createLongTaskRecorder((k, v) => calls.push([k, v]));
    r.record([{ startTime: 1000, duration: 500 }]); // trial 1 has a longtask
    r.flushTrial(); // trial 2 begins
    // Trial 2 is quiet: its row must read empty, not trial 1's entries.
    expect(lastCensus(calls)).toEqual([]);
  });
});

describe("adversarial: late observer delivery must not cross the row boundary", () => {
  it("a single delivery batch spanning the boundary keeps only the new trial's entries", () => {
    // One PerformanceObserver callback can carry entries from both sides of
    // a trial boundary delivered late: the pre-boundary entry belongs to the
    // saved row and must not leak into the new trial's census.
    const calls: Array<[string, unknown]> = [];
    const r = createLongTaskRecorder((k, v) => calls.push([k, v]));
    r.flushTrial(10_050);
    calls.length = 0;
    r.record([
      { startTime: 10_020, duration: 80 },
      { startTime: 10_060, duration: 90 },
    ]);
    expect(JSON.parse(String(calls.at(-1)?.[1]))).toEqual([[10.06, 90]]);
  });

  it("drops entries that occurred before the flush but were delivered after it", () => {
    const calls: [string, unknown][] = [];
    const r = createLongTaskRecorder((k, v) => calls.push([k, v]));
    r.flushTrial(10_050); // trial boundary at 10.05s
    // A longtask that occurred at 10.02s (previous trial's tail) delivered
    // after the flush: the row it belongs to is already pushed; writing it
    // now would corrupt the new trial's census.
    r.record([{ startTime: 10_020, duration: 80 }]);
    expect(r.bufferedCount()).toBe(0);
    // An entry occurring after the boundary is kept.
    r.record([{ startTime: 10_060, duration: 90 }]);
    expect(lastCensus(calls)).toEqual([[10.06, 90]]);
  });
});

describe("adversarial: write-through (no data loss without a flush)", () => {
  it("entries reach the data column immediately — a terminal trial with no next-flush still has its census", () => {
    const calls: [string, unknown][] = [];
    const r = createLongTaskRecorder((k, v) => calls.push([k, v]));
    r.record([{ startTime: 1000, duration: 500 }]);
    // No flushTrial — the session ended (the stall scenario the column
    // exists for). The entry must already be in the data.
    expect(lastCensus(calls)).toHaveLength(1);
  });
});
