/**********************
 * EasyEyes Threshold *
 **********************/

// Load CSS asynchronously before any UI renders
const loadCSS = (href) => {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
};

// Load CSS files (production) and external SweetAlert2 CSS
const cssPromises = [];
if (!process.env.debug) {
  cssPromises.push(loadCSS("js/threshold.css"));
}
cssPromises.push(
  loadCSS(
    "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css",
  ),
);
await Promise.all(cssPromises);

import {
  reportStartOfNewBlock,
  arraysEqual,
  centerAt,
  colorRGBASnippetToRGBA,
  colorRGBSnippetToRGB,
  debug,
  fillNumberLength,
  getTripletCharacters,
  ifTrue,
  log,
  norm,
  saveDataOnWindowClose,
  sleep,
  getParamValueForBlockOrCondition,
  sendEmailForDebugging,
  setTargetEccentricityDeg,
  _testPxDegConversion,
  createTimingBars,
  drawTimingBars,
  cursorNearFixation,
  getUseWordDigitBool,
  Rectangle,
  rectFromPixiRect,
  runDiagnosisReport,
  readTargetTask,
} from "./components/utils.js";

import Swal from "sweetalert2";

import * as core from "./psychojs/src/core/index.js";
import * as data from "./psychojs/src/data/index.js";
import * as util from "./psychojs/src/util/index.js";
import * as visual from "./psychojs/src/visual/index.js";
import psychoJSPackage from "./psychojs/package.json";

const { PsychoJS } = core;
const { TrialHandler, MultiStairHandler } = data;
const { Scheduler } = util;

////
/* -------------------------------- External -------------------------------- */
import * as jsQUEST from "./components/addons/jsQUEST.module.js";
import Stats from "stats.js";
// import arrayBufferToAudioBuffer from "arraybuffer-to-audiobuffer";
////
/* ----------------------------------- CSS ---------------------------------- */
import "./psychojs/src/index.css";

import "./components/css/utils.css";
import "./components/css/custom.css";
import "./components/css/instructions.css";
import "./components/css/showCharacterSet.css";
import "./components/css/vocoderPhrase.css";
import "./components/css/soundCalibration.css";
import "./components/css/phraseIdentification.css";
import "./components/css/forms.css";
import "./components/css/popup.css";
import "./components/css/takeABreak.css";
import "./components/css/psychojsExtra.css";
import "./components/css/video.css";

////
/* -------------------------------------------------------------------------- */
/* --------------------------------- Global --------------------------------- */
/* -------------------------------------------------------------------------- */
import {
  rc,
  targetKind,
  readingCorpusArchive,
  readingWordListArchive,
  readingWordFrequencyArchive,
  readingFrequencyToWordArchive,
  readingThisBlockPages,
  readingQuestions,
  readingCurrentQuestionIndex,
  readingClickableAnswersSetup,
  readingClickableAnswersUpdate,
  readingConfig,
  status,
  totalTrialsThisBlock,
  totalBlocks,
  viewingDistanceCm,
  grid,
  clickedContinue,
  responseType,
  displayOptions,
  letterConfig,
  fixationConfig,
  instructionsConfig,
  instructionFont,
  readingPageIndex,
  showConditionNameConfig,
  fontCharacterSet,
  font,
  conditionNameConfig,
  targetSpecsConfig,
  trialCounterConfig,
  timing,
  letterTiming,
  stats,
  tolerances,
  showCharacterSetResponse,
  correctAns,
  readingTiming,
  targetIsPresentBool,
  ProposedVolumeLevelFromQuest,
  maskerVolumeDbSPL,
  soundGainDBSPL,
  invertedImpulseResponse,
  whiteNoiseLevel,
  targetSoundFolder,
  maskerSoundFolder,
  speechInNoiseTargetList,
  speechInNoiseShowClickable,
  usingGaze,
  targetTask,
  questionsThisBlock,
  thisExperimentInfo,
  vocoderPhrases,
  repeatedLettersConfig,
  vocoderPhraseCategories,
  vocoderPhraseShowClickable,
  vocoderPhraseCorrectResponse,
  rsvpReadingTargetSets,
  dummyStim,
  rsvpReadingResponse,
  phraseIdentificationResponse,
  repeatedLettersResponse,
  rsvpReadingWordsForThisBlock,
  soundCalibrationResults,
  soundGainTWR,
  debugBool,
  screenBackground,
  customInstructionText,
  targetTextStimConfig,
  fontSize,
  blockOrder,
  _key_resp_allKeys,
  allHzCalibrationResults,
  microphoneCalibrationResults,
  thisDevice,
  loudspeakerInfo,
  measureLuminance,
  uniComponentConfig,
  microphoneInfo,
  needPhoneSurvey,
  needComputerSurveyBool,
  gotLoudspeakerMatch,
  keypad,
  markingShowCursorBool,
  _key_resp_event_handlers,
  cursorTracking,
  targetEccentricityDeg,
  readingCorpusDepleted,
  measureMeters,
  showTimingBarsBool,
  audioTargetsToSetSinkId,
  thresholdParacticeUntilCorrect,
  letterHeapData,
  skipTrialOrBlock,
  loudspeakerBrowserDetails,
  imageConfig,
  targetSoundListTrialData,
  targetSoundListFiles,
} from "./components/global.js";

import {
  evaluateJSCode,
  generate_video,
} from "./components/imageAndVideoGeneration.js";

import {
  clock,
  getTinyHint,
  psychoJS,
  renderObj,
  initMouse,
} from "./components/globalPsychoJS.js";

////
/* ------------------------------- Components ------------------------------- */

import { ParamReader } from "./parameters/paramReader.js";

import {
  logger,
  loggerText,
  hideCursor,
  showCursor,
  sampleWithoutReplacement,
  toShowCursor,
  xyPxOfDeg,
  addConditionToData,
  addTrialStaircaseSummariesToData,
  addBlockStaircaseSummariesToData,
  addApparatusInfoToData,
  getViewingDistancedCm,
} from "./components/utils.js";
import {
  buildWindowErrorHandling,
  warning,
} from "./components/errorHandling.js";

import {
  formCalibrationList,
  ifAnyCheck,
  saveCalibratorData,
  saveCheckData,
  useCalibration,
  calibrateAudio,
} from "./components/useCalibration.js";

import {
  canClick,
  canType,
  clearPhraseIdentificationRegisters,
  getResponseType,
  keypadActive,
  resetResponseType,
} from "./components/response.js";

import {
  addFontGeometryToOutputData,
  cleanFontName,
  loadFonts,
  setFontGlobalState,
} from "./components/fonts.js";
import {
  collectFontVariations,
  generateFontInstances,
  getInstancedFontName,
} from "./components/variableFontInstances.js";
import {
  loadRecruitmentServiceConfig,
  recruitmentServiceData,
} from "./components/recruitmentService.js";

import {
  addBeepButton,
  addProceedButton,
  dynamicSetSize,
  getCustomInstructionText,
  getStimulusCustomInstructionPos,
  instructionsText,
  movePastFixation,
  removeBeepButton,
  removeProceedButton,
  updateInstructionFont,
  checkIfCursorIsTrackingFixation,
  addHandlerForClickingFixation,
  returnOrClickProceed,
  getInstructionTextMarginPx,
} from "./components/instructions.js";

import {
  getCorrectSynth,
  // getWrongSynth,
  getPurrSynth,
  getReadingSound,
} from "./components/sound.js";
import {
  removeClickableCharacterSet,
  setupClickableCharacterSet,
  toggleClickedCharacters,
  updateClickableCharacterSet,
} from "./components/showCharacterSet.js";

import {
  hideForm,
  showForm,
  showExperimentEnding,
} from "./components/forms.js";

// Display extra information for the TRIAL
import {
  isTimingOK,
  showConditionName,
  updateConditionNameConfig,
  updateTargetSpecs,
  updateTargetSpecsForImage,
  updateTargetSpecsForMovie,
  updateTargetSpecsForReading,
  updateTargetSpecsForRsvpReading,
  updateTargetSpecsForSound,
  updateTargetSpecsForSoundDetect,
  updateTargetSpecsForSoundIdentify,
} from "./components/showTrialInformation.js";
import {
  getTrialInfoStr,
  liveUpdateTrialCounter,
  incrementTrialsAttempted,
  incrementTrialsCompleted,
} from "./components/trialCounter.js";
////

import {
  _getCharacterSetBoundingBox,
  generateCharacterSetBoundingRects,
  restrictLevel,
} from "./components/bounding.js";

import { Grid } from "./components/grid.js";
import { SimulatedObserversHandler } from "./components/simulatedObserver.ts";

// import {
//   getCanvasContext,
//   getPixelRGBA,
//   initPixelsArray,
//   readPixels,
// } from "./components/canvasContext.js";

import { populateQuestDefaults } from "./components/questValues.js";

import { generateBoundingBoxPolies } from "./components/boundingBoxes.js";

import { recordStimulusPositionsForEyetracking } from "./components/eyeTrackingFacilitation.ts";

// READING
import { prepareReadingQuestions } from "./components/reading.ts";
import {
  getThisBlockPages,
  loadReadingCorpus,
  addReadingStatsToOutput,
  findReadingSize,
  reportWordCounts,
  Paragraph,
  resetReadingState,
  pxToPt,
} from "./components/readingAddons.js";

// POPUP
import {
  preparePopup,
  showPopup,
  showPopupProceed,
} from "./components/popup.js";
// Take a break
import {
  hideTrialBreakProgressBar,
  prepareTrialBreakProgressBar,
  showTrialBreakProgressBar,
} from "./components/takeABreak.js";

import { initializeEscHandlingDiv } from "./components/escapeHandling.js";
import { addPopupLogic } from "./components/popup.js";

import {
  doubleCheckSizeToSpacing,
  readAllowedTolerances,
} from "./components/errorMeasurement.js";

/* ---------------------------------- */
// * TRIAL ROUTINES

import {
  _identify_trialInstructionRoutineEnd,
  _letter_trialRoutineFirstFrame,
  _repeatedLetters_trialRoutineFirstFrame,
  _repeatedLetters_trialRoutineEachFrame,
  _letter_trialRoutineEnd,
  _rsvpReading_trialRoutineEnd,
} from "./components/trialRoutines.js";

/* ---------------------------------- */

import { switchKind, switchTask } from "./components/blockTargetKind.js";
import {
  addSkipTrialButton,
  handleEscapeKey,
  handleResponseSkipBlockForWhom,
  handleResponseTimeoutSec,
  removeSkipTrialButton,
  skipTrial,
} from "./components/skipTrialOrBlock.js";
import { replacePlaceholders } from "./components/multiLang.js";
import { getPavloviaProjectName, quitPsychoJS } from "./components/lifetime.js";
import {
  getToneInMelodyTrialData,
  initToneInMelodySoundFiles,
} from "./components/toneInMelody.js";
import {
  addTrialStaircaseSummariesToDataForSound,
  playAudioBuffer,
  playAudioBufferWithImpulseResponseCalibration,
  displayRightOrWrong,
  audioCtx,
  parseTargetSoundListFolders,
} from "./components/soundUtils.js";
import {
  getSpeechInNoiseTrialData,
  getTargetSoundListTrialData,
  initSpeechInNoiseSoundFiles,
} from "./components/speechInNoise.js";

import {
  checkSystemCompatibility,
  displayCompatibilityMessage,
  handleCantReadQR,
  handleCantReadQROnError,
  handleLanguage,
  hideCompatibilityMessage,
} from "./components/compatibilityCheck.js";
import {
  Fixation,
  getFixationPos,
  getFixationVertices,
  gyrateFixation,
  gyrateRandomMotionFixation,
  isCorrectlyTrackingDuringStimulusForRsvpReading,
  moveFixation,
  offsetStimsToFixationPos,
} from "./components/fixation.js";
import { VernierStim } from "./components/vernierStim.js";
import { checkCrossSessionId } from "./components/crossSession.js";
import { saveProlificInfo } from "./components/externalServices.ts";
import {
  getVocoderPhraseTrialData,
  initVocoderPhraseSoundFiles,
  vocoderPhraseRemoveClickableCategory,
  vocoderPhraseSetupClickableCategory,
} from "./components/vocoderPhrase.js";
import {
  readTrialLevelLetterParams,
  getTargetStim,
  logLetterParamsToFormspree,
  logHeapToFormspree,
} from "./components/letter.js";
import {
  readTrialLevelRepeatedLetterParams,
  generateRepeatedLettersStims,
  restrictRepeatedLettersSpacing,
  registerResponseForRepeatedLetters,
} from "./components/repeatedLetters.js";
import { KeyPress } from "./psychojs/src/core/index.js";
import {
  Category,
  constrainRSVPReadingSpeed,
  generateRSVPReadingTargetSets,
  getThisBlockRSVPReadingWords,
  registerKeypressForRSVPReading,
  _rsvpReading_trialRoutineEachFrame,
} from "./components/rsvpReading.js";
import {
  createProgressBar,
  hideProgressBar,
  showProgressBar,
  updateProgressBar,
  createExperimentProgressBar,
  updateExperimentProgressBar,
  destroyExperimentProgressBar,
} from "./components/progressBar.js";
import { logNotice, logQuest } from "./components/logging.js";
import { getBlockOrder, getBlocksTrialList } from "./components/shuffle.ts";
import {
  KeypadHandler,
  keypadRequiredInExperiment,
  needKeypadThisCondition,
} from "./components/keypad.js";
import {
  useMatlab,
  waitForSignal,
  sendMessage,
} from "./components/connectMatlab.js";
import { readi18nPhrases, useWordDigitBool } from "./components/readPhrases.js";
import { updateColor } from "./components/color.js";
import {
  getDelayBeforeMoviePlays,
  getLuminanceFilename,
  addMeasureLuminanceIntervals,
  initColorCAL,
} from "./components/photometry.js";
import {
  defineTargetForCursorTracking,
  trackCursor,
  updateTrackCursorHz,
} from "./components/cursorTracking.ts";
import { viewingDistanceOutOfBounds } from "./components/rerunPrestimulus.js";
import { getDotAndBackGrid, getFlies } from "./components/dotAndGrid.ts";
import {
  createTransparentImage,
  showImageBegin,
  showImageEachFrame,
  showImageEnd,
} from "./components/showImage.js";
import {
  parseViewMonitorsXYDeg,
  XYPxOfDeg,
} from "./components/multiple-displays/utils.ts";
import { startMultipleDisplayRoutine } from "./components/multiple-displays/multipleDisplay.tsx";
import { Screens } from "./components/multiple-displays/globals.ts";
import { showAudioOutputSelectPopup } from "./components/soundOutput.ts";
import { styleNodeAndChildrenRecursively } from "./components/misc.ts";
import {
  checkForBlackout,
  clearBoundingBoxCanvas,
  ctx,
  generateCharacterSetBoundingRects_New,
  restrictLevelAfterFixation,
  restrictLevelBeforeFixation,
} from "./components/boundingNew.js";
import {
  okayToRetryThisTrial,
  isConditionFinished,
} from "./components/retryTrials.ts";
import { GLOSSARY } from "./parameters/glossary.ts";
import {
  ConnectionManager,
  ConnectionManagerDisplay,
  getConnectionManagerDisplay,
  handleLanguageChangeForConnectionManagerDisplay,
  initializeAndRegisterSubmodules,
} from "./components/connectAPeer.js";
import { getStimulus } from "./components/stimulusGeneration.ts";
import {
  onStimulusGeneratedVernier,
  onStimulusGeneratedLetter,
  onStimulusGeneratedRepeatedLetters,
  onStimulusGeneratedRsvpReading,
} from "./components/onStimulusGenerated.ts";
import { onStimulusGenerationFailed } from "./components/onStimulusGenerationFailed.ts";
import {
  getImageStim,
  getImageTrialData,
  parseImageFolders,
  parseImageQuestionAndAnswer,
  questionAndAnswerForImage,
  readTrialLevelImageParams,
} from "./components/image.js";
import {
  getNumberOfQuestionsInThisCondition,
  isQuestionAndAnswerBlock,
  isQuestionAndAnswerCondition,
} from "./components/questionAndAnswer.ts";
import { capturedVideoFrameListener } from "./components/save-snapshots/capturedVideoFrameListener";
/* -------------------------------------------------------------------------- */
const setCurrentFn = (fnName) => {
  status.currentFunction = fnName;
  logNotice(`In ${fnName}.`);
};

var videoblob = [];
var video_generated = false;
var actualStimulusLevel;
const video = document.createElement("video");
video.style.position = "absolute";
video.style.zIndex = 20000;
const source = document.createElement("source");
const loader = document.createElement("loader");
const loaderText = document.createElement("p");
let video_flag = 1;

window.jsQUEST = jsQUEST;

const fontsRequired = {};
export var simulatedObservers;
/* -------------------------------------------------------------------------- */

const parseWindowURL = () => {
  //check if the URL has a query string: participant, session, study_id, redirectToDaisyChainBefore
  const urlSearchParams = new URLSearchParams(window.location.search);
  const participant = urlSearchParams.get("participant");
  const session = urlSearchParams.get("session");
  const study_id = urlSearchParams.get("study_id");
  const completedDaisyChainBefore = urlSearchParams.get(
    "completedDaisyChainBefore",
  );

  return { participant, session, study_id, completedDaisyChainBefore };
};

//_daisyChainURLBefore
const daisyChainURLBefore = (url) => {
  if (!url) return;
  const { participant, session, study_id, completedDaisyChainBefore } =
    parseWindowURL();
  if (completedDaisyChainBefore) return;

  const newURL = `${url}?external_id=${participant}&participant=${participant}&session=${session}&study_id=${study_id}&completedDaisyChainBefore=${true}`;
  window.location = newURL;
};

const updateCSSAfterContentOfRoot = (newContent) => {
  // Create a style element
  const style = document.createElement("style");
  document.head.appendChild(style);

  // Add a rule for the #root::after with the new content
  style.sheet.insertRule(
    `
    #root::after {
      content: "${newContent}";
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    }
  `,
    style.sheet.cssRules.length,
  );
};

const paramReaderInitialized = async (reader) => {
  const _daisyChainURLBefore = reader.read("_daisyChainURLBefore")[0];
  daisyChainURLBefore(_daisyChainURLBefore);

  // if rc is not defined, reload the page
  if (!rc || !rc.checkInitialized() || !rc.language || !rc.language.value) {
    // Automatically reload the page without any prompts
    window.location.reload();
  }

  handleLanguage(reader.read("_language")[0], rc, true);
  // Removed to unify loading experience - spinner continues until requirements page
  // updateCSSAfterContentOfRoot(
  //   readi18nPhrases("EE_Initializing", rc.language.value),
  // );

  // Fails gracefully if not actually prolific experiment, so run always
  saveProlificInfo(thisExperimentInfo);

  setCurrentFn("paramReaderInitialized");
  // ! avoid opening windows twice
  if (typeof psychoJS._window !== "undefined") return;
  useMatlab.current = reader.read("_trackGazeExternallyBool")[0];
  // get debug mode from reader
  debugBool.current = reader.read("_debugBool")[0];

  buildWindowErrorHandling(reader);

  if (reader.read("_participantIDGetBool")[0]) {
    const gotParticipantId = (participant, session = null, storedId) => {
      if (participant) {
        thisExperimentInfo.participant = participant;
        if (storedId !== undefined && participant === storedId) {
          thisExperimentInfo.setSession(
            session && isNaN(Number(session)) ? session : Number(session) + 1,
          );
        } else {
          thisExperimentInfo.setSession(1);
        }

        thisExperimentInfo.EasyEyesID = participant;
        thisExperimentInfo.PavloviaSessionID = participant;
      }
    };

    const result = await checkCrossSessionId(
      gotParticipantId,
      rc.language.value,
      reader,
    );
    if (!result) {
      showExperimentEnding();
      return;
    }
  } else {
    thisExperimentInfo.participant = rc.id.value;
    thisExperimentInfo.setSession(1);
    thisExperimentInfo.EasyEyesID = rc.id.value;
    thisExperimentInfo.PavloviaSessionID = rc.id.value;
  }
  const segments = window.location.href.split("/");
  // log participant to debug discrepancies in Pavlovia and Prolific data
  if (reader.read("_logParticipantsBool")[0]) {
    const DataToLog = {
      ExperimentName: segments[segments.length - 2],
      deviceType: rc.deviceType.value,
      OS: rc.systemFamily.value === "Mac" ? "macOS" : rc.systemFamily.value,
      browser: rc.browser.value,
      browserVersion: rc.browserVersion.value,
      prolificSession: thisExperimentInfo.ProlificSessionID,
      prolificParticipantID: thisExperimentInfo.ProlificParticipantID,
      pavloviaID: thisExperimentInfo.PavloviaSessionID,
      date: util.MonotonicClock.getDateStr(),
      UTC: util.MonotonicClock.getTimeZone(),
    };

    await sendEmailForDebugging(DataToLog);
  }

  // prepareForReading(reader);

  // ! Load fonts
  await loadFonts(reader, fontsRequired);

  // ! Generate static font instances for variable fonts
  try {
    const variations = collectFontVariations(reader);
    if (variations.length > 0) {
      loggerText(`Generating ${variations.length} static font instance(s)...`);
      await generateFontInstances(variations);
      loggerText("Font instance generation complete");
    }
  } catch (error) {
    console.error("Error generating font instances:", error);
    // Continue even if font instancing fails
  }

  // ! Load recruitment service config
  await loadRecruitmentServiceConfig();

  // Keep track of a simulated observer for each condition
  simulatedObservers = new SimulatedObserversHandler(reader, psychoJS);

  // ! Load reading corpus and preprocess
  await loadReadingCorpus(reader);
  logger("READ readingCorpusArchive", readingCorpusArchive);
  logger("READ readingWordListArchive", readingWordListArchive);
  logger("READ readingWordFrequencyArchive", readingWordFrequencyArchive);
  logger("READ readingFrequencyToWordArchive", readingFrequencyToWordArchive);

  // stats.js
  if (ifTrue(reader.read("showFPSBool", "__ALL_BLOCKS__"))) {
    stats.current = new Stats();
    stats.current.showPanel(0);
    document.body.appendChild(stats.current.dom);
    stats.current.dom.style.display = "none";
    stats.on = false;
  }

  ////
  const startExperiment = async () => {
    // // ! clean RC dom
    // if (document.querySelector("#rc-panel-holder"))
    //   document.querySelector("#rc-panel-holder").remove();

    // rc.pauseNudger();
    // // Get fullscreen
    // if (!rc.isFullscreen.value && !debug) {
    //   rc.getFullscreen();
    //   await sleep(1000);
    // }

    // ! Start actual experiment
    experiment(reader.blockCount);
  };
  ////
  await startExperiment();

  // to remove initialized message
  var rootElement = document.getElementById("root");
  rootElement.classList.add("initialized");
};

export const paramReader = new ParamReader("conditions", (reader) => {
  paramReaderInitialized(reader);
});

/* -------------------------------------------------------------------------- */

var conditionName;
var targetSpecs; // TextStim object

var trialCounter; // TextSim object

var showImage; // ImageStim object

var targetImage;

// Maps 'block_condition' -> bounding rectangle around (appropriate) characterSet
// In typographic condition, the bounds are around a triplet
export var characterSetBoundingRects = {};

const experiment = (howManyBlocksAreThereInTotal) => {
  setCurrentFn("experiment");

  const uniqueBlocks = new Set(
    paramReader.conditions.map((condition) => Number(condition.block)),
  );
  // Store count for progress bar (it only needs the length)
  window.experimentProgressInfo = Array(uniqueBlocks.size);

  //variables
  var readingParagraph;
  var updateReadingParagraphForQuestionAndAnswer = true;

  var key_resp;
  // var keypad;
  var fixation; ////
  var vernier;
  var flanker1, flanker2, flanker3, flanker4;
  var target;
  var showCharacterSet;

  var routineTimer, routineClock;
  var initInstructionClock,
    eduInstructionClock,
    trialInstructionClock,
    blockScheduleFinalClock;

  var dot, backGrid, flies;
  ////
  // Resources

  /* -------------------------------------------------------------------------- */

  // ! POPUPS for take a break & proportion correct
  preparePopup(rc.language.value, thisExperimentInfo.name); // Try to use only one popup ele for both (or even more) popup features
  prepareTrialBreakProgressBar();

  /* -------------------------------------------------------------------------- */
  initializeEscHandlingDiv();
  const _resources = [];
  blockOrder.current = getBlockOrder(paramReader);
  for (const i of blockOrder.current) {
    _resources.push({
      name: `conditions/block_${i}.csv`,
      path: `conditions/block_${i}.csv`,
    });
  }

  thisExperimentInfo.experimentFilename = paramReader.read(
    "!experimentFilename",
  )[0];

  logger("fontsRequired", fontsRequired);
  for (let i in fontsRequired) {
    logger(i, fontsRequired[i]);
    let fontSplit = fontsRequired[i].split(".");
    let fontSplit1 = fontSplit[0].split("/");
    fontSplit1.push(fontSplit[1]);
    let fontName = fontSplit1[1] + "." + fontSplit1[2];
    _resources.push({ name: fontName, path: fontsRequired[i] });
  }

  /* ---------------------------------- Sound --------------------------------- */
  const correctSynth = getCorrectSynth(psychoJS);
  // const wrongSynth = getWrongSynth(psychoJS);
  const purrSynth = getPurrSynth(psychoJS);
  const readingSound = getReadingSound();
  audioTargetsToSetSinkId.push(correctSynth.getNativeContext());
  audioTargetsToSetSinkId.push(readingSound);
  audioTargetsToSetSinkId.push(audioCtx);

  // initial background color
  screenBackground.colorRGBA = colorRGBASnippetToRGBA(
    paramReader.read("screenColorRGBA", "__ALL_BLOCKS__")[0],
  );

  // open window:
  psychoJS.openWindow({
    fullscr: !debug,
    color: new util.Color(
      colorRGBSnippetToRGB(screenBackground.defaultColorRGBA),
    ), // background color
    units: "height",
    waitBlanking: true,
  });

  initMouse();

  // schedule the experiment:

  // Controls the big picture flow of the experiment
  const flowScheduler = new Scheduler(psychoJS);
  psychoJS.schedule(flowScheduler);

  // flowScheduler gets run if the participants presses OK
  flowScheduler.add(displayNeedsPage);
  flowScheduler.add(startSoundCalibration);
  // flowScheduler.add(updateInfo); // add timeStamp // moved this function to displayNeedsPage
  flowScheduler.add(experimentInit);

  flowScheduler.add(fileRoutineBegin());
  flowScheduler.add(fileRoutineEachFrame());
  flowScheduler.add(fileRoutineEnd());
  const blocksLoopScheduler = new Scheduler(psychoJS);

  // Loop though the blocks during the experiment
  flowScheduler.add(blocksLoopBegin(blocksLoopScheduler));
  flowScheduler.add(blocksLoopScheduler);
  flowScheduler.add(blocksLoopEnd);

  // flowScheduler.add(debriefRoutineBegin());
  // flowScheduler.add(debriefRoutineEachFrame());
  // flowScheduler.add(debriefRoutineEnd());

  flowScheduler.add(quitPsychoJS, "", true, paramReader);

  logger("_resources", _resources);

  // ! START EXPERIMENT
  psychoJS
    .start({
      expName: thisExperimentInfo.name,
      expInfo: thisExperimentInfo,
      resources: [
        {
          name: "conditions/blockCount.csv",
          path: "conditions/blockCount.csv",
        },
        ..._resources,
      ],
    })
    .then(() => {
      document.body.classList.add("hide-ui-dialog");
      const _ = setInterval(async () => {
        if (psychoJS.gui._allResourcesDownloaded) {
          clearInterval(_);
          loggerText("all resources loaded");

          if (window.removeLoadingScreen) {
            window.removeLoadingScreen();
          } else {
            // Defensive fallback if first.js not loaded
            console.warn(
              "removeLoadingScreen not available, using event fallback",
            );
            window.dispatchEvent(new CustomEvent("threshold-ready-for-ui"));
          }

          // Then allow scheduler to proceed to displayNeedsPage
          if (psychoJS.gui.dialogComponent) {
            psychoJS.gui.dialogComponent.button = "OK";
            psychoJS.gui.dialogComponent.status = PsychoJS.Status.FINISHED;
          }
          if (psychoJS.gui._removeWelcomeDialogBox) {
            psychoJS.gui._removeWelcomeDialogBox();
          }
          if (psychoJS.gui.closeDialog) {
            psychoJS.gui.closeDialog();
          }
          if (psychoJS.window.adjustScreenSize) {
            psychoJS.window.adjustScreenSize();
          }
          psychoJS.eventManager.clearEvents();

          document.body.classList.remove("hide-ui-dialog");
        }
      }, 300);
    });
  // Get canvas
  // const [canvas, canvasContext] = getCanvasContext();
  // initPixelsArray(canvasContext);

  // // Demo read pixels
  // readPixels(canvasContext);
  // console.log(getPixelRGBA(10, 20, canvasContext));
  ////

  psychoJS.experimentLogger.setLevel(core.Logger.ServerLevel.EXP);
  // document.getElementById("root").style.setProperty("--after-content", "Initializing ...");
  //get and print out --after-content property of root element
  // console.log("root", document.getElementById("root").style.getPropertyValue("--after-content"));
  async function startSoundCalibration() {
    if (!(await calibrateAudio(paramReader))) {
      quitPsychoJS("", "", paramReader);
    } else {
      // add sound calibration results
      if (soundCalibrationResults.current) {
        psychoJS.experiment.addData(
          "Cal1000HzInDb",
          soundCalibrationResults.current.inDBValues,
        );
        // psychoJS.experiment.addData(
        //   "All Hz out (dB SPL)",
        //   soundCalibrationResults.current.outDBSPLValues
        // );
        psychoJS.experiment.addData(
          "Cal1000HzOutDb",
          soundCalibrationResults.current.outDBSPL1000Values,
        );
        psychoJS.experiment.addData(
          "SoundGainParameters",
          JSON.stringify(soundCalibrationResults.current.parameters),
        );
        psychoJS.experiment.addData(
          "THD",
          soundCalibrationResults.current.thdValues,
        );
      }
      if (allHzCalibrationResults.x_conv) {
        psychoJS.experiment.addData(
          "MlsSpectrumHz",
          allHzCalibrationResults.y_conv,
        );
        psychoJS.experiment.addData(
          "MlsSpectrumFilteredDb",
          allHzCalibrationResults.x_conv,
        );
        psychoJS.experiment.addData(
          "MlsSpectrumUnfilteredHz",
          allHzCalibrationResults.y_unconv,
        ); // x and y are swapped
        psychoJS.experiment.addData(
          "MlsSpectrumUnfilteredDb",
          allHzCalibrationResults.x_unconv,
        ); // x and y are swapped
        psychoJS.experiment.addData(
          "Loudspeaker IR",
          allHzCalibrationResults.knownIr,
        );
        psychoJS.experiment.addData(
          "Loudspeaker IIR",
          invertedImpulseResponse.current,
        );
        psychoJS.experiment.addData(
          "Loudspeaker model",
          JSON.stringify(loudspeakerInfo.current),
        );
      }
      if (microphoneCalibrationResults.length > 0) {
        psychoJS.experiment.addData(
          "Microphone calibration results",
          JSON.stringify(microphoneCalibrationResults),
        );
      }
    }

    //if keypad in use, start it
    if (keypadRequiredInExperiment(paramReader) && keypad.handler) {
      await keypad.handler.initKeypad();
    }
    return Scheduler.Event.NEXT;
  }

  async function displayNeedsPage() {
    runDiagnosisReport();
    await initializeAndRegisterSubmodules();
    needPhoneSurvey.current = paramReader.read("_needSmartphoneSurveyBool")[0];
    needComputerSurveyBool.current = paramReader.read(
      "_needComputerSurveyBool",
    )[0];
    await updateInfo(needPhoneSurvey.current);
    // saveDataOnWindowClose(psychoJS.experiment);
    // ! check system compatibility
    const compMsg = await checkSystemCompatibility(
      paramReader,
      paramReader.read("_language")[0],
      rc,
      true,
      psychoJS,
      measureMeters,
      paramReader.read("_needBrowserActualName")[0],
    );
    let needAnySmartphone = false;
    let needCalibratedSmartphoneMicrophone = false;
    // TODO: add logic for needAnySmartphone

    const calibrateMicrophonesBool = paramReader.read(
      "_calibrateMicrophonesBool",
    )[0];
    // const calibrateMicrophonesBool = false;
    const needCalibratedSound = paramReader
      .read("_needCalibratedSound")[0]
      .split(",");
    // const needCalibratedSound = ['microphone', 'loudspeaker']
    const calibrateSound1000Hz = paramReader.read(
      "_calibrateSound1000HzBool",
    )[0];
    const calibrateSoundAllHz = paramReader.read("_calibrateSoundAllHzBool")[0];

    // if (
    //   calibrateMicrophonesBool === false &&
    //   (calibrateSound1000Hz === true ||
    //     calibrateSoundAllHz === true ||
    //     needPhoneSurvey.current === true)
    // ) {
    //   needCalibratedSmartphoneMicrophone = true;
    // }

    let compatibilityCheckPeer = null;
    if (needPhoneSurvey.current || needAnySmartphone) {
      const params = {
        text: readi18nPhrases("RC_smartphoneOkThanks", rc.language.value),
        onError: (error) => {
          Swal.fire({
            allowOutsideClick: false,
            // title: "Error",
            text: readi18nPhrases("RC_cantDrawQR", rc.language.value),
            icon: "error",
            confirmButtonText: readi18nPhrases(
              "RC_cantConnectPhone_Button",
              rc.language.value,
            ),
          }).then(async (result) => {
            if (result.isConfirmed) {
              const { mic, loudspeaker } = await handleCantReadQROnError(
                rc,
                psychoJS,
                needPhoneSurvey.current,
                needCalibratedSound,
                needComputerSurveyBool.current,
              );
              //quit PSYCHOJS
              // if _needSmartphoneSurveyBool add survey data
              if (needPhoneSurvey.current) {
                // add microphoneInfo.current.phoneSurvey
                psychoJS.experiment.addData(
                  "Microphone survey",
                  JSON.stringify(mic.phoneSurvey),
                );
                psychoJS.experiment.nextEntry();
              }
              if (needComputerSurveyBool.current) {
                psychoJS.experiment.addData(
                  "Loudspeaker survey",
                  JSON.stringify(loudspeaker),
                );
                psychoJS.experiment.nextEntry();
              }
              showExperimentEnding();
              quitPsychoJS("", true, paramReader);
            }
          });
        },
      };
      compatibilityCheckPeer = new EasyEyesPeer.ExperimentPeer(params);
      await compatibilityCheckPeer.init();
    }
    const {
      proceedButtonClicked,
      proceedBool,
      mic,
      loudspeaker,
      gotLoudspeakerMatchBool,
    } = await displayCompatibilityMessage(
      compMsg["msg"],
      paramReader,
      rc,
      compMsg["promptRefresh"],
      compMsg["proceed"],
      compatibilityCheckPeer,
      needAnySmartphone,
      needCalibratedSmartphoneMicrophone,
      needComputerSurveyBool.current,
      needCalibratedSound,
      psychoJS,
      quitPsychoJS,
      keypad,
      KeypadHandler,
      _key_resp_event_handlers,
      _key_resp_allKeys,
      ConnectionManager.handler,
      ConnectionManagerDisplay,
      getConnectionManagerDisplay,
      handleLanguageChangeForConnectionManagerDisplay,
      keypadRequiredInExperiment,
    );

    // Debug: Display the value of _calibrateMicrophonesBool

    gotLoudspeakerMatch.current = gotLoudspeakerMatchBool;
    microphoneInfo.current.micFullName = mic.micFullName;
    microphoneInfo.current.micFullSerialNumber = mic.micFullSerialNumber;
    microphoneInfo.current.micrFullManufacturerName =
      mic.micrFullManufacturerName;
    microphoneInfo.current.phoneSurvey = mic.phoneSurvey;
    if (needComputerSurveyBool.current)
      loudspeakerInfo.current.loudspeakerSurvey = loudspeaker;
    else loudspeakerInfo.current = loudspeaker;

    // if _needSmartphoneSurveyBool add survey data
    if (needPhoneSurvey.current) {
      // add microphoneInfo.current.phoneSurvey
      psychoJS.experiment.addData(
        "Microphone survey",
        JSON.stringify(microphoneInfo.current.phoneSurvey),
      );
      psychoJS.experiment.nextEntry();
    }
    if (needComputerSurveyBool.current) {
      psychoJS.experiment.addData(
        "Loudspeaker survey",
        JSON.stringify(loudspeakerInfo.current.loudspeakerSurvey),
      );
      psychoJS.experiment.nextEntry();
    }

    hideCompatibilityMessage();
    if (proceedButtonClicked && !proceedBool) {
      showExperimentEnding();
      quitPsychoJS("", false, paramReader, true, false);
      recruitmentServiceData?.incompatibleCode
        ? window.open(
            "https://app.prolific.com/submissions/complete?cc=" +
              recruitmentServiceData?.incompatibleCode,
          )
        : null;
      return;
    }

    // show forms before actual experiment begins
    const continueExperiment = await showForm(
      paramReader.read("_consentForm")[0],
      true, // Show payment info for consent form
    );
    hideForm();

    if (!continueExperiment) {
      status.consentGiven = false;
      psychoJS.experiment.addData("consentGiven", "FALSE");
      hideForm();
      quitPsychoJS("", "", paramReader); // quitPsychoJS contains a call to showForm for debrief form
      return;
    } else {
      if (paramReader.read("_consentForm")[0]) {
        status.consentGiven = true;
        psychoJS.experiment.addData("consentGiven", "TRUE");
      }
    }

    // Show alert before proceeding to experiment
    const fontLeftToRightBool = paramReader.read("fontLeftToRightBool")[0];
    const saveSnapshotsBool = paramReader.read("_saveSnapshotsBool")[0];
    if (saveSnapshotsBool) {
      capturedVideoFrameListener();
    }
    const languageDirection = readi18nPhrases(
      "EE_languageDirection",
      rc.language.value,
    );
    const chooseScreenTextJust = readi18nPhrases(
      "RC_ChooseScreenJust",
      rc.language.value,
    );
    const cameraPrivacyText = readi18nPhrases(
      "RC_CameraPrivacyAssurance",
      rc.language.value,
    );

    // Simple popup div
    const chooseScreenPopup = () => {
      return new Promise((resolve) => {
        const conditionalCameraPrivacyContainer = saveSnapshotsBool
          ? ""
          : `<div style="font-size: ${16 / 1.4}px; direction: ${
              (!fontLeftToRightBool && languageDirection === "RTL") ||
              languageDirection === "RTL"
                ? "rtl"
                : "ltr"
            }; margin-left: 30px; line-height: 1.4; white-space: pre-line; max-width: 500px; text-align: ${
              (!fontLeftToRightBool && languageDirection === "RTL") ||
              languageDirection === "RTL"
                ? "right"
                : "left"
            };">${cameraPrivacyText}</div>`;

        const popupHTML = `
          <div id="simple-popup" style="
            position: fixed;
                top: 0;
                left: 0;
            width: 100vw;
            height: 100vh;
            background: white;
                z-index: 1000000;
                display: flex;
                flex-direction: column;
              ">
                <div style="
                  position: sticky;
                  top: 0;
                  background: white;
                  padding: clamp(20px, 4vh, 40px) 0;
                  z-index: 1000001;
                  width: 100%;
                ">
                  <div class="popup-title centered-title" style="
                    font-size: clamp(28px, 6vw, 36px); 
                    direction: ${
                      (!fontLeftToRightBool && languageDirection === "RTL") ||
                      languageDirection === "RTL"
                        ? "rtl"
                        : "ltr"
                    };
                  ">
                    ${readi18nPhrases(
                      "RC_ChooseScreenTitle",
                      rc.language.value,
                    )}
                  </div>
                </div>
                <div style="
                  flex: 1;
                  overflow-y: auto;
                  padding: clamp(20px, 5vw, 40px);
            display: flex;
            flex-direction: column;
            align-items: center;
                  justify-content: flex-start;
                  min-height: 0;
                ">
                  <div style="
                    font-size: clamp(48px, 10vw, 72px); 
                    font-weight: bold; 
                    line-height: 1; 
                    text-align: center; 
                    margin-bottom: 30px;
                  ">
              ${readi18nPhrases("RC_CameraUpIcons", rc.language.value)}
            </div>
                  <div style="font-size: 16px; direction: ${
                    (!fontLeftToRightBool && languageDirection === "RTL") ||
                    languageDirection === "RTL"
                      ? "rtl"
                      : "ltr"
                  }; margin-bottom: 20px; line-height: 1.4; white-space: pre-line; max-width: 500px; text-align: ${
                    (!fontLeftToRightBool && languageDirection === "RTL") ||
                    languageDirection === "RTL"
                      ? "right"
                      : "left"
                  };">
              ${chooseScreenTextJust}
            </div>
                 ${conditionalCameraPrivacyContainer}
                  <button id="simple-popup-proceed-button" class="btn btn-success"" style="
                    position: static;
                    margin-top: 20px;
            " tabindex="0">
              ${readi18nPhrases("T_proceed", rc.language.value)}
            </button>
                </div>
          </div>
        `;

        document.body.insertAdjacentHTML("beforeend", popupHTML);

        // Focus the button so it can receive keyboard input
        const popupButton = document.getElementById(
          "simple-popup-proceed-button",
        );
        let alreadyHandled = false;
        const handleProceed = (event) => {
          if (alreadyHandled) return;
          alreadyHandled = true;
          event.preventDefault();
          document.getElementById("simple-popup").remove();
          popupButton.removeEventListener("click", handleProceed, true);
          document.removeEventListener("keydown", handleProceed, true);
          resolve(true);
        };
        // Add click event listener with capture phase to ensure it runs first
        popupButton.addEventListener("click", handleProceed, true);
        //return key handeler
        document.addEventListener(
          "keydown",
          (event) => {
            if (event.key === "Enter") {
              handleProceed(event);
            }
          },
          true,
        );
      });
    };

    await chooseScreenPopup();
    if (calibrateMicrophonesBool && proceedBool) {
      // Email verification for microphone calibration authorship
      const authors = paramReader.read("_authors")[0];
      const authorAffiliations = paramReader.read("_authorAffiliations")[0];
      const authorEmails = paramReader.read("_authorEmails")[0];

      // Generate random 6-digit verification code (for demo purposes)
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();

      // Get experiment name from URL path or use default
      const experimentName = getPavloviaProjectName() || "EasyEyes Experiment";

      // Read RC_ phrases for email verification with fallbacks
      const emailSubjectTemplate =
        readi18nPhrases("RC_VerificationEmailSubject", rc.language.value) ||
        "EEE — Verify authorship for microphone calibration";
      const emailMessageTemplate =
        readi18nPhrases("RC_VerificationEmail", rc.language.value) ||
        "To calibrate microphones, please copy and paste the following code into the EEE web page:\n123456";
      const enterCodePrompt =
        readi18nPhrases("RC_VerificationEnterCode", rc.language.value) ||
        "REQUIRED. To verify authorship please enter the 6-digit code sent by email to AAA.";

      console.log(
        `Demo: Email would be sent to ${authorEmails} with code: ${verificationCode}`,
      );
      console.log(`Subject template: ${emailSubjectTemplate}`);
      console.log(`Message template: ${emailMessageTemplate}`);

      // Send verification email via Netlify function
      try {
        const emailResponse = await fetch(
          "https://easyeyes.app/.netlify/functions/email-verification/send",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              authorEmails: authorEmails,
              verificationCode: verificationCode,
              experimentName: experimentName,
              emailSubjectTemplate: emailSubjectTemplate,
              emailMessageTemplate: emailMessageTemplate,
              language: rc.language.value,
            }),
          },
        );

        if (!emailResponse.ok) {
          throw new Error(
            `Failed to send verification email: ${emailResponse.status}`,
          );
        }

        const emailResult = await emailResponse.json();
        console.log("Email sent successfully:", emailResult);
      } catch (error) {
        console.error("Email sending error:", error);
        await Swal.fire({
          title: "Email Error",
          text: "Failed to send verification email. Please check your internet connection and try again.",
          icon: "error",
          confirmButtonText: "Proceed",
        });
        showExperimentEnding();
        quitPsychoJS("Email sending failed", false, paramReader, true, false);
        return;
      }

      // email verification with retry logic (maximum 4 attempts)
      let verificationAttempts = 0;
      const maxAttempts = 4;
      let verificationSuccess = false;

      while (verificationAttempts < maxAttempts && !verificationSuccess) {
        verificationAttempts++;

        // show email verification SweetAlert2 popup with auto-verification
        const verificationResult = await new Promise((resolve) => {
          Swal.fire({
            title: `Email Verification Required${
              verificationAttempts > 1
                ? ` (Attempt ${verificationAttempts}/${maxAttempts})`
                : ""
            }`,
            html: `
            <div style="text-align: center; margin-bottom: 20px;">
              ${
                verificationAttempts > 1
                  ? `<p style="color: #e74c3c; font-size: 0.9em; margin-bottom: 10px;"><strong>Incorrect code entered.</strong> Please try again.</p>`
                  : ""
              }
              <p style="margin-bottom: 15px;">${enterCodePrompt.replace(
                "AAA",
                authorEmails.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
              )}</p>
              ${
                verificationAttempts > 1
                  ? `<p style="font-size: 0.8em; color: #888; margin-top: 10px;">Remaining attempts: ${
                      maxAttempts - verificationAttempts
                    }</p>`
                  : ""
              }
            </div>
            <input id="verification-code-input" class="swal2-input" placeholder="Enter 6-digit code" maxlength="6" inputmode="numeric" pattern="[0-9]*" style="font-size: 1em; text-align: center; letter-spacing: 0.3em; margin: 10px auto; display: block; width: 350px; padding: 15px;">
          `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: "Cancel",
            allowOutsideClick: false,
            allowEscapeKey: false,
            customClass: {
              popup: "email-verification-popup",
              title: "email-verification-title",
              htmlContainer: "email-verification-content",
            },
            didOpen: () => {
              const title = document.querySelector(".swal2-title");
              if (title) {
                title.style.textAlign = "center";
              }

              // get input element and add auto-verification listener
              const input = document.getElementById("verification-code-input");
              if (input) {
                // Focus the input
                input.focus();

                // auto-verify when 6 digits are entered
                input.addEventListener("input", (e) => {
                  const value = e.target.value;

                  e.target.value = value.replace(/[^0-9]/g, "");

                  if (e.target.value.length === 6) {
                    Swal.close();
                    resolve({ value: e.target.value });
                  }
                });

                // handle paste events
                input.addEventListener("paste", (e) => {
                  e.preventDefault();
                  const pastedText = (
                    e.clipboardData || window.clipboardData
                  ).getData("text");
                  const numericOnly = pastedText
                    .replace(/[^0-9]/g, "")
                    .slice(0, 6);
                  input.value = numericOnly;

                  if (numericOnly.length === 6) {
                    Swal.close();
                    resolve({ value: numericOnly });
                  }
                });
              }
            },
            willClose: () => {
              // if closed without entering code, check if it was cancelled
              const input = document.getElementById("verification-code-input");
              if (input && input.value.length < 6) {
                resolve({ dismiss: Swal.DismissReason.cancel });
              }
            },
          });
        });

        // handle verification result
        if (verificationResult.dismiss === Swal.DismissReason.cancel) {
          console.log("Email verification cancelled by user");
          await Swal.fire({
            title: "Verification Cancelled",
            text: "Microphone calibration requires email verification. Experiment will end.",
            icon: "warning",
            confirmButtonText: "Proceed",
          });
          showExperimentEnding();
          quitPsychoJS(
            "Email verification cancelled",
            false,
            paramReader,
            true,
            false,
          );
          recruitmentServiceData?.incompatibleCode
            ? window.open(
                "https://app.prolific.com/submissions/complete?cc=" +
                  recruitmentServiceData?.incompatibleCode,
              )
            : null;
          return;
        }

        // verify the entered code
        if (verificationResult.value === verificationCode) {
          // verification successful
          verificationSuccess = true;
          console.log("Email verification successful!");
          await Swal.fire({
            title: "Authorship verified",
            icon: "success",
            confirmButtonText: "Proceed",
            allowOutsideClick: false,
            customClass: {
              title: "email-verification-success-title",
            },
            didOpen: () => {
              // center the title
              const title = document.querySelector(".swal2-title");
              if (title) {
                title.style.textAlign = "center";
              }
            },
          });

          // store verification status for later use in microphone profile
          psychoJS.experiment.addData("emailVerificationCompleted", "TRUE");
          psychoJS.experiment.addData("verifiedAuthorEmails", authorEmails);
          psychoJS.experiment.addData("verifiedAuthors", authors);
          psychoJS.experiment.addData(
            "verifiedAuthorAffiliations",
            authorAffiliations,
          );
          psychoJS.experiment.addData(
            "verificationAttempts",
            verificationAttempts,
          );
          psychoJS.experiment.nextEntry();
        } else {
          // incorrect code - check if we've reached max attempts
          console.log(
            `Incorrect verification code entered: ${verificationResult.value} (Attempt ${verificationAttempts}/${maxAttempts})`,
          );

          if (verificationAttempts >= maxAttempts) {
            // Max attempts reached - quit experiment
            await Swal.fire({
              title: "Authorship Verification Failed",
              text: `Maximum verification attempts (${maxAttempts}) exceeded. Experiment will end.`,
              icon: "error",
              confirmButtonText: "Proceed",
              customClass: {
                title: "email-verification-failed-title",
              },
              didOpen: () => {
                // center the title
                const title = document.querySelector(".swal2-title");
                if (title) {
                  title.style.textAlign = "center";
                }
              },
            });
            console.log(
              "Maximum verification attempts exceeded - quitting experiment",
            );
            showExperimentEnding();
            quitPsychoJS(
              "Email verification failed - maximum attempts exceeded",
              false,
              paramReader,
              true,
              false,
            );
            recruitmentServiceData?.incompatibleCode
              ? window.open(
                  "https://app.prolific.com/submissions/complete?cc=" +
                    recruitmentServiceData?.incompatibleCode,
                )
              : null;
            return;
          }
          // continue loop for next attempt
        }
      }

      if (!verificationSuccess) {
        console.log("Email verification failed after maximum attempts");
        showExperimentEnding();
        quitPsychoJS(
          "Email verification failed - maximum attempts exceeded",
          false,
          paramReader,
          true,
          false,
        );
        recruitmentServiceData?.incompatibleCode
          ? window.open(
              "https://app.prolific.com/submissions/complete?cc=" +
                recruitmentServiceData?.incompatibleCode,
            )
          : null;
        return;
      }
    } else {
      console.log(
        "Email verification not required - calibrateMicrophonesBool or proceedBool is false",
      );
    }

    // ! Remote Calibrator
    const experimentStarted = { current: false };
    parseViewMonitorsXYDeg(paramReader);
    await startMultipleDisplayRoutine(paramReader, rc.language.value);
    if (useCalibration(paramReader)) {
      rc.keypadHandler.keypad = keypad.handler;
      await new Promise((resolve) => {
        rc.panel(
          formCalibrationList(paramReader),
          "#rc-panel-holder",
          {
            debug: debug || debugBool.current,
            i18n: false,
          },
          async () => {
            if (!experimentStarted.current) {
              experimentStarted.current = true;
              rc.showVideo(false);
              rc.removePanel();
              rc.pauseGaze();
              rc._removeBackground();
              rc.removeKeypadHandler();

              if (
                rc.gazeTracker &&
                rc.gazeTracker.webgazer &&
                rc.gazeTracker.webgazer.videoParamsToReport
              ) {
                const height =
                  rc.gazeTracker.webgazer.videoParamsToReport.height;
                const width = rc.gazeTracker.webgazer.videoParamsToReport.width;
                const WxH = `${width}x${height}`;
                psychoJS.experiment.addData("cameraResolutionXY", WxH);
              }

              if (
                !rc.rulerUnits &&
                paramReader.read("_calibrateDistanceCheckBool")[0]
              ) {
                // participant chose None
                //end experiment
                showExperimentEnding();
                quitPsychoJS("", false, paramReader, true, false);
                recruitmentServiceData?.incompatibleCode
                  ? window.open(
                      "https://app.prolific.com/submissions/complete?cc=" +
                        recruitmentServiceData?.incompatibleCode,
                    )
                  : null;
              }

              if (rc.preCalibrationChoice) {
                psychoJS.experiment.addData(
                  "cameraIsTopCenter",
                  rc.preCalibrationChoice,
                );
              }
              if (rc.screenSizeMeasurements) {
                const SizeCheckRequestedCm =
                  rc.calibrateTrackLengthRequestedCm?.join(", ") || "";
                const SizeCheckEstimatedPxPerCm =
                  rc.calibrateDistancePxPerCm?.join(", ") || "";
                const calibrateScreenSizeJSON = JSON.stringify({
                  experiment: psychoJS.config.experiment.name,
                  participant: thisExperimentInfo.participant,
                  date:
                    util.MonotonicClock.getDateStr() +
                    " " +
                    util.MonotonicClock.getTimeZone(),
                  json: "calibrateScreenSizeJSON",
                  SizeCheckRequestedCm: SizeCheckRequestedCm,
                  SizeCheckEstimatedPxPerCm: SizeCheckEstimatedPxPerCm,
                  ...rc.screenSizeMeasurements,
                }).replace(/,/g, ", ");
                psychoJS.experiment.addData(
                  "calibrateScreenSizeJSON",
                  calibrateScreenSizeJSON,
                );
              }
              if (rc.objectMeasurements) {
                psychoJS.experiment.addData(
                  "calibrateDistanceJSON",
                  JSON.stringify(rc.objectMeasurements).replace(/,/g, ", "),
                );
              }

              if (rc.calibrationAttemptsT) {
                const calibrationAttemptsTJSON = JSON.stringify({
                  experiment: psychoJS.config.experiment.name,
                  participant: thisExperimentInfo.participant,
                  date:
                    util.MonotonicClock.getDateStr() +
                    " " +
                    util.MonotonicClock.getTimeZone(),
                  json: "distanceCalibrationJSON",
                  ...rc.calibrationAttemptsT,
                });

                psychoJS.experiment.addData(
                  "distanceCalibrationJSON",
                  calibrationAttemptsTJSON,
                );
              }

              if (rc.distanceCheckJSON) {
                const distanceCheckJSON = rc.distanceCheckJSON;

                try {
                  let blindspotRightEyeNearEdge = null;
                  let blindspotRightEyeFarEdge = null;
                  let blindspotLeftEyeNearEdge = null;
                  let blindspotLeftEyeFarEdge = null;

                  //calibrationAttempts is an object {"calibration1":{...}, "calibration2":{...}, "calibration3":{...}, "calibration4":{...}, "calibration5":{...}}
                  const calibrationAttempts = Object.values(
                    rc.calibrationAttempts,
                  );
                  if (calibrationAttempts && calibrationAttempts.length > 0) {
                    for (let i = calibrationAttempts.length - 1; i >= 0; i--) {
                      // method = blindspot-right-eye-near-edge
                      if (
                        calibrationAttempts[i].method ===
                        "blindspot-right-eye-near-edge"
                      ) {
                        blindspotRightEyeNearEdge = calibrationAttempts[i];
                      }
                      // method = blindspot-right-eye-far-edge
                      if (
                        calibrationAttempts[i].method ===
                        "blindspot-right-eye-far-edge"
                      ) {
                        blindspotRightEyeFarEdge = calibrationAttempts[i];
                      }
                      // method = blindspot-left-eye-near-edge
                      if (
                        calibrationAttempts[i].method ===
                        "blindspot-left-eye-near-edge"
                      ) {
                        blindspotLeftEyeNearEdge = calibrationAttempts[i];
                      }
                      // method = blindspot-left-eye-far-edge
                      if (
                        calibrationAttempts[i].method ===
                        "blindspot-left-eye-far-edge"
                      ) {
                        blindspotLeftEyeFarEdge = calibrationAttempts[i];
                      }
                      if (
                        blindspotRightEyeNearEdge &&
                        blindspotRightEyeFarEdge &&
                        blindspotLeftEyeNearEdge &&
                        blindspotLeftEyeFarEdge
                      ) {
                        break;
                      }
                    }
                  }

                  if (
                    blindspotRightEyeNearEdge &&
                    blindspotRightEyeFarEdge &&
                    blindspotLeftEyeNearEdge &&
                    blindspotLeftEyeFarEdge
                  ) {
                    distanceCheckJSON.rightEyeNearEdgeCm =
                      blindspotRightEyeNearEdge.spotToFixationCm;
                    distanceCheckJSON.rightEyeNearEdgeIpdVpx =
                      blindspotRightEyeNearEdge.ipdVpx;
                    distanceCheckJSON.rightEyeFarEdgeCm =
                      blindspotRightEyeFarEdge.spotToFixationCm;
                    distanceCheckJSON.rightEyeFarEdgeIpdVpx =
                      blindspotRightEyeFarEdge.ipdVpx;
                    distanceCheckJSON.leftEyeNearEdgeCm =
                      blindspotLeftEyeNearEdge.spotToFixationCm;
                    distanceCheckJSON.leftEyeNearEdgeIpdVpx =
                      blindspotLeftEyeNearEdge.ipdVpx;
                    distanceCheckJSON.leftEyeFarEdgeCm =
                      blindspotLeftEyeFarEdge.spotToFixationCm;
                    distanceCheckJSON.leftEyeFarEdgeIpdVpx =
                      blindspotLeftEyeFarEdge.ipdVpx;

                    if (
                      distanceCheckJSON.measuredFactorVpxCm &&
                      distanceCheckJSON.measuredFactorVpxCm.length > 0
                    ) {
                      let rightEyeNearEdgeDeg = [];
                      let rightEyeFarEdgeDeg = [];
                      let leftEyeNearEdgeDeg = [];
                      let leftEyeFarEdgeDeg = [];

                      for (
                        let j = 0;
                        j < distanceCheckJSON.measuredFactorVpxCm.length;
                        j++
                      ) {
                        let eyeToCameraCm_rightEyeNearEdge =
                          distanceCheckJSON.measuredFactorVpxCm[j] /
                          distanceCheckJSON.rightEyeNearEdgeIpdVpx;
                        let eyeToCameraCm_rightEyeFarEdge =
                          distanceCheckJSON.measuredFactorVpxCm[j] /
                          distanceCheckJSON.rightEyeFarEdgeIpdVpx;
                        let eyeToCameraCm_leftEyeNearEdge =
                          distanceCheckJSON.measuredFactorVpxCm[j] /
                          distanceCheckJSON.leftEyeNearEdgeIpdVpx;
                        let eyeToCameraCm_leftEyeFarEdge =
                          distanceCheckJSON.measuredFactorVpxCm[j] /
                          distanceCheckJSON.leftEyeFarEdgeIpdVpx;
                        const rightEyeNearEdgeDeg_value =
                          (2 *
                            Math.atan2(
                              0.5 * distanceCheckJSON.rightEyeNearEdgeCm,
                              eyeToCameraCm_rightEyeNearEdge,
                            ) *
                            180) /
                          Math.PI;
                        const rightEyeFarEdgeDeg_value =
                          (2 *
                            Math.atan2(
                              0.5 * distanceCheckJSON.rightEyeFarEdgeCm,
                              eyeToCameraCm_rightEyeFarEdge,
                            ) *
                            180) /
                          Math.PI;
                        const leftEyeNearEdgeDeg_value =
                          (2 *
                            Math.atan2(
                              0.5 * distanceCheckJSON.leftEyeNearEdgeCm,
                              eyeToCameraCm_leftEyeNearEdge,
                            ) *
                            180) /
                          Math.PI;
                        const leftEyeFarEdgeDeg_value =
                          (2 *
                            Math.atan2(
                              0.5 * distanceCheckJSON.leftEyeFarEdgeCm,
                              eyeToCameraCm_leftEyeFarEdge,
                            ) *
                            180) /
                          Math.PI;
                        rightEyeNearEdgeDeg.push(
                          parseFloat(rightEyeNearEdgeDeg_value.toFixed(1)),
                        );
                        rightEyeFarEdgeDeg.push(
                          parseFloat(rightEyeFarEdgeDeg_value.toFixed(1)),
                        );
                        leftEyeNearEdgeDeg.push(
                          parseFloat(leftEyeNearEdgeDeg_value.toFixed(1)),
                        );
                        leftEyeFarEdgeDeg.push(
                          parseFloat(leftEyeFarEdgeDeg_value.toFixed(1)),
                        );
                      }
                      distanceCheckJSON.rightEyeNearEdgeDeg =
                        rightEyeNearEdgeDeg;
                      distanceCheckJSON.rightEyeFarEdgeDeg = rightEyeFarEdgeDeg;
                      distanceCheckJSON.leftEyeNearEdgeDeg = leftEyeNearEdgeDeg;
                      distanceCheckJSON.leftEyeFarEdgeDeg = leftEyeFarEdgeDeg;
                    }
                  }
                } catch (e) {
                  distanceCheckJSON.error = e.message;
                }

                psychoJS.experiment.addData(
                  "distanceCheckJSON",
                  JSON.stringify({
                    experiment: psychoJS.config.experiment.name,
                    participant: thisExperimentInfo.participant,
                    date:
                      util.MonotonicClock.getDateStr() +
                      " " +
                      util.MonotonicClock.getTimeZone(),
                    json: "distanceCheckJSON",
                    ...distanceCheckJSON,
                  }).replace(/,/g, ", "),
                );
              }

              if (rc.rulerLength) {
                psychoJS.experiment.addData("rulerLength", rc.rulerLength);
              }

              if (rc.rulerUnits) {
                psychoJS.experiment.addData("rulerUnit", rc.rulerUnits);
              }

              // rc.pauseDistance();
              // ! clean RC dom
              if (document.querySelector("#rc-panel-holder"))
                document.querySelector("#rc-panel-holder").remove();

              rc.pauseNudger();
              // Get fullscreen
              if (!psychoJS.window._windowAlreadyInFullScreen && !debug) {
                // rc.getFullscreen();
                // await sleep(1000);
              }

              // TODO use actual nearPoint, from RC
              // displayOptions.nearPointXYDeg = [0, 0]; // TEMP
              Screens[0].nearestPointXYZPx = [0, 0]; // TEMP

              Screens[0].measurements.widthCm = rc.screenWidthCm
                ? rc.screenWidthCm.value
                : 30;
              Screens[0].measurements.widthPx = rc.displayWidthPx.value;
              Screens[0].pxPerCm =
                Screens[0].measurements.widthPx /
                Screens[0].measurements.widthCm;

              Screens[0].window = psychoJS.window;
            } else {
              warning(
                "Participant re-calibrated. You may consider discarding the trials before.",
              );
            }
            psychoJS.eventManager.clearKeys();
            resolve();
          },
          null,
          null,
        );
      });
    } else {
      // Go fullscreen, if it hasn't been set
      try {
        await rc.getFullscreen();
      } catch (e) {
        console.error(
          "Failed to go fullscreen in displayNeedsPage, no calibration path.",
          e,
        );
      }
    }
    //create Timing Bars
    createTimingBars();
    return Scheduler.Event.NEXT;
  }

  // var frameDur;
  async function updateInfo(needPhoneSurveyBool) {
    setCurrentFn("updateInfo");
    thisExperimentInfo["date"] =
      util.MonotonicClock.getDateStr() +
      " " +
      util.MonotonicClock.getTimeZone();
    thisExperimentInfo[
      "psychopyVersion"
    ] = `${psychoJSPackage.version}-threshold-prod`;

    thisExperimentInfo["hardwareConcurrency"] = rc.concurrency.value;

    thisExperimentInfo["deviceType"] = rc.deviceType.value;
    thisExperimentInfo["deviceSystem"] = rc.system.value;
    thisExperimentInfo["deviceSystemFamily"] = rc.systemFamily.value;
    thisExperimentInfo["deviceBrowser"] = rc.browser.value;
    thisExperimentInfo["deviceBrowserVersion"] = rc.browserVersion.value;
    thisExperimentInfo["deviceLanguage"] = rc.userLanguage.value;

    loudspeakerBrowserDetails.current.browser = rc.browser.value;
    loudspeakerBrowserDetails.current.browserVersion = rc.browserVersion.value;

    if (rc.browserVersion.value && rc.browserVersion.value.includes(".")) {
      const versionParts = rc.browserVersion.value.split(".");
      if (versionParts.length > 1) {
        const decimalPart = versionParts[0];
        if (parseInt(decimalPart) >= 100) {
          loudspeakerBrowserDetails.current.browserVersion = versionParts[0];
        } else {
          //only show the first two in the array (decimalPart[0] and decimalPart[1])
          loudspeakerBrowserDetails.current.browserVersion =
            versionParts[0] + "." + versionParts[1];
        }
      }
    }

    thisExperimentInfo[
      "psychojsWindowDimensions"
    ] = `[${psychoJS._window._size.toString()}]`;
    // store frame rate of monitor if we can measure it successfully
    thisExperimentInfo["monitorFrameRate"] =
      psychoJS.window.getActualFrameRate();
    psychoJS.experiment.addData(
      "frameRateReportedByPsychoJS",
      thisExperimentInfo["monitorFrameRate"],
    );

    if (rc.stressFps) {
      psychoJS.experiment.addData("frameRateUnderStress", rc.stressFps.value);
    } else {
      // forcedly make sure that computeRandomMHz is always available
      if (rc.performanceCompute)
        await rc.performanceCompute((result) => {
          psychoJS.experiment.addData(
            "computeRandomMHz",
            result.value.computeRandomMHz,
          );
        });
    }

    // ! add info from the URL:
    // ! disabled as we add Prolific fields in our own ways and we don't want to overwrite
    // ! EasyEyes fields with Prolific fields
    // util.addInfoFromUrl(thisExperimentInfo);

    // record Prolific related info to thisExperimentInfo

    // if (isProlificExperiment()) saveProlificInfo(thisExperimentInfo); //moved this to paramReaderInitialized

    thisExperimentInfo.experiment = getPavloviaProjectName();

    // return Scheduler.Event.NEXT;
    // save elements of thisExperimentInfo to psychoJS.experiment
    psychoJS.experiment.addData("URL", window.location.href || "");
    psychoJS.experiment.addData("expName", thisExperimentInfo.name);
    psychoJS.experiment.addData("psychopyVersion", thisExperimentInfo.version);
    psychoJS.experiment.addData(
      "hardwareConcurrency",
      thisExperimentInfo.hardwareConcurrency,
    );
    try {
      const deviceMemoryGB = navigator.deviceMemory;
      psychoJS.experiment.addData("deviceMemoryGB", deviceMemoryGB);
    } catch (e) {
      console.log("Error adding deviceMemoryGB to psychoJS.experiment", e);
    }
    psychoJS.experiment.addData("deviceType", thisExperimentInfo.deviceType);
    psychoJS.experiment.addData(
      "deviceSystem",
      thisExperimentInfo.deviceSystem,
    );
    psychoJS.experiment.addData(
      "deviceSystemFamily",
      thisExperimentInfo.deviceSystemFamily,
    );
    psychoJS.experiment.addData(
      "deviceBrowser",
      thisExperimentInfo.deviceBrowser,
    );
    psychoJS.experiment.addData(
      "deviceBrowserVersion",
      thisExperimentInfo.deviceBrowserVersion,
    );
    psychoJS.experiment.addData(
      "deviceLanguage",
      thisExperimentInfo.deviceLanguage,
    );
    psychoJS.experiment.addData(
      "psychojsWindowDimensions",
      thisExperimentInfo.psychojsWindowDimensions,
    );
    psychoJS.experiment.addData("participant", thisExperimentInfo.participant);
    psychoJS.experiment.addData("session", thisExperimentInfo.session);
    psychoJS.experiment.addData("EasyEyesID", thisExperimentInfo.EasyEyesID);
    psychoJS.experiment.addData(
      "PavloviaSessionID",
      thisExperimentInfo.PavloviaSessionID,
    );
    // psychoJS.experiment.addData("date", thisExperimentInfo.date);
    psychoJS.experiment.addData(
      "ProlificParticipantID",
      thisExperimentInfo.ProlificParticipantID,
    );
    psychoJS.experiment.addData(
      "ProlificSessionID",
      thisExperimentInfo.ProlificSessionID,
    );
    psychoJS.experiment.addData(
      "ProlificStudyID",
      thisExperimentInfo.ProlificStudyID,
    );
    try {
      psychoJS.experiment.addData("devicePixelRatio", window.devicePixelRatio);
    } catch (e) {
      console.log("Error adding devicePixelRatio to psychoJS.experiment", e);
    }
    if (needPhoneSurveyBool) psychoJS.experiment.nextEntry();
  }

  var fileClock;
  var filterClock;
  var instructionsClock;

  /* --- BOUNDING BOX --- */
  var boundingBoxPolies;
  var characterSetBoundingBoxPolies;
  var displayCharacterSetBoundingBoxPolies;
  /* --- /BOUNDING BOX --- */

  var thisConditionsFile;
  var trialClock;

  var instructions;
  var instructions2;

  instructionFont.current = paramReader.read("instructionFont")[0];
  if (paramReader.read("instructionFontSource")[0] === "file")
    instructionFont.current = cleanFontName(instructionFont.current);

  async function experimentInit() {
    setCurrentFn("experimentInit");
    // Initialize components for Routine "file"
    fileClock = new util.Clock();
    // Initialize components for Routine "filter"
    filterClock = new util.Clock();
    instructionsClock = new util.Clock();

    status.block = 0; // +1 at the beginning of each block
    status.nthBlock = 0; // +1 at the beginning of each block
    thisConditionsFile = `conditions/block_${status.block + 1}.csv`;

    // TODO use actual nearPoint, from RC
    // displayOptions.nearPointXYDeg = [0, 0]; // TEMP
    Screens[0].nearestPointXYZPx = [0, 0]; // TEMP

    Screens[0].measurements.widthCm = rc.screenWidthCm
      ? rc.screenWidthCm.value
      : 30;
    Screens[0].measurements.widthPx = rc.displayWidthPx.value;
    Screens[0].pxPerCm =
      Screens[0].measurements.widthPx / Screens[0].measurements.widthCm;

    Screens[0].window = psychoJS.window;

    psychoJS.inputParameters = Object.keys(GLOSSARY).filter(
      (p) => GLOSSARY[p].type !== "obsolete",
    );

    viewingDistanceCm.current = rc.viewingDistanceCm
      ? rc.viewingDistanceCm.value
      : Math.min(viewingDistanceCm.desired, viewingDistanceCm.max);
    Screens[0].viewingDistanceCm = viewingDistanceCm.current;
    Screens[0].nearestPointXYZPx =
      rc.improvedDistanceTrackingData !== undefined
        ? rc.improvedDistanceTrackingData.nearestXYPx
        : Screens[0].nearestPointXYZPx;
    addApparatusInfoToData(Screens[0], rc, psychoJS);

    // Initialize components for Routine "trial"
    trialClock = new util.Clock();

    key_resp = new core.Keyboard({
      psychoJS: psychoJS,
      clock: new util.Clock(),
      waitForStart: true,
    });

    fixation = new Fixation();
    Screens[0].fixationConfig.stim = fixation;
    vernier = new VernierStim();

    const fontPixiMetricsString = paramReader.read("fontPixiMetricsString")[0];
    const psychojsTextStimConfig = {
      win: psychoJS.window,
      color: new util.Color("black"),
      characterSet:
        fontPixiMetricsString === "" ? "|ÉqÅ" : fontPixiMetricsString,
    };
    target = new visual.TextStim({
      name: "target",
      ...psychojsTextStimConfig,
      ...targetTextStimConfig,
    });
    flanker1 = new visual.TextStim({
      name: "flanker1",
      ...psychojsTextStimConfig,
      ...targetTextStimConfig,
    });
    flanker2 = new visual.TextStim({
      name: "flanker2",
      ...psychojsTextStimConfig,
      ...targetTextStimConfig,
    });
    flanker3 = new visual.TextStim({
      name: "flanker3",
      ...psychojsTextStimConfig,
      ...targetTextStimConfig,
    });
    flanker4 = new visual.TextStim({
      name: "flanker4",
      ...psychojsTextStimConfig,
      ...targetTextStimConfig,
    });

    showCharacterSet = new visual.TextStim({
      win: psychoJS.window,
      name: "showCharacterSet",
      text: "",
      font: "Arial",
      units: "pix",
      pos: [0, 0],
      height: 1.0,
      wrapWidth: window.innerWidth,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -5.0,
      autoLog: false,
    });

    trialCounter = new visual.TextStim({
      ...trialCounterConfig,
      win: psychoJS.window,
      font: instructionFont.current,
      color: new util.Color("black"),
      autoLog: false,
    });

    showImage = new visual.ImageStim({
      win: psychoJS.window,
      depth: -10.0,
    });

    targetImage = new visual.ImageStim({
      win: psychoJS.window,
      depth: -10.0,
    });

    targetSpecs = new visual.TextStim({
      ...targetSpecsConfig,
      win: psychoJS.window,
      font: instructionFont.current,
      color: new util.Color("black"),
      autoLog: false,
    });

    conditionName = new visual.TextStim({
      ...conditionNameConfig,
      win: psychoJS.window,
      font: instructionFont.current,
      color: new util.Color("black"),
      autoLog: false,
    });

    instructions = new visual.TextStim({
      ...instructionsConfig,
      win: psychoJS.window,
      name: "instructions",
      font: instructionFont.current,
      color: new util.Color("black"),
      pos: [-window.innerWidth * 0.4, window.innerHeight * 0.4],
      alignVert: "top",
      autoLog: false,
    });

    instructions2 = new visual.TextStim({
      ...instructionsConfig,
      win: psychoJS.window,
      name: "instructions2",
      font: instructionFont.current,
      color: new util.Color("black"),
      pos: [-window.innerWidth * 0.4, -window.innerHeight * 0.4],
      alignVert: "bottom",
      autoLog: false,
    });

    characterSetBoundingRects = generateCharacterSetBoundingRects_New(
      paramReader,
      cleanFontName,
      Screens[0].pxPerCm,
    );

    await parseImageFolders();
    await parseTargetSoundListFolders();

    dummyStim.current = new visual.TextStim({
      win: psychoJS.window,
      name: "dummy",
      text: "",
      font: "Arial",
      units: "pix",
      pos: [0, 0],
      height: 1.0,
      wrapWidth: window.innerWidth,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 0.0,
      depth: -5.0,
      autoLog: false,
      autoDraw: false,
    });

    getTinyHint();

    /* --- BOUNDING BOX --- */
    // Generate the bounding boxes to be displayed superimposing...
    [
      boundingBoxPolies, // ... the triplet.
      characterSetBoundingBoxPolies, // ... the triplet.
      displayCharacterSetBoundingBoxPolies, // .. the full character set displayed during response time.
    ] = generateBoundingBoxPolies(paramReader, psychoJS);
    /* --- BOUNDING BOX --- */

    /* --------------------------------- READING -------------------------------- */

    // Paragraph that will eventually be displayed during trials
    // Initiated with default values
    readingParagraph = new Paragraph(
      [],
      0,
      undefined,
      {
        win: psychoJS.window,
        name: "readingParagraph",
        text: "",
        font: "Arial",
        units: "pix",
        pos: [0, 0],
        height: undefined,
        wrapWidth: window.innerWidth, // nowrap
        ori: 0.0,
        opacity: 1.0,
        depth: 1,
        isInstruction: false,
        alignHoriz: "left",
        alignVert: "center",
        autoDraw: false,
        autoLog: false,
        padding: paramReader.read("fontPadding", "__ALL_BLOCKS__")[0],
        letterSpacing: 0,
      },
      paramReader,
    );
    /* -------------------------------------------------------------------------- */

    // Create some handy timers
    clock.global = new util.Clock(); // to track the time since experiment started
    routineTimer = new util.CountdownTimer(); // to track time remaining of each (non-slip) routine
    routineClock = new util.Clock();

    // Extra clocks for clear timing
    initInstructionClock = new util.Clock();
    eduInstructionClock = new util.Clock();
    trialInstructionClock = new util.Clock();
    blockScheduleFinalClock = new util.Clock();

    // TODO Not working
    if (rc.languageDirection.value === "RTL") {
      Object.assign(document.querySelector("canvas").style, {
        direction: "rtl",
      });
    }

    grid.current = new Grid("disabled", Screens[0], psychoJS);

    // create experiment-wide progress bar
    createExperimentProgressBar();

    // start matlab
    if (useMatlab.current) {
      await sendMessage(
        "Record " + thisExperimentInfo.experiment + "-",
        thisExperimentInfo.participant,
        "-gaze",
      );
      await waitForSignal("Recording", () => {
        console.log("matlab start recording");
      });
    }

    return Scheduler.Event.NEXT;
  }

  var t;
  var frameN;
  var preRenderFrameN;
  var continueRoutine;
  var fileComponents;
  var frameRemains;

  function fileRoutineBegin(snapshot) {
    return async function () {
      setCurrentFn("fileRoutineBegin");
      TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

      //------Prepare to start Routine 'file'-------
      t = 0;
      fileClock.reset(); // clock
      frameN = -1;
      continueRoutine = true; // until we're told otherwise
      // update component parameters for each repeat
      // keep track of which components have finished
      fileComponents = [];

      for (const thisComponent of fileComponents)
        if ("status" in thisComponent)
          thisComponent.status = PsychoJS.Status.NOT_STARTED;
      return Scheduler.Event.NEXT;
    };
  }

  function fileRoutineEachFrame() {
    return async function () {
      setCurrentFn("fileRoutineEachFrame");
      //------Loop for each frame of Routine 'file'-------
      // get current time
      t = fileClock.getTime();
      frameN = frameN + 1; // number of completed frames (so 0 is the first frame)
      // update/draw components on each frame
      // check for quit (typically the Esc key)
      if (
        psychoJS.experiment.experimentEnded ||
        psychoJS.eventManager.getKeys({ keyList: ["escape"] }).length > 0
      ) {
        return quitPsychoJS("", false, paramReader);
      }

      // check if the Routine should terminate
      if (!continueRoutine) {
        // a component has requested a forced-end of Routine
        continueRoutine = true;
        return Scheduler.Event.NEXT;
      }

      continueRoutine = false; // reverts to True if at least one component still running
      for (const thisComponent of fileComponents)
        if (
          "status" in thisComponent &&
          thisComponent.status !== PsychoJS.Status.FINISHED
        ) {
          continueRoutine = true;
          break;
        }

      // refresh the screen if continuing
      if (continueRoutine) {
        return Scheduler.Event.FLIP_REPEAT;
      } else {
        continueRoutine = true;
        return Scheduler.Event.NEXT;
      }
    };
  }

  function fileRoutineEnd() {
    return async function () {
      setCurrentFn("fileRoutineEnd");
      //------Ending Routine 'file'-------
      for (const thisComponent of fileComponents) {
        if (typeof thisComponent.setAutoDraw === "function") {
          thisComponent.setAutoDraw(false);
        }
      }
      // the Routine "file" was not non-slip safe, so reset the non-slip timer
      routineTimer.reset();
      routineClock.reset();

      return Scheduler.Event.NEXT;
    };
  }

  function _instructionSetup(
    text,
    blockOrCondition,
    bigMargin = true,
    wrapRatio = 0.9,
    altPosition = undefined,
  ) {
    function prerenderText(text) {
      // Simple RTL punctuation flipping for better text display
      if (!text) return text;
      let processedText = text;
      const punctuationFlips = {
        // flip psotion fo period
        ".": ".",
        ",": "،", // Use Arabic comma
        "?": "؟", // Use Arabic question mark
        "!": "!", // Use exclamation mark (same character, positioned for RTL)
      };
      // Replace punctuation with RTL equivalents (excluding periods for special handling)
      Object.entries(punctuationFlips).forEach(([from, to]) => {
        processedText = processedText.replace(new RegExp("\\" + from, "g"), to);
      });
      // Handle bullet points - move them to the right side by putting them at the end of the line
      processedText = processedText.replace(
        /^(\s*)([•·‣▪▫⁃])\s*(.+)$/gm,
        "$1$3 $2",
      );

      // Handle periods and exclamation marks at end of sentences - for RTL, move them to the start
      processedText = processedText.replace(
        /^(.+?)\.(\s*[•·‣▪▫⁃]?\s*$)/gm,
        ".$1$2",
      );
      processedText = processedText.replace(/^(.+?)!(\s*$)/gm, "!$1$2");
      return processedText;
    }

    setCurrentFn("_instructionSetup");
    instructionsConfig.height = getParamValueForBlockOrCondition(
      "instructionFontSizePt",
      blockOrCondition,
    );
    const fontLeftToRightBool = getParamValueForBlockOrCondition(
      "fontLeftToRightBool",
      blockOrCondition,
    );
    const marginOffset = getInstructionTextMarginPx(bigMargin);
    let position = altPosition ?? [
      -window.innerWidth / 2 + marginOffset,
      window.innerHeight / 2 - marginOffset,
    ];

    // Preprocess text for RTL if needed
    let processedText = text;
    const languageDirection = readi18nPhrases(
      "EE_languageDirection",
      rc.language.value,
    );
    if (
      (!fontLeftToRightBool && languageDirection === "RTL") ||
      languageDirection === "RTL"
    ) {
      processedText = prerenderText(text);
      instructions.setAlignHoriz("right");
      position = altPosition ?? [
        window.innerWidth / 2 - marginOffset,
        window.innerHeight / 2 - marginOffset,
      ];
    }
    instructions.setPos(position);

    instructionsClock.reset(); // clock
    // t = 0;
    // frameN = -1;
    continueRoutine = true;
    instructions.setWrapWidth(window.innerWidth * wrapRatio - 2 * marginOffset);

    if (
      (!fontLeftToRightBool && languageDirection === "RTL") ||
      languageDirection === "RTL"
    ) {
      instructions.setText(processedText);
    } else {
      instructions.setText(text);
    }
    updateColor(instructions, "instruction", blockOrCondition);
    instructions.setAutoDraw(true);
    dynamicSetSize([instructions], instructionsConfig.height);
  }

  async function _instructionRoutineEachFrame() {
    setCurrentFn("_instructionRoutineEachFrame");
    if (simulatedObservers.proceed(status.block)) {
      continueRoutine = false;
      removeProceedButton();
    }
    trialCounter.setPos([window.innerWidth / 2, -window.innerHeight / 2]);
    renderObj.tinyHint.setPos([0, -window.innerHeight / 2]);

    t = instructionsClock.getTime();
    frameN = frameN + 1;

    liveUpdateTrialCounter(
      rc.language.value,
      paramReader.read("showCounterBool", status.block)[0],
      paramReader.read("showViewingDistanceBool", status.block)[0],
      undefined,
      undefined,
      status.nthBlock,
      totalBlocks.current,
      viewingDistanceCm.current,
      targetKind.current,
      t,
      trialCounter,
    );

    if (toShowCursor()) {
      continueRoutine = false;
      try {
        instructions.setAutoDraw(false);
        instructions2.setAutoDraw(false);
      } catch (e) {}
      removeProceedButton();
      return Scheduler.Event.NEXT;
    }

    if (!continueRoutine || clickedContinue.current) {
      continueRoutine = true;
      clickedContinue.current = false;
      return Scheduler.Event.NEXT;
    }

    continueRoutine = true;

    if (
      keypad.handler.inUse(status.block) &&
      _key_resp_allKeys.current
        .map((r) => r.name)
        .some((s) =>
          [
            "return",
            readi18nPhrases("T_RETURN", rc.language.value).toLowerCase(),
          ].includes(s.toLowerCase()),
        )
    ) {
      continueRoutine = false;
      removeProceedButton();
      keypad.handler.clearKeys();
    }
    switchKind(targetKind.current, {
      letter: () => {
        if (
          canType(responseType.current) &&
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0 &&
          frameN > 2
        ) {
          loggerText(
            "Inside switchKind [letter] if statement of _instructionRoutineEachFrame",
          );
          continueRoutine = false;
          removeProceedButton();
        }
      },
      reading: () => {
        if (
          psychoJS.eventManager.getKeys({ keyList: ["space"] }).length > 0 &&
          frameN > 2
        ) {
          continueRoutine = false;
          removeProceedButton();
        }
      },
      sound: () => {
        if (
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0 &&
          frameN > 2
        ) {
          continueRoutine = false;
          removeProceedButton();
        }
      },
      image: () => {
        if (
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0 &&
          frameN > 2
        ) {
          continueRoutine = false;
          removeProceedButton();
        }
      },
      vocoderPhrase: () => {
        if (
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0 &&
          frameN > 2
        ) {
          continueRoutine = false;
          removeProceedButton();
        }
      },
      repeatedLetters: () => {
        if (
          canType(responseType.current) &&
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0 &&
          frameN > 2
        ) {
          continueRoutine = false;
          removeProceedButton();
        }
      },
      rsvpReading: () => {
        if (
          canType(responseType.current) &&
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0 &&
          frameN > 2
        ) {
          continueRoutine = false;
          removeProceedButton();
        }
      },
      movie: async () => {
        if (
          (canType(responseType.current) ||
            keypadActive(responseType.current)) &&
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0 &&
          frameN > 2
        ) {
          if (
            paramReader
              .read("measureLuminanceBool", status.block)
              .some((x) => x) &&
            !paramReader
              .read("measureLuminancePretendBool", status.block)
              .some((x) => x)
          ) {
            if ("serial" in navigator) {
              await initColorCAL();
            } else {
              console.error("Web Serial API not supported in this browser");
            }
          }
          loggerText(
            "Inside switchKind [movie] if statement of _instructionRoutineEachFrame",
          );
          continueRoutine = false;
          removeProceedButton();
        }
      },
      vernier: () => {
        if (
          canType(responseType.current) &&
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0 &&
          frameN > 2
        ) {
          loggerText(
            "Inside switchKind [vernier] if statement of _instructionRoutineEachFrame",
          );
          continueRoutine = false;
          removeProceedButton();
        }
      },
    });

    if (
      psychoJS.experiment.experimentEnded ||
      psychoJS.eventManager.getKeys({ keyList: ["escape"] }).length > 0
    ) {
      removeBeepButton();

      return quitPsychoJS("", false, paramReader);
    }

    return Scheduler.Event.FLIP_REPEAT;
  }

  // async function _instructionRoutineEnd() {
  //   instructions.setAutoDraw(false);

  //   document.removeEventListener("click", _clickContinue);
  //   document.removeEventListener("touchend", _clickContinue);

  //   routineTimer.reset();
  //   routineClock.reset();

  //   return Scheduler.Event.NEXT;
  // }

  var blocks;
  var currentLoop;
  var trialsLoopScheduler;
  let responseSkipBlockForWhomRemover;

  function blocksLoopBegin(blocksLoopScheduler, snapshot) {
    return async function () {
      setCurrentFn("blocksLoopBegin");
      loggerText("blocksLoopBegin");
      TrialHandler.fromSnapshot(snapshot); // update internal variables (.thisN etc) of the loop

      // set up handler to look after randomisation of conditions etc
      const blockTrialList = getBlocksTrialList(
        paramReader,
        blockOrder.current,
      );
      blocks = new TrialHandler({
        psychoJS: psychoJS,
        nReps: 1,
        method: TrialHandler.Method.SEQUENTIAL,
        extraInfo: thisExperimentInfo,
        originPath: undefined,
        trialList: blockTrialList,
        seed: Math.round(performance.now()),
        name: "blocks",
      });
      psychoJS.experiment.addLoop(blocks); // add the loop to the experiment

      /* -------------------------------------------------------------------------- */
      // Preset params
      // ! Set current targetKind for the block
      targetKind.current = paramReader.read("targetKind", 1)[0];

      // ! Set current task for the block
      // TODO support multiple target tasks in one block
      // TODO support multiple target tasks in one condition, e.g., identify,questionAndAnswer?
      targetTask.current = readTargetTask("1_1");

      /* -------------------------------------------------------------------------- */

      // Schedule all the trials in the trialList:
      for (const _thisBlock of blocks) {
        // TODO currently only works if identify is set explicitly as the target task.
        // Use thisTargetTask to use identify as the default
        // const thisTargetTask = paramReader.read(
        //   "targetTask",
        //   _thisBlock.block
        // )[0];
        const snapshot = blocks.getSnapshot();
        const conditions = TrialHandler.importConditions(
          psychoJS.serverManager,
          `conditions/block_${_thisBlock.block + 1}.csv`,
        );
        blocksLoopScheduler.add(importConditions(snapshot, "block"));
        blocksLoopScheduler.add(filterRoutineBegin(snapshot));
        blocksLoopScheduler.add(filterRoutineEachFrame());
        blocksLoopScheduler.add(filterRoutineEnd());

        // DELETE
        // if (
        //   conditions.every(
        //     (c) =>
        //       typeof c["conditionEnabledBool"] !== "undefined" &&
        //       String(c["conditionEnabledBool"]).toLowerCase() === "false",
        //   )
        // )
        //   continue;
        if (
          conditions.every(
            (c) =>
              typeof c["showImage"] !== "undefined" &&
              String(c["showImage"]).toLowerCase() !== "" &&
              paramReader.read("targetKind", c["block_condition"]) !==
                "sound" &&
              paramReader.read("targetKind", c["block_condition"]) !== "image",
          )
        ) {
          conditions.forEach((c) => {
            blocksLoopScheduler.add(
              showImageBegin(
                c["showImage"],
                canClick(responseType.current),
                paramReader.read("showCounterBool", c["block_condition"]),
                paramReader.read(
                  "showViewingDistanceBool",
                  c["block_condition"],
                ),
                trialCounter,
                instructions,
                targetSpecs,
                colorRGBASnippetToRGBA(
                  paramReader.read("screenColorRGBA", c["block_condition"]),
                ),
                showImage,
                rc.language.value,
              ),
            );
            blocksLoopScheduler.add(
              showImageEachFrame(
                canType(responseType.current),
                canClick(responseType.current),
                rc.language.value,
              ),
            );
            blocksLoopScheduler.add(showImageEnd(showImage));
          });
          continue;
        }

        // only when not answering questions
        switchTask(_thisBlock.targetTask, {
          detect: () => {
            switchKind(_thisBlock.targetKind, {
              sound: () => {
                blocksLoopScheduler.add(initInstructionRoutineBegin(snapshot));
                blocksLoopScheduler.add(initInstructionRoutineEachFrame());
                blocksLoopScheduler.add(initInstructionRoutineEnd());
              },
            });
          },
          identify: () => {
            blocksLoopScheduler.add(initInstructionRoutineBegin(snapshot));
            blocksLoopScheduler.add(initInstructionRoutineEachFrame());
            blocksLoopScheduler.add(initInstructionRoutineEnd());

            switchKind(_thisBlock.targetKind, {
              letter: () => {
                blocksLoopScheduler.add(eduInstructionRoutineBegin(snapshot));
                blocksLoopScheduler.add(eduInstructionRoutineEachFrame());
                blocksLoopScheduler.add(eduInstructionRoutineEnd(snapshot));
              },
              vernier: () => {
                blocksLoopScheduler.add(eduInstructionRoutineBegin(snapshot));
                blocksLoopScheduler.add(eduInstructionRoutineEachFrame());
                blocksLoopScheduler.add(eduInstructionRoutineEnd(snapshot));
              },
            });
          },

          questionAnswer: () => {
            if (targetKind.current === "image") {
              blocksLoopScheduler.add(initInstructionRoutineBegin(snapshot));
              blocksLoopScheduler.add(initInstructionRoutineEachFrame());
              blocksLoopScheduler.add(initInstructionRoutineEnd());
            }
          },
        });

        trialsLoopScheduler = new Scheduler(psychoJS);
        blocksLoopScheduler.add(trialsLoopBegin(trialsLoopScheduler, snapshot));
        blocksLoopScheduler.add(trialsLoopScheduler);
        blocksLoopScheduler.add(trialsLoopEnd);

        // only when not answering questions
        switchTask(_thisBlock.targetTask, {
          identify: () => {
            switchKind(_thisBlock.targetKind, {
              reading: () => {
                blocksLoopScheduler.add(
                  blockSchedulerFinalRoutineBegin(snapshot),
                );
                blocksLoopScheduler.add(blockSchedulerFinalRoutineEachFrame());
                blocksLoopScheduler.add(blockSchedulerFinalRoutineEnd());
              },
            });
          },
        });

        blocksLoopScheduler.add(
          endLoopIteration(blocksLoopScheduler, snapshot),
        );
      }

      return Scheduler.Event.NEXT;
    };
  }

  var trialsConditions;
  var trials;
  function trialsLoopBegin(trialsLoopScheduler, snapshot) {
    return async function () {
      setCurrentFn("trialsLoopBegin");
      // setup a MultiStairTrialHandler
      trialsConditions = TrialHandler.importConditions(
        psychoJS.serverManager,
        thisConditionsFile,
      );
      trialsConditions = trialsConditions.map((condition) =>
        Object.assign(condition, { label: condition["block_condition"] }),
      );
      if (targetKind.current === "reading")
        trialsConditions = trialsConditions.slice(0, 1);
      // Progress bar will be updated by updateExperimentProgressBar() calls
      // nTrialsTotal
      // totalTrialsThisBlock.current = trialsConditions
      //   .map((c) => paramReader.read("conditionTrials", c.block_condition))
      //   .reduce((a, b) => a + b, 0);
      const maxTrials = Math.ceil(
        paramReader.block_conditions
          .filter((bc) => Number(bc.split("_")[0]) === status.block)
          .map(
            (bc) =>
              paramReader.read("conditionTrials", bc) *
              paramReader.read("thresholdAllowedTrialRatio", bc),
          )
          .reduce((a, b) => a + b, 0),
      );
      switchTask(targetTask.current, {
        questionAndAnswer: () => {
          if (targetKind.current === "image") {
            trialsConditions = populateQuestDefaults(
              trialsConditions,
              paramReader,
              "sound",
            );
            trials = new data.MultiStairHandler({
              stairType: MultiStairHandler.StaircaseType.QUEST,
              psychoJS: psychoJS,
              name: "trials",
              varName: "trialsVal",
              conditions: trialsConditions,
              method: TrialHandler.Method.FULLRANDOM,
              seed: Math.round(performance.now()),
              nTrials: totalTrialsThisBlock.current,
            });
          } else {
            trials = new data.TrialHandler({
              psychoJS: psychoJS,
              name: "trials",
              nReps: totalTrialsThisBlock.current,
              trialList: trialsConditions,
              method: TrialHandler.Method.SEQUENTIAL,
              seed: Math.round(performance.now()),
            });
          }
        },
        identify: () => {
          switchKind(targetKind.current, {
            reading: () => {
              trials = new data.TrialHandler({
                psychoJS: psychoJS,
                name: "trials",
                nReps: totalTrialsThisBlock.current,
                trialList: trialsConditions,
                method: TrialHandler.Method.SEQUENTIAL,
                seed: Math.round(performance.now()),
              });
            },
            letter: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader,
              );
              trials = new data.MultiStairHandler({
                stairType: MultiStairHandler.StaircaseType.QUEST,
                psychoJS: psychoJS,
                name: "trials",
                varName: "trialsVal",
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
                nTrials: maxTrials,
              });

              Screens[0].fixationConfig.show = true;
            },
            repeatedLetters: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader,
              );
              // trialsConditions = duplicateConditionsOfTargetKind(
              //   trialsConditions,
              //   2,
              //   "repeatedLetters"
              // );
              trials = new data.MultiStairHandler({
                stairType: MultiStairHandler.StaircaseType.QUEST,
                psychoJS: psychoJS,
                name: "trials",
                varName: "trialsVal",
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
                nTrials: maxTrials,
              });
              Screens[0].fixationConfig.show = true;
            },
            rsvpReading: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader,
              );
              trials = new data.MultiStairHandler({
                stairType: MultiStairHandler.StaircaseType.QUEST,
                psychoJS: psychoJS,
                name: "trials",
                varName: "trialsVal",
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
                nTrials: maxTrials,
              });
              Screens[0].fixationConfig.show = true;
            },
            sound: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader,
                "sound",
              );

              trials = new data.MultiStairHandler({
                stairType: MultiStairHandler.StaircaseType.QUEST,
                psychoJS: psychoJS,
                name: "trials",
                varName: "trialsVal",
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
                nTrials: totalTrialsThisBlock.current,
              });
            },
            image: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader,
              );
              trials = new data.MultiStairHandler({
                stairType: MultiStairHandler.StaircaseType.QUEST,
                psychoJS: psychoJS,
                name: "trials",
                varName: "trialsVal",
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
                nTrials: totalTrialsThisBlock.current,
              });
            },
            vocoderPhrase: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader,
                "sound",
              );
              trials = new data.MultiStairHandler({
                stairType: MultiStairHandler.StaircaseType.QUEST,
                psychoJS: psychoJS,
                name: "trials",
                varName: "trialsVal",
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
                nTrials: maxTrials,
              });
            },
            movie: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader,
                "movie",
              );
              trials = new data.MultiStairHandler({
                stairType: MultiStairHandler.StaircaseType.QUEST,
                psychoJS: psychoJS,
                name: "trials",
                varName: "trialsVal",
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
                nTrials: maxTrials,
              });
              logger("trials", trials);
              Screens[0].fixationConfig.show = true;
            },
            vernier: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader,
                "vernier",
              );
              trials = new data.MultiStairHandler({
                stairType: MultiStairHandler.StaircaseType.QUEST,
                psychoJS: psychoJS,
                name: "trials",
                varName: "trialsVal",
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
                nTrials: maxTrials,
              });
              Screens[0].fixationConfig.show = true;
            },
          });
        },
        detect: () => {
          switchKind(targetKind.current, {
            sound: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader,
                "sound",
              );

              trials = new data.MultiStairHandler({
                stairType: MultiStairHandler.StaircaseType.QUEST,
                psychoJS: psychoJS,
                name: "trials",
                varName: "trialsVal",
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
                nTrials: totalTrialsThisBlock.current,
              });
            },
          });
        },
      });

      trialCounter.setText("");
      trialCounter.setAutoDraw(false);

      renderObj.tinyHint.setText("");
      renderObj.tinyHint.setAutoDraw(false);
      psychoJS.experiment.addLoop(trials); // add the loop to the experiment
      currentLoop = trials;

      //initialize sound files:
      if (targetKind.current === "vocoderPhrase") {
        await initVocoderPhraseSoundFiles(trialsConditions);
      } else if (targetKind.current === "sound") {
        if (targetTask.current === "identify") {
          //init trial sound data
          var speechInNoiseConditions = trialsConditions.filter(
            (condition) => condition["targetTask"] == "identify",
          );
          await initSpeechInNoiseSoundFiles(
            speechInNoiseConditions.length
              ? speechInNoiseConditions
              : trialsConditions,
          );
        } else {
          //init trial sound data
          var toneInMelodyConditions = trialsConditions.filter(
            (condition) => condition["targetTask"] == "detect",
          );
          await initToneInMelodySoundFiles(
            toneInMelodyConditions.length
              ? toneInMelodyConditions
              : trialsConditions,
          );
        }
      }

      // Schedule all the trials in the trialList:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const _trial of trials) {
        const snapshot = trials.getSnapshot();
        trialsLoopScheduler.add(importConditions(snapshot, "trial"));
        // Instructions
        if (
          !isQuestionAndAnswerBlock(paramReader, status.block) ||
          targetKind.current === "image"
        ) {
          trialsLoopScheduler.add(trialInstructionRoutineBegin(snapshot));
          trialsLoopScheduler.add(trialInstructionRoutineEachFrame());
          trialsLoopScheduler.add(trialInstructionRoutineEnd());
        }
        // Trials
        trialsLoopScheduler.add(trialRoutineBegin(snapshot));
        trialsLoopScheduler.add(trialRoutineEachFrame(snapshot));
        trialsLoopScheduler.add(trialRoutineEnd(snapshot));
        // END LOOP
        trialsLoopScheduler.add(
          endLoopIteration(trialsLoopScheduler, snapshot),
        );
      }
      return Scheduler.Event.NEXT;
    };
  }

  async function trialsLoopEnd() {
    setCurrentFn("trialsLoopEnd");
    if (
      !isQuestionAndAnswerBlock(paramReader, status.block) &&
      (targetKind.current === "letter" ||
        targetKind.current == "sound" ||
        targetKind.current === "image" ||
        targetKind.current === "repeatedLetters" ||
        targetKind.current === "rsvpReading" ||
        targetKind.current === "movie" ||
        targetKind.current === "vernier") &&
      paramReader.read("showPercentCorrectBool", status.block_condition)
    ) {
      // Proportion correct
      showPopup(
        thisExperimentInfo.name,
        replacePlaceholders(
          readi18nPhrases("T_proportionCorrectPopup", rc.language.value),
          `${Math.round(
            (status.trialCorrect_thisBlock / status.trialCompleted_thisBlock +
              Number.EPSILON) *
              100,
          )}`,
        ),
        instructionsText.trialBreak(rc.language.value, responseType.current),
        !canClick(responseType.current), // Only show Proceed button if clicking is enabled
        false, // Show Proceed text always
      );
      await addPopupLogic(
        thisExperimentInfo.name,
        responseType.current,
        null,
        keypad.handler,
        rc.language.value,
      );
    }
    // Reset trial counter
    status.trialCorrect_thisBlock = 0;
    status.trialCompleted_thisBlock = 0;
    addBlockStaircaseSummariesToData(currentLoop, psychoJS, Screens[0]);

    // terminate loop
    psychoJS.experiment.removeLoop(trials);
    return Scheduler.Event.NEXT;
  }

  async function blocksLoopEnd() {
    setCurrentFn("blocksLoopEnd");
    psychoJS.experiment.removeLoop(blocks);

    // Update progress bar - all blocks completed (100%)
    updateExperimentProgressBar();

    return Scheduler.Event.NEXT;
  }

  // An extra routine after all the trials are finished
  // Currently made solely for the reading task
  function blockSchedulerFinalRoutineBegin(snapshot) {
    return async function () {
      setCurrentFn("blockSchedulerFinalRoutineBegin");
      loggerText("blockSchedulerFinalRoutineBegin");

      // Stop drawing reading pages
      readingParagraph.setAutoDraw(false);

      // ? Check for response type first
      showCursor();

      TrialHandler.fromSnapshot(snapshot);
      blockScheduleFinalClock.reset();
      frameN = -1;
      continueRoutine = true;

      if (paramReader.read("readingNumberOfQuestions", status.block)[0] > 0) {
        const nonEmptyPages = [
          ...readingThisBlockPages.get(status.block + "_1"),
        ].filter((s) => s.length);
        // const somePagesEmpty =
        //   nonEmptyPages.length < readingThisBlockPages.length;
        // if (somePagesEmpty && !readingCorpusDepleted.current)
        //   warning("someEmptyPages != readingCorpusDepleted");
        const numberOfQuestions = paramReader.read(
          "readingNumberOfQuestions",
          status.block,
        )[0];
        const numberOfAnswers = paramReader.read(
          "readingNumberOfPossibleAnswers",
          status.block,
        )[0];
        const corpus = paramReader.read("readingCorpus", status.block)[0];
        const freqDict = readingFrequencyToWordArchive[corpus];
        readingQuestions.current = prepareReadingQuestions(
          numberOfQuestions,
          numberOfAnswers,
          nonEmptyPages, // readingThisBlockPages,
          freqDict,
          responseType.current,
          targetKind.current,
          paramReader.read(
            "rsvpReadingRequireUniqueWordsBool",
            status.block,
          )[0],
          paramReader.read("readingCorpusFoils", status.block)[0] || "",
          paramReader.read("readingCorpusFoilsExclude", status.block)[0],
          corpus,
          paramReader.read("readingCorpusTargetsExclude", status.block)[0],
        );
        readingCurrentQuestionIndex.current = 0;
        readingClickableAnswersSetup.current = false;
        readingClickableAnswersUpdate.current = false;

        // Reading response instructions
        const customInstructions = getCustomInstructionText(
          "response",
          paramReader,
          status.block_condition,
        );

        const instructionsText =
          customInstructions && customInstructions.length > 0
            ? customInstructions
            : readi18nPhrases("T_readingTaskQuestionPrompt", rc.language.value);
        _instructionSetup(instructionsText, status.block, false, 1.0);
        updateColor(instructions, "instruction", status.block_condition);
        instructions.setAutoDraw(true);

        conditionName.setAutoDraw(showConditionNameConfig.show ?? false);
      }

      return Scheduler.Event.NEXT;
    };
  }

  function blockSchedulerFinalRoutineEachFrame() {
    setCurrentFn("blockSchedulerFinalRoutineEachFrame");
    const updateTrialInfo = () => {
      // trialCounter
      let trialCounterStr = getTrialInfoStr(
        rc.language.value,
        showCounterBool,
        showViewingDistanceBool,
        readingCurrentQuestionIndex.current + 1,
        paramReader.read("readingNumberOfQuestions", status.block)[0],
        status.nthBlock,
        totalBlocks.current,
        viewingDistanceCm.current,
        targetKind.current === "reading" ? "letter" : targetKind.current,
      );
      trialCounter.setText(trialCounterStr);
      trialCounter.setPos([window.innerWidth / 2, -window.innerHeight / 2]);
      updateColor(trialCounter, "instruction", status.block);
      trialCounter.setAutoDraw(showCounterBool);

      // tinyHint
      renderObj.tinyHint.setText("");
      updateColor(renderObj.tinyHint, "instruction", status.block);
      renderObj.tinyHint.setAutoDraw(false);
    };

    return async function () {
      if (paramReader.read("readingNumberOfQuestions", status.block)[0] <= 0)
        return Scheduler.Event.NEXT;

      t = blockScheduleFinalClock.getTime();
      frameN = frameN + 1;

      // Display actual question
      // SETUP
      if (!readingClickableAnswersSetup.current) {
        readingClickableAnswersSetup.current = true;

        const thisQuestion =
          readingQuestions.current[readingCurrentQuestionIndex.current];
        logger(
          `%c${thisQuestion.correctAnswer}`,
          `color: red; font-size: 1.5rem; font-family: ${font.name}`,
        );

        updateTrialInfo();
        setupClickableCharacterSet(
          [thisQuestion.correctAnswer, ...thisQuestion.foils].sort(),
          font.name,
          font.letterSpacing,
          "bottom",
          showCharacterSetResponse,
          (clickedWord) => {
            readingClickableAnswersUpdate.current = true;
            const correct = clickedWord === thisQuestion.correctAnswer;
            psychoJS.experiment.addData(
              "readWordIdentifiedBool",
              correct ? "TRUE" : "FALSE",
            );
            addConditionToData(
              paramReader,
              status.block_condition,
              psychoJS.experiment,
            );
            psychoJS.experiment.nextEntry();
            if (correct) correctSynth.play();
          },
          "readingAnswer",
          targetKind.current,
          status.block,
          responseType.current,
        );

        readingCurrentQuestionIndex.current++;
      }

      // UPDATE
      if (readingClickableAnswersUpdate.current) {
        readingClickableAnswersUpdate.current = false;

        if (
          readingCurrentQuestionIndex.current >= readingQuestions.current.length
        )
          return Scheduler.Event.NEXT;

        const thisQuestion =
          readingQuestions.current[readingCurrentQuestionIndex.current];
        logger(
          `%c${thisQuestion.correctAnswer}`,
          `color: red; font-size: 1.5rem; font-family: ${font.name}`,
        );

        updateTrialInfo();
        updateClickableCharacterSet(
          [thisQuestion.correctAnswer, ...thisQuestion.foils].sort(),
          showCharacterSetResponse,
          (clickedWord) => {
            readingClickableAnswersUpdate.current = true;
            const correct = clickedWord === thisQuestion.correctAnswer;
            psychoJS.experiment.addData(
              "readWordIdentifiedBool",
              correct ? "TRUE" : "FALSE",
            );
            // TODO don't call nextEntry() on the last question?
            addConditionToData(
              paramReader,
              status.block_condition,
              psychoJS.experiment,
            );
            if (correct) correctSynth.play();
            const lastQuestion =
              readingCurrentQuestionIndex.current ===
              readingQuestions.current.length;
            if (!lastQuestion) psychoJS.experiment.nextEntry();
          },
          "readingAnswer",
          targetKind.current,
          status.block,
          responseType.current,
          paramReader.read("fontTrackingForLetters", status.block)[0],
        );

        readingCurrentQuestionIndex.current++;
      }

      if (
        psychoJS.experiment.experimentEnded ||
        psychoJS.eventManager.getKeys({ keyList: ["escape"] }).length > 0
      ) {
        return quitPsychoJS("", false, paramReader);
      }

      // Continue?
      if (!continueRoutine) {
        continueRoutine = true;
        return Scheduler.Event.NEXT;
      }
      continueRoutine = true;
      // if (
      //   readingCurrentQuestionIndex.current >= readingQuestions.current.length
      // )
      //   continueRoutine = false;
      return Scheduler.Event.FLIP_REPEAT;
    };
  }

  function blockSchedulerFinalRoutineEnd() {
    return async function () {
      setCurrentFn("blockSchedulerFinalRoutineEnd");
      loggerText("blockSchedulerFinalRoutineEnd");
      removeClickableCharacterSet(showCharacterSetResponse, showCharacterSet);
      vocoderPhraseRemoveClickableCategory(showCharacterSetResponse);
      return Scheduler.Event.NEXT;
    };
  }

  /* -------------------------------------------------------------------------- */
  /*                                  NEW BLOCK                                 */
  /* -------------------------------------------------------------------------- */
  var filterComponents;
  function filterRoutineBegin(snapshot) {
    return async function () {
      setCurrentFn("filterRoutineBegin");
      TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

      showCursor();

      status.block = snapshot.block + 1;
      console.log(
        `%c====== Block ${status.block}, ${psychoJS.config.experiment.name}======`,
        "background: orange; color: white; padding: 1rem",
      );
      status.nthBlock += 1;
      totalBlocks.current = snapshot.nTotal;

      // Update progress bar when starting a new block (previous block completed)
      if (status.nthBlock > 1) {
        // Don't update on first block
        updateExperimentProgressBar();
      }

      psychoJS.fontRenderMaxPx = paramReader.read(
        "fontRenderMaxPx",
        status.block,
      )[0];

      // WIP "CSV: REMOVE, ALPHABETIZE, AND ADD PARAMETERS"
      // const screenDimensionsPx = [
      //   Screens[0].measurements.widthPx,
      //   Screens[0].measurements.heightPx,
      // ];
      // const screenDimensionsDeg = [
      //   xyDegOfPx(screenDimensionsPx[0], true),
      //   xyDegOfPx(screenDimensionsPx[1], true),
      // ];
      // psychoJS.experiment.addData("screenDimensionsDeg", screenDimensionsDeg);

      reportStartOfNewBlock(status.block, psychoJS.experiment);

      useWordDigitBool.current = getUseWordDigitBool(paramReader, status.block);

      setTargetEccentricityDeg(paramReader, status.block);

      // Reset some reading state before the new block.
      resetReadingState(readingParagraph);

      // FONT
      setFontGlobalState(status.block, paramReader);

      // if (simulatedObservers.proceed(status.block)) simulatedObservers.putOnSunglasses();

      if (
        status.nthBlock === 1 ||
        (paramReader.read("_saveEachBlockBool")[0] &&
          !simulatedObservers.proceed(status.block))
      ) {
        logger("Saving csv at start of block!");
        psychoJS.experiment.save();
      }

      //save rc.newObjectTestDistanceData to a experiment data
      if (rc.newObjectTestDistanceData) {
        psychoJS.experiment.addData(
          "distanceObjectCm",
          rc.newObjectTestDistanceData.value,
        );
        if (rc.newObjectTestDistanceData) {
          psychoJS.experiment.addData(
            "objectName",
            rc.newObjectTestDistanceData.objectName,
          );
        }
        if (rc.newObjectTestDistanceData) {
          psychoJS.experiment.addData(
            "objectSuggestion",
            rc.newObjectTestDistanceData.objectSuggestion,
          );
        }
        // psychoJS.experiment.addData(
        //   "distance1InterpupillaryPx",
        //   rc.newObjectTestDistanceData.faceMeshSamplesPage3
        //     .toString()
        //     .replace(/,/g, ", "),
        // );
        // psychoJS.experiment.addData(
        //   "distance1FactorCmPx",
        //   rc.newObjectTestDistanceData.distance1FactorCmPx,
        // );
        // psychoJS.experiment.addData(
        //   "distance2InterpupillaryPx",
        //   rc.newObjectTestDistanceData.faceMeshSamplesPage4
        //     .toString()
        //     .replace(/,/g, ", "),
        // );
        // psychoJS.experiment.addData(
        //   "distance2FactorCmPx",
        //   rc.newObjectTestDistanceData.distance2FactorCmPx,
        // );
        psychoJS.experiment.addData(
          "factorVpxCm",
          rc.averageObjectTestCalibrationFactor,
        );
        psychoJS.experiment.addData(
          "ObjectTestCameraPositionSurvey",
          rc.newObjectTestDistanceData.page0Option,
        );
        // psychoJS.experiment.addData(
        //   "viewingDistanceByObject1Cm",
        //   rc.newObjectTestDistanceData.viewingDistanceByObject1Cm,
        // );
        // psychoJS.experiment.addData(
        //   "viewingDistanceByObject2Cm",
        //   rc.newObjectTestDistanceData.viewingDistanceByObject2Cm,
        // );
      }

      if (rc.blindspotData) {
        if (rc.blindspotData.viewingDistanceByBlindSpot1Cm) {
          psychoJS.experiment.addData(
            "viewingDistanceByBlindspot1Cm",
            rc.blindspotData.viewingDistanceByBlindSpot1Cm,
          );
        }
        if (rc.blindspotData.viewingDistanceByBlindSpot2Cm) {
          psychoJS.experiment.addData(
            "viewingDistanceByBlindspot2Cm",
            rc.blindspotData.viewingDistanceByBlindSpot2Cm,
          );
        }
        if (rc.blindspotData.factorVpxCm) {
          psychoJS.experiment.addData(
            "factorVpxCm",
            rc.blindspotData.factorVpxCm,
          );
        }
      }

      // Save camera info to experiment data
      if (rc.availableCameras) {
        if (rc.availableCameras.length > 0) {
          psychoJS.experiment.addData(
            "availableCameras",
            rc.availableCameras.map((c) => c.label),
          );
        }
      }

      if (rc.measurementHistory && rc.measurementHistory.length > 0) {
        const measurementHistory = rc.measurementHistory.join("\n");
        psychoJS.experiment.addData(
          "viewingDistanceMeasurementHistory",
          measurementHistory,
        );
      }

      if (rc.selectedCamera) {
        psychoJS.experiment.addData("selectedCamera", rc.selectedCamera.label);
      }

      if (keypad.handler.inUse(status.block)) {
        keypad.handler.start();
      } else {
        keypad.handler.stop();
      }

      updateInstructionFont(paramReader, status.block, [
        instructions,
        instructions2,
        trialCounter,
      ]);

      // PRESETS
      targetKind.current = paramReader.read("targetKind", status.block)[0];
      // TODO support more
      targetTask.current = readTargetTask(`${status.block}_1`);
      // TODO move to per-trial location when (if?) move to supporting fixation pos by condition rather than just per block
      Screens[0].fixationConfig.nominalPos = getFixationPos(
        status.block,
        paramReader,
      );
      Screens[0].fixationConfig.pos = Screens[0].fixationConfig.nominalPos;
      ////

      //------Prepare to start Routine 'filter'-------
      t = 0;
      filterClock.reset(); // clock
      frameN = -1;
      continueRoutine = true; // until we're told otherwise

      // update component parameters for each repeat
      // status.block++
      thisConditionsFile = `conditions/block_${status.block}.csv`;

      /* -------------------------------------------------------------------------- */
      // ! Viewing distance
      viewingDistanceCm.desired = paramReader.read(
        "viewingDistanceDesiredCm",
        status.block,
      )[0];

      const tand = (x) => Math.tan((x * Math.PI) / 180);
      const screenWidthPx = Screens[0].window._size[0];
      const pxPerCm = Screens[0].pxPerCm;
      const screenWidthCm = screenWidthPx / pxPerCm;
      const needScreenWidthDeg = paramReader.read(
        "needScreenWidthDeg",
        status.block,
      )[0];
      viewingDistanceCm.max =
        needScreenWidthDeg === 0
          ? Infinity
          : screenWidthCm / (2 * tand(needScreenWidthDeg / 2));

      viewingDistanceCm.current = rc.viewingDistanceCm
        ? rc.viewingDistanceCm.value
        : Math.min(viewingDistanceCm.desired, viewingDistanceCm.max);
      Screens[0].viewingDistanceCm = viewingDistanceCm.current;
      Screens[0].nearestPointXYZPx =
        rc.improvedDistanceTrackingData !== undefined
          ? rc.improvedDistanceTrackingData.nearestXYPx
          : Screens[0].nearestPointXYZPx;
      /* -------------------------------------------------------------------------- */
      const getTotalTrialsThisBlock = () => {
        const possibleTrials = paramReader
          .read("conditionTrials", status.block)
          .filter(
            (c, i) => paramReader.read("conditionEnabledBool", status.block)[i],
          );
        return possibleTrials.reduce((a, b) => a + b, 0);
      };
      // Get total trials for this block
      switchTask(targetTask.current, {
        questionAndAnswer: () => {
          if (targetKind.current === "image") {
            totalTrialsThisBlock.current = getTotalTrialsThisBlock();
          } else {
            // also, prep questions
            questionsThisBlock.current = [];

            for (let i = 1; i <= 99; i++) {
              const qName = `questionAnswer${fillNumberLength(i, 2)}`;
              if (paramReader.has(qName)) {
                const question = paramReader.read(qName, status.block)[0];
                if (question && question.length)
                  questionsThisBlock.current.push(question);
              }
              // Old parameter name, ie with "And"
              const qAndName = `questionAndAnswer${fillNumberLength(i, 2)}`;
              if (paramReader.has(qAndName)) {
                const question = paramReader.read(qAndName, status.block)[0];
                if (question && question.length)
                  questionsThisBlock.current.push(question);
              }
            }

            totalTrialsThisBlock.current = questionsThisBlock.current.length;
          }
        },
        identify: () => {
          switchKind(targetKind.current, {
            vocoderPhrase: () => {
              totalTrialsThisBlock.current = getTotalTrialsThisBlock();
            },
            image: () => {
              totalTrialsThisBlock.current = getTotalTrialsThisBlock();
            },
            sound: () => {
              totalTrialsThisBlock.current = getTotalTrialsThisBlock();
            },
            reading: () => {
              totalTrialsThisBlock.current = paramReader.read(
                "readingPages",
                status.block,
              )[0];
            },
            letter: () => {
              totalTrialsThisBlock.current = getTotalTrialsThisBlock();
            },
            repeatedLetters: () => {
              totalTrialsThisBlock.current = getTotalTrialsThisBlock();
            },
            rsvpReading: () => {
              totalTrialsThisBlock.current = getTotalTrialsThisBlock();
            },
            movie: () => {
              totalTrialsThisBlock.current = getTotalTrialsThisBlock();
              // if (
              //   paramReader
              //     .read("measureLuminanceBool", status.block)
              //     .some((x) => x)
              // ) {
              //   if ("serial" in navigator) {
              //     const serialbtn = document.createElement("button");
              //     serialbtn.id = "connect-serial-button"
              //     serialbtn.innerText = "Connect to ColorCAL";
              //     serialbtn.onclick = (e) => {
              //       e.preventDefault();
              //       e.stopImmediatePropagation();
              //       e.stopPropagation();
              //       initColorCAL();
              //     };
              //     document.body.appendChild(serialbtn);
              //   } else {
              //     console.error("Web Serial API not supported in this browser");
              //   }
              // }
            },
            vernier: () => {
              totalTrialsThisBlock.current = getTotalTrialsThisBlock();
            },
          });
        },
        detect: () => {
          switchKind(targetKind.current, {
            sound: () => {
              totalTrialsThisBlock.current = getTotalTrialsThisBlock();
            },
          });
        },
      });

      // keep track of which components have finished
      filterComponents = [];

      // ! Set block params
      // stats.js
      if (ifTrue(paramReader.read("showFPSBool", status.block))) {
        stats.current.dom.style.display = "block";
        stats.on = true;
      } else if (stats.current && stats.current.dom) {
        stats.current.dom.style.display = "none";
        stats.on = false;
      }

      // RC
      // if (ifTrue(paramReader.read("calibrateTrackGazeBool", status.block))) {
      //   rc.resumeGaze();
      //   loggerText("[RC] resuming gaze");
      // } else {
      //   rc.pauseGaze();
      //   loggerText("[RC] pausing gaze");
      // }

      await showAudioOutputSelectPopup(
        status.block,
        paramReader,
        (label, value) => psychoJS.experiment.addData(label, value),
        audioTargetsToSetSinkId,
      );

      for (const thisComponent of filterComponents)
        if ("status" in thisComponent)
          thisComponent.status = PsychoJS.Status.NOT_STARTED;
      return Scheduler.Event.NEXT;
    };
  }

  function filterRoutineEachFrame() {
    return async function () {
      setCurrentFn("filterRoutineEachFrame");
      // if (simulatedObservers.proceed(status.block)) return Scheduler.Event.NEXT;

      //------Loop for each frame of Routine 'filter'-------
      // get current time
      t = filterClock.getTime();
      frameN = frameN + 1; // number of completed frames (so 0 is the first frame)
      // update/draw components on each frame
      // check for quit (typically the Esc key)
      if (
        psychoJS.experiment.experimentEnded ||
        psychoJS.eventManager.getKeys({ keyList: ["escape"] }).length > 0
      ) {
        return quitPsychoJS("", false, paramReader);
      }

      // check if the Routine should terminate
      if (!continueRoutine) {
        // a component has requested a forced-end of Routine
        continueRoutine = true;
        return Scheduler.Event.NEXT;
      }

      continueRoutine = false; // reverts to True if at least one component still running
      for (const thisComponent of filterComponents)
        if (
          "status" in thisComponent &&
          thisComponent.status !== PsychoJS.Status.FINISHED
        ) {
          continueRoutine = true;
          break;
        }

      // refresh the screen if continuing
      if (continueRoutine) {
        return Scheduler.Event.FLIP_REPEAT;
      } else {
        return Scheduler.Event.NEXT;
      }
    };
  }

  function filterRoutineEnd() {
    return async function () {
      setCurrentFn("filterRoutineEnd");
      //------Ending Routine 'filter'-------
      for (const thisComponent of filterComponents) {
        if (typeof thisComponent.setAutoDraw === "function") {
          thisComponent.setAutoDraw(false);
        }
      }
      // the Routine "filter" was not non-slip safe, so reset the non-slip timer
      routineTimer.reset();
      routineClock.reset();

      return Scheduler.Event.NEXT;
    };
  }

  /* ------------------------- Block Init Instructions ------------------------ */
  // BLOCK 1st INSTRUCTION
  function initInstructionRoutineBegin(snapshot) {
    setCurrentFn("initInstructionRoutineBegin");
    loggerText("initInstructionRoutineBegin");
    return async function () {
      // Clear tinyHint text at the start of each block to prevent carryover from previous blocks
      if (renderObj.tinyHint && renderObj.tinyHint._autoDraw) {
        renderObj.tinyHint.setText("");
        renderObj.tinyHint.setAutoDraw(false);
        if (renderObj.tinyHint._needUpdate) return Scheduler.Event.FLIP_REPEAT;
      }
      loggerText(
        `initInstructionRoutineBegin targetKind ${targetKind.current}`,
      );
      hideProgressBar();
      TrialHandler.fromSnapshot(snapshot);
      if (
        targetKind.current === "reading" &&
        paramReader.read("setResolution", status.block_condition) !== 0
      ) {
        //update resolution
        try {
          psychoJS.window.changeScaleMode("nearest", 0, "pxPerCm");
        } catch (error) {
          warning(
            `Error when trying to change resolution in initInstructionRoutineBegin, setResolution. Error: ${error}`,
          );
        }
      }
      initInstructionClock.reset(); // clock
      frameN = -1;
      continueRoutine = true;
      clickedContinue.current = false;

      const L = rc.language.value;

      responseType.current = getResponseType(
        paramReader.read("responseClickedBool", status.block)[0],
        paramReader.read("responseTypedBool", status.block)[0],
        needKeypadThisCondition(paramReader, status.block),
        paramReader.read("responseSpokenBool", status.block)[0],
        undefined,
        paramReader.read("responseSpokenBool", status.block)[0],
      );

      // set default background color for instructions
      screenBackground.colorRGBA = colorRGBASnippetToRGBA(
        paramReader.read("screenColorRGBA", status.block)[0],
      );
      psychoJS.window.color = new util.Color(screenBackground.colorRGBA);
      psychoJS.window._needUpdate = true; // ! dangerous

      thresholdParameter = paramReader.read(
        "thresholdParameter",
        status.block,
      )[0];

      switchKind(targetKind.current, {
        vocoderPhrase: () => {
          //setup instruction
          const instr = instructionsText.vocoderPhraseBegin(L);
          _instructionSetup(
            (snapshot.block === 0 ? instructionsText.initial(L) : "") + instr,
            status.block,
            true,
            1.0,
          );
        },
        image: () => {
          //setup instruction
          const instr = instructionsText.imageBegin(
            L,
            totalTrialsThisBlock.current,
          );
          _instructionSetup(instr, status.block, true, 1.0);
        },
        sound: () => {
          const instr =
            targetTask.current == "identify"
              ? instructionsText.speechInNoiseBegin(L)
              : instructionsText.soundBegin(L);
          _instructionSetup(
            (snapshot.block === 0 ? instructionsText.initial(L) : "") + instr,
            status.block,
            true,
            1.0,
          );
        },
        letter: () => {
          const letterBlockInstructionText =
            (snapshot.block === 0 ? instructionsText.initial(L) : "") +
            instructionsText.initialByThresholdParameter[thresholdParameter](
              L,
              responseType.current,
              totalTrialsThisBlock.current,
            ) +
            instructionsText.initialEnd(L, responseType.current);
          _instructionSetup(
            letterBlockInstructionText,
            status.block,
            true,
            1.0,
          );
        },
        repeatedLetters: () => {
          const repeatedLettersBlockInstructs =
            (snapshot.block === 0 ? instructionsText.initial(L) : "") +
            instructionsText.initialByThresholdParameter[thresholdParameter](
              L,
              responseType.current,
              totalTrialsThisBlock.current,
            ) +
            instructionsText.initialEnd(L, responseType.current);
          _instructionSetup(
            repeatedLettersBlockInstructs,
            status.block,
            true,
            1.0,
          );
        },
        rsvpReading: () => {
          renderObj.tinyHint.setAutoDraw(false);
          const rsvpReadingBlockInstructs =
            (snapshot.block === 0 ? instructionsText.initial(L) : "") +
            instructionsText.initialByThresholdParameter["timing"](
              L,
              responseType.current,
              paramReader
                .read("conditionTrials", status.block)
                .reduce((a, b) => a + b),
            );
          _instructionSetup(rsvpReadingBlockInstructs, status.block, true, 1.0);
          rsvpReadingResponse.responseTypeForCurrentBlock = paramReader
            .read("responseSpokenToExperimenterBool", status.block)
            .map((x) => (x ? "spoken" : "silent"));
          rsvpReadingWordsForThisBlock.current = getThisBlockRSVPReadingWords(
            paramReader,
            status.block,
          );
        },
        reading: () => {
          // TODO should the number of pages be changed if different from nominal?
          //      eg the end of corpus is reached before readingPages of text
          _instructionSetup(
            (snapshot.block === 0 ? instructionsText.initial(L) : "") +
              instructionsText.readingEdu(
                L,
                paramReader.read("readingPages", status.block)[0],
              ),
            status.block,
            true,
            1.0,
          );

          renderObj.tinyHint.setText(
            paramReader.read("showPageTurnInstructionBool", status.block)[0]
              ? readi18nPhrases("T_readingNextPage", rc.language.value)
              : "",
          );
          updateColor(renderObj.tinyHint, "instruction", status.block);
          renderObj.tinyHint.setPos([0, -window.innerHeight / 2]);
          renderObj.tinyHint.setAutoDraw(true);

          // instructions.setAutoDraw(false)
          instructions2.setAutoDraw(false);
          // fixation.setAutoDraw(false);
          target.setAutoDraw(false);
          flanker1.setAutoDraw(false);
          flanker2.setAutoDraw(false);
          flanker3.setAutoDraw(false);
          flanker4.setAutoDraw(false);

          readingParagraph.setCurrentCondition(status.block + "_1");

          readingParagraph.setFont(font.name);
          readingParagraph.setLetterSpacingByProportion(font.letterSpacing);

          // psychoJS.window.color = new util.Color(colorRGBSnippetToRGB(
          //   screenBackground.colorRGB
          // ))
          // psychoJS.window._needUpdate = true; // ! dangerous

          fontCharacterSet.current = String(
            paramReader.read("fontCharacterSet", status.block)[0],
          ).split("");

          // LTR or RTL
          let readingDirectionLTR = paramReader.read(
            "fontLeftToRightBool",
            status.block,
          )[0];
          readingParagraph.setAlignHoriz(
            readingDirectionLTR ? "left" : "right",
          );

          // Nominal number of lines of text per page
          const readingLinesPerPage = paramReader.read(
            "readingLinesPerPage",
            status.block,
          )[0];
          readingParagraph.setLinesPerPage(readingLinesPerPage);

          // POS
          const posDeg = [
            paramReader.read("targetEccentricityXDeg", status.block)[0],
            paramReader.read("targetEccentricityYDeg", status.block)[0],
          ];
          const posPx = XYPxOfDeg(0, posDeg);
          readingParagraph.setPos(posPx);

          // FONT CHARACTER SET
          readingParagraph.setCharacterSetRect(
            characterSetBoundingRects[status.block + "_1"],
          );

          // HEIGHT
          readingConfig.height = findReadingSize(
            paramReader.read("readingSetSizeBy", status.block)[0],
            paramReader,
            readingParagraph,
            "block",
          );
          readingParagraph.setHeight(readingConfig.height);
          fontSize.current = readingConfig.height;

          // LINE SPACING
          psychoJS.experiment.addData(
            "readingLineSpacingPx",
            readingParagraph.getLineSpacing(),
          );

          // Construct this block pages
          getThisBlockPages(paramReader, status.block, readingParagraph);
          const firstCondition = status.block + "_1";
          const longestReadingLineLength = Math.max(
            ...readingThisBlockPages
              .get(firstCondition) // TODO make `reading` correctly handle multiple interleaved conditions
              .map((p) => p.split("\n"))
              .flat()
              .map((s) => s.length),
          );
          const widestReadingPageMask = readingThisBlockPages
            .get(firstCondition)
            .map((page) =>
              page
                .split("\n")
                .some((l) => l.length == longestReadingLineLength),
            );
          const widestReadingPage = readingThisBlockPages
            .get(firstCondition)
            .filter((p, i) => widestReadingPageMask[i])
            .pop();
          // Position the pages of the reading paragraph based on the size of the widest page of text in this block.
          // ie `readingBlockWidthPx = maxPixPerLine` (as calculated by setting the stim to this text)
          readingParagraph.setWidestText(widestReadingPage);
          // Use consistent nLines per page w/in a block -- but may be limited
          // (ie by the screen size) to be fewer than the nominal, `readingLinesPerPage`
          if (
            readingConfig.actualLinesPerPage &&
            readingConfig.actualLinesPerPage !== readingLinesPerPage
          )
            readingParagraph.setLinesPerPage(readingConfig.actualLinesPerPage);
        },
        movie: () => {
          loggerText("inside movie");
          _instructionSetup(
            snapshot.block === 0 ? instructionsText.initial(L) : "",
            status.block,
            true,
            1.0,
          );
        },
        vernier: () => {
          const vernierBlockInstructionText =
            (snapshot.block === 0 ? instructionsText.initial(L) : "") +
            instructionsText.vernierBegin(
              L,
              responseType.current,
              totalTrialsThisBlock.current,
            ) +
            instructionsText.vernierInitialEnd(L, responseType.current);
          _instructionSetup(
            vernierBlockInstructionText,
            status.block,
            true,
            1.0,
          );
        },
      });

      clickedContinue.current = false;
      if (canClick(responseType.current) && targetKind.current !== "reading")
        addProceedButton(rc.language.value, paramReader);

      if (
        keypad.handler.inUse(status.block) &&
        targetKind.current !== "reading"
      ) {
        await keypad.handler.update([], "sans-serif", undefined, true);
      }

      if (targetKind.current !== "image") {
        addBeepButton(L, correctSynth);
      }

      psychoJS.eventManager.clearKeys();
      keypad.handler.clearKeys(status.block_condition);

      // reset takeABreak state
      currentBlockCreditForTrialBreak = 0;
      hideTrialBreakProgressBar();

      let trialCounterStr = getTrialInfoStr(
        L,
        paramReader.read("showCounterBool", status.block)[0],
        paramReader.read("showViewingDistanceBool", status.block)[0],
        undefined,
        undefined,
        status.nthBlock,
        totalBlocks.current,
        viewingDistanceCm.current,
        targetKind.current,
      );
      trialCounter.setText(trialCounterStr);

      updateColor(trialCounter, "instruction", status.block);
      trialCounter.setAutoDraw(true);

      conditionName.setAutoDraw(false);

      customInstructionText.current = getCustomInstructionText(
        "block",
        paramReader,
        status.block,
      );
      if (customInstructionText.current.length)
        _instructionSetup(
          customInstructionText.current,
          status.block,
          true,
          1.0,
        );

      // _testPxDegConversion();
      return Scheduler.Event.NEXT;
    };
  }

  function initInstructionRoutineEachFrame() {
    return () => {
      setCurrentFn("initInstructionRoutineEachFrame");
      if (customInstructionText.current.includes("#NONE")) {
        removeProceedButton();
        return Scheduler.Event.NEXT;
      }
      return _instructionRoutineEachFrame();
    };
  }

  function initInstructionRoutineEnd() {
    return async function () {
      setCurrentFn("initInstructionRoutineEnd");
      instructions.setAutoDraw(false);
      keypad.handler.clearKeys();
      // if (keypadActive(responseType.current)) keypad.handler.stop(); // Necessary??

      removeBeepButton();

      psychoJS.experiment.addData(
        "initInstructionRoutineDurationFromBeginSec",
        initInstructionClock.getTime(),
      );
      psychoJS.experiment.addData(
        "initInstructionRoutineDurationFromPreviousEndSec",
        routineClock.getTime(),
      );

      /* ----------------------------------- RC ----------------------------------- */
      if (rc.viewingDistanceData.length || rc.screenData.length)
        saveCalibratorData(paramReader, rc, psychoJS);
      if (ifAnyCheck(paramReader)) saveCheckData(rc, psychoJS);

      initInstructionClock.reset();
      routineTimer.reset();
      routineClock.reset();

      return Scheduler.Event.NEXT;
    };
  }

  /* ------------------------- Block Edu Instructions ------------------------- */

  function eduInstructionRoutineBegin(snapshot) {
    return async function () {
      setCurrentFn("eduInstructionRoutineBegin");
      eduInstructionClock.reset();

      TrialHandler.fromSnapshot(snapshot);

      clickedContinue.current = false;
      if (canClick(responseType.current))
        addProceedButton(rc.language.value, paramReader);

      thresholdParameter = paramReader.read(
        "thresholdParameter",
        status.block,
      )[0];
      switchKind(targetKind.current, {
        letter: () => {
          // IDENTIFY
          _instructionSetup(
            instructionsText.edu[thresholdParameter](rc.language.value),
            status.block,
            true,
            1.0,
          );
          instructionsConfig.height = getParamValueForBlockOrCondition(
            "instructionFontSizePt",
            status.block,
          );
        },
        rsvpReading: () =>
          loggerText("TODO rsvpLetter eduInstructionRoutineBegin"),
        movie: () => {
          // IDENTIFY
          _instructionSetup(
            instructionsText.edu["spacingDeg"](rc.language.value),
            status.block,
            true,
            1.0,
          );

          instructions2.setAutoDraw(false);

          instructionsConfig.height = getParamValueForBlockOrCondition(
            "instructionFontSizePt",
            status.block,
          );
          dynamicSetSize([instructions], instructionsConfig.height);

          var h = 50;

          fixation.setVertices(getFixationVertices(h));
          fixation.setLineWidth(5);
          fixation.setPos([0, 0]);
          fixation.setColor(
            colorRGBASnippetToRGBA(
              paramReader.read("markingColorRGBA", status.block)[0],
            ),
          );
          fixation.setAutoDraw(true);
        },
        vernier: () => {
          _instructionSetup(
            instructionsText.edu[thresholdParameter](rc.language.value),
            status.block,
            true,
            1.0,
          );
          instructions2.setAutoDraw(false);
          instructionsConfig.height = getParamValueForBlockOrCondition(
            "instructionFontSizePt",
            status.block,
          );
          dynamicSetSize([instructions], instructionsConfig.height);
          fixation.setAutoDraw(false);
          vernier.setAutoDraw(false);
        },
      });

      psychoJS.eventManager.clearKeys();
      keypad.handler.clearKeys();

      // if (keypadActive(responseType.current)) keypad.handler.start();
      return Scheduler.Event.NEXT;
    };
  }

  function eduInstructionRoutineEachFrame() {
    return () => {
      setCurrentFn("eduInstructionRoutineEachFrame");
      if (customInstructionText.current) {
        customInstructionText.current = "";
        removeProceedButton();
        return Scheduler.Event.NEXT;
      }
      return _instructionRoutineEachFrame();
    };
  }

  function eduInstructionRoutineEnd() {
    return async function () {
      setCurrentFn("eduInstructionRoutineEnd");
      instructions.setAutoDraw(false);
      // if (keypadActive(responseType.current)) keypad.handler.stop(); Necessary??

      switchKind(targetKind.current, {
        reading: () => {
          // READING
        },
        letter: () => {
          instructions2.setAutoDraw(false);

          target.setAutoDraw(false);
          flanker1.setAutoDraw(false);
          flanker2.setAutoDraw(false);
          flanker3.setAutoDraw(false);
          flanker4.setAutoDraw(false);

          psychoJS.experiment.addData(
            "eduInstructionRoutineDurationFromBeginSec",
            eduInstructionClock.getTime(),
          );
          psychoJS.experiment.addData(
            "eduInstructionRoutineDurationFromPreviousEndSec",
            routineClock.getTime(),
          );
        },
        rsvpReading: () => {
          loggerText("TODO rsvpReading eduInstructionRoutineEnd");
        },
        vernier: () => {
          instructions2.setAutoDraw(false);
          vernier.setAutoDraw(false);
          vernier.status = PsychoJS.Status.NOT_STARTED;
        },
      });

      fixation.setAutoDraw(false);
      eduInstructionClock.reset();
      routineTimer.reset();
      routineClock.reset();

      return Scheduler.Event.NEXT;
    };
  }

  // function blockInstructionRoutineBegin(snapshot) {
  //   return async function () {
  //     TrialHandler.fromSnapshot(snapshot);
  //     _instructionSetup(instructionsText.block(snapshot.block + 1), snapshot.block+1);

  //     clickedContinue.current = false;
  //     document.addEventListener("click", _clickContinue);
  //     document.addEventListener("touchend", _clickContinue);

  //     return Scheduler.Event.NEXT;
  //   };
  // }

  // function blockInstructionRoutineEachFrame() {
  //   return _instructionRoutineEachFrame;
  // }

  // function blockInstructionRoutineEnd() {
  //   return _instructionRoutineEnd;
  // }

  var level;

  var validAns = [];
  var [targetCharacter, ...flankerCharacters] = ["", []];
  var showCounterBool;
  var showViewingDistanceBool;

  var showBoundingBox;
  var showCharacterSetBoundingBox;
  var stimulusParameters;
  var stimulusComputedBool;
  var thresholdParameter;

  var trialComponents;
  var allFlankers, flankersUsed, numFlankersNeeded;

  // Credit
  var currentBlockCreditForTrialBreak = 0;

  // Used in getStimulus for targetKind=letter
  var letterTextStims, letterCharacters;

  // Runs before every trial to set up for the trial
  function trialInstructionRoutineBegin(snapshot) {
    return async function () {
      // Clear tinyHint text at the start of each trial to prevent carryover from previous trials
      if (renderObj.tinyHint && renderObj.tinyHint._autoDraw) {
        renderObj.tinyHint.setText("");
        renderObj.tinyHint.setAutoDraw(false);
        if (renderObj.tinyHint._needUpdate) return Scheduler.Event.FLIP_REPEAT;
      }
      // ! distance
      // reset tracking target distance
      showTimingBarsBool.current = paramReader.read(
        "showTimingBarsBool",
        status.block_condition,
      );
      viewingDistanceCm.desired = paramReader.read(
        "viewingDistanceDesiredCm",
        status.block_condition,
      );
      const tand = (x) => Math.tan((x * Math.PI) / 180);
      const screenWidthPx = Screens[0].window._size[0];
      const pxPerCm = Screens[0].pxPerCm;
      const screenWidthCm = screenWidthPx / pxPerCm;
      const needScreenWidthDeg = paramReader.read(
        "needScreenWidthDeg",
        status.block,
      );
      const maxNeedScreenWidthDeg = Math.max(...needScreenWidthDeg);
      viewingDistanceCm.max =
        maxNeedScreenWidthDeg === 0
          ? Infinity
          : screenWidthCm / (2 * tand(maxNeedScreenWidthDeg / 2));
      rc.setViewingDistanceAllowedPreciseBool(
        paramReader.read(
          "viewingDistanceAllowedPreciseBool",
          status.block_condition,
        ),
      );
      trialComponents = [];
      //only for reading
      if (
        targetKind.current === "reading" &&
        paramReader.read("setResolution", status.block_condition) !== 0
      ) {
        const setResolution = paramReader.read(
          "setResolution",
          status.block_condition,
        );
        const setResolutionUnit = paramReader.read(
          "setResolutionUnit",
          status.block_condition,
        );
        const setResolutionSmoothingBool = paramReader.read(
          "setResolutionSmoothingBool",
          status.block_condition,
        );
        try {
          psychoJS.window.changeScaleMode(
            setResolutionSmoothingBool ? "linear" : "nearest",
            setResolution,
            setResolutionUnit,
          );
        } catch (error) {
          warning(
            `Error when trying to change resolution in trialInstructionRoutineBegin for reading, setResolution. Error: ${error}`,
          );
        }
      }
      if (
        ifTrue(paramReader.read("calibrateDistanceBool", status.block)) &&
        !rc.calibrationSimulatedBool
      ) {
        loggerText("[RC] resuming distance");

        if (rc.setDistanceDesired) {
          // rc.pauseNudger();
          rc.setDistanceDesired(
            Math.min(viewingDistanceCm.desired, viewingDistanceCm.max),
            paramReader.read(
              "viewingDistanceAllowedRatio",
              status.block_condition,
            ) == 0
              ? 99
              : paramReader.read(
                  "viewingDistanceAllowedRatio",
                  status.block_condition,
                ),
            paramReader.read("needKeypadBeyondCm", status.block_condition),
          );
        }

        viewingDistanceCm.current = rc.viewingDistanceCm
          ? rc.viewingDistanceCm.value
          : Math.min(viewingDistanceCm.desired, viewingDistanceCm.max);
        Screens[0].viewingDistanceCm = viewingDistanceCm.current;

        Screens[0].nearestPointXYZPx =
          rc.improvedDistanceTrackingData !== undefined
            ? rc.improvedDistanceTrackingData.nearestXYPx
            : Screens[0].nearestPointXYZPx;

        rc.resumeDistance(paramReader.read("_showIrisesBool")[0] || false);
        rc.resumeNudger();
      }
      setCurrentFn("trialInstructionRoutineBegin");
      markingShowCursorBool.current = paramReader.read(
        "markingShowCursorBool",
        status.block_condition,
      );
      if (!markingShowCursorBool.current) {
        hideCursor();
      }
      // Check fullscreen and if not, get fullscreen
      if (!psychoJS.window._windowAlreadyInFullScreen && !debug) {
        try {
          await rc.getFullscreen();
        } catch (error) {
          warning(
            `Error when trying to get full screen in trialInstructionRoutineBegin. Error: ${error}`,
          );
        }
        await sleep(1000);
      }
      trialInstructionClock.reset();
      TrialHandler.fromSnapshot(snapshot);

      // Number of responses required before the current (psychojs) trial ends
      // For all current targetKinds this is 1.
      responseType.numberOfResponses =
        targetKind.current === "repeatedLetters" ? 2 : 1;

      logQuest(
        `NEW TRIAL ${status.block_condition} ${
          psychoJS.config.experiment.name ? psychoJS.config.experiment.name : ""
        }`,
      );

      const letterSetResponseType = (rsvpReadingBool = false) => {
        // ! responseType
        // AKA prestimulus=false, ie the instructions we use at response-time
        responseType.original = getResponseType(
          paramReader.read("responseClickedBool", status.block_condition),
          paramReader.read("responseTypedBool", status.block_condition),
          needKeypadThisCondition(paramReader, status.block_condition),
          paramReader.read("responseSpokenBool", status.block_condition),
          paramReader.read(
            "responseMustTrackContinuouslyBool",
            status.block_condition,
          ),
          paramReader.read(
            "responseSpokenToExperimenterBool",
            status.block_condition,
          ) && rsvpReadingBool,
          false,
        );
        // AKA prestimulus=true, ie the instructions we use at fixation tracking-time
        responseType.current = getResponseType(
          paramReader.read("responseClickedBool", status.block_condition),
          paramReader.read("responseTypedBool", status.block_condition),
          needKeypadThisCondition(paramReader, status.block_condition),
          paramReader.read("responseSpokenBool", status.block_condition),
          paramReader.read(
            "responseMustTrackContinuouslyBool",
            status.block_condition,
          ),
          paramReader.read(
            "responseSpokenToExperimenterBool",
            status.block_condition,
          ) && rsvpReadingBool,
        );
        if (canClick(responseType.current) && markingShowCursorBool.current)
          showCursor();
      };

      switchKind(targetKind.current, {
        vocoderPhrase: () => {
          for (let c of snapshot.handler.getConditions()) {
            if (c.block_condition === trials._currentStaircase._name) {
              status.condition = c;
              status.block_condition = status.condition["block_condition"];
            }
          }
        },
        image: () => {
          for (let c of snapshot.handler.getConditions()) {
            if (c.block_condition === trials._currentStaircase._name) {
              status.condition = c;
              status.block_condition = status.condition["block_condition"];
            }
          }
          letterSetResponseType();
        },
        sound: () => {
          for (let c of snapshot.handler.getConditions()) {
            if (c.block_condition === trials._currentStaircase._name) {
              status.condition = c;
              status.block_condition = status.condition["block_condition"];
            }
          }
        },
        reading: () => {
          status.condition = snapshot.getCurrentTrial();
          status.block_condition = trials.thisTrial.block_condition;
        },
        letter: () => {
          for (let c of snapshot.handler.getConditions()) {
            if (c.block_condition === trials._currentStaircase._name) {
              status.condition = c;
              status.block_condition = status.condition["block_condition"];
            }
          }
          letterSetResponseType();
        },
        rsvpReading: () => {
          t;
          for (let c of snapshot.handler.getConditions()) {
            if (c.block_condition === trials._currentStaircase._name) {
              status.condition = c;
              status.block_condition = status.condition["block_condition"];
            }
          }
          letterSetResponseType(true);
        },
        repeatedLetters: () => {
          for (let c of snapshot.handler.getConditions()) {
            if (c.block_condition === trials._currentStaircase._name) {
              status.condition = c;
              status.block_condition = status.condition["block_condition"];
            }
          }
          letterSetResponseType();
        },
        movie: () => {
          for (let c of snapshot.handler.getConditions()) {
            if (c.block_condition === trials._currentStaircase._name) {
              status.condition = c;
              status.block_condition = status.condition["block_condition"];
            }
          }
          letterSetResponseType();
        },
        vernier: () => {
          for (let c of snapshot.handler.getConditions()) {
            if (c.block_condition === trials._currentStaircase._name) {
              status.condition = c;
              status.block_condition = status.condition["block_condition"];
            }
          }
          letterSetResponseType();
        },
      });

      //if showProgressBarBool, show status bar
      const showProgressBarBool = paramReader.read(
        "showProgressBarBool",
        status.block_condition,
      );
      if (showProgressBarBool) showProgressBar();

      /* --------------------------------- PUBLIC --------------------------------- */

      const reader = paramReader;
      const BC = status.block_condition;
      thresholdParameter = reader.read("thresholdParameter", BC);

      // ! trigger fake error
      if (reader.read("errorBool", BC)) {
        reader.read("xyz", BC);
      }
      let proposedLevel;
      if (
        (targetKind.current === "sound" || thresholdParameter) &&
        currentLoop?._currentStaircase
      ) {
        proposedLevel = currentLoop._currentStaircase.getQuestValue();
        psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);
        proposedLevel = Math.min(
          proposedLevel,
          Math.log10(
            paramReader.read("thresholdParameterMax", status.block_condition),
          ),
        );
        psychoJS.experiment.addData(
          "levelConstrainedByThresholdParameterMax",
          proposedLevel,
        );
      }

      setTargetEccentricityDeg(reader, BC);

      screenBackground.colorRGBA = colorRGBASnippetToRGBA(
        reader.read("screenColorRGBA", BC),
      );

      showCounterBool = reader.read("showCounterBool", BC);
      showViewingDistanceBool = reader.read("showViewingDistanceBool", BC);

      fontCharacterSet.current = String(
        reader.read("fontCharacterSet", BC),
      ).split("");
      fontCharacterSet.where = reader.read("showCharacterSetWhere", BC);

      showBoundingBox = reader.read("showBoundingBoxBool", BC);
      showCharacterSetBoundingBox = reader.read(
        "showCharacterSetBoundingBoxBool",
        BC,
      );

      if (
        !simulatedObservers.proceed(BC) &&
        keypad.handler.inUse(BC) &&
        paramReader.read("targetKind", status.block_condition) !== "rsvpReading"
      ) {
        const alphabet = reader.read("fontLeftToRightBool")
          ? [...fontCharacterSet.current]
          : [...fontCharacterSet.current].reverse();
        await keypad.handler.update(alphabet, "sans-serif", BC, true);
        if (keypad.handler.inUse(BC) && !keypad.handler.acceptingResponses) {
          keypad.handler.start();
        }
      }

      showConditionNameConfig.show = paramReader.read(
        "showConditionNameBool",
        BC,
      );
      showConditionNameConfig.name = paramReader.read("conditionName", BC);
      showConditionNameConfig.showTargetSpecs = paramReader.read(
        "showTargetSpecsBool",
        BC,
      );

      /* --------------------------------- /PUBLIC -------------------------------- */

      usingGaze.current = paramReader.read("calibrateTrackGazeBool", BC);

      // used in multiple kinds
      letterConfig.markingOnsetAfterTargetOffsetSecs = reader.read(
        "markingOnsetAfterTargetOffsetSecs",
        BC,
      );

      letterConfig.targetDurationSec = reader.read("targetDurationSec", BC);
      letterConfig.delayBeforeStimOnsetSec = reader.read(
        "markingOffsetBeforeTargetOnsetSecs",
        BC,
      );

      // if to add fake connections
      font.medialShapeResponse = reader.read("fontMedialShapeResponseBool", BC);
      font.medialShapeTarget = reader.read("fontMedialShapeTargetBool", BC);
      font.fontPositionalShapeResponse = reader.read(
        "fontPositionalShapeResponse",
        BC,
      );

      /* -------------------------------------------------------------------------- */
      // set background color
      psychoJS.window.color = new util.Color(screenBackground.colorRGBA);
      psychoJS.window._needUpdate = true; // ! dangerous
      /* -------------------------------------------------------------------------- */

      showTimingBarsBool.current = paramReader.read(
        "showTimingBarsBool",
        status.block_condition,
      );

      switchKind(targetKind.current, {
        vocoderPhrase: () => {
          //change instructions
          _instructionSetup(
            instructionsText.trial.fixate["vocoderPhrase"](rc.language.value),
            status.block_condition,
            false,
            1.0,
          );

          ProposedVolumeLevelFromQuest.current = proposedLevel * 20;

          // Use dbSPL from speaker-calibration, or from `soundGainDBSPL` parameter if undefined
          soundGainDBSPL.current =
            typeof soundGainDBSPL.current !== "undefined"
              ? soundGainDBSPL.current
              : paramReader.read("soundGainDBSPL", status.block_condition);

          psychoJS.experiment.addData(
            "usedSoundGainDBSPL",
            soundGainDBSPL.current,
          );

          whiteNoiseLevel.current = paramReader.read(
            "targetSoundNoiseDBSPL",
            status.block_condition,
          );
          targetSoundFolder.current = paramReader.read(
            "targetSoundFolder",
            status.block_condition,
          );
          maskerVolumeDbSPL.current = paramReader.read(
            "maskerSoundDBSPL",
            status.block_condition,
          );
          maskerSoundFolder.current = paramReader.read(
            "maskerSoundFolder",
            status.block_condition,
          );
          if (showConditionNameConfig.showTargetSpecs) {
            updateTargetSpecsForSoundDetect(
              "-INF",
              maskerVolumeDbSPL.current,
              soundGainDBSPL.current,
              whiteNoiseLevel.current,
              targetSoundFolder.current,
              maskerSoundFolder.current,
            );
          }
          trialComponents.push(key_resp);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);
        },
        sound: () => {
          _instructionSetup(
            instructionsText.trial.fixate["sound"](rc.language.value),
            status.block_condition,
            false,
            1.0,
          );

          ProposedVolumeLevelFromQuest.current = proposedLevel * 20;
          if (
            paramReader.read("thresholdParameter", status.block_condition) !==
            "targetSoundDBSPL"
          ) {
            ProposedVolumeLevelFromQuest.current = paramReader.read(
              "targetSoundDBSPL",
              status.block_condition,
            );
          }

          // Use dbSPL from speaker-calibration, or from `soundGainDBSPL` parameter if undefined
          soundGainDBSPL.current =
            typeof soundGainDBSPL.current !== "undefined"
              ? soundGainDBSPL.current
              : paramReader.read("soundGainDBSPL", status.block_condition);
          psychoJS.experiment.addData(
            "usedSoundGainDBSPL",
            soundGainDBSPL.current,
          );

          whiteNoiseLevel.current = paramReader.read(
            "targetSoundNoiseDBSPL",
            status.block_condition,
          );
          targetSoundFolder.current = paramReader.read(
            "targetSoundFolder",
            status.block_condition,
          );

          if (targetTask.current == "detect") {
            maskerVolumeDbSPL.current = paramReader.read(
              "maskerSoundDBSPL",
              status.block_condition,
            );
            maskerSoundFolder.current = paramReader.read(
              "maskerSoundFolder",
              status.block_condition,
            );
            if (showConditionNameConfig.showTargetSpecs)
              updateTargetSpecsForSoundDetect(
                "-INF",
                maskerVolumeDbSPL.current,
                soundGainDBSPL.current,
                whiteNoiseLevel.current,
                targetSoundFolder.current,
                maskerSoundFolder.current,
              );
          } else if (targetTask.current == "identify") {
            if (showConditionNameConfig.showTargetSpecs)
              updateTargetSpecsForSoundIdentify(
                "-INF",
                soundGainDBSPL.current,
                whiteNoiseLevel.current,
                targetSoundFolder.current,
              );
          }

          trialComponents.push(key_resp);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);
        },

        image: () => {
          _instructionSetup(
            instructionsText.trial.fixate["image"](
              rc.language.value,
              paramReader.read("responseMustTrackContinuouslyBool", BC)
                ? 3
                : responseType.current,
            ),
            status.block_condition,
            false,
            0.25,
          );

          clickedContinue.current = false;
          fixation.tStart = t;
          fixation.frameNStart = frameN;
          readTrialLevelImageParams(BC);
          addHandlerForClickingFixation(reader);
          fixation._updateStaticState(paramReader, BC);

          fixation.update(
            paramReader,
            BC,
            40, //TODO: used to be stimulusParameters.heightPx? but we get the heightPx after fixation click now. The value above is an arbitrary value.
            [0, 0], // same as above
          );
          fixation.setPos(Screens[0].fixationConfig.pos);
          psychoJS.experiment.addData(
            "markingFixationHotSpotRadiusPx",
            Screens[0].fixationConfig.markingFixationHotSpotRadiusPx,
          );

          if (showConditionNameConfig.showTargetSpecs) {
            updateTargetSpecsForImage(
              imageConfig.targetSizeDeg,
              imageConfig.targetDurationSec,
              imageConfig.targetEccentricityXDeg,
              imageConfig.targetEccentricityYDeg,
              imageConfig.thresholdParameter,
              imageConfig.targetSizeIsHeightBool,
              imageConfig.targetImageFolder,
              imageConfig.targetImageReplacementBool,
            );
          }

          trialComponents.push(key_resp);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);
        },

        reading: () => {
          loggerText("READING TASK INSTRUCTIONS BEGIN");
          t = 0;
          instructionsClock.reset(); // clock
          frameN = -1;
          // continueRoutine = true;

          // tinyHint
          renderObj.tinyHint.setText(
            paramReader.read(
              "showPageTurnInstructionBool",
              status.block_condition,
            )
              ? readi18nPhrases("T_readingNextPage", rc.language.value)
              : "",
          );
          updateColor(
            renderObj.tinyHint,
            "instruction",
            status.block_condition,
          );
          renderObj.tinyHint.setAutoDraw(true);

          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecsForReading(
              reader,
              BC,
              thisExperimentInfo.experimentFilename,
            );

          readingParagraph.setCurrentCondition(status.block_condition);

          defineTargetForCursorTracking(readingParagraph);

          trialComponents.push(key_resp);
          // trialComponents.push(...readingParagraph.stims);
          // trialComponents.push(readingParagraph.boundingBoxVisualRect);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);
        },
        letter: () => {
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
          /* ----------------- LETTER Trial Instruction Routine BEGIN ----------------- */
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */

          // TODO figure out a way to gracefully incorporate "responseMustTrackCrosshairBool" into responseType. Temp adhoc fix (just in this case) is to use 3.
          _instructionSetup(
            instructionsText.trial.fixate["spacingDeg"](
              rc.language.value,
              paramReader.read("responseMustTrackContinuouslyBool", BC)
                ? 3
                : responseType.current,
            ),
            status.block_condition,
            false,
            0.25,
          );

          fixation.tStart = t;
          fixation.frameNStart = frameN;
          // fixation.setAutoDraw(true);

          clickedContinue.current = false;
          drawTimingBars(showTimingBarsBool.current, "fixation", true);
          drawTimingBars(showTimingBarsBool.current, "target", false);
          drawTimingBars(showTimingBarsBool.current, "TargetRequest", false);
          drawTimingBars(showTimingBarsBool.current, "gap", false);
          addHandlerForClickingFixation(reader);

          TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

          // let proposedLevel = currentLoop._currentStaircase.getQuestValue();
          // TODO
          // ! where are the other font information?

          // update component parameters for each repeat
          Screens[0].measurements.widthCm = rc.screenWidthCm
            ? rc.screenWidthCm.value
            : 30;
          Screens[0].measurements.widthPx = rc.displayWidthPx.value;
          Screens[0].pxPerCm =
            Screens[0].measurements.widthPx / Screens[0].measurements.widthCm;
          if (!rc.screenWidthCm)
            console.warn(
              "[Screen Width] Using arbitrary screen width. Enable RC.",
            );

          readTrialLevelLetterParams(reader, BC);
          readAllowedTolerances(tolerances, reader, BC);

          validAns = String(reader.read("fontCharacterSet", BC))
            .toLowerCase()
            .split("");

          showCharacterSetBoundingBox = reader.read(
            "showCharacterSetBoundingBoxBool",
            BC,
          );

          const atLeastTwoFlankersNeeded =
            thresholdParameter === "spacingDeg" &&
            letterConfig.spacingRelationToSize !== "typographic";
          const fourFlankersNeeded = [
            "horizontalAndVertical",
            "radialAndTangential",
          ].includes(letterConfig.spacingDirection);
          numFlankersNeeded = atLeastTwoFlankersNeeded
            ? fourFlankersNeeded
              ? 4
              : 2
            : 0;
          allFlankers = [flanker1, flanker2, flanker3, flanker4];
          flankersUsed = allFlankers.slice(0, numFlankersNeeded);
          const unusedFlanksers = allFlankers.filter(
            (f) => !flankersUsed.includes(f),
          );
          unusedFlanksers.forEach((f) => {
            if (f && f.setAutoDraw) f.setAutoDraw(false);
          });

          const numberOfTargetsAndFlankers = fourFlankersNeeded ? 5 : 3;
          /* ------------------------------ Pick triplets ----------------------------- */
          if (fontCharacterSet.current.length < numberOfTargetsAndFlankers)
            throw new Error(
              `[EasyEyes experiment configuration error] You must have ${numberOfTargetsAndFlankers} characters in your character set for this block_condition, however, the researcher only put ${fontCharacterSet.current.length}.`,
            );
          [targetCharacter, ...flankerCharacters] = sampleWithoutReplacement(
            fontCharacterSet.current,
            numberOfTargetsAndFlankers,
          );
          if (
            letterConfig.spacingRelationToSize === "typographic" &&
            paramReader.read("EasyEyesLettersVersion", BC) === 1
          ) {
            // combine  [targetCharacter, ...flankerCharacters] into a single string
            const targetAndFlankers = [
              flankerCharacters[0],
              targetCharacter,
              flankerCharacters[1],
            ].join("");
            characterSetBoundingRects[BC] = _getCharacterSetBoundingBox(
              [targetAndFlankers],
              font.name,
              psychoJS.window,
              1,
              reader.read("fontSizeReferencePx", BC),
              font.padding,
            );
          }
          correctAns.current = [targetCharacter.toLowerCase()];
          logger(
            `%c${flankerCharacters[0]} ${targetCharacter} ${flankerCharacters[1]}`,
            `color: red; font-size: 1.5rem; font-family: "${font.name}"`,
          );

          // Package the textStims needed for targetKind=letter stimuli
          letterTextStims = {};
          letterTextStims["target"] = target;
          for (let i = 0; i < flankersUsed.length; i++)
            letterTextStims[`flanker${i + 1}`] = flankersUsed[i];
          // Package the characters needed for targetKind=letter stimuli
          letterCharacters = {};
          letterCharacters["target"] = targetCharacter;
          for (let i = 0; i < flankerCharacters.length; i++)
            letterCharacters[`flanker${i + 1}`] = flankerCharacters[i];
          /* -------------------------------------------------------------------------- */

          // DISPLAY OPTIONS
          Screens[0].window = psychoJS.window;

          psychoJS.experiment.addData(
            "spacingRelationToSize",
            letterConfig.spacingRelationToSize,
          );

          fixation._updateStaticState(paramReader, BC);

          try {
            const extraInfoForStimulusGeneration = {
              proposedLevel,
              characterSetBoundingRect:
                characterSetBoundingRects[status.block_condition],
              textStims: letterTextStims,
              characters: letterCharacters,
              stage: "beforeFixation",
              frameN: frameN,
              t: t,
            };
            const stimulusResults = getStimulus(
              status.block_condition,
              paramReader,
              extraInfoForStimulusGeneration,
            );
            ({ level, stimulusParameters } = stimulusResults);
            target = stimulusResults.stims.target;
            flanker1 = stimulusResults.stims.flanker1 ?? flanker1;
            flanker2 = stimulusResults.stims.flanker2 ?? flanker2;
            flanker3 = stimulusResults.stims.flanker3 ?? flanker3;
            flanker4 = stimulusResults.stims.flanker4 ?? flanker4;
            if (
              paramReader.read("EasyEyesLettersVersion", BC) === 2 &&
              stimulusResults.characterSetBoundingRect
            )
              characterSetBoundingRects[status.block_condition] =
                stimulusResults.characterSetBoundingRect;
            let newLetterConfig, newLetterTiming;
            ({
              letterConfig: newLetterConfig,
              letterTiming: newLetterTiming,
              preRenderFrameN,
            } = onStimulusGeneratedLetter(
              stimulusResults,
              paramReader,
              status.block_condition,
              psychoJS,
              Screens[0],
              viewingDistanceCm.current,
              letterCharacters,
              simulatedObservers,
              trialComponents,
              extraInfoForStimulusGeneration.stage,
            ));
            Object.assign(letterConfig, newLetterConfig);
            Object.assign(letterTiming, newLetterTiming);
          } catch (e) {
            onStimulusGenerationFailed("letter", {
              error: e,
              level,
              debug,
              screen: Screens[0],
              block_condition: status.block_condition,
              reader: paramReader,
              characters: letterCharacters,
              viewingDistanceCm: viewingDistanceCm.current,
            });
          }

          fixation.update(
            paramReader,
            BC,
            40, //TODO: used to be stimulusParameters.heightPx? but we get the heightPx after fixation click now. The value above is an arbitrary value.
            [0, 0], // same as above
          );
          fixation.setPos(Screens[0].fixationConfig.pos);
          psychoJS.experiment.addData(
            "markingFixationHotSpotRadiusPx",
            Screens[0].fixationConfig.markingFixationHotSpotRadiusPx,
          );

          showCharacterSet.setPos([0, 0]);
          showCharacterSet.setText("");
          updateColor(showCharacterSet, "marking", status.block_condition);
          // showCharacterSet.setText(getCharacterSetShowText(validAns))

          trialComponents.push(key_resp);
          trialComponents.push(...fixation.stims);
          // trialComponents.push(target);
          // trialComponents.push(...flankersUsed);
          trialComponents.push(showCharacterSet);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);

          psychoJS.experiment.addData(
            "trialInstructionBeginDurationSec",
            trialInstructionClock.getTime(),
          );

          // tinyHint
          renderObj.tinyHint.setAutoDraw(false);

          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
          /* ------------------ LETTER Trial Instruction Routine END ------------------ */
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
        },
        repeatedLetters: () => {
          // Read relevant trial-level parameters (and save to letterConfig? repeatedLettersConfig?)
          TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date
          readAllowedTolerances(tolerances, reader, BC);
          readTrialLevelLetterParams(reader, BC);
          readTrialLevelRepeatedLetterParams(reader, BC);

          validAns = String(reader.read("fontCharacterSet", BC))
            .toLowerCase()
            .split("");
          // Set up instructions
          // TODO figure out a way to gracefully incorporate "responseMustTrackCrosshairBool" into responseType. Temp adhoc fix (just in this case) is to use 3.
          _instructionSetup(
            instructionsText.trial.fixate["spacingDeg"](
              rc.language.value,
              paramReader.read("responseMustTrackContinuouslyBool", BC)
                ? 3
                : responseType.current,
            ),
            status.block_condition,
            false,
            0.25,
          );

          clickedContinue.current = false;
          addHandlerForClickingFixation(reader);

          try {
            const stimulusResults = getStimulus(
              status.block_condition,
              paramReader,
              {
                proposedLevel,
                characterSetBoundingRect: characterSetBoundingRects[BC],
              },
            );

            // Process the generated stimulus
            repeatedLettersConfig.stims = stimulusResults.stims;
            repeatedLettersConfig.level = stimulusResults.level;
            repeatedLettersConfig.stimulusParameters =
              stimulusResults.stimulusParameters;

            // Post-process the stimulus
            onStimulusGeneratedRepeatedLetters(
              stimulusResults,
              paramReader,
              status.block_condition,
              simulatedObservers,
              fontCharacterSet,
              correctAns.current,
            );
          } catch (error) {
            onStimulusGenerationFailed("repeatedLetters", { error });
            return Scheduler.Event.NEXT;
          }

          // FACTOR could this be a seperate updateFixation fn? exact same code called elsewhere?
          // Update fixation
          fixation.update(
            paramReader,
            BC,
            100, // stimulusParameters.heightPx,
            XYPxOfDeg(0, [targetEccentricityDeg.x, targetEccentricityDeg.y]),
          );
          Screens[0].fixationConfig.pos = Screens[0].fixationConfig.nominalPos;
          fixation.setPos(Screens[0].fixationConfig.pos);
          fixation.tStart = t;
          fixation.frameNStart = frameN;
          psychoJS.experiment.addData(
            "markingFixationHotSpotRadiusPx",
            Screens[0].fixationConfig.markingFixationHotSpotRadiusPx,
          );

          // Add stims to trialComponents
          trialComponents.push(...repeatedLettersConfig.stims);
          trialComponents.push(...fixation.stims);
          trialComponents.push(key_resp);

          trialComponents.push(showCharacterSet);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);
        },
        rsvpReading: () => {
          renderObj.tinyHint.setAutoDraw(false);
          TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

          readAllowedTolerances(tolerances, reader, BC);
          readTrialLevelLetterParams(reader, BC);
          clickedContinue.current = false;
          rsvpReadingResponse.displayStatus = false;
          addHandlerForClickingFixation(reader);

          drawTimingBars(showTimingBarsBool.current, "fixation", true);
          drawTimingBars(showTimingBarsBool.current, "target", false);
          drawTimingBars(showTimingBarsBool.current, "TargetRequest", false);
          drawTimingBars(showTimingBarsBool.current, "gap", false);

          rsvpReadingResponse.responseType = paramReader.read(
            "responseSpokenToExperimenterBool",
            BC,
          )
            ? "spoken"
            : "silent";

          const numberOfWords = paramReader.read(
            "rsvpReadingNumberOfWords",
            status.block_condition,
          );

          let durationSec;
          if (
            paramReader.read("thresholdParameter", BC) === "targetDurationSec"
          ) {
            level = constrainRSVPReadingSpeed(proposedLevel, numberOfWords);
            psychoJS.experiment.addData("level", level);
            durationSec = Math.pow(10, level);
          } else {
            durationSec = paramReader.read("targetDurationSec", BC);
          }

          psychoJS.experiment.addData(
            "rsvpReadingWordDurationSec",
            durationSec,
          );
          psychoJS.experiment.addData("rsvpWordDurationSec", durationSec);

          // Get the words
          const thisTrialWords =
            rsvpReadingWordsForThisBlock.current[status.block_condition][0];
          // No words to show! Skipping trial for graceful participant experience.
          // TODO any way to predict, so that trial count can be correct, ie ending after 3 trials instead of 10 this block?
          if (thisTrialWords.targetWords.every((s) => s === "")) {
            warning(
              `Trial (rsvpReading) skipped, due to finding no target words to display.`,
            );
            skipTrial();
            return Scheduler.Event.NEXT;
          }
          const actualNumberOfWords = thisTrialWords.targetWords.length;
          if (actualNumberOfWords !== numberOfWords)
            warning(
              "rsvpReading parsed the incorrect number of words. Using the target sequence: " +
                thisTrialWords.targetWords.join(","),
            );
          // Determine the subset of target sets that will be used for response identification
          rsvpReadingTargetSets.numberOfIdentifications = Math.min(
            paramReader.read(
              "rsvpReadingNumberOfIdentifications",
              status.block_condition,
            ),
            actualNumberOfWords, // eg in the case that we have reached the end of the corpus and ran out of words to show.
          );
          rsvpReadingTargetSets.numberOfSets = actualNumberOfWords;

          // Get the stimuli.
          // While stimulus might change with viewing distance (eg sized by deg) the words will not.
          try {
            // Generate stimulus using centralized function
            const stimulusState = {
              thisTrialWords,
              durationSec,
            };
            const stimulusResults = getStimulus(
              status.block_condition,
              paramReader,
              stimulusState,
            );

            // Process the generated stimulus
            const processedStimulus = onStimulusGeneratedRsvpReading(
              stimulusResults,
              rsvpReadingTargetSets.numberOfIdentifications,
              simulatedObservers,
              level,
              paramReader,
              status.block_condition,
              psychoJS,
              rsvpReadingResponse.responseType === "silent",
              durationSec,
            );

            if (processedStimulus) {
              // Update with processed results
              Object.assign(
                rsvpReadingTargetSets,
                processedStimulus.rsvpReadingTargetSets,
              );
              Object.assign(
                rsvpReadingResponse,
                processedStimulus.rsvpReadingResponse,
              );
              correctAns.current = processedStimulus.correctAns.current;
            }
          } catch (error) {
            onStimulusGenerationFailed("rsvpReading", { error });
            return Scheduler.Event.NEXT;
          }

          // Set up instructions
          // TODO figure out a way to gracefully incorporate "responseMustTrackCrosshairBool" into responseType. Temp adhoc fix (just in this case) is to use 3.
          _instructionSetup(
            instructionsText.trial.fixate["spacingDeg"](
              rc.language.value,
              paramReader.read("responseMustTrackContinuouslyBool", BC)
                ? 3
                : responseType.current,
            ),
            status.block_condition,
            false,
            0.25,
          );

          // FACTOR updateFixation ...
          // Update fixation
          fixation.update(
            paramReader,
            BC,
            100, // stimulusParameters.heightPx,
            XYPxOfDeg(0, [targetEccentricityDeg.x, targetEccentricityDeg.y]),
          );
          Screens[0].fixationConfig.pos = Screens[0].fixationConfig.nominalPos;
          fixation.setPos(Screens[0].fixationConfig.pos);
          fixation.tStart = t;
          fixation.frameNStart = frameN;
          psychoJS.experiment.addData(
            "markingFixationHotSpotRadiusPx",
            Screens[0].fixationConfig.markingFixationHotSpotRadiusPx,
          );
          // ... updateTrial

          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecsForRsvpReading(
              paramReader,
              BC,
              thisExperimentInfo.experimentFilename,
              {
                targetWordDurationSec: durationSec,
                rsvpReadingNumberOfWords: numberOfWords,
                rsvpReadingResponseModality: rsvpReadingResponse.responseType,
              },
            );
          trialCounter.setAutoDraw(showCounterBool);

          // Add stims to trialComponents
          trialComponents.push(...fixation.stims);
          trialComponents.push(key_resp);
          trialComponents.push(showCharacterSet);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);
          // trialComponents.push(...rsvpReadingFeedback.stims);
        },
        movie: () => {
          level = currentLoop._currentStaircase.getQuestValue();

          validAns = String(reader.read("fontCharacterSet", BC))
            .toLowerCase()
            .split("");
          var [targetCharacter] = sampleWithoutReplacement(
            fontCharacterSet.current,
            1,
          );
          logger(
            `%c${targetCharacter}`,
            `color: red; font-size: 1.5rem; font-family: "${font.name}"`,
          );
          correctAns.current = [targetCharacter.toLowerCase()];

          video_generated = false;
          loader.setAttribute("id", "loader");
          loaderText.setAttribute("id", "loaderText");
          document.body.appendChild(loader);
          document.body.appendChild(loaderText);
          loaderText.innerHTML = readi18nPhrases(
            "T_generatingMovie",
            rc.language.value,
          );
          //generate movie
          loggerText("Generate movie here");
          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecsForMovie(paramReader, status.block_condition);
          //var F = new Function(paramReader.read("computeImageJS", BC))();
          let computeTotalSecStartTime = performance.now();
          var questSuggestedLevel = currentLoop._currentStaircase.quantile(
            currentLoop._currentStaircase._jsQuest.quantileOrder,
          );
          evaluateJSCode(
            paramReader,
            status,
            Screens[0],
            targetCharacter,
            questSuggestedLevel,
            psychoJS,
          ).then(([imageNit, movieHz, actualStimulusLevelTemp]) => {
            //observer should not be allowed to respond before actualStimulusLevel has retured.
            //i.e. before the movie has generated
            actualStimulusLevel = actualStimulusLevelTemp;
            let moviePQEncodedBool = paramReader.read("moviePQEncodedBool", BC);
            generate_video(
              imageNit,
              movieHz,
              psychoJS,
              moviePQEncodedBool,
            ).then((data) => {
              videoblob = data;
              let computeTotalSecEndTime = performance.now();
              psychoJS.experiment.addData(
                "computeTotalSec",
                (computeTotalSecEndTime - computeTotalSecStartTime) / 1000,
              );
              document.body.removeChild(loader);
              document.body.removeChild(loaderText);
              video_generated = true;
              fixation.tStart = t;
              fixation.frameNStart = frameN;
              clickedContinue.current = false;
              // FACTOR updateFixation ...
              fixation.update(
                paramReader,
                BC,
                100,
                XYPxOfDeg(0, [
                  targetEccentricityDeg.x,
                  targetEccentricityDeg.y,
                ]),
              );
              Screens[0].fixationConfig.pos =
                Screens[0].fixationConfig.nominalPos;
              fixation.setPos(Screens[0].fixationConfig.pos);
              psychoJS.experiment.addData(
                "markingFixationHotSpotRadiusPx",
                Screens[0].fixationConfig.markingFixationHotSpotRadiusPx,
              );
              addHandlerForClickingFixation(paramReader);
              // ... updateFixation
            });
          });
          trialCounter.setAutoDraw(showCounterBool);
          showCharacterSet.setPos([0, 0]);

          trialComponents.push(key_resp);
          trialComponents.push(...fixation.stims);

          trialComponents.push(showCharacterSet);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);
        },
        vernier: () => {
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
          /* ----------------- vernier Trial Instruction Routine BEGIN ----------------- */
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */

          _instructionSetup(
            instructionsText.trial.fixate["spacingDeg"](
              rc.language.value,
              paramReader.read("responseMustTrackContinuouslyBool", BC)
                ? 3
                : responseType.current,
            ),
            status.block_condition,
            false,
            0.25,
          );

          TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date
          // update component parameters for each repeat
          Screens[0].measurements.widthCm = rc.screenWidthCm
            ? rc.screenWidthCm.value
            : 30;
          Screens[0].measurements.widthPx = rc.displayWidthPx.value;
          Screens[0].pxPerCm =
            Screens[0].measurements.widthPx / Screens[0].measurements.widthCm;
          if (!rc.screenWidthCm)
            console.warn(
              "[Screen Width] Using arbitrary screen width. Enable RC.",
            );
          // FACTOR is readAllowedTolerances targetKind independent?
          readAllowedTolerances(tolerances, reader, status.block_condition);

          // FACTOR updateFixation ...
          const targetEccentricityXYPx = XYPxOfDeg(0, [
            targetEccentricityDeg.x,
            targetEccentricityDeg.y,
          ]);
          fixation.update(paramReader, BC, 100, targetEccentricityXYPx);
          fixation.tStart = t;
          fixation.frameNStart = frameN;
          // fixation.setAutoDraw(true);
          Screens[0].fixationConfig.pos = Screens[0].fixationConfig.nominalPos;
          fixation.setPos(Screens[0].fixationConfig.pos);
          psychoJS.experiment.addData(
            "markingFixationHotSpotRadiusPx",
            Screens[0].fixationConfig.markingFixationHotSpotRadiusPx,
          );
          addHandlerForClickingFixation(paramReader);
          clickedContinue.current = false;
          // ... updateFixation

          ///

          try {
            let correctAnsNew;
            ({ vernier } = getStimulus(BC, reader, { proposedLevel, vernier }));
            ({
              validAns,
              correctAns: correctAnsNew,
              level,
            } = onStimulusGeneratedVernier(
              vernier,
              reader,
              status.block_condition,
              readi18nPhrases("T_identifyVernierLeft", rc.language.value),
              readi18nPhrases("T_identifyVernierRight", rc.language.value),
              psychoJS,
              simulatedObservers,
            ));
            Object.assign(correctAns, correctAnsNew);
          } catch (error) {
            onStimulusGenerationFailed("vernier", { error });
            return Scheduler.Event.NEXT;
          }

          // Update trialCounter
          trialCounter.setAutoDraw(showCounterBool);

          // Update showCharacterSet
          updateColor(showCharacterSet, "marking", status.block_condition);
          showCharacterSet.setPos([0, 0]);
          showCharacterSet.setText("");

          /* -------------------------------------------------------------------------- */

          // DISPLAY OPTIONS
          Screens[0].window = psychoJS.window;

          // trialComponents.push(key_resp);
          trialComponents.push(...fixation.stims);
          trialComponents.push(showCharacterSet);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);
          trialComponents.push(...vernier.stims);

          psychoJS.experiment.addData(
            "trialInstructionBeginDurationSec",
            trialInstructionClock.getTime(),
          );

          drawTimingBars(showTimingBarsBool.current, "fixation", true); // Undrawn in ./components/trialRoutines/_identify_trialInstructionRoutineEnd()
          drawTimingBars(showTimingBarsBool.current, "target", false); // Drawn (and undrawn again) in trialRoutineEachFrame
          drawTimingBars(showTimingBarsBool.current, "TargetRequest", false);
          drawTimingBars(showTimingBarsBool.current, "gap", false); // Drawn in trialInstructionRoutineEnd

          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
          /* ------------------ vernier Trial Instruction Routine END ------------------ */
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
          /* -------------------------------------------------------------------------- */
        },
      });

      const customInstructions = getCustomInstructionText(
        "stimulus",
        paramReader,
        status.block_condition,
      );
      if (customInstructions.length) {
        const customInstructionsLocation = getStimulusCustomInstructionPos(
          paramReader,
          status.block_condition,
        );
        _instructionSetup(
          customInstructions,
          status.block_condition,
          false,
          0.25,
          customInstructionsLocation,
        );
      }

      /* --------------------------------- PUBLIC --------------------------------- */
      if (
        !(
          targetKind.current === "letter" &&
          reader.read("EasyEyesLettersVersion", BC) === 2
        )
      ) {
        psychoJS.experiment.addData("level", level);
      }

      updateInstructionFont(paramReader, BC, [
        instructions,
        instructions2,
        trialCounter,
      ]);

      grid.current.update(
        grid.units ?? reader.read("showGrid", BC),
        Screens[0],
      );

      // Condition Name and Specs
      if (showConditionNameConfig.showTargetSpecs) {
        targetSpecs.setText(showConditionNameConfig.targetSpecs);
        targetSpecs.setPos([-window.innerWidth / 2, -window.innerHeight / 2]);
        updateColor(targetSpecs, "instruction", BC);
        targetSpecs.setAutoDraw(true);
      }
      showConditionName(conditionName, targetSpecs);

      // Make sure previous stims are undrawn
      if (flies) flies.draw(false);
      if (dot) dot.draw(false);
      if (backGrid) backGrid.draw(false);
      flies = getFlies(
        reader.read("markFlies", status.block_condition),
        reader.read("markFliesGravity", status.block_condition),
      );
      [dot, backGrid] = getDotAndBackGrid(
        reader.read("markDot", status.block_condition),
        reader.read("markGrid", status.block_condition),
        [targetEccentricityDeg.x, targetEccentricityDeg.y],
      );
      if (dot) trialComponents.push(dot.stim);
      if (backGrid) trialComponents.push(...backGrid.stims);

      // totalTrialsThisBlock.current = snapshot.nTotal;
      let trialCounterStr = getTrialInfoStr(
        rc.language.value,
        showCounterBool,
        showViewingDistanceBool,
        status.trialCompleted_thisBlock + 1,
        totalTrialsThisBlock.current,
        status.nthBlock,
        totalBlocks.current,
        viewingDistanceCm.current,
        targetKind.current,
      );
      trialCounter.setText(trialCounterStr);
      trialCounter.setFont(instructionFont.current);
      trialCounter.setHeight(trialCounterConfig.height);
      trialCounter.setPos([window.innerWidth / 2, -window.innerHeight / 2]);
      updateColor(trialCounter, "instruction", BC);
      trialCounter.setAutoDraw(showCounterBool);

      for (const thisComponent of trialComponents)
        if ("status" in thisComponent)
          thisComponent.status = PsychoJS.Status.NOT_STARTED;

      psychoJS.eventManager.clearKeys();
      keypad.handler.clearKeys(status.block_condition);

      if (paramReader.read("showTakeABreakCreditBool", status.block_condition))
        showTrialBreakProgressBar(currentBlockCreditForTrialBreak);
      else hideTrialBreakProgressBar();

      addSkipTrialButton();

      if (
        targetKind.current === "letter" &&
        letterConfig?.thresholdParameter === "spacingDeg"
      )
        doubleCheckSizeToSpacing(target, flanker1, stimulusParameters);
      /* --------------------------------- \PUBLIC -------------------------------- */
      return Scheduler.Event.NEXT;
    };
  }

  function trialInstructionRoutineEachFrame() {
    return async function () {
      setCurrentFn("trialInstructionRoutineEachFrame");
      if (toShowCursor()) {
        if (markingShowCursorBool.current) showCursor();
        removeProceedButton();
        return Scheduler.Event.NEXT;
      }

      if (
        targetKind.current === "reading" &&
        paramReader.read("setResolutionUnit", status.block_condition) ===
          "pxPerDeg" &&
        paramReader.read("setResolution", status.block_condition) !== 0
      ) {
        const setResolution = paramReader.read(
          "setResolution",
          status.block_condition,
        );
        const setResolutionUnit = paramReader.read(
          "setResolutionUnit",
          status.block_condition,
        );
        const setResolutionSmoothingBool = paramReader.read(
          "setResolutionSmoothingBool",
          status.block_condition,
        );
        try {
          psychoJS.window.changeScaleMode(
            setResolutionSmoothingBool ? "linear" : "nearest",
            setResolution,
            setResolutionUnit,
          );
        } catch (error) {
          warning(
            `Error when trying to change resolution in trialInstructionRoutineEachFrame, setResolutionUnit, setResolution. Error: ${error}`,
          );
        }
      }

      t = instructionsClock.getTime();
      frameN = frameN + 1;

      handleResponseTimeoutSec(frameN, t);

      trialCounter.setPos([window.innerWidth / 2, -window.innerHeight / 2]);
      renderObj.tinyHint.setPos([0, -window.innerHeight / 2]);

      liveUpdateTrialCounter(
        rc.language.value,
        paramReader.read("showCounterBool", status.block_condition),
        paramReader.read("showViewingDistanceBool", status.block_condition),
        status.trialCompleted_thisBlock + 1,
        totalTrialsThisBlock.current,
        status.nthBlock,
        totalBlocks.current,
        viewingDistanceCm.current,
        targetKind.current,
        instructionsClock.getTime(),
        trialCounter,
      );

      if (
        /Dynamic/.test(
          grid.units ?? paramReader.read("showGrid", status.block_condition),
        )
      )
        grid.current.update(
          grid.units ?? paramReader.read("showGrid", status.block_condition),
          Screens[0],
        );
      const letterEachFrame = () => {
        generalEachFrame();

        // Determine whether to do a stimulus generation at this later point
        const isFixationMovingThisTrial =
          paramReader.read(
            "markingFixationMotionRadiusDeg",
            status.block_condition,
          ) > 0 &&
          paramReader.read(
            "markingFixationMotionSpeedDegPerSec",
            status.block_condition,
          ) > 0;
        const isLetterVersion2 =
          paramReader.read("EasyEyesLettersVersion", status.block_condition) ==
          2;
        // TODO if fixation is still in V2, shouldn't we just generate the stimulus in trialInstructionRoutineBegin?
        // Either fixation is still and we haven't yet generated the stimulus,
        // or moving but we now know where it's going to stop
        const isFixationFinalPositionKnown =
          (!isFixationMovingThisTrial && !stimulusComputedBool) ||
          Screens[0].fixationConfig.fixationPosAfterDelay !== undefined;
        const isReadyForAfterFixationGen =
          isLetterVersion2 && isFixationFinalPositionKnown;
        // If viewing distance is out of bounds, unless (isLetterVersion2 && isFixationMovingThisTrial && !isFixationFinalPositionKnown)
        const hasViewingDistanceChanged =
          viewingDistanceOutOfBounds(
            viewingDistanceCm.current,
            paramReader.read(
              "viewingDistanceAllowedRatio",
              status.block_condition,
            ),
          ) &&
          !(
            isLetterVersion2 &&
            isFixationMovingThisTrial &&
            !isFixationFinalPositionKnown
          );
        if (isReadyForAfterFixationGen || hasViewingDistanceChanged) {
          try {
            let proposedLevel = currentLoop._currentStaircase.getQuestValue();
            const stage = "afterFixation";
            const stimulusResults = getStimulus(
              status.block_condition,
              paramReader,
              {
                proposedLevel,
                characterSetBoundingRect:
                  characterSetBoundingRects[status.block_condition],
                textStims: letterTextStims,
                characters: letterCharacters,
                stage,
                frameN: frameN,
                t: t,
              },
            );
            level = stimulusResults.level;
            target = stimulusResults.stims.target;
            flanker1 = stimulusResults.stims.flanker1 ?? flanker1;
            flanker2 = stimulusResults.stims.flanker2 ?? flanker2;
            flanker3 = stimulusResults.stims.flanker3 ?? flanker3;
            flanker4 = stimulusResults.stims.flanker4 ?? flanker4;
            flankersUsed = [flanker1, flanker2, flanker3, flanker4].slice(
              0,
              flankersUsed.length,
            );
            let newLetterConfig, newLetterTiming;
            ({
              letterConfig: newLetterConfig,
              preRenderFrameN,
              letterTiming: newLetterTiming,
            } = onStimulusGeneratedLetter(
              stimulusResults,
              paramReader,
              status.block_condition,
              psychoJS,
              Screens[0],
              viewingDistanceCm.current,
              letterCharacters,
              simulatedObservers,
              trialComponents,
              stage,
            ));
            Object.assign(letterConfig, newLetterConfig);
            Object.assign(letterTiming, newLetterTiming);
            stimulusComputedBool = true;
            Screens[0].fixationConfig.fixationPosAfterDelay = undefined;
          } catch (e) {
            stimulusComputedBool = true;
            onStimulusGenerationFailed("letter", {
              error: e,
              level,
              debug,
              screen: Screens[0],
              block_condition: status.block_condition,
              reader: paramReader,
              characters: letterCharacters,
              viewingDistanceCm: viewingDistanceCm.current,
            });
            return Scheduler.Event.NEXT;
          }
        }

        // TODO is this necessary? Why end the experiment?
        // if (level === "target is offscreen") {
        //   //end experiment;
        //   const text = `Target is offscreen.<br>
        //   Target location: ${stimulusParameters.targetEccentricityDeg} deg<br>
        //   Target location: ${stimulusParameters.targetEccentricityPx} px<br>
        //   Screen rect: ${stimulusParameters.screenRectDeg} deg<br>
        //   Screen rect: ${stimulusParameters.screenRectPx} px<br>
        //   Viewing distance: ${viewingDistanceCm.current} cm
        //   `;
        //   psychoJS.gui.dialog({
        //     error: text,
        //     showOK: true,
        //   });
        //   quitPsychoJS("", false, paramReader, !isProlificExperiment(), false);
        //   showExperimentEnding(true, isProlificExperiment(), rc.language.value);
        //   return Scheduler.Event.QUIT;
        // }

        if (frameN === preRenderFrameN + 1) {
          [target, ...flankersUsed].forEach((c) => {
            // c._updateIfNeeded();
            // c.refresh();
            // c.setAutoDraw(false);
            // c.setOpacity(1);
            c.status = PsychoJS.Status.NOT_STARTED;
          });
          letterTiming.preRenderEndSec = performance.now() / 1000;
        }
        if (paramReader.read("_trackGazeExternallyBool")[0])
          recordStimulusPositionsForEyetracking(
            target,
            "trialInstructionRoutineEachFrame",
          );
      };
      const generalEachFrame = () => {
        if (showConditionNameConfig.showTargetSpecs) {
          targetSpecsConfig.pos[0] = -window.innerWidth / 2;
          targetSpecsConfig.pos[1] = -window.innerHeight / 2;
          if (targetSpecs.status === PsychoJS.Status.NOT_STARTED) {
            // keep track of start time/frame for later
            targetSpecs.tStart = t; // (not accounting for frame time here)
            targetSpecs.frameNStart = frameN; // exact frame index
          }
          targetSpecs.setAutoDraw(true);
        }
        // Move the fixation each frame
        if (
          Screens[0].fixationConfig.markingFixationMotionRadiusDeg > 0 &&
          Screens[0].fixationConfig.markingFixationMotionSpeedDegPerSec > 0
        ) {
          if (
            paramReader.read(
              "markingFixationMotionPath",
              status.block_condition,
            ) === "circle"
          ) {
            gyrateFixation(fixation);
          } else {
            gyrateRandomMotionFixation(fixation, t, displayOptions);
          }
        }
        fixation.setAutoDraw(true);

        if (
          paramReader.read(
            "responseMustTrackContinuouslyBool",
            status.block_condition,
          )
        ) {
          checkIfCursorIsTrackingFixation(t, paramReader);
        }
      };

      switchKind(targetKind.current, {
        vocoderPhrase: () => {
          if (
            psychoJS.eventManager.getKeys({ keyList: ["space"] }).length > 0
          ) {
            // loggerText("trialInstructionRoutineEachFrame enter HIT");
            continueRoutine = false;
          }
        },
        sound: () => {
          if (
            psychoJS.eventManager.getKeys({ keyList: ["space"] }).length > 0
          ) {
            // loggerText("trialInstructionRoutineEachFrame enter HIT");
            continueRoutine = false;
          }
        },
        image: () => {
          generalEachFrame();
        },
        reading: () => {
          continueRoutine = false;
        },
        letter: letterEachFrame,
        repeatedLetters: generalEachFrame,
        rsvpReading: generalEachFrame,
        movie: () => {
          generalEachFrame();
          if (video_generated == true) {
            // if (
            //   paramReader.read(
            //     "responseMustTrackContinuouslyBool",
            //     status.block_condition,
            //   )
            // )
            // fixation.setAutoDraw(true);
          }
        },
        vernier: generalEachFrame,
      });

      if (showConditionNameConfig.show) {
        updateConditionNameConfig(conditionNameConfig, false);
        if (conditionName.status === PsychoJS.Status.NOT_STARTED) {
          conditionName.tStart = t;
          conditionName.frameNStart = frameN;
        }
        conditionName.setAutoDraw(true);
      }

      if (
        psychoJS.experiment.experimentEnded ||
        psychoJS.eventManager.getKeys({ keyList: ["escape"] }).length > 0
      ) {
        let action = await handleEscapeKey();
        if (action.quitSurvey) {
          return quitPsychoJS("", false, paramReader);
        }
        if (action.skipTrial || action.skipBlock) {
          return Scheduler.Event.NEXT;
        }
      }

      if (
        Screens[0].fixationConfig.show &&
        paramReader.read(
          "markingFixationStrokeThickening",
          status.block_condition,
        ) !== 1
      )
        fixation.boldIfCursorNearFixation();

      // BackGrid and Dot and flies
      if (flies && flies.status === PsychoJS.Status.NOT_STARTED) {
        flies.draw();
      }
      if (flies && flies.status === PsychoJS.Status.STARTED) {
        flies.everyFrame();
      }
      if (backGrid && backGrid.status === PsychoJS.Status.NOT_STARTED)
        backGrid.draw();
      if (dot && dot.status === PsychoJS.Status.NOT_STARTED) dot.draw();

      if (!continueRoutine || clickedContinue.current) {
        continueRoutine = true;
        clickedContinue.current = false;
        return Scheduler.Event.NEXT;
      }

      continueRoutine = true;
      if (
        (canType(responseType.current) &&
          psychoJS.eventManager.getKeys({ keyList: ["space"] }).length > 0) ||
        keypad.handler.endRoutine(status.block_condition) ||
        simulatedObservers.proceed(status.block_condition)
      ) {
        continueRoutine = false;
        movePastFixation();
      }

      return Scheduler.Event.FLIP_REPEAT;
    };
  }

  function trialInstructionRoutineEnd() {
    return async function () {
      stimulusComputedBool = false;
      //print to the console heap memory if it is available
      if (typeof performance.memory !== "undefined") {
        letterHeapData.heapUsedBeforeDrawingMB =
          performance.memory.usedJSHeapSize / 1024 / 1024;
        letterHeapData.heapTotalBeforeDrawingMB =
          performance.memory.totalJSHeapSize / 1024 / 1024;
        letterHeapData.heapLimitBeforeDrawingMB =
          performance.memory.jsHeapSizeLimit / 1024 / 1024;
        console.log(
          "%c[BEFORE DRAWING] Used JS heap size Before:%c %d MB %cTotal JS heap size:%c %d MB %cJS heap size limit:%c %d MB",
          "color: inherit;",
          "color: red;",
          letterHeapData.heapUsedBeforeDrawingMB,
          "color: inherit;",
          "color: red;",
          letterHeapData.heapTotalBeforeDrawingMB,
          "color: inherit;",
          "color: red;",
          letterHeapData.heapLimitBeforeDrawingMB,
        );
      } else {
        console.log("Performance memory API is not supported in this browser.");
      }
      drawTimingBars(showTimingBarsBool.current, "gap", true);

      setCurrentFn("trialInstructionRoutineEnd");
      loggerText("trialInstructionRoutineEnd");

      keypad.handler.clearKeys(status.block_condition);
      // TODO disable keypad control keys
      keypad.handler.setSensitive();

      // rc.pauseDistance();
      if (toShowCursor()) {
        removeProceedButton();
        if (markingShowCursorBool.current) showCursor();
        psychoJS.experiment.addData(
          "trialInstructionRoutineDurationFromPreviousEndSec",
          routineClock.getTime(),
        );
        routineTimer.reset();
        routineClock.reset();
        return Scheduler.Event.NEXT;
      }

      removeSkipTrialButton();

      // Undraw backGrid and dot
      if (
        flies &&
        !paramReader.read(
          "markingFixationDuringTargetBool",
          status.block_condition,
        )
      )
        flies.draw(false);
      if (backGrid && backGrid.status === PsychoJS.Status.STARTED)
        backGrid.draw(false);
      if (dot && dot.status === PsychoJS.Status.STARTED) dot.draw(false);

      const offsetRequiredFromFixationMotion =
        Screens[0].fixationConfig.markingFixationMotionRadiusDeg > 0 &&
        Screens[0].fixationConfig.markingFixationMotionSpeedDegPerSec > 0;
      switchKind(targetKind.current, {
        vocoderPhrase: () => {
          return Scheduler.Event.NEXT;
        },
        sound: () => {
          return Scheduler.Event.NEXT;
        },
        reading: () => {
          // READING
          return Scheduler.Event.NEXT;
        },
        image: () => {
          fixation.setAutoDraw(false);
        },
        letter: () => {
          // Recalculate stimulus at final fixation position & viewing distance, for EasyEyesVersion === 1
          // QUESTION should this also be conditional on offsetRequiredFromFixationMotion?
          if (
            paramReader.read(
              "EasyEyesLettersVersion",
              status.block_condition,
            ) === 1
          ) {
            try {
              let proposedLevel = currentLoop._currentStaircase.getQuestValue();
              const stage = "afterFixation";
              const stimulusResults = getStimulus(
                status.block_condition,
                paramReader,
                {
                  proposedLevel,
                  characterSetBoundingRect:
                    characterSetBoundingRects[status.block_condition],
                  textStims: letterTextStims,
                  characters: letterCharacters,
                  stage, // TODO not necessary for EasyEyesLettersVersion == 1?
                  frameN: frameN,
                  t: t,
                },
              );
              target = stimulusResults.stims.target;
              flanker1 = stimulusResults.stims.flanker1 ?? flanker1;
              flanker2 = stimulusResults.stims.flanker2 ?? flanker2;
              flanker3 = stimulusResults.stims.flanker3 ?? flanker3;
              flanker4 = stimulusResults.stims.flanker4 ?? flanker4;
              flankersUsed = [flanker1, flanker2, flanker3, flanker4].slice(
                0,
                flankersUsed.length,
              );

              let newLetterConfig, newLetterTiming;
              ({
                letterConfig: newLetterConfig,
                letterTiming: newLetterTiming,
                preRenderFrameN,
              } = onStimulusGeneratedLetter(
                stimulusResults,
                paramReader,
                status.block_condition,
                psychoJS,
                Screens[0],
                viewingDistanceCm.current,
                letterCharacters,
                simulatedObservers,
                trialComponents,
                stage,
              ));
              Object.assign(letterConfig, newLetterConfig);
              Object.assign(letterTiming, newLetterTiming);
            } catch (e) {
              onStimulusGenerationFailed("letter", {
                error: e,
                level,
                debug,
                screen: Screens[0],
                block_condition: status.block_condition,
                reader: paramReader,
                characters: letterCharacters,
                viewingDistanceCm: viewingDistanceCm.current,
              });
              // TODO do we need to Event.NEXT, in addition to the skipTrial() called in the on..Failed above?
            }
          }
          _identify_trialInstructionRoutineEnd(instructions, fixation);
        },
        repeatedLetters: () => {
          _identify_trialInstructionRoutineEnd(instructions, fixation);
          if (offsetRequiredFromFixationMotion)
            offsetStimsToFixationPos(repeatedLettersConfig.stims);
        },
        rsvpReading: () => {
          _identify_trialInstructionRoutineEnd(instructions, fixation);
          if (offsetRequiredFromFixationMotion) {
            const stimsToOffset = [
              ...rsvpReadingTargetSets.current.stims,
              ...rsvpReadingTargetSets.upcoming.map((s) => s.stims).flat(),
            ];
            offsetStimsToFixationPos(stimsToOffset);
          }
        },
        movie: () => {
          _identify_trialInstructionRoutineEnd(instructions, fixation);
        },
        vernier: () => {
          _identify_trialInstructionRoutineEnd(instructions, fixation);
          offsetStimsToFixationPos([vernier]);
        },
      });

      // DEBUG not set in missing rows
      psychoJS.experiment.addData(
        "trialInstructionRoutineDurationFromBeginSec",
        trialInstructionClock.getTime(),
      );
      // DEBUG not set in missing rows
      psychoJS.experiment.addData(
        "trialInstructionRoutineDurationFromPreviousEndSec",
        routineClock.getTime(),
      );

      routineTimer.reset();
      routineClock.reset();
      return Scheduler.Event.NEXT;
    };
  }

  var letterRespondedEarly;
  const tar = cursorTracking.target;
  function trialRoutineBegin(snapshot) {
    return async function () {
      setCurrentFn("trialRoutineBegin");
      trialClock.reset(); // clock
      // ie time from the user clicking/pressing space (actually, the end of the previous `trialRoutineEnd`), to the start of `trialRoutineBegin`
      psychoJS.experiment.addData(
        "clickToTrialPreparationDelaySec",
        routineClock.getTime(),
      );
      removeProceedButton(); // just in case
      // const now = new Date();
      // // Get UTC offset in minutes and convert to hours
      // const offsetMinutes = now.getTimezoneOffset();
      // const offsetHours = -offsetMinutes / 60; // Note: getTimezoneOffset() returns inverse of what we want
      // const offsetSign = offsetHours >= 0 ? "+" : "";

      // // e.g. "April 30, 2025, 5:30:12 PM, UTC+5" or "April 30, 2025, 5:30:12 PM, UTC-3"
      // const dateStr =
      //   now.toLocaleString("en-US", {
      //     month: "long",
      //     day: "numeric",
      //     year: "numeric",
      //     hour: "numeric",
      //     minute: "numeric",
      //     second: "numeric",
      //     hour12: true,
      //     timeZone: "UTC",
      //   }) + `, UTC${offsetSign}${offsetHours}`;

      // // seconds since 1970-01-01 00:00:00 UTC, with millisecond precision
      // psychoJS.experiment.addData("Date", dateStr);
      const posixSec = new Date().getTime() / 1000;
      const posixSecMs = posixSec.toFixed(3);
      psychoJS.experiment.addData("PosixSec", posixSecMs);
      addFontGeometryToOutputData(
        characterSetBoundingRects[status.block_condition],
        psychoJS,
      );
      if (typeof tar !== "undefined") {
        const fontNominalSizePx = tar.getHeight();
        const fontNominalSizePt = pxToPt(fontNominalSizePx);
        psychoJS.experiment.addData("fontNominalSizePx", fontNominalSizePx);
        psychoJS.experiment.addData("fontNominalSizePt", fontNominalSizePt);
      }
      rc.pauseNudger();
      if (toShowCursor()) {
        showCursor();
        return Scheduler.Event.NEXT;
      }

      TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

      hideCursor();

      // Set fixation status to not started. Will redraw at start
      // of trial (ie trialRoutineEachFrame) if `markingFixationDuringTargetBool`
      fixation.status = PsychoJS.Status.NOT_STARTED;

      /* -------------------------------------------------------------------------- */
      if (isQuestionAndAnswerCondition(paramReader, status.block_condition)) {
        // instructions.setAutoDraw(false);
        // instructions2.setAutoDraw(false);
        liveUpdateTrialCounter(
          rc.language.value,
          paramReader.read("showCounterBool", status.block_condition),
          paramReader.read("showViewingDistanceBool", status.block_condition),
          status.trial, // Current question number
          getNumberOfQuestionsInThisCondition(
            paramReader,
            status.block_condition,
          ), // Total questions number
          status.nthBlock,
          totalBlocks.current,
          viewingDistanceCm.current,
          targetKind.current,
          t,
          trialCounter,
        );
        if (paramReader.read("showCounterBool", status.block_condition))
          trialCounter.setAutoDraw(true);
        if (targetKind.current !== "image") {
          continueRoutine = true;
          return Scheduler.Event.NEXT;
        }
      }
      /* -------------------------------------------------------------------------- */

      switchKind(targetKind.current, {
        vocoderPhrase: async () => {
          //get trial phrase
          //change hardcoded value
          vocoderPhrases.targetPhrase =
            "Ready Baron GoTo #Color #Number Now".split(" ");
          vocoderPhrases.maskerPhrase =
            "Ready #CallSign GoTo #Color #Number Now".split(" ");
          // temporary: get ProposedVolumeLevelFromQuest.current from the file if tresholdParameter is not "targetSoundDBSPL"
          if (
            paramReader.read("thresholdParameter", status.block_condition) !==
            "targetSoundDBSPL"
          ) {
            ProposedVolumeLevelFromQuest.current = paramReader.read(
              "targetSoundDBSPL",
              status.block_condition,
            );
          }

          const {
            trialSound,
            categoriesChosen,
            allCategories,
            targetVolumeDbSPL,
          } = await getVocoderPhraseTrialData(
            vocoderPhrases.targetPhrase,
            vocoderPhrases.maskerPhrase,
            status.condition.block_condition,
            ProposedVolumeLevelFromQuest.current,
            whiteNoiseLevel.current,
            soundGainDBSPL.current,
            maskerVolumeDbSPL.current,
            paramReader.read("targetSoundChannels", status.block_condition),
          );

          ProposedVolumeLevelFromQuest.adjusted = targetVolumeDbSPL;
          const chosenCategoryKeys = Object.keys(categoriesChosen);
          correctAns.current = [];
          chosenCategoryKeys.map((category) => {
            correctAns.current.push(
              category + "_" + categoriesChosen[category],
            );
          });
          vocoderPhraseCategories.chosen = categoriesChosen;
          vocoderPhraseCategories.all = allCategories;
          if (showConditionNameConfig.showTargetSpecs) {
            updateTargetSpecsForSoundDetect(
              ProposedVolumeLevelFromQuest.adjusted,
              maskerVolumeDbSPL.current,
              soundGainDBSPL.current,
              whiteNoiseLevel.current,
              targetSoundFolder.current,
              maskerSoundFolder.current,
            );
            targetSpecs.setText(showConditionNameConfig.targetSpecs);
            updateColor(targetSpecs, "instruction", status.block_condition);
            targetSpecs.setAutoDraw(true);
          }
          if (allHzCalibrationResults.component.iir_no_bandpass) {
            const showImageFileName = paramReader.read(
              "showImage",
              status.block_condition,
            );
            playAudioBufferWithImpulseResponseCalibration(
              trialSound,
              allHzCalibrationResults.component.iir_no_bandpass,
              null,
              null,
              showImageFileName === "" ? null : showImage,
              showImageFileName === "" ? null : showImageFileName,
            );
          } else playAudioBuffer(trialSound);
        },

        sound: async () => {
          var trialSoundBuffer;
          targetTask.current = paramReader.read(
            "targetTask",
            status.block_condition,
          );

          if (
            paramReader.read("thresholdParameter", status.block_condition) !==
            "targetSoundDBSPL"
          ) {
            ProposedVolumeLevelFromQuest.current = paramReader.read(
              "targetSoundDBSPL",
              status.block_condition,
            );
          }

          const isTargetSoundListCondition =
            paramReader.read("targetSoundList", status.block_condition) !== "";
          if (targetTask.current == "identify") {
            if (isTargetSoundListCondition) {
              await getTargetSoundListTrialData(
                status.condition.block_condition,
                ProposedVolumeLevelFromQuest.current,
                whiteNoiseLevel.current,
                soundGainDBSPL.current,
                paramReader.read(
                  "targetSoundNoiseBool",
                  status.block_condition,
                ),
              );

              ProposedVolumeLevelFromQuest.adjusted =
                targetSoundListTrialData.targetVolume;
              trialSoundBuffer = targetSoundListTrialData.trialSound.file;
              console.log("trialSoundBuffer", trialSoundBuffer);
              correctAns.current = [
                targetSoundListTrialData.trialSound.names[0].toLowerCase(),
                targetSoundListTrialData.trialSound.names[1].toLowerCase(),
              ];
              //list of possible targets (names of files in )
              speechInNoiseTargetList.current = Object.keys(
                targetSoundListFiles[status.block_condition],
              );
            } else {
              const { targetList, trialSound, correctAnsIndex, targetVolume } =
                await getSpeechInNoiseTrialData(
                  status.condition.block_condition,
                  ProposedVolumeLevelFromQuest.current,
                  whiteNoiseLevel.current,
                  soundGainDBSPL.current,
                  paramReader.read(
                    "targetSoundNoiseBool",
                    status.block_condition,
                  ),
                );

              ProposedVolumeLevelFromQuest.adjusted = targetVolume;
              trialSoundBuffer = trialSound;
              correctAns.current = [
                targetList[correctAnsIndex]["name"].toLowerCase(),
              ];
              speechInNoiseTargetList.current = targetList.map(
                (target) => target["name"],
              );
            }

            if (showConditionNameConfig.showTargetSpecs) {
              updateTargetSpecsForSoundIdentify(
                ProposedVolumeLevelFromQuest.adjusted,
                soundGainDBSPL.current,
                whiteNoiseLevel.current,
                targetSoundFolder.current,
              );
              targetSpecs.setText(showConditionNameConfig.targetSpecs);
              updateColor(targetSpecs, "instruction", status.block_condition);
              targetSpecs.setAutoDraw(true);
            }
          } else {
            //target is present half the time
            targetIsPresentBool.current = Math.random() < 0.5;
            let fontCharacterSet = paramReader.read(
              "fontCharacterSet",
              status.block_condition,
            );
            if (fontCharacterSet === "") {
              fontCharacterSet = "yn";
            }
            correctAns.current = [
              targetIsPresentBool.current
                ? fontCharacterSet[0] === "\uD83D"
                  ? "up"
                  : fontCharacterSet[0]
                : fontCharacterSet[0] === "\uD83D"
                ? "down"
                : fontCharacterSet[1],
            ];

            const { trialSoundMelody, targetVolume } =
              await getToneInMelodyTrialData(
                status.condition.block_condition,
                targetIsPresentBool.current,
                ProposedVolumeLevelFromQuest.current,
                maskerVolumeDbSPL.current,
                whiteNoiseLevel.current,
                soundGainDBSPL.current,
                paramReader.read(
                  "targetSoundNoiseBool",
                  status.block_condition,
                ),
              );
            trialSoundBuffer = trialSoundMelody;
            ProposedVolumeLevelFromQuest.adjusted = targetIsPresentBool.current
              ? targetVolume
              : ProposedVolumeLevelFromQuest.current;
            if (showConditionNameConfig.showTargetSpecs) {
              updateTargetSpecsForSoundDetect(
                targetIsPresentBool.current
                  ? ProposedVolumeLevelFromQuest.adjusted
                  : "-INF",
                maskerVolumeDbSPL.current,
                soundGainDBSPL.current,
                whiteNoiseLevel.current,
                targetSoundFolder.current,
                maskerSoundFolder.current,
              );
              targetSpecs.setText(showConditionNameConfig.targetSpecs);
              updateColor(targetSpecs, "instruction", status.block_condition);
              targetSpecs.setAutoDraw(true);
            }
          }
          if (
            allHzCalibrationResults.component.iir_no_bandpass &&
            !isTargetSoundListCondition
          ) {
            const showImageFileName = paramReader.read(
              "showImage",
              status.block_condition,
            );
            playAudioBufferWithImpulseResponseCalibration(
              trialSoundBuffer,
              allHzCalibrationResults.component.iir_no_bandpass,
              null,
              null,
              showImageFileName === "" ? null : showImage,
              showImageFileName === "" ? null : showImageFileName,
            );
          } else playAudioBuffer(trialSoundBuffer);
          showCursor();
        },
        image: async () => {
          const BC = status.block_condition;
          const trialData = await getImageTrialData(BC);
          imageConfig.currentImageFileName = trialData.fileName;
          imageConfig.currentImageFile = trialData.imageFile;
          imageConfig.currentImageFullFileName = trialData.fullName;
          targetImage = await getImageStim();
        },
        reading: () => {
          // skip if using Safari
          if (rc.browser.value !== "Safari") readingSound.play();
          reportWordCounts(paramReader, psychoJS.experiment);
        },
        letter: () => {
          if (snapshot.getCurrentTrial().trialsVal)
            logger("Level", snapshot.getCurrentTrial().trialsVal);

          responseType.current = resetResponseType(
            responseType.original,
            responseType.current,
            paramReader.read(
              "responseMustTrackContinuouslyBool",
              status.block_condition,
            ),
          );
          if (paramReader.read("_trackGazeExternallyBool")[0])
            recordStimulusPositionsForEyetracking(target, "trialRoutineBegin");
        },
        repeatedLetters: () => {
          // TODO Same as letter. factor out?
          responseType.current = resetResponseType(
            responseType.original,
            responseType.current,
            paramReader.read(
              "responseMustTrackContinuouslyBool",
              status.block_condition,
            ),
          );
        },
        rsvpReading: () => {
          responseType.current = resetResponseType(
            responseType.original,
            responseType.current,
            paramReader.read(
              "responseMustTrackContinuouslyBool",
              status.block_condition,
            ) ||
              paramReader.read(
                "responseSpokenToExperimenterBool",
                status.block_condition,
              ),
          );
          reportWordCounts(paramReader, psychoJS.experiment);
        },
        movie: () => {
          responseType.current = resetResponseType(
            responseType.original,
            responseType.current,
            paramReader.read(
              "responseMustTrackContinuouslyBool",
              status.block_condition,
            ),
          );
          measureLuminance.movieValues = paramReader
            .read("movieValues", status.block_condition)
            .split(",");
          //remove empty strings
          measureLuminance.movieValues =
            measureLuminance.movieValues.filter(Boolean);
          const movieHz = paramReader.read("movieHz", status.block_condition);
          const movieSec = paramReader.read("movieSec", status.block_condition);
          measureLuminance.movieSec =
            measureLuminance.movieValues.length > 0
              ? measureLuminance.movieValues.length * (1 / movieHz)
              : movieSec;
        },
        vernier: () => {
          responseType.current = resetResponseType(
            responseType.original,
            responseType.current,
            paramReader.read(
              "responseMustTrackContinuouslyBool",
              status.block_condition,
            ),
          );
          logger("responseType.current", responseType.current);
          if (paramReader.read("_trackGazeExternallyBool")[0])
            recordStimulusPositionsForEyetracking(target, "trialRoutineBegin");
        },
      });
      letterRespondedEarly = false;

      ////

      //------Prepare to start Routine 'trial'-------
      t = 0;
      frameN = -1;
      continueRoutine = true; // until we're told otherwise

      key_resp.status = PsychoJS.Status.NOT_STARTED; // ? Why we don't need this to run before?
      key_resp.keys = [];
      key_resp.rt = [];
      _key_resp_allKeys.current = [];

      showCharacterSetResponse.alreadyClickedCharacters = [];

      switchKind(targetKind.current, {
        rsvpReading: () => {
          const instr = instructionsText.trial.respond["rsvpReading"](
            rc.language.value,
            responseType.current,
          );
          _instructionSetup(instr, status.block_condition, false, 1.0);
        },
        vocoderPhrase: () => {
          // change instruction
          const instr = instructionsText.trial.respond["vocoderPhrase"](
            rc.language.value,
          );
          _instructionSetup(instr, status.block_condition, false, 1.0);
        },
        sound: () => {
          const instr =
            targetTask.current == "identify"
              ? instructionsText.trial.respond["speechInNoise"](
                  rc.language.value,
                )
              : instructionsText.trial.respond["sound"](rc.language.value);
          _instructionSetup(instr, status.block_condition, false, 1.0);
        },
        letter: () => {
          _instructionSetup(
            instructionsText.trial.respond[thresholdParameter](
              rc.language.value,
              responseType.current,
            ),
            status.block_condition,
            false,
            1.0,
          );
        },
        vernier: () => {
          _instructionSetup(
            instructionsText.trial.respond[thresholdParameter](
              rc.language.value,
              responseType.current,
            ),
            status.block_condition,
            false,
            1.0,
          );
        },
      });
      instructions.setAutoDraw(false);

      // // ! set background color
      // psychoJS.window.color = new util.Color(
      //   colorRGBSnippetToRGB(screenBackground.colorRGB)
      // )

      /* -------------------------------------------------------------------------- */
      // ! TEMP set reading text
      // readingParagraph.setText()

      // Controls changes at the trial level
      // A trial for reading is a "page" which  means the only thing
      // that should change here is the text on the page, allgi
      // other attributes remaining constant
      // EDIT Since Feb 2025, we calculate font size by the page in order to cope with changing viewing distance
      switchKind(targetKind.current, {
        // HEIGHT
        reading: () => {
          readingConfig.height = findReadingSize(
            paramReader.read("readingSetSizeBy", status.block_condition),
            paramReader,
            readingParagraph,
            "condition",
          );
          readingParagraph.setHeight(readingConfig.height);
          // TEXT
          readingParagraph.setText(
            readingThisBlockPages.get(status.block_condition)[
              readingPageIndex.current
            ],
          );
          readingParagraph._spawnStims();

          psychoJS.experiment.addData(
            "readingLineSpacingPx",
            readingParagraph.getLineSpacing(),
          );

          trialComponents.push(...readingParagraph.stims);

          // AUTO DRAW
          readingParagraph.setAutoDraw(true);

          readingPageIndex.current++;
          if (
            readingThisBlockPages.get(status.block_condition)[
              readingPageIndex.current - 1
            ] === ""
          ) {
            readingCorpusDepleted.set(status.block_condition, true);
            warning(
              `Reading trial reached end of corpus. Results saved. Blank page skipped.`,
            );
            skipTrial();
          }
        },
      });
      /* -------------------------------------------------------------------------- */
      // ! distance
      if (ifTrue(paramReader.read("calibrateDistanceBool", status.block))) {
        viewingDistanceCm.current = rc.viewingDistanceCm
          ? rc.viewingDistanceCm.value
          : Math.min(viewingDistanceCm.desired, viewingDistanceCm.max);
        Screens[0].viewingDistanceCm = viewingDistanceCm.current;
        Screens[0].nearestPointXYZPx =
          rc.improvedDistanceTrackingData !== undefined
            ? rc.improvedDistanceTrackingData.nearestXYPx
            : Screens[0].nearestPointXYZPx;
      }

      // addApparatusInfoToData(Screens[0], rc, psychoJS, stimulusParameters);

      // ie time spent in `trialRoutineBegin`
      psychoJS.experiment.addData(
        "trialBeginDurationSec",
        trialClock.getTime(),
      );
      trialClock.reset(); // clock

      psychoJS.experiment.addData(
        "viewingDistancePredictedCm",
        viewingDistanceCm.current,
      );

      return Scheduler.Event.NEXT;
    };
  }
  var frameRemains;
  var timeWhenRespondable;
  var rsvpEndRoutineAtT;
  var customResponseInstructionsDisplayed;
  var durationExccessSec;
  function trialRoutineEachFrame(snapshot) {
    return async function () {
      setCurrentFn("trialRoutineEachFrame");
      //------Loop for each frame of Routine 'trial'-------
      // get current time
      t = trialClock.getTime();
      //t = performance.now() / 1000;
      frameN = frameN + 1; // number of completed frames (so 0 is the first frame)
      ////
      if (stats.on) stats.current.begin();
      ////
      // aka to skip trial or skip block
      if (toShowCursor()) {
        showCursor();
        removeClickableCharacterSet(showCharacterSetResponse, showCharacterSet);
        vocoderPhraseRemoveClickableCategory(showCharacterSetResponse);
        return Scheduler.Event.NEXT;
      }

      if (isQuestionAndAnswerCondition(paramReader, status.block_condition)) {
        if (showConditionNameConfig.showTargetSpecs && !targetSpecs._autoDraw) {
          targetSpecs.setAutoDraw(true);
          targetSpecs._needUpdate = true;
          return Scheduler.Event.FLIP_REPEAT;
        }

        if (showConditionNameConfig.show && !conditionName._autoDraw) {
          conditionName.setAutoDraw(true);
          conditionName._needUpdate = true;
          return Scheduler.Event.FLIP_REPEAT;
        }

        if (trialComponents) {
          for (const component of trialComponents) {
            if (
              component._name.includes("readingParagraph") &&
              updateReadingParagraphForQuestionAndAnswer
            ) {
              component.setAutoDraw(false);
              component.setText("");
              updateReadingParagraphForQuestionAndAnswer = false;
              return Scheduler.Event.FLIP_REPEAT;
            }
          }
        }

        liveUpdateTrialCounter(
          rc.language.value,
          paramReader.read("showCounterBool", status.block_condition),
          paramReader.read("showViewingDistanceBool", status.block_condition),
          status.trial, // Current question number
          getNumberOfQuestionsInThisCondition(
            paramReader,
            status.block_condition,
          ), // Total questions number
          status.nthBlock,
          totalBlocks.current,
          viewingDistanceCm.current,
          targetKind.current,
          t,
          trialCounter,
        );

        if (targetKind.current !== "image") {
          continueRoutine = true;
          return Scheduler.Event.NEXT;
        }
      }

      /* -------------------------------------------------------------------------- */
      const delayBeforeStimOnsetSec =
        targetKind.current === "letter" ||
        targetKind.current === "repeatedLetters" ||
        targetKind.current === "vernier"
          ? letterConfig.delayBeforeStimOnsetSec
          : targetKind.current === "image"
          ? imageConfig.delayBeforeStimOnsetSec
          : 0;
      /* -------------------------------------------------------------------------- */
      if (frameN === 0) {
        rsvpEndRoutineAtT = undefined;
        customResponseInstructionsDisplayed = false;
        switch (targetKind.current) {
          case "rsvpReading":
            timeWhenRespondable = rsvpReadingTargetSets.upcoming.length
              ? rsvpReadingTargetSets.upcoming[
                  rsvpReadingTargetSets.upcoming.length - 1
                ].stopTime
              : rsvpReadingTargetSets.current.stopTime;
            break;
          case "letter":
          case "repeatedLetters":
            timeWhenRespondable =
              delayBeforeStimOnsetSec +
              letterConfig.markingOnsetAfterTargetOffsetSecs +
              letterConfig.targetDurationSec;
            break;
          default:
            timeWhenRespondable = 0;
        }
        if (
          paramReader.read("responseAllowedEarlyBool", status.block_condition)
        )
          timeWhenRespondable = 0;

        if (
          simulatedObservers.proceed(status.block_condition) &&
          !paramReader.read("simulateWithDisplayBool", status.block_condition)
        ) {
          timeWhenRespondable = 0;
          await simulatedObservers.respond();
        }

        durationExccessSec =
          -0.0309 +
          0.0046 * letterConfig.targetDurationSec +
          0.6157 * psychoJS.window.monitorFramePeriod;
        frameRemains =
          delayBeforeStimOnsetSec +
          letterConfig.targetDurationSec -
          0.6157 * psychoJS.window.monitorFramePeriod; // most of one frame period left
        // !
        // TODO this is misleading, ie in `letter` targetKind the stimulus onset isn't until the target is drawn
        //     if `delayBeforeStimOnsetSec !== 0` then this `clickToStimulusOnsetSec` would be `delayBeforeStimOnsetSec` early to the stimulus
        //     actually being drawn.
        psychoJS.experiment.addData(
          "clickToStimulusOnsetSec",
          (timing.clickToStimulusOnsetSec = routineClock.getTime()),
        );
        letterTiming.trialFirstFrameSec = t;
        switchKind(targetKind.current, {
          letter: () => {
            _letter_trialRoutineFirstFrame(
              paramReader,
              thresholdParameter,
              targetSpecs,
              conditionName,
              target,
              flankersUsed,
            );
          },
          repeatedLetters: () => {
            _repeatedLetters_trialRoutineFirstFrame(paramReader);
          },
          sound: () => {
            if (targetTask.current == "detect") {
              //only accepts y or n
              let fontCharacterSet = paramReader.read(
                "fontCharacterSet",
                status.block_condition,
              );
              if (fontCharacterSet === "") {
                fontCharacterSet = "yn";
              }
              if (fontCharacterSet[0] === "\uD83D") {
                validAns = ["up", "down"];
              } else validAns = [fontCharacterSet[0], fontCharacterSet[1]];
            }
          },
          vocoderPhrase: () => {
            //only clickable
            responseType.current = 1;
          },
          reading: () => {
            // VERIFY if we actually need "space" also included. Including here to be conservative?
            const spaceStrs = [
              "space",
              readi18nPhrases("T_SPACE", rc.language.value),
            ];
            // READING Only accepts SPACE
            if (!validAns.length || !spaceStrs.includes(validAns[0]))
              validAns = spaceStrs;
            // If correctAns isn't set, or doesn't include all variations of "space"
            if (
              !correctAns.current.length ||
              !spaceStrs.every((s) => correctAns.current.includes(s))
            )
              correctAns.current = spaceStrs;
          },
          rsvpReading: () => {
            //only clickable
            // responseType.current = 1;
          },
          movie: () => {
            // _letter_trialRoutineFirstFrame(
            //   paramReader,
            //   thresholdParameter,
            //   targetSpecs,
            //   conditionName,
            //   target,
            //   flanker1,
            //   flanker2
            // );
            // play the movie only for the first frame ( not needed here )
            //video.attributes
            //video.style.zIndex = "1000009";
            //video.style.position = "absolute";
            //set continueRoutine = false once movie is over
          },
          vernier: () => {},
        });
      }
      /* -------------------------------------------------------------------------- */
      // *key_resp* updates
      if (
        (targetKind.current === "sound" ||
          targetKind.current === "reading" ||
          canType(responseType.current)) &&
        targetKind.current !== "image"
        // || (simulated &&
        //   simulated[status.block] &&
        //   simulated[status.block][status.block_condition])
      ) {
        if (
          targetKind.current === "sound" ||
          (t >= timeWhenRespondable &&
            key_resp.status === PsychoJS.Status.NOT_STARTED)
        ) {
          // keep track of start time/frame for later
          key_resp.tStart = t; // (not accounting for frame time here)
          key_resp.frameNStart = frameN; // exact frame index
          // TODO Use PsychoJS clock if possible
          // Reset together with PsychoJS
          showCharacterSetResponse.onsetTime = performance.now();

          // keyboard checking is just starting
          psychoJS.window.callOnFlip(function () {
            key_resp.clock.reset();
          }); // t=0 on next screen flip
          psychoJS.window.callOnFlip(function () {
            key_resp.start();
          }); // start on screen flip
          psychoJS.window.callOnFlip(function () {
            key_resp.clearEvents();
          });
        }
        // Input from keyboard
        if (key_resp.status === PsychoJS.Status.STARTED) {
          // ////
          // /* --- SIMULATED --- */
          // if (
          //   simulated &&
          //   simulated[status.block] &&
          //   simulated[status.block][status.block_condition]
          // ) {
          //   return simulateObserverResponse(
          //     simulatedObserver[status.block_condition],
          //     key_resp,
          //     psychoJS
          //   );
          // }
          // /* --- /SIMULATED --- */

          let keyList; // Keys listened for this trial
          if (targetKind.current === "rsvpReading") {
            keyList = ["up", "down"];
          } else if (targetKind.current === "vernier") {
            keyList = ["left", "right"];
          } else {
            keyList = validAns;
          }
          // logger("keyList", keyList);
          let theseKeys = key_resp.getKeys({
            keyList: keyList,
            waitRelease: false,
          });
          _key_resp_allKeys.current.push(...theseKeys);

          if (targetKind.current === "rsvpReading")
            registerKeypressForRSVPReading(_key_resp_allKeys.current);
          if (targetKind.current === "repeatedLetters") {
            theseKeys.forEach((k) => {
              registerResponseForRepeatedLetters(
                k.name,
                k.rt,
                correctAns.current,
                correctSynth,
                showCharacterSetResponse.alreadyClickedCharacters,
              );
            });
          }
          showCharacterSetResponse.alreadyClickedCharacters.push(
            ...theseKeys.map((k) => k.name),
          );
        }
      }
      // Input from clickable character set
      // *showCharacterSetResponse* updates
      if (
        showCharacterSetResponse.current.length &&
        targetKind.current !== "image"
      ) {
        if (targetKind.current === "vocoderPhrase")
          vocoderPhraseCorrectResponse.current =
            showCharacterSetResponse.current;

        const responses = [...showCharacterSetResponse.current];
        const rts = showCharacterSetResponse.clickTime.map(
          (clickTime, i) =>
            (clickTime - showCharacterSetResponse.onsetTime[i]) / 1000,
        );
        key_resp.keys.push(...responses);
        key_resp.rt.push(...rts);
        // TODO record `code` and `rt`
        const clickedKeypresses = showCharacterSetResponse.current.map(
          (letter) => new KeyPress(undefined, undefined, letter),
        );
        _key_resp_allKeys.current.push(...clickedKeypresses);

        if (targetKind.current === "repeatedLetters") {
          showCharacterSetResponse.current.forEach((r, i) => {
            registerResponseForRepeatedLetters(
              r,
              rts[i],
              correctAns.current,
              correctSynth,
              showCharacterSetResponse.alreadyClickedCharacters,
            );
          });
        }

        // TODO update how already clicked characters are shown, ie for repeatedLetters
        showCharacterSetResponse.alreadyClickedCharacters.push(
          ...showCharacterSetResponse.current,
        );
        showCharacterSetResponse.current = [];
        showCharacterSetResponse.clickTime = [];
      }

      if (
        showCharacterSet.status === PsychoJS.Status.STARTED &&
        targetKind.current !== "vocoderPhrase" &&
        targetKind.current !== "image"
      )
        toggleClickedCharacters();
      // Check if the (set of clickable charset and keyboard) inputs constitute an end-of-trial
      // for regimes which require a single response to QUEST
      // TODO consolidate all endtrial/correctness logic into one place, ie generalize to include rsvpReading,repeatedLetters
      const uniqueResponses = new Set(
        _key_resp_allKeys.current.map((k) => k.name),
      );
      const isTargetSoundListCondition =
        paramReader.read("targetSoundList", status.block_condition) !== "";
      if (
        uniqueResponses.size >= responseType.numberOfResponses &&
        targetKind.current !== "rsvpReading"
      ) {
        // The characters with which the participant responded
        const participantResponse = [...uniqueResponses].slice(
          uniqueResponses.size - responseType.numberOfResponses,
        );
        let responseCorrect;
        if (targetKind.current === "vocoderPhrase") {
          responseCorrect = arraysEqual(
            vocoderPhraseCorrectResponse.current.sort(),
            correctAns.current.sort(),
          );
        } else if (targetKind.current === "repeatedLetters") {
          responseCorrect = participantResponse.some((r) =>
            correctAns.current.includes(r),
          );
        } else if (targetKind.current === "vernier") {
          const choice = participantResponse[0].toLowerCase();
          const leftKeys = [
            "left",
            readi18nPhrases("T_identifyVernierLeft", rc.language.value),
          ].map((s) => s.toLowerCase());
          const pickedLeft = leftKeys.includes(choice);
          const pickedRight = !pickedLeft;
          const wasLeft = vernier.directionBool;
          const wasRight = !wasLeft;
          responseCorrect =
            (wasLeft && pickedLeft) || (wasRight && pickedRight);
        } else if (
          targetKind.current === "sound" &&
          isTargetSoundListCondition
        ) {
          const names = targetSoundListTrialData.trialSound.names.map((t) =>
            t.toLowerCase(),
          );
          responseCorrect = participantResponse.some((r) =>
            names.includes(r.toLowerCase()),
          );
        } else {
          responseCorrect = arraysEqual(
            participantResponse.sort(),
            correctAns.current.sort(),
          );
        }

        // In letter&repeatedLetter, mark target end time if
        // response was given before specified target duration.
        if (
          letterTiming.targetFinishSec === undefined &&
          ["letter", "repeatedLetters"].includes(targetKind.current)
        ) {
          const targetStim =
            targetKind.current === "letter"
              ? target
              : repeatedLettersConfig.stims[0];
          letterRespondedEarly = true;
          letterTiming.targetFinishSec = t;
          letterTiming.blackoutDetectedBool =
            letterConfig.thresholdAllowedBlackoutBool
              ? false
              : checkForBlackout(
                  psychoJS.window._renderer.gl,
                  stimulusParameters.targetAndFlankersXYPx[0],
                  paramReader.read(
                    "showTimingBarsBool",
                    status.block_condition,
                  ),
                );
          targetStim.frameNEnd = frameN;
          targetStim.frameNFinishConfirmed = frameN;
        }

        // Was this correct?
        if (responseCorrect) {
          // Play correct audio
          if (
            targetKind.current === "sound" ||
            targetKind.current === "vocoderPhrase"
          ) {
            if (status.trial === status.condition.conditionTrials) {
              instructions.setAutoDraw(false);
              conditionName.setAutoDraw(false);
              targetSpecs.setAutoDraw(false);
            }
            await displayRightOrWrong(
              true,
              rc.language.value,
              status.trial === status.condition.conditionTrials,
            );
            // correctSynth.play();
            status.trialCorrect_thisBlock++;
          }
          switchKind(targetKind.current, {
            letter: () => {
              if (!simulatedObservers.proceed(status.block))
                correctSynth.play();
              status.trialCorrect_thisBlock++;
            },
            movie: () => {
              if (!simulatedObservers.proceed(status.block))
                correctSynth.play();
              status.trialCorrect_thisBlock++;
            },
            vernier: () => {
              if (!simulatedObservers.proceed(status.block))
                correctSynth.play();
              status.trialCorrect_thisBlock++;
            },
          });
          // CORRECT
          key_resp.corr = 1;
          if (targetKind.current === "repeatedLetters")
            key_resp.corr = participantResponse.map((r) =>
              correctAns.current.includes(r) ? 1 : 0,
            );
        } else {
          if (
            paramReader.read(
              "responseNegativeFeedbackBool",
              status.block_condition,
            ) &&
            (targetKind.current === "vocoderPhrase" ||
              targetKind.current === "sound")
          ) {
            if (status.trial === status.condition.conditionTrials) {
              instructions.setAutoDraw(false);
              conditionName.setAutoDraw(false);
              targetSpecs.setAutoDraw(false);
            }
            await displayRightOrWrong(
              false,
              rc.language.value,
              status.trial === status.condition.conditionTrials,
            );
            // wrongSynth.play();
          }

          if (targetKind.current === "repeatedLetters") {
            key_resp.corr = participantResponse.map((r) => 0);
          } else {
            // INCORRECT
            key_resp.corr = 0;
          }
          // Play wrong audio
          // wrongSynth.play();
        }

        removeClickableCharacterSet(showCharacterSetResponse, showCharacterSet);
        vocoderPhraseRemoveClickableCategory(showCharacterSetResponse);
        continueRoutine = false;
      }
      // *trialCounter* updates
      if (t >= 0.0 && trialCounter.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        trialCounter.tStart = t; // (not accounting for frame time here)
        trialCounter.frameNStart = frameN; // exact frame index
        trialCounter.setAutoDraw(true);
      }
      trialCounter.setPos([window.innerWidth / 2, -window.innerHeight / 2]);

      // *tinyHint* updates
      if (
        t >= 0.0 &&
        renderObj.tinyHint.status === PsychoJS.Status.NOT_STARTED &&
        paramReader.read("targetKind", status.block_condition) !== "rsvpReading"
      ) {
        // keep track of start time/frame for later
        renderObj.tinyHint.tStart = t; // (not accounting for frame time here)
        renderObj.tinyHint.frameNStart = frameN; // exact frame index
        renderObj.tinyHint.setAutoDraw(true);
      }
      renderObj.tinyHint.setPos([0, -window.innerHeight / 2]);

      // TODO improve code style/logic
      if (showConditionNameConfig.showTargetSpecs) {
        targetSpecsConfig.pos[0] = -window.innerWidth / 2;
        targetSpecsConfig.pos[1] = -window.innerHeight / 2;
        // *targetSpecs* updates
        if (t >= 0.0) {
          targetSpecs.setPos(targetSpecsConfig.pos);
          targetSpecs.setAutoDraw(true);
        }
      }

      if (showConditionNameConfig.show) {
        updateConditionNameConfig(
          conditionNameConfig,
          showConditionNameConfig.showTargetSpecs,
          targetSpecs,
        );
        // *targetSpecs* updates
        if (t >= 0.0) {
          conditionName.setPos(conditionNameConfig.pos);
          conditionName.setAutoDraw(true);
        }
      }

      // *fixation* updates
      if (
        t >= 0.0 &&
        fixation.status === PsychoJS.Status.NOT_STARTED &&
        paramReader.read(
          "markingFixationDuringTargetBool",
          status.block_condition,
        ) &&
        targetKind.current !== "sound" &&
        targetKind.current !== "vocoderPhrase"
      ) {
        // keep track of start time/frame for later
        fixation.tStart = t; // (not accounting for frame time here)
        fixation.frameNStart = frameN; // exact frame index
        fixation.setAutoDraw(true);
      } else if (
        // Handle moving fixation during rsvpReading stimuli
        fixation.status === PsychoJS.Status.STARTED &&
        // TODO generalize beyond rsvpReading, ie determine if stimulus is finished in a targetKind-agnostic way
        paramReader.read("targetKind", status.block_condition) ===
          "rsvpReading" &&
        paramReader.read(
          "markingFixationDuringTargetBool",
          status.block_condition,
        )
      ) {
        if (
          typeof rsvpReadingTargetSets.current === "undefined" &&
          rsvpReadingTargetSets.upcoming.length === 0
        ) {
          // stimulusFinished
          fixation.setAutoDraw(false);
        } else {
          // not stimulusFinished
          if (
            Screens[0].fixationConfig.markingFixationMotionRadiusDeg > 0 &&
            Screens[0].fixationConfig.markingFixationMotionSpeedDegPerSec > 0
          ) {
            // Moving fixation
            showCursor();
            moveFixation(fixation, paramReader);
            fixation.boldIfCursorNearFixation();
            if (flies) flies.everyFrame();
          }
          if (
            paramReader.read(
              "responseMustTrackContinuouslyBool",
              status.block_condition,
            )
          ) {
            // Tracking fixation
            showCursor();
            const tracking = isCorrectlyTrackingDuringStimulusForRsvpReading(
              fixation,
              paramReader,
              t,
            );
            if (!tracking) {
              warning("Skipped trial, due to failure to track fixation.");
              skipTrial();
              return Scheduler.Event.NEXT;
            }
          }
        }
      }
      if (flies) {
        const stimulusFinished =
          typeof rsvpReadingTargetSets.current === "undefined" &&
          rsvpReadingTargetSets.upcoming.length === 0;
        if (stimulusFinished) {
          flies.draw(false);
        }
        if (fixation.status === PsychoJS.Status.STARTED) flies.everyFrame();
      }

      switch (targetKind.current) {
        case "repeatedLetters":
          // Continue after done displaying stimuli, when enough responses have been registered
          _repeatedLetters_trialRoutineEachFrame(
            t,
            frameN,
            delayBeforeStimOnsetSec,
            frameRemains,
            targetSpecs,
            conditionName,
            showCharacterSet,
            instructions,
          );
          break;
        case "rsvpReading":
          continueRoutine = _rsvpReading_trialRoutineEachFrame(
            t,
            frameN,
            instructions,
          );
          break;
        case "movie":
          // Play the movie here
          if (videoblob.length > 0 && video_flag == 1) {
            video.setAttribute("src", videoblob);
            document.body.appendChild(video);

            const delayBeforeMovieForLuminanceMeasuringMs =
              getDelayBeforeMoviePlays(status.block_condition);
            if (delayBeforeMovieForLuminanceMeasuringMs != 0) {
              setTimeout(() => {
                logger(
                  "addMeasureLuminanceIntervals called 2",
                  performance.now(),
                );
                video.play();
                video_flag = 0;
              }, delayBeforeMovieForLuminanceMeasuringMs);
            } else {
              video.play();
              video_flag = 0;
            }
            logger(
              "delayBeforeMovieForLuminanceMeasuringMs",
              delayBeforeMovieForLuminanceMeasuringMs,
            );
            measureLuminance.movieStart =
              performance.now() + delayBeforeMovieForLuminanceMeasuringMs;
            logger(
              "addMeasureLuminanceIntervals called 1",
              measureLuminance.movieStart,
            );
            addMeasureLuminanceIntervals(status.block_condition);
          }

          // if movie is done register responses

          video.onended = function () {
            // continueRoutine = false;
            video_flag = 1;
            videoblob = [];
            // loggerText("played");
            document.body.removeChild(video);
            if (
              paramReader.read("measureLuminanceBool", status.block_condition)
            ) {
              const luminanceFilename = getLuminanceFilename(
                thisExperimentInfo.experiment,
                status.block,
                paramReader.read("conditionName", status.block_condition),
                status.trial,
              );
              logger("measureLuminance.records", measureLuminance.records);
              psychoJS.experiment.saveCSV(
                measureLuminance.records,
                luminanceFilename,
                false,
                true,
              );

              measureLuminance.records = [];
              measureLuminance.currentMovieValueIndex = 0;
            }
          };
          break;
        case "image":
          //set autodraw = false if imageConfig.targetDurationSec is reached
          if (
            targetImage.status === PsychoJS.Status.STARTED &&
            t >= imageConfig.targetDurationSec + delayBeforeStimOnsetSec
          ) {
            targetImage.setAutoDraw(false);
            targetImage.setImage(createTransparentImage());
            fixation.setAutoDraw(false);
            // continueRoutine = false;
          }
          break;
      }

      if (targetKind.current === "vernier") {
        // *target* updates

        if (
          vernier.status === PsychoJS.Status.STARTED &&
          !letterTiming.targetStartSec
        ) {
          letterTiming.targetStartSec = t;
          readingTiming.onsets.push(clock.global.getTime());
          vernier.frameNDrawnConfirmed = frameN;
          letterTiming.targetDrawnConfirmedTimestamp = performance.now();
          letterTiming.crosshairClickedTimestamp =
            clickedContinue.timestamps[clickedContinue.timestamps.length - 1];

          drawTimingBars(showTimingBarsBool.current, "target", true);
        }
        if (
          t >= delayBeforeStimOnsetSec &&
          vernier.status === PsychoJS.Status.NOT_STARTED
        ) {
          // keep track of start time/frame for later
          vernier.tStart = t; // (not accounting for frame time here)
          vernier.frameNStart = frameN; // exact frame index
          vernier.setAutoDraw(true);
          drawTimingBars(showTimingBarsBool.current, "TargetRequest", true);
        }
        if (
          vernier.status === PsychoJS.Status.FINISHED &&
          !letterTiming.targetFinishSec
        ) {
          letterTiming.targetFinishSec = t;
          vernier.frameNFinishConfirmed = frameN;

          if (showConditionNameConfig.showTargetSpecs) {
            const thisDuration =
              letterTiming.targetFinishSec - letterTiming.targetStartSec;
            showConditionNameConfig.targetSpecs += `\ntargetOnsetSec: ${
              Math.round(thisDuration * 100.0) / 100
            } [${isTimingOK(
              Math.abs(thisDuration - letterConfig.targetDurationSec),
              0.02,
            )}]`;
            targetSpecs.setText(showConditionNameConfig.targetSpecs);
            updateColor(targetSpecs, "instruction", status.block_condition);
            showConditionName(conditionName, targetSpecs);
          }
        }
        if (vernier.status === PsychoJS.Status.STARTED && t >= frameRemains) {
          vernier.setAutoDraw(false);
          drawTimingBars(showTimingBarsBool.current, "target", false);
          drawTimingBars(showTimingBarsBool.current, "TargetRequest", false);
          vernier.status = PsychoJS.Status.NOT_STARTED;
          vernier.frameNEnd = frameN;
          // Play purr sound
          // purrSynth.play();

          setTimeout(() => {
            showCursor();
          }, 500);
        }
      }

      if (targetKind.current === "image") {
        if (
          t >= delayBeforeStimOnsetSec &&
          targetImage.status === PsychoJS.Status.NOT_STARTED
        ) {
          targetImage.setAutoDraw(true);
        }
      }

      if (paramReader.read("targetKind", status.block_condition) === "letter") {
        // *target* updates
        if (paramReader.read("_trackGazeExternallyBool")[0])
          recordStimulusPositionsForEyetracking(
            target,
            "trialRoutineEachFrame",
          );
        if (
          target.status === PsychoJS.Status.STARTED &&
          !letterTiming.targetStartSec
        ) {
          letterTiming.targetDrawnConfirmedTimestamp = performance.now();
          if (typeof performance.memory !== "undefined") {
            letterHeapData.heapTotalPostLatenessMB =
              performance.memory.totalJSHeapSize / 1024 / 1024;
            console.log(
              "heapTotalPostLatenessMB",
              letterHeapData.heapTotalPostLatenessMB,
            );
          }
          letterTiming.targetStartSec = performance.now() / 1000;
          readingTiming.onsets.push(clock.global.getTime());
          target.frameNDrawnConfirmed = frameN;
          drawTimingBars(showTimingBarsBool.current, "target", true);
          drawTimingBars(showTimingBarsBool.current, "gap", false);
        }
        if (
          t >= delayBeforeStimOnsetSec &&
          target.status === PsychoJS.Status.NOT_STARTED
        ) {
          // keep track of start time/frame for later
          target.tStart = t; // (not accounting for frame time here)
          target.frameNStart = frameN; // exact frame index
          // target.setAutoDraw(true);
          target.setOpacity(1);
          target.status = PsychoJS.Status.STARTED;

          // FUTURE stimulus-drawn event/signal?
          if (paramReader.read("showBoundingBoxBool", status.block_condition)) {
            const boundingBoxes = trialComponents.filter((c) =>
              c.name.includes("boundingBox"),
            );
            boundingBoxes.forEach((bb) => bb.setAutoDraw(true));
          }

          letterTiming.targetRequestedTimestamp = performance.now();

          //print to the console heap memory if it is available
          if (typeof performance.memory !== "undefined") {
            letterHeapData.heapUsedAfterDrawingMB =
              performance.memory.usedJSHeapSize / 1024 / 1024;
            letterHeapData.heapTotalAfterDrawingMB =
              performance.memory.totalJSHeapSize / 1024 / 1024;
            letterHeapData.heapLimitAfterDrawingMB =
              performance.memory.jsHeapSizeLimit / 1024 / 1024;
            letterHeapData.heapTotalPreLatenessMB =
              performance.memory.totalJSHeapSize / 1024 / 1024;
            console.log(
              "%c[AFTER DRAWING] Used JS heap size:%c %d MB %cTotal JS heap size:%c %d MB %cJS heap size limit:%c %d MB",
              "color: inherit;",
              "color: red;",
              letterHeapData.heapUsedAfterDrawingMB,
              "color: inherit;",
              "color: red;",
              letterHeapData.heapTotalAfterDrawingMB,
              "color: inherit;",
              "color: red;",
              letterHeapData.heapLimitAfterDrawingMB,
              "heapTotalPreLatenessMB",
              letterHeapData.heapTotalPreLatenessMB,
            );
          } else {
            console.log(
              "Performance memory API is not supported in this browser.",
            );
          }
          drawTimingBars(showTimingBarsBool.current, "TargetRequest", true);
        }
        if (
          target.status === PsychoJS.Status.FINISHED &&
          !letterTiming.targetFinishSec
        ) {
          target.frameNFinishConfirmed = frameN;
        }

        // FUTURE stimulus-undrawn signal?
        if (
          letterTiming.targetStartSec &&
          target.status === PsychoJS.Status.STARTED &&
          performance.now() / 1000 >=
            frameRemains + letterTiming.targetStartSec - delayBeforeStimOnsetSec
        ) {
          letterTiming.blackoutDetectedBool =
            letterConfig.thresholdAllowedBlackoutBool
              ? false
              : checkForBlackout(
                  psychoJS.window._renderer.gl,
                  stimulusParameters.targetAndFlankersXYPx[0],
                  paramReader.read(
                    "showTimingBarsBool",
                    status.block_condition,
                  ),
                );

          target.setAutoDraw(false);
          letterTiming.targetFinishSec = performance.now() / 1000;
          drawTimingBars(showTimingBarsBool.current, "target", false);
          drawTimingBars(showTimingBarsBool.current, "TargetRequest", false);
          trialComponents
            .filter((s) => s.name.includes("boundingBox"))
            .forEach((c) => c.setAutoDraw(false));

          target.frameNEnd = frameN;
          // clear bounding box canvas
          clearBoundingBoxCanvas();
          fixation.setAutoDraw(false);

          if (
            simulatedObservers.proceed(status.block_condition) &&
            paramReader.read("simulateWithDisplayBool", status.block_condition)
          ) {
            await simulatedObservers.respond();
          }

          if (typeof performance.memory !== "undefined") {
            psychoJS.experiment.addData(
              "heapUsedBeforeDrawing (MB)",
              letterHeapData.heapUsedBeforeDrawingMB,
            );
            psychoJS.experiment.addData(
              "heapTotalBeforeDrawing (MB)",
              letterHeapData.heapTotalBeforeDrawingMB,
            );
            psychoJS.experiment.addData(
              "heapLimitBeforeDrawing (MB)",
              letterHeapData.heapLimitBeforeDrawingMB,
            );
            psychoJS.experiment.addData(
              "heapUsedAfterDrawing (MB)",
              letterHeapData.heapUsedAfterDrawingMB,
            );
            psychoJS.experiment.addData(
              "heapTotalAfterDrawing (MB)",
              letterHeapData.heapTotalAfterDrawingMB,
            );
            psychoJS.experiment.addData(
              "heapLimitAfterDrawing (MB)",
              letterHeapData.heapLimitAfterDrawingMB,
            );
            psychoJS.experiment.addData(
              "heapTotalPreLateness (MB)",
              letterHeapData.heapTotalPreLatenessMB,
            );
            psychoJS.experiment.addData(
              "heapTotalPostLateness (MB)",
              letterHeapData.heapTotalPostLatenessMB,
            );
          }

          // report to formspree if _logFontBool is True
          if (paramReader.read("_logFontBool")[0]) {
            logHeapToFormspree(
              letterHeapData.heapUsedBeforeDrawingMB,
              letterHeapData.heapTotalBeforeDrawingMB,
              letterHeapData.heapLimitBeforeDrawingMB,
              letterHeapData.heapUsedAfterDrawingMB,
              letterHeapData.heapTotalAfterDrawingMB,
              letterHeapData.heapLimitAfterDrawingMB,
              letterHeapData.heapTotalPreLatenessMB,
              letterHeapData.heapTotalPostLatenessMB,
            );
          }

          // Play purr sound
          // purrSynth.play();
          if (showConditionNameConfig.showTargetSpecs) {
            const thisDuration =
              letterTiming.targetFinishSec - letterTiming.targetStartSec;
            showConditionNameConfig.targetSpecs += `\nmeasuredDurationSec: ${
              thisDuration !== undefined ? thisDuration.toFixed(5) : "undefined"
            }`;
            const thisLateness =
              (letterTiming.targetDrawnConfirmedTimestamp -
                letterTiming.targetRequestedTimestamp) /
              1000;
            showConditionNameConfig.targetSpecs += `\nmeasuredLatenessSec: ${
              thisLateness !== undefined ? thisLateness.toFixed(5) : "undefined"
            }`;
            targetSpecs.setText(showConditionNameConfig.targetSpecs);
            updateColor(targetSpecs, "instruction", status.block_condition);
            showConditionName(conditionName, targetSpecs);
          }

          setTimeout(() => {
            showCursor();
          }, 500);
        }
        // flankers update
        flankersUsed.forEach((f) => {
          if (
            t >= delayBeforeStimOnsetSec &&
            f.status === PsychoJS.Status.NOT_STARTED
          ) {
            // keep track of start time/frame for later
            f.tStart = performance.now() / 1000; // (not accounting for frame time here)
            f.frameNStart = frameN; // exact frame index
            // f.setAutoDraw(true);
            f.setOpacity(1);
            f.status = PsychoJS.Status.STARTED;
          }
          if (
            letterTiming.targetStartSec &&
            f.status === PsychoJS.Status.STARTED &&
            performance.now() / 1000 >=
              frameRemains +
                letterTiming.targetStartSec -
                delayBeforeStimOnsetSec
          ) {
            f.setAutoDraw(false);
          }
        });
      } else {
        if (
          simulatedObservers.proceed(status.block_condition) &&
          paramReader.read("simulateWithDisplayBool", status.block_condition)
        ) {
          await simulatedObservers.respond();
        }
      }

      // check for quit (typically the Esc key)
      if (
        psychoJS.experiment.experimentEnded ||
        psychoJS.eventManager.getKeys({ keyList: ["escape"] }).length > 0
      ) {
        let action = await handleEscapeKey();
        if (action.quitSurvey) {
          return quitPsychoJS("", false, paramReader);
        }
      }

      // updateBoundingBoxPolies(
      //   t,
      //   frameRemains,
      //   frameN,
      //   showBoundingBox,
      //   showCharacterSetBoundingBox,
      //   boundingBoxPolies,
      //   characterSetBoundingBoxPolies,
      //   displayCharacterSetBoundingBoxPolies[status.block_condition],
      //   letterConfig.spacingRelationToSize,
      //   timeWhenRespondable,
      //   thresholdParameter,
      // );
      /* -------------------------------------------------------------------------- */

      // SHOW CharacterSet AND INSTRUCTIONS
      switchKind(targetKind.current, {
        vocoderPhrase: () => {
          showCursor();
          instructions.setAutoDraw(true);
          // TODO show if simulated
          if (vocoderPhraseShowClickable.current) {
            // keep track of start time/frame for later
            showCharacterSet.tStart = t; // (not accounting for frame time here)
            showCharacterSet.frameNStart = frameN; // exact frame index
            showCharacterSet.setAutoDraw(true);
            vocoderPhraseShowClickable.current = false;
            vocoderPhraseSetupClickableCategory(
              vocoderPhraseCategories,
              showCharacterSetResponse,
            );
          }
        },
        sound: () => {
          instructions.setAutoDraw(true);
          //speech in noise setup clickable characters
          // *showCharacterSet* updates
          if (
            (targetTask.current == "identify" &&
              speechInNoiseTargetList.current &&
              speechInNoiseShowClickable.current) ||
            (simulatedObservers.proceed(status.block_condition) &&
              speechInNoiseShowClickable.current)
          ) {
            validAns = [""];
            speechInNoiseShowClickable.current = false;
            // keep track of start time/frame for later
            showCharacterSet.tStart = t; // (not accounting for frame time here)
            showCharacterSet.frameNStart = frameN; // exact frame index
            showCharacterSet.setAutoDraw(true);
            setupClickableCharacterSet(
              speechInNoiseTargetList.current,
              font.name,
              0, // letter spacing not applicable
              "bottom",
              showCharacterSetResponse,
              null,
              "",
              "sound",
              status.block_condition,
              responseType.current,
            );
            speechInNoiseTargetList.current = undefined;
          }
        },
        letter: () => {
          // *showCharacterSet* updates
          if (
            (t >=
              delayBeforeStimOnsetSec +
                letterConfig.markingOnsetAfterTargetOffsetSecs +
                letterConfig.targetDurationSec +
                0.1 ||
              simulatedObservers.proceed()) &&
            showCharacterSet.status === PsychoJS.Status.NOT_STARTED
          ) {
            // keep track of start time/frame for later
            showCharacterSet.tStart = t; // (not accounting for frame time here)
            showCharacterSet.frameNStart = frameN; // exact frame index
            showCharacterSet.setAutoDraw(true);
            let triplet = target.text;
            try {
              triplet = flanker1.text + target.text + flanker2.text;
            } catch (e) {
              console.error("Error getting triplet", e);
            }

            setupClickableCharacterSet(
              fontCharacterSet.current,
              font.name,
              0, // letter spacing not applicable
              fontCharacterSet.where,
              showCharacterSetResponse,
              null,
              "",
              targetKind.current,
              status.block_condition,
              responseType.current,
              triplet,
            );

            instructions.tSTart = t;
            instructions.frameNStart = frameN;
            instructions.setAutoDraw(true);
          }
        },
        movie: () => {
          // *showCharacterSet* updates

          if (
            (t >=
              delayBeforeStimOnsetSec +
                letterConfig.markingOnsetAfterTargetOffsetSecs +
                measureLuminance.movieSec ||
              simulatedObservers.proceed(status.block_condition)) &&
            showCharacterSet.status === PsychoJS.Status.NOT_STARTED
          ) {
            // keep track of start time/frame for later
            showCharacterSet.tStart = t; // (not accounting for frame time here)
            showCharacterSet.frameNStart = frameN; // exact frame index
            showCharacterSet.setAutoDraw(true);
            setupClickableCharacterSet(
              fontCharacterSet.current,
              font.name,
              0, // letter spacing not applicable
              fontCharacterSet.where,
              showCharacterSetResponse,
              null,
              "",
              targetKind.current,
              status.block_condition,
              responseType.current,
            );

            // instructions.setText(
            //   "Please identify the orientation by selecting a letter.\n V means vertical, H means horizontal, R means tilted right, and L means tilted left."
            // );
            updateColor(instructions, "instruction", status.block_condition);
            instructions.tSTart = t;
            instructions.frameNStart = frameN;
            instructions.setAutoDraw(true);
          }
        },
        vernier: () => {
          // *showCharacterSet* updates
          if (
            (t >=
              delayBeforeStimOnsetSec +
                letterConfig.markingOnsetAfterTargetOffsetSecs +
                letterConfig.targetDurationSec ||
              simulatedObservers.proceed(status.block_condition)) &&
            showCharacterSet.status === PsychoJS.Status.NOT_STARTED &&
            canClick(responseType.current)
          ) {
            // keep track of start time/frame for later
            showCharacterSet.tStart = t; // (not accounting for frame time here)
            showCharacterSet.frameNStart = frameN; // exact frame index
            showCharacterSet.setAutoDraw(true);

            setupClickableCharacterSet(
              validAns,
              font.name,
              0, // letter spacing not applicable
              fontCharacterSet.where,
              showCharacterSetResponse,
              null,
              "",
              targetKind.current,
              status.block_condition,
              responseType.current,
            );
            instructions.tSTart = t;
            instructions.frameNStart = frameN;
            instructions.setAutoDraw(true);
          }
        },
      });

      //TODO: support async function in switchKind (doesnt work well currently)
      if (targetKind.current === "image") {
        if (
          t >=
          imageConfig.delayBeforeStimOnsetSec +
            imageConfig.targetDurationSec +
            imageConfig.delayAfterStimOnsetSec +
            0.1
        ) {
          showCursor();
          parseImageQuestionAndAnswer(status.block_condition);
          key_resp.corr = await questionAndAnswerForImage(
            status.block_condition,
          );
          continueRoutine = false;
        }
      }

      /* -------------------------------------------------------------------------- */

      // check if the Routine should terminate
      if (!continueRoutine) {
        // a component has requested a forced-end of Routine
        removeClickableCharacterSet(showCharacterSetResponse, showCharacterSet);
        vocoderPhraseRemoveClickableCategory(showCharacterSetResponse);
        continueRoutine = true;
        return Scheduler.Event.NEXT;
      }

      continueRoutine = false; // reverts to True if at least one component still running

      if (trialComponents)
        for (const thisComponent of trialComponents)
          if (
            "status" in thisComponent &&
            thisComponent.status !== PsychoJS.Status.FINISHED
          ) {
            continueRoutine = true;
            break;
          }

      ////
      if (stats.on) stats.current.end();
      ////

      if (
        t >= timeWhenRespondable &&
        !customResponseInstructionsDisplayed &&
        !["reading"].includes(targetKind.current)
      ) {
        const customInstructions = getCustomInstructionText(
          "response",
          paramReader,
          status.block_condition,
        );
        if (customInstructions.length)
          _instructionSetup(
            customInstructions,
            status.block_condition,
            false,
            1.0,
          );
        customResponseInstructionsDisplayed = true;
      }

      // refresh the screen if continuing
      if (continueRoutine) {
        return Scheduler.Event.FLIP_REPEAT;
      } else {
        continueRoutine = true;
        return Scheduler.Event.NEXT;
      }
    };
  }

  function trialRoutineEnd(snapshot) {
    return async function () {
      setCurrentFn("trialRoutineEnd");
      ////
      clearBoundingBoxCanvas();
      speechInNoiseShowClickable.current = true;
      vocoderPhraseShowClickable.current = true;
      grid.current.hide();
      grid.units = undefined;
      if (flies) {
        flies.draw(false);
        flies = undefined;
      }

      if (Screens[0].fixationConfig.nominalPos)
        Screens[0].fixationConfig.pos = Screens[0].fixationConfig.nominalPos;

      if (toShowCursor()) {
        showCursor();
        if (trialComponents)
          trialComponents
            .filter((c) => c.setAutoDraw === "function")
            .forEach((c) => c.setAutoDraw(false));
        incrementTrialsCompleted(status.block_condition, paramReader);
        if (currentLoop instanceof MultiStairHandler) {
          currentLoop._nextTrial();
        }
        console.log("trialRoutineEnd...trialComponents", trialComponents);
        routineTimer.reset();
        routineClock.reset();
        key_resp.corr = undefined;
        key_resp.stop();
        return Scheduler.Event.NEXT;
      }

      /* -------------------------------------------------------------------------- */
      // ! question and answer
      const isQACondition = isQuestionAndAnswerCondition(
        paramReader,
        status.block_condition,
      );
      if (isQACondition && targetKind.current !== "image") {
        updateReadingParagraphForQuestionAndAnswer = true;
        showProgressBar();
        if (
          ifTrue(paramReader.read("calibrateDistanceBool", status.block)) &&
          !rc.calibrationSimulatedBool
        ) {
          loggerText("[RC] resuming distance");

          if (rc.setDistanceDesired) {
            // rc.pauseNudger();
            rc.setDistanceDesired(
              Math.min(viewingDistanceCm.desired, viewingDistanceCm.max),
              paramReader.read(
                "viewingDistanceAllowedRatio",
                status.block_condition,
              ) == 0
                ? 99
                : paramReader.read(
                    "viewingDistanceAllowedRatio",
                    status.block_condition,
                  ),
              paramReader.read("needKeypadBeyondCm", status.block_condition),
            );
          }

          viewingDistanceCm.current = rc.viewingDistanceCm
            ? rc.viewingDistanceCm.value
            : Math.min(viewingDistanceCm.desired, viewingDistanceCm.max);
          Screens[0].viewingDistanceCm = viewingDistanceCm.current;
          Screens[0].nearestPointXYZPx =
            rc.improvedDistanceTrackingData !== undefined
              ? rc.improvedDistanceTrackingData.nearestXYPx
              : Screens[0].nearestPointXYZPx;

          rc.resumeDistance(paramReader.read("_showIrisesBool")[0] || false);
          rc.resumeNudger();
        }
        // TEXT|New York|This is a free form text answer question. Please put the name of your favorite city here.
        // CHOICE|Apple|This is an example multiple choice question. Please select your favorite fruit.|Apple|Banana|Watermelon|Strawberry
        // 0     |1    |2                                                                              |3
        let correctAnswer, question, answers;

        let thisQuestionAndAnswer =
          questionsThisBlock.current[status.trial - 1];

        if (!thisQuestionAndAnswer) {
          console.error("thisQuestionAndAnswer is undefined!");
          console.error(
            "questionsThisBlock.current.length=",
            questionsThisBlock.current?.length,
          );
          console.error("Expected index (status.trial - 1)=", status.trial - 1);
        }

        const questionComponents = thisQuestionAndAnswer?.split("|") || [];

        const choiceQuestionBool = questionComponents.length > 3;

        // ! shortcut
        const questionAndAnswerShortcut = questionComponents[0];
        // ! correct answer
        correctAnswer = questionComponents[1];
        // ! question
        question = questionComponents[2];
        // ! answers
        if (choiceQuestionBool) {
          answers = questionComponents.slice(3).filter((c) => c.length);
        } else {
          // freeform / TEXT
          answers = "";
        }

        let html = "";
        const inputOptions = new Map();

        if (choiceQuestionBool) {
          // html += `<div class="question">${question}</div>`
          html += '<div class="threshold-answers-set">';
          for (let i = 0; i < answers.length; i++) {
            html += `<button class="threshold-button threshold-answer" data-answer="${answers[i]}">${answers[i]}</button>`;
          }
          html += "</div>";
          ////
          for (const ans of answers) {
            inputOptions.set(ans, ans);
          }
        } else {
          html += `<input type="text" class="threshold-answer">`;
          ////
        }
        const fontLeftToRightBool = paramReader.read(
          "fontLeftToRightBool",
          status.block_condition,
        );

        const result = await Swal.fire({
          title: question,
          // html: html,
          input: choiceQuestionBool ? "radio" : "textarea",
          inputOptions: inputOptions,
          inputAttributes: {
            autocapitalize: "off",
          },
          showCancelButton: false,
          showDenyButton: false,
          showConfirmButton: true,
          allowEnterKey: false,
          allowOutsideClick: false,
          allowEscapeKey: false,
          stopKeydownPropagation: false,
          // backdrop: false, // TODO remove, and undraw all other stims (instructions, old reading stimulus, etc)
          customClass: {
            confirmButton: `threshold-button${
              choiceQuestionBool ? " hidden-button" : ""
            }`,
            container: fontLeftToRightBool ? "" : "right-to-left",
            title: fontLeftToRightBool ? "" : "right-to-left",
          },
          // showClass: {
          //   popup: "swal2-show",
          //   backdrop: "swal2-backdrop-show",
          //   icon: "swal2-icon-show",
          // },
          // hideClass: {
          //   popup: "swal2-hide",
          //   backdrop: "swal2-backdrop-hide",
          //   icon: "swal2-icon-hide",
          // },
          showClass: {
            popup: "fade-in",
            backdrop: "swal2-backdrop-hide",
            icon: "swal2-icon-show",
          },
          hideClass: {
            popup: "",
            backdrop: "swal2-backdrop-hide",
            icon: "swal2-icon-hide",
          },
          didOpen: () => {
            if (choiceQuestionBool) {
              const _ = setInterval(() => {
                // FUTURE handle skip block more elegently?
                // Check for block skip request during questionAnswer
                if (skipTrialOrBlock.skipBlock) {
                  clearInterval(_);
                  Swal.close();
                  return;
                }

                const radioInputs =
                  document.querySelectorAll(".swal2-radio input");

                for (const e of radioInputs) {
                  if (e.checked) {
                    clearInterval(_);
                    document.getElementsByClassName("swal2-confirm")[0].click();
                  }
                }
              }, 200);
            } else {
              // FUTURE handle skip block more elegently?
              // For text input questions, also check for block skip
              const blockSkipChecker = setInterval(() => {
                if (toShowCursor()) {
                  clearInterval(blockSkipChecker);
                  Swal.close();
                  return;
                }
              }, 200);
            }
            const questionAndAnswers = document.querySelector(".swal2-title");
            if (questionAndAnswers) {
              questionAndAnswers.style.fontFamily = instructionFont.current;
              questionAndAnswers.style.font = instructionFont.current;
            }
            styleNodeAndChildrenRecursively(
              document.querySelector(".swal2-popup"),
              {
                "background-color": colorRGBASnippetToRGBA(
                  paramReader.read("screenColorRGBA", status.block_condition),
                ),
                color: colorRGBASnippetToRGBA(
                  paramReader.read(
                    "instructionFontColorRGBA",
                    status.block_condition,
                  ),
                ),
              },
            );
          },
          // preConfirm: (value) => {
          //   if (choiceQuestionBool && !value) {
          //     Swal.showValidationMessage("You must select an answer.");
          //     return false;
          //   }
          // },
        });

        logger("questionAndAnswer RESULT", result);

        if (result && result.value) {
          const answer = result.value;
          psychoJS.experiment.addData(
            questionAndAnswerShortcut || question,
            answer,
          );
          // psychoJS.experiment.addData(
          //   `${questionAndAnswerShortcut || question}CorrectAnswer`,
          //   correctAnswer
          // );
          psychoJS.experiment.addData(
            "questionAndAnswerNickname",
            questionAndAnswerShortcut,
          );
          psychoJS.experiment.addData("questionAndAnswerQuestion", question);
          psychoJS.experiment.addData(
            "questionAndAnswerCorrectAnswer",
            correctAnswer,
          );
          psychoJS.experiment.addData("questionAndAnswerResponse", answer);
          if (
            answer === correctAnswer &&
            paramReader.read(
              "responsePositiveFeedbackBool",
              status.block_condition,
            )
          ) {
            correctSynth.play();
          }
        }
        if (showConditionNameConfig.showTargetSpecs)
          targetSpecs.setAutoDraw(false);
        if (showConditionNameConfig.show) conditionName.setAutoDraw(false);
        //progress bar updates only when blocks complete

        // continueRoutine = true;
        // return Scheduler.Event.NEXT;
      } else {
        if (showConditionNameConfig.showTargetSpecs)
          targetSpecs.setAutoDraw(false);
        if (showConditionNameConfig.show) conditionName.setAutoDraw(false);

        // ! ending trial routine
        for (const thisComponent of trialComponents) {
          if (typeof thisComponent.setAutoDraw === "function") {
            thisComponent.setAutoDraw(false);
          }
        }

        // was no response the correct answer?!
        if (key_resp.keys == []) {
          console.error("[key_resp.keys] No response error.");
        }

        // NOTE Only means what it's called in `reading` mode
        timing.stimulusOnsetToOffset =
          routineClock.getTime() - timing.clickToStimulusOnsetSec;

        const aCorrectResponseGiven =
          !!key_resp.corr ||
          (Symbol.iterator in Object(key_resp.corr) &&
            key_resp.corr.some((r) => r)) ||
          (targetKind.current === "rsvpReading" &&
            phraseIdentificationResponse.correct.some((r) => r));

        // Determine whether to retry trial based on practicing
        const justPracticingSoRetryTrial =
          // practice requested
          paramReader.read(
            "thresholdPracticeUntilCorrectBool",
            status.block_condition,
          ) &&
          // not finished practice yet, ie haven't had any correct yet
          !thresholdParacticeUntilCorrect.doneWithPractice.get(
            status.block_condition,
          );
        const doneWithPracticeSoResetQuest =
          justPracticingSoRetryTrial &&
          // this response was correct;
          aCorrectResponseGiven;
        if (doneWithPracticeSoResetQuest)
          thresholdParacticeUntilCorrect.doneWithPractice.set(
            status.block_condition,
            true,
          );
        const okToRetryThisTrial = okayToRetryThisTrial(
          status,
          paramReader,
          skipTrialOrBlock,
        );
        status.retryThisTrialBool =
          (justPracticingSoRetryTrial || status.retryThisTrialBool) &&
          okToRetryThisTrial;

        // store data for psychoJS.experiment (ExperimentHandler)
        // update the trial handler
        switchKind(targetKind.current, {
          vocoderPhrase: () => {
            addTrialStaircaseSummariesToDataForSound(currentLoop, psychoJS);
            //report values to quest
            if (
              currentLoop instanceof MultiStairHandler &&
              currentLoop.nRemaining !== 0
            ) {
              const isTrialGood = true; // TODO only give to QUEST if acceptable
              const isConditionNowFinished = isConditionFinished(
                status.block_condition,
                paramReader,
                status,
                isTrialGood,
              );
              const trialKind =
                (isTrialGood ? "good" : "bad") +
                (justPracticingSoRetryTrial ? "practice" : "trial");
              psychoJS.experiment.addData("trialKind", trialKind);
              currentLoop.addResponse(
                key_resp.corr,
                ProposedVolumeLevelFromQuest.adjusted / 20,
                isTrialGood,
                doneWithPracticeSoResetQuest,
                status.retryThisTrialBool,
                isConditionNowFinished,
              );
            }
          },
          image: () => {
            //temp
            currentLoop._nextTrial();
            status.trialCompleted_thisBlock += 1;
          },
          sound: () => {
            addTrialStaircaseSummariesToDataForSound(currentLoop, psychoJS);
            //report values to quest
            if (
              currentLoop instanceof MultiStairHandler &&
              currentLoop.nRemaining !== 0
            ) {
              const isTrialGood = true; // TODO only give to QUEST if acceptable
              const isConditionNowFinished = isConditionFinished(
                status.block_condition,
                paramReader,
                status,
                isTrialGood,
              );
              const trialKind =
                (isTrialGood ? "good" : "bad") +
                (justPracticingSoRetryTrial ? "practice" : "trial");
              psychoJS.experiment.addData("trialKind", trialKind);

              currentLoop.addResponse(
                key_resp.corr,
                ProposedVolumeLevelFromQuest.adjusted / 20,
                isTrialGood,
                doneWithPracticeSoResetQuest,
                status.retryThisTrialBool,
                isConditionNowFinished,
              );
            }
          },
          reading: () => {
            addReadingStatsToOutput(
              trials.thisRepN,
              psychoJS,
              status.block_condition,
            );
          },
          letter: () => {
            _letter_trialRoutineEnd(
              target,
              currentLoop,
              simulatedObservers.proceed() &&
                !paramReader.read(
                  "simulateWithDisplayBool",
                  status.block_condition,
                ),
              key_resp.corr,
              level,
              letterRespondedEarly,
              doneWithPracticeSoResetQuest,
              justPracticingSoRetryTrial,
            );
            if (paramReader.read("_trackGazeExternallyBool")[0])
              recordStimulusPositionsForEyetracking(target, "trialRoutineEnd");
          },
          repeatedLetters: () => {
            const numberOfResponses = repeatedLettersResponse.current.length;
            for (let i = 0; i < numberOfResponses; i++) {
              const thisResponse = repeatedLettersResponse.current.shift();
              const thisResponseTime = repeatedLettersResponse.rt.shift();
              psychoJS.experiment.addData(
                `repatedLetters-${i}-RESPONSE`,
                thisResponse,
              );
              psychoJS.experiment.addData(
                `repeatedLetters-${i}-RESPONSE${thisResponse}-TimeOfResponse`,
                thisResponseTime,
              );
            }
            _letter_trialRoutineEnd(
              repeatedLettersConfig.stims[0],
              currentLoop,
              simulatedObservers.proceed(status.block_condition),
              repeatedLettersResponse.correct,
              level,
              letterRespondedEarly,
            );
            repeatedLettersResponse.current = [];
            repeatedLettersResponse.correct = [];
            repeatedLettersResponse.rt = [];
          },
          rsvpReading: () => {
            _rsvpReading_trialRoutineEnd(
              currentLoop,
              level,
              doneWithPracticeSoResetQuest,
              paramReader,
            );
          },
          movie: () => {
            addTrialStaircaseSummariesToData(currentLoop, psychoJS);
            if (
              currentLoop instanceof MultiStairHandler &&
              currentLoop.nRemaining !== 0
            ) {
              const isTrialGood = true; // TODO only give to QUEST if acceptable
              const isConditionNowFinished = isConditionFinished(
                status.block_condition,
                paramReader,
                status,
                isTrialGood,
              );

              const trialKind =
                (isTrialGood ? "good" : "bad") +
                (justPracticingSoRetryTrial ? "practice" : "trial");
              psychoJS.experiment.addData("trialKind", trialKind);

              currentLoop.addResponse(
                key_resp.corr,
                // intensity
                //Math.log10(targetContrast)
                actualStimulusLevel,
                isTrialGood,
                doneWithPracticeSoResetQuest,
                status.retryThisTrialBool,
                isConditionNowFinished,
              );
              // }
            }
          },
          vernier: () => {
            addTrialStaircaseSummariesToData(currentLoop, psychoJS);
            if (
              currentLoop instanceof MultiStairHandler &&
              currentLoop.nRemaining !== 0
            ) {
              const isTrialGood = true; // TODO only give to QUEST if acceptable
              const isConditionNowFinished = isConditionFinished(
                status.block_condition,
                paramReader,
                status,
                isTrialGood,
              );
              const trialKind =
                (isTrialGood ? "good" : "bad") +
                (justPracticingSoRetryTrial ? "practice" : "trial");
              psychoJS.experiment.addData("trialKind", trialKind);

              currentLoop.addResponse(
                key_resp.corr,
                level,
                isTrialGood,
                doneWithPracticeSoResetQuest,
                status.retryThisTrialBool,
                isConditionNowFinished,
              );
            }
          },
        });

        psychoJS.experiment.addData(
          "key_resp.keys",
          _key_resp_allKeys.current.map((k) => k.name).toString(),
        );
        psychoJS.experiment.addData("key_resp.corr", key_resp.corr);
        psychoJS.experiment.addData("correctAns", correctAns.current);
        // if (typeof key_resp.keys !== "undefined") {
        if (key_resp.keys.length) {
          // we had a response
          psychoJS.experiment.addData("key_resp.rt", key_resp.rt.toString());
          // ie time from the end to `trialRoutineBegin` to the start of `trialRoutineEnd`
          psychoJS.experiment.addData(
            "trialRoutineDurationFromBeginSec",
            trialClock.getTime(),
          );
          // ie time from the end of the previous trial to the end of this trial
          psychoJS.experiment.addData(
            "trialRoutineDurationFromPreviousEndSec",
            routineClock.getTime(),
          );
        }
      }

      key_resp.stop();
      // the Routine "trial" was not non-slip safe, so reset the non-slip timer
      routineTimer.reset();
      routineClock.reset();

      // Increase takeABreakCredit
      currentBlockCreditForTrialBreak += paramReader.read(
        "takeABreakTrialCredit",
        status.block_condition,
      );
      if (simulatedObservers.proceed(status.block_condition))
        currentBlockCreditForTrialBreak = 0;
      //progress bar updates only when blocks complete
      // Toggle takeABreak credit progressBar
      if (paramReader.read("showTakeABreakCreditBool", status.block_condition))
        showTrialBreakProgressBar(currentBlockCreditForTrialBreak);
      else hideTrialBreakProgressBar();

      // Check if trialBreak should be triggered
      if (
        !["questionAnswer", "questionAndAnswer"].includes(targetTask.current) &&
        currentBlockCreditForTrialBreak >= 1
      ) {
        currentBlockCreditForTrialBreak -= 1;

        showPopup(
          thisExperimentInfo.name,
          readi18nPhrases("T_takeABreakPopup", rc.language.value),
          "",
          true, // Don't show proceed button for this temporary/manditory popup
          true, // Don't show proceed text for this temporary/manditory popup
        );
        const takeABreakMinimumDurationSec = paramReader.read(
          "takeABreakMinimumDurationSec",
          status.block_condition,
        );

        return new Promise((resolve) => {
          // After break time out...
          setTimeout(() => {
            // Show proceed hint and/or button
            showPopupProceed(
              thisExperimentInfo.name,
              instructionsText.trialBreak(
                rc.language.value,
                responseType.current,
              ),
              canClick(responseType.current),
            );
            addPopupLogic(
              thisExperimentInfo.name,
              responseType.current,
              () => {
                resolve(Scheduler.Event.NEXT);
              },
              keypad.handler,
              rc.language.value,
            );
          }, takeABreakMinimumDurationSec * 1000);
        });
      }

      // if trialBreak is ongoing
      else if (totalTrialsThisBlock.current === status.trial)
        hideTrialBreakProgressBar();

      if (!status.retryThisTrialBool) {
        incrementTrialsCompleted(status.block_condition, paramReader);
      }
      psychoJS.experiment.addData(
        "retryingThisTrialBool",
        status.retryThisTrialBool,
      );
      status.retryThisTrialBool = false;
      fontSize.current = "Reset at end of trial.";

      return Scheduler.Event.NEXT;
    };
  }

  function endLoopIteration(scheduler, snapshot) {
    // ------Prepare for next entry------
    return async function () {
      setCurrentFn("endLoopIteration");
      if (toShowCursor()) {
        showCursor();
        if (typeof snapshot !== "undefined" && snapshot.finished) {
          scheduler.stop();
        }
        psychoJS.experiment.nextEntry(snapshot);
        return Scheduler.Event.NEXT;
      }

      if (typeof snapshot !== "undefined") {
        // ------Check if user ended loop early------
        if (snapshot.finished) {
          // Check for and save orphaned data
          if (psychoJS.experiment.isEntryEmpty()) {
            psychoJS.experiment.nextEntry(snapshot);
          }
          scheduler.stop();
        } else {
          const thisTrial = snapshot.getCurrentTrial();
          if (
            typeof thisTrial === "undefined" ||
            !("isTrials" in thisTrial) ||
            thisTrial.isTrials
          ) {
            psychoJS.experiment.nextEntry(snapshot);
          }
        }
        return Scheduler.Event.NEXT;
      }
    };
  }

  function importConditions(currentLoopSnapshot, snapshotType) {
    return async function () {
      setCurrentFn("importConditions");
      if (snapshotType === "trial") {
        // ! update trial counter
        // dangerous
        status.trial = currentLoopSnapshot.thisN;

        // Progress bar updates only when blocks complete, not on individual trials

        const parametersToExcludeFromData = [
          "_calibrateDistanceCheckCm",
          "_calibrateDistanceCheckLengthCm",
        ];
        const currentTrial = currentLoopSnapshot.getCurrentTrial();
        const BC =
          currentTrial?.["trials.label"] ??
          currentTrial?.["label"] ??
          undefined;
        const conditionName = BC
          ? paramReader.read("conditionName", BC)
          : undefined;
        const condition = BC ? BC.split("_")[1] : undefined;
        console.log(
          `%c====== blk ${status.block}, trl ${status.trial}, cnd ${condition}, ${conditionName}, ${psychoJS.config.experiment.name} ======`,
          "background: purple; color: white; padding: 1rem",
        );

        try {
          instructions.setAutoDraw(false);
          instructions2.setAutoDraw(false);
        } catch (e) {}

        if (currentTrial === undefined) {
          warning(
            "PsychoJS call currentLoopSNapshot.getCurrentTrial failed, currentTrial is undefined",
          );
          return Scheduler.Event.NEXT;
        }
        // Format of currentTrial is different for "reading" vs "rsvpReading", "letter", etc
        status.block_condition = BC;
        incrementTrialsAttempted(BC);
        addConditionToData(
          paramReader,
          BC,
          psychoJS.experiment,
          parametersToExcludeFromData,
        );
        // Update sampling rate for cursor tracking, as it can vary by condition
        updateTrackCursorHz(paramReader);
        setFontGlobalState(status.block_condition, paramReader);
        psychoJS.fontRenderMaxPx = paramReader.read(
          "fontRenderMaxPx",
          status.block_condition,
        );
      } else if (snapshotType === "block") {
        status.block_condition = undefined;
        // Reset skipBlock
        skipTrialOrBlock.skipBlock = false;
      } else if (snapshotType !== "trial" && snapshotType !== "block") {
        console.log(
          "%c====== Unknown Snapshot ======",
          "background: red; color: white; padding: 1rem",
        );
      }
      // }

      // Begin tracking the cursor, if _saveCursorPositionBool
      trackCursor(paramReader);

      logger(`this ${snapshotType}`, currentLoopSnapshot.getCurrentTrial());
      psychoJS.importAttributes(currentLoopSnapshot.getCurrentTrial());

      if (responseSkipBlockForWhomRemover) responseSkipBlockForWhomRemover();
      responseSkipBlockForWhomRemover = handleResponseSkipBlockForWhom();

      return Scheduler.Event.NEXT;
    };
  }
};
