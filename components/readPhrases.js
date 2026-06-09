import { phrases } from "./i18n";
import { renderMarkdown } from "./markdownInline.js";

export const useWordDigitBool = { current: false };

export const readi18nPhrases = (phraseName, language = undefined) => {
  if (phraseName.toLowerCase().includes("letter") && useWordDigitBool.current) {
    phraseName = phraseName.replace("letter", "digit");
    phraseName = phraseName.replace("Letter", "Digit");
  }

  if (typeof language === "undefined") {
    if (Object.hasOwn(phrases, phraseName)) return phrases[phraseName];
    throw new Error(`Phrase "${phraseName}" not defined.`);
  }
  if (
    Object.hasOwn(phrases, phraseName) &&
    Object.hasOwn(phrases[phraseName], language)
  )
    return phrases[phraseName][language];
  const errorMessage = `Phrase "${phraseName}" not defined. Language "${language}".`;
  throw new Error(errorMessage);
};

/**
 * Read an i18n phrase and render it as Markdown+HTML-safe innerHTML content.
 * Use for ALL participant-facing text in the DOM. For non-display uses
 * (comparison keys, data assembly), use the original readi18nPhrases().
 */
export const readi18nPhrasesHTML = (key, language) =>
  renderMarkdown(readi18nPhrases(key, language));
