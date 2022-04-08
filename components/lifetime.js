import { Scheduler } from "../psychojs/src/util/index.js";

import { hideForm, showForm } from "./forms";
import { rc, showCharacterSetResponse } from "./global";
import { clock, psychoJS } from "./globalPsychoJS";
import { removeBeepButton, removeProceedButton } from "./instructions.js";
import { recruitmentServiceData } from "./recruitmentService";
import { removeClickableCharacterSet } from "./showCharacterSet";
import { showCursor } from "./utils";

export async function quitPsychoJS(message, isCompleted, paramReader) {
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

  if (recruitmentServiceData.name == "Prolific" && isCompleted) {
    let additionalMessage = ` Please visit <a target="_blank" href="${recruitmentServiceData.url}">HERE</a> to complete the experiment.`;
    psychoJS.quit({
      message: message + additionalMessage,
      isCompleted: isCompleted,
    });
  } else {
    psychoJS.quit({ message: message, isCompleted: isCompleted });
  }

  return Scheduler.Event.QUIT;
}
