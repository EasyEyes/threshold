import {
  modalButtonTriggeredViaKeyboard,
  skipTrialOrBlock,
  status,
} from "./global";
import { loggerText, showCursor } from "./utils";
import {
  isPavloviaExperiment,
  isProlificPreviewExperiment,
} from "./externalServices";
import { paramReader } from "../threshold";
import { readi18nPhrases } from "./readPhrases";
import { rc } from "./global";

export async function handleEscapeKey() {
  // check if esc handling enabled for this condition, if not, quit
  if (
    !(
      status.condition.responseEscapeOptionsBool &&
      status.condition.responseEscapeOptionsBool.toString().toLowerCase() ===
        "true"
    )
  ) {
    showCursor();
    return {
      skipTrial: false,
      skipBlock: false,
      quitSurvey: true,
    };
  }

  function logKey(e) {
    switch (e.code) {
      case "Escape":
        modalButtonTriggeredViaKeyboard.current = true;
        document.getElementById("quit-btn").click();
        break;
      case "Enter":
        modalButtonTriggeredViaKeyboard.current = true;
        document.getElementById("skip-block-btn").click();
        break;
      case "Space":
        modalButtonTriggeredViaKeyboard.current = true;
        document.getElementById("skip-trial-btn").click();
        break;
    }
  }

  document.addEventListener("keydown", logKey);
  document.getElementById("skip-trial-btn").disabled = false;
  document.getElementById("skip-block-btn").disabled = false;
  document.getElementById("quit-btn").disabled = false;
  if (!(isProlificPreviewExperiment() || isPavloviaExperiment())) {
    // hide skipBlock Btn
    document.getElementById("skip-block-btn").style.visibility = "hidden";
    document.getElementById("skip-block-btn").disabled = true;
    document.getElementById("skip-block-div").style.visibility = "hidden";
  }
  let action = {
    skipTrial: false,
    skipBlock: false,
    quitSurvey: false,
  };
  const escapeKeyHandling = new Promise((resolve) => {
    // ! Maybe switch to import?
    // eslint-disable-next-line no-undef
    let dialog = new bootstrap.Modal(document.getElementById("exampleModal"), {
      backdrop: "static",
      keyboard: false,
    });
    document.getElementById("quit-btn").addEventListener("click", (event) => {
      event.preventDefault();
      action.quitSurvey = true;
      dialog.hide();
      resolve();
    });
    document
      .getElementById("skip-trial-btn")
      .addEventListener("click", (event) => {
        event.preventDefault();
        skipTrial();
        action.skipTrial = true;
        dialog.hide();
        resolve();
      });
    document
      .getElementById("skip-block-btn")
      .addEventListener("click", (event) => {
        loggerText("--- SKIP BLOCK ---");
        event.preventDefault();
        skipTrialOrBlock.skipBlock = true;
        skipTrialOrBlock.blockId = status.block;
        action.skipBlock = true;
        dialog.hide();
        loggerText("--- SKIP BLOCK ENDS ---");
        resolve();
      });
    dialog.show();
  });
  await escapeKeyHandling;
  document.getElementById("skip-trial-btn").disabled = true;
  document.getElementById("quit-btn").disabled = true;
  document.getElementById("skip-block-btn").disabled = true;
  // adding following lines to remove listeners
  // TODO Bad code
  document.getElementById("skip-trial-btn").outerHTML =
    document.getElementById("skip-trial-btn").outerHTML;
  document.getElementById("skip-block-btn").outerHTML =
    document.getElementById("skip-block-btn").outerHTML;
  document.getElementById("quit-btn").outerHTML =
    document.getElementById("quit-btn").outerHTML;

  document.removeEventListener("keydown", logKey);
  return action;
}

/**
 * Isolate trial skipping behavior, so that it can be used in the modal enviroment
 * as well as on the trialInstruction routine for the responseSkipTrialButtonBool
 * button.
 */
const skipTrial = () => {
  loggerText("--- SKIP TRIAL ---");
  skipTrialOrBlock.skipTrial = true;
  skipTrialOrBlock.trialId = status.trial;
  skipTrialOrBlock.blockId = status.block;
  loggerText("--- SKIP TRIAL ENDS ---");
};

var timeWhenTimeout;
/**
 * After the time specified by responseTimeoutSec, skip the current trial
 * @param {number} frameN Integer, frames since the start of the trial
 * @param {number} t Time (sec) since the start of the trial
 */
export const handleResponseTimeoutSec = (frameN, t) => {
  // Set timeWhenTimeout on first frame
  if (frameN === 0) {
    const responseTimeoutSec = paramReader.read(
      "responseTimeoutSec",
      status.block_condition,
    );
    timeWhenTimeout = t + responseTimeoutSec;
  }
  if (timeWhenTimeout && t > timeWhenTimeout) {
    skipTrial();
    timeWhenTimeout = undefined;
  }
};

/**
 * Create button, for fixation screen, as controlled by responseSkipButtonBool.
 */
export const addSkipTrialButton = () => {
  const responseSkipTrialButtonBool = paramReader.read(
    "responseSkipTrialButtonBool",
    status.block_condition,
  );
  if (
    responseSkipTrialButtonBool &&
    !document.getElementById("skipTrialButton")
  ) {
    const button = document.createElement("button");
    button.id = "skipTrialButton";
    button.className =
      "btn btn-outline-secondary threshold-button threshold-beep-button";
    const label = readi18nPhrases("T_skipTrial", rc.language.value);
    button.innerText = label;
    button.addEventListener("click", skipTrial);
    document.body.appendChild(button);
  }
};
/**
 * Remove responseSkipButtonBool button.
 */
export const removeSkipTrialButton = () => {
  document.getElementById("skipTrialButton")?.remove();
};
