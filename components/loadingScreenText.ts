type Phrases = Record<string, Record<string, string>>;

export interface LoadingScreenText {
  loadingText: string;
  timeoutMessage: string;
  reloadButton: string;
}

/**
 * Resolve the loading-screen strings for the experiment's language (as set in
 * index.html). Accepts either a language code (e.g. "fr") or, for backward
 * compatibility, the full English name. Returns null when nothing matches.
 */
export const localizeLoadingScreen = (
  phrases: Phrases,
  experimentLanguageName: string,
): LoadingScreenText | null => {
  let lang: string | undefined;
  // _language now takes a language code; use it directly when it is one.
  if (
    experimentLanguageName &&
    Object.prototype.hasOwnProperty.call(
      phrases.EE_languageNameEnglish,
      experimentLanguageName,
    )
  ) {
    lang = experimentLanguageName;
  } else {
    lang = Object.keys(phrases.EE_languageNameEnglish).find(
      (key) => phrases.EE_languageNameEnglish[key] === experimentLanguageName,
    );
  }
  if (!lang) return null;
  return {
    loadingText: phrases.RC_LoadingStudy[lang],
    timeoutMessage: phrases.RC_LoadingStudyTakingLonger[lang],
    reloadButton: phrases.RC_ReloadStudyButton[lang],
  };
};
