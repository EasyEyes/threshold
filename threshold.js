/*****************
 * Crowding Test *
 *****************/

import {
  debug,
  fillNumberLength,
  getTripletCharacters,
  ifTrue,
  norm,
  sleep,
} from "./components/utils.js";

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
import "./components/css/forms.css";
import "./components/css/popup.css";
import "./components/css/takeABreak.css";
import "./components/css/psychojsExtra.css";

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
  simulatedObserver,
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
  whiteNoiseLevel,
  targetSoundFolder,
  maskerSoundFolder,
  usingGaze,
  targetTask,
  questionsThisBlock,
  thisExperimentInfo,
} from "./components/global.js";

import {
  clock,
  getTinyHint,
  psychoJS,
  renderObj,
  initMouse,
  psychojsMouse,
} from "./components/globalPsychoJS.js";

////
/* ------------------------------- Components ------------------------------- */

import { ParamReader } from "./parameters/paramReader.js";
import { phrases } from "./components/i18n.js";

import {
  logger,
  loggerText,
  hideCursor,
  showCursor,
  toShowCursor,
  XYPixOfXYDeg,
  addConditionToData,
  addTrialStaircaseSummariesToData,
  addBlockStaircaseSummariesToData,
  addApparatusInfoToData,
  degreesToPixels,
} from "./components/utils.js";
import { buildWindowErrorHandling } from "./components/errorHandling.js";

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
  getResponseType,
  resetResponseType,
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
  instructionsText,
  movePastFixation,
  removeBeepButton,
  removeProceedButton,
  _takeFixationClick,
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
  updateTargetSpecsForReading,
  updateTargetSpecsForSound,
} from "./components/showTrialInformation.js";
import { getTrialInfoStr } from "./components/trialCounter.js";
////

import {
  getCharacterSetBoundingBox,
  restrictLevel,
} from "./components/bounding.js";

import { Grid } from "./components/grid.js";
import {
  checkIfSimulated,
  SimulatedObserver,
  simulateObserverResponse,
} from "./components/simulatedObserver.js";

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

// READING
import { prepareReadingQuestions } from "./components/reading.ts";
import {
  getSizeForSpacing,
  getSizeForXHeight,
  getThisBlockPages,
  loadReadingCorpus,
  addReadingStatsToOutput,
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
  calculateError,
  addResponseIfTolerableError,
  measureGazeError,
} from "./components/errorMeasurement.js";

/* ---------------------------------- */
// * TRIAL ROUTINES

import { _identify_trialInstructionRoutineEnd } from "./components/trialRoutines.js";

/* ---------------------------------- */

import { switchKind, switchTask } from "./components/blockTargetKind.js";
import { handleEscapeKey } from "./components/skipTrialOrBlock.js";
import { replacePlaceholders } from "./components/multiLang.js";
import { getPavloviaProjectName, quitPsychoJS } from "./components/lifetime.js";
import {
  getTrialData,
  initSoundFiles,
  playAudioBuffer,
} from "./components/toneInMelody.js";
import {
  checkSystemCompatibility,
  displayCompatibilityMessage,
  hideCompatibilityMessage,
} from "./components/compatibilityCheck.js";
import {
  Fixation,
  getFixationPos,
  getFixationVerticies,
  gyrateFixation,
} from "./components/fixation.js";
import { checkCrossSessionId } from "./components/crossSession.js";
import {
  isProlificExperiment,
  saveProlificInfo,
} from "./components/externalServices.js";

/* -------------------------------------------------------------------------- */

window.jsQUEST = jsQUEST;

const fontsRequired = {};
var simulated;
/* -------------------------------------------------------------------------- */

const paramReaderInitialized = async (reader) => {
  buildWindowErrorHandling(reader);
  // await sleep(250);

  // if (rc.concurrency.value <= 0) {
  //   await rc.performance();
  // }

  console.log(
    "browser, deviceType, OS",
    reader.read("_compatibleBrowser"),
    reader.read("_compatibleDeviceType"),
    reader.read("_compatibleOperatingSystem")
  );

  const compMsg = checkSystemCompatibility(
    reader.read("_compatibleBrowser")[0].split(","),
    rc.browser.value,
    reader.read("_compatibleBrowserVersionMinimum")[0],
    rc.browserVersion.value,
    reader.read("_compatibleDeviceType")[0].split(","),
    rc.deviceType.value,
    reader.read("_compatibleOperatingSystem")[0].split(","),
    rc.systemFamily.value,
    reader.read("_compatibleProcessorCoresMinimum")[0],
    rc.concurrency.value,
    rc.computeRandomMHz ? rc.computeRandomMHz.value : 0,
    rc.language.value
  );

  const proceed = await displayCompatibilityMessage(
    compMsg["msg"],
    rc.language.value
  );
  hideCompatibilityMessage();

  if (proceed && !compMsg["proceed"]) {
    showExperimentEnding();
    return;
  }

  // ! check cross session user id
  thisExperimentInfo.requestedCrossSessionId = false;
  if (reader.read("_participantIDGetBool")[0]) {
    const gotParticipantId = (participant, session, storedId) => {
      if (participant) {
        thisExperimentInfo.requestedCrossSessionId = true;
        thisExperimentInfo.participant = participant;
        if (storedId !== undefined && participant === storedId) {
          thisExperimentInfo.setSession(
            isNaN(Number(session)) ? session : Number(session) + 1
          );
        } else {
          thisExperimentInfo.setSession(1);
        }

        thisExperimentInfo.EasyEyesID = participant;
      }
    };
    const result = await checkCrossSessionId(gotParticipantId);
    if (!result) {
      showExperimentEnding();
      return;
    }
  } else {
    thisExperimentInfo.participant = rc.id.value;
    thisExperimentInfo.setSession(1);

    thisExperimentInfo.EasyEyesID = rc.id.value;
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
    if (!rc.isFullscreen.value && !debug) {
      rc.getFullscreen();
      await sleep(1000);
    }
  }

  // prepareForReading(reader);

  // ! Load fonts
  loadFonts(reader, fontsRequired);

  // ! Load recruitment service config
  loadRecruitmentServiceConfig();

  // ! Simulate observer
  simulated = checkIfSimulated(reader);

  // ! Load reading corpus and preprocess
  await loadReadingCorpus(reader);
  logger("READ readingCorpusArchive", readingCorpusArchive);
  logger("READ readingWordListArchive", readingWordListArchive);
  logger("READ readingWordFrequencyArchive", readingWordFrequencyArchive);

  ////
  const startExperiment = () => {
    // ! clean RC dom
    if (document.querySelector("#rc-panel-holder"))
      document.querySelector("#rc-panel-holder").remove();

    // ! Start actual experiment
    experiment(reader.blockCount);
  };
  ////

  // stats.js
  if (ifTrue(reader.read("showFPSBool", "__ALL_BLOCKS__"))) {
    stats.current = new Stats();
    stats.current.showPanel(0);
    document.body.appendChild(stats.current.dom);
    stats.current.dom.style.display = "none";
    stats.on = false;
  }

  // ! Remote Calibrator
  if (useRC && useCalibration(reader)) {
    rc.panel(
      formCalibrationList(reader),
      "#rc-panel-holder",
      {
        debug: debug,
      },
      async () => {
        rc.removePanel();

        rc.pauseGaze();
        // rc.pauseDistance();

        if (!(await calibrateAudio(reader))) {
          quitPsychoJS("", "", reader);
        } else {
          startExperiment();
        }
      }
    );
  } else {
    if (!(await calibrateAudio(reader))) {
      quitPsychoJS("", "", reader);
    } else {
      startExperiment();
    }
  }
};

const paramReader = new ParamReader("conditions", paramReaderInitialized);

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
  const blockNumbers = paramReader._experiment.map((block) => block.block);
  for (const i of blockNumbers) {
    _resources.push({
      name: `conditions/block_${i}.csv`,
      path: `conditions/block_${i}.csv`,
    });
  }

  thisExperimentInfo.experimentFileName = paramReader.read(
    "_experimentFilename",
    "__ALL_BLOCKS__"
  )[0];
  thisExperimentInfo.experimentName = paramReader.read(
    "_experimentName",
    "__ALL_BLOCKS__"
  )[0];

  logger("fontsRequired", fontsRequired);
  for (let i in fontsRequired) {
    logger(i, fontsRequired[i]);
    _resources.push({ name: i, path: fontsRequired[i] });
  }

  /* ---------------------------------- Sound --------------------------------- */
  const correctSynth = getCorrectSynth(psychoJS);
  // const wrongSynth = getWrongSynth(psychoJS);
  const purrSynth = getPurrSynth(psychoJS);
  const readingSound = getReadingSound();

  // open window:
  psychoJS.openWindow({
    fullscr: !debug,
    color: new util.Color("#eaeaea"), // background color
    units: "height",
    waitBlanking: true,
  });

  initMouse();
  logger("threshold.js/experiment psychojsMouse", psychojsMouse.getPos());

  // schedule the experiment:
  psychoJS.schedule(
    psychoJS.gui.DlgFromDict({
      dictionary: {
        participant: thisExperimentInfo.participant,
        session: thisExperimentInfo.session,
      },
      title: phrases.T_thresholdTitle[rc.language.value],
      participantText: phrases.T_participant[rc.language.value],
      sessionText: phrases.T_session[rc.language.value],
      cancelText: phrases.T_cancel[rc.language.value],
      okText: phrases.T_ok[rc.language.value],
    })
  );

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

  thisExperimentInfo.name = thisExperimentInfo.expName = getPavloviaProjectName(
    thisExperimentInfo.experimentName
  );
  window.console.log("thisExperimentInfo.name", thisExperimentInfo.name);

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
          // psychoJS.gui.closeDialog();
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
    thisExperimentInfo.date = util.MonotonicClock.getDateStr(); // add a simple timestamp
    thisExperimentInfo.expName = thisExperimentInfo.name;
    thisExperimentInfo.psychopyVersion = `${psychoJSPackage.version}-threshold-prod`;

    thisExperimentInfo.hardwareConcurrency = rc.concurrency.value;

    thisExperimentInfo["deviceType"] = rc.deviceType.value;
    thisExperimentInfo["deviceSystem"] = rc.system.value;
    thisExperimentInfo["deviceSystemFamily"] = rc.systemFamily.value;
    thisExperimentInfo["deviceBrowser"] = rc.browser.value;
    thisExperimentInfo["deviceBrowserVersion"] = rc.browserVersion.value;
    thisExperimentInfo["deviceLanguage"] = rc.userLanguage.value;

    thisExperimentInfo["psychojsWindowDimensions"] = String(
      psychoJS._window._size
    );

    // store frame rate of monitor if we can measure it successfully
    thisExperimentInfo["monitorFrameRate"] =
      psychoJS.window.getActualFrameRate();
    psychoJS.experiment.addData(
      "frameRateReportedByPsychoJS",
      thisExperimentInfo["monitorFrameRate"]
    );
    if (rc.stressFps) {
      psychoJS.experiment.addData("frameRateUnderStress", rc.stressFps.value);
      psychoJS.experiment.addData(
        "computeRandomMHz",
        rc.computeRandomMHz.value
      );
    }

    // add info from the URL:
    util.addInfoFromUrl(thisExperimentInfo);
    // record Prolific related info to thisExperimentInfo
    if (isProlificExperiment()) saveProlificInfo(thisExperimentInfo);

    window.console.log("ENV NAME", psychoJS.getEnvironment());
    window.console.log("PSYCHOJS _CONFIG", psychoJS._config);
    window.console.log("PAVLOVIA PROJECT NAME", getPavloviaProjectName());

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
  var fixation; ////
  var flanker1;
  var target;
  var flanker2;
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

    /* -------------------------------------------------------------------------- */

    //initialize sound experiment files
    //edit - use list of sound targetKinds instead of sound
    if (paramReader.read("targetKind", "__ALL_BLOCKS__").includes("sound")) {
      //read masker andtarget sound folders
      var MaskerFolders = paramReader.read(
        "maskerSoundFolder",
        "__ALL_BLOCKS__"
      );

      var targetFolders = paramReader.read(
        "targetSoundFolder",
        "__ALL_BLOCKS__"
      );

      //only unique folders
      MaskerFolders = [...new Set(MaskerFolders)];
      targetFolders = [...new Set(targetFolders)];

      await initSoundFiles(MaskerFolders, targetFolders);
    }

    fixation = new Fixation();
    // fixationConfig.stim = fixation;

    flanker1 = new visual.TextStim({
      win: psychoJS.window,
      name: "flanker1",
      text: "",
      font: "Arial",
      units: "pix",
      pos: [0, 0],
      height: 1.0,
      wrapWidth: undefined,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -7.0,
    });

    target = new visual.TextStim({
      win: psychoJS.window,
      name: "target",
      text: "",
      font: "Arial",
      units: "pix",
      pos: [0, 0],
      height: 1.0,
      wrapWidth: undefined,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -8.0,
    });

    flanker2 = new visual.TextStim({
      win: psychoJS.window,
      name: "flanker2",
      text: "",
      font: "Arial",
      units: "pix",
      pos: [0, 0],
      height: 1.0,
      wrapWidth: undefined,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -9.0,
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

    characterSetBoundingRects = {};
    for (const cond of paramReader.block_conditions) {
      const characterSet = String(
        paramReader.read("fontCharacterSet", cond)
      ).split("");
      let font = paramReader.read("font", cond);
      if (paramReader.read("fontSource", cond) === "file")
        font = cleanFontName(font);
      const typographicCrowding =
        paramReader.read("spacingRelationToSize", cond) === "typographic" &&
        paramReader.read("thresholdParameter", cond) === "spacing";
      const letterRepeats = typographicCrowding ? 3 : 1;
      logger("letterRepeats", letterRepeats);
      characterSetBoundingRects[cond] = getCharacterSetBoundingBox(
        characterSet,
        font,
        psychoJS.window,
        letterRepeats,
        100
      );
    }

    getTinyHint();

    /* --- BOUNDING BOX --- */
    // Generate the bounding boxes to be displayed superimposing...
    [
      boundingBoxPolies, // ... the triplet.
      characterSetBoundingBoxPolies, // ... the triplet.
      displayCharacterSetBoundingBoxPolies, // .. the full character set displayed during response time.
    ] = generateBoundingBoxPolies(paramReader, psychoJS);
    logger("boundingBoxPolies", boundingBoxPolies);
    /* --- BOUNDING BOX --- */

    /* --------------------------------- READING -------------------------------- */
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
      depth: -7.0,
      isInstruction: false,
      alignHoriz: "left",
      alignVert: "center",
      autoDraw: false,
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

    grid.current = new Grid("none", displayOptions, psychoJS);

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
      /* --- SIMULATED --- */
      if (simulated) return Scheduler.Event.NEXT;
      /* --- /SIMULATED --- */
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

  function _instructionSetup(text) {
    t = 0;
    instructionsClock.reset(); // clock
    frameN = -1;
    continueRoutine = true;
    instructions.setWrapWidth(window.innerWidth * 0.8);
    instructions.setPos([-window.innerWidth * 0.4, window.innerHeight * 0.4]);
    instructions.setText(text);
    instructions.setAutoDraw(true);
    dynamicSetSize([instructions], instructionsConfig.height);
  }

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
    //const wrapWidth = window.innerWidth / 4;
    instructions.setWrapWidth(wrapWidth);
    instructions.setPos(pos);
    instructions.setText(text);
    instructions.setAutoDraw(true);
  }

  async function _instructionRoutineEachFrame() {
    /* --- SIMULATED --- */
    if (simulated && simulated[status.block]) return Scheduler.Event.NEXT;
    /* --- /SIMULATED --- */

    trialCounter.setPos([window.innerWidth / 2, -window.innerHeight / 2]);
    renderObj.tinyHint.setPos([0, -window.innerHeight / 2]);

    t = instructionsClock.getTime();
    frameN = frameN + 1;

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

    switchKind(targetKind.current, {
      letter: () => {
        if (
          canType(responseType.current) &&
          psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0
        ) {
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
      TrialHandler.fromSnapshot(snapshot); // update internal variables (.thisN etc) of the loop

      // set up handler to look after randomisation of conditions etc
      blocks = new TrialHandler({
        psychoJS: psychoJS,
        nReps: 1,
        method: TrialHandler.Method.SEQUENTIAL,
        extraInfo: thisExperimentInfo,
        originPath: undefined,
        trialList: "conditions/blockCount.csv",
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
        const snapshot = blocks.getSnapshot();
        blocksLoopScheduler.add(importConditions(snapshot, "block"));
        blocksLoopScheduler.add(filterRoutineBegin(snapshot));
        blocksLoopScheduler.add(filterRoutineEachFrame());
        blocksLoopScheduler.add(filterRoutineEnd());

        // only when not answering questions
        switchTask(_thisBlock.targetTask, {
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
      trialsConditions = trialsConditions.map((condition) =>
        Object.assign(condition, { label: condition["block_condition"] })
      );

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
            sound: () => {
              trialsConditions = populateQuestDefaults(
                trialsConditions,
                paramReader,
                "sound"
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
      (targetKind.current === "letter" || targetKind.current == "sound")
    ) {
      // Proportion correct
      showPopup(
        thisExperimentInfo.name,
        replacePlaceholders(
          phrases.T_proportionCorrectPopup[rc.language.value],
          `${Math.round(
            (status.trialCorrect_thisBlock / status.trialCompleted_thisBlock +
              Number.EPSILON) *
              100
          )}`
        ),
        instructionsText.trialBreak(rc.language.value, responseType.current),
        false
      );
      await addPopupLogic(thisExperimentInfo.name, responseType.current, null);

      // Reset trial counter
      status.trialCorrect_thisBlock = 0;
      status.trialCompleted_thisBlock = 0;
    }

    if (currentLoop instanceof MultiStairHandler)
      addBlockStaircaseSummariesToData(currentLoop, psychoJS);

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
        instructions.setText(
          phrases.T_readingTaskQuestionPrompt[rc.language.value]
        );
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
        status.block,
        totalBlocks.current,
        viewingDistanceCm.current,
        targetKind.current === "reading" ? "letter" : targetKind.current
      );
      trialCounter.setText(trialCounterStr);
      trialCounter.setPos([window.innerWidth / 2, -window.innerHeight / 2]);
      trialCounter.setAutoDraw(showCounterBool);

      // tinyHint
      renderObj.tinyHint.setText("");
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
          "bottom",
          showCharacterSetResponse,
          (clickedWord) => {
            readingClickableAnswersUpdate.current = true;
            const correct = clickedWord === thisQuestion.correctAnswer;
            psychoJS.experiment.addData(
              "readWordIdentifiedBool",
              correct ? "TRUE" : "FALSE"
            );
            psychoJS.experiment.nextEntry();
            if (correct) correctSynth.play();
          },
          "readingAnswer"
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
            // TODO don't call nextEntry() on the last question
            psychoJS.experiment.nextEntry();
            if (correct) correctSynth.play();
          },
          "readingAnswer"
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
      removeClickableCharacterSet(showCharacterSetResponse);

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
      totalBlocks.current = snapshot.nTotal;

      // PRESETS
      targetKind.current = paramReader.read("targetKind", status.block)[0];
      // TODO support more
      targetTask.current = paramReader.read("targetTask", status.block)[0];
      fixationConfig.nominalPos = getFixationPos(status.block, paramReader);
      fixationConfig.pos = fixationConfig.nominalPos;
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
            sound: () => {
              const possibleTrials = paramReader.read(
                "conditionTrials",
                status.block
              );
              totalTrialsThisBlock.current = possibleTrials.reduce(
                (a, b) => a + b,
                0
              );
            },
            reading: () => {
              totalTrialsThisBlock.current = paramReader.read(
                "readingPages",
                status.block
              )[0];
            },
            letter: () => {
              const possibleTrials = paramReader.read(
                "conditionTrials",
                status.block
              );
              logger("possibleTrials", possibleTrials);
              totalTrialsThisBlock.current = possibleTrials.reduce(
                (a, b) => a + b,
                0
              );
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
      /* --- SIMULATED --- */
      if (simulated && simulated[status.block]) return Scheduler.Event.NEXT;
      /* --- /SIMULATED --- */

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
    return async function () {
      loggerText(
        `initInstructionRoutineBegin targetKind ${targetKind.current}`
      );

      TrialHandler.fromSnapshot(snapshot);
      initInstructionClock.reset(); // clock
      frameN = -1;
      continueRoutine = true;
      clickedContinue.current = false;

      const L = rc.language.value;

      responseType.current = getResponseType(
        paramReader.read("responseClickedBool", status.block)[0],
        paramReader.read("responseTypedBool", status.block)[0],
        paramReader.read("responseTypedEasyEyesKeypadBool", status.block)[0],
        paramReader.read("responseSpokenBool", status.block)[0]
      );

      switchKind(targetKind.current, {
        sound: () => {
          _instructionSetup(
            (snapshot.block === 0 ? instructionsText.initial(L) : "") +
              instructionsText.soundBegin(L)
          );
        },
        letter: () => {
          _instructionSetup(
            (snapshot.block === 0 ? instructionsText.initial(L) : "") +
              instructionsText.popularFeatures(
                L,
                paramReader.read("takeABreakTrialCredit", status.block)[0]
              ) +
              instructionsText.initialByThresholdParameter["spacing"](
                L,
                responseType.current,
                totalTrialsThisBlock.current
              ) +
              instructionsText.initialEnd(L, responseType.current)
          );
        },
        reading: () => {
          _instructionSetup(
            (snapshot.block === 0 ? instructionsText.initial(L) : "") +
              instructionsText.readingEdu(
                L,
                paramReader.read("readingPages", status.block)[0]
              )
          );

          renderObj.tinyHint.setText(
            phrases.T_readingNextPage[rc.language.value]
          );
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
          font.name = paramReader.read("font", status.block)[0];
          font.source = paramReader.read("fontSource", status.block)[0];
          if (font.source === "file") font.name = cleanFontName(font.name);
          readingParagraph.setFont(font.name);

          fontCharacterSet.current = String(
            paramReader.read("fontCharacterSet", status.block)[0]
          ).split("");

          // HEIGHT
          switch (paramReader.read("readingSetSizeBy", status.block)[0]) {
            case "nominal":
              readingConfig.height =
                paramReader.read("readingNominalSizeDeg", status.block)[0] *
                degreesToPixels(1, {
                  pixPerCm: displayOptions.pixPerCm,
                });
              break;
            case "xHeight":
              readingConfig.height = getSizeForXHeight(
                readingParagraph,
                paramReader.read("readingXHeightDeg", status.block)[0]
              );
              break;
            case "spacing":
              readingConfig.height = getSizeForSpacing(
                readingParagraph,
                paramReader.read("readingSpacingDeg", status.block)[0],
                fontCharacterSet.current.join("")
              );
              break;
            default:
              break;
          }
          readingParagraph.setHeight(readingConfig.height);

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
        },
      });

      clickedContinue.current = false;
      if (canClick(responseType.current) && targetKind.current !== "reading")
        addProceedButton(rc.language.value);

      addBeepButton(L, correctSynth);

      psychoJS.eventManager.clearKeys();

      // reset takeABreak state
      currentBlockCreditForTrialBreak = 0;
      hideTrialBreakProgressBar();

      let trialCounterStr = getTrialInfoStr(
        L,
        paramReader.read("showCounterBool", status.block)[0],
        paramReader.read("showViewingDistanceBool", status.block)[0],
        undefined,
        undefined,
        status.block,
        totalBlocks.current,
        viewingDistanceCm.current,
        targetKind.current
      );
      trialCounter.setText(trialCounterStr);
      trialCounter.setAutoDraw(true);

      return Scheduler.Event.NEXT;
    };
  }

  function initInstructionRoutineEachFrame() {
    return _instructionRoutineEachFrame;
  }

  function initInstructionRoutineEnd() {
    return async function () {
      instructions.setAutoDraw(false);

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

      switchKind(targetKind.current, {
        letter: () => {
          // IDENTIFY
          _instructionSetup(instructionsText.edu(rc.language.value));

          instructions2.setText(
            instructionsText.eduBelow(rc.language.value, responseType.current)
          );
          instructions2.setWrapWidth(window.innerWidth * 0.8);
          instructions2.setPos([
            -window.innerWidth * 0.4,
            -window.innerHeight * 0.4,
          ]);
          instructions2.setAutoDraw(true);
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

          flanker1.setFont(instructionFont.current);
          flanker1.setPos([D - g, 0]);
          flanker1.setText("H");
          flanker1.setHeight(h);

          flanker2.setFont(instructionFont.current);
          flanker2.setPos([D + g, 0]);
          flanker2.setText("C");
          flanker2.setHeight(h);

          fixation.setVertices(getFixationVerticies(h));
          fixation.setLineWidth(5);
          fixation.setPos([0, 0]);

          fixation.setAutoDraw(true);
          target.setAutoDraw(true);
          flanker1.setAutoDraw(true);
          flanker2.setAutoDraw(true);
        },
      });

      psychoJS.eventManager.clearKeys();
      return Scheduler.Event.NEXT;
    };
  }

  function eduInstructionRoutineEachFrame() {
    return _instructionRoutineEachFrame;
  }

  function eduInstructionRoutineEnd() {
    return async function () {
      instructions.setAutoDraw(false);

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
  //     _instructionSetup(instructionsText.block(snapshot.block + 1));

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

  var wirelessKeyboardNeededBool;

  var _key_resp_allKeys;
  var trialComponents;

  // Credit
  var currentBlockCreditForTrialBreak = 0;

  function trialInstructionRoutineBegin(snapshot) {
    return async function () {
      // Check fullscreen and if not, get fullscreen
      if (!rc.isFullscreen.value && !debug) {
        rc.getFullscreen();
        await sleep(1000);
      }

      trialInstructionClock.reset();
      TrialHandler.fromSnapshot(snapshot);

      const parametersToExcludeFromData = [];

      switchKind(targetKind.current, {
        sound: () => {
          for (let c of snapshot.handler.getConditions()) {
            if (c.block_condition === trials._currentStaircase._name) {
              status.condition = c;
              status.block_condition = status.condition["block_condition"];
              addConditionToData(
                paramReader,
                status.block_condition,
                psychoJS.experiment,
                parametersToExcludeFromData
              );
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
              addConditionToData(
                paramReader,
                status.block_condition,
                psychoJS.experiment,
                parametersToExcludeFromData
              );
            }
          }

          // ! responseType
          responseType.original = responseType.current;
          responseType.current = getResponseType(
            paramReader.read("responseClickedBool", status.block_condition),
            paramReader.read("responseTypedBool", status.block_condition),
            paramReader.read(
              "responseTypedEasyEyesKeypadBool",
              status.block_condition
            ),
            paramReader.read("responseSpokenBool", status.block_condition),
            paramReader.read(
              "responseMustClickCrosshairBool",
              status.block_condition
            )
          );
          logger("responseType", responseType);
          if (canClick(responseType.current)) showCursor();
        },
      });

      /* --------------------------------- PUBLIC --------------------------------- */

      // ! distance
      if (
        ifTrue(paramReader.read("calibrateTrackDistanceBool", status.block))
      ) {
        rc.resumeDistance();
        loggerText("[RC] resuming distance");
      }

      const reader = paramReader;
      const BC = status.block_condition;

      font.source = reader.read("fontSource", BC);
      font.name = reader.read("font", BC);
      if (font.source === "file") font.name = cleanFontName(font.name);

      font.ltr = reader.read("fontLeftToRightBool", BC);

      showCounterBool = reader.read("showCounterBool", BC);
      showViewingDistanceBool = reader.read("showViewingDistanceBool", BC);

      fontCharacterSet.current = String(
        reader.read("fontCharacterSet", BC)
      ).split("");

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

      switchKind(targetKind.current, {
        sound: () => {
          //change to proper instruction setup from the google sheet
          var w = window.innerWidth / 3;
          _instructionBeforeStimulusSetup(
            instructionsText.trial.fixate["sound"](rc.language.value),
            w,
            [-window.innerWidth / 2 + w * 1.1, 0]
          );
          let proposedLevel = currentLoop._currentStaircase.getQuestValue();
          psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);
          ProposedVolumeLevelFromQuest.current = proposedLevel * 20;
          maskerVolumeDbSPL.current = paramReader.read(
            "maskerDBSPL",
            status.block_condition
          );

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
          maskerSoundFolder.current = paramReader.read(
            "maskerSoundFolder",
            status.block_condition
          );
          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecsForSound(
              ProposedVolumeLevelFromQuest.current,
              maskerVolumeDbSPL.current,
              soundGainDBSPL.current,
              whiteNoiseLevel.current,
              targetSoundFolder.current,
              maskerSoundFolder.current
            );
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
            phrases.T_readingNextPage[rc.language.value]
          );
          renderObj.tinyHint.setAutoDraw(true);

          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecsForReading(
              reader,
              BC,
              thisExperimentInfo.experimentFileName
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

          _instructionBeforeStimulusSetup(
            instructionsText.trial.fixate["spacing"](
              rc.language.value,
              responseType.current
            )
          );

          fixation.tStart = t;
          fixation.frameNStart = frameN;
          // fixation.setAutoDraw(true);

          clickedContinue.current = false;
          document.addEventListener("click", _takeFixationClick);
          document.addEventListener("touchend", _takeFixationClick);

          TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

          let proposedLevel = currentLoop._currentStaircase.getQuestValue();
          psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);

          psychoJS.experiment.addData("block_condition", BC);
          psychoJS.experiment.addData(
            "flankerOrientation",
            reader.read("spacingDirection", BC)
          );
          psychoJS.experiment.addData("font", reader.read("font", BC));
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

          // TODO check that we are actually trying to test for "spacing", not "size"

          letterConfig.targetDurationSec = reader.read("targetDurationSec", BC);
          letterConfig.delayBeforeStimOnsetSec = reader.read(
            "markingOffsetBeforeTargetOnsetSecs",
            BC
          );
          letterConfig.spacingDirection = reader.read("spacingDirection", BC);
          letterConfig.spacingSymmetry = reader.read("spacingSymmetry", BC);

          validAns = String(reader.read("fontCharacterSet", BC))
            .toLowerCase()
            .split("");

          fontCharacterSet.where = reader.read("showCharacterSetWhere", BC);

          letterConfig.targetSizeIsHeightBool = reader.read(
            "targetSizeIsHeightBool",
            BC
          );
          thresholdParameter = reader.read("thresholdParameter", BC);
          letterConfig.targetMinimumPix = reader.read("targetMinimumPix", BC);
          letterConfig.spacingOverSizeRatio = reader.read(
            "spacingOverSizeRatio",
            BC
          );
          letterConfig.spacingRelationToSize = reader.read(
            "spacingRelationToSize",
            BC
          );
          showBoundingBox = reader.read("showBoundingBoxBool", BC) || false;
          showCharacterSetBoundingBox = reader.read(
            "showCharacterSetBoundingBoxBool",
            BC
          );

          letterConfig.targetMinimumPix = reader.read("targetMinimumPix", BC);

          const targetEccentricityXDeg = reader.read(
            "targetEccentricityXDeg",
            BC
          );
          psychoJS.experiment.addData(
            "targetEccentricityXDeg",
            targetEccentricityXDeg
          );
          const targetEccentricityYDeg = reader.read(
            "targetEccentricityYDeg",
            BC
          );
          psychoJS.experiment.addData(
            "targetEccentricityYDeg",
            targetEccentricityYDeg
          );
          letterConfig.targetEccentricityXYDeg = [
            targetEccentricityXDeg,
            targetEccentricityYDeg,
          ];

          letterConfig.targetSafetyMarginSec = reader.read(
            "targetSafetyMarginSec",
            BC
          );

          tolerances.allowed.thresholdAllowedDurationRatio = reader.read(
            "thresholdAllowedDurationRatio",
            BC
          );
          tolerances.allowed.thresholdAllowedGazeRErrorDeg = reader.read(
            "thresholdAllowedGazeRErrorDeg",
            BC
          );
          tolerances.allowed.thresholdAllowedGazeXErrorDeg = reader.read(
            "thresholdAllowedGazeXErrorDeg",
            BC
          );
          tolerances.allowed.thresholdAllowedGazeYErrorDeg = reader.read(
            "thresholdAllowedGazeYErrorDeg",
            BC
          );
          tolerances.allowed.thresholdAllowedLatencySec = reader.read(
            "thresholdAllowedLatencySec",
            BC
          );

          wirelessKeyboardNeededBool = reader.read(
            "wirelessKeyboardNeededBool",
            BC
          );

          /* ------------------------------ Pick triplets ----------------------------- */
          if (fontCharacterSet.current.length < 3)
            throw `[EasyEyes experiment configuration error] You must have 3 characters in your character set for this block_condition, however, the researcher only put ${fontCharacterSet.current.length}.`;
          var [firstFlankerCharacter, targetCharacter, secondFlankerCharacter] =
            getTripletCharacters(fontCharacterSet.current);
          if (debug)
            console.log(
              `%c${firstFlankerCharacter} ${targetCharacter} ${secondFlankerCharacter}`,
              `color: red; font-size: 1.5rem; font-family: "${font.name}"`
            );
          correctAns.current = targetCharacter.toLowerCase();
          /* -------------------------------------------------------------------------- */

          // DISPLAY OPTIONS
          displayOptions.window = psychoJS.window;

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

          psychoJS.experiment.addData(
            "spacingRelationToSize",
            letterConfig.spacingRelationToSize
          );
          var spacingForRatioIsOuterBool = reader.read(
            "spacingForRatioIsOuterBool",
            BC
          );
          [level, stimulusParameters] = restrictLevel(
            proposedLevel,
            thresholdParameter,
            characterSetBoundingRects[BC],
            letterConfig.spacingDirection,
            letterConfig.spacingRelationToSize,
            letterConfig.spacingSymmetry,
            letterConfig.spacingOverSizeRatio,
            letterConfig.targetSizeIsHeightBool,
            spacingForRatioIsOuterBool
          );
          logger("flanker positions", stimulusParameters.targetAndFlankersXYPx);
          psychoJS.experiment.addData("level", level);
          psychoJS.experiment.addData("heightPx", stimulusParameters.heightPx);

          fixation.update(
            paramReader,
            BC,
            stimulusParameters.heightPx,
            stimulusParameters.targetAndFlankersXYPx[0]
          );
          fixationConfig.pos = fixationConfig.nominalPos;
          fixation.setPos(fixationConfig.pos);

          target.setPos(stimulusParameters.targetAndFlankersXYPx[0]);
          psychoJS.experiment.addData(
            "targetLocationPx",
            stimulusParameters.targetAndFlankersXYPx[0]
          );
          switch (thresholdParameter) {
            case "size":
              if (letterConfig.targetSizeIsHeightBool)
                target.scaleToHeightPx(stimulusParameters.heightPx);
              else {
                target.scaleToWidthPx(
                  stimulusParameters.heightPx,
                  stimulusParameters.widthPx
                );
              }
              target.setText(targetCharacter);
              flanker1.setAutoDraw(false);
              flanker2.setAutoDraw(false);
              break;
            case "spacing":
              switch (letterConfig.spacingRelationToSize) {
                case "none":
                  break;
                case "ratio":
                  target.setText(targetCharacter);
                  if (letterConfig.targetSizeIsHeightBool)
                    target.scaleToHeightPx(stimulusParameters.heightPx);
                  else {
                    target.scaleToWidthPx(
                      stimulusParameters.heightPx,
                      stimulusParameters.widthPx
                    );
                  }

                  var flankersHeightPx = target.getHeight();
                  flanker1.setText(firstFlankerCharacter);
                  flanker2.setText(secondFlankerCharacter);
                  flanker1.setFont(font.name);
                  flanker2.setFont(font.name);
                  flanker1.setHeight(flankersHeightPx);
                  flanker2.setHeight(flankersHeightPx);
                  flanker1.setPos(stimulusParameters.targetAndFlankersXYPx[1]);
                  flanker2.setPos(stimulusParameters.targetAndFlankersXYPx[2]);
                  psychoJS.experiment.addData("flankerLocationsPx", [
                    stimulusParameters.targetAndFlankersXYPx[1],
                    stimulusParameters.targetAndFlankersXYPx[2],
                  ]);
                  break;
                case "typographic":
                  // ...include the flankers in the same string/stim as the target.
                  // const flankersAndTargetString =
                  //   firstFlankerCharacter +
                  //   targetCharacter +
                  //   secondFlankerCharacter;
                  target.setText(
                    firstFlankerCharacter +
                      targetCharacter +
                      secondFlankerCharacter
                  );
                  // target.setHeight(stimulusParameters.heightPx);
                  target.scaleToWidthPx(
                    stimulusParameters.heightPx,
                    stimulusParameters.widthPx
                  );
                  flanker1.setAutoDraw(false);
                  flanker2.setAutoDraw(false);
                  break;
              }
              break;
          }
          [
            target,
            flanker1,
            flanker2,
            fixation,
            showCharacterSet,
            trialCounter,
          ].forEach((c) => c._updateIfNeeded());

          const tripletStims = {
            target: target,
            flanker1: flanker1,
            flanker2: flanker2,
          };
          sizeAndPositionBoundingBoxes(
            {
              stimulus: showBoundingBox,
              characterSet: showCharacterSetBoundingBox,
            },
            {
              stimulus: boundingBoxPolies,
              characterSet: characterSetBoundingBoxPolies,
            },
            displayCharacterSetBoundingBoxPolies[BC],
            tripletStims,
            characterSetBoundingRects[BC],
            {
              heightPx:
                letterConfig.spacingRelationToSize === "ratio"
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
          // showCharacterSet.setText(getCharacterSetShowText(validAns))

          if (showConditionNameConfig.showTargetSpecs)
            updateTargetSpecsForLetter(
              stimulusParameters,
              thisExperimentInfo.experimentFileName
            );

          trialComponents = [];
          trialComponents.push(key_resp);
          trialComponents.push(...fixation.stims);
          trialComponents.push(target);
          trialComponents.push(flanker1);
          trialComponents.push(flanker2);

          trialComponents.push(showCharacterSet);
          trialComponents.push(trialCounter);
          trialComponents.push(renderObj.tinyHint);

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
          // /* --- SIMULATED --- */
          if (simulated && simulated[status.block]) {
            if (!simulatedObserver[BC]) {
              simulatedObserver[BC] = new SimulatedObserver(
                simulated[status.block][BC],
                level,
                fontCharacterSet.current,
                targetCharacter,
                paramReader.read("thresholdProportionCorrect", BC),
                paramReader.read("simulationBeta", BC),
                paramReader.read("simulationDelta", BC),
                paramReader.read("simulationThreshold", BC)
              );
            } else {
              simulatedObserver[BC].updateTrial(
                level,
                fontCharacterSet.current,
                targetCharacter
              );
            }
          }
          // /* --- /SIMULATED --- */

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
      });

      /* --------------------------------- PUBLIC --------------------------------- */

      // Grid for both target kinds
      grid.current.update(reader.read("showGrid", BC), displayOptions);

      // Condition Name and Specs
      if (showConditionNameConfig.showTargetSpecs) {
        targetSpecs.setText(showConditionNameConfig.targetSpecs);
        targetSpecs.setPos([-window.innerWidth / 2, -window.innerHeight / 2]);
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
        status.block,
        totalBlocks.current,
        viewingDistanceCm.current,
        targetKind.current
      );
      trialCounter.setText(trialCounterStr);
      trialCounter.setFont(instructionFont.current);
      trialCounter.setHeight(trialCounterConfig.height);
      trialCounter.setPos([window.innerWidth / 2, -window.innerHeight / 2]);
      trialCounter.setAutoDraw(showCounterBool);

      for (const thisComponent of trialComponents)
        if ("status" in thisComponent)
          thisComponent.status = PsychoJS.Status.NOT_STARTED;

      psychoJS.eventManager.clearKeys();

      if (paramReader.read("showTakeABreakCreditBool", status.block_condition))
        showTrialBreakProgressBar(currentBlockCreditForTrialBreak);
      else hideTrialBreakProgressBar();

      /* --------------------------------- \PUBLIC -------------------------------- */

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

      switchKind(targetKind.current, {
        sound: () => {
          if (
            psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0
          ) {
            loggerText("trialInstructionRoutineEachFrame enter HIT");
            continueRoutine = false;
          }
        },
        reading: () => {
          continueRoutine = false;
        },
        letter: () => {
          // IDENTIFY
          /* --- SIMULATED --- */
          if (simulated && simulated[status.block]) return Scheduler.Event.NEXT;
          /* --- /SIMULATED --- */
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
          if (fixationConfig.markingFixationMotionRadiusDeg > 0)
            gyrateFixation(fixation, t, displayOptions);
          fixation.setAutoDraw(true);
        },
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

      if (!continueRoutine || clickedContinue.current) {
        continueRoutine = true;
        clickedContinue.current = false;
        return Scheduler.Event.NEXT;
      }

      continueRoutine = true;
      if (
        canType(responseType.current) &&
        psychoJS.eventManager.getKeys({ keyList: ["space"] }).length > 0
      ) {
        loggerText("trialInstructionRoutineEachFrame SPACE HIT");
        continueRoutine = false;
        movePastFixation();
      }

      return Scheduler.Event.FLIP_REPEAT;
    };
  }

  function trialInstructionRoutineEnd() {
    return async function () {
      loggerText("trialInstructionRoutineEnd");

      rc.pauseDistance();

      if (toShowCursor()) {
        showCursor();
        return Scheduler.Event.NEXT;
      }

      switchKind(targetKind.current, {
        sound: () => {
          return Scheduler.Event.NEXT;
        },
        reading: () => {
          // READING
          return Scheduler.Event.NEXT;
        },
        letter: () => {
          _identify_trialInstructionRoutineEnd(
            instructions,
            _takeFixationClick,
            fixation
          );
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
        sound: async () => {
          //target is present half the time
          targetIsPresentBool.current = Math.random() < 0.5;
          correctAns.current = targetIsPresentBool.current ? "y" : "n";

          var trialSoundBuffer = await getTrialData(
            maskerSoundFolder.current,
            targetSoundFolder.current,
            targetIsPresentBool.current,
            ProposedVolumeLevelFromQuest.current,
            maskerVolumeDbSPL.current,
            whiteNoiseLevel.current,
            soundGainDBSPL.current
          );
          playAudioBuffer(trialSoundBuffer);
        },
        reading: () => {
          readingSound.play();
        },
        letter: () => {
          if (snapshot.getCurrentTrial().trialsVal)
            logger("Level", snapshot.getCurrentTrial().trialsVal);
          logger("Index", snapshot.thisIndex);

          responseType.current = resetResponseType(
            responseType.original,
            responseType.current,
            paramReader.read(
              "responseMustClickCrosshairBool",
              status.block_condition
            )
          );
          // Turn off fixation at the start of `trialRoutine`
          // fixation.setAutoDraw(false);
        },
      });
      ////

      //------Prepare to start Routine 'trial'-------
      t = 0;
      frameN = -1;
      continueRoutine = true; // until we're told otherwise

      key_resp.status = PsychoJS.Status.NOT_STARTED; // ? Why we don't need this to run before?
      key_resp.keys = undefined;
      key_resp.rt = undefined;
      _key_resp_allKeys = [];

      _instructionSetup(
        instructionsText.trial.respond["spacing"](
          rc.language.value,
          responseType.current
        )
      );
      instructions.setText(
        instructionsText.trial.respond["spacing"](
          rc.language.value,
          responseType.current
        )
      );

      //use google sheets phrases for instructions
      switchKind(targetKind.current, {
        sound: () => {
          _instructionSetup(
            instructionsText.trial.respond["sound"](rc.language.value)
          );
          instructions.setText(
            instructionsText.trial.respond["sound"](rc.language.value)
          );
        },
      });
      instructions.setAutoDraw(false);

      /* -------------------------------------------------------------------------- */
      // ! TEMP set reading text
      // readingParagraph.setText()

      switchKind(targetKind.current, {
        reading: () => {
          // TEXT
          readingParagraph.setText(
            readingThisBlockPages[readingPageIndex.current]
          );
          // AUTO DRAW
          readingParagraph.setAutoDraw(true);

          readingPageIndex.current++;
        },
      });
      /* -------------------------------------------------------------------------- */
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
  function trialRoutineEachFrame(snapshot) {
    return async function () {
      ////
      if (stats.on) stats.current.begin();
      ////

      if (toShowCursor()) {
        showCursor();
        removeClickableCharacterSet(showCharacterSetResponse);
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
        targetKind.current === "letter"
          ? letterConfig.delayBeforeStimOnsetSec
          : 0;
      const timeWhenRespondable =
        delayBeforeStimOnsetSec +
        letterConfig.targetSafetyMarginSec +
        letterConfig.targetDurationSec;
      /* -------------------------------------------------------------------------- */
      if (frameN === 0) {
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
          sound: () => {
            //only accepts y or n
            validAns = ["y", "n"];
          },
          reading: () => {
            // READING Only accepts SPACE
            if (!validAns.length || validAns[0] !== "space")
              validAns = ["space"];
            if (!correctAns.current || correctAns.current !== "space")
              correctAns.current = "space";
          },
          letter: () => {
            if (
              paramReader.read("calibrateTrackGazeBool", status.block_condition)
            )
              measureGazeError(
                tolerances,
                displayOptions,
                clickedContinue.timestamps[
                  clickedContinue.timestamps.length - 1
                ],
                letterConfig.targetDurationSec
              );
            /* SAVE INFO ABOUT STIMULUS AS PRESENTED */
            psychoJS.experiment.addData(
              "targetBoundingBox",
              String(target.getBoundingBox(true))
            );
            if (letterConfig.spacingRelationToSize === "ratio") {
              psychoJS.experiment.addData(
                "flanker1BoundingBox",
                String(flanker1.getBoundingBox(true))
              );
              psychoJS.experiment.addData(
                "flanker2BoundingBox",
                String(flanker2.getBoundingBox(true))
              );
            }
            /* /SAVE INFO ABOUT STIMULUS AS PRESENTED */

            // ? Should allow for reading?
            if (timing.clickToStimulusOnsetSec)
              if (showConditionNameConfig.showTargetSpecs) {
                showConditionNameConfig.targetSpecs += `\nclickToStimulusOnsetSec: ${
                  Math.round(timing.clickToStimulusOnsetSec * 100000.0) / 100000
                } [${isTimingOK(timing.clickToStimulusOnsetSec, 0.1)}]`;
                targetSpecs.setText(showConditionNameConfig.targetSpecs);
                showConditionName(conditionName, targetSpecs);
              }
          },
        });
      }
      /* -------------------------------------------------------------------------- */

      // *key_resp* updates
      // TODO although showGrid/simulated should only be activated for experimenters, it's better to have
      // response type more independent
      if (
        targetKind.current === "sound" ||
        targetKind.current === "reading" ||
        canType(responseType.current) ||
        (simulated &&
          simulated[status.block] &&
          simulated[status.block][status.block_condition])
      ) {
        if (
          t >= timeWhenRespondable &&
          key_resp.status === PsychoJS.Status.NOT_STARTED
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

        if (key_resp.status === PsychoJS.Status.STARTED) {
          /* --- SIMULATED --- */
          if (
            simulated &&
            simulated[status.block] &&
            simulated[status.block][status.block_condition]
          ) {
            return simulateObserverResponse(
              simulatedObserver[status.block_condition],
              key_resp,
              psychoJS
            );
          }
          /* --- /SIMULATED --- */

          let theseKeys = key_resp.getKeys({
            keyList: validAns,
            waitRelease: false,
          });
          _key_resp_allKeys = _key_resp_allKeys.concat(theseKeys);
          if (_key_resp_allKeys.length > 0) {
            key_resp.keys =
              _key_resp_allKeys[_key_resp_allKeys.length - 1].name; // just the last key pressed
            key_resp.rt = _key_resp_allKeys[_key_resp_allKeys.length - 1].rt;

            // Was this correct?
            if (key_resp.keys == correctAns.current) {
              // Play correct audio
              switchKind(targetKind.current, {
                sound: () => {
                  correctSynth.play();
                  status.trialCorrect_thisBlock++;
                  status.trialCompleted_thisBlock++;
                },
                letter: () => {
                  correctSynth.play();
                  status.trialCorrect_thisBlock++;
                  status.trialCompleted_thisBlock++;
                },
              });
              // CORRECT
              key_resp.corr = 1;
            } else {
              // Play wrong audio
              // wrongSynth.play();
              status.trialCompleted_thisBlock++;
              // INCORRECT
              key_resp.corr = 0;
            }
            // a response ends the routine
            continueRoutine = false;
          }
        }
      }

      // *showCharacterSetResponse* updates
      if (showCharacterSetResponse.current) {
        key_resp.keys = showCharacterSetResponse.current;
        key_resp.rt =
          (showCharacterSetResponse.clickTime -
            showCharacterSetResponse.onsetTime) /
          1000;
        if (showCharacterSetResponse.current == correctAns.current) {
          // Play correct audio
          correctSynth.play();
          status.trialCorrect_thisBlock++;
          status.trialCompleted_thisBlock++;
          key_resp.corr = 1;
        } else {
          // Play wrong audio
          key_resp.corr = 0;
          status.trialCompleted_thisBlock++;
        }

        removeClickableCharacterSet(showCharacterSetResponse);
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
        targetKind.current !== "sound"
      ) {
        logger("in *fixation* updates with stims", fixation.stims);
        // keep track of start time/frame for later
        fixation.tStart = t; // (not accounting for frame time here)
        fixation.frameNStart = frameN; // exact frame index

        // fixation.setAutoDraw(true);
      }

      // *flanker1* updates
      if (
        t >= delayBeforeStimOnsetSec &&
        flanker1.status === PsychoJS.Status.NOT_STARTED
      ) {
        // keep track of start time/frame for later
        flanker1.tStart = t; // (not accounting for frame time here)
        flanker1.frameNStart = frameN; // exact frame index

        if (
          letterConfig.spacingRelationToSize === "typographic" ||
          thresholdParameter === "size"
        ) {
          flanker1.setAutoDraw(false);
        } else {
          flanker1.setAutoDraw(true);
        }
      }
      if (flanker1.status === PsychoJS.Status.STARTED && t >= frameRemains) {
        flanker1.setAutoDraw(false);
      }

      // *target* updates
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
            Math.round(thisDuration * 100000.0) / 100000
          } [${isTimingOK(
            Math.abs(thisDuration - letterConfig.targetDurationSec),
            0.02
          )}]`;
          targetSpecs.setText(showConditionNameConfig.targetSpecs);
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

      // *flanker2* updates
      if (
        t >= delayBeforeStimOnsetSec &&
        flanker2.status === PsychoJS.Status.NOT_STARTED
      ) {
        // keep track of start time/frame for later
        flanker2.tStart = t; // (not accounting for frame time here)
        flanker2.frameNStart = frameN; // exact frame index

        if (
          letterConfig.spacingRelationToSize === "typographic" ||
          thresholdParameter === "size"
        ) {
          flanker2.setAutoDraw(false);
        } else {
          flanker2.setAutoDraw(true);
        }
      }

      if (flanker2.status === PsychoJS.Status.STARTED && t >= frameRemains) {
        flanker2.setAutoDraw(false);
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
      // *showCharacterSet* updates
      if (
        t >=
          delayBeforeStimOnsetSec +
            letterConfig.targetSafetyMarginSec +
            letterConfig.targetDurationSec &&
        showCharacterSet.status === PsychoJS.Status.NOT_STARTED
      ) {
        // keep track of start time/frame for later
        showCharacterSet.tStart = t; // (not accounting for frame time here)
        showCharacterSet.frameNStart = frameN; // exact frame index
        showCharacterSet.setAutoDraw(true);
        setupClickableCharacterSet(
          fontCharacterSet.current,
          font.name,
          fontCharacterSet.where,
          showCharacterSetResponse
        );

        instructions.tSTart = t;
        instructions.frameNStart = frameN;
        instructions.setAutoDraw(true);
      }

      switchKind(targetKind.current, {
        sound: () => {
          instructions.setAutoDraw(true);
        },
      });
      /* -------------------------------------------------------------------------- */

      // check if the Routine should terminate
      if (!continueRoutine) {
        // a component has requested a forced-end of Routine
        removeClickableCharacterSet(showCharacterSetResponse);
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
      grid.current.hide(true);

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
        key_resp.stop();
        return Scheduler.Event.NEXT;
      }

      /* -------------------------------------------------------------------------- */
      // ! question and answer
      if (targetTask.current === "questionAndAnswer") {
        let question, answers;

        let thisQuestionAndAnswer =
          questionsThisBlock.current[status.trial - 1];

        const questionComponents = thisQuestionAndAnswer.split("|");
        const choiceQuestionBool = questionComponents.length > 2;

        question = questionComponents[1];
        if (choiceQuestionBool) {
          answers = questionComponents.slice(2);
        } else {
          // freeform
          answers = "";
        }

        const questionAndAnswerShortcut = questionComponents[0];

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
          },
          preConfirm: (value) => {
            if (value == null || value === "") {
              Swal.showValidationMessage("You must provide an answer.");
              return false;
            }
          },
        });

        logger("questionAndAnswer RESULT", result);

        if (result && result.value) {
          const answer = result.value;
          psychoJS.experiment.addData(
            questionAndAnswerShortcut || question,
            answer
          );
          psychoJS.experiment.addData("questionAndAnswerResult", answer);
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
        if (key_resp.keys === undefined) {
          console.error("[key_resp.keys] No response error.");
        }

        // NOTE Only means what it's called in `reading` mode
        timing.stimulusOnsetToOffset =
          routineClock.getTime() - timing.clickToStimulusOnsetSec;

        // store data for psychoJS.experiment (ExperimentHandler)
        // update the trial handler
        switchKind(targetKind.current, {
          sound: () => {
            //report values to quest
            if (
              currentLoop instanceof MultiStairHandler &&
              currentLoop.nRemaining !== 0
            ) {
              currentLoop.addResponse(
                key_resp.corr,
                ProposedVolumeLevelFromQuest.current / 20
              );
            }
            addTrialStaircaseSummariesToData(currentLoop, psychoJS);
            //psychoJS.experiment.addData("targetWasPresent", targetIsPresentBool.current);
            //name of masker
            //psychoJS.experiment.addData();
          },
          reading: () => {
            addReadingStatsToOutput(trials.thisRepN, psychoJS);
          },
          letter: () => {
            //check logic. letterTiming.targetFinishSec and letterTiming.targetStartSec are undefined for simulated observer
            if (
              !(
                simulated &&
                simulated[status.block] &&
                simulated[status.block][status.block_condition]
              )
            ) {
              calculateError(
                letterTiming,
                tolerances,
                letterConfig.targetDurationSec,
                target
              );
            }

            // Add trial timing data
            psychoJS.experiment.addData(
              "trialFirstFrameSec",
              letterTiming.trialFirstFrameSec
            );
            psychoJS.experiment.addData(
              "targetStartSec",
              letterTiming.targetStartSec
            );
            psychoJS.experiment.addData(
              "targetFinishSec",
              letterTiming.targetFinishSec
            );
            letterTiming.trialFirstFrameSec = undefined;
            letterTiming.targetStartSec = undefined;
            letterTiming.targetFinishSec = undefined;

            logger("currentLoop.nRemaining", currentLoop.nRemaining);
            logger(
              "currentLoop instanceof MultiStairHandler",
              currentLoop instanceof MultiStairHandler
            );
            if (
              currentLoop instanceof MultiStairHandler &&
              currentLoop.nRemaining !== 0
            ) {
              // currentLoop.addResponse(key_resp.corr, level);
              if (
                !addResponseIfTolerableError(
                  currentLoop,
                  key_resp.corr,
                  level,
                  tolerances,
                  usingGaze.current,
                  psychoJS
                ) &&
                usingGaze.current
              ) {
                // if not tolerable error, then nudge gaze
                rc.nudgeGaze({
                  showOffset: true,
                });
              }
            }
            addTrialStaircaseSummariesToData(currentLoop, psychoJS); // !
          },
        });

        psychoJS.experiment.addData("key_resp.keys", key_resp.keys);
        psychoJS.experiment.addData("key_resp.corr", key_resp.corr);
        if (typeof key_resp.keys !== "undefined") {
          // we had a response
          psychoJS.experiment.addData("key_resp.rt", key_resp.rt);
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
          phrases.T_takeABreakPopup[rc.language.value],
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
            addPopupLogic(thisExperimentInfo.name, responseType.current, () => {
              resolve(Scheduler.Event.NEXT);
            });
          }, takeABreakMinimumDurationSec * 1000);
        });
      }

      // if trialBreak is ongoing
      else if (totalTrialsThisBlock.current === status.trial)
        hideTrialBreakProgressBar();
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
      // if (debug) {
      if (snapshotType === "block") {
        console.log(
          "%c====== New Block ======",
          "background: orange; color: white; padding: 1rem"
        );
      } else if (snapshotType === "trial") {
        console.log(
          "%c====== New Trial ======",
          "background: purple; color: white; padding: 1rem"
        );

        // ! update trial counter
        // dangerous
        logger("currentLoopSnapshot", currentLoopSnapshot);
        status.trial = currentLoopSnapshot.thisN;
      } else {
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
