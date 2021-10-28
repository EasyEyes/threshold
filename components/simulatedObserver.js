/*
SIMULATION MODEL. Participant page. 
Implement simulationModel: blind, ideal, and weibull.
blind: the simulated observer randomly chooses one of the letters from the possible targets, i.e. the "alphabet".
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

class TrialProperties {
  /**
   *
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
export class WeibullObserver {
  constructor(
    simulationBeta,
    simulationDelta,
    possibleResponses,
    correctResponse,
    stimulusIntensity,
    simulationThreshold,
    thresholdProportionCorrect
  ) {
    this.tpc = thresholdProportionCorrect;

    this.trial = new TrialProperties(
      stimulusIntensity,
      possibleResponses,
      correctResponse
    );

    this.beta = simulationBeta;
    this.delta = simulationDelta;
    // Probability of blindly guessing the correct answer
    this.gamma = 1 / possibleResponses.length;
    this.simulationThreshold = simulationThreshold;
    this.setEpison();
  }
  setEpison() {
    this.epsilon =
      log(
        Math.log(
          (this.tpc - this.delta * this.gamma) /
            (1 - this.delta)(1 - (1 - this.gamma))
        ),
        -10
      ) / this.beta;
  }
  updateTrial(stimulusIntensity, possibleResponses, correctResponse) {
    this.trial = new TrialProperties(
      stimulusIntensity,
      possibleResponses,
      correctResponse
    );
    this.gamma = 1 / possibleResponses.length;
    this.setEpison();
  }
  simulateTrial() {
    //    t=tTest-tActual+q.epsilon;
    const tTest = this.trial.stimulusIntensity;
    const tActual = this.simulationThreshold;
    const t = tTest - tActual + this.epsilon;

    //    P=q.deltaq.gamma+(1-q.delta)(1-(1-q.gamma)exp(-10.^(q.betat)));
    const P =
      this.delta * this.gamma +
      (1 - this.delta) *
        (1 - (1 - this.gamma)) *
        Math.exp((-10) ** (this.beta * t));

    //    response= P > rand(1);
    const response = P > Math.random();
    return response;
  }
  getSimulatedResponse() {
    const answerCorrectly = this.simulateTrial();
    if (answerCorrectly) return this.correctResponse;
    const incorrectResponses = this.possibleResponses.filter(
      (answer) => answer !== this.correctResponse
    );
    // https://stackoverflow.com/questions/4550505/getting-a-random-value-from-a-javascript-array
    return incorrectResponses[
      Math.floor(Math.random() * this.incorrectResponse.length)
    ];
  }
}

export class PerfectObserver {
  constructor(correctResponse) {
    this.correctResponse = correctResponse;
  }
  updateTrial(correctResponse) {
    this.correctResponse = correctResponse;
  }
  simulateTrial() {
    return true;
  }
  getSimulatedResponse() {
    return this.correctResponse;
  }
}

export class BlindObserver {
  constructor(possibleResponses) {
    this.possibleResponses = possibleResponses;
  }
  updateTrial(possibleResponses) {
    this.possibleResponses = possibleResponses;
  }
  simulateTrial() {
    return Math.random() > 1 / this.possibleResponses.length;
  }
  getSimulatedResponse() {
    return this.possibleResponses[
      Math.floor(Math.random() * this.possibleResponses.length)
    ];
  }
}

const log = (x, base) => {
  return Math.log(x) / Math.log(base);
};
