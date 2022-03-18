// ! AVOID IMPORTS HERE

/* -------------------------------- EXTERNALS ------------------------------- */
/* ---------------------------- Remote Calibrator --------------------------- */
export const useRC = true;
// eslint-disable-next-line no-undef
export const rc = RemoteCalibrator; // Currently imported from HTML script tag
rc.init();

// stats.js
export const stats = { current: undefined, on: false };

/* ------------------------- Grid / Display Options ------------------------- */

export const displayOptions = Object.seal({
  window: undefined,
  windowWidthCm: undefined,
  windowWidthPx: undefined,
  pixPerCm: undefined,
  nearPointXYDeg: [undefined, undefined],
  nearPointXYPix: [undefined, undefined],
});

export const grid = { current: undefined };

/* ------------------------------- Exp Configs ------------------------------ */
export const totalBlocks = { current: undefined };
export const totalTrialsThisBlock = { current: undefined };

export const targetKind = { current: undefined };

// Renders
export const font = {
  name: undefined,
  source: undefined,
  style: undefined,
  instructionFont: undefined,
  instructionFontSource: undefined,
};
export const fontCharacterSet = { current: undefined, where: undefined };

export const fixationConfig = {
  size: 45,
  pos: [0, 0],
  show: true,
};

export const showConditionNameConfig = {
  name: undefined,
  show: false,
  targetSpecs: undefined,
  showTargetSpecs: false,
};

export const letterConfig = Object.seal({
  targetDurationSec: undefined,
  targetSizeIsHeightBool: undefined,
  targetMinimumPix: undefined,
  targetSizeDeg: undefined,
  targetCharacter: undefined,
  targetEccentricityXYDeg: [undefined, undefined],
  spacingDirection: undefined,
  spacingSymmetry: undefined,
  spacingOverSizeRatio: undefined,
  spacingRelationToSize: undefined,
  flankerCharacters: [undefined, undefined],
  targetSafetyMarginSec: undefined,
});

export const instructionFont = { current: undefined };

export const tolerances = Object.seal({
  allowed: {
    thresholdAllowedDurationRatio: undefined,
    thresholdAllowedGazeErrorDeg: undefined,
    thresholdAllowedLatencySec: undefined,
  },
  measured: {
    thresholdDurationRatio: undefined,
    gazeMeasuredXDeg: undefined,
    gazeMeasuredYDeg: undefined,
    gazeMeasuredRDeg: undefined,
    gazeMeasurementLatencySec: undefined,
    targetMeasuredLatencySec: undefined,
    targetMeasuredDurationSec: undefined,
  },
});
/* --------------------------- Exp Current Status --------------------------- */

export const status = {
  block: undefined, // Current block number, starting from 1
  trial: undefined, // Current trial number, starting from 1
  block_condition: undefined,
  condition: undefined, // [Object] currently running condition
  ////
  trialCorrect_thisBlock: 0, // Correct trials in this block
  trialCompleted_thisBlock: 0, // Total completed trials in this block
};

// SKIP
export const skipTrialOrBlock = {
  blockId: null,
  trialId: null,
  skipTrial: false,
  skipBlock: false,
};

export const timing = Object.seal({
  clickToStimulusOnsetSec: undefined,
});

export const letterTiming = Object.seal({
  trialFirstFrameSec: undefined,
  targetStartSec: undefined,
  targetFinishSec: undefined,
  targetDrawnConfirmedTimestamp: undefined,
  crosshairClickedTimestamp: undefined,
});

/* --------------------------- Participant Config --------------------------- */

export const viewingDistanceDesiredCm = { current: 40 };

/* --------------------------- Participant Status --------------------------- */

export const viewingDistanceCm = { current: 40 };

/* ------------------------------ Interactions ------------------------------ */

export const responseType = { current: 2, original: 2 };
export const clickedContinue = { current: false, timestamps: [] };
export const modalButtonTriggeredViaKeyboard = { current: false };

/* ------------------------------- SIMULATION ------------------------------- */

export const simulatedObserver = {};

/* --------------------------------- Reading -------------------------------- */
export const readingCorpusArchive = {};
export const readingWordListArchive = {};
export const readingWordFrequencyArchive = {};
export const readingFrequencyToWordArchive = {};

export const readingUsedText = {};
export const readingThisBlockPages = []; // string[]

export const readingPageIndex = { current: 0 };

export const readingQuestions = { current: undefined };
export const readingCurrentQuestionIndex = { current: 0 };

export const readingClickableAnswersSetup = { current: false };
export const readingClickableAnswersUpdate = { current: false };

export const readingConfig = {
  height: undefined,
};

/* -------------------------------------------------------------------------- */
/* ------------------------------- COMPONENTS ------------------------------- */
/* -------------------------------------------------------------------------- */

export const uniComponentConfig = {
  text: "",
  units: "pix",
  alignHoriz: "left",
  ori: 0.0,
  opacity: 1.0,
  isInstruction: false,
};

export const instructionsConfig = {
  ...uniComponentConfig,
  height: 25.0,
  wrapWidth: window.innerWidth * 0.8,
  depth: -12.0,
  isInstruction: true, // !
};

export const conditionNameConfig = {
  ...uniComponentConfig,
  height: 30,
  wrapWidth: window.innerWidth,
  depth: -20.0,
  name: "conditionName",
  alignVert: "bottom",
  pos: [-window.innerWidth / 2, -window.innerHeight / 2],
  autoDraw: false,
};

export const targetSpecsConfig = {
  ...uniComponentConfig,
  height: 20,
  wrapWidth: window.innerWidth,
  depth: -21.0,
  name: "targetSpecs",
  alignVert: "bottom",
  pos: [-window.innerWidth / 2, -window.innerHeight / 2],
  autoDraw: false,
};

export const trialCounterConfig = {
  ...uniComponentConfig,
  height: 20,
  wrapWidth: window.innerWidth,
  depth: -22.0,
  name: "trialCounter",
  alignVert: "bottom",
  alignHoriz: "right",
  pos: [window.innerWidth / 2, -window.innerHeight / 2],
  autoDraw: false,
};
