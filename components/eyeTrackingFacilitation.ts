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
  viewingDistanceCm,
} from "./global";
import { Screens } from "./multiple-displays/globals";
import { getCursorLocation } from "./utils";

interface positionsRecord {
  posixTimeSec: string;
  cursorPositionXYPx: string;
  crosshairPositionXYPx: string;
  targetPositionXYPx: string;
  experiment: string;
  pavloviaSessionId: string;
  blockNumber: number;
  block_condition: string;
  conditionName: string;
  trialNumber: number;
  easyEyesFunction: string;
  pxPerCm: string;
  viewingDistanceCm: string;
  nearpointXYPx: string;
  screenWidthPx: number;
  screenHeightPx: number;
}

/**
 * Get a record (object) about the current state of the experiment.
 * @param stimulus Target stimulus object, textStim
 * @param easyEyesFunction
 * @returns
 */
const getCurrentPositionsRecord = (
  stimulus: any = undefined,
  easyEyesFunction = "",
): positionsRecord => {
  let posixTimeSec,
    cursorPositionXYApplePx,
    crosshairPositionXYApplePx,
    targetPositionXYApplePx,
    experiment,
    blockNumber,
    block_condition,
    conditionName,
    pavloviaSessionId,
    trialNumber,
    pxPerCm,
    viewingDistanceCmNum,
    screenDimensions,
    nearPointX,
    nearPointY;

  if (typeof stimulus !== "undefined" && stimulus._autoDraw === true) {
    const [x, y] = stimulus._pos;
    targetPositionXYApplePx = getAppleCoordinatePosition(x, y).toString();
  } else {
    targetPositionXYApplePx = "";
  }
  const cursorPositionXYPsychoJSPx = getCursorLocation() as unknown as number[];
  cursorPositionXYApplePx = getAppleCoordinatePosition(
    cursorPositionXYPsychoJSPx[0],
    cursorPositionXYPsychoJSPx[1],
  ).toString();
  crosshairPositionXYApplePx = getAppleCoordinatePosition(
    Screens[0].fixationConfig.pos[0],
    Screens[0].fixationConfig.pos[1],
  ).toString();
  experiment = thisExperimentInfo.experiment as unknown as string;
  pavloviaSessionId = thisExperimentInfo.participant as unknown as string;
  thisExperimentInfo as unknown as string;
  blockNumber = status.block as unknown as number;
  block_condition = status.block_condition as unknown as string;
  conditionName = showConditionNameConfig.name as unknown as string;
  trialNumber = status.trial as unknown as number;
  posixTimeSec = Date.now() / 1000;
  pxPerCm = Screens[0].pxPerCm as unknown as number;
  viewingDistanceCmNum = viewingDistanceCm.current;
  screenDimensions = getScreenDimensions();
  nearPointX = Screens[0].nearestPointXYZPx[0] as unknown as number;
  nearPointY = Screens[0].nearestPointXYZPx[1] as unknown as number;

  const thisRecord: positionsRecord = {
    experiment: experiment,
    pavloviaSessionId: pavloviaSessionId,
    posixTimeSec: posixTimeSec.toString(),
    cursorPositionXYPx: cursorPositionXYApplePx,
    crosshairPositionXYPx: crosshairPositionXYApplePx,
    targetPositionXYPx: targetPositionXYApplePx,
    blockNumber: blockNumber,
    block_condition: block_condition,
    conditionName: conditionName,
    trialNumber: trialNumber,
    easyEyesFunction: easyEyesFunction,
    pxPerCm: pxPerCm.toString(),
    viewingDistanceCm: viewingDistanceCmNum.toString(),
    screenWidthPx: screenDimensions[0],
    screenHeightPx: screenDimensions[1],
    nearpointXYPx: getAppleCoordinatePosition(
      nearPointX,
      nearPointY,
    ).toString(),
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
  easyEyesFunction: string = "",
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
export const getAppleCoordinatePosition = (x: number, y: number): number[] => {
  const screenDimensions = getScreenDimensions();
  const windowWidth = screenDimensions[0];
  const windowHeight = screenDimensions[1];
  const appleX = Math.floor(x + windowWidth / 2);
  const appleY = Math.floor(-y + windowHeight / 2);
  return [appleX, appleY];
};

export const getPsychoJSCoordinatePositionFromAppleCoordinatePosition = (
  x: number,
  y: number,
): number[] => {
  const screenDimensions = getScreenDimensions();
  const windowWidth = screenDimensions[0];
  const windowHeight = screenDimensions[1];
  const psychoJSX = x - windowWidth / 2;
  const psychoJSY = windowHeight / 2 - y;
  return [psychoJSX, psychoJSY];
};

/**
 * Get the width,height of the screen, defaulting to psychoJS' values and falling back on window inner dimensions
 * @returns [widthPx, heightPx]
 */
export const getScreenDimensions = (): number[] => {
  if (Screens[0] && Screens[0].window) {
    const win = Screens[0].window as unknown as any;
    return win._size as unknown as number[];
  } else {
    return [window.innerWidth, window.innerHeight];
  }
};
