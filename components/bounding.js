import * as util from "../psychojs/src/util/index.js";
import * as visual from "../psychojs/src/visual/index.js";

import {
  logger,
  XYPixOfXYDeg,
  XYDegOfXYPix,
  rectFromPixiRect,
  getUnionRect,
  isRectInRect,
  norm,
  Rectangle,
  validateRectPoints,
} from "./utils.js";

import {
  getCanvasContext,
  initPixelsArray,
  readPixels,
  getPixelRGBA,
} from "./canvasContext.js";

import { Permutation } from "js-combinatorics";

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
    targetPositionDeg.map((x, i) => targetPositionDeg[i] - v[i] * spacingDeg),
    targetPositionDeg.map((x, i) => targetPositionDeg[i] + v[i] * spacingDeg),
  ];
  return flankerLocationsDeg;
};

export const distancePix = (position1Deg, position2Deg) => {
  // ... by finding two points in deg spacing,
  // ... convert both to pixel space
  // ... and find the distance between them
  const position1Pix = XYPixOfXYDeg(position1Deg, displayOptions);
  const position2Pix = XYPixOfXYDeg(position2Deg, displayOptions);
  const v = position1Pix.map((x, i) => position1Pix[i] - position2Pix[i]);
  const distanceInPix = Math.sqrt(
    v.map((x) => x ** 2).reduce((previous, current) => previous + current)
  );
  return distanceInPix;
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
  normalizedCharacterSetBoundingRect,
  displayOptions
) => {
  // Spacing value corresponding to the provided `level` value
  const proposedSpacingDeg = Math.pow(10, proposedLevel);
  const proposedHeightDeg = proposedSpacingDeg / spacingOverSizeRatio;

  const targetTopDeg = [
    targetEccentricityXYDeg[0] + proposedHeightDeg,
    targetEccentricityXYDeg[1] + proposedHeightDeg,
  ];
  const targetEccentricityXYPix = XYPixOfXYDeg(
    targetEccentricityXYDeg,
    displayOptions
  );
  const targetTopPix = XYPixOfXYDeg(targetTopDeg, displayOptions);
  const proposedHeightPix = targetTopPix[1] - targetEccentricityXYPix[1];

  const characterSetBoundingRect = [
    [
      normalizedCharacterSetBoundingRect[0][0] * proposedHeightPix,
      normalizedCharacterSetBoundingRect[0][1] * proposedHeightPix,
    ],
    [
      normalizedCharacterSetBoundingRect[1][0] * proposedHeightPix,
      normalizedCharacterSetBoundingRect[1][1] * proposedHeightPix,
    ],
  ];
  const flankerLocationsDeg = getFlankerLocationsDeg(
    targetEccentricityXYDeg,
    proposedSpacingDeg,
    spacingDirection
  );
  const flankerLocationsPix = flankerLocationsDeg.map((position) =>
    XYPixOfXYDeg(position, displayOptions)
  );
  const flankerRectanglesPix = flankerLocationsPix.map((location) => {
    const lowerLeft = [
      location[0] + characterSetBoundingRect[0][0],
      location[0] + characterSetBoundingRect[0][1],
    ];
    const upperRight = [
      location[1] + characterSetBoundingRect[1][0],
      location[1] + characterSetBoundingRect[1][1],
    ];
    return [lowerLeft, upperRight];
  });
  const stimulusRect = getUnionRect(...flankerRectanglesPix);
  return stimulusRect;
};

export const getCharacterSetBoundingBox = (
  characterSet,
  targetFont,
  window,
  repeats = 1,
  height = 50
) => {
  // ASSUMES `height` corresponds to `fontSize` in psychojs/pixi
  let characterSetBoundingRectPoints = [
    [0, 0],
    [0, 0],
  ];
  const testStim = new visual.TextStim({
    win: window,
    name: "characterSetBoundingBoxStim",
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
  const [centers, boundingRectPoints] = [{}, {}];
  // Create a list of all possible text strings that could be used as stimuli
  const texts = [...new Permutation(characterSet, repeats)].map((a) =>
    "".concat(...a)
  );
  // Also add the individual characters, to show display charSet bounding boxes in typographic mode
  if (repeats > 1) texts.push(...characterSet);
  // For each possible stimuli text...
  for (const textToSet of texts) {
    //... set our testStim to reflect that, so we can measure.
    const xy = [0, 0];
    testStim.setText(textToSet);
    testStim.setPos(xy);
    testStim._updateIfNeeded(); // Maybe unnecassary, forces refreshing of stim

    // Get measurements of how far the text stim extends in each direction
    const thisMetrics = testStim.getTextMetrics();
    const ascent = thisMetrics.boundingBox.actualBoundingBoxAscent;
    const descent = thisMetrics.boundingBox.actualBoundingBoxDescent;
    const left = thisMetrics.boundingBox.actualBoundingBoxLeft;
    const right = thisMetrics.boundingBox.actualBoundingBoxRight;

    // Get the bounding points around this specific text stim
    const thisBoundingRectPoints = [
      [-left + xy[0], -descent + xy[1]],
      [right + xy[0], ascent + xy[1]],
    ];
    validateRectPoints(thisBoundingRectPoints);
    boundingRectPoints[textToSet] = thisBoundingRectPoints;

    // Center of this text stim
    const thisCenter = [
      (thisBoundingRectPoints[0][0] + thisBoundingRectPoints[1][0]) /
        2 /
        height,
      (thisBoundingRectPoints[0][1] + thisBoundingRectPoints[1][1]) /
        2 /
        height,
    ];
    // Store the location of this text's center, so we can compensate for it later
    centers[textToSet] = thisCenter;
    // Calculate the bounding box around this stim and the running bounding box
    characterSetBoundingRectPoints = getUnionRect(
      thisBoundingRectPoints,
      characterSetBoundingRectPoints
    );
  }
  // Normalize the bounding points, so they're not specific to whatever value
  // was used for `height` in this function
  const normalizedCharacterSetBoundingPoints = [
    [
      characterSetBoundingRectPoints[0][0] / height,
      characterSetBoundingRectPoints[0][1] / height,
    ],
    [
      characterSetBoundingRectPoints[1][0] / height,
      characterSetBoundingRectPoints[1][1] / height,
    ],
  ];
  // Get the center of this (ie global over the character set) bounding points
  const normalizedCenter = [
    (normalizedCharacterSetBoundingPoints[0][0] +
      normalizedCharacterSetBoundingPoints[1][0]) /
      2,
    (normalizedCharacterSetBoundingPoints[0][1] +
      normalizedCharacterSetBoundingPoints[1][1]) /
      2,
  ];
  // Store the individual text centers as their offset from the average,normalized center
  Object.entries(centers).map(([text, c]) => {
    centers[text] = [normalizedCenter[0] - c[0], normalizedCenter[1] - c[1]];
  });
  // Create a Rectangle object to represent the characterSet bounding box
  const normalizedCharacterSetBoundingRect = new Rectangle(
    normalizedCharacterSetBoundingPoints[0],
    normalizedCharacterSetBoundingPoints[1],
    "pix",
    characterSet,
    centers
  );
  return normalizedCharacterSetBoundingRect;
};

/**
 * Restrict level to within the realizable range for this screen
 * with the given target position, screen size, font, and characterSet.
 * @return {[Number, Object]} [restricted level, stimulus parameters]
 */
export const restrictLevel = (
  proposedLevel,
  thresholdParameter,
  characterSetRectPx,
  spacingDirection,
  spacingRelationToSize,
  spacingSymmetry,
  spacingOverSizeRatio,
  targetSizeIsHeightBool,
  displayOptions
) => {
  if (
    !["radial", "tangential", "horizontal", "vertical"].includes(
      spacingDirection
    )
  )
    throw `spacingDirection must equal 'radial', 'tangential', 'horizontal', or 'vertical', not '${spacingDirection}'`;
  if (!["none", "ratio", "typographic"].includes(spacingRelationToSize))
    throw `spacingRelationToSize must equal 'none', 'ratio', or 'typographic', not '${spacingRelationToSize}'`;
  if (!["screen", "retina", "cortex"].includes(spacingSymmetry))
    throw `spacingSymmetry must equal 'screen', 'retina', or 'cortex', not '${spacingSymmetry}'`;
  if (!["spacing", "size"].includes(thresholdParameter))
    throw `thresholdParameter must equal 'spacing' or 'size', not '${thresholdParameter}'`;

  let level, stimulusParameters, spacingDeg, sizeDeg;
  const screenLowerLeft = [
    -displayOptions.window._size[0] / 2,
    -displayOptions.window._size[1] / 2,
  ];
  const screenUpperRight = [
    displayOptions.window._size[0] / 2,
    displayOptions.window._size[1] / 2,
  ];
  const screenRectPx = new Rectangle(screenLowerLeft, screenUpperRight);
  switch (thresholdParameter) {
    case "size":
      [sizeDeg, stimulusParameters] = restrictSizeDeg(
        displayOptions.targetEccentricityXYDeg,
        displayOptions.targetKind,
        screenRectPx,
        spacingRelationToSize,
        targetSizeIsHeightBool,
        characterSetRectPx,
        spacingOverSizeRatio,
        displayOptions
      );
      level = Math.log10(sizeDeg);
    case "spacing":
      [spacingDeg, stimulusParameters] = restrictSpacingDeg(
        proposedLevel,
        displayOptions.targetEccentricityXYDeg,
        displayOptions.targetKind,
        screenRectPx,
        spacingRelationToSize,
        targetSizeIsHeightBool,
        characterSetRectPx,
        spacingOverSizeRatio,
        spacingSymmetry,
        thresholdParameter,
        displayOptions
      );
      level = Math.log10(spacingDeg);
  }
  return [level, stimulusParameters];
};

export const restrictSizeDeg = (
  targetXYDeg,
  targetKind,
  screenRectPx,
  spacingRelationToSize,
  targetSizeIsHeightBool,
  characterSetRectPx,
  spacingOverSizeRatio,
  displayOptions
) => {
  switch (targetKind) {
    case "letter":
      break;
    default:
      throw "At this point targetKind must be letter. gabor is coming.";
  }
  const targetXYPx = XYPixOfXYDeg(targetXYDeg, displayOptions);
  const targetIsFoveal = targetXYPx[0] === 0 && targetXYPx[1] === 0;
  let heightDeg, heightPx, topPx, bottomPx;
  let targetSizeDeg = displayOptions.targetSizeDeg;

  // We scale the alphabet bounding box to have the specified heightPx.
  // widthPx = width of scaled alphabet bounding box.

  // This loop accepts a requested targetSizeDeg and adjusts it, if necessary, to get the
  // stimulus to fit onscreen. If targetSizeDeg is already ok, then we'll do one pass.
  // If the stimulus extends beyond the screen, then we'll need 2 iterations. We allow
  // a 3rd iteration to allow for the case that the 2nd iteration isn't quite right, and
  // it homes in on the third.
  for (const iteration of [0, 1, 2]) {
    // SET TARGET SIZE
    heightDeg = targetSizeIsHeightBool
      ? targetSizeDeg
      : (targetSizeDeg * characterSetRectPx.height) / characterSetRectPx.width;
    [, topPx] = XYPixOfXYDeg(
      [targetXYDeg[0], targetXYDeg[1] + heightDeg / 2],
      displayOptions
    );
    [, bottomPx] = XYPixOfXYDeg(
      [targetXYDeg[0], targetXYDeg[1] - heightDeg / 2],
      displayOptions
    );
    heightPx = topPx - bottomPx;
    stimulusRectPx = characterSetRectPx.scale(
      widthDeg / characterSetRectPx.width
    );
    stimulusRectPx = stimulusRectPx.offset(targetXYPx);

    // WE'RE DONE IF STIMULUS FITS
    if (isRectInRect(stimulusRectPx.toArray(), screenRectPx.toArray())) {
      return [
        targetSizeDeg,
        {
          heightPx: heightPx,
          targetAndFlankersXYPx: [targetXYPx],
        },
      ];
    }

    // Stimulus extends off-screen. Reduce targetSizeDeg so stimulus fits onscreen.
    // stimulusRectPx has four bounds. We check them all. We assume that the bound's
    // distance from the target location is proportional to targetSizeDeg. So, we first
    // change coordinates to treat the target as the origin. Then we compute the ratio of
    // each stimulus bound to the corresponding screen bound. Let maxRatio be the
    // biggest of the four ratios. We set targetSizeDeg=targetSizeDeg/maxRatio.

    // REDUCE targetSizeDeg TO MAKE STIMULUS FIT
    const largestBoundsRatio = getLargestBoundsRatio(
      stimulusRectPx,
      screenRectPx,
      targetXYPx,
      thresholdParameter,
      spacingRelationToSize
    );
    targetSizeDeg = targetSizeDeg / largestBoundsRatio;
  }
};
/**
 *
 * @returns {[Number, Object]} [spacingDeg, stimulusParameters]
 */
export const restrictSpacingDeg = (
  proposedLevel,
  targetXYDeg,
  targetKind,
  screenRectPx,
  spacingRelationToSize,
  targetSizeIsHeightBool,
  characterSetRectPx,
  spacingOverSizeRatio,
  spacingSymmetry,
  thresholdParameter,
  displayOptions
) => {
  // TODO make sure rects are valid, ie height&width are nonnegative
  /* 
  // Given the desired spacingDeg, compute the letter sizes and locations and the  
  // stimulusBounds. If the stimulus exceeds the screen, then this code computes the 
  // max possible spacing maxSpacingDeg and recomputes the sizes and positions.
  //
  // maxSpacingDeg could be cached, so that future calls to this routine would 
  // require only one iteration, instead of two. However, this routine is
  // quick, so it may not be worth the trouble to cache its answers.
  //
  // We anticipate that the slowest computation is computing the characterSet bounds,
  // followed by rendering the letters. We r
  //
  // Target is at (targetXDeg, targetYDeg).
  // If (targetXPx,targetYPx) is not inside screenRect, issue error and quit.
  // level=log10(spacingDeg).
  */
  let spacingDeg = Math.pow(10, proposedLevel);
  let stimulusRectPx,
    flanker1XYDeg,
    flanker1XYPx,
    flanker2XYPx,
    flanker2XYDeg,
    spacingInnerDeg,
    maxSpacingDeg,
    spacingOuterDeg,
    sizeDeg,
    heightDeg,
    widthDeg,
    heightPx,
    widthPx,
    topPx,
    bottomPx;
  switch (targetKind) {
    case "letter":
      break;
    default:
      throw "At this point targetKind must be letter. gabor is coming.";
  }

  if (
    spacingRelationToSize === "none" &&
    !displayOptions.hasOwnProperty(targetSizeDeg)
  )
    throw "Must provide value for targetSizeDeg if spacingRelationToSize is set to 'none'";
  const targetXYPx = XYPixOfXYDeg(targetXYDeg, displayOptions);
  const targetIsFoveal = targetXYPx[0] === 0 && targetXYPx[1] === 0;

  // We will impose the target's height heightPx on all three letters in the triplet.
  // We scale the characterSet bounding box to have the specified heightPx.
  // widthPx = width of scaled characterSet bounding box.
  // Direction of the RADIAL spacing is specified by a dimensionless unit vector (from 0,0):
  // Tangential spacing direction is the unit vector orthogonal to the radial vector.

  // UNIT VECTORS
  const radialXY = targetXYDeg.map((z) => z / norm(targetXYDeg));
  const tangentialXY = [radialXY[1], -radialXY[0]];
  const horizontalXY = [1, 0];
  const verticalXY = [0, 1];

  // This loop accepts a requested spacingDeg and adjusts it, if necessary, to get the
  // stimulus to fit onscreen. If spacingDeg is already ok, then we'll do one pass.
  // If the stimulus extends beyond the screen, then we'll need 2 iterations. We allow
  // a 3rd iteration to allow for the case that the 2nd iteration isn't quite right, and
  // it homes in on the third.
  let v1XY, v2XY;
  for (let iteration of [...new Array(200).keys()]) {
    // SET TARGET SIZE
    switch (spacingRelationToSize) {
      case "none":
        // Use specified targetSizeDeg
        sizeDeg = displayOptions.targetSizeDeg;
        heightDeg = targetSizeIsHeightBool
          ? sizeDeg
          : (sizeDeg * characterSetRectPx.height) / characterSetRectPx.width;
        [, topPx] = XYPixOfXYDeg(
          [targetXYDeg[0], targetXYDeg[1] + heightDeg / 2],
          displayOptions
        );
        [, bottomPx] = XYPixOfXYDeg(
          [targetXYDeg[0], targetXYDeg[1] - heightDeg / 2],
          displayOptions
        );
        heightPx = topPx - bottomPx;
        widthPx =
          (heightPx * characterSetRectPx.width) / characterSetRectPx.height;
        break;
      case "ratio":
        // Use spacingDeg and spacingOverSizeRatio to set size.
        sizeDeg = spacingDeg / spacingOverSizeRatio;
        heightDeg = targetSizeIsHeightBool
          ? sizeDeg
          : (sizeDeg * characterSetRectPx.height) / characterSetRectPx.width;
        [, topPx] = XYPixOfXYDeg(
          [targetXYDeg[0], targetXYDeg[1] + heightDeg / 2],
          displayOptions
        );
        const [, bottomPx] = XYPixOfXYDeg(
          [targetXYDeg[0], targetXYDeg[1] - heightDeg / 2],
          displayOptions
        );
        heightPx = topPx - bottomPx;
        widthPx =
          (heightPx * characterSetRectPx.width) / characterSetRectPx.height;
        break;
      case "typographic":
        // Use spacingDeg to set size.
        widthDeg = 3 * spacingDeg;
        // heightDeg =
        //   widthDeg * (characterSetRectPx.height / characterSetRectPx.width);
        const [leftPx] = XYPixOfXYDeg(
          [targetXYDeg[0] - widthDeg / 2, targetXYDeg[1]],
          displayOptions
        );
        const [rightPx] = XYPixOfXYDeg(
          [targetXYDeg[0] + widthDeg / 2, targetXYDeg[1]],
          displayOptions
        );
        widthPx = rightPx - leftPx;
        heightPx =
          (widthPx * characterSetRectPx.height) / characterSetRectPx.width;
        break;
    }

    // Compute lower bound
    if (heightPx < displayOptions.targetMinimumPix) {
      spacingDeg = spacingDeg * (displayOptions.targetMinimumPix / heightPx);
      continue;
    }

    // COMPUTE STIMULUS RECT
    switch (spacingRelationToSize) {
      case "typographic":
        const widthFactor = widthPx / characterSetRectPx.width;
        stimulusRectPx = characterSetRectPx.scale(widthFactor);
        stimulusRectPx = stimulusRectPx.offset(targetXYPx);
        break;
      case "none": // 'none' and 'ratio' should behave the same; intentional fall-through
      case "ratio":
        switch (displayOptions.spacingDirection) {
          case "radial":
            if (targetIsFoveal) throw "Radial flankers are undefined at fovea.";
            spacingOuterDeg = spacingDeg;
            // Given the outer spacing, the inner spacing depends on the kind of
            // symmetry specified. flanker1 is outer. flanker2 is inner.
            switch (spacingSymmetry) {
              case "screen":
                flanker1XYDeg = [
                  targetXYDeg[0] + spacingDeg * radialXY[0],
                  targetXYDeg[1] + spacingDeg * radialXY[1],
                ];
                flanker1XYPx = XYPixOfXYDeg(flanker1XYDeg, displayOptions);
                const deltaXYPx = [
                  flanker1XYPx[0] - targetXYPx[0],
                  flanker1XYPx[1] - targetXYPx[1],
                ];
                flanker2XYPx = [
                  targetXYPx[0] - deltaXYPx[0],
                  targetXYPx[1] - deltaXYPx[1],
                ];
                flanker2XYDeg = XYDegOfXYPix(flanker2XYPx, displayOptions);
                const deltaXYDeg = [
                  flanker2XYDeg[0] - targetXYDeg[0],
                  flanker2XYDeg[1] - targetXYDeg[1],
                ];
                spacingInnerDeg = norm(deltaXYDeg);
                break;
              case "retina":
                spacingInnerDeg = spacingOuterDeg;
                break;
              case "cortex":
                const eccDeg = norm(targetXYDeg);
                const cortical =
                  Math.log10(eccDeg + spacingOuterDeg + 0.15) -
                  Math.log10(eccDeg + 0.15);
                spacingInnerDeg =
                  Math.pow(10, Math.log10(eccDeg + 0.15) - cortical) - 0.15;
                break;
            }
            v1XY = radialXY.map((z) => z * spacingInnerDeg);
            v2XY = radialXY.map((z) => z * -spacingOuterDeg);
            break;
          case "tangential":
            if (targetIsFoveal)
              throw "Tangential flankers are undefined at fovea.";
            v1XY = tangentialXY.map((z) => z * -spacingDeg);
            v2XY = tangentialXY.map((z) => z * spacingDeg);
            break;
          case "horizontal":
            if (!targetIsFoveal)
              throw "Horizontal flankers are undefined in the periphery.";
            v1XY = horizontalXY.map((z) => z * -spacingDeg);
            v2XY = horizontalXY.map((z) => z * spacingDeg);
            break;
          case "vertial":
            if (!targetIsFoveal)
              throw "Vertical flankers are undefined in the periphery.";
            v1XY = verticalXY.map((z) => z * -spacingDeg);
            v2XY = verticalXY.map((z) => z * spacingDeg);
            break;
        }
        flanker1XYDeg = [targetXYDeg[0] + v1XY[0], targetXYDeg[1] + v1XY[1]];
        flanker2XYDeg = [targetXYDeg[0] + v2XY[0], targetXYDeg[1] + v2XY[1]];
        flanker1XYPx = XYPixOfXYDeg(flanker1XYDeg, displayOptions);
        flanker2XYPx = XYPixOfXYDeg(flanker2XYDeg, displayOptions);
        stimulusRectPx = new Rectangle(
          [
            Math.min(flanker1XYPx[0], flanker2XYPx[0]),
            Math.min(flanker1XYPx[1], flanker2XYPx[1]),
          ],
          [
            Math.max(flanker1XYPx[0], flanker2XYPx[0]),
            Math.max(flanker1XYPx[1], flanker2XYPx[1]),
          ]
        );
        stimulusRectPx = stimulusRectPx.inset(-widthPx / 2, -heightPx / 2);
        break;
    }
    let largestBoundsRatio = getLargestBoundsRatio(
      stimulusRectPx,
      screenRectPx,
      targetXYPx,
      thresholdParameter,
      spacingRelationToSize,
      widthPx,
      heightPx
    );
    // Set largestBoundsRatio to some max, so we don't dwarf the value of spacingDeg
    largestBoundsRatio = Math.min(largestBoundsRatio, 1.5);
    maxSpacingDeg = spacingDeg / largestBoundsRatio;

    // WE'RE DONE IF STIMULUS FITS
    // Should be equivalent to isRectInRect(stimulusRectPx,screenRectPx)
    if (largestBoundsRatio <= 1) {
      if (
        !(
          (spacingDeg > Math.pow(10, proposedLevel) &&
            Math.round(heightPx) === displayOptions.targetMinimumPix) ||
          spacingDeg === Math.pow(10, proposedLevel) ||
          (spacingDeg < Math.pow(10, proposedLevel) &&
            0.99 < largestBoundsRatio)
        )
      )
        console.error(
          `While largestBoundsRatio is less than 1, none of the three viable conditions are met.\nspacingDeg is ${
            spacingDeg > Math.pow(10, proposedLevel)
              ? "larger than"
              : spacingDeg < Math.pow(10, proposedLevel)
              ? "less than"
              : "equal to"
          } QUEST's proposed spacing. Largest bounds ratio: ${largestBoundsRatio}.`
        );
      const targetAndFlankerLocationsPx = [targetXYPx];
      if (spacingRelationToSize === "ratio")
        targetAndFlankerLocationsPx.push(flanker1XYPx, flanker2XYPx);
      const stimulusParameters = {
        heightPx: heightPx,
        targetAndFlankersXYPx: targetAndFlankerLocationsPx,
      };
      return [spacingDeg, stimulusParameters];
    }

    // REDUCE SPACINGDEG TO MAKE STIMULUS FIT, AND TRY AGAIN
    spacingDeg = maxSpacingDeg;
  }
  throw `restrictSpacing was unable to find a suitable spacingDeg. maxSpacingDeg=${maxSpacingDeg}, targetMinimumPix=${displayOptions.targetMinimumPix}`;
};

const getLargestBoundsRatio = (
  stimulusRectPx,
  screenRectPx,
  targetXYPx,
  thresholdParameter,
  spacingRelationToSize,
  widthPx = 0,
  heightPx = 0
) => {
  // Many stimulus components are proportional to the threshold parameter, either
  // spacingDeg or targetSizeDeg. Here we determine, across the found bounds, what
  // is the largest ratio of stimulus to screen, measuring from the target location,
  // and including only components are are proportional to the threshold parameter.
  // Dividing that parameter by LargestBoundRatio gives the parameter value that will
  // make the stimulus just fit. That's the parameter's upper bound for rendering
  // without exceeding screen bounds, for this condition.

  // stimulusRectPx has four bounds. We check them all. We assume that each bound's
  // distance from the target location is proportional to a threshold parameter.
  // So, we first shift to place the origin at the target. Then we compute the ratio of
  // each stimulus bound to the corresponding screen bound. Ratios above 1 correspond
  // to extending off screen. LargestBoundsRatio is the biggest of the four ratios.

  // Runtime is negligible.

  // denis.pelli@nyu.edu December 20, 2021
  // Translated ajb December 20, 2021

  // Shift origin to the target
  let stim = stimulusRectPx.offset([-targetXYPx[0], -targetXYPx[1]]);
  let screen = screenRectPx.offset([-targetXYPx[0], -targetXYPx[1]]);
  screen = screen.inset(1, 1); // Give a 1 pixel margin

  // Check assumptions
  if (!(stim.width >= 0)) throw "Stimulus width is less than 0";
  if (!(stim.height >= 0)) throw "Stimulus height is less than 0";
  if (!(screen.width > 0)) throw "Screen width is less than or equal to 0";
  if (!(screen.height > 0)) throw "Screen height is less than or equal to 0";
  if (!(stim.width <= screen.width))
    console.error("Stimulus is wider than the screen");
  if (!(stim.height <= screen.height))
    console.error("Stimulus is taller than the screen");

  switch (thresholdParameter) {
    case "spacing":
      if (spacingRelationToSize === "none") {
        // Deduct fixed letter size.
        stim = stim.inset(widthPx / 2, heightPx / 2);
        screen = screen.inset(widthPx / 2, heightPx / 2);
      }
      break;
    case "size":
      break;
    default:
      throw "This routine expects thresholdParameter to be size or spacing.";
  }
  if (
    screen.left >= 0 ||
    screen.right <= 0 ||
    screen.top <= 0 ||
    screen.bottom >= 0
  ) {
    throw "Target offscreen.";
  }
  const ratios = {
    left: stim.left / screen.left,
    right: stim.right / screen.right,
    top: stim.top / screen.top,
    bottom: stim.bottom / screen.bottom,
  };
  const largestBoundsRatio = Math.max(...Object.values(ratios));
  if (largestBoundsRatio <= 0) throw "Largest ratio is non-positive.";
  return largestBoundsRatio;
};

const getBoundingRectFromCanvas = () => {
  const [canvas, context] = getCanvasContext();
  const canvasWidth = context.drawingBufferWidth;
  const canvasHeight = context.drawingBufferHeight;
  const pixels = new Uint8Array(4 * canvasWidth * canvasHeight);
  context.readPixels(
    0,
    0,
    canvasWidth,
    canvasHeight,
    context.RGBA,
    context.UNSIGNED_BYTE,
    pixels
  );
  logger(
    "non-zero pixels",
    pixels.filter((x) => x !== 0)
  );

  const bottomLeftFound = false;
  const latestDrawn = [];
  for (let i = 0; i < canvasWidth * canvasHeight * 4; i += 4) {
    let pixel = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
    let drawn = pixelDrawn(pixel);
    if (drawn && !bottomLeftFound) {
      bottomLeftFound = true;
      continue;
    }
    if (bottomLeftFound && drawn && !topRightFound) latestDrawn = [];
  }
  logger("latestDrawn", latestDrawn);
};

const pixelDrawn = (pixel) => {
  const [pixelR, pixelG, pixelB, pixelA] = pixel;
  const drawn = pixelR || pixelG || pixelB || pixelA;
  return drawn;
};
