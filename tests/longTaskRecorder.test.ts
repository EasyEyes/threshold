/**
 * longTaskRecorder — a complete per-trial census of long tasks. The
 * existing `longTask` column survives only the LAST entry per trial row
 * (addData overwrite semantics), which sampled rather than recorded the
 * field sessions' freeze activity. The recorder buffers every entry and
 * flushes one JSON array column per trial boundary.
 *
 * @jest-environment node
 */
import { createLongTaskRecorder } from "../components/longTaskRecorder";

describe("createLongTaskRecorder", () => {
  it("records every entry and flushes one JSON array, then clears", () => {
    const calls: [string, unknown][] = [];
    const r = createLongTaskRecorder((k, v) => calls.push([k, v]));
    // startTime in ms, as PerformanceEntry delivers; output in sec.
    r.record([
      { startTime: 10200, duration: 500 },
      { startTime: 11400, duration: 102 },
    ]);
    r.record([{ startTime: 12900, duration: 1459 }]);
    r.flushTrial();
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("longTasksSincePrevTrial");
    expect(JSON.parse(String(calls[0][1]))).toEqual([
      [10.2, 500],
      [11.4, 102],
      [12.9, 1459],
    ]);
    r.flushTrial();
    expect(calls).toHaveLength(2);
    expect(JSON.parse(String(calls[1][1]))).toEqual([]);
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
