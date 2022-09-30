import { PsychoJS } from "../psychojs/src/core";
import { TextStim } from "../psychojs/src/visual";
import {
  displayOptions,
  font,
  letterConfig,
  readingThisBlockPages,
  rsvpReadingTargetSets,
  rsvpReadingTiming,
  rsvpReadingWordHistory,
  status,
  phraseIdentificationResponse,
} from "./global";
import { psychoJS } from "./globalPsychoJS";
import {
  generateRandomString,
  getEvenlySpacedValues,
  logger,
  sampleWithoutReplacement,
  sampleWithReplacement,
  shuffle,
  XYPixOfXYDeg,
} from "./utils";
import { Color } from "../psychojs/src/util";

export class RSVPReadingTargetSet {
  constructor(
    word,
    position,
    heightPx,
    spacingPx,
    durationSec,
    orderNumber,
    foilWords,
    flankerCharacterSet
  ) {
    this.word = word;
    this.foilWords = foilWords;
    this.position = position;
    this.startTime = durationSec * orderNumber;
    this.stopTime = this.startTime + durationSec;
    this.orderNumber = orderNumber;
    this.flankerCharacterSet = flankerCharacterSet.split("");

    this._heightPx = heightPx;
    this._spacingPx = spacingPx;

    this.flankerLettersUsed = [];

    this.stims = this.generateStims();
  }
  generateStims() {
    // If there are flanker characters to use...
    if (this.flankerCharacterSet.length > 0) {
      let topString, middleString, bottomString;
      const lineLength = this.word.length + 2;
      // Determine the strings to be shown
      topString = sampleWithReplacement(
        this.flankerCharacterSet,
        lineLength
      ).join("");
      bottomString = sampleWithReplacement(
        this.flankerCharacterSet,
        lineLength
      ).join("");
      middleString =
        sampleWithReplacement(this.flankerCharacterSet, 1).join("") +
        this.word +
        sampleWithReplacement(this.flankerCharacterSet, 1).join("");
      // Create the stims for those strings
      const topRowFlankerLetters = _generateLetterStimsForWord(
        topString,
        [this.position[0], this.position[1] + this._spacingPx],
        this._heightPx,
        this._spacingPx,
        `topFlanker-${this.orderNumber}`
      );
      const bottomRowFlankerLetters = _generateLetterStimsForWord(
        bottomString,
        [this.position[0], this.position[1] - this._spacingPx],
        this._heightPx,
        this._spacingPx,
        `bottomFlanker-${this.orderNumber}`
      );
      const targetRowLetters = _generateLetterStimsForWord(
        middleString,
        this.position,
        this._heightPx,
        this._spacingPx,
        `middleRow-${this.orderNumber}`
      );
      return [
        ...topRowFlankerLetters,
        ...bottomRowFlankerLetters,
        ...targetRowLetters,
      ];
    } else {
      // Otherwise just generate a stim for the target word
      return _generateLetterStimsForWord(
        this.word,
        this.position,
        this._heightPx,
        this._spacingPx,
        `middleRow-${this.orderNumber}`
      );
    }
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

export const generateRSVPReadingTargetSets = (
  numberOfTargets,
  durationSec,
  paramReader,
  BC
) => {
  const position = XYPixOfXYDeg(
    letterConfig.targetEccentricityXYDeg,
    displayOptions
  );
  const heightPx = getRSVPReadingHeightPx(paramReader, BC);
  const spacingPx = heightPx * letterConfig.spacingOverSizeRatio;

  const uniqueWordsRequired = paramReader.read(
    "rsvpReadingRequireUniqueWordsBool",
    BC
  );
  const targetWords = [...new Array(numberOfTargets)].map((i) =>
    _getNextRSVPWord(uniqueWordsRequired)
  );
  rsvpReadingWordHistory.usedTargets.push(...targetWords);
  const numberOfFoils =
    paramReader.read("rsvpReadingNumberOfResponseOptions", BC) - 1;
  const foilWords = targetWords.map((w, i) =>
    [...new Array(numberOfFoils).keys()].map((s) =>
      _getNextRSVPWord(uniqueWordsRequired)
    )
  );
  foilWords.forEach((d) => rsvpReadingWordHistory.usedFoils.push(...d));
  const targetSets = [];
  for (const [i, targetWord] of targetWords.entries()) {
    targetSets.push(
      new RSVPReadingTargetSet(
        targetWord,
        position,
        heightPx,
        spacingPx,
        durationSec,
        i,
        foilWords[i],
        paramReader.read("rsvpReadingFlankerCharacterSet", BC)
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
      depth: -8.0,
    });
  });
  return letters;
};

const _getNextRSVPWord = (requireUnique) => {
  // Move on to the next word
  rsvpReadingWordHistory.currentWordPosition[1] += 1;

  // TODO make impossible
  if (
    readingThisBlockPages.length <=
    rsvpReadingWordHistory.currentWordPosition[0] + 1
  )
    throw "Not enough sentences prepared.";

  let currentSentence = rsvpReadingWordHistory.currentWordPosition[0];
  let currentWord = rsvpReadingWordHistory.currentWordPosition[1];
  let sourceSentence = readingThisBlockPages[currentSentence]
    .split(/(\s+)/)
    .filter((x) => x && !/\s/g.test(x));
  // SEE https://stackoverflow.com/questions/1731190/check-if-a-string-has-white-space
  // let sourceSentence = readingThisBlockPages[currentSentence]
  //   .split(/[^a-zA-Z']/)
  //   .filter((x) => x);

  if (currentWord >= sourceSentence.length) {
    rsvpReadingWordHistory.currentWordPosition[0] += 1;
    rsvpReadingWordHistory.currentWordPosition[1] = 0;
    currentSentence = rsvpReadingWordHistory.currentWordPosition[0];
    currentWord = rsvpReadingWordHistory.currentWordPosition[1];
    sourceSentence = readingThisBlockPages[currentSentence]
      .split(/[^a-zA-Z']/)
      .filter((x) => x);
  }

  // const sourceSentence =  readingThisBlockPages[currentSentence].split(/[\s,\?\!\.\-\"\`]+/);
  const nextWord = sourceSentence[currentWord];

  const otherWordsLeft =
    sourceSentence.length > currentWord ||
    currentSentence < readingThisBlockPages.length;

  // Scientist may require that words are unique, eg to ensure that the target and foil are different, or prevent an exposure effect
  const suggestedWordIsAcceptable = requireUnique
    ? !rsvpReadingWordHistory.usedWords.includes(nextWord)
    : true;
  if (!suggestedWordIsAcceptable) {
    // If this word isn't unique, but there are other prepared words left to draw from, just go through this process again.
    if (otherWordsLeft) return _getNextRSVPWord(requireUnique);
    // If this word isn't unique and there are not other words left to draw from, fall back to some less-desirable strategy, eg sampling the used words.
    else {
      // TODO log this error to scientist/EE
      console.error(
        "Uh oh! Word is not unique, and there are no other words left. Shamefully providing a word from those previously used."
      );
      return rsvpReadingWordHistory.usedWords[
        Math.floor(rsvpReadingWordHistory.length * Math.random())
      ];
    }
  } else {
    rsvpReadingWordHistory.usedWords.push(nextWord);
    return nextWord;
  }
};

export const _rsvpReading_trialRoutineEachFrame = (
  t,
  frameN,
  duplicatedConditionCardinal,
  instructions
) => {
  if (duplicatedConditionCardinal === 1) {
    // Done showing stimuli
    if (
      typeof rsvpReadingTargetSets.current === "undefined" &&
      rsvpReadingTargetSets.upcoming.length === 0
    ) {
      instructions.tSTart = t;
      instructions.frameNStart = frameN;
      instructions.setAutoDraw(true);
      return;
    }

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
  if (keypresses.length)
    logger("TYPED keypresses in registerKeypressForRSVPReading", keypresses);
  keypresses.forEach((k) => {
    logger("TYPED k", k);
    const correct = k.name === "up" ? 1 : 0;
    phraseIdentificationResponse.clickTime.push(performance.now());
    phraseIdentificationResponse.current.push(k);
    phraseIdentificationResponse.correct.push(correct);

    updateScientistKeypressFeedback(correct);
  });
};

export const addScientistKeypressFeedback = (numberOfResponsesExpected) => {
  console.log({ numberOfResponsesExpected });
  // TODO move feedback based on the other things that might be there, eg trial counter
  const feedbackContainer = document.createElement("div");
  feedbackContainer.className = "scientist-feedback-circle-container";
  for (let i = 0; i < numberOfResponsesExpected; i++) {
    const feedbackCircle = document.createElement("div");
    feedbackCircle.className = "scientist-feedback-circle";
    feedbackContainer.appendChild(feedbackCircle);
  }
  document.body.appendChild(feedbackContainer);
  logger("added the feedback circles!", feedbackContainer);
};

const updateScientistKeypressFeedback = (correctBool) => {
  const feedbackCircles = [
    ...document.querySelectorAll(".scientist-feedback-circle"),
  ];
  logger("feedbackCircles", feedbackCircles);
  const unresolvedCircles = feedbackCircles.filter(
    (e) =>
      !(
        [...e.classList].includes("scientist-feedback-circle-correct") ||
        [...e.classList].includes("scientist-feedback-circle-incorrect")
      )
  );
  logger("unresolvedCircles", unresolvedCircles);
  const nextCircle = unresolvedCircles.shift();
  logger("nextCircle", nextCircle);
  nextCircle.classList.add(
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
