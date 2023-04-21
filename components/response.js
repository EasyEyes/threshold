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

import { getFontFamilyName } from "./fonts";
import { phraseIdentificationResponse, font } from "./global";
import { psychoJS } from "./globalPsychoJS";
import { scaleFontSizeToFit } from "./showCharacterSet";
import { logger, showCursor, toFixedNumber } from "./utils";

export const _responseTypes = {
  // [click, type, keypad, speak]
  0: [false, true, false, false],
  1: [true, false, false, false],
  2: [true, true, false, false],
};

export const getResponseType = (
  click,
  type,
  keypad,
  speak,
  mustClickCrosshairForResponse,
  spokenToExperimenter
) => {
  // responseMustClickCrosshairBool
  if (mustClickCrosshairForResponse) return 1;

  // Default routine
  const c = click,
    t = type || spokenToExperimenter, // the experimenter will type, based on spoken response
    k = keypad,
    s = speak;
  if (!c && t && !k && !s) return 0;
  else if (c && !t && !k && !s) return 1;
  else if (c && t && !k && !s) return 2;
  else return 1;
  // TODO finish other situations
};

export const resetResponseType = (
  originalResponseType,
  responseType,
  mustClickCrosshairForResponse
) => {
  if (mustClickCrosshairForResponse) return originalResponseType;
  else return responseType;
};

/* -------------------------------------------------------------------------- */

export const canType = (responseType) => {
  return _responseTypes[responseType][1];
};

export const canClick = (responseType) => {
  return _responseTypes[responseType][0];
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
export const setupPhraseIdentification = (
  categories,
  reader,
  BC,
  fontSize = undefined
) => {
  const responseScreen = document.createElement("div");
  responseScreen.id = "phrase-identification-response-screen";
  responseScreen.classList.add("responseScreen");

  // TODO add header message if denis wants
  // const phrase = document.createElement("div");
  // phrase.classList.add("phrase-identification-header");
  // phrase.id = "phrase-identification-header";
  // phrase.innerHTML = "Click the word you heard from each column.";
  // responseScreen.appendChild(phrase);

  const container = document.createElement("div");
  container.classList.add("phrase-identification-clickable-categories");
  container.id = "phrase-identification-clickable-category";
  responseScreen.appendChild(container);

  const response = {};

  const leftToRightBool = reader.read("fontLeftToRightBool", BC);
  categories = leftToRightBool ? categories : categories.reverse();
  for (const [categoryNum, category] of categories.entries()) {
    const targetWord = category.target;
    // In case targetWord are not unique across categories, include category index
    const categoryId = targetWord + String(categoryNum);

    const categoryContainer = document.createElement("div");
    categoryContainer.classList.add("phrase-identification-category-container");
    categoryContainer.id = "phrase-identification-category-container";

    const categoryTitle = document.createElement("div");
    categoryTitle.classList.add("phrase-identification-category-title");
    categoryTitle.id = `phrase-identification-category-title-${categoryId}`;
    // Change the text to the target word, once a word in this category is clicked
    categoryTitle.innerHTML = "_____";

    const categoryColumn = document.createElement("div");
    categoryColumn.classList.add("phrase-identification-category-column");
    categoryColumn.id = `phrase-identification-category-column-${categoryId}`;
    categoryColumn.style.display = "flex";
    categoryColumn.style.flexDirection = "column";

    // categoryChild aka distractor word
    category.elements.forEach((categoryChild) => {
      const categoryItem = document.createElement("div");
      categoryItem.id = `phrase-identification-category-item-${categoryChild}`;
      categoryItem.className = `phrase-identification-category-item`;
      categoryItem.innerHTML = categoryChild;
      const fontFamily = getFontFamilyName(font.name);
      categoryItem.style.fontFamily = fontFamily;
      if (fontSize) categoryItem.style.fontSize = String(fontSize) + "px";
      categoryItem.onclick = () => {
        // Only register one response per category
        if (
          !phraseIdentificationResponse.categoriesResponded.includes(
            categoryNum
          )
        ) {
          const answerIsCorrect = categoryChild === targetWord ? 1 : 0;
          phraseIdentificationResponse.categoriesResponded.push(categoryNum);
          phraseIdentificationResponse.clickTime.push(performance.now());
          phraseIdentificationResponse.current.push(categoryChild);
          phraseIdentificationResponse.targetWord.push(targetWord);
          phraseIdentificationResponse.correct.push(answerIsCorrect);

          response[categoryId] = categoryChild;
          categoryItem.classList.add("phrase-identification-item-selected");

          const correspondingFeedbackText = document.getElementById(
            `phrase-identification-category-title-${categoryId}`
          );
          correspondingFeedbackText.innerHTML = categoryChild;
          correspondingFeedbackText.classList.add(
            answerIsCorrect
              ? "phrase-identification-item-correct"
              : "phrase-identification-item-incorrect"
          );
        }
      };
      categoryColumn.appendChild(categoryItem);
    });

    categoryContainer.appendChild(categoryTitle);
    categoryContainer.appendChild(categoryColumn);
    container.appendChild(categoryContainer);
  }
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
      "phrase-identification-category-item"
    );
    if (fontSize === 12) {
      document.body.style.overflow = "hidden";
      responseScreen.style.overflowX = "scroll";
      responseScreen.style.backgroundColor = "#ccc";
      responseScreen.style.justifyContent = "left";
    }
    const stopTime = performance.now();
    const timeSpentScaling = stopTime - startTime;
    const timeSpentScalingSec = toFixedNumber(timeSpentScaling / 1000, 3);
    psychoJS.experiment.addData(
      "delayFromScalingPhraseIdentificationScreenSec",
      timeSpentScalingSec
    );
  }
  showCursor();
};

export const noteStimulusOnsetForPhraseIdentification = () => {
  phraseIdentificationResponse.onsetTime = performance.now();
  console.log("onset marked!");
};

export const getPhraseIdentificationReactionTimes = () => {
  return phraseIdentificationResponse.clickTime.map(
    (t) => (t - phraseIdentificationResponse.onsetTime) / 1000
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
