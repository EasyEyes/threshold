// import { debug, getTripletCharacters } from "./utils.js";
// import { getTrialInfoStr } from "./trialCounter.js";
// import { instructionsText } from "./instructions.js";
// import { hideCursor, XYPixOfXYDeg } from "./utils.js";
// import { cleanFontName } from "./fonts.js";
// import { getCharacterSetBoundingBox, restrictLevel } from "./bounding.js";
// import { SimulatedObserver } from "./simulatedObserver.js";
import {
  font,
  fontCharacterSet,
  rc,
  usingGaze,
  tolerances,
  displayOptions,
  clickedContinue,
  letterConfig,
  repeatedLettersConfig,
  repeatedLettersResponse,
  targetKind,
  status,
  timing,
  letterTiming,
  showConditionNameConfig,
  showCharacterSetResponse,
} from "./global.js";
import {
  measureGazeError,
  calculateError,
  addResponseIfTolerableError,
} from "./errorMeasurement.js";
import {
  logger,
  showCursor,
  addTrialStaircaseSummariesToData,
} from "./utils.js";
import { isTimingOK, showConditionName } from "./showTrialInformation.js";
import { setupClickableCharacterSet } from "./showCharacterSet";
import { prettyPrintPsychojsBoundingBox } from "./boundingBoxes.js";
import { psychoJS } from "./globalPsychoJS";

import * as core from "../psychojs/src/core/index.js";
import { MultiStairHandler } from "../psychojs/src/data/MultiStairHandler.js";
const { PsychoJS } = core;

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

export const _letter_trialRoutineEnd = (
  target,
  currentLoop,
  simulated,
  responseCorrect,
  level,
  respondedEarly
) => {
  // letterTiming.targetFinishSec and letterTiming.targetStartSec are undefined for simulated observer
  if (
    !(
      simulated &&
      simulated[status.block] &&
      simulated[status.block][status.block_condition]
    )
  ) {
    calculateError(
      letterTiming,
      tolerances,
      letterConfig.targetDurationSec,
      target,
      letterConfig.delayBeforeStimOnsetSec
    );
  }

  // // Add trial timing data
  // psychoJS.experiment.addData(
  //   "trialFirstFrameSec",
  //   letterTiming.trialFirstFrameSec
  // );
  // psychoJS.experiment.addData(
  //   "targetStartSec",
  //   letterTiming.targetStartSec
  // );
  // psychoJS.experiment.addData(
  //   "targetFinishSec",
  //   letterTiming.targetFinishSec
  // );
  letterTiming.trialFirstFrameSec = undefined;
  letterTiming.targetStartSec = undefined;
  letterTiming.targetFinishSec = undefined;

  addTrialStaircaseSummariesToData(currentLoop, psychoJS); // !
  logger("tolerances", tolerances);
  if (currentLoop instanceof MultiStairHandler) {
    // currentLoop.addResponse(key_resp.corr, level);
    if (
      !addResponseIfTolerableError(
        currentLoop,
        responseCorrect,
        level,
        tolerances,
        usingGaze.current,
        psychoJS,
        respondedEarly
      ) &&
      usingGaze.current
    ) {
      // if not tolerable error, then nudge gaze
      rc.nudgeGaze({
        showOffset: true,
      });
    }
  }
};

export const _repeatedLetters_trialRoutineFirstFrame = (paramReader) => {
  if (
    paramReader.read("calibrateTrackGazeBool", status.block_condition) &&
    tolerances.measured.gazeMeasurementLatencySec === undefined
  )
    measureGazeError(
      tolerances,
      displayOptions,
      clickedContinue.timestamps[clickedContinue.timestamps.length - 1],
      letterConfig.targetDurationSec
    );
};
export const _repeatedLetters_trialRoutineEachFrame = (
  t,
  frameN,
  delayBeforeStimOnsetSec,
  frameRemains,
  targetSpecs,
  conditionName,
  showCharacterSet,
  instructions
) => {
  // Draw targets
  if (
    t >= delayBeforeStimOnsetSec &&
    repeatedLettersConfig.stims.every(
      (s) => s.status === PsychoJS.Status.NOT_STARTED
    )
  ) {
    // keep track of start time/frame for later
    repeatedLettersConfig.stims.forEach((s) => {
      s.tStart = t; // (not accounting for frame time here)
      s.frameNStart = frameN; // exact frame index
      s.setAutoDraw(true);
    });
  }
  // Confirm that targets are drawn
  if (
    repeatedLettersConfig.stims.every(
      (s) => s.status === PsychoJS.Status.STARTED
    ) &&
    !letterTiming.targetStartSec
  ) {
    letterTiming.targetStartSec = t;
    repeatedLettersConfig.stims.forEach(
      (s) => (s.frameNDrawnConfirmed = frameN)
    );
    letterTiming.targetDrawnConfirmedTimestamp = performance.now();
    letterTiming.crosshairClickedTimestamp =
      clickedContinue.timestamps[clickedContinue.timestamps.length - 1];
  }
  // Undraw targets
  if (
    repeatedLettersConfig.stims.every(
      (s) => s.status === PsychoJS.Status.STARTED
    ) &&
    t >= frameRemains
  ) {
    repeatedLettersConfig.stims.forEach((s) => {
      s.setAutoDraw(false);
      s.frameNEnd = frameN;
    });
    setTimeout(() => {
      showCursor();
    }, 500);
  }
  // Confirm targets undrawn
  if (
    repeatedLettersConfig.stims.every(
      (s) => s.status === PsychoJS.Status.FINISHED
    ) &&
    !letterTiming.targetFinishSec
  ) {
    letterTiming.targetFinishSec = t;
    repeatedLettersConfig.stims.forEach(
      (s) => (s.frameNFinishConfirmed = frameN)
    );

    if (showConditionNameConfig.showTargetSpecs) {
      const thisDuration =
        letterTiming.targetFinishSec - letterTiming.targetStartSec;
      // TODO why is 0.02 hardcoded? Surely should be from a parameter
      showConditionNameConfig.targetSpecs += `\ntargetOnsetSec: ${
        Math.round(thisDuration * 100.0) / 100
      } [${isTimingOK(
        Math.abs(thisDuration - letterConfig.targetDurationSec),
        0.02
      )}]`;
      targetSpecs.setText(showConditionNameConfig.targetSpecs);
      showConditionName(conditionName, targetSpecs);
    }
  }
  // SHOW CharacterSet AND INSTRUCTIONS
  // *showCharacterSet* updates
  if (
    t >=
      delayBeforeStimOnsetSec +
        letterConfig.targetSafetyMarginSec +
        letterConfig.targetDurationSec &&
    showCharacterSet.status === PsychoJS.Status.NOT_STARTED
  ) {
    // keep track of start time/frame for later
    showCharacterSet.tStart = t; // (not accounting for frame time here)
    showCharacterSet.frameNStart = frameN; // exact frame index
    showCharacterSet.setAutoDraw(true);
    setupClickableCharacterSet(
      fontCharacterSet.current,
      font.name,
      fontCharacterSet.where,
      showCharacterSetResponse,
      null,
      "",
      targetKind.current
    );

    instructions.tSTart = t;
    instructions.frameNStart = frameN;
    instructions.setAutoDraw(true);
  }
};

export const _letter_trialRoutineFirstFrame = (
  paramReader,
  thresholdParameter,
  targetSpecs,
  conditionName,
  target,
  flankersUsed
) => {
  if (paramReader.read("calibrateTrackGazeBool", status.block_condition))
    measureGazeError(
      tolerances,
      displayOptions,
      clickedContinue.timestamps[clickedContinue.timestamps.length - 1],
      letterConfig.targetDurationSec
    );
  /* SAVE INFO ABOUT STIMULUS AS PRESENTED */
  if (typeof target !== "undefined")
    psychoJS.experiment.addData(
      "targetBoundingBox",
      prettyPrintPsychojsBoundingBox(target.getBoundingBox(true))
    );
  flankersUsed.forEach((f, i) =>
    psychoJS.experiment.addData(
      `flanker${i}BoundingBox`,
      prettyPrintPsychojsBoundingBox(f.getBoundingBox(true))
    )
  );
  /* /SAVE INFO ABOUT STIMULUS AS PRESENTED */

  // ? Should allow for reading?
  if (timing.clickToStimulusOnsetSec)
    if (showConditionNameConfig.showTargetSpecs) {
      // TODO why is 0.1 hardcoded? Surely it should be from a parameter
      showConditionNameConfig.targetSpecs += `\nclickToStimulusOnsetSec: ${
        Math.round(timing.clickToStimulusOnsetSec * 100.0) / 100
      } [${isTimingOK(timing.clickToStimulusOnsetSec, 0.1)}]`;
      targetSpecs.setText(showConditionNameConfig.targetSpecs);
      showConditionName(conditionName, targetSpecs);
    }
};
