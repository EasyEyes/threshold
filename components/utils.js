// export const debug = process.env.debug;
export const debug = true;

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
  console.log("signaling map: ", signalingMap);
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
 * @param {Array} xyDeg List of [x,y] pairs, representing points x degrees right, and y degrees up, of fixation
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
export const XYPixOfXYDeg = (xyDeg, displayOptions) => {
  if (xyDeg.length == 0) {
    return;
  } // Return if no points to transform
  // TODO verify displayOptions has the correct parameters
  const xyPix = [];
  xyDeg.forEach((position) => {
    position[0] = position[0] - displayOptions.nearPointXYDeg.x;
    position[1] = position[1] - displayOptions.nearPointXYDeg.y;
    const rDeg = Math.sqrt(position[0] ** 2 + position[1] ** 2);
    const rPix = degreesToPixels(rDeg, displayOptions);
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
