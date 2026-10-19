/**
 * Complete long-task census, per trial row. The PerformanceObserver in
 * runDiagnosisReport sees every longtask entry, but addData's per-row
 * overwrite semantics kept only the last one (the field data was a
 * sample, not a record). The recorder buffers ALL entries and writes the
 * array — [[startSec, durationSec], ...] — through to the current row on
 * every entry, so even a trial that never ends (the stall case) has its
 * census in the partial save. flushTrial() at each trial begin resets the
 * census, so a quiet trial's row reads empty rather than inheriting the
 * previous trial's entries. Named longTaskSec (units in the name); the
 * legacy last-entry sample columns (longTask, longTaskDurationSec,
 * longTaskStartSec) were removed — distinct names let analysis code tell
 * old and new runs apart. The buffer is capped so a permanently stalled
 * trial cannot grow it without limit.
 */
const MAX_BUFFERED = 2000;

export const createLongTaskRecorder = (
  addData: (key: string, value: unknown) => void,
) => {
  const buffer: [number, number][] = [];
  // PerformanceObserver delivery is asynchronous: an entry from before a
  // trial boundary can arrive after the flush. Dropping it keeps the new
  // trial's census truthful — the row it belongs to is already saved.
  let flushedAtMs = 0;
  return {
    record(entries: { startTime: number; duration: number }[]) {
      let added = false;
      for (const e of entries) {
        if (e.startTime < flushedAtMs) continue;
        // Entries are [startSec, durationSec] — units in the column name.
        buffer.push([
          Math.round(e.startTime) / 1000,
          Math.round(e.duration) / 1000,
        ]);
        if (buffer.length > MAX_BUFFERED) buffer.shift();
        added = true;
      }
      if (!added) return;
      // Write-through: every entry lands in the current row immediately,
      // so a trial that never ends (the stall case this column exists
      // for) still has its census in the partial save.
      addData("longTaskSec", JSON.stringify(buffer));
    },
    /** Reset the census at each trial begin. */
    flushTrial(nowMs: number = performance.now()) {
      flushedAtMs = nowMs;
      buffer.length = 0;
      addData("longTaskSec", "[]");
    },
    bufferedCount() {
      return buffer.length;
    },
  };
};
