import { ExperimentHandler } from "../psychojs/src/data/ExperimentHandler.js";
import { Scheduler } from "../psychojs/src/util/index.js";
import { isProlificExperiment } from "./externalServices.js";

import { hideForm, showForm } from "./forms";
import {
  eyeTrackingStimulusRecords,
  localStorageKey,
  rc,
  showCharacterSetResponse,
  thisExperimentInfo,
  microphoneCalibrationResults,
  calibrateSoundSaveJSONBool,
  cursorTracking,
} from "./global";
import { clock, psychoJS } from "./globalPsychoJS";
import { removeBeepButton, removeProceedButton } from "./instructions.js";
import { destroyProgressBar } from "./progressBar.js";
import { recruitmentServiceData } from "./recruitmentService";
import { downloadTextFile } from "./saveFile.js";
import { removeClickableCharacterSet } from "./showCharacterSet";
import { showCursor, sleep } from "./utils";
import { useMatlab, closeMatlab } from "./connectMatlab";

export async function quitPsychoJS(
  message = "",
  isCompleted,
  paramReader,
  showSafeToCloseDialog = true,
  showDebriefForm = true,
) {
  psychoJS.experiment.addData("experimentCompleteBool", isCompleted);
  if (useMatlab.current) {
    closeMatlab();
    // psychoJS.experiment.saveCSV(eyeTrackingStimulusRecords);
  }

  removeClickableCharacterSet(showCharacterSetResponse);
  removeBeepButton();
  removeProceedButton();
  destroyProgressBar();

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

  if (showDebriefForm) {
    // debrief
    const timeBeforeDebriefDisplay = clock.global
      ? clock.global.getTime()
      : undefined;
    const debriefScreen = new Promise((resolve) => {
      if (paramReader.read("_debriefForm")[0]) {
        showForm(paramReader.read("_debriefForm")[0]);
        document.getElementById("form-yes").addEventListener("click", () => {
          hideForm();
          resolve();
        });

        document.getElementById("form-no").addEventListener("click", () => {
          hideForm();
          resolve();
        });
      } else {
        resolve();
      }
    });
    await debriefScreen;
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

  // save user id
  sleep(250);
  if (
    paramReader.read("_participantIDPutBool")[0] &&
    thisExperimentInfo.EasyEyesID
  ) {
    // ! NOTICE
    // ! after changing the file format
    // ! make sure you also update crossSession.js to update how to parse it
    downloadTextFile(
      `EasyEyes_${thisExperimentInfo.session}_${thisExperimentInfo.EasyEyesID}.txt`,
      `Please keep this file to facilitate participation in future sessions. When an experiment has several sessions, you can use this file to connect them, while retaining your anonymity.

EasyEyesID              ${thisExperimentInfo.EasyEyesID}
EasyEyesSession         ${thisExperimentInfo.session}
participant             ${thisExperimentInfo.participant}

file                    ${thisExperimentInfo.experimentFilename
        .split("/")
        .pop()}
date                    ${thisExperimentInfo.date.toString()}` +
        (isProlificExperiment()
          ? `

ProlificParticipantID   ${thisExperimentInfo.ProlificParticipantID}
ProlificSession         ${thisExperimentInfo.ProlificSessionID}
ProlificStudyID         ${thisExperimentInfo.ProlificStudyID}`
          : ""),
    );
  }
  // save to local storage
  if (thisExperimentInfo.participant)
    localStorage.setItem(
      localStorageKey,
      JSON.stringify({
        ...thisExperimentInfo,
      }),
    );

  if (recruitmentServiceData.name == "Prolific" && isCompleted) {
    let additionalMessage = ` Please go to Prolific to complete the experiment.`;
    // logPsychoJSQuit(
    //   "_beforeQuitFunction",
    //   window.location.toString(),
    //   rc.id.value
    // );
    const quitOptions = {
      message: message + additionalMessage,
      isCompleted: isCompleted,
      okText: "Go to Prolific to complete the experiment",
      okUrl: recruitmentServiceData.url,
      showSafeToCloseDialog: showSafeToCloseDialog,
    };
    if (eyeTrackingStimulusRecords.length)
      quitOptions.additionalCSVData = eyeTrackingStimulusRecords;
    quitOptions.cursorTrackingData = cursorTracking.records;
    psychoJS.quit(quitOptions);
    // logPsychoJSQuit(
    //   "_afterQuitFunction",
    //   window.location.toString(),
    //   rc.id.value
    // );
  } else {
    // logPsychoJSQuit(
    //   "_beforeQuitFunction",
    //   window.location.toString(),
    //   rc.id.value
    // );
    const quitOptions = {
      message: message,
      isCompleted: isCompleted,
      okText: "OK",
      showSafeToCloseDialog: showSafeToCloseDialog,
    };
    if (eyeTrackingStimulusRecords.length)
      quitOptions.additionalCSVData = eyeTrackingStimulusRecords;
    quitOptions.cursorTrackingData = cursorTracking.records;
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

export const getPavloviaProjectName = (nameFromTable) => {
  if (
    psychoJS.getEnvironment() === ExperimentHandler.Environment.SERVER &&
    psychoJS._config &&
    psychoJS._config.experiment
  )
    return psychoJS._config.experiment.name;
  else return nameFromTable ? nameFromTable : "unknown";
};
