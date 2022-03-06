/* ---------------------------- Remote Calibrator --------------------------- */
export const useRC = true;
// eslint-disable-next-line no-undef
export const rc = RemoteCalibrator; // Currently imported from HTML script tag
rc.init();

/* ---------------------------------- Grid ---------------------------------- */

export const grid = { current: undefined };

/* ------------------------------- Exp Configs ------------------------------ */
export const totalBlocks = { current: undefined };
export const totalTrialsThisBlock = { current: undefined };

export const targetKind = { current: undefined };

// Renders
export const fixationSize = { current: undefined };

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

export const viewingDistanceDesiredCm = { current: undefined };

/* --------------------------- Participant Status --------------------------- */

export const viewingDistanceCm = { current: undefined };

/* ------------------------------ Interactions ------------------------------ */

export const responseType = { current: 2, original: 2 };
export const clickedContinue = { current: false };
export const modalButtonTriggeredViaKeyboard = { current: false };

/* --------------------------------- Reading -------------------------------- */
export const readingCorpusArchive = {};
export const readingWordListArchive = {};
export const readingWordFrequencyArchive = {};

export const readingUsedText = {};
export const readingThisBlockPages = []; // string[]

export const readingQuestions = { current: undefined };
export const readingCurrentQuestionIndex = { current: 0 };

export const readingClickableAnswersSetup = { current: false };
export const readingClickableAnswersUpdate = { current: false };

export const readingHeight = { current: undefined };
