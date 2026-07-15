import { localizeLoadingScreen } from "../components/loadingScreenText";

const phrases = {
  EE_languageNameEnglish: { en: "English", fr: "French" },
  RC_LoadingStudy: { en: "Loading the study…", fr: "Chargement…" },
  RC_LoadingStudyTakingLonger: { en: "Taking longer…", fr: "Plus long…" },
  RC_ReloadStudyButton: { en: "Reload", fr: "Recharger" },
};

describe("localizeLoadingScreen", () => {
  it("maps a language code to localized loading-screen strings", () => {
    expect(localizeLoadingScreen(phrases, "fr")).toEqual({
      loadingText: "Chargement…",
      timeoutMessage: "Plus long…",
      reloadButton: "Recharger",
    });
  });

  it("still maps the full English name (backward compatibility)", () => {
    expect(localizeLoadingScreen(phrases, "French")).toEqual({
      loadingText: "Chargement…",
      timeoutMessage: "Plus long…",
      reloadButton: "Recharger",
    });
  });

  it("returns null when the language is unknown", () => {
    expect(localizeLoadingScreen(phrases, "Klingon")).toBeNull();
  });
});
