import * as util from "../psychojs/src/util/index.js";
import * as visual from "../psychojs/src/visual/index.js";
import { warning } from "./errorHandling.js";
import {
  displayOptions,
  fixationConfig,
  letterConfig,
  repeatedLettersConfig,
  targetKind,
  viewingDistanceDesiredCm,
} from "./global.js";

import { psychoJS } from "./globalPsychoJS.js";
import {
  logger,
  XYPixOfXYDeg,
  XYDegOfXYPix,
  getUnionRect,
  isRectInRect,
  norm,
  Rectangle,
  validateRectPoints,
  tand,
  atand,
} from "./utils.js";

export const generateCharacterSetBoundingRects = (
  paramReader,
  cleanFontName
) => {
  const rects = {};
  for (const BC of paramReader.block_conditions) {
    const characterSet = String(paramReader.read("fontCharacterSet", BC)).split(
      ""
    );
    let font = paramReader.read("font", BC);
    if (paramReader.read("fontSource", BC) === "file")
      font = cleanFontName(font);
    const typographicCrowding =
      paramReader.read("spacingRelationToSize", BC) === "typographic" &&
      paramReader.read("thresholdParameter", BC) === "spacing";
    const padding = paramReader.read("fontPadding", BC);
    const letterRepeats = typographicCrowding ? 3 : 1;

    rects[BC] = _getCharacterSetBoundingBox(
      characterSet,
      font,
      psychoJS.window,
      letterRepeats,
      100,
      padding
    );
  }
  return rects;
};

const _getCharacterSetBoundingBox = (
  characterSet,
  font,
  window,
  repeats = 1,
  height = 50,
  padding = 0
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
    font: font,
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
    padding: padding,
  });
  const [centers, boundingRectPoints] = [{}, {}];
  let setAscent = -Infinity;
  let setDescent = -Infinity;
  const texts = [...characterSet.map((character) => character.repeat(repeats))];
  // Also add the individual characters, to show display charSet bounding boxes in typographic mode
  if (repeats > 1) texts.push(...characterSet);
  // For (simplified approximation of) each possible stimuli text...
  for (const textToSet of texts) {
    //... set our testStim to reflect that, so we can measure.
    const xy = [0, 0];
    testStim.setText(textToSet);
    // testStim.setPos(xy);
    testStim._updateIfNeeded(); // Maybe unnecassary, forces refreshing of stim

    // Get measurements of how far the text stim extends in each direction
    const thisMetrics = testStim.getTextMetrics();
    const thisBB = testStim.getBoundingBox(true);
    const ascent = thisMetrics.boundingBox.actualBoundingBoxAscent;
    const descent = thisMetrics.boundingBox.actualBoundingBoxDescent;
    const left = thisMetrics.boundingBox.actualBoundingBoxLeft;
    const right = thisMetrics.boundingBox.actualBoundingBoxRight;
    setAscent = Math.max(setAscent, ascent);
    setDescent = Math.max(setDescent, descent);

    // Get the bounding points around this specific text stim
    const thisBoundingRectPoints =
      textToSet.length === 1
        ? [
            [-left + xy[0], -descent + xy[1]],
            [right + xy[0], ascent + xy[1]],
          ]
        : [
            [xy[0] - thisBB.width / 2, xy[1] - thisBB.height / 2],
            [xy[0] + thisBB.width / 2, xy[1] + thisBB.height / 2],
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

  const normalizedAscent = setAscent / height;
  const normalizedDescent = setDescent / height;
  const ascentToDescent =
    normalizedAscent / (normalizedDescent + normalizedAscent);

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
    centers,
    ascentToDescent
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
  spacingIsOuterBool
) => {
  // TODO are these necessary? Should be (I think are?) compiler checks
  if (
    ![
      "radial",
      "tangential",
      "horizontal",
      "vertical",
      "horizontalAndVertical",
      "radialAndTangential",
    ].includes(spacingDirection)
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
        proposedLevel,
        letterConfig.targetEccentricityXYDeg,
        targetKind.current,
        screenRectPx,
        spacingRelationToSize,
        targetSizeIsHeightBool,
        characterSetRectPx,
        spacingOverSizeRatio,
        thresholdParameter
      );
      level = Math.log10(sizeDeg);
      break;
    case "spacing":
      [spacingDeg, stimulusParameters] = restrictSpacingDeg(
        proposedLevel,
        letterConfig.targetEccentricityXYDeg,
        targetKind.current,
        screenRectPx,
        spacingRelationToSize,
        targetSizeIsHeightBool,
        characterSetRectPx,
        spacingOverSizeRatio,
        spacingSymmetry,
        thresholdParameter,
        spacingIsOuterBool
      );
      level = Math.log10(spacingDeg);
      break;
  }
  return [level, stimulusParameters];
};

export const restrictSizeDeg = (
  proposedLevel,
  targetXYDeg,
  targetKind,
  screenRectPx,
  spacingRelationToSize,
  targetSizeIsHeightBool,
  characterSetRectPx,
  spacingOverSizeRatio,
  thresholdParameter
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
  let targetSizeDeg = Math.pow(10, proposedLevel);

  // We scale the alphabet bounding box to have the specified heightPx.
  // widthPx = width of scaled alphabet bounding box.

  // This loop accepts a requested targetSizeDeg and adjusts it, if necessary, to get the
  // stimulus to fit onscreen. If targetSizeDeg is already ok, then we'll do one pass.
  // If the stimulus extends beyond the screen, then we'll need 2 iterations. We allow
  // a 3rd iteration to allow for the case that the 2nd iteration isn't quite right, and
  // it homes in on the third.
  for (const iteration of [0, 1, 2, 3, 4, 5]) {
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
    const widthPx =
      heightPx * (characterSetRectPx.width / characterSetRectPx.height);
    let stimulusRectPx = characterSetRectPx.scale(
      widthPx / characterSetRectPx.width
      // heightPx / characterSetRectPx.height
    );
    stimulusRectPx = stimulusRectPx.offset(targetXYPx);

    // Compute lower bound
    const sizePx = targetSizeIsHeightBool ? heightPx : widthPx;
    if (sizePx < letterConfig.targetMinimumPix) {
      targetSizeDeg = targetSizeDeg * (letterConfig.targetMinimumPix / sizePx);
      continue;
    }
    // Compute upper px bound
    if (heightPx > letterConfig.fontMaxPx) {
      const newTargetSizeDeg =
        targetSizeDeg * (letterConfig.fontMaxPx / heightPx);
      targetSizeDeg = newTargetSizeDeg;
      continue;
    }

    // WE'RE DONE IF STIMULUS FITS
    if (isRectInRect(stimulusRectPx, screenRectPx)) {
      return [
        targetSizeDeg,
        {
          heightPx: heightPx,
          widthPx: widthPx,
          targetAndFlankersXYPx: [targetXYPx],
          sizeDeg: targetSizeDeg,
          heightDeg: heightDeg,
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
  spacingIsOuterBool
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
    flankerXYPxs,
    maxSpacingDeg,
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

  if (spacingRelationToSize === "none" && !letterConfig.targetSizeDeg)
    throw "Must provide value for targetSizeDeg if spacingRelationToSize is set to 'none'";
  const targetXYPx = XYPixOfXYDeg(targetXYDeg, displayOptions);
  const targetIsFoveal =
    targetXYPx[0] === fixationConfig.pos[0] &&
    targetXYPx[1] === fixationConfig.pos[1];

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
  let v1XY, v2XY, v3XY, v4XY;
  for (let iteration of [...new Array(200).keys()]) {
    // SET TARGET SIZE
    switch (spacingRelationToSize) {
      case "none":
        // Use specified targetSizeDeg
        sizeDeg = letterConfig.targetSizeDeg;
        if (targetSizeIsHeightBool) {
          heightDeg = sizeDeg;
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
        } else {
          widthDeg = sizeDeg;
          heightDeg =
            widthDeg * (characterSetRectPx.height / characterSetRectPx.width);
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
            widthPx * (characterSetRectPx.height / characterSetRectPx.width);
          heightDeg =
            XYDegOfXYPix(
              [targetXYPx[0], targetXYPx[1] + heightPx / 2],
              displayOptions
            )[1] -
            XYDegOfXYPix(
              [targetXYPx[0], targetXYPx[1] - heightPx / 2],
              displayOptions
            )[1];
        }
        break;
      case "ratio":
        // Use spacingDeg and spacingOverSizeRatio to set size.
        // NOTE for foveal targets (ie norm(targetXYDeg) == 0), or targets with tangential flankers, inner vs outer flanker distinction is undefined

        // FIX intended to swap inner and outer (??) flanker as the default, but is broken.
        // Ex. given spacingOverSizeRatio = 1, spacing does not equal size
        // if (
        //   spacingIsOuterBool ||
        //   norm(targetXYDeg) === 0 ||
        //   letterConfig.spacingDirection !== "radial"
        // ) {
        //   sizeDeg = spacingDeg / spacingOverSizeRatio;
        // } else {
        //   var eccDeg = norm(targetXYDeg); //target eccentricity in Deg
        //   var innerSpacing = eccDeg - (eccDeg * eccDeg) / (eccDeg + spacingDeg); // inner spacing in Deg
        //   sizeDeg = innerSpacing / spacingOverSizeRatio;
        // }
        sizeDeg = spacingDeg / spacingOverSizeRatio;
        if (targetSizeIsHeightBool) {
          heightDeg = sizeDeg;
          [, topPx] = XYPixOfXYDeg(
            [targetXYDeg[0], targetXYDeg[1] + heightDeg / 2],
            displayOptions
          );
          [, bottomPx] = XYPixOfXYDeg(
            [targetXYDeg[0], targetXYDeg[1] - heightDeg / 2],
            displayOptions
          );
          // I think that this is how we should do things, ie the above code assumes that
          // ascent == descent, ie that the center of the character is [x,y] with the top h/2 above
          // [, topPx] = XYPixOfXYDeg(
          //   [
          //     targetXYDeg[0],
          //     targetXYDeg[1] + heightDeg * characterSetRectPx.ascentToDescent,
          //   ],
          //   displayOptions
          // );
          // [, bottomPx] = XYPixOfXYDeg(
          //   [
          //     targetXYDeg[0],
          //     targetXYDeg[1] -
          //       heightDeg * (1 - characterSetRectPx.ascentToDescent),
          //   ],
          //   displayOptions
          // );
          heightPx = topPx - bottomPx;
          widthPx =
            (heightPx * characterSetRectPx.width) / characterSetRectPx.height;
        } else {
          widthDeg = sizeDeg;
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
            widthPx * (characterSetRectPx.height / characterSetRectPx.width);
          heightDeg =
            XYDegOfXYPix(
              [targetXYPx[0], targetXYPx[1] + heightPx / 2],
              displayOptions
            )[1] -
            XYDegOfXYPix(
              [targetXYPx[0], targetXYPx[1] - heightPx / 2],
              displayOptions
            )[1];
        }
        break;
      case "typographic":
        // Use spacingDeg to set size.
        widthDeg = 3 * spacingDeg;
        heightDeg =
          widthDeg * (characterSetRectPx.height / characterSetRectPx.width);
        sizeDeg = targetSizeIsHeightBool ? heightDeg : widthDeg;
        var [leftPx] = XYPixOfXYDeg(
          [targetXYDeg[0] - widthDeg / 2, targetXYDeg[1]],
          displayOptions
        );
        var [rightPx] = XYPixOfXYDeg(
          [targetXYDeg[0] + widthDeg / 2, targetXYDeg[1]],
          displayOptions
        );
        widthPx = rightPx - leftPx;
        heightPx =
          (widthPx * characterSetRectPx.height) / characterSetRectPx.width;
        break;
    }

    // Compute lower bound
    if (heightPx < letterConfig.targetMinimumPix) {
      spacingDeg = spacingDeg * (letterConfig.targetMinimumPix / heightPx);
      continue;
    }
    // Compute upper px bound
    if (heightPx > letterConfig.fontMaxPx) {
      if (spacingDeg <= 0)
        warning(
          `Illegal spacingDeg, spacingDeg <= 0. spacingDeg: ${spacingDeg}`
        );
      if (viewingDistanceDesiredCm.current <= 0 || displayOptions.pixPerCm <= 0)
        warning(
          `Viewing distance or pixPerCm <= 0. viewingDistance: ${viewingDistanceDesiredCm.current}, pixPerCm: ${displayOptions.pixPerCm}`
        );
      let flankerEccDeg;
      const targetEccDeg = Math.sqrt(targetXYDeg[0] ** 2 + targetXYDeg[1] ** 2);
      if (spacingIsOuterBool) {
        flankerEccDeg = targetEccDeg + spacingDeg;
      } else {
        flankerEccDeg = targetEccDeg - spacingDeg;
      }
      const targetEccPx =
        tand(targetEccDeg) *
        viewingDistanceDesiredCm.current *
        displayOptions.pixPerCm;
      let flankerEccPx =
        tand(flankerEccDeg) *
        viewingDistanceDesiredCm.current *
        displayOptions.pixPerCm;
      if (targetEccDeg > flankerEccDeg !== targetEccPx > flankerEccPx)
        warning(
          `Inconsistent ranking. targetEccDeg: ${targetEccDeg}, flankerEccDeg: ${flankerEccDeg}, targetEccPx: ${targetEccPx}, flankerEccPx: ${flankerEccPx}`
        );
      let spacingPx =
        (flankerEccPx - targetEccPx) * (letterConfig.fontMaxPx / heightPx);
      if (spacingIsOuterBool !== spacingPx > 0)
        warning(
          `spacingPx has wrong sign. targetEccDeg: ${targetEccDeg}, targetEccPx: ${targetEccPx}, spacingPx: ${spacingPx}, spacingIsOuterBool: ${spacingIsOuterBool}`
        );
      const oldSpacingPx = flankerEccPx - targetEccPx;
      flankerEccPx = targetEccPx + spacingPx;
      flankerEccDeg = atand(
        flankerEccPx /
          (viewingDistanceDesiredCm.current * displayOptions.pixPerCm)
      );
      if (spacingIsOuterBool) {
        spacingDeg = flankerEccDeg - targetEccDeg;
      } else {
        spacingDeg = targetEccDeg - flankerEccDeg;
      }
      if (spacingDeg < 0)
        throw `Mistake in fontMaxPx restricting code. spacingDeg < 0. spacingIsOuterBool: ${spacingIsOuterBool}, oldSpacingPx: ${oldSpacingPx}, spacingPx: ${spacingPx}, spacingDeg: ${spacingDeg}, targetEccDeg: ${targetEccDeg}, targetEccPx: ${targetEccPx}, flankerEccDeg: ${flankerEccDeg}, flankerEccPx: ${flankerEccPx}`;
      continue;
    }

    // COMPUTE STIMULUS RECT
    switch (spacingRelationToSize) {
      case "typographic":
        var widthFactor = widthPx / characterSetRectPx.width;
        stimulusRectPx = characterSetRectPx.scale(widthFactor);
        stimulusRectPx = stimulusRectPx.offset(targetXYPx);
        break;
      case "none": // 'none' and 'ratio' should behave the same; intentional fall-through
      case "ratio":
        switch (letterConfig.spacingDirection) {
          case "radial":
            if (targetIsFoveal) throw "Radial flankers are undefined at fovea.";
            ({ v1XY, v2XY } = _getRadialVectors(
              spacingDeg,
              spacingSymmetry,
              targetXYDeg,
              radialXY,
              targetXYPx
            ));
            break;
          case "tangential":
            if (targetIsFoveal)
              throw "Tangential flankers are undefined at fovea.";
            ({ v1XY, v2XY } = _getTangentialVectors(tangentialXY, spacingDeg));
            break;
          case "radialAndTangential":
            if (targetIsFoveal)
              throw "Radial and tangential flankers are undefined at fovea.";
            ({ v1XY, v2XY } = _getRadialVectors(
              spacingDeg,
              spacingSymmetry,
              targetXYDeg,
              radialXY,
              targetXYPx
            ));
            ({ v1XY: v3XY, v2XY: v4XY } = _getTangentialVectors(
              tangentialXY,
              spacingDeg
            ));
            break;
          case "horizontal":
            // TODO check in compiler
            if (!targetIsFoveal)
              throw "Horizontal flankers are undefined in the periphery.";
            ({ v1XY, v2XY } = _getHorizontalVectors(horizontalXY, spacingDeg));
            break;
          case "vertical":
            if (!targetIsFoveal)
              throw "Vertical flankers are undefined in the periphery.";
            ({ v1XY, v2XY } = _getVerticalVectors(verticalXY, spacingDeg));
            break;
          case "horizontalAndVertical":
            if (!targetIsFoveal)
              throw "Horizontal and vertical flankers are undefined in the periphery.";
            ({ v1XY, v2XY } = _getHorizontalVectors(horizontalXY, spacingDeg));
            ({ v1XY: v3XY, v2XY: v4XY } = _getVerticalVectors(
              verticalXY,
              spacingDeg
            ));
            break;
        }
        flankerXYPxs = _getFlankerXYPxs(targetXYDeg, [v1XY, v2XY, v3XY, v4XY]);
        stimulusRectPx = _getRectAroundFlankers(flankerXYPxs);
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
            Math.round(heightPx) === letterConfig.targetMinimumPix) ||
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
      if (spacingRelationToSize !== "typographic")
        targetAndFlankerLocationsPx.push(...flankerXYPxs);
      // const characterSetUnitHeightScalar = 1 / characterSetRectPx.height;
      const stimulusParameters = {
        widthPx: Math.round(widthPx),
        heightPx: Math.round(heightPx), // * characterSetUnitHeightScalar,
        targetAndFlankersXYPx: targetAndFlankerLocationsPx,
        sizeDeg: sizeDeg,
        spacingDeg: spacingDeg,
        heightDeg: heightDeg,
      };
      return [spacingDeg, stimulusParameters];
    }

    // REDUCE SPACINGDEG TO MAKE STIMULUS FIT, AND TRY AGAIN
    spacingDeg = maxSpacingDeg;
  }
  throw `restrictSpacing was unable to find a suitable spacingDeg. maxSpacingDeg=${maxSpacingDeg}, targetMinimumPix=${letterConfig.targetMinimumPix}`;
};

export const getLargestBoundsRatio = (
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

  // denis.pelli AT nyu.edu December 20, 2021
  // Translated ajb December 20, 2021

  // Shift origin to the target
  let stim = stimulusRectPx.offset([-targetXYPx[0], -targetXYPx[1]]);
  let screen = screenRectPx.offset([-targetXYPx[0], -targetXYPx[1]]);
  screen = screen.inset(1, 1); // Give a 1 pixel margin

  // Check assumptions
  if (!(stim.width >= 0)) throw "stimulus width < 0";
  if (!(stim.height >= 0)) throw "stimulus height < 0";
  if (!(screen.width > 0)) throw "screen width <= 0";
  if (!(screen.height > 0)) throw "screen height <= 0";
  if (!(stim.width <= screen.width))
    console.error("stimulus WIDER than screen");
  if (!(stim.height <= screen.height))
    console.error("stimulus TALLER than screen");

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

const _getRectAroundFlankers = (flankersPoints) => {
  const xValues = flankersPoints.map((coord) => coord[0]);
  const yValues = flankersPoints.map((coord) => coord[1]);
  return new Rectangle(
    [Math.min(...xValues), Math.min(...yValues)],
    [Math.max(...xValues), Math.max(...yValues)]
  );
};
function _getRadialVectors(
  spacingDeg,
  spacingSymmetry,
  targetXYDeg,
  radialXY,
  targetXYPx
) {
  let flanker1XYDeg, flanker1XYPx, flanker2XYDeg, flanker2XYPx, spacingInnerDeg;
  let spacingOuterDeg = spacingDeg;
  // Given the outer spacing, the inner spacing depends on the kind of
  // symmetry specified. flanker1 is outer. flanker2 is inner.
  switch (spacingSymmetry) {
    case "screen":
      flanker1XYDeg = [
        targetXYDeg[0] + spacingDeg * radialXY[0],
        targetXYDeg[1] + spacingDeg * radialXY[1],
      ];
      flanker1XYPx = XYPixOfXYDeg(flanker1XYDeg, displayOptions);
      var deltaXYPx = [
        flanker1XYPx[0] - targetXYPx[0],
        flanker1XYPx[1] - targetXYPx[1],
      ];
      flanker2XYPx = [
        targetXYPx[0] - deltaXYPx[0],
        targetXYPx[1] - deltaXYPx[1],
      ];
      flanker2XYDeg = XYDegOfXYPix(flanker2XYPx, displayOptions);
      var deltaXYDeg = [
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
        Math.log10(eccDeg + spacingOuterDeg + 0.15) - Math.log10(eccDeg + 0.15);
      const innerEccDeg =
        Math.pow(10, Math.log10(eccDeg + 0.15) - cortical) - 0.15;
      spacingInnerDeg = eccDeg - innerEccDeg;
      break;
  }
  const v1XY = radialXY.map((z) => z * spacingOuterDeg);
  const v2XY = radialXY.map((z) => z * -spacingInnerDeg);
  return { v1XY, v2XY };
}

const _getTangentialVectors = (tangentialXY, spacingDeg) => {
  const v1XY = tangentialXY.map((z) => z * -spacingDeg);
  const v2XY = tangentialXY.map((z) => z * spacingDeg);
  return { v1XY, v2XY };
};
const _getHorizontalVectors = (horizontalXY, spacingDeg) => {
  const v1XY = horizontalXY.map((z) => z * -spacingDeg);
  const v2XY = horizontalXY.map((z) => z * spacingDeg);
  return { v1XY, v2XY };
};
const _getVerticalVectors = (verticalXY, spacingDeg) => {
  const v1XY = verticalXY.map((z) => z * -spacingDeg);
  const v2XY = verticalXY.map((z) => z * spacingDeg);
  return { v1XY, v2XY };
};

const _getFlankerXYPxs = (targetXYDeg, flankerPositionVectors) => {
  const flankerXYPxs = flankerPositionVectors
    .filter((x) => x !== undefined)
    .map((v) => {
      const flankerXYDeg = [targetXYDeg[0] + v[0], targetXYDeg[1] + v[1]];
      return XYPixOfXYDeg(flankerXYDeg, displayOptions);
    });
  return flankerXYPxs;
};
