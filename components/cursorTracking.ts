import {
  getScreenDimensions,
  getAppleCoordinatePosition,
} from "./eyeTrackingFacilitation";
import { getCursorLocation } from "./utils";
import {
  cursorTracking,
  viewingDistanceCm,
  displayOptions,
  fixationConfig,
  showConditionNameConfig,
  status,
  thisExperimentInfo,
} from "./global";
import { ParamReader } from "../parameters/paramReader";

var interval: NodeJS.Timer | undefined;

interface cursorRecord {
  posixTimeSec: string;
  crosshairPositionXYPx: string;
  cursorPositionXYPx: string;
  targetPositionXYPx?: string;
  viewingDistanceCm: string;
  nearpointXYPx: string;
  pavloviaSessionId: string;
  experiment: string;
  blockNumber: number;
  conditionNumber: number;
  conditionName: string;
  trialNumber: number;
  screenWidthPx: number;
  screenHeightPx: number;
  pxPerCm: string;
  block_condition: string;
  trialStep: string;
  crosshairBool: boolean;
  targetBool: boolean;
}

export const trackCursor = (reader: ParamReader) => {
  const _saveCursorPositionBool = reader.read(
    "_saveCursorPositionBool"
  )[0] as boolean;
  const samplingHz = reader.read("saveCursorTrackingHz")[0] as number;
  const intervalMs = intervalMsFromHz(samplingHz);
  if (_saveCursorPositionBool && typeof interval === "undefined")
    interval = setInterval(recordCursorPosition, intervalMs);
};

export const updateTrackCursorHz = (reader: ParamReader) => {
  if (typeof interval !== "undefined") {
    const hz = reader.read("saveCursorTrackingHz", status.block_condition);
    const ms = intervalMsFromHz(hz);
    clearInterval(interval);
    interval = setInterval(recordCursorPosition, ms);
  }
};

export const defineTargetForCursorTracking = (stim: any) => {
  cursorTracking.target = stim;
};
/** ------ ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ---- **/

const intervalMsFromHz = (hz: number) => {
  return (1 / hz) * 1000;
};

/**
 * Get a record (object) about the current state of the experiment.
 * @param stimulus Target stimulus object, textStim
 */
const recordCursorPosition = () => {
  let posixTimeSec,
    cursorPositionXYApplePx,
    crosshairPositionXYApplePx,
    targetPositionXYApplePx,
    experiment,
    blockNumber,
    block_condition,
    conditionName,
    conditionNumber,
    pavloviaSessionId,
    trialNumber,
    pxPerCm,
    viewingDistanceCmNum,
    screenDimensions,
    nearPointX,
    nearPointY;
  let stimulus = cursorTracking.target as any;
  if (Array.isArray(stimulus)) stimulus = stimulus[0];

  const isInstructions = /nstruction/.test(status.currentFunction);
  const stimulusPresent =
    typeof stimulus !== "undefined" && stimulus._autoDraw === true;
  if (stimulusPresent) {
    const [x, y] = stimulus._pos;
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
  const crosshairPresent =
    typeof fixationConfig.stim !== "undefined" &&
    //@ts-ignore
    fixationConfig.stim?.stims[0]?._autoDraw;
  if (typeof status.block_condition !== "undefined") {
    experiment = thisExperimentInfo.experiment as unknown as string;
    pavloviaSessionId = thisExperimentInfo.participant as unknown as string;
    thisExperimentInfo as unknown as string;
    blockNumber = status.block as unknown as number;
    block_condition = status.block_condition as unknown as string;
    conditionName = showConditionNameConfig.name as unknown as string;
    conditionNumber = Number(block_condition.split("_")[1]);
    trialNumber = status.trial as unknown as number;
    posixTimeSec = Date.now() / 1000;
    pxPerCm = displayOptions.pixPerCm as unknown as number;
    viewingDistanceCmNum = viewingDistanceCm.current;
    screenDimensions = getScreenDimensions();
    nearPointX = displayOptions.nearPointXYPix[0] as unknown as number;
    nearPointY = displayOptions.nearPointXYPix[1] as unknown as number;
    const thisRecord: cursorRecord = {
      experiment: experiment,
      pavloviaSessionId: pavloviaSessionId,
      posixTimeSec: posixTimeSec.toString(),
      cursorPositionXYPx: cursorPositionXYApplePx,
      crosshairPositionXYPx: crosshairPositionXYApplePx,
      targetPositionXYPx: targetPositionXYApplePx,
      blockNumber: blockNumber,
      block_condition: block_condition,
      conditionNumber: conditionNumber,
      conditionName: conditionName,
      trialNumber: trialNumber,
      pxPerCm: pxPerCm.toString(),
      viewingDistanceCm: viewingDistanceCmNum.toString(),
      screenWidthPx: screenDimensions[0],
      screenHeightPx: screenDimensions[1],
      nearpointXYPx: getAppleCoordinatePosition(
        nearPointX,
        nearPointY
      ).toString(),
      trialStep: status.currentFunction,
      targetBool: stimulusPresent && !isInstructions,
      //@ts-ignore
      crosshairBool: crosshairPresent && !isInstructions,
    };
    //@ts-ignore
    cursorTracking.records.push(thisRecord);
  }
};
