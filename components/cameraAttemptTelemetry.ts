/** RemoteCalibrator camera-attempt snapshots for the results CSV. */
import {
  registerAttemptSavePreparation,
  snapshotAttempt,
} from "./attemptTelemetry";

export const snapshotCameraAttempt = (psychoJS: any, rc: any): boolean =>
  snapshotAttempt(psychoJS, rc, "getCameraAttempt", "cameraAttemptJSON");

export const registerCameraAttemptSavePreparation = (
  psychoJS: any,
  rc: any,
): boolean =>
  registerAttemptSavePreparation(
    psychoJS,
    rc,
    "getCameraAttempt",
    "cameraAttemptJSON",
    "__cameraAttemptSavePreparation", // legacy guard key, reset by tests
  );
