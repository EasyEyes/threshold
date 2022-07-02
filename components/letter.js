import { letterConfig, repeatedLettersConfig } from "./global";
import { logger } from "./utils";

export const readTrialLevelLetterParams = (reader, BC) => {
  letterConfig.padText = reader.read("fontPadTextToAvoidClippingBool", BC);
  letterConfig.targetDurationSec = reader.read("targetDurationSec", BC);
  letterConfig.delayBeforeStimOnsetSec = reader.read(
    "markingOffsetBeforeTargetOnsetSecs",
    BC
  );
  letterConfig.spacingDirection = reader.read("spacingDirection", BC);
  logger("spacingDirection", letterConfig.spacingDirection);
  letterConfig.spacingSymmetry = reader.read("spacingSymmetry", BC);
  letterConfig.targetSizeIsHeightBool = reader.read(
    "targetSizeIsHeightBool",
    BC
  );
  letterConfig.targetMinimumPix = reader.read("targetMinimumPix", BC);
  letterConfig.spacingOverSizeRatio = reader.read("spacingOverSizeRatio", BC);
  letterConfig.spacingRelationToSize = reader.read("spacingRelationToSize", BC);
  logger(
    "spacingRelationToSize in readTrialLevel",
    reader.read("spacingRelationToSize", BC)
  );
  letterConfig.targetMinimumPix = reader.read("targetMinimumPix", BC);
  const targetEccentricityXDeg = reader.read("targetEccentricityXDeg", BC);
  logger("targetEccentricityXDeg", targetEccentricityXDeg);
  const targetEccentricityYDeg = reader.read("targetEccentricityYDeg", BC);
  letterConfig.targetEccentricityXYDeg = [
    targetEccentricityXDeg,
    targetEccentricityYDeg,
  ];

  letterConfig.targetSafetyMarginSec = reader.read("targetSafetyMarginSec", BC);
};

/*  
    ||| REPEATED LETTERS |||
    vvv                  vvv
*/
export const readTrialLevelRepeatedLetterParams = (reader, BC) => {
  repeatedLettersConfig.targetRepeatsBorderCharacter = reader.read(
    "targetRepeatsBorderCharacter",
    BC
  );
  repeatedLettersConfig.targetRepeatsMaxLines = reader.read(
    "targetRepeatsMaxLines",
    BC
  );
};
