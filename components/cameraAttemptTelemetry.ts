/**
 * Latest RemoteCalibrator camera-attempt snapshot for the results CSV.
 * RC owns the state; this module only sanitizes and serializes it. Older RC
 * builds have no getter and intentionally produce no column.
 */

const clean = (value: unknown, depth = 0): unknown => {
  if (value == null || typeof value === "boolean" || typeof value === "number")
    return value;
  if (typeof value === "string") return value.slice(0, 500);
  if (depth >= 8) return null;
  if (Array.isArray(value))
    return value.slice(0, 100).map((item) => clean(item, depth + 1));
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "deviceId" || key === "groupId") continue;
      if (typeof item === "function" || item === undefined) continue;
      result[key] = clean(item, depth + 1);
    }
    return result;
  }
  return String(value);
};

export const snapshotCameraAttempt = (psychoJS: any, rc: any): boolean => {
  const experiment = psychoJS?._experiment ?? psychoJS?.experiment;
  if (
    typeof experiment?.addData !== "function" ||
    typeof rc?.getCameraAttempt !== "function"
  )
    return false;
  try {
    const attempt = rc.getCameraAttempt();
    if (!attempt || typeof attempt !== "object") return false;
    // Direct method call preserves ExperimentHandler's `this` binding.
    const json = JSON.stringify(clean(attempt));
    experiment.addData("cameraAttemptJSON", json);
    // save() serializes completed entries, not the pending entry. An unload or
    // termination audit may already have called nextEntry(), so the latest
    // completed row must carry the same current attempt.
    const completed = experiment._trialsData;
    if (Array.isArray(completed) && completed.length > 0) {
      completed[completed.length - 1].cameraAttemptJSON = json;
    }
    return true;
  } catch (error) {
    // Diagnostics must never interrupt an exit or an upload.
    console.warn("camera attempt snapshot failed", error);
    return false;
  }
};

export const registerCameraAttemptSavePreparation = (
  psychoJS: any,
  rc: any,
): boolean => {
  const experiment = psychoJS?._experiment ?? psychoJS?.experiment;
  if (typeof experiment?.registerSavePreparation !== "function") return false;
  if (experiment.__cameraAttemptSavePreparation) return true;
  const prepare = () => snapshotCameraAttempt(psychoJS, rc);
  experiment.registerSavePreparation(prepare);
  experiment.__cameraAttemptSavePreparation = prepare;
  return true;
};
