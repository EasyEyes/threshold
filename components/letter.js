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
import { resolveAutoMode } from "./fontPreRenderAuto";
import { AUTO_DECISION_OUTPUT_PARAMS } from "./outputParameters";
import { ctx } from "./boundingNew";
import { warning } from "./errorHandling";
import { readFontMetricsCharacterSet } from "../preprocess/fontPixiMetricsStringDefault";
import { paramReader } from "../threshold";
import { getShrunkFontMaxPhysicalPx } from "./fontMaxPhysicalPx";

// Reuse counter (fontPreRender=buffer): one per reused stim. Reset at
// trial begin; logged as numberOfTimesStimulusReused.
let stimulusReuseCount = 0;
export const getStimulusReuseCount = () => stimulusReuseCount;
export const resetStimulusReuseCount = () => {
  stimulusReuseCount = 0;
};

// Measured crossover (see the raster benchmark in
// tests/sim/e2e/letterTrackingThrash.e2e.test.ts): below ~1% scale delta,
// leaving a reused raster as-is is closer to a native re-raster than a
// resample would be; above it, rescaling is closer — and both cost no
// main-thread time, unlike a re-raster.
const RESCALE_DELTA = 0.01;

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
  letterConfig.targetMinimumPix =
    reader.read("targetMinPhysicalPx", BC) / window.devicePixelRatio;
  letterConfig.spacingOverSizeRatio = reader.read("spacingOverSizeRatio", BC);
  letterConfig.spacingRelationToSize = reader.read("spacingRelationToSize", BC);
  const configuredMaxPhysicalPx = reader.read("fontMaxPhysicalPx", BC);
  if (!Number.isFinite(configuredMaxPhysicalPx) || configuredMaxPhysicalPx <= 0)
    throw new Error("fontMaxPhysicalPx must be a positive number");
  letterConfig.fontMaxPhysicalPx = Math.min(
    configuredMaxPhysicalPx,
    letterConfig.fontMaxPhysicalPxByCondition.get(BC) ?? Infinity,
  );
  letterConfig.thresholdAllowedBlackoutBool = reader.read(
    "thresholdAllowedBlackoutBool",
    BC,
  );
  letterConfig.fontMaxShrinkage = reader.read("fontMaxShrinkage", BC);
  if (!(letterConfig.fontMaxShrinkage > 0 && letterConfig.fontMaxShrinkage < 1))
    throw new Error("fontMaxShrinkage must be greater than 0 and less than 1");
  letterConfig.currentNominalFontSize = undefined;
  letterConfig.responseMaxOptions = reader.read("responseMaxOptions", BC);
};

export const shrinkFontMaxPhysicalPxAfterBadRendering = (BC) => {
  const failedNominalFontSizePx = letterConfig.currentNominalFontSize;
  if (!Number.isFinite(failedNominalFontSizePx) || failedNominalFontSizePx <= 0)
    return;
  letterConfig.fontMaxPhysicalPx = getShrunkFontMaxPhysicalPx(
    letterConfig.fontMaxPhysicalPx,
    letterConfig.fontMaxShrinkage,
    failedNominalFontSizePx,
  );
  letterConfig.fontMaxPhysicalPxByCondition.set(
    BC,
    letterConfig.fontMaxPhysicalPx,
  );
};

export const getTargetStim = (
  stimulusParameters,
  reader,
  BC,
  text,
  oldStim,
  stimNumber = 0, // 0 is target, 1,2,3,4 are flankers
) => {
  const name = ["target", "flanker1", "flanker2", "flanker3", "flanker4"][
    stimNumber
  ];
  const h = stimulusParameters.heightPx;
  if (stimNumber === 0) letterConfig.currentNominalFontSize = h;
  const pos = stimulusParameters.targetAndFlankersXYPx[stimNumber];
  const stimConfig = Object.assign({}, targetTextStimConfig, {
    name: name,
    win: psychoJS.window,
    font: font.name,
    color: colorRGBASnippetToRGBA(font.colorRGBA),
    pos: pos,
    text: text,
    padding: reader.read("fontPadding", BC),
    height: h,
    characterSet: readFontMetricsCharacterSet(reader, BC),
    medialShape: reader.read("fontMedialShapeTargetBool", BC),
    language: font.language,
    direction: font.direction,
    kerning: font.kerning,
    textRendering: font.textRendering,
  });
  if (font.letterSpacing && font.letterSpacing > 0)
    stimConfig.letterSpacing = font.letterSpacing * h;

  // Re-armed tracking gate: the stimulus regenerates at a new predicted
  // fixation position, but its definition is unchanged within the trial,
  // so re-creating the TextStim would re-rasterize the glyphs — a
  // 0.1–1.5 s main-thread block that freezes the crosshair mid-motion
  // and sustains the tracking-gate livelock. Reuse the existing raster
  // and just move the stim. The identity is the FULL appearance
  // definition (nearly all table parameters are condition-level and
  // conditions interleave within a block, so it must cover every
  // stimConfig field that affects the raster — not just font name).
  // The two size keys are quantized to ~4% relative steps. Exact
  // equality is impossible: sizeDeg is a deg→px→deg roundtrip evaluated
  // at the target position, so it jitters ~0.005% between arms, and
  // heightPx jitters ±0.5% — both because the predicted fixation
  // position moves on every re-arm, and exact matching would
  // re-rasterize every arm (the livelock this guard exists to prevent).
  // Real changes always cross a step: level steps (≥~10%), screen-fit
  // clamp changes, viewing-distance updates (re-sampled at trial Begin),
  // eccentricity changes across interleaved conditions. Below the
  // measured crossover the raster is left as-is (a native re-raster at
  // such a tiny gap is nearer to the stale raster than a resample is);
  // beyond it renderScale makes the DISPLAYED size exact, leaving only
  // sub-device-pixel resample artifacts at small letter sizes (more,
  // though still small in coverage terms, at large letter sizes — see
  // the raster benchmark). Size lag never accumulates.
  const quantize = (v) => Math.round(Math.log2(v) * 18) / 18;
  const sizeDeg = stimulusParameters.sizeDeg ?? stimulusParameters.heightDeg;
  const renderIdentity = JSON.stringify({
    text: stimConfig.text,
    font: stimConfig.font,
    sizeDeg: sizeDeg > 0 ? quantize(sizeDeg) : sizeDeg,
    scalePx:
      stimConfig.height > 0 ? quantize(stimConfig.height) : stimConfig.height,
    color: stimConfig.color,
    padding: stimConfig.padding,
    characterSet: stimConfig.characterSet,
    medialShape: stimConfig.medialShape,
    language: stimConfig.language,
    direction: stimConfig.direction,
    kerning: stimConfig.kerning,
    textRendering: stimConfig.textRendering,
    letterSpacing: font.letterSpacing,
  });
  // Gated behind fontPreRender (glossary param, default none): "none"
  // keeps the exact status quo — every arm re-rasterizes. "buffer"
  // always reuses. "auto" decides per trial from the trial's measured
  // initial raster cost (fontPreRenderAuto.ts) and logs the resolution.
  const fontPreRenderMode = reader.read("fontPreRender", BC);
  const reuseEligible = oldStim && oldStim._renderIdentity === renderIdentity;
  let useBuffer = fontPreRenderMode === "buffer";
  if (!useBuffer && fontPreRenderMode === "auto" && reuseEligible) {
    // Log the decision with its evidence: the measured trial-start raster
    // total and the threshold it was compared against.
    const decided = resolveAutoMode(
      psychoJS.window?.getActualFrameRate?.(),
      reader.read("thresholdAllowedLatenessSec", BC),
    );
    const values = {
      fontPreRenderModeUsed: decided.mode,
      fontPreRenderMeasuredRasterSec: decided.measuredRasterSec,
      fontPreRenderThresholdRasterSec: decided.thresholdRasterSec,
    };
    AUTO_DECISION_OUTPUT_PARAMS.forEach((name) =>
      psychoJS.experiment?.addData?.(name, values[name]),
    );
    useBuffer = decided.mode === "buffer";
  }
  if (useBuffer && reuseEligible) {
    (globalThis.__stimStats ??= { reused: 0, created: 0 }).reused++;
    stimulusReuseCount++;
    oldStim.setPos(pos);
    // Exact-size display: the raster stays native; a GPU-only renderScale
    // tracks the new heightPx beyond the measured crossover (within it,
    // the stale raster is already closer to a native re-raster).
    const rasterH = oldStim._rasterHeightPx ?? stimConfig.height;
    const delta = stimConfig.height / rasterH;
    if (delta > 0 && Math.abs(delta - 1) > RESCALE_DELTA)
      oldStim.setRenderScale(delta);
    else oldStim.setRenderScale(1);
    return oldStim;
  }
  (globalThis.__stimStats ??= { reused: 0, created: 0 }).created++;
  if (oldStim && oldStim.destroy) oldStim.destroy();

  const stim = new visual.TextStim(stimConfig);
  stim._renderIdentity = renderIdentity;
  stim._rasterHeightPx = stimConfig.height;
  // if (paramReader.read("fontPreRender", BC) === "cache") stim.setAutoDraw(true);
  return stim;
};

let previousTimestamp = performance.now();
const bufferPeriodMs = 20;
export const logLetterParamsToFormspree = (
  letterParameters,
  fontLatencySec = "NaN",
) => {
  const t = performance.now();
  const timestamp = {
    timestamp: t,
    pavloviaID: thisExperimentInfo.PavloviaSessionID,
    logParameter: "_logFontBool",
  };
  let formData;
  if (fontLatencySec === "NaN") {
    formData = Object.assign(letterParameters, timestamp);
  } else {
    formData = Object.assign({ fontLatencySec }, timestamp);
  }
  // Prevent repeatedly flooding formspree
  if (t && previousTimestamp && t - previousTimestamp < bufferPeriodMs) {
    warning(
      `Prevented POSTing to Formspree. Previously POSTed within the last ${bufferPeriodMs}ms.\nData from POST attempt:\n${Object.entries(
        formData,
      ).toString()}`,
    );
    return;
  }
  previousTimestamp = t;
  sendEmailForDebugging(formData);
};

export const logHeapToFormspree = (
  UsedHeapBeforeDrawing,
  TotalHeapBeforeDrawing,
  HeapLimitBeforeDrawing,
  UsedHeapAfterDrawing,
  TotalHeapAfterDrawing,
  HeapLimitAfterDrawing,
) => {
  const t = performance.now();
  const formData = {
    timestamp: t,
    pavloviaID: thisExperimentInfo.PavloviaSessionID,
    logParameter: "_logFontBool",
    UsedHeapBeforeDrawing,
    TotalHeapBeforeDrawing,
    HeapLimitBeforeDrawing,
    UsedHeapAfterDrawing,
    TotalHeapAfterDrawing,
    HeapLimitAfterDrawing,
  };
  // Prevent repeatedly flooding formspree
  if (t && previousTimestamp && t - previousTimestamp < bufferPeriodMs) {
    warning(
      `Prevented POSTing to Formspree. Previously POSTed within the last ${bufferPeriodMs}ms.\nData from POST attempt:\n${Object.entries(
        formData,
      ).toString()}`,
    );
    return;
  }
  previousTimestamp = t;
  sendEmailForDebugging(formData);
};

export const logWebGLInfoToFormspree = (webGLInfo) => {
  const t = performance.now();
  const formData = {
    timestamp: t,
    pavloviaID: thisExperimentInfo.PavloviaSessionID,
    logParameter: "_logFontBool",
    ...webGLInfo,
  };
  // Prevent repeatedly flooding formspree
  if (t && previousTimestamp && t - previousTimestamp < bufferPeriodMs) {
    warning(
      `Prevented POSTing to Formspree. Previously POSTed within the last ${bufferPeriodMs}ms.\nData from POST attempt:\n${Object.entries(
        formData,
      ).toString()}`,
    );
    return;
  }
  previousTimestamp = t;
  sendEmailForDebugging(formData);
};
