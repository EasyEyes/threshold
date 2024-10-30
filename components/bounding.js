import * as util from "../psychojs/src/util/index.js";
import * as visual from "../psychojs/src/visual/index.js";
import { warning } from "./errorHandling.js";
import {
  displayOptions,
  fixationConfig,
  letterConfig,
  targetKind,
  status,
  viewingDistanceCm,
  rc,
  targetEccentricityDeg,
  targetTextStimConfig,
} from "./global.js";
import { degreesToPixels, toFixedNumber } from "./utils";

import { paramReader } from "../threshold.js";

import { psychoJS } from "./globalPsychoJS.js";
import {
  logger,
  xyPxOfDeg,
  xyDegOfPx,
  getUnionRect,
  isRectInRect,
  norm,
  Rectangle,
  CharacterSetRect,
  validateRectPoints,
} from "./utils.js";
import { getScreenDimensions } from "./eyeTrackingFacilitation.ts";
import { Screens } from "./multiple-displays/globals.ts";
import { XYDegOfPx, XYPxOfDeg } from "./multiple-displays/utils.ts";

//create a canvas
const canvas = document.createElement("canvas");
export const ctx = canvas.getContext("2d");
canvas.style.position = "fixed";
canvas.style.left = 0;
canvas.style.top = 0;
canvas.style.pointerEvents = "none";
canvas.id = "boundingCanvas";
// canvas.width = Screens[0].window._size[0];
// canvas.height = Screens[0].window._size[1];

let appendToDocument = true;

export const generateCharacterSetBoundingRects = (
  paramReader,
  cleanFontName,
) => {
  const rects = {};
  for (const BC of paramReader.block_conditions) {
    const characterSet = String(paramReader.read("fontCharacterSet", BC)).split(
      "",
    );
    let font = paramReader.read("font", BC);
    if (paramReader.read("fontSource", BC) === "file")
      font = cleanFontName(font);
    const typographicCrowding =
      paramReader.read("spacingRelationToSize", BC) === "typographic" &&
      paramReader.read("thresholdParameter", BC) === "spacingDeg";
    const padding = paramReader.read("fontPadding", BC);
    const letterRepeats = typographicCrowding ? 3 : 1;

    rects[BC] = _getCharacterSetBoundingBox(
      characterSet,
      font,
      psychoJS.window,
      letterRepeats,
      100,
      padding,
    );
  }
  return rects;
};

export const _getCharacterSetBoundingBox = (
  characterSet,
  font,
  window,
  repeats = 1,
  height = 50,
  padding = 0,
) => {
  // ASSUMES `height` corresponds to `fontSize` in psychojs/pixi
  let characterSetBoundingRectPoints = [
    [0, 0],
    [0, 0],
  ];
  const testStim = new visual.TextStim({
    name: "characterSetBoundingBoxStim",
    win: window,
    color: new util.Color("black"),
    ...targetTextStimConfig,
    height: height,
    font: font,
    padding: padding,
  });
  const [centers, boundingRectPoints] = [{}, {}];
  let typographicFactor = 1;
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
    testStim.setPos(xy);
    testStim.setHeight(height);
    testStim._updateIfNeeded(); // Maybe unnecassary, forces refreshing of stim
    // Get measurements of how far the text stim extends in each direction
    const thisMetrics = testStim.getTextMetrics();
    const thisBB = testStim.getBoundingBox(true);
    const ascent = thisMetrics.boundingBox.actualBoundingBoxAscent;
    const descent = thisMetrics.boundingBox.actualBoundingBoxDescent;
    const left = thisMetrics.boundingBox.actualBoundingBoxLeft;
    const right = thisMetrics.boundingBox.actualBoundingBoxRight;
    const actualHeight = Math.abs(ascent) + Math.abs(descent);
    const actualWidth = Math.abs(right) + Math.abs(left);
    typographicFactor = actualHeight / height;
    setAscent = Math.max(setAscent, ascent);
    setDescent = Math.max(setDescent, descent);

    // Get the bounding points around this specific text stim
    const thisBoundingRectPoints =
      textToSet.length === 1
        ? [
            [-Math.abs(left) + xy[0], -Math.abs(descent) + xy[1]],
            [right + xy[0], ascent + xy[1]],
          ]
        : [
            [xy[0] - actualWidth / 2, xy[1] - actualHeight / 2],
            [xy[0] + actualWidth / 2, xy[1] + actualHeight / 2],
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
      characterSetBoundingRectPoints,
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

  // width of the bounding box / 3
  const width =
    normalizedCharacterSetBoundingPoints[1][0] -
    normalizedCharacterSetBoundingPoints[0][0];
  const characterOffsetPxPerFontSize = width / 3;

  const normalizedAscent = setAscent / height;
  const normalizedDescent = setDescent / height;
  const ascentToDescent =
    normalizedAscent / (normalizedDescent + normalizedAscent);

  // Unit-less ratios; describe the relationship between nominal font size & actual stim size
  const xHeightPx = getXHeight(testStim);
  const normalizedXHeight = xHeightPx / height;
  const characterSetHeightPx = getCharacterSetHeight(testStim, characterSet);
  const normalizedCharacterSetHeight = characterSetHeightPx / height;
  const spacingPx = getSpacing(testStim, characterSet);
  const normalizedSpacing = spacingPx / height;

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
  Object.entries(centers).forEach(([text, c]) => {
    centers[text] = [normalizedCenter[0] - c[0], normalizedCenter[1] - c[1]];
  });
  // Create a Rectangle object to represent the characterSet bounding box
  let normalizedCharacterSetBoundingRect = new CharacterSetRect(
    normalizedCharacterSetBoundingPoints[0],
    normalizedCharacterSetBoundingPoints[1],
    "pix",
    characterSet,
    centers,
    ascentToDescent,
    normalizedXHeight,
    normalizedSpacing,
    normalizedCharacterSetHeight,
    characterOffsetPxPerFontSize,
    typographicFactor,
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
  spacingIsOuterBool,
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
  if (!["spacingDeg", "targetSizeDeg"].includes(thresholdParameter))
    throw `thresholdParameter must equal 'spacingDeg' or 'targetSizeDeg', not '${thresholdParameter}'`;

  let level, stimulusParameters, spacingDeg, sizeDeg;
  const screenLowerLeft = [
    -Screens[0].window._size[0] / 2,
    -Screens[0].window._size[1] / 2,
  ];
  const screenUpperRight = [
    Screens[0].window._size[0] / 2,
    Screens[0].window._size[1] / 2,
  ];

  const targetXYDeg = [targetEccentricityDeg.x, targetEccentricityDeg.y];
  const motionRadiusDeg =
    Screens[0].fixationConfig.markingFixationMotionRadiusDeg;
  // TODO make isFixationMoving(reader,bc) function to check if fixation is moving in a given condition
  const fixationRotationRadiusXYPx =
    Screens[0].fixationConfig.markingFixationMotionRadiusDeg > 0 &&
    Screens[0].fixationConfig.markingFixationMotionSpeedDegPerSec > 0
      ? [
          degreesToPixels(motionRadiusDeg, targetXYDeg, "horizontal"),
          degreesToPixels(motionRadiusDeg, targetXYDeg, "vertical"),
        ]
      : [0, 0];
  const screenRectPx = new Rectangle(screenLowerLeft, screenUpperRight);
  switch (thresholdParameter) {
    case "targetSizeDeg":
      [sizeDeg, stimulusParameters] = restrictSizeDeg(
        proposedLevel,
        targetXYDeg,
        targetKind.current,
        screenRectPx,
        spacingRelationToSize,
        targetSizeIsHeightBool,
        characterSetRectPx,
        spacingOverSizeRatio,
        thresholdParameter,
        fixationRotationRadiusXYPx,
      );
      level = Math.log10(sizeDeg);
      break;
    case "spacingDeg":
      [spacingDeg, stimulusParameters] = restrictSpacingDeg(
        proposedLevel,
        targetXYDeg,
        targetKind.current,
        screenRectPx,
        spacingRelationToSize,
        targetSizeIsHeightBool,
        characterSetRectPx,
        spacingOverSizeRatio,
        spacingSymmetry,
        thresholdParameter,
        spacingIsOuterBool,
        fixationRotationRadiusXYPx,
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
  thresholdParameter,
  fixationRotationRadiusXYPx,
) => {
  switch (targetKind) {
    case "letter":
      break;
    default:
      throw "At this point targetKind must be letter. gabor is coming.";
  }
  const targetXYPx = XYPxOfDeg(0, targetXYDeg);
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
  for (let iteration of [...new Array(200).keys()]) {
    // SET TARGET SIZE
    heightDeg = targetSizeIsHeightBool
      ? targetSizeDeg
      : (targetSizeDeg * characterSetRectPx.height) / characterSetRectPx.width;
    [, topPx] = XYPxOfDeg(0, [targetXYDeg[0], targetXYDeg[1] + heightDeg / 2]);
    [, bottomPx] = XYPxOfDeg(0, [
      targetXYDeg[0],
      targetXYDeg[1] - heightDeg / 2,
    ]);
    heightPx = topPx - bottomPx;
    const widthPx =
      heightPx * (characterSetRectPx.width / characterSetRectPx.height);
    let stimulusRectPx = characterSetRectPx.scale(
      widthPx / characterSetRectPx.width,
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

    stimulusRectPx = stimulusRectPx.scale(
      paramReader.read("fontBoundingScalar", status.block_condition),
    );

    stimulusRectPx = stimulusRectPx.inset(
      -fixationRotationRadiusXYPx[0],
      -fixationRotationRadiusXYPx[1],
    );

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
    let largestBoundsRatio = getLargestBoundsRatio(
      stimulusRectPx,
      screenRectPx,
      targetXYPx,
      thresholdParameter,
      spacingRelationToSize,
    );

    // Set largestBoundsRatio to some max, so we don't dwarf the value of targetSizeDeg
    largestBoundsRatio = Math.min(largestBoundsRatio, 1.5);
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
  spacingIsOuterBool,
  fixationRotationRadiusXYPx,
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
    flankerXYDegs = [],
    maxSpacingDeg,
    sizeDeg,
    heightDeg,
    widthDeg,
    heightPx = undefined,
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
  const targetXYPx = XYPxOfDeg(0, targetXYDeg);
  const targetIsFoveal =
    targetXYPx[0] === Screens[0].fixationConfig.pos[0] &&
    targetXYPx[1] === Screens[0].fixationConfig.pos[1];

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
        ({ heightDeg, widthDeg, heightPx, widthPx } =
          getNonTypographicSizeDimensionsFromSizeDeg(
            sizeDeg,
            targetSizeIsHeightBool,
            characterSetRectPx,
            targetXYDeg,
          ));
        break;
      case "ratio":
        // Use spacingDeg and spacingOverSizeRatio to set size.
        // NOTE for foveal targets (ie norm(targetXYDeg) == 0), or targets with tangential flankers, inner vs outer flanker distinction is undefined

        sizeDeg = spacingDeg / spacingOverSizeRatio;
        ({ heightDeg, widthDeg, heightPx, widthPx } =
          getNonTypographicSizeDimensionsFromSizeDeg(
            sizeDeg,
            targetSizeIsHeightBool,
            characterSetRectPx,
            targetXYDeg,
          ));
        break;
      case "typographic":
        ({ sizeDeg, heightDeg, widthDeg, heightPx, widthPx } =
          getTypographicSizeDimensionsFromSpacingDeg(
            spacingDeg,
            characterSetRectPx,
            targetSizeIsHeightBool,
            targetXYDeg,
          ));
        break;
    }

    // Compute lower bound
    if (heightPx < letterConfig.targetMinimumPix) {
      spacingDeg = spacingDeg * (letterConfig.targetMinimumPix / heightPx);
      console.log(
        `[BOUNDING] lower bounded, constrained spacingDeg: ${spacingDeg}`,
      );
      continue;
    }
    // Compute upper px bound
    if (heightPx > letterConfig.fontMaxPx) {
      if (spacingDeg <= 0)
        warning(
          `Illegal spacingDeg, spacingDeg <= 0. spacingDeg: ${spacingDeg}`,
        );
      if (viewingDistanceCm.desired <= 0 || Screens[0].pxPerCm <= 0)
        warning(
          `Viewing distance or pixPerCm <= 0. viewingDistance: ${viewingDistanceCm.desired}, pixPerCm: ${Screens[0].pxPerCm}`,
        );
      const maxSizeDeg = getSizeDegConstrainedByFontMaxPx(
        letterConfig.fontMaxPx,
        targetSizeIsHeightBool,
        targetXYDeg,
        characterSetRectPx,
        spacingRelationToSize,
        sizeDeg,
      );
      switch (spacingRelationToSize) {
        case "none":
          const targetSizeDeg = paramReader.read(
            "targetSizeDeg",
            status.block_condition,
          );
          if (targetSizeDeg > maxSizeDeg)
            throw `targetSizeDeg ${targetSizeDeg} greater than largest allowed sizeDeg ${maxSizeDeg}, from fontMaxPx ${letterConfig.fontMaxPx}`;
          break;
        case "ratio":
          spacingDeg = Math.min(spacingDeg, spacingOverSizeRatio * maxSizeDeg);
          break;
        case "typographic":
          spacingDeg = getTypographicSpacingFromSizeDeg(
            maxSizeDeg,
            targetSizeIsHeightBool,
            characterSetRectPx,
          );
          break;
        default:
          throw `Unknown value of spacingRelationToSize: ${spacingRelationToSize}`;
      }
      console.log(
        `BOUNDING upper bounded. Constrained spacingDeg: ${spacingDeg}`,
      );
      continue;
    }

    // COMPUTE STIMULUS RECT
    switch (spacingRelationToSize) {
      case "typographic":
        // var widthFactor = heightPx / characterSetRectPx.height;
        stimulusRectPx = characterSetRectPx.scale(heightPx);
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
              targetXYPx,
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
              targetXYPx,
            ));
            ({ v1XY: v3XY, v2XY: v4XY } = _getTangentialVectors(
              tangentialXY,
              spacingDeg,
            ));
            break;
          case "horizontal":
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
              spacingDeg,
            ));
            break;
        }
        flankerXYDegs = _getFlankerXYDegs(targetXYDeg, [
          v1XY,
          v2XY,
          v3XY,
          v4XY,
        ]);
        flankerXYPxs = XYPxOfDeg(0, flankerXYDegs);
        stimulusRectPx = _getRectAroundFlankers(flankerXYPxs);
        stimulusRectPx = stimulusRectPx.inset(-widthPx / 2, -heightPx / 2);
        break;
    }
    stimulusRectPx = stimulusRectPx.scale(
      paramReader.read("fontBoundingScalar", status.block_condition),
    );
    stimulusRectPx = stimulusRectPx.inset(
      -fixationRotationRadiusXYPx[0],
      -fixationRotationRadiusXYPx[1],
    );

    // WE'RE DONE IF STIMULUS FITS
    // Should be equivalent to isRectInRect(stimulusRectPx,screenRectPx)
    if (
      isRectInRect(
        stimulusRectPx,
        screenRectPx.offset([targetXYPx[0], targetXYPx[1]]),
      )
    ) {
      // if (
      //   !(
      //     (spacingDeg > Math.pow(10, proposedLevel) &&
      //       Math.round(heightPx) === letterConfig.targetMinimumPix) ||
      //     spacingDeg === Math.pow(10, proposedLevel) ||
      //     (spacingDeg < Math.pow(10, proposedLevel) &&
      //       0.99 < largestBoundsRatio)
      //   )
      // )
      //   warning(
      //     `While largestBoundsRatio is less than 1, none of the three viable conditions are met.\nspacingDeg is ${
      //       spacingDeg > Math.pow(10, proposedLevel)
      //         ? "larger than"
      //         : spacingDeg < Math.pow(10, proposedLevel)
      //         ? "less than"
      //         : "equal to"
      //     } QUEST's proposed spacing. Largest bounds ratio: ${largestBoundsRatio}.`,
      //   );
      const targetAndFlankerLocationsPx = [targetXYPx];
      if (spacingRelationToSize !== "typographic")
        targetAndFlankerLocationsPx.push(...flankerXYPxs);
      // const characterSetUnitHeightScalar = 1 / characterSetRectPx.height;
      const stimulusParameters = {
        widthPx: Math.round(widthPx),
        heightPx: Math.round(heightPx), // * characterSetUnitHeightScalar,
        targetAndFlankersXYPx: targetAndFlankerLocationsPx,
        flankerXYDegs: flankerXYDegs,
        sizeDeg: sizeDeg,
        spacingDeg: spacingDeg,
        heightDeg: heightDeg,
      };
      return [spacingDeg, stimulusParameters];
    } else if (spacingRelationToSize === "typographic") {
      const restricted = getTypographicLevelMax(characterSetRectPx);
      const targetAndFlankerLocationsPx = [targetXYPx];
      if (spacingRelationToSize !== "typographic")
        targetAndFlankerLocationsPx.push(...flankerXYPxs);

      const params = getTypographicParameters(
        restricted.spacingMaxDeg,
        restricted.fontSizeMaxPx,
        characterSetRectPx,
        targetSizeIsHeightBool,
      );
      const stimulusParameters = {
        widthPx: params.widthPx,
        heightPx: params.heightPx,
        targetAndFlankersXYPx: targetAndFlankerLocationsPx,
        sizeDeg: params.sizeDeg,
        heightDeg: params.heightDeg,
        spacingDeg: params.spacingDeg,
        flankerXYDegs: [],
      };
      return [restricted.spacingMaxDeg, stimulusParameters];
    }
    let largestBoundsRatio = getLargestBoundsRatio(
      stimulusRectPx,
      screenRectPx,
      targetXYPx,
      thresholdParameter,
      spacingRelationToSize,
      widthPx,
      heightPx,
    );
    // Set largestBoundsRatio to some max, so we don't dwarf the value of spacingDeg
    largestBoundsRatio = Math.min(largestBoundsRatio, 1.5);
    maxSpacingDeg = spacingDeg / largestBoundsRatio;
    // REDUCE SPACINGDEG TO MAKE STIMULUS FIT, AND TRY AGAIN
    spacingDeg = maxSpacingDeg;
  }
  throw `restrictSpacing was unable to find a suitable spacingDeg. maxSpacingDeg=${maxSpacingDeg}, targetMinimumPix=${letterConfig.targetMinimumPix}`;
};

const getTypographicParameters = (
  spacingDeg,
  heightPx,
  characterSetRectPx,
  targetSizeIsHeightBool,
) => {
  //given the spacingDeg, heightPx, and characterSetRectPx, return the parameters for the typographic spacing

  //need: widthPx, sizeDeg, heightDeg, widthDeg

  const widthPx =
    heightPx * (characterSetRectPx.width / characterSetRectPx.height);

  // compute heightDeg

  const targetXYPx = XYPxOfDeg(0, [
    targetEccentricityDeg.x,
    targetEccentricityDeg.y,
  ]);

  const [, topDeg] = XYDegOfPx(0, [
    targetXYPx[0],
    targetXYPx[1] + heightPx / 2,
  ]);
  const [, bottomDeg] = XYDegOfPx(0, [
    targetXYPx[0],
    targetXYPx[1] - heightPx / 2,
  ]);
  const heightDeg = topDeg - bottomDeg;

  // compute widthDeg

  const [leftDeg] = XYDegOfPx(0, [targetXYPx[0] - widthPx / 2, targetXYPx[1]]);
  const [rightDeg] = XYDegOfPx(0, [targetXYPx[0] + widthPx / 2, targetXYPx[1]]);

  const widthDeg = rightDeg - leftDeg;

  // compute sizeDeg
  const sizeDeg = targetSizeIsHeightBool ? heightDeg : widthDeg;

  return { widthPx, sizeDeg, heightDeg, spacingDeg, heightPx };
};

export const getLargestBoundsRatio = (
  stimulusRectPx,
  screenRectPx,
  targetXYPx,
  thresholdParameter,
  spacingRelationToSize,
  widthPx = 0,
  heightPx = 0,
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
  let stim = stimulusRectPx;
  //.offset([targetXYPx[0], targetXYPx[1]]); // no need to shift here. Already shifted in restrictSpacingDeg
  let screen = screenRectPx.offset([targetXYPx[0], targetXYPx[1]]);
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
    case "spacingDeg":
      if (spacingRelationToSize === "none") {
        // Deduct fixed letter size.
        stim = stim.inset(widthPx / 2, heightPx / 2);
        screen = screen.inset(widthPx / 2, heightPx / 2);
      }
      break;
    case "targetSizeDeg":
      break;
    default:
      // TODO make a compiler check
      throw `This routine expects thresholdParameter to be targetSizeDeg or spacingDeg. Received thresholdParameter of value ${thresholdParameter}`;
  }
  if (
    screen.left >= 0 ||
    screen.right <= 0 ||
    screen.top <= 0 ||
    screen.bottom >= 0
  ) {
    throw `\
    Target is offscreen.<br>
    Target eccentricity: (${letterConfig.targetEccentricityXYDeg}) deg<br>
    Screen rect: ${getScreenBoundsRectDeg().toString()} deg<br>
    Screen rect: ${screen.toString(0)} px re target<br>
    Screen: ${getScreenSizeInCm(rc.screenPpi.value)}<br>
    Viewing distance: ${viewingDistanceCm.current} cm<br>
    `;
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

export const getTypographicLevelMax = (characterSetRectPx) => {
  // let tripletRect = tripletRectPerFontSize * fontSizePt + [targetEccentricityXDeg, targetEccentricityYDeg]
  const screenLowerLeft = [
    -Screens[0].window._size[0] / 2,
    -Screens[0].window._size[1] / 2,
  ];
  const screenUpperRight = [
    Screens[0].window._size[0] / 2,
    Screens[0].window._size[1] / 2,
  ];

  const screenRect = new Rectangle(screenLowerLeft, screenUpperRight).toArray();
  // const screenRectMinusTarget = screenRect.offset([-targetXYPX[0],-targetXYPX[1]]).toArray();
  const targetXYPX = XYPxOfDeg(0, [
    targetEccentricityDeg.x,
    targetEccentricityDeg.y,
  ]);
  let screenRectMinusTarget = [
    [0, 0],
    [0, 0],
  ];

  screenRectMinusTarget[0][0] = screenRect[0][0] - targetXYPX[0];
  screenRectMinusTarget[0][1] = screenRect[0][1] - targetXYPX[1];
  screenRectMinusTarget[1][0] = screenRect[1][0] - targetXYPX[0];
  screenRectMinusTarget[1][1] = screenRect[1][1] - targetXYPX[1];

  const tripletRectPerFontSize = characterSetRectPx.toArray();

  let fontSizeMaxPx = Infinity; //initialize to infinity

  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      if (tripletRectPerFontSize[i][j] === 0) continue;
      const fontSizePx =
        screenRectMinusTarget[i][j] / tripletRectPerFontSize[i][j];
      console.log("fontSizePx in loop", fontSizePx);
      fontSizeMaxPx = Math.min(fontSizeMaxPx, fontSizePx);
    }
  }
  console.log("SCREEN RECT", screenRect);
  console.log("TARGET XY PX", targetXYPX);
  console.log("SCREEN RECT MINUS TARGET", screenRectMinusTarget);
  console.log("TRIPLET RECT PER FONT SIZE", tripletRectPerFontSize);
  console.log("CHARACTER SET RECT HEIGHT", characterSetRectPx.height);
  console.log("PX PER CM", Screens[0].pxPerCm);
  console.log("window device pixel ratio", window.devicePixelRatio);

  //restrict fontSizeMaxPx to be less than letterConfig.fontMaxPx
  fontSizeMaxPx = Math.min(fontSizeMaxPx, letterConfig.fontMaxPx);

  //restrict fontSizeMaxPx to be greater than letterConfig.targetMinimumPix
  fontSizeMaxPx = Math.max(fontSizeMaxPx, letterConfig.targetMinimumPix);

  console.log("fontSizeMaxPx", fontSizeMaxPx);

  if (paramReader.read("showBoundingBoxBool", status.block_condition)) {
    if (appendToDocument) {
      //take upto date canvas height and width
      canvas.width = Screens[0].window._size[0];
      canvas.height = Screens[0].window._size[1];
      document.body.appendChild(canvas);
      appendToDocument = false;
    }
    canvas.width = Screens[0].window._size[0];
    canvas.height = Screens[0].window._size[1];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    characterSetRectPx
      .offset(targetXYPX)
      .scale(fontSizeMaxPx)
      .drawOnCanvas(ctx);
  }
  const spacingMaxPx =
    characterSetRectPx.characterOffsetPxPerFontSize * fontSizeMaxPx;
  // const spacingMaxCm = 2.54*spacingMaxPt/72;
  // const spacingMaxPx = spacingMaxCm * pxPerCm;
  const xyDeg = [targetEccentricityDeg.x, targetEccentricityDeg.y];
  const xyPx = XYPxOfDeg(0, xyDeg);
  const xyArrayPx = [xyPx, [xyPx[0] + spacingMaxPx, xyPx[1]]];
  const xyArrayDeg = XYDegOfPx(0, xyArrayPx);
  const spacingMaxDeg = xyArrayDeg[1][0] - xyArrayDeg[0][0];
  const levelMax = Math.log10(spacingMaxDeg);

  return { levelMax, spacingMaxDeg, fontSizeMaxPx };
};

const getScreenSizeInCm = (dpi) => {
  // Get the screen width and height in pixels
  const screenWidthPx = window.screen.width;
  const screenHeightPx = window.screen.height;

  // Convert pixels to inches
  const screenWidthInches = screenWidthPx / dpi;
  const screenHeightInches = screenHeightPx / dpi;

  // Convert inches to centimeters
  const screenWidthCm = screenWidthInches * 2.54;
  const screenHeightCm = screenHeightInches * 2.54;

  //1 decimal place
  const screenWidthCmRounded = screenWidthCm.toFixed(1);
  const screenHeightCmRounded = screenHeightCm.toFixed(1);
  // return {
  //   width: screenWidthCm,
  //   height: screenHeightCm
  // };

  return `${screenWidthCmRounded} x ${screenHeightCmRounded} cm`;
};

const _getRectAroundFlankers = (flankersPoints) => {
  const xValues = flankersPoints.map((coord) => coord[0]);
  const yValues = flankersPoints.map((coord) => coord[1]);
  return new Rectangle(
    [Math.min(...xValues), Math.min(...yValues)],
    [Math.max(...xValues), Math.max(...yValues)],
  );
};
function _getRadialVectors(
  spacingDeg,
  spacingSymmetry,
  targetXYDeg,
  radialXY,
  targetXYPx,
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
      flanker1XYPx = XYPxOfDeg(0, flanker1XYDeg);
      var deltaXYPx = [
        flanker1XYPx[0] - targetXYPx[0],
        flanker1XYPx[1] - targetXYPx[1],
      ];
      flanker2XYPx = [
        targetXYPx[0] - deltaXYPx[0],
        targetXYPx[1] - deltaXYPx[1],
      ];
      flanker2XYDeg = XYDegOfPx(0, flanker2XYPx);
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

const _getFlankerXYDegs = (targetXYDeg, flankerPositionVectors) => {
  const flankerXYDegs = flankerPositionVectors
    .filter((x) => x !== undefined)
    .map((v) => {
      const flankerXYDeg = [targetXYDeg[0] + v[0], targetXYDeg[1] + v[1]];
      // return XYPxOfDeg(0, flankerXYDeg);
      return flankerXYDeg;
    });
  return flankerXYDegs;
};

const getXHeight = (testStim) => {
  testStim.setText("acemnorsuvwx");
  const boundingBox = testStim.getBoundingBox(true);
  return boundingBox.height;
};
const getCharacterSetHeight = (testStim, characterSet) => {
  const characterSetString = characterSet.join("");
  testStim.setText(characterSetString);
  const boundingBox = testStim.getBoundingBox(true);
  return boundingBox.height;
};
const getSpacing = (testStim, characterSet) => {
  const characterSetString = characterSet.join("");
  testStim.setText(characterSetString);
  const boundingBox = testStim.getBoundingBox(true);
  return boundingBox.width / characterSet.length;
};
const getScreenBoundsRectDeg = () => {
  const screenDimensionsPx = getScreenDimensions();
  const [widthPx, heightPx] = screenDimensionsPx;
  const fixationXYPsychoJSPx = Screens[0].fixationConfig.pos;
  const rightPx = widthPx / 2 - fixationXYPsychoJSPx[0];
  const leftPx = -widthPx / 2 - fixationXYPsychoJSPx[0];
  const topPx = heightPx / 2 - fixationXYPsychoJSPx[1];
  const bottomPx = -heightPx / 2 - fixationXYPsychoJSPx[1];
  const bottomLeftXYPx = [leftPx, bottomPx]; // this many pixels down and to the left of fixation is the bottom left corner of the screen
  const topRightXYPx = [rightPx, topPx];
  const bottomLeftXYDeg = XYDegOfPx(0, bottomLeftXYPx).map((z) =>
    toFixedNumber(z, 1),
  );
  const topRightXYDeg = XYDegOfPx(0, topRightXYPx).map((z) =>
    toFixedNumber(z, 1),
  );
  return new Rectangle(bottomLeftXYDeg, topRightXYDeg, "deg");
};
const getNonTypographicSizeDimensionsFromSizeDeg = (
  sizeDeg,
  targetSizeIsHeightBool,
  characterSetRectPx,
  targetXYDeg,
) => {
  let heightDeg, widthDeg, heightPx, widthPx;
  if (targetSizeIsHeightBool) {
    heightDeg = sizeDeg;
    widthDeg =
      heightDeg * (characterSetRectPx.width / characterSetRectPx.height);
    const [, topPx] = XYPxOfDeg(0, [
      targetXYDeg[0],
      targetXYDeg[1] + heightDeg / 2,
    ]);
    const [, bottomPx] = XYPxOfDeg(0, [
      targetXYDeg[0],
      targetXYDeg[1] - heightDeg / 2,
    ]);
    // I think that this is how we should do things, ie the above code assumes that
    // ascent == descent, ie that the center of the character is [x,y] with the top h/2 above
    // [, topPx] = xyPxOfDeg(
    //   [
    //     targetXYDeg[0],
    //     targetXYDeg[1] + heightDeg * characterSetRectPx.ascentToDescent,
    //   ]
    // );
    // [, bottomPx] = xyPxOfDeg(
    //   [
    //     targetXYDeg[0],
    //     targetXYDeg[1] -
    //       heightDeg * (1 - characterSetRectPx.ascentToDescent),
    //   ]
    // );
    heightPx = topPx - bottomPx;
    widthPx = (heightPx * characterSetRectPx.width) / characterSetRectPx.height;
  } else {
    widthDeg = sizeDeg;
    heightDeg =
      widthDeg * (characterSetRectPx.height / characterSetRectPx.width);
    const [leftPx] = XYPxOfDeg(0, [
      targetXYDeg[0] - widthDeg / 2,
      targetXYDeg[1],
    ]);
    const [rightPx] = XYPxOfDeg(0, [
      targetXYDeg[0] + widthDeg / 2,
      targetXYDeg[1],
    ]);
    widthPx = rightPx - leftPx;
    heightPx = widthPx * (characterSetRectPx.height / characterSetRectPx.width);
  }
  return { heightDeg, widthDeg, heightPx, widthPx };
};
const getTypographicSizeDimensionsFromSpacingDeg = (
  spacingDeg,
  characterSetRectPx,
  targetSizeIsHeightBool,
  targetXYDeg,
) => {
  // Use spacingDeg to set size.
  const widthDeg = 3 * spacingDeg;
  const [leftPx] = XYPxOfDeg(0, [
    targetXYDeg[0] - widthDeg / 2,
    targetXYDeg[1],
  ]);
  const [rightPx] = XYPxOfDeg(0, [
    targetXYDeg[0] + widthDeg / 2,
    targetXYDeg[1],
  ]);
  const widthPx = rightPx - leftPx;
  const heightPx =
    (widthPx * characterSetRectPx.height) / characterSetRectPx.width;

  const xyPx = XYPxOfDeg(0, targetXYDeg); // Get pixel position for targetXYDeg
  //top and bottom Deg
  const [, topDeg] = XYDegOfPx(0, [xyPx[0], xyPx[1] + heightPx / 2]);
  const [, bottomDeg] = XYDegOfPx(0, [xyPx[0], xyPx[1] - heightPx / 2]);
  const heightDeg = topDeg - bottomDeg;
  const sizeDeg = targetSizeIsHeightBool ? heightDeg : widthDeg;
  return { heightDeg, widthDeg, heightPx, widthPx, sizeDeg };
};
const getSizeDegConstrainedByFontMaxPx = (
  fontMaxPx,
  targetSizeIsHeightBool,
  targetXYDeg,
  characterSetRectPx,
  spacingRelationToSize,
  tooBigSizeDeg,
) => {
  let sizeDeg = tooBigSizeDeg;
  if (spacingRelationToSize !== "typographic") {
    while (
      getNonTypographicSizeDimensionsFromSizeDeg(
        sizeDeg,
        targetSizeIsHeightBool,
        characterSetRectPx,
        targetXYDeg,
      ).heightPx > fontMaxPx
    ) {
      sizeDeg *= 0.99;
    }
    return sizeDeg;
  }
  // else, typographic
  // TODO test more thoroughly
  let spacingDeg = getTypographicSpacingFromSizeDeg(
    sizeDeg,
    targetSizeIsHeightBool,
    characterSetRectPx,
  );
  while (
    getTypographicSizeDimensionsFromSpacingDeg(
      spacingDeg,
      characterSetRectPx,
      targetSizeIsHeightBool,
      targetXYDeg,
    ).heightPx > fontMaxPx
  ) {
    sizeDeg *= 0.99;
    spacingDeg = getTypographicSpacingFromSizeDeg(
      sizeDeg,
      targetSizeIsHeightBool,
      characterSetRectPx,
    );
  }
  return sizeDeg;
};

/**
 * Inverse of:
  // const widthDeg = 3 * spacingDeg;
  // const heightDeg = widthDeg * (characterSetRectPx.height / characterSetRectPx.width);
  // const sizeDeg = targetSizeIsHeightBool ? heightDeg : widthDeg;
 * @param {*} sizeDeg
 * @param {*} targetSizeIsHeightBool
 * @param {*} characterSetRectPx
 */
const getTypographicSpacingFromSizeDeg = (
  sizeDeg,
  targetSizeIsHeightBool,
  characterSetRectPx,
  targetXYDeg,
) => {
  let widthDeg;
  if (!targetSizeIsHeightBool) {
    widthDeg = sizeDeg;
  } else {
    const heightDeg = sizeDeg;

    const [, topPx] = XYPxOfDeg(0, [
      targetXYDeg[0],
      targetXYDeg[1] + heightDeg / 2,
    ]);

    const [, bottomPx] = XYPxOfDeg(0, [
      targetXYDeg[0],
      targetXYDeg[1] - heightDeg / 2,
    ]);

    const heightPx = topPx - bottomPx;
    widthPx = (heightPx * characterSetRectPx.width) / characterSetRectPx.height;

    const targetXYPx = XYPxOfDeg(0, targetXYDeg);

    const [leftDeg] = XYDegOfPx(0, [
      targetXYPx[0] - widthPx / 2,
      targetXYPx[1],
    ]);
    const [rightDeg] = XYDegOfPx(0, [
      targetXYPx[0] + widthPx / 2,
      targetXYPx[1],
    ]);

    widthDeg = rightDeg - leftDeg;
    // widthDeg =
    //   heightDeg * (characterSetRectPx.width / characterSetRectPx.height);
  }
  const spacingDeg = widthDeg / 3;
  return spacingDeg;
};
