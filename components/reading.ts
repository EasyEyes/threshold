interface ReadingQuestionAnswers {
  correctAnswer: string;
  foils: string[];
}
export const prepareReadingQuestions = (
  numberOfQ: number,
  numberOfA: number,
  textPages: string[],
  freqToWords: FrequencyToWords
) => {
  const usablePages = [...textPages];
  if (usablePages.length > 2) usablePages.shift();
  if (usablePages.length > 1) usablePages.pop();

  // Get displayed words
  const displayedWords = new Set();
  for (const page of textPages) {
    const pageList = preprocessCorpusToWordList(preprocessRawCorpus(page));
    for (const word of pageList) {
      if (word.length && onlyAlphabets(word))
        displayedWords.add(word.toLowerCase());
    }
  }

  const questions: ReadingQuestionAnswers[] = [];
  for (let i = 0; i < numberOfQ; i++) {
    const [correctAnswer, correctAnswerFreq] = getCorrectAnswer(
      usablePages,
      freqToWords,
      questions
    );
    if (correctAnswerFreq === 0)
      throw "Failed to construct a new question. [no correct answer]";

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
        if (displayedWords.has(word) || word === correctAnswer) continue;
        possibleFoils.add(word);
        if (possibleFoils.size === foilCount) break; // !
      }

      freqToTest += freqAdjustCounter;
      while (freqToWords[freqToTest] === undefined) {
        freqToTest += freqAdjustCounter;
        if (freqToTest > maxFrequency) freqAdjustCounter = -freqAdjustCounter;
        if (freqToTest < 1)
          throw "Failed to construct a new question. [no enough foils]";
      }
    }

    const possibleFoilsList = shuffle([...possibleFoils]);
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
    if (onlyAlphabets(word)) {
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
  return text
    .replace(/[^\w\s'-]|-(?=[^a-zA-Z0-9])/g, "")
    .split(" ")
    .filter((w) => w.length > 0);
};

/* -------------------------------------------------------------------------- */

export const getCorrectAnswer = (
  usablePages: string[],
  freqToWords: FrequencyToWords,
  questions: ReadingQuestionAnswers[]
): [string, number] => {
  // Get usable words
  const usableWords = new Set();
  for (const page of usablePages) {
    const pageList = preprocessCorpusToWordList(preprocessRawCorpus(page));
    for (const word of pageList) {
      if (word.length && onlyAlphabets(word))
        usableWords.add(word.toLowerCase());
    }
  }

  const frequencies = Object.keys(freqToWords).sort(
    (a: string, b: string) => Number(a) - Number(b)
  );
  for (const freq of frequencies) {
    const words = freqToWords[Number(freq)];
    for (const word of shuffle(words)) {
      if (
        word.length &&
        usableWords.has(word) &&
        !questions.find((q) => q.correctAnswer === word)
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

const onlyAlphabets = (str: string) => /^[a-zA-Z-]+$/.test(str);
