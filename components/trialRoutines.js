// import { debug, getTripletCharacters } from "./utils.js";
// import { getTrialInfoStr } from "./trialCounter.js";
// import { instructionsText } from "./instructions.js";
// import { hideCursor, XYPixOfXYDeg } from "./utils.js";
// import { cleanFontName } from "./fonts.js";
// import { getCharacterSetBoundingBox, restrictLevel } from "./bounding.js";
// import { SimulatedObserver } from "./simulatedObserver.js";
import {
  tolerances,
  displayOptions,
  clickedContinue,
  letterConfig,
  targetKind,
} from "./global.js";
import { psychoJS } from "./globalPsychoJS";

export const _identify_trialInstructionRoutineEnd = (
  instructions,
  _takeFixationClick,
  fixation
) => {
  document.removeEventListener("click", _takeFixationClick);
  document.removeEventListener("touchend", _takeFixationClick);
  instructions.setAutoDraw(false);
  fixation.setAutoDraw(false);
};

export const _letter_trialRoutineEachFrame = (
  paramReader,
  thresholdParameter
) => {
  if (paramReader.read("calibrateTrackGazeBool", status.block_condition))
    measureGazeError(
      tolerances,
      displayOptions,
      clickedContinue.timestamps[clickedContinue.timestamps.length - 1],
      letterConfig.targetDurationSec
    );
  /* SAVE INFO ABOUT STIMULUS AS PRESENTED */
  psychoJS.experiment.addData(
    "targetBoundingBox",
    prettyPrintPsychojsBoundingBox(target.getBoundingBox(true))
  );
  if (
    letterConfig.spacingRelationToSize === "ratio" &&
    thresholdParameter === "spacing" &&
    targetKind.current === "letter"
  ) {
    psychoJS.experiment.addData(
      "flanker1BoundingBox",
      prettyPrintPsychojsBoundingBox(flanker1.getBoundingBox(true))
    );
    psychoJS.experiment.addData(
      "flanker2BoundingBox",
      prettyPrintPsychojsBoundingBox(flanker2.getBoundingBox(true))
    );
  }
  /* /SAVE INFO ABOUT STIMULUS AS PRESENTED */

  // ? Should allow for reading?
  if (timing.clickToStimulusOnsetSec)
    if (showConditionNameConfig.showTargetSpecs) {
      showConditionNameConfig.targetSpecs += `\nclickToStimulusOnsetSec: ${
        Math.round(timing.clickToStimulusOnsetSec * 100000.0) / 100000
      } [${isTimingOK(timing.clickToStimulusOnsetSec, 0.1)}]`;
      targetSpecs.setText(showConditionNameConfig.targetSpecs);
      showConditionName(conditionName, targetSpecs);
    }
};
