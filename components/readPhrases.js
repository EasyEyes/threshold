import { getPhrases } from "../parameters/phrasesRegistry";
import { resolveLanguageCode } from "./languageCompatibility";
import { captureMessage } from "./sentry";

export const useWordDigitBool = { current: false };

const reportedLanguageIssues = new Set();

const reportLanguageIssueOnce = (message, extra) => {
  const issueKey = `${message}:${extra.phraseName ?? ""}:${
    extra.requestedLanguage ?? ""
  }:${extra.resolvedLanguage ?? ""}`;
  if (reportedLanguageIssues.has(issueKey)) return;
  reportedLanguageIssues.add(issueKey);
  captureMessage(message, "warning", extra);
};

export const resolvePhraseLanguageCode = (
  language,
  phraseName = "EE_languageNameEnglish",
) => {
  const phrases = getPhrases();
  if (!Object.hasOwn(phrases, phraseName)) return language;
  const resolution = resolveLanguageCode(
    language,
    Object.keys(phrases[phraseName]),
  );
  if (resolution.reason === "alias") {
    reportLanguageIssueOnce("Language code compatibility alias used", {
      phraseName,
      requestedLanguage: resolution.requested,
      resolvedLanguage: resolution.resolved,
    });
  } else if (resolution.reason === "fallback") {
    reportLanguageIssueOnce("Language phrase fallback used", {
      phraseName,
      requestedLanguage: resolution.requested,
      resolvedLanguage: resolution.resolved,
    });
  }
  return resolution.resolved;
};

export const readi18nPhrases = (phraseName, language = undefined) => {
  const phrases = getPhrases();

  if (phraseName.toLowerCase().includes("letter") && useWordDigitBool.current) {
    phraseName = phraseName.replace("letter", "digit");
    phraseName = phraseName.replace("Letter", "Digit");
  }

  if (typeof language === "undefined") {
    if (Object.hasOwn(phrases, phraseName)) return phrases[phraseName];
    throw new Error(`Phrase "${phraseName}" not defined.`);
  }
  if (Object.hasOwn(phrases, phraseName)) {
    const phrase = phrases[phraseName];
    const resolution = resolveLanguageCode(language, Object.keys(phrase));
    if (Object.hasOwn(phrase, resolution.resolved)) {
      if (resolution.reason === "alias") {
        reportLanguageIssueOnce("Language code compatibility alias used", {
          phraseName,
          requestedLanguage: resolution.requested,
          resolvedLanguage: resolution.resolved,
        });
      } else if (resolution.reason === "fallback") {
        reportLanguageIssueOnce("Language phrase fallback used", {
          phraseName,
          requestedLanguage: resolution.requested,
          resolvedLanguage: resolution.resolved,
        });
      }
      return phrase[resolution.resolved];
    }
  }
  const errorMessage = `Phrase "${phraseName}" not defined. Language "${language}".`;
  reportLanguageIssueOnce("Language phrase lookup failed", {
    phraseName,
    requestedLanguage: language,
  });
  throw new Error(errorMessage);
};
