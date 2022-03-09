/* eslint-disable no-redeclare */

/*****************
 * Crowding Test *
 *****************/

import { debug, getTripletCharacters, sleep } from "./components/utils.js";

import * as core from "./psychojs/src/core/index.js";
import * as data from "./psychojs/src/data/index.js";
import * as util from "./psychojs/src/util/index.js";
import * as visual from "./psychojs/src/visual/index.js";

const { PsychoJS } = core;
const { TrialHandler, MultiStairHandler } = data;
const { Scheduler } = util;

////
/* -------------------------------- External -------------------------------- */
import * as jsQUEST from "./components/addons/jsQUEST.module.js";

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
} from "./components/global.js";

import {
  getTinyHint,
  psychoJS,
  renderObj,
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
  degreesToPixels,
} from "./components/utils.js";

import {
  formCalibrationList,
  ifAnyCheck,
  saveCalibratorData,
  saveCheckData,
  useCalibration,
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
  showConditionName,
  updateConditionNameConfig,
  updateTargetSpecsForReading,
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

/* ---------------------------------- */
// * TRIAL ROUTINES

import { _identify_trialInstructionRoutineEnd } from "./components/trialRoutines.js";

/* ---------------------------------- */

import { switchKind } from "./components/blockTargetKind.js";
import { handleEscapeKey } from "./components/skipTrialOrBlock.js";
import { replacePlaceholders } from "./components/multiLang.js";

/* -------------------------------------------------------------------------- */

window.jsQUEST = jsQUEST;

let correctAns;

// store info about the experiment session:
let expName = "threshold"; // from the Builder filename that created this script
let expInfo = { participant: debug ? rc.id.value : "", session: "001" };
let experimentFileName, experimentName;

const fontsRequired = {};
var simulated;
/* -------------------------------------------------------------------------- */

const paramReaderInitialized = async (reader) => {
  await sleep(250);

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
    // ! POPUPS for take a break & proportion correct
    preparePopup(rc.language.value, expName); // Try to use only one popup ele for both (or even more) popup features
    prepareTrialBreakProgressBar();

    document.body.removeChild(document.querySelector("#rc-panel"));

    // ! Start actual experiment
    experiment(reader.blockCount);
  };
  ////

  // ! Remote Calibrator
  if (useRC && useCalibration(reader)) {
    rc.panel(
      formCalibrationList(reader),
      "#rc-panel",
      {
        debug: debug,
      },
      () => {
        rc.removePanel();
        startExperiment();
      }
    );
  } else {
    startExperiment();
  }
};

const paramReader = new ParamReader("conditions", paramReaderInitialized);

/* -------------------------------------------------------------------------- */

var trialCounterConfig = {
  initialVal: 0,
  fontSize: 20,
  x: window.innerWidth / 2,
  y: -window.innerHeight / 2,
  alignHoriz: "right",
  alignVert: "bottom",
};

var targetSpecsConfig = {
  fontSize: 20,
  x: -window.innerWidth / 2,
  y: -window.innerHeight / 2,
  alignHoriz: "left",
  alignVert: "bottom",
};

var targetSpecs; // TextStim object

var conditionNameConfig = {
  fontSize: 28,
  x: -window.innerWidth / 2,
  y: -window.innerHeight / 2,
  alignHoriz: "left",
  alignVert: "bottom",
};

var conditionName;

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

  experimentFileName = paramReader.read(
    "_experimentFilename",
    "__ALL_BLOCKS__"
  )[0];
  experimentName = paramReader.read("_experimentName", "__ALL_BLOCKS__")[0];

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
    color: new util.Color([0.9, 0.9, 0.9]),
    units: "height",
    waitBlanking: true,
  });

  // schedule the experiment:
  psychoJS.schedule(
    psychoJS.gui.DlgFromDict({
      dictionary: expInfo,
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

  flowScheduler.add(quitPsychoJS, "", true);

  // quit if user presses Cancel in dialog box:
  dialogCancelScheduler.add(quitPsychoJS, "", false);

  if (useRC) {
    expInfo["participant"] = rc.id.value;
  }

  logger("_resources", _resources);
  psychoJS
    .start({
      expName: expName,
      expInfo: expInfo,
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
          psychoJS.window.adjustScreenSize();
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
    expInfo["date"] = util.MonotonicClock.getDateStr(); // add a simple timestamp
    expInfo["expName"] = expName;
    expInfo["psychopyVersion"] = "2021.3.1-threshold-prod";
    expInfo["OS"] = rc.systemFamily.value;
    expInfo["psychojsWindowDimensions"] = String(psychoJS._window._size);

    // store frame rate of monitor if we can measure it successfully
    expInfo["frameRate"] = psychoJS.window.getActualFrameRate();
    // if (typeof expInfo["frameRate"] !== "undefined")
    //   frameDur = 1.0 / Math.round(expInfo["frameRate"]);
    // else frameDur = 1.0 / 60.0; // couldn't get a reliable measure so guess

    // add info from the URL:
    util.addInfoFromUrl(expInfo);

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

  var globalClock;
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

    fixation = new visual.TextStim({
      win: psychoJS.window,
      name: "fixation",
      text: "+",
      font: "Open Sans",
      units: "pix",
      pos: [0, 0],
      height: 45.0,
      wrapWidth: undefined,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: undefined,
      depth: -6.0,
    });

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
    });

    trialCounter = new visual.TextStim({
      win: psychoJS.window,
      name: "trialCounter",
      text: "",
      font: instructionFont.current,
      units: "pix",
      pos: [trialCounterConfig.x, trialCounterConfig.y],
      alignHoriz: trialCounterConfig.alignHoriz,
      alignVert: trialCounterConfig.alignVert,
      height: trialCounterConfig.fontSize,
      wrapWidth: window.innerWidth,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -20.0,
      isInstruction: false,
    });

    targetSpecs = new visual.TextStim({
      win: psychoJS.window,
      name: "targetSpecs",
      text: "",
      font: instructionFont.current,
      units: "pix",
      pos: [targetSpecsConfig.x, targetSpecsConfig.y],
      alignHoriz: targetSpecsConfig.alignHoriz,
      alignVert: targetSpecsConfig.alignVert,
      height: targetSpecsConfig.fontSize,
      wrapWidth: window.innerWidth,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -20.0,
      isInstruction: false,
      autoDraw: false,
    });

    conditionName = new visual.TextStim({
      win: psychoJS.window,
      name: "conditionName",
      text: "",
      font: instructionFont.current,
      units: "pix",
      pos: [conditionNameConfig.x, conditionNameConfig.y],
      alignHoriz: conditionNameConfig.alignHoriz,
      alignVert: conditionNameConfig.alignVert,
      height: conditionNameConfig.fontSize,
      wrapWidth: window.innerWidth,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -20.0,
      isInstruction: false,
      autoDraw: false,
    });

    instructions = new visual.TextStim({
      ...instructionsConfig,
      win: psychoJS.window,
      name: "instructions",
      font: instructionFont.current,
      color: new util.Color("black"),
      pos: [-window.innerWidth * 0.4, window.innerHeight * 0.4],
      alignVert: "top",
    });

    instructions2 = new visual.TextStim({
      ...instructionsConfig,
      win: psychoJS.window,
      name: "instructions2",
      font: instructionFont.current,
      color: new util.Color("black"),
      pos: [-window.innerWidth * 0.4, -window.innerHeight * 0.4],
      alignVert: "bottom",
    });

    characterSetBoundingRects = {};
    for (const cond of paramReader.read("block_condition", "__ALL_BLOCKS__")) {
      const characterSet = String(
        paramReader.read("fontCharacterSet", cond)
      ).split("");
      let font = paramReader.read("font", cond);
      if (paramReader.read("fontSource", cond) === "file")
        font = cleanFontName(font);
      const letterRepeats =
        paramReader.read("spacingRelationToSize", cond) === "ratio" ? 1 : 3;
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
    globalClock = new util.Clock(); // to track the time since experiment started
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
    // TODO set fixation from the actual parameter
    fixationConfig.pos = [0, 0];

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
        return quitPsychoJS("The [Escape] key was pressed. Goodbye!", false);
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

  function _instructionBeforeStimulusSetup(text) {
    t = 0;
    instructionsClock.reset(); // clock
    frameN = -1;
    continueRoutine = true;
    // const wrapWidth = Math.round(1.5 + Math.sqrt(9 + 12*text.length)/2) * instructions.height/1.9;
    const wrapWidth = window.innerWidth / 4;
    instructions.setWrapWidth(wrapWidth);
    instructions.setPos([
      -window.innerWidth / 2 + 5,
      window.innerHeight / 2 - 5,
    ]);
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

      return quitPsychoJS("The [Escape] key was pressed. Goodbye!", false);
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
        extraInfo: expInfo,
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
      /* -------------------------------------------------------------------------- */

      // Schedule all the trials in the trialList:
      for (const _thisBlock of blocks) {
        const snapshot = blocks.getSnapshot();
        blocksLoopScheduler.add(importConditions(snapshot));
        blocksLoopScheduler.add(filterRoutineBegin(snapshot));
        blocksLoopScheduler.add(filterRoutineEachFrame());
        blocksLoopScheduler.add(filterRoutineEnd());
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
        const trialsLoopScheduler = new Scheduler(psychoJS);
        blocksLoopScheduler.add(trialsLoopBegin(trialsLoopScheduler, snapshot));
        blocksLoopScheduler.add(trialsLoopScheduler);
        blocksLoopScheduler.add(trialsLoopEnd);

        switchKind(_thisBlock.targetKind, {
          reading: () => {
            blocksLoopScheduler.add(blockSchedulerFinalRoutineBegin(snapshot));
            blocksLoopScheduler.add(blockSchedulerFinalRoutineEachFrame());
            blocksLoopScheduler.add(blockSchedulerFinalRoutineEnd());
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

          // TODO set fixation from the actual parameter
          fixationConfig.pos = [0, 0];
          fixationConfig.size = 45;
          fixationConfig.show = true;
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

        trialsLoopScheduler.add(importConditions(snapshot));
        // Instructions
        trialsLoopScheduler.add(trialInstructionRoutineBegin(snapshot));
        trialsLoopScheduler.add(trialInstructionRoutineEachFrame());
        trialsLoopScheduler.add(trialInstructionRoutineEnd());
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
    if (targetKind.current === "letter") {
      // Proportion correct
      showPopup(
        expName,
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
      await addPopupLogic(expName, responseType.current, null);

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

    // ! Distance ?

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
          "color: red; font-size: 1.5rem"
        );

        updateTrialInfo();
        setupClickableCharacterSet(
          [thisQuestion.correctAnswer, ...thisQuestion.foils].sort(),
          font.name,
          "bottom",
          showCharacterSetResponse,
          (clickedWord) => {
            readingClickableAnswersUpdate.current = true;
            if (clickedWord === thisQuestion.correctAnswer) correctSynth.play();
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
          "color: red; font-size: 1.5rem"
        );

        updateTrialInfo();
        updateClickableCharacterSet(
          [thisQuestion.correctAnswer, ...thisQuestion.foils].sort(),
          showCharacterSetResponse,
          (clickedWord) => {
            readingClickableAnswersUpdate.current = true;
            if (clickedWord === thisQuestion.correctAnswer) correctSynth.play();
          },
          "readingAnswer"
        );

        readingCurrentQuestionIndex.current++;
      }

      if (
        psychoJS.experiment.experimentEnded ||
        psychoJS.eventManager.getKeys({ keyList: ["escape"] }).length > 0
      ) {
        return quitPsychoJS("The [Escape] key was pressed. Goodbye!", false);
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

      status.block = snapshot.block + 1;
      totalBlocks.current = snapshot.nTotal;

      // PRESETS
      targetKind.current = paramReader.read("targetKind", status.block)[0];
      ////

      //------Prepare to start Routine 'filter'-------
      t = 0;
      filterClock.reset(); // clock
      frameN = -1;
      continueRoutine = true; // until we're told otherwise

      // update component parameters for each repeat
      // status.block++
      thisConditionsFile = `conditions/block_${status.block}.csv`;

      if (debug)
        console.log(
          "%c=======================\n====== New Block ======\n=======================",
          "color: purple"
        );

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
      switchKind(targetKind.current, {
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

      // keep track of which components have finished
      filterComponents = [];

      // ! Set block params

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
        return quitPsychoJS("The [Escape] key was pressed. Goodbye!", false);
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
      // ! Distance
      // rc.resumeDistance();

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

          // instructions.setAutoDraw(false)
          instructions2.setAutoDraw(false);
          fixation.setAutoDraw(false);
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
          readingParagraph.setPos([-thisBlockWrapWidth * 0.5, 0]);
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

      renderObj.tinyHint.setAutoDraw(false);

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
      ////
      // End distance once the exp begins
      rc.endDistance();
      ////
      eduInstructionClock.reset();

      TrialHandler.fromSnapshot(snapshot);

      clickedContinue.current = false;
      if (canClick(responseType.current)) addProceedButton(rc.language.value);

      switchKind(targetKind.current, {
        reading: () => {
          // READING
          // _instructionSetup('');
        },
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

          fixation.setHeight(fixationConfig.size);
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
      // ! Distance
      // rc.pauseDistance();

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

  const showCharacterSetResponse = {
    current: null,
    onsetTime: 0,
    clickTime: 0,
  };

  var showBoundingBox;
  var showCharacterSetBoundingBox;
  var stimulusParameters;
  var targetDurationSec;

  var thresholdParameter;

  var wirelessKeyboardNeededYes;

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

      // update trial/block count
      status.trial = snapshot.thisN + 1;

      const reader = paramReader;
      const BC = status.block_condition;

      font.source = reader.read("fontSource", BC);
      font.name = reader.read("font", BC);
      if (font.source === "file") font.name = cleanFontName(font.name);

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

      switchKind(targetKind.current, {
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
            updateTargetSpecsForReading(reader, BC, experimentFileName);

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

          fixation.setHeight(fixationConfig.size);
          fixation.setPos(fixationConfig.pos);
          fixation.tStart = t;
          fixation.frameNStart = frameN;
          fixation.setAutoDraw(true);

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

          letterConfig.spacingDirection = reader.read("spacingDirection", BC);
          letterConfig.spacingSymmetry = reader.read("spacingSymmetry", BC);

          validAns = String(reader.read("fontCharacterSet", BC))
            .toLowerCase()
            .split("");

          fontCharacterSet.where = reader.read("showCharacterSetWhere", BC);

          targetDurationSec = reader.read("targetDurationSec", BC);

          fixationConfig.size = 45; // TODO use .csv parameters, ie draw as 2 lines, not one letter
          fixationConfig.show = reader.read("markTheFixationBool", BC);

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

          letterConfig.targetSafetyMarginSec = paramReader.read(
            "targetSafetyMarginSec",
            BC
          );

          // trackGazeYes = reader.read("trackGazeYes", BC);
          // trackHeadYes = reader.read("trackHeadYes", BC);
          wirelessKeyboardNeededYes = reader.read(
            "wirelessKeyboardNeededYes",
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
              "color: red; font-size: 1.5rem"
            );
          correctAns = targetCharacter.toLowerCase();
          /* -------------------------------------------------------------------------- */

          // DISPLAY OPTIONS
          displayOptions.window = psychoJS.window;

          // Fixation placement does not depend on the value of "spacingRelationToSize"...
          fixation.setPos(fixationConfig.pos);
          fixation.setHeight(fixationConfig.size);
          // ... neither does target location...
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

          // ...but size, and content of the target(& flankers) does.
          psychoJS.experiment.addData(
            "spacingRelationToSize",
            letterConfig.spacingRelationToSize
          );
          [level, stimulusParameters] = restrictLevel(
            proposedLevel,
            thresholdParameter,
            characterSetBoundingRects[BC],
            letterConfig.spacingDirection,
            letterConfig.spacingRelationToSize,
            letterConfig.spacingSymmetry,
            letterConfig.spacingOverSizeRatio,
            letterConfig.targetSizeIsHeightBool
          );
          psychoJS.experiment.addData("level", level);
          psychoJS.experiment.addData("heightPx", stimulusParameters.heightPx);

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
                    stimulusParameters.widthPx,
                    stimulusParameters.heightPx
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

          if (showConditionNameConfig.showTargetSpecs) {
            // TODO Move to showTrialInformation.js
            showConditionNameConfig.targetSpecs = `sizeDeg: ${
              Math.round(10 * stimulusParameters.sizeDeg) / 10
            }\n${
              stimulusParameters.spacingDeg
                ? `spacingDeg: ${
                    Math.round(10 * stimulusParameters.spacingDeg) / 10
                  }`
                : ""
            }\nheightDeg: ${
              Math.round(10 * stimulusParameters.heightDeg) / 10
            }\nheightPx: ${Math.round(
              stimulusParameters.heightPx
            )}\nfilename: ${experimentFileName}\nfont: ${
              font.name
            }\nspacingRelationToSize: ${
              letterConfig.spacingRelationToSize
            }\nspacingOverSizeRatio: ${
              letterConfig.spacingOverSizeRatio
            }\nspacingSymmetry: ${
              letterConfig.spacingSymmetry
            }\ntargetSizeIsHeightBool: ${
              letterConfig.targetSizeIsHeightBool
            }\ntargetEccentricityXYDeg: ${
              letterConfig.targetEccentricityXYDeg
            }\nviewingDistanceCm: ${viewingDistanceCm.current}`;
          }

          trialComponents = [];
          trialComponents.push(key_resp);
          trialComponents.push(fixation);
          trialComponents.push(flanker1);
          trialComponents.push(target);
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
      trialCounter.setHeight(trialCounterConfig.fontSize);
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
            targetSpecsConfig.x = -window.innerWidth / 2;
            targetSpecsConfig.y = -window.innerHeight / 2;
            if (targetSpecs.status === PsychoJS.Status.NOT_STARTED) {
              // keep track of start time/frame for later
              targetSpecs.tStart = t; // (not accounting for frame time here)
              targetSpecs.frameNStart = frameN; // exact frame index
            }
            targetSpecs.setAutoDraw(true);
          }
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
          return quitPsychoJS("The [Escape] key was pressed. Goodbye!", false);
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
      // if (
      //   canType(responseType.current) &&
      //   psychoJS.eventManager.getKeys({ keyList: ["space"] }).length > 0
      // ) {
      //   loggerText("trialInstructionRoutineEachFrame SPACE HIT");
      //   continueRoutine = false;
      // }

      return Scheduler.Event.FLIP_REPEAT;
    };
  }

  function trialInstructionRoutineEnd() {
    return async function () {
      loggerText("trialInstructionRoutineEnd");
      if (toShowCursor()) {
        showCursor();
        return Scheduler.Event.NEXT;
      }

      switchKind(targetKind.current, {
        reading: () => {
          // READING
          return Scheduler.Event.NEXT;
        },
        letter: () => {
          _identify_trialInstructionRoutineEnd(
            instructions,
            _takeFixationClick
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
      // rc.pauseNudger();
      // await sleep(100);

      if (toShowCursor()) {
        showCursor();
        return Scheduler.Event.NEXT;
      }

      psychoJS.experiment.addData(
        "clickToTrialPreparationDelaySec",
        routineClock.getTime()
      );
      trialClock.reset(); // clock

      TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

      hideCursor();

      ////
      if (debug)
        console.log("%c\n\n====== New Trial ======\n\n", "color: purple");
      if (snapshot.getCurrentTrial().trialsVal)
        logger("Level", snapshot.getCurrentTrial().trialsVal);
      logger("Index", snapshot.thisIndex);

      if (targetKind.current === "reading") readingSound.play();

      ////
      switchKind(targetKind.current, {
        letter: () => {
          responseType.current = resetResponseType(
            responseType.original,
            responseType.current,
            paramReader.read(
              "responseMustClickCrosshairBool",
              status.block_condition
            )
          );
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

      psychoJS.experiment.addData(
        "trialBeginDurationSec",
        trialClock.getTime()
      );

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

      return Scheduler.Event.NEXT;
    };
  }

  var frameRemains;
  function trialRoutineEachFrame(snapshot) {
    return async function () {
      if (toShowCursor()) {
        showCursor();
        removeClickableCharacterSet(showCharacterSetResponse);
        return Scheduler.Event.NEXT;
      }

      //------Loop for each frame of Routine 'trial'-------
      // get current time
      t = trialClock.getTime();
      frameN = frameN + 1; // number of completed frames (so 0 is the first frame)
      if (frameN === 1) {
        logger("target bounding box", target.getBoundingBox(true));
        psychoJS.experiment.addData(
          "clickToStimulusOnsetSec",
          routineClock.getTime()
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
      }
      // update/draw components on each frame

      const uniDelay = 0;

      // *key_resp* updates
      // TODO although showGrid/simulated should only be activated for experimenters, it's better to have
      // response type more independent
      if (
        targetKind.current === "reading" ||
        canType(responseType.current) ||
        (simulated &&
          simulated[status.block] &&
          simulated[status.block][status.block_condition])
      ) {
        if (t >= uniDelay && key_resp.status === PsychoJS.Status.NOT_STARTED) {
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

          // READING Only accepts SPACE
          switchKind(targetKind.current, {
            reading: () => {
              if (!validAns.length || validAns[0] !== "space")
                validAns = ["space"];
              if (!correctAns || correctAns !== "space") correctAns = "space";
            },
          });

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
            if (key_resp.keys == correctAns) {
              // Play correct audio
              switchKind(targetKind.current, {
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
        if (showCharacterSetResponse.current == correctAns) {
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
        targetSpecsConfig.x = -window.innerWidth / 2;
        targetSpecsConfig.y = -window.innerHeight / 2;
        // *targetSpecs* updates
        if (t >= 0.0) {
          targetSpecs.setPos([targetSpecsConfig.x, targetSpecsConfig.y]);
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
          conditionName.setPos([conditionNameConfig.x, conditionNameConfig.y]);
          conditionName.setAutoDraw(true);
        }
      }

      // *fixation* updates
      if (
        t >= 0.0 &&
        fixation.status === PsychoJS.Status.NOT_STARTED &&
        fixationConfig.show
      ) {
        // keep track of start time/frame for later
        fixation.tStart = t; // (not accounting for frame time here)
        fixation.frameNStart = frameN; // exact frame index

        fixation.setAutoDraw(true);
      }

      // *flanker1* updates
      if (t >= uniDelay && flanker1.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        flanker1.tStart = t; // (not accounting for frame time here)
        flanker1.frameNStart = frameN; // exact frame index

        if (letterConfig.spacingRelationToSize === "typographic") {
          flanker1.setAutoDraw(false);
        } else {
          flanker1.setAutoDraw(true);
        }
      }

      frameRemains =
        uniDelay +
        targetDurationSec -
        psychoJS.window.monitorFramePeriod * 0.75; // most of one frame period left
      if (flanker1.status === PsychoJS.Status.STARTED && t >= frameRemains) {
        flanker1.setAutoDraw(false);
      }

      // *target* updates
      if (t >= uniDelay && target.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        target.tStart = t; // (not accounting for frame time here)
        target.frameNStart = frameN; // exact frame index

        // NOTE these two values are not equivalent
        // logger("target bb.x, bb.y", [
        //   target.getBoundingBox(true).x,
        //   target.getBoundingBox(true).y,
        // ]);
        // logger("target pos", target.getPos());

        target.setAutoDraw(true);
      }

      if (target.status === PsychoJS.Status.STARTED && t >= frameRemains) {
        target.setAutoDraw(false);
        // Play purr sound
        // Wait until next frame to play
        setTimeout(() => {
          purrSynth.play();
        }, 17);
        setTimeout(() => {
          showCursor();
        }, 500);
      }

      // *flanker2* updates
      if (t >= uniDelay && flanker2.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        flanker2.tStart = t; // (not accounting for frame time here)
        flanker2.frameNStart = frameN; // exact frame index

        if (letterConfig.spacingRelationToSize === "typographic") {
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
          return quitPsychoJS("The [Escape] key was pressed. Goodbye!", false);
        }
      }

      const timeWhenRespondable =
        uniDelay + letterConfig.targetSafetyMarginSec + targetDurationSec;
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
          uniDelay + letterConfig.targetSafetyMarginSec + targetDurationSec &&
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
          currentLoop.addResponse(0, level);
        }
        routineTimer.reset();
        routineClock.reset();
        key_resp.stop();
        return Scheduler.Event.NEXT;
      }

      // setTimeout(() => {
      //   rc.resumeNudger();
      // }, 700);

      //------Ending Routine 'trial'-------
      for (const thisComponent of trialComponents) {
        if (typeof thisComponent.setAutoDraw === "function") {
          thisComponent.setAutoDraw(false);
        }
      }

      // was no response the correct answer?!
      if (key_resp.keys === undefined) {
        console.error("[key_resp.keys] No response error.");
      }

      // store data for psychoJS.experiment (ExperimentHandler)
      // update the trial handler
      switchKind(targetKind.current, {
        letter: () => {
          if (currentLoop instanceof MultiStairHandler) {
            currentLoop.addResponse(key_resp.corr, level);
            // TODO Should it be placed outside of the if statement?
            addTrialStaircaseSummariesToData(currentLoop, psychoJS); // !
          }
        },
      });

      psychoJS.experiment.addData("key_resp.keys", key_resp.keys);
      psychoJS.experiment.addData("key_resp.corr", key_resp.corr);
      if (typeof key_resp.keys !== "undefined") {
        // we had a response
        psychoJS.experiment.addData("key_resp.rt", key_resp.rt);
        psychoJS.experiment.addData(
          "trialRoutineDurationFromBeginSec",
          trialClock.getTime()
        );
        psychoJS.experiment.addData(
          "trialRoutineDurationFromPreviousEndSec",
          routineClock.getTime()
        );

        routineTimer.reset();
        routineClock.reset();
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
      if (currentBlockCreditForTrialBreak >= 1) {
        currentBlockCreditForTrialBreak -= 1;

        showPopup(
          expName,
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
              expName,
              instructionsText.trialBreak(
                rc.language.value,
                responseType.current
              ),
              canClick(responseType.current)
            );
            addPopupLogic(expName, responseType.current, () => {
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

  function importConditions(currentLoopSnapshot) {
    return async function () {
      logger("current trial", currentLoopSnapshot.getCurrentTrial());
      psychoJS.importAttributes(currentLoopSnapshot.getCurrentTrial());
      return Scheduler.Event.NEXT;
    };
  }

  async function quitPsychoJS(message, isCompleted) {
    removeClickableCharacterSet(showCharacterSetResponse);
    rc.endNudger();
    showCursor();

    // Check for and save orphaned data
    if (psychoJS.experiment.isEntryEmpty()) {
      psychoJS.experiment.nextEntry();
    }
    psychoJS.window.close();

    const timeBeforeDebriefDisplay = globalClock.getTime();
    const debriefScreen = new Promise((resolve) => {
      if (paramReader.read("_debriefForm")[0]) {
        showForm(paramReader.read("_debriefForm")[0]);
        document.getElementById("form-yes").addEventListener("click", () => {
          hideForm();
          resolve();
        });

        document.getElementById("form-no").addEventListener("click", () => {
          hideForm();
          resolve();
        });
      } else {
        resolve();
      }
    });
    await debriefScreen;

    psychoJS.experiment.addData(
      "debriefDurationSec",
      globalClock.getTime() - timeBeforeDebriefDisplay
    );
    psychoJS.experiment.addData(
      "durationOfExperimentSec",
      globalClock.getTime()
    );

    // QUIT FULLSCREEN
    if (rc.isFullscreen.value) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }

    if (recruitmentServiceData.name == "Prolific" && isCompleted) {
      let additionalMessage = ` Please visit <a target="_blank" href="${recruitmentServiceData.url}">HERE</a> to complete the experiment.`;
      psychoJS.quit({
        message: message + additionalMessage,
        isCompleted: isCompleted,
      });
    } else {
      psychoJS.quit({ message: message, isCompleted: isCompleted });
    }

    return Scheduler.Event.QUIT;
  }
};
