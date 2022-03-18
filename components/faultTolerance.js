import { rc, fixationConfig } from "./global";
import { logger, XYDegOfXYPix, norm } from "./utils";

export const measureGazeError = (tolerances, displayOptions) => {
  rc.pauseGaze();
  rc.getGazeNow((r) => {
    rc.resumeGaze();
    // Convert form the origin being at the top left of the screen...
    const [screenX, screenY] = [r.value.x, r.value.y];
    logger("[screenX, screenY]", [screenX, screenY]);
    // ... to the center of the screen.
    const [centeredX, centeredY] = [
      screenX - rc.windowWidthPx.value / 2,
      screenY - rc.windowHeightPx.value / 2,
    ];
    logger("rc.windowWidthPx.value", rc.windowWidthPx.value);
    logger("[centeredX, centeredY]", [centeredX, centeredY]);
    // And then find the position relative to fixation.
    const [xPx, yPx] = [
      centeredX - fixationConfig.pos[0],
      centeredY - fixationConfig.pos[1],
    ];
    logger("[xPx, yPx]", [xPx, yPx]);
    // Convert to degrees.
    logger("displayOptions", displayOptions);
    [tolerances.measured.gazeXDeg, tolerances.measured.gazeYDeg] = XYDegOfXYPix(
      [xPx, yPx],
      displayOptions
    );
    logger("gazeXYDeg", [
      tolerances.measured.gazeXDeg,
      tolerances.measured.gazeYDeg,
    ]);
    tolerances.measured.thresholdGazeErrorDeg = norm([
      tolerances.measured.gazeXDeg,
      tolerances.measured.gazeYDeg,
    ]);
  });
};

export const calculateError = async (
  letterTiming,
  timing,
  tolerances,
  targetDurationSec
) => {
  const measuredTargetDurationSec =
    letterTiming.targetFinishSec - letterTiming.targetStartSec;
  tolerances.measured.thresholdDurationRatio =
    measuredTargetDurationSec < targetDurationSec
      ? targetDurationSec / measuredTargetDurationSec
      : measuredTargetDurationSec / targetDurationSec;
  tolerances.measured.thresholdLatencySec = timing.clickToStimulusOnsetSec;
};

export const addResponseIfTolerableError = (
  loop,
  answerCorrect,
  level,
  tolerances
) => {
  const durationAcceptable = _targetDurationAcceptable(
    tolerances.measured.thresholdDurationRatio,
    tolerances.allowed.thresholdAllowedDurationRatio
  );
  logger("durationAcceptable", durationAcceptable);
  const gazeAcceptable = _gazeErrorAcceptable(
    tolerances.measured.thresholdGazeErrorDeg,
    tolerances.allowed.thresholdAllowedGazeErrorDeg
  );
  logger("gazeAcceptable", gazeAcceptable);
  const latencyAcceptable = _targetLatencyAcceptable(
    tolerances.measured.thresholdLatencySec,
    tolerances.allowed.thresholdAllowedLatencySec
  );
  logger("latencyAcceptable", latencyAcceptable);
  if (durationAcceptable && gazeAcceptable && latencyAcceptable) {
    logger("error tolerable, adding response");
    loop.addResponse(answerCorrect, level);
  } else {
    logger("error untolerable, next trial");
    loop._nextTrial();
  }
};

const _targetDurationAcceptable = (
  measuredDurationRatio,
  allowedDurationRatio
) => {
  return measuredDurationRatio <= allowedDurationRatio;
  // return (measuredDurationSec >= (targetDurationSec/allowedDurationRatio) && measuredDurationSec <= (targetDurationSec*allowedDurationRatio))
};

const _gazeErrorAcceptable = (gazeMeasuredEccentricityDeg, allowedErrorDeg) => {
  logger("gazeMeasuredEccentricityDeg", gazeMeasuredEccentricityDeg);
  logger("allowedErrorDeg", allowedErrorDeg);
  return gazeMeasuredEccentricityDeg <= allowedErrorDeg;
};

const _targetLatencyAcceptable = (measuredTargetLatency, allowedLatency) => {
  return measuredTargetLatency <= allowedLatency;
};
