import { PsychoJS } from "../psychojs/src/core";
import { TextStim } from "../psychojs/src/visual";
import {
  displayOptions,
  font,
  letterConfig,
  readingConfig,
  readingFrequencyToWordArchive,
  readingUsedText,
  rsvpReadingTargetSets,
  rsvpReadingTiming,
  status,
  phraseIdentificationResponse,
  dummyStim,
  rsvpReadingResponse,
  fontSize,
  keypad,
  targetEccentricityDeg,
  showTimingBarsBool,
} from "./global";
import { psychoJS } from "./globalPsychoJS";
import {
  getEvenlySpacedValues,
  logger,
  sampleWithReplacement,
  shuffle,
  toFixedNumber,
  xyPxOfDeg,
  showCursor,
  drawTimingBars,
} from "./utils";
import { Color } from "../psychojs/src/util";
import {
  findReadingSize,
  getThisBlockPagesForAGivenCondition,
  getThisBlockPages,
} from "./readingAddons";
import {
  canonical,
  prepareReadingQuestions,
  preprocessCorpusToWordList,
  tokenizeWordsIndividually,
} from "./reading";

import {
  getPhraseIdentificationReactionTimes,
  noteStimulusOnsetForPhraseIdentification,
  showPhraseIdentification,
} from "./response";
import { updateColor } from "./color";
import { simulatedObservers } from "../threshold";
import { defineTargetForCursorTracking } from "./cursorTracking";
import { paramReader } from "../threshold";
import { XYPxOfDeg } from "./multiple-displays/utils.ts";

export class RSVPReadingTargetSet {
  constructor(
    word,
    position,
    durationSec,
    orderNumber,
    foilWords,
    paramReader,
    BC,
  ) {
    this.word = word;
    this.foilWords = foilWords;
    this.position = position;
    this.startTime = undefined; //durationSec * orderNumber;
    this.durationSec = durationSec;
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
    this.stimsNominalPositions = [...this.stims.map((s) => s.getPos())];
    this.measuredDuration = undefined;
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
          `Unsupported spacingRelationToSize: ${letterConfig.spacingRelationToSize}`,
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
        sampleWithReplacement(this.flankerCharacterSet, lineLength).join(""),
      );
      // Middle string
      strings.push(
        sampleWithReplacement(this.flankerCharacterSet, 1).join("") +
          this.word +
          sampleWithReplacement(this.flankerCharacterSet, 1).join(""),
      );
      // Bottom string
      strings.push(
        sampleWithReplacement(this.flankerCharacterSet, lineLength).join(""),
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
        `topFlanker-${this.orderNumber}`,
        this.BC,
        this.paramReader,
      );
      const targetRowLetters = _generateLetterStimsForWord(
        strings[1],
        this.position,
        this._heightPx,
        this._spacingPx,
        `middleRow-${this.orderNumber}`,
        this.BC,
        this.paramReader,
      );
      const bottomRowFlankerLetters = _generateLetterStimsForWord(
        strings[2],
        bottomRowPosition,
        this._heightPx,
        this._spacingPx,
        `bottomFlanker-${this.orderNumber}`,
        this.BC,
        this.paramReader,
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
        `middleRow-${this.orderNumber}`,
        this.BC,
        this.paramReader,
      );
    }
  }

  _generateTypographicStims(strings) {
    const text = strings.join("\n");
    // TODO use Paragraph class
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
      padding: this.paramReader.read("fontPadding", this.BC),
    });
    readingStim.setPadding(this.paramReader.read("fontPadding", this.BC));
    readingConfig.height = findReadingSize(
      this.paramReader.read("readingSetSizeBy", this.BC),
      this.paramReader,
      readingStim,
      "condition",
    );
    fontSize.current = readingConfig.height;
    readingStim.setHeight(readingConfig.height);
    readingStim.setText(text);
    if (font.letterSpacing) {
      readingStim.setLetterSpacingByProportion(font.letterSpacing);
    }
    updateColor(readingStim, "marking", this.BC);
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

export class rsvpReadingTrialWords {
  constructor(sequence, responseOptions) {
    this.sequence = sequence;
    const keys = tokenizeWordsIndividually(sequence);
    const remainingResponseOptions = responseOptions.slice();

    // Make sure that response options are in sequence order
    this.responseOptions = keys.map((k, i) => {
      const targetWords = remainingResponseOptions.map(
        (responses) => responses[0],
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
      shuffle(options),
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
    numTrialsPerCondition,
    reader.read("rsvpReadingNumberOfWords", block),
  );
  const sequences = pagePerCondition.map((s) =>
    s.split("\n").map((a) => a.replace(/\t/g, "")),
  );
  const targetsAndFoils = sequences.map((conditionTrials, i) =>
    conditionTrials.map((trial) => {
      const BC = conditions[i]["block_condition"];
      const individuallyTokenizedWords = tokenizeWordsIndividually(trial);
      const nQuestions = individuallyTokenizedWords.length;
      const nAnswers = reader.read("rsvpReadingNumberOfResponseOptions", BC);
      const readingCorpusFoils = reader.read("readingCorpusFoils", BC);
      const questions = prepareReadingQuestions(
        nQuestions,
        nAnswers,
        individuallyTokenizedWords,
        readingFrequencyToWordArchive[reader.read("readingCorpus", BC)],
        rsvpReadingResponse.responseTypeForCurrentBlock[i],
        "rsvpReading",
        reader.read("rsvpReadingRequireUniqueWordsBool", BC),
        readingCorpusFoils,
        reader.read("readingCorpusFoilsExclude", BC),
        reader.read("readingCorpus", BC),
        reader.read("readingCorpusTargetsExclude", BC),
      );
      const responseOptions = questions.map((q) => [
        q.correctAnswer,
        ...q.foils,
      ]);
      const sortByArray = individuallyTokenizedWords.map((word) =>
        canonical(word, "individuallyTokenizedWords"),
      );
      responseOptions.sort(
        (a, b) =>
          sortByArray.indexOf(canonical(a[0], "responseOptions a[0]")) -
          sortByArray.indexOf(canonical(b[0], "responseOptions b[0]")),
      );
      return responseOptions;
    }),
  );
  const wordsPerCondition = {};
  conditions.forEach((c) => {
    const BC = c.block_condition;
    const sequencesForThisCondition = sequences.shift();
    const responseOptionsForThisCondition = targetsAndFoils.shift();
    wordsPerCondition[BC] = sequencesForThisCondition.map(
      (sequence, i) =>
        new rsvpReadingTrialWords(sequence, responseOptionsForThisCondition[i]),
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
  BC,
) => {
  const position = XYPxOfDeg(0, [
    targetEccentricityDeg.x,
    targetEccentricityDeg.y,
  ]);

  const targetWords = wordsForThisTrial.targetWords;
  const foilWords = wordsForThisTrial.foils;
  const targetSets = targetWords.map(
    (targetWord, i) =>
      new RSVPReadingTargetSet(
        targetWord,
        position,
        durationSec,
        i,
        foilWords[i],
        paramReader,
        BC,
      ),
  );
  return targetSets;
};

const _generateLetterStimsForWord = (
  word,
  position,
  heightPx,
  spacingPx,
  name,
  BC,
  reader,
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
    const s = new TextStim({
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
      padding: reader.read("fontPadding", BC),
    });
    updateColor(s, "marking", BC);
    s.setPadding(reader.read("fontPadding", BC));
    return s;
  });
  return letters;
};

let rsvpEndRoutineAtT;
let restInstructionsBool = true;
//new work
let start = undefined;
// TODO we need to return TRUE if t < delayBeforeStimOnsetSec
export const _rsvpReading_trialRoutineEachFrame = (t, frameN, instructions) => {
  const doneShowingStimuliBool =
    typeof rsvpReadingTargetSets.current === "undefined" &&
    rsvpReadingTargetSets.upcoming.length === 0;
  defineTargetForCursorTracking(
    doneShowingStimuliBool ? undefined : rsvpReadingTargetSets.current[0],
  );

  // Mark the onset of the first stimulus (to calculate response times later)
  if (typeof phraseIdentificationResponse.onsetTime === "undefined")
    noteStimulusOnsetForPhraseIdentification(t);

  // Skip this trial's targetSets, bc the participant failed to track when required
  if (rsvpReadingTargetSets.skippedDueToBadTracking) {
    // Set to 1 when tracking is lost
    if (rsvpReadingTargetSets.skippedDueToBadTracking === 1) {
      if (start !== undefined) {
        rsvpReadingTargetSets.past[
          rsvpReadingTargetSets.past.length - 1
        ].measuredDuration = t - start;
        start = undefined;
      }
      return true;
    }
    // Set to 2 when bad tracking feedback is done being shown
    rsvpReadingTargetSets.skippedDueToBadTracking = 0;
    return false;
  }

  // Done showing stimuli
  if (doneShowingStimuliBool) {
    if (restInstructionsBool) {
      instructions.tSTart = t;
      instructions.frameNStart = frameN;
      if (rsvpReadingResponse.responseType === "spoken") {
        instructions.setText("");
      }
      instructions.setAutoDraw(true);
      restInstructionsBool = false;
      addRevealableTargetWordsToAidSpokenScoring();
      if (keypad.handler && keypad.handler.inUse(status.block_condition)) {
        keypad.handler.start();
        if (rsvpReadingResponse.responseType === "silent") {
          const firstTargetIndex = paramReader.read(
            "fontLeftToRightBool",
            status.block_condition,
          )
            ? 0
            : rsvpReadingTargetSets.identificationTargetSets.length - 1;
          const firstTargetSet =
            rsvpReadingTargetSets.identificationTargetSets[firstTargetIndex];
          const responseOptions = shuffle([
            firstTargetSet.word,
            ...firstTargetSet.foilWords,
          ]);
          keypad.handler.update(responseOptions);
        } else {
          keypad.handler.update(["up", "down"]);
        }
      }
    }
    // Continue when enough responses have been registered
    if (
      phraseIdentificationResponse.current.length >=
      rsvpReadingTargetSets.numberOfIdentifications
    ) {
      // Ensure a small delay after the last response, so the participant sees feedback for every response
      rsvpEndRoutineAtT ??= simulatedObservers.proceed() ? t : t + 0.5;
      if (t >= rsvpEndRoutineAtT) {
        if (rsvpReadingResponse.responseType === "spoken")
          removeScientistKeypressFeedback();
        updateTrialCounterNumbersForRSVPReading();
        rsvpEndRoutineAtT = undefined;
        restInstructionsBool = true;
        return false;
      }
    }
    showCursor();
    // Show the response screen if response modality is clicking
    if (
      rsvpReadingResponse.responseType === "silent" &&
      !rsvpReadingResponse.displayStatus
    ) {
      showPhraseIdentification(rsvpReadingResponse.screen);
      rsvpReadingResponse.displayStatus = true;
    } else if (!rsvpReadingResponse.displayStatus) {
      // Else create some subtle feedback that the scientist can use
      addScientistKeypressFeedback(
        rsvpReadingTargetSets.numberOfIdentifications,
      );
      rsvpReadingResponse.displayStatus = true;
    }
    return true;
  }

  // Draw current target set, given it's time and they're not yet drawn
  if (
    typeof rsvpReadingTargetSets.current !== "undefined" &&
    rsvpReadingTargetSets.current.stims.every(
      (s) => s.status === PsychoJS.Status.NOT_STARTED,
    )
  ) {
    // Mark start-time for this target set
    rsvpReadingTargetSets.current.startTime = t;
    rsvpReadingTargetSets.current.stims.forEach((s) => {
      // keep track of start time/frame for later
      s.tStart = t; // (not accounting for frame time here)
      s.frameNStart = frameN; // exact frame index
      s.setAutoDraw(true);
    });
    // TODO this is no the confirmed drawn time, which should to be on the next frame
    // We have not tested if this frame or the next one is the more accurate measurement
    start = t;
    drawTimingBars(showTimingBarsBool.current, "target", true);
  }

  // If current target should be done, undraw it and update which is the current targetSet
  if (
    t >=
      rsvpReadingTargetSets.current.startTime +
        rsvpReadingTargetSets.current.durationSec && // rsvpReadingTargetSets.current.stopTime + phraseIdentificationResponse.onsetT <= t ???
    rsvpReadingTargetSets.current.stims.every(
      (s) => s.status === PsychoJS.Status.STARTED,
    )
  ) {
    rsvpReadingTargetSets.current.stims.forEach((s) => {
      s.setAutoDraw(false);
    });
    drawTimingBars(showTimingBarsBool.current, "target", false);
    rsvpReadingTargetSets.past.push(rsvpReadingTargetSets.current);
    rsvpReadingTargetSets.current = rsvpReadingTargetSets.upcoming.shift();
    // TODO this is not the confirmed undrawn time, which should to be on the next frame
    // We have not tested if this frame or the next one is the more accurate measurement
    rsvpReadingTargetSets.past[
      rsvpReadingTargetSets.past.length - 1
    ].measuredDuration = t - start;
    start = undefined;
    rsvpReadingTargetSets.past[
      rsvpReadingTargetSets.past.length - 1
    ].stims.forEach((s) => (s.frameNFinishedConfirmed = frameN));
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
      XYPxOfDeg(0, [
        targetLocationDeg[0],
        targetLocationDeg[1] - sizeDeg / 2,
      ])[1] -
        XYPxOfDeg(0, [
          targetLocationDeg[0],
          targetLocationDeg[1] + sizeDeg / 2,
        ])[1],
    ),
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
  if (!keypresses.length) return;
  const feedbackCircles = getFeedbackCircles();
  const unresolvedCircles = getUnscoredFeedbackCircles();
  const currentCircleIndex =
    feedbackCircles.length - unresolvedCircles.length ?? 0;
  const k = keypresses[currentCircleIndex];
  if (!k || !k.name) return;
  const correct = k.name === "up" ? 1 : 0;

  phraseIdentificationResponse.clickTime.push(performance.now());
  phraseIdentificationResponse.current.push(k);
  phraseIdentificationResponse.correct.push(correct);

  updateScientistKeypressFeedback(correct);
  _highlightNextWordInRevealedKey();
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
  const unresolvedCircles = getUnscoredFeedbackCircles();
  const nextCircle = unresolvedCircles.shift();
  nextCircle?.classList.add(
    correctBool
      ? "scientist-feedback-circle-correct"
      : "scientist-feedback-circle-incorrect",
  );
};

export const removeScientistKeypressFeedback = () => {
  const feedbackCircles = document.querySelector(
    ".scientist-feedback-circle-container",
  );
  if (feedbackCircles != null)
    feedbackCircles.parentNode.removeChild(feedbackCircles);
};

export const updateTrialCounterNumbersForRSVPReading = () => {
  status.trialCompleted_thisBlock += 1;
  // Just for use with end-of-block feedback, QUEST actually interprets each response individually
  status.trialCorrect_thisBlock += phraseIdentificationResponse.correct.every(
    (bool) => bool,
  )
    ? 1
    : 0;
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
  rsvpReadingTargetSets.identificationTargetSets.forEach((ts, i) => {
    const thisWordCue = document.createElement("div");
    thisWordCue.innerText = ts.word;
    thisWordCue.classList.add("rsvpReadingTargetWord");
    thisWordCue.classList.add(
      i === 0
        ? "rsvpReadingTargetWordCurrent"
        : "rsvpReadingTargetWordNotYetResponded",
    );
    revealableTargetWordsKey.appendChild(thisWordCue);
  });
  revealableTargetWordsKey.classList.add("hidden");
  document.body.appendChild(revealableTargetWordsKey);
  document.addEventListener("keydown", (e) => {
    if (e.shiftKey && rsvpReadingResponse.responseType === "spoken")
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
      "rsvpReadingTargetWordAlreadyResponded",
    );
  const nextWords = document.querySelectorAll(
    ".rsvpReadingTargetWordNotYetResponded",
  );
  const nextWord = [...nextWords].shift();
  if (nextWord)
    nextWord.classList.replace(
      "rsvpReadingTargetWordNotYetResponded",
      "rsvpReadingTargetWordCurrent",
    );
};

export const addRsvpReadingTrialResponsesToData = () => {
  reportRsvpReadingTargetDurations(rsvpReadingTargetSets);
  resetRsvpReadingTiming();

  const clicked = rsvpReadingResponse.responseType === "silent";
  psychoJS.experiment.addData(
    "rsvpReadingParticipantResponses",
    clicked ? phraseIdentificationResponse.current.toString() : "",
  );
  psychoJS.experiment.addData(
    "rsvpReadingTargetWords",
    rsvpReadingTargetSets.past.map((ts) => ts.word).toString(),
  );
  psychoJS.experiment.addData(
    "rsvpReadingTargetWordsForIdentification",
    rsvpReadingTargetSets.identificationTargetSets
      .map((ts) => ts.word)
      .toString(),
  );
  psychoJS.experiment.addData(
    "rsvpReadingResponseCorrectBool",
    phraseIdentificationResponse.correct
      .map((b) => (b ? "TRUE" : "FALSE"))
      .toString(),
  );
  psychoJS.experiment.addData(
    "rsvpReadingResponseTimesSec",
    getPhraseIdentificationReactionTimes()
      .map((t) => toFixedNumber(t, 2))
      .toString(),
  );
};

const getFeedbackCircles = () => [
  ...document.querySelectorAll(".scientist-feedback-circle"),
];
const getUnscoredFeedbackCircles = () => [
  ...getFeedbackCircles().filter(
    (e) =>
      !(
        [...e.classList].includes("scientist-feedback-circle-correct") ||
        [...e.classList].includes("scientist-feedback-circle-incorrect")
      ),
  ),
];

// TODO improve code by using a class, eg
class RsvpTimingReport {
  constructor() {
    this.startSec = undefined;
    this.finishSec = undefined;
    this.startMs = undefined;
    this.finishMs = undefined;
    this.drawnConfirmedTimestamp = undefined;
    this.undrawnConfirmedTimestamp = undefined;
    this.drawnConfirmedTimestampMs = undefined;
    this.undrawnConfirmedTimestampMs = undefined;
  }
}

// timing = rsvpReadingTiming
const reportRsvpReadingTargetDurations = (rsvpReadingTargetSets) => {
  const timingArray = rsvpReadingTargetSets.past.map((ts) => {
    return toFixedNumber(ts.measuredDuration, 3);
  });
  const timingString = timingArray.join(",");
  psychoJS.experiment.addData("targetMeasuredDurationSec", timingString);
};

const resetRsvpReadingTiming = () => {
  rsvpReadingTiming.current = {};
  rsvpReadingTiming.past = [];
};

export const generateSupplementalRsvpReadingWords = (reader, BC) => {
  const numberOfWords = reader.read("rsvpReadingNumberOfWords", BC);
  const nAnswers = reader.read("rsvpReadingNumberOfResponseOptions", BC);
  const corpus = reader.read("readingCorpus", BC);
  const freqToWords = readingFrequencyToWordArchive[corpus];
  const responseType = rsvpReadingResponse.responseTypeForCurrentBlock;
  const numTrials = reader.read("conditionTrials", BC);

  if (!freqToWords) {
    console.warn(`No frequency-to-words mapping found for corpus: ${corpus}`);
    return null;
  }

  // Get fresh pages from corpus, continuing from where we left off
  const pagePerCondition = getThisBlockPagesForAGivenCondition(
    reader,
    BC,
    dummyStim,
    numTrials, // Get all trials worth
    1, // One line for one trial (ie 1 sequence)
    numberOfWords,
    readingUsedText[corpus]?.get(BC)?.length || 0,
  );

  const sequences = pagePerCondition.map((s) =>
    s.split("\n").map((a) => a.replace(/\t/g, "")),
  );

  const trials = sequences[0]; // Get all trials' sequences
  logger("[RSVP - generateNewRSVPWords] trials", trials);

  const wordsForTrials = trials
    .map((trial) => {
      const individuallyTokenizedWords = tokenizeWordsIndividually(trial);
      const questions = prepareReadingQuestions(
        numberOfWords,
        nAnswers,
        individuallyTokenizedWords,
        freqToWords,
        responseType,
        "rsvpReading",
        reader.read("rsvpReadingRequireUniqueWordsBool", BC),
        reader.read("readingCorpusFoils", BC),
        reader.read("readingCorpusFoilsExclude", BC),
        reader.read("readingCorpus", BC),
        reader.read("readingCorpusTargetsExclude", BC),
      );

      const responseOptions = questions.map((q) => [
        q.correctAnswer,
        ...q.foils,
      ]);
      const sequence = questions.map((q) => q.correctAnswer).join(" ");

      logger(`Generated RSVP words for trial: ${sequence}`);

      return new rsvpReadingTrialWords(sequence, responseOptions);
    })
    .shift();

  return wordsForTrials;
};
