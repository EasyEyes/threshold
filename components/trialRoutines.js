import { debug, getTripletCharacters } from "./utils.js";
import { getTrialInfoStr } from "./trialCounter.js";
import { instructionsText } from "./instructions.js";
import { hideCursor, XYPixOfXYDeg } from "./utils.js";
import { cleanFontName } from "./fonts.js";
import { getCharacterSetBoundingBox, restrictLevel } from "./bounding.js";
import { SimulatedObserver } from "./simulatedObserver.js";

const _takeFixationClick = (
  e,
  fixationSize,
  clickedContinue,
  modalButtonTriggeredViaKeyboard
) => {
  if (modalButtonTriggeredViaKeyboard.current) {
    // modal button click event triggered by jquery
    modalButtonTriggeredViaKeyboard.current = false;
    return;
  }
  let cX, cY;
  if (e.clientX) {
    cX = e.clientX;
    cY = e.clientY;
  } else {
    const t = e.changedTouches[0];
    if (t.clientX) {
      cX = t.clientX;
      cY = t.clientY;
    } else {
      clickedContinue.current = false;
      return;
    }
  }

  if (
    Math.hypot(cX - (window.innerWidth >> 1), cY - (window.innerHeight >> 1)) <
    fixationSize
  ) {
    // Clicked on fixation
    hideCursor();
    setTimeout(() => {
      clickedContinue.current = true;
    }, 17);
  } else {
    // wrongSynth.play();
    clickedContinue.current = false;
  }
};

export const _identify_trialInstructionRoutineBegin = (
  psychoJS,
  PsychoJS,
  rc,
  paramReader,
  snapshot,
  condition,
  block_condition,
  {
    currentTrialIndex,
    currentTrialLength,
    trialInfoStr, //
    t,
    frameN,
    continueRoutine, //
    fixationSize,
    fixationXYPx, //
    targetFont,
    targetCharacterSet,
    validAns,
    showCharacterSetWhere,
    correctAns, //
    showTargetSpecs,
    conditionTrials,
    targetDurationSec, //
    showFixation,
    spacingRelationToSize,
    showBoundingBox,
    targetSafetyMarginSec, //
    level,
    stimulusParameters,
    trialComponents, //
    simulated,
    simulatedObserver, //
    // ---
    TrialHandler, //
    instructionsClock,
    key_resp, //
    instructions,
    fixation,
    target,
    flanker1,
    flanker2,
    showCharacterSet,
    totalTrial,
    targetBoundingPoly,
    flanker1BoundingPoly,
    flanker2BoundingPoly,
    targetSpecs, //
    clickedContinue,
    modalButtonTriggeredViaKeyboard,
    characterSetBoundingRects,
    totalTrialConfig, //
    currentBlockIndex,
    totalBlockCount,
    responseType,
    instructionFont, //
    currentLoop, //
  }
) => {
  function _instructionBeforeStimulusSetup(text) {
    t = 0;
    instructionsClock.reset(); // clock
    frameN = -1;
    continueRoutine = true;
    // const wrapWidth = Math.round(1.5 + Math.sqrt(9 + 12*text.length)/2) * instructions.height/1.9;
    const wrapWidth = window.innerWidth / 4;
    instructions.setWrapWidth(wrapWidth);
    instructions.setPos([
      -window.innerWidth / 2 + 5,
      window.innerHeight / 2 - 5,
    ]);
    instructions.setText(text);
    instructions.setAutoDraw(true);
  }

  /* -------------------------------------------------------------------------- */

  // update trial/block count
  currentTrialIndex = snapshot.thisN + 1;
  currentTrialLength = snapshot.nTotal;

  _instructionBeforeStimulusSetup(
    instructionsText.trial.fixate["spacing"](rc.language.value, responseType),
    { t, instructionsClock, frameN, continueRoutine, instructions }
  );

  fixation.setHeight(fixationSize);
  fixation.setPos(fixationXYPx);
  fixation.tStart = t;
  fixation.frameNStart = frameN;
  fixation.setAutoDraw(true);

  clickedContinue.current = false;

  const takeFixationClick = _takeFixationClick.bind(
    null,
    fixationSize,
    clickedContinue,
    modalButtonTriggeredViaKeyboard
  );
  document.addEventListener("click", takeFixationClick);
  document.addEventListener("touchend", takeFixationClick);

  /* PRECOMPUTE STIMULI FOR THE UPCOMING TRIAL */
  TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date
  const reader = paramReader;
  let proposedLevel = currentLoop._currentStaircase.getQuestValue();
  psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);

  psychoJS.experiment.addData("block_condition", block_condition);
  psychoJS.experiment.addData(
    "flankerOrientation",
    reader.read("spacingDirection", block_condition)
  );
  psychoJS.experiment.addData(
    "targetFont",
    reader.read("targetFont", block_condition)
  );
  // update component parameters for each repeat
  let windowWidthCm = rc.screenWidthCm ? rc.screenWidthCm.value : 30;
  let windowWidthPx = rc.displayWidthPx.value;
  let pixPerCm = windowWidthPx / windowWidthCm;
  if (!rc.screenWidthCm)
    console.warn("[Screen Width] Using arbitrary screen width. Enable RC.");

  let viewingDistanceDesiredCm = reader.read(
    "viewingDistanceDesiredCm",
    block_condition
  );
  // viewingDistanceDesiredCm = 10;
  let viewingDistanceCm = rc.viewingDistanceCm
    ? rc.viewingDistanceCm.value
    : viewingDistanceDesiredCm;
  if (!rc.viewingDistanceCm)
    console.warn(
      "[Viewing Distance] Using arbitrary viewing distance. Enable RC."
    );

  let block = condition["block"];

  // TODO check that we are actually trying to test for "spacing", not "size"

  let spacingDirection = reader.read("spacingDirection", block_condition);
  let spacingSymmetry = reader.read("spacingSymmetry", block_condition);
  let targetFontSource = reader.read("targetFontSource", block_condition);
  targetFont = reader.read("targetFont", block_condition);
  if (targetFontSource === "file") targetFont = cleanFontName(targetFont);

  targetCharacterSet = String(
    reader.read("targetCharacterSet", block_condition)
  ).split("");
  validAns = String(reader.read("targetCharacterSet", block_condition))
    .toLowerCase()
    .split("");

  showCharacterSetWhere = reader.read("showCharacterSetWhere", block_condition);
  let showViewingDistanceBool = reader.read(
    "showViewingDistanceBool",
    block_condition
  );
  let showCounterBool = reader.read("showCounterBool", block_condition);
  showTargetSpecs = paramReader.read("showTargetSpecsBool", block_condition);

  conditionTrials = reader.read("conditionTrials", block_condition);
  targetDurationSec = reader.read("targetDurationSec", block_condition);

  fixationSize = 45; // TODO use .csv parameters, ie draw as 2 lines, not one letter
  showFixation = reader.read("markTheFixationBool", block_condition);

  let targetKind = reader.read("targetKind", block_condition);
  let targetSizeDeg = reader.read("targetSizeDeg", block_condition);
  let targetSizeIsHeightBool = reader.read(
    "targetSizeIsHeightBool",
    block_condition
  );
  let thresholdParameter = reader.read("thresholdParameter", block_condition);
  let targetMinimumPix = reader.read("targetMinimumPix", block_condition);
  let spacingOverSizeRatio = reader.read(
    "spacingOverSizeRatio",
    block_condition
  );
  spacingRelationToSize = reader.read("spacingRelationToSize", block_condition);
  showBoundingBox =
    reader.read("showBoundingBoxBool", block_condition) || false;

  targetMinimumPix = reader.read("targetMinimumPix", block_condition);
  let targetEccentricityXDeg = reader.read(
    "targetEccentricityXDeg",
    block_condition
  );
  psychoJS.experiment.addData("targetEccentricityXDeg", targetEccentricityXDeg);
  let targetEccentricityYDeg = reader.read(
    "targetEccentricityYDeg",
    block_condition
  );
  psychoJS.experiment.addData("targetEccentricityYDeg", targetEccentricityYDeg);
  let targetEccentricityXYDeg = [
    targetEccentricityXDeg,
    targetEccentricityYDeg,
  ];
  targetSafetyMarginSec = paramReader.read(
    "targetSafetyMarginSec",
    block_condition
  );

  // trackGazeYes = reader.read("trackGazeYes", block_condition);
  // trackHeadYes = reader.read("trackHeadYes", block_condition);

  // let wirelessKeyboardNeededYes = reader.read(
  //   "wirelessKeyboardNeededYes",
  //   block_condition
  // );

  var characterSet = targetCharacterSet;

  // Repeat letters 3 times when in 'typographic' mode,
  // ie the relevant bounding box is that of three letters.
  const letterRepeats = spacingRelationToSize === "ratio" ? 1 : 3;
  // eslint-disable-next-line no-prototype-builtins
  if (!characterSetBoundingRects.hasOwnProperty(block_condition)) {
    characterSetBoundingRects[block_condition] = getCharacterSetBoundingBox(
      characterSet,
      targetFont,
      psychoJS.window,
      letterRepeats
    );
  }
  /* ------------------------------ Pick triplets ----------------------------- */
  var [firstFlankerCharacter, targetCharacter, secondFlankerCharacter] =
    getTripletCharacters(characterSet);
  if (debug)
    console.log(
      `%c${firstFlankerCharacter} ${targetCharacter} ${secondFlankerCharacter}`,
      "color: red; font-size: 1.5rem"
    );
  correctAns = targetCharacter.toLowerCase();
  /* -------------------------------------------------------------------------- */

  var targetEccentricityXYPx;

  ////
  // !
  // TODO use actual nearPoint, from RC
  const nearPointXYDeg = { x: 0, y: 0 }; // TEMP
  const nearPointXYPix = { x: 0, y: 0 }; // TEMP
  const displayOptions = {
    pixPerCm: pixPerCm,
    viewingDistanceCm: viewingDistanceCm,
    nearPointXYDeg: nearPointXYDeg,
    nearPointXYPix: nearPointXYPix,
    fixationXYPix: fixationXYPx,
    spacingOverSizeRatio: spacingOverSizeRatio,
    targetMinimumPix: targetMinimumPix,
    fontFamily: targetFont,
    window: psychoJS.window,
    spacingRelationToSize: spacingRelationToSize,
    targetEccentricityXYDeg: targetEccentricityXYDeg,
    spacingDirection: spacingDirection,
    flankerCharacters: [firstFlankerCharacter, secondFlankerCharacter],
    targetCharacter: targetCharacter,
    targetSizeDeg: targetSizeDeg,
    targetKind: targetKind,
  };

  // Fixation placement does not depend on the value of "spacingRelationToSize"...
  fixation.setPos(fixationXYPx);
  fixation.setHeight(fixationSize);
  // ... neither does target location...
  targetEccentricityXYPx = XYPixOfXYDeg(
    targetEccentricityXYDeg,
    displayOptions
  );
  // targetEccentricityXYPx = targetEccentricityXYPx.map(Math.round);
  psychoJS.experiment.addData("targetLocationPx", targetEccentricityXYPx);
  target.setPos(targetEccentricityXYPx);
  target.setFont(targetFont);

  // ...but size, and content of the target(& flankers) does.
  psychoJS.experiment.addData("spacingRelationToSize", spacingRelationToSize);
  [level, stimulusParameters] = restrictLevel(
    proposedLevel,
    thresholdParameter,
    characterSetBoundingRects[block_condition],
    spacingDirection,
    spacingRelationToSize,
    spacingSymmetry,
    spacingOverSizeRatio,
    targetSizeIsHeightBool,
    displayOptions
  );
  psychoJS.experiment.addData("level", level);
  psychoJS.experiment.addData("heightPx", stimulusParameters.heightPx);
  target.setHeight(stimulusParameters.heightPx);
  target.setPos(stimulusParameters.targetAndFlankersXYPx[0]);
  psychoJS.experiment.addData(
    "targetLocationPx",
    stimulusParameters.targetAndFlankersXYPx[0]
  );
  switch (thresholdParameter) {
    case "size":
      flanker1.setAutoDraw(false);
      flanker2.setAutoDraw(false);
      break;
    case "spacing":
      switch (spacingRelationToSize) {
        case "none":
        case "ratio":
          target.setText(targetCharacter);
          flanker1.setText(firstFlankerCharacter);
          flanker2.setText(secondFlankerCharacter);
          flanker1.setPos(stimulusParameters.targetAndFlankersXYPx[1]);
          flanker2.setPos(stimulusParameters.targetAndFlankersXYPx[2]);
          flanker1.setFont(targetFont);
          flanker2.setFont(targetFont);
          flanker1.setHeight(stimulusParameters.heightPx);
          flanker2.setHeight(stimulusParameters.heightPx);
          psychoJS.experiment.addData("flankerLocationsPx", [
            stimulusParameters.targetAndFlankersXYPx[1],
            stimulusParameters.targetAndFlankersXYPx[2],
          ]);
          break;
        case "typographic":
          // ...include the flankers in the same string/stim as the target.
          // const flankersAndTargetString =
          //   firstFlankerCharacter +
          //   targetCharacter +
          //   secondFlankerCharacter;
          target.setText(
            firstFlankerCharacter + targetCharacter + secondFlankerCharacter
          );
          flanker1.setAutoDraw(false);
          flanker2.setAutoDraw(false);
          break;
      }
      break;
  }
  [target, flanker1, flanker2, fixation, showCharacterSet, totalTrial].forEach(
    (c) => c._updateIfNeeded()
  );
  if (showBoundingBox) {
    const boundingStims = [targetBoundingPoly];
    const tightBoundingBox = target.getBoundingBox(true);
    targetBoundingPoly.setPos([tightBoundingBox.left, tightBoundingBox.top]);
    targetBoundingPoly.setSize([
      tightBoundingBox.width,
      tightBoundingBox.height,
    ]);
    if (
      (spacingRelationToSize === "ratio" || spacingRelationToSize === "none") &&
      thresholdParameter === "spacing"
    ) {
      boundingStims.push(flanker1BoundingPoly, flanker2BoundingPoly);
      const flanker1BoundingBox = flanker1.getBoundingBox(true);
      flanker1BoundingPoly.setPos([
        flanker1BoundingBox.left,
        flanker1BoundingBox.top,
      ]);
      flanker1BoundingPoly.setSize([
        flanker1BoundingBox.width,
        flanker1BoundingBox.height,
      ]);
      const flanker2BoundingBox = flanker2.getBoundingBox(true);
      flanker2BoundingPoly.setPos([
        flanker2BoundingBox.left,
        flanker2BoundingBox.top,
      ]);
      flanker2BoundingPoly.setSize([
        flanker2BoundingBox.width,
        flanker2BoundingBox.height,
      ]);
    }
    boundingStims.forEach((c) => c._updateIfNeeded());
  }
  showCharacterSet.setPos([0, 0]);
  showCharacterSet.setText("");
  // showCharacterSet.setText(getCharacterSetShowText(validAns))

  if (showTargetSpecs) {
    const spacing =
      Math.round((Math.pow(10, level) + Number.EPSILON) * 1000) / 1000;
    const size =
      Math.round((spacing / spacingOverSizeRatio + Number.EPSILON) * 1000) /
      1000;
    let targetSpecsString = `size: ${size} deg
spacing: ${spacing} deg
targetFont: ${targetFont}
spacingRelationToSize: ${spacingRelationToSize}
spacingOverSizeRatio: ${spacingOverSizeRatio}`;
    targetSpecs.setText(targetSpecsString);
    targetSpecs.setPos([-window.innerWidth / 2, -window.innerHeight / 2]);
    targetSpecs.setAutoDraw(true);
  }

  trialInfoStr = getTrialInfoStr(
    rc.language.value,
    showCounterBool,
    showViewingDistanceBool,
    currentTrialIndex,
    currentTrialLength,
    currentBlockIndex,
    totalBlockCount,
    viewingDistanceCm
  );
  totalTrial.setText(trialInfoStr);
  totalTrial.setFont(instructionFont);
  totalTrial.setHeight(totalTrialConfig.fontSize);
  totalTrial.setPos([window.innerWidth / 2, -window.innerHeight / 2]);
  totalTrial.setAutoDraw(true);

  trialComponents = [];
  trialComponents.push(key_resp);
  trialComponents.push(fixation);
  trialComponents.push(flanker1);
  trialComponents.push(target);
  trialComponents.push(flanker2);

  trialComponents.push(showCharacterSet);
  trialComponents.push(totalTrial);
  // if (showTargetSpecs) trialComponents.push(targetSpecs);
  // /* --- BOUNDING BOX --- */
  if (showBoundingBox) {
    trialComponents.push(targetBoundingPoly);
    if (
      (spacingRelationToSize === "ratio" || spacingRelationToSize === "none") &&
      thresholdParameter === "spacing"
    ) {
      trialComponents.push(flanker1BoundingPoly);
      trialComponents.push(flanker2BoundingPoly);
    }
  }
  // /* --- /BOUNDING BOX --- */
  // /* --- SIMULATED --- */
  if (simulated && simulated[block]) {
    if (!simulatedObserver[block_condition]) {
      simulatedObserver[block_condition] = new SimulatedObserver(
        simulated[block][block_condition],
        level,
        characterSet,
        targetCharacter,
        paramReader.read("thresholdProportionCorrect", block_condition),
        paramReader.read("simulationBeta", block_condition),
        paramReader.read("simulationDelta", block_condition),
        paramReader.read("simulationThreshold", block_condition)
      );
    } else {
      simulatedObserver[block_condition].updateTrial(
        level,
        characterSet,
        targetCharacter
      );
    }
  }
  // /* --- /SIMULATED --- */
  for (const thisComponent of trialComponents)
    if ("status" in thisComponent)
      thisComponent.status = PsychoJS.Status.NOT_STARTED;

  // update trial index
  // totalTrialIndex = totalTrialIndex + 1;
  /* /PRECOMPUTE STIMULI FOR THE UPCOMING TRIAL */

  return [
    currentTrialIndex,
    currentTrialLength,
    trialInfoStr, //
    t,
    frameN,
    continueRoutine, //
    fixationSize,
    fixationXYPx, //
    targetFont,
    targetCharacterSet,
    validAns,
    showCharacterSetWhere,
    correctAns, //
    showTargetSpecs,
    conditionTrials,
    targetDurationSec, //
    showFixation,
    spacingRelationToSize,
    showBoundingBox,
    targetSafetyMarginSec, //
    level,
    stimulusParameters,
    trialComponents, //
    simulated,
    simulatedObserver,
    // NEW THINGS
    takeFixationClick,
  ];
};

export const _identify_trialInstructionRoutineEnd = (
  instructions,
  takeFixationClick
) => {
  document.removeEventListener("click", takeFixationClick);
  document.removeEventListener("touchend", takeFixationClick);
  instructions.setAutoDraw(false);
};
