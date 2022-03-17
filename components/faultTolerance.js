import { rc } from "./global";
import { logger } from "./utils";

export const calculateError = (
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
  logger("tolerance targetDurationSec", targetDurationSec);
  rc.getGazeNow().then(logger);
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
  logger();
  const gazeAcceptable = _gazeErrorAcceptable(
    tolerances.measured.gazeErrorDeg,
    tolerances.allowed.thresholdAllowedGazeErrorDeg
  );
  const latencyAcceptable = _targetLatencyAcceptable(
    tolerances.measured.thresholdLatencySec,
    tolerances.allowed.thresholdAllowedLatencySec
  );
  if (durationAcceptable && gazeAcceptable && latencyAcceptable) {
    loop.addResponse(answerCorrect, level);
  } else {
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
  return gazeMeasuredEccentricityDeg <= allowedErrorDeg;
};

const _targetLatencyAcceptable = (measuredTargetLatency, allowedLatency) => {
  return measuredTargetLatency <= allowedLatency;
};
