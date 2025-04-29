/// Like utils.js, but .ts
import type { Screen_ } from "./multiple-displays/globals";
import type { ParamReader } from "../parameters/paramReader";

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

export const getBlockFromBlockCondition = (blockCondition: string): number => {
  return Number(blockCondition.split("_")[0]);
};
export const getFixationXYPxStr = (screen: Screen_): string => {
  return `(${screen.fixationConfig.pos[0]}, ${screen.fixationConfig.pos[1]})`;
};
interface LetterCharacters {
  target: string;
  flanker1?: string;
  flanker2?: string;
  flanker3?: string;
  flanker4?: string;
}
// TODO how to get the letters string for stimulus with >2 flankers?
const getStimulusStringLetters = (
  characters: LetterCharacters,
  reader: ParamReader,
  block_condition: string,
) => {
  return reader.read("thresholdParameter", block_condition) === "spacingDeg"
    ? `${characters.flanker1} ${characters.target} ${characters.flanker2}`
    : characters.target;
};

interface FormspreeLoggingInfoLetter {
  block: number;
  block_condition: string;
  conditionName: string;
  trial: number;
  font: string;
  fontMaxPx: number;
  fontRenderMaxPx: number;
  fontString: string;
  fixationXYPx: string;
  viewingDistanceCm: number;
  fontSizePx: number | "NaN";
  targetSizeDeg: number | "NaN";
  spacingDeg: number | "NaN";
}
export const getFormspreeLoggingInfoLetter = (
  block_condition: string,
  reader: ParamReader,
  characters: any,
  screen: Screen_,
  viewingDistanceCm: number,
  stimulusParameters?: any,
): FormspreeLoggingInfoLetter => {
  const formspreeLoggingInfo: FormspreeLoggingInfoLetter = {
    block: getBlockFromBlockCondition(block_condition),
    block_condition: block_condition,
    conditionName: reader.read("conditionName", block_condition),
    font: reader.read("font", block_condition),
    fontMaxPx: reader.read("fontMaxPx", block_condition),
    fontRenderMaxPx: reader.read("fontRenderMaxPx", block_condition),
    fontString: getStimulusStringLetters(characters, reader, block_condition),
    fixationXYPx: getFixationXYPxStr(screen),
    trial: reader.read("trial", block_condition),
    viewingDistanceCm: viewingDistanceCm,
    fontSizePx: stimulusParameters?.heightPx ?? "NaN",
    targetSizeDeg: stimulusParameters?.sizeDeg ?? "NaN",
    spacingDeg: stimulusParameters?.spacingDeg ?? "NaN",
  };
  return formspreeLoggingInfo;
};
