/**
 * fontPreRender=auto — per-trial measured choice between "none" and
 * "buffer" behavior on tracking-gate re-arms (the decision is consumed
 * by getTargetStim in letter.js). The trial's initial generation is
 * rastered and MEASURED at trial start, outside the timing-critical
 * gate window; at the first re-arm the measured total is compared
 * against what the onset window can absorb. Expensive → reuse the
 * raster ("buffer": no main-thread block, small resample artifacts).
 * Cheap → native re-raster ("none": pixel-perfect and provably
 * affordable). Unmeasured → "none" (status-quo bias).
 *
 * The threshold is parameter-derived, never a magic constant: the
 * SMALLER of one frame period (risking a dropped frame is reason enough
 * on its own — auto is an opt-in regime, so bias to buffer) and the
 * experiment's own thresholdAllowedLatenessSec when declared. A
 * tolerance tighter than a frame tightens the budget further; a looser
 * one never loosens it. Field check (Acuity24FontsAddSloan9, 18
 * sessions, 60Hz, tolerance 0.1s): 45% of trials sit between one frame
 * and the tolerance — the band where this rule buffers and a
 * max-of-the-two rule would not, while 54% (fast machines, sub-frame
 * rasters) keep the full raster under either rule.
 *
 * The decision LATCHES for the trial: flip-flopping none→buffer
 * mid-trial would mean paying in-window rasters first, and the logged
 * fontPreRenderModeUsed would no longer describe the whole trial.
 */

/** The per-trial decision plus the evidence it was made from. */
export interface AutoDecision {
  mode: "none" | "buffer";
  /** Summed raster cost of the trial's initial generation (measured). */
  measuredRasterSec: number;
  /** What that total was compared against: min(one frame, tolerance). */
  thresholdRasterSec: number;
}

let trialRasterSecTotal = 0;
let decision: AutoDecision | null = null;

/** Reset at each trial's INITIAL generation (no old stims). */
export const beginAutoTrial = (): void => {
  trialRasterSecTotal = 0;
  decision = null;
};

/** Accumulate one stim's measured raster cost (the pre-render loop). */
export const recordAutoRasterSec = (sec: number): void => {
  if (Number.isFinite(sec) && sec > 0) trialRasterSecTotal += sec;
};

/**
 * What one re-arm's raster may cost before buffering is worth the
 * resample error: the SMALLER of one frame (a dropped frame is harm
 * enough — auto is opt-in) and the experiment's declared lateness
 * tolerance. The measured rate is NaN/0/undefined before the first
 * frame delta — fall back to 60Hz.
 */
export const autoThresholdSec = (
  measuredFrameRateHz: number | undefined,
  allowedLatenessSec: unknown,
): number => {
  const hz =
    typeof measuredFrameRateHz === "number" &&
    Number.isFinite(measuredFrameRateHz) &&
    measuredFrameRateHz > 0
      ? measuredFrameRateHz
      : 60;
  const allowed = Number(allowedLatenessSec);
  const declaredBudget =
    Number.isFinite(allowed) && allowed > 0 ? allowed : Infinity;
  return Math.min(1 / hz, declaredBudget);
};

/** Round to microseconds: the raw float carries sub-ns noise into the CSV. */
const roundSec = (sec: number): number => Math.round(sec * 1e6) / 1e6;

/**
 * The latched per-trial decision, made on first ask (first re-arm),
 * reported together with the evidence pair it was made from so the CSV
 * shows why: measured raster vs the threshold it was compared against.
 */
export const resolveAutoMode = (
  measuredFrameRateHz: number | undefined,
  allowedLatenessSec: unknown,
): AutoDecision => {
  if (decision === null) {
    const thresholdRasterSec = autoThresholdSec(
      measuredFrameRateHz,
      allowedLatenessSec,
    );
    decision = {
      mode: trialRasterSecTotal > thresholdRasterSec ? "buffer" : "none",
      measuredRasterSec: roundSec(trialRasterSecTotal),
      thresholdRasterSec: roundSec(thresholdRasterSec),
    };
  }
  return decision;
};
