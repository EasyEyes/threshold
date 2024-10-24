import { visual } from "../psychojs/src";
import {
  letterConfig,
  targetTextStimConfig,
  font,
  status,
  thisExperimentInfo,
} from "./global";
import {
  colorRGBASnippetToRGBA,
  logger,
  Rectangle,
  sendEmailForDebugging,
} from "./utils";
import { psychoJS } from "./globalPsychoJS";
import { ctx } from "./bounding";

export const readTrialLevelLetterParams = (reader, BC) => {
  letterConfig.thresholdParameter = reader.read("thresholdParameter", BC);
  letterConfig.targetDurationSec = reader.read("targetDurationSec", BC);
  letterConfig.delayBeforeStimOnsetSec = reader.read(
    "markingOffsetBeforeTargetOnsetSecs",
    BC,
  );
  letterConfig.spacingDirection = reader.read("spacingDirection", BC);
  letterConfig.spacingSymmetry = reader.read("spacingSymmetry", BC);
  letterConfig.targetSizeDeg = reader.read("targetSizeDeg", BC);
  letterConfig.targetSizeIsHeightBool = reader.read(
    "targetSizeIsHeightBool",
    BC,
  );
  letterConfig.targetMinimumPix = reader.read("targetMinimumPix", BC);
  letterConfig.spacingOverSizeRatio = reader.read("spacingOverSizeRatio", BC);
  letterConfig.spacingRelationToSize = reader.read("spacingRelationToSize", BC);
  letterConfig.targetMinimumPix = reader.read("targetMinimumPix", BC);
  letterConfig.targetSafetyMarginSec = reader.read("targetSafetyMarginSec", BC);
  letterConfig.fontMaxPx = reader.read("fontMaxPx", BC);
};

export const getTargetStim = (
  stimulusParameters,
  reader,
  BC,
  text,
  oldStim,
  stimNumber = 0, // 0 is target, 1,2,3,4 are flankers
) => {
  if (oldStim && oldStim.destroy) oldStim.destroy();
  const name = ["target", "flanker1", "flanker2", "flanker3", "flanker4"][
    stimNumber
  ];
  const h = stimulusParameters.heightPx;
  const pos = stimulusParameters.targetAndFlankersXYPx[stimNumber];
  const stimConfig = Object.assign(targetTextStimConfig, {
    name: name,
    win: psychoJS.window,
    font: font.name,
    color: colorRGBASnippetToRGBA(font.colorRGBA),
    pos: pos,
    text: text,
    padding: reader.read("fontPadding", BC),
    height: h,
    characterSet: String(reader.read("fontCharacterSet", BC)).split(""),
    medialShape: reader.read("fontMedialShapeTargetBool", BC),
  });
  if (font.letterSpacing && font.letterSpacing > 0)
    stimConfig.letterSpacing = font.letterSpacing * h;

  const stim = new visual.TextStim(stimConfig);
  // stim._updateIfNeeded();
  // const metrics = stim.getTextMetrics("middle");
  // const ascent = metrics.boundingBox.actualBoundingBoxAscent;
  // const descent = metrics.boundingBox.actualBoundingBoxDescent;

  // //lower left corner and upper right corner
  // const actualHeight = ascent + descent;
  // const factor = h / actualHeight;
  // stim.setHeight(h * factor);
  // stim.setPos(pos);
  // stim._needUpdate = true;
  // stim._updateIfNeeded();

  return stim;
};

export const logLetterParamsToFormspree = (
  letterParameters,
  fontLatencySec = "NaN",
) => {
  const t = performance.now();
  const timestamp = {
    timestamp: t,
    pavloviaId: thisExperimentInfo.PavloviaSessionID,
  };
  if (fontLatencySec === "NaN") {
    sendEmailForDebugging(Object.assign(letterParameters, timestamp));
    return;
  }
  sendEmailForDebugging(Object.assign({ fontLatencySec }, timestamp));
};
