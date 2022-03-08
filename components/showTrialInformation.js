/* ----------------------------- Condition Name ----------------------------- */

import { showConditionNameConfig, viewingDistanceCm } from "./global";

export const showConditionName = (conditionName, targetSpecs) => {
  if (showConditionNameConfig.show) {
    conditionName.setText(showConditionNameConfig.name);
    if (showConditionNameConfig.showTargetSpecs) {
      conditionName.setPos([
        -window.innerWidth / 2,
        targetSpecs.getBoundingBox(true).height,
      ]);
    } else {
      conditionName.setPos([-window.innerWidth / 2, -window.innerHeight / 2]);
    }

    conditionName.setAutoDraw(true);
  }
};

export const updateConditionNameConfig = (
  conditionNameConfig,
  updateForTargetSpecs,
  targetSpecs = null
) => {
  if (updateForTargetSpecs && targetSpecs) {
    conditionNameConfig.x = -window.innerWidth / 2;
    conditionNameConfig.y = targetSpecs.getBoundingBox(true).height;
  } else {
    conditionNameConfig.x = -window.innerWidth / 2;
    conditionNameConfig.y = -window.innerHeight / 2;
  }
};

/* -------------------------------------------------------------------------- */

export const updateTargetSpecsForReading = (reader, BC, experimentFileName) => {
  showConditionNameConfig.targetSpecs = `filename: ${experimentFileName}\nreadingCorpus:${reader.read(
    "readingCorpus",
    BC
  )}\nreadingCorpusSkipWords:${reader.read(
    "readingCorpusSkipWords",
    BC
  )}\nreadingDefineSingleLineSpacingAs:${reader.read(
    "readingDefineSingleLineSpacingAs",
    BC
  )}\nreadingCFont:${reader.read(
    "readingFont",
    BC
  )}\nreadingLinesPerPage:${reader.read(
    "readingLinesPerPage",
    BC
  )}\nreadingMaxCharactersPerLine:${reader.read(
    "readingMaxCharactersPerLine",
    BC
  )}\nreadingMultipleOfSingleLineSpacing:${reader.read(
    "readingMultipleOfSingleLineSpacing",
    BC
  )}\nreadingNominalSizeDeg:${reader.read(
    "readingNominalSizeDeg",
    BC
  )}\nreadingNumberOfPossibleAnswers:${reader.read(
    "readingNumberOfPossibleAnswers",
    BC
  )}\nreadingNumberOfQuestions:${reader.read(
    "readingNumberOfQuestions",
    BC
  )}\nreadingPages:${reader.read(
    "readingPages",
    BC
  )}\nreadingSetSizeBy:${reader.read(
    "readingSetSizeBy",
    BC
  )}\nreadingSingleLineSpacingDeg:${reader.read(
    "readingSingleLineSpacingDeg",
    BC
  )}\nreadingSpacingDeg:${reader.read(
    "readingSpacingDeg",
    BC
  )}\nreadingXHeightDeg:${reader.read(
    "readingXHeightDeg",
    BC
  )}\nviewingDistanceCm: ${viewingDistanceCm.current}`;
};
