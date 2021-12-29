/* eslint-disable no-redeclare */

/*****************
 * Crowding Test *
 *****************/

import { debug, getTripletCharacters, sleep } from "./components/utils.js";

const useRC = true;

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
import "./components/css/trialBreak.css";
import "./components/css/widgets.css";

////
/* ------------------------------- Components ------------------------------- */

import { ParamReader } from "./parameters/paramReader.js";

import {
  logger,
  loggerText,
  hideCursor,
  showCursor,
  XYPixOfXYDeg,
  XYDegOfXYPix,
  addConditionToData,
  addTrialStaircaseSummariesToData,
  addBlockStaircaseSummariesToData,
  // spacingPixelsFromLevel,
} from "./components/utils.js";

import {
  formCalibrationList,
  useCalibration,
} from "./components/useCalibration.js";

import { canType, getResponseType } from "./components/response.js";

import { cleanFontName, loadFonts } from "./components/fonts.js";
import {
  loadRecruitmentServiceConfig,
  recruitmentServiceData,
} from "./components/recruitmentService.js";
import { phrases } from "./components/i18n.js";

import {
  addBeepButton,
  instructionsText,
  removeBeepButton,
} from "./components/instructions.js";

import {
  getCorrectSynth,
  getWrongSynth,
  getPurrSynth,
} from "./components/sound.js";
import {
  removeClickableCharacterSet,
  setupClickableCharacterSet,
} from "./components/showCharacterSet.js";

import {
  getConsentFormName,
  hideAllForms,
  showConsentForm,
  showDebriefForm,
} from "./components/forms.js";

import { getTrialInfoStr } from "./components/trialCounter.js";

import {
  getCharacterSetBoundingBox,
  restrictLevel,
} from "./components/bounding.js";

import {
  readGridParameter,
  turnOnGrid,
  spawnGrids,
  undrawGrids,
} from "./components/grid.js";
import {
  checkIfSimulated,
  SimulatedObserver,
  simulateObserverResponse,
} from "./components/simulatedObserver.js";
import { showExperimentEnding } from "./components/widgets.js";
import {
  getCanvasContext,
  getPixelRGBA,
  initPixelsArray,
  readPixels,
} from "./components/canvasContext.js";
import { populateQuestDefaults } from "./components/questValues.js";

// READING
import {
  getPageData,
  prepareForReading,
  readBookText,
  readingTaskFields,
} from "./components/readingUtils.js";
import {
  hideTrialBreakProgressbar,
  hideTrialBreakWidget,
  hideTrialProceedButton,
  showTrialBreakProgressbar,
  showTrialBreakWidget,
  showTrialProceedButton,
} from "./components/trialBreak.js";

/* -------------------------------------------------------------------------- */

window.jsQUEST = jsQUEST;

var conditionTrials;
let correctAns;

// eslint-disable-next-line no-undef
const rc = RemoteCalibrator;
rc.init();

// store info about the experiment session:
let expName = "Threshold"; // from the Builder filename that created this script
let expInfo = { participant: debug ? rc.id.value : "", session: "001" };

const fontsRequired = {};
var showGrid, gridVisible, simulated;
/* -------------------------------------------------------------------------- */

const paramReaderInitialized = async (reader) => {
  await sleep(250);

  // show screens before actual experiment begins
  beforeExperimentBegins(reader);

  // prepareForReading(reader);

  // ! Load fonts
  loadFonts(reader, fontsRequired);

  // ! Load recruitment service config
  loadRecruitmentServiceConfig();

  // ! Simulate observer
  simulated = checkIfSimulated(reader);

  // ! Check if to use grids
  [showGrid, gridVisible] = readGridParameter(reader, simulated);

  /* ---------------- TEMPORARY! PLEASE UPDATE AND REMOVE @svr8 --------------- */
  document.getElementById("temp-element-hider").remove();
  /* -------------------------------------------------------------------------- */

  await sleep(50);

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
        document.body.removeChild(document.querySelector("#rc-panel"));
        // ! Start actual experiment
        experiment(reader.blockCount);
      }
    );
  } else {
    document.body.removeChild(document.querySelector("#rc-panel"));
    // ! Start actual experiment
    experiment(reader.blockCount);
  }
};

const paramReader = new ParamReader("conditions", paramReaderInitialized);

/* -------------------------------------------------------------------------- */

var totalTrialConfig = {
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

var trialInfoStr = "";
var totalTrial, // TextSim object
  totalTrialCount = 0;

var currentTrialIndex = 0;
var currentTrialLength = 0;
var currentBlockIndex = 0;
var totalBlockCount = 0;

var consentFormName = "";
var debriefFormName = "";

// Maps 'block_condition' -> bounding rectangle around (appropriate) characterSet
// In typographic condition, the bounds are around a triplet
var characterSetBoundingRects = {};

const beforeExperimentBegins = async (reader) => {
  // get consent form
  consentFormName = reader.read("_consentForm")[0];
  if (!(typeof consentFormName === "string" && consentFormName.length > 0))
    consentFormName = "";

  // get debrief form
  debriefFormName = paramReader.read("_debriefForm")[0];
  if (!(typeof debriefFormName === "string" && debriefFormName.length > 0))
    debriefFormName = "";

  // show consent form if field is valid
  if (consentFormName.length > 0) showConsentForm(consentFormName);

  // add event listners to form buttons
  document.getElementById("consent-yes").addEventListener("click", (evt) => {
    hideAllForms();
  });
  document.getElementById("consent-no").addEventListener("click", (evt) => {
    if (debriefFormName.length > 0) showDebriefForm(debriefFormName);

    document.getElementById("debrief-yes").addEventListener("click", (evt) => {
      hideAllForms();
      afterExperimentEnds();
    });

    document.getElementById("debrief-no").addEventListener("click", (evt) => {
      hideAllForms();
      afterExperimentEnds();
    });
  });
};

const experiment = (blockCount) => {
  ////
  // Resources
  const _resources = [];
  const blockNumbers = paramReader._experiment.map((block) => block.block);
  for (const i of blockNumbers) {
    _resources.push({
      name: `conditions/block_${i}.csv`,
      path: `conditions/block_${i}.csv`,
    });
  }
  logger("fontsRequired", fontsRequired);

  for (let i in fontsRequired) {
    logger(i, fontsRequired[i]);
    _resources.push({ name: i, path: fontsRequired[i] });
  }

  // Start code blocks for 'Before Experiment'
  // init psychoJS:
  const psychoJS = new PsychoJS({
    debug: false,
  });

  /* ---------------------------------- Sound --------------------------------- */
  const correctSynth = getCorrectSynth(psychoJS);
  const wrongSynth = getWrongSynth(psychoJS);
  const purrSynth = getPurrSynth(psychoJS);

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
  // flowScheduler.add(initInstructionRoutineBegin());
  // flowScheduler.add(initInstructionRoutineEachFrame());
  // flowScheduler.add(initInstructionRoutineEnd());
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
  psychoJS.start({
    expName: expName,
    expInfo: expInfo,
    resources: [
      { name: "conditions/blockCount.csv", path: "conditions/blockCount.csv" },
      ..._resources,
    ],
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

  var debriefClock;
  var debrief_form_content;

  var fileClock;
  var filterClock;
  var instructionsClock;

  /* --- BOUNDING BOX --- */
  var targetBoundingPoly;
  var flanker1BoundingPoly;
  var flanker2BoundingPoly;
  /* --- /BOUNDING BOX --- */

  var thisLoopNumber; // ! BLOCK COUNTER
  var thisConditionsFile;
  var trialClock;

  var instructions;
  var instructions2;
  var instructionFont = paramReader.read("instructionFont")[0];
  if (paramReader.read("instructionFontSource")[0] === "file")
    instructionFont = cleanFontName(instructionFont);

  var key_resp;
  var fixation; ////
  var flanker1;
  var target;
  var flanker2;
  var showCharacterSet;

  var globalClock;
  var routineTimer, routineClock, blockClock;
  var initInstructionClock, eduInstructionClock, trialInstructionClock;

  // TODO uncomment after testing
  // var showTakeABreakCreditBool = paramReader.read("showTakeABreakCreditBool")[0];
  var takeABreakMinimumDurationSec;
  var takeABreakTrialCredit;
  var currentTrialCredit;
  var trialBreakStartTime = 0;
  var trialBreakStatus;
  var trialBreakButtonStatus;

  async function experimentInit() {
    // Initialize components for Routine "file"
    fileClock = new util.Clock();
    // Initialize components for Routine "filter"
    filterClock = new util.Clock();
    instructionsClock = new util.Clock();

    thisLoopNumber = 0;
    thisConditionsFile = `conditions/block_${thisLoopNumber + 1}.csv`;

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

    totalTrial = new visual.TextStim({
      win: psychoJS.window,
      name: "totalTrial",
      text: "",
      font: instructionFont,
      units: "pix",
      pos: [totalTrialConfig.x, totalTrialConfig.y],
      alignHoriz: totalTrialConfig.alignHoriz,
      alignVert: totalTrialConfig.alignVert,
      height: 1.0,
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
      font: instructionFont,
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

    const instructionsConfig = {
      win: psychoJS.window,
      text: "",
      font: instructionFont,
      units: "pix",
      height: 27.0,
      wrapWidth: window.innerWidth * 0.8,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -12.0,
      alignHoriz: "left",
      isInstruction: true, // !
    };
    instructions = new visual.TextStim({
      ...instructionsConfig,
      name: "instructions",
      pos: [-window.innerWidth * 0.4, window.innerHeight * 0.4],
      alignVert: "top",
    });
    instructions2 = new visual.TextStim({
      ...instructionsConfig,
      name: "instructions2",
      pos: [-window.innerWidth * 0.4, -window.innerHeight * 0.4],
      alignVert: "bottom",
    });

    /* --- BOUNDING BOX --- */
    const boundingConfig = {
      win: psychoJS.window,
      units: "pix",
      width: [1.0, 1.0][0],
      height: [1.0, 1.0][1],
      ori: 0.0,
      pos: [0, 0],
      lineWidth: 1.0,
      lineColor: new util.Color("blue"),
      // fillColor: "#000000",
      opacity: undefined,
      depth: -10,
      interpolate: true,
      size: 0,
    };
    targetBoundingPoly = new visual.Rect({
      ...boundingConfig,
      name: "targetBoundingPoly",
    });
    flanker1BoundingPoly = new visual.Rect({
      ...boundingConfig,
      name: "flanker1BoundingPoly",
    });
    flanker2BoundingPoly = new visual.Rect({
      ...boundingConfig,
      name: "flanker2BoundingPoly",
    });
    /* --- BOUNDING BOX --- */

    // Create some handy timers
    globalClock = new util.Clock(); // to track the time since experiment started
    routineTimer = new util.CountdownTimer(); // to track time remaining of each (non-slip) routine
    routineClock = new util.Clock();
    blockClock = new util.Clock();

    // Extra clocks for clear timing
    initInstructionClock = new util.Clock();
    eduInstructionClock = new util.Clock();
    trialInstructionClock = new util.Clock();

    // TODO Not working
    if (rc.languageDirection.value === "RTL") {
      Object.assign(document.querySelector("canvas").style, {
        direction: "rtl",
      });
    }

    return Scheduler.Event.NEXT;
  }

  var t;
  var frameN;
  var continueRoutine;
  var fileComponents;

  var clickedContinue;

  var responseType = 2;

  var continueRoutine;
  var consentComponents;
  var debriefComponents;
  var frameRemains;

  var fixationXYPx;
  var fixationSize = 45.0;
  var showFixation;
  var windowWidthCm;
  var windowWidthPx;
  var pixPerCm;

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

  var _beepButton;

  function _instructionSetup(text) {
    t = 0;
    instructionsClock.reset(); // clock
    frameN = -1;
    continueRoutine = true;
    instructions.setWrapWidth(window.innerWidth * 0.8);
    instructions.setPos([-window.innerWidth * 0.4, window.innerHeight * 0.4]);
    instructions.setText(text);
    instructions.setAutoDraw(true);
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

  function _clickContinue(e) {
    if (e.target.id !== "threshold-beep-button") clickedContinue = true;
  }

  async function _instructionRoutineEachFrame() {
    /* --- SIMULATED --- */
    if (simulated && simulated[thisLoopNumber]) return Scheduler.Event.NEXT;
    /* --- /SIMULATED --- */

    t = instructionsClock.getTime();
    frameN = frameN + 1;

    if (
      psychoJS.experiment.experimentEnded ||
      psychoJS.eventManager.getKeys({ keyList: ["escape"] }).length > 0
    ) {
      document.removeEventListener("click", _clickContinue);
      document.removeEventListener("touchend", _clickContinue);
      removeBeepButton(_beepButton);

      return quitPsychoJS("The [Escape] key was pressed. Goodbye!", false);
    }

    if (!continueRoutine) {
      return Scheduler.Event.NEXT;
    }

    continueRoutine = true;
    if (
      canType(responseType) &&
      psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0
    ) {
      continueRoutine = false;
    }

    if (continueRoutine && !clickedContinue) {
      return Scheduler.Event.FLIP_REPEAT;
    } else {
      return Scheduler.Event.NEXT;
    }
  }

  async function _instructionRoutineEnd() {
    instructions.setAutoDraw(false);

    document.removeEventListener("click", _clickContinue);
    document.removeEventListener("touchend", _clickContinue);

    routineTimer.reset();
    routineClock.reset();

    return Scheduler.Event.NEXT;
  }

  var blocks;
  var currentLoop;
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
        seed: undefined,
        name: "blocks",
      });
      psychoJS.experiment.addLoop(blocks); // add the loop to the experiment
      currentLoop = blocks; // we're now the current loop

      // Schedule all the trials in the trialList:
      for (const thisBlock of blocks) {
        const snapshot = blocks.getSnapshot();
        blocksLoopScheduler.add(importConditions(snapshot));
        blocksLoopScheduler.add(filterRoutineBegin(snapshot));
        blocksLoopScheduler.add(filterRoutineEachFrame());
        blocksLoopScheduler.add(filterRoutineEnd());
        blocksLoopScheduler.add(initInstructionRoutineBegin(snapshot));
        blocksLoopScheduler.add(initInstructionRoutineEachFrame());
        blocksLoopScheduler.add(initInstructionRoutineEnd());
        blocksLoopScheduler.add(eduInstructionRoutineBegin(snapshot));
        blocksLoopScheduler.add(eduInstructionRoutineEachFrame());
        blocksLoopScheduler.add(eduInstructionRoutineEnd());
        const trialsLoopScheduler = new Scheduler(psychoJS);
        blocksLoopScheduler.add(trialsLoopBegin(trialsLoopScheduler, snapshot));
        blocksLoopScheduler.add(trialsLoopScheduler);
        blocksLoopScheduler.add(trialsLoopEnd);
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
      trialsConditions = populateQuestDefaults(trialsConditions, paramReader);

      const nTrialsTotal = trialsConditions
        .map((c) =>
          Number(paramReader.read("conditionTrials", c["block_condition"]))
        )
        .reduce((runningSum, ntrials) => runningSum + ntrials, 0);

      trials = new data.MultiStairHandler({
        stairType: MultiStairHandler.StaircaseType.QUEST,
        psychoJS: psychoJS,
        name: "trials",
        varName: "trialsVal",
        nTrials: nTrialsTotal,
        conditions: trialsConditions,
        method: TrialHandler.Method.FULLRANDOM,
      });

      // TODO set fixation from the actual parameter
      fixationXYPx = [0, 0];
      fixationSize = 45;
      showFixation = true;

      trialInfoStr = getTrialInfoStr(
        rc.language.value,
        showCounterBool,
        showViewingDistanceBool,
        currentTrialIndex,
        currentTrialLength,
        currentBlockIndex,
        totalBlockCount,
        viewingDistanceCm
      );
      totalTrial.setText(trialInfoStr);
      totalTrial.setAutoDraw(true);
      showTrialBreakProgressbar(currentTrialCredit);

      psychoJS.experiment.addLoop(trials); // add the loop to the experiment
      currentLoop = trials; // we're now the current loop
      // Schedule all the trials in the trialList:
      for (const thisQuestLoop of trials) {
        const snapshot = trials.getSnapshot();
        trialsLoopScheduler.add(importConditions(snapshot));
        trialsLoopScheduler.add(trialInstructionRoutineBegin(snapshot));
        trialsLoopScheduler.add(trialInstructionRoutineEachFrame());
        trialsLoopScheduler.add(trialInstructionRoutineEnd());
        trialsLoopScheduler.add(trialRoutineBegin(snapshot));
        trialsLoopScheduler.add(trialRoutineEachFrame());
        trialsLoopScheduler.add(trialRoutineEnd());
        trialsLoopScheduler.add(
          endLoopIteration(trialsLoopScheduler, snapshot)
        );
      }

      // initialize takeABreakCredit values
      // TODO read values from experiment file
      logger(
        "takeABreakTrialCredit",
        paramReader.read("takeABreakTrialCredit")[currentBlockIndex]
      );
      logger(
        "takeABreakMinimumDurationSec",
        paramReader.read("takeABreakMinimumDurationSec")[currentBlockIndex]
      );
      currentTrialCredit = 0;
      trialBreakStatus = false;
      trialBreakButtonStatus = false;
      hideTrialBreakWidget();
      takeABreakTrialCredit = paramReader.read("takeABreakTrialCredit")[
        currentBlockIndex
      ];
      takeABreakMinimumDurationSec = paramReader.read(
        "takeABreakMinimumDurationSec"
      )[currentBlockIndex];

      return Scheduler.Event.NEXT;
    };
  }

  async function trialsLoopEnd() {
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

  /* -------------------------------------------------------------------------- */
  /*                                  NEW BLOCK                                 */
  /* -------------------------------------------------------------------------- */

  var filterComponents;
  function filterRoutineBegin(snapshot) {
    return async function () {
      TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date
      currentBlockIndex = snapshot.block + 1;
      totalBlockCount = snapshot.nTotal;

      //------Prepare to start Routine 'filter'-------
      t = 0;
      filterClock.reset(); // clock
      frameN = -1;
      continueRoutine = true; // until we're told otherwise

      // update component parameters for each repeat
      thisLoopNumber += 1;
      thisConditionsFile = `conditions/block_${thisLoopNumber}.csv`;

      if (debug)
        console.log(
          "%c=======================\n====== New Block ======\n=======================",
          "color: purple"
        );

      const possibleTrials = paramReader.read(
        "conditionTrials",
        thisLoopNumber
      );

      logger("possibleTrials", possibleTrials);
      totalTrialCount = possibleTrials.reduce((a, b) => a + b, 0); // sum of possible trials
      conditionTrials = Math.max(...possibleTrials);

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
      if (simulated && simulated[thisLoopNumber]) return Scheduler.Event.NEXT;
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

  function initInstructionRoutineBegin(snapshot) {
    return async function () {
      // ! Distance
      // rc.resumeDistance();

      initInstructionClock.reset(); // clock
      TrialHandler.fromSnapshot(snapshot);

      const blockCount = snapshot.block + 1;

      fixationXYPx = [0, 0];
      if (showGrid) {
        // Undraw any grids from the previous block
        if (window.grids) window.grids = undrawGrids(window.grids);
        // Only include grids if they're used in this block
        if (paramReader.read("showGridsBool", blockCount).some((t) => t)) {
          // Create the appropriate trio of grids for this block
          window.grids = spawnGrids(
            rc,
            paramReader,
            snapshot.block,
            psychoJS,
            fixationXYPx
          );
          // Turn on the currently visible grid
          turnOnGrid(gridVisible, window.grids);
        }
      }

      responseType = getResponseType(
        paramReader.read("responseClickedBool", blockCount)[0],
        paramReader.read("responseTypedBool", blockCount)[0],
        paramReader.read("responseTypedEasyEyesKeypadBool", blockCount)[0],
        paramReader.read("responseSpokenBool", blockCount)[0]
      );

      _instructionSetup(
        (snapshot.block === 0
          ? instructionsText.initial(rc.language.value)
          : "") +
          instructionsText.initialByThresholdParameter["spacing"](
            rc.language.value,
            responseType,
            totalTrialCount
          ) +
          instructionsText.initialEnd(rc.language.value, responseType)
      );

      clickedContinue = false;
      setTimeout(() => {
        document.addEventListener("click", _clickContinue);
        document.addEventListener("touchend", _clickContinue);
      }, 500);

      _beepButton = addBeepButton(rc.language.value, correctSynth);

      psychoJS.eventManager.clearKeys();

      return Scheduler.Event.NEXT;
    };
  }

  function initInstructionRoutineEachFrame() {
    return _instructionRoutineEachFrame;
  }

  function initInstructionRoutineEnd() {
    return async function () {
      instructions.setAutoDraw(false);

      document.removeEventListener("click", _clickContinue);
      document.removeEventListener("touchend", _clickContinue);

      removeBeepButton(_beepButton);

      psychoJS.experiment.addData(
        "initInstructionRoutineDurationFromBeginSec",
        initInstructionClock.getTime()
      );
      psychoJS.experiment.addData(
        "initInstructionRoutineDurationFromPreviousEndSec",
        routineClock.getTime()
      );

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
      _instructionSetup(instructionsText.edu(rc.language.value));

      instructions2.setText(
        instructionsText.eduBelow(rc.language.value, responseType)
      );
      instructions2.setWrapWidth(window.innerWidth * 0.8);
      instructions2.setPos([
        -window.innerWidth * 0.4,
        -window.innerHeight * 0.4,
      ]);
      instructions2.setAutoDraw(true);

      clickedContinue = false;
      setTimeout(() => {
        document.addEventListener("click", _clickContinue);
        document.addEventListener("touchend", _clickContinue);
      }, 1000);

      const h = 50;
      const D = 200;
      const g = 100;

      target.setFont(instructionFont);
      target.setPos([D, 0]);
      target.setText("R");
      target.setHeight(h);

      flanker1.setFont(instructionFont);
      flanker1.setPos([D - g, 0]);
      flanker1.setText("H");
      flanker1.setHeight(h);

      flanker2.setFont(instructionFont);
      flanker2.setPos([D + g, 0]);
      flanker2.setText("C");
      flanker2.setHeight(h);

      fixation.setHeight(fixationSize);
      fixation.setPos([0, 0]);

      fixation.setAutoDraw(true);
      target.setAutoDraw(true);
      flanker1.setAutoDraw(true);
      flanker2.setAutoDraw(true);

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
      instructions2.setAutoDraw(false);

      document.removeEventListener("click", _clickContinue);
      document.removeEventListener("touchend", _clickContinue);

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

  //     clickedContinue = false;
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

  const _takeFixationClick = (e) => {
    let cX, cY;
    if (e.clientX) {
      cX = e.clientX;
      cY = e.clientY;
    } else {
      const t = e.changedTouches[0];
      if (t.clientX) {
        cX = t.clientX;
        cY = t.clientY;
      } else {
        clickedContinue = false;
        return;
      }
    }

    if (
      Math.hypot(
        cX - (window.innerWidth >> 1),
        cY - (window.innerHeight >> 1)
      ) < fixationSize
    ) {
      // Clicked on fixation
      hideCursor();
      setTimeout(() => {
        clickedContinue = true;
      }, 17);
    } else {
      // wrongSynth.play();
      clickedContinue = false;
    }
  };

  var level;
  var viewingDistanceDesiredCm;
  var viewingDistanceCm;

  var block;
  var spacingDirection;
  var targetFont;
  var targetCharacterSet;
  var validAns;
  var showCharacterSetWhere;
  var showCharacterSetElement;
  var showCounterBool;
  var showTargetSpecs;
  var showViewingDistanceBool;
  const showCharacterSetResponse = {
    current: null,
    onsetTime: 0,
    clickTime: 0,
  };
  var showBoundingBox;
  var stimulusParameters;
  var targetKind;
  var targetDurationSec;
  var targetMinimumPix;
  var targetSizeDeg;
  var targetSizeIsHeightBool;
  var thresholdParameter;
  var spacingSymmetry;
  var spacingOverSizeRatio;
  var spacingRelationToSize;
  var targetEccentricityXDeg;
  var targetEccentricityYDeg;
  var targetEccentricityXYDeg;
  // var trackGazeYes;
  // var trackHeadYes;
  var wirelessKeyboardNeededYes;

  var _key_resp_allKeys;
  var trialComponents;

  /* --- SIMULATED --- */
  var simulatedObserver = {};
  /* --- /SIMULATED --- */

  var condition;
  var skipTrialOrBlock = {
    blockId: null,
    trialId: null,
    skipTrial: false,
    skipBlock: false,
  };

  function trialInstructionRoutineBegin(snapshot) {
    return async function () {
      trialInstructionClock.reset();
      TrialHandler.fromSnapshot(snapshot);

      const parametersToExcludeFromData = [];
      for (let c of snapshot.handler.getConditions()) {
        if (c["block_condition"] === trials._currentStaircase._name) {
          condition = c;
          addConditionToData(
            psychoJS.experiment,
            condition,
            parametersToExcludeFromData
          );
        }
      }
      const cName = condition["block_condition"];

      // ! responseType
      responseType = getResponseType(
        paramReader.read("responseClickedBool", cName),
        paramReader.read("responseTypedBool", cName),
        paramReader.read("responseTypedEasyEyesKeypadBool", cName),
        paramReader.read("responseSpokenBool", cName)
      );
      logger("responseType", responseType);

      // update trial/block count
      currentTrialIndex = snapshot.thisN + 1;
      currentTrialLength = snapshot.nTotal;
      trialInfoStr = getTrialInfoStr(
        rc.language.value,
        showCounterBool,
        showViewingDistanceBool,
        currentTrialIndex,
        currentTrialLength,
        currentBlockIndex,
        totalBlockCount,
        viewingDistanceCm
      );
      totalTrial.setText(trialInfoStr);
      totalTrial.setFont(instructionFont);
      totalTrial.setHeight(totalTrialConfig.fontSize);
      totalTrial.setPos([window.innerWidth / 2, -window.innerHeight / 2]);
      totalTrial.setAutoDraw(true);

      _instructionBeforeStimulusSetup(
        instructionsText.trial.fixate["spacing"](
          rc.language.value,
          responseType
        )
      );

      fixation.setHeight(fixationSize);
      fixation.setPos(fixationXYPx);
      fixation.tStart = t;
      fixation.frameNStart = frameN;
      fixation.setAutoDraw(true);

      clickedContinue = false;
      document.addEventListener("click", _takeFixationClick);
      document.addEventListener("touchend", _takeFixationClick);

      /* PRECOMPUTE STIMULI FOR THE UPCOMING TRIAL */
      TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date
      const reader = paramReader;
      let proposedLevel = currentLoop._currentStaircase.getQuestValue();
      psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);

      psychoJS.experiment.addData("block_condition", cName);
      psychoJS.experiment.addData(
        "flankerOrientation",
        reader.read("spacingDirection", cName)
      );
      psychoJS.experiment.addData(
        "targetFont",
        reader.read("targetFont", cName)
      );
      // update component parameters for each repeat
      windowWidthCm = rc.screenWidthCm ? rc.screenWidthCm.value : 30;
      windowWidthPx = rc.displayWidthPx.value;
      pixPerCm = windowWidthPx / windowWidthCm;
      if (!rc.screenWidthCm)
        console.warn("[Screen Width] Using arbitrary screen width. Enable RC.");

      viewingDistanceDesiredCm = reader.read("viewingDistanceDesiredCm", cName);
      // viewingDistanceDesiredCm = 10;
      viewingDistanceCm = rc.viewingDistanceCm
        ? rc.viewingDistanceCm.value
        : viewingDistanceDesiredCm;
      if (!rc.viewingDistanceCm)
        console.warn(
          "[Viewing Distance] Using arbitrary viewing distance. Enable RC."
        );

      block = condition["block"];

      // TODO check that we are actually trying to test for "spacing", not "size"

      spacingDirection = reader.read("spacingDirection", cName);
      spacingSymmetry = reader.read("spacingSymmetry", cName);
      let targetFontSource = reader.read("targetFontSource", cName);
      targetFont = reader.read("targetFont", cName);
      if (targetFontSource === "file") targetFont = cleanFontName(targetFont);

      targetCharacterSet = String(
        reader.read("targetCharacterSet", cName)
      ).split("");
      validAns = String(reader.read("targetCharacterSet", cName))
        .toLowerCase()
        .split("");

      showCharacterSetWhere = reader.read("showCharacterSetWhere", cName);
      showViewingDistanceBool = reader.read("showViewingDistanceBool", cName);
      showCounterBool = reader.read("showCounterBool", cName);
      showTargetSpecs = paramReader.read("showTargetSpecsBool", cName);

      conditionTrials = reader.read("conditionTrials", cName);
      targetDurationSec = reader.read("targetDurationSec", cName);

      fixationSize = 45; // TODO use .csv parameters, ie draw as 2 lines, not one letter
      showFixation = reader.read("markTheFixationBool", cName);

      targetKind = reader.read("targetKind", cName);
      targetSizeDeg = reader.read("targetSizeDeg", cName);
      targetSizeIsHeightBool = reader.read("targetSizeIsHeightBool", cName);
      thresholdParameter = reader.read("thresholdParameter", cName);
      targetMinimumPix = reader.read("targetMinimumPix", cName);
      spacingOverSizeRatio = reader.read("spacingOverSizeRatio", cName);
      spacingRelationToSize = reader.read("spacingRelationToSize", cName);

      targetEccentricityXDeg = reader.read("targetEccentricityXDeg", cName);
      psychoJS.experiment.addData(
        "targetEccentricityXDeg",
        targetEccentricityXDeg
      );
      targetEccentricityYDeg = reader.read("targetEccentricityYDeg", cName);
      psychoJS.experiment.addData(
        "targetEccentricityYDeg",
        targetEccentricityYDeg
      );
      targetEccentricityXYDeg = [
        targetEccentricityXDeg,
        targetEccentricityYDeg,
      ];
      showBoundingBox = reader.read("showBoundingBoxBool", cName) || false;

      // trackGazeYes = reader.read("trackGazeYes", cName);
      // trackHeadYes = reader.read("trackHeadYes", cName);
      wirelessKeyboardNeededYes = reader.read(
        "wirelessKeyboardNeededYes",
        cName
      );

      var characterSet = targetCharacterSet;

      // Repeat letters 3 times when in 'typographic' mode,
      // ie the relevant bounding box is that of three letters.
      const letterRepeats = spacingRelationToSize === "ratio" ? 1 : 3;
      if (!characterSetBoundingRects.hasOwnProperty(cName)) {
        characterSetBoundingRects[cName] = getCharacterSetBoundingBox(
          characterSet,
          targetFont,
          psychoJS.window,
          letterRepeats
        );
      }
      /* ------------------------------ Pick triplets ----------------------------- */
      var [firstFlankerCharacter, targetCharacter, secondFlankerCharacter] =
        getTripletCharacters(characterSet);
      if (debug)
        console.log(
          `%c${firstFlankerCharacter} ${targetCharacter} ${secondFlankerCharacter}`,
          "color: red; font-size: 1.5rem"
        );
      correctAns = targetCharacter.toLowerCase();
      /* -------------------------------------------------------------------------- */

      var pos1XYPx, targetEccentricityXYPx, pos3XYPx;
      var spacingDeg, spacingPx;

      ////
      // !
      // TODO use actual nearPoint, from RC
      const nearPointXYDeg = { x: 0, y: 0 }; // TEMP
      const nearPointXYPix = { x: 0, y: 0 }; // TEMP
      const displayOptions = {
        pixPerCm: pixPerCm,
        viewingDistanceCm: viewingDistanceCm,
        nearPointXYDeg: nearPointXYDeg,
        nearPointXYPix: nearPointXYPix,
        fixationXYPix: fixationXYPx,
        spacingOverSizeRatio: spacingOverSizeRatio,
        targetMinimumPix: targetMinimumPix,
        fontFamily: targetFont,
        window: psychoJS.window,
        spacingRelationToSize: spacingRelationToSize,
        targetEccentricityXYDeg: targetEccentricityXYDeg,
        spacingDirection: spacingDirection,
        flankerCharacters: [firstFlankerCharacter, secondFlankerCharacter],
        targetCharacter: targetCharacter,
        targetSizeDeg: targetSizeDeg,
        targetKind: targetKind,
      };

      // Fixation placement does not depend on the value of "spacingRelationToSize"...
      fixation.setPos(fixationXYPx);
      fixation.setHeight(fixationSize);
      // ... neither does target location...
      targetEccentricityXYPx = XYPixOfXYDeg(
        targetEccentricityXYDeg,
        displayOptions
      );
      // targetEccentricityXYPx = targetEccentricityXYPx.map(Math.round);
      psychoJS.experiment.addData("targetLocationPx", targetEccentricityXYPx);
      target.setPos(targetEccentricityXYPx);
      target.setFont(targetFont);

      // ...but size, and content of the target(& flankers) does.
      psychoJS.experiment.addData(
        "spacingRelationToSize",
        spacingRelationToSize
      );
      [level, stimulusParameters] = restrictLevel(
        proposedLevel,
        thresholdParameter,
        characterSetBoundingRects[cName],
        spacingDirection,
        spacingRelationToSize,
        spacingSymmetry,
        spacingOverSizeRatio,
        targetSizeIsHeightBool,
        displayOptions
      );
      psychoJS.experiment.addData("level", level);
      psychoJS.experiment.addData("heightPx", stimulusParameters.heightPx);
      target.setHeight(stimulusParameters.heightPx);
      target.setPos(stimulusParameters.targetAndFlankersXYPx[0]);
      psychoJS.experiment.addData(
        "targetLocationPx",
        stimulusParameters.targetAndFlankersXYPx[0]
      );
      switch (thresholdParameter) {
        case "size":
          flanker1.setAutoDraw(false);
          flanker2.setAutoDraw(false);
          break;
        case "spacing":
          switch (spacingRelationToSize) {
            case "none":
            case "ratio":
              target.setText(targetCharacter);
              flanker1.setText(firstFlankerCharacter);
              flanker2.setText(secondFlankerCharacter);
              flanker1.setPos(stimulusParameters.targetAndFlankersXYPx[1]);
              flanker2.setPos(stimulusParameters.targetAndFlankersXYPx[2]);
              flanker1.setFont(targetFont);
              flanker2.setFont(targetFont);
              flanker1.setHeight(stimulusParameters.heightPx);
              flanker2.setHeight(stimulusParameters.heightPx);
              psychoJS.experiment.addData("flankerLocationsPx", [
                stimulusParameters.targetAndFlankersXYPx[1],
                stimulusParameters.targetAndFlankersXYPx[2],
              ]);
              break;
            case "typographic":
              // ...include the flankers in the same string/stim as the target.
              const flankersAndTargetString =
                firstFlankerCharacter +
                targetCharacter +
                secondFlankerCharacter;
              target.setText(flankersAndTargetString);
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
        totalTrial,
      ].forEach((c) => c._updateIfNeeded());
      if (showBoundingBox) {
        const boundingStims = [targetBoundingPoly];
        const tightBoundingBox = target.getBoundingBox(true);
        targetBoundingPoly.setPos([
          tightBoundingBox.left,
          tightBoundingBox.top,
        ]);
        targetBoundingPoly.setSize([
          tightBoundingBox.width,
          tightBoundingBox.height,
        ]);
        if (
          (spacingRelationToSize === "ratio" ||
            spacingRelationToSize === "none") &&
          thresholdParameter === "spacing"
        ) {
          boundingStims.push(flanker1BoundingPoly, flanker2BoundingPoly);
          const flanker1BoundingBox = flanker1.getBoundingBox(true);
          flanker1BoundingPoly.setPos([
            flanker1BoundingBox.left,
            flanker1BoundingBox.top,
          ]);
          flanker1BoundingPoly.setSize([
            flanker1BoundingBox.width,
            flanker1BoundingBox.height,
          ]);
          const flanker2BoundingBox = flanker2.getBoundingBox(true);
          flanker2BoundingPoly.setPos([
            flanker2BoundingBox.left,
            flanker2BoundingBox.top,
          ]);
          flanker2BoundingPoly.setSize([
            flanker2BoundingBox.width,
            flanker2BoundingBox.height,
          ]);
        }
        boundingStims.forEach((c) => c._updateIfNeeded());
      }
      showCharacterSet.setPos([0, 0]);
      showCharacterSet.setText("");
      // showCharacterSet.setText(getCharacterSetShowText(validAns))

      if (showTargetSpecs) {
        const spacing =
          Math.round((Math.pow(10, level) + Number.EPSILON) * 1000) / 1000;
        const size =
          Math.round((spacing / spacingOverSizeRatio + Number.EPSILON) * 1000) /
          1000;
        let targetSpecsString = `size: ${size} deg`;
        // if (spacingRelationToSize === "ratio")
        targetSpecsString += `\nspacing: ${spacing} deg`;
        targetSpecs.setText(targetSpecsString);
        targetSpecs.setPos([-window.innerWidth / 2, -window.innerHeight / 2]);
        targetSpecs.setAutoDraw(true);
      }

      trialInfoStr = getTrialInfoStr(
        rc.language.value,
        showCounterBool,
        showViewingDistanceBool,
        currentTrialIndex,
        currentTrialLength,
        currentBlockIndex,
        totalBlockCount,
        viewingDistanceCm
      );
      totalTrial.setText(trialInfoStr);
      totalTrial.setFont(instructionFont);
      totalTrial.setHeight(totalTrialConfig.fontSize);
      totalTrial.setPos([window.innerWidth / 2, -window.innerHeight / 2]);
      // // totalTrialIndex = nextTrialInfo.trial;
      // // totalBlockIndex = nextTrialInfo.block
      // // keep track of which components have finished
      trialComponents = [];
      trialComponents.push(key_resp);
      trialComponents.push(fixation);
      trialComponents.push(flanker1);
      trialComponents.push(target);
      trialComponents.push(flanker2);

      trialComponents.push(showCharacterSet);
      trialComponents.push(totalTrial);
      // if (showTargetSpecs) trialComponents.push(targetSpecs);
      // /* --- BOUNDING BOX --- */
      if (showBoundingBox) {
        trialComponents.push(targetBoundingPoly);
        if (
          (spacingRelationToSize === "ratio" ||
            spacingRelationToSize === "none") &&
          thresholdParameter === "spacing"
        ) {
          trialComponents.push(flanker1BoundingPoly);
          trialComponents.push(flanker2BoundingPoly);
        }
      }
      // /* --- /BOUNDING BOX --- */
      // /* --- SIMULATED --- */
      if (simulated && simulated[block]) {
        if (!simulatedObserver[cName]) {
          simulatedObserver[cName] = new SimulatedObserver(
            simulated[block][cName],
            level,
            characterSet,
            targetCharacter,
            paramReader.read("thresholdProportionCorrect", cName),
            paramReader.read("simulationBeta", cName),
            paramReader.read("simulationDelta", cName),
            paramReader.read("simulationThreshold", cName)
          );
        } else {
          simulatedObserver[cName].updateTrial(
            level,
            characterSet,
            targetCharacter
          );
        }
      }
      // /* --- /SIMULATED --- */
      for (const thisComponent of trialComponents)
        if ("status" in thisComponent)
          thisComponent.status = PsychoJS.Status.NOT_STARTED;

      // update trial index
      // totalTrialIndex = totalTrialIndex + 1;
      /* /PRECOMPUTE STIMULI FOR THE UPCOMING TRIAL */

      psychoJS.eventManager.clearKeys();

      psychoJS.experiment.addData(
        "trialInstructionBeginDurationSec",
        trialInstructionClock.getTime()
      );
      return Scheduler.Event.NEXT;
    };
  }

  function trialInstructionRoutineEachFrame() {
    return async function () {
      if (
        (skipTrialOrBlock.trialId == currentTrialIndex &&
          skipTrialOrBlock.blockId == currentBlockIndex &&
          skipTrialOrBlock.skipTrial) ||
        (skipTrialOrBlock.blockId == currentBlockIndex &&
          skipTrialOrBlock.skipBlock)
      ) {
        showCursor();
        return Scheduler.Event.NEXT;
      }
      /* --- SIMULATED --- */
      if (simulated && simulated[thisLoopNumber]) return Scheduler.Event.NEXT;
      /* --- /SIMULATED --- */
      t = instructionsClock.getTime();
      frameN = frameN + 1;

      if (showTargetSpecs) {
        targetSpecsConfig.x = -window.innerWidth / 2;
        targetSpecsConfig.y = -window.innerHeight / 2;
        if (targetSpecs.status === PsychoJS.Status.NOT_STARTED) {
          // keep track of start time/frame for later
          targetSpecs.tStart = t; // (not accounting for frame time here)
          targetSpecs.frameNStart = frameN; // exact frame index
        }
        targetSpecs.setAutoDraw(true);
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

      if (!continueRoutine) {
        return Scheduler.Event.NEXT;
      }

      continueRoutine = true;
      if (
        canType(responseType) &&
        psychoJS.eventManager.getKeys({ keyList: ["space"] }).length > 0
      ) {
        continueRoutine = false;
      }

      if (continueRoutine && !clickedContinue) {
        return Scheduler.Event.FLIP_REPEAT;
      } else {
        return Scheduler.Event.NEXT;
      }
    };
  }

  function trialInstructionRoutineEnd() {
    return async function () {
      if (
        (skipTrialOrBlock.trialId == currentTrialIndex &&
          skipTrialOrBlock.blockId == currentBlockIndex &&
          skipTrialOrBlock.skipTrial) ||
        (skipTrialOrBlock.blockId == currentBlockIndex &&
          skipTrialOrBlock.skipBlock)
      ) {
        showCursor();
        return Scheduler.Event.NEXT;
      }

      document.removeEventListener("click", _takeFixationClick);
      document.removeEventListener("touchend", _takeFixationClick);
      instructions.setAutoDraw(false);

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

      if (
        (skipTrialOrBlock.trialId == currentTrialIndex &&
          skipTrialOrBlock.blockId == currentBlockIndex &&
          skipTrialOrBlock.skipTrial) ||
        (skipTrialOrBlock.blockId == currentBlockIndex &&
          skipTrialOrBlock.skipBlock)
      ) {
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
      logger("Level", snapshot.getCurrentTrial().trialsVal);
      logger("Index", snapshot.thisIndex);

      //------Prepare to start Routine 'trial'-------
      t = 0;
      frameN = -1;
      continueRoutine = true; // until we're told otherwise

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
          responseType
        )
      );
      instructions.setText(
        instructionsText.trial.respond["spacing"](
          rc.language.value,
          responseType
        )
      );
      instructions.setAutoDraw(false);

      return Scheduler.Event.NEXT;
    };
  }

  var frameRemains;
  function trialRoutineEachFrame() {
    return async function () {
      if (
        (skipTrialOrBlock.trialId == currentTrialIndex &&
          skipTrialOrBlock.blockId == currentBlockIndex &&
          skipTrialOrBlock.skipTrial) ||
        (skipTrialOrBlock.blockId == currentBlockIndex &&
          skipTrialOrBlock.skipBlock)
      ) {
        showCursor();
        removeClickableCharacterSet();
        return Scheduler.Event.NEXT;
      }

      //------Loop for each frame of Routine 'trial'-------
      // get current time
      t = trialClock.getTime();
      frameN = frameN + 1; // number of completed frames (so 0 is the first frame)
      if (frameN === 0) {
        psychoJS.experiment.addData(
          "clickToStimulusOnsetSec",
          routineClock.getTime()
        );
        /* SAVE INFO ABOUT STIMULUS AS PRESENTED */
        psychoJS.experiment.addData(
          "targetBoundingBox",
          String(target.getBoundingBox(true))
        );
        if (spacingRelationToSize === "ratio") {
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

      const uniDelay = 0; // 0.5 by default?

      // *key_resp* updates
      // TODO although showGrid/simulated should only be activated for experimenters, it's better to have
      // response type more independent
      if (
        canType(responseType) ||
        showGrid ||
        (simulated &&
          simulated[thisLoopNumber] &&
          simulated[thisLoopNumber][condition["block_condition"]])
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
            simulated[thisLoopNumber] &&
            simulated[thisLoopNumber][condition["block_condition"]]
          ) {
            return simulateObserverResponse(
              simulatedObserver[condition["block_condition"]],
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
            // was this correct?
            if (key_resp.keys == correctAns) {
              // Play correct audio
              correctSynth.play();
              key_resp.corr = 1;
            } else {
              // Play wrong audio
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
          key_resp.corr = 1;
        } else {
          // Play wrong audio
          key_resp.corr = 0;
        }
        showCharacterSetResponse.current = null;
        removeClickableCharacterSet();
        continueRoutine = false;
      }

      // *totalTrial* updates
      if (t >= 0.0 && totalTrial.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        totalTrial.tStart = t; // (not accounting for frame time here)
        totalTrial.frameNStart = frameN; // exact frame index

        totalTrial.setAutoDraw(true);
      }

      if (showTargetSpecs) {
        targetSpecsConfig.x = -window.innerWidth / 2;
        targetSpecsConfig.y = -window.innerHeight / 2;
        // *targetSpecs* updates
        if (t >= 0.0) {
          targetSpecs.setPos([targetSpecsConfig.x, targetSpecsConfig.y]);
          targetSpecs.setAutoDraw(true);
        }
      }

      // *fixation* updates
      if (
        t >= 0.0 &&
        fixation.status === PsychoJS.Status.NOT_STARTED &&
        showFixation
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

        if (spacingRelationToSize === "typographic") {
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

        if (spacingRelationToSize === "typographic") {
          flanker2.setAutoDraw(false);
        } else {
          flanker2.setAutoDraw(true);
        }
      }

      if (flanker2.status === PsychoJS.Status.STARTED && t >= frameRemains) {
        flanker2.setAutoDraw(false);
      }

      /* --- BOUNDING BOX --- */
      if (showBoundingBox) {
        // // *targetBoundingPoly* updates
        if (
          t >= 0.0 &&
          targetBoundingPoly.status === PsychoJS.Status.NOT_STARTED
        ) {
          // keep track of start time/frame for later
          targetBoundingPoly.tStart = t; // (not accounting for frame time here)
          targetBoundingPoly.frameNStart = frameN; // exact frame index

          const tightBoundingBox = target.getBoundingBox(true);

          targetBoundingPoly.setAutoDraw(true);
        }
        if (
          targetBoundingPoly.status === PsychoJS.Status.STARTED &&
          t >= frameRemains
        ) {
          targetBoundingPoly.setAutoDraw(false);
        }

        // // *flanker1BoundingPoly* updates
        if (
          t >= 0.0 &&
          flanker1BoundingPoly.status === PsychoJS.Status.NOT_STARTED &&
          spacingRelationToSize === "ratio"
        ) {
          // keep track of start time/frame for later
          flanker1BoundingPoly.tStart = t; // (not accounting for frame time here)
          flanker1BoundingPoly.frameNStart = frameN; // exact frame index

          flanker1BoundingPoly.setAutoDraw(true);
        }
        if (
          flanker1BoundingPoly.status === PsychoJS.Status.STARTED &&
          t >= frameRemains
        ) {
          flanker1BoundingPoly.setAutoDraw(false);
        }

        // // *flanker2BoundingPoly* updates
        if (
          t >= 0.0 &&
          flanker2BoundingPoly.status === PsychoJS.Status.NOT_STARTED &&
          spacingRelationToSize === "ratio"
        ) {
          // keep track of start time/frame for later
          flanker2BoundingPoly.tStart = t; // (not accounting for frame time here)
          flanker2BoundingPoly.frameNStart = frameN; // exact frame index

          const tightBoundingBox = flanker2.getBoundingBox(true);
          flanker2BoundingPoly.setPos([
            tightBoundingBox.left,
            tightBoundingBox.top,
          ]);
          flanker2BoundingPoly.setSize([
            tightBoundingBox.width,
            tightBoundingBox.height,
          ]);

          flanker2BoundingPoly.setAutoDraw(true);
        }
        if (
          flanker2BoundingPoly.status === PsychoJS.Status.STARTED &&
          t >= frameRemains
        ) {
          flanker2BoundingPoly.setAutoDraw(false);
        }
      }
      /* --- /BOUNDING BOX --- */

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

      /* -------------------------------------------------------------------------- */
      // *showCharacterSet* updates
      if (
        t >= uniDelay + targetDurationSec &&
        showCharacterSet.status === PsychoJS.Status.NOT_STARTED
      ) {
        // keep track of start time/frame for later
        showCharacterSet.tStart = t; // (not accounting for frame time here)
        showCharacterSet.frameNStart = frameN; // exact frame index
        showCharacterSet.setAutoDraw(true);
        showCharacterSetElement = setupClickableCharacterSet(
          targetCharacterSet,
          targetFont,
          showCharacterSetWhere,
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
        removeClickableCharacterSet();
        return Scheduler.Event.NEXT;
      }

      continueRoutine = false; // reverts to True if at least one component still running
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
        return Scheduler.Event.NEXT;
      }
    };
  }

  function trialRoutineEnd() {
    return async function () {
      if (
        (skipTrialOrBlock.trialId == currentTrialIndex &&
          skipTrialOrBlock.blockId == currentBlockIndex &&
          skipTrialOrBlock.skipTrial) ||
        (skipTrialOrBlock.blockId == currentBlockIndex &&
          skipTrialOrBlock.skipBlock)
      ) {
        showCursor();
        if (currentLoop instanceof MultiStairHandler) {
          for (const thisComponent of trialComponents) {
            if (typeof thisComponent.setAutoDraw === "function") {
              thisComponent.setAutoDraw(false);
            }
          }
          currentLoop.addResponse(0, level);
          routineTimer.reset();
          routineClock.reset();
        }
        key_resp.stop();
        return Scheduler.Event.NEXT;
      }

      // setTimeout(() => {
      //   rc.resumeNudger();
      // }, 700);

      // if trialBreak is not ongoing
      loggerText("TRIAL ROUTINE END");
      if (!trialBreakStatus) {
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
        if (currentLoop instanceof MultiStairHandler) {
          currentLoop.addResponse(key_resp.corr, level);
        } else {
          console.error("currentLoop is not MultiStairHandler");
        }

        addTrialStaircaseSummariesToData(currentLoop, psychoJS);

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

        currentTrialCredit += takeABreakTrialCredit;
        showTrialBreakProgressbar(currentTrialCredit);
        logger("currentTrialCredit", currentTrialCredit);
        // check if trialBreak should be triggered
        if (currentTrialCredit >= 1) {
          trialBreakStartTime = Date.now();
          trialBreakStatus = true;
          currentTrialCredit -= 1;

          showTrialBreakWidget("");

          hideTrialProceedButton();
        }
      }

      // if trialBreak is ongoing
      if (trialBreakStatus) {
        const breakTimeElapsed = (Date.now() - trialBreakStartTime) / 1000;
        if (
          !trialBreakButtonStatus &&
          breakTimeElapsed >= takeABreakMinimumDurationSec
        ) {
          // update trialbreak modal body text
          const trialBreakBody = instructionsText.trialBreak(
            rc.language.value,
            responseType
          );
          showTrialBreakWidget(trialBreakBody);

          // show proceed button
          trialBreakButtonStatus = true;
          showTrialProceedButton();
          document.getElementById("trial-proceed").onclick = () => {
            trialBreakStatus = false;
            trialBreakButtonStatus = false;
            hideTrialBreakWidget();
            hideTrialProceedButton();

            // the trialCredit value is updated on every iteration of this routine.
            // while the routine is waiting for "proceed" during trialbreak, nothing happens.
            // but when its time to move to next routine, one more iteration of current routine is needed.
            // this last iteration will increase the trialcredit. To nullify the extra credit,
            // the credit is decreased here.
            currentTrialCredit -= takeABreakTrialCredit;
          };
        }

        return Scheduler.Event.FLIP_REPEAT;
      } else {
        return Scheduler.Event.NEXT;
      }
    };
  }

  function endLoopIteration(scheduler, snapshot) {
    // ------Prepare for next entry------
    return async function () {
      if (
        (skipTrialOrBlock.trialId == currentTrialIndex &&
          skipTrialOrBlock.blockId == currentBlockIndex &&
          skipTrialOrBlock.skipTrial) ||
        (skipTrialOrBlock.blockId == currentBlockIndex &&
          skipTrialOrBlock.skipBlock)
      ) {
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

  function importConditions(currentLoop) {
    return async function () {
      logger("current trial", currentLoop.getCurrentTrial());
      psychoJS.importAttributes(currentLoop.getCurrentTrial());
      return Scheduler.Event.NEXT;
    };
  }

  async function quitPsychoJS(message, isCompleted) {
    removeClickableCharacterSet();
    rc.endNudger();
    showCursor();

    // Check for and save orphaned data
    if (psychoJS.experiment.isEntryEmpty()) {
      psychoJS.experiment.nextEntry();
    }
    psychoJS.window.close();

    const timeBeforeDebriefDisplay = globalClock.getTime();
    const debriefScreen = new Promise((resolve) => {
      if (debriefFormName.length) {
        showDebriefForm(debriefFormName);
        document
          .getElementById("debrief-yes")
          .addEventListener("click", (evt) => {
            hideAllForms();
            resolve({});
          });

        document
          .getElementById("debrief-no")
          .addEventListener("click", (evt) => {
            hideAllForms();
            resolve({});
          });
      } else {
        resolve({});
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

  async function handleEscapeKey() {
    // check if esc handling enabled for this condition, if not, quit
    if (
      !(
        condition.keyEscapeEnable &&
        condition.keyEscapeEnable.toLowerCase() === "true"
      )
    ) {
      return {
        skipTrial: false,
        skipBlock: false,
        quitSurvey: true,
      };
    }
    if (isProlificPreviewExperiment()) {
      // hide skipBlock Btn
      document.getElementById("skip-block-btn").style.visibility = "hidden";
    }
    let action = {
      skipTrial: false,
      skipBlock: false,
      quitSurvey: false,
    };
    const escapeKeyHandling = new Promise((resolve) => {
      // ! Maybe switch to import?
      // eslint-disable-next-line no-undef
      let dialog = new bootstrap.Modal(
        document.getElementById("exampleModal"),
        { backdrop: "static", keyboard: false }
      );
      document.getElementById("quit-btn").addEventListener("click", (event) => {
        event.preventDefault();
        action.quitSurvey = true;
        dialog.hide();
        resolve();
      });
      document
        .getElementById("skip-trial-btn")
        .addEventListener("click", (event) => {
          console.log("Skip Trial");
          event.preventDefault();
          skipTrialOrBlock.skipTrial = true;
          skipTrialOrBlock.trialId = currentTrialIndex;
          skipTrialOrBlock.blockId = currentBlockIndex;
          action.skipTrial = true;
          dialog.hide();
          console.log("Skip Trial Ends");
          resolve();
        });
      document
        .getElementById("skip-block-btn")
        .addEventListener("click", (event) => {
          console.log("Skip Block");
          event.preventDefault();
          skipTrialOrBlock.skipBlock = true;
          skipTrialOrBlock.blockId = currentBlockIndex;
          action.skipBlock = true;
          dialog.hide();
          console.log("Skip Block Ends");
          resolve();
        });
      dialog.show();
    });
    await escapeKeyHandling;
    // adding following lines to remove listeners
    document.getElementById("skip-trial-btn").outerHTML =
      document.getElementById("skip-trial-btn").outerHTML;
    document.getElementById("skip-block-btn").outerHTML =
      document.getElementById("skip-block-btn").outerHTML;
    document.getElementById("quit-btn").outerHTML =
      document.getElementById("quit-btn").outerHTML;
    return action;
  }
};

const isProlificPreviewExperiment = () => {
  let searchParams = window.location.search;
  return (
    searchParams.search("participant") != -1 &&
    searchParams.search("session") != -1 &&
    searchParams.search("study_id") != -1 &&
    searchParams.search("preview") != -1
  );
};

const afterExperimentEnds = () => {
  showExperimentEnding();
};
