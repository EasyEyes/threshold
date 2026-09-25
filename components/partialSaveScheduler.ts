/**
 * Periodic partial-result saves.
 *
 * Without these, everything since the block-1-start save is lost when a
 * session dies: the close-time beacon may be refused (size cap — see
 * psychojs/src/core/syncUpload.js) or the kill may be hard (no unload event
 * at all). The scheduler re-uploads the accumulated results on an interval
 * via the ordinary uncapped async POST, honoring the table's
 * _pavloviaSavePartialResultsBool.
 *
 * Resilience contract (the experiment must run fine offline after load):
 * fire-and-forget — the scheduler never blocks or fails the experiment.
 * Failures are reported through onError and swallowed; ticks never overlap;
 * stopPartialSaveScheduler halts it at termination so the final quit-save is
 * always the last upload.
 */

export type PartialSaveSchedulerOptions = {
  /** Performs the upload; resolves/rejects like psychoJS.experiment.save(). */
  save: () => Promise<unknown>;
  /** Reported (not thrown) when a save fails. */
  onError?: (error: unknown) => void;
  intervalMs?: number;
};

/** Long enough to keep request volume trivial; short enough to bound loss. */
const DEFAULT_INTERVAL_MS = 5 * 60_000;

let intervalId: ReturnType<typeof setInterval> | null = null;
let inFlightSave: Promise<void> | null = null;

export const startPartialSaveScheduler = ({
  save,
  onError,
  intervalMs = DEFAULT_INTERVAL_MS,
}: PartialSaveSchedulerOptions): void => {
  if (intervalId !== null) return; // idempotent: one schedule per page

  const tickFn = () => {
    if (inFlightSave) return; // never overlap uploads
    inFlightSave = (async () => {
      try {
        await save();
      } catch (error) {
        // Offline or transient server error: report and keep ticking. Never
        // let a background save fail the experiment.
        try {
          onError?.(error);
        } catch (_) {
          /* reporting must never throw either */
        }
      } finally {
        inFlightSave = null;
      }
    })();
  };

  intervalId = setInterval(tickFn, intervalMs);
};

/**
 * Halt the schedule. Returns a promise that settles once any in-flight
 * save has completed — await it before the final save, so a slow periodic
 * upload can never land after (and overwrite) it.
 */
export const stopPartialSaveScheduler = (): Promise<void> => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  return inFlightSave ?? Promise.resolve();
};
