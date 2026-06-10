type Phrases = Record<string, Record<string, string>>;

export interface LoadingScreenText {
  loadingText: string;
  timeoutMessage: string;
  reloadButton: string;
}

/**
 * Resolve the loading-screen strings for the experiment's language, looked up by
 * its English language name (as set in index.html). Returns null when the name
 * matches no known language.
 */
export const localizeLoadingScreen = (
  phrases: Phrases,
  experimentLanguageName: string,
): LoadingScreenText | null => {
  const lang = Object.keys(phrases.EE_languageNameEnglish).find(
    (key) => phrases.EE_languageNameEnglish[key] === experimentLanguageName,
  );
  if (!lang) return null;
  return {
    loadingText: phrases.RC_LoadingStudy[lang],
    timeoutMessage: phrases.RC_LoadingStudyTakingLonger[lang],
    reloadButton: phrases.RC_ReloadStudyButton[lang],
  };
};
