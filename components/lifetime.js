import { ExperimentHandler } from "../psychojs/src/data/ExperimentHandler.js";
import { Scheduler } from "../psychojs/src/util/index.js";
import { isProlificExperiment } from "./externalServices.ts";
import Swal from "sweetalert2";

import { hideForm, showForm, showDebriefFollowUp } from "./forms";
import { setRetryObserver } from "../preprocess/retry";
import {
  eyeTrackingStimulusRecords,
  localStorageKey,
  rc,
  showCharacterSetResponse,
  thisExperimentInfo,
  microphoneCalibrationResults,
  //calibrateSoundSaveJSONBool,
  cursorTracking,
  status,
  totalBlocks,
  totalTrialsThisBlock,
} from "./global";
import { clock, psychoJS } from "./globalPsychoJS";
import { removeBeepButton, removeProceedButton } from "./instructions.js";
import { destroyExperimentProgressBar } from "./progressBar.js";
import { recruitmentServiceData } from "./recruitmentService";
import { removeClickableCharacterSet } from "./showCharacterSet";
import {
  setEEState,
  publishPhaseEntered,
  publishResponseAffordance,
  publishClickAffordance,
  SIM_PHASE,
  publishSummary,
  simulateActive,
} from "./simulatedState.ts";
import { showCursor, sleep } from "./utils";
import { useMatlab, closeMatlab } from "./connectMatlab";
import { readi18nPhrases } from "./readPhrases.js";
import { renderMarkdown } from "./markdownInline.js";
import { PsychoJS } from "../psychojs/src/core/index.js";
import { cancelActiveRsvpSpeechPreflight } from "./speech/speechPreflight.ts";
import {
  closeActiveRsvpSpeechTrial,
  hasActiveRsvpSpeechResources,
} from "./rsvpSpeech/rsvpSpeechRuntime.ts";

/**
 * Which Prolific completion code this session returns with — written to the
 * final row as `completionCodeIssued` (and its literal as `completionCode`)
 * so Analyze can translate the raw code Prolific shows back to English.
 * Every return to Prolific carries a code: completions carry the study's
 * completion code; device/compatibility failures carry the
 * incompatible-completion code; every other incomplete termination carries
 * the aborted-completion code — so Prolific classifies incompletes as
 * Returned instead of demanding a manual review.
 * @param {boolean} isCompleted
 * @param {string} unmetNeeds
 * @returns {"completed"|"deviceIncompatible"|"aborted"|""}
 */
const DEVICE_INCOMPATIBLE_CODES =
  /^(rc:|compatibilityNotMet|emailVerificationCancelled|emailVerificationFailed|calibrationObjectUnavailable)/;

export const completionCodeIssuedFor = (isCompleted, unmetNeeds) => {
  if (isCompleted) return "completed";
  if (!unmetNeeds) return "";
  if (DEVICE_INCOMPATIBLE_CODES.test(unmetNeeds)) return "deviceIncompatible";
  return "aborted";
};

/** Progress suffix for termination cells, e.g. " (block 3/31, trial 12/40)". */
const terminationProgressSuffix = () => {
  const progress = [];
  if (status.nthBlock)
    progress.push(`block ${status.nthBlock}/${totalBlocks.current}`);
  if (status.trial)
    progress.push(`trial ${status.trial}/${totalTrialsThisBlock.current}`);
  return progress.length ? ` (${progress.join(", ")})` : "";
};

/**
 * Stamp the pending row when the page unloads mid-experiment (tab close,
 * reload, navigate away). Without this, every such exit uploads an
 * unexplained incomplete row — field data: 27 of 73 sessions in one study
 * set, all wedged at block-1 onset, closed/reloaded by the participant,
 * uploaded by PsychoJS's `unload` sync-save, and labeled nothing.
 */
export const stampUnloadExit = () => {
  try {
    const experiment = psychoJS._experiment ?? psychoJS.experiment;
    if (!experiment || experiment.experimentEnded) return;
    // A termination audit is already pending (e.g. closed during the
    // debrief screen): keep its reason, don't overwrite it — but COMMIT it,
    // or the unload save uploads everything except the audit row itself.
    // (terminated is irrelevant here: the audit predates it.)
    if (
      experiment._currentTrialData &&
      "unmetNeeds" in experiment._currentTrialData
    ) {
      experiment.nextEntry?.();
      return;
    }
    if (status.terminated) return;
    // One label per close: beforeunload and pagehide can BOTH fire (and the
    // registration may run twice — early arm + backstop). After the first
    // stamp the pending entry is committed; a second stamp would create a
    // duplicate row.
    if (experiment.__unloadStamped) return;
    const where = status.currentFunction ? `:${status.currentFunction}` : "";
    experiment.__unloadStamped = true;
    experiment.addData("experimentCompleteBool", false);
    experiment.addData(
      "unmetNeeds",
      `participant:tabClosed${where}${terminationProgressSuffix()}`,
    );
    experiment.addData("currentFunction", status.currentFunction ?? "");
    // ExperimentHandler.save() uploads only COMPLETED entries — commit, or
    // the label dies with the page.
    experiment.nextEntry?.();
  } catch (_) {
    /* never throw from an unload handler */
  }
};

/**
 * Register the unload-exit stampers once the PsychoJS experiment exists
 * (first scheduled task). beforeunload/pagehide run before PsychoJS's own
 * `unload` sync-save, so the stamped row is what reaches the server; the
 * explicit sync save covers browsers where `unload` does not fire.
 */
let unloadExitStampArmed = false;
export const registerUnloadExitStamp = () => {
  if (typeof window === "undefined") return;
  // Idempotent: armed once per page (early after psychoJS.start, with the
  // first scheduled task re-registering as a backstop).
  if (unloadExitStampArmed) return;
  unloadExitStampArmed = true;
  const stampAndSave = () => {
    stampUnloadExit();
    const experiment = psychoJS._experiment ?? psychoJS.experiment;
    if (!experiment || status.terminated || experiment.experimentEnded) return;
    try {
      experiment.save({ sync: true });
    } catch (_) {
      /* best effort */
    }
  };
  window.addEventListener("beforeunload", stampAndSave);
  window.addEventListener("pagehide", stampAndSave);
};

/**
 * Non-blocking "Saving your results…" indicator shown while the final
 * upload runs. The upload can retry for minutes (transient 5xx/network);
 * participants who stare at a blank screen bail at ~9–12 min (field data:
 * 2 NOCODE completions, 1 aborted-code completion) — the indicator keeps
 * them waiting. No button: the completion path auto-redirects.
 */
const SAVING_INDICATOR_ID = "threshold-saving-indicator";
const SAVING_INDICATOR_RETRY_ID = "threshold-saving-indicator-retry";
const showSavingIndicator = (language) => {
  try {
    let el = document.getElementById(SAVING_INDICATOR_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = SAVING_INDICATOR_ID;
      Object.assign(el.style, {
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: "100000",
        background: "#fff",
        color: "#000",
        padding: "1.5rem 2.5rem",
        borderRadius: "7px",
        boxShadow: "rgba(149, 157, 165, 0.2) 0 8px 24px",
        fontSize: "1.3rem",
        lineHeight: "1.4",
        // Size to the phrase's longest line so the big warning doesn't wrap;
        // centered to match the final screens' typography.
        width: "max-content",
        maxWidth: "92vw",
        textAlign: "center",
        pointerEvents: "none",
      });
      document.body.appendChild(el);
    }
    el.innerHTML = renderMarkdown(
      readi18nPhrases("T_doNotClose", language) ||
        "Saving your results, please wait…",
    );
    if (!document.getElementById(SAVING_INDICATOR_RETRY_ID)) {
      const retryEl = document.createElement("div");
      retryEl.id = SAVING_INDICATOR_RETRY_ID;
      Object.assign(retryEl.style, {
        fontSize: "0.85rem",
        opacity: "0.65",
        marginTop: "0.5rem",
      });
      el.appendChild(retryEl);
    }
    setRetryObserver((attempt) => {
      try {
        const retryEl = document.getElementById(SAVING_INDICATOR_RETRY_ID);
        // Neutral glyph + number: no new phrase needed in any language.
        if (retryEl) retryEl.textContent = "↻ " + attempt;
      } catch (_) {}
    });
  } catch (_) {
    /* indicator must never break the quit path */
  }
};
const hideSavingIndicator = () => {
  try {
    setRetryObserver(null);
    document.getElementById(SAVING_INDICATOR_ID)?.remove();
  } catch (_) {}
};

export async function quitPsychoJS(
  message = "",
  isCompleted,
  paramReader,
  showSafeToCloseDialog = true,
  showDebriefForm = true,
  unmetNeeds = "",
) {
  // Prevent duplicate calls -- only end and show the debrief screen once
  if (
    psychoJS._experiment.experimentEnded &&
    psychoJS._status === PsychoJS.Status.FINISHED
  )
    return;

  // Clean up any lingering error dialogs before showing debrief/close screens
  cancelActiveRsvpSpeechPreflight();
  if (hasActiveRsvpSpeechResources()) await closeActiveRsvpSpeechTrial();
  try {
    document
      .querySelectorAll(".ui-dialog, #msgDialog, #expDialog")
      .forEach((el) => el.remove());
    const root = document.getElementById("root");
    if (root) root.innerHTML = "";
  } catch (_) {}

  psychoJS.experiment.addData("experimentCompleteBool", isCompleted);
  // Termination audit: record where the participant was, and why the
  // experiment is ending, in the unmetNeeds column. These fields ride the
  // rescue flush below ("save orphaned data"), so they land in the final
  // row as one row — no extra flush, no trailing empty row displacing the
  // audit.
  psychoJS.experiment.addData("currentFunction", status.currentFunction ?? "");
  // How far the participant got, inside the reason cell itself (the column
  // Analyze displays) — answers "how much of the study was wasted" at a
  // glance, with no new column. Suffix only what exists (pre-consent
  // terminations have no block/trial yet).
  let unmetNeedsCell = unmetNeeds;
  if (unmetNeeds && !isCompleted)
    unmetNeedsCell = `${unmetNeeds}${terminationProgressSuffix()}`;
  if (unmetNeedsCell) psychoJS.experiment.addData("unmetNeeds", unmetNeedsCell);
  // Unload-exit guard: from here on the audit is in the pending row, so the
  // tab-close stamp must never add or overwrite anything (e.g. a close
  // during the debrief screen below).
  status.terminated = true;
  psychoJS.experiment.addData(
    "completionCodeIssued",
    completionCodeIssuedFor(isCompleted, unmetNeeds),
  );
  // Literal code string this session returns to Prolific with — the exact
  // value Prolific's export shows in its "Completion code" column — so
  // Analyze can translate codes (e.g. W6FUgZw) by direct string match,
  // no participant-ID join and no parallel Analyze change needed. Empty
  // when no code is issued.
  let completionCodeLiteral = "";
  if (isCompleted) {
    completionCodeLiteral = recruitmentServiceData.code || "";
    if (!completionCodeLiteral) {
      const m = /[?&]cc=([^&]+)/.exec(recruitmentServiceData.url || "");
      completionCodeLiteral = m ? decodeURIComponent(m[1]) : "";
    }
  } else if (DEVICE_INCOMPATIBLE_CODES.test(unmetNeeds || "")) {
    completionCodeLiteral = recruitmentServiceData.incompatibleCode || "";
  } else if (unmetNeeds) {
    completionCodeLiteral = recruitmentServiceData.abortedCode || "";
  }
  psychoJS.experiment.addData("completionCode", completionCodeLiteral);
  if (useMatlab.current) {
    closeMatlab();
    // psychoJS.experiment.saveCSV(eyeTrackingStimulusRecords);
  }

  removeClickableCharacterSet(showCharacterSetResponse);
  removeBeepButton();
  removeProceedButton();
  destroyExperimentProgressBar();

  // RC
  rc.endGaze();
  rc.endNudger();
  rc.endDistance();

  showCursor();

  if (psychoJS.experiment) {
    // Check for and save orphaned data
    if (psychoJS.experiment && psychoJS.experiment.isEntryEmpty()) {
      psychoJS.experiment.nextEntry();
    }

    psychoJS.window.close();
  }

  let timeBeforeDebriefDisplay = 0;
  if (showDebriefForm) {
    // debrief
    timeBeforeDebriefDisplay = clock.global
      ? clock.global.getTime()
      : undefined;
    let debriefFormShown = false;
    const debriefScreen = new Promise(async (resolve) => {
      const debriefForm = paramReader.read("_debriefForm")[0];
      if (debriefForm) {
        debriefFormShown = true;
        showForm(debriefForm);
        if (simulateActive) {
          publishPhaseEntered(SIM_PHASE.DEBRIEF);
          publishResponseAffordance({ validCharsTyped: "", active: false });
          publishClickAffordance({ clicked: false, validChars: [] });
        }
        // YES
        document.getElementById("form-yes").addEventListener("click", () => {
          hideForm();
          psychoJS.experiment.addData("debriefInitialResponse", "Yes");

          resolve();
        });
        // NO
        document
          .getElementById("form-no")
          .addEventListener("click", async () => {
            psychoJS.experiment.addData("debriefInitialResponse", "No");
            hideForm();

            // Show follow-up questions when user says "No"
            try {
              const followUpResponses = await showDebriefFollowUp(
                rc.language.value,
              );

              psychoJS.experiment.addData(
                "debriefFollowUpQuestions",
                followUpResponses.questions || "",
              );
              if (status.consentGiven)
                psychoJS.experiment.addData(
                  "debriefConsentAfterNo",
                  followUpResponses.consent,
                );
            } catch (error) {
              console.error("Error showing debrief follow-up:", error);
            }

            resolve();
          });
      } else {
        resolve();
      }
    });
    await debriefScreen;
    // Flush only when a debrief form was actually shown (its handlers
    // addData the responses); otherwise this would emit a bare {secs} row
    // after the audit row.
    if (debriefFormShown) psychoJS.experiment.nextEntry();
  }

  if (psychoJS.experiment && clock.global) {
    if (showDebriefForm) {
      psychoJS.experiment.addData(
        "debriefDurationSec",
        clock.global.getTime() - timeBeforeDebriefDisplay,
      );
    }

    psychoJS.experiment.addData(
      "durationOfExperimentSec",
      clock.global.getTime(),
    );
  }

  // QUIT FULLSCREEN
  if (rc.isFullscreen.value) {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }

  // save to local storage
  if (thisExperimentInfo.participant)
    localStorage.setItem(
      localStorageKey,
      JSON.stringify({
        ...thisExperimentInfo,
      }),
    );

  // quit() awaits the upload (retryable 5xx/network can take minutes) before
  // showing the finished screen, so data are safely on the server before any
  // redirect. The indicator is the ONLY wait message during that upload
  // (doNotCloseMessage:"" suppresses quit()'s own, which would double-render).
  showSavingIndicator(rc.language.value);
  try {
    if (recruitmentServiceData.name == "Prolific" && isCompleted) {
      let additionalMessage = ` Please go to Prolific to complete the experiment.`;
      const quitOptions = {
        message: message + additionalMessage,
        isCompleted: isCompleted,
        skipSave: false,
        okText: readi18nPhrases(
          "EE_OKToTakeCompletionCodeToProlific",
          rc.language.value,
        ),
        okUrl: recruitmentServiceData.url,
        showSafeToCloseDialog: showSafeToCloseDialog,
        safeTocloseMessage: renderMarkdown(
          readi18nPhrases(
            "EE_OKToTakeCompletionCodeToProlific",
            rc.language.value,
          ),
        ),
        doNotCloseMessage: "",
      };
      if (eyeTrackingStimulusRecords.length)
        quitOptions.additionalCSVData = eyeTrackingStimulusRecords;
      quitOptions.cursorTrackingData = cursorTracking.records;
      if (simulateActive)
        publishSummary({
          trialsCompleted: status.trial ?? 0,
        });
      // Data are only safe once quit() resolves (it awaits the save).
      // Redirect immediately after — a timer would leave a window in which
      // the participant closes the tab and reaches Prolific with no code.
      try {
        await psychoJS.quit(quitOptions);
      } catch (e) {
        console.warn("quitPsychoJS: quit failed", e);
      }
      if (
        !simulateActive &&
        typeof window !== "undefined" &&
        window.location &&
        recruitmentServiceData.url
      ) {
        try {
          window.location.href = recruitmentServiceData.url;
        } catch (e) {
          console.warn("quitPsychoJS: completion auto-redirect failed", e);
        }
      }
    } else {
      const quitOptions = {
        message: message,
        isCompleted: isCompleted,
        skipSave: false,
        okText: "OK",
        showSafeToCloseDialog: showSafeToCloseDialog,
        safeTocloseMessage: renderMarkdown(
          readi18nPhrases("T_safeToClose", rc.language.value),
        ),
        doNotCloseMessage: "",
      };
      if (eyeTrackingStimulusRecords.length)
        quitOptions.additionalCSVData = eyeTrackingStimulusRecords;
      quitOptions.cursorTrackingData = cursorTracking.records;
      if (psychoJS.window._windowAlreadyInFullScreen) existFullscreen();
      if (simulateActive)
        publishSummary({
          trialsCompleted: status.trial ?? 0,
        });
      try {
        await psychoJS.quit(quitOptions);
      } catch (e) {
        console.warn("quitPsychoJS: quit failed", e);
      }
      // Incomplete-but-explained terminations (voluntary quits, crashes, …)
      // return the participant to Prolific with the study's
      // aborted-completion code, so Prolific classifies the session as
      // Returned instead of demanding a manual review. Device-incompatible
      // classes redirect at their call sites with the incompatible code.
      // Same-tab navigation (the established pattern): window.open is
      // silently blocked without a user gesture, losing the code. quit()
      // awaits the save, so navigation cancels nothing.
      if (
        !simulateActive &&
        recruitmentServiceData.name === "Prolific" &&
        recruitmentServiceData.abortedCode &&
        unmetNeeds &&
        completionCodeIssuedFor(isCompleted, unmetNeeds) === "aborted" &&
        typeof window !== "undefined" &&
        window.location
      ) {
        try {
          window.location.href =
            "https://app.prolific.com/submissions/complete?cc=" +
            recruitmentServiceData.abortedCode;
        } catch (e) {
          console.warn("quitPsychoJS: aborted-code redirect failed", e);
        }
      }
      // logPsychoJSQuit(
      //   "_afterQuitFunction",
      //   window.location.toString(),
      //   rc.id.value
      // );

      // if (
      //   microphoneCalibrationResults.length > 0 &&
      //   calibrateSoundSaveJSONBool.current
      // ) {
      //   for (let i = 0; i < microphoneCalibrationResults.length; i++) {
      //     console.log(i);
      //     psychoJS.experiment.downloadJSON(
      //       microphoneCalibrationResults[i],
      //       i + 1
      //     );
      //   }
      // }
    }
  } finally {
    hideSavingIndicator();
  }

  if (simulateActive) setEEState({ schedulerEvent: "QUIT" });
  return Scheduler.Event.QUIT;
}

export function existFullscreen() {
  if (
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.mozFullScreenEnabled ||
    document.msFullscreenEnabled
  ) {
    if (typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch((error) => {
        console.error(error);
        console.error("Unable to close fullscreen.");
      });
    } else if (typeof document.mozCancelFullScreen === "function") {
      document.mozCancelFullScreen();
    } else if (typeof document.webkitExitFullscreen === "function") {
      document.webkitExitFullscreen();
    } else if (typeof document.msExitFullscreen === "function") {
      document.msExitFullscreen();
    } else {
      console.error("Unable to close fullscreen.");
    }
  }
}

export const getPavloviaProjectName = (nameFromTable) => {
  if (
    psychoJS.getEnvironment() === ExperimentHandler.Environment.SERVER &&
    psychoJS._config &&
    psychoJS._config.experiment
  )
    return psychoJS._config.experiment.name;
  else return nameFromTable ? nameFromTable : "unknown";
};
