/*****************
 * Crowding Test *
 *****************/

const debug = true;

const useConsent = !debug;
const useRC = !debug;

import { core, data, util, visual } from "./psychojs/out/psychojs-2021.3.0.js";
const { PsychoJS } = core;
const { TrialHandler, MultiStairHandler } = data;
const { Scheduler } = util;

////
import * as jsQUEST from "./addons/jsQUEST.module.js";

////
/* ------------------------------- Components ------------------------------- */

import {
  hideCursor,
  showCursor,
  shuffle,
  XYPixOfXYDeg,
  degreesToPixels,
  addConditionToData,
  spacingPixelsFromLevel,
} from "./components/utils.js";

import { buildSwitch, removeSwitch } from "./components/i18n.js";

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
import { hideConsentForm, showConsentForm } from "./components/consent.js";
import { getTrialInfoStr } from "./components/trialCounter.js";
import {
  getTypographicHeight,
  awaitMaxPresentableLevel,
  getFlankerLocations,
} from "./components/bounding.js";

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

////
// blockCount is just a file telling the program how many blocks in total
Papa.parse("conditions/blockCount.csv", {
  download: true,
  complete: function (results) {
    const blockCount = results.data.length - 2; // TODO Make this calculation robust
    loadBlockFiles(blockCount, () => {
      if (useRC) {
        buildSwitch(rc);
        rc.panel(
          [
            {
              name: "screenSize",
            },
            {
              name: "trackDistance",
              options: {
                nearPoint: false,
                showVideo: false,
              },
            },
          ],
          "#rc-panel",
          {},
          () => {
            removeSwitch();
            rc.removePanel();
            document.body.removeChild(document.querySelector("#rc-panel"));
            // ! Start actual experiment
            experiment(blockCount);
          }
        );
      } else {
        // NO RC
        document.body.removeChild(document.querySelector("#rc-panel"));
        experiment(blockCount);
      }
    });
  },
});

const blockFiles = {};

const loadBlockFiles = (count, callback) => {
  if (count === 0) {
    callback();
    return;
  }
  Papa.parse(`conditions/block_${count}.csv`, {
    download: true,
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    complete: function (results) {
      blockFiles[count] = results.data;
      if (debug) console.log("Block " + count + ": ", results.data);

      Object.values(results.data).forEach((row) => {
        let fontFamily = row["targetFont"];
        let fontTestString = "12px " + fontFamily;
        let fontPath = "fonts/" + fontFamily + ".woff2";
        if (debug) console.log("fontTestString: ", fontTestString);
        fontsRequired[fontFamily] = fontPath;

        // let response = fetch(fontPath).then((response) => {
        //   if (response.ok) {
        //     // let f = new FontFace(fontFamily, `url(${response.url})`);
        //     // f.load()
        //     //   .then((loadedFontFace) => {
        //     //     document.fonts.add(loadedFontFace);
        //     //   })
        //     //   .catch((err) => {
        //     //     console.error(err);
        //     //   });

        //   } else {
        //     console.log(
        //       "Does the browser consider this font supported?",
        //       document.fonts.check(fontTestString)
        //     );
        //     console.log(
        //       "Uh oh, unable to find the font file for: " +
        //         fontFamily +
        //         "\n" +
        //         "If this font is already supported by the browser then it should display correctly. " +
        //         "\n" +
        //         "If not, however, a different fallback font will be chosen by the browser, and your stimulus will not be displayed as intended. " +
        //         "\n" +
        //         "Please verify for yourself that " +
        //         fontFamily +
        //         " is being correctly represented in your experiment."
        //     );
        //   }
        // });
      });

      loadBlockFiles(count - 1, callback);
    },
  });
};

var totalTrialConfig = {
  initialVal: 0,
  fontSize: 20,
  x: window.innerWidth / 2,
  y: -window.innerHeight / 2,
  fontName: "Arial",
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

const experiment = (blockCount) => {
  ////
  // Resources
  const _resources = [];
  for (let i = 1; i <= blockCount; i++) {
    _resources.push({
      name: `conditions/block_${i}.csv`,
      path: `conditions/block_${i}.csv`,
    });
  }
  if (debug) console.log("fontsRequired: ", fontsRequired);

  for (let i in fontsRequired) {
    if (debug) console.log(i, fontsRequired[i]);
    _resources.push({ name: i, path: fontsRequired[i] });
  }

  // Start code blocks for 'Before Experiment'
  // init psychoJS:
  const psychoJS = new PsychoJS({
    debug: debug,
  });

  /* ---------------------------------- Sound --------------------------------- */
  const correctSynth = getCorrectSynth(psychoJS);
  const wrongSynth = getWrongSynth(psychoJS);
  const purrSynth = getPurrSynth(psychoJS);

  // open window:
  psychoJS.openWindow({
    fullscr: !debug,
    color: new util.Color([0.9, 0.9, 0.9]),
    units: "height", // TODO change to pix
    waitBlanking: true,
  });

  // schedule the experiment:
  psychoJS.schedule(
    psychoJS.gui.DlgFromDict({
      dictionary: expInfo,
      title: expName,
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
  if (useConsent) {
    flowScheduler.add(consentRoutineBegin());
    flowScheduler.add(consentRoutineEachFrame());
    flowScheduler.add(consentRoutineEnd());
  }
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
  flowScheduler.add(quitPsychoJS, "", true);

  // quit if user presses Cancel in dialog box:
  dialogCancelScheduler.add(quitPsychoJS, "", false);

  if (useRC) {
    expInfo["participant"] = rc.id.value;
  }

  if (debug) console.log("_resources: ", _resources);
  psychoJS.start({
    expName: expName,
    expInfo: expInfo,
    resources: [
      { name: "conditions/blockCount.csv", path: "conditions/blockCount.csv" },
      ..._resources,
    ],
  });

  psychoJS.experimentLogger.setLevel(core.Logger.ServerLevel.EXP);

  // var frameDur;
  async function updateInfo() {
    expInfo["date"] = util.MonotonicClock.getDateStr(); // add a simple timestamp
    expInfo["expName"] = expName;
    expInfo["psychopyVersion"] = "2021.3.1";
    expInfo["OS"] = rc.systemFamily.value;

    // store frame rate of monitor if we can measure it successfully
    expInfo["frameRate"] = psychoJS.window.getActualFrameRate();
    // if (typeof expInfo["frameRate"] !== "undefined")
    //   frameDur = 1.0 / Math.round(expInfo["frameRate"]);
    // else frameDur = 1.0 / 60.0; // couldn't get a reliable measure so guess

    // add info from the URL:
    util.addInfoFromUrl(expInfo);

    return Scheduler.Event.NEXT;
  }

  var consentClock;
  var consent_form_content;
  var consent_button_yes;
  var consent_button_no;

  var fileClock;
  var filterClock;
  var instructionsClock;

  var thisLoopNumber; // ! BLOCK COUNTER
  var thisConditionsFile;
  var trialClock;
  // var targetBoundingPoly; // Target Bounding Box
  var instructions;
  var instructions2;
  var key_resp;
  var fixation; ////
  var flanker1;
  var target;
  var flanker2;
  var showAlphabet;

  var globalClock;
  var routineTimer;
  async function experimentInit() {
    // Initialize components for Routine "consent"
    consentClock = new util.Clock();
    consent_form_content = new visual.TextStim({
      win: psychoJS.window,
      name: "consent_form_content",
      text: "I agree to participate in this study (indicate by clicking one option).",
      font: "Open Sans",
      units: undefined,
      pos: [0, -0.35],
      height: 0.03,
      wrapWidth: undefined,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: undefined,
      depth: 0.0,
    });
    consent_button_yes = new visual.ButtonStim({
      win: psychoJS.window,
      name: "consent_button_yes",
      text: "Yes.",
      pos: [0.0, -0.41],
      letterHeight: 0.02,
      size: null,
    });
    consent_button_yes.clock = new util.Clock();

    consent_button_no = new visual.ButtonStim({
      win: psychoJS.window,
      name: "consent_button_no",
      text: "No. (You will leave the study without receiving payment.)",
      pos: [0.0, -0.46],
      letterHeight: 0.02,
      size: [5, 2],
    });
    consent_button_no.clock = new util.Clock();

    // Initialize components for Routine "file"
    fileClock = new util.Clock();
    // Initialize components for Routine "filter"
    filterClock = new util.Clock();
    instructionsClock = new util.Clock();

    thisLoopNumber = 0;
    thisConditionsFile = "./conditions/block_1.csv";

    // Initialize components for Routine "trial"
    trialClock = new util.Clock();

    // Target Bounding Box
    // targetBoundingPoly = new visual.Rect ({
    //   win: psychoJS.window, name: 'targetBoundingPoly', units : 'pix',
    //   width: [1.0, 1.0][0], height: [1.0, 1.0][1],
    //   ori: 0.0, pos: [0, 0],
    //   lineWidth: 1.0, lineColor: new util.Color('pink'),
    //   // fillColor: new util.Color('pink'),
    //   fillColor: undefined,
    //   opacity: undefined, depth: -10, interpolate: true,
    // });

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
      font: totalTrialConfig.fontName,
      units: "pix",
      pos: [totalTrialConfig.x, totalTrialConfig.y],
      alignHoriz: totalTrialConfig.alignHoriz,
      alignVert: totalTrialConfig.alignVert,
      height: 1.0,
      wrapWidth: undefined,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -20.0,
    });

    instructions = new visual.TextStim({
      win: psychoJS.window,
      name: "instructions",
      text: "",
      font: "Arial",
      units: "pix",
      pos: [-window.innerWidth * 0.4, window.innerHeight * 0.4],
      height: 32.0,
      wrapWidth: window.innerWidth * 0.8,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -12.0,
      alignHoriz: "left",
      alignVert: "top",
    });

    instructions2 = new visual.TextStim({
      win: psychoJS.window,
      name: "instructions2",
      text: "",
      font: "Arial",
      units: "pix",
      pos: [-window.innerWidth * 0.4, -window.innerHeight * 0.4],
      height: 32.0,
      wrapWidth: window.innerWidth * 0.8,
      ori: 0.0,
      color: new util.Color("black"),
      opacity: 1.0,
      depth: -12.0,
      alignHoriz: "left",
      alignVert: "bottom",
    });

    // Create some handy timers
    globalClock = new util.Clock(); // to track the time since experiment started
    routineTimer = new util.CountdownTimer(); // to track time remaining of each (non-slip) routine

    return Scheduler.Event.NEXT;
  }

  var t;
  var frameN;
  var continueRoutine;
  var fileComponents;

  var clickedContinue;

  // TODO Read from config
  var responseType = 2;

  var continueRoutine;
  var consentComponents;
  var frameRemains;

  function consentRoutineBegin(snapshot) {
    return async function () {
      TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

      //------Prepare to start Routine 'consent'-------
      t = 0;
      consentClock.reset(); // clock
      frameN = -1;
      continueRoutine = true; // until we're told otherwise
      // routineTimer.add(5.000000);

      consent_button_yes.setSize([0.25, 1]);
      consent_button_no.setSize([0.6, 1]);

      // update component parameters for each repeat
      // keep track of which components have finished
      consentComponents = [];
      consentComponents.push(consent_form_content);
      consentComponents.push(consent_button_yes);
      consentComponents.push(consent_button_no);

      showConsentForm();

      for (const thisComponent of consentComponents)
        if ("status" in thisComponent)
          thisComponent.status = PsychoJS.Status.NOT_STARTED;
      return Scheduler.Event.NEXT;
    };
  }

  function consentRoutineEachFrame() {
    return async function () {
      //------Loop for each frame of Routine 'consent'-------
      // get current time
      t = consentClock.getTime();
      frameN = frameN + 1; // number of completed frames (so 0 is the first frame)
      // update/draw components on each frame

      // *consent_form_content* updates
      if (
        t >= 0.0 &&
        consent_form_content.status === PsychoJS.Status.NOT_STARTED
      ) {
        // keep track of start time/frame for later
        consent_form_content.tStart = t; // (not accounting for frame time here)
        consent_form_content.frameNStart = frameN; // exact frame index

        consent_form_content.setAutoDraw(true);
      }

      // *consent_button_yes* updates
      if (t >= 0 && consent_button_yes.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        consent_button_yes.tStart = t; // (not accounting for frame time here)
        consent_button_yes.frameNStart = frameN; // exact frame index

        consent_button_yes.setAutoDraw(true);
      }

      if (consent_button_yes.status === PsychoJS.Status.STARTED) {
        // check whether consent_button_yes has been pressed
        if (consent_button_yes.isClicked) {
          if (!consent_button_yes.wasClicked) {
            // store time of first click
            consent_button_yes.timesOn.push(consent_button_yes.clock.getTime());
            // store time clicked until
            consent_button_yes.timesOff.push(
              consent_button_yes.clock.getTime()
            );
          } else {
            // update time clicked until;
            consent_button_yes.timesOff[
              consent_button_yes.timesOff.length - 1
            ] = consent_button_yes.clock.getTime();
          }
          if (!consent_button_yes.wasClicked) {
            // end routine when consent_button_yes is clicked
            continueRoutine = false;
            null;
          }
          // if consent_button_yes is still clicked next frame, it is not a new click
          consent_button_yes.wasClicked = true;
        } else {
          // if consent_button_yes is clicked next frame, it is a new click
          consent_button_yes.wasClicked = false;
        }
      } else {
        // keep clock at 0 if consent_button_yes hasn't started / has finished
        consent_button_yes.clock.reset();
        // if consent_button_yes is clicked next frame, it is a new click
        consent_button_yes.wasClicked = false;
      }

      // *consent_button_no* updates
      if (t >= 0 && consent_button_no.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        consent_button_no.tStart = t; // (not accounting for frame time here)
        consent_button_no.frameNStart = frameN; // exact frame index

        consent_button_no.setAutoDraw(true);
      }

      if (consent_button_no.status === PsychoJS.Status.STARTED) {
        // check whether consent_button_no has been pressed
        if (consent_button_no.isClicked) {
          if (!consent_button_no.wasClicked) {
            // store time of first click
            consent_button_no.timesOn.push(consent_button_no.clock.getTime());
            // store time clicked until
            consent_button_no.timesOff.push(consent_button_no.clock.getTime());
          } else {
            // update time clicked until;
            consent_button_no.timesOff[consent_button_no.timesOff.length - 1] =
              consent_button_no.clock.getTime();
          }
          if (!consent_button_no.wasClicked) {
            // end routine when consent_button_no is clicked
            continueRoutine = false;

            // quite experiment
            quitPsychoJS();
            null;
          }
          // if consent_button_no is still clicked next frame, it is not a new click
          consent_button_no.wasClicked = true;
        } else {
          // if consent_button_no is clicked next frame, it is a new click
          consent_button_no.wasClicked = false;
        }
      } else {
        // keep clock at 0 if consent_button_no hasn't started / has finished
        consent_button_no.clock.reset();
        // if consent_button_no is clicked next frame, it is a new click
        consent_button_no.wasClicked = false;
      }
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
      for (const thisComponent of consentComponents)
        if (
          "status" in thisComponent &&
          thisComponent.status !== PsychoJS.Status.FINISHED
        ) {
          continueRoutine = true;
          break;
        }

      // check if the Routine should terminate
      if (!continueRoutine) {
        // end routine
        return Scheduler.Event.NEXT;
      } else {
        // stay on this routine
        return Scheduler.Event.FLIP_REPEAT;
      }
    };
  }

  function consentRoutineEnd() {
    return async function () {
      //------Ending Routine 'consent'-------
      for (const thisComponent of consentComponents) {
        if (typeof thisComponent.setAutoDraw === "function") {
          thisComponent.setAutoDraw(false);
        }
      }
      hideConsentForm();
      return Scheduler.Event.NEXT;
    };
  }

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
    if (psychoJS.eventManager.getKeys({ keyList: ["return"] }).length > 0) {
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
    routineTimer.reset();

    document.removeEventListener("click", _clickContinue);
    document.removeEventListener("touchend", _clickContinue);

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
      trials = new data.MultiStairHandler({
        stairType: MultiStairHandler.StaircaseType.QUEST,
        psychoJS: psychoJS,
        name: "trials",
        varName: "trialsVal",
        nTrials: conditionTrials * trialsConditions.length, // TODO Handle unbalanced trials per condition
        conditions: trialsConditions,
        method: TrialHandler.Method.FULLRANDOM,
      });

      trialInfoStr = getTrialInfoStr(
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
    psychoJS.experiment.addData(
      "staircaseName",
      currentLoop._currentStaircase._name
    );
    psychoJS.experiment.addData(
      "questMeanAtEndOfTrialsLoop",
      currentLoop._currentStaircase.mean()
    );
    psychoJS.experiment.addData(
      "questSDAtEndOfTrialsLoop",
      currentLoop._currentStaircase.sd()
    );
    psychoJS.experiment.addData(
      "questQuantileOfQuantileOrderAtEndOfTrialsLoop",
      currentLoop._currentStaircase.quantile(
        currentLoop._currentStaircase._jsQuest.quantileOrder
      )
    );
    // terminate loop
    psychoJS.experiment.removeLoop(trials);
    return Scheduler.Event.NEXT;
  }

  async function blocksLoopEnd() {
    psychoJS.experiment.removeLoop(blocks);

    return Scheduler.Event.NEXT;
  }

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

      const possibleTrials = [];
      const thisBlockFileData = blockFiles[thisLoopNumber];

      if (debug) console.log("thisBlockFileData: ", thisBlockFileData);

      for (let rowKey in thisBlockFileData) {
        let rowIndex = parseInt(rowKey);
        if (Object.keys(thisBlockFileData[rowIndex]).length > 1) {
          if (debug)
            console.log(
              "condition trials this row of block: ",
              parseInt(thisBlockFileData[rowIndex]["conditionTrials"])
            );
          possibleTrials.push(
            parseInt(thisBlockFileData[rowIndex]["conditionTrials"])
          );
        }
      }
      if (debug) console.log("possibleTrials: ", possibleTrials);
      totalTrialCount = possibleTrials.reduce((a, b) => a + b, 0); // sum of possible trials

      // TODO Remove this constraint to allow different # of trials for each condition
      if (!possibleTrials.every((a) => a === possibleTrials[0]))
        throw "Number of trials for each condition within one block has to be equal. (Will be updated soon.)";

      conditionTrials = possibleTrials[0];

      // keep track of which components have finished
      filterComponents = [];

      for (const thisComponent of filterComponents)
        if ("status" in thisComponent)
          thisComponent.status = PsychoJS.Status.NOT_STARTED;
      return Scheduler.Event.NEXT;
    };
  }

  function filterRoutineEachFrame() {
    return async function () {
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

      return Scheduler.Event.NEXT;
    };
  }

  /* ------------------------- Block Init Instructions ------------------------ */

  function initInstructionRoutineBegin(snapshot) {
    return async function () {
      TrialHandler.fromSnapshot(snapshot);
      _instructionSetup(
        (snapshot.block === 0
          ? instructionsText.initial(expInfo.participant)
          : "") +
          instructionsText.initialByThresholdParameter["spacing"](
            responseType,
            totalTrialCount
          ) +
          instructionsText.initialEnd(responseType)
      );

      clickedContinue = false;
      setTimeout(() => {
        document.addEventListener("click", _clickContinue);
        document.addEventListener("touchend", _clickContinue);
      }, 1000);

      _beepButton = addBeepButton(correctSynth);

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
      routineTimer.reset();

      document.removeEventListener("click", _clickContinue);
      document.removeEventListener("touchend", _clickContinue);

      removeBeepButton(_beepButton);

      return Scheduler.Event.NEXT;
    };
  }

  /* ------------------------- Block Edu Instructions ------------------------- */

  function eduInstructionRoutineBegin(snapshot) {
    return async function () {
      TrialHandler.fromSnapshot(snapshot);
      _instructionSetup(instructionsText.edu());

      instructions2.setText(instructionsText.eduBelow(responseType));
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
      const D = 300;
      const g = 50;

      target.setPos([D, 0]);
      target.setText("R");
      target.setHeight(h);
      flanker1.setPos([D - g, 0]);
      flanker1.setText("H");
      flanker1.setHeight(h);
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
      instructions.setAutoDraw(false);
      routineTimer.reset();

      document.removeEventListener("click", _clickContinue);
      document.removeEventListener("touchend", _clickContinue);

      target.setAutoDraw(false);
      flanker1.setAutoDraw(false);
      flanker2.setAutoDraw(false);

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
      TrialHandler.fromSnapshot(snapshot);

      // update trial/block count
      currentTrialIndex = snapshot.thisN + 1;
      currentTrialLength = snapshot.nTotal;
      trialInfoStr = getTrialInfoStr(
        showCounterBool,
        showViewingDistanceBool,
        currentTrialIndex,
        currentTrialLength,
        currentBlockIndex,
        totalBlockCount,
        viewingDistanceCm
      );
      totalTrial.setText(trialInfoStr);
      totalTrial.setFont(totalTrialConfig.fontName);
      totalTrial.setHeight(totalTrialConfig.fontSize);
      totalTrial.setPos([window.innerWidth / 2, -window.innerHeight / 2]);
      totalTrial.setAutoDraw(true);

      _instructionSetup(instructionsText.trial.fixate["spacing"](responseType));

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
      if (psychoJS.eventManager.getKeys({ keyList: ["space"] }).length > 0) {
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
      routineTimer.reset();
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
  var targetDurationSec;
  var targetMinimumPix;
  var spacingOverSizeRatio;
  var spacingRelationToSize;
  var targetEccentricityXDeg;
  var targetEccentricityYDeg;
  var targetEccentricityXYDeg;
  var trackGazeYes;
  var trackHeadYes;
  var wirelessKeyboardNeededYes;

  var _key_resp_allKeys;
  var trialComponents;

  function trialRoutineBegin(snapshot) {
    return async function () {
      TrialHandler.fromSnapshot(snapshot); // ensure that .thisN vals are up to date

      hideCursor();

      ////
      if (debug)
        console.log(
          `Level: ${snapshot.getCurrentTrial().trialsVal}, Index: ${
            snapshot.thisIndex
          }`
        );

      let condition;
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
      if (debug) console.log("condition: ", condition);

      let proposedLevel = currentLoop._currentStaircase.getQuestValue();
      if (debug) console.log("level from getQuestValue(): ", proposedLevel);

      psychoJS.experiment.addData("levelProposedByQUEST", proposedLevel);
      // TODO Find a real way of estimating the max size
      proposedLevel = Math.min(proposedLevel, 1.75);

      psychoJS.experiment.addData("levelRoughlyLimited", proposedLevel);
      psychoJS.experiment.addData("conditionName", condition["label"]);
      psychoJS.experiment.addData(
        "flankerOrientation",
        condition["spacingDirection"]
      );
      psychoJS.experiment.addData("targetFont", condition["targetFont"]);
      // TODO add a data field that is unique to this staircase (ie differentiate staircases within the same block, if they have equivalent parameters)

      // TODO set QUEST
      // !
      // !

      //------Prepare to start Routine 'trial'-------
      t = 0;
      trialClock.reset(); // clock
      frameN = -1;
      continueRoutine = true; // until we're told otherwise
      // update component parameters for each repeat
      windowWidthCm = rc.screenWidthCm ? rc.screenWidthCm.value : 30;
      windowWidthPx = rc.displayWidthPx.value;
      pixPerCm = windowWidthPx / windowWidthCm;
      if (!rc.screenWidthCm)
        console.warn("[Screen Width] Using arbitrary screen width. Enable RC.");

      viewingDistanceDesiredCm = condition["viewingDistanceDesiredCm"];
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

      spacingDirection = condition["spacingDirection"];
      targetFont = condition["targetFont"];

      targetAlphabet = String(condition["targetAlphabet"]).split("");
      validAns = String(condition["targetAlphabet"]).toLowerCase().split("");

      showAlphabetWhere = condition["showAlphabetWhere"] || "bottom";
      showViewingDistanceBool =
        condition["showViewingDistanceBool"] !== "FALSE";
      showCounterBool = condition["showCounterBool"] !== "FALSE";

      conditionTrials = condition["conditionTrials"];
      targetDurationSec = condition["targetDurationSec"];

      fixationSize = 45; // TODO use .csv parameters, ie draw as 2 lines, not one letter
      showFixation = condition["markTheFixationBool"] === "True";

      targetMinimumPix = condition["targetMinimumPix"];
      spacingOverSizeRatio = condition["spacingOverSizeRatio"];
      spacingRelationToSize = condition["spacingRelationToSize"] || "ratio";
      if (debug) console.log("spacingRelationToSize: ", spacingRelationToSize);

      targetEccentricityXDeg = condition["targetEccentricityXDeg"];
      psychoJS.experiment.addData(
        "targetEccentricityXDeg",
        targetEccentricityXDeg
      );
      targetEccentricityYDeg = condition["targetEccentricityYDeg"];
      psychoJS.experiment.addData(
        "targetEccentricityYDeg",
        targetEccentricityYDeg
      );
      targetEccentricityXYDeg = [
        targetEccentricityXDeg,
        targetEccentricityYDeg,
      ];
      if (debug)
        console.log("targetEccentricityXYDeg: ", targetEccentricityXYDeg);

      trackGazeYes = condition["trackGazeYes"] === "True";
      trackHeadYes = condition["trackHeadYes"] === "True";
      wirelessKeyboardNeededYes =
        condition["wirelessKeyboardNeededYes"] === "True";

      var alphabet = targetAlphabet;
      /* ------------------------------ Pick triplets ----------------------------- */
      const tempAlphabet = shuffle(shuffle(alphabet));
      var firstFlankerCharacter = tempAlphabet[0];
      var targetCharacter = tempAlphabet[1];
      var secondFlankerCharacter = tempAlphabet[2];
      if (debug)
        console.log(
          firstFlankerCharacter,
          targetCharacter,
          secondFlankerCharacter
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
        spacingOverSizeRatio: spacingOverSizeRatio,
        minimumHeight: targetMinimumPix,
        fontFamily: targetFont,
        window: psychoJS.window,
        spacingRelationToSize: spacingRelationToSize,
      };
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
        level = await awaitMaxPresentableLevel(
          proposedLevel,
          targetXYPix,
          fixationXYPx,
          spacingDirection,
          displayOptions
        );
        psychoJS.experiment.addData("levelUsed", level);
        if (debug) console.log("New level: ", level);

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
        instructionsText.trial.respond["spacing"](responseType)
      );

      trialInfoStr = getTrialInfoStr(
        showCounterBool,
        showViewingDistanceBool,
        currentTrialIndex,
        currentTrialLength,
        currentBlockIndex,
        totalBlockCount,
        viewingDistanceCm
      );
      totalTrial.setText(trialInfoStr);
      totalTrial.setFont(totalTrialConfig.fontName);
      totalTrial.setHeight(totalTrialConfig.fontSize);
      totalTrial.setPos([window.innerWidth / 2, -window.innerHeight / 2]);
      // totalTrialIndex = nextTrialInfo.trial;
      // totalBlockIndex = nextTrialInfo.block

      // keep track of which components have finished
      trialComponents = [];
      trialComponents.push(key_resp);
      // trialComponents.push(targetBoundingPoly); // Target Bounding Box
      trialComponents.push(fixation);
      trialComponents.push(flanker1);
      trialComponents.push(target);
      trialComponents.push(flanker2);

      trialComponents.push(showAlphabet);
      trialComponents.push(totalTrial);

      for (const thisComponent of trialComponents)
        if ("status" in thisComponent)
          thisComponent.status = PsychoJS.Status.NOT_STARTED;

      // update trial index
      // totalTrialIndex = totalTrialIndex + 1;

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
      // update/draw components on each frame

      // Target Bounding Box
      // // *targetBoundingPoly* updates
      // if (t >= 0.0 && targetBoundingPoly.status === PsychoJS.Status.NOT_STARTED) {
      //   // keep track of start time/frame for later
      //   targetBoundingPoly.tStart = t;  // (not accounting for frame time here)
      //   targetBoundingPoly.frameNStart = frameN;  // exact frame index

      //   targetBoundingPoly.setAutoDraw(true);
      // }

      // if (targetBoundingPoly.status === PsychoJS.Status.STARTED){ // only update if being drawn
      //   const tightBoundingBox = target.getBoundingBox(true);
      //   targetBoundingPoly.setPos([tightBoundingBox.left, tightBoundingBox.top]);
      //   targetBoundingPoly.setSize([tightBoundingBox.width, tightBoundingBox.height]);
      // }

      const uniDelay = 0.5;

      // *key_resp* updates
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
        let theseKeys = key_resp.getKeys({
          keyList: validAns,
          waitRelease: false,
        });
        _key_resp_allKeys = _key_resp_allKeys.concat(theseKeys);
        if (_key_resp_allKeys.length > 0) {
          key_resp.keys = _key_resp_allKeys[_key_resp_allKeys.length - 1].name; // just the last key pressed
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

      frameRemains =
        uniDelay +
        targetDurationSec -
        psychoJS.window.monitorFramePeriod * 0.75; // most of one frame period left
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

      frameRemains =
        uniDelay +
        targetDurationSec -
        psychoJS.window.monitorFramePeriod * 0.75; // most of one frame period left
      if (flanker2.status === PsychoJS.Status.STARTED && t >= frameRemains) {
        flanker2.setAutoDraw(false);
      }

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

      // check if the Routine should terminate
      if (!continueRoutine) {
        // a component has requested a forced-end of Routine
        removeClickableAlphabet();
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
        if (debug) console.log("level passed to addResponse: ", level);
      }
      psychoJS.experiment.addData("key_resp.keys", key_resp.keys);
      psychoJS.experiment.addData("key_resp.corr", key_resp.corr);
      if (typeof key_resp.keys !== "undefined") {
        // we had a response
        psychoJS.experiment.addData("key_resp.rt", key_resp.rt);
        routineTimer.reset();
      }

      key_resp.stop();
      // the Routine "trial" was not non-slip safe, so reset the non-slip timer
      routineTimer.reset();

      psychoJS.experiment.addData(
        "staircaseName",
        currentLoop._currentStaircase._name
      );
      psychoJS.experiment.addData(
        "questMeanAtEndOfTrial",
        currentLoop._currentStaircase.mean()
      );
      psychoJS.experiment.addData(
        "questSDAtEndOfTrial",
        currentLoop._currentStaircase.sd()
      );
      psychoJS.experiment.addData(
        "questQuantileOfQuantileOrderAtEndOfTrial",
        currentLoop._currentStaircase.quantile(
          currentLoop._currentStaircase._jsQuest.quantileOrder
        )
      );

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
    // Check for and save orphaned data
    if (psychoJS.experiment.isEntryEmpty()) {
      psychoJS.experiment.nextEntry();
    }

    psychoJS.window.close();
    psychoJS.quit({ message: message, isCompleted: isCompleted });

    return Scheduler.Event.QUIT;
  }
};
