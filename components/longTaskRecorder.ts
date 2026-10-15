/**
 * Complete long-task census. The PerformanceObserver in runDiagnosisReport
 * sees every longtask entry, but addData's per-row overwrite semantics kept
 * only the last one per trial row (the field data was a sample, not a
 * record). The recorder buffers ALL entries and flushes them as one JSON
 * array column — [[startSec, durationMs], ...] — at each trial boundary.
 * Bounded: the buffer is capped so even a permanently stalled trial cannot
 * grow it without limit.
 */
const MAX_BUFFERED = 2000;

export const createLongTaskRecorder = (
  addData: (key: string, value: unknown) => void,
) => {
  const buffer: [number, number][] = [];
  return {
    record(entries: { startTime: number; duration: number }[]) {
      for (const e of entries) {
        buffer.push([Math.round(e.startTime) / 1000, Math.round(e.duration)]);
        if (buffer.length > MAX_BUFFERED) buffer.shift();
      }
    },
    /** Flush the buffered entries as the trial column, then clear. */
    flushTrial() {
      addData("longTasksSincePrevTrial", JSON.stringify(buffer));
      buffer.length = 0;
    },
    bufferedCount() {
      return buffer.length;
    },
  };
};
