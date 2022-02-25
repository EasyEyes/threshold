import axios from "axios";

import {
  readingCorpusArchive,
  readingThisBlockPages,
  readingUsedText,
  readingWOrdFrequencyArchive,
  readingWordListArchive,
} from "./global";
import { logger } from "./utils";

import {
  preprocessRawCorpus,
  preprocessCorpusToWordList,
  getWordFrequencies,
  preprocessCorpusToSentenceList,
} from "./reading.ts";

export const loadReadingCorpus = async (paramReader) => {
  // return new Promise((resolve, reject) => {
  //   const readingCorpus = require('./reading.txt');
  //   resolve(readingCorpus);
  // });

  if (paramReader.has("readingCorpusSource")) {
    const uniqueBookSources = [
      ...new Set(paramReader.read("readingCorpusSource")),
    ];
    for (let url of uniqueBookSources) {
      // Load from URL
      logger("loading this text/book", url);

      const response = await axios.get(`texts/${url}`);
      if (!response)
        console.error(`Error loading text from this source (./texts/${url})!`);

      readingCorpusArchive[url] = preprocessRawCorpus(response.data);

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
