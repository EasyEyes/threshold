/**
 * Fullscreen-exit pause overlay.
 *
 * When the participant leaves fullscreen (typically by pressing Escape) the
 * browser exits fullscreen normally. We detect the exit via the
 * `fullscreenchange` listener registered in setupFullscreenMonitoring() and
 * show a modal with two buttons:
 *
 *   • Resume study  → re-request fullscreen and continue where they were
 *   • Quit study    → save data and end the study via quitPsychoJS
 *
 * RemoteCalibrator intentional exits are ignored: Choose Screen
 * (`rc._inChooseScreenMode`), camera-permission chrome
 * (`rc._awaitingCameraPermission`), and the low-resolution warning
 * (`rc._inResolutionWarning`). Camera permission is also tracked by a
 * `getUserMedia` guard installed here for older RC builds.
 *
 * i18n: participant-facing copy comes from
 * `EE_StudyPausedTitle`, `EE_StudyPausedBody`, `EE_ResumeStudy`, and
 * `EE_QuitStudy`. English fallbacks below match the phrase-table strings
 * and are used only when a lookup fails. Popup `dir` follows
 * `EE_LanguageDirection` so button order matches the Consent page:
 * affirmative (Resume) on the left for LTR, on the right for RTL.
 */

import Swal from "sweetalert2";

import { rc, status } from "./global";
import { paramReader } from "../threshold";
import { quitPsychoJS } from "./lifetime.js";
import { psychoJS } from "./globalPsychoJS.js";
import {
  clearFullscreenWasLost,
  isFullscreen,
  requestFullscreenSafe,
  setupFullscreenMonitoring,
  showCursor,
} from "./utils.js";
import {
  getLanguageDirection,
  getParticipantLanguage,
  phraseOrNull,
} from "./runtimeErrorMessage.js";
import { renderPhraseMarkdown } from "./markdownInline.js";
import { fullscreenExitLabel } from "./rcTermination.ts";

/**
 * English fallbacks used when the phrase table has not yet been updated
 * with these keys. Once the latest phrase-table version is out, phraseOrNull
 * will pick up the participant's language automatically.
 */
const ENGLISH_TEXT = {
  EE_ResumeStudy: "Resume study",
  EE_QuitStudy: "Quit study",
  EE_StudyPausedTitle: "Study paused",
  EE_StudyPausedBody:
    "You exited full-screen mode, so the study is paused. " +
    "Click **Resume study** to continue or **Quit study** to end your session.",
};

const phrase = (key, language) =>
  phraseOrNull(key, language) ?? ENGLISH_TEXT[key] ?? key;

let _overlayOpen = false;
let _pauseFullscreenOverlay = false;
export const pauseFullscreenOverlay = () => {
  _pauseFullscreenOverlay = true;
};
export const resumeFullscreenOverlay = () => {
  _pauseFullscreenOverlay = false;
};

/**
 * True while RemoteCalibrator intentionally left fullscreen (Choose Screen,
 * camera-permission chrome, or low-resolution warning). Host pause overlay
 * must not fire.
 *
 * Prefer RC's `isIntentionalFullscreenExit()` when present; also honor the
 * underlying flags used by current/older RC builds. Camera permission is
 * tracked by wrapping `getUserMedia` in `initFullscreenPauseOverlay` so we
 * do not depend on a newer RC release for that path alone.
 */
export const isRcIntentionalFullscreenExit = () => {
  try {
    if (typeof rc?.isIntentionalFullscreenExit === "function") {
      return !!rc.isIntentionalFullscreenExit();
    }
    return !!(
      rc?._inChooseScreenMode ||
      rc?._awaitingCameraPermission ||
      rc?._inResolutionWarning
    );
  } catch (_e) {
    return false;
  }
};

/**
 * True while the pause overlay is showing. Other code that reacts to
 * keypresses can consult this to no-op while paused.
 */
export const fullscreenPauseIsActive = () => _overlayOpen;

let _getUserMediaWrapped = false;
let _getUserMediaDepth = 0;

/**
 * Mark camera-permission getUserMedia as an intentional fullscreen exit.
 * Many browsers leave fullscreen while the permission prompt is showing;
 * we restore fullscreen (unless Choose Screen is active) before clearing.
 */
const _installCameraPermissionFullscreenGuard = () => {
  if (_getUserMediaWrapped) return;
  if (!navigator.mediaDevices?.getUserMedia) return;

  _getUserMediaWrapped = true;
  const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
    navigator.mediaDevices,
  );

  navigator.mediaDevices.getUserMedia = async (...args) => {
    _getUserMediaDepth += 1;
    if (rc) rc._awaitingCameraPermission = true;
    try {
      return await originalGetUserMedia(...args);
    } finally {
      _getUserMediaDepth = Math.max(0, _getUserMediaDepth - 1);
      if (_getUserMediaDepth === 0) {
        try {
          if (rc && !isFullscreen() && !rc._inChooseScreenMode) {
            await requestFullscreenSafe(rc);
          }
        } catch (_e) {
          // requestFullscreenSafe logs failures itself.
        }
        if (rc) rc._awaitingCameraPermission = false;
      }
    }
  };
};

/**
 * Install the fullscreen-exit pause overlay. Call once during experiment
 * startup, after `rc` and `quitPsychoJS` are available. Idempotent.
 */
export const initFullscreenPauseOverlay = () => {
  _installCameraPermissionFullscreenGuard();
  setupFullscreenMonitoring(_onFullscreenExit, isRcIntentionalFullscreenExit);
};

/**
 * Public entry point: open the pause overlay immediately. Use when a
 * separate mechanism (e.g. RemoteCalibrator's onQuit hook) already knows
 * the participant wants to leave fullscreen, so we skip the
 * fullscreenchange debounce and go straight to Resume/Quit. Idempotent.
 * `rcQuitTrigger` (from rcQuitTriggerFromReason) rides the Quit label as
 * fullscreenExit(rc:<trigger>) — empty for a genuine participant Esc exit.
 */
let _rcQuitTrigger = "";
export const showFullscreenPauseOverlay = (rcQuitTrigger = "") => {
  _rcQuitTrigger = typeof rcQuitTrigger === "string" ? rcQuitTrigger : "";
  _onFullscreenExit();
};

/**
 * Debounced fullscreen-exit callback. `setupFullscreenMonitoring` invokes
 * this ~300 ms after the participant leaves fullscreen and it has stayed
 * exited, ignoring brief exits during RemoteCalibrator's own UI.
 */
const _onFullscreenExit = () => {
  // Consume the RC trigger whatever happens below, so a trigger from one
  // overlay request can never ride a later, unrelated Quit.
  const rcQuitTrigger = _rcQuitTrigger;
  _rcQuitTrigger = "";
  if (_pauseFullscreenOverlay) return;
  if (_overlayOpen) return;
  // Fullscreen could have been re-entered during the debounce window; if so,
  // there is nothing to pause.
  if (isFullscreen()) return;
  // RemoteCalibrator Choose Screen / camera permission: not a study pause.
  if (isRcIntentionalFullscreenExit()) return;
  // The experiment is ending: quitPsychoJS itself leaves fullscreen before
  // the final upload, so this exit is ours, not the participant's. Showing
  // Resume/Quit here put a "Quit study" button next to the saving indicator;
  // a participant who pressed it during a slow upload re-entered
  // quitPsychoJS with isCompleted=false, overwriting a finished session as
  // "fullscreenExit (block 31/31, trial 6/6)" (Compare3Languages131).
  if (status.terminated) return;

  _overlayOpen = true;
  const language = getParticipantLanguage();
  const direction = getLanguageDirection(language);
  const title = phrase("EE_StudyPausedTitle", language);
  const body = phrase("EE_StudyPausedBody", language);
  const resumeLabel = phrase("EE_ResumeStudy", language);
  const quitLabel = phrase("EE_QuitStudy", language);

  // The participant needs to be able to click Resume/Quit. Trials normally
  // hide the cursor.
  showCursor();
  try {
    psychoJS.eventManager.clearKeys();
  } catch (_e) {
    // Event manager may not exist yet during early startup.
  }

  Swal.fire({
    title: renderPhraseMarkdown(title),
    html: renderPhraseMarkdown(body),
    showConfirmButton: true,
    showDenyButton: true,
    showCancelButton: false,
    // Do not let the participant dismiss without choosing: they either
    // Resume or Quit.
    allowOutsideClick: false,
    allowEscapeKey: false,
    focusConfirm: true,
    heightAuto: false,
    reverseButtons: false,
    confirmButtonText: resumeLabel,
    denyButtonText: quitLabel,
    // Use Bootstrap styles so the buttons match the rest of the runtime UI.
    buttonsStyling: false,
    customClass: {
      popup: "ee-fullscreen-pause-popup",
      confirmButton:
        "btn btn-success ee-fullscreen-pause-btn ee-fullscreen-pause-resume-btn",
      denyButton:
        "btn btn-danger ee-fullscreen-pause-btn ee-fullscreen-pause-quit-btn",
    },
    didOpen: (popup) => {
      popup.setAttribute("dir", direction);
      popup.setAttribute("lang", language);
      const actions = popup.querySelector(".swal2-actions");
      if (actions) {
        // Keep DOM order Confirm then Deny; let `dir` choose the visual side
        // (Consent does the same with Yes then No under body `dir`).
        actions.style.direction = direction;
        actions.style.flexDirection = "row";
      }
    },
  }).then(async (result) => {
    _overlayOpen = false;
    if (result.isConfirmed) {
      await _handleResume();
    } else if (result.isDenied) {
      _handleQuit(rcQuitTrigger);
    } else {
      // Overlay dismissed without either action (should not happen because
      // outside-click and Escape are disabled). Restore fullscreen so the
      // participant is not left in a half-broken state.
      await _handleResume();
    }
  });
};

const _handleResume = async () => {
  try {
    await requestFullscreenSafe(rc);
  } catch (_e) {
    // requestFullscreenSafe logs failures itself.
  }
  // Whether or not the fullscreen request succeeded, clear the lost-flag so
  // requireFullscreenForTrialInitiation stops blocking trial input. If the
  // browser refused fullscreen (rare) another fullscreenchange will fire
  // when it exits again, re-opening this overlay.
  clearFullscreenWasLost();
};

const _handleQuit = (rcQuitTrigger) => {
  try {
    quitPsychoJS(
      "",
      false,
      paramReader,
      undefined,
      undefined,
      fullscreenExitLabel(rcQuitTrigger),
    );
  } catch (e) {
    console.warn("quitPsychoJS from fullscreen-pause overlay failed:", e);
  }
};
