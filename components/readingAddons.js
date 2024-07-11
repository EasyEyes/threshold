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
} from "./global";
import { _getCharacterSetBoundingBox } from "./bounding";
import {
  degreesToPixels,
  getEvenlySpacedValues,
  getRandomInt,
  getUnionRect,
  logger,
  Rectangle,
  XYPixOfXYDeg,
} from "./utils";

import {
  preprocessRawCorpus,
  preprocessCorpusToWordList,
  getWordFrequencies,
  processWordFreqToFreqToWords,
} from "./reading.ts";
import { psychoJS } from "./globalPsychoJS";
import { readTrialLevelLetterParams } from "./letter";
import { visual } from "../psychojs/src";
import { warning } from "./errorHandling";
import { updateColor } from "./color";

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
  wordsPerLine = undefined,
  readingCorpusShuffleBool = false,
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
      block,
    )[0];
    let skippedWordsNum = 0;
    const shuffledCorpus = shuffleParagraph(readingCorpusArchive[thisURL]);
    const blockCorpus = readingCorpusShuffleBool
      ? shuffledCorpus
      : readingCorpusArchive[thisURL];
    if (targetFewWordsToSplit !== "") {
      [readingUsedText[thisURL], skippedWordsNum] = getReadingUsedText(
        blockCorpus,
        paramReader.read("readingFirstFewWords", block)[0],
      );
    } else {
      readingUsedText[thisURL] = blockCorpus;
      skippedWordsNum = 0;
    }

    // logger("readingUsedText[thisURL]", readingUsedText[thisURL]);
    readingPageStats.readingPageSkipCorpusWords.push(skippedWordsNum);
    ////
    readingLineLengthUnit.current = paramReader.read(
      "readingLineLengthUnit",
      block,
    )[0];

    const preparedSentences = preprocessCorpusToSentenceList(
      readingUsedText[thisURL],
      blockCorpus,
      wordsPerLine ?? paramReader.read("readingLineLength", block)[0],
      readingLinesPerPage ?? paramReader.read("readingLinesPerPage", block)[0],
      numberOfPages ?? paramReader.read("readingPages", block)[0],
      readingParagraph,
      paramReader.read("targetKind", block)[0],
      paramReader.read("fontTrackingForLetters", block)[0],
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

  readingPageStats.readingPageWords = [];

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
        console.log(readingLineLengthUnit.current);
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
              if (
                thisLineCharCount > 3 &&
                testWidth <= window.innerWidth * 0.8
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
          console.log("thisLinePx", thisLinePx);
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
              (testWidth > window.innerWidth * 0.8 || testWidth > thisLinePx) &&
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
                testWidth <= window.innerWidth * 0.8
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
      previousStartingIndex + numberWordsThisPage,
    );
    readingPageStats.readingPageLines.push(lineNumber);
    readingPageStats.readingPageWords.push(numberWordsThisPage);
    readingPageStats.readingPageNonblankCharacters.push(
      thisPageText.replace(/\s/g, "").length,
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
  unit = "deg",
) => {
  const initialFontSize = getInitialFontSizePt();
  readingParagraph.setText("x");
  readingParagraph.setHeight(initialFontSize);
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
    readingPageStats.readingPageSkipCorpusWords[pageN],
  );
  psychoJS.experiment.addData(
    "readingPageLines",
    readingPageStats.readingPageLines[pageN],
  );
  psychoJS.experiment.addData(
    "readingPageWords",
    readingPageStats.readingPageWords[pageN],
  );
  psychoJS.experiment.addData(
    "readingPageNonBlankCharacters",
    readingPageStats.readingPageNonblankCharacters[pageN],
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

  const adhoc_nominal_scalar = 0.667;
  switch (readingSetSizeBy) {
    case "nominalDeg":
      const readingNominalSizeDeg =
        blockOrConditionEnum === "block"
          ? paramReader.read("readingNominalSizeDeg", status.block)[0]
          : paramReader.read("readingNominalSizeDeg", status.block_condition);
      px =
        getReadingNominalSizeDeg(readingNominalSizeDeg) * adhoc_nominal_scalar;
      break;
    case "nominalPt":
      let pt;
      if (blockOrConditionEnum === "block") {
        pt = paramReader.read("readingNominalSizePt", status.block)[0];
      } else {
        pt = paramReader.read("readingNominalSizePt", status.block_condition);
      }
      px = ptToPx(pt);
      px = px * adhoc_nominal_scalar;
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
    font.padding,
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
  return ((px / displayOptions.pixPerCm) * 72) / 2.54;
};
export const ptToPx = (pt) => {
  return ((2.54 * pt) / 72) * displayOptions.pixPerCm;
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
  const pxPerCm = displayOptions.pixPerCm;
  const cmPerInch = 2.54;
  const inchPerPt = 1 / 72;
  const cmPerPt = inchPerPt * cmPerInch;
  return pt * cmPerPt * pxPerCm;
};

export const getReadingLineSpacing = (block_condition, reader) => {
  const readingDefineSingleLineSpacingAs = reader.read(
    "readingDefineSingleLineSpacingAs",
    block_condition,
  );
  const readingMultipleOfSingleLineSpacing = reader.read(
    "readingMultipleOfSingleLineSpacing",
    block_condition,
  );
  const targetXYDeg = [
    reader.read("targetEccentricityXDeg", block_condition),
    reader.read("targetEccentricityYDeg", block_condition),
  ];
  let readingLineSpacingDeg, readingLineSpacingPx;
  switch (readingDefineSingleLineSpacingAs) {
    case "explicit":
      const readingSingleLineSpacingDeg = reader.read(
        "readingSingleLineSpacingDeg",
        block_condition,
      );
      readingLineSpacingDeg =
        readingSingleLineSpacingDeg * readingMultipleOfSingleLineSpacing;
      readingLineSpacingPx = degreesToPixels(
        readingLineSpacingDeg,
        targetXYDeg,
        "vertical",
      );
      break;
    case "nominalSize":
      const currentPointSizePx = readingConfig.height;
      readingLineSpacingPx =
        currentPointSizePx * readingMultipleOfSingleLineSpacing;
      break;
    case "font":
      const naturalLineSpacingPx = getFontNaturalLineSpacing(
        block_condition,
        reader,
        targetXYDeg,
      );
      readingLineSpacingPx =
        naturalLineSpacingPx * readingMultipleOfSingleLineSpacing;
      break;
    case "twiceXHeight":
      // TODO
      throw "readingDefineSingleLineSpacingAs=twiceXHeight not yet implemented.";
  }
  return readingLineSpacingPx;
};

const getFontNaturalLineSpacing = (block_condition, reader, targetXYDeg) => {
  const testString = reader.read("fontCharacterSet", block_condition);
  const targetXYPx = XYPixOfXYDeg(targetXYDeg);
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
    color: new Color("black"),
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
  constructor(linesOfText = [], lineSpacingPx = 0, stimConfig) {
    this._pos = stimConfig.pos ?? [];
    this._autoDraw = stimConfig.autoDraw ?? false;
    this.height = stimConfig.height ?? undefined;
    this.font = stimConfig.font ?? undefined;
    this.lineSpacing = lineSpacingPx;
    this.text = linesOfText;
    this.alignHorz = stimConfig.alignHorz ?? undefined;
    this.wrapWidth = stimConfig.wrapWidth ?? undefined;
    this.padding = stimConfig.padding ?? undefined;
    this.stimConfig = stimConfig;
    this._spawnStims();
  }
  _spawnStims() {
    if (this.stims?.length) this.setAutoDraw(false);
    this.stims = this.text.reverse().map((t, i) => {
      const config = Object.assign(this.stimConfig, {
        name: `${this.stimConfig.name}-${i}`,
        text: t,
        font: this.font,
        height: this.height,
        alignHorz: this.alignHorz,
      });
      return new visual.TextStim(config);
    });
    this._positionStims();
  }
  getHeight() {
    return this.height;
  }
  getText() {
    return this.text;
  }
  _positionStims() {
    const nLines = this.text.length;
    const yPosOffsetsPx = getEvenlySpacedValues(nLines, this.lineSpacing);
    this.stims.forEach((s, i) =>
      s.setPos([this._pos[0], this._pos[1] + yPosOffsetsPx[i]]),
    );
  }
  setLineSpacing(lineSpacing) {
    this.lineSpacing = lineSpacing;
    this._positionStims();
  }
  setAutoDraw(bool) {
    this._autoDraw = bool;
    this.stims.forEach((s) => s.setAutoDraw(bool));
  }
  setFont(fontName) {
    this.font = fontName;
    this.stims.forEach((s) => s.setFont(fontName));
  }
  updateColor(markingOrInstruction, blockOrCondition) {
    this.stims.forEach((s) =>
      updateColor(s, markingOrInstruction, blockOrCondition),
    );
  }
  setLetterSpacingByProportion(letterSpacing) {
    this.letterSpacingByProportion = letterSpacing;
    this.stims.forEach((s) => s.setLetterSpacingByProportion(letterSpacing));
  }
  setHeight(height) {
    this.height = height;
    this.stims.forEach((s) => s.setHeight(height));
  }
  setAlignHoriz(direction) {
    this.alignHorz = direction;
    this.stims.forEach((s) => s.setAlignHoriz(direction));
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
    const boundingRect = boundingRects.reduce((p, c) => getUnionRect(p, c));
    return boundingRect;
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
}
