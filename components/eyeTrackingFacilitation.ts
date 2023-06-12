/**
 * @file Record (high temporal frequency, ie every frame) information about the current state of the experiment.
 * To be used in conjunction with eye tracking from a MatLab experiment to measure gaze position at specific points in time.
 */

import {
  displayOptions,
  eyeTrackingStimulusRecords,
  fixationConfig,
  showConditionNameConfig,
  status,
  thisExperimentInfo,
} from "./global";
import { getCursorLocation } from "./utils";

interface positionsRecord {
  timeSec: string;
  cursorPositionXYPx: string;
  crosshairPositionXYPx: string;
  targetPositionXYPx: string;
  experimentName: string;
  pavloviaName: string;
  blockNumber: number;
  block_condition: string;
  conditionName: string;
  trialNumber: number;
  easyEyesFunction: string;
}

/**
 * Get a record (object) about the current state of the experiment.
 * @param stimulus Target stimulus object, textStim
 * @param easyEyesFunction
 * @returns
 */
const getCurrentPositionsRecord = (
  stimulus: any = undefined,
  easyEyesFunction = ""
): positionsRecord => {
  let timeSec,
    cursorPositionXYApplePx,
    crosshairPositionXYApplePx,
    targetPositionXYApplePx,
    experimentName,
    blockNumber,
    block_condition,
    conditionName,
    pavloviaName,
    trialNumber;

  if (typeof stimulus !== "undefined" && stimulus._autoDraw === true) {
    const [x, y] = stimulus._pos;
    console.log("!. [x,y] of stimulus", x, y);
    targetPositionXYApplePx = getAppleCoordinatePosition(x, y).toString();
  } else {
    targetPositionXYApplePx = "";
  }
  const cursorPositionXYPsychoJSPx = getCursorLocation() as unknown as number[];
  cursorPositionXYApplePx = getAppleCoordinatePosition(
    cursorPositionXYPsychoJSPx[0],
    cursorPositionXYPsychoJSPx[1]
  ).toString();
  crosshairPositionXYApplePx = getAppleCoordinatePosition(
    fixationConfig.pos[0],
    fixationConfig.pos[1]
  ).toString();
  experimentName = thisExperimentInfo.experimentFileName as unknown as string;
  pavloviaName = thisExperimentInfo.experiment as unknown as string;
  blockNumber = status.block as unknown as number;
  block_condition = status.block_condition as unknown as string;
  conditionName = showConditionNameConfig.name as unknown as string;
  trialNumber = status.trial as unknown as number;
  timeSec = Date.now() / 1000;

  const thisRecord: positionsRecord = {
    experimentName: experimentName,
    pavloviaName: pavloviaName,
    timeSec: timeSec.toString(),
    cursorPositionXYPx: cursorPositionXYApplePx,
    crosshairPositionXYPx: crosshairPositionXYApplePx,
    targetPositionXYPx: targetPositionXYApplePx,
    blockNumber: blockNumber,
    block_condition: block_condition,
    conditionName: conditionName,
    trialNumber: trialNumber,
    easyEyesFunction: easyEyesFunction,
  };
  return thisRecord;
};

/**
 * Create a record at this point of time and add it to the array of previous records
 * @param stimulus Target stimulus object, textStim
 * @param easyEyesFunction
 */
export const recordStimulusPositionsForEyetracking = (
  stimulus: any,
  easyEyesFunction: string = ""
) => {
  const thisRecord = getCurrentPositionsRecord(stimulus, easyEyesFunction);
  eyeTrackingStimulusRecords.push(thisRecord);
};

/**
 * Convert from psychojs units (origin at center of screen, increasing up and to the right) to Apple units (origin at top left corner, increasing down and to the right)
 * @param x in px
 * @param y in px
 * @returns [x,y] in px
 */
const getAppleCoordinatePosition = (x: number, y: number): number[] => {
  let screenDimensions;
  if (displayOptions && displayOptions.window) {
    const win = displayOptions.window as unknown as any;
    screenDimensions = win._size as unknown as number[];

    // TODO verify _size is [width, height]
  } else {
    screenDimensions = [window.innerWidth, window.innerHeight];
  }
  const windowWidth = screenDimensions[0];
  const windowHeight = screenDimensions[1];
  const appleX = Math.floor(x + windowWidth / 2);
  const appleY = Math.floor(-y + windowHeight / 2);
  return [appleX, appleY];
};
