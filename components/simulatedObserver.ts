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

// TODO simulateWithDisplayBool
/*
 * TODO:
 * - add dependent parameter checks to preprocessor
 *   eg If simulateParticipantBool -> simulationModel
 *      If simulationModel[Weibull] -> simulationBeta, simulationDelta
 * - make simulateObserverResponse a SimulatedObserver method, ie `respond()`
 * - make `proceed` a method, ie skip routine fn if simulated
 *      if (simulated && simulated[status.block]) return Scheduler.Event.NEXT;
 * - clean up `simulated` map in threshold, and see if actually necessary
 */

import * as core from "../psychojs/src/core/index.js";
import * as util from "../psychojs/src/util/index.js";

const { EventManager } = core;
const { Scheduler } = util;
import { createSignalingMap, arraysEqual, log, sleep } from "./utils.js";
import { ParamReader } from "../parameters/paramReader.js";
import { canClick, canType, getResponseType } from "./response.js";
import { responseType, rsvpReadingTargetSets, targetKind } from "./global.js";

class SimulatedObserverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulatedObserverError";
  }
}

type BlockCondition = string;
type SimulationModel = "weibull" | "blind" | "ideal" | "right" | "wrong";

/**
 * Information about the stimuli of a trial.
 */
interface TrialProperties {
  stimulusIntensity: number;
  possibleResponses: string[];
  correctResponses: string[];
}
interface Response {
  responseValue: string;
  correctness: 0 | 1;
}

export class SimulatedObserversHandler {
  reader: ParamReader;
  psychoJS: core.PsychoJS;
  observers: Map<BlockCondition, SimulatedObserver>;
  simulatedBlocks: Set<number>;
  sunglasses: HTMLElement;

  BC?: BlockCondition;
  // trialProperties?: Object;

  constructor(parameterReader: ParamReader, psychoJS: core.PsychoJS) {
    this.reader = parameterReader;
    this.psychoJS = psychoJS;
    this.sunglasses = document.createElement("div");
    this.sunglasses.classList.add("simulated-cover");

    this.observers = new Map();
    this.simulatedBlocks = new Set();
    // this.trialProperties = undefined;
    this.BC = undefined;
    this.setup();
  }
  // setup: checkIfSimulated, compile observers
  setup() {
    for (const condition of this.reader.conditions as any) {
      if (!condition.block_condition)
        throw new SimulatedObserverError(
          "No block_condition (unique id for this staircase) provided for this condition.",
        );
      const block_condition = condition.block_condition;
      const block = this.reader.read("block", block_condition);
      if (this.reader.read("simulateParticipantBool", block_condition)) {
        // eslint-disable-next-line no-prototype-builtins
        const thisObserverModel = this.reader.read(
          "simulationModel",
          block_condition,
        ) as SimulationModel;
        const thisObserver = new SimulatedObserver(
          thisObserverModel,
          this.reader.read("thresholdProportionCorrect", block_condition),
          this.reader.read("simulationBeta", block_condition),
          this.reader.read("simulationDelta", block_condition),
          this.reader.read("simulationThreshold", block_condition),
          this.reader,
        );
        this.observers.set(block_condition, thisObserver);
        this.simulatedBlocks.add(block);
      }
    }
  }
  // Update for the current trial
  update(newBC: BlockCondition, newTrialProperties: TrialProperties) {
    if (typeof newBC === "undefined") throw new SimulatedObserverError("");
    if (typeof newTrialProperties === "undefined")
      throw new SimulatedObserverError("");
    this.BC = newBC;

    //  @ts-ignore
    if (!this.reader.read("simulateParticipantBool", this.BC)) return;
    if (!this.observers.has(this.BC)) throw new SimulatedObserverError("");
    if (typeof this.observers === "undefined")
      throw new SimulatedObserverError("");
    if (typeof this.observers.get(this.BC) === "undefined")
      throw new SimulatedObserverError("");

    // @ts-ignore
    this.observers.get(this.BC).trial = newTrialProperties;
    this.observers.get(this.BC)?.update(this.BC, newTrialProperties);
  }
  // Predicate. Should we move to the next routine, ie is the current block/condition simulated?
  proceed(blockOrCondition?: number | BlockCondition) {
    if (typeof blockOrCondition === "undefined") {
      if (typeof this.BC === "undefined")
        throw new SimulatedObserverError(
          "this.BC is undefined and blockOrCondition has not been provided. Ensure that .update() has been called before .proceed() this trial. SimulatedObserversHander.proceed.",
        );
      const block = Number(this.BC?.split("_")[0]);
      return this.simulatedBlocks.has(block);
    }
    const block = Number(String(blockOrCondition).split("_")[0]);
    return this.simulatedBlocks.has(block);
  }
  async respond() {
    if (typeof this.BC === "undefined")
      throw new SimulatedObserverError(
        "this.BC is undefined, simulatedObserversHandler.respond",
      );
    const BC = this.BC as unknown as number; // Treat BC as number, as reader's default input is a block number, so TS thinks it only accepts number, not number|string
    const thisObserver = this.observers.get(this.BC);
    if (typeof thisObserver === "undefined")
      throw new SimulatedObserverError(
        `thisObserver is undefined, SimulatedObserversHandler.respond. Check SimulatedObserversHandler.setup logic. BC: ${this.BC}, observers: ${this.observers}.`,
      );
    const responses = thisObserver.getSimulatedResponses();

    const responseType = getResponseType(
      this.reader.read("responseClickedBool", BC),
      this.reader.read("responseTypedBool", BC),
      this.reader.read("!responseTypedEasyEyesKeypadBool", BC),
      this.reader.read("responseSpokenBool", BC),
      undefined,
      this.reader.read("responseSpokenBool", BC),
    );
    for (let r of responses) {
      if (canClick(responseType)) {
        this._respondByClick(r.responseValue);
      } else if (canType(responseType)) {
        if (this.reader.read("targetKind", BC) === "rsvpReading")
          r.responseValue = r.correctness ? "up" : "down";
        this._respondByKeypress(r.responseValue);
      } else {
        // TODO handle other modalities, eg up/down for responseSpokenBool in rsvpReading
        throw new SimulatedObserverError(
          `Unhandled input modality, SimulatedObserversHandler.respond. Neither typing nor clicking is allowed. responseType: ${responseType}`,
        );
      }
    }
  }
  putOnSunglasses = () => {
    document.body.appendChild(this.sunglasses);
  };
  _respondByClick = (response: string) => {
    const interval = setInterval(() => {
      // Match naming used in showCharacterSet.js:pushCharacterSet
      const clickableCharacterSetId = `clickableCharacter-${response.toLowerCase()}`;
      let clickableCharacterSet = document.getElementById(
        clickableCharacterSetId,
      );
      if (clickableCharacterSet) {
        clearInterval(interval);
        clickableCharacterSet.click();
      }

      // Match naming usedin response.js:setupPhraseIdentification
      // TODO repeated targets in rsvpReading?? ie do we need to ensure that phraseIdentificationResponseId is from the same colum as our desired response???
      const phraseIdentificationResponseId = `phrase-identification-category-item-${response}`;
      const phraseIdentificationResponse = document.getElementById(
        phraseIdentificationResponseId,
      );
      if (phraseIdentificationResponse) {
        clearInterval(interval);
        phraseIdentificationResponse.click();
        return;
      }
    }, 50);

    // TODO generalize to other clicking modalities???
  };
  _respondByKeypress = (response: string) => {
    // Simulate a keypress
    const simulatedResponseEvent = {
      key: response.toLocaleLowerCase(),
      // code: signalingCode,
      // keyCode: signalingKeyCode,
      // which: signalingKeyCode,
    };
    const simulatedKeydown = new KeyboardEvent(
      "keydown",
      simulatedResponseEvent,
    );
    const simulatedKeyup = new KeyboardEvent("keyup", simulatedResponseEvent);
    window.dispatchEvent(simulatedKeydown);
    window.dispatchEvent(simulatedKeyup);
  };
}

// export const simulateObserverResponse = (
//   simulatedObserver,
//   keyboard,
//   psychoJS
// ) => {
//   // Get the possible stimuli, and which the observer chose
//   const possibleResponses = simulatedObserver.trial.possibleResponses.map((s) =>
//     s.toLowerCase()
//   );
//   const correctResponse = simulatedObserver.trial.correctResponse.toLowerCase();
//   const simulatedResponse = simulatedObserver
//     .getSimulatedResponse()
//     .toLowerCase();

//   // Get keys corresponding to the possible, and chosen, stimuli
//   const responseToSignalKeyCode = createSignalingMap(possibleResponses);

//   // const signalingIndex = possibleResponses.indexOf(simulatedResponse);
//   // const startingKeyCode = 65;
//   // const signalingKeyCode = signalingIndex + startingKeyCode;
//   const signalingKeyCode = responseToSignalKeyCode[simulatedResponse];
//   const signalingKey = String.fromCharCode(signalingKeyCode);
//   const signalingCode = EventManager.keycode2w3c(signalingKeyCode);

//   const correctSignalingKeyCode = responseToSignalKeyCode[correctResponse];
//   const correctSignalingKey = String.fromCharCode(correctSignalingKeyCode);
//   // const correctSignalingCode = EventManager.keycode2w3c(correctSignalingKeyCode);

//   // Add variables to the output datafile
//   psychoJS.experiment.addData("simulatedResponse", simulatedResponse);
//   psychoJS.experiment.addData("correctResponse", correctResponse);
//   psychoJS.experiment.addData("signalingKey", signalingKey);
//   psychoJS.experiment.addData("correctSignalingKey", correctSignalingKey);
//   psychoJS.experiment.addData(
//     "signalingCharacterSet",
//     Object.values(responseToSignalKeyCode).map((keycode) =>
//       String.fromCharCode(keycode)
//     )
//   );

//   // Simulate a keypress
//   const simulatedResponseEvent = {
//     key: signalingKey,
//     code: signalingCode,
//     keyCode: signalingKeyCode,
//     which: signalingKeyCode,
//   };
//   const simulatedKeydown = new KeyboardEvent("keydown", simulatedResponseEvent);
//   const simulatedKeyup = new KeyboardEvent("keyup", simulatedResponseEvent);
//   window.dispatchEvent(simulatedKeydown);
//   window.dispatchEvent(simulatedKeyup);

//   const theseKeys = keyboard.getKeys({
//     // keyList: signalingCharacterSet,
//     waitRelease: false,
//   });

//   keyboard.keys = [theseKeys[0].name];
//   keyboard.rt = [theseKeys[0].rt];

//   if (signalingKeyCode === correctSignalingKeyCode) {
//     keyboard.corr = 1;
//   } else {
//     keyboard.corr = 0;
//   }
//   return Scheduler.Event.NEXT;
// };

/**
 * Simulated observer class, which responds to a given trial using one of three schemas:
 * • "blind": This model merely presses a random response key.
 * • "ideal": This model does the same task as the human, picking the best response given the stimulus. Its threshold is a useful point of reference in analyzing human data. Without noise, it will always be right. Since noise is still months away, for now, just give the right answer.
 * • "weibull": This model gets the trial right with a probability given by the Weibull function, which is frequently fit to human data. The QUEST staircase asssumes the Weibull model, so QUEST should accurately measure its (unknown to Quest) threshold, when the respt of the parameters match. https://psychopy.org/api/data.html#psychopy.data.QuestHandler
 */
export class SimulatedObserver {
  simulationModel: SimulationModel;
  observer: Observer;
  trial?: TrialProperties;
  BC?: BlockCondition;
  reader: ParamReader;
  /**
   * @param {("weibull"|"blind"|"ideal"|"right"|"wrong")} simulationModel Guessing scheme for the simulated observer
   * @param {number} [thresholdProportionCorrect=0.7] the threshold criterion. From Threshold experiment file.
   * @param {number} [simulationBeta=3] Used by Weibull observer model. The steepness parameter of the Weibull psychometric function. From Threshold experiment file.
   * @param {number} [simulationDelta=0.01] Used by Weibull observer model. Set the asymptote of the Weibull psychometric function to 1-delta. From Threshold experiment file.
   * @param {number} [simulationThreshold=0] The actual threshold of the simulated observer. We test the implementation of Quest by testing how well it estimates simulationThreshold. From Threshold experiment file.
   */
  constructor(
    simulationModel: SimulationModel,
    thresholdProportionCorrect: number = 0.7,
    simulationBeta: number = 3,
    simulationDelta: number = 0.01,
    simulationThreshold: number = 0,
    reader: ParamReader,
  ) {
    if (
      !["weibull", "blind", "ideal", "right", "wrong"].includes(simulationModel)
    ) {
      throw new SimulatedObserverError(
        `Simulated observer type "${simulationModel}" not recognized.`,
      );
    }
    // document.body.classList.add("simulated-ring");
    this.reader = reader;
    this.simulationModel = simulationModel;
    switch (this.simulationModel) {
      case "weibull":
        this.observer = new WeibullObserver(
          thresholdProportionCorrect,
          simulationBeta,
          simulationDelta,
          simulationThreshold,
        );
        break;
      case "blind":
        this.observer = new BlindObserver();
        break;
      case "ideal":
        this.observer = new IdealObserver();
        break;
      case "right":
        this.observer = new RightObserver();
        break;
      case "wrong":
        this.observer = new WrongObserver();
    }
  }
  /**
   * Update the trial to which the simulated observer is responding.
   */
  update(BC: BlockCondition, newTrial: TrialProperties) {
    this.observer.updateTrial(newTrial);
    this.trial = newTrial;
    this.BC = BC;
  }
  updateSimulationParameters(
    simulationBeta: number,
    simulationDelta: number,
    simulationThreshold: number,
  ) {
    if (this.simulationModel === "weibull") {
      // @ts-ignore
      this.observer.updateSimulationParameters(
        simulationBeta,
        simulationDelta,
        simulationThreshold,
      );
    }
  }
  getSimulatedResponses(): Response[] {
    if (typeof this.BC === "undefined")
      throw new SimulatedObserverError(
        "this.BC is undefined, SimulatedObserver.getSimulatedResponse",
      );
    if (typeof this.trial === "undefined")
      throw new SimulatedObserverError(
        "this.trial is undefined, SimulatedObserver.getSimulatedResponse",
      );
    const thisTargetKind = targetKind.current as unknown as string;
    let nResponsesRequired: number;
    switch (thisTargetKind) {
      case "letter":
      case "repeatedLetters":
        nResponsesRequired = responseType.numberOfResponses;
        break;
      case "rsvpReading":
        if (typeof rsvpReadingTargetSets.numberOfSets === "undefined")
          throw new SimulatedObserverError(
            "rsvpReadingTargetSets.numberOfSets is undefined; this value should be defined, to dictate how many simulated responses are required this trial. SimulatedObserver.getSimulatedResponses.",
          );
        return this._getSimulatedResponsesForRSVPReading();
      default:
        throw new SimulatedObserverError(
          `targetKind not yet supported, SimulatedObserver.getSimulatedResponse. targetKind: ${thisTargetKind}`,
        );
    }
    if (this.trial.correctResponses.length !== nResponsesRequired)
      throw new SimulatedObserverError(
        `Number of responses required is not equal to the number of correct responses, SimulatedObserver.getSimulatedResponses. nResponsesRequired: ${nResponsesRequired}, correctResponses: ${this.trial.correctResponses}`,
      );
    const responses: Response[] = [];
    const responseValuesAlreadyProvided: Set<string> = new Set();
    while (responses.length !== nResponsesRequired) {
      const thisResponse = this.observer.getSimulatedResponse();
      if (!responseValuesAlreadyProvided.has(thisResponse.responseValue)) {
        responses.push(thisResponse);
        responseValuesAlreadyProvided.add(thisResponse.responseValue);
      }
    }
    return responses;
  }
  _getSimulatedResponsesForRSVPReading(): Response[] {
    if (typeof this.BC === "undefined")
      throw new SimulatedObserverError(
        "this.BC is undefined. SimulatedObserver._getSimulatedResponsesForRSVPReading",
      );
    const BC = this.BC as unknown as number; // Treat BC as number, as reader's default input is a block number, so TS thinks it only accepts number, not number|string

    if (typeof this.trial === "undefined")
      throw new SimulatedObserverError(
        "this.trial is undefined. SimulatedObserver._getSimulatedResponsesForRSVPReading.",
      );
    // TODO check trial.possibleResponses is defined
    // TODO check trial.correctResponses is defined
    const originalPossibleResponses = this.trial?.possibleResponses;
    const originalCorrectResponses = this.trial?.correctResponses;
    let allPossibleResponses = [...originalPossibleResponses];
    let allCorrectResponses = [...originalCorrectResponses];

    const numberOfSets =
      rsvpReadingTargetSets.numberOfSets as unknown as number;
    // TODO check that numberOfSets is defined
    const wordsPerSet = this.reader.read(
      "rsvpReadingNumberOfResponseOptions",
      BC,
    );
    // TODO check that allPossibleResponses.length === wordsPerSet*numberOfSets
    // TODO check that allCorrectResponses.length === numberOfSets

    let responses: Response[] = [];
    // One iteration per set. Same as one iteration per correct response.
    for (let i = 0; i < numberOfSets; i++) {
      if (!allCorrectResponses.length)
        throw new SimulatedObserverError(
          "Not enough correct responses. SimulatedObserver._getSimulatedResponsesForRSVPReading.",
        );
      const correctResponse = allCorrectResponses.shift() as unknown as string;
      let possibleResponses: string[] = [];
      if (allPossibleResponses.length < wordsPerSet)
        throw new SimulatedObserverError(
          "Not enough possible responses, given the requested rsvpReadingNumberOfResponseOptions. SimulatedObserver._getSimulatedResponsesForRSVPReading.",
        );
      for (let j = 0; j < wordsPerSet; j++) {
        // @ts-ignore
        possibleResponses.push(allPossibleResponses.shift());
      }
      this.update(this.BC, {
        stimulusIntensity: this.trial.stimulusIntensity,
        possibleResponses: possibleResponses,
        correctResponses: [correctResponse],
      });
      responses.push(this.observer.getSimulatedResponse());
    }
    // Reset the observer back to its original state.
    this.update(this.BC, {
      stimulusIntensity: this.trial.stimulusIntensity,
      possibleResponses: originalPossibleResponses,
      correctResponses: originalCorrectResponses,
    });
    return responses;
  }
}

class Observer {
  trial?: TrialProperties;

  constructor() {}
  updateTrial(newTrial: TrialProperties) {
    this.trial = newTrial;
  }
  getSimulatedResponse(): Response {
    throw new SimulatedObserverError(
      "Method getSimulatedResponse() must be implemented at model level.",
    );
  }
}
class WeibullObserver extends Observer {
  trial?: TrialProperties;
  // tpc:number; beta: number;
  tpc;
  beta;
  delta;
  simulationThreshold;
  gamma?: number;
  epsilon?: number;

  /**
   * @param {number} thresholdProportionCorrect the threshold criterion. From Threshold experiment file.
   * @param {number} [simulationBeta=3] Used by Weibull observer model. The steepness parameter of the Weibull psychometric function. From Threshold experiment file.
   * @param {number} [simulationDelta=0.01] Used by Weibull observer model. Set the asymptote of the Weibull psychometric function to 1-delta. From Threshold experiment file.
   * @param {number} [simulationThreshold=0] The actual threshold of the simulated observer. We test the implementation of Quest by testing how well it estimates simulationThreshold. From Threshold experiment file.
   */
  constructor(
    thresholdProportionCorrect: number,
    simulationBeta: number,
    simulationDelta: number,
    simulationThreshold: number,
  ) {
    super();
    this.tpc = thresholdProportionCorrect;
    this.beta = simulationBeta;
    this.delta = simulationDelta;
    this.simulationThreshold = simulationThreshold;

    this.gamma = undefined;
    this.epsilon = undefined;
  }
  updateSimulationParameters(
    simulationBeta: number,
    simulationDelta: number,
    simulationThreshold: number,
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
    if (typeof this.trial === "undefined")
      throw new SimulatedObserverError(
        "this.trial is undefined, WeibullObserver.setGamma",
      );
    if (typeof this.trial.possibleResponses === "undefined")
      throw new SimulatedObserverError(
        "this.trial.possibleResponses is undefined, WeibullObserver.setGamma",
      );
    this.gamma = 1 / this.trial.possibleResponses.length;
  }
  /**
   * Calculate the epsilon value for the Weibull function,
   * set (once) so that P=thresholdProportionCorrect when tTest-tActual=0.
   */
  setEpsilon() {
    if (!this.gamma)
      throw new SimulatedObserverError(
        "this.gamma is undefined, WeibullObserver.setEpsilon",
      );
    const epsilon =
      log(
        -1 *
          Math.log(
            (-1 * ((this.tpc - this.delta * this.gamma) / (1 - this.delta)) +
              1) /
              (1 - this.gamma),
          ),
        10,
      ) / this.beta;
    this.epsilon = epsilon;
  }
  /**
   * Update the trial to which the simulated observer is responding.
   * @param {TrialProperties} newTrial The new trial information to replace the old.
   */
  updateTrial(newTrial: TrialProperties) {
    if (this.trial?.possibleResponses) {
      const characterSetsEqual = arraysEqual(
        this.trial.possibleResponses,
        newTrial.possibleResponses,
      );
      if (!characterSetsEqual) {
        console.error(
          "Simulated observer not operated as intended: Epsilon changed.\nThe same simulated observer is not intended to be used across multiple conditions (ie columns of your experiment.csv file).",
        );
        this.setGamma();
        this.setEpsilon();
      }
    }
    this.trial = newTrial;
  }
  /**
   * Simulates the current trial by returning the correctness of the observer's response,
   * ie whether the observer selected the correct answer.
   * @returns {{0|1} Whether or not this observer responded correctly
   */
  _didObserverRespondCorrectly(): {} {
    if (typeof this.trial === "undefined")
      throw new SimulatedObserverError(
        "this.trial is undefined, WeibullObserver.trial",
      );
    const tTest = this.trial.stimulusIntensity;
    const tActual = log(this.simulationThreshold, 10);
    if (typeof this.epsilon === "undefined")
      throw new SimulatedObserverError(
        "this.epsilon is undefined, WeibullObserver.simulateTrial",
      );
    const t = tTest - tActual + this.epsilon;

    if (typeof this.gamma === "undefined")
      throw new SimulatedObserverError(
        "this.gamma is undefined, WeibullObserver.simulateTrial",
      );
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
  getSimulatedResponse(): Response {
    if (typeof this.trial === "undefined")
      throw new SimulatedObserverError(
        "this.trial is undefined, WeibullObserver.getSimulatedResponse",
      );
    if (typeof this.trial?.correctResponses === "undefined")
      throw new SimulatedObserverError(
        "this.trial.correctResponses is undefined, WeibullObserver.getSimulatedResponse",
      );
    if (typeof this.trial?.possibleResponses === "undefined")
      throw new SimulatedObserverError(
        "this.trial.possibleResponses is undefined, WeibullObserver.getSimulatedResponse",
      );
    const answerCorrectly = this._didObserverRespondCorrectly();
    if (answerCorrectly) {
      const correctResponse = sample(this.trial.correctResponses);
      return { responseValue: correctResponse, correctness: 1 };
    }
    // @ts-ignore Why is this necessary?? Don't understand why undefined check for this.trial isn't catching that this.trial can't be undefined.
    const incorrectResponses = this.trial.possibleResponses.filter(
      (x) => !this.trial?.correctResponses.includes(x),
    );
    const selectedIncorrectResponse = sample(incorrectResponses);
    return { responseValue: selectedIncorrectResponse, correctness: 0 };
  }
}

class IdealObserver extends Observer {
  constructor() {
    super();
  }
  getSimulatedResponse(): Response {
    if (typeof this.trial === "undefined")
      throw new SimulatedObserverError(
        "this.trial is undefined, IdealObserver.getSimulatedResponse",
      );
    return {
      responseValue: sample(this.trial.correctResponses),
      correctness: 1,
    };
  }
}

class BlindObserver extends Observer {
  constructor() {
    super();
  }
  getSimulatedResponse(): Response {
    if (typeof this.trial !== "undefined") {
      const responses = this.trial.possibleResponses;
      const simulatedResponse = sample(responses);
      const respondedCorrectly =
        this.trial.correctResponses.includes(simulatedResponse);
      return {
        responseValue: simulatedResponse,
        correctness: respondedCorrectly ? 1 : 0,
      };
    }
    throw new SimulatedObserverError(
      "this.trial is undefined, BlindObserver.getSimulatedResponse",
    );
  }
}
class RightObserver extends Observer {
  constructor() {
    super();
  }
  getSimulatedResponse(): Response {
    if (typeof this.trial === "undefined")
      throw new SimulatedObserverError(
        "this.trial is undefined, RightObserver.getSimulatedResponse",
      );
    return {
      responseValue: sample(this.trial.correctResponses),
      correctness: 1,
    };
  }
}
class WrongObserver extends Observer {
  constructor() {
    super();
  }
  getSimulatedResponse(): Response {
    if (typeof this.trial === "undefined")
      throw new SimulatedObserverError(
        "this.trial is undefined, RightObserver.getSimulatedResponse",
      );
    const wrongResponses = this.trial.possibleResponses.filter(
      (x) => !this.trial?.correctResponses.includes(x),
    );
    return { responseValue: sample(wrongResponses), correctness: 0 };
  }
}

// --- Helpers ---
const sample = <T>(arr: T[]): T => {
  // SEE https://stackoverflow.com/questions/4550505/getting-a-random-value-from-a-javascript-array
  const l = arr.length;
  return arr[Math.floor(Math.random() * l)];
};
