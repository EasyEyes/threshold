import { preProcessFile } from "typescript";
import * as util from "../psychojs/src/util/index.js";
import * as visual from "../psychojs/src/visual/index.js";

import {
  degreesToPixels,
  pixelsToDegrees,
  spacingPixelsFromLevel,
  levelFromSpacingPixels,
  logger,
  levelFromTargetHeight,
  XYPixOfXYDeg,
  isRectInRect,
  isInRect,
} from "./utils.js";

// Find the font size for the string containing the flankers & target
/**
 *
 * @param {PsychoJS.window} window The window being displayed to
 * @param {Number} spacingPx Desired spacing, ie intensity/threshold/etc from QUEST, in pixels
 * @param {PsychoJS.visual.textStim} targetStimulus The target, and flankers, to be shown
 * @param {PsychoJS.visual.textStim} fixationStimulus The fixation to be shown
 * @param {Object} displayOptions
 * @param {Number} displayOptions.pixPerCm Pixels per centimeter of participant's display
 * @param {Number} displayOptions.viewingDistanceCm Participant's viewing distance in cm
 * @param {Number} displayOptions.minimumHeight Smallest height (in px) that a stimulus can be
 * @returns {[Number, Number]} Value to be used as the height for targetStimulus, value to be used as the level this trial
 */
export const getTypographicHeight = (
  window,
  proposedLevel,
  targetStimulus,
  fixationStimulus,
  displayOptions
) => {
  const fixationBoundingBox = fixationStimulus.getBoundingBox(true);
  const fixationWidth = fixationBoundingBox.width;
  const fixationHeight = fixationBoundingBox.height;

  // TODO generalize to other fixation locations, ie not just [0,0]
  const usableSpace = [
    Math.round(window._size[0] / 2 - fixationWidth), // Width
    Math.round(window._size[1] / 2 - fixationHeight), // Height
  ];
  const proposedSpacingPx = spacingPixelsFromLevel(
    proposedLevel,
    displayOptions.pixPerCm,
    displayOptions.viewingDistanceCm
  );

  // TODO verify that desiredStringWidth is what is desired
  /* From Denis:
        If thresholdParameter is "spacing" then the font size of string is 
        adjusted so that the width of the string is 3× specified spacing */
  const proposedSpacingIsTooLarge = proposedSpacingPx * 3 > usableSpace[0];
  const desiredStringWidth = proposedSpacingIsTooLarge
    ? usableSpace[0]
    : Math.round(proposedSpacingPx * 3);
  const level = proposedLevel;
  if (proposedSpacingIsTooLarge) {
    let level = levelFromSpacingPixels(
      desiredStringWidth / 3,
      displayOptions.pixPerCm,
      displayOptions.viewingDistanceCm
    );
  }
  // Get the width, given our desired height
  const testHeight = displayOptions.minimumHeight * 10;
  targetStimulus.setHeight(testHeight);
  targetStimulus._updateIfNeeded();
  const testWidth = targetStimulus.getBoundingBox(true).width;
  // Find the height we should use, given our desired string width
  const widthOverHeightRatio = testWidth / testHeight;
  const desiredHeight = desiredStringWidth / widthOverHeightRatio;
  // Check that the desired height isn't too small
  if (desiredHeight < displayOptions.minimumHeight) {
    let desiredHeight = displayOptions.minimumHeight;
    const minDesiredStringWidth = desiredHeight * widthOverHeightRatio;
    const minSpacingPx = Math.round(minDesiredStringWidth / 3);
    let level = levelFromSpacingPixels(minSpacingPx);
  }
  return [desiredHeight, level];
};

export const boundLevel = (proposedLevel) => {
  const upperBounded = getUpperBoundedLevel(
    proposedLevel,
    targetPositionDeg,
    screenDimensions,
    spacingDirection,
    spacingOverSizeRatio,
    pixPerCm,
    viewingDistanceCm,
    nearPointXYDeg,
    nearPointXYPix
  );
  const lowerBounded = getLowerBoundedLevel(upperBounded);
};
/*
 * If the proposed `level` would cause the stimuli to the be presented off screen,
 * get the largest value for `level` which will actually fit on screen.
 * Used in `ratio` mode, rather than `typographic`
 */
export const getUpperBoundedLevel = (
  proposedLevel,
  targetPositionDeg,
  screenDimensions,
  spacingDirection,
  spacingOverSizeRatio,
  normalizedAlphabetBoundingRect,
  displayOptions
) => {
  // First check that the
  const targetPositionPx = XYPixOfXYDeg(targetPositionDeg, displayOptions);
  const screenBoundsPx = [
    [-screenDimensions.width / 2, -screenDimensions.height / 2],
    [-screenDimensions.width / 2, -screenDimensions.height / 2],
  ];
  const screenRectPx = {
    left: screenBoundsPx[0][0],
    right: screenBoundsPx[1][0],
    bottom: screenBoundsPx[0][1],
    top: screenBoundsPx[1][1],
  };
  const targetIsOnScreen = isInRect(
    targetPositionPx[0],
    targetPositionPx[1],
    screenBoundsPx
  );
  if (!targetIsOnScreen)
    throw "Target is off-screen. Please contact experimenter.";

  const stimulusBoundsPx = getStimulusBoundsPx(
    proposedLevel,
    targetPositionDeg,
    spacingDirection,
    spacingOverSizeRatio,
    normalizedAlphabetBoundingRect
  );

  const stimulusRectPx = {
    left: stimulusBoundsPx[0][0],
    right: stimulusBoundsPx[1][0],
    bottom: stimulusBoundsPx[0][1],
    top: stimulusBoundsPx[1][1],
  };
  const levelTooLarge = !isRectInRect(stimulusRectPx, screenRectPx);

  return largestPossibleLevel;
};

export const getLowerBoundedLevel = (
  proposedLevel,
  spacingOverSizeRatio,
  targetEccentricityXYDeg,
  targetMinimumPix
) => {
  // Given level (log), get character height (px)
  const targetHeightPix = getTargetHeightPix(
    proposedLevel,
    spacingOverSizeRatio,
    targetEccentricityXYDeg
  );
  // Check whether this height is less than the minimum
  const levelIsTooSmall = targetHeightPix < targetMinimumPix;
  // If the value of `proposedLevel` is fine, just return it
  if (!levelIsTooSmall) return proposedLevel;
  // Else work backwards...
  const minimumSpacingPix = Math.round(targetMinimumPix * spacingOverSizeRatio);
  // ... to find...
  const minimumSpacingDeg = pixelsToDegrees(minimumSpacingPix, {
    pixPerCm: pixPerCm,
    viewingDistanceCm: viewingDistanceCm,
  });
  // ... the closet value to `proposedLevel` which doesn't produce too small a font height
  return Math.log10(minimumSpacingDeg);
};

export const getFlankerLocationsDeg = (
  targetPositionDeg,
  spacingDeg,
  flankerOrientation
) => {
  const lengthOfTargetPositions = Math.sqrt(
    targetPositionDeg
      .map((x) => x ** 2)
      .reduce((previous, current) => previous + current)
  );
  let v = targetPositionDeg.map((x) => x / lengthOfTargetPositions);
  if (flankerOrientation === "tangential") v = [v[1], -v[0]]; // SEE https://gamedev.stackexchange.com/questions/70075/how-can-i-find-the-perpendicular-to-a-2d-vector
  const flankerLocationsDeg = [
    targetPositionDeg.map((_, i) => targetPositionDeg[i] - v[i] * spacingDeg),
    targetPositionDeg.map((_, i) => targetPositionDeg[i] + v[i] * spacingDeg),
  ];
  return flankerLocationsDeg;
};

export const distancePix = (position1Deg, position2Deg) => {
  // ... by finding two points in deg spacing,
  // ... convert both to pixel space
  // ... and find the distance between them
  const position1Pix = XYPixOfXYDeg(position1Deg);
  const position2Pix = XYPixOfXYDeg(position2Deg);
  const v = position1Pix.map(_, (i) => position1Pix[i] - position2Pix[i]);
  const distanceInPix = Math.sqrt(
    v.map((x) => x ** 2).reduce((previous, current) => previous + current)
  );
  return distanceInPix;
};

const getTargetHeightPix = (
  proposedLevel,
  spacingOverSizeRatio,
  targetEccentricityXYDeg
) => {
  // Spacing value corresponding to the provided `level` value
  const proposedSpacingDeg = Math.pow(10, proposedLevel);
  const proposedHeightDeg = proposedSpacingDeg / spacingOverSizeRatio;
  const targetTopDeg = [
    targetEccentricityXYDeg[0],
    targetEccentricityXYDeg[1] + proposedHeightDeg / 2,
  ];
  const targetBottomDeg = [
    targetEccentricityXYDeg[0],
    targetEccentricityXYDeg[1] - proposedHeightDeg / 2,
  ];
  const targetHeightPix = distancePix(targetTopDeg, targetBottomDeg);
  return targetHeightPix;
};

const getFlankerHeightsPix = (
  proposedLevel,
  spacingOverSizeRatio,
  targetEccentricityXYDeg,
  spacingDirection
) => {
  // Spacing value corresponding to the provided `level` value
  const proposedSpacingDeg = Math.pow(10, proposedLevel);
  const proposedHeightDeg = proposedSpacingDeg / spacingOverSizeRatio;
  // Convert to pixels to determine if too small...
  const flankerLocationsDeg = getFlankerLocationsDeg(
    targetEccentricityXYDeg,
    proposedSpacingDeg,
    spacingDirection
  );
  const flankerTopsAndBottomsDeg = flankerLocations.map((flankerLocation) => [
    flankerLocation[0],
    flankerLocation[1] + proposedHeightDeg / 2,
    flankerLocation[0],
    flankerLocation[1] - proposedHeightDeg / 2,
  ]);
  const flankerHeightsPix = flankerTopsAndBottoms.map(distancePix);
  return flankerHeightsPix;
};

/**
 * Return a bounding rectangle (defined by two points, the bottom-left and top-right) around the flankers and target
 * @param {Number} proposedLevel
 * @param {Number[]} targetEccentricityXYDeg
 * @param {"radial"|"tangential"} spacingDirection
 * @param {Number} spacingOverSizeRatio
 * @returns {Number[][]}
 */
export const getStimulusBoundsPx = (
  proposedLevel,
  targetEccentricityXYDeg,
  spacingDirection,
  spacingOverSizeRatio,
  normalizedAlphabetBoundingRect
) => {
  // Spacing value corresponding to the provided `level` value
  const proposedSpacingDeg = Math.pow(10, proposedLevel);
  const proposedHeightDeg = proposedSpacingDeg / spacingOverSizeRatio;

  const targetTopDeg = [
    targetEccentricityXYDeg[0] + proposedHeightDeg,
    targetEccentricityXYDeg[1] + proposedHeightDeg,
  ];
  const targetEccentricityXYPix = XYPixOfXYDeg(targetEccentricityXYDeg);
  const targetTopPix = XYPixOfXYDeg(targetTopDeg);
  const proposedHeightPix = targetTopPix[1] - targetEccentricityXYDeg[1];

  const alphabetBoundingRect = [
    [
      normalizedAlphabetBoundingRect[0][0] * proposedHeightPix,
      normalizedAlphabetBoundingRect[0][1] * proposedHeightPix,
    ],
    [
      normalizedAlphabetBoundingRect[1][0] * proposedHeightPix,
      normalizedAlphabetBoundingRect[1][1] * proposedHeightPix,
    ],
  ];
  const flankerLocationsDeg = getFlankerLocationsDeg(
    targetEccentricityXYDeg,
    proposedSpacingDeg,
    spacingDirection
  );
  const flankerLocationsPix = flankerLocationsDeg.map(XYPixOfXYDeg);
  const flankerRectanglesPix = flankerLocationsPix.map((location) => {
    const lowerLeft = [
      location[0] + alphabetBoundingRect[0][0],
      location[0] + alphabetBoundingRect[0][1],
    ];
    const upperRight = [
      location[1] + alphabetBoundingRect[1][0],
      location[1] + alphabetBoundingRect[1][1],
    ];
    return [lowerLeft, upperRight];
  });
  const stimulusRect = getUnionRect(...flankerRectanglesPix);
  return stimulusRect;
};
/*
  const flankerBottomsAndTopsDeg = flankerLocationsDeg.map(flankerLocation => [
    flankerLocation[0], flankerLocation[1] - proposedHeightDeg/2,
    flankerLocation[0], flankerLocation[1] + proposedHeightDeg/2,
  ]);
  const flankerHeightsPix = flankerBottomsAndTopsDeg.map(distancePix);
  // ASSUMES flanker height is the same as width, ie square flankers
  const flankerLeftsAndRightsDeg = flankerLocationsDeg.map(flankerLocation => [
    flankerLocation[0] - proposedHeightDeg/2, flankerLocation[1],
    flankerLocation[0] + proposedHeightDeg/2, flankerLocation[1],
  ]);
  const stimulusBoundsDeg = [
     // Left,bottom point (x,y)
     [flankerLeftsAndRightsDeg[0][0], flankerBottomsAndTopsDeg[0][0]],
     // Right,top point (x,y)
     [flankerLeftsAndRightsDeg[1][1]], flankerBottomsAndTopsDeg[1][1]
  ];
  const stimulusBoundsPx = stimulusBoundsDeg.map(point => XYPixOfXYDeg(point, {
    pixPerCm: pixPerCm, viewingDistanceCm: viewingDistanceCm, nearPointXYDeg: nearPointXYDeg, nearPointXYPix: nearPointXYPix}))
  return stimulusBoundsPx;
};
*/
export const getAlphabetBoundingBox = (
  alphabet,
  targetFont,
  height,
  repeats = 1
) => {
  // ASSUMES `height` corresponds to `fontSize` in psychojs/pixi
  let alphabetBoundingRect = [
    [0, 0],
    [0, 0],
  ];
  const testStim = new visual.TextStim({
    win: window,
    name: "alphabetBoundingBoxStim",
    text: "",
    font: targetFont,
    units: "pix",
    pos: [0, 0],
    height: height,
    wrapWidth: undefined,
    ori: 0.0,
    color: new util.Color("black"),
    opacity: 1.0,
    depth: -7.0,
    autoDraw: false,
    autoLog: false,
  });
  for (const character of alphabet) {
    testStim.setText(character.repeat(repeats));
    testStim._updateIfNeeded(); // Maybe unnecassary, forces refreshing of stim
    let thisBoundingBox = testStim.getBoundingBox(true);
    console.log("thisBoundingBox");
    let thisBoundingRect = rectFromPixiRect(thisBoundingBox);
    alphabetBoundingRect = getUnionRect(thisBoundingRect, alphabetBoundingRect);
  }
  const normalizedAlphabetBoundingRect = [
    [alphabetBoundingRect[0][0] / height, alphabetBoundingRect[0][1] / height],
    [alphabetBoundingRect[1][0] / height, alphabetBoundingRect[1][1] / height],
  ];
  return normalizedAlphabetBoundingRect;
};
/*
Hi Gus, i have a few minutes before the fac. meeting at 12:30 pm. 
We want a bounding box for the stimulus, to check whether it fits 
on-screen and to estimate a new level that wil fit if it doesn't. 
Yesterday i thought we could get away with assuming a nominal size 
for the flankers. I'm now thinking that it's better to just do it 
right and finish the job. 
1. Determine the alphabet bounding box. Get a joint bounding box for 
  all the letters in the alphabet. Logically, this is the union of the 
  bounding box for each letter. Drawing all letters with the same baseline. 
  I've always centered horizontally. Once we have this bounding box we 
  should retain it for the whole block. It's useful for targets and 
  flankers in ratio mode, and for targets, when measuring acuity. It's 
  not relevant in typographic mode.
2. For typographic mode i think we should compute a special tripleAlphabet 
   mode in which we measure the union of the bounding boxes of every same 
   letter triplet, aaa, bbb, etc. The assumption is that this union will 
   also contain any random triplet.
3. Compute the bounding box of the whole stimulus. In acuity mode, this 
   is just the alphabet bounding box at the target position. In typographic 
   mode, it's very similar, substituting the tripleAlphabet bounding box. 
   I forgotten our rule for determining size fo the triplet based on desired 
   spacing. In ratio mode, we place the alphabet bounding box at the location 
   of each flanker. 
4. If the stimulus bounding box is on screen, then we're done checking. If the 
   bounding box is too big, then we'll need to estimate by how much we've exceeded 
   and try to calculate by how much to reduce the spacing to fit. It may not be 
   possible to fit, in which case this whole condition cannot be tested. 
*/
/*
  const granularityOfChange = 0.05;
  const smallestDisplayableLevel = levelFromTargetHeight(
    displayOptions.minimumHeight,
    displayOptions.spacingOverSizeRatio,
    displayOptions.pixPerCm,
    displayOptions.viewingDistanceCm
  );
  if (
    unacceptableStimuli(
      smallestDisplayableLevel,
      targetXYPix,
      fixationXYPix,
      spacingDirection,
      displayOptions
    )
  ) {
    console.error(
      "Unpresentable stimuli, even at level=" + String(smallestDisplayableLevel)
    );
    return smallestDisplayableLevel;
  }
  for (
    let l = proposedLevel;
    l > smallestDisplayableLevel;
    l -= granularityOfChange
  ) {
    if (
      !unacceptableStimuli(
        l,
        targetXYPix,
        fixationXYPix,
        spacingDirection,
        displayOptions
      )
    ) {
      return l;
    }
  }
  // proposedLevel === smallestDisplayableLevel
  return smallestDisplayableLevel;
};
*/

/**
 * Tests whether these proposed parameters for presentation would draw improperly, eg extend beyond the extent of the screen
 * @todo Test whether the flankers interfer with eachother
 * @param {Number} proposedLevel Level to be tested, as provided by QUEST
 * @param {Number[]} targetXYPix [x,y] position of the target (in pixels)
 * @param {Number[]} fixationXYPix [x,y] position of the fixation (in pixels)
 * @param {"radial"|"tangential"} spacingDirection Orientation of flankers relative to fixation-target
 * @param {Object} displayOptions Set of parameters for the specifics of presentation
 * @todo Specify necessary members of `displayOptions`
 * @returns {Boolean}
 */
const unacceptableStimuli = (
  proposedLevel,
  targetXYPix,
  fixationXYPix,
  spacingDirection,
  displayOptions
) => {
  const areaFlankersCover = flankersExtent(
    proposedLevel,
    targetXYPix,
    fixationXYPix,
    spacingDirection,
    displayOptions
  );
  // TODO take the size of fixation into account
  // const fixationInfringed = rectangleContainsPoint(
  //   areaFlankersCover,
  //   fixationXYPix
  // );
  const stimuliExtendOffscreen = rectangleOffscreen(areaFlankersCover, {
    width: screen.width,
    height: screen.height,
  });
  // const badPresentation = fixationInfringed || stimuliExtendOffscreen;
  const badPresentation = stimuliExtendOffscreen;
  return badPresentation;
};

/**
 * Determines whether any part of a given rectangle will extend beyond the screen
 * @param {Number[][]} rectangle Array of two [x,y] points, defining a rectangle
 * @param {Object} screenDimensions
 * @param {Number} screenDimensions.width Width of the screen
 * @param {Number} screenDimensions.height Height of the screen
 * @returns {Boolean}
 */
const rectangleOffscreen = (rectangle, screenDimensions) => {
  const pointOffScreen = (point) =>
    Math.abs(point[0]) > screenDimensions.width / 2 ||
    Math.abs(point[1]) > screenDimensions.height / 2;
  return rectangle.some(pointOffScreen); // VERIFY this logic is correct
};

/**
 * Determine whether a given point lies inside a given rectangle
 * @param {Number[][]} rectangle Array of two [x,y] points, which define an area
 * @param {Number[]} point [x,y] coordinate of a point which may be within rectangle
 * @returns {Boolean}
 */
const rectangleContainsPoint = (rectangle, point) => {
  const leftX = Math.min(rectangle[0][0], rectangle[1][0]);
  const rightX = Math.max(rectangle[0][0], rectangle[1][0]);
  const lowerY = Math.min(rectangle[0][1], rectangle[1][1]);
  const upperY = Math.max(rectangle[0][1], rectangle[1][1]);
  const xIsIn = point[0] >= leftX && point[0] <= rightX;
  const yIsIn = point[1] >= lowerY && point[1] <= upperY;
  return xIsIn && yIsIn;
};

/**
 * Return the extreme points of a rectangle bounding the pair of flankers
 * @param {Number} level Suggested level from QUEST
 * @param {Number[]} targetPosition [x,y] position of the target stimulus
 * @param {Number[]} fixationPosition [x,y] position of the fixation stimulus
 * @param {("radial"|"tangential")} flankerOrientation Arrangement of the flankers relative to the line between fixation and target
 * @param {Object} sizingParameters Parameters for drawing stimuli
 * @param {Number} sizingParameters.spacingOverSizeRatio Ratio of distance between flanker&target to stimuli letter height
 * @param {Number} sizingParameters.minimumHeight Minimum stimulus letter height (in same units as other parameters)
 * @param {String} sizingParameters.fontFamily Name of the fontFamily in which the stimuli will be drawn
 * @param {Number} sizingParameters.pixPerCm Pixel/cm ratio of the display
 * @param {Number} sizingParameters.viewingDistanceCm Distance (in cm) of the observer from the near-point
 * @param {String[]} sizingParameters.flankerCharacters List of the (2) characters that will be used for the flankers
 * @param {String} sizingParameters.targetCharacter The character that will be used for the target
 * @param {PsychoJS.window} sizingParameters.window Window object, used for creating a mock stimuli for measurement
 * @returns {Number[][]} [[x_min, y_min], [x_max, y_max]] Array of defining points of the area over which flankers extend
 */
const flankersExtent = (
  level,
  targetPosition,
  fixationPosition,
  flankerOrientation,
  sizingParameters
) => {
  const spacingDegrees = Math.pow(10, level);
  const spacingPixels = Math.abs(
    degreesToPixels(spacingDegrees, {
      pixPerCm: sizingParameters.pixPerCm,
      viewingDistanceCm: sizingParameters.viewingDistanceCm,
    })
  );
  const flankerLocations = wronggetFlankerLocations(
    targetPosition,
    fixationPosition,
    flankerOrientation,
    spacingPixels
  );
  try {
    const flankerBoxDimensions = boundingBoxFromSpacing(
      spacingPixels,
      sizingParameters.spacingOverSizeRatio,
      sizingParameters.minimumHeight,
      sizingParameters.fontFamily,
      sizingParameters.window,
      sizingParameters.flankerCharacters
    );
    const boundingPoints = [];
    const fixationXY = sizingParameters.fixationXYPix;
    flankerLocations.forEach((flankerPosition, i) => {
      const boundingPoint = [];
      if (targetPosition[0] < fixationXY[0]) {
        boundingPoint.push(
          flankerPosition[0] -
            (i === 0 ? -1 : 1) * (flankerBoxDimensions.width / 2)
        );
      } else {
        boundingPoint.push(
          flankerPosition[0] +
            (i === 0 ? -1 : 1) * (flankerBoxDimensions.width / 2)
        );
      }
      if (targetPosition[1] < fixationXY[1]) {
        boundingPoint.push(
          flankerPosition[1] -
            (i === 0 ? -1 : 1) * (flankerBoxDimensions.height / 2)
        );
      } else {
        boundingPoint.push(
          flankerPosition[1] +
            (i === 0 ? -1 : 1) * (flankerBoxDimensions.height / 2)
        );
      }
      boundingPoints.push(boundingPoint);
    });
    return boundingPoints;
  } catch (error) {
    console.error("Error estimating flankers extent.", error);
    return error;
  }
};

/**
 * Given a spacing value (in pixels), estimate a (non-tight) bounding box
 * @param {Number} spacing Spacing which will be used to place flanker
 * @param {Number} spacingOverSizeRatio Specified ratio of distance between flanker&target to letter height
 * @param {Number} minimumHeight Smallest allowable letter height for flanker
 * @param {String} font Font-family in which the stimuli will be presented
 * @param {PsychoJS.window} window PsychoJS window, used to create a stimulus to be measured
 * @param {String[]} testCharacters List of the flanker characters
 * @returns
 */
const boundingBoxFromSpacing = (
  spacing,
  spacingOverSizeRatio,
  minimumHeight,
  font,
  window,
  testCharacters = ["j", "Y"]
) => {
  const height = Math.max(spacing / spacingOverSizeRatio, minimumHeight);
  try {
    const testTextStims = testCharacters.map(
      (character) =>
        new visual.TextStim({
          win: window,
          name: "testTextStim",
          text: character,
          font: font,
          units: "pix", // ASSUMES that parameters are in pixel units
          pos: [0, 0],
          height: height,
          wrapWidth: undefined,
          ori: 0.0,
          color: new util.Color("black"),
          opacity: 1.0,
          depth: -7.0,
          autoDraw: false,
          autoLog: false,
        })
    );
    const boundingBoxes = testTextStims.map((stim) =>
      stim.getBoundingBox(true)
    );
    const heights = boundingBoxes.map((box) => box.height);
    const widths = boundingBoxes.map((box) => box.width);
    const maximalBoundingBox = {
      height: Math.max(...heights),
      width: Math.max(...widths),
    };
    return maximalBoundingBox;
  } catch (error) {
    console.error(
      "Error estimating bounding box of flanker. Likely due to too large a `proposedLevel` value being tested.",
      error
    );
    return { height: Infinity, width: Infinity };
  }
};

/**
 * Calculate the (2D) coordinates of two tangential flankers, linearly symmetrical around a target at targetPosition
 * @todo Add parameter/support for log-symmetric spacing
 * @param {Number[]} targetPosition [x,y] position of the target
 * @param {Number[]} fixationPosition [x,y] position of the fixation point
 * @param {Number} spacing How far the flankers are to be from the target (in the same units as the target & fixation positions)
 * @returns {Number[][]} Array containing two Arrays which represent the positions of Flanker 1 and Flanker 2
 */
const tangentialFlankerPositionsDeg = (targetPosition, spacing) => {
  let x, i; // Variables for anonymous fn's
  // Get the vector perpendicular to v
  const p = [targetPosition[1], -targetPosition[0]]; // SEE https://gamedev.stackexchange.com/questions/70075/how-can-i-find-the-perpendicular-to-a-2d-vector

  // Find the point that is `spacing` far from `targetPosition` along p
  // SEE https://math.stackexchange.com/questions/175896/finding-a-point-along-a-line-a-certain-distance-away-from-another-point
  /// Find the length of `p`
  const llpll = Math.sqrt(
    p.map((x) => x ** 2).reduce((previous, current) => previous + current)
  );
  /// Normalize `p`
  const u = p.map((x) => x / llpll);
  /// Find our two new points, `spacing` distance away from targetPosition along line `p`
  const flankerPositions = [
    targetPosition.map((x, i) => x + spacing * u[i]),
    targetPosition.map((x, i) => x - spacing * u[i]),
  ];
  return flankerPositions;
};

/**
 * Calculate the (2D) coordinates of two radial flankers, linearly symmetrical around a target at targetPosition
 * @todo Add parameter/support for log-symmetric spacing
 * @param {Number[]} targetPosition [x,y] position of the target
 * @param {Number[]} fixationPosition [x,y] position of the fixation point
 * @param {Number} spacing How far the flankers are to be from the target (in the same units as the target & fixation positions)
 * @returns {Number[][]} Array containing two Arrays, which represent the positions of Flanker 1 and Flanker 2
 */
const radialFlankerPositionsDeg = (targetPositionDeg, spacingDeg) => {
  // SEE https://math.stackexchange.com/questions/175896/finding-a-point-along-a-line-a-certain-distance-away-from-another-point

  /// Find the length of v
  const llvll = Math.sqrt(
    targetPositionDeg
      .map((x) => x ** 2)
      .reduce((previous, current) => previous + current)
  );
  /// Normalize v
  const u = v.map((x) => x / llvll);
  /// Find our two new points, `spacing` distance away from targetPosition along line v
  const flankerPositions = [
    targetPosition.map((x, i) => x + spacing * u[i]),
    targetPosition.map((x, i) => x - spacing * u[i]),
  ];
  return flankerPositions;
};

/**
 * Return the coordinates of the two flankers around a given target.
 * @param {Number[]} targetPosition [x,y] position of the target stimuli
 * @param {Number[]} fixationPosition [x,y] position of the fixation stimuli
 * @param {("radial"|"tangential")} flankerOrientation String specifying the position of the flankers relative to the line between fixation and the target
 * @param {Number} spacing Distance between the target and one flanker
 * @returns {Number[][]} Array containing two [x,y] arrays, each representing the location of one flanker
 */
export const wronggetFlankerLocations = (
  targetPosition,
  fixationPosition,
  flankerOrientation,
  spacing
) => {
  switch (flankerOrientation) {
    case "radial":
      return radialFlankerPositions(targetPosition, fixationPosition, spacing);
    case "tangential":
      return tangentialFlankerPositions(
        targetPosition,
        fixationPosition,
        spacing
      );
    default:
      console.error(
        "Unknown flankerOrientation specified, ",
        flankerOrientation
      );
  }
};

export const getTestabilityBoundedLevel = (
  proposedLevel,
  pixPerCm,
  viewingDistanceCm,
  spacingOverSizeRatio,
  font,
  minimumHeight,
  window
) => {
  const granularityOfChange = 0.05;
  const smallestDisplayableLevel = levelFromTargetHeight(
    minimumHeight,
    spacingOverSizeRatio,
    pixPerCm,
    viewingDistanceCm
  );
  if (proposedLevel <= smallestDisplayableLevel)
    return smallestDisplayableLevel;
  if (
    testableLevel(
      proposedLevel,
      pixPerCm,
      viewingDistanceCm,
      spacingOverSizeRatio,
      font,
      window
    )
  )
    return proposedLevel;
  return getTestabilityBoundedLevel(
    proposedLevel - granularityOfChange,
    pixPerCm,
    viewingDistanceCm,
    spacingOverSizeRatio,
    font,
    minimumHeight,
    window
  );
};

export const testableLevel = (
  proposedLevel,
  pixPerCm,
  viewingDistanceCm,
  spacingOverSizeRatio,
  font,
  window
) => {
  const spacingPx = spacingPixelsFromLevel(
    proposedLevel,
    pixPerCm,
    viewingDistanceCm
  );
  const heightPx = spacingPx / spacingOverSizeRatio;
  try {
    const testStim = new visual.TextStim({
      win: window,
      name: "testTextStim",
      text: "H", // ASSUMES text parameter doesn't matter much for this
      font: font,
      units: "pix",
      pos: [0, 0],
      height: heightPx,
      wrapWidth: undefined,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -7.0,
      autoDraw: false,
      autoLog: false,
    });
    return true;
  } catch (e) {
    return false;
  }
};
