import axios from "axios";

import {
  displayOptions,
  readingCorpusArchive,
  readingFrequencyToWordArchive,
  readingThisBlockPages,
  readingUsedText,
  readingWordFrequencyArchive,
  readingWordListArchive,
} from "./global";
import { degreesToPixels, logger } from "./utils";

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
    const uniqueBookSources = [...new Set(paramReader.read("readingCorpus"))];
    for (let url of uniqueBookSources) {
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

export const getThisBlockPages = (paramReader, block, readingParagraph) => {
  if (paramReader.has("readingCorpus")) {
    const thisURL = paramReader.read("readingCorpus", block)[0];
    ////
    readingUsedText[thisURL] = readingCorpusArchive[thisURL]
      .split(" ")
      .slice(paramReader.read("readingCorpusSkipWords", block)[0])
      .join(" ");
    ////
    const preparedSentences = preprocessCorpusToSentenceList(
      readingUsedText[thisURL],
      readingCorpusArchive[thisURL],
      paramReader.read("readingMaxCharactersPerLine", block)[0],
      paramReader.read("readingLinesPerPage", block)[0],
      paramReader.read("readingPages", block)[0],
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

    sentences.push(removeLastLineBreak(thisPageText));
  }

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

/* --------------------------------- HELPERS -------------------------------- */

const removeLastSpace = (str) => {
  return str.replace(/ $/, "");
};

const removeLastLineBreak = (text) => {
  return text.replace(/\n$/, "");
};
