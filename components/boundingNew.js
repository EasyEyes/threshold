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
  color = "red",
) => {
  if (
    paramReader.read("showBoundingBoxBool", status.block_condition) &&
    showTripletBoundingBox
  ) {
    canvas.width = Screens[0].window._size[0];
    canvas.height = Screens[0].window._size[1];
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    characterSetRectPx.drawOnCanvas(ctx, {
      strokeStyle: color,
      lineWidth: 2,
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
    if (thresholdParameter === "thresholdSizeDeg") {
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
    const characterSet = paramReader.read("fontCharacterSet", BC).split("");
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
      paramReader.read("EasyEyesLettersVersion", BC) === 2
        ? getCharacterSetBoundingBox(
            characterSet,
            font,
            psychoJS.window,
            paramReader.read("fontSizeReferencePx", BC),
            padding,
            pxPerCm,
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
) => {
  if (!pxPerCm) throw new Error("pxPerCm is required");
  const fontSizeReferencePt = (72 * (fontSizeReferencePx / pxPerCm)) / 2.54;
  const testStim = new visual.TextStim({
    name: "characterSetBoundingBoxStim",
    win: window,
    color: new util.Color("black"),
    ...targetTextStimConfig,
    height: fontSizeReferencePx,
    font: font,
    padding: padding,
    text: characterSet.join(""),
    pos: [0, 0],
  });
  testStim._updateIfNeeded();
  const thisBB = testStim.getBoundingBox(true);
  // Compute a normalized bounding box
  const rect = rectFromPixiRect(thisBB).toArray();
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

  const heightPxPerFontSize = ascentPxPerFontSize + descentPxPerFontSize;
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

  return {
    stimulusRectPerFontSize,
    ascentPxPerFontSize,
    meanWidthPxPerFontSize,
    heightPxPerFontSize,
    widthPxPerFontSize,
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
  let characterSet = "";

  if (quickCase === "acuity") {
    targetString = sampleWithoutReplacement(fontCharacterSet, 1);
    characterSet = targetString;
  } else if (quickCase === "typographicCrowding") {
    targetString = sampleWithoutReplacement(fontCharacterSet, 3);
    characterSet = targetString;
  } else if (quickCase === "ratioCrowding") {
    [targetString, flanker1String, flanker2String] = sampleWithoutReplacement(
      fontCharacterSet,
      3,
    );
    characterSet = [flanker1String, targetString, flanker2String];
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

  characterSetBoundingBox = getCharacterSetBoundingBox(
    characterSet,
    fontName,
    psychoJS.window,
    fontSizeReferencePx,
    padding,
    Screens[0].pxPerCm,
  );

  // Get stimulus width
  if (quickCase === "ratioCrowding") {
    stimulusWidthPerFontSize =
      0.5 * characterSetBoundingBox.widthPxPerFontSize[flanker1String] +
      2 *
        characterSetBoundingBox.meanWidthPxPerFontSize *
        spacingOverSizeRatio +
      0.5 * characterSetBoundingBox.widthPxPerFontSize[flanker2String];
  } else if (quickCase === "acuity") {
    stimulusWidthPerFontSize =
      characterSetBoundingBox.widthPxPerFontSize[targetString];
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
      text: targetString.join(""),
      pos: [0, 0],
    });
    testStim._updateIfNeeded();
    const thisBB = testStim.getBoundingBox(true);
    stimulusWidthPerFontSize = thisBB.width / fontSizeReferencePx;
  }

  // Update stimulusRectPerFontSize
  const rect = characterSetBoundingBox.stimulusRectPerFontSize.toArray();
  if (fontIsLeftToRight) {
    rect[0][0] = 0;
    rect[1][0] = stimulusWidthPerFontSize;
  } else {
    rect[1][0] = 0;
    rect[0][0] = -stimulusWidthPerFontSize;
  }
  characterSetBoundingBox.stimulusRectPerFontSize = new Rectangle(
    rect[0],
    rect[1],
  );

  if (quickCase === "typographicCrowding") {
    targetString = targetString.join("");
  }

  const stimulusParameters = {
    targetString: targetString,
    flankerStrings: [flanker1String, flanker2String],
  };
  //   return {
  //     targetString,
  //     flanker1String,
  //     flanker2String,
  //     stimulusWidthPerFontSize,
  //   };

  return [2, stimulusParameters, characterSetBoundingBox];
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
) => {
  // Center the stimulus rect on the screen
  const center = [0, 0];
  const stimulusRectMinusTargetPerFontSize =
    characterSetBoundingBox.stimulusRectPerFontSize.centerAt(center).toArray();

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
      if (stimulusRectMinusTargetPerFontSize[i][j] === 0) continue;
      const fontSizePx =
        screenRectMinusTarget[i][j] / stimulusRectMinusTargetPerFontSize[i][j];
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
  switch (quickCase) {
    case "ratioCrowding":
      px =
        spacingOverSizeRatio *
        characterSetBoundingBox.meanWidthPxPerFontSize *
        fontSizeMaxPx;
      break;
    case "typographicCrowding":
      px = characterSetBoundingBox.meanWidthPxPerFontSize * fontSizeMaxPx;
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

  const offsetTargetXYDeg = XYDegOfPx(0, [
    targetEccentricityXYPX[0] + px / 2,
    targetEccentricityXYPX[1],
  ]);
  const deg = 2 * (offsetTargetXYDeg[0] - targetEccentricityDeg.x);
  const maxLevel = Math.log10(deg);

  //convert targetMinPhysicalPx to minLevel

  switch (quickCase) {
    case "ratioCrowding":
      //targetMinimumPix = targetMinimumPix / window.devicePixelRatio;
      px = spacingOverSizeRatio * letterConfig.targetMinimumPix;
      break;
    case "typographicCrowding":
      px = letterConfig.targetMinimumPix;
      break;
    case "acuity":
      px = letterConfig.targetMinimumPix;
      break;
  }

  const offsetTargetXYDeg2 = XYDegOfPx(0, [
    targetEccentricityXYPX[0] + px / 2,
    targetEccentricityXYPX[1],
  ]);
  const deg2 = 2 * (offsetTargetXYDeg2[0] - targetEccentricityDeg.x);
  const minLevel = Math.log10(deg2);

  //apply the upper and lower bounds
  let level = Math.min(maxLevel, levelProposedByQuest);
  level = Math.max(minLevel, level);

  //to draw the target, EE scales the rect up to the actual font size

  const degFinal = Math.pow(10, level);
  const offsetTargetXYPxFinal = XYPxOfDeg(0, [
    targetEccentricityDeg.x + degFinal / 2,
    targetEccentricityDeg.y,
  ]);
  const pxFinal = 2 * (offsetTargetXYPxFinal[0] - targetEccentricityXYPX[0]);

  let fontSizePx = 0;

  switch (quickCase) {
    case "ratioCrowding":
      fontSizePx =
        pxFinal /
        spacingOverSizeRatio /
        characterSetBoundingBox.meanWidthPxPerFontSize;
      break;
    case "typographicCrowding":
      fontSizePx = pxFinal / characterSetBoundingBox.meanWidthPxPerFontSize;
      break;
    case "acuity":
      let px_ = pxFinal;
      if (!targetSizeIsHeight) {
        const heightOverWidth =
          characterSetBoundingBox.heightOverWidth[targetCharacter];
        px_ = pxFinal * heightOverWidth;
      }
      fontSizePx = px_ / characterSetBoundingBox.heightPxPerFontSize;
      break;
  }

  // scale stimulus Rect by fontSizePx
  const centeredRect = characterSetBoundingBox.stimulusRectPerFontSize
    .centerAt(targetEccentricityXYPX)
    .scale(fontSizePx);
  const centeredRectArray = centeredRect.toArray();
  const stimulusRectArray = characterSetBoundingBox.stimulusRectPerFontSize
    .scale(fontSizePx)
    .toArray();
  let penX, penY;

  if (!fontIsLeftToRight) {
    penX = centeredRectArray[0][0] - stimulusRectArray[0][0];
    penY = centeredRectArray[0][1] - stimulusRectArray[0][1];
  } else {
    penX = centeredRectArray[1][0] - stimulusRectArray[1][0];
    penY = centeredRectArray[1][1] - stimulusRectArray[1][1];
  }

  if (showTripletBoundingBox) {
    drawTripletBoundingBox(
      centeredRect,
      showTripletBoundingBox,
      fontSizePx,
      characterSetBoundingBox.ascentPxPerFontSize,
    );

    //draw unscaled
    characterSetBoundingBox.stimulusRectPerFontSize
      .centerAt(targetEccentricityXYPX)
      .scale(300)
      .drawOnCanvas(ctx, { strokeStyle: "red" });
  }

  let spacingDeg,
    flankerXYDegs = [],
    flankersXYPX = [],
    sizeDeg;

  const heightPx = fontSizePx;
  const widthPx = centeredRect.width;
  const targetAndFlankersXYPx = [targetEccentricityXYPX];
  const heightDeg = heightPxToDeg(heightPx, targetEccentricityXYPX);
  const widthDeg = widthPxToDeg(widthPx, targetEccentricityXYPX);

  if (quickCase === "ratioCrowding") {
    spacingDeg = Math.pow(10, level);
    sizeDeg = spacingDeg / spacingOverSizeRatio;
    // const _offsetTargetXYPx = XYPxOfDeg(0, [targetEccentricityDeg.x + spacingDeg/2, targetEccentricityDeg.y]);
    // let _px = 2* (_offsetTargetXYPx[0] - targetEccentricityXYPX[0]);
    // if(!fontIsLeftToRight){px = -px}

    //flanker positions: spacingDeg to the left and right of the target
    flankerXYDegs = [
      [targetEccentricityDeg.x - spacingDeg, targetEccentricityDeg.y],
      [targetEccentricityDeg.x + spacingDeg, targetEccentricityDeg.y],
    ];

    flankersXYPX = flankerXYDegs.map((xyDeg) => XYPxOfDeg(0, xyDeg));
    targetAndFlankersXYPx.push(...flankersXYPX);
  } else if (quickCase === "typographicCrowding") {
    spacingDeg = Math.pow(10, level);
    sizeDeg = targetSizeIsHeight ? heightDeg : widthDeg;
  } else if (quickCase === "acuity") {
    spacingDeg = Math.pow(10, level);
    sizeDeg = spacingDeg;
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
