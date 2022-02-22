interface ReadingQuestionAnswers {
  correctAnswer: string;
  foils: string[];
}
export const prepareReadingQuestions = (
  numberOfQ: number,
  numberOfA: number,
  textPages: string[],
  wordFrequencies: WordFrequencies
) => {
  const usablePages = [...textPages];
  usablePages.pop();
  usablePages.shift();

  const questions: ReadingQuestionAnswers[] = [];
  for (let i = 0; i < numberOfQ; i++) {
    const newQuestion: ReadingQuestionAnswers = {
      correctAnswer: shuffle(shuffle(usablePages)[0].split(" "))[0],
      foils: [],
    };

    const corpusFreqOfAnswer = wordFrequencies[newQuestion.correctAnswer];

    const foilCount = numberOfA - 1;
    let possibleFoils = [];

    // ! Should foils not appear in the textPages?
    let roundFetchingFoils = 0;
    while (possibleFoils.length < foilCount) {
      for (const word in wordFrequencies) {
        if (
          wordFreqCloseEnoughToTarget(
            wordFrequencies[word],
            corpusFreqOfAnswer,
            roundFetchingFoils
          )
        ) {
          possibleFoils.push(word);
        }
      }
      roundFetchingFoils++;
    }

    while (newQuestion.foils.length < foilCount) {
      possibleFoils = shuffle(possibleFoils);
      newQuestion.foils.push(possibleFoils.pop());
    }

    questions.push(newQuestion);
  }
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

/* ------------------------------- Preprocess ------------------------------- */

export const preprocessRawCorpus = (corpus: string) => {
  corpus = corpus.replace(/“”/g, `"`).replace(/‘’/, `'`);
  corpus = corpus.replace(/(\r\n|\n|\r)/g, " ").replace(/_/g, "");
  return corpus;
};

// Take a long string and return an array of words without punctuation
export const preprocessCorpusToWordList = (text: string) => {
  return text
    .replace(/[^'\w\s]/g, "")
    .split(" ")
    .filter((w) => w.length > 0);
};

export const preprocessCorpusToSentenceList = (
  usedText: string,
  originalText: string,
  pageBuffer: number,
  numberOfPages: number
) => {
  if (usedText.length < pageBuffer * (numberOfPages + 1))
    usedText += " " + originalText;
  const usedTextList = usedText.split(" ").filter((w) => w.length > 0);

  const sentences: string[] = [];

  for (let i = 0; i < numberOfPages; i++) {
    let thisPageCharCount = pageBuffer;
    const sentenceList: string[] = [];

    while (thisPageCharCount > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const newWord = usedTextList.shift()!;
      sentenceList.push(newWord);
      thisPageCharCount -= newWord.length;
    }

    sentences.push(sentenceList.join(" "));
  }

  usedText = usedTextList.join(" ");
  return { usedText, sentences };
};

/* -------------------------------------------------------------------------- */

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
