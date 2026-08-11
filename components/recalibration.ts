/**
 * Mid-experiment distance recalibration lifecycle (threshold side).
 *
 * RemoteCalibrator's nudger recalibrate button invokes onRecalibrateStart
 * before re-running distance tracking and onRecalibrateEnd after. While
 * active, trial frame routines must not advance (checked in threshold.js).
 * If a response was pending, the trial is canceled via the existing
 * skipTrial() machinery, which re-queues staircase trials; otherwise the
 * trial resumes in place after stimuli are regenerated at the new distance
 * by re-running the registered prestimulus routine.
 *
 * Import-light by design: all experiment dependencies are injected via
 * initRecalibration (global.js has side-effect imports).
 */

interface RecalibrationDeps {
  skipTrial: () => void;
  clearKeys: () => void;
  // True when the trial must be canceled via skipTrial (response pending),
  // false during the instruction phase and for targetTask=adjust, which
  // restarts in place (TrialHandler cannot re-queue; see image.js
  // resetImageAdjustForRecalibration).
  shouldCancelTrial: () => boolean;
  updateDistanceState: () => void;
  // Hide the webcam feed when the experiment resumes (mirrors rc.showVideo(false)
  // at experiment start; the restart re-track leaves it visible).
  hideVideo?: () => void;
  warning: (msg: string) => void;
}

interface RecalibrationContext {
  rerunPrestimulus: () => Promise<void> | void;
}

let active = false;
let deps: RecalibrationDeps | null = null;
let context: RecalibrationContext | null = null;

export const initRecalibration = (d: RecalibrationDeps): void => {
  deps = d;
};

export const registerRecalibrationContext = (c: RecalibrationContext): void => {
  context = c;
};

export const isRecalibrationActive = (): boolean => active;

const onRecalibrateStart = (): void => {
  if (active || !deps) return;
  active = true;
  if (deps.shouldCancelTrial()) deps.skipTrial();
  deps.clearKeys();
};

const onRecalibrateEnd = async (): Promise<void> => {
  if (!active || !deps) return;
  deps.updateDistanceState();
  deps.clearKeys();
  if (context) {
    await context.rerunPrestimulus();
  } else {
    deps.warning(
      "Recalibration ended with no trial context; stimuli not regenerated.",
    );
  }
  active = false;
  deps.hideVideo?.();
};

export const getRecalibrationHooks = (): {
  onRecalibrateStart: () => void;
  onRecalibrateEnd: () => Promise<void>;
} => ({ onRecalibrateStart, onRecalibrateEnd });

export const _resetRecalibrationForTests = (): void => {
  active = false;
  deps = null;
  context = null;
};
