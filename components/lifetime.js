import { ExperimentHandler } from "../psychojs/src/data/ExperimentHandler.js";
import { Scheduler } from "../psychojs/src/util/index.js";
import { isProlificExperiment } from "./externalServices.ts";
import Swal from "sweetalert2";

import { hideForm, showForm, showDebriefFollowUp } from "./forms";
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
import { stopPartialSaveScheduler } from "./partialSaveScheduler.ts";
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
 * Which Prolific completion code this session returns with — written to
 * the final row as `completionCodeEnglish` (English Completion Code:
 * "completed" | "deviceIncompatible" | "aborted" | "") alongside its
 * literal `completionCodeRandom` (Random Completion Code, e.g. W6FUgZw),
 * so Analyze can translate the raw code Prolific shows back to English by
 * direct string match. Every return to Prolific carries a code: completions
 * carry the study's completion code; device/compatibility failures carry
 * the incompatible-completion code; every other incomplete termination
 * carries the aborted-completion code — so Prolific classifies incompletes
 * as Returned instead of demanding a manual review.
 * @param {boolean} isCompleted
 * @param {string} reason termination reason (label and/or unmet needs)
 * @returns {"completed"|"deviceIncompatible"|"aborted"|""}
 */
const DEVICE_INCOMPATIBLE_CODES =
  /^(rc:|compatibilityNotMet|emailVerificationCancelled|emailVerificationFailed|calibrationObjectUnavailable)/;

export const completionCodeEnglishFor = (isCompleted, reason) => {
  if (isCompleted) return "completed";
  if (!reason) return "";
  if (DEVICE_INCOMPATIBLE_CODES.test(reason)) return "deviceIncompatible";
  return "aborted";
};

/**
 * Route a termination reason to its results-CSV columns: `unmetNeeds` holds
 * ONLY true unmet needs — underscore glossary parameters (e.g.
 * _needMemoryGB, _screenColorSpace) that Shiny links to their glossary
 * entries — while every termination LABEL (fullscreenExit,
 * participant:tabClosed:…, rc:…, _crash:…, and the one-word legacy codes)
 * goes to the `error` column, which Shiny links to the EasyEyes Error
 * Table. `_crash` is the one underscore-prefixed label (a crash, not a
 * need). Comma-splitting is paren-aware: rc detail suffixes carry commas.
 * @param {string} reason
 * @returns {{unmetNeeds: string, error: string}}
 */
export const splitTerminationColumns = (reason) => {
  if (!reason) return { unmetNeeds: "", error: "" };
  const tokens = [];
  let cur = "";
  let depth = 0;
  for (const ch of reason) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      tokens.push(cur);
      cur = "";
    } else cur += ch;
  }
  tokens.push(cur);
  const needs = [];
  const errors = [];
  for (const token of tokens.map((t) => t.trim()).filter(Boolean)) {
    if (token.startsWith("_") && !token.startsWith("_crash")) needs.push(token);
    else errors.push(token);
  }
  return { unmetNeeds: needs.join(","), error: errors.join(",") };
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
      ("unmetNeeds" in experiment._currentTrialData ||
        "error" in experiment._currentTrialData)
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
      "error",
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
 * upload runs. Slow uploads can take minutes, so the indicator keeps
 * participants informed while the single foreground request is pending.
 * No button: the completion path auto-redirects.
 */
const SAVING_INDICATOR_ID = "threshold-saving-indicator";
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
  } catch (_) {
    /* indicator must never break the quit path */
  }
};
const hideSavingIndicator = () => {
  try {
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
  { deviceIncompatible = false } = {},
) {
  // Halt the periodic partial saves first: from here on the final save
  // below must be the last upload, so a late periodic snapshot can never
  // overwrite it with staler rows. Awaited: an in-flight upload settles
  // before the final one starts.
  await stopPartialSaveScheduler();
  // Re-entry guard: once the termination audit is written the first reason
  // and completion code are final. A second call (a Quit clicked in an
  // overlay that survived a slow final upload, a late RC onQuit, …) must
  // not overwrite them (field bug: deviceIncompatible → fullscreenExit/
  // aborted). Keep scheduler semantics for `return quitPsychoJS(...)`
  // callers.
  if (status.terminated) {
    // Make the swallowed quit visible, but only where it cannot create a
    // row after the final one: while the first audit is still pending, the
    // warning rides that row; once flushed, console only.
    try {
      const experiment = psychoJS._experiment ?? psychoJS.experiment;
      const pending = experiment?._currentTrialData;
      if (pending && ("error" in pending || "unmetNeeds" in pending)) {
        const prior =
          typeof pending.warning === "string" ? pending.warning + "\n" : "";
        experiment.addData(
          "warning",
          `${prior}quitPsychoJS re-entry after termination ignored; later reason: ${
            unmetNeeds || "(none)"
          }`,
        );
      }
    } catch (_) {
      /* telemetry must never break the guard */
    }
    console.warn(
      `quitPsychoJS: already terminated; ignoring later quit reason: ${
        unmetNeeds || "(none)"
      }`,
    );
    return Scheduler.Event.QUIT;
  }
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
  // experiment is ending. These fields ride the rescue flush below ("save
  // orphaned data"), so they land in the final row as one row — no extra
  // flush, no trailing empty row displacing the audit. The reason splits
  // across two columns (splitTerminationColumns): labels (Shiny → EasyEyes
  // Error Table) go to `error`, true needs (Shiny → glossary) stay in
  // `unmetNeeds`.
  psychoJS.experiment.addData("currentFunction", status.currentFunction ?? "");
  // How far the participant got, inside the label cell itself — answers
  // "how much of the study was wasted" at a glance. Suffix only what exists
  // (pre-consent terminations have no block/trial yet).
  const { unmetNeeds: needsCell, error: labelCell } =
    splitTerminationColumns(unmetNeeds);
  if (needsCell) psychoJS.experiment.addData("unmetNeeds", needsCell);
  if (labelCell) {
    const suffixed = isCompleted
      ? labelCell
      : `${labelCell}${terminationProgressSuffix()}`;
    psychoJS.experiment.addData("error", suffixed);
  }
  // Unload-exit guard: from here on the audit is in the pending row, so the
  // tab-close stamp must never add or overwrite anything (e.g. a close
  // during the debrief screen below).
  status.terminated = true;
  // The compatibility flow may supply a specific requirement (e.g. _needCamera).
  // Keep that reason in the results while choosing the incompatible code and
  // suppressing the aborted redirect for this explicit compatibility exit.
  const completionCodeEnglish =
    !isCompleted && deviceIncompatible
      ? "deviceIncompatible"
      : completionCodeEnglishFor(isCompleted, unmetNeeds);
  psychoJS.experiment.addData("completionCodeEnglish", completionCodeEnglish);
  // Random Completion Code — the literal string this session returns to
  // Prolific with, exactly what Prolific's export shows in its "Completion
  // code" column — so Analyze can translate codes (e.g. W6FUgZw) by direct
  // string match, no participant-ID join and no parallel Analyze change
  // needed. Empty when no code is issued.
  let completionCodeLiteral = "";
  if (isCompleted) {
    completionCodeLiteral = recruitmentServiceData.code || "";
    if (!completionCodeLiteral) {
      const m = /[?&]cc=([^&]+)/.exec(recruitmentServiceData.url || "");
      completionCodeLiteral = m ? decodeURIComponent(m[1]) : "";
    }
  } else if (completionCodeEnglish === "deviceIncompatible") {
    completionCodeLiteral = recruitmentServiceData.incompatibleCode || "";
  } else if (completionCodeEnglish === "aborted") {
    completionCodeLiteral = recruitmentServiceData.abortedCode || "";
  }
  psychoJS.experiment.addData("completionCodeRandom", completionCodeLiteral);
  if (useMatlab.current) {
    closeMatlab();
    // psychoJS.experiment.saveCSV(eyeTrackingStimulusRecords);
  }

  removeClickableCharacterSet(showCharacterSetResponse);
  removeBeepButton();
  removeProceedButton();
  destroyExperimentProgressBar();

  // RC teardown. A RemoteCalibrator bug must never abort the quit path:
  // debrief, the final save, and the Prolific redirect all come after this
  // (field case: stopVideo threw on a null camera stream during endGaze,
  // stranding participants on the ending screen with no code).
  const rcCleanup = (method) => {
    try {
      rc[method]();
    } catch (e) {
      console.warn(`quitPsychoJS: rc.${method} failed`, e);
    }
  };
  rcCleanup("endGaze");
  rcCleanup("endNudger");
  rcCleanup("endDistance");

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

  // quit() awaits the single foreground upload before
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
      await psychoJS.quit(quitOptions);
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
      await psychoJS.quit(quitOptions);
      // Incomplete-but-explained terminations (voluntary quits, crashes, …)
      // return the participant to Prolific with the study's
      // aborted-completion code. Prolific applies that code's configured action;
      // a return request still requires the participant to confirm the return.
      // Device-incompatible exits leave navigation to their caller's ending UI.
      // Same-tab navigation (the established pattern): window.open is
      // silently blocked without a user gesture, losing the code. quit()
      // awaits the save, so navigation cancels nothing.
      if (
        !simulateActive &&
        recruitmentServiceData.name === "Prolific" &&
        recruitmentServiceData.abortedCode &&
        unmetNeeds &&
        completionCodeEnglish === "aborted" &&
        typeof window !== "undefined" &&
        window.location
      ) {
        const returnCode =
          completionCodeEnglish === "deviceIncompatible"
            ? recruitmentServiceData.incompatibleCode
            : completionCodeEnglish === "aborted"
            ? recruitmentServiceData.abortedCode
            : "";
        if (returnCode) {
          try {
            window.location.href =
              "https://app.prolific.com/submissions/complete?cc=" + returnCode;
          } catch (e) {
            console.warn(
              `quitPsychoJS: ${completionCodeEnglish}-code redirect failed`,
              e,
            );
          }
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
