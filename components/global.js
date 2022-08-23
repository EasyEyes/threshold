// ! AVOID IMPORTS HERE

export const thisExperimentInfo = {
  name: "threshold",
  expName: "threshold",

  psychopyVersion: undefined,

  requestedCrossSessionId: false,
  participant: undefined,
  _s: 1, // session

  EasyEyesID: undefined,

  ProlificParticipantID: undefined,
  ProlificSessionID: undefined,
  ProlificStudyID: undefined,

  experimentFileName: undefined,
  experimentName: undefined,

  date: undefined,

  hardwareConcurrency: undefined,
  deviceType: undefined,
  deviceSystem: undefined,
  deviceSystemFamily: undefined,
  deviceBrowser: undefined,
  deviceBrowserVersion: undefined,
  deviceLanguage: undefined,

  psychojsWindowDimensions: undefined,
  monitorFrameRate: undefined,

  get session() {
    return this._s.toString().padStart(4, "0");
  },

  set session(value) {},

  setSession(num) {
    this._s = num;
  },
};

export const localStorageKey = "__EASYEYES__";

/* -------------------------------- EXTERNALS ------------------------------- */
/* ---------------------------- Remote Calibrator --------------------------- */
export const useRC = true;
// eslint-disable-next-line no-undef
export const rc = RemoteCalibrator; // Currently imported from HTML script tag
rc.init();

// stats.js
export const stats = { current: undefined, on: false };

export const usingGaze = { current: undefined };

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

export const targetTask = { current: undefined };
export const targetKind = { current: undefined };

export const correctAns = { current: [] }; // for keyboard ans

// Renders
export const font = {
  name: undefined,
  source: undefined,
  style: undefined,
  ltr: undefined,
  instructionFont: undefined,
  instructionFontSource: undefined,
  padding: undefined,
};
export const fontCharacterSet = { current: undefined, where: undefined };

export const fixationConfig = {
  nominalPos: [0, 0], // Nominal, scientist specified position. Only used as a reference point when gyrating fixation.
  pos: [0, 0], // Actual, current position XY in psychoJS `pix` units. In general, the only location value one should use.
  offset: undefined, // Random starting offset
  show: true,
  strokeLength: 45, // aka fixationStrokeLengthPx
  strokeWidth: 2, // aka fixationStrokeThicknessPx
  markingBlankedNearTargetBool: undefined,
  markingBlankingPos: undefined,
  markingBlankingRadiusReEccentricity: undefined,
  markingBlankingRadiusReTargetHeight: undefined,
  markingFixationHotSpotRadiusDeg: undefined,
  markingFixationHotSpotRadiusPx: undefined,
  markingFixationMotionRadiusDeg: undefined,
  markingFixationMotionPeriodSec: undefined,
  markingFixationStrokeLengthDeg: undefined,
  markingFixationStrokeThicknessDeg: undefined,
  markingOffsetBeforeTargetOnsetSecs: undefined,
  markingOnsetAfterTargetOffsetSecs: undefined,
  stims: undefined, // psychoJS shapeStim
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
  thresholdParameter: undefined,
  spacingDirection: undefined,
  spacingSymmetry: undefined,
  spacingOverSizeRatio: undefined,
  spacingRelationToSize: undefined,
  flankerCharacters: [undefined, undefined],
  delayBeforeStimOnsetSec: undefined,
  targetSafetyMarginSec: undefined,
});

export const repeatedLettersConfig = Object.seal({
  targetRepeatsBorderCharacter: undefined,
  targetRepeatsMaxLines: undefined,
  stims: undefined,
  level: undefined,
  stimulusParameters: undefined,
});

export const instructionFont = { current: undefined };

export const tolerances = Object.seal({
  allowed: {
    thresholdAllowedDurationRatio: undefined,
    thresholdAllowedGazeXErrorDeg: undefined,
    thresholdAllowedGazeYErrorDeg: undefined,
    thresholdAllowedGazeRErrorDeg: undefined,
    thresholdAllowedLatencySec: undefined,
  },
  measured: {
    thresholdDurationRatio: undefined,
    gazeMeasuredXDeg: undefined,
    gazeMeasuredYDeg: undefined,
    gazeMeasuredRDeg: undefined,
    gazeMeasuredRawDeg: [],
    gazeMeasurementLatencySec: undefined,
    targetMeasuredLatencySec: undefined,
    targetMeasuredDurationSec: undefined,
    targetMeasuredDurationFrames: undefined,
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
  stimulusOnsetToOffset: undefined,
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

export const responseType = {
  current: 2,
  original: 2,
  numberOfResponses: 1,
};
export const clickedContinue = { current: false, timestamps: [] };
export const modalButtonTriggeredViaKeyboard = { current: false };

export const showCharacterSetResponse = {
  current: [],
  // current: null,
  onsetTime: [],
  clickTime: [],
  alreadyClickedCharacters: [],
};

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

export const readingTiming = Object.seal({ onsets: [] });
export const readingPageStats = Object.seal({
  readingPageSkipCorpusWords: [],
  readingPageDurationSec: [],
  readingPageLines: [],
  readingPageWords: [],
  readingPageNonblankCharacters: [],
});

/* -------------------------------- Question -------------------------------- */
export const questionsThisBlock = { current: [] };

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

/* -------------------------------------------------------------------------- */
/* ------------------------------- Sound ------------------------------------ */
/* -------------------------------------------------------------------------- */
export const targetIsPresentBool = { current: undefined };
export const ProposedVolumeLevelFromQuest = { current: undefined };
export const maskerVolumeDbSPL = { current: undefined };
export const soundGainDBSPL = { current: undefined };
export const invertedImpulseResponse = { current: undefined };
export const whiteNoiseLevel = { current: undefined };
export const maskerSoundFolder = { current: undefined };
export const targetSoundFolder = { current: undefined };
export const speechInNoiseTargetList = { current: undefined };
export const musicExpert = { current: undefined }; // TEMP
export const speechInNoiseShowClickable = { current: true };
export const vocoderPhraseSoundFiles = { current: undefined, loaded: false };
export const vocoderPhrases = {
  targetPhrase: undefined,
  maskerPhrase: undefined,
};
export const vocoderPhraseCategories = { chosen: undefined, all: undefined };
export const vocoderPhraseShowClickable = { current: true };
export const vocoderPhraseCorrectResponse = { current: undefined };
