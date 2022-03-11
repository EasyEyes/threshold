/* ----------------------------- Condition Name ----------------------------- */

import {
  conditionNameConfig,
  font,
  letterConfig,
  showConditionNameConfig,
  viewingDistanceCm,
} from "./global";

export const showConditionName = (conditionName, targetSpecs) => {
  if (showConditionNameConfig.show) {
    conditionName.setText(showConditionNameConfig.name);

    updateConditionNameConfig(
      conditionNameConfig,
      showConditionNameConfig.showTargetSpecs,
      targetSpecs
    );
    conditionName.setPos(conditionNameConfig.pos);

    conditionName.setAutoDraw(true);
  }
};

export const updateConditionNameConfig = (
  conditionNameConfig,
  updateForTargetSpecs,
  targetSpecs = null
) => {
  if (updateForTargetSpecs && targetSpecs) {
    conditionNameConfig.pos[0] = -window.innerWidth / 2;
    conditionNameConfig.pos[1] =
      -window.innerHeight / 2 + targetSpecs.getBoundingBox().height;
  } else {
    conditionNameConfig.pos[0] = -window.innerWidth / 2;
    conditionNameConfig.pos[1] = -window.innerHeight / 2;
  }
};

/* -------------------------------------------------------------------------- */

export const updateTargetSpecsForLetter = (
  stimulusParameters,
  experimentFileName
) => {
  showConditionNameConfig.targetSpecs = `sizeDeg: ${
    Math.round(10 * stimulusParameters.sizeDeg) / 10
  }\n${
    stimulusParameters.spacingDeg
      ? `spacingDeg: ${Math.round(10 * stimulusParameters.spacingDeg) / 10}`
      : ""
  }\nheightDeg: ${
    Math.round(10 * stimulusParameters.heightDeg) / 10
  }\nheightPx: ${Math.round(
    stimulusParameters.heightPx
  )}\nfilename: ${experimentFileName}\nfont: ${
    font.name
  }\nspacingRelationToSize: ${
    letterConfig.spacingRelationToSize
  }\nspacingOverSizeRatio: ${
    letterConfig.spacingOverSizeRatio
  }\nspacingSymmetry: ${letterConfig.spacingSymmetry}\ntargetDurationSec: ${
    letterConfig.targetDurationSec
  }\ntargetSizeIsHeightBool: ${
    letterConfig.targetSizeIsHeightBool
  }\ntargetEccentricityXYDeg: ${
    letterConfig.targetEccentricityXYDeg
  }\nviewingDistanceCm: ${viewingDistanceCm.current}`;
};

export const updateTargetSpecsForReading = (reader, BC, experimentFileName) => {
  showConditionNameConfig.targetSpecs = `filename: ${experimentFileName}\nreadingCorpus: ${reader.read(
    "readingCorpus",
    BC
  )}\nreadingCorpusSkipWords: ${reader.read(
    "readingCorpusSkipWords",
    BC
  )}\nreadingDefineSingleLineSpacingAs: ${reader.read(
    "readingDefineSingleLineSpacingAs",
    BC
  )}\nfont: ${reader.read("font", BC)}\nreadingLinesPerPage: ${reader.read(
    "readingLinesPerPage",
    BC
  )}\nreadingMaxCharactersPerLine: ${reader.read(
    "readingMaxCharactersPerLine",
    BC
  )}\nreadingMultipleOfSingleLineSpacing: ${reader.read(
    "readingMultipleOfSingleLineSpacing",
    BC
  )}\nreadingNominalSizeDeg: ${reader.read(
    "readingNominalSizeDeg",
    BC
  )}\nreadingNumberOfPossibleAnswers: ${reader.read(
    "readingNumberOfPossibleAnswers",
    BC
  )}\nreadingNumberOfQuestions: ${reader.read(
    "readingNumberOfQuestions",
    BC
  )}\nreadingPages: ${reader.read(
    "readingPages",
    BC
  )}\nreadingSetSizeBy: ${reader.read(
    "readingSetSizeBy",
    BC
  )}\nreadingSingleLineSpacingDeg: ${reader.read(
    "readingSingleLineSpacingDeg",
    BC
  )}\nreadingSpacingDeg: ${reader.read(
    "readingSpacingDeg",
    BC
  )}\nreadingXHeightDeg: ${reader.read(
    "readingXHeightDeg",
    BC
  )}\nviewingDistanceCm: ${viewingDistanceCm.current}`;
};

export const isTimingOK = (measured, target) => {
  return measured < target ? "OK" : "BAD";
};
