import { warning } from "./errorHandling";
import {
  readingCorpusFoilsArchive,
  readingCorpusPastFoils,
  readingCorpusPastTargets,
} from "./global";
import {
  logger,
  sampleWithoutReplacement,
  sampleWithReplacement,
} from "./utils";

interface ReadingQuestionAnswers {
  correctAnswer: string;
  foils: string[];
}
export const prepareReadingQuestions = (
  numberOfQ: number,
  numberOfA: number,
  textPages: string[],
  freqToWords: FrequencyToWords,
  responseType: string,
  targetKind?: string,
  rsvpReadingRequireUniqueWordsBool?: boolean,
  readingCorpusFoils?: string,
  readingCorpusFoilsExclude?: string,
  readingCorpus?: string,
) => {
  /**
   * In rsvp:
   * numberOfQ = rsvpReadingNumberOfWords
   * numberOfA = rsvpReadingNumberOfResponseOptions
   */
  let usablePages = [...textPages];
  if (targetKind !== "rsvpReading") {
    if (usablePages.length > 2) usablePages.shift();
    if (usablePages.length > 1) usablePages.pop();
  }
  // Get displayed words
  const displayedCanonicalWords = new Set();
  for (const page of textPages) {
    const pageList = preprocessCorpusToWordList(preprocessRawCorpus(page));
    displayedCanonicalWords.add(
      pageList
        .filter((s) => s.length)
        .map((word) => canonical(word, "displayedCanonicalWords")),
    );
  }

  let questions: ReadingQuestionAnswers[] = [];
  let remaining = [...usablePages];
  interface Answer {
    answer: string;
    frequency: number;
  }
  let answersAndFrequencies: Array<Answer> = [];
  for (let i = 0; i < numberOfQ; i++) {
    let [correctAnswer, correctAnswerFreq] = getCorrectAnswer(
      usablePages,
      freqToWords,
      questions,
      targetKind,
      rsvpReadingRequireUniqueWordsBool,
    );
    if (correctAnswerFreq !== 0 && targetKind === "rsvpReading")
      remaining = remaining.filter(
        (p) => canonical(p) !== canonical(correctAnswer),
      );
    questions.push({ correctAnswer: correctAnswer, foils: [] });
    if (correctAnswerFreq === 0) {
      if (targetKind === "rsvpReading") {
        correctAnswer = remaining.shift() as string;
        correctAnswerFreq = Math.min(...Object.keys(freqToWords).map(Number));
        warning(
          `rsvpReading failed to correctly tokenize the string "${usablePages.join(
            ", ",
          )}". Using the string "${correctAnswer}" as the target, and drawing foils of the lowest word frequency."`,
        );
      } else {
        throw "Failed to construct a new question. [no correct answer].";
      }
    }
    answersAndFrequencies.push({
      answer: correctAnswer,
      frequency: correctAnswerFreq,
    });
  }
  const canonicalAnswers = answersAndFrequencies.map((x) =>
    canonical(x.answer, "x.answer"),
  );
  questions = [];
  for (let i = 0; i < numberOfQ; i++) {
    const { answer: correctAnswer, frequency: correctAnswerFreq } =
      answersAndFrequencies[i];
    const newQuestion: ReadingQuestionAnswers = {
      correctAnswer: correctAnswer,
      foils: [],
    };
    if (readingCorpus) readingCorpusPastTargets.add(correctAnswer);

    const maxFrequency = Math.max(...Object.keys(freqToWords).map(Number));

    let freqToTest = correctAnswerFreq;
    let freqAdjustCounter = 1;

    const possibleFoils: Set<string> = new Set();
    const foilCount = responseType == "spoken" ? 0 : numberOfA - 1;
    if (freqToWords[freqToTest].some((x) => typeof x === "undefined"))
      warning(
        "undefined words in freqToWord, " +
          freqToWords[freqToTest]
            .filter((x) => typeof x === "undefined")
            .toString(),
      );
    if (readingCorpusFoils === "") {
      while (possibleFoils.size < foilCount) {
        for (const word of shuffle(freqToWords[freqToTest])) {
          const w = canonical(word);
          const inAnswers = canonicalAnswers.includes(w);
          let inOtherFoils = questions
            .map((x) => x.foils)
            .flat()
            .map((word) => canonical(word))
            .includes(w);
          if (
            targetKind === "rsvpReading" &&
            !rsvpReadingRequireUniqueWordsBool
          )
            inOtherFoils = false;
          let excludeFoil = false;
          if (readingCorpusFoilsExclude === "pastTargets") {
            excludeFoil = readingCorpusPastTargets.has(w);
          } else if (readingCorpusFoilsExclude === "pastTargetsAndFoils") {
            excludeFoil =
              readingCorpusPastTargets.has(w) || readingCorpusPastFoils.has(w);
          }
          if (
            displayedCanonicalWords.has(w) ||
            w === canonical(correctAnswer) ||
            (word.length < 2 && targetKind !== "rsvpReading") || // Allow for short words in rsvpReading
            inAnswers ||
            inOtherFoils ||
            excludeFoil ||
            [...possibleFoils.values()]
              .flat()
              .map((word) => canonical(word))
              .includes(w)
          )
            continue;
          possibleFoils.add(word);
          if (readingCorpus) readingCorpusPastFoils.add(word);
          if (possibleFoils.size === foilCount) break; // !
        }

        freqToTest += freqAdjustCounter;
        while (freqToWords[freqToTest] === undefined) {
          freqToTest += freqAdjustCounter;
          if (freqToTest > maxFrequency) {
            freqAdjustCounter = -freqAdjustCounter;
            freqToTest = maxFrequency;
          }
          if (freqToTest < 1) {
            break;
            // throw "Failed to construct a new question. [no enough foils]";
          }
        }
        if (freqToWords[freqToTest] === undefined) {
          throw "Failed to construct a new question. [not enough foils]";
        }
      }
      // TODO unnecessary? remove? can break experimenter's request for unique words
      let possibleFoilsList;
      if (possibleFoils.size < foilCount) {
        const fauxFoilsNeeded = foilCount - possibleFoils.size;
        let possibleFoilsForFauxFoils = [...possibleFoils];
        if (readingCorpusFoilsExclude === "pastTargets") {
          possibleFoilsForFauxFoils = possibleFoilsForFauxFoils.filter(
            (foil: string) =>
              !readingCorpusPastTargets.has(foil) &&
              foil !== canonical(correctAnswer),
          );
        } else if (readingCorpusFoilsExclude === "pastTargetsAndFoils") {
          possibleFoilsForFauxFoils = possibleFoilsForFauxFoils.filter(
            (foil: string) =>
              !readingCorpusPastTargets.has(foil) &&
              !readingCorpusPastFoils.has(foil) &&
              foil !== canonical(correctAnswer),
          );
        }
        const fauxFoils = sampleWithReplacement(
          [...possibleFoilsForFauxFoils],
          fauxFoilsNeeded,
        );
        possibleFoilsList = shuffle([...possibleFoils, ...fauxFoils]);
      } else {
        possibleFoilsList = shuffle([...possibleFoils]);
      }
      newQuestion.foils.push(...possibleFoilsList);
      possibleFoilsList.forEach((foil: string) =>
        readingCorpusPastFoils.add(foil),
      );
      questions.push(newQuestion);
    } else if (readingCorpusFoils) {
      let foils;

      if (
        readingCorpusFoilsArchive
          .get(readingCorpusFoils)
          .includes(correctAnswer)
      ) {
        readingCorpusPastTargets.add(correctAnswer);
      }
      if (readingCorpusFoilsExclude === "pastTargets") {
        foils = sampleWithoutReplacement(
          readingCorpusFoilsArchive
            .get(readingCorpusFoils)
            .filter(
              (foil: string) =>
                !readingCorpusPastTargets.has(foil) &&
                foil !== canonical(correctAnswer),
            ),
          foilCount,
        );
      } else if (readingCorpusFoilsExclude === "pastTargetsAndFoils") {
        foils = sampleWithoutReplacement(
          readingCorpusFoilsArchive
            .get(readingCorpusFoils)
            .filter(
              (foil: string) =>
                !readingCorpusPastTargets.has(foil) &&
                !readingCorpusPastFoils.has(foil) &&
                foil !== canonical(correctAnswer),
            ),
          foilCount,
        );
      } else {
        foils = sampleWithoutReplacement(
          readingCorpusFoilsArchive
            .get(readingCorpusFoils)
            .filter((foil: string) => foil !== canonical(correctAnswer)),
          foilCount,
        );
      }
      newQuestion.foils.push(...foils);
      foils.forEach((foil: string) => readingCorpusPastFoils.add(foil));
      questions.push(newQuestion);
    }
  }
  return shuffle(questions);
};

interface WordFrequencies {
  [key: string]: number;
}
export const getWordFrequencies = (words: string[]) => {
  const frequencies: WordFrequencies = {};
  for (let word of words) {
    // TODO Denis doesn't want capitalisation to be changed, yet if we care about word frequency we must treat upper/lowercase to be the same word
    // possible to store frequency of both word and word.toLowerCase()? eg...
    // if (word !== word.toLowerCase()) {
    //   if (!(word in frequencies)) frequencies[word] = frequencies[word.toLowerCase()] ?? 1;
    //   else frequencies[word] += 1;
    // }
    const standardFormWord = canonical(word);
    if (!(standardFormWord in frequencies)) frequencies[standardFormWord] = 1;
    else frequencies[standardFormWord] += 1;
  }
  return frequencies;
};

interface FrequencyToWords {
  [key: number]: string[];
}
export const processWordFreqToFreqToWords = (
  wordFrequencies: WordFrequencies,
  words: string[],
): FrequencyToWords => {
  const freqToWords: FrequencyToWords = {};

  for (const word of words) {
    // TODO should we have some filtering, eg // if (onlyAlphabets(word)), ??
    //      We used to. Removed when adding rsvpReading iirc, not sure why.
    const freq = wordFrequencies[canonical(word)];
    if (!(freq in freqToWords)) freqToWords[freq] = [];
    freqToWords[freq].push(word);
  }

  return freqToWords;
};

/* ------------------------------- Preprocess ------------------------------- */

// Ensure that word, Word, and WORD are canonically the same "word".
// Conceivably in future we may want to, eg do more stripping of non-word characters
export const canonical = (
  word: any,
  functionUsed: string = "same file",
): string => {
  try {
    return word.toLowerCase();
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `Error in reading word ${word} from function "${functionUsed}": ${error.message}`,
      );
    } else {
      console.error(
        `Unknown error in reading word ${word} from function "${functionUsed}"`,
      );
    }
    return "";
  }
};

export const preprocessRawCorpus = (corpus: string) => {
  // Replace non-standard characters
  corpus = corpus.replace(/“”/gm, `"`).replace(/‘’/gm, `'`);
  corpus = corpus.replace(/—/gm, `-`).replace(/_/gm, "");
  // Remove line breaks
  corpus = corpus.replace(/(\r\n|\n|\r)/g, " ");
  return corpus;
};

// Take a long string and return an array of words without punctuation
export const preprocessCorpusToWordList = (text: string) => {
  /**
   * Arabic \u0600-\u06ff
   * Chinese \u4e00-\u9fff
   * French \u00C0\u00C2\u00C6-\u00CB\u00CE-\u00CF\u00D4\u00D9\u00DB\u00DC\u00E0\u00E2\u00E6-\u00EB\u00EE\u00EF\u00F4\u00f9\u00FB-\u00FC\u00FF\u0152\u0153\u0178\u02B3\u02E2\u1D48-\u1D49
   * Japanese \u3040-\u309F\u30A0-\u30FF
   *
   * Replace anything that's:
   *  NOT (arabic, or not chinese, or not a word char, or a space char, or an apostrophe, or a hyphen)
   *  OR
   *    that's a hyphen followed by something other than a-zA-Z0-9
   *    OR a (space then hyphen) at the end of the string
   * with an empty string, ie remove matching characters.
   * So the only hyphen we remove is that which is not followed by an alphanumeric.
   */
  if (text === "") return [];
  return text
    .replace(
      /[^\u0600-\u06ff\u4e00-\u9fff\u00C0\u00C2\u00C6-\u00CB\u00CE-\u00CF\u00D4\u00D9\u00DB\u00DC\u00E0\u0226\u00E2\u00E6-\u00EB\u00EE\u00EF\u00F4\u00f9\u00FB-\u00FC\u00FF\u0152\u0153\u0178\u02B3\u02E2\u1D48-\u1D49\u3040-\u309F\u30A0-\u30FF\w\s'-]|-(?=[^a-zA-Z0-9])|(\s-)/g,
      "",
    )
    .split(/\s/)
    .filter((w) => w.length > 0);
};

/* -------------------------------------------------------------------------- */

export const getCorrectAnswer = (
  usablePages: string[],
  freqToWords: FrequencyToWords,
  questions: ReadingQuestionAnswers[],
  targetKind?: string,
  rsvpReadingRequireUniqueWordsBool?: boolean,
): [string, number] => {
  // Get usable words
  const usableWords = new Set();
  const pageWords: string[] = [];
  for (const page of usablePages) {
    const pageList = preprocessCorpusToWordList(preprocessRawCorpus(page));
    for (const word of pageList) {
      if (
        word.length
        // (onlyAlphabets(word) || targetKind === "rsvpReading")
      ) {
        usableWords.add(word);
        if (targetKind === "rsvpReading") pageWords.push(word);
      }
    }
  }

  const frequencies = Object.keys(freqToWords).sort(
    (a: string, b: string) => Number(a) - Number(b),
  );
  for (const freq of frequencies) {
    const words = freqToWords[Number(freq)];
    for (const word of shuffle(words)) {
      const timesWordAppearsInSource = pageWords.filter(
        (w) => canonical(w) === canonical(word),
      ).length;
      const timesWordAppearsInQuestions = questions.filter(
        (q) => canonical(q.correctAnswer) === canonical(word),
      ).length;
      const wordStillNeededForRsvp =
        targetKind === "rsvpReading" &&
        ((timesWordAppearsInQuestions < timesWordAppearsInSource &&
          !rsvpReadingRequireUniqueWordsBool) ||
          (timesWordAppearsInQuestions === 0 &&
            rsvpReadingRequireUniqueWordsBool));
      const isLongEnough = word.length > 1 || targetKind === "rsvpReading";
      // const isNonDuplicate = !questions.find((q) => canonical(q.correctAnswer) === canonical(word));
      const isNonDuplicate =
        !questions.find(
          (q) => canonical(q.correctAnswer) === canonical(word),
        ) || wordStillNeededForRsvp;
      if (isLongEnough && usableWords.has(word) && isNonDuplicate) {
        return [word, Number(freq)];
      }
    }
  }

  warning("Failed to get correct answer, reading.ts/getCorrectAnswer()");
  return ["a", 0];
};

export const wordFreqCloseEnoughToTarget = (
  wordFreq: number,
  targetFreq: number,
  roundFetchingFoils: number,
) => {
  return (
    wordFreq > targetFreq * (1 - 0.1 * roundFetchingFoils) &&
    wordFreq < targetFreq * (1 + 0.1 * roundFetchingFoils)
  );
};

/* -------------------------------------------------------------------------- */

// https://stackoverflow.com/a/2450976
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const shuffle = (array: any[]) => {
  if (!array.length) return [];
  const a = [...array];
  let currentIndex = a.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    // TODO seed random
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [a[currentIndex], a[randomIndex]] = [a[randomIndex], a[currentIndex]];
  }

  return a;
};

const onlyAlphabets = (str: string) =>
  /^[a-zA-Z\u0600-\u06ff\u4e00-\u9fff]+$/.test(str);

/**
 * Directive from Denis:
 * To be safe, I think we should rely on the first tokenizer for counting words.
 * When we apply the second tokenizer, it’d be better to apply it to one word at a time.
 * If the second tokenizer fails to return exactly one word,
 *  then we reject the second tokenizer and use the word as it was
 *  before the second tokenizer was applied.
 *
 * This scheme will always conserve word number.
 * This will also handle the case of one word becoming two,
 *  eg. “don’t” becoming don and t. We’ll keep “don’t”.
 */
export const tokenizeWordsIndividually = (sentence: string): string[] => {
  const wordsKinda = sentence.split(/\s/).filter((w) => w.length > 0);
  return wordsKinda.map((wordMaybe) => {
    const tokenizedWord = preprocessCorpusToWordList(wordMaybe);
    return tokenizedWord.length === 1 ? tokenizedWord[0] : wordMaybe;
  });
};
