/**
 * Early-exit advice (EE_EarlyExitAdvice, sheet v60.0) on the title page.
 *
 * Participants who leave early never see the parting-words screens, so the
 * title page carries the advice up front (Denis REQUEST 3). PROLIFIC-ONLY:
 * the text names Prolific's redirect and Return flow — other recruitment
 * services have neither, so nothing renders there.
 *
 * Lives outside titlePage.js so it stays jsdom-testable (titlePage imports
 * utils → global top-level await).
 */

import { recruitmentServiceData } from "./recruitmentService";
import { readi18nPhrases } from "./readPhrases";
import { renderMarkdown } from "./markdownInline.js";

export const EARLY_EXIT_ADVICE_ID = "easyeyes-title-page-early-exit-advice";

/**
 * Create-or-update the advice element under `parent`. Returns the element,
 * or null when nothing should show (non-Prolific, or phrase missing).
 * Idempotent: a language switch re-renders the SAME element in place.
 */
export const syncEarlyExitAdvice = (
  parent: HTMLElement,
  language: string,
): HTMLElement | null => {
  const existing = document.getElementById(EARLY_EXIT_ADVICE_ID);
  if (recruitmentServiceData.name !== "Prolific") return null;
  // readi18nPhrases THROWS on a missing (key, language) pair — pcm/ur lack
  // this key in v60.0, and pre-v60.0 pinned studies lack it entirely.
  // Missing phrase → no advice (never a broken title page).
  let text = "";
  try {
    text = readi18nPhrases("EE_EarlyExitAdvice", language) || "";
  } catch {
    text = "";
  }
  if (!text) return null;
  const el = existing ?? document.createElement("div");
  if (!existing) {
    el.id = EARLY_EXIT_ADVICE_ID;
    el.style.fontSize = "0.95rem";
    el.style.color = "#555";
    el.style.maxWidth = "57ch";
    el.style.margin = "0 0 1rem 0";
    el.style.lineHeight = "1.5";
    parent.appendChild(el);
  }
  el.innerHTML = renderMarkdown(text);
  return el;
};
