/*****************
 * Crowding Test *
 *****************/

import { core, data, sound, util, visual } from "./lib/psychojs-2021.3.0.js";
const { PsychoJS } = core;
const { TrialHandler, MultiStairHandler } = data;
const { Scheduler } = util;
//some handy aliases as in the psychopy scripts;
const { abs, sin, cos, PI: pi, sqrt } = Math;
const { round } = util;

////
import * as jsQUEST from "./lib/jsQUEST.module.js";
window.jsQUEST = jsQUEST;

var conditionTrials;
var levelLeft, levelRight;
let correctAns;

// store info about the experiment session:
let expName = "crowding"; // from the Builder filename that created this script
let expInfo = { participant: "", session: "001" };

const rc = RemoteCalibrator;

////
// blockCount is just a file telling the program how many blocks in total
Papa.parse("conditions/blockCount.csv", {
  download: true,
  complete: function (results) {
    const blockCount = results.data.length - 2; // TODO Make this calculation robust
    loadBlockFiles(blockCount, () => {
      // ! RC
      rc.init();
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
    complete: function (results) {
      blockFiles[count] = results.data;
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

  // Start code blocks for 'Before Experiment'
  // init psychoJS:
  const psychoJS = new PsychoJS({
    debug: true,
  });

  // open window:
  psychoJS.openWindow({
    fullscr: true,
    color: new util.Color([0, 0, 0]),
    units: "height",
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

  expInfo["participant"] = rc.id.value;

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
    expInfo["OS"] = window.navigator.platform;

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
  var thisLoopNumber;
  var thisConditionsFile;
  var trialClock;
  var key_resp;
  var fixation; ////
  var flanker1;
  var target;
  var flanker2;
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
      units: "height",
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
      const trialConfigIndex = thisBlockFileData[0].indexOf("conditionTrials");
      for (let i = 1; i < thisBlockFileData.length; i++) {
        if (thisBlockFileData[i].length > 1) {
          possibleTrials.push(parseInt(thisBlockFileData[i][trialConfigIndex]));
        }
      }

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
  var pxPerCm;
  var viewingDistanceDesiredCm;
  var fixationXYPx;
  var block;
  var spacingDirection;
  var targetFont;
  var targetAlphabet;
  var validAns;
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

      let level = currentLoop._currentStaircase.getQuestValue();

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
      windowWidthCm = 25; // TODO Use RemoteCalibrator
      windowWidthPx = screen.width;
      pxPerCm = windowWidthPx / windowWidthCm;
      viewingDistanceDesiredCm = condition["viewingDistanceDesiredCm"];
      fixationXYPx = [0, 0];

      block = condition["blockOrder"];

      spacingDirection = condition["spacingDirection"];
      targetFont = condition["targetFont"].toLowerCase();

      targetAlphabet = condition["targetAlphabet"].split("");
      validAns = condition["targetAlphabet"].toLowerCase().split("");

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
      var firstFlanker = alphabet[Math.floor(Math.random() * alphabet.length)];
      var targetStim = alphabet[Math.floor(Math.random() * alphabet.length)];
      var secondFlanker = alphabet[Math.floor(Math.random() * alphabet.length)];
      console.log(firstFlanker, targetStim, secondFlanker);
      correctAns = targetStim.toLowerCase();

      var heightPx, listXY;
      var pos1XYDeg, pos1XYPx, pos2XYDeg, pos2XYPx, pos3XYDeg, pos3XYPx;
      var spacingDeg, spacingPx;

      ////
      // !
      spacingDeg = Math.pow(10, level);

      if (spacingDirection === "radial") {
        pos1XYDeg = [
          targetEccentricityXYDeg[0] - spacingDeg,
          targetEccentricityXYDeg[1],
        ];
        pos2XYDeg = targetEccentricityXYDeg;
        pos3XYDeg = [
          targetEccentricityXYDeg[0] + spacingDeg,
          targetEccentricityXYDeg[1],
        ];
        if (targetEccentricityXDeg < 0) {
          levelLeft = level;
        } else {
          levelRight = level;
        }
      } else if (spacingDirection == "tangential") {
        pos1XYDeg = [
          targetEccentricityXYDeg[0],
          targetEccentricityXYDeg[1] - spacingDeg,
        ];
        pos2XYDeg = targetEccentricityXYDeg;
        pos3XYDeg = [
          targetEccentricityXYDeg[0],
          targetEccentricityXYDeg[1] + spacingDeg,
        ];
        if (targetEccentricityYDeg < 0) {
          levelLeft = level;
        } else {
          levelRight = level;
        }
      }

      pos1XYPx = [0, 0];
      pos2XYPx = [0, 0];
      pos3XYPx = [0, 0];
      listXY = [0, 1];

      for (let i in listXY) {
        pos1XYPx[i] =
          viewingDistanceDesiredCm *
            2 *
            Math.tan((0.5 * pos1XYDeg[i] * Math.PI) / 180) *
            pxPerCm +
          fixationXYPx[i];
        pos2XYPx[i] =
          viewingDistanceDesiredCm *
            2 *
            Math.tan((0.5 * pos2XYDeg[i] * Math.PI) / 180) *
            pxPerCm +
          fixationXYPx[i];
        pos3XYPx[i] =
          viewingDistanceDesiredCm *
            2 *
            Math.tan((0.5 * pos3XYDeg[i] * Math.PI) / 180) *
            pxPerCm +
          fixationXYPx[i];
      }

      if (spacingDirection === "radial") {
        spacingPx = pos2XYPx[0] - pos1XYPx[0];
      } else if (spacingDirection === "tangential") {
        spacingPx = pos2XYPx[1] - pos1XYPx[1];
      }

      heightPx = Math.max(spacingPx / spacingOverSizeRatio, targetMinimumPix);

      key_resp.keys = undefined;
      key_resp.rt = undefined;
      _key_resp_allKeys = [];
      ////
      heightPx = Math.round(heightPx);
      pos1XYPx = pos1XYPx.map((x) => Math.round(x));
      pos2XYPx = pos2XYPx.map((x) => Math.round(x));
      pos3XYPx = pos3XYPx.map((x) => Math.round(x));

      flanker1.setPos(pos1XYPx);
      flanker1.setText(firstFlanker);
      flanker1.setFont(targetFont);
      flanker1.setHeight(heightPx);
      target.setPos(pos2XYPx);
      target.setText(targetStim);
      target.setFont(targetFont);
      target.setHeight(heightPx);
      flanker2.setPos(pos3XYPx);
      flanker2.setText(secondFlanker);
      flanker2.setFont(targetFont);
      flanker2.setHeight(heightPx);
      // keep track of which components have finished
      trialComponents = [];
      trialComponents.push(key_resp);
      trialComponents.push(fixation);
      trialComponents.push(flanker1);
      trialComponents.push(target);
      trialComponents.push(flanker2);

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

      // *key_resp* updates
      if (t >= 0.5 && key_resp.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        key_resp.tStart = t; // (not accounting for frame time here)
        key_resp.frameNStart = frameN; // exact frame index

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
            key_resp.corr = 1;
          } else {
            key_resp.corr = 0;
          }
          // a response ends the routine
          continueRoutine = false;
        }
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

      // check if the Routine should terminate
      if (!continueRoutine) {
        // a component has requested a forced-end of Routine
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
        if (["None", "none", undefined].includes(correctAns)) {
          key_resp.corr = 1; // correct non-response
        } else {
          key_resp.corr = 0; // failed to respond (incorrectly)
        }
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
