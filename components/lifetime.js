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
} from "./global";
import { clock, psychoJS } from "./globalPsychoJS";
import { removeBeepButton, removeProceedButton } from "./instructions.js";
import { destroyExperimentProgressBar } from "./progressBar.js";
import { recruitmentServiceData } from "./recruitmentService";
import { removeClickableCharacterSet } from "./showCharacterSet";
import { showCursor, sleep } from "./utils";
import { useMatlab, closeMatlab } from "./connectMatlab";
import { readi18nPhrases } from "./readPhrases.js";
import { PsychoJS } from "../psychojs/src/core/index.js";

export async function quitPsychoJS(
  message = "",
  isCompleted,
  paramReader,
  showSafeToCloseDialog = true,
  showDebriefForm = true,
) {
  // Prevent duplicate calls -- only end and show the debrief screen once
  if (
    psychoJS._experiment.experimentEnded &&
    psychoJS._status === PsychoJS.Status.FINISHED
  )
    return;

  psychoJS.experiment.addData("experimentCompleteBool", isCompleted);
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
    const debriefScreen = new Promise(async (resolve) => {
      if (paramReader.read("_debriefForm")[0]) {
        showForm(paramReader.read("_debriefForm")[0]);
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
    psychoJS.experiment.nextEntry();
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

  // Show wait dialog, save externally, then quit with skipSave so the
  // finished screen appears only after data are safely on the server.
  psychoJS.gui.dialog({
    warning: "Saving your results, please wait…",
    showOK: false,
  });
  try {
    await psychoJS.experiment.save();
  } catch (e) {
    console.error(
      "quitPsychoJS: experiment.save() failed, proceeding to quit",
      e,
    );
  }
  psychoJS.gui.closeDialog();

  if (recruitmentServiceData.name == "Prolific" && isCompleted) {
    let additionalMessage = ` Please go to Prolific to complete the experiment.`;
    const quitOptions = {
      message: message + additionalMessage,
      isCompleted: isCompleted,
      skipSave: true,
      okText: readi18nPhrases(
        "EE_OKToTakeCompletionCodeToProlific",
        rc.language.value,
      ),
      okUrl: recruitmentServiceData.url,
      showSafeToCloseDialog: showSafeToCloseDialog,
      safeTocloseMessage: readi18nPhrases(
        "EE_OKToTakeCompletionCodeToProlific",
        rc.language.value,
      ),
      doNotCloseMessage: readi18nPhrases("T_doNotClose", rc.language.value),
    };
    if (eyeTrackingStimulusRecords.length)
      quitOptions.additionalCSVData = eyeTrackingStimulusRecords;
    quitOptions.cursorTrackingData = cursorTracking.records;
    psychoJS.quit(quitOptions);
  } else {
    const quitOptions = {
      message: message,
      isCompleted: isCompleted,
      skipSave: true,
      okText: "OK",
      showSafeToCloseDialog: showSafeToCloseDialog,
      safeTocloseMessage: readi18nPhrases("T_safeToClose", rc.language.value),
      doNotCloseMessage: readi18nPhrases("T_doNotClose", rc.language.value),
    };
    if (eyeTrackingStimulusRecords.length)
      quitOptions.additionalCSVData = eyeTrackingStimulusRecords;
    quitOptions.cursorTrackingData = cursorTracking.records;
    if (psychoJS.window._windowAlreadyInFullScreen) existFullscreen();
    psychoJS.quit(quitOptions);
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
