import axios from "axios";

import {
  readingCorpusArchive,
  readingThisBlockPages,
  readingUsedText,
  readingWordFrequencyArchive,
  readingWordListArchive,
} from "./global";
import { logger } from "./utils";

import {
  preprocessRawCorpus,
  preprocessCorpusToWordList,
  getWordFrequencies,
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

  for (let i = 0; i < numberOfPages; i++) {
    let thisPageText = "";
    let thisLineText = "";
    let thisLineTempWordList = [];
    let line = 1;

    while (line <= lineNumber) {
      let thisLineCharCount = lineBuffer;
      thisLineText = "";
      thisLineTempWordList = [];

      while (thisLineCharCount > 0 && usedTextList.length > 0) {
        const newWord = usedTextList.shift();
        thisLineTempWordList.push(newWord);
        thisLineCharCount -= newWord.length + 1;

        const tempLineText = thisLineText + " " + newWord;
        readingParagraphStimulus.setText(tempLineText);
        const testWidth = readingParagraphStimulus.getBoundingBox(true).width;

        if (testWidth > window.innerWidth * 0.7) {
          // Give up this word for this line
          // Go to the next line
          usedTextList.unshift(newWord);
          thisLineTempWordList.pop();
          thisLineText += "\n";
          break;
        } else {
          thisLineText += newWord;
          if (thisLineCharCount > 0) {
            thisLineText += " ";
          } else if (thisLineCharCount <= 0 && lineNumber > line) {
            // Not the last line
            thisLineText += "\n";
          }
        }
      }

      const tempPageText = thisPageText + thisLineText;
      readingParagraphStimulus.setText(tempPageText);
      const testHeight = readingParagraphStimulus.getBoundingBox(true).height;

      if (testHeight > window.innerHeight * 0.9) {
        // Give up this line
        // Go to the next page
        for (
          let wordInd = thisLineTempWordList.length - 1;
          wordInd >= 0;
          wordInd--
        )
          usedTextList.unshift(thisLineTempWordList[wordInd]);

        break;
      } else {
        thisPageText += thisLineText;
      }
      line++;
    }
    sentences.push(thisPageText);
  }

  usedText = usedTextList.join(" ");
  return { usedText, sentences };
};
