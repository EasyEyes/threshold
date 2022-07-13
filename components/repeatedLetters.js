import { repeatedLettersConfig } from "./global";
import { logger } from "./utils";
// NOTE some functions from `letter.js` and `bounding.js` are used in `repeatedLetters` targetKind

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

export const generateRepeatedLettersStims = (stimulusParameters) => {
  logger("stimulusParameters", stimulusParameters);
};
