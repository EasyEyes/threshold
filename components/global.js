// ! AVOID IMPORTS HERE
import { phrases } from "./i18n";

// Map data-structure with a default value
// https://stackoverflow.com/questions/51319147/map-default-value
export class DefaultMap extends Map {
  constructor(defaultFunction, entries) {
    super(entries);
    this.default = defaultFunction;
  }
  get(key) {
    if (!this.has(key)) this.set(key, this.default());
    return super.get(key);
  }
}

export const thisExperimentInfo = {
  name: "threshold",
  expName: "threshold",

  psychopyVersion: undefined,

  participant: undefined,
  _s: 1, // session

  EasyEyesID: undefined,
  PavloviaSessionID: undefined,

  ProlificParticipantID: undefined,
  ProlificSessionID: undefined,
  ProlificStudyID: undefined,

  experimentFilename: undefined,
  experiment: undefined,

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

/** Keypad Handler Proxy (passed to RC as well) */
export const _key_resp_allKeys = {
  current: [],
};

export const _key_resp_event_handlers = {
  current: [],
};

const handler = {
  set: function (target, property, value) {
    target[property] = value;
    _key_resp_event_handlers.current.forEach((handler) => handler(value));
    return true;
  },
};

export const proxyVariable_key_resp_allKeys = new Proxy(
  _key_resp_allKeys.current,
  handler,
);

/* -------------------------------- EXTERNALS ------------------------------- */
/* ---------------------------- Remote Calibrator --------------------------- */
if (typeof RemoteCalibrator === "undefined") {
  const title = "RemoteCalibrator resource failed to load.";
  const text = "Please check your internet connection and refresh the page.";
  if (window.showCriticalLoadError) {
    window.showCriticalLoadError(title, text);
  } else {
    // Brief retry if first.js hasn't set up the handler yet
    setTimeout(() => window.showCriticalLoadError?.(title, text), 50);
  }
  throw new Error("RemoteCalibrator is not defined");
}
// eslint-disable-next-line no-undef
export const rc = RemoteCalibrator; // Currently imported from HTML script tag
await rc.init(
  {
    languagePhrasesJSON: phrases,
  },
  undefined,
  {
    easyEyesKeypadHandler: {
      event_handlers: _key_resp_event_handlers,
      all_keys: _key_resp_allKeys,
    },
  },
);

export const websiteRepoLastCommitDeploy = {
  current: undefined,
};
await fetch("CompatibilityRequirements.txt")
  .then((response) => {
    if (!response?.ok) return "";
    return response.json();
  })
  .then((result) => {
    if (result && result.compilerUpdateDate) {
      websiteRepoLastCommitDeploy.current = result.compilerUpdateDate;
    }
    return undefined;
  })
  .catch((error) => {
    return undefined;
  });

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

export const grid = { current: undefined, units: undefined };

/* ------------------------------- Exp Configs ------------------------------ */
export const totalBlocks = { current: undefined };
export const totalTrialsThisBlock = { current: undefined };
export const blockOrder = { current: undefined };

export const targetTask = { current: undefined };
export const targetKind = { current: undefined };

export const correctAns = { current: [] }; // for keyboard ans

// Renders
export const font = {
  name: undefined,
  source: undefined,
  style: undefined,
  ltr: undefined,
  colorRGBA: undefined,
  defaultColorRGBA: "0,0,0,1",
  instructionFont: undefined,
  instructionFontSource: undefined,
  padding: undefined,
  letterSpacing: 0,
  medialShapeResponse: undefined,
  medialShapeTarget: undefined,
  fontPositionalShapeResponse: undefined,
};
export const typekit = {
  kitId: undefined,
  fonts: new Map(), // name:{css_name}
};

export const fontCharacterSet = { current: undefined, where: undefined };

export const showTimingBarsBool = { current: false };

export const screenBackground = {
  defaultColorRGBA: "1,1,1,1",
  colorRGBA: undefined,
};

export const fixationConfig = {
  nominalPos: [0, 0], // Nominal, scientist specified position. Only used as a reference point when gyrating fixation.
  pos: [0, 0], // Actual, current position XY in psychoJS `pix` units. In general, the only location value one should use.
  offset: undefined, // Random starting offset
  show: true,
  strokeLength: 45, // aka fixationStrokeLengthPx
  strokeWidth: 2, // aka fixationStrokeThicknessPx
  color: undefined,
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
  markingFixationStrokeThickening: undefined,
  markingOffsetBeforeTargetOnsetSecs: undefined,
  markingOnsetAfterTargetOffsetSecs: undefined,
  markingFixationMotionSpeedDegPerSec: undefined,
  stim: undefined, // EasyEyes Fixation object

  trackingTimeAfterDelay: undefined,
  preserveOffset: false, // If rerunning prestimulus function
  // due to change in viewing distance,
  // use the pre-existing fixation offset
  // (ie starting position), so it doesn't
  // look like it's jumping around when
  // viewing distance changes.
};

export const measureMeters = { canMeasureMeters: 0, needMeasureMeters: 0 };

export const targetEccentricityDeg = {
  x: undefined,
  y: undefined,
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
  markingOnsetAfterTargetOffsetSecs: undefined,
  flankerXYDegs: [],
  thresholdAllowedBlackoutBool: undefined,
  fontMaxPxShrinkage: 1,
  useFontMaxPxShrinkageBool: false,
  currentNominalFontSize: undefined,
  ////
  fontMaxPx: undefined,
  responseMaxOptions: 99,
});

export const imageFolders = {
  current: "", // string: folderName_fileName
  folders: new Map(), // Map<folderName, Map<fileName, {file: arrayBuffer, usedInCondition: ["1_1", "1_2", "1_3"..]}>>
};

export const imageConfig = Object.seal({
  targetSizeDeg: 0,
  targetDurationSec: 0,
  targetEccentricityXDeg: 0,
  targetEccentricityYDeg: 0,
  thresholdParameter: "",
  targetSizeIsHeightBool: false,
  targetImageFolder: "",
  targetImageReplacementBool: false,
  currentImageFileName: "",
  currentImageFile: undefined,
  delayAfterStimOnsetSec: 0,
  delayBeforeStimOnsetSec: 0,
  responseMaxOptions: 99,
  responsePositiveFeedbackBool: true,
  currentImageFullFileName: "",
  targetImageExclude: "none", // none, pastTargets, pastTargetsAndFoils
  targetImageFoilsExclude: "none", // none, pastTargets, pastTargetsAndFoils
});

export const pastImages = {
  targets: new Map(), // for each targetImageFolder, we keep track of all the targets that have been used
  foils: new Map(), // for each targetImageFolder, we keep track of all the foils that have been used
};

export const imageQuestionAndAnswer = Object.seal({
  current: {}, // "block_condition": [questions]
});

export const repeatedLettersConfig = Object.seal({
  targetRepeatsBorderCharacter: undefined,
  targetRepeatsMaxLines: undefined,
  stims: undefined,
  level: undefined,
  stimulusParameters: undefined,
});
export const repeatedLettersResponse = Object.seal({
  current: [],
  clickTime: [],
  rt: [],
  correct: [],
});

export const instructionFont = { current: undefined };

export const customInstructionText = { current: undefined };

export const tolerances = Object.seal({
  allowed: {
    thresholdAllowedDurationRatio: undefined,
    thresholdAllowedGazeXErrorDeg: undefined,
    thresholdAllowedGazeYErrorDeg: undefined,
    thresholdAllowedGazeRErrorDeg: undefined,
    thresholdAllowedLatenessSec: undefined,
  },
  measured: {
    thresholdDurationRatio: undefined,
    gazeMeasuredXDeg: undefined,
    gazeMeasuredYDeg: undefined,
    gazeMeasuredRDeg: undefined,
    gazeMeasuredRawDeg: [],
    gazeMeasurementLatencySec: undefined,
    targetMeasuredLatenessSec: undefined,
    targetMeasuredDurationSec: undefined,
    targetMeasuredDurationFrames: undefined,
    targetMeasuredPreRenderSec: undefined,
  },
});
/* --------------------------- Exp Current Status --------------------------- */

export const status = {
  block: 0, // Current block number, starting from 1. Corresponds to "block" scientist parameter; may occur out of order due to shuffling
  nthBlock: undefined, // Sequential count of block in this experiment run. Always sequential, regardless of shuffling. Used to indicate, eg this is the first block (ie even if block 3 was shuffled to go first)
  trial: undefined, // Current trial number, starting from 1
  block_condition: undefined,
  condition: undefined, // [Object] currently running condition
  ////
  trialCorrect_thisBlock: 0, // Correct trials in this block
  trialCompleted_thisBlock: 0, // Total completed trials in this block
  trialAttempted_thisBlock: 0, // Total attempted trials. If a trial is repeated, trialAttempted will increment but trialComplete will not. trialAttempted >= trialCompleted
  nthTrialByCondition: new DefaultMap(() => 1), // Which trial we're on, for each condition
  nthTrialAttemptedByCondition: new DefaultMap(() => 0),
  currentFunction: "", // Name of the threshold.js function that we are in at the moment, eg trialInstructionRoutineBegin
  retryThisTrialBool: false,
  consentGiven: undefined,
  questionsInCurrentCondition: undefined,
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
  targetRequestedTimestamp: undefined,
  blackoutDetectedBool: false,
  preRenderStartSec: undefined,
  preRenderEndSec: undefined,
  preRenderOpacifyStartSec: undefined,
  preRenderOpacifyEndSec: undefined,
});

export const letterHeapData = {
  heapUsedBeforeDrawingMB: undefined,
  heapTotalBeforeDrawingMB: undefined,
  heapLimitBeforeDrawingMB: undefined,
  heapUsedAfterDrawingMB: undefined,
  heapTotalAfterDrawingMB: undefined,
  heapLimitAfterDrawingMB: undefined,
  heapTotalPreLatenessMB: undefined,
  heapTotalPostLatenessMB: undefined,
};

export const viewingDistanceCm = { current: 40, desired: 40, max: 40 };

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
  onsetTime: [], // 0?
  clickTime: [],
  alreadyClickedCharacters: [],
};

export const phraseIdentificationResponse = Object.seal({
  current: [], // Responses
  correct: [], // Correctness of responses
  targetWord: [], // The correct responses, ie this.correct = this.current === this.targetWord
  categoriesResponded: [], // List of categories for which we already have a response
  onsetTime: undefined,
  onsetT: undefined,
  clickTime: [],
});

export const markingShowCursorBool = { current: true };

/* --------------------------------- Reading -------------------------------- */
export const readingCorpusArchive = {};
export const readingWordListArchive = {};
export const readingWordFrequencyArchive = {};
export const readingFrequencyToWordArchive = {};
export const readingCorpusFoilsArchive = new DefaultMap(() => []);
export const readingCorpusFoilsExclude = {
  current: undefined,
};
export const readingCorpusPastTargets = new Set();
export const readingCorpusPastFoils = new Set();

// Map corpus to DefaultMap<block_condition,string[]>
export const readingUsedText = {};
export const readingThisBlockPages = new DefaultMap(() => []); // string[]

export const readingPageIndex = { current: 0 };

export const readingQuestions = { current: undefined };
export const readingCurrentQuestionIndex = { current: 0 };

export const readingClickableAnswersSetup = { current: false };
export const readingClickableAnswersUpdate = { current: false };

export const readingConfig = {
  height: undefined,
  actualLinesPerPage: undefined,
};

export const readingTiming = Object.seal({ onsets: [] });
// Each record uses a map to store information by condition
export const readingPageStats = Object.seal({
  readingPageSkipCorpusWords: new DefaultMap(() => []),
  readingPageDurationSec: new DefaultMap(() => []),
  readingPageLines: new DefaultMap(() => []),
  readingPageWords: new DefaultMap(() => []),
  readingPageNonblankCharacters: new DefaultMap(() => []),
});
export const readingCorpusDepleted = new DefaultMap(() => false);
export const readingLineLengthUnit = new DefaultMap(() => "character");

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

export const targetTextStimConfig = {
  text: "",
  font: "Arial",
  units: "pix",
  pos: [0, 0],
  height: 1.0,
  wrapWidth: undefined,
  ori: 0.0,
  opacity: 1.0,
  depth: -7.0,
  alignVert: "center",
  alignHoriz: "center",
  isInstruction: false,
  medialForm: false,
};

/* -------------------------------------------------------------------------- */
/* ------------------------------- Sound ------------------------------------ */
/* -------------------------------------------------------------------------- */
export const deviceType = {
  isSmartphone: false,
  isLoudspeaker: true,
  isParticipant: false,
  profileFetchedFromLibrary: false,
  showSystemCorrection: true,
};
export const targetIsPresentBool = { current: undefined };
export const ProposedVolumeLevelFromQuest = {
  current: undefined,
  adjusted: undefined,
};
export const maskerVolumeDbSPL = { current: undefined };
export const soundGainDBSPL = { current: undefined };
export const invertedImpulseResponse = { current: undefined };
export const whiteNoiseLevel = { current: undefined };
export const maskerSoundFolder = { current: undefined };
export const targetSoundFolder = { current: undefined };
export const targetSoundList = { current: undefined };
export const targetSoundListFiles = {}; // BC:"name":file
export const targetSoundListMap = {}; // BC: name, list: [{left: "name", right: "name"}...]
export const targetSoundListTrialData = {
  left: undefined, // {name, file}
  right: undefined, // {name, file}
  targetVolume: undefined,
  whiteNoiseLevel: undefined,
  currentIndex: {}, // BC: index
  trialSound: undefined, // {names: ["name1", "name2"], file: stereoBuffer}
};

export const speechInNoiseTargetList = { current: undefined };
export const musicExpert = { current: undefined }; // TEMP
export const speechInNoiseShowClickable = { current: true };
export const vocoderPhraseSoundFiles = { current: undefined, loaded: false };
export const vocoderPhrases = {
  targetPhrase: undefined,
  maskerPhrase: undefined,
};
export const actualSamplingRate = { current: "" };
export const actualBitsPerSample = { current: "" };
export const microphoneActualSamplingRate = { current: "" };
export const vocoderPhraseCategories = { chosen: undefined, all: undefined };
export const vocoderPhraseShowClickable = { current: true };
export const vocoderPhraseCorrectResponse = { current: undefined };
export const soundCalibrationLevelDBSPL = { current: undefined };
export const soundCalibrationResults = { current: undefined };
export const qualityMetrics = {
  current: {
    mlsSD: undefined,
    correctionSD: undefined,
  },
};
export const sdOfRecordingOfFilteredMLS = { current: undefined };
export const currentFirestoreProfileDocumentID = {
  microphone: undefined,
  loudspeaker: undefined,
};
export const allHzCalibrationResults = {
  x_unconv: undefined,
  y_unconv: undefined,
  x_conv: undefined,
  y_conv: undefined,
  knownIr: undefined,
  x_background: undefined,
  y_background: undefined,
  system: {},
  component: {},
  background: {},
  mls_psd: {},
  microphoneGain: { Freq: [], Gain: [] },
  loudspeakerGain: { Freq: [], Gain: [] },
  filteredMLSRange: {
    system: { Min: null, Max: null },
    component: { Min: null, Max: null },
  },
  timestamps: "",
};
export const flags = {
  current: {
    autoGainControl: "",
    echoCancellation: "",
    noiseSuppression: "",
  },
};
export const calibrationRound = { current: 0 };
export const loudspeakerIR = { Freq: [], Gain: [] };
export const webAudioDeviceNames = {
  loudspeaker: "",
  microphone: "",
  loudspeakerText: "",
  microphoneText: "",
};
export const IDsToSaveInSoundProfileLibrary = {
  ProlificParticipantID: "",
  PavloviaSessionID: "",
};

export const parseJsonSaveTargets = (raw) => {
  const normalized = (raw || "").toLowerCase();
  const parts = normalized
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    wantsLocal: parts.includes("local"),
    wantsOnline: parts.includes("online"),
  };
};

export const calibrateSoundSamplingDesiredBits = { current: 16 };
//export const showSoundParametersBool = { current: true };
export const _calibrateSoundShowParametersBool = { current: true };
export const _calibrateSoundAllHzBool = { current: false };
//export const calibrateSoundSaveJSONBool = { current: false };
export const _calibrateSoundSaveJSON = { current: "" };
export const calibrateSoundSmoothOctaves = { current: 0.3333333 };
export const calibrateSoundSmoothMinBandwidthHz = { current: 200 };
export const calibrateSoundPowerBinDesiredSec = { current: 0.2 };
export const calibrateSoundPowerDbSDToleratedDb = { current: 1 };
export const calibrateSoundTaperSec = { current: 0.01 };
export const calibrateSoundBackgroundSecs = { current: 0 };
export const calibrateSoundBurstRepeats = { current: 4 };
export const calibrateSoundBurstSec = { current: 1 };
export const _calibrateSoundBurstPreSec = { current: 1 };
export const _calibrateSoundBurstPostSec = { current: 1 };
export const calibrateSoundBurstsWarmup = { current: 1 };
export const calibrateSoundHz = { current: 48000 };
export const calibrateSoundBurstRecordings = { current: 3 };
export const calibrateSoundBurstMLSVersions = { current: 4 };
export const _calibrateSound1000HzBool = { current: false };
export const _calibrateSound1000HzDB = { current: "-50, -40, -30, -20, -10" };
export const _calibrateSound1000HzSec = { current: 1 };
export const _calibrateSound1000HzPreSec = { current: 3.5 };
export const _calibrateSound1000HzPostSec = { current: 0.5 };
export const calibrateSoundIIRSec = { current: 0.2 };
export const calibrateSoundIIRPhase = { current: "linear" };
export const calibrateSoundIRSec = { current: 0.2 };
export const calibrateSoundBurstDb = { current: -18 };
export const calibrateSoundBurstFilteredExtraDb = { current: 6 };
export const calibrateSoundBurstScalarDB = { current: 71 };
export const calibrateSoundBurstLevelReTBool = { current: false };
export const calibrateSoundBurstDbIsRelativeBool = { current: false };
export const calibrateSoundBurstUses1000HzGainBool = { current: false };
export const calibrateSoundBurstNormalizeBy1000HzGainBool = { current: false };
export const _calibrateSound1000HzMaxSD_dB = { current: 4 };
export const _calibrateSound1000HzMaxTries = { current: 4 };
export const _calibrateSoundBurstMaxSD_dB = { current: 4 };
export const calibrateSoundBurstDownsample = { current: 1 };

export const timeoutSec = { current: 180 };
export const timeoutNewPhoneSec = { current: 15 };
export const timeoutSoundCalibrationSec = { current: 1000000 };
export const calibrateSoundCheck = { current: "speakerOrMic" };
//export const showSoundCalibrationResultsBool = { current: false };
export const _calibrateSoundShowResultsBool = { current: false };
//export const showSoundTestPageBool = { current: false };
export const _calibrateSoundShowTestPageBool = { current: false };
export const microphoneCalibrationResults = [];
export const microphoneCalibrationResult = { current: undefined };
export const _calibrateSoundMaxHz = { current: undefined };
export const _calibrateSoundMinHz = { current: undefined };
export const fMaxHz = {
  system: undefined,
  component: undefined,
};
export const calibrateSoundSimulateLoudspeaker = {
  type: "impulseResponse",
  frequencies: null,
  gains: null,
  amplitudes: null,
  fileName: undefined,
  time: null,
  enabled: false,
};
export const calibrateSoundSimulateMicrophone = {
  type: "impulseResponse",
  frequencies: null,
  gains: null,
  amplitudes: null,
  fileName: undefined,
  time: null,
  enabled: false,
};
export const attenuatorGainDB = {
  system: undefined,
  component: undefined,
};
export const soundGainTWR = { T: undefined, W: undefined, R: undefined };
export const debugBool = { current: false };
export const ICalibDBSPL = { current: undefined };
export const calibrateMicrophonesBool = { current: false };
export const rsvpReadingWordsForThisBlock = { current: undefined };
export const timeToCalibrate = {
  current: 1,
  timeAtTheStartOfCalibration: 0,
  timeAtTheEndOfCalibration: 0,
  calibrationDuration: 0,
};
export const calibrateSoundUMIKBase_dB = {
  current: -99.96,
  umik1: -75.11,
  umik2: -99.96,
};
export const calibrateSoundLimit = { current: 1 };
export const filteredMLSAttenuation = {
  component: 1,
  system: 1,
  maxAbsSystem: 1,
  maxAbsComponent: 1,
  attenuationDbSystem: 0,
  attenuationDbComponent: 0,
};
export const micsForSoundTestPage = { list: [] };
export const thisDevice = { current: undefined };
export const gotLoudspeakerMatch = { current: false };
export const loudspeakerInfo = { current: {} };
export const loudspeakerBrowserDetails = {
  current: { browser: undefined, browserVersion: undefined },
};
export const microphoneBrowserDetails = {
  current: { browser: undefined, browserVersion: undefined },
};
export const microphoneInfo = { current: {} };
export const calibrationTime = { current: undefined };
export const needPhoneSurvey = { current: false };
export const needComputerSurveyBool = { current: false };
export const authorEmail = { current: undefined };
export const rsvpReadingTargetSets = {
  numberOfSets: undefined,
  numberOfIdentifications: undefined,
  identificationTargetSets: undefined,
  current: undefined,
  upcoming: [],
  past: [],
  skippedDueToBadTracking: 0,
};

export const rsvpReadingResponse = {
  categories: undefined,
  identificationCategories: undefined,
  screen: undefined,
  displayStatus: false,
  responseType: undefined,
  responseTypeForCurrentBlock: [],
};

export const rsvpReadingTiming = {
  current: {
    startSec: undefined,
    finishSec: undefined,
    startMs: undefined,
    finishMs: undefined,
    drawnConfirmedTimestamp: undefined,
    undrawnConfirmedTimestamp: undefined,
    drawnConfirmedTimestampMs: undefined,
    undrawnConfirmedTimestampMs: undefined,
  },
  past: [],
};
export const dummyStim = { current: undefined };

// Global record of font size, to be reported in the case of an error
export const fontSize = { current: "Uninitiated" };

// export const speechRecognizer = {
//   recognition: undefined,
//   status: undefined,
//   responses: [],
// };

export const eyeTrackingStimulusRecords = [];

export const cursorTracking = {
  records: [],
  target: undefined, // TODO are there other places where we care about the current target stim?
};

export const measureLuminance = {
  records: [],
  movieStart: undefined,
  measureLuminanceDelaySec: 0,
  measurementShouldStartAt: undefined,
  movieValues: [],
  colorimeter: undefined,
  currentMovieValueIndex: 0,
  pretendBool: false,
  movieSec: 0,
};

/**
 * `State used when rerunning stimulus generation (ie trialInstructionRoutineBegin)
 *  ie when the participant has significantly changed their viewing distance.
 */
export const preStimulus = {
  interval: undefined,
  running: false,
};

export const keypad = {
  handler: undefined,
};

export const audioTargetsToSetSinkId = [];

// For each condition, store whether we are done practicing.
export const thresholdParacticeUntilCorrect = {
  doneWithPractice: new DefaultMap(() => false),
};
