import { util, visual } from "../psychojs/out/psychojs-2021.3.0.js";
import {
  degreesToPixels,
  pixelsToDegrees,
  spacingPixelsFromLevel,
  levelFromSpacingPixels,
  logger,
} from "./utils.js";

const debug = false;

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

/**
 * If the proposed `level` would cause the stimuli to the be presented off screen,
 * get the largest value for `level` which will actually fit on screen.
 * Used in `ratio` mode, rather than `typographic`
 * @param {Number} proposedLevel Level to be tested, as provided by QUEST
 * @param {Number[]} targetXYPix [x,y] position of the target (in pixels)
 * @param {Number[]} fixationXYPix [x,y] position of the fixation (in pixels)
 * @param {("radial"|"tangential")} spacingDirection Orientation of flankers relative to fixation-target
 * @param {Object} displayOptions Set of parameters for the specifics of presentation
 * @todo Specify necessary members of `displayOptions`
 * @returns {Number}
 */
export const getMaxPresentableLevel = (
  proposedLevel,
  targetXYPix,
  fixationXYPix,
  spacingDirection,
  displayOptions
) => {
  const granularityOfChange = 0.05;
  if (
    unacceptableStimuli(
      granularityOfChange,
      targetXYPix,
      fixationXYPix,
      spacingDirection,
      displayOptions
    )
  ) {
    console.error(
      "Unpresentable stimuli, even at level=" + String(granularityOfChange)
    );
    return granularityOfChange;
  }
  for (
    let l = proposedLevel;
    l > granularityOfChange;
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
      logger("Acceptable level found", l);
      return l;
    }
  }
};

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
  const flankerLocations = getFlankerLocations(
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
      sizingParameters.window
    );
    const boundingPoints = [];
    flankerLocations.forEach((flankerPosition, i) => {
      const boundingPoint = [];
      if (targetPosition[0] < 0) {
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
      if (targetPosition[1] < 0) {
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
 * @returns
 */
const boundingBoxFromSpacing = (
  spacing,
  spacingOverSizeRatio,
  minimumHeight,
  font,
  window
) => {
  const height = Math.max(spacing / spacingOverSizeRatio, minimumHeight);
  try {
    const testTextStim = new visual.TextStim({
      win: window,
      name: "testTextStim",
      text: "H", // TEMP
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
    });
    const estimatedBoundingBox = testTextStim._boundingBox;
    return estimatedBoundingBox;
  } catch (error) {
    console.error(
      "Error estimating bounding box of flanker. Likely due to too large a `proposedLevel` value being tested.",
      error
    );
    return error;
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
const tangentialFlankerPositions = (
  targetPosition,
  fixationPosition,
  spacing
) => {
  let x, i; // Variables for anonymous fn's
  // Vector representing the line between target and fixation
  const v = [
    fixationPosition[0] - targetPosition[0],
    fixationPosition[1] - targetPosition[1],
  ];
  // Get the vector perpendicular to v
  const p = [v[1], -v[0]]; // SEE https://gamedev.stackexchange.com/questions/70075/how-can-i-find-the-perpendicular-to-a-2d-vector

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
const radialFlankerPositions = (targetPosition, fixationPosition, spacing) => {
  // SEE https://math.stackexchange.com/questions/175896/finding-a-point-along-a-line-a-certain-distance-away-from-another-point

  // Vector representing the line between target and fixation
  const v = [
    fixationPosition[0] - targetPosition[0],
    fixationPosition[1] - targetPosition[1],
  ];
  /// Find the length of v
  const llvll = Math.sqrt(
    v.map((x) => x ** 2).reduce((previous, current) => previous + current)
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
export const getFlankerLocations = (
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

export const getLowerBoundedLevel = (proposedLevel, displayOptions) => {
  // Spacing value corresponding to the provided `level` value
  const proposedSpacingDeg = Math.pow(10, proposedLevel);
  const proposedSpacingPix = Math.abs(
    degreesToPixels(proposedSpacingDeg, {
      pixPerCm: displayOptions.pixPerCm,
      viewingDistanceCm: displayOptions.viewingDistanceCm,
    })
  );
  // Find the font height that would result from the provided level
  const proposedHeight = Math.round(
    proposedSpacingPix / displayOptions.spacingOverSizeRatio
  );
  // Check whether this height is less than the minimum
  const levelIsTooSmall = proposedHeight < displayOptions.minimumHeight;
  // If the value of `proposedLevel` is fine, just return it
  if (!levelIsTooSmall) return proposedLevel;
  // Else work backwards...
  const minimumSpacingPix = Math.round(
    displayOptions.minimumHeight * displayOptions.spacingOverSizeRatio
  );
  // ... to find...
  const minimumSpacingDeg = pixelsToDegrees(minimumSpacingPix, displayOptions);
  // ... the closet value to `proposedLevel` which doesn't produce too small a font height
  return Math.log10(minimumSpacingDeg);
};

/*
  // Get the location of the flankers
  const [flanker1PosDeg, flanker2PosDeg] = getFlankerLocations(
    displayOptions.targetEccentricityXYDeg,
    displayOptions.fixationXYPix,
    displayOptions.spacingDirection,
    proposedSpacingDeg
  );
  // Convert flanker locations to pixels
  const [flanker1PosPix, flanker1PosDix] = XYPixOfXYDeg(
    [flanker1PosDeg, flanker2PosDeg],
    displayOptions
  ).map(x => Math.round(x));
*/
