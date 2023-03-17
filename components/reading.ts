import { warning } from "./errorHandling";
import { logger, sampleWithReplacement } from "./utils";

interface ReadingQuestionAnswers {
  correctAnswer: string;
  foils: string[];
}
export const prepareReadingQuestions = (
  numberOfQ: number,
  numberOfA: number,
  textPages: string[],
  freqToWords: FrequencyToWords,
  targetKind?: string
) => {
  let usablePages = [...textPages];
  if (targetKind !== "rsvpReading") {
    if (usablePages.length > 2) usablePages.shift();
    if (usablePages.length > 1) usablePages.pop();
  }
  // Get displayed words
  const displayedWords = new Set();
  for (const page of textPages) {
    const pageList = preprocessCorpusToWordList(preprocessRawCorpus(page));
    for (const word of pageList) {
      if (
        word.length
        // (onlyAlphabets(word) || targetKind === "rsvpReading")
      ) {
        displayedWords.add(word.toLowerCase());
        // displayedWords.add(word);
      }
    }
  }

  const questions: ReadingQuestionAnswers[] = [];
  let remaining = [...usablePages];
  for (let i = 0; i < numberOfQ; i++) {
    let [correctAnswer, correctAnswerFreq] = getCorrectAnswer(
      usablePages,
      freqToWords,
      questions,
      targetKind
    );
    if (correctAnswerFreq !== 0 && targetKind === "rsvpReading")
      remaining = remaining.filter((p) => p.toLowerCase() !== correctAnswer);
    if (correctAnswerFreq === 0) {
      if (targetKind === "rsvpReading") {
        warning("Failed to construct a new question. [no correct answer].");
        correctAnswer = remaining.shift() as string;
        correctAnswerFreq = Math.min(...Object.keys(freqToWords).map(Number));
      } else {
        throw "Failed to construct a new question. [no correct answer].";
      }
    }

    const newQuestion: ReadingQuestionAnswers = {
      correctAnswer: correctAnswer,
      foils: [],
    };

    const maxFrequency = Math.max(...Object.keys(freqToWords).map(Number));

    let freqToTest = correctAnswerFreq;
    let freqAdjustCounter = 1;

    const possibleFoils = new Set();
    const foilCount = numberOfA - 1;
    while (possibleFoils.size < foilCount) {
      for (const word of shuffle(freqToWords[freqToTest])) {
        if (
          displayedWords.has(word.toLowerCase()) ||
          word === correctAnswer ||
          (word.length < 2 && targetKind !== "rsvpReading") // Allow for short words in rsvpReading
        )
          continue;
        possibleFoils.add(word);
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
    }
    let possibleFoilsList;
    if (possibleFoils.size < foilCount) {
      const fauxFoilsNeeded = foilCount - possibleFoils.size;
      const fauxFoils = sampleWithReplacement(
        [...possibleFoils],
        fauxFoilsNeeded
      );
      possibleFoilsList = shuffle([...possibleFoils, ...fauxFoils]);
    } else {
      possibleFoilsList = shuffle([...possibleFoils]);
    }
    newQuestion.foils.push(...possibleFoilsList);
    questions.push(newQuestion);
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
    word = word.toLowerCase();
    if (!(word in frequencies)) frequencies[word] = 1;
    else frequencies[word] += 1;
  }
  return frequencies;
};

interface FrequencyToWords {
  [key: number]: string[];
}
export const processWordFreqToFreqToWords = (
  wordFrequencies: WordFrequencies
): FrequencyToWords => {
  const freqToWords: FrequencyToWords = {};

  for (const word in wordFrequencies) {
    // TODO acceptable??
    if (true) {
      // if (onlyAlphabets(word)) {
      const freq = wordFrequencies[word];
      if (!(freq in freqToWords)) freqToWords[freq] = [];
      freqToWords[freq].push(word);
    }
  }

  return freqToWords;
};

/* ------------------------------- Preprocess ------------------------------- */

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
      /[^\u0600-\u06ff\u4e00-\u9fff\u00C0\u00C2\u00C6-\u00CB\u00CE-\u00CF\u00D4\u00D9\u00DB\u00DC\u00E0\u0226\u00E2\u00E6-\u00EB\u00EE\u00EF\u00F4\u00f9\u00FB-\u00FC\u00FF\u0152\u0153\u0178\u02B3\u02E2\u1D48-\u1D49\w\s'-]|-(?=[^a-zA-Z0-9])|(\s-)/g,
      ""
    )
    .split(" ")
    .filter((w) => w.length > 0);
};

/* -------------------------------------------------------------------------- */

export const getCorrectAnswer = (
  usablePages: string[],
  freqToWords: FrequencyToWords,
  questions: ReadingQuestionAnswers[],
  targetKind?: string
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
        usableWords.add(word.toLowerCase());
        if (targetKind === "rsvpReading") pageWords.push(word);
      }
    }
  }

  const frequencies = Object.keys(freqToWords).sort(
    (a: string, b: string) => Number(a) - Number(b)
  );
  for (const freq of frequencies) {
    const words = freqToWords[Number(freq)];
    for (const word of shuffle(words)) {
      const timesWordAppearsInSource = pageWords.filter(
        (w) => w.toLowerCase() === word.toLowerCase()
      ).length;
      const timesWordAppearsInQuestions = questions.filter(
        (q) => q.correctAnswer.toLowerCase() === word.toLowerCase()
      ).length;
      const wordStillNeededForRsvp =
        targetKind === "rsvpReading" &&
        timesWordAppearsInQuestions < timesWordAppearsInSource;
      if (
        (word.length > 1 || targetKind === "rsvpReading") &&
        usableWords.has(word) &&
        (!questions.find((q) => q.correctAnswer === word) ||
          wordStillNeededForRsvp)
      ) {
        return [word, Number(freq)];
      }
    }
  }

  return ["a", 0];
};

export const wordFreqCloseEnoughToTarget = (
  wordFreq: number,
  targetFreq: number,
  roundFetchingFoils: number
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
  const wordsKinda = sentence.split(" ").filter((w) => w.length > 0);
  return wordsKinda.map((wordMaybe) => {
    const tokenizedWord = preprocessCorpusToWordList(wordMaybe);
    return tokenizedWord.length ? tokenizedWord[0] : wordMaybe;
  });
};
