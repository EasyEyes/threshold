/*
SIMULATION MODEL. Participant page. 
Implement simulationModel: blind, ideal, and weibull.
blind: the simulated observer randomly chooses one of the letters from the possible targets, i.e. the "characterSet".
ideal: since we have no noise (and won't for months), this simulated observer will choose the correct response on every trial.
weibull: this simulated observer gets the trial right with a probability given by the Weibull psychometric function: (see https://psychopy.org/api/data.html)
Weibull=deltagamma+(1-delta)(1-(1-gamma)exp(-10**(beta(x-T+epsilon)))
where
x=is the log intensity of the current trial.
T=log10(simulationThreshold) is the true threshold of the simulation
beta=simulationBeta
delta=simulationDelta
epsilon is set (once) so that Weibull=thresholdProportionCorrect when x-T=0. 
gamma=probability of blindly guessing the correct answer
All the "simulationXXX" and "thresholdXXX" values are parameters set by the scientist in the experiment table. 

SIMULATION MODEL
For debugging and checking it is often helpful to simulate the observer. "simulationModel" can be: 
• "blind": This model merely presses a random response key. 
• "ideal": This model does the same task as the human, picking the best response given the stimulus. Its threshold is a useful point of reference in analyzing human data. Without noise, it will always be right. Since noise is still months away, for now, just give the right answer.
• "weibull": This model gets the trial right with a probability given by the Weibull function, which is frequently fit to human data. The QUEST staircase asssumes the Weibull model, so QUEST should accurately measure its (unknown to Quest) threshold, when the respt of the parameters match. https://psychopy.org/api/data.html#psychopy.data.QuestHandler
In MATLAB, the Weibull model observer is: 
function response=SimulateWeibull(q,tTest,tActual)
   t=tTest-tActual+q.epsilon;
   P=q.deltaq.gamma+(1-q.delta)(1-(1-q.gamma)exp(-10.^(q.betat)));
   response= P > rand(1);
end
response=1 means right, and response=0 means wrong. 
P=probability of a correct response
q is a struct holding all the Weibull parameters. 
q.beta=simulationBeta
q.delta=simulationDelta
q.epsilon is set (once) so that P=thresholdProportionCorrect when tTest-tActual=0. 
q.gamma=probability of blindly guessing the correct answer
tTest is the stimulus intensity level (usually log10 of physical parameter).
tActual=log10(simulationThreshold) is the true threshold of the simulation
rand(1) returns a random sample from the uniform distribution from 0 to 1.
*/

// TODO add dependent parameter checks to preprocessor
// eg If simulateParticipantBool -> simulationModel
//    If simulationModel[Weibull] -> simulationBeta, simulationDelta

// TODO simulateWithDisplayBool

import * as core from "../psychojs/src/core/index.js";
import * as util from "../psychojs/src/util/index.js";

const { EventManager } = core;
const { Scheduler } = util;
import { createSignalingMap, arraysEqual, log } from "./utils.js";

export const checkIfSimulated = (reader) => {
  if (
    !reader.conditions.some(
      (condition) => condition.simulateParticipantBool === true
    )
  )
    return;
  const simulated = {};
  for (const [index, condition] of reader.conditions.entries()) {
    if (!condition.block_condition)
      throw "No conditionName (block_condition) provided for this condition.";
    const block_condition = condition.block_condition;
    const block = reader.read("block", block_condition);

    if (reader.read("simulateParticipantBool", block_condition)) {
      // eslint-disable-next-line no-prototype-builtins
      if (!simulated.hasOwnProperty(block)) {
        simulated[block] = {};
        simulated[block][block_condition] = reader.read(
          "simulationModel",
          block_condition
        );
      } else {
        simulated[block][block_condition] = reader.read(
          "simulationModel",
          block_condition
        );
      }
    }
  }
  // block# : simulationModel
  return simulated;
};

export const simulateObserverResponse = (
  simulatedObserver,
  keyboard,
  psychoJS
) => {
  // Get the possible stimuli, and which the observer chose
  const possibleResponses = simulatedObserver.trial.possibleResponses.map((s) =>
    s.toLowerCase()
  );
  const correctResponse = simulatedObserver.trial.correctResponse.toLowerCase();
  const simulatedResponse = simulatedObserver
    .getSimulatedResponse()
    .toLowerCase();

  // Get keys corresponding to the possible, and chosen, stimuli
  const responseToSignalKeyCode = createSignalingMap(possibleResponses);

  // const signalingIndex = possibleResponses.indexOf(simulatedResponse);
  // const startingKeyCode = 65;
  // const signalingKeyCode = signalingIndex + startingKeyCode;
  const signalingKeyCode = responseToSignalKeyCode[simulatedResponse];
  const signalingKey = String.fromCharCode(signalingKeyCode);
  const signalingCode = EventManager.keycode2w3c(signalingKeyCode);

  const correctSignalingKeyCode = responseToSignalKeyCode[correctResponse];
  const correctSignalingKey = String.fromCharCode(correctSignalingKeyCode);
  // const correctSignalingCode = EventManager.keycode2w3c(correctSignalingKeyCode);

  // Add variables to the output datafile
  psychoJS.experiment.addData("simulatedResponse", simulatedResponse);
  psychoJS.experiment.addData("correctResponse", correctResponse);
  psychoJS.experiment.addData("signalingKey", signalingKey);
  psychoJS.experiment.addData("correctSignalingKey", correctSignalingKey);
  psychoJS.experiment.addData(
    "signalingCharacterSet",
    Object.values(responseToSignalKeyCode).map((keycode) =>
      String.fromCharCode(keycode)
    )
  );

  // Simulate a keypress
  const simulatedResponseEvent = {
    key: signalingKey,
    code: signalingCode,
    keyCode: signalingKeyCode,
    which: signalingKeyCode,
  };
  const simulatedKeydown = new KeyboardEvent("keydown", simulatedResponseEvent);
  const simulatedKeyup = new KeyboardEvent("keyup", simulatedResponseEvent);
  window.dispatchEvent(simulatedKeydown);
  window.dispatchEvent(simulatedKeyup);

  const theseKeys = keyboard.getKeys({
    // keyList: signalingCharacterSet,
    waitRelease: false,
  });

  keyboard.keys = theseKeys[0].name;
  keyboard.rt = theseKeys[0].rt;

  if (signalingKeyCode === correctSignalingKeyCode) {
    keyboard.corr = 1;
  } else {
    keyboard.corr = 0;
  }
  return Scheduler.Event.NEXT;
};

/**
 * Information about the stimuli of a trial.
 */
class TrialProperties {
  /**
   * @param {number} stimulusIntensity aka 'tTest', the stimulus intensity level (usually log10 of physical parameter).
   * @param {string[]} possibleResponses all valid responses for this trial
   * @param {string} correctResponse the correct response; a memeber of possibleResponses
   */
  constructor(stimulusIntensity, possibleResponses, correctResponse) {
    this.stimulusIntensity = stimulusIntensity;
    this.possibleResponses = possibleResponses;
    this.correctResponse = correctResponse;
  }
}

/**
 * Simulated observer class, which responds to a given trial using one of three schemas:
 * • "blind": This model merely presses a random response key.
 * • "ideal": This model does the same task as the human, picking the best response given the stimulus. Its threshold is a useful point of reference in analyzing human data. Without noise, it will always be right. Since noise is still months away, for now, just give the right answer.
 * • "weibull": This model gets the trial right with a probability given by the Weibull function, which is frequently fit to human data. The QUEST staircase asssumes the Weibull model, so QUEST should accurately measure its (unknown to Quest) threshold, when the respt of the parameters match. https://psychopy.org/api/data.html#psychopy.data.QuestHandler
 */
export class SimulatedObserver {
  /**
   * @param {("weibull"|"blind"|"ideal")} simulationModel Guessing scheme for the simulated observer
   * @param {number} stimulusIntensity aka 'tTest', the stimulus intensity level (usually log10 of physical parameter).
   * @param {string[]} possibleResponses all valid responses for this trial
   * @param {string} correctResponse the correct response; a memeber of possibleResponses
   * @param {number} thresholdProportionCorrect the threshold criterion. From Threshold experiment file.
   * @param {number} [simulationBeta=3] Used by Weibull observer model. The steepness parameter of the Weibull psychometric function. From Threshold experiment file.
   * @param {number} [simulationDelta=0.01] Used by Weibull observer model. Set the asymptote of the Weibull psychometric function to 1-delta. From Threshold experiment file.
   * @param {number} [simulationThreshold=0] The actual threshold of the simulated observer. We test the implementation of Quest by testing how well it estimates simulationThreshold. From Threshold experiment file.
   */
  constructor(
    simulationModel,
    stimulusIntensity,
    possibleResponses,
    correctResponse,
    thresholdProportionCorrect,
    simulationBeta = 3,
    simulationDelta = 0.01,
    simulationThreshold = 0
  ) {
    this.trial = new TrialProperties(
      stimulusIntensity,
      possibleResponses,
      correctResponse
    );
    if (!["weibull", "blind", "ideal"].includes(simulationModel)) {
      throw `Simulated observer type "${simulationModel}" not recognized.`;
    }
    this.simulationModel = simulationModel;
    switch (this.simulationModel) {
      case "weibull":
        this.observer = new WeibullObserver(
          this.trial,
          thresholdProportionCorrect,
          simulationBeta,
          simulationDelta,
          simulationThreshold
        );
        break;
      case "blind":
        this.observer = new BlindObserver(this.trial);
        break;
      case "ideal":
        this.observer = new IdealObserver(this.trial);
        break;
    }
  }
  /**
   * Update the trial to which the simulated observer is responding.
   * @param {number} stimulusIntensity aka 'tTest', the stimulus intensity level (usually log10 of physical parameter).
   * @param {string[]} possibleResponses all valid responses for this trial
   * @param {string} correctResponse the correct response; a memeber of possibleResponses
   */
  updateTrial(stimulusIntensity, possibleResponses, correctResponse) {
    const newTrial = new TrialProperties(
      stimulusIntensity,
      possibleResponses,
      correctResponse
    );
    this.observer.updateTrial(newTrial);
    this.trial = newTrial;
  }
  updateSimulationParameters(
    simulationBeta,
    simulationDelta,
    simulationThreshold
  ) {
    if (this.simulationModel === "weibull") {
      this.observer.updateSimulationParameters(
        simulationBeta,
        simulationDelta,
        simulationThreshold
      );
    }
  }
  simulateTrial() {
    return this.observer.simulateTrial();
  }
  getSimulatedResponse() {
    return this.observer.getSimulatedResponse();
  }
}

class WeibullObserver {
  /**
   * @param {TrialProperties} trial Information about the current trial, ie the stimulus intensity, possible responses, and correct response.
   * @param {number} thresholdProportionCorrect the threshold criterion. From Threshold experiment file.
   * @param {number} [simulationBeta=3] Used by Weibull observer model. The steepness parameter of the Weibull psychometric function. From Threshold experiment file.
   * @param {number} [simulationDelta=0.01] Used by Weibull observer model. Set the asymptote of the Weibull psychometric function to 1-delta. From Threshold experiment file.
   * @param {number} [simulationThreshold=0] The actual threshold of the simulated observer. We test the implementation of Quest by testing how well it estimates simulationThreshold. From Threshold experiment file.
   */
  constructor(
    trial,
    thresholdProportionCorrect,
    simulationBeta,
    simulationDelta,
    simulationThreshold
  ) {
    this.tpc = thresholdProportionCorrect;
    this.trial = trial;

    this.beta = simulationBeta;
    this.delta = simulationDelta;
    this.simulationThreshold = simulationThreshold;
    this.setGamma();
    this.setEpsilon();
  }
  updateSimulationParameters(
    simulationBeta,
    simulationDelta,
    simulationThreshold
  ) {
    if (simulationBeta) this.beta = simulationBeta;
    if (simulationDelta) this.delta = simulationDelta;
    if (simulationThreshold) this.simulationThreshold = simulationThreshold;
    this.setGamma();
    this.setEpsilon();
  }
  /**
   * Calculate the gamma value for the Weibull function,
   * ie the probability of blindly guessing the correct answer.
   */
  setGamma() {
    this.gamma = 1 / this.trial.possibleResponses.length;
  }
  /**
   * Calculate the epsilon value for the Weibull function,
   * set (once) so that P=thresholdProportionCorrect when tTest-tActual=0.
   */
  setEpsilon() {
    const epsilon =
      log(
        -1 *
          Math.log(
            (-1 * ((this.tpc - this.delta * this.gamma) / (1 - this.delta)) +
              1) /
              (1 - this.gamma)
          ),
        10
      ) / this.beta;
    this.epsilon = epsilon;
  }
  /**
   * Update the trial to which the simulated observer is responding.
   * @param {TrialProperties} newTrial The new trial information to replace the old.
   */
  updateTrial(newTrial) {
    const characterSetsEqual = arraysEqual(
      this.trial.possibleResponses,
      newTrial.possibleResponses
    );
    this.trial = newTrial;
    if (!characterSetsEqual) {
      console.error(
        "Simulated observer not operated as intended: Epsilon changed.\nThe same simulated observer is not intended to be used across multiple conditions (ie columns of your experiment.csv file)."
      );
      this.setGamma();
      this.setEpsilon();
    }
  }
  /**
   * Simulates the current trial by returning the correctness of the observer's response,
   * ie whether the observer selected the correct answer.
   * @returns {{0|1} Whether or not this observer responded correctly
   */
  simulateTrial() {
    const tTest = this.trial.stimulusIntensity;
    const tActual = log(this.simulationThreshold, 10);
    //    t=tTest-tActual+q.epsilon;
    const t = tTest - tActual + this.epsilon;

    //    P=q.deltaq.gamma+(1-q.delta)(1-(1-q.gamma)exp(-10.^(q.betat)));
    const P =
      this.delta * this.gamma +
      (1 - this.delta) *
        (1 - (1 - this.gamma) * Math.exp(-1 * 10 ** (this.beta * t)));

    //    response= P > rand(1);
    const responseCorrect = P > Math.random();
    return responseCorrect ? 1 : 0;
  }
  /**
   * Simulates the current trial by returning the observer's response.
   * @returns {string} The symbol the observer responded as the target that they "saw".
   */
  getSimulatedResponse() {
    const answerCorrectly = this.simulateTrial();
    if (answerCorrectly) return this.trial.correctResponse;
    const incorrectResponses = this.trial.possibleResponses.filter(
      (answer) => answer !== this.trial.correctResponse
    );
    // https://stackoverflow.com/questions/4550505/getting-a-random-value-from-a-javascript-array
    return incorrectResponses[
      Math.floor(Math.random() * incorrectResponses.length)
    ];
  }
}

class IdealObserver {
  constructor(trial) {
    this.correctResponse = trial.correctResponse;
  }
  updateTrial(newTrial) {
    this.correctResponse = newTrial.correctResponse;
  }
  /**
   * Simulates the current trial by returning the correctness of the observer's response,
   * ie whether the observer selected the correct answer.
   * @returns {{0|1} Whether or not this observer responded correctly
   */
  simulateTrial() {
    return 1;
  }
  getSimulatedResponse() {
    return this.correctResponse;
  }
}

class BlindObserver {
  constructor(trial) {
    this.possibleResponses = trial.possibleResponses;
  }
  updateTrial(newTrial) {
    this.possibleResponses = newTrial.possibleResponses;
  }
  /**
   * Simulates the current trial by returning the correctness of the observer's response,
   * ie whether the observer selected the correct answer.
   * @returns {{0|1} Whether or not this observer responded correctly
   */
  simulateTrial() {
    return Math.random() > 1 / this.possibleResponses.length ? 1 : 0;
  }
  getSimulatedResponse() {
    return this.possibleResponses[
      Math.floor(Math.random() * this.possibleResponses.length)
    ];
  }
}
