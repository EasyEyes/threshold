/**
 * RC calibration sub-step breadcrumb.
 *
 * `setCurrentFn("rcCalibration")` covers the whole RemoteCalibrator panel,
 * so a participant who quits 7 minutes into the paper-card distance
 * calibration is indistinguishable from one who quit the 10-second screen
 * size step (field data: both fullscreenExit quitters in one study died
 * inside rcCalibration with no sub-step recorded). RC's panel exposes its
 * active task (`rc.panelState.activeTask`) but emits no step-change event,
 * so the host polls it while the panel runs and restamps currentFunction as
 * `rcCalibration:<task>` — the termination audit (error column, tab-close
 * stamp) then names the exact sub-step.
 */

/** currentFunction prefix for the whole RC panel phase. */
export const RC_CALIBRATION_FN = "rcCalibration";

/** Keep the cell grammar-safe: [A-Za-z0-9_.-] only, like RC triggers. */
const sanitizeStep = (step: unknown): string =>
  typeof step === "string" ? step.replace(/[^\w.-]/g, "").slice(0, 40) : "";

/** currentFunction for an RC panel state: sub-step, or the phase name. */
export const rcStepFunctionName = (activeTask: unknown): string => {
  const step = sanitizeStep(activeTask);
  return step ? `${RC_CALIBRATION_FN}:${step}` : RC_CALIBRATION_FN;
};

/**
 * Poll `rc.panelState.activeTask`, restamping currentFunction on every
 * change. Returns a stop function; call it from the panel's completion
 * callback. RC builds without panelState (or an absent rc) simply keep the
 * plain `rcCalibration` stamp.
 */
export const watchRcPanelSteps = (
  rcLike: { panelState?: { activeTask?: unknown } } | null | undefined,
  stamp: (fnName: string) => void,
  pollMs = 500,
): (() => void) => {
  let last = "";
  const timer = setInterval(() => {
    const name = rcStepFunctionName(rcLike?.panelState?.activeTask);
    if (name !== last) {
      last = name;
      stamp(name);
    }
  }, pollMs);
  return () => clearInterval(timer);
};
