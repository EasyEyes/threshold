import { skipTrialOrBlock, status, thisExperimentInfo, rc } from "./global";
import { loggerText } from "./utils";
import { paramReader } from "../parameters/paramReader.ts";
import { readi18nPhrases } from "./readPhrases";

/**
 * Isolate trial skipping behavior, so that it can be used in the modal enviroment
 * as well as on the trialInstruction routine for the responseSkipTrialButtonBool
 * button.
 */
export const skipTrial = () => {
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
  if (frameN === 0 || typeof timeWhenTimeout === "undefined") {
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

export const createSkipBlockKeyHandler = () => {
  return (event) => {
    const modifierPressed = event.metaKey || event.ctrlKey;
    if (event.code === "ArrowRight" && event.shiftKey && modifierPressed) {
      let skipMode;
      if (status.block_condition) {
        skipMode = paramReader.read(
          "responseSkipBlockForWhom",
          status.block_condition,
        );
      } else if (status.block) {
        skipMode = paramReader.read(
          "responseSkipBlockForWhom",
          status.block,
        )[0];
      } else {
        skipMode = "noone";
      }
      if (skipMode === "noone" || thisExperimentInfo.ProlificSessionID) {
        return;
      }
      skipBlock();
    }
  };
};

// Refactor the existing function to use the extracted logic
export function handleResponseSkipBlockForWhom() {
  const handleSkipBlock = createSkipBlockKeyHandler();

  document.addEventListener("skip-block", skipBlock); // For handling skip-block signal from the keypad
  document.addEventListener("keydown", handleSkipBlock);
  return () => document.removeEventListener("keydown", handleSkipBlock);
}

const skipBlock = () => {
  skipTrialOrBlock.skipBlock = true;
  skipTrialOrBlock.blockId = status.block;
};
