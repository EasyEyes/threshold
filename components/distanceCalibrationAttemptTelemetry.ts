/** RemoteCalibrator distance-calibration attempts for the results CSV. */
import {
  registerAttemptSavePreparation,
  snapshotAttempt,
} from "./attemptTelemetry";

export const snapshotDistanceCalibrationAttempt = (
  psychoJS: any,
  rc: any,
): boolean =>
  snapshotAttempt(
    psychoJS,
    rc,
    "getDistanceCalibrationAttempt",
    "distanceCalibrationAttemptJSON",
  );

export const registerDistanceCalibrationAttemptSavePreparation = (
  psychoJS: any,
  rc: any,
): boolean =>
  registerAttemptSavePreparation(
    psychoJS,
    rc,
    "getDistanceCalibrationAttempt",
    "distanceCalibrationAttemptJSON",
  );
