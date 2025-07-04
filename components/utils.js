// eslint-disable-next-line no-undef
export const debug = process.env.debug;
// export const debug = true;

import {
  displayOptions,
  eyeTrackingStimulusRecords,
  fixationConfig,
  skipTrialOrBlock,
  status,
  targetEccentricityDeg,
  viewingDistanceCm,
} from "./global";
import { psychoJS, psychojsMouse, to_px } from "./globalPsychoJS";
import { GLOSSARY } from "../parameters/glossary.ts";
import { MultiStairHandler } from "../psychojs/src/data/MultiStairHandler.js";
import { paramReader } from "../threshold";
import { getAppleCoordinatePosition } from "./eyeTrackingFacilitation";
import { pxToPt } from "./readingAddons";
import { warning } from "./errorHandling";
import { Screens } from "./multiple-displays/globals.ts";
import { XYDegOfPx, XYPxOfDeg } from "./multiple-displays/utils.ts";
import { useWordDigitBool } from "./readPhrases";
import { logWebGLInfoToFormspree } from "./letter";

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
    (x) => x + zeroNum,
  );
  const letters = [...new Array(ZNum - ANum).keys()].map((x) => x + ANum);
  const signalingCharacterSet = [...digits, ...letters].slice(
    0,
    possibleResponses.length,
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
// TODO rename this, ie shouldSkip()
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

export const logIf = (label, bool) => {
  if (debug && bool) console.log(`%c${label}`, "color: red; font-style: bold;");
};

export const loggerText = (text) => {
  if (debug) console.log(`%c${text}`, "color: red");
};

export const degreesToPixels = (
  degrees,
  centeredAtDeg = [0, 0],
  direction = "horizontal",
  useRealFixation = true,
) => {
  const [x, y] = centeredAtDeg;
  const h = degrees / 2;
  if (direction === "horizontal") {
    const fromX = x - h;
    const toX = x + h;
    return Math.abs(XYPxOfDeg(0, [fromX, y])[0] - XYPxOfDeg(0, [toX, y])[0]);
  } else {
    // direction === "vertical"
    const fromY = y - h;
    const toY = y + h;
    return Math.abs(XYPxOfDeg(0, [x, fromY])[1] - XYPxOfDeg(0, [x, toY])[1]);
  }
};

export const XYPixOfXYDeg_OLD = (xyDeg, useRealFixationXY = true) => {
  if (
    !(
      Screens[0].nearestPointXYZDeg &&
      Screens[0].nearestPointXYZDeg.length == 2 &&
      Screens[0].nearestPointXYZPx &&
      Screens[0].nearestPointXYZPx.length == 2 &&
      Screens[0].pxPerCm
    )
  )
    throw "displayOptions doesn't have correct parameters";

  const degPosition = [];
  let pixelPosition = [];

  degPosition[0] = xyDeg[0] - Screens[0].nearestPointXYZDeg[0];
  degPosition[1] = xyDeg[1] - Screens[0].nearestPointXYZDeg[1];
  const rDeg = Math.sqrt(degPosition[0] ** 2 + degPosition[1] ** 2);

  if (rDeg > 89) {
    console.log("Angle too large! Trying again with a nearer colinear point.");
    // VERIFY that nearPoint is being considered properly, ie this is correct, rather than `rCompensation = 89 / Math.sqrt(xyDeg[0]**2 + xyDeg[1]**2)`
    const rCompensation = 89 / rDeg;
    const constrainedPoint = [
      rCompensation * degPosition[0] + Screens[0].nearestPointXYZDeg[0],
      rCompensation * degPosition[1] + Screens[0].nearestPointXYZDeg[1],
    ];
    return XYPixOfXYDeg_OLD(constrainedPoint, displayOptions);
  }
  const rPix =
    Screens[0].pxPerCm *
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
  const fixationXY = useRealFixationXY
    ? Screens[0].fixationConfig.pos
    : Screens[0].fixationConfig.nominalPos;
  pixelPosition[0] =
    pixelPosition[0] + Screens[0].nearestPointXYZPx[0] + fixationXY[0];
  pixelPosition[1] =
    pixelPosition[1] + Screens[0].nearestPointXYZPx[1] + fixationXY[1];
  return pixelPosition;
};

const isSinglePoint = (l) =>
  Array.isArray(l) && l.length === 2 && isFinite(l[0]) && isFinite(l[1]);
const isMultiplePoints = (l) => Array.isArray(l) && l.every(isSinglePoint);

/**
    % xyPx=XYPxOfDeg(o,xyDeg);
    % Assuming one display screen, convert an (x,y) visual coordinate (deg
    % relative to fixation) to an (x,y) screen coordinate (pixels re lower left
    % corner of screen).
    // EasyEyes pixel origin is center of screen, increasing up and to the right.
    % Screen coordinates extend over the whole screen plane.
    % xyPx, o.fixationXYPx, and o.nearestPointXYPx all lie in the screen plane,
    % and can be off-screen.
    %
    % "Nearest point" refers to the point in the screen plane that is closest
    % to the nearer eye. This avoids confusion with the optometric use of "near
    % point" to refer to the shortest viewing distance at which objects are in
    % focus.
    %
    % DYNAMIC. o.nearestPointXYDeg is recomputed every time, in case
    % o.fixationXYPx (or o.nearestPointXYPx) changed. EasyEyes tracks
    % o.fixationXYPx and o.viewingDistanceCm dynamically, i.e. from frame to
    % frame, and may soon also dynamically track lateral head position to
    % dynamically compute o.nearestPointXYPx. Thus XYPxOfDeg adapts to dynamic
    % o.fixationXYPx (a proxy for eye position) and (actual)
    % o.viewingDistanceCm, and will also track o.nearestPointXYPx when it
    % becomes dynamic.
    %
    % DeltaXYPxOfDeg computes the perspective transformation in the simplest
    % way, relative to the screen's "nearest point", which is orthogonal to the
    % line of sight to the nearer eye.
    %
    % xyDeg must have two columns, for x and y. It can have more than one row,
    % to process many points at once, one per row. xyPx will have the same
    % shape.
    %
    % The "o" struct contains the following fields:
    % o.pxPerCm = static, a stable property of the screen
    % o.viewingDistanceCm = dynamic
    % o.fixationXYPx = dynamic
    % o.nearestPointXYPx = now static, but may become dynamic
    % o.appleScreenCoordinatesBool=false
    %
    % WHERE IS THE NEAREST POINT? No assumption is made about the relative
    % positions of xyPx, o.fixationXYPx, and o.nearestPointXYPx in the screen
    % plane. In practice, experiments with only one target eccentricity often
    % put the target at the nearest point, and those with several target
    % eccentricities often put fixation at the nearest point.
    %
*/
export const xyPxOfDeg = (xyDeg, useRealFixationXY = true) => {
  // screen or displayOptions or "o", .nearestPointXYPx, .fixationXYPx, .pxPerCm, .viewingDistanceCm
  const pxPerCm = Screens[0].pxPerCm;
  // const fixationXYPx = useRealFixationXY
  //   ? fixationConfig.pos
  //   : fixationConfig.nominalPos;
  const viewingDistance = viewingDistanceCm.current;

  /**
    % Convert deg to px, both relative to the screen's nearest point. The
    % geometry is simplest in this case because the point, the nearest point,
    % and the nearer eye form a right angle. deltaXYDeg and deltaXYPx are the
    % input and output vectors.
  */
  const deltaXYPxOfDeg = (deltaXYDeg) => {
    // % First convert length in deg to length in px
    const rDeg = norm(deltaXYDeg);
    const rPx = pxPerCm * viewingDistance * tand(rDeg);
    if (rDeg > 89.99999) {
      console.log(
        "Angle too large! Trying again with a nearer colinear point.",
      );
      const rCompensation = 89.9999 / rDeg;
      const constrainedPoint = deltaXYDeg.map((z) => z * rCompensation);
      return deltaXYPxOfDeg(constrainedPoint);
    }
    // % Create px vector in the same direction as the deg vector. Match length.
    if (rDeg <= 0) return [0, 0];
    return [...deltaXYDeg.map((z) => (z * rPx) / rDeg)];
  };

  if (!isSinglePoint(xyDeg) && !isMultiplePoints(xyDeg))
    throw "xyDeg must be an array of 2 numbers, or an array of such arrays";

  // % Update o.nearestPointXYdeg because o.fixationXYPx may have changed.
  Screens[0].nearestPointXYZDeg = xyDegOfPx(Screens[0].nearestPointXYZPx, true);

  const getXYPx = (xyDeg) => {
    const deltaXYDeg = xyDeg.map(
      (z, i) => z - Screens[0].nearestPointXYZDeg[i],
    );
    const deltaXYPx = deltaXYPxOfDeg(deltaXYDeg);
    return [...deltaXYPx.map((z, i) => z + Screens[0].nearestPointXYZPx[i])];
  };
  if (isSinglePoint(xyDeg)) return getXYPx(xyDeg);
  return [...xyDeg.map(getXYPx)];
};

/**
  % Assuming one display screen, convert an (x,y) screen coordinate (pixels
  % re lower left corner of screen) to an (x,y) visual coordinate (deg
  % relative to fixation). Screen coordinates extend over the whole screen
  % plane. xyPx, o.fixationXYPx, and o.nearestPointXYPx all lie in the screen
  % plane, and can be off-screen.
  %
  % "Nearest point" refers to the point in the screen plane that is closest
  % to the nearer eye. This avoids confusion with the optometric use of "near
  % point" to refer to the shortest viewing distance at which objects are in
  % focus.
  %
  % DYNAMIC. o.nearestPointXYDeg is recomputed every time, in case
  % o.fixationXYPx (or o.nearestPointXYPx) changed. EasyEyes tracks
  % o.fixationXYPx and o.viewingDistanceCm dynamically, i.e. from frame to
  % frame, and may soon also dynamically track lateral head position to
  % dynamically compute o.nearestPointXYPx. Thus XYPxOfDeg adapts to dynamic
  % o.fixationXYPx (a proxy for eye position) and (actual)
  % o.viewingDistanceCm, and will also track o.nearestPointXYPx when it
  % becomes dynamic.
  %
  % DeltaXYDegOfPx computes the perspective transformation in the simplest
  % way, relative to the screen's "nearest point", which is orthogonal to the
  % line of sight to the nearer eye.
  %
  % xyPx must have two columns, for x and y. It can have more than one row,
  % to process many points at once, one per row. xyDeg will have the same
  % shape.
  % The "o" struct contains the following fields:
  % o.pxPerCm = static, a stable property of the screen
  % o.viewingDistanceCm = dynamic
  % o.fixationXYPx = dynamic
  % o.nearestPointXYPx = now static, but may become dynamic
  % o.appleScreenCoordinatesBool=false
  %
  % WHERE IS THE NEAREST POINT? No assumption is made about the relative
  % positions of xyPx, o.fixationXYPx, and o.nearestPointXYPx in the screen
  % plane. In practice, experiments with only one target eccentricity often
  % put the target at the nearest point, and those with several target
  % eccentricities often put fixation at the nearest point.
  %
*/
export const xyDegOfPx = (xyPx, useRealFixationXY = true) => {
  // screen or displayOptions or "o", .nearestPointXYPx, .fixationXYPx, .pxPerCm, .viewingDistanceCm
  const pxPerCm = Screens[0].pxPerCm;
  const fixationXYPx = useRealFixationXY
    ? Screens[0].fixationConfig.pos
    : Screens[0].fixationConfig.nominalPos;
  const viewingDistance = viewingDistanceCm.current;
  if (!isSinglePoint(xyPx) && !isMultiplePoints(xyPx))
    throw "xyPx must be an array of 2 numbers, or an array of such arrays";
  if (!isSinglePoint(Screens[0].nearestPointXYZPx))
    throw "nearPointXYPix must have length 2.";

  /**
    % Convert a screen coordinate deltaXYPx re nearest point to a deg
    % coordinate deltaXYDeg re nearest point.
  */
  const deltaXYDegOfPx = (deltaXYPx) => {
    const rPx = norm(deltaXYPx);
    const rRad = Math.atan2(rPx / pxPerCm, viewingDistance);
    const rDeg = rRad * (180 / Math.PI);
    if (rPx <= 0) return [0, 0];
    return [...deltaXYPx.map((z) => (z * rDeg) / rPx)];
  };

  // % Update o.nearestPointXYDeg in case o.fixationXYPx (or o.nearestPointXYPx) changed.
  Screens[0].nearestPointXYZDeg = [
    ...deltaXYDegOfPx(
      fixationXYPx.map((z, i) => z - Screens[0].nearestPointXYZPx[i]),
    ).map((z) => -1 * z),
  ];
  /**
    % To convert screen x,y position in pixels to x,y ecc in deg, we first
    % compute position (in px) relative to the screen's nearest point. That's
    % an x,y vector, which we convert from px to deg. Finally, we add
    % o.nearestPointXYDeg.
   */
  const getXYDeg = (xyPx) => {
    const deltaXYPx = xyPx.map((z, i) => z - Screens[0].nearestPointXYZPx[i]);
    const deltaXYDeg = deltaXYDegOfPx(deltaXYPx);
    return [...deltaXYDeg.map((z, i) => z + Screens[0].nearestPointXYZDeg[i])];
  };
  if (isSinglePoint(xyPx)) return getXYDeg(xyPx);
  return [...xyDeg.map(getXYDeg)];
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
 */
export const XYDegOfXYPix_OLD = (xyPix, useRealFixationXY = true) => {
  // eslint-disable-next-line no-prototype-builtins
  if (!Screens[0].hasOwnProperty("nearestPointXYZDeg"))
    throw "Please provide a 'nearPointXYDeg' property to displayOptions passed to XYDegOfXYPix";
  // eslint-disable-next-line no-prototype-builtins
  if (!Screens[0].hasOwnProperty("nearestPointXYZPx"))
    throw "Please provide a 'nearPointXYPix' property to displayOptions passed to XYDegOfXYPix";
  if (xyPix.length !== 2)
    throw "'xyPix' provided to XYDegOfXYPix must be of length 2, ie (x,y)";
  if (Screens[0].nearestPointXYZDeg.length !== 2)
    throw "'nearPointXYDeg' provided to XYDegOfXYPix must be of length 2, ie (x,y)";
  if (Screens[0].nearestPointXYZPx.length !== 2)
    throw "'nearPointXYPix' provided to XYDegOfXYPix must be of length 2, ie (x,y)";
  /*
    To convert screen position in pixels to ecc in deg, we first convert pix
    to be relative to the near point. We use trig to get the radial deg, and
    we use the direction of the pixel vector (re near point).
  */
  // useRealFixationXY = dynamic fixation; use the crosshair's position, as it moves around the screen
  const fixationXY = useRealFixationXY
    ? Screens[0].fixationConfig.pos
    : Screens[0].fixationConfig.nominalPos;
  const nearPointOffsetXYPx = [
    xyPix[0] - Screens[0].nearestPointXYZPx[0] - fixationXY[0],
    xyPix[1] - Screens[0].nearestPointXYZPx[1] - fixationXY[1],
  ];
  const rPix = norm(nearPointOffsetXYPx);
  // ASSUMES equivalent to `rDeg = atan2d(rPix/o.pixPerCm, o.viewingDistanceCm)` in MATLAB
  const rRad = Math.atan2(
    rPix / displayOptions.pixPerCm,
    viewingDistanceCm.current,
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
    xyDeg[0] + Screens[0].nearestPointXYZDeg[0],
    xyDeg[1] + Screens[0].nearestPointXYZDeg[1],
  ];
  return xyDeg;
};

export const _testPxDegConversion = () => {
  const degPoints = [
    [-5, -5],
    [0, 5],
    [5, 5],
    [5, 0],
    [5, -5],
    [0, -5],
    [0, 0],
  ];
  for (let i = 0; i < degPoints.length; i++) {
    const xyDeg = degPoints[i];
    const oldPxActual = XYPixOfXYDeg_OLD(xyDeg, true);
    const oldPxNominal = XYPixOfXYDeg_OLD(xyDeg, false);
    const newPxActual = xyPxOfDeg(xyDeg, true);
    const newPxNominal = xyPxOfDeg(xyDeg, false);
    const oldDegActual = XYDegOfXYPix_OLD(oldPxActual, true);
    const oldDegNominal = XYDegOfXYPix_OLD(oldPxActual, false);
    const newDegActual = xyDegOfPx(newPxActual, true);
    const newDegNominal = xyDegOfPx(newPxNominal, false);
    const latestDegActual = XYDegOfPx(0, newPxActual, true);
    const latestDegNominal = XYDegOfPx(0, newPxNominal, false);
    const latestPxActual = XYPxOfDeg(0, xyDeg, true);
    const latestPxNominal = XYPxOfDeg(0, xyDeg, false);

    const same = (l1, l2) => l1.every((x, i) => x === l2[i]);
    const compare = [
      // [oldPxActual, newPxActual],
      // [oldPxNominal, newPxNominal],
      // [oldDegActual, newDegActual],
      // [oldDegNominal, newDegNominal],
      [oldDegActual, latestDegActual],
      [oldDegNominal, latestDegNominal],
      [oldPxActual, latestPxActual],
      [oldPxNominal, latestPxNominal],
    ];
    const labels = ["pxActual", "pxNominal", "degActual", "degNominal"];
    compare.forEach((values, i) => {
      if (!same(values[0], values[1]))
        console.error(
          `Incorrect output from px to deg conversions. ${labels[i]}: ${values[0]}(old) vs ${values[1]}(new)`,
        );
    });
  }
};

export const readTargetTask = (BC) => {
  if (!BC) return "";
  const targetTask = paramReader.read("targetTask", BC);
  if (targetTask === "" && areQuestionAndAnswerParametersPresent(BC))
    return "questionAndAnswer";
  return targetTask;
};

export const areQuestionAndAnswerParametersPresent = (BC) => {
  if (!BC) return false;

  //check for questionAndAnswer01 ... questionAndAnswer99
  //check for questionAnswer01 ... questionAnswer99

  for (let i = 1; i <= 99; i++) {
    const qName = `questionAndAnswer${fillNumberLength(i, 2)}`;
    if (paramReader.has(qName)) {
      const question = paramReader.read(qName, BC);
      if (question && question.length) return true;
    }
  }

  for (let i = 1; i <= 99; i++) {
    const qName = `questionAnswer${fillNumberLength(i, 2)}`;
    if (paramReader.has(qName)) {
      const question = paramReader.read(qName, BC);
      if (question && question.length) return true;
    }
  }
  return false;
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
  exclude = ["calibrateTrackDistanceCheckCm"],
) => {
  experiment.addData("block_condition", conditionName);
  for (const parameter of Object.keys(GLOSSARY)) {
    if (!exclude.includes(parameter) && GLOSSARY[parameter].type !== "obsolete")
      experiment.addData(parameter, reader.read(parameter, conditionName));
  }

  let calibrateTrackDistanceCheckCm = [];
  calibrateTrackDistanceCheckCm.push(
    ...reader.read("calibrateTrackDistanceCheckCm")[0].split(","),
  );
  calibrateTrackDistanceCheckCm = calibrateTrackDistanceCheckCm.map((r) =>
    parseFloat(r),
  );
  experiment.addData(
    "calibrateTrackDistanceCheckCm",
    calibrateTrackDistanceCheckCm,
  );
  experiment.addData(
    "nearpointXYPxPsychoJS",
    Screens[0].nearestPointXYZPx.toString(),
  );
  experiment.addData(
    "nearpointXYPxAppleCoords",
    getAppleCoordinatePosition(...Screens[0].nearestPointXYZPx).toString(),
  );
  useWordDigitBool.current = getUseWordDigitBool(
    reader,
    status.block_condition,
  );
  experiment.addData("useWordDigitBool", useWordDigitBool.current);

  const screenRectDeg = getScreenRectDeg();
  experiment.addData("screenBoundingRectDeg", screenRectDeg.toString());
};

export const reportStartOfNewBlock = (blockNumer, experiment) => {
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
      currentLoop._currentStaircase._name,
    );
    psychoJS.experiment.addData(
      "questMeanBeforeThisTrialResponse",
      // "questMeanAtEndOfTrial",
      currentLoop._currentStaircase.mean(),
    );
    psychoJS.experiment.addData(
      "questSDBeforeThisTrialResponse",
      // "questSDAtEndOfTrial",
      currentLoop._currentStaircase.sd(),
    );
    psychoJS.experiment.addData(
      "questQuantileOfQuantileOrderBeforeThisTrialResponse",
      // "questQuantileOfQuantileOrderAtEndOfTrial",
      currentLoop._currentStaircase.quantile(
        currentLoop._currentStaircase._jsQuest.quantileOrder,
      ),
    );
  } else {
    throw "undefined currentLoop._currentStaircase [add TRIAL data failed]";
  }
};

export const addBlockStaircaseSummariesToData = (
  loop,
  psychoJS,
  displayOptions,
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
          staircase.mean(),
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
            targetXDeg * targetXDeg + targetYDeg * targetYDeg,
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
              var targetPx = XYPxOfDeg(0, [targetDeg, 0]);
              var outerFlankerPx = XYPxOfDeg(0, [outerFlankerDeg, 0]);
              var outerSpacingPx = outerFlankerPx[0] - targetPx[0];
              var innerSpacingPx = outerSpacingPx;
              var innerFlankerPx = targetPx[0] - innerSpacingPx;
              //Using just X, convert pixels to deg
              var innerFlankerDeg = XYDegOfPx(0, [innerFlankerPx, 0]);
              innerSpacingDeg = targetDeg - innerFlankerDeg[0];
              break;
          }
        } else innerSpacingDeg = Math.pow(10, staircase.mean());
        psychoJS.experiment.addData(
          "innerSpacingThresholdDeg",
          innerSpacingDeg,
        );
        //========================================================
        psychoJS.experiment.addData("questSDAtEndOfTrialsLoop", staircase.sd());
        psychoJS.experiment.addData(
          "questQuantileOfQuantileOrderAtEndOfTrialsLoop",
          staircase.quantile(staircase._jsQuest.quantileOrder),
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
  stimulusParameters = undefined,
) => {
  const pxPerCm = Math.round(displayOptions.pxPerCm * 100) / 100;
  psychoJS.experiment.addData("viewingDistanceCm", viewingDistanceCm.current);
  psychoJS.experiment.addData(
    "viewingDistanceActualCm",
    getViewingDistancedCm(
      viewingDistanceCm.current,
      displayOptions,
      rc.windowHeightPx.value,
    ),
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
  let viewingDistanceDesiredCm;
  if (!condition) {
    viewingDistanceDesiredCm = reader.read("viewingDistanceDesiredCm")[0];
  } else if (!isNaN(condition)) {
    viewingDistanceDesiredCm = reader.read(
      "viewingDistanceDesiredCm",
      Number(condition),
    )[0];
  } else {
    viewingDistanceDesiredCm = reader.read(
      "viewingDistanceDesiredCm",
      condition,
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

// TRUE if partial overlap, FALSE iff no overlap at all
// SEE
export const isRectTouchingRect = (rectA, rectB) => {
  const toTheLeft = rectA.right < rectB.left;
  const toTheRight = rectA.left > rectB.right;
  const above = rectA.bottom > rectB.top;
  const below = rectA.top < rectB.bottom;
  const touching = !(toTheLeft || toTheRight || above || below);
  return touching;
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
  if (Array.isArray(a) && Array.isArray(b)) {
    const lowerLeft = [Math.min(a[0][0], b[0][0]), Math.min(a[0][1], b[0][1])];
    const upperRight = [Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1])];
    const newRect = [lowerLeft, upperRight];
    return newRect;
  } else {
    // Rectangle class
    const lowerLeft = [Math.min(a.left, b.left), Math.min(a.bottom, b.bottom)];
    const upperRight = [Math.max(a.right, b.right), Math.max(a.top, b.top)];
    return new Rectangle(lowerLeft, upperRight);
  }
};

const rectIsEmpty = (rect) => {
  if (Array.isArray(rect)) {
    if (rect[0][0] === rect[1][0] && rect[0][1] === rect[1][1]) return true;
    return false;
  } else {
    // Rectangle class
    if (rect.left === rect.right && rect.bottom === rect.top) return true;
    return false;
  }
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
  const newRect = new Rectangle(lowerLeft, upperRight, "pix");
  return newRect;
};

/**
 * Clips rectB so that it fits entirely inside rectA.
 *
 * @param {Object} rectA - The "bounding" rectangle
 * @param {Object} rectB - The rectangle to be clipped
 * @returns {Object|null} The clipped rectangle as Rectangle or null if no intersection.
 */
export const clipRectangle = (rectA, rectB) => {
  // Compute the intersection coordinates
  const llx = Math.max(rectA[0][0], rectB[0][0]);
  const lly = Math.max(rectA[0][1], rectB[0][1]);
  const urx = Math.min(rectA[1][0], rectB[1][0]);
  const ury = Math.min(rectA[1][1], rectB[1][1]);

  // Check if the rectangles actually overlap
  if (urx <= llx || ury <= lly) {
    // No valid intersection
    return null;
  }

  // Return the intersection rectangle
  return new Rectangle([llx, lly], [urx, ury]);
};

export class Rectangle {
  constructor(lowerLeft, upperRight, units = undefined) {
    this.units = units;
    this.left = lowerLeft[0];
    this.right = upperRight[0];
    this.bottom = lowerLeft[1];
    this.top = upperRight[1];

    this.height = this.top - this.bottom;
    this.width = this.right - this.left;
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

  toString(nDigits = 4, toPt = false) {
    let extremes = [this.left, this.bottom, this.right, this.top];
    if (toPt && this.units !== "pt") {
      extremes = extremes.map(pxToPt);
    }
    let [l, b, r, t] = extremes.map((x) => toFixedNumber(x, nDigits));
    const lowerLeft = `(${l}, ${b})`;
    const upperRight = `(${r}, ${t})`;
    return `[${lowerLeft}, ${upperRight}]`;
  }

  scale(scalar) {
    const height = Math.abs(this.top - this.bottom);
    const width = Math.abs(this.right - this.left);
    const center = [this.left + width / 2, this.bottom + height / 2];
    const [h2, w2] = [(height * scalar) / 2, (width * scalar) / 2];
    const lowerLeft = [center[0] - w2, center[1] - h2];
    const upperRight = [center[0] + w2, center[1] + h2];
    const scaled = new Rectangle(lowerLeft, upperRight, this.units);
    return scaled;
  }

  offset(positionXY) {
    const lowerLeft = [this.left + positionXY[0], this.bottom + positionXY[1]];
    const upperRight = [this.right + positionXY[0], this.top + positionXY[1]];
    const offsetted = new Rectangle(lowerLeft, upperRight, this.units);
    return offsetted;
  }

  inset(x, y) {
    // aka shrink
    const lowerLeft = [this.left + x, this.bottom + y];
    const upperRight = [this.right - x, this.top - y];
    return new Rectangle(lowerLeft, upperRight, this.units);
  }

  centerAt(positionXY) {
    const [centerX, centerY] = positionXY;
    const width = this.right - this.left;
    const height = this.top - this.bottom;
    const lowerLeft = [centerX - width / 2, centerY - height / 2];
    const upperRight = [centerX + width / 2, centerY + height / 2];
    return new Rectangle(lowerLeft, upperRight, this.units);
  }

  /**
   * Draws the rectangle on a given CanvasRenderingContext2D.
   * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
   * @param {Object} [options] - Optional styling options.
   * @param {string} [options.strokeStyle='black'] - The color of the rectangle's border.
   * @param {string} [options.fillStyle='rgba(0,0,0,0)'] - The fill color of the rectangle.
   * @param {number} [options.lineWidth=1] - The width of the border line.
   */
  drawOnCanvas(ctx, options = {}) {
    const {
      strokeStyle = "blue",
      fillStyle = "rgba(0, 0, 0, 0)",
      lineWidth = 1,
      baselinePxFromPenY = undefined,
      baselineColor = "blue",
    } = options;

    // Save the current state of the canvas
    ctx.save();

    // Translate the origin to the center of the canvas

    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    ctx.translate(canvasWidth / 2, canvasHeight / 2);

    // Invert the Y-axis to have it increase upwards
    ctx.scale(1, -1);

    // Optional: Clear the canvas (if you want to clear before drawing)
    // Uncomment the following line if you want to clear the canvas each time
    // ctx.clearRect(-canvasWidth / 2, -canvasHeight / 2, canvasWidth, canvasHeight);

    // Begin drawing the rectangle
    ctx.beginPath();

    // Calculate the top-left corner based on the new origin
    // Since the origin is at the center, left and bottom are relative to (0,0)
    const rectX = this.left;
    const rectY = this.bottom; // After Y-axis inversion

    ctx.rect(rectX, rectY, this.width, this.height);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();

    ctx.beginPath();
    // add the center of the rectangle
    // Coordinates for the center of the "X"
    const centerX = this.left + this.width / 2;
    const centerY = this.bottom + this.height / 2;

    // Length of the lines making the "X"
    const size = 7; // Adjust this value to control the size of the "X"

    // Draw the first diagonal line of the "X"
    ctx.moveTo(centerX - size, centerY - size);
    ctx.lineTo(centerX + size, centerY + size);

    // Draw the second diagonal line of the "X"
    ctx.moveTo(centerX - size, centerY + size);
    ctx.lineTo(centerX + size, centerY - size);

    // Apply the stroke style
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();

    // draw baseline at topLeft - baselinePxFromPenY in green
    if (baselinePxFromPenY) {
      // Set dashed line style
      ctx.setLineDash([8, 4]); // [8, 4] means 8px dash followed by 4px space
      ctx.moveTo(this.left, this.top - baselinePxFromPenY);
      ctx.lineTo(this.right, this.top - baselinePxFromPenY);
      ctx.strokeStyle = baselineColor;
      ctx.stroke();
      // Reset line dash to solid for subsequent strokes
      ctx.setLineDash([]);
    }

    // Restore the canvas to its original state
    ctx.restore();
  }

  drawPointsOnCanvas(ctx, points, options = {}) {
    const { strokeStyle = "black", fillStyle = "black", radius = 2 } = options;
    ctx.save();
    ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.scale(1, -1);
    ctx.beginPath();
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    points.forEach((point) => {
      ctx.moveTo(point[0], point[1]);
      ctx.arc(point[0], point[1], radius, 0, 2 * Math.PI);
    });
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  debug(durationSec = 2) {
    this.drawOnCanvas(createDisposableCanvas(durationSec), {
      strokeStyle: "red",
    });
  }
}

export class CharacterSetRect extends Rectangle {
  constructor(
    lowerLeft,
    upperRight,
    units = undefined,
    characterSet = undefined,
    centers = undefined,
    ascentToDescent = undefined,
    xHeight = undefined,
    spacing = undefined,
    characterSetHeight = undefined,
    characterOffsetPxPerFontSize = undefined,
    typographicFactor = 1,
    ascentPxPerFontSize = undefined,
    meanWidthPxPerFontSize = undefined,
  ) {
    super(lowerLeft, upperRight, units);

    this.characterSet = characterSet;
    this.centers = centers;
    this.ascentToDescent = ascentToDescent;
    this.xHeight = xHeight;
    this.spacing = spacing;
    this.characterSetHeight = characterSetHeight;
    this.characterOffsetPxPerFontSize = characterOffsetPxPerFontSize;
    this.typographicFactor = typographicFactor;
  }
  scale(scalar) {
    let newCenters = structuredClone(this.centers);
    const scaledRect = super.scale(scalar);
    const [lowerLeft, upperRight] = scaledRect.toArray();
    if (this.centers) {
      newCenters = {};
      Object.entries(this.centers).forEach(
        ([key, xy]) => (newCenters[key] = [xy[0] * scalar, xy[1] * scalar]),
      );
    }
    const scaled = new CharacterSetRect(
      lowerLeft,
      upperRight,
      this.units,
      this.characterSet,
      newCenters,
      this.ascentToDescent,
      this.xHeightPt,
      this.spacingPt,
    );
    return scaled;
  }
  offset(positionXY) {
    const lowerLeft = [this.left + positionXY[0], this.bottom + positionXY[1]];
    const upperRight = [this.right + positionXY[0], this.top + positionXY[1]];
    // TODO should we be offsetting centers too? I think yes
    const offsetted = new CharacterSetRect(
      lowerLeft,
      upperRight,
      this.units,
      this.characterSet,
      this.centers,
      this.ascentToDescent,
      this.xHeightPt,
      this.spacingPt,
    );
    return offsetted;
  }
  inset(x, y) {
    // aka shrink
    const lowerLeft = [this.left + x, this.bottom + y];
    const upperRight = [this.right - x, this.top - y];
    // TODO should we be insetting centers too? I think yes
    return new CharacterSetRect(
      lowerLeft,
      upperRight,
      this.units,
      this.characterSet,
      this.centers,
      this.ascentToDescent,
      this.xHeightPt,
      this.spacingPt,
    );
  }
}

export const norm = (v) => {
  return Math.sqrt(
    v.map((x) => x ** 2).reduce((previous, current) => previous + current),
  );
};

export const getTripletCharacters = (charset) => {
  return sampleWithoutReplacement(charset, 3);
};

export const sampleWithoutReplacement = (
  population,
  sampleSize,
  inOrder = false,
) => {
  const elements = shuffle([...population]);
  const samples = [];
  for (const sampleN of [...new Array(sampleSize).keys()]) {
    samples.push(elements.filter((x) => !samples.includes(x))[0]);
  }
  if (!inOrder) return samples;
  return [...population].filter((x) => samples.includes(x));
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
    (x) => population[Math.floor(population.length * Math.random())],
  );
};

export const getCharSetBaselineOffsetPosition = (
  XYPix,
  normalizedCharacterSetRect,
  heightPx,
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
    })),
  );
};

export const validateRectPoints = ([lowerLeft, upperRight]) => {
  if (lowerLeft[0] > upperRight[0])
    console.error(
      "INVALID RECT x of lowerLeft is greater than x of upperRight",
    );
  if (lowerLeft[1] > upperRight[1])
    console.error(
      "INVALID RECT y of lowerLeft is greater than y of upperRight",
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
  fixationXYPx,
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
  interval,
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
        experiment.extraInfo["dataSaved"],
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
    x - Screens[0].fixationConfig.pos[0],
    y - Screens[0].fixationConfig.pos[1],
  );
  const cursorIsNearFixation =
    cursorDistanceFromFixation <=
    Screens[0].fixationConfig.markingFixationHotSpotRadiusPx;
  return cursorIsNearFixation;
};

export const getViewingDistancedCm = (vCm, displayOptions, screenHeightPx) => {
  const pxPerCm = Math.round(displayOptions.pxPerCm * 100) / 100;
  // using the formula: dCm = sqrt(hCm^2 - vCm^2)
  // where vCm is the vertical distance, the camera is 0.5 cm above the screen
  // so vCm = screen height / 2 + 0.5 m
  return Math.sqrt(vCm ** 2 - (screenHeightPx / (2 * pxPerCm) + 0.5) ** 2);
};

/**
 * @source https://stackoverflow.com/questions/27082377/get-number-of-decimal-places-with-javascript
 */
const countDecimals = (value) => {
  let text = value.toString();
  // verify if number 0.000005 is represented as "5e-6"
  if (text.indexOf("e-") > -1) {
    let [base, trail] = text.split("e-");
    let deg = parseInt(trail, 10);
    return deg;
  }
  // count decimals for number in representation like "0.123456"
  if (Math.floor(value) !== value) {
    return value.toString().split(".")[1].length || 0;
  }
  return 0;
};

/**
 * Get the greatest common divisor of two floats
 * @param {number} a float
 * @param {number} b float
 * @returns
 */
export const getGCD = (a, b) => {
  const decimalsA = countDecimals(a);
  const decimalsB = countDecimals(b);
  if (decimalsA === 0 && decimalsB === 0) return gcd(a, b);
  const maxDecimals = Math.max(decimalsA, decimalsB);
  const intA = Math.floor(a * 10 ** maxDecimals);
  const intB = Math.floor(b * 10 ** maxDecimals);
  return gcd(intA, intB) / maxDecimals;
};

/**
 * Get the greatest common divisor of two integers
 * @param {number} a int
 * @param {number} b int
 * @returns
 */
const gcd = (a, b) => {
  if (a < b) return gcd(b, a);
  if (a % b === 0) return b;
  return gcd(a % b, b);
};

/**
 * Determine whether a blockOrCondition string represents a block, eg "1" rather than "1_1"
 * @param {str} blockOrConditionLabel
 * @returns bool
 */
export const isBlockLabel = (blockOrConditionLabel) => {
  return !isNaN(blockOrConditionLabel);
};

/**
 * Determine whether a blockOrCondition string represents a condition, eg "1_1" rather than "1"
 * @param {str} blockOrConditionLabel
 * @returns bool
 */
export const isConditionLabel = (blockOrConditionLabel) => {
  return !isBlockLabel(blockOrConditionLabel);
};

/**
 * Get a single value for a parameter, when you may have a block label or a condition label
 * ie reader.read(param, condition) or reader.read(param, block)[0]
 * @param {string} paramName
 * @param {string} blockOrConditionLabel
 * @returns any
 */
export const getParamValueForBlockOrCondition = (
  paramName,
  blockOrConditionLabel,
) => {
  // Block, just return first parameter value
  if (isBlockLabel(blockOrConditionLabel)) {
    return paramReader.read(paramName, blockOrConditionLabel)[0];
  }
  // Condition
  return paramReader.read(paramName, blockOrConditionLabel);
};

// Arbitrary? not well defined
export const pxScalar = (degScalar) => {
  const h = degScalar / 2;
  return Math.abs(XYPxOfDeg(0, [-h, 0])[0] - XYPxOfDeg(0, [h, 0])[0]);
};

// temp for debugging a bug of losing CSV files on Pavlovia
// send form data to an email.
export const sendEmailForDebugging = async (formData) => {
  // $.ajax({
  //   url: "https://formspree.io/f/meqyldkz",
  //   method: "POST",
  //   data: formData,
  //   dataType: "json",
  // });

  try {
    //use fetch instead of jQuery
    await fetch("https://formspree.io/f/mqkrdveg", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
  } catch (e) {
    warning(`Failed to post to formspree. formData: ${formData}, error: ${e}`);
  }
  return false;
};

export const getPairs = (l) => {
  return l.flatMap((v, i) => l.slice(i + 1).map((w) => [v, w]));
};

export const distance = (xy1, xy2) => {
  return Math.sqrt(Math.pow(xy1[0] - xy2[0], 2) + Math.pow(xy1[1] - xy2[1], 2));
};

export const closeEnough = (n1, n2, t = 0.01) => {
  return Math.abs(n1 - n2) <= t;
};

export const setTargetEccentricityDeg = (reader, blockOrCondition) => {
  let x = reader.read("targetEccentricityXDeg", blockOrCondition);
  let y = reader.read("targetEccentricityYDeg", blockOrCondition);
  if (Array.isArray(x)) x = x[0];
  if (Array.isArray(y)) y = y[0];
  targetEccentricityDeg.x = x;
  targetEccentricityDeg.y = y;
};

export function formatTimestamp(timestamp) {
  // Convert the timestamp to a Date object
  const date = timestamp;
  //.toDate(); // called when recieved from firebase

  // Format the day, month, and year
  const day = String(date.getDate()).padStart(2, "0"); // Adds leading zero if needed
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = date.getFullYear();

  // Format the date as DD.MM.YYYY
  return `${year}.${month}.${day}`;
}

export const createTimingBars = () => {
  const canvas = document.createElement("canvas");
  canvas.id = "timingBarsCanvas";
  document.body.appendChild(canvas);

  const barWidth = 2 * 96; // 2 inches * 96 pixels per inch
  const barHeight = 1.75 * 96; // 1.25 inches * 96 pixels per inch

  // Set the canvas to cover the entire screen
  canvas.style.position = "fixed";
  canvas.style.left = 0;
  canvas.style.bottom = 0;
  canvas.style.zIndex = 9999999999; // Ensure it is on top
  canvas.style.pointerEvents = "none"; // Allow clicks to pass through
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  //make invisible
  canvas.style.display = "none";
  //wirte letter for each box
  const ctx = canvas.getContext("2d");
  ctx.font = "25px Arial";
  ctx.fillStyle = "black";
  ctx.fillText("Gap", barWidth + 10, barHeight);
  ctx.fillText(
    "Fixation",
    barWidth + 10,
    (canvas.height - 4 * barHeight) / 3 + 2 * barHeight,
  );
  ctx.fillText(
    "Target Request",
    barWidth + 10,
    2 * ((canvas.height - 4 * barHeight) / 3) + 3 * barHeight,
  );
  ctx.fillText("Target", barWidth + 10, canvas.height);
};

export const drawTimingBars = (showTimingBarsBool, type, present) => {
  // Create or select the canvas element
  const canvas = document.getElementById("timingBarsCanvas");
  if (!canvas) return;
  if (!showTimingBarsBool) {
    canvas.style.display = "none"; // Hide the canvas
    return;
  }

  //make visible
  canvas.style.display = "block";

  const ctx = canvas.getContext("2d");

  // Clear the area where the bars will be drawn
  const barWidth = 2 * 96; // 2 inches * 96 pixels per inch
  const barHeight = 1.75 * 96; // 1.25 inches * 96 pixels per inch
  const gap = (canvas.height - 4 * barHeight) / 3;

  // Calculate the position for the bars in the lower-left corner
  const xPos = 0;
  const yPosBottom = canvas.height - barHeight;
  const yPosTop = 0;
  const yPosMiddleTop = yPosTop + barHeight + gap;
  const yPosMiddleBottom = yPosMiddleTop + barHeight + gap;

  if (type === "fixation") {
    ctx.fillStyle = present ? "white" : "black";
    ctx.fillRect(xPos, yPosMiddleTop, barWidth, barHeight);
  } else if (type === "target") {
    ctx.fillStyle = present ? "white" : "black";
    ctx.fillRect(xPos, yPosBottom, barWidth, barHeight);
  } else if (type === "gap") {
    ctx.fillStyle = present ? "white" : "black";
    ctx.fillRect(xPos, yPosTop, barWidth, barHeight);
  } else if (type === "TargetRequest") {
    ctx.fillStyle = present ? "white" : "black";
    ctx.fillRect(xPos, yPosMiddleBottom, barWidth, barHeight);
  }
};

export const removeTimingBars = () => {
  const canvas = document.getElementById("timingBarsCanvas");
  if (canvas) {
    canvas.remove(); // Remove the canvas from the document
  }
};

export const getUseWordDigitBool = (reader, blockOrConditionLabel) => {
  const useDigit = (characterSet, digits) =>
    characterSet.every((c) => digits.includes(c));
  if (isBlockLabel(blockOrConditionLabel)) {
    const digitses = reader
      .read("digits", blockOrConditionLabel)
      .map((d) => String(d).split(""));
    const characterSets = reader
      .read("fontCharacterSet", blockOrConditionLabel)
      .map((cs) => String(cs).split(""));
    return digitses.every((digits, i) => useDigit(characterSets[i], digits));
  }
  const BC = blockOrConditionLabel;
  const digits = String(reader.read("digits", BC)).split("");
  const characterSet = String(reader.read("fontCharacterSet", BC)).split("");
  return useDigit(characterSet, digits);
};

const extractWebGLVersion = (versionString) => {
  if (!versionString) return null;
  //convert to lowercase
  versionString = versionString.toLowerCase();
  const webglINdex = versionString.indexOf("webgl");
  if (webglINdex === -1) return null;

  let index = webglINdex + "webgl".length;

  //skip any whitspaces
  while (index < versionString.length && /\s/.test(versionString[index])) {
    index++;
  }

  //read numeric until we hit non-numeric
  let numberStr = "";
  while (index < versionString.length) {
    const char = versionString[index];
    if (
      (char >= "0" && char <= "9") ||
      (char === "." && !numberStr.includes("."))
    ) {
      numberStr += char;
      index++;
    } else {
      break;
    }
  }

  if (numberStr === "") return null;

  const floatVal = parseFloat(numberStr);
  if (isNaN(floatVal)) return null;

  return floatVal;
};

export const createDisposableCanvas = (lifespanSec = 2) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.style.position = "fixed";
  canvas.style.left = 0;
  canvas.style.top = 0;
  canvas.style.pointerEvents = "none";
  const id = `2d-canvas-${performance.now()}`;
  canvas.id = id;
  document.body.appendChild(canvas);
  const screenSize = psychoJS.window._size;
  canvas.width = screenSize[0];
  canvas.height = screenSize[1];
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (lifespanSec && isFinite(lifespanSec)) {
    const lifespanMs = lifespanSec * 1000;
    setTimeout(() => {
      document.body.removeChild(canvas);
    }, lifespanMs);
  }
  return ctx;
};

export const runDiagnosisReport = () => {
  function perfObserver(list, observer) {
    const entries = list.getEntries();
    for (const entry of entries) {
      console.log("long task entry: ", entry);
      psychoJS.experiment.addData("longTask", JSON.stringify(entry));
      psychoJS.experiment.addData("longTaskDurationSec", entry.duration / 1000);
      psychoJS.experiment.addData("longTaskStartSec", entry.startTime / 1000);
    }
    // observer.disconnect();
  }
  const observer = new PerformanceObserver(perfObserver);
  observer.observe({ entryTypes: ["longtask"] });

  const webGLReport = {
    WebGL_Version: null,
    GLSL_Version: "",
    WebGL_Vendor: "",
    WebGL_Renderer: "",
    Unmasked_Vendor: "",
    Unmasked_Renderer: "",
    maxTextureSize: "",
    maxViewportSize: "",
    deviceMemory: "",
  };

  //info about gpu and webgl
  // Create a canvas and try to get a WebGL rendering context.
  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl2") ||
    canvas.getContext("webgl1") ||
    canvas.getContext("experimental-webgl");
  if (!gl) {
    webGLReport.WebGL_Version = "WebGL not supported";
    console.warn(
      "Unable to initialize WebGL. Your browser or machine may not support it.",
    );
  } else {
    // Basic version info
    console.log(
      "WebGL VERSION:",
      extractWebGLVersion(gl.getParameter(gl.VERSION)),
    );
    console.log("GLSL VERSION:", gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
    // Vendor and Renderer (often masked by the browser)
    console.log("WebGL VENDOR:", gl.getParameter(gl.VENDOR));
    console.log("WebGL RENDERER:", gl.getParameter(gl.RENDERER));
    webGLReport.WebGL_Version = extractWebGLVersion(
      gl.getParameter(gl.VERSION),
    );
    webGLReport.GLSL_Version = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
    webGLReport.WebGL_Vendor = gl.getParameter(gl.VENDOR);
    webGLReport.WebGL_Renderer = gl.getParameter(gl.RENDERER);
    // Try the WEBGL_debug_renderer_info extension for "unmasked" strings:
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      console.log(
        "Unmasked VENDOR:",
        gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      );
      console.log(
        "Unmasked RENDERER:",
        gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
      );
      webGLReport.Unmasked_Vendor = gl.getParameter(
        debugInfo.UNMASKED_VENDOR_WEBGL,
      );
      webGLReport.Unmasked_Renderer = gl.getParameter(
        debugInfo.UNMASKED_RENDERER_WEBGL,
      );
    } else {
      console.log("WEBGL_debug_renderer_info not available.");
      webGLReport.Unmasked_Vendor = "WEBGL_debug_renderer_info not available";
    }
  }
  // TWO MORE
  const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  console.log("Max Texture Size:", maxTexSize);
  const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0];
  console.log("Max Viewport Size:", maxViewportDims);
  webGLReport.maxTextureSize = maxTexSize;
  webGLReport.maxViewportSize = maxViewportDims;

  //get the deviceMemory
  const deviceMemoryGB = navigator.deviceMemory;
  console.log("Device Memory GB:", deviceMemoryGB);

  psychoJS.experiment.addData("WebGL_Report", JSON.stringify(webGLReport));
  psychoJS.experiment.addData("WebGLVersion", webGLReport.WebGL_Version);
  psychoJS.experiment.addData("maxTextureSize", webGLReport.maxTextureSize);
  psychoJS.experiment.addData("maxViewportSize", webGLReport.maxViewportSize);
  psychoJS.experiment.addData(
    "WebGLUnmaskedRenderer",
    webGLReport.Unmasked_Renderer,
  );
  psychoJS.experiment.addData("deviceMemoryGB", deviceMemoryGB);
  if (paramReader.read("_logFontBool")[0]) {
    logWebGLInfoToFormspree(webGLReport);
  }
};

// Get a bounding box for the screen in degrees relative to fixation
const getScreenRectDeg = () => {
  const screenDimensionsPx = [window.screen.width, window.screen.height];
  // px (ie psychoJS) coordinates has origin at center of screen
  const screenBottomLeftPx = [
    -screenDimensionsPx[0] / 2,
    -screenDimensionsPx[1] / 2,
  ];
  const screenTopRightPx = [
    screenDimensionsPx[0] / 2,
    screenDimensionsPx[1] / 2,
  ];
  // but deg coordinates have origin at fixation
  const screenBottomLeftDeg = XYDegOfPx(0, screenBottomLeftPx);
  const screenTopRightDeg = XYDegOfPx(0, screenTopRightPx);
  const screenRectDeg = new Rectangle(
    screenBottomLeftDeg,
    screenTopRightDeg,
    "deg",
  );
  return screenRectDeg;
};
