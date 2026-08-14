/**
 * Mid-experiment distance recalibration lifecycle (threshold side).
 *
 * RemoteCalibrator's nudger recalibrate button invokes onRecalibrateStart
 * before re-running distance tracking and onRecalibrateEnd after. While
 * active, trial frame routines must not advance (checked in threshold.js).
 *
 * On end, the current block is restarted from trial 1 via requestRestartBlock
 * (the host wires this to skipBlock, to drain the in-progress block, plus
 * restartBlock, to re-insert a fresh copy at endLoopIteration): the
 * participant sees the block's instructions again and all trials from the
 * top, with a fresh staircase and stimuli regenerated at the new distance.
 *
 * Import-light by design: all experiment dependencies are injected via
 * initRecalibration (global.js has side-effect imports).
 */

interface RecalibrationDeps {
  clearKeys: () => void;
  // Abandon the current block and re-schedule it from trial 1. Called on END,
  // once the new distance is known.
  requestRestartBlock: () => void;
  updateDistanceState: () => void;
  // Hide the webcam feed when the experiment resumes (mirrors rc.showVideo(false)
  // at experiment start; the restart re-track leaves it visible).
  hideVideo?: () => void;
}

let active = false;
let deps: RecalibrationDeps | null = null;

export const initRecalibration = (d: RecalibrationDeps): void => {
  deps = d;
};

export const isRecalibrationActive = (): boolean => active;

const onRecalibrateStart = (): void => {
  if (active || !deps) return;
  active = true;
  deps.clearKeys();
};

const onRecalibrateEnd = async (): Promise<void> => {
  if (!active || !deps) return;
  deps.updateDistanceState();
  deps.clearKeys();
  deps.requestRestartBlock();
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
};
