import { ExperimentHandler } from "../psychojs/src/data/ExperimentHandler.js";
import { Scheduler } from "../psychojs/src/util/index.js";
import { isProlificExperiment } from "./externalServices.js";

import { hideForm, showForm } from "./forms";
import {
  localStorageKey,
  rc,
  showCharacterSetResponse,
  thisExperimentInfo,
} from "./global";
import { clock, psychoJS } from "./globalPsychoJS";
import { removeBeepButton, removeProceedButton } from "./instructions.js";
import { recruitmentServiceData } from "./recruitmentService";
import { downloadTextFile } from "./saveFile.js";
import { removeClickableCharacterSet } from "./showCharacterSet";
import { showCursor, sleep } from "./utils";

export async function quitPsychoJS(message = "", isCompleted, paramReader) {
  removeClickableCharacterSet(showCharacterSetResponse);
  removeBeepButton();
  removeProceedButton();

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

  if (psychoJS.experiment && clock.global) {
    psychoJS.experiment.addData(
      "debriefDurationSec",
      clock.global.getTime() - timeBeforeDebriefDisplay
    );
    psychoJS.experiment.addData(
      "durationOfExperimentSec",
      clock.global.getTime()
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

file                    ${thisExperimentInfo.experimentFileName
        .split("/")
        .pop()}
date                    ${thisExperimentInfo.date.toString()}` +
        (isProlificExperiment()
          ? `

ProlificParticipantID   ${thisExperimentInfo.ProlificParticipantID}
ProlificSession         ${thisExperimentInfo.ProlificSessionID}
ProlificStudyID         ${thisExperimentInfo.ProlificStudyID}`
          : "")
    );
  }
  // save to local storage
  if (thisExperimentInfo.participant)
    localStorage.setItem(
      localStorageKey,
      JSON.stringify({
        ...thisExperimentInfo,
      })
    );

  if (recruitmentServiceData.name == "Prolific" && isCompleted) {
    let additionalMessage = ` Please go to Prolific to complete the experiment.`;
    // logPsychoJSQuit(
    //   "_beforeQuitFunction",
    //   window.location.toString(),
    //   rc.id.value
    // );
    psychoJS.quit({
      message: message + additionalMessage,
      isCompleted: isCompleted,
      okText: "Go to Prolific to complete the experiment",
      okUrl: recruitmentServiceData.url,
    });
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
    psychoJS.quit({ message: message, isCompleted: isCompleted, okText: "OK" });
    // logPsychoJSQuit(
    //   "_afterQuitFunction",
    //   window.location.toString(),
    //   rc.id.value
    // );
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
