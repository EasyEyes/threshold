/**********************
 * EasyEyes Threshold *
 **********************/

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
  useRC,
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
  preStimulus,
  microphoneInfo,
  needPhoneSurvey,
  needComputerSurveyBool,
  gotLoudspeakerMatch,
  readingCorpusShuffleBool,
  keypad,
  markingShowCursorBool,
  _key_resp_event_handlers,
  cursorTracking,
  targetEccentricityDeg,
  readingCorpusDepleted,
  measureMeters,
  showTimingBarsBool,
  audioTargetsToSetSinkId,
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
  setupPhraseIdentification,
} from "./components/response.js";

import {
  addFontGeometryToOutputData,
  cleanFontName,
  loadFonts,
  setFontGlobalState,
} from "./components/fonts.js";
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
  updateTargetSpecsForLetter,
  updateTargetSpecsForMovie,
  updateTargetSpecsForRepeatedLetters,
  updateTargetSpecsForReading,
  updateTargetSpecsForRsvpReading,
  updateTargetSpecsForSound,
  updateTargetSpecsForSoundDetect,
  updateTargetSpecsForSoundIdentify,
} from "./components/showTrialInformation.js";
import {
  getTrialInfoStr,
  liveUpdateTrialCounter,
  trackNthTrialInCondition,
} from "./components/trialCounter.js";
////

import {
  _getCharacterSetBoundingBox,
  ctx,
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

import {
  generateBoundingBoxPolies,
  addBoundingBoxesToComponents,
  sizeAndPositionBoundingBoxes,
  updateBoundingBoxPolies,
} from "./components/boundingBoxes.js";

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
} from "./components/trialRoutines.js";

/* ---------------------------------- */

import { switchKind, switchTask } from "./components/blockTargetKind.js";
import {
  addSkipTrialButton,
  handleEscapeKey,
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
} from "./components/soundUtils.js";
import {
  getSpeechInNoiseTrialData,
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
import {
  isProlificExperiment,
  saveProlificInfo,
} from "./components/externalServices.js";
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
  removeRevealableTargetWordsToAidSpokenScoring,
  addRsvpReadingTrialResponsesToData,
} from "./components/rsvpReading.js";
import {
  createProgressBar,
  hideProgressBar,
  showProgressBar,
  updateProgressBar,
} from "./components/progressBar.js";
import { logNotice, logQuest } from "./components/logging.js";
import { getBlockOrder, getBlocksTrialList } from "./components/shuffle.ts";
import { KeypadHandler } from "./components/keypad.js";
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
import {
  setPreStimulusRerunInterval,
  viewingDistanceOutOfBounds,
} from "./components/rerunPrestimulus.js";
import { getDotAndBackGrid, getFlies } from "./components/dotAndGrid.ts";
import {
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
  console.log("completedDaisyChainBefore", completedDaisyChainBefore);
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
  updateCSSAfterContentOfRoot(
    readi18nPhrases("EE_Initializing", rc.language.value),
  );
  const isProlificExp = isProlificExperiment();
  if (isProlificExp) {
    saveProlificInfo(thisExperimentInfo);
  }

  setCurrentFn("paramReaderInitialized");
  // ! avoid opening windows twice
  if (typeof psychoJS._window !== "undefined") return;
  useMatlab.current = reader.read("_trackGazeExternallyBool")[0];
  // get debug mode from reader
  debugBool.current = reader.read("_debugBool")[0];

  buildWindowErrorHandling(reader);

  // ! check cross session user id
  thisExperimentInfo.requestedCrossSessionId = false;

  if (reader.read("_participantIDGetBool")[0]) {
    const gotParticipantId = (participant, session = null, storedId) => {
      if (participant) {
        thisExperimentInfo.requestedCrossSessionId = true;
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
  loadFonts(reader, fontsRequired);

  // ! Load recruitment service config
  loadRecruitmentServiceConfig();

  // Keep track of a simulated observer for each condition
  simulatedObservers = new SimulatedObserversHandler(reader, psychoJS);

  // ! Load reading corpus and preprocess
  await loadReadingCorpus(reader);
  logger("READ readingCorpusArchive", readingCorpusArchive);
  logger("READ readingWordListArchive", readingWordListArchive);
  logger("READ readingWordFrequencyArchive", readingWordFrequencyArchive);

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

export const paramReader = new ParamReader(
  "conditions",
  paramReaderInitialized,
);

/* -------------------------------------------------------------------------- */

var conditionName;
var targetSpecs; // TextStim object

var trialCounter; // TextSim object

var showImage; // ImageStim object

// Maps 'block_condition' -> bounding rectangle around (appropriate) characterSet
// In typographic condition, the bounds are around a triplet
export var characterSetBoundingRects = {};

const experiment = (howManyBlocksAreThereInTotal) => {
  setCurrentFn("experiment");
  //variables
  var readingParagraph;

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
  psychoJS.schedule(
    psychoJS.gui.DlgFromDict({
      dictionary: {
        participant: thisExperimentInfo.participant,
        session: thisExperimentInfo.session,
      },
      title: readi18nPhrases("T_thresholdTitle", rc.language.value),
      participantText: readi18nPhrases("T_participant", rc.language.value),
      sessionText: readi18nPhrases("T_session", rc.language.value),
      cancelText: readi18nPhrases("T_cancel", rc.language.value),
      okText: readi18nPhrases("T_ok", rc.language.value),
    }),
  );

  // Controls the big picture flow of the experiment
  const flowScheduler = new Scheduler(psychoJS);
  const dialogCancelScheduler = new Scheduler(psychoJS);
  psychoJS.scheduleCondition(
    function () {
      return psychoJS.gui.dialogComponent.button === "OK";
    },
    flowScheduler,
    dialogCancelScheduler,
  );

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

  // quit if user presses Cancel in dialog box:
  dialogCancelScheduler.add(quitPsychoJS, "", false, paramReader);

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
      const _ = setInterval(() => {
        if (psychoJS.gui._allResourcesDownloaded) {
          clearInterval(_);
          loggerText("all resources loaded");

          psychoJS.gui.dialogComponent.button = "OK";
          psychoJS.gui._removeWelcomeDialogBox();
          // psychoJS.gui.closeDialog( );
          psychoJS.gui.dialogComponent.status = PsychoJS.Status.FINISHED;
          // psychoJS.window.adjustScreenSize();
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
  // document.getElementById("root").style.setProperty("--after-content", "Initializing...");
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

    return Scheduler.Event.NEXT;
  }

  async function displayNeedsPage() {
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
      "calibrateSound1000HzBool",
    )[0];
    const calibrateSoundAllHz = paramReader.read("calibrateSoundAllHzBool")[0];

    if (
      calibrateMicrophonesBool === false &&
      (calibrateSound1000Hz === true ||
        calibrateSoundAllHz === true ||
        needPhoneSurvey.current === true)
    ) {
      needCalibratedSmartphoneMicrophone = true;
    }

    let compatibilityCheckPeer = null;
    if (needCalibratedSmartphoneMicrophone || needAnySmartphone) {
      const params = {
        text: readi18nPhrases("RC_smartphoneOkThanks", rc.language.value),
        onError: (error) => {
          Swal.fire({
            allowOutsideClick: false,
            // title: "Error",
            text: readi18nPhrases("RC_can'tDrawQR", rc.language.value),
            icon: "error",
            confirmButtonText: readi18nPhrases(
              "RC_cantReadQR_Button",
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
    );

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
    );
    hideForm();

    if (!continueExperiment) {
      await showForm(paramReader.read("_debriefForm")[0]);
      hideForm();
      showExperimentEnding(); // TODO Rethink about this function in terms of UI and logic
      quitPsychoJS("", "", paramReader);
    }

    // ! Remote Calibrator
    const experimentStarted = { current: false };
    parseViewMonitorsXYDeg(paramReader);
    await startMultipleDisplayRoutine(paramReader, rc.language.value);
    if (useRC && useCalibration(paramReader)) {
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
              rc.removePanel();
              rc.pauseGaze();
              rc._removeBackground();
              // rc.pauseDistance();
              // ! clean RC dom
              if (document.querySelector("#rc-panel-holder"))
                document.querySelector("#rc-panel-holder").remove();

              rc.pauseNudger();
              // Get fullscreen
              if (!psychoJS.window._windowAlreadyInFullScreen && !debug) {
                rc.getFullscreen();
                await sleep(1000);
              }
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
          // {
          //   event_handlers: _key_resp_event_handlers,
          //   all_keys: _key_resp_allKeys,
          // },
        );
      });
    }
    //create Timing Bars
    createTimingBars();
    return Scheduler.Event.NEXT;
  }

  // var frameDur;
  async function updateInfo(needPhoneSurveyBool) {
    setCurrentFn("updateInfo");
    thisExperimentInfo["date"] = util.MonotonicClock.getDateStr(); // add a simple timestamp
    thisExperimentInfo["UTC"] = util.MonotonicClock.getTimeZone();
    thisExperimentInfo["expName"] = thisExperimentInfo.name;
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
    psychoJS.experiment.addData("expName", thisExperimentInfo.name);
    psychoJS.experiment.addData("date", thisExperimentInfo.date);
    psychoJS.experiment.addData("psychopyVersion", thisExperimentInfo.version);
    psychoJS.experiment.addData(
      "hardwareConcurrency",
      thisExperimentInfo.hardwareConcurrency,
    );
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
    psychoJS.experiment.addData("date", thisExperimentInfo.date);
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

    const psychojsTextStimConfig = {
      win: psychoJS.window,
      color: new util.Color("black"),
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

    characterSetBoundingRects = generateCharacterSetBoundingRects(
      paramReader,
      cleanFontName,
    );

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
    readingParagraph = new Paragraph([], 0, undefined, {
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
    });
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

    grid.current = new Grid("disabled", Screens[0], psychoJS);

    // create progress bar
    createProgressBar();
    updateProgressBar(0);
    hideProgressBar();

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
    setCurrentFn("_instructionSetup");
    instructionsConfig.height = getParamValueForBlockOrCondition(
      "instructionFontSizePt",
      blockOrCondition,
    );
    const marginOffset = getInstructionTextMarginPx(bigMargin);
    const position = altPosition ?? [
      -window.innerWidth / 2 + marginOffset,
      window.innerHeight / 2 - marginOffset,
    ];
    instructionsClock.reset(); // clock
    // t = 0;
    // frameN = -1;
    continueRoutine = true;
    instructions.setWrapWidth(window.innerWidth * wrapRatio - 2 * marginOffset);
    instructions.setPos(position);
    instructions.setText(text);
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

    if (!continueRoutine || clickedContinue.current) {
      continueRoutine = true;
      clickedContinue.current = false;
      return Scheduler.Event.NEXT;
    }

    continueRoutine = true;

    if (
      keypad.handler.inUse(status.block) &&
      _key_resp_allKeys.current.map((r) => r.name).includes("return")
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
  // var currentLoopBlock;

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
      // currentLoopBlock = blocks;

      /* -------------------------------------------------------------------------- */
      // Preset params
      // ! Set current targetKind for the block
      targetKind.current = paramReader.read("targetKind", 1)[0];

      // ! Set current task for the block
      // TODO support multiple target tasks in one block
      // TODO support multiple target tasks in one condition, e.g., identify,questionAndAnswer?
      targetTask.current = paramReader.read("targetTask", 1)[0];
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

        if (
          conditions.every(
            (c) =>
              typeof c["conditionEnabledBool"] !== "undefined" &&
              String(c["conditionEnabledBool"]).toLowerCase() === "false",
          )
        )
          continue;
        if (
          conditions.every(
            (c) =>
              typeof c["showImage"] !== "undefined" &&
              String(c["showImage"]).toLowerCase() !== "",
          )
        ) {
          conditions.forEach((c) => {
            blocksLoopScheduler.add(
              showImageBegin(
                c["showImage"],
                canClick(responseType.current),
                c["showCounterBool"],
                c["showViewingDistanceBool"],
                trialCounter,
                instructions,
                targetSpecs,
                colorRGBASnippetToRGBA(c["screenColorRGBA"]),
                showImage,
                rc.language.value,
              ),
            );
            blocksLoopScheduler.add(
              showImageEachFrame(
                canType(responseType.current),
                canClick(responseType.current),
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
        });

        const trialsLoopScheduler = new Scheduler(psychoJS);
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
      trialsConditions = trialsConditions
        .map((condition) =>
          Object.assign(condition, { label: condition["block_condition"] }),
        )
        .filter((condition) =>
          paramReader.read(
            "conditionEnabledBool",
            condition["block_condition"],
          ),
        );
      if (targetKind.current === "reading")
        trialsConditions = trialsConditions.slice(0, 1);
      updateProgressBar(0);
      // nTrialsTotal
      // totalTrialsThisBlock.current = trialsConditions
      //   .map((c) => paramReader.read("conditionTrials", c.block_condition))
      //   .reduce((a, b) => a + b, 0);
      switchTask(targetTask.current, {
        questionAndAnswer: () => {
          trials = new data.TrialHandler({
            psychoJS: psychoJS,
            name: "trials",
            nReps: totalTrialsThisBlock.current,
            trialList: trialsConditions,
            method: TrialHandler.Method.SEQUENTIAL,
            seed: Math.round(performance.now()),
          });
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
                nTrials: totalTrialsThisBlock.current,
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
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
                nTrials: totalTrialsThisBlock.current,
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
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
                nTrials: totalTrialsThisBlock.current,
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
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
                nTrials: totalTrialsThisBlock.current,
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
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
                nTrials: totalTrialsThisBlock.current,
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
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
                nTrials: totalTrialsThisBlock.current,
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
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
                nTrials: totalTrialsThisBlock.current,
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
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
                nTrials: totalTrialsThisBlock.current,
                conditions: trialsConditions,
                method: TrialHandler.Method.FULLRANDOM,
                seed: Math.round(performance.now()),
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
        if (targetTask.current !== "questionAndAnswer") {
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
      targetTask.current !== "questionAndAnswer" &&
      (targetKind.current === "letter" ||
        targetKind.current == "sound" ||
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
        const nonEmptyPages = [...readingThisBlockPages].filter(
          (s) => s.length,
        );
        // const somePagesEmpty =
        //   nonEmptyPages.length < readingThisBlockPages.length;
        // if (somePagesEmpty && !readingCorpusDepleted.current)
        //   warning("someEmptyPages != readingCorpusDepleted");
        readingQuestions.current = prepareReadingQuestions(
          paramReader.read("readingNumberOfQuestions", status.block)[0],
          paramReader.read("readingNumberOfPossibleAnswers", status.block)[0],
          nonEmptyPages, // readingThisBlockPages,
          readingFrequencyToWordArchive[
            paramReader.read("readingCorpus", status.block)[0]
          ],
        );
        readingCurrentQuestionIndex.current = 0;
        readingClickableAnswersSetup.current = false;
        readingClickableAnswersUpdate.current = false;

        // Display
        const customInstructions = getCustomInstructionText(
          "response",
          paramReader,
          status.block_condition,
        );
        _instructionSetup(
          customInstructions ??
            readi18nPhrases("T_readingTaskQuestionPrompt", rc.language.value),
          status.block,
          false,
          1.0,
        );
        updateColor(instructions, "instruction", status.block_condition);
        instructions.setAutoDraw(true);
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
        `%c====== Block ${status.block} ======`,
        "background: orange; color: white; padding: 1rem",
      );
      status.nthBlock += 1;
      totalBlocks.current = snapshot.nTotal;

      psychoJS.fontRenderMaxPx = paramReader.read(
        "fontRenderMaxPx",
        status.block,
      )[0];

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
      targetTask.current = paramReader.read("targetTask", status.block)[0];
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

      viewingDistanceCm.current = rc.viewingDistanceCm
        ? rc.viewingDistanceCm.value
        : viewingDistanceCm.desired;
      Screens[0].viewingDistanceCm = viewingDistanceCm.current;
      if (!rc.viewingDistanceCm)
        console.warn(
          "[Viewing Distance] Using arbitrary viewing distance. Enable RC.",
        );
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
          // also, prep questions
          questionsThisBlock.current = [];

          for (let i = 1; i <= 99; i++) {
            const qName = `questionAndAnswer${fillNumberLength(i, 2)}`;
            if (paramReader.has(qName)) {
              const question = paramReader.read(qName, status.block)[0];
              if (question && question.length)
                questionsThisBlock.current.push(question);
            }
          }

          totalTrialsThisBlock.current = questionsThisBlock.current.length;
        },
        identify: () => {
          switchKind(targetKind.current, {
            vocoderPhrase: () => {
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
      if (simulatedObservers.proceed(status.block)) return Scheduler.Event.NEXT;

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
      loggerText(
        `initInstructionRoutineBegin targetKind ${targetKind.current}`,
      );
      hideProgressBar();
      TrialHandler.fromSnapshot(snapshot);
      initInstructionClock.reset(); // clock
      frameN = -1;
      continueRoutine = true;
      clickedContinue.current = false;

      const L = rc.language.value;

      responseType.current = getResponseType(
        paramReader.read("responseClickedBool", status.block)[0],
        paramReader.read("responseTypedBool", status.block)[0],
        paramReader.read("!responseTypedEasyEyesKeypadBool", status.block)[0],
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

      readingCorpusShuffleBool.current = paramReader.read(
        "readingCorpusShuffleBool",
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
        sound: () => {
          targetTask.current = paramReader.read("targetTask", status.block)[0];
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
            readingCorpusShuffleBool.current,
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
            readi18nPhrases("T_readingNextPage", rc.language.value),
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
          getThisBlockPages(
            paramReader,
            status.block,
            readingParagraph,
            undefined,
            undefined,
            undefined,
            readingCorpusShuffleBool.current,
          );
          const longestReadingLineLength = Math.max(
            ...readingThisBlockPages
              .map((p) => p.split("\n"))
              .flat()
              .map((s) => s.length),
          );
          const widestReadingPageMask = readingThisBlockPages.map((page) =>
            page.split("\n").some((l) => l.length == longestReadingLineLength),
          );
          const widestReadingPage = readingThisBlockPages
            .filter((p, i) => widestReadingPageMask[i])
            .pop();
          // Position the pages of the reading paragraph based on the size of the widest page of text in this block.
          // ie `readingBlockWidthPx = maxPixPerLine` (as calculated by setting the stim to this text)
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
        await keypad.handler.update(
          ["SPACE", "RETURN"],
          "sans-serif",
          undefined,
        );
      }

      addBeepButton(L, correctSynth);

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
  var thresholdParameter;

  var trialComponents;
  var allFlankers, flankersUsed;

  // Credit
  var currentBlockCreditForTrialBreak = 0;

  // Runs before every trial to set up for the trial
  function trialInstructionRoutineBegin(snapshot) {
    return async function () {
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
      rc.setViewingDistanceAllowedPreciseBool(
        paramReader.read(
          "viewingDistanceAllowedPreciseBool",
          status.block_condition,
        ),
      );
      if (
        ifTrue(paramReader.read("calibrateTrackDistanceBool", status.block))
      ) {
        loggerText("[RC] resuming distance");

        viewingDistanceCm.current = rc.viewingDistanceCm
          ? rc.viewingDistanceCm.value
          : viewingDistanceCm.current;
        Screens[0].viewingDistanceCm = viewingDistanceCm.current;

        if (rc.setDistanceDesired) {
          // rc.pauseNudger();
          rc.setDistanceDesired(
            viewingDistanceCm.desired,
            paramReader.read(
              "viewingDistanceAllowedRatio",
              status.block_condition,
            ) == 0
              ? 99
              : paramReader.read(
                  "viewingDistanceAllowedRatio",
                  status.block_condition,
                ),
            paramReader.read(
              "needEasyEyesKeypadBeyondCm",
              status.block_condition,
            ),
          );
        }

        rc.resumeDistance();
        rc.resumeNudger();

        setPreStimulusRerunInterval(
          paramReader,
          trialInstructionRoutineBegin,
          snapshot,
        );
        if (
          viewingDistanceOutOfBounds(
            viewingDistanceCm.current,
            paramReader.read(
              "viewingDistanceAllowedRatio",
              status.block_condition,
            ),
          ) &&
          !debug
        ) {
          return Scheduler.Event.FLIP_REPEAT;
        }
      } else {
        viewingDistanceCm.current = viewingDistanceCm.desired;
        Screens[0].viewingDistanceCm = viewingDistanceCm.current;
      }
      setCurrentFn("trialInstructionRoutineBegin");
      preStimulus.running = true;
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
          rc.getFullscreen();
        } catch (error) {
          console.error("error when try get full screen".error);
        }
        await sleep(1000);
      }
      trialInstructionClock.reset();
      TrialHandler.fromSnapshot(snapshot);

      // Number of responses required before the current (psychojs) trial ends
      // For all current targetKinds this is 1.
      responseType.numberOfResponses =
        targetKind.current === "repeatedLetters" ? 2 : 1;

      logQuest("NEW TRIAL");

      const letterSetResponseType = (rsvpReadingBool = false) => {
        // ! responseType
        // AKA prestimulus=false, ie the instructions we use at response-time
        responseType.original = getResponseType(
          paramReader.read("responseClickedBool", status.block_condition),
          paramReader.read("responseTypedBool", status.block_condition),
          paramReader.read(
            "!responseTypedEasyEyesKeypadBool",
            status.block_condition,
          ),
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
          paramReader.read(
            "!responseTypedEasyEyesKeypadBool",
            status.block_condition,
          ),
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
      [target, flanker1, flanker2, flanker3, flanker4].forEach((s) =>
        s.setCharacterSet(fontCharacterSet.current.join("")),
      );

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
        await keypad.handler.update(alphabet, "sans-serif", BC);
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
      letterConfig.targetSafetyMarginSec = reader.read(
        "targetSafetyMarginSec",
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

      /* -------------------------------------------------------------------------- */
      // set background color
      psychoJS.window.color = new util.Color(screenBackground.colorRGBA);
      psychoJS.window._needUpdate = true; // ! dangerous
      /* -------------------------------------------------------------------------- */

      switchKind(targetKind.current, {
        vocoderPhrase: () => {
          //change instructions
          _instructionSetup(
            instructionsText.trial.fixate["vocoderPhrase"](rc.language.value),
            status.block_condition,
            false,
            1.0,
          );

          let proposedLevel = currentLoop._currentStaircase.getQuestValue();
          psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);
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
              undefined,
              maskerVolumeDbSPL.current,
              soundGainDBSPL.current,
              whiteNoiseLevel.current,
              targetSoundFolder.current,
              maskerSoundFolder.current,
            );
          }
          trialComponents = [];
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

          let proposedLevel = currentLoop._currentStaircase.getQuestValue();
          psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);
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
                undefined,
                maskerVolumeDbSPL.current,
                soundGainDBSPL.current,
                whiteNoiseLevel.current,
                targetSoundFolder.current,
                maskerSoundFolder.current,
              );
          } else if (targetTask.current == "identify") {
            if (showConditionNameConfig.showTargetSpecs)
              updateTargetSpecsForSoundIdentify(
                undefined,
                soundGainDBSPL.current,
                whiteNoiseLevel.current,
                targetSoundFolder.current,
              );
          }

          trialComponents = [];
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
            readi18nPhrases("T_readingNextPage", rc.language.value),
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

          defineTargetForCursorTracking(readingParagraph);

          readingParagraph.setCurrentCondition(status.block_condition);
          psychoJS.experiment.addData(
            "readingLineSpacingPx",
            readingParagraph.getLineSpacing(),
          );

          readingParagraph.setPadding(font.padding);
          readingParagraph.setFont(font.name);
          readingParagraph._spawnStims();

          trialComponents = [];
          trialComponents.push(key_resp);
          trialComponents.push(...readingParagraph.stims);
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
          showTimingBarsBool.current = paramReader.read(
            "showTimingBarsBool",
            status.block_condition,
          );
          drawTimingBars(showTimingBarsBool.current, "fixation", true);
          drawTimingBars(showTimingBarsBool.current, "target", false);
          drawTimingBars(showTimingBarsBool.current, "lateness", false);
          addHandlerForClickingFixation(reader);

          TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

          let proposedLevel = currentLoop._currentStaircase.getQuestValue();
          // psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);

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
          const numFlankersNeeded = atLeastTwoFlankersNeeded
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
            throw `[EasyEyes experiment configuration error] You must have ${numberOfTargetsAndFlankers} characters in your character set for this block_condition, however, the researcher only put ${fontCharacterSet.current.length}.`;
          [targetCharacter, ...flankerCharacters] = sampleWithoutReplacement(
            fontCharacterSet.current,
            numberOfTargetsAndFlankers,
          );
          console.log(
            "DEBUG:",
            "targetCharacter",
            targetCharacter,
            "flankerCharacters",
            flankerCharacters,
          );
          if (letterConfig.spacingRelationToSize === "typographic") {
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
          logger(
            `%c${flankerCharacters[0]} ${targetCharacter} ${flankerCharacters[1]}`,
            `color: red; font-size: 1.5rem; font-family: "${font.name}"`,
          );
          correctAns.current = [targetCharacter.toLowerCase()];
          /* -------------------------------------------------------------------------- */

          // DISPLAY OPTIONS
          Screens[0].window = psychoJS.window;

          // QUESTION does `stimulusParameters.targetAndFlankersXYPx` differ
          //          from `[targetEccentricityDeg.x, targetEccentricityDeg.y]`??
          // const targetEccentricityXYPx = XYPxOfDeg(0, [
          //   targetEccentricityDeg.x,
          //   targetEccentricityDeg.y,
          // ]);
          // // targetEccentricityXYPx = targetEccentricityXYPx.map(Math.round);
          // psychoJS.experiment.addData(
          //   "targetLocationPx",
          //   targetEccentricityXYPx,
          // );

          defineTargetForCursorTracking(target);

          psychoJS.experiment.addData(
            "spacingRelationToSize",
            letterConfig.spacingRelationToSize,
          );

          fixation._updateStaticState(paramReader, BC);

          var spacingIsOuterBool = reader.read("spacingIsOuterBool", BC);
          // const fixationX = Screens[0].fixationConfig.pos[0];
          // const fixationY = Screens[0].fixationConfig.pos[1];
          // const formspreeLoggingInfo = {
          //   block: status.block,
          //   block_condition: status.block_condition,
          //   conditionName: paramReader.read("conditionName", BC),
          //   trial: status.trial,
          //   font: font.name,
          //   fontMaxPx: paramReader.read("fontMaxPx", BC),
          //   fontRenderMaxPx: paramReader.read("fontRenderMaxPx", BC),
          //   fontSizePx: "NaN",
          //   fontString:
          //     thresholdParameter === "spacingDeg"
          //       ? `${flankerCharacters[0]} ${targetCharacter} ${flankerCharacters[1]}`
          //       : targetCharacter,
          //   fixationXYPx: `(${fixationX}, ${fixationY})`,
          //   viewingDistanceCm: viewingDistanceCm.current,
          // };
          try {
            const values = restrictLevel(
              proposedLevel,
              thresholdParameter,
              characterSetBoundingRects[BC],
              letterConfig.spacingDirection,
              letterConfig.spacingRelationToSize,
              letterConfig.spacingSymmetry,
              letterConfig.spacingOverSizeRatio,
              letterConfig.targetSizeIsHeightBool,
              spacingIsOuterBool,
            );
            [level, stimulusParameters] = values;
            letterConfig.flankerXYDegs = stimulusParameters.flankerXYDegs;
            // formspreeLoggingInfo.fontSizePx = stimulusParameters.heightPx;
            // const fixationX_ = Screens[0].fixationConfig.pos[0];
            // const fixationY_ = Screens[0].fixationConfig.pos[1];
            // formspreeLoggingInfo.fixationXYPx = `(${fixationX_}, ${fixationY_})`;
            // formspreeLoggingInfo.viewingDistanceCm = viewingDistanceCm.current;
            // formspreeLoggingInfo.targetSizeDeg = stimulusParameters.sizeDeg;
            // formspreeLoggingInfo.spacingDeg = stimulusParameters.spacingDeg;
          } catch (e) {
            console.log("Failed during 'restrictLevel'.", e);
            // formspreeLoggingInfo.fontSizePx = `Failed during "restrictLevel". Unable to determine fontSizePx. Error: ${e}`;
            // formspreeLoggingInfo.targetSizeDeg = `Failed during "restrictLevel"`;
            // formspreeLoggingInfo.spacingDeg = `Failed during "restrictLevel"`;
            // logLetterParamsToFormspree(formspreeLoggingInfo);
            warning(
              "Failed to get viable stimulus (restrictLevel failed), skipping trial",
            );
            console.count(
              "!. Failed to get viable stimulus (restrictLevel failed), skipping trial",
            );
            console.error(e);
            skipTrial();
          }
          // logLetterParamsToFormspree(formspreeLoggingInfo);

          // psychoJS.experiment.addData("level", level);
          // psychoJS.experiment.addData("heightPx", stimulusParameters.heightPx);
          // fontSize.current = stimulusParameters.heightPx;

          fixation.update(
            paramReader,
            BC,
            stimulusParameters.heightPx,
            stimulusParameters.targetAndFlankersXYPx[0],
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

          trialComponents = [];
          trialComponents.push(key_resp);
          trialComponents.push(...fixation.stims);
          // trialComponents.push(target);
          // trialComponents.push(...flankersUsed);
          trialComponents.push(showCharacterSet);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);

          // if (paramReader.read("_trackGazeExternallyBool")[0])
          //   recordStimulusPositionsForEyetracking(
          //     target,
          //     "trialInstructionRoutineBegin",
          //   );

          // // /* --- BOUNDING BOX --- */
          // addBoundingBoxesToComponents(
          //   showBoundingBox,
          //   showCharacterSetBoundingBox,
          //   boundingBoxPolies,
          //   characterSetBoundingBoxPolies,
          //   displayCharacterSetBoundingBoxPolies[BC],
          //   letterConfig.spacingRelationToSize,
          //   thresholdParameter,
          //   trialComponents,
          // );
          // /* --- /BOUNDING BOX --- */

          // TODO add call to update() from every targetKind
          simulatedObservers.update(BC, {
            stimulusIntensity: level,
            possibleResponses: fontCharacterSet.current,
            correctResponses: [targetCharacter],
          });

          psychoJS.experiment.addData(
            "trialInstructionBeginDurationSec",
            trialInstructionClock.getTime(),
          );

          // tinyHint
          renderObj.tinyHint.setAutoDraw(false);

          // TODO in other targetKinds
          psychoJS.experiment.addData("fontNominalSizePt", target.getHeight());
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

          // Get level from quest
          let proposedLevel = currentLoop._currentStaircase.getQuestValue();
          psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);

          // Constrain to fit on screen
          [level, stimulusParameters] = restrictRepeatedLettersSpacing(
            proposedLevel,
            [targetEccentricityDeg.x, targetEccentricityDeg.y],
            characterSetBoundingRects[BC],
          );

          // Generate stims to fill screen
          repeatedLettersConfig.stims =
            generateRepeatedLettersStims(stimulusParameters);
          repeatedLettersConfig.level = level;
          repeatedLettersConfig.stimulusParameters = stimulusParameters;

          defineTargetForCursorTracking(repeatedLettersConfig.stims);

          // Simulated observer
          simulatedObservers.update(BC, {
            stimulusIntensity: level,
            possibleResponses: fontCharacterSet.current,
            correctResponses: correctAns.current,
          });

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

          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecsForRepeatedLetters(
              stimulusParameters,
              thisExperimentInfo.experimentFilename,
            );
          repeatedLettersConfig.stims.forEach((s) => {
            s.setPadding(font.padding);
            s.setCharacterSet(String(fontCharacterSet.current.join("")));
            s._updateIfNeeded();
          });
          // Add stims to trialComponents
          trialComponents = [];
          trialComponents.push(...repeatedLettersConfig.stims);
          trialComponents.push(...fixation.stims);
          trialComponents.push(key_resp);

          trialComponents.push(showCharacterSet);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);
        },
        rsvpReading: () => {
          TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

          readAllowedTolerances(tolerances, reader, BC);
          readTrialLevelLetterParams(reader, BC);
          clickedContinue.current = false;
          rsvpReadingResponse.displayStatus = false;
          addHandlerForClickingFixation(reader);

          drawTimingBars(showTimingBarsBool.current, "fixation", true);
          drawTimingBars(showTimingBarsBool.current, "target", false);
          drawTimingBars(showTimingBarsBool.current, "lateness", false);

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

          // Get level from quest
          let proposedLevel = currentLoop._currentStaircase.getQuestValue();
          psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);
          psychoJS.experiment.addData("levelProposedByQuest", proposedLevel);

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

          const thisTrialWords =
            rsvpReadingWordsForThisBlock.current[status.block_condition][0];
          // No words to show! Skipping trial for graceful participant experience.
          // TODO any way to predict, so that trial count can be correct, ie ending after 3 trials instead of 10 this block?
          if (thisTrialWords.targetWords.every((s) => s === "")) {
            warning(
              `rsvpReading trial skipped, due to finding no target words to display.`,
            );
            skipTrial();
            preStimulus.running = false;
            return Scheduler.Event.NEXT;
          }
          const actualNumberOfWords = thisTrialWords.targetWords.length;
          if (actualNumberOfWords !== numberOfWords)
            warning(
              "rsvpReading parsed the incorrect number of words. Using the target sequence: " +
                thisTrialWords.targetWords.join(","),
            );
          rsvpReadingTargetSets.numberOfSets = actualNumberOfWords;
          const targetSets = generateRSVPReadingTargetSets(
            thisTrialWords,
            durationSec,
            paramReader,
            status.block_condition,
          );
          rsvpReadingTargetSets.upcoming = targetSets;
          rsvpReadingTargetSets.past = [];

          // Determine the subset of target sets that will be used for response identification
          rsvpReadingTargetSets.numberOfIdentifications = Math.min(
            paramReader.read(
              "rsvpReadingNumberOfIdentifications",
              status.block_condition,
            ),
            actualNumberOfWords, // eg in the case that we have reached the end of the corpus and ran out of words to show.
          );
          rsvpReadingTargetSets.identificationTargetSets =
            sampleWithoutReplacement(
              targetSets,
              rsvpReadingTargetSets.numberOfIdentifications,
              true,
            );
          correctAns.current =
            rsvpReadingTargetSets.identificationTargetSets.map((t) =>
              t.word.toLowerCase(),
            );

          // TODO confirm that this same toLowerCase scheme is used when setting up phrase identification screen, ie that the html elems have id's which use the lowercase transformed word
          simulatedObservers.update(status.block_condition, {
            stimulusIntensity: level,
            correctResponses: correctAns.current,
            possibleResponses: rsvpReadingTargetSets.identificationTargetSets
              .map((t) => [t.word, ...t.foilWords])
              .flat()
              .map((w) => w.toLowerCase()),
          });

          psychoJS.experiment.addData(
            "rsvpReadingTargetNumberOfSets",
            rsvpReadingTargetSets.numberOfSets,
          );
          psychoJS.experiment.addData(
            "rsvpReadingTargetSets",
            targetSets.toString(),
          );

          // All categories (ie sets of target and foils)
          rsvpReadingResponse.categories = rsvpReadingTargetSets.upcoming.map(
            (s) => new Category(s.word, s.foilWords),
          );
          // Those categories that will be shown to the participant, ie used for response
          rsvpReadingResponse.identificationCategories =
            rsvpReadingTargetSets.identificationTargetSets.map(
              (s) => new Category(s.word, s.foilWords),
            );
          if (rsvpReadingResponse.responseType === "silent") {
            rsvpReadingResponse.screen = setupPhraseIdentification(
              rsvpReadingResponse.identificationCategories,
              paramReader,
              BC,
              rsvpReadingTargetSets.upcoming[0]._heightPx,
            );
            psychoJS.experiment.addData(
              "rsvpReadingResponseCategories",
              rsvpReadingResponse.identificationCategories.toString(),
            );
            psychoJS.experiment.addData(
              "rsvpReadingResponseScreenHTML",
              rsvpReadingResponse.screen.innerHTML,
            );
          }

          rsvpReadingTargetSets.current =
            rsvpReadingTargetSets.upcoming.shift();

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
          trialComponents = [];
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

          // fixation.tStart = t;
          // fixation.frameNStart = frameN;
          // clickedContinue.current = false;
          // fixation.update(
          //   paramReader,
          //   BC,
          //   100, // stimulusParameters.heightPx,
          //   xyPxOfDeg([targetEccentricityDeg.x, targetEccentricityDeg.y])
          // );
          // fixationConfig.pos = fixationConfig.nominalPos;
          // fixation.setPos(fixationConfig.pos);
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
            });
          });
          trialCounter.setAutoDraw(showCounterBool);
          showCharacterSet.setPos([0, 0]);

          trialComponents = [];
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

          /// TODO factor out of this switch, ie not vernier specific
          fixation.tStart = t;
          fixation.frameNStart = frameN;
          // fixation.setAutoDraw(true);
          clickedContinue.current = false;
          addHandlerForClickingFixation(paramReader);
          TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date
          let proposedLevel = currentLoop._currentStaircase.getQuestValue();
          psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);
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
          readAllowedTolerances(tolerances, reader, BC);
          const targetEccentricityXYPx = XYPxOfDeg(0, [
            targetEccentricityDeg.x,
            targetEccentricityDeg.y,
          ]);
          fixation.update(paramReader, BC, 100, targetEccentricityXYPx);
          Screens[0].fixationConfig.pos = Screens[0].fixationConfig.nominalPos;
          fixation.setPos(Screens[0].fixationConfig.pos);
          psychoJS.experiment.addData(
            "markingFixationHotSpotRadiusPx",
            Screens[0].fixationConfig.markingFixationHotSpotRadiusPx,
          );
          trialCounter.setAutoDraw(showCounterBool);
          showCharacterSet.setPos([0, 0]);
          showCharacterSet.setText("");
          updateColor(showCharacterSet, "marking", status.block_condition);
          // showCharacterSet.setText(getCharacterSetShowText(validAns))
          ///

          vernier.update(
            paramReader,
            status.block_condition,
            Math.pow(10, proposedLevel),
          );
          validAns = ["left", "right"];
          correctAns.current = [vernier.directionBool ? "left" : "right"];
          level = Math.log10(vernier.targetOffsetDeg);
          psychoJS.experiment.addData("level", level);
          defineTargetForCursorTracking(vernier);

          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecs({
              targetOffsetDeg: vernier.targetOffsetDeg,
              targetDurationSec: letterConfig.targetDurationSec,
            });
          /* -------------------------------------------------------------------------- */

          // DISPLAY OPTIONS
          Screens[0].window = psychoJS.window;
          psychoJS.experiment.addData(
            "targetLocationPx",
            targetEccentricityXYPx,
          );

          trialComponents = [];
          // trialComponents.push(key_resp);
          trialComponents.push(...fixation.stims);
          trialComponents.push(showCharacterSet);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);

          simulatedObservers.update(BC, {
            stimulusIntensity: proposedLevel,
            possibleResponses: validAns,
            correctResponses: correctAns.current,
          });

          if (paramReader.read("_trackGazeExternallyBool")[0])
            recordStimulusPositionsForEyetracking(
              vernier,
              "trialInstructionRoutineBegin",
            );

          psychoJS.experiment.addData(
            "trialInstructionBeginDurationSec",
            trialInstructionClock.getTime(),
          );

          // tinyHint
          renderObj.tinyHint.setAutoDraw(false);

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
        status.trial,
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
      preStimulus.running = false;
      return Scheduler.Event.NEXT;
    };
  }

  function trialInstructionRoutineEachFrame() {
    return async function () {
      setCurrentFn("trialInstructionRoutineEachFrame");
      if (toShowCursor() && markingShowCursorBool.current) {
        showCursor();
        return Scheduler.Event.NEXT;
      } else if (toShowCursor()) {
        return Scheduler.Event.NEXT;
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
        status.trial,
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
        // console.log(
        //   "target position each frame",
        //   target.pos,
        //   "nominal fixation",
        //   Screens[0].fixationConfig.nominalPos,
        // );
        // IDENTIFY
        if (paramReader.read("_trackGazeExternallyBool")[0])
          recordStimulusPositionsForEyetracking(
            target,
            "trialInstructionRoutineEachFrame",
          );

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
        reading: () => {
          continueRoutine = false;
        },
        letter: letterEachFrame,
        repeatedLetters: letterEachFrame,
        rsvpReading: letterEachFrame,
        movie: () => {
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
          if (video_generated == true) {
            if (
              paramReader.read(
                "responseMustTrackContinuouslyBool",
                status.block_condition,
              )
            )
              checkIfCursorIsTrackingFixation(t, paramReader);
            if (Screens[0].fixationConfig.markingFixationMotionRadiusDeg > 0)
              gyrateFixation(fixation);
            fixation.setAutoDraw(true);
          }
        },
        vernier: letterEachFrame,
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
      drawTimingBars(showTimingBarsBool.current, "lateness", true);
      console.log("start", performance.now());
      setCurrentFn("trialInstructionRoutineEnd");
      loggerText("trialInstructionRoutineEnd");
      //add crowding triplets to output data
      const BC = status.block_condition;
      const fixationX = Screens[0].fixationConfig.pos[0];
      const fixationY = Screens[0].fixationConfig.pos[1];
      const formspreeLoggingInfo = {
        block: status.block,
        block_condition: status.block_condition,
        conditionName: paramReader.read("conditionName", BC),
        trial: status.trial,
        font: font.name,
        fontMaxPx: paramReader.read("fontMaxPx", BC),
        fontRenderMaxPx: paramReader.read("fontRenderMaxPx", BC),
        fontSizePx: "NaN",
        fontString:
          thresholdParameter === "spacingDeg"
            ? `${flankerCharacters[0]} ${targetCharacter} ${flankerCharacters[1]}`
            : targetCharacter,
        fixationXYPx: `(${fixationX}, ${fixationY})`,
        viewingDistanceCm: viewingDistanceCm.current,
      };
      if (targetKind.current === "letter") {
        try {
          let proposedLevel = currentLoop._currentStaircase.getQuestValue();
          var spacingIsOuterBool = paramReader.read("spacingIsOuterBool", BC);
          const values = restrictLevel(
            proposedLevel,
            thresholdParameter,
            characterSetBoundingRects[BC],
            letterConfig.spacingDirection,
            letterConfig.spacingRelationToSize,
            letterConfig.spacingSymmetry,
            letterConfig.spacingOverSizeRatio,
            letterConfig.targetSizeIsHeightBool,
            spacingIsOuterBool,
            true,
          );
          [level, stimulusParameters] = values;
          letterConfig.flankerXYDegs = stimulusParameters.flankerXYDegs;
          formspreeLoggingInfo.fontSizePx = stimulusParameters.heightPx;
          const fixationX_ = Screens[0].fixationConfig.pos[0];
          const fixationY_ = Screens[0].fixationConfig.pos[1];
          formspreeLoggingInfo.fixationXYPx = `(${fixationX_}, ${fixationY_})`;
          formspreeLoggingInfo.viewingDistanceCm = viewingDistanceCm.current;
          formspreeLoggingInfo.targetSizeDeg = stimulusParameters.sizeDeg;
          formspreeLoggingInfo.spacingDeg = stimulusParameters.spacingDeg;
        } catch (e) {
          console.log("Failed during 'restrictLevel'.", e);
          formspreeLoggingInfo.fontSizePx = `Failed during "restrictLevel". Unable to determine fontSizePx. Error: ${e}`;
          formspreeLoggingInfo.targetSizeDeg = `Failed during "restrictLevel"`;
          formspreeLoggingInfo.spacingDeg = `Failed during "restrictLevel"`;
          logLetterParamsToFormspree(formspreeLoggingInfo);
          warning(
            "Failed to get viable stimulus (restrictLevel failed), skipping trial",
          );
          console.count(
            "!. Failed to get viable stimulus (restrictLevel failed), skipping trial",
          );
          console.error(e);
          skipTrial();
        }
        if (paramReader.read("_logFontBool")[0]) {
          logLetterParamsToFormspree(formspreeLoggingInfo);
        }

        switch (thresholdParameter) {
          case "targetSizeDeg":
            target = getTargetStim(
              stimulusParameters,
              paramReader,
              status.block_condition,
              targetCharacter,
              target,
            );
            allFlankers.forEach((flanker) => flanker.setAutoDraw(false));
            break;
          case "spacingDeg":
            switch (letterConfig.spacingRelationToSize) {
              case "none":
              case "ratio":
                target = getTargetStim(
                  stimulusParameters,
                  paramReader,
                  status.block_condition,
                  targetCharacter,
                  target,
                );

                // flanker1 === outer flanker
                flanker1 = getTargetStim(
                  stimulusParameters,
                  paramReader,
                  status.block_condition,
                  flankerCharacters[0],
                  flanker1,
                  1,
                );
                // flanker2 === inner flanker
                flanker2 = getTargetStim(
                  stimulusParameters,
                  paramReader,
                  status.block_condition,
                  flankerCharacters[1],
                  flanker2,
                  2,
                );
                if (flankersUsed.length === 4) {
                  flanker3 = getTargetStim(
                    stimulusParameters,
                    paramReader,
                    status.block_condition,
                    flankerCharacters[2],
                    flanker3,
                    3,
                  );
                  flanker4 = getTargetStim(
                    stimulusParameters,
                    paramReader,
                    status.block_condition,
                    flankerCharacters[3],
                    flanker4,
                    4,
                  );
                }
                flankersUsed =
                  numFlankersNeeded === 4
                    ? [flanker1, flanker2, flanker3, flanker4]
                    : [flanker1, flanker2];

                psychoJS.experiment.addData(
                  "flankerLocationsPx",
                  stimulusParameters.targetAndFlankersXYPx.slice(1),
                );
                const targetSpacingPx = spacingIsOuterBool
                  ? norm([
                      stimulusParameters.targetAndFlankersXYPx[0][0] -
                        stimulusParameters.targetAndFlankersXYPx[1][0],
                      stimulusParameters.targetAndFlankersXYPx[0][1] -
                        stimulusParameters.targetAndFlankersXYPx[1][1],
                    ])
                  : norm([
                      stimulusParameters.targetAndFlankersXYPx[0][0] -
                        stimulusParameters.targetAndFlankersXYPx[2][0],
                      stimulusParameters.targetAndFlankersXYPx[0][1] -
                        stimulusParameters.targetAndFlankersXYPx[2][1],
                    ]);
                psychoJS.experiment.addData("targetSpacingPx", targetSpacingPx);
                break;
              case "typographic":
                // ...include the flankers in the same string/stim as the target.
                const tripletCharacters =
                  flankerCharacters[0] + targetCharacter + flankerCharacters[1];

                target = getTargetStim(
                  stimulusParameters,
                  paramReader,
                  status.block_condition,
                  tripletCharacters,
                  target,
                );
                flanker1.setAutoDraw(false);
                flanker2.setAutoDraw(false);
                break;
            }
            break;
        }
        [
          target,
          ...flankersUsed,
          fixation,
          showCharacterSet,
          trialCounter,
        ].forEach((c) => {
          // c._updateIfNeeded();
          // c.refresh();
        });

        if (showConditionNameConfig.showTargetSpecs)
          updateTargetSpecsForLetter(
            stimulusParameters,
            thisExperimentInfo.experimentFilename,
          );

        if (paramReader.read("_trackGazeExternallyBool")[0])
          recordStimulusPositionsForEyetracking(
            target,
            "trialInstructionRoutineBegin",
          );

        const spacingRelationToSize_ = paramReader.read(
          "spacingRelationToSize",
          status.block_condition,
        );
        const crowdingTriplets =
          spacingRelationToSize_ === "typographic"
            ? target.text
            : `${flanker1.text}, ${target.text}, ${flanker2.text}`;
        psychoJS.experiment.addData("crowdingTriplets", crowdingTriplets);
        trialComponents.push(target);
        trialComponents.push(...flankersUsed);
      }

      keypad.handler.clearKeys(status.block_condition);
      // TODO disable keypad control keys
      keypad.handler.setSensitive();

      clearInterval(preStimulus.interval);
      preStimulus.interval = undefined;

      // rc.pauseDistance();
      if (toShowCursor() && markingShowCursorBool.current) {
        showCursor();
        return Scheduler.Event.NEXT;
      } else if (toShowCursor()) {
        return Scheduler.Event.NEXT;
      }

      removeSkipTrialButton();

      // Undraw backGrid and dot
      if (flies && flies.status === PsychoJS.Status.STARTED) flies.draw(false);
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
        letter: () => {
          _identify_trialInstructionRoutineEnd(instructions, fixation);
          if (offsetRequiredFromFixationMotion) {
            let stimsToOffset = [];
            if (
              letterConfig.spacingRelationToSize !== "typographic" &&
              letterConfig.thresholdParameter === "spacingDeg"
            ) {
              // stimsToOffset = [target, flanker1, flanker2];
              // stimsToOffset = [];
              const targetXYDeg = [
                targetEccentricityDeg.x,
                targetEccentricityDeg.y,
              ];
              const targetXYPx = XYPxOfDeg(0, targetXYDeg);
              target.setPos(targetXYPx);
              const flanker1XYPx = XYPxOfDeg(0, letterConfig.flankerXYDegs[0]);
              flanker1.setPos(flanker1XYPx);
              const flanker2XYPx = XYPxOfDeg(0, letterConfig.flankerXYDegs[1]);
              flanker2.setPos(flanker2XYPx);
              const fourFlankersNeeded = [
                "horizontalAndVertical",
                "radialAndTangential",
              ].includes(letterConfig.spacingDirection);
              // if (fourFlankersNeeded) stimsToOffset.push(flanker3, flanker4);
              if (fourFlankersNeeded) {
                const flanker3XYPx = XYPxOfDeg(
                  0,
                  letterConfig.flankerXYDegs[2],
                );
                flanker3.setPos(flanker3XYPx);
                const flanker4XYPx = XYPxOfDeg(
                  0,
                  letterConfig.flankerXYDegs[3],
                );
                flanker4.setPos(flanker4XYPx);
              }
            } else {
              stimsToOffset = [target];
            }
            const boundingBoxStims = [
              ...Object.getOwnPropertyNames(boundingBoxPolies).map(
                (prop) => boundingBoxPolies[prop],
              ),
              ...Object.getOwnPropertyNames(characterSetBoundingBoxPolies).map(
                (prop) => characterSetBoundingBoxPolies[prop],
              ),
            ];
            stimsToOffset.push(...boundingBoxStims);
            offsetStimsToFixationPos(stimsToOffset);
            if (paramReader.read("_trackGazeExternallyBool")[0])
              recordStimulusPositionsForEyetracking(
                target,
                "trialInstructionRoutineEnd",
              );
          }
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

      psychoJS.experiment.addData(
        "trialInstructionRoutineDurationFromBeginSec",
        trialInstructionClock.getTime(),
      );
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
      addFontGeometryToOutputData(
        characterSetBoundingRects[status.block_condition],
        psychoJS,
      );
      if (typeof tar !== "undefined") {
        psychoJS.experiment.addData("fontNominalSizePt", tar.getHeight());
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
      if (targetTask.current === "questionAndAnswer") {
        continueRoutine = true;
        return Scheduler.Event.NEXT;
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

          const gainParameterFromFile = paramReader
            .read("soundGainTWR", status.block_condition)
            .split(",");
          soundGainTWR.T = Number(gainParameterFromFile[0]);
          soundGainTWR.W = Number(gainParameterFromFile[1]);
          soundGainTWR.R = Number(gainParameterFromFile[2]);
          const soundGainParameters = soundCalibrationResults.current
            ? soundCalibrationResults.current.parameters
            : soundGainTWR;
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
          if (invertedImpulseResponse.current)
            playAudioBufferWithImpulseResponseCalibration(
              trialSound,
              invertedImpulseResponse.current,
            );
          else playAudioBuffer(trialSound);
        },

        sound: async () => {
          var trialSoundBuffer;
          targetTask.current = paramReader.read(
            "targetTask",
            status.block_condition,
          );

          if (targetTask.current == "identify") {
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
            correctAns.current = [targetIsPresentBool.current ? "y" : "n"];

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
                  : undefined,
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
          if (invertedImpulseResponse.current)
            playAudioBufferWithImpulseResponseCalibration(
              trialSoundBuffer,
              invertedImpulseResponse.current,
            );
          else playAudioBuffer(trialSoundBuffer);
          showCursor();
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

      _instructionSetup(
        instructionsText.trial.respond["spacingDeg"](
          rc.language.value,
          responseType.current,
        ),
        status.block_condition,
        false,
        1.0,
      );

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
      switchKind(targetKind.current, {
        reading: () => {
          // TEXT
          readingParagraph.setText(
            readingThisBlockPages[readingPageIndex.current],
          );
          // PADDING
          readingParagraph.setPadding(
            paramReader.read("fontPadding", status.block_condition),
          );

          // AUTO DRAW
          readingParagraph.setAutoDraw(true);

          readingPageIndex.current++;
          if (readingThisBlockPages[readingPageIndex.current - 1] === "") {
            readingCorpusDepleted.current = true;
            warning(
              `reading trial skipped, due to finding no words to display. End of corpus reached.`,
            );
            skipTrial();
          }
        },
      });
      /* -------------------------------------------------------------------------- */
      // ! distance
      if (
        ifTrue(paramReader.read("calibrateTrackDistanceBool", status.block))
      ) {
        psychoJS.experiment.addData(
          "viewingDistancePredictedCm",
          getViewingDistancedCm(
            viewingDistanceCm.current,
            Screens[0],
            rc.windowHeightPx.value,
          ),
        );
        viewingDistanceCm.current = rc.viewingDistanceCm
          ? rc.viewingDistanceCm.value
          : viewingDistanceCm.current;
        Screens[0].viewingDistanceCm = viewingDistanceCm.current;
      }

      addApparatusInfoToData(Screens[0], rc, psychoJS, stimulusParameters);

      // ie time spent in `trialRoutineBegin`
      psychoJS.experiment.addData(
        "trialBeginDurationSec",
        trialClock.getTime(),
      );
      trialClock.reset(); // clock

      return Scheduler.Event.NEXT;
    };
  }

  var frameRemains;
  var timeWhenRespondable;
  var rsvpEndRoutineAtT;
  var customResponseInstructionsDisplayed;
  var targetStatus;
  var durationExccessSec;
  function trialRoutineEachFrame(snapshot) {
    return async function () {
      setCurrentFn("trialRoutineEachFrame");
      //------Loop for each frame of Routine 'trial'-------
      // get current time
      t = trialClock.getTime();
      frameN = frameN + 1; // number of completed frames (so 0 is the first frame)
      targetStatus = target.status;

      ////
      if (stats.on) stats.current.begin();
      ////

      if (toShowCursor()) {
        showCursor();
        removeClickableCharacterSet(showCharacterSetResponse, showCharacterSet);
        vocoderPhraseRemoveClickableCategory(showCharacterSetResponse);
        return Scheduler.Event.NEXT;
      }

      /* -------------------------------------------------------------------------- */
      if (targetTask.current === "questionAndAnswer") {
        continueRoutine = true;
        return Scheduler.Event.NEXT;
      }
      /* -------------------------------------------------------------------------- */

      const delayBeforeStimOnsetSec =
        targetKind.current === "letter" ||
        targetKind.current === "repeatedLetters" ||
        targetKind.current === "vernier"
          ? letterConfig.delayBeforeStimOnsetSec
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
              letterConfig.targetSafetyMarginSec +
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
          // durationExccessSec -
          0.016; // most of one frame period left
        //-psychoJS.window.monitorFramePeriod * 0.75; // most of one frame period left

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
              validAns = ["y", "n"];
            }
          },
          vocoderPhrase: () => {
            //only clickable
            responseType.current = 1;
          },
          reading: () => {
            // READING Only accepts SPACE
            if (!validAns.length || validAns[0] !== "space")
              validAns = ["space"];
            if (
              !correctAns.current.length ||
              !correctAns.current.includes("space")
            )
              correctAns.current = ["space"];
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

      if (
        t >= timeWhenRespondable &&
        !simulatedObservers.proceed(status.block_condition) &&
        keypad.handler.inUse(status.block_condition) &&
        !keypad.handler.acceptingResponses
      ) {
        keypad.handler.setNonSensitive();
      }
      if (
        t >= timeWhenRespondable &&
        simulatedObservers.proceed(status.block_condition) &&
        paramReader.read("simulateWithDisplayBool", status.block_condition)
      ) {
        await simulatedObservers.respond();
      }
      // *key_resp* updates
      if (
        targetKind.current === "sound" ||
        targetKind.current === "reading" ||
        canType(responseType.current)
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

          const keyList =
            targetKind.current === "rsvpReading" ? ["up", "down"] : validAns;
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
      if (showCharacterSetResponse.current.length) {
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
        targetKind.current !== "vocoderPhrase"
      )
        toggleClickedCharacters();

      // Check if the (set of clickable charset and keyboard) inputs constitute an end-of-trial
      // for regimes which require a single response to QUEST
      // TODO consolidate all endtrial/correctness logic into one place, ie generalize to include rsvpReading,repeatedLetters
      const uniqueResponses = new Set(
        _key_resp_allKeys.current.map((k) => k.name),
      );
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
          targetStim.frameNEnd = frameN;
          targetStim.frameNFinishConfirmed = frameN;
        }

        // Was this correct?
        if (responseCorrect) {
          // Play correct audio
          switchKind(targetKind.current, {
            vocoderPhrase: () => {
              displayRightOrWrong(true);
              // correctSynth.play();
              status.trialCorrect_thisBlock++;
              status.trialCompleted_thisBlock++;
            },
            sound: () => {
              displayRightOrWrong(true);
              // correctSynth.play();
              status.trialCorrect_thisBlock++;
              status.trialCompleted_thisBlock++;
            },
            letter: () => {
              if (!simulatedObservers.proceed(status.block))
                correctSynth.play();
              status.trialCorrect_thisBlock++;
              status.trialCompleted_thisBlock++;
            },
            movie: () => {
              if (!simulatedObservers.proceed(status.block))
                correctSynth.play();
              status.trialCorrect_thisBlock++;
              status.trialCompleted_thisBlock++;
            },
            vernier: () => {
              if (!simulatedObservers.proceed(status.block))
                correctSynth.play();
              status.trialCorrect_thisBlock++;
              status.trialCompleted_thisBlock++;
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
            displayRightOrWrong(false);
            // wrongSynth.play();
          }

          if (targetKind.current === "repeatedLetters") {
            key_resp.corr = participantResponse.map((r) => 0);
          } else {
            status.trialCompleted_thisBlock++;
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
        renderObj.tinyHint.status === PsychoJS.Status.NOT_STARTED
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
        fixation.status === PsychoJS.Status.STARTED &&
        Screens[0].fixationConfig.markingFixationMotionRadiusDeg > 0 &&
        Screens[0].fixationConfig.markingFixationMotionSpeedDegPerSec > 0 &&
        paramReader.read("targetKind", status.block_condition) ===
          "rsvpReading" &&
        paramReader.read(
          "markingFixationDuringTargetBool",
          status.block_condition,
        ) &&
        paramReader.read(
          "responseMustTrackContinuouslyBool",
          status.block_condition,
        )
      ) {
        if (
          typeof rsvpReadingTargetSets.current === "undefined" &&
          rsvpReadingTargetSets.upcoming.length === 0
        ) {
          fixation.setAutoDraw(false);
        } else {
          showCursor();
          moveFixation(fixation, paramReader);
          fixation.boldIfCursorNearFixation();
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
        }
        if (
          t >= delayBeforeStimOnsetSec &&
          vernier.status === PsychoJS.Status.NOT_STARTED
        ) {
          // keep track of start time/frame for later
          vernier.tStart = t; // (not accounting for frame time here)
          vernier.frameNStart = frameN; // exact frame index
          vernier.setAutoDraw(true);
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
          vernier.status = PsychoJS.Status.NOT_STARTED;
          vernier.frameNEnd = frameN;
          // Play purr sound
          // purrSynth.play();

          setTimeout(() => {
            showCursor();
          }, 500);
        }
      }

      if (targetKind.current === "letter") {
        // *target* updates
        if (paramReader.read("_trackGazeExternallyBool")[0])
          recordStimulusPositionsForEyetracking(
            target,
            "trialRoutineEachFrame",
          );
        if (
          targetStatus === PsychoJS.Status.STARTED &&
          !letterTiming.targetStartSec
        ) {
          letterTiming.targetStartSec = t;
          readingTiming.onsets.push(clock.global.getTime());
          target.frameNDrawnConfirmed = frameN;
        }
        if (
          t >= delayBeforeStimOnsetSec &&
          targetStatus === PsychoJS.Status.NOT_STARTED
        ) {
          // keep track of start time/frame for later
          target.tStart = t; // (not accounting for frame time here)
          target.frameNStart = frameN; // exact frame index
          target.setAutoDraw(true);
          drawTimingBars(showTimingBarsBool.current, "target", true);
          drawTimingBars(showTimingBarsBool.current, "lateness", false);
          letterTiming.targetDrawnConfirmedTimestamp = performance.now();
        }
        if (
          targetStatus === PsychoJS.Status.FINISHED &&
          !letterTiming.targetFinishSec
        ) {
          letterTiming.targetFinishSec = t;
          target.frameNFinishConfirmed = frameN;

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

        if (
          letterTiming.targetStartSec &&
          targetStatus === PsychoJS.Status.STARTED &&
          t >= frameRemains + letterTiming.targetStartSec
        ) {
          drawTimingBars(showTimingBarsBool.current, "target", false);
          target.setAutoDraw(false);
          target.frameNEnd = frameN;
          fixation.setAutoDraw(false);

          // Play purr sound
          // purrSynth.play();

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
            f.tStart = t; // (not accounting for frame time here)
            f.frameNStart = frameN; // exact frame index
            f.setAutoDraw(true);
          }
          if (
            letterTiming.targetStartSec &&
            f.status === PsychoJS.Status.STARTED &&
            t >= frameRemains + letterTiming.targetStartSec
          ) {
            f.setAutoDraw(false);
          }
        });
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

      updateBoundingBoxPolies(
        t,
        frameRemains,
        frameN,
        showBoundingBox,
        showCharacterSetBoundingBox,
        boundingBoxPolies,
        characterSetBoundingBoxPolies,
        displayCharacterSetBoundingBoxPolies[status.block_condition],
        letterConfig.spacingRelationToSize,
        timeWhenRespondable,
        thresholdParameter,
      );
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
                letterConfig.targetSafetyMarginSec +
                letterConfig.targetDurationSec ||
              simulatedObservers.proceed()) &&
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
                letterConfig.targetSafetyMarginSec +
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
                letterConfig.targetSafetyMarginSec +
                letterConfig.targetDurationSec ||
              simulatedObservers.proceed(status.block_condition)) &&
            showCharacterSet.status === PsychoJS.Status.NOT_STARTED
          ) {
            // keep track of start time/frame for later
            showCharacterSet.tStart = t; // (not accounting for frame time here)
            showCharacterSet.frameNStart = frameN; // exact frame index
            showCharacterSet.setAutoDraw(true);

            setupClickableCharacterSet(
              ["left", "right"],
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
      speechInNoiseShowClickable.current = true;
      vocoderPhraseShowClickable.current = true;
      grid.current.hide();
      grid.units = undefined;

      if (Screens[0].fixationConfig.nominalPos)
        Screens[0].fixationConfig.pos = Screens[0].fixationConfig.nominalPos;

      if (showConditionNameConfig.showTargetSpecs)
        targetSpecs.setAutoDraw(false);
      if (showConditionNameConfig.show) conditionName.setAutoDraw(false);

      if (toShowCursor()) {
        showCursor();
        for (const thisComponent of trialComponents) {
          if (typeof thisComponent.setAutoDraw === "function") {
            thisComponent.setAutoDraw(false);
          }
        }
        if (currentLoop instanceof MultiStairHandler) {
          currentLoop._nextTrial();
        }
        routineTimer.reset();
        routineClock.reset();
        key_resp.corr = undefined;
        key_resp.stop();
        return Scheduler.Event.NEXT;
      }

      /* -------------------------------------------------------------------------- */
      // ! question and answer
      if (targetTask.current === "questionAndAnswer") {
        // TEXT|New York|This is a free form text answer question. Please put the name of your favorite city here.
        // CHOICE|Apple|This is an example multiple choice question. Please select your favorite fruit.|Apple|Banana|Watermelon|Strawberry
        // 0     |1    |2                                                                              |3
        let correctAnswer, question, answers;

        let thisQuestionAndAnswer =
          questionsThisBlock.current[status.trial - 1];

        const questionComponents = thisQuestionAndAnswer.split("|");
        const choiceQuestionBool = questionComponents.length > 3;

        // ! shortcut
        const questionAndAnswerShortcut = questionComponents[0];
        // ! correct answer
        correctAnswer = questionComponents[1];
        // ! question
        question = questionComponents[2];
        // ! answers
        if (choiceQuestionBool) {
          answers = questionComponents.slice(3);
        } else {
          // freeform / TEXT
          answers = "";
        }

        let html = "";
        const inputOptions = {};

        if (choiceQuestionBool) {
          // html += `<div class="question">${question}</div>`
          html += '<div class="threshold-answers-set">';
          for (let i = 0; i < answers.length; i++) {
            html += `<button class="threshold-button threshold-answer" data-answer="${answers[i]}">${answers[i]}</button>`;
          }
          html += "</div>";
          ////
          for (const ans of answers) {
            inputOptions[ans] = ans;
          }
        } else {
          html += `<input type="text" class="threshold-answer">`;
          ////
        }

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
          customClass: {
            confirmButton: `threshold-button${
              choiceQuestionBool ? " hidden-button" : ""
            }`,
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
            backdrop: "swal2-backdrop-show",
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
                const radioInputs =
                  document.querySelectorAll(".swal2-radio input");

                for (const e of radioInputs) {
                  if (e.checked) {
                    clearInterval(_);
                    document.getElementsByClassName("swal2-confirm")[0].click();
                  }
                }
              }, 200);
            }
            const questionAndAnswers = document.querySelector(".swal2-title");
            questionAndAnswers.style.fontFamily = instructionFont.current;
            questionAndAnswers.style.font = instructionFont.current;
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
        }

        // continueRoutine = true;
        // return Scheduler.Event.NEXT;
      } else {
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
              // TODO only give to QUEST if acceptable
              currentLoop.addResponse(
                key_resp.corr,
                ProposedVolumeLevelFromQuest.adjusted / 20,
                true,
              );
            }
          },
          sound: () => {
            addTrialStaircaseSummariesToDataForSound(currentLoop, psychoJS);
            //report values to quest
            if (
              currentLoop instanceof MultiStairHandler &&
              currentLoop.nRemaining !== 0
            ) {
              // TODO only give to QUEST if acceptable
              currentLoop.addResponse(
                key_resp.corr,
                ProposedVolumeLevelFromQuest.adjusted / 20,
                true,
              );
            }
          },
          reading: () => {
            addReadingStatsToOutput(trials.thisRepN, psychoJS);
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
            rsvpReadingWordsForThisBlock.current[
              status.block_condition
            ].shift();
            addRsvpReadingTrialResponsesToData();
            removeRevealableTargetWordsToAidSpokenScoring();

            psychoJS.experiment.addData(
              "rsvpReadingResponsesBool",
              phraseIdentificationResponse.correct.join(","),
            );
            const thisStair = currentLoop._currentStaircase;
            addTrialStaircaseSummariesToData(currentLoop, psychoJS);
            // TODO only give to QUEST if acceptable
            currentLoop.addResponse(
              phraseIdentificationResponse.correct,
              level,
              true,
            );
            const nTrials = thisStair._jsQuest.trialCount;
            psychoJS.experiment.addData("questTrialCountAtEndOfTrial", nTrials);
            clearPhraseIdentificationRegisters();
          },
          movie: () => {
            addTrialStaircaseSummariesToData(currentLoop, psychoJS);
            if (
              currentLoop instanceof MultiStairHandler &&
              currentLoop.nRemaining !== 0
            ) {
              // switch (thresholdParameter) {
              //   case "targetContrast":
              // const targetContrast = paramReader.read(
              //   thresholdParameter,
              //   status.block_condition
              // );
              // TODO only give to QUEST if acceptable
              currentLoop.addResponse(
                key_resp.corr,
                // intensity
                //Math.log10(targetContrast)
                actualStimulusLevel,
                true,
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
              logger("!. key_resp.corr", key_resp.corr);
              currentLoop.addResponse(key_resp.corr, level, true);
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
      //update the progress bar
      updateProgressBar((status.trial / totalTrialsThisBlock.current) * 100);
      // Toggle takeABreak credit progressBar
      if (paramReader.read("showTakeABreakCreditBool", status.block_condition))
        showTrialBreakProgressBar(currentBlockCreditForTrialBreak);
      else hideTrialBreakProgressBar();

      // Check if trialBreak should be triggered
      if (
        targetTask.current !== "questionAndAnswer" &&
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
            );
          }, takeABreakMinimumDurationSec * 1000);
        });
      }

      // if trialBreak is ongoing
      else if (totalTrialsThisBlock.current === status.trial)
        hideTrialBreakProgressBar();

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

        console.log(
          `%c====== Trial ${status.trial} ======`,
          "background: purple; color: white; padding: 1rem",
        );

        const parametersToExcludeFromData = [];
        const currentTrial = currentLoopSnapshot.getCurrentTrial();
        // Format of currentTrial is different for "reading" vs "rsvpReading", "letter", etc
        const BC = currentTrial["trials.label"] ?? currentTrial["label"];
        status.block_condition = BC;
        trackNthTrialInCondition(BC);
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
      return Scheduler.Event.NEXT;
    };
  }
};
