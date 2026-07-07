/**
 * Clean up loose punctuation in a reading corpus, as specified by the
 * readingCorpusCleanupPunctuation parameter (default empty).
 *
 * Processes each character of punctuationCharacters in order. For each
 * character (e.g. "," or "،"), performs a global search and replace that
 * removes any space immediately preceding it: every occurrence of " ," becomes
 * ",", every occurrence of " ،" becomes "،". Each occurrence of a character in
 * punctuationCharacters is one pass, so repeating a character (e.g. ",,")
 * removes up to that many spaces before each occurrence.
 *
 * This fixes corpora containing loose punctuation (punctuation incorrectly
 * preceded by a space), which is not permitted in normal typography for
 * English, Arabic, Urdu, Persian, and many other languages. Loose punctuation
 * becomes a separate token, so line-breaking may place it at the beginning of
 * a line, producing confusing text.
 *
 * Both ASCII and Unicode punctuation are supported: iteration is by Unicode
 * code point, so multi-byte characters (including non-BMP characters encoded
 * as surrogate pairs) are each treated as a single character.
 *
 * @param corpus - the corpus text, e.g. the contents of readingCorpus
 * @param punctuationCharacters - value of readingCorpusCleanupPunctuation
 * @returns the corpus with unwanted spaces before the given punctuation removed
 */
export const cleanupCorpusPunctuation = (
  corpus: string,
  punctuationCharacters: string,
): string => {
  let cleaned = corpus;
  // String iteration (via the spread/for-of protocol used by Array.from)
  // yields whole code points, not UTF-16 code units, so non-BMP punctuation
  // is handled correctly.
  for (const character of Array.from(String(punctuationCharacters ?? ""))) {
    // Global literal replacement of " X" with "X"; split/join avoids
    // regex-escaping issues for characters like "." and "?".
    cleaned = cleaned.split(" " + character).join(character);
  }
  return cleaned;
};
