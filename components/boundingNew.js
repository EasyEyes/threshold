import * as visual from "../psychojs/src/visual/index.js";
import * as util from "../psychojs/src/util/index.js";
import {
  font,
  letterConfig,
  status,
  targetEccentricityDeg,
  targetTextStimConfig,
} from "./global";
import {
  clipRectangle,
  isRectInRect,
  Rectangle,
  rectFromPixiRect,
  sampleWithoutReplacement,
} from "./utils.js";
import { Screens } from "./multiple-displays/globals.ts";
import { XYDegOfPx, XYPxOfDeg } from "./multiple-displays/utils.ts";
import { paramReader } from "../threshold.js";
import { psychoJS } from "./globalPsychoJS.js";
import {
  _getCharacterSetBoundingBox,
  clearBoundingBoxCanvasV1,
} from "./bounding.js";
import { cleanFontName } from "./fonts.js";
import { PsychoJS } from "../psychojs/src/core/PsychoJS.js";

//create a canvas
export const canvas = document.createElement("canvas");
export const ctx = canvas.getContext("2d");
canvas.style.position = "fixed";
canvas.style.left = 0;
canvas.style.top = 0;
canvas.style.pointerEvents = "none";
canvas.style.zIndex = 9999;
canvas.id = "boundingCanvas";
document.body.appendChild(canvas);

export const drawTripletBoundingBox = (
  characterSetRectPx,
  showTripletBoundingBox,
  fontSizePx,
  ascentPxPerFontSize = null,
  color = "blue",
) => {
  if (
    paramReader.read("showBoundingBoxBool", status.block_condition) &&
    showTripletBoundingBox
  ) {
    canvas.width = Screens[0].window._size[0];
    canvas.height = Screens[0].window._size[1];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    characterSetRectPx.drawOnCanvas(ctx, {
      strokeStyle: color,
      lineWidth: 1,
      baselinePxFromPenY: ascentPxPerFontSize
        ? fontSizePx * ascentPxPerFontSize
        : null,
    });
  }
};

export const clearBoundingBoxCanvas = () => {
  if (canvas && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  clearBoundingBoxCanvasV1();
};

const getQuickCase = (
  targetTask,
  targetKind,
  thresholdParameter,
  spacingRelationToSize,
  spacingSymmetry,
) => {
  let quickCase = "";
  if (targetTask === "identify" && targetKind === "letter") {
    // Acuity
    if (thresholdParameter === "targetSizeDeg") {
      quickCase = "acuity";
    }

    // Typographic Crowding
    if (
      thresholdParameter === "spacingDeg" &&
      spacingRelationToSize === "typographic"
    ) {
      quickCase = "typographicCrowding";
    }

    // Ratio Crowding
    if (
      thresholdParameter === "spacingDeg" &&
      spacingRelationToSize === "ratio" &&
      spacingSymmetry === "screen"
    ) {
      quickCase = "ratioCrowding";
    }
  }
  return quickCase;
};

export const generateCharacterSetBoundingRects_New = (
  paramReader,
  cleanFontName,
  pxPerCm,
) => {
  const rects = {};
  for (const BC of paramReader.block_conditions) {
    const characterSet = String(paramReader.read("fontCharacterSet", BC)).split(
      "",
    );
    let font = paramReader.read("font", BC);
    if (paramReader.read("fontSource", BC) === "file") {
      font = cleanFontName(font);
    }
    const padding = paramReader.read("fontPadding", BC);

    const typographicCrowding =
      paramReader.read("spacingRelationToSize", BC) === "typographic" &&
      paramReader.read("thresholdParameter", BC) === "spacingDeg";
    const letterRepeats = typographicCrowding ? 3 : 1;

    rects[BC] =
      paramReader.read("EasyEyesLettersVersion", BC) === 2 &&
      paramReader.read("targetKind", BC) === "letter"
        ? getCharacterSetBoundingBox(
            characterSet,
            font,
            psychoJS.window,
            paramReader.read("fontSizeReferencePx", BC),
            padding,
            pxPerCm,
            paramReader.read("spacingRelationToSize", BC),
            paramReader.read("fontPixiMetricsString", BC),
          )
        : _getCharacterSetBoundingBox(
            characterSet,
            font,
            psychoJS.window,
            letterRepeats,
            paramReader.read("fontSizeReferencePx", BC),
            padding,
          );
  }

  return rects;
};

export const getCharacterSetBoundingBox = (
  characterSet,
  font,
  window,
  fontSizeReferencePx = 50,
  padding = 0,
  pxPerCm,
  spacingRelationToSize = "typographic",
  metrics_string = "|ÉqÅ",
) => {
  if (!pxPerCm) throw new Error("pxPerCm is required");
  const fontSizeReferencePt = (72 * (fontSizeReferencePx / pxPerCm)) / 2.54;
  const testStim = new visual.TextStim({
    name: "characterSetBoundingBoxStim",
    win: psychoJS.window,
    color: new util.Color("black"),
    ...targetTextStimConfig,
    height: fontSizeReferencePx,
    font: font,
    padding: padding,
    text: characterSet.join(""),
    pos: [0, 0],
    characterSet: metrics_string === "" ? "|ÉqÅ" : metrics_string,
  });
  testStim._updateIfNeeded();
  // testStim.setAutoDraw(true)

  // canvas.width = Screens[0].window._size[0];
  // canvas.height = Screens[0].window._size[1];
  const tightBB = testStim.getBoundingBox(true);
  const looseBB = testStim.getBoundingBox(false);
  const center = [0, 0];
  // looseBB.x = looseBB.x + (tightBB.width) / 2;
  // looseBB.y = looseBB.y + (tightBB.height) / 2;

  const b = rectFromPixiRect(looseBB).centerAt([0, 0]).toArray();

  // rectFromPixiRect(looseBB).offset([looseBB.width/2,looseBB.height/2]).drawOnCanvas(ctx, { strokeStyle: "red" });
  // rectFromPixiRect(tightBB).drawOnCanvas(ctx, { strokeStyle: "green" });
  //draw a rectangle at 0,0
  // new Rectangle([-1, -1], [1, 1]).scale(3).centerAt([0,0]).drawOnCanvas(ctx, { strokeStyle: "blue" });
  // Compute a normalized bounding box
  const rect = rectFromPixiRect(tightBB).toArray();
  //subtract tight bounding box from loose bounding box
  const d = [
    [rect[0][0] - b[0][0], rect[0][1] - b[0][1]],
    [rect[1][0] - b[1][0], rect[1][1] - b[1][1]],
  ];
  const recenterXY = [(d[0][0] + d[1][0]) / 2, (d[0][1] + d[1][1]) / 2];
  const recenterXYPerFontSize = [
    recenterXY[0] / fontSizeReferencePx,
    recenterXY[1] / fontSizeReferencePx,
  ];
  const normalizedRect = rect.map((val) => {
    return val.map((v) => v / fontSizeReferencePx);
  });
  const stimulusRectPerFontSize = new Rectangle(
    normalizedRect[0],
    normalizedRect[1],
  );
  const textMetrics = testStim.getTextMetrics();
  const ascentPxPerFontSize =
    textMetrics.boundingBox.actualBoundingBoxAscent / fontSizeReferencePx;
  const descentPxPerFontSize =
    textMetrics.boundingBox.actualBoundingBoxDescent / fontSizeReferencePx;

  const heightPxPerFontSize = (rect[1][1] - rect[0][1]) / fontSizeReferencePx;
  //ascentPxPerFontSize + descentPxPerFontSize;

  //time to compute the width of each character
  const startTimeForWidth = performance.now();
  const widthPxPerFontSize = {};
  const heightOverWidth = {};
  characterSet.forEach((char) => {
    testStim.setText(char);
    testStim._updateIfNeeded();
    const width = testStim.getBoundingBox(true).width;
    widthPxPerFontSize[char] = width / fontSizeReferencePx;
    heightOverWidth[char] = heightPxPerFontSize / width;
  });

  const totalWidth = Object.values(widthPxPerFontSize).reduce(
    (sum, width) => sum + width,
    0,
  );
  const meanWidthPxPerFontSize = totalWidth / characterSet.length;

  const maxWidthPxPerFontSize = Math.max(...Object.values(widthPxPerFontSize));
  const endTimeForWidth = performance.now();
  const timeWidthSec = (endTimeForWidth - startTimeForWidth) / 1000;

  // time to compute height
  const startTimeForHeight = performance.now();
  const _heightPxPerFontSize = {};
  let meanHeightPxPerFontSize, maxHeightPxPerFontSize;

  if (spacingRelationToSize === "ratio") {
    characterSet.forEach((char) => {
      testStim.setText(char);
      testStim._updateIfNeeded();
      const height = testStim.getBoundingBox(true).height;
      _heightPxPerFontSize[char] = height / fontSizeReferencePx;
    });
    meanHeightPxPerFontSize =
      Object.values(_heightPxPerFontSize).reduce(
        (sum, height) => sum + height,
        0,
      ) / characterSet.length;

    maxHeightPxPerFontSize = Math.max(...Object.values(_heightPxPerFontSize));
  }
  const endTimeForHeight = performance.now();
  const timeHeightSec = (endTimeForHeight - startTimeForHeight) / 1000;

  return {
    stimulusRectPerFontSize,
    ascentPxPerFontSize,
    meanWidthPxPerFontSize,
    heightPxPerFontSize,
    widthPxPerFontSize,
    maxWidthPxPerFontSize,
    timeWidthSec,
    _heightPxPerFontSize,
    meanHeightPxPerFontSize,
    maxHeightPxPerFontSize,
    timeHeightSec,
    recenterXYPerFontSize,
    heightOverWidth,
  };
};

export const restrictLevelBeforeFixation = (
  targetTask,
  targetKind,
  thresholdParameter,
  spacingRelationToSize,
  spacingSymmetry,
  spacingOverSizeRatio,
  fontIsLeftToRight,
  characterSetBoundingBox,
  fontCharacterSet,
  spacingDirection = "horizontal",
  targetSizeIsHeightBool = false,
) => {
  const quickCase = getQuickCase(
    targetTask,
    targetKind,
    thresholdParameter,
    spacingRelationToSize,
    spacingSymmetry,
  );
  /**
   * Generates a random string (one or more characters) without replacement from fontCharacterSet.
   * One character for acuity. Three characters for crowding.
   */
  let targetString = [];
  let flanker1String = "";
  let flanker2String = "";
  let stimulusWidthPerFontSize = 0;
  let stimulusHeightPerFontSize = 0;
  let characterSet = "";

  if (quickCase === "acuity") {
    targetString = sampleWithoutReplacement(fontCharacterSet, 1)[0];
    characterSet = targetString;
  } else if (quickCase === "typographicCrowding") {
    [targetString, flanker1String, flanker2String] = sampleWithoutReplacement(
      fontCharacterSet,
      3,
    );
    characterSet = [flanker1String, targetString, flanker2String];
  } else if (quickCase === "ratioCrowding") {
    switch (spacingDirection) {
      case "horizontal":
      case "vertical":
      case "radial":
      case "tangential":
        [targetString, flanker1String, flanker2String] =
          sampleWithoutReplacement(fontCharacterSet, 3);
        characterSet = [flanker1String, targetString, flanker2String];
        break;
      case "horizontalAndVertical":
      case "radialAndTangential":
        // TODO
        targetString = sampleWithoutReplacement(fontCharacterSet, 9);
        characterSet = targetString;
        break;
      default:
        throw new Error("Invalid spacingDirection");
    }
  }

  let fontName = paramReader.read("font", status.block_condition);
  if (paramReader.read("fontSource", status.block_condition) === "file") {
    fontName = cleanFontName(fontName);
  }
  const padding = paramReader.read("fontPadding", status.block_condition);
  const fontSizeReferencePx = paramReader.read(
    "fontSizeReferencePx",
    status.block_condition,
  );

  //recalculating the bounding box using the new characterSet
  // characterSetBoundingBox = getCharacterSetBoundingBox(
  //   characterSet,
  //   fontName,
  //   psychoJS.window,
  //   fontSizeReferencePx,
  //   padding,
  //   Screens[0].pxPerCm,
  //   spacingRelationToSize
  // );

  // Get stimulus width
  if (quickCase === "ratioCrowding") {
    const foveal =
      targetEccentricityDeg.x === 0 && targetEccentricityDeg.y === 0;
    const fovealSpacings = ["horizontal", "vertical", "horizontalAndVertical"];
    const peripheralSpacings = ["radial", "tangential", "radialAndTangential"];
    //assert foveal && spacingDirection in fovealSpacings || !foveal && spacingDirection in peripheralSpacings
    assert(
      (foveal && fovealSpacings.includes(spacingDirection)) ||
        (!foveal && peripheralSpacings.includes(spacingDirection)),
    );

    //is there horizontal spacing? Vertical spacing?
    const horizontalSpacingBool =
      spacingDirection === "horizontal" ||
      spacingDirection === "horizontalAndVertical" ||
      spacingDirection === "radialAndTangential" ||
      (spacingDirection === "radial" && targetEccentricityDeg.x !== 0) ||
      (spacingDirection === "tangential" && targetEccentricityDeg.y !== 0);
    const verticalSpacingBool =
      spacingDirection === "vertical" ||
      spacingDirection === "horizontalAndVertical" ||
      spacingDirection === "radialAndTangential" ||
      (spacingDirection === "radial" && targetEccentricityDeg.y != 0) ||
      (spacingDirection === "tangential" && targetEccentricityDeg.x != 0);

    let targetSizePxPerFontSize;
    if (targetSizeIsHeightBool) {
      targetSizePxPerFontSize = characterSetBoundingBox.meanHeightPxPerFontSize;
    } else {
      targetSizePxPerFontSize = characterSetBoundingBox.meanWidthPxPerFontSize;
    }

    if (horizontalSpacingBool) {
      /**
  The width of a triplet is half width of letter1 plus
  2*spacing plus half width of letter3. We want spacing
  limit to be independent of which letter, so use max
   width.
    */
      stimulusWidthPerFontSize =
        characterSetBoundingBox.maxWidthPxPerFontSize +
        2 * targetSizePxPerFontSize * spacingOverSizeRatio;
    } else {
      stimulusWidthPerFontSize = characterSetBoundingBox.maxWidthPxPerFontSize;
    }

    if (verticalSpacingBool) {
      /**
       * The height of a triplet is half height of letter1 plus
       * 2*spacing plus half height of letter3. We want spacing
       * limit to be independent of which letter, so use max
       * height.
       */
      stimulusHeightPerFontSize =
        characterSetBoundingBox.maxHeightPxPerFontSize +
        2 *
          characterSetBoundingBox.targetSizePxPerFontSize *
          spacingOverSizeRatio;
    } else {
      stimulusHeightPerFontSize =
        characterSetBoundingBox.maxHeightPxPerFontSize;
    }
  } else if (quickCase === "acuity") {
    stimulusWidthPerFontSize = characterSetBoundingBox.maxWidthPxPerFontSize;
    stimulusHeightPerFontSize = characterSetBoundingBox.heightPxPerFontSize;
  } else if (quickCase === "typographicCrowding") {
    // We assume the horizontal midpoint of the
    //string is halfway between start and end pen positions.
    const testStim = new visual.TextStim({
      name: "_characterSetBoundingBoxStim",
      win: psychoJS.window,
      color: new util.Color("black"),
      ...targetTextStimConfig,
      height: fontSizeReferencePx,
      font: fontName,
      padding: padding,
      text: characterSet.join(""),
      pos: [0, 0],
    });
    testStim._updateIfNeeded();
    const thisBB = testStim.getBoundingBox(true);
    stimulusWidthPerFontSize = Math.abs(thisBB.width) / fontSizeReferencePx;
    stimulusHeightPerFontSize = characterSetBoundingBox.heightPxPerFontSize;
  }

  // Update stimulusRectPerFontSize
  const rect = characterSetBoundingBox.stimulusRectPerFontSize.toArray();
  const center = [0, 0];
  //adjust the width
  if (fontIsLeftToRight) {
    rect[0][0] = 0;
    rect[1][0] = stimulusWidthPerFontSize;
  } else {
    rect[1][0] = 0;
    rect[0][0] = -stimulusWidthPerFontSize;
  }
  //adjust the height
  rect[0][1] = 0;
  rect[1][1] = stimulusHeightPerFontSize;

  // canvas.width = Screens[0].window._size[0];
  // canvas.height = Screens[0].window._size[1];
  //create the new rect centered at [0,0]
  characterSetBoundingBox.stimulusRectPerFontSize = new Rectangle(
    rect[0],
    rect[1],
  ).centerAt(center);

  const stimulusParameters = {
    targetString: targetString,
    flankerStrings: [flanker1String, flanker2String],
    heightPx: fontSizeReferencePx,
    targetAndFlankersXYPx: [
      [5000, 0],
      [5000, 0],
      [5000, 0],
    ],
  };

  //   return {
  //     targetString,
  //     flanker1String,
  //     flanker2String,
  //     stimulusWidthPerFontSize,
  //   };
  characterSetBoundingBox.stimulusWidthPerFontSize = stimulusWidthPerFontSize;
  characterSetBoundingBox.stimulusHeightPerFontSize = stimulusHeightPerFontSize;

  return [2, stimulusParameters, characterSetBoundingBox];
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

export const restrictLevelAfterFixation = (
  levelProposedByQuest,
  thresholdParameter,
  characterSetBoundingBox,
  spacingDirection,
  spacingRelationToSize,
  spacingSymmetry,
  spacingOverSizeRatio,
  targetSizeIsHeight,
  spacingIsOuter,
  showTripletBoundingBox = false,
  fontIsLeftToRight,
  targetTask,
  targetKind,
  targetCharacter = "",
  fontSizeReferencePx = 300,
) => {
  // Center the stimulus rect on the screen
  const centeredStimulusRectPerFontSize =
    characterSetBoundingBox.stimulusRectPerFontSize.toArray();

  const screenLowerLeft = [
    -Screens[0].window._size[0] / 2,
    -Screens[0].window._size[1] / 2,
  ];
  const screenUpperRight = [
    Screens[0].window._size[0] / 2,
    Screens[0].window._size[1] / 2,
  ];

  const screenRect = new Rectangle(screenLowerLeft, screenUpperRight).toArray();
  const targetEccentricityXYPX = XYPxOfDeg(0, [
    targetEccentricityDeg.x,
    targetEccentricityDeg.y,
  ]);

  let fontSizeMaxPx = Infinity; // Initialize to infinity

  let screenRectMinusTarget = [
    [0, 0],
    [0, 0],
  ];
  screenRectMinusTarget[0][0] = screenRect[0][0] - targetEccentricityXYPX[0];
  screenRectMinusTarget[0][1] = screenRect[0][1] - targetEccentricityXYPX[1];
  screenRectMinusTarget[1][0] = screenRect[1][0] - targetEccentricityXYPX[0];
  screenRectMinusTarget[1][1] = screenRect[1][1] - targetEccentricityXYPX[1];

  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      if (centeredStimulusRectPerFontSize[i][j] === 0) continue;
      const fontSizePx =
        screenRectMinusTarget[i][j] / centeredStimulusRectPerFontSize[i][j];
      fontSizeMaxPx = Math.min(fontSizeMaxPx, fontSizePx);
    }
  }

  // convert fontSizeMaxPx to maxLevel

  let px = 0;

  const quickCase = getQuickCase(
    targetTask,
    targetKind,
    thresholdParameter,
    spacingRelationToSize,
    spacingSymmetry,
  );

  let steppingPlan, stepDirPx, stepDirDeg;
  let targetSizePxPerFontSize;
  if (targetSizeIsHeight) {
    targetSizePxPerFontSize = characterSetBoundingBox.meanHeightPxPerFontSize;
  } else {
    targetSizePxPerFontSize = characterSetBoundingBox.meanWidthPxPerFontSize;
  }
  switch (quickCase) {
    case "ratioCrowding":
      px = spacingOverSizeRatio * targetSizePxPerFontSize * fontSizeMaxPx;
      break;
    case "typographicCrowding":
      px = characterSetBoundingBox.stimulusWidthPerFontSize * fontSizeMaxPx;
      px = px / 3;
      break;
    case "acuity":
      px = characterSetBoundingBox.heightPxPerFontSize * fontSizeMaxPx;
      if (!targetSizeIsHeight) {
        const heightOverWidth =
          characterSetBoundingBox.heightOverWidth[targetCharacter];
        px = px / heightOverWidth;
      }
      break;
  }

  //convert px to deg
  const targetShortenedXYDeg = [
    0.99 * targetEccentricityDeg.x,
    0.99 * targetEccentricityDeg.y,
  ];
  const targetShortenedXYPX = XYPxOfDeg(0, targetShortenedXYDeg);
  const targetXYPX = XYPxOfDeg(0, [
    targetEccentricityDeg.x,
    targetEccentricityDeg.y,
  ]);
  const XYPx = [
    targetXYPX[0] - targetShortenedXYPX[0],
    targetXYPX[1] - targetShortenedXYPX[1],
  ];
  const norm = Math.hypot(XYPx[0], XYPx[1]);
  const radialDirPx = [XYPx[0] / norm, XYPx[1] / norm];

  [stepDirPx, steppingPlan] = GetReadyToConvert(
    quickCase,
    radialDirPx,
    targetSizeIsHeight,
    spacingDirection,
    spacingIsOuter,
  );
  const maxLevelExp = StepDegOfPx(px, stepDirPx, steppingPlan, targetXYPX, [
    targetEccentricityDeg.x,
    targetEccentricityDeg.y,
  ]);
  const maxLevel = Math.log10(maxLevelExp);
  //convert targetMinPhysicalPx to minLevel

  switch (quickCase) {
    case "ratioCrowding":
      px = spacingOverSizeRatio * letterConfig.targetMinimumPix;
      break;
    case "typographicCrowding":
      px = letterConfig.targetMinimumPix;
      break;
    case "acuity":
      px = letterConfig.targetMinimumPix;
      break;
  }

  const minLevelExp = StepDegOfPx(px, stepDirPx, "oneCentered", targetXYPX, [
    targetEccentricityDeg.x,
    targetEccentricityDeg.y,
  ]);
  const minLevel = Math.log10(minLevelExp);

  //apply the upper and lower bounds
  let level = Math.min(maxLevel, levelProposedByQuest);
  level = Math.max(minLevel, level);

  const deg = Math.pow(10, level);

  const norm2 = Math.hypot(targetEccentricityDeg.x, targetEccentricityDeg.y);
  const radialDirDeg = [
    targetEccentricityDeg.x / norm2,
    targetEccentricityDeg.y / norm2,
  ];
  [stepDirDeg, steppingPlan] = GetReadyToConvert(
    quickCase,
    radialDirDeg,
    targetSizeIsHeight,
    spacingDirection,
    spacingIsOuter,
  );
  px = StepPxOfDeg(deg, stepDirDeg, steppingPlan, targetXYPX, [
    targetEccentricityDeg.x,
    targetEccentricityDeg.y,
  ]);
  const recenterXYPerFontSize = characterSetBoundingBox.recenterXYPerFontSize;

  let fontSizePx = 0;
  switch (quickCase) {
    case "acuity":
      if (!targetSizeIsHeight) {
        fontSizePx = px / characterSetBoundingBox.stimulusHeightPerFontSize;
      } else {
        fontSizePx = px / characterSetBoundingBox.stimulusWidthPerFontSize;
      }
      break;
    case "typographicCrowding":
      fontSizePx = (3 * px) / characterSetBoundingBox.stimulusWidthPerFontSize;
      break;
    case "ratioCrowding":
      fontSizePx = px / spacingOverSizeRatio / targetSizePxPerFontSize;
      break;
  }

  const fontMaxPx =
    letterConfig.useFontMaxPxShrinkageBool &&
    letterConfig.currentNominalFontSize
      ? letterConfig.fontMaxPxShrinkage * letterConfig.currentNominalFontSize
      : letterConfig.fontMaxPx;
  fontSizePx = Math.min(fontSizePx, fontMaxPx);
  letterConfig.currentNominalFontSize = fontSizePx;

  let penXY = [
    targetXYPX[0] - recenterXYPerFontSize[0] * fontSizePx,
    targetXYPX[1] - recenterXYPerFontSize[1] * fontSizePx,
  ];

  const boundingRect =
    characterSetBoundingBox.stimulusRectPerFontSize.centerAt(targetXYPX);

  if (showTripletBoundingBox) {
    drawTripletBoundingBox(
      boundingRect.scale(fontSizePx),
      showTripletBoundingBox,
      fontSizePx,
      characterSetBoundingBox.ascentPxPerFontSize,
    );

    //draw unscaled
    // boundingRect
    //   .scale(fontSizeReferencePx)
    //   .drawOnCanvas(ctx, { strokeStyle: "blue" });
  }

  let spacingDeg,
    spacingXYPX,
    flankerXYDegs = [],
    flankersXYPX = [],
    sizeDeg;

  const heightPx = fontSizePx;
  const widthPx = boundingRect.scale(fontSizePx).width;
  const targetAndFlankersXYPx = [penXY];
  const heightDeg = heightPxToDeg(heightPx, targetEccentricityXYPX);
  const widthDeg = widthPxToDeg(widthPx, targetEccentricityXYPX);

  if (quickCase === "ratioCrowding") {
    spacingDeg = deg * stepDirDeg[0];
    sizeDeg = targetSizeIsHeight ? heightDeg : widthDeg;
    spacingXYPX = [px * stepDirPx[0], px * stepDirPx[1]];
    if (fontIsLeftToRight) {
      spacingXYPX[0] = -spacingXYPX[0];
    }

    //always assume case:3 FOR NOW (Will add case:9) for string length

    for (let i = 0; i < 3; i++) {
      if (i === 1) continue;
      flankersXYPX.push([
        penXY[0] + (i - 1) * spacingXYPX[0],
        penXY[1] + (i - 1) * spacingXYPX[1],
      ]);
    }
    flankerXYDegs = flankersXYPX.map((xyPx) => XYDegOfPx(0, xyPx));
    targetAndFlankersXYPx.push(...flankersXYPX);
  } else if (quickCase === "typographicCrowding") {
    spacingDeg = deg * stepDirDeg[0];
    sizeDeg = targetSizeIsHeight ? heightDeg : widthDeg;
  } else if (quickCase === "acuity") {
    spacingDeg = deg * stepDirDeg[0]; // not needed?
    sizeDeg = targetSizeIsHeight ? heightDeg : widthDeg;
  }

  const stimulusParameters = {
    heightPx,
    widthPx,
    targetAndFlankersXYPx,
    flankerXYDegs,
    sizeDeg,
    spacingDeg,
    heightDeg,
  };

  return [level, stimulusParameters];
};

const heightPxToDeg = (heightPx, targetXYPX) => {
  const [, topDeg] = XYDegOfPx(0, [
    targetXYPX[0],
    targetXYPX[1] + heightPx / 2,
  ]);
  const [, bottomDeg] = XYDegOfPx(0, [
    targetXYPX[0],
    targetXYPX[1] - heightPx / 2,
  ]);
  return topDeg - bottomDeg;
};

const widthPxToDeg = (widthPx, targetXYPX) => {
  const [leftDeg] = XYDegOfPx(0, [targetXYPX[0] - widthPx / 2, targetXYPX[1]]);
  const [rightDeg] = XYDegOfPx(0, [targetXYPX[0] + widthPx / 2, targetXYPX[1]]);
  return rightDeg - leftDeg;
};

const GetReadyToConvert = (
  quickCase,
  radialDir,
  targetSizeIsHeightBool,
  spacingDirection,
  spacingIsOuter,
) => {
  // Get ready for converting in either direction,
  // px to deg or deg to px.
  // radialDir is a unit length vector in the source
  // coordinates (px or deg), that matches the slope of a
  // radial line in deg coordinates (i.e. from fixation),
  // through the target eccentricity. The radial deg line is
  // straight in deg coordinates, and curved in px
  // coordinates.
  let stepDir = [0, 0];
  let steppingPlan = "";
  const spacingIsInnerBool = !spacingIsOuter;

  switch (quickCase) {
    case "acuity":
      // Acuity
      steppingPlan = "oneCentered";
      stepDir = targetSizeIsHeightBool ? [1, 0] : [0, 1];
      break;

    case "typographicCrowding":
      // Typographic crowding
      steppingPlan = "both";
      stepDir = targetSizeIsHeightBool ? [1, 0] : [0, 1];
      break;

    case "ratioCrowding":
      // Ratio crowding
      switch (spacingDirection) {
        case "horizontal":
          stepDir = [1, 0];
          steppingPlan = "both";
          break;
        case "vertical":
          stepDir = [0, 1];
          steppingPlan = "both";
          break;
        case "horizontalAndVertical":
          stepDir = targetSizeIsHeightBool ? [0, 1] : [1, 0];
          steppingPlan = "both";
          break;
        case "radial":
          // Radial
          stepDir = spacingIsInnerBool
            ? [-radialDir[0], -radialDir[1]]
            : radialDir;
          steppingPlan = "one";
          break;

        case "tangential":
          // Tangential is orthogonal to radial.
          stepDir = [-radialDir[1], radialDir[0]];
          steppingPlan = "two";
          break;

        case "radialAndTangential":
          // Radial and Tangential
          stepDir = targetSizeIsHeightBool ? [0, 1] : [1, 0];
          steppingPlan = "one";
          break;
      }
      break;

    default:
      throw new Error(`Unknown quickCase: ${quickCase}`);
  }

  return [stepDir, steppingPlan];
};

const StepDegOfPx = (px, stepDir, steppingPlan, targetXYPx, targetXYDeg) => {
  // Convert px step to deg step.
  // All cases of quickCase.
  // We use targetXYDeg and targetXYPx.

  if (steppingPlan === "oneCentered") {
    px = px / 2;
  }

  // Calculate target positions with step in px.
  const targetPlusStepXYPx = [
    targetXYPx[0] + px * stepDir[0],
    targetXYPx[1] + px * stepDir[1],
  ];
  const targetPlusStepXYDeg = XYDegOfPx(0, targetPlusStepXYPx);

  const targetMinusStepXYPx = [
    targetXYPx[0] - px * stepDir[0],
    targetXYPx[1] - px * stepDir[1],
  ];
  const targetMinusStepXYDeg = XYDegOfPx(0, targetMinusStepXYPx);

  let deg = 0; // Initialize deg.

  switch (steppingPlan) {
    case "one":
      // Measure spacing on one side of the target.
      deg = Math.hypot(
        targetPlusStepXYDeg[0] - targetXYDeg[0],
        targetPlusStepXYDeg[1] - targetXYDeg[1],
      );
      break;

    case "oneCentered":
    // Center spacing on target (px halved above, deg doubled below).
    // Fallthrough intentional to "both".

    case "both":
      // Average the spacing on both sides of the target.
      deg =
        0.5 *
        Math.hypot(
          targetPlusStepXYDeg[0] - targetMinusStepXYDeg[0],
          targetPlusStepXYDeg[1] - targetMinusStepXYDeg[1],
        );
      if (steppingPlan === "oneCentered") {
        deg = 2 * deg;
      }
      break;

    default:
      throw new Error(`Unknown steppingPlan: ${steppingPlan}`);
  }

  return deg;
};

const StepPxOfDeg = (deg, stepDir, steppingPlan, targetXYPx, targetXYDeg) => {
  // Convert deg step to px step.
  // Handles all cases of quickCase.
  // We use targetXYDeg and targetXYPx.
  if (steppingPlan === "oneCentered") {
    deg = deg / 2;
  }
  const targetPlusStepXYDeg = [
    targetXYDeg[0] + deg * stepDir[0],
    targetXYDeg[1] + deg * stepDir[1],
  ];
  const targetPlusStepXYPx = XYPxOfDeg(0, targetPlusStepXYDeg);
  const targetMinusStepXYDeg = [
    targetXYDeg[0] - deg * stepDir[0],
    targetXYDeg[1] - deg * stepDir[1],
  ];
  const targetMinusStepXYPx = XYPxOfDeg(0, targetMinusStepXYDeg);

  let px = 0;
  switch (steppingPlan) {
    case "one":
      // Measure step on one side of target.
      px = Math.hypot(
        targetPlusStepXYPx[0] - targetXYPx[0],
        targetPlusStepXYPx[1] - targetXYPx[1],
      );
      break;
    case "oneCentered":
    // Center step on target. deg was halved above,
    // and we'll double px below.
    case "both":
      // Average the steps on both sides of target.
      // hypot(x,y) = sqrt(x**2 + y**2);
      px =
        0.5 *
        Math.hypot(
          targetPlusStepXYPx[0] - targetMinusStepXYPx[0],
          targetPlusStepXYPx[1] - targetMinusStepXYPx[1],
        );
      if (steppingPlan === "oneCentered") {
        px = 2 * px;
      }
      break;
  }
  return px;
};

export const checkForBlackout = (context, targetXYPX, showTimingBarsBool) => {
  const screenLowerLeft = [
    -Screens[0].window._size[0] / 2,
    -Screens[0].window._size[1] / 2,
  ];
  const screenUpperRight = [
    Screens[0].window._size[0] / 2,
    Screens[0].window._size[1] / 2,
  ];
  let screenRect = new Rectangle(screenLowerLeft, screenUpperRight);

  // if showTimingBarsBool is true clip the rectangle so its left edge aligns with the right edge of the timing bars
  if (showTimingBarsBool) {
    const timingBarWidth = 2 * 96;
    screenRect = new Rectangle(
      [screenLowerLeft[0] + timingBarWidth, screenLowerLeft[1]],
      screenUpperRight,
    );
    // screenRect.drawOnCanvas(ctx, { strokeStyle: "red" });
  }
  const screenRectArray = screenRect.toArray();

  //create a square rect with a side lenghth of 0.5 * min(screen width, screen height)
  canvas.width = Screens[0].window._size[0];
  canvas.height = Screens[0].window._size[1];
  const sideLength =
    0.5 * Math.min(Screens[0].window._size[0], Screens[0].window._size[1]);

  const rect = new Rectangle(
    [-sideLength / 2, -sideLength / 2],
    [sideLength / 2, sideLength / 2],
  ).centerAt(targetXYPX);

  const rectArray = rect.toArray();

  const clippedRect = isRectInRect(rectArray, screenRectArray)
    ? rect
    : clipRectangle(screenRectArray, rectArray);

  if (clippedRect === null) {
    // The rectangle is completely outside the screen
    return false;
  }
  const clippedRectArray = clippedRect.toArray();
  // 13 test points// One at each corner, and two more points at 1/3 and 2/3 of the way along each edge. And one in the center
  const width = clippedRect.width;
  const height = clippedRect.height;
  const testPoints = [
    clippedRectArray[0],
    clippedRectArray[1],
    [clippedRectArray[0][0], clippedRectArray[1][1]],
    [clippedRectArray[1][0], clippedRectArray[0][1]],
    [clippedRectArray[0][0], clippedRectArray[0][1] + height / 3],
    [clippedRectArray[0][0], clippedRectArray[0][1] + (2 * height) / 3],
    [clippedRectArray[1][0], clippedRectArray[0][1] + height / 3],
    [clippedRectArray[1][0], clippedRectArray[0][1] + (2 * height) / 3],
    [clippedRectArray[0][0] + width / 3, clippedRectArray[0][1]],
    [clippedRectArray[0][0] + (2 * width) / 3, clippedRectArray[0][1]],
    [clippedRectArray[0][0] + width / 3, clippedRectArray[1][1]],
    [clippedRectArray[0][0] + (2 * width) / 3, clippedRectArray[1][1]],
    [clippedRectArray[0][0] + width / 2, clippedRectArray[0][1] + height / 2],
  ];

  // Draw the test points
  // rect.drawPointsOnCanvas(ctx, testPoints, { strokeStyle: "black", radius: 4 });

  // check if all the test points are black
  const allBlack = testPoints.every((point) => isPointBlack(context, point));
  return allBlack;
};

const isPointBlack = (ctx, point) => {
  const pixel = new Uint8Array(4);
  const width = psychoJS.window._size[0];
  const height = psychoJS.window._size[1];
  const webglX = Math.round(point[0] + width / 2);
  const webglY = Math.round(height / 2 + point[1]);
  ctx.readPixels(webglX, webglY, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, pixel);
  return pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0;
};

//more efficient. But not working yet for some reason
const getPixelDataOfRect = (ctx, rect, testPoints) => {
  //using readPixels to get the pixel data of the rectangle
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  const canvasWidth = psychoJS.window._size[0];
  const canvasHeight = psychoJS.window._size[1];
  const left = Math.round(rect.left);
  const bottom = Math.round(rect.bottom);
  const webglLeft = Math.round(rect.left + canvasWidth / 2);
  const webglBottom = Math.round(rect.bottom + canvasHeight / 2);

  const pixelData = new Uint8Array(width * height * 4);
  ctx.readPixels(
    webglLeft,
    webglBottom,
    width,
    height,
    ctx.RGBA,
    ctx.UNSIGNED_BYTE,
    pixelData,
  );

  //get the pixel data of the test points. test points are in screen coordinates (center-origin)
  const testPointsPixelData = testPoints.map((point) => {
    const pointWebGLX = Math.round(point[0] + canvasWidth / 2);
    const pointWebGLY = Math.round(point[1] + canvasHeight / 2);
    const localX = pointWebGLX - webglLeft;
    const localY = pointWebGLY - webglBottom;
    if (localX < 0 || localX >= width || localY < 0 || localY >= height) {
      return null; // Out of rectangle bounds
    }
    const index = 4 * (localY * width + localX);
    return pixelData.slice(index, index + 4);
  });

  const allBlack = testPointsPixelData.every(
    (pixel) =>
      pixel !== null && pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0,
  );
  return allBlack;
};

export const drawTextOffscreen = (text) => {
  const screenLowerLeft = [
    -Screens[0].window._size[0] / 2,
    -Screens[0].window._size[1] / 2,
  ];
  const screenUpperRight = [
    Screens[0].window._size[0] / 2,
    Screens[0].window._size[1] / 2,
  ];

  const BC = status.block_condition;
  let font = paramReader.read("font", BC);
  if (paramReader.read("fontSource", BC) === "file") {
    font = cleanFontName(font);
  }
  const padding = paramReader.read("fontPadding", BC);
  const height = paramReader.read("fontSizeReferencePx", BC);
  const textStim = new visual.TextStim({
    name: "drawTextOffscreen",
    ...targetTextStimConfig,
    win: psychoJS.window,
    color: new util.Color("black"),
    text: text,
    pos: [5000, 0],
    height: height,
    font: font,
    padding: padding,
  });
  textStim.setAutoDraw(true);
  return textStim;
};

export const removeOffscreenText = (textStim) => {
  if (textStim !== null && textStim.status === PsychoJS.Status.STARTED) {
    textStim.setAutoDraw(false);
  }
  return null;
};
