// eslint-disable-next-line no-undef
export const debug = process.env.debug;
// export const debug = true;

import {
  displayOptions,
  eyeTrackingStimulusRecords,
  fixationConfig,
  skipTrialOrBlock,
  status,
  viewingDistanceCm,
} from "./global";
import { psychoJS, psychojsMouse, to_px } from "./globalPsychoJS";
import { GLOSSARY } from "../parameters/glossary.ts";
import { MultiStairHandler } from "../psychojs/src/data/MultiStairHandler.js";
import { paramReader } from "../threshold";
import { getAppleCoordinatePosition } from "./eyeTrackingFacilitation";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function safeExecuteFunc(f, ...a) {
  if (f && typeof f === "function")
    if (a.length) return f(...a);
    else return f();
}

export function toFixedNumber(n, digits = 0) {
  let pow = Math.pow(10, digits);
  return Math.round(n * pow) / pow;
}

export function ifTrue(arr) {
  for (let a of arr) if (a) return true;
  return false;
}

export function fillNumberLength(n, length) {
  let str = n.toString();
  while (str.length < length) str = "0" + str;
  return str;
}

export const cleanFileName = (filename) => {
  // remove the path
  let name = filename.split("/").pop();
  // remove the extension
  name = name.split(".").shift();

  return name;
};

// export const colorRGBStringToHex = (rgbString) => {
//   let rgb = rgbString.match(/\d+/g);
//   let hex = "#";
//   for (let i = 0; i < 3; i++) {
//     hex += ("0" + parseInt(rgb[i]).toString(16)).slice(-2);
//   }
//   return hex;
// }

export const colorRGBASnippetToRGBA = (rgbaSnippet) => {
  // 0.8,0.8,0.8,1 to rgba(0.8 * 255,0.8 * 255,0.8 * 255,1)
  let rgba = rgbaSnippet.split(",");

  // if any value is undefined, replace with 1
  for (let i = 0; i < rgba.length; i++) if (rgba[i] === undefined) rgba[i] = 1;
  if (rgba.length === 3) rgba.push(1);

  let rgbaString = "rgba(";
  for (let i = 0; i < 3; i++) {
    rgbaString += parseFloat(rgba[i]) * 255 + ",";
  }
  rgbaString += rgba[3] + ")";

  return rgbaString;
};

export const colorRGBSnippetToRGB = (rgbSnippet) => {
  // 0.8,0.8,0.8 to rgb(0.8 * 255,0.8 * 255,0.8 * 255)
  let rgb = rgbSnippet.split(",").map((v) => parseFloat(v) * 255);
  return `rgb(${rgb.join(",")})`;
};

/**
 * Create a mapping between an arbitrary set of strings, ie `possibleResponses`,
 * and a set of ascii-supported keys, ie [0,1,...,9,A,B,...Z].
 *
 * Example: given the response options:
 *              ["#", "@", "≠"],
 *          will create the mapping:
 *              {1: "#", 2: "@", 3:"≠"},
 *          such that a participant can press the "1" key to respond "#", the "2" key to respond, or the "3" key to respond "≠"
 * @param {string[]} possibleResponses the (order-sensitive) array of actual responses; the keys of the produced mapping
 * @returns {Object.<string, number>} { response: ascii keycode }  mapping, to be used for simplified signaling of responses
 */
export const createSignalingMap = (possibleResponses) => {
  const zeroNum = 48;
  const nineNum = 57;
  const ANum = 65;
  const ZNum = 90;

  const digits = [...new Array(nineNum - zeroNum).keys()].map(
    (x) => x + zeroNum
  );
  const letters = [...new Array(ZNum - ANum).keys()].map((x) => x + ANum);
  const signalingCharacterSet = [...digits, ...letters].slice(
    0,
    possibleResponses.length
  );
  const signalingMap = {};
  possibleResponses.map((response, i) => {
    signalingMap[response] = signalingCharacterSet[i];
  });
  return signalingMap;
};

// https://stackoverflow.com/a/2450976
export const shuffle = (array) => {
  if (!array.length) return [];
  const a = [...array];
  var currentIndex = a.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    // TODO seed random
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [a[currentIndex], a[randomIndex]] = [a[randomIndex], a[currentIndex]];
  }

  return a;
};

export const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; // The maximum is exclusive and the minimum is inclusive
};

////
export const toShowCursor = () => {
  return (
    (skipTrialOrBlock.trialId == status.trial &&
      skipTrialOrBlock.blockId == status.block &&
      skipTrialOrBlock.skipTrial) ||
    (skipTrialOrBlock.blockId == status.block && skipTrialOrBlock.skipBlock)
  );
};

export const hideCursor = () => {
  document.body.classList.add("hide-cursor");
};

export const showCursor = () => {
  document.body.classList.remove("hide-cursor");
};

export const logger = (label, value) => {
  if (debug) console.log(`%c${label}`, "color: red", value);
};

export const loggerText = (text) => {
  if (debug) console.log(`%c${text}`, "color: red");
};

/**
 * DEPRECATED Should not be used. 1 dimensional deg -> pix conversion is undefined.
 * Convert a (magnitude) value of visual degrees to pixels
 * @todo add tests
 * @param {Number} degrees Scalar, in degrees
 * @returns {Number}
 */
export const degreesToPixels = (degrees, method = "x") => {
  switch (method) {
    case "x":
      return (
        XYPixOfXYDeg([degrees, 0], displayOptions)[0] -
        XYPixOfXYDeg([0, 0], displayOptions)[0]
      );
    case "y":
      return (
        XYPixOfXYDeg([0, degrees], displayOptions)[1] -
        XYPixOfXYDeg([0, 0], displayOptions)[1]
      );
    case "old":
    default:
      // If need be, use this gross, not fixation-relative method. Please don't use this if possible.
      if (Math.abs(degrees) > 90)
        throw new Error(
          "To large of an angle (ie > 90 deg) specified for this method of transferring between angles and pixels."
        );
      const radians = Math.abs(degrees) * (Math.PI / 180);
      const pixels =
        displayOptions.pixPerCm * viewingDistanceCm.current * Math.tan(radians);
      return pixels;
  }
};
/**
 * Convert a (magnitude) of visual degrees to pixels
 * @todo add tests
 * @param {Number} pixels Scalar, in pixels
 * @param {Object} displayOptions Parameters about the stimulus presentation
 * @param {Number} displayOptions.pixPerCm Pixels per centimeter on screen
 * @returns {Number}
 */
export const pixelsToDegrees = (pixels, displayOptions) => {
  const radians = Math.atan(
    Math.abs(pixels) / displayOptions.pixPerCm / viewingDistanceCm.current
  );
  const degrees = radians / (Math.PI / 180);
  return degrees;
};

/**
 *
 * @param {number[]} xyDeg
 * @param {object} displayOptions
 * @param {number} displayOptions.pixPerCm Pixels per centimeter on participant screen
 * @param {number[]} displayOptions.nearPointXYDeg Nearpoint of participant, in deg
 * @param {number[]} displayOptions.nearPointXYPix Nearpoint of participant, in px
 * @returns
 */
export const XYPixOfXYDeg = (xyDeg, displayOptions) => {
  if (
    !(
      displayOptions.nearPointXYDeg &&
      displayOptions.nearPointXYDeg.length == 2 &&
      displayOptions.nearPointXYPix &&
      displayOptions.nearPointXYPix.length == 2 &&
      displayOptions.pixPerCm
    )
  )
    throw "displayOptions doesn't have correct parameters";

  const degPosition = [];
  let pixelPosition = [];

  degPosition[0] = xyDeg[0] - displayOptions.nearPointXYDeg[0];
  degPosition[1] = xyDeg[1] - displayOptions.nearPointXYDeg[1];
  const rDeg = Math.sqrt(degPosition[0] ** 2 + degPosition[1] ** 2);

  if (rDeg > 89) {
    console.log("Angle too large! Trying again with a nearer colinear point.");
    // VERIFY that nearPoint is being considered properly, ie this is correct, rather than `rCompensation = 89 / Math.sqrt(xyDeg[0]**2 + xyDeg[1]**2)`
    const rCompensation = 89 / rDeg;
    const constrainedPoint = [
      rCompensation * degPosition[0] + displayOptions.nearPointXYDeg[0],
      rCompensation * degPosition[1] + displayOptions.nearPointXYDeg[1],
    ];
    return XYPixOfXYDeg(constrainedPoint, displayOptions);
  }
  const rPix =
    displayOptions.pixPerCm *
    viewingDistanceCm.current *
    Math.tan(rDeg * (Math.PI / 180));
  if (rDeg > 0) {
    pixelPosition = [
      (degPosition[0] * rPix) / rDeg,
      (degPosition[1] * rPix) / rDeg,
    ];
  } else {
    pixelPosition = [0, 0];
  }
  pixelPosition[0] =
    pixelPosition[0] + displayOptions.nearPointXYPix[0] + fixationConfig.pos[0];
  pixelPosition[1] =
    pixelPosition[1] + displayOptions.nearPointXYPix[1] + fixationConfig.pos[1];
  return pixelPosition;
};

/**
 * Convert position from (x,y) screen coordinate in pixels to deg
 * (relative to fixation). Coordinate increase right and up.
 * screen coordinates which increase down and right. The perspective
 * transformation is relative to location of near point, which is orthogonal
 * to line of sight. We typically put the target at the near point, but that
 * is not assumed in this routine.
 *
 * Translation of MATLAB function of the same name
 * by Prof Denis Pelli, XYPixOfXYDeg.m
 * @param {*} xyPix
 * @param {*} displayOptions
 */
export const XYDegOfXYPix = (xyPix, displayOptions) => {
  // eslint-disable-next-line no-prototype-builtins
  if (!displayOptions.hasOwnProperty("nearPointXYDeg"))
    throw "Please provide a 'nearPointXYDeg' property to displayOptions passed to XYDegOfXYPix";
  // eslint-disable-next-line no-prototype-builtins
  if (!displayOptions.hasOwnProperty("nearPointXYPix"))
    throw "Please provide a 'nearPointXYPix' property to displayOptions passed to XYDegOfXYPix";
  if (xyPix.length !== 2)
    throw "'xyPix' provided to XYDegOfXYPix must be of length 2, ie (x,y)";
  if (displayOptions.nearPointXYDeg.length !== 2)
    throw "'nearPointXYDeg' provided to XYDegOfXYPix must be of length 2, ie (x,y)";
  if (displayOptions.nearPointXYPix.length !== 2)
    throw "'nearPointXYPix' provided to XYDegOfXYPix must be of length 2, ie (x,y)";
  /*
    To convert screen position in pixels to ecc in deg, we first convert pix
    to be relative to the near point. We use trig to get the radial deg, and
    we use the direction of the pixel vector (re near point).
  */
  const nearPointOffsetXYPx = [
    xyPix[0] - displayOptions.nearPointXYPix[0] - fixationConfig.pos[0],
    xyPix[1] - displayOptions.nearPointXYPix[1] - fixationConfig.pos[1],
  ];
  const rPix = norm(nearPointOffsetXYPx);
  // ASSUMES equivalent to `rDeg = atan2d(rPix/o.pixPerCm, o.viewingDistanceCm)` in MATLAB
  const rRad = Math.atan2(
    rPix / displayOptions.pixPerCm,
    viewingDistanceCm.current
  );
  const rDeg = rRad * (180 / Math.PI);
  let xyDeg =
    rPix > 0
      ? [
          (nearPointOffsetXYPx[0] * rDeg) / rPix,
          (nearPointOffsetXYPx[1] * rDeg) / rPix,
        ]
      : [0, 0];
  xyDeg = [
    xyDeg[0] + displayOptions.nearPointXYDeg[0],
    xyDeg[1] + displayOptions.nearPointXYDeg[1],
  ];
  return xyDeg;
};

/**
 * Add all the information about this trial to the data, for posterity
 * @param {PsychoJS.experiment} experiment Experiment object currently running
 * @param {Object} condition Parameters from the current staircase, as specified by the experimenter in experiment.csv
 * @param {Array} [exclude=[]] List of parameter names which should NOT be added to data
 */
export const addConditionToData = (
  reader,
  conditionName,
  experiment,
  exclude = []
) => {
  experiment.addData("block_condition", conditionName);
  for (const parameter of Object.keys(GLOSSARY)) {
    if (!exclude.includes(parameter))
      experiment.addData(parameter, reader.read(parameter, conditionName));
  }
  experiment.addData(
    "nearpointXYPxPsychoJS",
    displayOptions.nearPointXYPix.toString()
  );
  experiment.addData(
    "nearpointXYPxAppleCoords",
    getAppleCoordinatePosition(...displayOptions.nearPointXYPix).toString()
  );
};

export const reportStartOfNewBlock = (blockNumer, experiment) => {
  experiment.addData("blockNumber", blockNumer);
  experiment.nextEntry();
};

export const addObjectItemsToData = (object, experiment) => {
  for (const [name, value] of Object.entries(object)) {
    experiment.addData(name, value);
  }
};

export const addTrialStaircaseSummariesToData = (currentLoop, psychoJS) => {
  // TODO What to do when data saving is rejected?
  if (currentLoop._currentStaircase) {
    psychoJS.experiment.addData(
      "staircaseName",
      currentLoop._currentStaircase._name
    );
    psychoJS.experiment.addData(
      "questMeanBeforeThisTrialResponse",
      // "questMeanAtEndOfTrial",
      currentLoop._currentStaircase.mean()
    );
    psychoJS.experiment.addData(
      "questSDBeforeThisTrialResponse",
      // "questSDAtEndOfTrial",
      currentLoop._currentStaircase.sd()
    );
    psychoJS.experiment.addData(
      "questQuantileOfQuantileOrderBeforeThisTrialResponse",
      // "questQuantileOfQuantileOrderAtEndOfTrial",
      currentLoop._currentStaircase.quantile(
        currentLoop._currentStaircase._jsQuest.quantileOrder
      )
    );
  } else {
    throw "undefined currentLoop._currentStaircase [add TRIAL data failed]";
  }
};

export const addBlockStaircaseSummariesToData = (
  loop,
  psychoJS,
  displayOptions
) => {
  if (loop instanceof MultiStairHandler) {
    loop._staircases.forEach((staircase, i) => {
      // TODO What to do when data saving is rejected?
      if (staircase) {
        psychoJS.experiment.addData("staircaseName", staircase._name);
        const BC = staircase._name;
        psychoJS.experiment.addData("block_condition", BC);
        if (BC) {
          const cName = paramReader.read("conditionName", BC);
          psychoJS.experiment.addData("conditionName", cName);
        }
        psychoJS.experiment.addData(
          "questMeanAtEndOfTrialsLoop",
          staircase.mean()
        );

        //=============report innerSpacingFromQuestMean.==========
        var innerSpacingFromQuestMean;
        if (loop._conditions[i]["thresholdParameter"] === "spacingDeg") {
          //Convert outer to inner spacing
          //eDeg = radial eccentricity in deg
          //innerSpacingDeg = inner spacing in deg
          //outerSpacingDeg = outer spacing in deg
          var innerSpacingDeg;
          var outerSpacingDeg = Math.pow(10, staircase.mean());
          var targetXDeg = loop._conditions[i]["targetEccentricityXDeg"];
          var targetYDeg = loop._conditions[i]["targetEccentricityYDeg"];
          var eDeg = Math.sqrt(
            targetXDeg * targetXDeg + targetYDeg * targetYDeg
          );
          switch (loop._conditions[i]["spacingSymmetry"]) {
            case "cortex":
              innerSpacingDeg = eDeg - (eDeg * eDeg) / (eDeg + outerSpacingDeg);
              break;
            case "retina":
              innerSpacingDeg = outerSpacingDeg;
              break;
            case "screen":
              //Simplify Calculation by pretending we're on positive X axis. We imagine a target at (e,0) deg.
              var targetDeg = eDeg;
              var outerFlankerDeg = eDeg + outerSpacingDeg;
              //Using just X, convert deg to pixels.
              var targetPx = XYPixOfXYDeg([targetDeg, 0], displayOptions);
              var outerFlankerPx = XYPixOfXYDeg(
                [outerFlankerDeg, 0],
                displayOptions
              );
              var outerSpacingPx = outerFlankerPx[0] - targetPx[0];
              var innerSpacingPx = outerSpacingPx;
              var innerFlankerPx = targetPx[0] - innerSpacingPx;
              //Using just X, convert pixels to deg
              var innerFlankerDeg = XYDegOfXYPix(
                [innerFlankerPx, 0],
                displayOptions
              );
              innerSpacingDeg = targetDeg - innerFlankerDeg[0];
              break;
          }
        } else innerSpacingDeg = Math.pow(10, staircase.mean());
        psychoJS.experiment.addData(
          "innerSpacingThresholdDeg",
          innerSpacingDeg
        );
        //========================================================
        psychoJS.experiment.addData("questSDAtEndOfTrialsLoop", staircase.sd());
        psychoJS.experiment.addData(
          "questQuantileOfQuantileOrderAtEndOfTrialsLoop",
          staircase.quantile(staircase._jsQuest.quantileOrder)
        );
        psychoJS.experiment.addData("addBlockStaircaseSummariesToData", true);
        if (i < loop._staircases.length - 1) psychoJS.experiment.nextEntry();
      } else {
        throw "undefined staircase [add BLOCK data failed]";
      }
    });
  } else {
    // TODO anything to do for "reading"? Is QUEST in use in this case?
    const c = loop?._snapshots?.at(-1);
    const BC = c["block_condition"];
    const cName = c["conditionName"];
    psychoJS.experiment.addData("block_condition", BC);
    psychoJS.experiment.addData("conditionName", cName);
    psychoJS.experiment.addData("addBlockStaircaseSummariesToData", true);
    psychoJS.experiment.nextEntry();
  }
};

/**
 * Add information about the general testing apparatus, ie the physical
 * set-up of the computer and participant.
 *
 */
export const addApparatusInfoToData = (
  displayOptions,
  rc,
  psychoJS,
  stimulusParameters = undefined
) => {
  const pxPerCm = Math.round(displayOptions.pixPerCm * 100) / 100;
  psychoJS.experiment.addData("viewingDistanceCm", viewingDistanceCm.current);
  psychoJS.experiment.addData(
    "viewingDistanceActualCm",
    getViewingDistancedCm(
      viewingDistanceCm.current,
      displayOptions,
      rc.windowHeightPx.value
    )
  );
  psychoJS.experiment.addData("pxPerCm", pxPerCm);
  psychoJS.experiment.addData("screenWidthPx", rc.windowWidthPx.value);
  psychoJS.experiment.addData("screenHeightPx", rc.windowHeightPx.value);
  // targetSpacingPx
};

/**
 * Element-wise check of whether two arrays are equal
 * @see https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript/16430730
 * @param {any[]} a
 * @param {any[]} b
 * @returns {boolean}
 */
export const arraysEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const log = (x, base) => {
  return Math.log(x) / Math.log(base);
};

export const getPixPerCm = (rc) => {
  if (!rc.screenWidthCm)
    console.warn("[Screen Width] Using arbitrary screen width. Enable RC.");
  const windowWidthCm = rc.screenWidthCm ? rc.screenWidthCm.value : 30;
  const windowWidthPx = rc.displayWidthPx.value;
  const pixPerCm = windowWidthPx / windowWidthCm;
  return pixPerCm;
};

export const getViewingDistanceCm = (rc, reader, condition = "") => {
  if (!rc.viewingDistanceCm)
    console.warn(
      "[Viewing Distance] Using arbitrary viewing distance. Enable RC."
    );
  let viewingDistanceDesiredCm;
  if (!condition) {
    viewingDistanceDesiredCm = reader.read("viewingDistanceDesiredCm")[0];
  } else if (!isNaN(condition)) {
    viewingDistanceDesiredCm = reader.read(
      "viewingDistanceDesiredCm",
      Number(condition)
    )[0];
  } else {
    viewingDistanceDesiredCm = reader.read(
      "viewingDistanceDesiredCm",
      condition
    );
  }
  const viewingDistanceCm = rc.viewingDistanceCm
    ? rc.viewingDistanceCm.value
    : viewingDistanceDesiredCm;
  return viewingDistanceCm;
};

export const rotate = (l) => {
  const rotated = [...l];
  rotated.push(rotated.shift());
  return rotated;
};

/** 
  @author translated by ajb 12-15-21, from original by dhb 3-5-97
  @param {number} x x-coordinate
  @param {number} y y-coordinate
  @param {object} rect
  @param {number} rect.left smaller (left) x value of the rectangle
  @param {number} rect.right bigger (right) x value of the rectangle
  @param {number} rect.top bigger (top) y value of the rectangle
  @param {number} rect.bottom smaller (bottom) y value of the rectangle
*/
export const isInRect = (x, y, rect) => {
  if (x >= rect.left && x <= rect.right && y >= rect.bottom && y <= rect.top)
    return true;
  return false;
};

/** 
  @author translated by ajb 12-15-21, from original by dgp 7-9-15
  @param {object} smallRect Smaller rectangle, contained by bigRect if this returns true
  @param {number} smallRect.left smaller (left) x value of the rectangle
  @param {number} smallRect.right bigger (right) x value of the rectangle
  @param {number} smallRect.top bigger (top) y value of the rectangle
  @param {number} smallRect.bottom smaller (bottom) y value of the rectangle
  @param {object} bigRect Bigger rectangle, contains smallRect if this returns true
  @param {number} bigRect.left smaller (left) x value of the rectangle
  @param {number} bigRect.right bigger (right) x value of the rectangle
  @param {number} bigRect.top bigger (top) y value of the rectangle
  @param {number} bigRect.bottom smaller (bottom) y value of the rectangle
  @returns {boolean} Whether or not smallRect is entirely contained by bigRect
*/
export const isRectInRect = (smallRect, bigRect) => {
  return (
    isInRect(smallRect.left, smallRect.bottom, bigRect) &&
    isInRect(smallRect.right, smallRect.top, bigRect)
  );
};

export const getUnionRect = (a, b) => {
  // a = [[x1,y1],[x2,y2]]
  // b = [[x1,y1],[x2,y2]]
  /* 
  function newRect = UnionRect(a,b)
  % newRect = UnionRect(a,b)
  % 
  % Returns the smallest rect that contains the two rects a and b.
  % Also see PsychRects.

  % 7/10/96 dgp  Wrote it.
  % 8/5/96 dgp check rect size.

  if size(a,2)~=4 || size(b,2)~=4
      error('Wrong size rect argument. Usage:  newRect=UnionRect(a,b)');
  end
  newRect=a;
  newRect(RectTop)=min(a(RectTop),b(RectTop));
  newRect(RectBottom)=max(a(RectBottom),b(RectBottom));
  newRect(RectLeft)=min(a(RectLeft),b(RectLeft));
  newRect(RectRight)=max(a(RectRight),b(RectRight));
  */
  if (rectIsEmpty(a)) return b;
  if (rectIsEmpty(b)) return a;
  const lowerLeft = [Math.min(a[0][0], b[0][0]), Math.min(a[0][1], b[0][1])];
  const upperRight = [Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1])];
  const newRect = [lowerLeft, upperRight];
  return newRect;
};

const rectIsEmpty = (rect) => {
  if (rect[0][0] === rect[1][0] && rect[0][1] === rect[1][1]) return true;
  return false;
};

export const rectFromPixiRect = (pixiRect) => {
  // // ASSUMES `center` aligned
  let lowerLeft, upperRight;
  lowerLeft = [
    pixiRect.x - pixiRect.width / 2,
    pixiRect.y - pixiRect.height / 2,
  ];
  upperRight = [
    pixiRect.x + pixiRect.width / 2,
    pixiRect.y + pixiRect.height / 2,
  ];
  const newRect = [lowerLeft, upperRight];
  return newRect;
};

export class Rectangle {
  constructor(
    lowerLeft,
    upperRight,
    units = undefined,
    characterSet = undefined,
    centers = undefined,
    ascentToDescent = undefined
  ) {
    this.units = units;
    this.left = lowerLeft[0];
    this.right = upperRight[0];
    this.bottom = lowerLeft[1];
    this.top = upperRight[1];

    this.height = this.top - this.bottom;
    this.width = this.right - this.left;

    this.characterSet = characterSet;
    this.centers = centers;
    this.ascentToDescent = ascentToDescent;
  }
  getUnits() {
    return this.units;
  }
  getWidth() {
    return this.width;
  }
  getHeight() {
    return this.height;
  }
  toArray() {
    const lowerLeft = [this.left, this.bottom];
    const upperRight = [this.right, this.top];
    return [lowerLeft, upperRight];
  }
  scale(scalar) {
    const lowerLeft = [this.left * scalar, this.bottom * scalar];
    const upperRight = [this.right * scalar, this.top * scalar];
    let newCenters = this.centers;
    if (this.centers) {
      newCenters = {};
      Object.entries(this.centers).forEach(
        ([key, xy]) => (newCenters[key] = [xy[0] * scalar, xy[1] * scalar])
      );
    }
    const scaled = new Rectangle(
      lowerLeft,
      upperRight,
      this.units,
      this.characterSet,
      newCenters
    );
    return scaled;
  }
  offset(positionXY) {
    const lowerLeft = [this.left + positionXY[0], this.bottom + positionXY[1]];
    const upperRight = [this.right + positionXY[0], this.top + positionXY[1]];
    const offsetted = new Rectangle(
      lowerLeft,
      upperRight,
      this.units,
      this.characterSet,
      this.centers
    );
    return offsetted;
  }
  inset(x, y) {
    // aka shrink
    const lowerLeft = [this.left + x, this.bottom + y];
    const upperRight = [this.right - x, this.top - y];
    return new Rectangle(
      lowerLeft,
      upperRight,
      this.units,
      this.characterSet,
      this.centers
    );
  }
}

export const norm = (v) => {
  return Math.sqrt(
    v.map((x) => x ** 2).reduce((previous, current) => previous + current)
  );
};

export const getTripletCharacters = (charset) => {
  return sampleWithoutReplacement(charset, 3);
};

export const sampleWithoutReplacement = (population, sampleSize) => {
  const elements = shuffle([...population]);
  const samples = [];
  for (const sampleN of [...new Array(sampleSize).keys()]) {
    samples.push(elements.filter((x) => !samples.includes(x))[0]);
  }
  return samples;
};

/**
 * Return a sample randomly, independently drawn from population
 * @param {Any[]} population Array representing the population to be sampled
 * @param {Number} sampleSize Number of times to sample, ie length of the return value
 * @returns
 */
export const sampleWithReplacement = (population, sampleSize) => {
  sampleSize = Math.round(sampleSize);
  return [...new Array(sampleSize).keys()].map(
    (x) => population[Math.floor(population.length * Math.random())]
  );
};

export const getCharSetBaselineOffsetPosition = (
  XYPix,
  normalizedCharacterSetRect,
  heightPx
) => {
  const descent = normalizedCharacterSetRect.descent;
  const ascent = normalizedCharacterSetRect.ascent;
  const yOffset = descent * heightPx;
  // const yOffset = descent * (heightPx * (descent/(descent + ascent)));
  return [XYPix[0], XYPix[1] + yOffset];
};

/**
 * Survey all the values for a given parameter.
 * Returns an object mapping each block_condition to its `parameter` value.
 * @param {ParamReader} reader Parameter reader initialized for this experiment
 * @param {string} parameter The parameter being queried
 * @returns Object enumerating the value of `parameter` for each `block_condition`
 */
export const surveyParameter = (reader, parameter) => {
  const conditionIds = reader.block_conditions;
  const parameterValues = reader.read(parameter, "__ALL_BLOCKS__");
  // Create a mapping of {block_condition -> value}
  // see: https://www.geeksforgeeks.org/how-to-create-an-object-from-two-arrays-in-javascript/
  return Object.assign(
    ...conditionIds.map((conditionId, i) => ({
      [conditionId]: parameterValues[i],
    }))
  );
};

export const validateRectPoints = ([lowerLeft, upperRight]) => {
  if (lowerLeft[0] > upperRight[0])
    console.error(
      "INVALID RECT x of lowerLeft is greater than x of upperRight"
    );
  if (lowerLeft[1] > upperRight[1])
    console.error(
      "INVALID RECT y of lowerLeft is greater than y of upperRight"
    );
};

/**
 * Given two XY positions, return the X and Y displacements
 * @param {[number, number]} a
 * @param {[number, number]} b
 * @returns {[number, number]}
 */
export const displacementBetweenXY = (a, b) => {
  const xDisplacement = a[0] - b[0];
  const yDisplacement = a[1] - b[1];
  return [xDisplacement, yDisplacement];
};

export const psychojsUnitsFromWindowUnits = (
  windowXYPx,
  windowDimensions,
  fixationXYPx
) => {
  // Convert form the origin being at the top left of the screen (pos x is right, pos y is down)...
  const [screenX, screenY] = windowXYPx;
  // ... to the center of the screen (pos x is right, pos y is down).
  const [centeredX, centeredY] = [
    screenX - windowDimensions[0] / 2,
    -(screenY - windowDimensions[1] / 2),
  ];
  // And then find the position relative to fixation.
  const [xPx, yPx] = [centeredX - fixationXYPx[0], centeredY - fixationXYPx[1]];
  return [xPx, yPx];
};

/**
 * Get an array of values, length=numberOfValues, evenly spaced by intervalSize and centered at 0.
 * eg
 *  getEvenlySpacedValues(4, 25) => [-50, -25, 25, 50]
 *  getEvenlySpacedValues(3, 25) => [-25, 0, 25]
 * @param {Number} numberOfValues Length of returned array
 * @param {Number} intervalSize Distance between values in returned array
 * @returns {Number[]}
 */
export const getEvenlySpacedValues = (numberOfValues, intervalSize) => {
  numberOfValues = Math.floor(numberOfValues);
  const shape = [...new Array(numberOfValues).keys()];
  const values = [];
  for (const i of shape) {
    if (numberOfValues % 2 === 0) {
      const a = numberOfValues / 2;
      if (i < a) {
        values.push(-intervalSize / 2 - (a - 1 - i) * intervalSize);
      } else {
        values.push(intervalSize / 2 + (i - a) * intervalSize);
      }
    } else {
      const a = Math.floor(numberOfValues / 2);
      values.push((i - a) * intervalSize);
    }
  }
  return values;
};

/**
 * Given an (increasing) interval (ie [a,b] given a < b), return an array of values
 * representing maximally, evenly spaced points.
 * eg
 *  getValuesEvenlySpacedWithinInterval(4, [1,4]) => [1,2,3,4]
 *  getValuesEvenlySpacedWithinInterval(3, [0,1]) => [0,0.5,1]
 * @param {Number} numberOfValues The number of points to spread within the interval
 * @param {Number[]} interval Increasing array of length=2, the (inclusive) range within which to place points
 * @returns {Number[]}
 */
export const getValuesEvenlySpacedWithinInterval = (
  numberOfValues,
  interval
) => {
  if (interval.length !== 2)
    throw "Must provide a 2D interval (array of length=2)";
  if (!(interval[0] < interval[1]))
    throw "Interval must be increasing (interval[0] > interval[1])";
  const intervalRange = Math.abs(interval[1] - interval[0]);
  const intervalSize = intervalRange / numberOfValues;
  const intervalCenter = (interval[0] + interval[1]) / 2;
  const offsets = getEvenlySpacedValues(numberOfValues, intervalSize);
  return offsets.map((o) => o + intervalCenter);
};

/**
 * Given a list of conditions, return a new list of conditions for which
 * each condition of targetKind===whichTargetKind appears numDuplications times.
 * @param {Object[]} conditions Array of psychojs conditions
 * @param {Number} numDuplications Duplicate selected conditions this many times
 * @param {String} whichTargetKind Duplicate all conditions of this type
 * @returns {Object[]} New condition list, populated with duplicated conditions
 */
export const duplicateConditionsOfTargetKind = (
  conditions,
  numDuplications,
  whichTargetKind
) => {
  numDuplications = Math.floor(numDuplications);
  const newConditions = [];
  conditions.forEach((c) => {
    if (c.targetKind === whichTargetKind) {
      for (let i = 1; i <= numDuplications; i++) {
        const duplicated = Object.assign(
          { _duplicatedConditionCardinal: i },
          c
        );
        newConditions.push(duplicated);
      }
    } else {
      newConditions.push(c);
    }
  });
  return newConditions;
};

export const trueCenter = (textStim) => {
  const bb = textStim.getBoundingBox(true);
  return [bb.x, bb.y];
};

export const offsetToTrueCenter = (textStim, nominal = undefined) => {
  if (typeof nominal === "undefined") nominal = textStim.getPos();
  const xy = trueCenter(textStim);
  const offsets = nominal.map((z, i) => z - xy[i]);
  const shifted = nominal.map((n, i) => n + offsets[i]);
  return shifted;
};

export const centerAt = async (textStim, nominalPos) => {
  let tries = 50;
  textStim.setPos(nominalPos);
  while (
    JSON.stringify(trueCenter(textStim)) !== JSON.stringify(nominalPos) &&
    tries > 0
  ) {
    tries -= 1;
    textStim.setPos(offsetToTrueCenter(textStim, nominalPos));
  }
  // Just in case, we can do no worse than .setPos(nominal)
  if (JSON.stringify(trueCenter(textStim)) !== JSON.stringify(nominalPos))
    textStim.setPos(nominalPos);
};

/**
 * Add an event listener to save the experiment data when the pare closes
 * (literally, when the pages loses visibility, for best coverage of browsers,
 * ie mobile browsers)
 * @param {*} experiment
 */
export const saveDataOnWindowClose = (experiment) => {
  // https://www.igvita.com/2015/11/20/dont-lose-user-and-app-state-use-page-visibility/
  window.addEventListener("visibilitychange", (e) => {
    if (document.visibilityState === "hidden") {
      console.log(
        " experiment.extraInfo['dataSaved']",
        experiment.extraInfo["dataSaved"]
      );
      experiment.save({ sync: true });
      if (eyeTrackingStimulusRecords.length)
        experiment.saveCSV(eyeTrackingStimulusRecords);
    }
  });
  window.addEventListener("beforeunload", (e) => {
    experiment.save({ sync: true });
    if (eyeTrackingStimulusRecords.length)
      experiment.saveCSV(eyeTrackingStimulusRecords);
    e.preventDefault();
    return null;
  });
};

export const tand = (deg) => Math.tan((deg * Math.PI) / 180);
export const atand = (x) => (Math.atan(x) * 180) / Math.PI;

export const getCursorLocation = () => {
  // Analog to [cX, cY] (see _takeFixationClick), as determined by psychojs
  return to_px(psychojsMouse.getPos(), "height", psychoJS.window, true);
};

export const cursorNearFixation = (cX, cY) => {
  const [pX, pY] = getCursorLocation();
  const x = cX ?? pX;
  const y = cY ?? pY;
  const cursorDistanceFromFixation = Math.hypot(
    x - fixationConfig.pos[0],
    y - fixationConfig.pos[1]
  );
  const cursorIsNearFixation =
    cursorDistanceFromFixation <= fixationConfig.markingFixationHotSpotRadiusPx;
  return cursorIsNearFixation;
};

export const getViewingDistancedCm = (vCm, displayOptions, screenHeightPx) => {
  const pxPerCm = Math.round(displayOptions.pixPerCm * 100) / 100;
  // using the formula: dCm = sqrt(hCm^2 - vCm^2)
  // where vCm is the vertical distance, the camera is 0.5 cm above the screen
  // so vCm = screen height / 2 + 0.5 m
  return Math.sqrt(vCm ** 2 - (screenHeightPx / (2 * pxPerCm) + 0.5) ** 2);
};
