import { warning } from "./errorHandling";
import {
  rc,
  fixationConfig,
  targetsOverlappedThisTrial,
  status,
  letterConfig,
} from "./global";
import { logQuest } from "./logging";
import {
  XYDegOfXYPix,
  norm,
  psychojsUnitsFromWindowUnits,
  toFixedNumber,
  logger,
  rectFromPixiRect,
  getPairs,
  isRectTouchingRect,
  distance,
  closeEnough,
} from "./utils";

export const readAllowedTolerances = (tolerances, reader, BC) => {
  tolerances.allowed.thresholdAllowedDurationRatio = reader.read(
    "thresholdAllowedDurationRatio",
    BC,
  );
  tolerances.allowed.thresholdAllowedGazeRErrorDeg = reader.read(
    "thresholdAllowedGazeRErrorDeg",
    BC,
  );
  tolerances.allowed.thresholdAllowedGazeXErrorDeg = reader.read(
    "thresholdAllowedGazeXErrorDeg",
    BC,
  );
  tolerances.allowed.thresholdAllowedGazeYErrorDeg = reader.read(
    "thresholdAllowedGazeYErrorDeg",
    BC,
  );
  tolerances.allowed.thresholdAllowedLatenessSec = reader.read(
    "thresholdAllowedLatenessSec",
    BC,
  );
};

export const measureGazeError = (
  tolerances,
  displayOptions,
  crosshairClickTimestamp,
  targetDurationSec,
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
        fixationConfig.pos,
      );
      // Convert to degrees.
      [
        tolerances.measured.gazeMeasuredXDeg,
        tolerances.measured.gazeMeasuredYDeg,
      ] = XYDegOfXYPix([xPx, yPx]);
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
          fixationConfig.pos,
        );

        const [rawXDeg, rawYDeg] = XYDegOfXYPix([rawX, rawY]);
        tolerances.measured.gazeMeasuredRawDeg.push([
          toFixedNumber(rawXDeg, 5),
          toFixedNumber(rawYDeg, 5),
        ]);
      }
    },
  );
};

export const calculateError = async (
  letterTiming,
  tolerances,
  targetDurationSec,
  targetStim,
  requestedLateness,
) => {
  const targetFrameTimingReport = _reportTargetTimingFrames(targetStim);

  if (
    letterTiming.targetFinishSec === undefined ||
    letterTiming.targetStartSec === undefined ||
    letterTiming.targetStartSec === null ||
    letterTiming.targetFinishSec === null
  ) {
    console.error(
      "targetStartSec or targetFinishSec is missing, in calculateError",
    );
  } else {
    const measuredTargetDurationSec =
      letterTiming.targetFinishSec - letterTiming.targetStartSec;

    tolerances.measured.targetMeasuredDurationSec = measuredTargetDurationSec;
    tolerances.measured.targetMeasuredDurationFrames =
      targetFrameTimingReport.recordedEnd -
      targetFrameTimingReport.recordedStart;
    tolerances.measured.thresholdDurationRatio =
      measuredTargetDurationSec < targetDurationSec
        ? targetDurationSec / measuredTargetDurationSec
        : measuredTargetDurationSec / targetDurationSec;
    tolerances.measured.targetMeasuredLatenessSec =
      (letterTiming.targetDrawnConfirmedTimestamp -
        letterTiming.crosshairClickedTimestamp) /
        1000 -
      requestedLateness;
  }
};

export const addResponseIfTolerableError = (
  loop,
  answerCorrect,
  level,
  tolerances,
  trackGaze,
  psychoJS,
  respondedEarly,
  simulated,
) => {
  addMeasuredErrorToOutput(psychoJS, tolerances);
  const durationAcceptable =
    _targetDurationAcceptable(
      tolerances.measured.thresholdDurationRatio,
      tolerances.allowed.thresholdAllowedDurationRatio,
    ) || respondedEarly;
  const gazeAcceptable = _gazeErrorAcceptable(
    tolerances.measured,
    tolerances.allowed,
  );
  const latencyAcceptable = _targetLatencyAcceptable(
    tolerances.measured.targetMeasuredLatenessSec,
    tolerances.allowed.thresholdAllowedLatenessSec,
  );
  const baseChecks = [durationAcceptable, latencyAcceptable];
  const relevantChecks = trackGaze
    ? [...baseChecks, gazeAcceptable]
    : baseChecks;

  const validTrialToGiveToQUEST = relevantChecks.every((x) => x) || simulated;
  logQuest("Was trial given to QUEST?", validTrialToGiveToQUEST);
  logQuest("Was answer correct?", answerCorrect ? true : false);
  if (simulated)
    psychoJS.experiment.addData("trialGivenToQuestBecauseSimulated", true);
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
    "targetMeasuredLatenessSec",
    "targetMeasuredDurationSec",
    "targetMeasuredDurationFrames",
  ];
  outputParams.forEach((parameter) =>
    psychoJS.experiment.addData(parameter, tolerances.measured[parameter]),
  );
  if (typeof targetsOverlappedThisTrial.current !== "undefined")
    psychoJS.experiment.addData(
      "targetsOverlappedBool",
      targetsOverlappedThisTrial.current,
    );
};

const _targetDurationAcceptable = (
  measuredDurationRatio,
  allowedDurationRatio,
) => {
  if (measuredDurationRatio && allowedDurationRatio) {
    return measuredDurationRatio <= allowedDurationRatio;
    // return (measuredDurationSec >= (targetDurationSec/allowedDurationRatio) && measuredDurationSec <= (targetDurationSec*allowedDurationRatio))
  } else {
    console.error("Unable to check if target duration is acceptable.");
    return false;
  }
};

const _gazeErrorAcceptable = (measured, allowed) => {
  const { gazeMeasuredXDeg, gazeMeasuredYDeg, gazeMeasuredRDeg } = measured;
  const {
    thresholdAllowedGazeXErrorDeg,
    thresholdAllowedGazeYErrorDeg,
    thresholdAllowedGazeRErrorDeg,
  } = allowed;
  if (
    gazeMeasuredRDeg &&
    gazeMeasuredXDeg &&
    gazeMeasuredYDeg &&
    thresholdAllowedGazeRErrorDeg &&
    thresholdAllowedGazeXErrorDeg &&
    thresholdAllowedGazeYErrorDeg
  ) {
    return (
      Math.abs(gazeMeasuredXDeg) <= Math.abs(thresholdAllowedGazeXErrorDeg) &&
      Math.abs(gazeMeasuredYDeg) <= Math.abs(thresholdAllowedGazeYErrorDeg) &&
      gazeMeasuredRDeg <= thresholdAllowedGazeRErrorDeg
    );
  } else {
    console.error("Unable to check if gaze position is acceptable.");
    return false;
  }
};

const _targetLatencyAcceptable = (measuredTargetLatency, allowedLatency) => {
  if (measuredTargetLatency && allowedLatency) {
    return measuredTargetLatency <= allowedLatency;
  } else {
    console.error("Unable to check if target latency is acceptable.");
    return false;
  }
};

const _reportTargetTimingFrames = (targetStim) => {
  return {
    nominalStart: targetStim.frameNStart,
    recordedStart: targetStim.frameNDrawnConfirmed,
    nominalEnd: targetStim.frameNEnd,
    recordedEnd: targetStim.frameNFinishConfirmed,
  };
};

export const targetsOverlap = (targets) => {
  const boundingBoxes = targets.map((s) => s.getBoundingBox(true));
  const boundingRects = boundingBoxes.map(rectFromPixiRect);
  const pairs = getPairs(boundingRects);
  return pairs.some(([r1, r2]) => isRectTouchingRect(r1, r2));
};

export const doubleCheckSizeToSpacing = (
  target,
  flanker1,
  stimulusParameters,
) => {
  checkSpacingOverSizeRatio(
    stimulusParameters.spacingDeg,
    stimulusParameters.heightDeg,
    `${status.currentFunction}NominalDeg`,
  );
  if (letterConfig.spacingRelationToSize === "ratio") {
    const calculatedSizePx = letterConfig.targetSizeIsHeightBool
      ? target.getBoundingBox(true).height
      : target.getBoundingBox(true).width;
    const targetBB = target.getBoundingBox(true);
    const flankerBB = flanker1.getBoundingBox(true);
    const targetXY = [targetBB.x, targetBB.y];
    const flankerXY = [flankerBB.x, flankerBB.y];
    const calculatedSpacingPx = distance(targetXY, flankerXY);
    checkSpacingOverSizeRatio(
      calculatedSpacingPx,
      calculatedSizePx,
      `${status.currentFunction}MeasuredPx`,
    );
  }
};
const checkSpacingOverSizeRatio = (spacing, size, id = "") => {
  const isGood = closeEnough(spacing / size, letterConfig.spacingOverSizeRatio);
  if (!isGood)
    warning(
      `!. Size (${size}) and spacing (${spacing}) are out of proportion (${toFixedNumber(
        spacing / size,
        3,
      )}, not ${letterConfig.spacingOverSizeRatio}), at ${id}`,
    );
  return isGood;
};
