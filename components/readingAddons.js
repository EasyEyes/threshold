import axios from "axios";

import {
  displayOptions,
  font,
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
  readingLineLengthUnit,
  readingConfig,
  targetEccentricityDeg,
  readingCorpusDepleted,
  readingPageIndex,
  DefaultMap,
} from "./global";
import { _getCharacterSetBoundingBox } from "./bounding";
import {
  degreesToPixels,
  getRandomInt,
  logger,
  Rectangle,
  xyPxOfDeg,
  colorRGBASnippetToRGBA,
  debug,
  getUnionRect,
} from "./utils";
import { findLongestMatchingTail } from "./misc.ts";

import {
  preprocessRawCorpus,
  preprocessCorpusToWordList,
  getWordFrequencies,
  processWordFreqToFreqToWords,
} from "./reading.ts";
import { psychoJS } from "./globalPsychoJS";
import { readTrialLevelLetterParams } from "./letter";
import { visual, util } from "../psychojs/src";
import { warning } from "./errorHandling";
import { paramReader } from "../threshold";
import { Screens } from "./multiple-displays/globals.ts";
import { XYPxOfDeg } from "./multiple-displays/utils.ts";
import { getInstructionColor } from "./color";

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
        readingCorpusArchive[corpus],
      );
      readingWordFrequencyArchive[corpus] = getWordFrequencies(
        readingWordListArchive[corpus],
      );
      readingFrequencyToWordArchive[corpus] = processWordFreqToFreqToWords(
        readingWordFrequencyArchive[corpus],
        readingWordListArchive[corpus],
      );
      readingUsedText[corpus] = new DefaultMap(
        () => readingCorpusArchive[corpus],
      );
    }
  }
};

export const getThisBlockPages = (
  paramReader,
  block,
  readingParagraph,
  readingLinesPerPage = undefined,
  wordsPerLine = undefined,
) => {
  const conditions = paramReader.block_conditions.filter(
    (s) => s.split("_")[0] === String(block),
  );
  const isRSVP =
    paramReader.read("targetKind", conditions[0]) === "rsvpReading";
  // TODO support multiple conditions interleaved in a reading block
  if (!isRSVP)
    return getThisBlockPagesForAGivenCondition(
      paramReader,
      conditions[0],
      readingParagraph,
    );
  const pages = [];
  for (const block_condition of conditions) {
    pages.push(
      ...getThisBlockPagesForAGivenCondition(
        paramReader,
        block_condition,
        readingParagraph,
        1,
        readingLinesPerPage,
        wordsPerLine,
      ),
    );
  }
  return pages;
};
export const getThisBlockPagesForAGivenCondition = (
  paramReader,
  block_condition,
  readingParagraph,
  numberOfPages,
  readingLinesPerPage,
  wordsPerLine,
  skipWords = 0,
) => {
  if (paramReader.has("readingCorpus")) {
    const thisURL = paramReader.read("readingCorpus", block_condition);
    ////
    // logger("readingCorpusArchive[thisURL]", readingCorpusArchive[thisURL]);
    // readingUsedText[thisURL] = readingCorpusArchive[thisURL]
    //   .split(" ")
    //   .slice(paramReader.read("readingCorpusSkipWords", block)[0])
    //   .join(" ");

    const targetFewWordsToSplit = paramReader.read(
      "readingFirstFewWords",
      block_condition,
    );
    const readingCorpusShuffleBool = paramReader.read(
      "readingCorpusShuffleBool",
      block_condition,
    );
    let skippedWordsNum = 0;
    const shuffledCorpus = shuffleParagraph(readingCorpusArchive[thisURL]);
    const blockCorpus = readingCorpusShuffleBool
      ? shuffledCorpus
      : readingCorpusArchive[thisURL];
    let text;
    if (skipWords) {
      const usedText = readingUsedText[thisURL].get(block_condition);
      const newFirstFewWords = findLongestMatchingTail(usedText, blockCorpus);
      [text, skippedWordsNum] = getReadingUsedText(
        blockCorpus,
        newFirstFewWords,
      );
      readingUsedText[thisURL].set(block_condition, text);
    } else if (targetFewWordsToSplit !== "") {
      [text, skippedWordsNum] = getReadingUsedText(
        blockCorpus,
        paramReader.read("readingFirstFewWords", block_condition),
      );
      readingUsedText[thisURL].set(block_condition, text);
    } else {
      readingUsedText[thisURL].set(block_condition, blockCorpus);
      skippedWordsNum = 0;
    }

    // logger("readingUsedText[thisURL]", readingUsedText[thisURL]);
    readingPageStats.readingPageSkipCorpusWords
      .get(block_condition)
      .push(skippedWordsNum);
    ////
    readingLineLengthUnit.current = paramReader.read(
      "readingLineLengthUnit",
      block_condition,
    );

    const isRSVP =
      paramReader.read("targetKind", block_condition) === "rsvpReading";
    const lineBuffer = isRSVP
      ? wordsPerLine
      : paramReader.read("readingLineLength", block_condition);
    const lineNumber = isRSVP
      ? readingLinesPerPage
      : paramReader.read("readingLinesPerPage", block_condition);
    const nPages = isRSVP
      ? numberOfPages
      : paramReader.read("readingPages", block_condition);
    const preparedSentences = preprocessCorpusToSentenceList(
      readingUsedText[thisURL].get(block_condition),
      blockCorpus,
      lineBuffer,
      lineNumber,
      nPages,
      readingParagraph,
      paramReader.read("targetKind", block_condition),
      paramReader.read("fontTrackingForLetters", block_condition),
      paramReader.read("readingCorpusEndlessBool", block_condition),
      block_condition,
    );
    readingConfig.actualLinesPerPage = Math.max(
      ...preparedSentences.sentences.map((s) => s.split("\n").length),
    );
    readingUsedText[thisURL].set(
      block_condition,
      preparedSentences.readingUsedText,
    );

    // Clear this block pages
    while (readingThisBlockPages.get(block_condition).length)
      readingThisBlockPages.get(block_condition).pop();
    readingThisBlockPages
      .get(block_condition)
      .push(...preparedSentences.sentences);

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
        splitCorpusArray.slice(0, randomInsert).join(firstFewWords),
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
  letterSpacing,
  readingCorpusEndlessBool,
  block_condition,
) => {
  // Pad the corpus (ie loop back to the beginning) if near the end
  if (readingCorpusEndlessBool) {
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
  }
  const usedTextList = usedText.split(" ").filter((w) => w.length > 0);

  const sentences = [];

  let maxLinePerPageSoFar = undefined;

  readingPageStats.readingPageWords.set(block_condition, []);

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
        let thisLinePx;
        thisLineText = "";
        thisLineTempWordList = [];
        if (readingLineLengthUnit.current == "character") {
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
            readingParagraphStimulus.setLetterSpacingByProportion(
              letterSpacing,
            );
            const pixelsAdded =
              letterSpacing *
              readingParagraphStimulus.height *
              (tempLineText.length - 1);
            const testWidth =
              readingParagraphStimulus.getBoundingBox(true).width + pixelsAdded;

            if (
              (testWidth > window.innerWidth * 0.99 ||
                thisLineCharCount < -5) &&
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
              if (
                thisLineCharCount > 3 &&
                testWidth <= window.innerWidth * 0.99
              ) {
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
        } else {
          if (readingLineLengthUnit.current == "pt") {
            thisLinePx = convertPtToPx(lineBuffer);
          } else {
            thisLinePx = pxOfDegHorizontal(lineBuffer);
          }
          let testWidth = 0;
          while (testWidth < thisLinePx && usedTextList.length > 0) {
            // WORD
            const newWord = usedTextList.shift();
            thisLineTempWordList.push(newWord);

            const tempLineText = thisLineText + newWord;

            readingParagraphStimulus.setText(tempLineText);
            readingParagraphStimulus.setLetterSpacingByProportion(
              letterSpacing,
            );
            const pixelsAdded =
              letterSpacing *
              readingParagraphStimulus.height *
              (tempLineText.length - 1);
            const testWidth =
              readingParagraphStimulus.getBoundingBox(true).width + pixelsAdded;

            if (
              (testWidth > window.innerWidth * 0.99 ||
                testWidth > thisLinePx) &&
              thisLineTempWordList.length > 1 /* allow at least one word */
            ) {
              usedTextList.unshift(newWord);
              thisLineTempWordList.pop();

              if (lineNumber > line)
                // Not the last line
                thisLineText = removeLastSpace(thisLineText) + "\n";
              break;
            } else {
              thisLineText += newWord;
              if (
                testWidth < thisLinePx &&
                testWidth <= window.innerWidth * 0.99
              ) {
                // Continue on this line
                thisLineText += " ";
              } else {
                // Got to the next line
                if (lineNumber > line)
                  thisLineText = removeLastSpace(thisLineText) + "\n";
                break;
              }
            }
          }
        }

        readingParagraphStimulus.setText(thisLineText);
        const newTestHeight = Math.abs(
          readingParagraphStimulus.getBoundingBox(true).height,
        );

        if (
          (thisPageLineHeights.reduce((p, c) => p + c, 0) + newTestHeight >
            window.innerHeight * 0.99 ||
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
      readingPageStats.readingPageSkipCorpusWords.get(block_condition)[
        readingPageStats.readingPageSkipCorpusWords.get(block_condition)
          .length - 1
      ];
    readingPageStats.readingPageSkipCorpusWords
      .get(block_condition)
      .push(previousStartingIndex + numberWordsThisPage);
    readingPageStats.readingPageLines.get(block_condition).push(lineNumber);
    readingPageStats.readingPageWords
      .get(block_condition)
      .push(numberWordsThisPage);
    readingPageStats.readingPageNonblankCharacters
      .get(block_condition)
      .push(thisPageText.replace(/\s/g, "").length);
    sentences.push(removeLastLineBreak(thisPageText));
  }

  readingPageStats.readingPageSkipCorpusWords.get(block_condition).pop();
  usedText = usedTextList.join(" ");
  return { usedText, sentences };
};

/* -------------------------------------------------------------------------- */

const getInitialFontSizePt = () =>
  Math.round(((200 / Screens[0].pxPerCm) * 72) / 2.54);

export const getSizeForXHeight = (
  readingParagraph,
  targetHeight,
  unit = "deg",
) => {
  const initialFontSize = getInitialFontSizePt();
  readingParagraph.setHeight(initialFontSize);
  readingParagraph.setText("x");
  readingParagraph._updateIfNeeded();
  readingParagraph.refresh();
  const xHeightPx = Math.abs(readingParagraph.getBoundingBox(true).height);

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
    // Convert deg to px
    const xHeightDesiredPx = pxOfDegVertical(readingXHeightDeg);
    // Set font size to initialFontSizePt, and measure the height of letter “x”: xHeightPx.
    const fontSizePx = (xHeightDesiredPx / xHeightPx) * initialFontSize;
    return fontSizePx;
  } else {
    // PT
    const readingXHeightPt = targetHeight;
    const readingXHeightPx = ptToPx(readingXHeightPt);
    const fontSizePx = (readingXHeightPx / xHeightPx) * initialFontSize;
    return fontSizePx;
  }
};

const getSizeForSpacing = (
  readingParagraph,
  readingSpacingDeg,
  testingString,
) => {
  // Convert deg to px.
  const spacingDesiredPx = pxOfDegHorizontal(readingSpacingDeg);
  // Set the font size to initialFontSizePt, and measure the width of the string fontCharacterSet,
  const initialFontSizePt = getInitialFontSizePt();
  readingParagraph.setHeight(initialFontSizePt);
  readingParagraph.setText(testingString);
  readingParagraph._updateIfNeeded();
  readingParagraph.refresh();
  const stringWidthPx = readingParagraph.getBoundingBox(true).width;
  const spacingPx = stringWidthPx / testingString.length;
  const fontSizePt = (spacingDesiredPx / spacingPx) * initialFontSizePt;
  return fontSizePt;
};

export const addReadingStatsToOutput = (pageN, psychoJS, block_condition) => {
  psychoJS.experiment.addData(
    "readingPageSkipCorpusWords",
    readingPageStats.readingPageSkipCorpusWords.get(block_condition)[pageN],
  );
  psychoJS.experiment.addData(
    "readingPageLines",
    readingPageStats.readingPageLines.get(block_condition)[pageN],
  );
  psychoJS.experiment.addData(
    "readingPageWords",
    readingPageStats.readingPageWords.get(block_condition)[pageN],
  );
  psychoJS.experiment.addData(
    "readingPageNonBlankCharacters",
    readingPageStats.readingPageNonblankCharacters.get(block_condition)[pageN],
  );
  psychoJS.experiment.addData(
    "readingPageDurationOnsetToOffsetSec",
    timing.stimulusOnsetToOffset,
  );
};

export const findReadingSize = (
  readingSetSizeBy,
  paramReader,
  readingParagraph,
  blockOrConditionEnum,
) => {
  let px;
  let bc =
    blockOrConditionEnum === "block"
      ? paramReader.block_conditions.filter(
          (s) => Number(s.split("_")[0]) === status.block,
        )
      : status.block_condition;
  readTrialLevelLetterParams(paramReader, bc);

  switch (readingSetSizeBy) {
    case "nominalDeg":
      const readingNominalSizeDeg =
        blockOrConditionEnum === "block"
          ? paramReader.read("readingNominalSizeDeg", status.block)[0]
          : paramReader.read("readingNominalSizeDeg", status.block_condition);
      px = getReadingNominalSizeDeg(readingNominalSizeDeg);
      break;
    case "nominalPt":
      let pt;
      if (blockOrConditionEnum === "block") {
        pt = paramReader.read("readingNominalSizePt", status.block)[0];
      } else {
        pt = paramReader.read("readingNominalSizePt", status.block_condition);
      }
      px = ptToPx(pt);
      px = px;
      break;
    case "xHeightDeg":
      const readingXHeightDeg =
        blockOrConditionEnum === "block"
          ? paramReader.read("readingXHeightDeg", status.block)[0]
          : paramReader.read("readingXHeightDeg", status.block_condition);
      px = getSizeForXHeight(readingParagraph, readingXHeightDeg, "deg");
      break;
    case "xHeightPt":
      const readingXHeightPt =
        blockOrConditionEnum === "block"
          ? paramReader.read("readingXHeightPt", status.block)[0]
          : paramReader.read("readingXHeightPt", status.block_condition);
      px = getSizeForXHeight(readingParagraph, readingXHeightPt, "pt");
      break;
    case "spacingDeg":
      const readingSpacingDeg =
        blockOrConditionEnum === "block"
          ? paramReader.read("readingSpacingDeg", status.block)[0]
          : paramReader.read("readingSpacingDeg", status.block_condition);
      px = getSizeForSpacing(
        readingParagraph,
        readingSpacingDeg,
        fontCharacterSet.current.join(""),
      );
      break;
    default:
      return;
  }
  let minFontSize = getMinFontSizePx(paramReader, blockOrConditionEnum);
  return Math.max(minFontSize, px);
};
/* --------------------------------- HELPERS -------------------------------- */

const getMinFontSizePx = (paramReader, blockOrConditionEnum) => {
  let px =
    blockOrConditionEnum === "block"
      ? paramReader.read("targetMinPhysicalPx", status.block)[0]
      : paramReader.read("targetMinPhysicalPx", status.block_condition);
  px = px / window.devicePixelRatio;
  const targetSizeIsHeightBool =
    blockOrConditionEnum === "block"
      ? paramReader.read("targetSizeIsHeightBool", status.block)[0]
      : paramReader.read("targetSizeIsHeightBool", status.block_condition);
  const fontTrackingForLetters =
    blockOrConditionEnum === "block"
      ? paramReader.read("fontTrackingForLetters", status.block)[0]
      : paramReader.read("fontTrackingForLetters", status.block_condition);
  const characterSetRectPx = _getCharacterSetBoundingBox(
    fontCharacterSet.current,
    font.name,
    psychoJS.window,
    1,
    50,
    font.padding,
    fontTrackingForLetters,
  );
  if (targetSizeIsHeightBool) {
    return px / characterSetRectPx.height;
  } else {
    return px / characterSetRectPx.width;
  }
};

const shuffleParagraph = (paragraph) => {
  const words = paragraph.split(" ");

  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  const shuffledParagraph = words.join(" ");

  return shuffledParagraph;
};

export const pxToPt = (px) => {
  return ((px / Screens[0].pxPerCm) * 72) / 2.54;
};
export const ptToPx = (pt) => {
  return ((2.54 * pt) / 72) * Screens[0].pxPerCm;
};
const getReadingNominalSizeDeg = (readingNominalSizeDeg) => {
  // Convert deg to px.
  const sizePx = pxOfDegVertical(readingNominalSizeDeg);
  return sizePx;
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

const pxOfDegVertical = (heightDeg) => {
  return degreesToPixels(
    heightDeg,
    [targetEccentricityDeg.x, targetEccentricityDeg.y],
    "vertical",
  );
};

const pxOfDegHorizontal = (widthDeg) => {
  return degreesToPixels(
    widthDeg,
    [targetEccentricityDeg.x, targetEccentricityDeg.y],
    "horizontal",
  );
};

const convertPtToPx = (pt) => {
  const pxPerCm = Screens[0].pxPerCm;
  const cmPerInch = 2.54;
  const inchPerPt = 1 / 72;
  const cmPerPt = inchPerPt * cmPerInch;
  return pt * cmPerPt * pxPerCm;
};

const getFontNaturalLineSpacing = (block_condition, reader, targetXYDeg) => {
  const testString = reader.read("fontCharacterSet", block_condition);
  const targetXYPx = XYPxOfDeg(0, targetXYDeg);
  const testHeight = readingConfig.height;
  const textStim = new visual.TextStim({
    name: `test-stim`,
    win: psychoJS.window,
    text: testString,
    font: font.name,
    units: "pix",
    pos: targetXYPx,
    height: testHeight,
    wrapWidth: Infinity,
    ori: 0.0,
    color: getInstructionColor(status.block_condition),
    opacity: 1.0,
    depth: -8.0,
    padding: font.padding,
    characterSet: fontCharacterSet.current.join(""),
  });
  const oneLineHeight = Math.abs(textStim.getBoundingBox(true).height);
  textStim.setText(testString + "\n" + testString);
  const twoLineHeight = Math.abs(textStim.getBoundingBox(true).height);
  const naturalLineSpacing = twoLineHeight - 2 * oneLineHeight;
  if (naturalLineSpacing < 0)
    warning(
      `Default font line spacing was calculated to be a negative value, ${naturalLineSpacing}`,
    );
  return naturalLineSpacing;
};

/**
 * A multi-line text, represented as a collection of psychoJS TextStim's.
 * Allows for setting of line spacing.
 */
export class Paragraph {
  constructor(
    linesOfText = [],
    readingLinesPerPage,
    characterSetRect,
    stimConfig,
    reader,
  ) {
    this.reader = reader;
    this._pos = stimConfig.pos ?? [0, 0];
    this._autoDraw = stimConfig.autoDraw ?? false;
    this.height = stimConfig.height ?? 100;
    this.font = stimConfig.font ?? undefined;
    this.text = linesOfText;
    this.linesPerPage = readingLinesPerPage;
    this.alignHoriz = stimConfig.alignHoriz ?? "left";
    this.wrapWidth = stimConfig.wrapWidth ?? Infinity;
    this.padding = stimConfig.padding ?? 0.5;
    this.characterSetRect = characterSetRect;
    this.stimConfig = stimConfig;
    this.BC = undefined;
    this._spawnStims();
  }
  _spawnStims() {
    const bc = this.BC ?? status.block_condition ?? "1_1";
    const markingColorRGBA = paramReader.read("markingColorRGBA", bc);
    const colorStr = colorRGBASnippetToRGBA(markingColorRGBA);
    const color = new util.Color(colorStr);
    this.alignHoriz = this.reader.read("fontLeftToRightBool", bc)
      ? "left"
      : "right";
    this.linesPerPage = this.reader.read("readingLinesPerPage", bc);
    this._pos = XYPxOfDeg(0, [
      this.reader.read("targetEccentricityXDeg", bc),
      this.reader.read("targetEccentricityYDeg", bc),
    ]);
    if (this.stims?.length) this.setAutoDraw(false);
    this.stims = this.text.map((t, i) => {
      const config = Object.assign(this.stimConfig, {
        name: `${this.stimConfig.name}-${i}`,
        text: t,
        font: font.name,
        height: this.height,
        alignHoriz: this.alignHoriz,
        wrapWidth: Infinity,
        color: color,
        letterSpacing: font.letterSpacing * this.height,
        padding: font.padding,
      });
      return new visual.TextStim(config);
    });
    this._positionStims();
    if (debug || this.reader.read("showBoundingBoxBool", bc)) {
      const boundingBoxRect = this.getBoundingBox();
      const boundingBoxVisualRect = new visual.Rect({
        win: psychoJS.window,
        units: "pix",
        width: boundingBoxRect.width,
        height: boundingBoxRect.height,
        pos: this._pos,
        lineColor: new util.Color("blue"),
        lineWidth: 1.0,
        depth: -10,
        interpolate: true,
        size: 1,
        autoDraw: true,
      });
      this.boundingBoxVisualRect = boundingBoxVisualRect;
    }
  }
  _positionStims() {
    if (!this.stims.length) return;
    const blockHeight = this.getReadingBlockHeightPx();
    if (!isFinite(blockHeight)) return;
    const fontAscender = this.getFontAscender();
    if (!isFinite(fontAscender)) return;
    const topTextLineY = this._pos[1] + blockHeight / 2 - fontAscender;
    const x = this._pos[0];
    const lineSpacingPx = this.getLineSpacing();

    const maxTextWidthPx = this.getWidestTextWidth();
    const maxStimWidthPx = Math.max(
      ...this.stims.map((s) => {
        // NOTE removing the `setAlignHoriz`s below changes the reported width.
        //      Maybe need to change the stim somehow so that `s.refresh()` takes
        //      effect? Or is `.refresh()` a red herring, and such a change updates
        //      the stim regardless? -Gus
        s.setAlignHoriz("right");
        s.setAlignHoriz("left");
        s.setPos(this._pos);
        s.refresh();
        const bb = s.getBoundingBox(true);
        return Math.abs(bb.width);
      }),
    );
    // ie readingBlockWidthPx
    let dx = Math.max(maxTextWidthPx, maxStimWidthPx);
    const xOffset = this.alignHoriz === "left" ? dx / 2 : -dx / 2;
    const trueX = x - xOffset;
    this.stims.forEach((s, i) => {
      const y = topTextLineY - i * lineSpacingPx;
      s.setAlignHoriz(this.alignHoriz ?? "left");
      s.setPos([trueX, y]);
      s.refresh();
    });
  }
  setCurrentCondition(condition) {
    this.BC = condition;
    // Update stims?
  }
  setLinesPerPage(readingLinesPerPage) {
    this.linesPerPage = readingLinesPerPage;
    this._spawnStims();
  }
  setCharacterSetRect(characterSetRect) {
    this.characterSetRect = characterSetRect;
  }
  getHeight() {
    return this.height;
  }
  getText() {
    return this.text;
  }
  getLineSpacing() {
    if (typeof this.BC === "undefined" || typeof paramReader === "undefined") {
      if (typeof this.BC === "undefined")
        console.count("this.BC is undefined, in Paragraph.getLineSpacing");
      if (typeof paramReader === "undefined")
        console.count("paramReader is undefined, in Paragraph.getLineSpacing");
      return 0;
    }
    const readingLineSpacingDefineSingleAs = paramReader.read(
      "readingLineSpacingDefineSingleAs",
      this.BC,
    );
    const readingLineSpacingMultipleOfSingle = paramReader.read(
      "readingLineSpacingMultipleOfSingle",
      this.BC,
    );
    const targetXYDeg = [
      paramReader.read("targetEccentricityXDeg", this.BC),
      paramReader.read("targetEccentricityYDeg", this.BC),
    ];
    let readingLineSpacingDeg, readingLineSpacingPx;
    switch (readingLineSpacingDefineSingleAs) {
      case "explicit":
        const readingLineSpacingSingleDeg = paramReader.read(
          "readingLineSpacingSingleDeg",
          this.BC,
        );
        readingLineSpacingDeg =
          readingLineSpacingSingleDeg * readingLineSpacingMultipleOfSingle;
        readingLineSpacingPx = degreesToPixels(
          readingLineSpacingDeg,
          targetXYDeg,
          "vertical",
        );
        break;
      case "nominalSize":
        // HELP how can we get the actual stim height (ie the value returned from
        //             the setTimeout below) in a synchonous/blocking way, so that we can
        //             use that value here (reasoning explained above) -Gus
        // NOTE just wrap it in a promise, resolve on timeout. No longer sure if necessary though (currentPointSizePx now seems accurate?).
        //      Also, requires making a lot of things async/adds complexity -Gus
        /**
            logger("!. stim bb height", this.stims[0].getBoundingBox(true).height);
            setTimeout(() => {
            logger(
                "!. stim bb height timeout",
                this.stims[0].getBoundingBox(true).height,
            );
            }, 20);
        */
        const currentPointSizePx = readingConfig.height ?? this.height;
        readingLineSpacingPx =
          currentPointSizePx * readingLineSpacingMultipleOfSingle;
        break;
      case "font":
        const naturalLineSpacingPx = getFontNaturalLineSpacing(
          this.BC,
          paramReader,
          targetXYDeg,
        );
        readingLineSpacingPx =
          naturalLineSpacingPx * readingLineSpacingMultipleOfSingle;
        break;
      case "twiceXHeight":
        // TODO
        throw "readingLineSpacingDefineSingleAs=twiceXHeight not yet implemented.";
    }
    return readingLineSpacingPx;
  }
  setAutoDraw(bool) {
    this._autoDraw = bool;
    this.stims.forEach((s) => s.setAutoDraw(bool));
  }
  setFont(fontName) {
    this.font = fontName;
    this.stims.forEach((s) => s.setFont(fontName));
  }
  setLetterSpacingByProportion(letterSpacing) {
    this.letterSpacingByProportion = letterSpacing;
    this.stims.forEach((s) => s.setLetterSpacingByProportion(letterSpacing));
  }
  setHeight(height) {
    this.height = height;
    this._spawnStims();
  }
  setAlignHoriz(direction) {
    this.alignHoriz = direction;
    this._spawnStims();
  }
  setText(text) {
    this.text = text.split("\n");
    this._spawnStims();
  }
  setWrapWidth(wrapWidth) {
    this.wrapWidth = wrapWidth;
    this.stims.forEach((s) => s.setWrapWidth(wrapWidth));
  }
  getBoundingBox() {
    const boundingBoxes = this.stims.map((s) => s.getBoundingBox(true));
    // TODO use rectFromPixiRect if this doesn't work
    const boundingPoints = boundingBoxes.map((bb) => [
      [bb.left, bb.bottom],
      [bb.right, bb.top],
    ]);
    const boundingRects = boundingPoints.map(
      ([bottomLeft, topRight]) => new Rectangle(bottomLeft, topRight, "pix"),
    );
    if (boundingRects.length === 0) return new Rectangle([0, 0], [0, 0], "pix");
    const left = Math.min(...boundingRects.map((r) => r.left));
    const right = Math.max(...boundingRects.map((r) => r.right));
    const bottom = Math.min(...boundingRects.map((r) => r.bottom));
    const top = Math.max(...boundingRects.map((r) => r.top));
    return new Rectangle([left, bottom], [right, top], "pix");
  }
  getPos() {
    return this._pos;
  }
  setPos(pos) {
    this._pos = pos;
    this._positionStims();
  }
  setPadding(padding) {
    this.padding = padding;
    this.stims.forEach((s) => s.setPadding(padding));
  }
  _updateIfNeeded() {
    this.stims.forEach((s) => s._updateIfNeeded());
  }
  refresh() {
    this.stims.forEach((s) => s.refresh());
  }
  getFontAscender() {
    if (typeof this.characterSetRect === "undefined") return 0;
    return this.height * this.characterSetRect.top;
  }
  getReadingBlockHeightPx() {
    return this.getLineSpacing() * this.linesPerPage;
  }
  setWidestText(textPage) {
    this.widestText = textPage;
    this._spawnStims();
  }
  getWidestTextWidth() {
    if (typeof this.widestText === "undefined") return 0;
    if (!this.stims.length) return 0;
    const testStim = this.stims[0];
    const oldText = testStim.getText();
    let w = 0;
    this.widestText.split("\n").forEach((s) => {
      testStim.setText(s);
      testStim.setAlignHoriz("right");
      testStim.setAlignHoriz("left");
      testStim.refresh();
      w = Math.max(w, testStim.getBoundingBox(true).width);
    });
    testStim.setText(oldText);
    return w;
  }
}

export const resetReadingState = (paragraph, block_condition) => {
  paragraph.setWidestText(undefined);
  paragraph.setCurrentCondition(undefined);
  readingCorpusDepleted.set(block_condition, false);
  readingPageIndex.current = 0;
};
