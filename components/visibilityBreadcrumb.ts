/**
 * Tab-visibility breadcrumbs.
 *
 * Field evidence (Acuity24FontsAddSloan3): sessions wedged at block-1
 * `filterRoutineBegin` show no error, no crash, no trials — the page never
 * painted again, i.e. the participant hid the tab at block onset and never
 * returned (one Prolific TIMED-OUT after 5h08m). Chrome freezes and then
 * DISCARDS long-hidden tabs; discarding fires no beforeunload/pagehide, so
 * the close-time unload stamp CANNOT reach the server — the transport is
 * irrelevant once the tab is discarded.
 *
 * The explanation must be written and uploaded at HIDE time, while the page
 * is still running: a `warning` row (tabHiddenAt:<currentFunction> /
 * tabVisibleAfterMs:<…>) committed immediately, plus a fire-and-forget
 * partial save so the row actually reaches Pavlovia before any freeze.
 * Next run, "stuck at X with a tabHiddenAt:X warning" diagnoses itself
 * instead of arriving unexplained.
 *
 * Dependency-injected like partialSaveScheduler (no PsychoJS import):
 * threshold.js wires stamp/save/enabled at the same sites as
 * registerUnloadExitStamp.
 */

export type VisibilityBreadcrumbOptions = {
  /** Commit the breadcrumb row: addData("warning", note) + nextEntry(). */
  stamp: (note: string) => void;
  /** Partial upload; fire-and-forget, failures swallowed. */
  save?: () => unknown;
  /** False once the experiment has terminated (no rows after the audit). */
  enabled?: () => boolean;
  /** Current-function label for the note (e.g. status.currentFunction). */
  getCurrentFunction?: () => string | undefined;
  /** Injectable clock (ms) for gap throttling and pairing notes. */
  now?: () => number;
  /** Min ms between hidden-stamps (flicker throttle). Default 30s. */
  minGapMs?: number;
};

const DEFAULT_MIN_GAP_MS = 30_000;

let registered = false;

export const registerVisibilityBreadcrumb = ({
  stamp,
  save,
  enabled = () => true,
  getCurrentFunction = () => undefined,
  now = () => Date.now(),
  minGapMs = DEFAULT_MIN_GAP_MS,
}: VisibilityBreadcrumbOptions): (() => void) | false => {
  if (registered) return false;
  registered = true;

  let lastHiddenStampMs: number | null = null;
  let pairedVisibleStamp = true;

  const onChange = () => {
    try {
      if (!enabled() || typeof document === "undefined") return;
      const t = now();
      if (document.visibilityState === "hidden") {
        // Throttle flickers (hide→show→hide within the gap is one absence):
        // the gap anchor persists across the pairing so a rapid re-hide
        // stays throttled, and always keep the FIRST hide of a gap.
        if (lastHiddenStampMs !== null && t - lastHiddenStampMs < minGapMs)
          return;
        lastHiddenStampMs = t;
        pairedVisibleStamp = false;
        const fn = getCurrentFunction() ?? "?";
        stamp(`tabHiddenAt:${fn}`);
        try {
          save?.();
        } catch {
          /* fire-and-forget */
        }
        return;
      }
      if (
        document.visibilityState === "visible" &&
        lastHiddenStampMs !== null &&
        !pairedVisibleStamp
      ) {
        const awayMs = Math.round(t - lastHiddenStampMs);
        const fn = getCurrentFunction() ?? "?";
        pairedVisibleStamp = true;
        stamp(`tabVisibleAfterMs:${awayMs} at:${fn}`);
        try {
          save?.();
        } catch {
          /* fire-and-forget */
        }
      }
    } catch {
      /* the breadcrumb must never break the page */
    }
  };

  document.addEventListener("visibilitychange", onChange);

  const unregister = () => {
    registered = false;
    document.removeEventListener("visibilitychange", onChange);
  };
  return unregister;
};
