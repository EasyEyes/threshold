/*****************
 * Crowding Test *
 *****************/

import { debug, sleep } from "./components/utils.js";

const useConsent = true;
const useRC = true;

import { core, data, util, visual } from "./psychojs/out/psychojs-2021.3.0.js";
const { PsychoJS, EventManager } = core;
const { TrialHandler, MultiStairHandler } = data;
const { Scheduler } = util;

////
import * as jsQUEST from "./addons/jsQUEST.module.js";

////
/* ------------------------------- Components ------------------------------- */

import { ParamReader } from "./parameters/paramReader.js";

import {
  logger,
  hideCursor,
  showCursor,
  shuffle,
  XYPixOfXYDeg,
  degreesToPixels,
  addConditionToData,
  addTrialStaircaseSummariesToData,
  addBlockStaircaseSummariesToData,
  spacingPixelsFromLevel,
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
  removeClickableAlphabet,
  setupClickableAlphabet,
} from "./components/showAlphabet.js";

import {
  getConsentFormName,
  hideAllForms,
  showConsentForm,
  showDebriefForm,
} from "./components/forms.js";

import { getTrialInfoStr } from "./components/trialCounter.js";

import {
  getTypographicHeight,
  awaitMaxPresentableLevel,
  getFlankerLocations,
  getLowerBoundedLevel,
} from "./components/bounding.js";

import { getGridLines, readGridParameter } from "./components/grid.js";
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
import { populateQuestDefaults } from "./components/data.js";

/* -------------------------------------------------------------------------- */

window.jsQUEST = jsQUEST;

var conditionTrials;
var levelLeft, levelRight;
let correctAns;

const rc = RemoteCalibrator;
rc.init();

// store info about the experiment session:
let expName = "Threshold"; // from the Builder filename that created this script
let expInfo = { participant: debug ? rc.id.value : "", session: "001" };

const fontsRequired = {};
var simulated;
var showGrid, gridVisible;
/* -------------------------------------------------------------------------- */

const paramReaderInitialized = async (reader) => {
  // show screens before actual experiment begins
  beforeExperimentBegins(reader);

  // ! Load fonts
  loadFonts(reader, fontsRequired);

  // ! Load recruitment service config
  loadRecruitmentServiceConfig();

  // ! Check if to use grids
  [showGrid, gridVisible] = readGridParameter(reader);

  // ! Simulate observer
  simulated = checkIfSimulated(reader);

  await sleep(500);

  // ! Remote Calibrator
  if (useRC && useCalibration(reader)) {
    rc.panel(formCalibrationList(reader), "#rc-panel", {}, () => {
      rc.removePanel();
      document.body.removeChild(document.querySelector("#rc-panel"));
      // ! Start actual experiment
      experiment(reader.blockCount);
    });
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

var trialInfoStr = "";
var totalTrial, // TextSim object
  totalTrialCount = 0;

var currentTrialIndex = 0;
var currentTrialLength = 0;
var currentBlockIndex = 0;
var totalBlockCount = 0;

var consentFormName = "";
var debriefFormName = "";

const beforeExperimentBegins = (reader) => {
  consentFormName = reader.read("_consentForm")[0];
  if (!(typeof consentFormName === "string" && consentFormName.length > 0))
    consentFormName = "";

  debriefFormName = paramReader.read("_debriefForm")[0];
  if (!(typeof debriefFormName === "string" && debriefFormName.length > 0))
    debriefFormName = "";

  if (consentFormName.length > 0) showConsentForm(consentFormName);

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

  /* --- GRIDS --- */
  if (showGrid) var grids;
  /* --- /GRIDS --- */

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
  var showAlphabet;

  var globalClock;
  var routineTimer, routineClock, blockClock;
  var initInstructionClock, eduInstructionClock, trialInstructionClock;
  async function experimentInit() {
    logger("Window (for grid purposes)", psychoJS.window);

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
      height: 1.0,
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

    showAlphabet = new visual.TextStim({
      win: psychoJS.window,
      name: "showAlphabet",
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

    instructions = new visual.TextStim({
      win: psychoJS.window,
      name: "instructions",
      text: "",
      font: instructionFont,
      units: "pix",
      pos: [-window.innerWidth * 0.4, window.innerHeight * 0.4],
      height: 30.0,
      wrapWidth: window.innerWidth * 0.8,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -12.0,
      alignHoriz: "left",
      alignVert: "top",
      isInstruction: true, // !
    });

    instructions2 = new visual.TextStim({
      win: psychoJS.window,
      name: "instructions2",
      text: "",
      font: instructionFont,
      units: "pix",
      pos: [-window.innerWidth * 0.4, -window.innerHeight * 0.4],
      height: 30.0,
      wrapWidth: window.innerWidth * 0.8,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -12.0,
      alignHoriz: "left",
      alignVert: "bottom",
      isInstruction: true, // !
    });

    /* --- BOUNDING BOX --- */
    targetBoundingPoly = new visual.Rect({
      win: psychoJS.window,
      name: "targetBoundingPoly",
      units: "pix",
      width: [1.0, 1.0][0],
      height: [1.0, 1.0][1],
      ori: 0.0,
      pos: [0, 0],
      lineWidth: 1.0,
      lineColor: new util.Color("blue"),
      // fillColor: new util.Color('pink'),
      fillColor: undefined,
      opacity: undefined,
      depth: -10,
      interpolate: true,
    });
    flanker1BoundingPoly = new visual.Rect({
      win: psychoJS.window,
      name: "flanker1BoundingPoly",
      units: "pix",
      width: [1.0, 1.0][0],
      height: [1.0, 1.0][1],
      ori: 0.0,
      pos: [0, 0],
      lineWidth: 1.0,
      lineColor: new util.Color("blue"),
      // fillColor: new util.Color('pink'),
      fillColor: undefined,
      opacity: undefined,
      depth: -10,
      interpolate: true,
    });
    flanker2BoundingPoly = new visual.Rect({
      win: psychoJS.window,
      name: "flanker2BoundingPoly",
      units: "pix",
      width: [1.0, 1.0][0],
      height: [1.0, 1.0][1],
      ori: 0.0,
      pos: [0, 0],
      lineWidth: 1.0,
      lineColor: new util.Color("blue"),
      // fillColor: new util.Color('pink'),
      fillColor: undefined,
      opacity: undefined,
      depth: -10,
      interpolate: true,
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
      trialsConditions = populateQuestDefaults(trialsConditions, paramReader);
      const nTrialsTotal = trialsConditions
        .map((c) => Number(paramReader.read("conditionTrials", c.label)))
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
      rc.resumeDistance();

      initInstructionClock.reset(); // clock
      TrialHandler.fromSnapshot(snapshot);

      const blockCount = snapshot.block + 1;

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
      }, 1000);

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
      rc.pauseDistance();

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

  function trialInstructionRoutineBegin(snapshot) {
    return async function () {
      trialInstructionClock.reset();
      TrialHandler.fromSnapshot(snapshot);

      for (let c of snapshot.handler.getConditions()) {
        if (c.label === trials._currentStaircase._name) {
          condition = c;
        }
      }
      const cName = condition["label"];

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

      _instructionSetup(
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

      psychoJS.eventManager.clearKeys();

      return Scheduler.Event.NEXT;
    };
  }

  function trialInstructionRoutineEachFrame() {
    return async function () {
      /* --- SIMULATED --- */
      if (simulated && simulated[thisLoopNumber]) return Scheduler.Event.NEXT;
      /* --- /SIMULATED --- */
      t = instructionsClock.getTime();
      frameN = frameN + 1;

      if (
        psychoJS.experiment.experimentEnded ||
        psychoJS.eventManager.getKeys({ keyList: ["escape"] }).length > 0
      ) {
        return quitPsychoJS("The [Escape] key was pressed. Goodbye!", false);
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

  var level;
  var windowWidthCm;
  var windowWidthPx;
  var pixPerCm;
  var viewingDistanceDesiredCm;
  var viewingDistanceCm;

  var fixationXYPx = [0, 0];
  var fixationSize = 45; // TODO Set on block begins
  var showFixation = true;

  var block;
  var spacingDirection;
  var targetFont;
  var targetAlphabet;
  var validAns;
  var showAlphabetWhere;
  var showAlphabetElement;
  var showCounterBool;
  var showViewingDistanceBool;
  const showAlphabetResponse = { current: null, onsetTime: 0, clickTime: 0 };
  var showBoundingBox;
  var targetDurationSec;
  var targetMinimumPix;
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
  function trialRoutineBegin(snapshot) {
    return async function () {
      // rc.pauseNudger();
      // await sleep(700);

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

      // let condition;
      const parametersToExcludeFromData = [];
      for (let c of snapshot.handler.getConditions()) {
        if (c.label === trials._currentStaircase._name) {
          condition = c;
          addConditionToData(
            psychoJS.experiment,
            condition,
            parametersToExcludeFromData
          );
        }
      }
      // logger("condition", condition);

      ////
      const cName = condition["label"];
      const reader = paramReader;
      ////

      let proposedLevel = currentLoop._currentStaircase.getQuestValue();
      logger("level from getQuestValue()", proposedLevel);

      psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);
      // TODO Find a real way of estimating the max size
      proposedLevel = Math.min(proposedLevel, 1.75);

      psychoJS.experiment.addData("levelRoughlyLimited", proposedLevel);
      psychoJS.experiment.addData("label", cName);
      psychoJS.experiment.addData(
        "flankerOrientation",
        reader.read("spacingDirection", cName)
      );
      psychoJS.experiment.addData(
        "targetFont",
        reader.read("targetFont", cName)
      );

      // TODO set QUEST
      // !
      // !

      //------Prepare to start Routine 'trial'-------
      t = 0;
      frameN = -1;
      continueRoutine = true; // until we're told otherwise
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

      // TODO
      // ! Very inefficient to read params very trial as they do not change in a block
      // ! Move this to a block-level routine and store the values

      fixationXYPx = [0, 0];

      block = condition["block"];

      // TODO check that we are actually trying to test for "spacing", not "size"

      spacingDirection = reader.read("spacingDirection", cName);
      let targetFontSource = reader.read("targetFontSource", cName);
      targetFont = reader.read("targetFont", cName);
      if (targetFontSource === "file") targetFont = cleanFontName(targetFont);

      targetAlphabet = String(reader.read("targetAlphabet", cName)).split("");
      validAns = String(reader.read("targetAlphabet", cName))
        .toLowerCase()
        .split("");

      showAlphabetWhere = reader.read("showAlphabetWhere", cName);
      showViewingDistanceBool = reader.read("showViewingDistanceBool", cName);
      showCounterBool = reader.read("showCounterBool", cName);

      conditionTrials = reader.read("conditionTrials", cName);
      targetDurationSec = reader.read("targetDurationSec", cName);

      fixationSize = 45; // TODO use .csv parameters, ie draw as 2 lines, not one letter
      showFixation = reader.read("markTheFixationBool", cName);

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

      var alphabet = targetAlphabet;
      /* ------------------------------ Pick triplets ----------------------------- */
      const tempAlphabet = shuffle(shuffle(alphabet));
      var firstFlankerCharacter = tempAlphabet[0];
      var targetCharacter = tempAlphabet[1];
      var secondFlankerCharacter = tempAlphabet[2];
      if (debug)
        console.log(
          `%c${firstFlankerCharacter} ${targetCharacter} ${secondFlankerCharacter}`,
          "color: red; font-size: 1.5rem"
        );
      correctAns = targetCharacter.toLowerCase();
      /* -------------------------------------------------------------------------- */

      var pos1XYDeg, pos1XYPx, targetEccentricityXYPx, pos3XYDeg, pos3XYPx;
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
        minimumHeight: targetMinimumPix,
        fontFamily: targetFont,
        window: psychoJS.window,
        spacingRelationToSize: spacingRelationToSize,
        targetEccentricityXYDeg: targetEccentricityXYDeg,
        spacingDirection: spacingDirection,
      };
      /* --- GRIDS --- */
      if (showGrid && !simulated) {
        grids = {
          deg: getGridLines(psychoJS.window, "deg", displayOptions),
          cm: getGridLines(psychoJS.window, "cm", displayOptions),
          pix: getGridLines(psychoJS.window, "pix", displayOptions),
        };
      }
      /* --- /GRIDS --- */

      const [targetXYPix] = XYPixOfXYDeg(
        [targetEccentricityXYDeg],
        displayOptions
      );

      // Fixation placement does not depend on the value of "spacingRelationToSize"...
      fixation.setPos(fixationXYPx);
      fixation.setHeight(fixationSize);
      // ... neither does target location...
      [targetEccentricityXYPx] = XYPixOfXYDeg(
        [targetEccentricityXYDeg],
        displayOptions
      );
      targetEccentricityXYPx = targetEccentricityXYPx.map((x) => Math.round(x));
      psychoJS.experiment.addData("targetLocationPix", targetEccentricityXYPx);
      target.setPos(targetEccentricityXYPx);
      target.setFont(targetFont);

      // ...but size, and content of the target(& flankers) does.
      psychoJS.experiment.addData(
        "spacingRelationToSize",
        spacingRelationToSize
      );
      if (spacingRelationToSize === "ratio") {
        // Get a usable "level", ie amount of spacing
        const upperBoundedLevel = await awaitMaxPresentableLevel(
          proposedLevel,
          targetXYPix,
          fixationXYPx,
          spacingDirection,
          displayOptions
        );
        level = getLowerBoundedLevel(upperBoundedLevel, displayOptions);
        psychoJS.experiment.addData("levelUsed", level);

        spacingDeg = Math.pow(10, level);
        psychoJS.experiment.addData("spacingDeg", spacingDeg);
        spacingPx = Math.abs(
          degreesToPixels(spacingDeg, {
            pixPerCm: pixPerCm,
            viewingDistanceCm: viewingDistanceCm,
          })
        );
        psychoJS.experiment.addData("spacingPix", spacingPx);
        // Get the location of the flankers
        [pos1XYDeg, pos3XYDeg] = getFlankerLocations(
          targetEccentricityXYDeg,
          fixationXYPx,
          spacingDirection,
          spacingDeg
        );
        psychoJS.experiment.addData("flankerLocationsDeg", [
          pos1XYDeg,
          pos3XYDeg,
        ]);
        // Convert flanker locations to pixels
        [pos1XYPx, pos3XYPx] = XYPixOfXYDeg(
          [pos1XYDeg, pos3XYDeg],
          displayOptions
        );
        // Round locations to the nearest pixel
        pos1XYPx = pos1XYPx.map((x) => Math.round(x));
        pos3XYPx = pos3XYPx.map((x) => Math.round(x));
        // Save flanker locations to output data
        psychoJS.experiment.addData("flankerLocationsPix", [
          pos1XYPx,
          pos3XYPx,
        ]);
        // Find the font size for the flankers & target
        const heightPx = Math.round(
          Math.max(spacingPx / spacingOverSizeRatio, targetMinimumPix)
        );
        if (heightPx < targetMinimumPix) {
          console.error(
            `Assumption broken! 
            Target height, in pixel, is falling below the minimum allowed, 
            even though it should have been previously constrained when we
            found the lower bound of \`level\``
          );
          let heightPx = Math.round(Math.max(heightPx, targetMinimumPix));
        }
        psychoJS.experiment.addData("heightPix", heightPx);
        // Display flankers, given that "spacingRelationToSize" is set to "ratio"
        target.setText(targetCharacter);
        target.setHeight(heightPx);
        flanker1.setPos(pos1XYPx);
        flanker1.setText(firstFlankerCharacter);
        flanker1.setFont(targetFont);
        flanker1.setHeight(heightPx);
        flanker2.setPos(pos3XYPx);
        flanker2.setText(secondFlankerCharacter);
        flanker2.setFont(targetFont);
        flanker2.setHeight(heightPx);
      } else if (spacingRelationToSize === "typographic") {
        // Don't display flankers if "spacingRelationToSize" is set to typographic...
        flanker1.setAutoDraw(false);
        flanker2.setAutoDraw(false);

        // ...include the flankers in the same string/stim as the target.
        // TODO ask denis whether there should be spaces between, or just the font spacing
        const flankersAndTargetString =
          firstFlankerCharacter + targetCharacter + secondFlankerCharacter;
        target.setText(flankersAndTargetString);

        // Find the font size for the string containing the flankers & target,
        // and the value of 'level' to which this acceptable size corresponds.
        const [targetStimHeight, viableLevel] = getTypographicHeight(
          psychoJS.window,
          proposedLevel,
          target,
          fixation,
          displayOptions
        );
        level = viableLevel;
        psychoJS.experiment.addData("levelUsed", level);

        target.setHeight(targetStimHeight);
        psychoJS.experiment.addData("heightPix", targetStimHeight);
      } else if (spacingRelationToSize == "none") {
        // TODO FUTURE implement spacingRelationToSize === "none"
        console.error(
          `spacingRelationToSize value "none" not yet supported. Please use "ratio" or "typographic" for the time being.`
        );
      } else {
        console.error(
          `spacingRelationToSize value ${spacingRelationToSize} not recognized. Please use "none", "ratio", or "typographic"`
        );
      }

      key_resp.keys = undefined;
      key_resp.rt = undefined;
      _key_resp_allKeys = [];
      ////

      showAlphabet.setPos([0, 0]);
      showAlphabet.setText("");
      // showAlphabet.setText(getAlphabetShowText(validAns))

      instructions.setText(
        instructionsText.trial.respond["spacing"](
          rc.language.value,
          responseType
        )
      );

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
      // totalTrialIndex = nextTrialInfo.trial;
      // totalBlockIndex = nextTrialInfo.block

      // keep track of which components have finished
      trialComponents = [];
      trialComponents.push(key_resp);
      trialComponents.push(fixation);
      trialComponents.push(flanker1);
      trialComponents.push(target);
      trialComponents.push(flanker2);

      trialComponents.push(showAlphabet);
      trialComponents.push(totalTrial);

      /* --- BOUNDING BOX --- */
      if (showBoundingBox) {
        trialComponents.push(targetBoundingPoly);
        if (spacingRelationToSize === "ratio") {
          trialComponents.push(flanker1BoundingPoly);
          trialComponents.push(flanker2BoundingPoly);
        }
      }
      /* --- /BOUNDING BOX --- */

      /* --- GRIDS --- */
      if (showGrid) {
        for (const gridType in grids) {
          grids[gridType].forEach((gridLineStim) => {
            gridLineStim.setAutoDraw(gridVisible[gridType]);
            trialComponents.push(gridLineStim);
          });
        }
      }
      /* --- /GRIDS --- */
      /* --- SIMULATED --- */
      if (simulated && simulated[block]) {
        if (!simulatedObserver[condition.label]) {
          simulatedObserver[condition.label] = new SimulatedObserver(
            simulated[block][condition.label],
            level,
            alphabet,
            targetCharacter,
            paramReader.read("thresholdProportionCorrect", condition.label),
            paramReader.read("simulationBeta", condition.label),
            paramReader.read("simulationDelta", condition.label),
            paramReader.read("simulationThreshold", condition.label)
          );
        } else {
          simulatedObserver[condition.label].updateTrial(
            level,
            alphabet,
            targetCharacter
          );
        }
      }
      /* --- /SIMULATED --- */

      for (const thisComponent of trialComponents)
        if ("status" in thisComponent)
          thisComponent.status = PsychoJS.Status.NOT_STARTED;

      // update trial index
      // totalTrialIndex = totalTrialIndex + 1;

      psychoJS.experiment.addData(
        "trialBeginDurationSec",
        trialClock.getTime()
      );
      return Scheduler.Event.NEXT;
    };
  }

  var frameRemains;
  function trialRoutineEachFrame() {
    return async function () {
      //------Loop for each frame of Routine 'trial'-------
      // get current time
      t = trialClock.getTime();
      frameN = frameN + 1; // number of completed frames (so 0 is the first frame)
      if (frameN === 0)
        psychoJS.experiment.addData(
          "clickToStimulusOnsetSec",
          routineClock.getTime()
        );
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
          simulated[thisLoopNumber][condition.label])
      ) {
        if (t >= uniDelay && key_resp.status === PsychoJS.Status.NOT_STARTED) {
          // keep track of start time/frame for later
          key_resp.tStart = t; // (not accounting for frame time here)
          key_resp.frameNStart = frameN; // exact frame index
          // TODO Use PsychoJS clock if possible
          // Reset together with PsychoJS
          showAlphabetResponse.onsetTime = performance.now();

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
            simulated[thisLoopNumber][condition.label]
          ) {
            return simulateObserverResponse(
              simulatedObserver[condition.label],
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

      // *showAlphabetResponse* updates
      if (showAlphabetResponse.current) {
        key_resp.keys = showAlphabetResponse.current;
        key_resp.rt =
          (showAlphabetResponse.clickTime - showAlphabetResponse.onsetTime) /
          1000;
        if (showAlphabetResponse.current == correctAns) {
          // Play correct audio
          correctSynth.play();
          key_resp.corr = 1;
        } else {
          // Play wrong audio
          key_resp.corr = 0;
        }
        showAlphabetResponse.current = null;
        removeClickableAlphabet();
        continueRoutine = false;
      }

      // *totalTrial* updates
      if (t >= 0.0 && totalTrial.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        totalTrial.tStart = t; // (not accounting for frame time here)
        totalTrial.frameNStart = frameN; // exact frame index

        totalTrial.setAutoDraw(true);
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
          targetBoundingPoly.setPos([
            tightBoundingBox.left,
            tightBoundingBox.top,
          ]);
          targetBoundingPoly.setSize([
            tightBoundingBox.width,
            tightBoundingBox.height,
          ]);

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

          const tightBoundingBox = flanker1.getBoundingBox(true);
          flanker1BoundingPoly.setPos([
            tightBoundingBox.left,
            tightBoundingBox.top,
          ]);
          flanker1BoundingPoly.setSize([
            tightBoundingBox.width,
            tightBoundingBox.height,
          ]);

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
        return quitPsychoJS("The [Escape] key was pressed. Goodbye!", false);
      }

      /* -------------------------------------------------------------------------- */
      // *showAlphabet* updates
      if (
        t >= uniDelay + targetDurationSec &&
        showAlphabet.status === PsychoJS.Status.NOT_STARTED
      ) {
        // keep track of start time/frame for later
        showAlphabet.tStart = t; // (not accounting for frame time here)
        showAlphabet.frameNStart = frameN; // exact frame index
        showAlphabet.setAutoDraw(true);
        showAlphabetElement = setupClickableAlphabet(
          targetAlphabet,
          targetFont,
          showAlphabetWhere,
          showAlphabetResponse
        );

        instructions.tSTart = t;
        instructions.frameNStart = frameN;
        instructions.setAutoDraw(true);
      }
      /* -------------------------------------------------------------------------- */
      // *grids* updates
      if (showGrid) {
        for (const gridType in grids) {
          grids[gridType].forEach((gridLineStim) => {
            if (t >= uniDelay) {
              // keep track of start time/frame for later
              gridLineStim.tStart = t; // (not accounting for frame time here)
              gridLineStim.frameNStart = frameN; // exact frame index
              gridLineStim.setAutoDraw(gridVisible[gridType]);
            }
          });
        }
      }

      // check if the Routine should terminate
      if (!continueRoutine) {
        // a component has requested a forced-end of Routine
        removeClickableAlphabet();
        if (showGrid) {
          for (const gridType in grids) {
            grids[gridType].forEach((gridLineStim) => {
              gridLineStim.setAutoDraw(false);
            });
          }
        }
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
      if (currentLoop instanceof MultiStairHandler) {
        currentLoop.addResponse(key_resp.corr, level);
        logger("level passed to addResponse", level);
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

      return Scheduler.Event.NEXT;
    };
  }

  function endLoopIteration(scheduler, snapshot) {
    // ------Prepare for next entry------
    return async function () {
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
      psychoJS.importAttributes(currentLoop.getCurrentTrial());
      return Scheduler.Event.NEXT;
    };
  }

  async function quitPsychoJS(message, isCompleted) {
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
};

const afterExperimentEnds = () => {
  showExperimentEnding();
};
