/**
 * Termination label for RemoteCalibrator-initiated quits, written to the
 * unmetNeeds column (the column Analyze displays as the session's reason).
 *
 * Label grammar: `rc:<trigger>:quit` + optional detail suffix
 * `(key=value,…)` carrying what RC reported (camera status, label, failed
 * resume attempts) and minutes since start — the only facts NOT already
 * available in other columns (currentFunction, durationOfExperimentSec,
 * deviceSystem/deviceBrowser, block all exist).
 */

/** The only onQuit source observed in the field (6/6, studies 114–117). */
export const RC_CAMERA_RECONNECT_POPUP_QUIT = "rc:cameraReconnectPopup:quit";

export type RCCameraSnapshot = {
  status?: string;
  trackReadyState?: string;
  streamActive?: boolean;
};

/** Reason object RC passes to setOnQuit callbacks (absent on older builds). */
export type RCQuitReason = {
  trigger?: string;
  snapshot?: RCCameraSnapshot | null;
  cameraLabel?: string;
  resumeAttempts?: number;
  quitAfterFailedResume?: boolean;
  [key: string]: unknown;
};

/** Detail-suffix-safe: no separators, newlines, or parens inside values. */
const detailSafe = (v: unknown): string =>
  String(v ?? "")
    .replace(/[(),\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);

/** Keep the code grammar-safe: [A-Za-z0-9_.-] only. */
const sanitizeTrigger = (trigger: unknown): string =>
  String(trigger ?? "")
    .replace(/[^\w.-]/g, "")
    .slice(0, 40);

/**
 * Minutes since the experiment started. RC quits are commonest during the
 * pre-consent compatibility flow, before experimentInit creates the global
 * clock — there, fall back to minutes since page load (performance.now()).
 */
export const rcMinutesSinceStart = (
  clockGlobal: { getTime: () => number } | null | undefined,
  performanceNowMs: number,
): number => {
  const t = clockGlobal?.getTime();
  return typeof t === "number" && isFinite(t)
    ? t / 60
    : performanceNowMs / 60000;
};

/**
 * unmetNeeds cell for an RC quit: `rc:<trigger>:quit(status=…,camera=…,
 * attempts=…,min=…)`. Old RC builds pass no reason — then just the label
 * (the reconnect popup is the only known onQuit source in the field).
 */
export const rcUnmetNeedsFromReason = (
  reason: RCQuitReason | null | undefined,
  minutesSinceStart?: number,
): string => {
  const trigger =
    reason && typeof reason === "object" ? sanitizeTrigger(reason.trigger) : "";
  const label =
    !trigger || trigger === "cameraReconnectPopup"
      ? RC_CAMERA_RECONNECT_POPUP_QUIT
      : `rc:${trigger}:quit`;

  if (!reason || typeof reason !== "object") return label;

  const detail: string[] = [];
  if (reason.snapshot?.status)
    detail.push(`status=${detailSafe(reason.snapshot.status)}`);
  if (reason.cameraLabel)
    detail.push(`camera=${detailSafe(reason.cameraLabel)}`);
  if (reason.resumeAttempts)
    detail.push(`attempts=${detailSafe(reason.resumeAttempts)}`);
  if (typeof minutesSinceStart === "number" && isFinite(minutesSinceStart))
    detail.push(`min=${Math.round(minutesSinceStart * 10) / 10}`);

  return detail.length ? `${label}(${detail.join(",")})` : label;
};
