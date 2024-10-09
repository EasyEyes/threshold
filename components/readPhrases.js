import { phrases } from "./i18n";

export const useWordDigitBool = { current: false };

export const readi18nPhrases = (phraseName, language = undefined) => {
  if (phraseName.toLowerCase().includes("letter") && useWordDigitBool.current) {
    phraseName = phraseName.replace("letter", "digit");
    phraseName = phraseName.replace("Letter", "Digit");
  }

  if (typeof language === "undefined") {
    if (Object.hasOwn(phrases, phraseName)) return phrases[phraseName];
    throw `Phrase "${phraseName}" not defined.`;
  }
  if (
    Object.hasOwn(phrases, phraseName) &&
    Object.hasOwn(phrases[phraseName], language)
  )
    return phrases[phraseName][language];
  const errorMessage = `Phrase "${phraseName}" not defined. Language "${language}".`;
  throw errorMessage;
};
