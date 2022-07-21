import { rc, fixationConfig } from "./global";
import {
  XYDegOfXYPix,
  norm,
  psychojsUnitsFromWindowUnits,
  toFixedNumber,
} from "./utils";

export const measureGazeError = (
  tolerances,
  displayOptions,
  crosshairClickTimestamp,
  targetDurationSec
) => {
  rc.getGazeNow(
    {
      wait: targetDurationSec * 1000,
      frames: 9,
    },
    (r) => {
      tolerances.measured.gazeMeasurementLatencySec =
        (r.timestamp - r.value.latencyMs - crosshairClickTimestamp) / 1000;

      // Convert to psychoJS units pixels, relative to fixation
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

      // again for raw measures
      tolerances.measured.gazeMeasuredRawDeg = [];
      for (let rawPoint of r.raw) {
        const [rawX, rawY] = psychojsUnitsFromWindowUnits(
          [rawPoint.x, rawPoint.y],
          [rc.windowWidthPx.value, rc.windowHeightPx.value],
          fixationConfig.pos
        );

        const [rawXDeg, rawYDeg] = XYDegOfXYPix([rawX, rawY], displayOptions);
        tolerances.measured.gazeMeasuredRawDeg.push([
          toFixedNumber(rawXDeg, 5),
          toFixedNumber(rawYDeg, 5),
        ]);
      }
    }
  );
};

export const calculateError = async (
  letterTiming,
  tolerances,
  targetDurationSec,
  targetStim
) => {
  const targetFrameTimingReport = _reportTargetTimingFrames(targetStim);

  if (
    letterTiming.targetFinishSec === undefined ||
    letterTiming.targetStartSec === undefined ||
    letterTiming.targetStartSec === null ||
    letterTiming.targetFinishSec === null
  ) {
    throw new Error("targetStartSec or targetFinishSec is missing");
  }
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

  const validTrialToGiveToQUEST = relevantChecks.every((x) => x);

  psychoJS.experiment.addData("trialGivenToQuest", validTrialToGiveToQUEST);
  loop.addResponse(answerCorrect, level, validTrialToGiveToQUEST);

  return validTrialToGiveToQUEST;
};

const addMeasuredErrorToOutput = (psychoJS, tolerances) => {
  const outputParams = [
    "gazeMeasuredXDeg",
    "gazeMeasuredYDeg",
    "gazeMeasuredRDeg",
    "gazeMeasuredRawDeg",
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
    thresholdAllowedGazeRErrorDeg,
  } = allowed;

  return (
    Math.abs(gazeMeasuredXDeg) <= Math.abs(thresholdAllowedGazeXErrorDeg) &&
    Math.abs(gazeMeasuredYDeg) <= Math.abs(thresholdAllowedGazeYErrorDeg) &&
    gazeMeasuredRDeg <= thresholdAllowedGazeRErrorDeg
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
