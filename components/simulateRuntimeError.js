/**
 * Opt-in run-time error for checking the fatal-error dialog.
 * Does nothing unless the URL asks for it — not wired into the normal
 * experiment path. To use later, call simulateRuntimeErrorIfRequested()
 * from a routine (e.g. initInstructionRoutineBegin) and open the study with:
 *
 *   ?simulateRuntimeError=phrase   missing International Phrase
 *   ?simulateRuntimeError=async    rejected promise
 *   ?simulateRuntimeError=sync     plain throw
 *
 * Optional: &simulateRuntimeErrorLanguage=fa to switch language/direction
 * before failing (for checking RTL layout).
 */
import { readi18nPhrases } from "./readPhrases.js";
import { rc } from "./global.js";
import { setBodyDirForLanguage } from "./compatibilityUI.js";

let alreadyFired = false;

export const simulateRuntimeErrorIfRequested = () => {
  const parameters = new URLSearchParams(window.location.search);
  const kind = parameters.get("simulateRuntimeError");
  if (!kind || alreadyFired) return;
  alreadyFired = true;

  const language = parameters.get("simulateRuntimeErrorLanguage");
  if (language) {
    rc.newLanguage(language);
    setBodyDirForLanguage(language);
  }

  const description = `Simulated run-time error, requested by simulateRuntimeError=${kind}.`;

  if (kind === "sync") {
    // Thrown from a timer so it reaches window.onerror rather than the
    // scheduler's promise chain.
    setTimeout(() => {
      throw new Error(description);
    }, 0);
    return;
  }

  if (kind === "async") {
    Promise.reject(new Error(description));
    return;
  }

  // Default / "phrase": reproduce a missing phrase in the participant's language.
  readi18nPhrases(
    "T_thisPhraseDoesNotExist",
    language || rc.language?.value || "en",
  );
};
