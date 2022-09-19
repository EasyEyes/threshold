import { PsychoJS } from "../psychojs/src/core";
import { TextStim } from "../psychojs/src/visual";
import {
  displayOptions,
  font,
  readingThisBlockPages,
  // rsvpReadingFeedback,
  rsvpReadingTargetSets,
  rsvpReadingTiming,
  rsvpReadingWordHistory,
} from "./global";
import { psychoJS } from "./globalPsychoJS";
import {
  generateRandomString,
  getEvenlySpacedValues,
  logger,
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
    distractorWords,
    flankerLettersBool
  ) {
    this.word = word;
    this.distractorWords = distractorWords;
    this.position = position;
    this.startTime = durationSec * orderNumber;
    this.stopTime = this.startTime + durationSec;
    this.orderNumber = orderNumber;
    this.flankerLettersBool = flankerLettersBool;

    this._heightPx = heightPx;
    this._spacingPx = spacingPx;

    this.flankerLettersUsed = [];

    this.stims = this.generateStims();
  }
  generateStims() {
    if (this.flankerLettersBool) {
      // TOP FLANKER STRING
      const topFlankerString = generateRandomString(
        this.word.length + 2,
        this.flankerLettersUsed
      );
      const topRowFlankerLetters = _generateLetterStimsForWord(
        topFlankerString,
        [this.position[0], this.position[1] + this._spacingPx],
        this._heightPx,
        this._spacingPx,
        `topFlanker-${this.orderNumber}`
      );

      // BOTTOM FLANKER STRING
      const bottomFlankerString = generateRandomString(
        this.word.length + 2,
        this.flankerLettersUsed
      );
      const bottomRowFlankerLetters = _generateLetterStimsForWord(
        bottomFlankerString,
        [this.position[0], this.position[1] - this._spacingPx],
        this._heightPx,
        this._spacingPx,
        `bottomFlanker-${this.orderNumber}`
      );

      // TARGET, MIDDLE ROW STRING
      const targetRowString =
        generateRandomString(1, this.flankerLettersUsed) +
        this.word +
        generateRandomString(1, this.flankerLettersUsed);
      const targetRowLetters = _generateLetterStimsForWord(
        targetRowString,
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

export const generateRSVPReadingTargetSets = (
  numberOfTargets,
  position,
  heightPx,
  spacingPx,
  durationSec,
  paramReader,
  BC
) => {
  const uniqueWordsRequired = paramReader.read(
    "rsvpReadingRequireUniqueWordsBool",
    BC
  );
  const targetWords = [...new Array(numberOfTargets)].map((i) =>
    _getNextRSVPWord(uniqueWordsRequired)
  );
  rsvpReadingWordHistory.usedTargets.push(...targetWords);
  const numberOfDistractorWords = paramReader.read(
    "rsvpReadingNumberOfDistractors",
    BC
  );
  const distractorWords = targetWords.map((w, i) =>
    [...new Array(numberOfDistractorWords).keys()].map((s) =>
      _getNextRSVPWord(uniqueWordsRequired)
    )
  );
  distractorWords.forEach((d) =>
    rsvpReadingWordHistory.usedDistractors.push(...d)
  );
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
        distractorWords[i],
        paramReader.read("rsvpReadingFlankTargetWithRandomLettersBool", BC)
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
    .split(/[^a-zA-Z']/)
    .filter((x) => x);

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

  // Scientist may require that words are unique, eg to ensure that the target and distractor are different, or prevent an exposure effect
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

    if (rsvpReadingTargetSets.current.startTime <= t) {
      // Draw current target set if it's time, and they're not yet drawn
      if (
        rsvpReadingTargetSets.current.stims.every(
          (s) => s.status === PsychoJS.Status.NOT_STARTED
        )
      ) {
        logger("rsvp time to draw stims");
        rsvpReadingTargetSets.current.stims.forEach((s) => {
          // keep track of start time/frame for later
          s.tStart = t; // (not accounting for frame time here)
          s.frameNStart = frameN; // exact frame index
          s.setAutoDraw(true);
        });
        if (!rsvpReadingTiming.current.startSec) {
          rsvpReadingTiming.current.startSec = t;
          logger("rsvp marking timing startSec");
        }
        if (
          !rsvpReadingTiming.current.drawnConfirmedTimestamp &&
          rsvpReadingTargetSets.current.stims.every(
            (s) => s.status === PsychoJS.Status.NOT_STARTED
          )
        ) {
          rsvpReadingTiming.current.drawnConfirmedTimestamp = t;
          logger("rsvp marking timing drawnConfirmedTimestamp");
        }
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
  } else {
  }
};

export const getRSVPReadingCategories = (targetSets) => {
  // The target word for each set.
  const categoryIds = targetSets.map((s) => s.word);
  // The list of all possible responses for each set,
  // ie the target word mixed in with the distractors.
  const categoryElements = targetSets.map((s) =>
    shuffle([s.word, ...s.distractorWords])
  );
  const categories = Object.assign(
    ...categoryIds.map((key, i) => ({ [key]: categoryElements[i] }))
  );
  logger("correctly zipped categories? ", categories);
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
