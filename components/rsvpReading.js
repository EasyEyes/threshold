import { PsychoJS } from "../psychojs/src/core";
import { TextStim } from "../psychojs/src/visual";
import {
  displayOptions,
  font,
  letterConfig,
  readingConfig,
  readingFrequencyToWordArchive,
  rsvpReadingTargetSets,
  rsvpReadingTiming,
  status,
  phraseIdentificationResponse,
  dummyStim,
  rsvpReadingResponse,
  fontSize,
} from "./global";
import { psychoJS } from "./globalPsychoJS";
import {
  getEvenlySpacedValues,
  logger,
  sampleWithReplacement,
  shuffle,
  toFixedNumber,
  XYPixOfXYDeg,
} from "./utils";
import { Color } from "../psychojs/src/util";
import { findReadingSize, getThisBlockPages } from "./readingAddons";
import {
  prepareReadingQuestions,
  preprocessCorpusToWordList,
  tokenizeWordsIndividually,
} from "./reading";
import { showCursor } from "./utils";
import {
  getPhraseIdentificationReactionTimes,
  noteStimulusOnsetForPhraseIdentification,
  showPhraseIdentification,
} from "./response";

export class RSVPReadingTargetSet {
  constructor(
    word,
    position,
    durationSec,
    orderNumber,
    foilWords,
    paramReader,
    BC
  ) {
    this.word = word;
    this.foilWords = foilWords;
    this.position = position;
    this.startTime = durationSec * orderNumber;
    this.stopTime = this.startTime + durationSec;
    this.orderNumber = orderNumber;
    this.flankerCharacterSet = paramReader
      .read("rsvpReadingFlankerCharacterSet", BC)
      .split("");

    this.paramReader = paramReader;
    this.BC = BC;
    // For use if spacingRelationToSize === ratio
    this._heightPx = getRSVPReadingHeightPx(this.paramReader, this.BC);
    this._spacingPx = this._heightPx * letterConfig.spacingOverSizeRatio;

    this.flankerLettersUsed = [];

    this.stims = this.generateStims();
  }
  generateStims() {
    // Determine target and distractor strings
    const strings = this._generateStimStrings();
    // Create the stims for those strings
    switch (letterConfig.spacingRelationToSize) {
      case "ratio":
        return this._generateRatioStims(strings);
      case "typographic":
        return this._generateTypographicStims(strings);
      default:
        // TODO add compiler check to ensure spacingRelationToSize in [ratio, typographic] for rsvpReading
        console.error(
          `Unsupported spacingRelationToSize: ${letterConfig.spacingRelationToSize}`
        );
        return this._generateRatioStims(strings);
    }
  }
  _generateStimStrings() {
    let strings = [];
    if (this.flankerCharacterSet.length > 0) {
      const lineLength = this.word.length + 2;
      // Top string
      strings.push(
        sampleWithReplacement(this.flankerCharacterSet, lineLength).join("")
      );
      // Middle string
      strings.push(
        sampleWithReplacement(this.flankerCharacterSet, 1).join("") +
          this.word +
          sampleWithReplacement(this.flankerCharacterSet, 1).join("")
      );
      // Bottom string
      strings.push(
        sampleWithReplacement(this.flankerCharacterSet, lineLength).join("")
      );
    } else {
      strings.push(this.word);
    }
    return strings;
  }
  _generateRatioStims(strings) {
    if (strings.length > 1) {
      const topRowPosition = [
        this.position[0],
        this.position[1] + this._spacingPx,
      ];
      const bottomRowPosition = [
        this.position[0],
        this.position[1] - this._spacingPx,
      ];
      const topRowFlankerLetters = _generateLetterStimsForWord(
        strings[0],
        topRowPosition,
        this._heightPx,
        this._spacingPx,
        `topFlanker-${this.orderNumber}`
      );
      const targetRowLetters = _generateLetterStimsForWord(
        strings[1],
        this.position,
        this._heightPx,
        this._spacingPx,
        `middleRow-${this.orderNumber}`
      );
      const bottomRowFlankerLetters = _generateLetterStimsForWord(
        strings[2],
        bottomRowPosition,
        this._heightPx,
        this._spacingPx,
        `bottomFlanker-${this.orderNumber}`
      );
      return [
        ...topRowFlankerLetters,
        ...targetRowLetters,
        ...bottomRowFlankerLetters,
      ];
    } else {
      return _generateLetterStimsForWord(
        this.word,
        this.position,
        this._heightPx,
        this._spacingPx,
        `middleRow-${this.orderNumber}`
      );
    }
  }

  _generateTypographicStims(strings) {
    const text = strings.join("\n");
    const readingStim = new TextStim({
      name: `typographicReadingTarget-${this.orderNumber}}`,
      win: psychoJS.window,
      text: text,
      font: font.name,
      pos: this.position,
      units: "pix",
      height: this._heightPx,
      wrapWidth: undefined,
      ori: 0.0,
      color: new Color("black"),
      opacity: 1.0,
      depth: 999999,
    });
    readingConfig.height = findReadingSize(
      this.paramReader.read("readingSetSizeBy", this.BC),
      this.paramReader,
      readingStim
    );
    fontSize.current = readingConfig.height;
    readingStim.setHeight(readingConfig.height);
    readingStim.setText(text);
    if (font.letterSpacing) {
      readingStim.setLetterSpacingByProportion(font.letterSpacing);
    }
    return [readingStim];
  }
}

export class Category {
  constructor(targetWord, foils) {
    this.target = targetWord;
    this.foils = foils;
    // The list of all possible responses for each set, the target word mixed in with the foils.
    this.elements = shuffle([this.target, ...this.foils]);
  }
}

class rsvpReadingTrialWords {
  constructor(sequence, responseOptions) {
    this.sequence = sequence;
    const keys = tokenizeWordsIndividually(sequence);
    const remainingResponseOptions = responseOptions.slice();

    // Make sure that response options are in sequence order
    this.responseOptions = keys.map((k, i) => {
      const targetWords = remainingResponseOptions.map(
        (responses) => responses[0]
      );
      const improperAddress = targetWords.indexOf(k.toLowerCase());
      let properOptions = remainingResponseOptions
        .splice(improperAddress, 1)
        .pop();
      // ACCEPT? hacky way to ensure the target words are presented as displayed, ie with punctuation and case
      properOptions = [sequence.split(/\s/)[i], ...properOptions.slice(1)];
      return properOptions;
    });
    this.targetWords = this.responseOptions.map((responses) => responses[0]);
    this.foils = this.responseOptions.map((responses) => responses.slice(1));
    this.responseOptions = this.responseOptions.map((options) =>
      shuffle(options)
    );
  }
}

export const getThisBlockRSVPReadingWords = (reader, block) => {
  // Given block of some conditions, each condition consisting in some trials,
  // for condition create a reading page with a number of lines equal to number of trials for this condition
  // and (???number of words in sentence) equal to length of rsvp sequence.
  // for each trial of each condition, also create reading questions, number of questions equal to length of rsvp sequence, number of answers equal to rsvpnunmberofresponses-1
  const conditions = reader.conditions.filter((c) => c.block === block);
  const numTrialsPerCondition = reader.read("conditionTrials", block);
  const pagePerCondition = getThisBlockPages(
    reader,
    block,
    dummyStim,
    conditions.length,
    numTrialsPerCondition,
    reader.read("rsvpReadingNumberOfWords", block)
  );
  const sequences = pagePerCondition.map((p) => p.split("\n"));
  const targetsAndFoils = sequences.map((conditionTrials, i) =>
    conditionTrials.map((trial) => {
      const BC = conditions[i]["block_condition"];
      const individuallyTokenizedWords = tokenizeWordsIndividually(trial);
      const nQuestions = individuallyTokenizedWords.length;
      const nAnswers = reader.read("rsvpReadingNumberOfResponseOptions", BC);
      const questions = prepareReadingQuestions(
        nQuestions,
        nAnswers,
        individuallyTokenizedWords,
        readingFrequencyToWordArchive[reader.read("readingCorpus", BC)],
        "rsvpReading"
      );
      const responseOptions = questions.map((q) => [
        q.correctAnswer,
        ...q.foils,
      ]);
      const sortByArray = individuallyTokenizedWords.map((w) =>
        w.toLowerCase()
      );
      responseOptions.sort(
        (a, b) => sortByArray.indexOf(a[0]) - sortByArray.indexOf(b[0])
      );
      return responseOptions;
    })
  );
  const wordsPerCondition = {};
  conditions.forEach((c) => {
    const BC = c.block_condition;
    const sequencesForThisCondition = sequences.shift();
    const responseOptionsForThisCondition = targetsAndFoils.shift();
    wordsPerCondition[BC] = sequencesForThisCondition.map(
      (sequence, i) =>
        new rsvpReadingTrialWords(sequence, responseOptionsForThisCondition[i])
    );
  });
  return wordsPerCondition;
};

/**
 *
 * @param {rsvpReadingTrialWords} wordsForThisTrial
 * @param {number} durationSec
 * @param {Reader} paramReader
 * @param {string} BC
 * @returns
 */
export const generateRSVPReadingTargetSets = (
  wordsForThisTrial,
  durationSec,
  paramReader,
  BC
) => {
  const position = XYPixOfXYDeg(
    letterConfig.targetEccentricityXYDeg,
    displayOptions
  );

  const targetWords = wordsForThisTrial.targetWords;
  const foilWords = wordsForThisTrial.foils;
  const targetSets = [];
  for (const [i, targetWord] of targetWords.entries()) {
    targetSets.push(
      new RSVPReadingTargetSet(
        targetWord,
        position,
        durationSec,
        i,
        foilWords[i],
        paramReader,
        BC
      )
    );
  }
  return targetSets;
};

const _generateLetterStimsForWord = (
  word,
  position,
  heightPx,
  spacingPx,
  name
) => {
  const letterOffsets = getEvenlySpacedValues(word.length, spacingPx);
  const letterPositions = letterOffsets.map((xOffset) => [
    position[0] + xOffset,
    position[1],
  ]);
  const nameBase = name
    ? `${name}-letterWordStim-${word}`
    : `letterWordStim-${word}`;
  const letters = letterPositions.map((p, i) => {
    return new TextStim({
      name: nameBase + `-${word[i]}`,
      win: psychoJS.window,
      text: word[i],
      font: font.name,
      pos: p,
      units: "pix",
      height: heightPx,
      wrapWidth: undefined,
      ori: 0.0,
      color: new Color("black"),
      opacity: 1.0,
      depth: 999999,
    });
  });
  return letters;
};

let rsvpEndRoutineAtT;
export const _rsvpReading_trialRoutineEachFrame = (t, frameN, instructions) => {
  // Done showing stimuli
  if (
    typeof rsvpReadingTargetSets.current === "undefined" &&
    rsvpReadingTargetSets.upcoming.length === 0
  ) {
    if (instructions.autoDraw === false) {
      instructions.tSTart = t;
      instructions.frameNStart = frameN;
      // TODO omit response instructions for typed/spoken response in a less ugly way
      if (rsvpReadingResponse.responseType === "typed")
        instructions.setText("");
      instructions.setAutoDraw(true);
      addRevealableTargetWordsToAidSpokenScoring();
    }
    // Continue when enough responses have been registered
    if (
      phraseIdentificationResponse.current.length >=
      rsvpReadingTargetSets.numberOfSets
    ) {
      // Ensure a small delay after the last response, so the participant sees feedback for every response
      rsvpEndRoutineAtT ??= t + 0.5;
      if (t >= rsvpEndRoutineAtT) {
        if (rsvpReadingResponse.responseType === "typed")
          removeScientistKeypressFeedback();
        updateTrialCounterNumbersForRSVPReading();
        rsvpEndRoutineAtT = undefined;
        return false;
      }
    } else {
      showCursor();
      // Show the response screen if response modality is clicking
      if (
        rsvpReadingResponse.responseType === "clicked" &&
        !rsvpReadingResponse.displayStatus
      ) {
        showPhraseIdentification(rsvpReadingResponse.screen);
        rsvpReadingResponse.displayStatus = true;
      } else if (!rsvpReadingResponse.displayStatus) {
        // Else create some subtle feedback that the scientist can use
        addScientistKeypressFeedback(rsvpReadingTargetSets.numberOfSets);
        rsvpReadingResponse.displayStatus = true;
      }
    }
  } else {
    // Draw current target set, given it's time and they're not yet drawn
    if (
      rsvpReadingTargetSets.current.startTime <= t &&
      rsvpReadingTargetSets.current.stims.every(
        (s) => s.status === PsychoJS.Status.NOT_STARTED
      )
    ) {
      rsvpReadingTargetSets.current.stims.forEach((s) => {
        // keep track of start time/frame for later
        s.tStart = t; // (not accounting for frame time here)
        s.frameNStart = frameN; // exact frame index
        s.setAutoDraw(true);
      });
      // Mark start-time for this target set
      if (!rsvpReadingTiming.current.startSec) {
        rsvpReadingTiming.current.startSec = t;
      }
      // If this is the first target set, mark the stimulus onset (to calculate response times later)
      if (rsvpReadingTargetSets.past.length === 0)
        noteStimulusOnsetForPhraseIdentification();
      if (
        !rsvpReadingTiming.current.drawnConfirmedTimestamp &&
        rsvpReadingTargetSets.current.stims.every(
          (s) => s.status === PsychoJS.Status.NOT_STARTED
        )
      ) {
        rsvpReadingTiming.current.drawnConfirmedTimestamp = t;
      }
    }
    if (rsvpReadingTargetSets.current.stopTime <= t) {
      // If current targets are done, undraw them and update which is the current targetSet
      if (
        rsvpReadingTargetSets.current.stims.every(
          (s) => s.status === PsychoJS.Status.STARTED
        )
      ) {
        rsvpReadingTargetSets.current.stims.forEach((s) => {
          s.setAutoDraw(false);
        });
        rsvpReadingTiming.finishSec = t;
        rsvpReadingTargetSets.past.push(rsvpReadingTargetSets.current);
        rsvpReadingTargetSets.current = rsvpReadingTargetSets.upcoming.shift();
      }
    }
    if (rsvpReadingTargetSets.past.length) {
      // The frame just after finishing, to note when the stimuli are confirmed to be undrawn
      const justFinishedStims =
        rsvpReadingTargetSets.past[rsvpReadingTargetSets.past.length - 1].stims;
      if (
        justFinishedStims.every((s) => s.status === PsychoJS.Status.FINISHED) &&
        rsvpReadingTiming.current.drawnConfirmedTimestamp &&
        !rsvpReadingTiming.current.undrawnConfirmedTimestamp
      ) {
        rsvpReadingTiming.current.undrawnConfirmedTimestamp = t;
        justFinishedStims.forEach((s) => (s.frameNFinishedConfirmed = frameN));
      }
    }
  }
  return true;
};

export const getRSVPReadingCategories = (targetSets) => {
  const categories = targetSets.map((s) => new Category(s.word, s.foilWords));
  return categories;
};

export const getRSVPReadingHeightPx = (reader, BC) => {
  // TODO make follow full specification, sizeIsHeight etc
  const sizeDeg = reader.read("targetSizeDeg", BC);
  const targetLocationDeg = [
    reader.read("targetEccentricityXDeg", BC),
    reader.read("targetEccentricityYDeg", BC),
  ];
  const heightPx = Math.round(
    Math.abs(
      XYPixOfXYDeg(
        [targetLocationDeg[0], targetLocationDeg[1] - sizeDeg / 2],
        displayOptions
      )[1] -
        XYPixOfXYDeg(
          [targetLocationDeg[0], targetLocationDeg[1] + sizeDeg / 2],
          displayOptions
        )[1]
    )
  );
  return heightPx;
};

export const resetTiming = (timing) => {
  timing.past.push(structuredClone(timing.current));
  timing.current.startSec = undefined;
  timing.current.finishSec = undefined;
  timing.current.drawnConfirmedTimestamp = undefined;
  timing.current.undrawnConfirmedTimestamp = undefined;
};

export const registerKeypressForRSVPReading = (keypresses) => {
  keypresses.forEach((k) => {
    const correct = k.name === "up" ? 1 : 0;
    phraseIdentificationResponse.clickTime.push(performance.now());
    phraseIdentificationResponse.current.push(k);
    phraseIdentificationResponse.correct.push(correct);

    updateScientistKeypressFeedback(correct);
    _highlightNextWordInRevealedKey();
  });
};

export const addScientistKeypressFeedback = (numberOfResponsesExpected) => {
  // TODO move feedback based on the other things that might be there, eg trial counter
  const feedbackContainer = document.createElement("div");
  feedbackContainer.className = "scientist-feedback-circle-container";
  for (let i = 0; i < numberOfResponsesExpected; i++) {
    const feedbackCircle = document.createElement("div");
    feedbackCircle.className = "scientist-feedback-circle";
    feedbackContainer.appendChild(feedbackCircle);
  }
  document.body.appendChild(feedbackContainer);
  phraseIdentificationResponse.onsetTime = performance.now();
};

const updateScientistKeypressFeedback = (correctBool) => {
  const feedbackCircles = [
    ...document.querySelectorAll(".scientist-feedback-circle"),
  ];
  const unresolvedCircles = feedbackCircles.filter(
    (e) =>
      !(
        [...e.classList].includes("scientist-feedback-circle-correct") ||
        [...e.classList].includes("scientist-feedback-circle-incorrect")
      )
  );
  const nextCircle = unresolvedCircles.shift();
  nextCircle?.classList.add(
    correctBool
      ? "scientist-feedback-circle-correct"
      : "scientist-feedback-circle-incorrect"
  );
};

export const removeScientistKeypressFeedback = () => {
  const feedbackCircles = document.querySelector(
    ".scientist-feedback-circle-container"
  );
  if (feedbackCircles != null)
    feedbackCircles.parentNode.removeChild(feedbackCircles);
};

export const updateTrialCounterNumbersForRSVPReading = () => {
  phraseIdentificationResponse.correct.forEach((bool) => {
    status.trialCompleted_thisBlock += 1;
    if (bool) status.trialCorrect_thisBlock += 1;
  });
};

export const constrainRSVPReadingSpeed = (proposedLevel) => {
  // Show words for at most 10 seconds
  const maxDurationPerWord = 10;
  // Show words for at least some minimum duration, ie no more than 2000 word/min
  const minDurationPerWord = 60 / 2000;

  const proposedDuration = Math.pow(10, proposedLevel);
  const notTooLongDuration =
    proposedDuration > maxDurationPerWord
      ? (maxDurationPerWord / proposedDuration) * proposedDuration
      : proposedDuration;
  const constrainedDuration =
    notTooLongDuration < minDurationPerWord
      ? (minDurationPerWord / proposedDuration) * notTooLongDuration
      : notTooLongDuration;

  return Math.log10(constrainedDuration);
};

export const addRevealableTargetWordsToAidSpokenScoring = () => {
  const revealableTargetWordsKey = document.createElement("div");
  revealableTargetWordsKey.className = "rsvpReadingTargetWordsKey";
  revealableTargetWordsKey.id = "rsvpReadingTargetWordsKey";
  rsvpReadingTargetSets.past.forEach((ts, i) => {
    const thisWordCue = document.createElement("div");
    thisWordCue.innerText = ts.word;
    thisWordCue.classList.add("rsvpReadingTargetWord");
    thisWordCue.classList.add(
      i === 0
        ? "rsvpReadingTargetWordCurrent"
        : "rsvpReadingTargetWordNotYetResponded"
    );
    revealableTargetWordsKey.appendChild(thisWordCue);
  });
  revealableTargetWordsKey.classList.add("hidden");
  document.body.appendChild(revealableTargetWordsKey);
  document.addEventListener("keydown", (e) => {
    if (e.shiftKey && rsvpReadingResponse.responseType === "typed")
      revealableTargetWordsKey.classList.toggle("hidden");
  });
};

export const removeRevealableTargetWordsToAidSpokenScoring = () => {
  const scoringAid = document.querySelector("#rsvpReadingTargetWordsKey");
  if (scoringAid) scoringAid.parentNode.removeChild(scoringAid);
};

const _highlightNextWordInRevealedKey = () => {
  const previousWord = document.querySelector(".rsvpReadingTargetWordCurrent");
  if (previousWord)
    previousWord.classList.replace(
      "rsvpReadingTargetWordCurrent",
      "rsvpReadingTargetWordAlreadyResponded"
    );
  const nextWords = document.querySelectorAll(
    ".rsvpReadingTargetWordNotYetResponded"
  );
  const nextWord = [...nextWords].shift();
  if (nextWord)
    nextWord.classList.replace(
      "rsvpReadingTargetWordNotYetResponded",
      "rsvpReadingTargetWordCurrent"
    );
};

export const addRsvpReadingTrialResponsesToData = () => {
  const clicked = rsvpReadingResponse.responseType === "clicked";
  psychoJS.experiment.addData(
    "rsvpReadingParticipantResponses",
    clicked ? phraseIdentificationResponse.current.toString() : ""
  );
  psychoJS.experiment.addData(
    "rsvpReadingTargetWords",
    rsvpReadingTargetSets.past.map((ts) => ts.word).toString()
  );
  psychoJS.experiment.addData(
    "rsvpReadingResponseCorrectBool",
    phraseIdentificationResponse.correct
      .map((b) => (b ? "TRUE" : "FALSE"))
      .toString()
  );
  logger("targetSets past", rsvpReadingTargetSets.past);
  psychoJS.experiment.addData(
    "rsvpReadingResponseTimesSec",
    getPhraseIdentificationReactionTimes()
      .map((t) => toFixedNumber(t, 2))
      .toString()
  );
};
