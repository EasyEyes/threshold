// A token consisting ONLY of closing punctuation: ASCII . , ; : ! ? plus the
// Arabic-script comma ، (U+060C), semicolon ؛ (U+061B), question mark ؟
// (U+061F), the Urdu full stop ۔ (U+06D4), and the ellipsis … (U+2026).
const PUNCTUATION_ONLY = /^[.,;:!?\u060C\u061B\u061F\u2026\u06D4]+$/;

/**
 * Merge punctuation-only tokens onto the preceding word.
 * ["word", "،"] → ["word،"]. A punctuation-only token with no preceding word
 * (i.e. at the start) is kept as its own token.
 *
 * @param tokens - corpus words, as produced by splitting on spaces
 * @returns tokens with detached punctuation glued to the word before it
 */
export const mergeDetachedPunctuation = (tokens: string[]): string[] => {
  const merged: string[] = [];
  for (const token of tokens) {
    if (merged.length > 0 && PUNCTUATION_ONLY.test(token)) {
      merged[merged.length - 1] += token;
    } else {
      merged.push(token);
    }
  }
  return merged;
};
