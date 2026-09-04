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
 * Rationale: this reacts when the participant leaves fullscreen without
 * intercepting the browser's Escape shortcut, keeps the actual experiment
 * screen clean, gives the participant a clear and deliberate way to quit
 * without accidentally ending the study, and protects participants from
 * accidentally leaving fullscreen.
 *
 * i18n: the two participant-facing labels are `EE_ResumeStudy` and
 * `EE_QuitStudy`. Until those keys ship in the phrase table (published
 * externally in i18n_local.js), the English fallbacks below are used. The
 * body/title strings currently also fall back to English for the same
 * reason.
 */

import Swal from "sweetalert2";

import { rc } from "./global";
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
import { getParticipantLanguage, phraseOrNull } from "./runtimeErrorMessage.js";

/**
 * English fallbacks used when the phrase table has not yet been updated
 * with these keys. Once the latest phrase-table version is out, phraseOrNull
 * will pick up the participant's language automatically.
 */
const ENGLISH_TEXT = {
  EE_ResumeStudy: "Resume study",
  EE_QuitStudy: "Quit study",
  EE_studyPausedTitle: "Study paused",
  EE_studyPausedBody:
    "You have left fullscreen and the study is paused. " +
    "Click Resume study to continue, or Quit study to end the study now.",
};

const phrase = (key, language) =>
  phraseOrNull(key, language) ?? ENGLISH_TEXT[key] ?? key;

let _overlayOpen = false;

/**
 * True while the pause overlay is showing. Other code that reacts to
 * keypresses can consult this to no-op while paused.
 */
export const fullscreenPauseIsActive = () => _overlayOpen;

/**
 * Install the fullscreen-exit pause overlay. Call once during experiment
 * startup, after `rc` and `quitPsychoJS` are available. Idempotent.
 */
export const initFullscreenPauseOverlay = () => {
  setupFullscreenMonitoring(_onFullscreenExit);
};

/**
 * Public entry point: open the pause overlay immediately. Use when a
 * separate mechanism (e.g. RemoteCalibrator's onQuit hook) already knows
 * the participant wants to leave fullscreen, so we skip the
 * fullscreenchange debounce and go straight to Resume/Quit. Idempotent.
 */
export const showFullscreenPauseOverlay = () => {
  _onFullscreenExit();
};

/**
 * Debounced fullscreen-exit callback. `setupFullscreenMonitoring` invokes
 * this ~300 ms after the participant leaves fullscreen and it has stayed
 * exited, ignoring brief exits during RemoteCalibrator's own UI.
 */
const _onFullscreenExit = () => {
  if (_overlayOpen) return;
  // Fullscreen could have been re-entered during the debounce window; if so,
  // there is nothing to pause.
  if (isFullscreen()) return;

  _overlayOpen = true;
  const language = getParticipantLanguage();
  const title = phrase("EE_studyPausedTitle", language);
  const body = phrase("EE_studyPausedBody", language);
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
    title,
    text: body,
    icon: "info",
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
        "btn btn-primary ee-fullscreen-pause-btn ee-fullscreen-pause-resume-btn",
      denyButton:
        "btn btn-danger ee-fullscreen-pause-btn ee-fullscreen-pause-quit-btn",
    },
  }).then(async (result) => {
    _overlayOpen = false;
    if (result.isConfirmed) {
      await _handleResume();
    } else if (result.isDenied) {
      _handleQuit();
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

const _handleQuit = () => {
  try {
    quitPsychoJS(
      "",
      false,
      paramReader,
      undefined,
      undefined,
      "fullscreenExit",
    );
  } catch (e) {
    console.warn("quitPsychoJS from fullscreen-pause overlay failed:", e);
  }
};
