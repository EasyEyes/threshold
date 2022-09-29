import axios from "axios";

import {
  displayOptions,
  readingCorpusArchive,
  readingFrequencyToWordArchive,
  readingPageStats,
  readingThisBlockPages,
  readingUsedText,
  readingWordFrequencyArchive,
  readingWordListArchive,
  timing,
} from "./global";
import { degreesToPixels, getRandomInt, logger } from "./utils";

import {
  preprocessRawCorpus,
  preprocessCorpusToWordList,
  getWordFrequencies,
  processWordFreqToFreqToWords,
} from "./reading.ts";

export const loadReadingCorpus = async (paramReader) => {
  // return new Promise((resolve, reject) => {
  //   const readingCorpus = require('./reading.txt');
  //   resolve(readingCorpus);
  // });

  if (paramReader.has("readingCorpus")) {
    const uniqueBookSources = [
      ...new Set(paramReader.read("readingCorpus", "__ALL_BLOCKS__")),
    ];
    for (let url of uniqueBookSources) {
      if (!url.length) continue;

      // Load from URL
      logger("loading this text/book", url);

      const response = await axios.get(`texts/${url}`);
      if (!response)
        console.error(`Error loading text from this source (./texts/${url})!`);

      readingCorpusArchive[url] = preprocessRawCorpus(response.data);
    }

    ////
    // Preprocess & Frequencies
    for (let corpus in readingCorpusArchive) {
      readingWordListArchive[corpus] = preprocessCorpusToWordList(
        readingCorpusArchive[corpus]
      );
      readingWordFrequencyArchive[corpus] = getWordFrequencies(
        readingWordListArchive[corpus]
      );
      readingFrequencyToWordArchive[corpus] = processWordFreqToFreqToWords(
        readingWordFrequencyArchive[corpus]
      );
      readingUsedText[corpus] = readingCorpusArchive[corpus];
    }
  }
};

export const getThisBlockPages = (
  paramReader,
  block,
  readingParagraph,
  numberOfPages = undefined
) => {
  if (paramReader.has("readingCorpus")) {
    const thisURL = paramReader.read("readingCorpus", block)[0];
    ////
    // logger("readingCorpusArchive[thisURL]", readingCorpusArchive[thisURL]);
    // readingUsedText[thisURL] = readingCorpusArchive[thisURL]
    //   .split(" ")
    //   .slice(paramReader.read("readingCorpusSkipWords", block)[0])
    //   .join(" ");

    const targetFewWordsToSplit = paramReader.read(
      "readingFirstFewWords",
      block
    )[0];
    let skippedWordsNum = 0;
    if (targetFewWordsToSplit !== "") {
      [readingUsedText[thisURL], skippedWordsNum] = getReadingUsedText(
        readingCorpusArchive[thisURL],
        paramReader.read("readingFirstFewWords", block)[0]
      );
      logger("after getReadingUsedText", readingUsedText[thisURL]);
    } else {
      readingUsedText[thisURL] = readingCorpusArchive[thisURL];
      skippedWordsNum = 0;
    }

    // logger("readingUsedText[thisURL]", readingUsedText[thisURL]);
    readingPageStats.readingPageSkipCorpusWords.push(skippedWordsNum);
    ////
    const preparedSentences = preprocessCorpusToSentenceList(
      readingUsedText[thisURL],
      readingCorpusArchive[thisURL],
      paramReader.read("readingMaxCharactersPerLine", block)[0],
      paramReader.read("readingLinesPerPage", block)[0],
      typeof numberOfPages === "undefined"
        ? paramReader.read("readingPages", block)[0]
        : numberOfPages,
      readingParagraph
    );
    readingUsedText[thisURL] = preparedSentences.readingUsedText;

    // Clear this block pages
    while (readingThisBlockPages.length) readingThisBlockPages.pop();
    readingThisBlockPages.push(...preparedSentences.sentences);

    return preparedSentences.sentences;
  }
  return [];
};

/**
 *
 * @param {*} allCorpus
 * @param {*} firstFewWords
 * @returns [readingUsedText, skippedWordsNum]
 */
const getReadingUsedText = (allCorpus, firstFewWords) => {
  const splitCorpusArray = allCorpus.split(firstFewWords);

  if (splitCorpusArray.length === 1)
    throw `[READ] Cannot find readingFirstFewWords [${firstFewWords}] in the given corpus`;
  else if (splitCorpusArray.length > 2) {
    const possibleInserts = splitCorpusArray.length - 1;
    const randomInsert = getRandomInt(1, possibleInserts);
    const readingUsedText = splitCorpusArray
      .slice(randomInsert)
      .join(firstFewWords);
    return [
      firstFewWords + readingUsedText,
      preprocessCorpusToWordList(
        splitCorpusArray.slice(0, randomInsert).join(firstFewWords)
      ).length,
    ];
  }
  return [
    firstFewWords + splitCorpusArray[1],
    preprocessCorpusToWordList(splitCorpusArray[0]).length,
  ];
};

export const preprocessCorpusToSentenceList = (
  usedText,
  originalText,
  lineBuffer,
  lineNumber,
  numberOfPages,
  readingParagraphStimulus
) => {
  if (usedText.length < lineBuffer * (lineNumber + 1) * (numberOfPages + 1))
    usedText += " " + originalText;
  const usedTextList = usedText.split(" ").filter((w) => w.length > 0);

  const sentences = [];

  let maxLinePerPageSoFar = undefined;

  for (let i = 0; i < numberOfPages; i++) {
    // PAGE
    let thisPageText = "";
    let thisLineText = "";
    let thisLineTempWordList = [];
    let line = 1;
    let thisPageLineHeights = [];

    while (line <= lineNumber) {
      // LINE
      let thisLineCharCount = lineBuffer;
      thisLineText = "";
      thisLineTempWordList = [];

      while (thisLineCharCount > 0 && usedTextList.length > 0) {
        // WORD
        const newWord = usedTextList.shift();
        thisLineTempWordList.push(newWord);
        thisLineCharCount -= newWord.length;

        const tempLineText = thisLineText + newWord;
        readingParagraphStimulus.setText(tempLineText);
        const testWidth = readingParagraphStimulus.getBoundingBox(true).width;

        if (
          (testWidth > window.innerWidth * 0.8 || thisLineCharCount < -5) &&
          thisLineTempWordList.length > 1 /* allow at least one word */
        ) {
          // Give up this word for this line
          // Go to the next line
          usedTextList.unshift(newWord);
          thisLineTempWordList.pop();

          if (lineNumber > line)
            // Not the last line
            thisLineText = removeLastSpace(thisLineText) + "\n";
          break;
        } else {
          thisLineText += newWord;
          if (thisLineCharCount > 3 && testWidth <= window.innerWidth * 0.8) {
            // Continue on this line
            thisLineText += " ";
            thisLineCharCount -= 1;
          } else {
            // Got to the next line
            if (lineNumber > line)
              thisLineText = removeLastSpace(thisLineText) + "\n";
            break;
          }
        }
      }

      readingParagraphStimulus.setText(thisLineText);
      const newTestHeight =
        readingParagraphStimulus.getBoundingBox(true).height;

      if (
        (thisPageLineHeights.reduce((p, c) => p + c, 0) + newTestHeight >
          window.innerHeight * 0.7 ||
          (maxLinePerPageSoFar && line > maxLinePerPageSoFar)) &&
        !(maxLinePerPageSoFar && line <= maxLinePerPageSoFar)
      ) {
        // Give up this line
        // Go to the next page
        for (
          let wordInd = thisLineTempWordList.length - 1;
          wordInd >= 0;
          wordInd--
        )
          usedTextList.unshift(thisLineTempWordList[wordInd]);
        line--;
        break;
      } else {
        thisPageText += thisLineText;
        thisPageLineHeights.push(newTestHeight);
        line++;
      }
    }
    if (!maxLinePerPageSoFar) maxLinePerPageSoFar = line;

    const numberWordsThisPage = preprocessCorpusToWordList(thisPageText).length;
    const previousStartingIndex =
      readingPageStats.readingPageSkipCorpusWords[
        readingPageStats.readingPageSkipCorpusWords.length - 1
      ];
    readingPageStats.readingPageSkipCorpusWords.push(
      previousStartingIndex + numberWordsThisPage
    );
    readingPageStats.readingPageLines.push(lineNumber);
    readingPageStats.readingPageWords.push(numberWordsThisPage);
    readingPageStats.readingPageNonblankCharacters.push(
      thisPageText.replace(/\s/g, "").length
    );
    sentences.push(removeLastLineBreak(thisPageText));
  }

  readingPageStats.readingPageSkipCorpusWords.pop();
  usedText = usedTextList.join(" ");
  return { usedText, sentences };
};

/* -------------------------------------------------------------------------- */

export const getSizeForXHeight = (readingParagraph, targetDeg) => {
  const targetPix = degreesToPixels(targetDeg, {
    pixPerCm: displayOptions.pixPerCm,
  });

  readingParagraph.setText("x");

  let height = 0.5;
  while (height < window.innerHeight * 0.5) {
    readingParagraph.setHeight(height);
    const testHeight = readingParagraph.getBoundingBox(true).height;
    if (testHeight > targetPix) return height;

    height += 0.5;
  }
  throw "Failed to set reading paragraph height using [xHeight]";
};

export const getSizeForSpacing = (
  readingParagraph,
  targetDeg,
  testingString
) => {
  const targetPix = degreesToPixels(targetDeg, {
    pixPerCm: displayOptions.pixPerCm,
  });

  readingParagraph.setWrapWidth(999999);
  readingParagraph.setText(testingString);

  let height = 0.5;
  while (height < window.innerHeight * 0.5) {
    readingParagraph.setHeight(height);
    const testWidth =
      readingParagraph.getBoundingBox(true).width / testingString.length;
    if (testWidth > targetPix) return height;

    height += 0.5;
  }
  throw "Failed to set reading paragraph height using [spacing]";
};

export const addReadingStatsToOutput = (pageN, psychoJS) => {
  psychoJS.experiment.addData(
    "readingPageSkipCorpusWords",
    readingPageStats.readingPageSkipCorpusWords[pageN]
  );
  psychoJS.experiment.addData(
    "readingPageLines",
    readingPageStats.readingPageLines[pageN]
  );
  psychoJS.experiment.addData(
    "readingPageWords",
    readingPageStats.readingPageWords[pageN]
  );
  psychoJS.experiment.addData(
    "readingPageNonBlankCharacters",
    readingPageStats.readingPageNonblankCharacters[pageN]
  );
  psychoJS.experiment.addData(
    "readingPageDurationOnsetToOffsetSec",
    timing.stimulusOnsetToOffset
  );
};

/* --------------------------------- HELPERS -------------------------------- */

const removeLastSpace = (str) => {
  return str.replace(/ $/, "");
};

const removeLastLineBreak = (text) => {
  return text.replace(/\n$/, "");
};
