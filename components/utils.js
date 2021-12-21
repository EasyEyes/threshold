import { is } from "express/lib/request";

// eslint-disable-next-line no-undef
export const debug = process.env.debug;
// export const debug = true;

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const signalingAlphabet = [...digits, ...letters].slice(
    0,
    possibleResponses.length
  );
  const signalingMap = {};
  possibleResponses.map((response, i) => {
    signalingMap[response] = signalingAlphabet[i];
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
 * Convert a (magnitude) value of visual degrees to pixels
 * @todo add tests
 * @param {Number} degrees Scalar, in degrees
 * @param {Object} displayOptions Parameters about the stimulus presentation
 * @param {Number} displayOptions.pixPerCm Pixels per centimeter on screen
 * @param {Number} displayOptions.viewingDistanceCm Distance (in cm) of participant from screen
 * @returns {Number}
 */
export const degreesToPixels = (degrees, displayOptions) => {
  if (Math.abs(degrees) > 90)
    throw new Error(
      "To large of an angle (ie > 90 deg) specified for this method of transfering between angles and pixels."
    );
  const radians = Math.abs(degrees) * (Math.PI / 180);
  const pixels =
    displayOptions.pixPerCm *
    displayOptions.viewingDistanceCm *
    Math.tan(radians);
  return pixels;
};
/**
 * Convert a (magnitude) of visual degrees to pixels
 * @todo add tests
 * @param {Number} pixels Scalar, in pixels
 * @param {Object} displayOptions Parameters about the stimulus presentation
 * @param {Number} displayOptions.pixPerCm Pixels per centimeter on screen
 * @param {Number} displayOptions.viewingDistanceCm Distance (in cm) of participant from screen
 * @returns {Number}
 */
export const pixelsToDegrees = (pixels, displayOptions) => {
  const radians = Math.atan(
    Math.abs(pixels) /
      displayOptions.pixPerCm /
      displayOptions.viewingDistanceCm
  );
  const degrees = radians / (Math.PI / 180);
  return degrees;
};

/**
 * Translation of MATLAB function of the same name
 * by Prof Denis Pelli, XYPixOfXYDeg.m
 * @param {Array} xyDegs List of [x,y] pairs, representing points x degrees right, and y degrees up, of fixation
 * @param {Object} displayOptions Parameters about the stimulus presentation
 * @param {Number} displayOptions.pixPerCm Pixels per centimeter on screen
 * @param {Number} displayOptions.viewingDistanceCm Distance (in cm) of participant from screen
 * @param {Object} displayOptions.nearPointXYDeg Near-point on screen, in degrees relative to fixation(?)
 * @param {Number} displayOptions.nearPointXYDeg.x Degrees along x-axis of near-point from fixation
 * @param {Number} displayOptions.nearPointXYDeg.y Degrees along y-axis of near-point from fixation
 * @param {Object} displayOptions.nearPointXYPix Near-point on screen, in pixels relative to origin(?)
 * @param {Number} displayOptions.nearPointXYPix.x Pixels along x-axis of near-point from origin
 * @param {Number} displayOptions.nearPointXYPix.y Pixels along y-axis of near-point from origin
 * @returns {Number[][]} Array of length=2 arrays of numbers, representing the same points in Pixel space
 */
export const XYPixsOfXYDegs = (xyDegs, displayOptions) => {
  if (xyDegs.length == 0) {
    return;
  } // Return if no points to transform
  // TODO verify displayOptions has the correct parameters
  const xyPixs = [];
  xyDegs.forEach((position) => {
    position[0] = position[0] - displayOptions.nearPointXYDeg.x;
    position[1] = position[1] - displayOptions.nearPointXYDeg.y;
    const rDeg = Math.sqrt(position[0] ** 2 + position[1] ** 2);
    const rPix =
      displayOptions.pixPerCm *
      displayOptions.viewingDistanceCm *
      Math.tan(rDeg * (Math.PI / 180));
    let pixelPosition = [];
    if (rDeg > 0) {
      pixelPosition = [
        (position[0] * rPix) / rDeg,
        (position[1] * rPix) / rDeg,
      ];
    } else {
      pixelPosition = [0, 0];
    }
    pixelPosition[0] = pixelPosition[0] + displayOptions.nearPointXYPix.x;
    pixelPosition[1] = pixelPosition[1] + displayOptions.nearPointXYPix.x;
    xyPixs.push(pixelPosition);
  });
  return xyPixs;
};

export const XYPixOfXYDeg = (xyDeg, displayOptions) => {
  // TODO verify displayOptions has the correct parameters
  const xyPix = [];
  xyDeg.forEach((position) => {
    position[0] = position[0] - displayOptions.nearPointXYDeg.x;
    position[1] = position[1] - displayOptions.nearPointXYDeg.y;
    const rDeg = Math.sqrt(position[0] ** 2 + position[1] ** 2);
    const rPix =
      displayOptions.pixPerCm *
      displayOptions.viewingDistanceCm *
      Math.tan(rDeg * (Math.PI / 180));
    let pixelPosition = [];
    if (rDeg > 0) {
      pixelPosition = [
        (position[0] * rPix) / rDeg,
        (position[1] * rPix) / rDeg,
      ];
    } else {
      pixelPosition = [0, 0];
    }
    pixelPosition[0] = pixelPosition[0] + displayOptions.nearPointXYPix.x;
    pixelPosition[1] = pixelPosition[1] + displayOptions.nearPointXYPix.x;
    xyPix.push(pixelPosition);
  });
  return xyPix;
};

/**
 * Add all the information about this trial to the data, for posterity
 * @param {PsychoJS.experiment} experiment Experiment object currently running
 * @param {Object} condition Parameters from the current staircase, as specified by the experimenter in experiment.csv
 * @param {Array} [exclude=[]] List of parameter names which should NOT be added to data
 */
export const addConditionToData = (experiment, condition, exclude = []) => {
  for (const [key, value] of Object.entries(condition)) {
    if (!exclude.includes(key)) experiment.addData(key, value);
  }
};

export const addTrialStaircaseSummariesToData = (currentLoop, psychoJS) => {
  psychoJS.experiment.addData(
    "staircaseName",
    currentLoop._currentStaircase._name
  );
  psychoJS.experiment.addData(
    "questMeanAtEndOfTrial",
    currentLoop._currentStaircase.mean()
  );
  psychoJS.experiment.addData(
    "questSDAtEndOfTrial",
    currentLoop._currentStaircase.sd()
  );
  psychoJS.experiment.addData(
    "questQuantileOfQuantileOrderAtEndOfTrial",
    currentLoop._currentStaircase.quantile(
      currentLoop._currentStaircase._jsQuest.quantileOrder
    )
  );
};

export const addBlockStaircaseSummariesToData = (loop, psychoJS) => {
  loop._staircases.forEach((staircase, i) => {
    psychoJS.experiment.addData("staircaseName", staircase._name);
    psychoJS.experiment.addData("questMeanAtEndOfTrialsLoop", staircase.mean());
    psychoJS.experiment.addData("questSDAtEndOfTrialsLoop", staircase.sd());
    psychoJS.experiment.addData(
      "questQuantileOfQuantileOrderAtEndOfTrialsLoop",
      staircase.quantile(staircase._jsQuest.quantileOrder)
    );
    if (i < loop._staircases.length - 1) psychoJS.experiment.nextEntry();
  });
};

/**
 *
 * @todo add tests
 * @param {*} level
 * @param {*} pixPerCm
 * @param {*} viewingDistanceCm
 * @returns
 */
export const spacingPixelsFromLevel = (level, pixPerCm, viewingDistanceCm) => {
  const spacingDeg = Math.pow(10, level);
  const spacingPx = degreesToPixels(spacingDeg, {
    pixPerCm: pixPerCm,
    viewingDistanceCm: viewingDistanceCm,
  });
  return spacingPx;
};

/**
 *
 * @todo add tests
 * @param {*} spacingPx
 * @param {*} pixPerCm
 * @param {*} viewingDistanceCm
 * @returns
 */
export const levelFromSpacingPixels = (
  spacingPx,
  pixPerCm,
  viewingDistanceCm
) => {
  const spacingDeg = pixelsToDegrees(spacingPx, {
    pixPerCm: pixPerCm,
    viewingDistanceCm: viewingDistanceCm,
  });
  const level = Math.log10(spacingDeg);
  return level;
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

export const levelFromTargetHeight = (
  targetHeightPx,
  spacingOverSizeRatio,
  pixPerCm,
  viewingDistanceCm
) => {
  const spacingPx = Math.round(targetHeightPx * spacingOverSizeRatio);
  const spacingDeg = pixelsToDegrees(spacingPx, {
    pixPerCm: pixPerCm,
    viewingDistanceCm: viewingDistanceCm,
  });
  const targetLevel = Math.log10(spacingDeg);
  return targetLevel;
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
    isInRect(smallRect.right, smallRect.top)
  );
};

const getUnionRect = (a, b) => {
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

const rectFromPixiRect = (pixiRect) => {
  // ASSUMES `center` aligned
  const lowerLeft = [
    pixiRect.x - pixiRect.width / 2,
    pixiRect.y - pixiRect.height / 2,
  ];
  const upperRight = [
    pixiRect.x + pixiRect.width / 2,
    pixiRect.y + pixiRect.height / 2,
  ];
  const newRect = [lowerLeft, upperRight];
  return newRect;
};

export class Rectangle {
  constructor(lowerLeft, upperRight, units = undefined) {
    this.units = units;
    this.left = lowerLeft[0];
    this.right = upperRight[0];
    this.bottom = lowerLeft[1];
    this.top = upperRight[1];

    this.height = this.top - this.bottom;
    this.width = this.left - this.right;
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
    const scaled = new Rectangle(lowerLeft, upperRight);
    return scaled;
  }
  offset(positionXY) {
    const lowerLeft = [this.left + positionXY[0], this.bottom + positionXY[1]];
    const upperRight = [this.right + positionXY[0], this.top + positionXY[1]];
    const offsetted = new Rectangle(lowerLeft, upperRight);
    return offsetted;
  }
  inset(x, y) {
    // aka shrink
    const lowerLeft = [this.left + x, this.bottom + y];
    const upperRight = [this.right - x, this.top - y];
    return new Rectangle(lowerLeft, upperRight);
  }
}

export const norm = (v) => {
  return Math.sqrt(
    v.map((x) => x ** 2).reduce((previous, current) => previous + current)
  );
};
