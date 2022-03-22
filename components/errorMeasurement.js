import { rc, fixationConfig } from "./global";
import { XYDegOfXYPix, norm, psychojsUnitsFromWindowUnits } from "./utils";

export const measureGazeError = (
  tolerances,
  displayOptions,
  crosshairClickTimestamp
) => {
  // TODO remove this in future, if we don't need gaze going continually
  rc.pauseGaze();
  rc.getGazeNow((r) => {
    tolerances.measured.gazeMeasurementLatencySec =
      (r.timestamp - r.value.latencyMs - crosshairClickTimestamp) / 1000;
    // TODO remove this in future, if we don't need gaze going continually
    rc.resumeGaze();
    // Convert to psychoJS units pixels
    const [xPx, yPx] = psychojsUnitsFromWindowUnits(
      [r.value.x, r.value.y],
      [rc.windowWidthPx.value, rc.windowHeightPx.value],
      fixationConfig.pos
    );
    // Convert to degrees.
    [
      tolerances.measured.gazeMeasuredXDeg,
      tolerances.measured.gazeMeasuredYDeg,
    ] = XYDegOfXYPix([xPx, yPx], displayOptions);
    tolerances.measured.gazeMeasuredRDeg = norm([
      tolerances.measured.gazeMeasuredXDeg,
      tolerances.measured.gazeMeasuredYDeg,
    ]);
  });
};

export const calculateError = async (
  letterTiming,
  tolerances,
  targetDurationSec,
  targetStim
) => {
  const targetFrameTimingReport = _reportTargetTimingFrames(targetStim);
  const measuredTargetDurationSec =
    letterTiming.targetFinishSec - letterTiming.targetStartSec;
  tolerances.measured.targetMeasuredDurationSec = measuredTargetDurationSec;
  tolerances.measured.targetMeasuredDurationFrames =
    targetFrameTimingReport.recordedEnd - targetFrameTimingReport.recordedStart;
  tolerances.measured.thresholdDurationRatio =
    measuredTargetDurationSec < targetDurationSec
      ? targetDurationSec / measuredTargetDurationSec
      : measuredTargetDurationSec / targetDurationSec;
  tolerances.measured.targetMeasuredLatencySec =
    (letterTiming.targetDrawnConfirmedTimestamp -
      letterTiming.crosshairClickedTimestamp) /
    1000;
};

export const addResponseIfTolerableError = (
  loop,
  answerCorrect,
  level,
  tolerances,
  trackGaze,
  psychoJS
) => {
  addMeasuredErrorToOutput(psychoJS, tolerances);
  const durationAcceptable = _targetDurationAcceptable(
    tolerances.measured.thresholdDurationRatio,
    tolerances.allowed.thresholdAllowedDurationRatio
  );
  const gazeAcceptable = _gazeErrorAcceptable(
    tolerances.measured,
    tolerances.allowed
  );
  const latencyAcceptable = _targetLatencyAcceptable(
    tolerances.measured.targetMeasuredLatencySec,
    tolerances.allowed.thresholdAllowedLatencySec
  );
  const relevantChecks = trackGaze
    ? [durationAcceptable, latencyAcceptable, gazeAcceptable]
    : [durationAcceptable, latencyAcceptable];
  if (relevantChecks.every((x) => x)) {
    psychoJS.experiment.addData("trialGivenToQuest", true);
    loop.addResponse(answerCorrect, level);
  } else {
    psychoJS.experiment.addData("trialGivenToQuest", false);
    loop._nextTrial();
  }
};

const addMeasuredErrorToOutput = (psychoJS, tolerances) => {
  const outputParams = [
    "gazeMeasuredXDeg",
    "gazeMeasuredYDeg",
    "gazeMeasuredRDeg",
    "gazeMeasurementLatencySec",
    "targetMeasuredLatencySec",
    "targetMeasuredDurationSec",
    "targetMeasuredDurationFrames",
  ];
  outputParams.forEach((parameter) =>
    psychoJS.experiment.addData(parameter, tolerances.measured[parameter])
  );
};

const _targetDurationAcceptable = (
  measuredDurationRatio,
  allowedDurationRatio
) => {
  return measuredDurationRatio <= allowedDurationRatio;
  // return (measuredDurationSec >= (targetDurationSec/allowedDurationRatio) && measuredDurationSec <= (targetDurationSec*allowedDurationRatio))
};

const _gazeErrorAcceptable = (measured, allowed) => {
  const { gazeMeasuredXDeg, gazeMeasuredYDeg, gazeMeasuredRDeg } = measured;
  const {
    thresholdAllowedGazeXErrorDeg,
    thresholdAllowedGazeYErrorDeg,
    thresholdAllowedGazeErrorDeg,
  } = allowed;

  return (
    Math.abs(gazeMeasuredXDeg) <= Math.abs(thresholdAllowedGazeXErrorDeg) &&
    Math.abs(gazeMeasuredYDeg) <= Math.abs(thresholdAllowedGazeYErrorDeg) &&
    gazeMeasuredRDeg <= thresholdAllowedGazeErrorDeg
  );
};

const _targetLatencyAcceptable = (measuredTargetLatency, allowedLatency) => {
  return measuredTargetLatency <= allowedLatency;
};

const _reportTargetTimingFrames = (targetStim) => {
  return {
    nominalStart: targetStim.frameNStart,
    recordedStart: targetStim.frameNDrawnConfirmed,
    nominalEnd: targetStim.frameNEnd,
    recordedEnd: targetStim.frameNFinishConfirmed,
  };
};
