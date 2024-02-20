import axios from "axios";

import {
  displayOptions,
  font,
  fontCharacterSet,
  letterConfig,
  readingCorpusArchive,
  readingFrequencyToWordArchive,
  readingPageStats,
  readingThisBlockPages,
  readingUsedText,
  readingWordFrequencyArchive,
  readingWordListArchive,
  status,
  targetKind,
  timing,
  viewingDistanceCm,
} from "./global";
import { _getCharacterSetBoundingBox } from "./bounding";
import { getRandomInt, logger, XYPixOfXYDeg } from "./utils";

import {
  preprocessRawCorpus,
  preprocessCorpusToWordList,
  getWordFrequencies,
  processWordFreqToFreqToWords,
} from "./reading.ts";
import { psychoJS } from "./globalPsychoJS";
import { readTrialLevelLetterParams } from "./letter";

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

const getInitialFontSizePt = () =>
  Math.round(((200 / displayOptions.pixPerCm) * 72) / 2.54);

export const getSizeForXHeight = (
  readingParagraph,
  targetHeight,
  unit = "deg"
) => {
  const initialFontSizePt = getInitialFontSizePt();
  readingParagraph.setText("x");
  readingParagraph.setHeight(initialFontSizePt);
  readingParagraph._updateIfNeeded();
  readingParagraph.refresh();
  const xHeightPx = readingParagraph.getBoundingBox(true).height;

  if (unit === "deg") {
    /**
     * PSEUDO CODE TO SET x-height to readingXHeightDeg
Convert deg to px.
xHeightDesiredPx=PxOfDegVertical(readingXHeightDeg);
Set font size to initialFontSizePt, and measure the height of letter “x”: xHeightPx.
fontSizePt=(xHeightDesiredPx/xHeightPx)*initialFontSizePt
     */
    // DEG
    const readingXHeightDeg = targetHeight;
    logger("!. readingXHeightDeg", targetHeight);
    // Convert deg to px
    const xHeightDesiredPx = pxOfDegVertical(readingXHeightDeg);
    // Set font size to initialFontSizePt, and measure the height of letter “x”: xHeightPx.
    const fontSizePt = (xHeightDesiredPx / xHeightPx) * initialFontSizePt;
    return fontSizePt;
  } else {
    // PT
    const readingXHeightPt = targetHeight;
    const xHeightCm = xHeightPx / displayOptions.pixPerCm;
    const xHeightInch = xHeightCm / 2.54;
    const xHeightPt = xHeightInch * 72;
    const fontSizePt = (readingXHeightPt / xHeightPt) * initialFontSizePt;
    return fontSizePt;
  }
};

const getSizeForSpacing = (
  readingParagraph,
  readingSpacingDeg,
  testingString
) => {
  // Convert deg to px.
  const spacingDesiredPx = pxOfDegHorizontal(readingSpacingDeg);
  // Set the font size to initialFontSizePt, and measure the width of the string fontCharacterSet,
  const initialFontSizePt = getInitialFontSizePt();
  readingParagraph.setText(testingString);
  readingParagraph.setHeight(initialFontSizePt);
  readingParagraph._updateIfNeeded();
  readingParagraph.refresh();
  const stringWidthPx = readingParagraph.getBoundingBox(true).width;
  const spacingPx = stringWidthPx / testingString.length;
  const fontSizePt = (spacingDesiredPx / spacingPx) * initialFontSizePt;
  return fontSizePt;
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
  readingParagraph,
  blockOrConditionEnum
) => {
  let pt;
  let bc =
    blockOrConditionEnum === "block"
      ? paramReader.block_conditions.filter(
          (s) => Number(s.split("_")[0]) === status.block
        )
      : status.block_condition;
  readTrialLevelLetterParams(paramReader, bc);

  switch (readingSetSizeBy) {
    case "nominalDeg":
      const readingNominalSizeDeg =
        blockOrConditionEnum === "block"
          ? paramReader.read("readingNominalSizeDeg", status.block)[0]
          : paramReader.read("readingNominalSizeDeg", status.block_condition);
      pt = getReadingNominalSizeDeg(readingNominalSizeDeg);
      pt = tempScaleNominalSize(pt);
      break;
    case "nominalPt":
      if (blockOrConditionEnum === "block") {
        pt = paramReader.read("readingNominalSizePt", status.block)[0];
      } else {
        pt = paramReader.read("readingNominalSizePt", status.block_condition);
      }
      pt = tempScaleNominalSize(pt);
      break;
    case "xHeightDeg":
      const readingXHeightDeg =
        blockOrConditionEnum === "block"
          ? paramReader.read("readingXHeightDeg", status.block)[0]
          : paramReader.read("readingXHeightDeg", status.block_condition);
      pt = getSizeForXHeight(readingParagraph, readingXHeightDeg, "deg");
      break;
    case "xHeightPt":
      const readingXHeightPt =
        blockOrConditionEnum === "block"
          ? paramReader.read("readingXHeightPt", status.block)[0]
          : paramReader.read("readingXHeightPt", status.block_condition);
      pt = getSizeForXHeight(readingParagraph, readingXHeightPt, "pt");
      break;
    case "spacingDeg":
      const readingSpacingDeg =
        blockOrConditionEnum === "block"
          ? paramReader.read("readingSpacingDeg", status.block)[0]
          : paramReader.read("readingSpacingDeg", status.block_condition);
      pt = getSizeForSpacing(
        readingParagraph,
        readingSpacingDeg,
        fontCharacterSet.current.join("")
      );
      break;
    default:
      return;
  }
  let minFontSize = getMinFontPtSize(paramReader, blockOrConditionEnum);
  return Math.max(minFontSize, pt);
};
/* --------------------------------- HELPERS -------------------------------- */

const getMinFontPtSize = (paramReader, blockOrConditionEnum) => {
  let px =
    blockOrConditionEnum === "block"
      ? paramReader.read("targetMinimumPix", status.block)[0]
      : paramReader.read("targetMinimumPix", status.block_condition);
  const targetSizeIsHeightBool =
    blockOrConditionEnum === "block"
      ? paramReader.read("targetSizeIsHeightBool", status.block)[0]
      : paramReader.read("targetSizeIsHeightBool", status.block_condition);
  const characterSetRectPx = _getCharacterSetBoundingBox(
    fontCharacterSet.current,
    font.name,
    psychoJS.window,
    1,
    50,
    font.padding
  );
  if (targetSizeIsHeightBool) {
    return px / characterSetRectPx.height;
  } else {
    return px / characterSetRectPx.width;
  }
};

const tempScaleNominalSize = (nominal) => {
  return nominal * 1.42;
};

const pxToPt = (px) => {
  return ((px / displayOptions.pixPerCm) * 72) / 2.54;
};
const getReadingNominalSizeDeg = (readingNominalSizeDeg) => {
  // Convert deg to px.
  const sizePx = pxOfDegVertical(readingNominalSizeDeg);
  // Convert px to pt.
  const fontSizePt = ((sizePx / displayOptions.pixPerCm) * 72) / 2.54;
  return fontSizePt;
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

/**
 * 
UTILITY FUNCTIONS PxOfDegVertical, PxOfDegHorizontal
heightPx=PxOfDegVertical(heightDeg)
// Convert deg to px.
xDeg=targetEccentricityXDeg;
yDeg=targetEccentricityYDeg;
bottomXYPix=XYPxOfXYDeg(xDeg,yDeg-heightDeg/2);
topXYPix=XYPxOfXYDeg(xDeg,yDeg+heightDeg/2);
heightPx=bottomXYPix[1]-topXYPix[1];
return heightPx
widthPx=PxOfDegHorizontal(widthDeg)
// Convert deg to px.
xDeg=targetEccentricityXDeg;
yDeg=targetEccentricityYDeg;
leftXYPix=XYPxOfXYDeg(xDeg-widthDeg/2,yDeg);
rightXYPix=XYPxOfXYDeg(xDeg+widthDeg/2,yDeg);
widthPx=rightXYPix[0]-leftXYPix[0];
return widthPx (edited) 
 */

const pxOfDegVertical = (heightDeg) => {
  if (
    letterConfig.targetEccentricityXYDeg.some((z) => typeof z === "undefined")
  )
    throw "targetEccentricityXYDeg is undefined, pxOfDegVertical";
  // Convert deg to px
  const [xDeg, yDeg] = letterConfig.targetEccentricityXYDeg;
  const bottomXYPx = XYPixOfXYDeg([xDeg, yDeg - heightDeg / 2]);
  const topXYPx = XYPixOfXYDeg([xDeg, yDeg + heightDeg / 2]);
  const heightPx = Math.abs(bottomXYPx[1] - topXYPx[1]);
  return heightPx;
};

const pxOfDegHorizontal = (widthDeg) => {
  if (
    letterConfig.targetEccentricityXYDeg.some((z) => typeof z === "undefined")
  )
    throw "targetEccentricityXYDeg is undefined, pxOfDegHorizontal";
  // Convert deg to px
  const [xDeg, yDeg] = letterConfig.targetEccentricityXYDeg;
  const leftXYPx = XYPixOfXYDeg([xDeg - widthDeg / 2, yDeg]);
  const rightXYPx = XYPixOfXYDeg([xDeg + widthDeg / 2, yDeg]);
  const widthPx = Math.abs(rightXYPx[0] - leftXYPx[0]);
  return widthPx;
};
