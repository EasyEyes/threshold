import * as util from "../psychojs/src/util/index.js";
import * as visual from "../psychojs/src/visual/index.js";

import {
  logger,
  XYPixOfXYDeg,
  XYDegOfXYPix,
  rectFromPixiRect,
  getUnionRect,
  isRectInRect,
  isInRect,
  norm,
  Rectangle,
} from "./utils.js";

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
  const [position1Pix] = XYPixOfXYDeg([position1Deg], displayOptions);
  const [position2Pix] = XYPixOfXYDeg([position2Deg], displayOptions);
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
  const [targetEccentricityXYPix] = XYPixOfXYDeg(
    [targetEccentricityXYDeg],
    displayOptions
  );
  const [targetTopPix] = XYPixOfXYDeg([targetTopDeg], displayOptions);
  const proposedHeightPix = targetTopPix[1] - targetEccentricityXYDeg[1];

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
export const getCharacterSetBoundingBox = (
  characterSet,
  targetFont,
  window,
  repeats = 1
) => {
  const height = 50;
  // ASSUMES `height` corresponds to `fontSize` in psychojs/pixi
  let characterSetBoundingRect = [
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
  for (const character of characterSet) {
    let textToSet = character.repeat(repeats);
    testStim.setText(textToSet);
    testStim._updateIfNeeded(); // Maybe unnecassary, forces refreshing of stim
    let thisBoundingBox = testStim.getBoundingBox(true);
    let thisBoundingRect = rectFromPixiRect(thisBoundingBox);
    characterSetBoundingRect = getUnionRect(
      thisBoundingRect,
      characterSetBoundingRect
    );
  }
  const normalizedCharacterSetBoundingPoints = [
    [
      characterSetBoundingRect[0][0] / height,
      characterSetBoundingRect[0][1] / height,
    ],
    [
      characterSetBoundingRect[1][0] / height,
      characterSetBoundingRect[1][1] / height,
    ],
  ];
  const normalizedCharacterSetBoundingRect = new Rectangle(
    ...normalizedCharacterSetBoundingPoints
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
// // Find the font size for the string containing the flankers & target
// /**
//  *
//  * @param {PsychoJS.window} window The window being displayed to
//  * @param {Number} spacingPx Desired spacing, ie intensity/threshold/etc from QUEST, in pixels
//  * @param {PsychoJS.visual.textStim} targetStimulus The target, and flankers, to be shown
//  * @param {PsychoJS.visual.textStim} fixationStimulus The fixation to be shown
//  * @param {Object} displayOptions
//  * @param {Number} displayOptions.pixPerCm Pixels per centimeter of participant's display
//  * @param {Number} displayOptions.viewingDistanceCm Participant's viewing distance in cm
//  * @param {Number} displayOptions.minimumHeight Smallest height (in px) that a stimulus can be
//  * @returns {[Number, Number]} Value to be used as the height for targetStimulus, value to be used as the level this trial
//  */
// export const getTypographicHeight = (
//   window,
//   proposedLevel,
//   targetStimulus,
//   fixationStimulus,
//   displayOptions
// ) => {
//   const fixationBoundingBox = fixationStimulus.getBoundingBox(true);
//   const fixationWidth = fixationBoundingBox.width;
//   const fixationHeight = fixationBoundingBox.height;

//   // TODO generalize to other fixation locations, ie not just [0,0]
//   const usableSpace = [
//     Math.round(window._size[0] / 2 - fixationWidth), // Width
//     Math.round(window._size[1] / 2 - fixationHeight), // Height
//   ];
//   const proposedSpacingPx = spacingPixelsFromLevel(
//     proposedLevel,
//     displayOptions.pixPerCm,
//     displayOptions.viewingDistanceCm
//   );

//   // TODO verify that desiredStringWidth is what is desired
//   /* From Denis:
//         If thresholdParameter is "spacing" then the font size of string is
//         adjusted so that the width of the string is 3× specified spacing */
//   const proposedSpacingIsTooLarge = proposedSpacingPx * 3 > usableSpace[0];
//   const desiredStringWidth = proposedSpacingIsTooLarge
//     ? usableSpace[0]
//     : Math.round(proposedSpacingPx * 3);
//   const level = proposedLevel;
//   if (proposedSpacingIsTooLarge) {
//     let level = levelFromSpacingPixels(
//       desiredStringWidth / 3,
//       displayOptions.pixPerCm,
//       displayOptions.viewingDistanceCm
//     );
//   }
//   // Get the width, given our desired height
//   const testHeight = displayOptions.minimumHeight * 10;
//   targetStimulus.setHeight(testHeight);
//   targetStimulus._updateIfNeeded();
//   const testWidth = targetStimulus.getBoundingBox(true).width;
//   // Find the height we should use, given our desired string width
//   const widthOverHeightRatio = testWidth / testHeight;
//   const desiredHeight = desiredStringWidth / widthOverHeightRatio;
//   // Check that the desired height isn't too small
//   if (desiredHeight < displayOptions.minimumHeight) {
//     let desiredHeight = displayOptions.minimumHeight;
//     const minDesiredStringWidth = desiredHeight * widthOverHeightRatio;
//     const minSpacingPx = Math.round(minDesiredStringWidth / 3);
//     let level = levelFromSpacingPixels(minSpacingPx);
//   }
//   return [desiredHeight, level];
// };

// export const boundLevel = (proposedLevel) => {
//   const upperBounded = getUpperBoundedLevel(
//     proposedLevel,
//     targetPositionDeg,
//     screenDimensions,
//     spacingDirection,
//     spacingOverSizeRatio,
//     pixPerCm,
//     viewingDistanceCm,
//     nearPointXYDeg,
//     nearPointXYPix
//   );
//   const lowerBounded = getLowerBoundedLevel(upperBounded);
// };
// /*
//  * If the proposed `level` would cause the stimuli to the be presented off screen,
//  * get the largest value for `level` which will actually fit on screen.
//  * Used in `ratio` mode, rather than `typographic`
//  */
// export const getUpperBoundedLevel = (
//   proposedLevel,
//   targetPositionDeg,
//   screenDimensions,
//   spacingDirection,
//   spacingOverSizeRatio,
//   normalizedCharacterSetBoundingRect,
//   displayOptions
// ) => {
//   // First check that the
//   const [targetPositionPx] = XYPixOfXYDeg([targetPositionDeg], displayOptions);
//   const screenBoundsPx = [
//     [-screenDimensions.width / 2, -screenDimensions.height / 2],
//     [-screenDimensions.width / 2, -screenDimensions.height / 2],
//   ];
//   const screenRectPx = {
//     left: screenBoundsPx[0][0],
//     right: screenBoundsPx[1][0],
//     bottom: screenBoundsPx[0][1],
//     top: screenBoundsPx[1][1],
//   };
//   const targetIsOnScreen = isInRect(
//     targetPositionPx[0],
//     targetPositionPx[1],
//     screenBoundsPx
//   );
//   if (!targetIsOnScreen)
//     throw "Target is off-screen. Please contact experimenter.";

//   const stimulusBoundsPx = getStimulusBoundsPx(
//     proposedLevel,
//     targetPositionDeg,
//     spacingDirection,
//     spacingOverSizeRatio,
//     normalizedCharacterSetBoundingRect
//   );

//   const stimulusRectPx = {
//     left: stimulusBoundsPx[0][0],
//     right: stimulusBoundsPx[1][0],
//     bottom: stimulusBoundsPx[0][1],
//     top: stimulusBoundsPx[1][1],
//   };
//   const levelTooLarge = !isRectInRect(stimulusRectPx, screenRectPx);

//   return largestPossibleLevel;
// };
// export const getLowerBoundedLevel = (
//   proposedLevel,
//   spacingOverSizeRatio,
//   targetEccentricityXYDeg,
//   targetMinimumPix
// ) => {
//   // Given level (log), get character height (px)
//   const targetHeightPix = getTargetHeightPix(
//     proposedLevel,
//     spacingOverSizeRatio,
//     targetEccentricityXYDeg
//   );
//   // Check whether this height is less than the minimum
//   const levelIsTooSmall = targetHeightPix < targetMinimumPix;
//   // If the value of `proposedLevel` is fine, just return it
//   if (!levelIsTooSmall) return proposedLevel;
//   // Else work backwards...
//   const minimumSpacingPix = Math.round(targetMinimumPix * spacingOverSizeRatio);
//   // ... to find...
//   const minimumSpacingDeg = pixelsToDegrees(minimumSpacingPix, {
//     pixPerCm: pixPerCm,
//     viewingDistanceCm: viewingDistanceCm,
//   });
//   // ... the closet value to `proposedLevel` which doesn't produce too small a font height
//   return Math.log10(minimumSpacingDeg);
// };
// /**
//  * Tests whether these proposed parameters for presentation would draw improperly, eg extend beyond the extent of the screen
//  * @todo Test whether the flankers interfer with eachother
//  * @param {Number} proposedLevel Level to be tested, as provided by QUEST
//  * @param {Number[]} targetXYPix [x,y] position of the target (in pixels)
//  * @param {Number[]} fixationXYPix [x,y] position of the fixation (in pixels)
//  * @param {"radial"|"tangential"} spacingDirection Orientation of flankers relative to fixation-target
//  * @param {Object} displayOptions Set of parameters for the specifics of presentation
//  * @todo Specify necessary members of `displayOptions`
//  * @returns {Boolean}
//  */
// const unacceptableStimuli = (
//   proposedLevel,
//   targetXYPix,
//   fixationXYPix,
//   spacingDirection,
//   displayOptions
// ) => {
//   const areaFlankersCover = flankersExtent(
//     proposedLevel,
//     targetXYPix,
//     fixationXYPix,
//     spacingDirection,
//     displayOptions
//   );
//   // TODO take the size of fixation into account
//   // const fixationInfringed = rectangleContainsPoint(
//   //   areaFlankersCover,
//   //   fixationXYPix
//   // );
//   const stimuliExtendOffscreen = rectangleOffscreen(areaFlankersCover, {
//     width: screen.width,
//     height: screen.height,
//   });
//   // const badPresentation = fixationInfringed || stimuliExtendOffscreen;
//   const badPresentation = stimuliExtendOffscreen;
//   return badPresentation;
// };

// /**
//  * Determines whether any part of a given rectangle will extend beyond the screen
//  * @param {Number[][]} rectangle Array of two [x,y] points, defining a rectangle
//  * @param {Object} screenDimensions
//  * @param {Number} screenDimensions.width Width of the screen
//  * @param {Number} screenDimensions.height Height of the screen
//  * @returns {Boolean}
//  */
// const rectangleOffscreen = (rectangle, screenDimensions) => {
//   const pointOffScreen = (point) =>
//     Math.abs(point[0]) > screenDimensions.width / 2 ||
//     Math.abs(point[1]) > screenDimensions.height / 2;
//   return rectangle.some(pointOffScreen); // VERIFY this logic is correct
// };

// /**
//  * Determine whether a given point lies inside a given rectangle
//  * @param {Number[][]} rectangle Array of two [x,y] points, which define an area
//  * @param {Number[]} point [x,y] coordinate of a point which may be within rectangle
//  * @returns {Boolean}
//  */
// const rectangleContainsPoint = (rectangle, point) => {
//   const leftX = Math.min(rectangle[0][0], rectangle[1][0]);
//   const rightX = Math.max(rectangle[0][0], rectangle[1][0]);
//   const lowerY = Math.min(rectangle[0][1], rectangle[1][1]);
//   const upperY = Math.max(rectangle[0][1], rectangle[1][1]);
//   const xIsIn = point[0] >= leftX && point[0] <= rightX;
//   const yIsIn = point[1] >= lowerY && point[1] <= upperY;
//   return xIsIn && yIsIn;
// };

// /**
//  * Return the extreme points of a rectangle bounding the pair of flankers
//  * @param {Number} level Suggested level from QUEST
//  * @param {Number[]} targetPosition [x,y] position of the target stimulus
//  * @param {Number[]} fixationPosition [x,y] position of the fixation stimulus
//  * @param {("radial"|"tangential")} flankerOrientation Arrangement of the flankers relative to the line between fixation and target
//  * @param {Object} sizingParameters Parameters for drawing stimuli
//  * @param {Number} sizingParameters.spacingOverSizeRatio Ratio of distance between flanker&target to stimuli letter height
//  * @param {Number} sizingParameters.minimumHeight Minimum stimulus letter height (in same units as other parameters)
//  * @param {String} sizingParameters.fontFamily Name of the fontFamily in which the stimuli will be drawn
//  * @param {Number} sizingParameters.pixPerCm Pixel/cm ratio of the display
//  * @param {Number} sizingParameters.viewingDistanceCm Distance (in cm) of the observer from the near-point
//  * @param {String[]} sizingParameters.flankerCharacters List of the (2) characters that will be used for the flankers
//  * @param {String} sizingParameters.targetCharacter The character that will be used for the target
//  * @param {PsychoJS.window} sizingParameters.window Window object, used for creating a mock stimuli for measurement
//  * @returns {Number[][]} [[x_min, y_min], [x_max, y_max]] Array of defining points of the area over which flankers extend
//  */
// const flankersExtent = (
//   level,
//   targetPosition,
//   fixationPosition,
//   flankerOrientation,
//   sizingParameters
// ) => {
//   const spacingDegrees = Math.pow(10, level);
//   const spacingPixels = Math.abs(
//     degreesToPixels(spacingDegrees, {
//       pixPerCm: sizingParameters.pixPerCm,
//       viewingDistanceCm: sizingParameters.viewingDistanceCm,
//     })
//   );
//   const flankerLocations = wronggetFlankerLocations(
//     targetPosition,
//     fixationPosition,
//     flankerOrientation,
//     spacingPixels
//   );
//   try {
//     const flankerBoxDimensions = boundingBoxFromSpacing(
//       spacingPixels,
//       sizingParameters.spacingOverSizeRatio,
//       sizingParameters.minimumHeight,
//       sizingParameters.fontFamily,
//       sizingParameters.window,
//       sizingParameters.flankerCharacters
//     );
//     const boundingPoints = [];
//     const fixationXY = sizingParameters.fixationXYPix;
//     flankerLocations.forEach((flankerPosition, i) => {
//       const boundingPoint = [];
//       if (targetPosition[0] < fixationXY[0]) {
//         boundingPoint.push(
//           flankerPosition[0] -
//             (i === 0 ? -1 : 1) * (flankerBoxDimensions.width / 2)
//         );
//       } else {
//         boundingPoint.push(
//           flankerPosition[0] +
//             (i === 0 ? -1 : 1) * (flankerBoxDimensions.width / 2)
//         );
//       }
//       if (targetPosition[1] < fixationXY[1]) {
//         boundingPoint.push(
//           flankerPosition[1] -
//             (i === 0 ? -1 : 1) * (flankerBoxDimensions.height / 2)
//         );
//       } else {
//         boundingPoint.push(
//           flankerPosition[1] +
//             (i === 0 ? -1 : 1) * (flankerBoxDimensions.height / 2)
//         );
//       }
//       boundingPoints.push(boundingPoint);
//     });
//     return boundingPoints;
//   } catch (error) {
//     console.error("Error estimating flankers extent.", error);
//     return error;
//   }
// };

// /**
//  * Given a spacing value (in pixels), estimate a (non-tight) bounding box
//  * @param {Number} spacing Spacing which will be used to place flanker
//  * @param {Number} spacingOverSizeRatio Specified ratio of distance between flanker&target to letter height
//  * @param {Number} minimumHeight Smallest allowable letter height for flanker
//  * @param {String} font Font-family in which the stimuli will be presented
//  * @param {PsychoJS.window} window PsychoJS window, used to create a stimulus to be measured
//  * @param {String[]} testCharacters List of the flanker characters
//  * @returns
//  */
// const boundingBoxFromSpacing = (
//   spacing,
//   spacingOverSizeRatio,
//   minimumHeight,
//   font,
//   window,
//   testCharacters = ["j", "Y"]
// ) => {
//   const height = Math.max(spacing / spacingOverSizeRatio, minimumHeight);
//   try {
//     const testTextStims = testCharacters.map(
//       (character) =>
//         new visual.TextStim({
//           win: window,
//           name: "testTextStim",
//           text: character,
//           font: font,
//           units: "pix", // ASSUMES that parameters are in pixel units
//           pos: [0, 0],
//           height: height,
//           wrapWidth: undefined,
//           ori: 0.0,
//           color: new util.Color("black"),
//           opacity: 1.0,
//           depth: -7.0,
//           autoDraw: false,
//           autoLog: false,
//         })
//     );
//     const boundingBoxes = testTextStims.map((stim) =>
//       stim.getBoundingBox(true)
//     );
//     const heights = boundingBoxes.map((box) => box.height);
//     const widths = boundingBoxes.map((box) => box.width);
//     const maximalBoundingBox = {
//       height: Math.max(...heights),
//       width: Math.max(...widths),
//     };
//     return maximalBoundingBox;
//   } catch (error) {
//     console.error(
//       "Error estimating bounding box of flanker. Likely due to too large a `proposedLevel` value being tested.",
//       error
//     );
//     return { height: Infinity, width: Infinity };
//   }
// };

// /**
//  * Calculate the (2D) coordinates of two tangential flankers, linearly symmetrical around a target at targetPosition
//  * @todo Add parameter/support for log-symmetric spacing
//  * @param {Number[]} targetPosition [x,y] position of the target
//  * @param {Number[]} fixationPosition [x,y] position of the fixation point
//  * @param {Number} spacing How far the flankers are to be from the target (in the same units as the target & fixation positions)
//  * @returns {Number[][]} Array containing two Arrays which represent the positions of Flanker 1 and Flanker 2
//  */
// const tangentialFlankerPositionsDeg = (targetPosition, spacing) => {
//   let x, i; // Variables for anonymous fn's
//   // Get the vector perpendicular to v
//   const p = [targetPosition[1], -targetPosition[0]]; // SEE https://gamedev.stackexchange.com/questions/70075/how-can-i-find-the-perpendicular-to-a-2d-vector

//   // Find the point that is `spacing` far from `targetPosition` along p
//   // SEE https://math.stackexchange.com/questions/175896/finding-a-point-along-a-line-a-certain-distance-away-from-another-point
//   /// Find the length of `p`
//   const llpll = Math.sqrt(
//     p.map((x) => x ** 2).reduce((previous, current) => previous + current)
//   );
//   /// Normalize `p`
//   const u = p.map((x) => x / llpll);
//   /// Find our two new points, `spacing` distance away from targetPosition along line `p`
//   const flankerPositions = [
//     targetPosition.map((x, i) => x + spacing * u[i]),
//     targetPosition.map((x, i) => x - spacing * u[i]),
//   ];
//   return flankerPositions;
// };

// /**
//  * Calculate the (2D) coordinates of two radial flankers, linearly symmetrical around a target at targetPosition
//  * @todo Add parameter/support for log-symmetric spacing
//  * @param {Number[]} targetPosition [x,y] position of the target
//  * @param {Number[]} fixationPosition [x,y] position of the fixation point
//  * @param {Number} spacing How far the flankers are to be from the target (in the same units as the target & fixation positions)
//  * @returns {Number[][]} Array containing two Arrays, which represent the positions of Flanker 1 and Flanker 2
//  */
// const radialFlankerPositionsDeg = (targetPositionDeg, spacingDeg) => {
//   // SEE https://math.stackexchange.com/questions/175896/finding-a-point-along-a-line-a-certain-distance-away-from-another-point

//   /// Find the length of v
//   const llvll = Math.sqrt(
//     targetPositionDeg
//       .map((x) => x ** 2)
//       .reduce((previous, current) => previous + current)
//   );
//   /// Normalize v
//   const u = v.map((x) => x / llvll);
//   /// Find our two new points, `spacing` distance away from targetPosition along line v
//   const flankerPositions = [
//     targetPosition.map((x, i) => x + spacing * u[i]),
//     targetPosition.map((x, i) => x - spacing * u[i]),
//   ];
//   return flankerPositions;
// };

// /**
//  * Return the coordinates of the two flankers around a given target.
//  * @param {Number[]} targetPosition [x,y] position of the target stimuli
//  * @param {Number[]} fixationPosition [x,y] position of the fixation stimuli
//  * @param {("radial"|"tangential")} flankerOrientation String specifying the position of the flankers relative to the line between fixation and the target
//  * @param {Number} spacing Distance between the target and one flanker
//  * @returns {Number[][]} Array containing two [x,y] arrays, each representing the location of one flanker
//  */
// export const wronggetFlankerLocations = (
//   targetPosition,
//   fixationPosition,
//   flankerOrientation,
//   spacing
// ) => {
//   switch (flankerOrientation) {
//     case "radial":
//       return radialFlankerPositions(targetPosition, fixationPosition, spacing);
//     case "tangential":
//       return tangentialFlankerPositions(
//         targetPosition,
//         fixationPosition,
//         spacing
//       );
//     default:
//       console.error(
//         "Unknown flankerOrientation specified, ",
//         flankerOrientation
//       );
//   }
// };

// export const getTestabilityBoundedLevel = (
//   proposedLevel,
//   pixPerCm,
//   viewingDistanceCm,
//   spacingOverSizeRatio,
//   font,
//   minimumHeight,
//   window
// ) => {
//   const granularityOfChange = 0.05;
//   const smallestDisplayableLevel = levelFromTargetHeight(
//     minimumHeight,
//     spacingOverSizeRatio,
//     pixPerCm,
//     viewingDistanceCm
//   );
//   if (proposedLevel <= smallestDisplayableLevel)
//     return smallestDisplayableLevel;
//   if (
//     testableLevel(
//       proposedLevel,
//       pixPerCm,
//       viewingDistanceCm,
//       spacingOverSizeRatio,
//       font,
//       window
//     )
//   )
//     return proposedLevel;
//   return getTestabilityBoundedLevel(
//     proposedLevel - granularityOfChange,
//     pixPerCm,
//     viewingDistanceCm,
//     spacingOverSizeRatio,
//     font,
//     minimumHeight,
//     window
//   );
// };

// export const testableLevel = (
//   proposedLevel,
//   pixPerCm,
//   viewingDistanceCm,
//   spacingOverSizeRatio,
//   font,
//   window
// ) => {
//   const spacingPx = spacingPixelsFromLevel(
//     proposedLevel,
//     pixPerCm,
//     viewingDistanceCm
//   );
//   const heightPx = spacingPx / spacingOverSizeRatio;
//   try {
//     const testStim = new visual.TextStim({
//       win: window,
//       name: "testTextStim",
//       text: "H", // ASSUMES text parameter doesn't matter much for this
//       font: font,
//       units: "pix",
//       pos: [0, 0],
//       height: heightPx,
//       wrapWidth: undefined,
//       ori: 0.0,
//       color: new util.Color("black"),
//       opacity: 1.0,
//       depth: -7.0,
//       autoDraw: false,
//       autoLog: false,
//     });
//     return true;
//   } catch (e) {
//     return false;
//   }
// }
