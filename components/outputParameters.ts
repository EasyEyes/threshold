/**
 * Names of the measured-error output columns written to the results CSV
 * (one per trial). Kept in one place so the contract is checkable and so
 * related columns stay semantically grouped: everything that reports font
 * pre-render behaviour is prefixed `fontPreRender`.
 */
export const MEASURED_OUTPUT_PARAMS = [
  "gazeMeasuredXDeg",
  "gazeMeasuredYDeg",
  "gazeMeasuredRDeg",
  "gazeMeasuredRawDeg",
  "gazeMeasurementLatencySec",
  "targetMeasuredLatenessSec",
  "targetMeasuredDurationSec",
  "targetMeasuredDurationFrames",
  "fontPreRenderTargetMeasuredSec",
] as const;

/**
 * Columns describing fontPreRender=auto's per-trial decision, written at
 * the decision (letter.js) rather than by the measured-error path. The
 * measured/threshold pair travels with the mode so the CSV shows why the
 * trial chose its regime.
 */
export const AUTO_DECISION_OUTPUT_PARAMS = [
  "fontPreRenderModeUsed",
  "fontPreRenderMeasuredRasterSec",
  "fontPreRenderThresholdRasterSec",
] as const;
