import {
  readingCorpusArchive,
  readingThisBlockPages,
  readingUsedText,
  readingWOrdFrequencyArchive,
  readingWordListArchive,
} from "./global";
import { loggerText } from "./utils";

import {
  preprocessRawCorpus,
  preprocessCorpusToWordList,
  getWordFrequencies,
  preprocessCorpusToSentenceList,
} from "./reading.ts";

import { exampleReadingCorpus } from "./hardcodedExamples";

export const loadReadingCorpus = (paramReader) => {
  // return new Promise((resolve, reject) => {
  //   const readingCorpus = require('./reading.txt');
  //   resolve(readingCorpus);
  // });

  if (paramReader.has("readingCorpusSource")) {
    for (let url of [...new Set(paramReader.read("readingCorpusSource"))]) {
      // Load from URL
      loggerText(url);
    }
    ////
    // ! Remove this line
    readingCorpusArchive["the-phantom-tollbooth.txt"] =
      preprocessRawCorpus(exampleReadingCorpus); // ! Hardcoded

    ////
    // Preprocess & Frequencies
    for (let corpus in readingCorpusArchive) {
      readingWordListArchive[corpus] = preprocessCorpusToWordList(
        readingCorpusArchive[corpus]
      );
      readingWOrdFrequencyArchive[corpus] = getWordFrequencies(
        readingWordListArchive[corpus]
      );
      readingUsedText[corpus] = readingCorpusArchive[corpus];
    }
  }
};

export const getThisBlockPages = (paramReader, block_condition) => {
  if (paramReader.has("readingCorpusSource", block_condition)) {
    const thisURL = paramReader.read("readingCorpusSource", block_condition);
    const pageBuffer =
      paramReader.read("readingLinesPerPage", block_condition) *
      paramReader.read("readingMaxCharactersPerLine", block_condition);

    const preparedSentences = preprocessCorpusToSentenceList(
      readingUsedText[thisURL],
      readingCorpusArchive[thisURL],
      pageBuffer,
      paramReader.read("readingPages", block_condition)
    );
    readingUsedText[thisURL] = preparedSentences.readingUsedText;

    readingThisBlockPages.push(...preparedSentences.sentences);
    return preparedSentences.sentences;
  }
  return [];
};
