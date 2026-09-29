/**
 * Hide RC tracking UI that leaked onto the experiment.
 *
 * Field (Acuity24FontsAddSloan3, 2026-09-29 participant video): after a
 * pause/restore (Escape, or laptop sleep killing the camera), RC's
 * distance-tracking UI — the live camera video with its face circle — can
 * reappear over the experiment and stay for the rest of the session.
 * EasyEyes hides it only once, at calibration-panel completion, so any
 * later re-show is never cleaned up. A leaked #webgazerVideoContainer
 * covers response words and eats their clicks (z-index 999999997 over the
 * response grid's 9,999,999, pointer-events not disabled in RC's CSS).
 *
 * Runs at every trialInstructionRoutineBegin resume site, right after
 * rc.resumeDistance/rc.resumeNudger: idempotent no-ops when nothing
 * leaked, and never throws (old RC builds may lack the methods).
 */

const LEAKED_ELEMENT_IDS = [
  // Camera-resolution preview page (bottom/top center), re-shown after
  // every camera reconnect when _showCameraResolutionBool; cleaned only by
  // Swal willClose, whose timing is not guaranteed (RC's own comment about
  // its sibling element admits this).
  "rc-resolution-video-wrapper",
  // Reconnect-popup page snapshot; normally removed on contrast restore.
  "rc-reconnect-page-snapshot",
];

export const hideStaleCalibrationUi = (rc: any): void => {
  try {
    rc?.showVideo?.(false);
  } catch {
    /* hygiene must never break the trial */
  }
  for (const id of LEAKED_ELEMENT_IDS) {
    try {
      document.getElementById(id)?.remove();
    } catch {
      /* hygiene must never break the trial */
    }
  }
};
