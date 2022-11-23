/* ----------------------------- Condition Name ----------------------------- */

import {
  conditionNameConfig,
  font,
  letterConfig,
  readingPageStats,
  showConditionNameConfig,
  viewingDistanceCm,
} from "./global";
import { logger, toFixedNumber } from "./utils";

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

export const updateTargetSpecsForRepeatedLetters = (
  stimulusParameters,
  experimentFileName
) => {
  logger("stimulusParameters", stimulusParameters);
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
  }\ntargetSizeIsHeightBool: ${
    letterConfig.targetSizeIsHeightBool
  }\nviewingDistanceCm: ${viewingDistanceCm.current}`;
};

export const updateTargetSpecsForReading = (reader, BC, experimentFileName) => {
  showConditionNameConfig.targetSpecs = `filename: ${experimentFileName}\nreadingCorpus: ${reader.read(
    "readingCorpus",
    BC
  )}\nreadingFirstFewWords: ${
    readingPageStats.readingPageSkipCorpusWords.length
      ? readingPageStats.readingPageSkipCorpusWords[
          readingPageStats.readingPageSkipCorpusWords.length - 1
        ]
      : 0
  }\nreadingDefineSingleLineSpacingAs: ${reader.read(
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

export const updateTargetSpecsForSound = (
  targetLevel,
  maskerLevel,
  soundGain,
  noiseLevel,
  targetSoundFolder,
  maskerSoundFolder
) => {
  showConditionNameConfig.targetSpecs = `targetLevel: ${
    Math.round(10 * targetLevel) / 10
  }\nmaskerLevel: ${maskerLevel}\nsoundGainDBSPL: ${soundGain}\nnoiseLevel: ${noiseLevel}\ntargetSoundFolder: ${targetSoundFolder}\nmaskerSoundFolder ${maskerSoundFolder}`;
};

export const updateTargetSpecsForRsvpReading = (
  reader,
  BC,
  experimentFileName,
  otherSpecs
) => {
  const readingSpecs = {
    filename: experimentFileName,
    readingCorpus: reader.read("readingCorpus", BC),
    readingFirstFewWords: readingPageStats.readingPageSkipCorpusWords.length
      ? readingPageStats.readingPageSkipCorpusWords[
          readingPageStats.readingPageSkipCorpusWords.length - 1
        ]
      : 0,
    readingDefineSingeLineSpacingAs: reader.read(
      "readingDefineSingleLineSpacingAs",
      BC
    ),
    font: reader.read("font", BC),
    readingMultipleOfSingleLineSpacing: reader.read(
      "readingMultipleOfSingleLineSpacing",
      BC
    ),
    readingNominalSizeDeg: reader.read("readingNominalSizeDeg", BC),
    readingSetSizeBy: reader.read("readingSetSizeBy", BC),
    readingSingleLineSpacingDeg: reader.read("readingSingleLineSpacingDeg", BC),
    readingSpacingDeg: reader.read("readingSpacingDeg", BC),
    readingXHeightDeg: reader.read("readingXHeightDeg", BC),
    viewingDistanceCm: viewingDistanceCm.current,
  };
  const rsvpSpecs = {
    rsvpReadingFlankTargetWithLettersBool: reader.read(
      "rsvpReadingFlankTargetWithLettersBool",
      BC
    ),
    rsvpReadingFLankerCharacterSet: reader.read(
      "rsvpReadingFlankerCharacterSet",
      BC
    ),
    rsvpReadingNumberOfResponseOptions: reader.read(
      "rsvpReadingNumberOfResponseOptions",
      BC
    ),
    rsvpReadingNumberOfWords: reader.read("rsvpReadingNumberOfWords", BC),
    rsvpReadingRequireUniqueWordsBool: reader.read(
      "rsvpReadingRequireUniqueWordsBool",
      BC
    ),
  };
  const allSpecs = Object.assign(readingSpecs, rsvpSpecs, otherSpecs);
  showConditionNameConfig.targetSpecs = enumerateProvidedTargetSpecs(allSpecs);
};

export const updateTargetSpecsForSoundDetect = (
  targetLevel,
  maskerLevel,
  soundGain,
  noiseLevel,
  targetSoundFolder,
  maskerSoundFolder
) => {
  showConditionNameConfig.targetSpecs = `targetSoundDBSPL: ${
    targetLevel ? Math.round(10 * targetLevel) / 10 : "****"
  }\nmaskerSoundDBSPL: ${maskerLevel}\nsoundGainDBSPL: ${soundGain}\nnoiseSoundDBSPL: ${noiseLevel}\ntargetSoundFolder: ${targetSoundFolder}\nmaskerSoundFolder: ${maskerSoundFolder}`;
};

export const updateTargetSpecsForSoundIdentify = (
  targetLevel,
  soundGain,
  noiseLevel,
  targetSoundFolder
) => {
  showConditionNameConfig.targetSpecs = `targetSoundDBSPL: ${
    targetLevel ? Math.round(10 * targetLevel) / 10 : "****"
  }\nsoundGainDBSPL: ${soundGain}\nnoiseSoundDBSPL: ${noiseLevel}\ntargetSoundFolder: ${targetSoundFolder}`;
};

export const isTimingOK = (measured, target) => {
  return measured < target ? "OK" : "BAD";
};

/**
 * Given an object, create a string enumerating each of the objects properties with one property per line.
 * @param {object} specs
 * @returns {string}
 */
const enumerateProvidedTargetSpecs = (specs) => {
  const enumeratedProps = Object.getOwnPropertyNames(specs)
    .sort()
    .map(
      (prop) =>
        prop +
        ": " +
        new String(
          !isNaN(specs[prop]) ? toFixedNumber(specs[prop], 2) : specs[prop]
        )
    )
    .join("\n");
  return enumeratedProps;
};
