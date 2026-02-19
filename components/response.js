/**
 * responseType
 *      click   type    keypad    speak
 * 0    x       o       x         x
 * 1    o       x       x         x
 * 2    o       o       x         x
 * 3
 * 4
 * 5
 * 6
 * 7
 * 8
 * 9
 * 10
 * 11
 * 12
 * 13
 * 14
 * 15
 */

import { paramReader } from "../threshold";
import { getFontFamilyName } from "./fonts";
import {
  phraseIdentificationResponse,
  font,
  keypad,
  status,
  rsvpReadingTargetSets,
} from "./global";
import { psychoJS } from "./globalPsychoJS";
import { scaleFontSizeToFit, getMinFontSize } from "./showCharacterSet";
import {
  colorRGBASnippetToRGBA,
  logger,
  showCursor,
  toFixedNumber,
  shuffle,
} from "./utils";

export const _responseTypes = {
  // [click, type, keypad, speak]
  0: [false, true, false, false], // type only
  1: [true, false, false, false], // click only
  2: [true, true, false, false], // click or type
  3: [false, false, true, false], // Keypad only
  4: [false, true, true, false], // Keypad or type
  5: [true, false, true, false], // Keypad or click
  6: [true, true, true, false], // Keypad or click or type
};

export const getResponseType = (
  click,
  type,
  keypad,
  speak,
  responseMustTrackContinuouslyBool,
  spokenToExperimenter,
  prestimulus = true,
) => {
  // responseMustTrackContinuouslyBool overrides the settings of responseTypedBool and responseClickedBool
  if (responseMustTrackContinuouslyBool && prestimulus) return 1;

  // Default routine
  const c = click || (spokenToExperimenter && prestimulus), // if spokenToExperimenter: the experimenter will click start the trial TODO: is this desired behavior???
    t = type || (spokenToExperimenter && !prestimulus), // if spokenToExperimenter: the experimenter will type to respond, based on spoken response
    k = keypad,
    s = speak;

  // TODO handle `spoken` input modality

  if (!c && t && !k) return 0;
  else if (c && !t && !k) return 1;
  else if (c && t && !k) return 2;
  else if (!c && !t && k) return 3; // Keypad only
  else if (!c && t && k) return 4; // Keypad or type
  else if (c && !t && k) return 5; // Keypad or click
  else if (c && t && k) return 6; // Keypad or click or type
  else return 1;
  // TODO finish other situations
};

export const resetResponseType = (
  originalResponseType,
  responseType,
  differentFixaxtionAndResponseModalities,
) => {
  if (differentFixaxtionAndResponseModalities) return originalResponseType;
  else return responseType;
};

/* -------------------------------------------------------------------------- */

export const canType = (responseType) => {
  return _responseTypes[responseType][1];
};

export const canClick = (responseType) => {
  return _responseTypes[responseType][0];
};

export const keypadActive = (responseType) => {
  return _responseTypes[responseType][2];
};
/* -------------------------------------------------------------------------- */

export const _onlyClick = (responseType) => {
  const types = _responseTypes[responseType];
  return types[0] && !types[1] && !types[2] && !types[3];
};

/**
 * Create, and return, an html element containing the phrase identification page
 * @param {Category[]} categories Keys are target words, and values are arrays of distractor words
 * @returns {HTMLElement} Response screen element, parent of feedback and response buttons
 */
export const setupPhraseIdentification = (categories, reader, BC, fontSize) => {
  const responseScreen = document.createElement("div");
  responseScreen.id = "phrase-identification-response-screen";
  responseScreen.classList.add("responseScreen");

  const container = document.createElement("div");
  container.classList.add("phrase-identification-grid");
  container.id = "phrase-identification-grid";
  responseScreen.appendChild(container);
  const leftToRightBool = reader.read("fontLeftToRightBool", BC);
  const letterSpacing = reader.read("fontTrackingForLetters", BC);
  const fontFamily = getFontFamilyName(font.name);
  const markingColor = colorRGBASnippetToRGBA(
    reader.read("markingColorRGBA", BC),
  );

  // Set CSS custom properties for consistent styling
  container.style.setProperty("--font-size", `${fontSize}px`);
  container.style.setProperty("--letter-spacing", `${letterSpacing}em`);
  container.style.setProperty("--font-family", fontFamily);
  container.style.setProperty("--marking-color", markingColor);
  container.style.setProperty("--grid-columns", categories.length);

  categories = leftToRightBool ? categories : categories.reverse();

  // Calculate grid dimensions
  const maxElements = Math.max(...categories.map((cat) => cat.elements.length));
  container.style.setProperty("--grid-rows", maxElements + 1); // +1 for title row

  // Create all grid items
  categories.forEach((category, categoryNum) => {
    const targetWord = category.target;
    const categoryId = targetWord + String(categoryNum);

    // Create title (placeholder/feedback) element
    const categoryTitle = document.createElement("div");
    categoryTitle.classList.add(
      "phrase-identification-category-title",
      "resize-fontSize-to-fit",
    );
    categoryTitle.id = `phrase-identification-category-title-${categoryId}`;
    categoryTitle.innerText = "_____";
    categoryTitle.style.gridColumn = categoryNum + 1;
    categoryTitle.style.gridRow = 1;
    container.appendChild(categoryTitle);

    // Create response option elements
    category.elements.forEach((categoryChild, elementIndex) => {
      const categoryItem = document.createElement("div");
      categoryItem.id = `phrase-identification-category-item-${categoryChild.toLowerCase()}`;
      categoryItem.classList.add(
        "phrase-identification-category-item",
        "resize-fontSize-to-fit",
      );
      categoryItem.innerText = categoryChild;
      categoryItem.style.gridColumn = categoryNum + 1;
      categoryItem.style.gridRow = elementIndex + 2; // +2 because title is row 1, and we're 0-indexed

      // Register clicked response
      categoryItem.onclick = async () => {
        if (
          !phraseIdentificationResponse.categoriesResponded.includes(
            categoryNum,
          )
        ) {
          const answerIsCorrect = categoryChild === targetWord ? 1 : 0;
          phraseIdentificationResponse.categoriesResponded.push(categoryNum);
          phraseIdentificationResponse.clickTime.push(performance.now());
          phraseIdentificationResponse.current.push(categoryChild);
          phraseIdentificationResponse.targetWord.push(targetWord);
          phraseIdentificationResponse.correct.push(answerIsCorrect);

          // response[categoryId] = categoryChild;
          categoryItem.classList.add("phrase-identification-item-selected");

          categoryTitle.innerText = categoryChild;
          categoryTitle.classList.add(
            answerIsCorrect
              ? "phrase-identification-item-correct"
              : "phrase-identification-item-incorrect",
          );

          updateKeypadIfNecessary(
            keypad,
            phraseIdentificationResponse,
            reader,
            BC,
            rsvpReadingTargetSets,
          );
        }
      };
      container.appendChild(categoryItem);
    });
  });

  return responseScreen;
};

export const showPhraseIdentification = (responseScreen) => {
  document.body.appendChild(responseScreen);
  const windowWidth = document.body.offsetWidth;
  const responseWidth = responseScreen.offsetWidth;
  const windowHeight = document.body.offsetHeight;
  const responseHeight = responseScreen.offsetHeight;
  if (responseWidth > windowWidth || responseHeight > windowHeight) {
    const startTime = performance.now();

    const fontSize = scaleFontSizeToFit(
      responseScreen,
      "resize-fontSize-to-fit",
      0.85,
    );
    if (fontSize === getMinFontSize()) {
      // document.body.style.overflow = "hidden";
      // responseScreen.style.overflowX = "scroll";
      // responseScreen.style.backgroundColor = "#ccc";
      // responseScreen.style.justifyContent = "left";
      document.body.style.overflow = "scroll";
    } else {
      document.body.style.overflow = "visible";
    }
    document
      .getElementById("phrase-identification-grid")
      .style.setProperty("--font-size", `${fontSize}px`);
    const stopTime = performance.now();
    const timeSpentScaling = stopTime - startTime;
    const timeSpentScalingSec = toFixedNumber(timeSpentScaling / 1000, 3);
    psychoJS.experiment.addData(
      "delayFromScalingPhraseIdentificationScreenSec",
      timeSpentScalingSec,
    );
  }
  showCursor();
};

export const noteStimulusOnsetForPhraseIdentification = (t) => {
  phraseIdentificationResponse.onsetTime = performance.now();
  phraseIdentificationResponse.onsetT = t;
};

export const getPhraseIdentificationReactionTimes = () => {
  return phraseIdentificationResponse.clickTime.map(
    (t) => (t - phraseIdentificationResponse.onsetTime) / 1000,
  );
};

export const clearPhraseIdentificationRegisters = () => {
  phraseIdentificationResponse.current = [];
  phraseIdentificationResponse.correct = [];
  phraseIdentificationResponse.targetWord = [];
  phraseIdentificationResponse.clickTime = [];
  phraseIdentificationResponse.categoriesResponded = [];
  phraseIdentificationResponse.onsetTime = undefined;
};

/* -- SPEECH RECOGNITION -- */
export const setupSpeechRecognition = () => {
  // SEE https://github.com/mdn/dom-examples/blob/master/web-speech-api/speech-color-changer/script.js
  var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
  // var SpeechGrammarList = SpeechGrammarList || window.webkitSpeechGrammarList;
  // var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

  speechRecognizer.recognition = new SpeechRecognition();

  speechRecognizer.recognition.continuous = false;
  speechRecognizer.recognition.lang = "en-US";
  speechRecognizer.recognition.interimResults = false;
  speechRecognizer.recognition.maxAlternatives = 1;

  speechRecognizer.status = "ready";
  logger("rsvp speechRecognition status set to ready", speechRecognizer.status);

  speechRecognizer.recognition.onresult = onWordRecognized;

  speechRecognizer.recognition.onspeechend = (e) => {
    // NOTE this is specific for non-continuous recognition,
    // ie we only want one word at a time.
    // speechRecognizer.recognition.stop();
    logger("recognition onspeechend", e);
  };

  speechRecognizer.recognition.onnomatch = (e) => {
    logger("recognition onnomatch", e);
  };

  speechRecognizer.recognition.onerror = (e) => {
    logger("recognition onerror", e);
  };

  speechRecognizer.recognition.onaudiostart = (e) => {
    logger("recognition onaudiostart", e);
  };

  speechRecognizer.recognition.onspeechstart = (e) => {
    logger("recognition onspeechstart", e);
  };

  speechRecognizer.recognition.start();
  logger("recognition", speechRecognizer.recognition);
};

const onWordRecognized = (e) => {
  logger("onWordRecognized e.results", e.results);
  const responseWord = e.results[0][0].transcript;
  speechRecognizer.responses.push(responseWord);
  logger("word recognized!", [e.results, responseWord]);
};

/* -- ------ ----------- -- */

const updateKeypadIfNecessary = async (
  keypad,
  phraseIdentificationResponse,
  reader,
  block_condition,
  rsvpReadingTargetSets,
) => {
  if (keypad.handler && keypad.handler.inUse(block_condition)) {
    const nextTargetNumber = phraseIdentificationResponse.correct.length;
    const nextTargetIndex = reader.read("fontLeftToRightBool", block_condition)
      ? nextTargetNumber
      : rsvpReadingTargetSets.identificationTargetSets.length -
        (1 + nextTargetNumber);
    const nextTargetSet =
      rsvpReadingTargetSets.identificationTargetSets[nextTargetIndex];
    if (typeof nextTargetSet !== "undefined") {
      const responseOptions = shuffle([
        nextTargetSet.word,
        ...nextTargetSet.foilWords,
      ]);
      await keypad.handler.update(responseOptions);
      keypad.handler.start();
    } else {
      // Done for the trial
      await keypad.handler.update([]);
      keypad.handler.stop();
    }
  }
};
