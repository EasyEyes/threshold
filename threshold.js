/*****************
 * Crowding Test *
 *****************/

const debug = true

import { core, data, util, visual } from "./psychojs/out/psychojs-2021.3.0.js";
const { PsychoJS } = core;
const { TrialHandler, MultiStairHandler } = data;
const { Scheduler } = util;

// Some handy aliases as in the psychopy scripts;
const { abs, sin, cos, PI: pi, sqrt } = Math;
const { round } = util;

////
import * as jsQUEST from "./lib/jsQUEST.module.js";

////
/* ------------------------------- Components ------------------------------- */

import { shuffle } from "./components/utils.js";
import { getCorrectSynth, getPurrSynth } from './components/sound.js';
import { removeClickableAlphabet, setupClickableAlphabet } from "./components/showAlphabet.js";

/* -------------------------------------------------------------------------- */

window.jsQUEST = jsQUEST;

var conditionTrials;
var levelLeft, levelRight;
let correctAns;

// For development purposes, toggle RC off for testing speed
const useRC = !debug;
const rc = RemoteCalibrator;
rc.init();

// store info about the experiment session:
let expName = "Threshold"; // from the Builder filename that created this script
let expInfo = { participant: debug ? rc.id.value : '', session: '001' };

const fontsRequired = new Set();

////
// blockCount is just a file telling the program how many blocks in total
Papa.parse("conditions/blockCount.csv", {
  download: true,
  complete: function (results) {
    const blockCount = results.data.length - 2; // TODO Make this calculation robust
    loadBlockFiles(blockCount, () => {
      if (useRC) {
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
            {
              name: "trackGaze",
              options: {
                showGazer: false,
                showVideo: false,
                calibrationCount: 1,
              },
            },
          ],
          "body",
          {},
          () => {
            rc.removePanel();
            // ! Start actual experiment
            experiment(blockCount);
          }
        );
      } else {
        // NO RC
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
      console.log("Block " + count + ": ", results.data);

      Object.values(results.data).forEach((row) => {
        let fontFamily = row["targetFont"];
        let fontTestString = "12px " + fontFamily;
        let fontPath = "fonts/" + fontFamily + ".woff";
        console.log("fontTestString: ", fontTestString);

        let response = fetch(fontPath).then((response) => {
          if (response.ok) {
            fontsRequired.add(row["targetFont"]);
          } else {
            console.log(
              "Does the browser consider this font supported?",
              document.fonts.check(fontTestString)
            );
            console.log(
              "Uh oh, unable to find the font file for: " +
                fontFamily +
                "\n" +
                "If this font is already supported by the browser then it should display correctly. " +
                "\n" +
                "If not, however, a different fallback font will be chosen by the browser, and your stimulus will not be displayed as intended. " +
                "\n" +
                "Please verify for yourself that " +
                fontFamily +
                " is being correctly represented in your experiment."
            );
          }
        });
      });

      loadBlockFiles(count - 1, callback);
    },
  });
};

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
  console.log("fontsRequired: ", fontsRequired);

  fontsRequired.forEach((fontFamily) => {
    _resources.push({ name: fontFamily, path: fontPath });
  });

  // Start code blocks for 'Before Experiment'
  // init psychoJS:
  const psychoJS = new PsychoJS({
    debug: debug,
  });

  /* ---------------------------------- Sound --------------------------------- */
  const correctSynth = getCorrectSynth(psychoJS)
  const purrSynth = getPurrSynth(psychoJS)

  // open window:
  psychoJS.openWindow({
    fullscr: !debug,
    color: new util.Color([0, 0, 0]),
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
  flowScheduler.add(fileRoutineBegin());
  flowScheduler.add(fileRoutineEachFrame());
  flowScheduler.add(fileRoutineEnd());
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

  console.log("_resources: ", _resources);
  psychoJS.start({
    expName: expName,
    expInfo: expInfo,
    resources: [
      { name: "conditions/blockCount.csv", path: "conditions/blockCount.csv" },
      ..._resources,
    ],
  });

  psychoJS.experimentLogger.setLevel(core.Logger.ServerLevel.EXP);

  var frameDur;
  async function updateInfo() {
    expInfo["date"] = util.MonotonicClock.getDateStr(); // add a simple timestamp
    expInfo["expName"] = expName;
    expInfo["psychopyVersion"] = "2021.3.1";
    expInfo["OS"] = rc.systemFamily.value;

    // store frame rate of monitor if we can measure it successfully
    expInfo["frameRate"] = psychoJS.window.getActualFrameRate();
    if (typeof expInfo["frameRate"] !== "undefined")
      frameDur = 1.0 / Math.round(expInfo["frameRate"]);
    else frameDur = 1.0 / 60.0; // couldn't get a reliable measure so guess

    // add info from the URL:
    util.addInfoFromUrl(expInfo);

    return Scheduler.Event.NEXT;
  }

  var fileClock;
  var filterClock;
  var thisLoopNumber; // ! BLOCK COUNTER
  var thisConditionsFile;
  var trialClock;
  // var targetBoundingPoly; // Target Bounding Box
  var key_resp;
  var fixation; ////
  var flanker1;
  var target;
  var flanker2;
  var showAlphabet;
  var globalClock;
  var routineTimer;
  async function experimentInit() {
    // Initialize components for Routine "file"
    fileClock = new util.Clock();
    // Initialize components for Routine "filter"
    filterClock = new util.Clock();
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
      units: "height", // TODO change to pix
      pos: [0, 0],
      height: 0.1,
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
    })

    // Create some handy timers
    globalClock = new util.Clock(); // to track the time since experiment started
    routineTimer = new util.CountdownTimer(); // to track time remaining of each (non-slip) routine

    return Scheduler.Event.NEXT;
  }

  var t;
  var frameN;
  var continueRoutine;
  var fileComponents;
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
        nTrials: conditionTrials,
        conditions: trialsConditions,
        method: TrialHandler.Method.FULLRANDOM,
      });
      psychoJS.experiment.addLoop(trials); // add the loop to the experiment
      currentLoop = trials; // we're now the current loop
      // Schedule all the trials in the trialList:
      for (const thisQuestLoop of trials) {
        const snapshot = trials.getSnapshot();
        trialsLoopScheduler.add(importConditions(snapshot));
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
      console.log("thisBlockFileData: ", thisBlockFileData);

      for (let rowKey in thisBlockFileData) {
        let rowIndex = parseInt(rowKey);
        if (Object.keys(thisBlockFileData[rowIndex]).length > 1) {
          console.log(
            "condition trials this row of block: ",
            parseInt(thisBlockFileData[rowIndex]["conditionTrials"])
          );
          possibleTrials.push(
            parseInt(thisBlockFileData[rowIndex]["conditionTrials"])
          );
        }
      }
      console.log("possibleTrials: ", possibleTrials);
      // const trialConfigIndex = thisBlockFileData[0].indexOf("conditionTrials");
      // for (let i = 1; i < thisBlockFileData.length; i++) {
      //   if (thisBlockFileData[i].length > 1) {
      //     possibleTrials.push(parseInt(thisBlockFileData[i][trialConfigIndex]));
      //   }
      // }

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

  var windowWidthCm;
  var windowWidthPx;
  var pixPerCm;
  var viewingDistanceDesiredCm;
  var viewingDistanceCm;
  var fixationXYPx;
  var block;
  var spacingDirection;
  var targetFont;
  var targetAlphabet;
  var validAns;
  var showAlphabetWhere;
  var showAlphabetElement;
  const showAlphabetResponse = { current: null, onsetTime: 0, clickTime: 0 }
  var targetDurationSec;
  var fixationSizeNow;
  var targetMinimumPix;
  var spacingOverSizeRatio;
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

      ////
      console.log(
        `Level: ${snapshot.getCurrentTrial().trialsVal}, Index: ${
          snapshot.thisIndex
        }`
      );

      let condition;
      for (let c of snapshot.handler.getConditions()) {
        if (c.label === trials._currentStaircase._name) {
          condition = c;
        }
      }
      console.log("condition: ", condition);

      let level = currentLoop._currentStaircase.getQuestValue();
      console.log("level from getQuestValue(): ", level);
      console.log("_currentStaircase: ", currentLoop._currentStaircase);

      // TODO Based on display size
      // Set maximum level to fully display all text
      level = Math.min(level, 1);
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
      if (!rc.screenWidthCm) console.warn('[Screen Width] Using arbitrary screen width. Enable RC.');

      viewingDistanceDesiredCm = condition["viewingDistanceDesiredCm"];
      viewingDistanceCm = rc.viewingDistanceCm ? rc.viewingDistanceCm.value : viewingDistanceDesiredCm
      if (!rc.viewingDistanceCm) console.warn('[Viewing Distance] Using arbitrary viewing distance. Enable RC.');

      fixationXYPx = [0, 0];

      block = condition["blockOrder"];

      spacingDirection = condition["spacingDirection"];
      targetFont = condition["targetFont"].toLowerCase();

      targetAlphabet = String(condition["targetAlphabet"]).split("");
      validAns = String(condition["targetAlphabet"]).toLowerCase().split("");

      showAlphabetWhere = condition["showAlphabetWhere"] || 'bottom';

      conditionTrials = condition["conditionTrials"];
      targetDurationSec = condition["targetDurationSec"];

      fixationSizeNow = condition["markTheFixationYes"] === "TRUE" ? 30 : 0;
      targetMinimumPix = condition["targetMinimumPix"];
      spacingOverSizeRatio = condition["spacingOverSizeRatio"];

      targetEccentricityXDeg = condition["targetEccentricityXDeg"];
      targetEccentricityYDeg = condition["targetEccentricityYDeg"];
      targetEccentricityXYDeg = [
        targetEccentricityXDeg,
        targetEccentricityYDeg,
      ];

      trackGazeYes = condition["trackGazeYes"] === "TRUE";
      trackHeadYes = condition["trackHeadYes"] === "TRUE";
      wirelessKeyboardNeededYes =
        condition["wirelessKeyboardNeededYes"] == "TRUE";

      var alphabet = targetAlphabet;
      /* ------------------------------ Pick triplets ----------------------------- */
      const tempAlphabet = shuffle(shuffle(alphabet))
      var firstFlanker = tempAlphabet[0];
      var targetStim = tempAlphabet[1];
      var secondFlanker = tempAlphabet[2];
      console.log(firstFlanker, targetStim, secondFlanker);
      correctAns = targetStim.toLowerCase();
      /* -------------------------------------------------------------------------- */

      var heightPx;
      var pos1XYDeg, pos1XYPx, pos2XYDeg, pos2XYPx, pos3XYDeg, pos3XYPx;
      var spacingDeg, spacingPx;

      ////
      // !
      fixationXYPix = [0, 0];
      // TODO use actual nearPoint; currently totally ignoring fixation???
      const nearPointXYDeg = { x: 0, y: 0 }; // TEMP
      const nearPointXYPix = { x: 0, y: 0 }; // TEMP
      const displayOptions = {
        pixPerCm: pixPerCm,
        viewingDistanceCm: viewingDistanceDesiredCm,
        nearPointXYDeg: nearPointXYDeg,
        nearPointXYPix: nearPointXYPix,
        spacingOverSizeRatio: spacingOverSizeRatio,
        minimumHeight: targetMinimumPix,
        fontFamily: targetFont,
        window: psychoJS.window,
      };
      const [targetXYPix] = XYPixOfXYDeg(
        [targetEccentricityXYDeg],
        displayOptions
      );
      console.log("in new location");
      const areaFlankersCover = flankersExtent(
        level,
        targetXYPix,
        fixationXYPix,
        spacingDirection,
        displayOptions
      );
      console.log("areaFlankersCover: ", areaFlankersCover);
      const fixationInfringed = rectangleContainsPoint(
        areaFlankersCover,
        fixationXYPix
      );
      console.log("fixationInfringed: ", fixationInfringed);
      const stimuliExtendOffscreen = rectangleOffscreen(areaFlankersCover, {
        width: screen.width,
        height: screen.height,
      });
      console.log("stimuliExtendOffscreen: ", stimuliExtendOffscreen);
      const badPresentation = fixationInfringed || stimuliExtendOffscreen;
      console.log("badPresentation: ", badPresentation);

      spacingDeg = Math.pow(10, level);

      console.log("targetEccentricityXYDeg: ", targetEccentricityXYDeg);
      console.log(
        "flanker locations: ",
        getFlankerLocations(
          targetEccentricityXYDeg,
          fixationXYPix,
          spacingDirection,
          spacingDeg
        )
      );

      [pos1XYDeg, pos3XYDeg] = getFlankerLocations(
        targetEccentricityXYDeg,
        fixationXYPix,
        spacingDirection,
        spacingDeg
      );
      pos2XYDeg = targetEccentricityXYDeg;

      // if (spacingDirection === "radial") {
      //   if (targetEccentricityXDeg < 0) {
      //     levelLeft = level;
      //   } else {
      //     levelRight = level;
      //   }
      // } else if (spacingDirection == "tangential") {
      //   if (targetEccentricityYDeg < 0) {
      //     levelLeft = level;
      //   } else {
      //     levelRight = level;
      //   }
      // }

      [pos1XYPx, pos2XYPx, pos3XYPx] = XYPixOfXYDeg(
        [pos1XYDeg, pos2XYDeg, pos3XYDeg],
        displayOptions
      );

      // if (spacingDirection === "radial") {
      //   spacingPx = pos2XYPx[0] - pos1XYPx[0];
      // } else if (spacingDirection === "tangential") {
      //   spacingPx = pos2XYPx[1] - pos1XYPx[1];
      // }
      spacingPx = degreesToPixels(spacingDeg, {
        pixPerCm: pixPerCm,
        viewingDistanceCm: viewingDistanceDesiredCm,
      });
      console.log("spacingPx: ", spacingPx);

      heightPx = Math.max(spacingPx / spacingOverSizeRatio, targetMinimumPix);

      key_resp.keys = undefined;
      key_resp.rt = undefined;
      _key_resp_allKeys = [];
      ////
      heightPx = Math.round(heightPx);
      pos1XYPx = pos1XYPx.map((x) => Math.round(x));
      pos2XYPx = pos2XYPx.map((x) => Math.round(x));
      pos3XYPx = pos3XYPx.map((x) => Math.round(x));

      fixation.setPos(fixationXYPix);
      flanker1.setPos(pos1XYPx);
      flanker1.setText(firstFlankerCharacter);
      flanker1.setFont(targetFont);
      flanker1.setHeight(heightPx);
      target.setPos(pos2XYPx);
      target.setText(targetCharacter);
      target.setFont(targetFont);
      target.setHeight(heightPx);
      flanker2.setPos(pos3XYPx);
      flanker2.setText(secondFlankerCharacter);
      flanker2.setFont(targetFont);
      flanker2.setHeight(heightPx);
      
      showAlphabet.setPos([0, 0])
      showAlphabet.setText('')
      // showAlphabet.setText(getAlphabetShowText(validAns))
      
      // keep track of which components have finished
      trialComponents = [];
      trialComponents.push(key_resp);
      // trialComponents.push(targetBoundingPoly); // Target Bounding Box
      trialComponents.push(fixation);
      trialComponents.push(flanker1);
      trialComponents.push(target);
      trialComponents.push(flanker2);
      trialComponents.push(showAlphabet)

      for (const thisComponent of trialComponents)
        if ("status" in thisComponent)
          thisComponent.status = PsychoJS.Status.NOT_STARTED;
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

      // *key_resp* updates
      if (t >= 0.5 && key_resp.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        key_resp.tStart = t; // (not accounting for frame time here)
        key_resp.frameNStart = frameN; // exact frame index
        // TODO Use PsychoJS clock if possible
        // Reset together with PsychoJS
        showAlphabetResponse.onsetTime = performance.now()

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
            correctSynth.play()
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
        key_resp.keys = showAlphabetResponse.current
        key_resp.rt = (showAlphabetResponse.clickTime - showAlphabetResponse.onsetTime) / 1000
        if (showAlphabetResponse.current == correctAns) {
          // Play correct audio
          correctSynth.play()
          key_resp.corr = 1;
        } else {
          // Play wrong audio
          key_resp.corr = 0;
        }
        showAlphabetResponse.current = null
        removeClickableAlphabet()
        continueRoutine = false;
      }

      // *fixation* updates
      if (t >= 0.0 && fixation.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        fixation.tStart = t; // (not accounting for frame time here)
        fixation.frameNStart = frameN; // exact frame index

        fixation.setAutoDraw(true);
      }

      // *flanker1* updates
      if (t >= 0.5 && flanker1.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        flanker1.tStart = t; // (not accounting for frame time here)
        flanker1.frameNStart = frameN; // exact frame index

        flanker1.setAutoDraw(true);
      }

      frameRemains =
        0.5 + targetDurationSec - psychoJS.window.monitorFramePeriod * 0.75; // most of one frame period left
      if (flanker1.status === PsychoJS.Status.STARTED && t >= frameRemains) {
        flanker1.setAutoDraw(false);
      }

      // *target* updates
      if (t >= 0.5 && target.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        target.tStart = t; // (not accounting for frame time here)
        target.frameNStart = frameN; // exact frame index

        target.setAutoDraw(true);
      }

      frameRemains =
        0.5 + targetDurationSec - psychoJS.window.monitorFramePeriod * 0.75; // most of one frame period left
      if (target.status === PsychoJS.Status.STARTED && t >= frameRemains) {
        target.setAutoDraw(false);
        // Play purr sound
        // Wait until next frame to play
        setTimeout(() => {
          purrSynth.play()
        }, 17);
      }

      // *flanker2* updates
      if (t >= 0.5 && flanker2.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        flanker2.tStart = t; // (not accounting for frame time here)
        flanker2.frameNStart = frameN; // exact frame index

        flanker2.setAutoDraw(true);
      }

      frameRemains =
        0.5 + targetDurationSec - psychoJS.window.monitorFramePeriod * 0.75; // most of one frame period left
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
      if (t >= 0.5 + targetDurationSec && showAlphabet.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        showAlphabet.tStart = t; // (not accounting for frame time here)
        showAlphabet.frameNStart = frameN; // exact frame index

        showAlphabet.setAutoDraw(true);
        showAlphabetElement = setupClickableAlphabet(targetAlphabet, targetFont, showAlphabetWhere, showAlphabetResponse)
      }
      /* -------------------------------------------------------------------------- */

      // check if the Routine should terminate
      if (!continueRoutine) {
        // a component has requested a forced-end of Routine
        removeClickableAlphabet()
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
        console.error('[key_resp.keys] No response error.');
      }
      // store data for psychoJS.experiment (ExperimentHandler)
      // update the trial handler
      if (currentLoop instanceof MultiStairHandler) {
        currentLoop.addResponse(key_resp.corr);
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

    console.log("Log threshold right is: ", levelLeft);
    console.log(
      "Threshold spacing right is: ",
      Math.pow(10, levelLeft) - 0.15,
      " deg"
    );
    console.log("Log threshold right is: ", levelRight);
    console.log(
      "Threshold spacing right is: ",
      Math.pow(10, levelRight) - 0.15,
      " deg"
    );

    psychoJS.window.close();
    psychoJS.quit({ message: message, isCompleted: isCompleted });

    return Scheduler.Event.QUIT;
  }
};

/* 
  Utilities
*/

/**
 * Convert a number of visual degrees to pixels VERIFY
 * @param {Number} degrees Scalar, in degrees
 * @param {Object} displayOptions Parameters about the stimulus presentation
 * @param {Number} displayOptions.pixPerCm Pixels per centimeter on screen
 * @param {Number} displayOptions.viewingDistanceCm Distance (in cm) of participant from screen
 * @returns {Number}
 */
function degreesToPixels(degrees, displayOptions) {
  const radians = degrees * (Math.PI / 180);
  const pixels =
    displayOptions.pixPerCm *
    displayOptions.viewingDistanceCm *
    Math.tan(radians);
  return pixels;
}

/**
 * Translation of MATLAB function of the same name
 * by Prof Denis Pelli, XYPixOfXYDeg.m
 * @param {Array} xyDeg List of [x,y] pairs, representing points x degrees right, and y degrees up, of fixation
 * @param {Object} displayOptions Parameters about the stimulus presentation
 * @param {Number} displayOptions.pixPerCm Pixels per centimeter on screen
 * @param {Number} displayOptions.viewingDistanceCm Distance (in cm) of participant from screen
 * @param {Object} displayOptions.nearPointXYDeg Near-point on screen, in degrees relative to fixation(?)
 * @param {Number} displayOptions.nearPointXYDeg.x Degrees along x-axis of near-point from fixation
 * @param {Number} displayOptions.nearPointXYDeg.y Degrees along y-axis of near-point from fixation
 * @param {Object} displayOptions.nearPointXYPix Near-point on screen, in pixels relative to origin(?)
 * @param {Number} displayOptions.nearPointXYPix.x Pixels along x-axis of near-point from origin
 * @param {Number} displayOptions.nearPointXYPix.y Pixels along y-axis of near-point from origin
 * @returns {Number[][]} Array of length=2 arrays of numbers, representing the same points in Pixel space
 */
function XYPixOfXYDeg(xyDeg, displayOptions) {
  if (xyDeg.length == 0) {
    return;
  } // Return if no points to transform
  // TODO verify displayOptions has the correct parameters
  const xyPix = [];
  xyDeg.forEach((position) => {
    position[0] = position[0] - displayOptions.nearPointXYDeg.x;
    position[1] = position[1] - displayOptions.nearPointXYDeg.y;
    const rDeg = Math.sqrt(position[0] ** 2 + position[1] ** 2);
    const rPix = degreesToPixels(rDeg, displayOptions);
    let pixelPosition = [];
    if (rDeg > 0) {
      pixelPosition = [
        (position[0] * rPix) / rDeg,
        (position[1] * rPix) / rDeg,
      ];
    } else {
      pixelPosition = [0, 0];
    }
    pixelPosition[0] = pixelPosition[0] + displayOptions.nearPointXYPix.x;
    pixelPosition[1] = pixelPosition[1] + displayOptions.nearPointXYPix.x;
    xyPix.push(pixelPosition);
  });
  return xyPix;
}

/**
 * Given a spacing value (in pixels), estimate a (non-tight) bounding box
 * @param {Number} spacing Spacing which will be used to place flanker
 * @param {Number} spacingOverSizeRatio Specified ratio of distance between flanker&target to letter height
 * @param {Number} minimumHeight Smallest allowable letter height for flanker
 * @param {String} font Font-family in which the stimuli will be presented
 * @param {PsychoJS.window} window PsychoJS window, used to create a stimulus to be measured
 * @returns
 */
function boundingBoxFromSpacing(
  spacing,
  spacingOverSizeRatio,
  minimumHeight,
  font,
  window
) {
  const height = Math.max(spacing / spacingOverSizeRatio, minimumHeight);
  const testTextStim = new visual.TextStim({
    win: window,
    name: "testTextStim",
    text: "H", // TEMP
    font: font,
    units: "pix", // ASSUMES that parameters are in pixel units
    pos: [0, 0],
    height: height,
    wrapWidth: undefined,
    ori: 0.0,
    color: new util.Color("black"),
    opacity: 1.0,
    depth: -7.0,
    autoDraw: false,
    autoLog: false,
  });
  return testTextStim._boundingBox;
}

/**
 * Calculate the (2D) coordinates of two tangential flankers, linearly symmetrical around a target at targetPosition
 * @todo Add parameter/support for log-symmetric spacing
 * @param {Number[]} targetPosition [x,y] position of the target
 * @param {Number[]} fixationPosition [x,y] position of the fixation point
 * @param {Number} spacing How far the flankers are to be from the target (in the same units as the target & fixation positions)
 * @returns {Number[][]} Array containing two Arrays which represent the positions of Flanker 1 and Flanker 2
 */
function tangentialFlankerPositions(targetPosition, fixationPosition, spacing) {
  let x, i; // Variables for anonymous fn's
  // Vector representing the line between target and fixation
  const v = [
    fixationPosition[0] - targetPosition[0],
    fixationPosition[1] - targetPosition[1],
  ];
  // Get the vector perpendicular to v
  const p = [v[1], -v[0]]; // SEE https://gamedev.stackexchange.com/questions/70075/how-can-i-find-the-perpendicular-to-a-2d-vector

  // Find the point that is `spacing` far from `targetPosition` along p
  // SEE https://math.stackexchange.com/questions/175896/finding-a-point-along-a-line-a-certain-distance-away-from-another-point
  /// Find the length of `p`
  const llpll = Math.sqrt(
    p.map((x) => x ** 2).reduce((previous, current) => previous + current)
  );
  /// Normalize `p`
  const u = p.map((x) => x / llpll);
  /// Find our two new points, `spacing` distance away from targetPosition along line `p`
  const flankerPositions = [
    targetPosition.map((x, i) => x + spacing * u[i]),
    targetPosition.map((x, i) => x - spacing * u[i]),
  ];
  return flankerPositions;
}

/**
 * Calculate the (2D) coordinates of two radial flankers, linearly symmetrical around a target at targetPosition
 * @todo Add parameter/support for log-symmetric spacing
 * @param {Number[]} targetPosition [x,y] position of the target
 * @param {Number[]} fixationPosition [x,y] position of the fixation point
 * @param {Number} spacing How far the flankers are to be from the target (in the same units as the target & fixation positions)
 * @returns {Number[][]} Array containing two Arrays, which represent the positions of Flanker 1 and Flanker 2
 */
function radialFlankerPositions(targetPosition, fixationPosition, spacing) {
  // SEE https://math.stackexchange.com/questions/175896/finding-a-point-along-a-line-a-certain-distance-away-from-another-point

  // Vector representing the line between target and fixation
  const v = [
    fixationPosition[0] - targetPosition[0],
    fixationPosition[1] - targetPosition[1],
  ];
  /// Find the length of v
  const llvll = Math.sqrt(
    v.map((x) => x ** 2).reduce((previous, current) => previous + current)
  );
  /// Normalize v
  const u = v.map((x) => x / llvll);
  /// Find our two new points, `spacing` distance away from targetPosition along line v
  const flankerPositions = [
    targetPosition.map((x, i) => x + spacing * u[i]),
    targetPosition.map((x, i) => x - spacing * u[i]),
  ];
  return flankerPositions;
}

/**
 * Return the coordinates of the two flankers around a given target.
 * @param {Number[]} targetPosition [x,y] position of the target stimuli
 * @param {Number[]} fixationPosition [x,y] position of the fixation stimuli
 * @param {("radial"|"tangential")} flankerOrientation String specifying the position of the flankers relative to the line between fixation and the target
 * @param {Number} spacing Distance between the target and one flanker
 * @returns {Number[][]} Array containing two [x,y] arrays, each representing the location of one flanker
 */
function getFlankerLocations(
  targetPosition,
  fixationPosition,
  flankerOrientation,
  spacing
) {
  switch (flankerOrientation) {
    case "radial":
      return radialFlankerPositions(targetPosition, fixationPosition, spacing);
    case "tangential":
      return tangentialFlankerPositions(
        targetPosition,
        fixationPosition,
        spacing
      );
    default:
      console.error(
        "Unknown flankerOrientation specified, ",
        flankerOrientation
      );
  }
}
/**
 * Return the extreme points of a rectangle bounding the pair of flankers
 * @param {Number} level Suggested level from QUEST
 * @param {Number[]} targetPosition [x,y] position of the target stimulus
 * @param {Number[]} fixationPosition [x,y] position of the fixation stimulus
 * @param {("radial"|"tangential")} flankerOrientation Arrangement of the flankers relative to the line between fixation and target
 * @param {Object} sizingParameters Parameters for drawing stimuli
 * @param {Number} sizingParameters.spacingOverSizeRatio Ratio of distance between flanker&target to stimuli letter height
 * @param {Number} sizingParameters.minimumHeight Minimum stimulus letter height (in same units as other parameters)
 * @param {String} sizingParameters.fontFamily Name of the fontFamily in which the stimuli will be drawn
 * @param {Number} sizingParameters.pixPerCm Pixel/cm ratio of the display
 * @param {Number} sizingParameters.viewingDistanceCm Distance (in cm) of the observer from the near-point
 * @param {PsychoJS.window} sizingParameters.window Window object, used for creating a mock stimuli for measurement
 * @returns {Number[][]} [[x_min, y_min], [x_max, y_max]] Array of defining points of the area over which flankers extend
 */
function flankersExtent(
  level,
  targetPosition,
  fixationPosition,
  flankerOrientation,
  sizingParameters
) {
  console.log("window: ", sizingParameters.window);
  const spacingDegrees = Math.pow(10, level);
  const spacingPixels = degreesToPixels(spacingDegrees, {
    pixPerCm: sizingParameters.pixPerCm,
    viewingDistanceCm: sizingParameters.viewingDistanceCm,
  });
  const flankerLocations = getFlankerLocations(
    targetPosition,
    fixationPosition,
    flankerOrientation,
    spacingPixels
  );
  const flankerBoxDimensions = boundingBoxFromSpacing(
    spacingPixels,
    sizingParameters.spacingOverSizeRatio,
    sizingParameters.minimumHeight,
    sizingParameters.fontFamily,
    sizingParameters.window
  );
  return flankerLocations.map((flankerPosition, i) => [
    flankerPosition[0] + (i === 0 ? -1 : 1) * (flankerBoxDimensions.width / 2),
    flankerPosition[1] + (i === 0 ? -1 : 1) * (flankerBoxDimensions.height / 2),
  ]);
}

/**
 * Determine whether a given point lies inside a given rectangle
 * @todo Fix; not giving expected values for fixation check, displaying on left side of screen
 * @param {Number[][]} rectangle Array of two [x,y] points, which define an area
 * @param {Number[]} point [x,y] coordinate of a point which may be within rectangle
 * @returns {Boolean}
 */
function rectangleContainsPoint(rectangle, point) {
  const leftX = Math.min(rectangle[0][0], rectangle[1][0]);
  const rightX = Math.max(rectangle[0][0], rectangle[1][0]);
  const lowerY = Math.min(rectangle[0][1], rectangle[1][1]);
  const upperY = Math.max(rectangle[0][1], rectangle[1][1]);
  const xIsIn = point[0] >= leftX && point[0] <= rightX;
  const yIsIn = point[1] >= lowerY && point[1] <= upperY;
  return xIsIn && yIsIn;
}

/**
 * Determines whether any part of a given rectangle will extend beyond the screen
 * @param {Number[][]} rectangle Array of two [x,y] points, defining a rectangle
 * @param {Object} screenDimensions
 * @param {Number} screenDimensions.width Width of the screen
 * @param {Number} screenDimensions.height Height of the screen
 * @returns {Boolean}
 */
function rectangleOffscreen(rectangle, screenDimensions) {
  const pointOffScreen = (point) =>
    Math.abs(point[0]) > screenDimensions.width / 2 ||
    Math.abs(point[1]) > screenDimensions.height / 2;
  return rectangle.some(pointOffScreen); // VERIFY this logic is correct
}
