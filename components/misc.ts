/// Like utils.js, but .ts

export const styleNodeAndChildrenRecursively = (
  elem: HTMLElement,
  attrs: { [key: string]: string },
  exclude = ["label", "span"],
) => {
  setStyleAttribute(elem, attrs);
  const excludeString = exclude
    .map((tagName: string) => `:not(${tagName})`)
    .join("");
  const excludeElems = elem.querySelectorAll(`*${excludeString}`);
  for (let e of excludeElems) {
    setStyleAttribute(e as HTMLElement, attrs);
  }
};
// https://stackoverflow.com/questions/37655393/how-to-set-multiple-css-style-properties-in-typescript-for-an-element
export const setStyleAttribute = (
  element: HTMLElement,
  attrs: { [key: string]: string },
) => {
  for (const [key, value] of Object.entries(attrs)) {
    element.style.setProperty(key, value, "important");
  }
};

/**
 * Find the longest sequence of words from the end of usedText that exists in blockCorpus.
 * Tries progressively shorter sequences until a match is found.
 * @param {string} text - The text to find a tail string from, eg usedText
 * @param {string} corpus - The corpus to search within
 * @param {number} maxWords - The maximum number of words to search for in the tail
 * @returns {string} The longest matching sequence, or empty string if no match
 */
export const findLongestMatchingTail = (
  text: string,
  corpus: string,
  maxWords: number = 5,
): string => {
  const words = text.trim().split(/\s+/);
  for (
    let wordCount = Math.min(maxWords, words.length);
    wordCount > 0;
    wordCount--
  ) {
    const tail = words.slice(-wordCount).join(" ");
    if (corpus.includes(tail)) {
      return tail;
    }
  }
  return "";
};
