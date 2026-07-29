/**
 * Pure reading-corpus tokenizers, shared by the runtime (components/reading.ts)
 * and the compiler (preprocess/experimentFileChecks.ts, checkReadingFoils).
 * No imports — safe for both browser and Node compile-time use. The compiler
 * must tokenize EXACTLY as the runtime does, or its foil-supply check lies.
 */

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
