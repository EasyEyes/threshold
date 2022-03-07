import { PsychoJS } from "../psychojs/src/core/index.js";

export const psychoJS = new PsychoJS({
  debug: false,
});

/* ---------------------------- Remote Calibrator --------------------------- */
export const useRC = true;
// eslint-disable-next-line no-undef
export const rc = RemoteCalibrator; // Currently imported from HTML script tag
rc.init();

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
export const fixationConfig = {
  size: 45,
  pos: [0, 0],
  show: true,
};

export const letterConfig = Object.seal({
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
  targetFont: undefined,
  targetSafetyMarginSec: undefined,
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

/* --------------------------- Participant Config --------------------------- */

export const viewingDistanceDesiredCm = { current: 40 };

/* --------------------------- Participant Status --------------------------- */

export const viewingDistanceCm = { current: 40 };

/* ------------------------------ Interactions ------------------------------ */

export const responseType = { current: 2, original: 2 };
export const clickedContinue = { current: false };
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

export const readingQuestions = { current: undefined };
export const readingCurrentQuestionIndex = { current: 0 };

export const readingClickableAnswersSetup = { current: false };
export const readingClickableAnswersUpdate = { current: false };

export const readingHeight = { current: undefined };

/* -------------------------------------------------------------------------- */
/* ------------------------------- COMPONENTS ------------------------------- */
/* -------------------------------------------------------------------------- */

export const instructionsConfig = {
  text: "",
  units: "pix",
  height: 25.0,
  wrapWidth: window.innerWidth * 0.8,
  ori: 0.0,
  opacity: 1.0,
  depth: -12.0,
  alignHoriz: "left",
  isInstruction: true, // !
};
