/** Serialize an RC-owned attempt into pending and latest committed CSV rows. */

// Bounds mirror RC's cameraAttempt sanitizer: bounded cells, nothing dropped
// silently, and stable device identifiers never leave the machine.
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_ITEMS = 100;
const MAX_DEPTH = 8;

const clean = (value: unknown, depth = 0): unknown => {
  if (value == null || typeof value === "boolean" || typeof value === "number")
    return value;
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (depth >= MAX_DEPTH) return null;
  if (Array.isArray(value))
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => clean(item, depth + 1));
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

export const snapshotAttempt = (
  psychoJS: any,
  rc: any,
  getterName: string,
  columnName: string,
): boolean => {
  const experiment = psychoJS?._experiment ?? psychoJS?.experiment;
  if (
    typeof experiment?.addData !== "function" ||
    typeof rc?.[getterName] !== "function"
  )
    return false;
  try {
    const attempt = rc[getterName]();
    if (!attempt || typeof attempt !== "object") return false;
    const json = JSON.stringify(clean(attempt));
    experiment.addData(columnName, json);
    // The pending+committed stamping mirrors psychojs
    // FinalSaveOutcome._writeMainColumn; change both.
    const completed = experiment._trialsData;
    if (Array.isArray(completed) && completed.length > 0)
      completed[completed.length - 1][columnName] = json;
    return true;
  } catch (error) {
    console.warn(`${columnName} snapshot failed`, error);
    return false;
  }
};

// The guard key is a parameter because the camera column predates this
// helper: tests reset its legacy `__cameraAttemptSavePreparation` key, so it
// cannot silently migrate to the derived default.
export const registerAttemptSavePreparation = (
  psychoJS: any,
  rc: any,
  getterName: string,
  columnName: string,
  guardName = `__${columnName}SavePreparation`,
): boolean => {
  const experiment = psychoJS?._experiment ?? psychoJS?.experiment;
  if (typeof experiment?.registerSavePreparation !== "function") return false;
  if (experiment[guardName]) return true;
  const prepare = () => snapshotAttempt(psychoJS, rc, getterName, columnName);
  experiment.registerSavePreparation(prepare);
  experiment[guardName] = prepare;
  return true;
};
