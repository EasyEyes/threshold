import axios from "axios";

import {
  displayOptions,
  fontCharacterSet,
  readingCorpusArchive,
  readingFrequencyToWordArchive,
  readingPageStats,
  readingThisBlockPages,
  readingUsedText,
  readingWordFrequencyArchive,
  readingWordListArchive,
  status,
  timing,
} from "./global";
import { degreesToPixels, getRandomInt, logger, XYPixOfXYDeg } from "./utils";

import {
  preprocessRawCorpus,
  preprocessCorpusToWordList,
  getWordFrequencies,
  processWordFreqToFreqToWords,
} from "./reading.ts";
import { psychoJS } from "./globalPsychoJS";

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
  numberOfPages = undefined,
  readingLinesPerPage = undefined,
  wordsPerLine = undefined
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
      wordsPerLine ?? paramReader.read("readingMaxCharactersPerLine", block)[0],
      readingLinesPerPage ?? paramReader.read("readingLinesPerPage", block)[0],
      numberOfPages ?? paramReader.read("readingPages", block)[0],
      readingParagraph,
      paramReader.read("targetKind", block)[0],
      paramReader.read("fontTrackingForLetters", block)[0]
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
  readingParagraphStimulus,
  targetKind = "reading",
  letterSpacing
) => {
  // Extended for use in rsvpReading by allowing lineBuffer,lineNumber to either be scalars or arrays
  if (lineBuffer instanceof Array && lineNumber instanceof Array) {
    if (
      usedText.length <
      lineBuffer[0] * (lineNumber[0] + 1) * (numberOfPages + 1)
    )
      usedText += " " + originalText;
  } else {
    if (usedText.length < lineBuffer * (lineNumber + 1) * (numberOfPages + 1))
      usedText += " " + originalText;
  }
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

    if (targetKind === "reading") {
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
          // Chianna: Not sure why this is, but it only takes into account letterSpacing for fonts like Sloan
          // if you both set the text to the scientist set letter spacing and calculate the added
          // pixels. Seems to be a bit of a hacky way to do this, so feel free to play around with it
          readingParagraphStimulus.setLetterSpacingByProportion(letterSpacing);
          const pixelsAdded =
            letterSpacing *
            readingParagraphStimulus.height *
            (tempLineText.length - 1);
          const testWidth =
            readingParagraphStimulus.getBoundingBox(true).width + pixelsAdded;

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
        console.log();
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
    } else {
      // rsvpReading
      let thisLineNumber =
        lineNumber instanceof Array ? lineNumber[i] : lineNumber;
      let thisLineBuffer =
        lineBuffer instanceof Array ? lineBuffer[i] : lineBuffer;
      while (line <= thisLineNumber) {
        // LINE
        let thisLineWordCount = thisLineBuffer;
        thisLineText = "";
        thisLineTempWordList = [];
        while (thisLineWordCount > 0 && usedTextList.length > 0) {
          // WORD
          const newWord = usedTextList.shift();
          if (!["-", ".", "'", '"'].includes(newWord)) {
            thisLineTempWordList.push(newWord);
            thisLineWordCount--;
          }
        }
        thisLineText = thisLineTempWordList.join(" ") + "\n";
        thisPageText += thisLineText;
        line++;
      }
    }

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
  const targetPix = degreesToPixels(targetDeg, "y");

  readingParagraph.setText("x");

  let height = 0.5;
  let testHeight;
  while (height < window.innerHeight * 0.5) {
    readingParagraph.setHeight(height);
    testHeight = readingParagraph.getBoundingBox(true).height;
    if (testHeight > targetPix) return height;

    height += 0.5;
  }
  psychoJS.experiment.addData(
    "readingParagraphSetHeightUsingxHeightDegError",
    `height: ${height}, window height: ${window.innerHeight}, testHeight: ${testHeight}, targetPix: ${targetPix}`
  );
  throw `Failed to set reading paragraph height using [xHeightDeg]. height: ${height}, window height: ${window.innerHeight}, testHeight: ${testHeight}, targetPix: ${targetPix}`;
};

export const getSizeForSpacing = (
  readingParagraph,
  targetDeg,
  testingString
) => {
  // TODO calculate spacing at fixation location, not just [0,0]?
  const targetPix = XYPixOfXYDeg([targetDeg, 0], displayOptions)[0];

  readingParagraph.setWrapWidth(999999);
  readingParagraph.setText(testingString);

  let height = 0.5;
  let testWidth;
  while (height < window.innerHeight * 0.5) {
    readingParagraph.setHeight(height);
    testWidth =
      readingParagraph.getBoundingBox(true).width / testingString.length;
    if (testWidth > targetPix) return height;

    height += 0.5;
  }
  psychoJS.experiment.addData(
    "readingParagraphSetHeightUsingSpacingError",
    `height: ${height}, windowHeight: ${window.innerHeight}, testWidth: ${testWidth}, testingString.length: ${testingString.length}, targetPix: ${targetPix}`
  );
  throw `Failed to set reading paragraph height using [spacing]. height: ${height}, windowHeight: ${window.innerHeight}, testWidth: ${testWidth}, testingString.length: ${testingString.length}, targetPix: ${targetPix}`;
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

export const findReadingSize = (
  readingSetSizeBy,
  paramReader,
  readingParagraph
) => {
  let px;
  switch (readingSetSizeBy) {
    case "nominalDeg":
      px = getReadingNominalSizeDeg(paramReader);
      break;
    case "xHeightDeg":
      px = getSizeForXHeight(
        readingParagraph,
        paramReader.read("readingXHeightDeg", status.block)[0]
      );
      break;
    case "spacing":
      px = getSizeForSpacing(
        readingParagraph,
        paramReader.read("readingSpacingDeg", status.block)[0],
        fontCharacterSet.current.join("")
      );
      break;
    case "nominalPt":
      px = getReadingNominalSizePt(paramReader);
      break;
    default:
      return;
  }
  return Math.max(1, px);
};
/* --------------------------------- HELPERS -------------------------------- */

const getReadingNominalSizeDeg = (paramReader, customValueDeg = undefined) => {
  if (typeof customValueDeg === "undefined") {
    return degreesToPixels(
      paramReader.read("readingNominalSizeDeg", status.block)[0],
      "y"
    );
  }
  return degreesToPixels(customValueDeg, "y");
};

const getReadingNominalSizePt = (paramReader) => {
  const sizeDeg =
    (paramReader.read("readingNominalSizePt", status.block)[0] *
      ((displayOptions.pixPerCm * 2.54) / 72)) /
    displayOptions.pixPerCm;
  return getReadingNominalSizeDeg(paramReader, sizeDeg);
};

const removeLastSpace = (str) => {
  return str.replace(/ $/, "");
};

const removeLastLineBreak = (text) => {
  return text.replace(/\n$/, "");
};

export const reportWordCounts = (reader, experiment) => {
  const BC = status.block_condition;
  const corpus = reader.read("readingCorpus", BC);
  const laxWordCount = readingCorpusArchive[corpus]
    .split(" ")
    .filter((x) => x.length > 0).length;
  const strictWordCount = readingWordListArchive[corpus].length;
  experiment.addData("readingCorpusWordsLax", laxWordCount);
  experiment.addData("readingCorpusWordsStrict", strictWordCount);
};
