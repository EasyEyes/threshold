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
  viewingDistanceDesiredCm,
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
  XYPixOfXYDeg,
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

import { cleanFontName, loadFonts } from "./components/fonts.js";
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
  // getSizeForSpacing,
  // getSizeForXHeight,
  getThisBlockPages,
  loadReadingCorpus,
  addReadingStatsToOutput,
  findReadingSize,
  reportWordCounts,
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

import { readAllowedTolerances } from "./components/errorMeasurement.js";

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
import { handleEscapeKey } from "./components/skipTrialOrBlock.js";
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
} from "./components/soundUtils.js";
import {
  getSpeechInNoiseTrialData,
  initSpeechInNoiseSoundFiles,
} from "./components/speechInNoise.js";

import {
  checkSystemCompatibility,
  displayCompatibilityMessage,
  hideCompatibilityMessage,
} from "./components/compatibilityCheck.js";
import {
  Fixation,
  getFixationPos,
  getFixationVertices,
  gyrateFixation,
  offsetStimsToFixationPos,
} from "./components/fixation.js";
import {
  vernierConfig,
  readTrialLevelVenierParams,
  VernierStim,
  restrictOffsetDeg,
  offsetVernierToFixationPos,
} from "./components/vernierStim.js";
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
import { readTrialLevelLetterParams } from "./components/letter.js";
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
  _rsvpReading_trialInstructionRoutineBegin,
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
import { logQuest } from "./components/logging.js";
import { getBlockOrder, getBlocksTrialList } from "./components/shuffle.ts";
import { KeypadHandler } from "./components/keypad.js";
import {
  useMatlab,
  waitForSignal,
  sendMessage,
} from "./components/connectMatlab.js";
import { readi18nPhrases } from "./components/readPhrases.js";
import { updateColor } from "./components/color.js";
import {
  getDelayBeforeMoviePlays,
  getLuminanceFilename,
  addMeasureLuminanceIntervals,
  initColorCAL,
} from "./components/photometry.js";

/* -------------------------------------------------------------------------- */

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

const paramReaderInitialized = async (reader) => {
  // ! avoid opening windows twice
  if (typeof psychoJS._window !== "undefined") return;
  useMatlab.current = reader.read("_trackGazeExternallyBool")[0];
  // get debug mode from reader
  debugBool.current = reader.read("_debugBool")[0];

  buildWindowErrorHandling(reader);

  // if rc is not defined, reload the page
  if (!rc?.browser?.value) {
    window.location.reload();
  }
  // ! check system compatibility
  const compMsg = checkSystemCompatibility(
    reader,
    reader.read("_language")[0],
    rc
  );
  let needAnySmartphone = false;
  let needCalibratedSmartphoneMicrophone = false;
  // TODO: add logic for needAnySmartphone

  const calibrateMicrophonesBool = reader.read("_calibrateMicrophonesBool")[0];
  const calibrateSound1000Hz = reader.read("calibrateSound1000HzBool")[0];
  const calibrateSoundAllHz = reader.read("calibrateSoundAllHzBool")[0];
  needPhoneSurvey.current = reader.read("_needSmartphoneSurveyBool")[0];
  if (
    calibrateMicrophonesBool === false &&
    (calibrateSound1000Hz === true ||
      calibrateSoundAllHz === true ||
      needPhoneSurvey.current === true)
  ) {
    needCalibratedSmartphoneMicrophone = true;
  }
  console.log(
    "needCalibratedSmartphoneMicrophone",
    needCalibratedSmartphoneMicrophone
  );

  let compatibilityCheckPeer = null;
  if (needCalibratedSmartphoneMicrophone || needAnySmartphone) {
    const params = {
      text: readi18nPhrases("RC_smartphoneOkThanks", rc.language.value),
    };
    compatibilityCheckPeer = new ExperimentPeer(params);
  }
  const { proceedButtonClicked, proceedBool, mic } =
    await displayCompatibilityMessage(
      compMsg["msg"],
      reader,
      rc,
      compMsg["promptRefresh"],
      compMsg["proceed"],
      compatibilityCheckPeer,
      needAnySmartphone,
      needCalibratedSmartphoneMicrophone
    );

  microphoneInfo.current.micFullName = mic.micFullName;
  microphoneInfo.current.micFullSerialNumber = mic.micFullSerialNumber;
  microphoneInfo.current.micrFullManufacturerName =
    mic.micrFullManufacturerName;
  microphoneInfo.current.phoneSurvey = mic.phoneSurvey;

  hideCompatibilityMessage();
  if (proceedButtonClicked && !proceedBool) {
    showExperimentEnding();
    return;
  }

  // ! check cross session user id
  thisExperimentInfo.requestedCrossSessionId = false;

  if (reader.read("_participantIDGetBool")[0]) {
    const gotParticipantId = (participant, session = null, storedId) => {
      if (participant) {
        thisExperimentInfo.requestedCrossSessionId = true;
        thisExperimentInfo.participant = participant;
        if (storedId !== undefined && participant === storedId) {
          thisExperimentInfo.setSession(
            session && isNaN(Number(session)) ? session : Number(session) + 1
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
      rc.language.value
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

  // show screens before actual experiment begins
  const continueExperiment = await showForm(reader.read("_consentForm")[0]);
  hideForm();

  if (!continueExperiment) {
    await showForm(reader.read("_debriefForm")[0]);
    hideForm();
    showExperimentEnding(); // TODO Rethink about this function in terms of UI and logic
    return;
  } else {
    // Get fullscreen
    // commented this out to avoid going fullscreen before sound calibration. Added to startExperiment()
    // if (!rc.isFullscreen.value && !debug) {
    //   rc.getFullscreen();
    //   await sleep(1000);
    // }
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
    if (!(await calibrateAudio(reader))) {
      quitPsychoJS("", "", reader);
    } else {
      // ! clean RC dom
      if (document.querySelector("#rc-panel-holder"))
        document.querySelector("#rc-panel-holder").remove();

      rc.pauseNudger();
      // Get fullscreen
      if (!rc.isFullscreen.value && !debug) {
        rc.getFullscreen();
        await sleep(1000);
      }

      // ! Start actual experiment
      experiment(reader.blockCount);
    }
  };
  ////

  const experimentStarted = { current: false };
  // ! Remote Calibrator
  if (useRC && useCalibration(reader)) {
    rc.panel(
      formCalibrationList(reader),
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
          // rc.pauseDistance();

          await startExperiment();
        } else {
          warning(
            "Participant re-calibrated. You may consider discarding the trials before."
          );
        }
      }
    );
  } else {
    await startExperiment();
  }
};

export const paramReader = new ParamReader(
  "conditions",
  paramReaderInitialized
);

/* -------------------------------------------------------------------------- */

var conditionName;
var targetSpecs; // TextStim object

var trialCounter; // TextSim object

// Maps 'block_condition' -> bounding rectangle around (appropriate) characterSet
// In typographic condition, the bounds are around a triplet
var characterSetBoundingRects = {};

const experiment = (howManyBlocksAreThereInTotal) => {
  ////
  // Resources
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
    "!experimentFilename"
  )[0];

  logger("fontsRequired", fontsRequired);
  for (let i in fontsRequired) {
    logger(i, fontsRequired[i]);
    // console.log("",fontsRequired[i].length);
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

  // initial background color
  screenBackground.colorRGBA = colorRGBASnippetToRGBA(
    paramReader.read("screenColorRGBA", "__ALL_BLOCKS__")[0]
  );

  // open window:
  psychoJS.openWindow({
    fullscr: !debug,
    color: new util.Color(
      colorRGBSnippetToRGB(screenBackground.defaultColorRGBA)
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
    })
  );

  // Controls the big picture flow of the experiment
  const flowScheduler = new Scheduler(psychoJS);
  const dialogCancelScheduler = new Scheduler(psychoJS);
  psychoJS.scheduleCondition(
    function () {
      return psychoJS.gui.dialogComponent.button === "OK";
    },
    flowScheduler,
    dialogCancelScheduler
  );

  // flowScheduler gets run if the participants presses OK
  flowScheduler.add(updateInfo); // add timeStamp
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

  // var frameDur;
  async function updateInfo() {
    thisExperimentInfo["date"] = util.MonotonicClock.getDateStr(); // add a simple timestamp
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
      thisExperimentInfo["monitorFrameRate"]
    );

    // if _needSmartphoneSurveyBool add survey data
    if (needPhoneSurvey.current) {
      // add microphoneInfo.current.phoneSurvey
      psychoJS.experiment.addData(
        "Microphone survey",
        JSON.stringify(microphoneInfo.current.phoneSurvey)
      );
    }
    // add sound calibration results
    if (soundCalibrationResults.current) {
      psychoJS.experiment.addData(
        "Cal1000HzInDb",
        soundCalibrationResults.current.inDBValues
      );
      // psychoJS.experiment.addData(
      //   "All Hz out (dB SPL)",
      //   soundCalibrationResults.current.outDBSPLValues
      // );
      psychoJS.experiment.addData(
        "Cal1000HzOutDb",
        soundCalibrationResults.current.outDBSPL1000Values
      );
      psychoJS.experiment.addData(
        "SoundGainParameters",
        JSON.stringify(soundCalibrationResults.current.parameters)
      );
      psychoJS.experiment.addData(
        "THD",
        soundCalibrationResults.current.thdValues
      );
    }
    if (allHzCalibrationResults.x_conv) {
      psychoJS.experiment.addData(
        "MlsSpectrumHz",
        allHzCalibrationResults.y_conv
      );
      psychoJS.experiment.addData(
        "MlsSpectrumFilteredDb",
        allHzCalibrationResults.x_conv
      );
      psychoJS.experiment.addData(
        "MlsSpectrumUnfilteredHz",
        allHzCalibrationResults.y_unconv
      ); // x and y are swapped
      psychoJS.experiment.addData(
        "MlsSpectrumUnfilteredDb",
        allHzCalibrationResults.x_unconv
      ); // x and y are swapped
      psychoJS.experiment.addData(
        "Loudspeaker IR",
        allHzCalibrationResults.knownIr
      );
      psychoJS.experiment.addData(
        "Loudspeaker IIR",
        invertedImpulseResponse.current
      );
      psychoJS.experiment.addData(
        "Loudspeaker model",
        JSON.stringify(loudspeakerInfo.current)
      );
    }
    if (microphoneCalibrationResults.length > 0) {
      psychoJS.experiment.addData(
        "Microphone calibration results",
        JSON.stringify(microphoneCalibrationResults)
      );
    }
    if (rc.stressFps) {
      psychoJS.experiment.addData("frameRateUnderStress", rc.stressFps.value);
    } else {
      // forcedly make sure that computeRandomMHz is always available
      if (rc.performanceCompute)
        await rc.performanceCompute((result) => {
          psychoJS.experiment.addData(
            "computeRandomMHz",
            result.value.computeRandomMHz
          );
        });
    }

    // ! add info from the URL:
    // ! disabled as we add Prolific fields in our own ways and we don't want to overwrite
    // ! EasyEyes fields with Prolific fields
    // util.addInfoFromUrl(thisExperimentInfo);

    // record Prolific related info to thisExperimentInfo
    if (isProlificExperiment()) saveProlificInfo(thisExperimentInfo);

    window.console.log("ENV NAME", psychoJS.getEnvironment());
    window.console.log("PSYCHOJS _CONFIG", psychoJS._config);
    window.console.log("PAVLOVIA PROJECT NAME", getPavloviaProjectName());
    thisExperimentInfo.experiment = getPavloviaProjectName();

    return Scheduler.Event.NEXT;
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

  var readingParagraph;

  var key_resp;
  var keypad;
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

  async function experimentInit() {
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

    /* -------------------------------------------------------------------------- */

    // ! POPUPS for take a break & proportion correct
    preparePopup(rc.language.value, thisExperimentInfo.name); // Try to use only one popup ele for both (or even more) popup features
    prepareTrialBreakProgressBar();

    saveDataOnWindowClose(psychoJS.experiment);

    /* -------------------------------------------------------------------------- */
    fixation = new Fixation();
    // fixationConfig.stim = fixation;
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
      ...psychojsTextStimConfig,
      ...targetTextStimConfig,
    });
    flanker3 = new visual.TextStim({
      name: "flanker2",
      ...psychojsTextStimConfig,
      ...targetTextStimConfig,
    });
    flanker4 = new visual.TextStim({
      name: "flanker2",
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
      cleanFontName
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
    readingParagraph = new visual.TextStim({
      win: psychoJS.window,
      name: "readingParagraph",
      text: "",
      font: "Arial",
      units: "pix",
      pos: [0, 0],
      height: undefined,
      wrapWidth: window.innerWidth, // nowrap
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -9.0,
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
    displayOptions.nearPointXYDeg = [0, 0]; // TEMP
    displayOptions.nearPointXYPix = [0, 0]; // TEMP

    displayOptions.windowWidthCm = rc.screenWidthCm
      ? rc.screenWidthCm.value
      : 30;
    displayOptions.windowWidthPx = rc.displayWidthPx.value;
    displayOptions.pixPerCm =
      displayOptions.windowWidthPx / displayOptions.windowWidthCm;

    displayOptions.window = psychoJS.window;

    grid.current = new Grid("disabled", displayOptions, psychoJS);

    // create progress bar
    createProgressBar();
    updateProgressBar(0);
    hideProgressBar();

    keypad = new KeypadHandler(paramReader);

    // start matlab
    if (useMatlab.current) {
      await sendMessage(
        "Record " + thisExperimentInfo.experiment + "-",
        thisExperimentInfo.participant,
        "-gaze"
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

  function _instructionSetup(text, blockOrCondition) {
    t = 0;
    instructionsClock.reset(); // clock
    frameN = -1;
    continueRoutine = true;
    instructionsConfig.height = getParamValueForBlockOrCondition(
      "instructionFontSizePt",
      blockOrCondition
    );
    instructions.setWrapWidth(window.innerWidth * 0.8);
    instructions.setPos([-window.innerWidth * 0.4, window.innerHeight * 0.4]);
    instructions.setText(text);
    updateColor(instructions, "instruction", blockOrCondition);
    instructions.setAutoDraw(true);
    dynamicSetSize([instructions], instructionsConfig.height);
  }

  // TODO use _instructionSetup, DRY
  function _instructionBeforeStimulusSetup(
    text,
    wrapWidth = window.innerWidth / 4,
    pos = [-window.innerWidth / 2 + 5, window.innerHeight / 2 - 5]
  ) {
    t = 0;
    instructionsClock.reset(); // clock
    frameN = -1;
    continueRoutine = true;
    // const wrapWidth = Math.round(1.5 + Math.sqrt(9 + 12*text.length)/2) * instructions.height/1.9;
    instructionsConfig.height = getParamValueForBlockOrCondition(
      "instructionFontSizePt",
      status.block_condition
    );
    instructions.setWrapWidth(wrapWidth);
    instructions.setPos(pos);
    instructions.setText(text);
    updateColor(instructions, "instruction", status.block_condition);
    instructions.setAutoDraw(true);
  }

  async function _instructionRoutineEachFrame() {
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
      trialCounter
    );

    if (
      psychoJS.experiment.experimentEnded ||
      psychoJS.eventManager.getKeys({ keyList: ["escape"] }).length > 0
    ) {
      removeBeepButton();

      return quitPsychoJS("", false, paramReader);
    }

    if (!continueRoutine || clickedContinue.current) {
      continueRoutine = true;
      clickedContinue.current = false;
      return Scheduler.Event.NEXT;
    }

    continueRoutine = true;

    if (
      keypad.inUse(status.block) &&
      _key_resp_allKeys.current.map((r) => r.name).includes("return")
    ) {
      continueRoutine = false;
      removeProceedButton();
      keypad.clearKeys();
    }

    switchKind(targetKind.current, {
      letter: () => {
        if (
          canType(responseType.current) &&
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0
        ) {
          loggerText(
            "Inside switchKind [letter] if statement of _instructionRoutineEachFrame"
          );
          continueRoutine = false;
          removeProceedButton();
        }
      },
      reading: () => {
        if (psychoJS.eventManager.getKeys({ keyList: ["space"] }).length > 0) {
          continueRoutine = false;
          removeProceedButton();
        }
      },
      sound: () => {
        if (psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0) {
          continueRoutine = false;
          removeProceedButton();
        }
      },
      vocoderPhrase: () => {
        if (psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0) {
          continueRoutine = false;
          removeProceedButton();
        }
      },
      repeatedLetters: () => {
        if (
          canType(responseType.current) &&
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0
        ) {
          continueRoutine = false;
          removeProceedButton();
        }
      },
      rsvpReading: () => {
        if (
          canType(responseType.current) &&
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0
        ) {
          continueRoutine = false;
          removeProceedButton();
        }
      },
      movie: () => {
        if (
          (canType(responseType.current) ||
            keypadActive(responseType.current)) &&
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0
        ) {
          loggerText(
            "Inside switchKind [movie] if statement of _instructionRoutineEachFrame"
          );
          continueRoutine = false;
          removeProceedButton();
        }
      },
      vernier: () => {
        if (
          canType(responseType.current) &&
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0
        ) {
          loggerText(
            "Inside switchKind [vernier] if statement of _instructionRoutineEachFrame"
          );
          continueRoutine = false;
          removeProceedButton();
        }
      },
    });

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
      loggerText("blocksLoopBegin");
      TrialHandler.fromSnapshot(snapshot); // update internal variables (.thisN etc) of the loop

      // set up handler to look after randomisation of conditions etc
      const blockTrialList = getBlocksTrialList(
        paramReader,
        blockOrder.current
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
          `conditions/block_${_thisBlock.block + 1}.csv`
        );
        blocksLoopScheduler.add(importConditions(snapshot, "block"));
        blocksLoopScheduler.add(filterRoutineBegin(snapshot));
        blocksLoopScheduler.add(filterRoutineEachFrame());
        blocksLoopScheduler.add(filterRoutineEnd());

        if (
          conditions.every(
            (c) =>
              typeof c["conditionEnabledBool"] !== "undefined" &&
              String(c["conditionEnabledBool"]).toLowerCase() === "false"
          )
        )
          continue;

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
                  blockSchedulerFinalRoutineBegin(snapshot)
                );
                blocksLoopScheduler.add(blockSchedulerFinalRoutineEachFrame());
                blocksLoopScheduler.add(blockSchedulerFinalRoutineEnd());
              },
            });
          },
        });

        blocksLoopScheduler.add(
          endLoopIteration(blocksLoopScheduler, snapshot)
        );
      }

      return Scheduler.Event.NEXT;
    };
  }

  var trialsConditions;
  var trials;
  function trialsLoopBegin(trialsLoopScheduler, snapshot) {
    return async function () {
      // setup a MultiStairTrialHandler
      trialsConditions = TrialHandler.importConditions(
        psychoJS.serverManager,
        thisConditionsFile
      );
      trialsConditions = trialsConditions
        .map((condition) =>
          Object.assign(condition, { label: condition["block_condition"] })
        )
        .filter((condition) =>
          paramReader.read("conditionEnabledBool", condition["block_condition"])
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
                paramReader
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

              fixationConfig.show = true;
            },
            repeatedLetters: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader
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
              fixationConfig.show = true;
            },
            rsvpReading: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader
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
              fixationConfig.show = true;
            },
            sound: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader,
                "sound"
              );
              // console.log("sound:trialsConditions", trialsConditions);

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
                "sound"
              );
              // console.log("VocoderPhrasetrialsConditions", trialsConditions);
              // console.log("totalTrialsThisBlock.current", totalTrialsThisBlock.current);
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
                "movie"
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
              fixationConfig.show = true;
            },
            vernier: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader,
                "vernier"
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
              fixationConfig.show = true;
            },
          });
        },
        detect: () => {
          switchKind(targetKind.current, {
            sound: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader,
                "sound"
              );
              // console.log("sound:trialsConditions", trialsConditions);
              // console.log("trialsConditions", trialsConditions);

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
        // console.log("vocoderPhraseConditions", trialsConditions);
      } else if (targetKind.current === "sound") {
        if (targetTask.current === "identify") {
          //init trial sound data
          var speechInNoiseConditions = trialsConditions.filter(
            (condition) => condition["targetTask"] == "identify"
          );
          // console.log("speechInNoiseConditions", trialsConditions);
          await initSpeechInNoiseSoundFiles(
            speechInNoiseConditions.length
              ? speechInNoiseConditions
              : trialsConditions
          );
          // console.log("speechInNoiseConditions", speechInNoiseConditions);
        } else {
          //init trial sound data
          var toneInMelodyConditions = trialsConditions.filter(
            (condition) => condition["targetTask"] == "detect"
          );
          await initToneInMelodySoundFiles(
            toneInMelodyConditions.length
              ? toneInMelodyConditions
              : trialsConditions
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
          endLoopIteration(trialsLoopScheduler, snapshot)
        );
      }
      return Scheduler.Event.NEXT;
    };
  }

  async function trialsLoopEnd() {
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
              100
          )}`
        ),
        instructionsText.trialBreak(rc.language.value, responseType.current),
        !canClick(responseType.current)
      );
      console.log(keypadActive(responseType.current));
      // if (keypadActive(responseType.current)) keypad.start();
      await addPopupLogic(
        thisExperimentInfo.name,
        responseType.current,
        null,
        keypad
      );
    }
    // Reset trial counter
    status.trialCorrect_thisBlock = 0;
    status.trialCompleted_thisBlock = 0;
    addBlockStaircaseSummariesToData(currentLoop, psychoJS, displayOptions);

    // terminate loop
    psychoJS.experiment.removeLoop(trials);
    return Scheduler.Event.NEXT;
  }

  async function blocksLoopEnd() {
    psychoJS.experiment.removeLoop(blocks);
    return Scheduler.Event.NEXT;
  }

  // An extra routine after all the trials are finished
  // Currently made solely for the reading task
  function blockSchedulerFinalRoutineBegin(snapshot) {
    return async function () {
      // Stop drawing reading pages
      readingParagraph.setAutoDraw(false);

      // ? Check for response type first
      showCursor();

      loggerText("blockSchedulerFinalRoutineBegin");

      TrialHandler.fromSnapshot(snapshot);
      blockScheduleFinalClock.reset();
      frameN = -1;
      continueRoutine = true;

      if (paramReader.read("readingNumberOfQuestions", status.block)[0] > 0) {
        readingQuestions.current = prepareReadingQuestions(
          paramReader.read("readingNumberOfQuestions", status.block)[0],
          paramReader.read("readingNumberOfPossibleAnswers", status.block)[0],
          readingThisBlockPages,
          readingFrequencyToWordArchive[
            paramReader.read("readingCorpus", status.block)[0]
          ]
        );
        readingCurrentQuestionIndex.current = 0;
        readingClickableAnswersSetup.current = false;
        readingClickableAnswersUpdate.current = false;

        // Display
        const customInstructions = getCustomInstructionText(
          "response",
          paramReader,
          status.block_condition
        );
        if (customInstructions.length) {
          instructions.setText(customInstructions);
        } else {
          instructions.setText(
            readi18nPhrases("T_readingTaskQuestionPrompt", rc.language.value)
          );
        }
        updateColor(instructions, "instruction", status.block_condition);
        instructions.setAutoDraw(true);
      }

      return Scheduler.Event.NEXT;
    };
  }

  function blockSchedulerFinalRoutineEachFrame() {
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
        targetKind.current === "reading" ? "letter" : targetKind.current
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
        console.log(
          `%c${thisQuestion.correctAnswer}`,
          `color: red; font-size: 1.5rem; font-family: ${font.name}`
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
              correct ? "TRUE" : "FALSE"
            );
            addConditionToData(
              paramReader,
              status.block_condition,
              psychoJS.experiment
            );
            psychoJS.experiment.nextEntry();
            if (correct) correctSynth.play();
          },
          "readingAnswer",
          targetKind.current,
          status.block,
          responseType.current
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
        console.log(
          `%c${thisQuestion.correctAnswer}`,
          `color: red; font-size: 1.5rem; font-family: ${font.name}`
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
              correct ? "TRUE" : "FALSE"
            );
            // TODO don't call nextEntry() on the last question?
            addConditionToData(
              paramReader,
              status.block_condition,
              psychoJS.experiment
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
          responseType.current
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
      TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

      showCursor();

      status.block = snapshot.block + 1;
      console.log(
        `%c====== Block ${status.block} ======`,
        "background: orange; color: white; padding: 1rem"
      );
      status.nthBlock += 1;
      totalBlocks.current = snapshot.nTotal;

      reportStartOfNewBlock(status.block, psychoJS.experiment);

      if (status.nthBlock === 1 || paramReader.read("_saveEachBlockBool")[0]) {
        logger("Saving csv at start of block!");
        psychoJS.experiment.save();
      }

      if (keypad.inUse(status.block)) {
        keypad.start();
      } else {
        keypad.stop();
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
      fixationConfig.nominalPos = getFixationPos(status.block, paramReader);
      fixationConfig.pos = fixationConfig.nominalPos;
      ////

      // Turn off distance nudger if not needed this block
      if (
        !ifTrue(paramReader.read("viewingDistanceNudgingBool", status.block))
      ) {
        rc.pauseNudger();
      }

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
      viewingDistanceDesiredCm.current = paramReader.read(
        "viewingDistanceDesiredCm",
        status.block
      )[0];

      viewingDistanceCm.current = rc.viewingDistanceCm
        ? rc.viewingDistanceCm.value
        : viewingDistanceDesiredCm.current;
      if (!rc.viewingDistanceCm)
        console.warn(
          "[Viewing Distance] Using arbitrary viewing distance. Enable RC."
        );
      /* -------------------------------------------------------------------------- */
      const getTotalTrialsThisBlock = () => {
        const possibleTrials = paramReader
          .read("conditionTrials", status.block)
          .filter(
            (c, i) => paramReader.read("conditionEnabledBool", status.block)[i]
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
                status.block
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
              if (
                paramReader
                  .read("measureLuminanceBool", status.block)
                  .some((x) => x)
              ) {
                if ("serial" in navigator) {
                  initColorCAL();
                } else {
                  console.error("Web Serial API not supported in this browser");
                }
              }
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

      for (const thisComponent of filterComponents)
        if ("status" in thisComponent)
          thisComponent.status = PsychoJS.Status.NOT_STARTED;
      return Scheduler.Event.NEXT;
    };
  }

  function filterRoutineEachFrame() {
    return async function () {
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
    loggerText("initInstructionRoutineBegin");
    return async function () {
      loggerText(
        `initInstructionRoutineBegin targetKind ${targetKind.current}`
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
        paramReader.read("responseSpokenBool", status.block)[0]
      );

      // set default background color for instructions
      screenBackground.colorRGBA = colorRGBASnippetToRGBA(
        paramReader.read("screenColorRGBA", status.block)[0]
      );
      psychoJS.window.color = new util.Color(screenBackground.colorRGBA);
      psychoJS.window._needUpdate = true; // ! dangerous

      thresholdParameter = paramReader.read(
        "thresholdParameter",
        status.block
      )[0];

      switchKind(targetKind.current, {
        vocoderPhrase: () => {
          //setup instruction
          const instr = instructionsText.vocoderPhraseBegin(L);
          _instructionSetup(
            (snapshot.block === 0 ? instructionsText.initial(L) : "") + instr,
            status.block
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
            status.block
          );
        },
        letter: () => {
          const letterBlockInstructionText =
            (snapshot.block === 0 ? instructionsText.initial(L) : "") +
            instructionsText.initialByThresholdParameter[thresholdParameter](
              L,
              responseType.current,
              totalTrialsThisBlock.current
            ) +
            instructionsText.initialEnd(L, responseType.current);
          _instructionSetup(letterBlockInstructionText, status.block);
        },
        repeatedLetters: () => {
          const repeatedLettersBlockInstructs =
            (snapshot.block === 0 ? instructionsText.initial(L) : "") +
            instructionsText.initialByThresholdParameter[thresholdParameter](
              L,
              responseType.current,
              totalTrialsThisBlock.current
            ) +
            instructionsText.initialEnd(L, responseType.current);
          _instructionSetup(repeatedLettersBlockInstructs, status.block);
        },
        rsvpReading: () => {
          const rsvpReadingBlockInstructs =
            (snapshot.block === 0 ? instructionsText.initial(L) : "") +
            instructionsText.initialByThresholdParameter["timing"](
              L,
              responseType.current,
              paramReader
                .read("conditionTrials", status.block)
                .reduce((a, b) => a + b)
            );
          font.letterSpacing = paramReader.read(
            "fontTrackingForLetters",
            status.block
          )[0];
          _instructionSetup(rsvpReadingBlockInstructs, status.block);
          rsvpReadingWordsForThisBlock.current = getThisBlockRSVPReadingWords(
            paramReader,
            status.block
          );
        },
        reading: () => {
          _instructionSetup(
            (snapshot.block === 0 ? instructionsText.initial(L) : "") +
              instructionsText.readingEdu(
                L,
                paramReader.read("readingPages", status.block)[0]
              ),
            status.block
          );

          renderObj.tinyHint.setText(
            readi18nPhrases("T_readingNextPage", rc.language.value)
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

          // Reset reading status
          readingPageIndex.current = 0;

          // FONT
          ////
          font.name = paramReader.read("font", status.block)[0];
          font.source = paramReader.read("fontSource", status.block)[0];
          if (font.source === "file") font.name = cleanFontName(font.name);
          ////
          font.colorRGBA = paramReader.read("fontColorRGBA", status.block)[0];
          font.letterSpacing = paramReader.read(
            "fontTrackingForLetters",
            status.block
          )[0];

          readingParagraph.setFont(font.name);
          updateColor(readingParagraph, "marking", status.block);
          readingParagraph.setLetterSpacingByProportion(font.letterSpacing);

          // psychoJS.window.color = new util.Color(colorRGBSnippetToRGB(
          //   screenBackground.colorRGB
          // ))
          // psychoJS.window._needUpdate = true; // ! dangerous

          fontCharacterSet.current = String(
            paramReader.read("fontCharacterSet", status.block)[0]
          ).split("");

          // HEIGHT
          readingConfig.height = findReadingSize(
            paramReader.read("readingSetSizeBy", status.block)[0],
            paramReader,
            readingParagraph,
            "block"
          );
          readingParagraph.setHeight(readingConfig.height);
          fontSize.current = readingConfig.height;

          // LTR or RTL
          let readingDirectionLTR = paramReader.read(
            "fontLeftToRightBool",
            status.block
          )[0];
          if (!readingDirectionLTR) readingParagraph.setAlignHoriz("right");

          // Construct this block pages
          getThisBlockPages(paramReader, status.block, readingParagraph);

          // WRAP WIDTH
          readingParagraph.setAutoDraw(false);
          let thisBlockWrapWidth = 0;
          for (let page of readingThisBlockPages) {
            readingParagraph.setText(page);
            readingParagraph.setWrapWidth(1.2 * window.innerWidth);
            let lastHeight = readingParagraph.getBoundingBox().height;
            let lastWidth = window.innerWidth;
            for (
              let testWidth = 1.2 * window.innerWidth;
              testWidth > 0;
              testWidth -= 5
            ) {
              readingParagraph.setWrapWidth(testWidth);
              const thisHeight = readingParagraph.getBoundingBox().height;
              if (lastHeight === thisHeight) lastWidth = testWidth;
              else {
                if (lastWidth > thisBlockWrapWidth)
                  thisBlockWrapWidth = lastWidth;
                break;
              }
            }
          }
          readingParagraph.setWrapWidth(thisBlockWrapWidth);

          // POS
          if (readingDirectionLTR)
            readingParagraph.setPos([-thisBlockWrapWidth * 0.5, 0]);
          else readingParagraph.setPos([thisBlockWrapWidth * 0.5, 0]);

          // PADDING
          readingParagraph.setPadding(
            paramReader.read("fontPadding", status.block)[0]
          );
        },
        movie: () => {
          loggerText("inside movie");
          _instructionSetup(
            snapshot.block === 0 ? instructionsText.initial(L) : "",
            status.block
          );
        },
        vernier: () => {
          const vernierBlockInstructionText =
            (snapshot.block === 0 ? instructionsText.initial(L) : "") +
            instructionsText.vernierBegin(
              L,
              responseType.current,
              totalTrialsThisBlock.current
            ) +
            instructionsText.vernierInitialEnd(L, responseType.current);
          _instructionSetup(vernierBlockInstructionText, status.block);
        },
      });

      clickedContinue.current = false;
      if (canClick(responseType.current) && targetKind.current !== "reading")
        addProceedButton(rc.language.value);

      if (keypad.inUse(status.block) && targetKind.current !== "reading") {
        await keypad.update(["SPACE", "RETURN"], "sans-serif", undefined);
      }

      addBeepButton(L, correctSynth);

      psychoJS.eventManager.clearKeys();
      keypad.clearKeys(status.block_condition);

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
        targetKind.current
      );
      trialCounter.setText(trialCounterStr);

      updateColor(trialCounter, "instruction", status.block);
      trialCounter.setAutoDraw(true);

      customInstructionText.current = getCustomInstructionText(
        "block",
        paramReader,
        status.block
      );
      if (customInstructionText.current.length)
        _instructionSetup(customInstructionText.current, status.block);

      return Scheduler.Event.NEXT;
    };
  }

  function initInstructionRoutineEachFrame() {
    return () => {
      if (customInstructionText.current.includes("#NONE")) {
        removeProceedButton();
        return Scheduler.Event.NEXT;
      }
      return _instructionRoutineEachFrame();
    };
  }

  function initInstructionRoutineEnd() {
    return async function () {
      instructions.setAutoDraw(false);
      keypad.clearKeys();
      // if (keypadActive(responseType.current)) keypad.stop(); // Necessary??

      removeBeepButton();

      psychoJS.experiment.addData(
        "initInstructionRoutineDurationFromBeginSec",
        initInstructionClock.getTime()
      );
      psychoJS.experiment.addData(
        "initInstructionRoutineDurationFromPreviousEndSec",
        routineClock.getTime()
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
      eduInstructionClock.reset();

      TrialHandler.fromSnapshot(snapshot);

      clickedContinue.current = false;
      if (canClick(responseType.current)) addProceedButton(rc.language.value);

      thresholdParameter = paramReader.read(
        "thresholdParameter",
        status.block
      )[0];
      switchKind(targetKind.current, {
        letter: () => {
          // IDENTIFY
          _instructionSetup(
            instructionsText.edu[thresholdParameter](rc.language.value),
            status.block
          );

          instructions2.setText(
            instructionsText.eduBelow[thresholdParameter](
              rc.language.value,
              responseType.current
            )
          );
          updateColor(instructions2, "instruction", status.block);
          instructions2.setWrapWidth(window.innerWidth * 0.8);
          instructions2.setPos([
            -window.innerWidth * 0.4,
            -window.innerHeight * 0.4,
          ]);
          instructions2.setAutoDraw(true);
          instructionsConfig.height = getParamValueForBlockOrCondition(
            "instructionFontSizePt",
            status.block
          );
          dynamicSetSize(
            [instructions, instructions2],
            instructionsConfig.height
          );

          var h = 50;
          var D = 200;
          var g = 60;

          target.setFont(instructionFont.current);
          target.setPos([D, 0]);
          target.setText("R");
          target.setHeight(h);
          updateColor(target, "marking", status.block);

          // TODO maybe show four flankers in instructions, if radialAndTangential or horizontalAndVertical
          flanker1.setFont(instructionFont.current);
          flanker1.setPos([D - g, 0]);
          flanker1.setText("H");
          flanker1.setHeight(h);
          updateColor(flanker1, "marking", status.block);

          flanker2.setFont(instructionFont.current);
          flanker2.setPos([D + g, 0]);
          flanker2.setText("C");
          flanker2.setHeight(h);
          updateColor(flanker2, "marking", status.block);

          fixation.setVertices(getFixationVertices(h));
          fixation.setLineWidth(5);
          fixation.setPos([0, 0]);
          fixation.setColor(
            colorRGBASnippetToRGBA(
              paramReader.read("markingColorRGBA", status.block)[0]
            )
          );

          fixation.setAutoDraw(true);
          target.setAutoDraw(true);
          if (thresholdParameter === "spacingDeg") {
            flanker1.setAutoDraw(true);
            flanker2.setAutoDraw(true);
          }
        },
        rsvpReading: () =>
          loggerText("TODO rsvpLetter eduInstructionRoutineBegin"),
        movie: () => {
          // IDENTIFY
          _instructionSetup(
            instructionsText.edu["spacingDeg"](rc.language.value),
            status.block
          );

          instructions2.setText(
            instructionsText.eduBelow["spacingDeg"](
              rc.language.value,
              responseType.current
            )
          );
          updateColor(instructions2, "instruction", status.block);
          instructions2.setWrapWidth(window.innerWidth * 0.8);
          instructions2.setPos([
            -window.innerWidth * 0.4,
            -window.innerHeight * 0.4,
          ]);
          instructions2.setAutoDraw(true);
          instructionsConfig.height = getParamValueForBlockOrCondition(
            "instructionFontSizePt",
            status.block
          );
          dynamicSetSize(
            [instructions, instructions2],
            instructionsConfig.height
          );

          var h = 50;

          fixation.setVertices(getFixationVertices(h));
          fixation.setLineWidth(5);
          fixation.setPos([0, 0]);
          fixation.setColor(
            colorRGBASnippetToRGBA(
              paramReader.read("markingColorRGBA", status.block)[0]
            )
          );
          fixation.setAutoDraw(true);
        },
        vernier: () => {
          _instructionSetup(
            instructionsText.edu[thresholdParameter](rc.language.value),
            status.block
          );
          instructions2.setText(
            instructionsText.eduBelow[thresholdParameter](
              rc.language.value,
              responseType.current
            )
          );
          updateColor(instructions2, "instruction", status.block);
          instructions2.setWrapWidth(window.innerWidth * 0.8);
          instructions2.setPos([
            -window.innerWidth * 0.4,
            -window.innerHeight * 0.4,
          ]);
          instructions2.setAutoDraw(true);
          instructionsConfig.height = getParamValueForBlockOrCondition(
            "instructionFontSizePt",
            status.block
          );
          dynamicSetSize(
            [instructions, instructions2],
            instructionsConfig.height
          );
          var h = 50;
          fixation.setVertices(getFixationVertices(h));
          fixation.setLineWidth(5);
          fixation.setPos([0, 0]);
          fixation.setColor(
            colorRGBASnippetToRGBA(
              paramReader.read("markingColorRGBA", status.block)[0]
            )
          );
          fixation.setAutoDraw(true);
          vernier.stims[0].setVertices([
            [190, 10],
            [190, 50],
          ]);
          vernier.stims[1].setVertices([
            [210, -10],
            [210, -50],
          ]);
          vernier.setColor(
            colorRGBASnippetToRGBA(
              paramReader.read("markingColorRGBA", status.block)[0]
            )
          );
          vernier.setLineWidth(2);
          vernier.setAutoDraw(true);
        },
      });

      psychoJS.eventManager.clearKeys();
      keypad.clearKeys();

      // if (keypadActive(responseType.current)) keypad.start();
      return Scheduler.Event.NEXT;
    };
  }

  function eduInstructionRoutineEachFrame() {
    return () => {
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
      instructions.setAutoDraw(false);
      // if (keypadActive(responseType.current)) keypad.stop(); Necessary??

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
            eduInstructionClock.getTime()
          );
          psychoJS.experiment.addData(
            "eduInstructionRoutineDurationFromPreviousEndSec",
            routineClock.getTime()
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
      preStimulus.running = true;
      // Check fullscreen and if not, get fullscreen
      if (!rc.isFullscreen.value && !debug) {
        rc.getFullscreen();
        await sleep(1000);
      }
      trialInstructionClock.reset();
      TrialHandler.fromSnapshot(snapshot);

      // Number of responses required before the current (psychojs) trial ends
      // For all current targetKinds this is 1.
      responseType.numberOfResponses =
        targetKind.current === "repeatedLetters" ? 2 : 1;

      logQuest("NEW TRIAL");

      const letterSetResponseType = () => {
        // ! responseType
        responseType.original = responseType.current;
        responseType.current = getResponseType(
          paramReader.read("responseClickedBool", status.block_condition),
          paramReader.read("responseTypedBool", status.block_condition),
          paramReader.read(
            "!responseTypedEasyEyesKeypadBool",
            status.block_condition
          ),
          paramReader.read("responseSpokenBool", status.block_condition),
          paramReader.read(
            "responseMustTrackContinuouslyBool",
            status.block_condition
          ),
          paramReader.read("responseSpokenBool", status.block_condition)
        );
        logger(
          "responseType trialInstructionRoutineBegin",
          responseType.current
        );
        if (canClick(responseType.current)) showCursor();
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
          // if (canClick(responseType.current)) showCursor();
          logger(
            "responseType.current trialInstructionRoutineBegin",
            responseType.current
          );
          t;
          for (let c of snapshot.handler.getConditions()) {
            if (c.block_condition === trials._currentStaircase._name) {
              status.condition = c;
              status.block_condition = status.condition["block_condition"];
            }
          }
          letterSetResponseType();
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
        status.block_condition
      );
      if (showProgressBarBool) showProgressBar();

      /* --------------------------------- PUBLIC --------------------------------- */

      // ! distance
      if (
        ifTrue(paramReader.read("calibrateTrackDistanceBool", status.block))
      ) {
        rc.resumeDistance();
        loggerText("[RC] resuming distance");

        // reset tracking target distance
        viewingDistanceDesiredCm.current = paramReader.read(
          "viewingDistanceDesiredCm",
          status.block_condition
        );

        viewingDistanceCm.current = rc.viewingDistanceCm
          ? rc.viewingDistanceCm.value
          : viewingDistanceCm.current;

        if (rc.setDistanceDesired)
          rc.setDistanceDesired(viewingDistanceDesiredCm.current);

        // TODO does RC provide callbacks, ie to do this every time the nudger activates?
        /**
         * NOTES
         * How to handle the variable viewing distance of the participant during trialInstructionRoutine?
         * We generate all our (ie viewing distance dependent) stimuli during trialInstructionRoutineBegin,
         * but we continue to track/nudge viewing distance during trialInstructionRoutineEachFrame.
         *
         * Early on we chose to do all our heavy/slow processing (ie generating stimuli) at that earlier
         * point (trialInstructionRoutineBegin) in order to minimize delay between fixation click and the
         * start of fixation.
         *
         * This means, however, that stimuli is being generated at the very start of the trial instructions,
         * instead of when fixation is clicked. Stimuli therefore does not reflect distance at actual
         * start of the trial.
         */

        // criterion for change in viewing distance to trigger rerun -- use the same criteria as the nudger
        if (!preStimulus.interval) {
          const rerunIntervalMs = 50;
          preStimulus.running = true;
          preStimulus.interval = setInterval(async () => {
            // Update viewing distance
            const nominalViewingDistance = viewingDistanceDesiredCm.current;
            viewingDistanceCm.current = rc.viewingDistanceCm
              ? rc.viewingDistanceCm.value
              : viewingDistanceCm.current;
            let allowedRatio = Math.max(
              paramReader.read(
                "viewingDistanceAllowedRatio",
                status.block_condition
              ),
              0.000000001
            );
            let bounds;
            if (allowedRatio > 1) {
              bounds = [
                nominalViewingDistance / allowedRatio,
                nominalViewingDistance * allowedRatio,
              ];
            } else {
              bounds = [
                nominalViewingDistance * allowedRatio,
                nominalViewingDistance / allowedRatio,
              ];
            }
            const significantChangeBool =
              viewingDistanceCm.current < bounds[0] ||
              viewingDistanceCm.current > bounds[1];
            // If not already in progress, rerun trialInstructionRoutineBegin
            if (!preStimulus.running && significantChangeBool) {
              preStimulus.running = true;
              const startTime = performance.now();
              await trialInstructionRoutineBegin(snapshot)();
              const stopTime = performance.now();
              const duration = stopTime - startTime;
              logger("!. Done rerunning.", duration);
              preStimulus.running = false;
            }
          }, rerunIntervalMs);
        }
        // Distance nudging
        if (
          paramReader.read("viewingDistanceNudgingBool", status.block_condition)
        ) {
          rc.resumeNudger();
        } else {
          rc.pauseNudger();
        }
      }

      const reader = paramReader;
      const BC = status.block_condition;

      // ! trigger fake error
      if (reader.read("errorBool", BC)) {
        reader.read("xyz", BC);
      }

      font.source = reader.read("fontSource", BC);
      font.name = reader.read("font", BC);
      font.padding = reader.read("fontPadding", BC);
      if (font.source === "file") font.name = cleanFontName(font.name);
      font.ltr = reader.read("fontLeftToRightBool", BC);

      font.colorRGBA = reader.read("fontColorRGBA", BC);
      font.letterSpacing = reader.read("fontTrackingForLetters", BC);

      screenBackground.colorRGBA = colorRGBASnippetToRGBA(
        reader.read("screenColorRGBA", BC)
      );

      showCounterBool = reader.read("showCounterBool", BC);
      showViewingDistanceBool = reader.read("showViewingDistanceBool", BC);

      fontCharacterSet.current = String(
        reader.read("fontCharacterSet", BC)
      ).split("");
      [target, flanker1, flanker2, flanker3, flanker4].forEach((s) =>
        s.setCharacterSet(fontCharacterSet.current.join(""))
      );

      if (!simulatedObservers.proceed(BC) && keypad.inUse(BC)) {
        const alphabet = reader.read("fontLeftToRightBool")
          ? [...fontCharacterSet.current]
          : [...fontCharacterSet.current].reverse();
        await keypad.update(alphabet, "sans-serif", BC);
        if (keypad.inUse(BC) && !keypad.acceptingResponses) {
          keypad.start();
        }
      }

      showConditionNameConfig.show = paramReader.read(
        "showConditionNameBool",
        BC
      );
      showConditionNameConfig.name = paramReader.read("conditionName", BC);
      showConditionNameConfig.showTargetSpecs = paramReader.read(
        "showTargetSpecsBool",
        BC
      );

      /* --------------------------------- /PUBLIC -------------------------------- */

      usingGaze.current = paramReader.read("calibrateTrackGazeBool", BC);

      // used in multiple kinds
      letterConfig.targetSafetyMarginSec = reader.read(
        "targetSafetyMarginSec",
        BC
      );

      letterConfig.targetDurationSec = reader.read("targetDurationSec", BC);
      letterConfig.delayBeforeStimOnsetSec = reader.read(
        "markingOffsetBeforeTargetOnsetSecs",
        BC
      );

      // if to add fake connections
      letterConfig.responseCharacterHasMedialShape = reader.read(
        "responseCharacterHasMedialShapeBool",
        BC
      );

      /* -------------------------------------------------------------------------- */
      // set background color
      psychoJS.window.color = new util.Color(screenBackground.colorRGBA);
      psychoJS.window._needUpdate = true; // ! dangerous
      /* -------------------------------------------------------------------------- */

      switchKind(targetKind.current, {
        vocoderPhrase: () => {
          //change instructions
          var w = window.innerWidth;
          _instructionBeforeStimulusSetup(
            instructionsText.trial.fixate["vocoderPhrase"](rc.language.value),
            w,
            // [-window.innerWidth / 2 + w * 1.1, 0]
            [-window.innerWidth * 0.4, window.innerHeight * 0.4],
            status.block_condition
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
            soundGainDBSPL.current
          );

          whiteNoiseLevel.current = paramReader.read(
            "targetSoundNoiseDBSPL",
            status.block_condition
          );
          targetSoundFolder.current = paramReader.read(
            "targetSoundFolder",
            status.block_condition
          );
          maskerVolumeDbSPL.current = paramReader.read(
            "maskerSoundDBSPL",
            status.block_condition
          );
          maskerSoundFolder.current = paramReader.read(
            "maskerSoundFolder",
            status.block_condition
          );
          if (showConditionNameConfig.showTargetSpecs) {
            updateTargetSpecsForSoundDetect(
              undefined,
              maskerVolumeDbSPL.current,
              soundGainDBSPL.current,
              whiteNoiseLevel.current,
              targetSoundFolder.current,
              maskerSoundFolder.current
            );
          }
          trialComponents = [];
          trialComponents.push(key_resp);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);
        },
        sound: () => {
          var w = window.innerWidth / 3;
          _instructionBeforeStimulusSetup(
            instructionsText.trial.fixate["sound"](rc.language.value),
            w,
            [-window.innerWidth * 0.4, window.innerHeight * 0.4]
            // [-window.innerWidth / 2 + w * 1.1, 0]
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
            soundGainDBSPL.current
          );

          whiteNoiseLevel.current = paramReader.read(
            "targetSoundNoiseDBSPL",
            status.block_condition
          );
          targetSoundFolder.current = paramReader.read(
            "targetSoundFolder",
            status.block_condition
          );

          if (targetTask.current == "detect") {
            maskerVolumeDbSPL.current = paramReader.read(
              "maskerSoundDBSPL",
              status.block_condition
            );
            maskerSoundFolder.current = paramReader.read(
              "maskerSoundFolder",
              status.block_condition
            );
            if (showConditionNameConfig.showTargetSpecs)
              updateTargetSpecsForSoundDetect(
                undefined,
                maskerVolumeDbSPL.current,
                soundGainDBSPL.current,
                whiteNoiseLevel.current,
                targetSoundFolder.current,
                maskerSoundFolder.current
              );
          } else if (targetTask.current == "identify") {
            if (showConditionNameConfig.showTargetSpecs)
              updateTargetSpecsForSoundIdentify(
                undefined,
                soundGainDBSPL.current,
                whiteNoiseLevel.current,
                targetSoundFolder.current
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
            readi18nPhrases("T_readingNextPage", rc.language.value)
          );
          updateColor(
            renderObj.tinyHint,
            "instruction",
            status.block_condition
          );
          renderObj.tinyHint.setAutoDraw(true);

          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecsForReading(
              reader,
              BC,
              thisExperimentInfo.experimentFilename
            );

          trialComponents = [];
          trialComponents.push(key_resp);
          trialComponents.push(readingParagraph);
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
          _instructionBeforeStimulusSetup(
            instructionsText.trial.fixate["spacingDeg"](
              rc.language.value,
              paramReader.read("responseMustTrackContinuouslyBool", BC)
                ? 3
                : responseType.current
            )
          );

          fixation.tStart = t;
          fixation.frameNStart = frameN;
          // fixation.setAutoDraw(true);

          clickedContinue.current = false;
          addHandlerForClickingFixation(reader);

          TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

          let proposedLevel = currentLoop._currentStaircase.getQuestValue();
          psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);

          // TODO
          // ! where are the other font information?

          // update component parameters for each repeat
          displayOptions.windowWidthCm = rc.screenWidthCm
            ? rc.screenWidthCm.value
            : 30;
          displayOptions.windowWidthPx = rc.displayWidthPx.value;
          displayOptions.pixPerCm =
            displayOptions.windowWidthPx / displayOptions.windowWidthCm;
          if (!rc.screenWidthCm)
            console.warn(
              "[Screen Width] Using arbitrary screen width. Enable RC."
            );

          readTrialLevelLetterParams(reader, BC);
          readAllowedTolerances(tolerances, reader, BC);

          validAns = String(reader.read("fontCharacterSet", BC))
            .toLowerCase()
            .split("");

          fontCharacterSet.where = reader.read("showCharacterSetWhere", BC);

          thresholdParameter = reader.read("thresholdParameter", BC);

          showBoundingBox = reader.read("showBoundingBoxBool", BC) || false;
          showCharacterSetBoundingBox = reader.read(
            "showCharacterSetBoundingBoxBool",
            BC
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

          const numberOfTargetsAndFlankers = fourFlankersNeeded ? 5 : 3;
          /* ------------------------------ Pick triplets ----------------------------- */
          if (fontCharacterSet.current.length < numberOfTargetsAndFlankers)
            throw `[EasyEyes experiment configuration error] You must have ${numberOfTargetsAndFlankers} characters in your character set for this block_condition, however, the researcher only put ${fontCharacterSet.current.length}.`;
          var [targetCharacter, ...flankerCharacters] =
            sampleWithoutReplacement(
              fontCharacterSet.current,
              numberOfTargetsAndFlankers
            );
          if (debug)
            console.log(
              `%c${flankerCharacters[0]} ${targetCharacter} ${flankerCharacters[1]}`,
              `color: red; font-size: 1.5rem; font-family: "${font.name}"`
            );
          correctAns.current = [targetCharacter.toLowerCase()];
          /* -------------------------------------------------------------------------- */

          // DISPLAY OPTIONS
          displayOptions.window = psychoJS.window;

          // QUESTION does `stimulusParameters.targetAndFlankersXYPx` differ
          //          from `letterConfig.targetEccentricityXYDeg`??
          const targetEccentricityXYPx = XYPixOfXYDeg(
            letterConfig.targetEccentricityXYDeg,
            displayOptions
          );
          // targetEccentricityXYPx = targetEccentricityXYPx.map(Math.round);
          psychoJS.experiment.addData(
            "targetLocationPx",
            targetEccentricityXYPx
          );
          target.setPos(targetEccentricityXYPx);
          target.setFont(font.name);
          target.setColor(colorRGBASnippetToRGBA(font.colorRGBA));

          psychoJS.experiment.addData(
            "spacingRelationToSize",
            letterConfig.spacingRelationToSize
          );
          var spacingIsOuterBool = reader.read("spacingIsOuterBool", BC);
          [level, stimulusParameters] = restrictLevel(
            proposedLevel,
            thresholdParameter,
            characterSetBoundingRects[BC],
            letterConfig.spacingDirection,
            letterConfig.spacingRelationToSize,
            letterConfig.spacingSymmetry,
            letterConfig.spacingOverSizeRatio,
            letterConfig.targetSizeIsHeightBool,
            spacingIsOuterBool
          );
          psychoJS.experiment.addData("level", level);
          psychoJS.experiment.addData("heightPx", stimulusParameters.heightPx);
          fontSize.current = stimulusParameters.heightPx;

          fixation.update(
            paramReader,
            BC,
            stimulusParameters.heightPx,
            stimulusParameters.targetAndFlankersXYPx[0]
          );
          fixation.setPos(fixationConfig.pos);

          target.setPos(stimulusParameters.targetAndFlankersXYPx[0]);
          psychoJS.experiment.addData(
            "targetLocationPx",
            stimulusParameters.targetAndFlankersXYPx[0]
          );

          let targetText;

          switch (thresholdParameter) {
            case "targetSizeDeg":
              targetText = targetCharacter;
              target.setText(targetText);
              // TODO I don't think this distinction in how to scale target, based on targetSizeIsHeightBool, is (should be?) necessary.
              //      In restrictSizeDeg, we calculate the heightPx corresponding to the desired height or width the scientist specifies.
              //      I believe we should always be able to scale height to heightPx. -gus
              if (letterConfig.targetSizeIsHeightBool)
                target.scaleToHeightPx(stimulusParameters.heightPx);
              else {
                target.scaleToWidthPx(
                  stimulusParameters.heightPx,
                  stimulusParameters.widthPx
                );
              }
              target.setPadding(font.padding);

              target.setPos(stimulusParameters.targetAndFlankersXYPx[0]);
              updateColor(target, "marking", status.block_condition);

              allFlankers.forEach((flanker) => flanker.setAutoDraw(false));
              break;
            case "spacingDeg":
              switch (letterConfig.spacingRelationToSize) {
                case "none":
                case "ratio":
                  targetText = targetCharacter;
                  target.setText(targetText);
                  target.setPadding(font.padding);

                  if (letterConfig.targetSizeIsHeightBool)
                    target.scaleToHeightPx(stimulusParameters.heightPx);
                  else {
                    target.scaleToWidthPx(
                      stimulusParameters.heightPx,
                      stimulusParameters.widthPx
                    );
                  }
                  target.setPos(stimulusParameters.targetAndFlankersXYPx[0]);
                  updateColor(target, "marking", status.block_condition);

                  var flankersHeightPx = target.getHeight();
                  // flanker1 === outer flanker
                  // flanker2 === inner flanker
                  flankersUsed.forEach((f, i) => {
                    f.setFont(font.name);
                    updateColor(f, "marking", status.block_condition);
                    f.setText(flankerCharacters[i]);
                    f.setHeight(flankersHeightPx);
                    f.setPadding(font.padding);
                    f.setPos(stimulusParameters.targetAndFlankersXYPx[i + 1]);
                  });

                  psychoJS.experiment.addData(
                    "flankerLocationsPx",
                    stimulusParameters.targetAndFlankersXYPx.slice(1)
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
                  psychoJS.experiment.addData(
                    "targetSpacingPx",
                    targetSpacingPx
                  );
                  break;
                case "typographic":
                  // ...include the flankers in the same string/stim as the target.
                  const tripletCharacters =
                    flankerCharacters[0] +
                    targetCharacter +
                    flankerCharacters[1];

                  targetText = tripletCharacters;
                  target.setText(targetText);

                  // currently letterSpacing messes up spacing for arabic fonts even when not set
                  if (font.letterSpacing) {
                    target.setLetterSpacingByProportion(font.letterSpacing);
                  }

                  // target.setHeight(stimulusParameters.heightPx);
                  target.scaleToWidthPx(
                    stimulusParameters.heightPx,
                    stimulusParameters.widthPx
                  );
                  console.log("stimulus [height, width]", [
                    stimulusParameters.heightPx,
                    stimulusParameters.widthPx,
                  ]);
                  target.setPadding(font.padding);
                  updateColor(target, "marking", status.block_condition);

                  flanker1.setAutoDraw(false);
                  flanker2.setAutoDraw(false);

                  break;
              }
              break;
          }
          logQuest("Target heightPx", stimulusParameters.heightPx, BC);
          [
            target,
            ...flankersUsed,
            fixation,
            showCharacterSet,
            trialCounter,
          ].forEach((c) => {
            logger("c", c);
            c._updateIfNeeded();
            c.refresh();
          });

          const tripletStims = {
            target: target,
            flanker1: flanker1,
            flanker2: flanker2,
          };
          const boundingBools = {
            stimulus: showBoundingBox,
            characterSet: showCharacterSetBoundingBox,
          };
          const tripletBoundingStims = {
            stimulus: boundingBoxPolies,
            characterSet: characterSetBoundingBoxPolies,
          };
          // TODO add bounding boxes for flankers 3&4
          sizeAndPositionBoundingBoxes(
            boundingBools,
            tripletBoundingStims,
            displayCharacterSetBoundingBoxPolies[BC],
            tripletStims,
            characterSetBoundingRects[BC],
            {
              heightPx:
                ["none", "ratio"].includes(
                  letterConfig.spacingRelationToSize
                ) && thresholdParameter === "spacingDeg"
                  ? flankersHeightPx
                  : stimulusParameters.heightPx,
              spacingRelationToSize: letterConfig.spacingRelationToSize,
              thresholdParameter: thresholdParameter,
              windowSize: psychoJS.window._size,
              font: font.name,
            }
          );
          showCharacterSet.setPos([0, 0]);
          showCharacterSet.setText("");
          updateColor(showCharacterSet, "marking", status.block_condition);
          // showCharacterSet.setText(getCharacterSetShowText(validAns))

          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecsForLetter(
              stimulusParameters,
              thisExperimentInfo.experimentFilename
            );

          trialComponents = [];
          trialComponents.push(key_resp);
          trialComponents.push(...fixation.stims);
          trialComponents.push(target);
          trialComponents.push(...flankersUsed);
          trialComponents.push(showCharacterSet);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);

          if (paramReader.read("_trackGazeExternallyBool")[0])
            recordStimulusPositionsForEyetracking(
              target,
              "trialInstructionRoutineBegin"
            );

          // /* --- BOUNDING BOX --- */
          addBoundingBoxesToComponents(
            showBoundingBox,
            showCharacterSetBoundingBox,
            boundingBoxPolies,
            characterSetBoundingBoxPolies,
            displayCharacterSetBoundingBoxPolies[BC],
            letterConfig.spacingRelationToSize,
            thresholdParameter,
            trialComponents
          );
          // /* --- /BOUNDING BOX --- */

          // TODO add call to update() from every targetKind
          simulatedObservers.update(BC, {
            stimulusIntensity: level,
            possibleResponses: fontCharacterSet.current,
            correctResponses: [targetCharacter],
          });

          psychoJS.experiment.addData(
            "trialInstructionBeginDurationSec",
            trialInstructionClock.getTime()
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
          /// Do on both trials for this condition
          // Read relevant trial-level parameters (and save to letterConfig? repeatedLettersConfig?)
          TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date
          readAllowedTolerances(tolerances, reader, BC);
          readTrialLevelLetterParams(reader, BC);
          readTrialLevelRepeatedLetterParams(reader, BC);

          validAns = String(reader.read("fontCharacterSet", BC))
            .toLowerCase()
            .split("");
          fontCharacterSet.where = reader.read("showCharacterSetWhere", BC);
          // Set up instructions
          // TODO figure out a way to gracefully incorporate "responseMustTrackCrosshairBool" into responseType. Temp adhoc fix (just in this case) is to use 3.
          _instructionBeforeStimulusSetup(
            instructionsText.trial.fixate["spacingDeg"](
              rc.language.value,
              paramReader.read("responseMustTrackContinuouslyBool", BC)
                ? 3
                : responseType.current
            )
          );

          clickedContinue.current = false;
          addHandlerForClickingFixation(reader);

          // Get level from quest
          let proposedLevel = currentLoop._currentStaircase.getQuestValue();
          psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);

          // Constrain to fit on screen
          [level, stimulusParameters] = restrictRepeatedLettersSpacing(
            proposedLevel,
            letterConfig.targetEccentricityXYDeg,
            characterSetBoundingRects[BC]
          );

          // Generate stims to fill screen
          repeatedLettersConfig.stims =
            generateRepeatedLettersStims(stimulusParameters);
          repeatedLettersConfig.level = level;
          repeatedLettersConfig.stimulusParameters = stimulusParameters;

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
            XYPixOfXYDeg(letterConfig.targetEccentricityXYDeg, displayOptions)
          );
          fixationConfig.pos = fixationConfig.nominalPos;
          fixation.setPos(fixationConfig.pos);
          fixation.tStart = t;
          fixation.frameNStart = frameN;

          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecsForRepeatedLetters(
              stimulusParameters,
              thisExperimentInfo.experimentFilename
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

          rsvpReadingResponse.responseType =
            (paramReader.read("responseTypedBool", BC) &&
              !paramReader.read("responseClickedBool", BC)) ||
            paramReader.read("responseSpokenBool", BC)
              ? "typed"
              : "clicked";

          // Get level from quest
          let proposedLevel = currentLoop._currentStaircase.getQuestValue();
          psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);

          const numberOfWords = paramReader.read(
            "rsvpReadingNumberOfWords",
            status.block_condition
          );
          level = constrainRSVPReadingSpeed(proposedLevel, numberOfWords);
          psychoJS.experiment.addData("level", level);

          const durationSec = Math.pow(10, level);
          psychoJS.experiment.addData(
            "rsvpReadingWordDurationSec",
            durationSec
          );

          const thisTrialWords =
            rsvpReadingWordsForThisBlock.current[status.block_condition][0];
          const actualNumberOfWords = thisTrialWords.targetWords.length;
          if (actualNumberOfWords !== numberOfWords)
            warning(
              "rsvpReading parsed the incorrect number of words. Using the target sequence: " +
                thisTrialWords.targetWords.join(",")
            );
          rsvpReadingTargetSets.numberOfSets = actualNumberOfWords;
          const targetSets = generateRSVPReadingTargetSets(
            thisTrialWords,
            durationSec,
            paramReader,
            status.block_condition
          );
          rsvpReadingTargetSets.upcoming = targetSets;
          correctAns.current = targetSets.map((t) => t.word.toLowerCase());
          rsvpReadingTargetSets.past = [];

          // TODO confirm that this same toLowerCase scheme is used when setting up phrase identification screen, ie that the html elems have id's which use the lowercase transformed word
          simulatedObservers.update(status.block_condition, {
            stimulusIntensity: level,
            correctResponses: correctAns.current,
            possibleResponses: targetSets
              .map((t) => [t.word, ...t.foilWords])
              .flat()
              .map((w) => w.toLowerCase()),
          });

          psychoJS.experiment.addData(
            "rsvpReadingTargetNumberOfSets",
            rsvpReadingTargetSets.numberOfSets
          );
          psychoJS.experiment.addData(
            "rsvpReadingTargetSets",
            targetSets.toString()
          );

          rsvpReadingResponse.categories = rsvpReadingTargetSets.upcoming.map(
            (s) => new Category(s.word, s.foilWords)
          );
          if (rsvpReadingResponse.responseType === "clicked") {
            rsvpReadingResponse.screen = setupPhraseIdentification(
              rsvpReadingResponse.categories,
              paramReader,
              BC,
              rsvpReadingTargetSets.upcoming[0]._heightPx
            );
            psychoJS.experiment.addData(
              "rsvpReadingResponseCategories",
              rsvpReadingResponse.categories.toString()
            );
            psychoJS.experiment.addData(
              "rsvpReadingResponseScreenHTML",
              rsvpReadingResponse.screen.innerHTML
            );
          }

          rsvpReadingTargetSets.current =
            rsvpReadingTargetSets.upcoming.shift();

          fontCharacterSet.where = reader.read("showCharacterSetWhere", BC);
          // Set up instructions
          // TODO figure out a way to gracefully incorporate "responseMustTrackCrosshairBool" into responseType. Temp adhoc fix (just in this case) is to use 3.
          _instructionBeforeStimulusSetup(
            instructionsText.trial.fixate["spacingDeg"](
              rc.language.value,
              paramReader.read("responseMustTrackContinuouslyBool", BC)
                ? 3
                : responseType.current
            )
          );

          // Update fixation
          fixation.update(
            paramReader,
            BC,
            100, // stimulusParameters.heightPx,
            XYPixOfXYDeg(letterConfig.targetEccentricityXYDeg, displayOptions)
          );
          fixationConfig.pos = fixationConfig.nominalPos;
          fixation.setPos(fixationConfig.pos);
          fixation.tStart = t;
          fixation.frameNStart = frameN;

          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecsForRsvpReading(
              paramReader,
              BC,
              thisExperimentInfo.experimentFilename,
              {
                targetWordDurationSec: durationSec,
                rsvpReadingNumberOfWords: numberOfWords,
                rsvpReadingResponseModality: rsvpReadingResponse.responseType,
              }
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

          fontCharacterSet.where = reader.read("showCharacterSetWhere", BC);

          thresholdParameter = reader.read("thresholdParameter", BC);

          validAns = String(reader.read("fontCharacterSet", BC))
            .toLowerCase()
            .split("");
          var [targetCharacter] = sampleWithoutReplacement(
            fontCharacterSet.current,
            1
          );
          if (debug)
            console.log(
              `%c${targetCharacter}`,
              `color: red; font-size: 1.5rem; font-family: "${font.name}"`
            );
          correctAns.current = [targetCharacter.toLowerCase()];

          // fixation.tStart = t;
          // fixation.frameNStart = frameN;
          // clickedContinue.current = false;
          // fixation.update(
          //   paramReader,
          //   BC,
          //   100, // stimulusParameters.heightPx,
          //   XYPixOfXYDeg(letterConfig.targetEccentricityXYDeg, displayOptions)
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
            rc.language.value
          );
          //generate movie
          loggerText("Generate movie here");
          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecsForMovie(paramReader, status.block_condition);
          //var F = new Function(paramReader.read("computeImageJS", BC))();
          let computeTotalSecStartTime = performance.now();
          var questSuggestedLevel = currentLoop._currentStaircase.quantile(
            currentLoop._currentStaircase._jsQuest.quantileOrder
          );
          evaluateJSCode(
            paramReader,
            status,
            displayOptions,
            targetCharacter,
            questSuggestedLevel,
            psychoJS
          ).then(([imageNit, movieHz, actualStimulusLevelTemp]) => {
            //observer should not be allowed to respond before actualStimulusLevel has retured.
            //i.e. before the movie has generated
            actualStimulusLevel = actualStimulusLevelTemp;
            let moviePQEncodedBool = paramReader.read("moviePQEncodedBool", BC);
            generate_video(
              imageNit,
              movieHz,
              psychoJS,
              moviePQEncodedBool
            ).then((data) => {
              videoblob = data;
              let computeTotalSecEndTime = performance.now();
              psychoJS.experiment.addData(
                "computeTotalSec",
                (computeTotalSecEndTime - computeTotalSecStartTime) / 1000
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
                XYPixOfXYDeg(
                  letterConfig.targetEccentricityXYDeg,
                  displayOptions
                )
              );
              fixationConfig.pos = fixationConfig.nominalPos;
              fixation.setPos(fixationConfig.pos);
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

          _instructionBeforeStimulusSetup(
            instructionsText.trial.fixate["spacingDeg"](
              rc.language.value,
              paramReader.read("responseMustTrackContinuouslyBool", BC)
                ? 3
                : responseType.current
            )
          );

          fixation.tStart = t;
          fixation.frameNStart = frameN;
          // fixation.setAutoDraw(true);

          clickedContinue.current = false;

          addHandlerForClickingFixation(paramReader);
          TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

          let proposedLevel = currentLoop._currentStaircase.getQuestValue();

          psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);

          // update component parameters for each repeat
          displayOptions.windowWidthCm = rc.screenWidthCm
            ? rc.screenWidthCm.value
            : 30;
          displayOptions.windowWidthPx = rc.displayWidthPx.value;
          displayOptions.pixPerCm =
            displayOptions.windowWidthPx / displayOptions.windowWidthCm;
          if (!rc.screenWidthCm)
            console.warn(
              "[Screen Width] Using arbitrary screen width. Enable RC."
            );

          readTrialLevelVenierParams(reader, BC);
          readAllowedTolerances(tolerances, reader, BC);
          const targetEccentricityXYPx = XYPixOfXYDeg(
            letterConfig.targetEccentricityXYDeg,
            displayOptions
          );
          fixation.update(paramReader, BC, 100, targetEccentricityXYPx);
          fixationConfig.pos = fixationConfig.nominalPos;
          fixation.setPos(fixationConfig.pos);

          validAns = String(reader.read("fontCharacterSet", BC))
            .toLowerCase()
            .split("");

          fontCharacterSet.where = reader.read("showCharacterSetWhere", BC);

          thresholdParameter = reader.read("thresholdParameter", BC);

          showBoundingBox = reader.read("showBoundingBoxBool", BC) || false;
          showCharacterSetBoundingBox = reader.read(
            "showCharacterSetBoundingBoxBool",
            BC
          );

          /* ------------------------------ Pick random letter ----------------------------- */
          if (fontCharacterSet.current.length !== 2)
            throw `[EasyEyes experiment configuration error] You must have 2 characters in your character set for this block_condition, however, the researcher only put ${fontCharacterSet.current.length}.`;
          var [targetCharacter] = sampleWithoutReplacement(
            fontCharacterSet.current,
            1
          );
          if (debug)
            console.log(
              `%c${targetCharacter}`,
              `color: red; font-size: 1.5rem; font-family: "${font.name}"`
            );
          correctAns.current = [targetCharacter.toLowerCase()];
          var directionBool = targetCharacter === fontCharacterSet.current[1];
          vernierConfig.targetOffsetDeg = restrictOffsetDeg(
            Math.pow(10, proposedLevel),
            directionBool
          );
          level = Math.log10(vernierConfig.targetOffsetDeg);
          console.log("proposedLevel", proposedLevel);
          console.log("proposedOffsetDeg", Math.pow(10, proposedLevel));
          console.log("targetOffsetDeg", vernierConfig.targetOffsetDeg);
          console.log("level", level);
          vernier.update(directionBool);

          /* -------------------------------------------------------------------------- */

          // DISPLAY OPTIONS
          displayOptions.window = psychoJS.window;
          psychoJS.experiment.addData(
            "targetLocationPx",
            targetEccentricityXYPx
          );

          psychoJS.experiment.addData(
            "spacingRelationToSize",
            letterConfig.spacingRelationToSize
          );

          showCharacterSet.setPos([0, 0]);
          showCharacterSet.setText("");
          updateColor(showCharacterSet, "marking", status.block_condition);
          // showCharacterSet.setText(getCharacterSetShowText(validAns))

          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecsForLetter(
              stimulusParameters,
              thisExperimentInfo.experimentFilename
            );

          trialCounter.setAutoDraw(showCounterBool);
          trialComponents = [];
          trialComponents.push(key_resp);
          trialComponents.push(...fixation.stims);
          trialComponents.push(showCharacterSet);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);

          simulatedObservers.update(BC, {
            stimulusIntensity: proposedLevel,
            possibleResponses: fontCharacterSet.current,
            correctResponses: [targetCharacter],
          });

          if (paramReader.read("_trackGazeExternallyBool")[0])
            recordStimulusPositionsForEyetracking(
              target,
              "trialInstructionRoutineBegin"
            );

          psychoJS.experiment.addData(
            "trialInstructionBeginDurationSec",
            trialInstructionClock.getTime()
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
        status.block_condition
      );
      if (customInstructions.length) {
        const customInstructionsLocation = getStimulusCustomInstructionPos(
          paramReader,
          status.block_condition
        );
        _instructionBeforeStimulusSetup(
          customInstructions,
          undefined,
          customInstructionsLocation
        );
      }

      /* --------------------------------- PUBLIC --------------------------------- */

      updateInstructionFont(paramReader, BC, [
        instructions,
        instructions2,
        trialCounter,
      ]);

      // Grid for both target kinds
      grid.current.update(reader.read("showGrid", BC), displayOptions);

      // Condition Name and Specs
      if (showConditionNameConfig.showTargetSpecs) {
        targetSpecs.setText(showConditionNameConfig.targetSpecs);
        targetSpecs.setPos([-window.innerWidth / 2, -window.innerHeight / 2]);
        updateColor(targetSpecs, "instruction", BC);
        targetSpecs.setAutoDraw(true);
      }
      showConditionName(conditionName, targetSpecs);

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
        targetKind.current
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
      keypad.clearKeys(status.block_condition);

      if (paramReader.read("showTakeABreakCreditBool", status.block_condition))
        showTrialBreakProgressBar(currentBlockCreditForTrialBreak);
      else hideTrialBreakProgressBar();

      /* --------------------------------- \PUBLIC -------------------------------- */

      preStimulus.running = false;

      return Scheduler.Event.NEXT;
    };
  }

  function trialInstructionRoutineEachFrame() {
    return async function () {
      if (toShowCursor()) {
        showCursor();
        return Scheduler.Event.NEXT;
      }

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
        trialCounter
      );

      const letterEachFrame = () => {
        // IDENTIFY
        t = instructionsClock.getTime();
        frameN = frameN + 1;

        if (paramReader.read("_trackGazeExternallyBool")[0])
          recordStimulusPositionsForEyetracking(
            target,
            "trialInstructionRoutineEachFrame"
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
        if (fixationConfig.markingFixationMotionRadiusDeg > 0)
          gyrateFixation(fixation, t, displayOptions);
        fixation.setAutoDraw(true);

        if (
          paramReader.read(
            "responseMustTrackContinuouslyBool",
            status.block_condition
          )
        )
          checkIfCursorIsTrackingFixation(t, paramReader);
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
          t = instructionsClock.getTime();
          frameN = frameN + 1;

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
                status.block_condition
              )
            )
              checkIfCursorIsTrackingFixation(t, paramReader);
            if (fixationConfig.markingFixationMotionRadiusDeg > 0)
              gyrateFixation(fixation, t, displayOptions);
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
        fixationConfig.show &&
        paramReader.read(
          "markingFixationStrokeThickening",
          status.block_condition
        ) !== 1
      )
        fixation.boldIfCursorNearFixation();

      if (!continueRoutine || clickedContinue.current) {
        continueRoutine = true;
        clickedContinue.current = false;
        return Scheduler.Event.NEXT;
      }

      continueRoutine = true;
      if (
        (canType(responseType.current) &&
          psychoJS.eventManager.getKeys({ keyList: ["space"] }).length > 0) ||
        keypad.endRoutine(status.block_condition) ||
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
      loggerText("trialInstructionRoutineEnd");

      keypad.clearKeys(status.block_condition);
      // TODO disable keypad control keys
      keypad.setSensitive();

      clearInterval(preStimulus.interval);
      preStimulus.interval = undefined;

      rc.pauseDistance();
      if (toShowCursor()) {
        showCursor();
        return Scheduler.Event.NEXT;
      }

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
          if (fixationConfig.markingFixationMotionRadiusDeg) {
            let stimsToOffset;
            if (
              letterConfig.spacingRelationToSize !== "typographic" &&
              letterConfig.thresholdParameter === "spacingDeg"
            ) {
              stimsToOffset = [target, flanker1, flanker2];
              const fourFlankersNeeded = [
                "horizontalAndVertical",
                "radialAndTangential",
              ].includes(letterConfig.spacingDirection);
              if (fourFlankersNeeded) stimsToOffset.push(flanker3, flanker4);
            } else {
              stimsToOffset = [target];
            }
            const boundingBoxStims = [
              ...Object.getOwnPropertyNames(boundingBoxPolies).map(
                (prop) => boundingBoxPolies[prop]
              ),
              ...Object.getOwnPropertyNames(characterSetBoundingBoxPolies).map(
                (prop) => characterSetBoundingBoxPolies[prop]
              ),
            ];
            stimsToOffset.push(...boundingBoxStims);
            offsetStimsToFixationPos(stimsToOffset);
            if (paramReader.read("_trackGazeExternallyBool")[0])
              recordStimulusPositionsForEyetracking(
                target,
                "trialInstructionRoutineEnd"
              );
          }
        },
        repeatedLetters: () => {
          _identify_trialInstructionRoutineEnd(instructions, fixation);
          if (fixationConfig.markingFixationMotionRadiusDeg)
            offsetStimsToFixationPos(repeatedLettersConfig.stims);
        },
        rsvpReading: () => {
          _identify_trialInstructionRoutineEnd(instructions, fixation);
          if (fixationConfig.markingFixationMotionRadiusDeg) {
            const stimsToOffset = [
              ...rsvpReadingTargetSets.current.stims,
              ...rsvpReadingTargetSets.upcoming.map((s) => s.stims).flat(),
            ];
            offsetStimsToFixationPos(stimsToOffset);
          }
          rsvpReadingWordsForThisBlock.current[status.block_condition].shift();
        },
        movie: () => {
          _identify_trialInstructionRoutineEnd(instructions, fixation);
        },
        vernier: () => {
          _identify_trialInstructionRoutineEnd(instructions, fixation);
          offsetVernierToFixationPos(vernier);
        },
      });

      psychoJS.experiment.addData(
        "trialInstructionRoutineDurationFromBeginSec",
        trialInstructionClock.getTime()
      );
      psychoJS.experiment.addData(
        "trialInstructionRoutineDurationFromPreviousEndSec",
        routineClock.getTime()
      );

      routineTimer.reset();
      routineClock.reset();
      return Scheduler.Event.NEXT;
    };
  }

  var letterRespondedEarly;
  function trialRoutineBegin(snapshot) {
    return async function () {
      trialClock.reset(); // clock
      // ie time from the user clicking/pressing space (actually, the end of the previous `trialRoutineEnd`), to the start of `trialRoutineBegin`
      psychoJS.experiment.addData(
        "clickToTrialPreparationDelaySec",
        routineClock.getTime()
      );
      // rc.pauseNudger();
      // await sleep(100);
      if (toShowCursor()) {
        showCursor();
        return Scheduler.Event.NEXT;
      }

      TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

      hideCursor();

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
              status.block_condition
            );
            // console.log("ProposedVolumeLevelFromQuest.current", ProposedVolumeLevelFromQuest.current);
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
            paramReader.read("targetSoundChannels", status.block_condition)
          );

          ProposedVolumeLevelFromQuest.adjusted = targetVolumeDbSPL;
          const chosenCategoryKeys = Object.keys(categoriesChosen);
          correctAns.current = [];
          chosenCategoryKeys.map((category) => {
            correctAns.current.push(
              category + "_" + categoriesChosen[category]
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
              maskerSoundFolder.current
            );
            targetSpecs.setText(showConditionNameConfig.targetSpecs);
            updateColor(targetSpecs, "instruction", status.block_condition);
            targetSpecs.setAutoDraw(true);
          }
          if (invertedImpulseResponse.current)
            playAudioBufferWithImpulseResponseCalibration(
              trialSound,
              invertedImpulseResponse.current
            );
          else playAudioBuffer(trialSound);
        },

        sound: async () => {
          var trialSoundBuffer;
          targetTask.current = paramReader.read(
            "targetTask",
            status.block_condition
          );

          if (targetTask.current == "identify") {
            const { targetList, trialSound, correctAnsIndex, targetVolume } =
              await getSpeechInNoiseTrialData(
                status.condition.block_condition,
                ProposedVolumeLevelFromQuest.current,
                whiteNoiseLevel.current,
                soundGainDBSPL.current,
                paramReader.read("targetSoundNoiseBool", status.block_condition)
              );

            ProposedVolumeLevelFromQuest.adjusted = targetVolume;
            trialSoundBuffer = trialSound;
            correctAns.current = [
              targetList[correctAnsIndex]["name"].toLowerCase(),
            ];
            speechInNoiseTargetList.current = targetList.map(
              (target) => target["name"]
            );

            if (showConditionNameConfig.showTargetSpecs) {
              updateTargetSpecsForSoundIdentify(
                ProposedVolumeLevelFromQuest.adjusted,
                soundGainDBSPL.current,
                whiteNoiseLevel.current,
                targetSoundFolder.current
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
                paramReader.read("targetSoundNoiseBool", status.block_condition)
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
                maskerSoundFolder.current
              );
              targetSpecs.setText(showConditionNameConfig.targetSpecs);
              updateColor(targetSpecs, "instruction", status.block_condition);
              targetSpecs.setAutoDraw(true);
            }
          }
          if (invertedImpulseResponse.current)
            playAudioBufferWithImpulseResponseCalibration(
              trialSoundBuffer,
              invertedImpulseResponse.current
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
          logger("Index", snapshot.thisIndex);

          responseType.current = resetResponseType(
            responseType.original,
            responseType.current,
            paramReader.read(
              "responseMustTrackContinuouslyBool",
              status.block_condition
            )
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
              status.block_condition
            )
          );
        },
        rsvpReading: () => {
          responseType.current = resetResponseType(
            responseType.original,
            responseType.current,
            paramReader.read(
              "responseMustTrackContinuouslyBool",
              status.block_condition
            )
          );
          reportWordCounts(paramReader, psychoJS.experiment);
        },
        movie: () => {
          responseType.current = resetResponseType(
            responseType.original,
            responseType.current,
            paramReader.read(
              "responseMustTrackContinuouslyBool",
              status.block_condition
            )
          );
        },
        vernier: () => {
          responseType.current = resetResponseType(
            responseType.original,
            responseType.current,
            paramReader.read(
              "responseMustTrackContinuouslyBool",
              status.block_condition
            )
          );
          console.log("responseType.current", responseType.current);
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

      // TODO disassemble and restructure repeatedLetter inputs to not be built on duplicates/cardinals
      showCharacterSetResponse.alreadyClickedCharacters = [];

      _instructionSetup(
        instructionsText.trial.respond["spacingDeg"](
          rc.language.value,
          responseType.current
        ),
        status.block_condition
      );

      //use google sheets phrases for instructions
      switchKind(targetKind.current, {
        rsvpReading: () => {
          const instr = instructionsText.trial.respond["rsvpReading"](
            rc.language.value,
            responseType.current
          );
          _instructionSetup(instr, status.block_condition);
        },
        vocoderPhrase: () => {
          // change instruction
          const instr = instructionsText.trial.respond["vocoderPhrase"](
            rc.language.value
          );
          _instructionSetup(instr, status.block_condition);
        },
        sound: () => {
          const instr =
            targetTask.current == "identify"
              ? instructionsText.trial.respond["speechInNoise"](
                  rc.language.value
                )
              : instructionsText.trial.respond["sound"](rc.language.value);
          _instructionSetup(instr, status.block_condition);
        },
        letter: () => {
          _instructionSetup(
            instructionsText.trial.respond[thresholdParameter](
              rc.language.value,
              responseType.current
            ),
            status.block_condition
          );
        },
        vernier: () => {
          _instructionSetup(
            instructionsText.trial.respond[thresholdParameter](
              rc.language.value,
              responseType.current
            ),
            status.block_condition
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
            readingThisBlockPages[readingPageIndex.current]
          );
          updateColor(readingParagraph, "marking", status.block_condition);

          // AUTO DRAW
          readingParagraph.setAutoDraw(true);

          readingPageIndex.current++;
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
            displayOptions,
            rc.windowHeightPx.value
          )
        );
        viewingDistanceCm.current = rc.viewingDistanceCm
          ? rc.viewingDistanceCm.value
          : viewingDistanceCm.current;
      }

      addApparatusInfoToData(displayOptions, rc, psychoJS, stimulusParameters);

      // ie time spent in `trialRoutineBegin`
      psychoJS.experiment.addData(
        "trialBeginDurationSec",
        trialClock.getTime()
      );
      trialClock.reset(); // clock

      return Scheduler.Event.NEXT;
    };
  }

  var frameRemains;
  var timeWhenRespondable;
  var rsvpEndRoutineAtT;
  var customResponseInstructionsDisplayed;
  function trialRoutineEachFrame(snapshot) {
    return async function () {
      ////
      if (stats.on) stats.current.begin();
      ////

      if (toShowCursor()) {
        showCursor();
        removeClickableCharacterSet(showCharacterSetResponse, showCharacterSet);
        vocoderPhraseRemoveClickableCategory(showCategoryResponse);
        return Scheduler.Event.NEXT;
      }

      /* -------------------------------------------------------------------------- */
      if (targetTask.current === "questionAndAnswer") {
        continueRoutine = true;
        return Scheduler.Event.NEXT;
      }
      /* -------------------------------------------------------------------------- */

      //------Loop for each frame of Routine 'trial'-------
      // get current time
      t = trialClock.getTime();
      frameN = frameN + 1; // number of completed frames (so 0 is the first frame)

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

        if (simulatedObservers.proceed(status.block_condition)) {
          await simulatedObservers.respond();
          timeWhenRespondable = 0;
        }

        frameRemains =
          delayBeforeStimOnsetSec +
          letterConfig.targetDurationSec -
          psychoJS.window.monitorFramePeriod * 0.75; // most of one frame period left
        // !
        // TODO this is misleading, ie in `letter` targetKind the stimulus onset isn't until the target is drawn
        //     if `delayBeforeStimOnsetSec !== 0` then this `clickToStimulusOnsetSec` would be `delayBeforeStimOnsetSec` early to the stimulus
        //     actually being drawn.
        psychoJS.experiment.addData(
          "clickToStimulusOnsetSec",
          (timing.clickToStimulusOnsetSec = routineClock.getTime())
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
              flankersUsed
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
        keypad.inUse(status.block_condition) &&
        !keypad.acceptingResponses
      ) {
        keypad.setNonSensitive();
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
            registerKeypressForRSVPReading(theseKeys);
          if (targetKind.current === "repeatedLetters") {
            theseKeys.forEach((k) => {
              registerResponseForRepeatedLetters(
                k.name,
                k.rt,
                correctAns.current,
                correctSynth,
                showCharacterSetResponse.alreadyClickedCharacters
              );
            });
          }
          showCharacterSetResponse.alreadyClickedCharacters.push(
            ...theseKeys.map((k) => k.name)
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
            (clickTime - showCharacterSetResponse.onsetTime[i]) / 1000
        );
        key_resp.keys.push(...responses);
        key_resp.rt.push(...rts);
        // TODO record `code` and `rt`
        const clickedKeypresses = showCharacterSetResponse.current.map(
          (letter) => new KeyPress(undefined, undefined, letter)
        );
        _key_resp_allKeys.current.push(...clickedKeypresses);

        if (targetKind.current === "repeatedLetters") {
          showCharacterSetResponse.current.forEach((r, i) => {
            registerResponseForRepeatedLetters(
              r,
              rts[i],
              correctAns.current,
              correctSynth,
              showCharacterSetResponse.alreadyClickedCharacters
            );
          });
        }

        // TODO update how already clicked characters are shown, ie for repeatedLetters
        showCharacterSetResponse.alreadyClickedCharacters.push(
          ...showCharacterSetResponse.current
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
        _key_resp_allKeys.current.map((k) => k.name)
      );
      if (uniqueResponses.size > 0) logger("uniqueResponses", uniqueResponses);
      if (
        uniqueResponses.size >= responseType.numberOfResponses &&
        targetKind.current !== "rsvpReading"
      ) {
        // The characters with which the participant responded
        const participantResponse = [...uniqueResponses].slice(
          uniqueResponses.size - responseType.numberOfResponses
        );
        let responseCorrect;
        if (targetKind.current === "vocoderPhrase") {
          responseCorrect = arraysEqual(
            vocoderPhraseCorrectResponse.current.sort(),
            correctAns.current.sort()
          );
        } else if (targetKind.current === "repeatedLetters") {
          responseCorrect = participantResponse.some((r) =>
            correctAns.current.includes(r)
          );
        } else {
          responseCorrect = arraysEqual(
            participantResponse.sort(),
            correctAns.current.sort()
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
              correctSynth.play();
              status.trialCorrect_thisBlock++;
              status.trialCompleted_thisBlock++;
            },
            movie: () => {
              correctSynth.play();
              status.trialCorrect_thisBlock++;
              status.trialCompleted_thisBlock++;
            },
            vernier: () => {
              correctSynth.play();
              status.trialCorrect_thisBlock++;
              status.trialCompleted_thisBlock++;
            },
          });
          // CORRECT
          key_resp.corr = 1;
          if (targetKind.current === "repeatedLetters")
            key_resp.corr = participantResponse.map((r) =>
              correctAns.current.includes(r) ? 1 : 0
            );
        } else {
          if (
            paramReader.read(
              "responseNegativeFeedbackBool",
              status.block_condition
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
          targetSpecs
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
        fixationConfig.show &&
        targetKind.current !== "sound" &&
        targetKind.current !== "vocoderPhrase"
      ) {
        // keep track of start time/frame for later
        fixation.tStart = t; // (not accounting for frame time here)
        fixation.frameNStart = frameN; // exact frame index

        // fixation.setAutoDraw(true);
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
            instructions
          );
          break;
        case "rsvpReading":
          continueRoutine = _rsvpReading_trialRoutineEachFrame(
            t,
            frameN,
            instructions
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
                  performance.now()
                );
                video.play();
                video_flag = 0;
              }, delayBeforeMovieForLuminanceMeasuringMs);
            } else {
              video.play();
              video_flag = 0;
            }
            console.log(
              "delayBeforeMovieForLuminanceMeasuringMs",
              delayBeforeMovieForLuminanceMeasuringMs
            );
            measureLuminance.movieStart =
              performance.now() + delayBeforeMovieForLuminanceMeasuringMs;
            console.log(
              "addMeasureLuminanceIntervals called 1",
              measureLuminance.movieStart
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
                thisExperimentInfo.expName,
                status.block_condition,
                paramReader.read("conditionName", status.block_condition),
                status.trial
              );
              logger("measureLuminance.records", measureLuminance.records);
              psychoJS.experiment.saveCSV(
                measureLuminance.records,
                luminanceFilename
              );
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
              0.02
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
            "trialRoutineEachFrame"
          );
        if (
          target.status === PsychoJS.Status.STARTED &&
          !letterTiming.targetStartSec
        ) {
          letterTiming.targetStartSec = t;
          readingTiming.onsets.push(clock.global.getTime());
          target.frameNDrawnConfirmed = frameN;
          letterTiming.targetDrawnConfirmedTimestamp = performance.now();
          letterTiming.crosshairClickedTimestamp =
            clickedContinue.timestamps[clickedContinue.timestamps.length - 1];
        }
        if (
          t >= delayBeforeStimOnsetSec &&
          target.status === PsychoJS.Status.NOT_STARTED
        ) {
          // keep track of start time/frame for later
          target.tStart = t; // (not accounting for frame time here)
          target.frameNStart = frameN; // exact frame index
          target.setAutoDraw(true);
        }
        if (
          target.status === PsychoJS.Status.FINISHED &&
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
              0.02
            )}]`;
            targetSpecs.setText(showConditionNameConfig.targetSpecs);
            updateColor(targetSpecs, "instruction", status.block_condition);
            showConditionName(conditionName, targetSpecs);
          }
        }
        if (target.status === PsychoJS.Status.STARTED && t >= frameRemains) {
          target.setAutoDraw(false);
          target.frameNEnd = frameN;
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
          if (f.status === PsychoJS.Status.STARTED && t >= frameRemains) {
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
        thresholdParameter
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
              showCharacterSetResponse
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
              responseType.current
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
              responseType.current
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
                paramReader.read("movieSec", status.block_condition) ||
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
              responseType.current
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
              fontCharacterSet.current,
              font.name,
              0, // letter spacing not applicable
              fontCharacterSet.where,
              showCharacterSetResponse,
              null,
              "",
              targetKind.current,
              status.block_condition,
              responseType.current
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
          status.block_condition
        );
        if (customInstructions.length) {
          instructions.setText(customInstructions);
          updateColor(instructions, "instruction", status.block_condition);
          instructions.tSTart = t;
          instructions.frameNStart = frameN;
          instructions.setAutoDraw(true);
        }
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
      ////
      speechInNoiseShowClickable.current = true;
      vocoderPhraseShowClickable.current = true;
      grid.current.hide();

      if (fixationConfig.nominalPos)
        fixationConfig.pos = fixationConfig.nominalPos;

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
            answer
          );
          // psychoJS.experiment.addData(
          //   `${questionAndAnswerShortcut || question}CorrectAnswer`,
          //   correctAnswer
          // );
          psychoJS.experiment.addData(
            "questionAndAnswerNickname",
            questionAndAnswerShortcut
          );
          psychoJS.experiment.addData("questionAndAnswerQuestion", question);
          psychoJS.experiment.addData(
            "questionAndAnswerCorrectAnswer",
            correctAnswer
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
              const giveToQuest = true;
              psychoJS.experiment.addData("trialGivenToQuest", giveToQuest);
              currentLoop.addResponse(
                key_resp.corr,
                ProposedVolumeLevelFromQuest.adjusted / 20
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
              const giveToQuest = true;
              psychoJS.experiment.addData("trialGivenToQuest", giveToQuest);
              currentLoop.addResponse(
                key_resp.corr,
                ProposedVolumeLevelFromQuest.adjusted / 20
              );
            }
            // console.log("currentLoop", currentLoop);
            // psychoJS.experiment.addData("targetWasPresent", targetIsPresentBool.current);
            // name of masker
          },
          reading: () => {
            addReadingStatsToOutput(trials.thisRepN, psychoJS);
          },
          letter: () => {
            _letter_trialRoutineEnd(
              target,
              currentLoop,
              simulatedObservers.proceed(),
              key_resp.corr,
              level,
              letterRespondedEarly
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
                thisResponse
              );
              psychoJS.experiment.addData(
                `repeatedLetters-${i}-RESPONSE${thisResponse}-TimeOfResponse`,
                thisResponseTime
              );
            }
            _letter_trialRoutineEnd(
              repeatedLettersConfig.stims[0],
              currentLoop,
              simulatedObservers.proceed(status.block_condition),
              repeatedLettersResponse.correct,
              level,
              letterRespondedEarly
            );
            repeatedLettersResponse.current = [];
            repeatedLettersResponse.correct = [];
            repeatedLettersResponse.rt = [];
          },
          rsvpReading: () => {
            addRsvpReadingTrialResponsesToData();
            removeRevealableTargetWordsToAidSpokenScoring();

            addTrialStaircaseSummariesToData(currentLoop, psychoJS);
            // TODO only give to QUEST if acceptable
            const giveToQuest = true;
            psychoJS.experiment.addData("trialGivenToQuest", giveToQuest);
            currentLoop.addResponse(
              phraseIdentificationResponse.correct,
              level,
              giveToQuest
            );
            clearPhraseIdentificationRegisters();
          },
          movie: () => {
            addTrialStaircaseSummariesToData(currentLoop, psychoJS);
            if (
              currentLoop instanceof MultiStairHandler &&
              currentLoop.nRemaining !== 0
            ) {
              // TODO only give to QUEST if acceptable
              const giveToQuest = true;
              psychoJS.experiment.addData("trialGivenToQuest", giveToQuest);
              // switch (thresholdParameter) {
              //   case "targetContrast":
              // const targetContrast = paramReader.read(
              //   thresholdParameter,
              //   status.block_condition
              // );
              currentLoop.addResponse(
                key_resp.corr,
                // intensity
                //Math.log10(targetContrast)
                actualStimulusLevel
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
              const giveToQuest = true;
              psychoJS.experiment.addData("trialGivenToQuest", giveToQuest);
              currentLoop.addResponse(key_resp.corr, level);
            }
          },
        });

        psychoJS.experiment.addData(
          "key_resp.keys",
          _key_resp_allKeys.current.map((k) => k.name).toString()
        );
        psychoJS.experiment.addData("key_resp.corr", key_resp.corr);
        psychoJS.experiment.addData("correctAns", correctAns.current);
        // console.log("key_resp.keys", key_resp.keys);
        // console.log("key_resp.corr", key_resp.corr);
        // console.log("correctAns.current", correctAns.current);
        // if (typeof key_resp.keys !== "undefined") {
        if (key_resp.keys.length) {
          // we had a response
          psychoJS.experiment.addData("key_resp.rt", key_resp.rt.toString());
          // ie time from the end to `trialRoutineBegin` to the start of `trialRoutineEnd`
          psychoJS.experiment.addData(
            "trialRoutineDurationFromBeginSec",
            trialClock.getTime()
          );
          // ie time from the end of the previous trial to the end of this trial
          psychoJS.experiment.addData(
            "trialRoutineDurationFromPreviousEndSec",
            routineClock.getTime()
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
        status.block_condition
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
          true
        );
        const takeABreakMinimumDurationSec = paramReader.read(
          "takeABreakMinimumDurationSec",
          status.block_condition
        );

        return new Promise((resolve) => {
          // After break time out...
          setTimeout(() => {
            // Show proceed hint and/or button
            showPopupProceed(
              thisExperimentInfo.name,
              instructionsText.trialBreak(
                rc.language.value,
                responseType.current
              ),
              canClick(responseType.current)
            );
            addPopupLogic(
              thisExperimentInfo.name,
              responseType.current,
              () => {
                resolve(Scheduler.Event.NEXT);
              },
              keypad
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
      if (snapshotType === "trial") {
        // ! update trial counter
        // dangerous
        status.trial = currentLoopSnapshot.thisN;

        console.log(
          `%c====== Trial ${status.trial} ======`,
          "background: purple; color: white; padding: 1rem"
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
          parametersToExcludeFromData
        );
      } else if (snapshotType !== "trial" && snapshotType !== "block") {
        console.log(
          "%c====== Unknown Snapshot ======",
          "background: red; color: white; padding: 1rem"
        );
      }
      // }

      logger(`this ${snapshotType}`, currentLoopSnapshot.getCurrentTrial());
      psychoJS.importAttributes(currentLoopSnapshot.getCurrentTrial());
      return Scheduler.Event.NEXT;
    };
  }
};
