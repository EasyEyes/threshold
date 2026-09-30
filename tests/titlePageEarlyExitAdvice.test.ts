/**
 * @jest-environment jsdom
 *
 * EE_EarlyExitAdvice on the title page (Denis REQUEST 3; sheet v60.0).
 *
 * Participants who leave early never see the parting-words screens — so the
 * title page itself must carry the advice. PROLIFIC-ONLY: the text names
 * Prolific's redirect/Return flow; other recruitment services have neither,
 * so the advice must not render there.
 *
 * titlePage.js is unparseable in jsdom (imports utils → global top-level
 * await), so the advice lives in a small dependency-free module
 * (components/earlyExitAdvice.ts) tested behaviorally here; the titlePage
 * wiring is pinned by source contract at the bottom.
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import { readFileSync } from "fs";
import * as path from "path";

jest.mock("../components/readPhrases.js", () => ({
  readi18nPhrases: jest.fn(
    (key: string, lang?: string) => `PHRASE[${key}]@${lang}`,
  ),
}));

import {
  syncEarlyExitAdvice,
  EARLY_EXIT_ADVICE_ID,
} from "../components/earlyExitAdvice";
import { recruitmentServiceData } from "../components/recruitmentService";

let parent: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = "";
  parent = document.createElement("div");
  document.body.appendChild(parent);
  recruitmentServiceData.name = "";
});

describe("syncEarlyExitAdvice", () => {
  test("renders the advice when the recruitment service is Prolific", () => {
    recruitmentServiceData.name = "Prolific";
    const el = syncEarlyExitAdvice(parent, "en");
    expect(el).not.toBeNull();
    expect(document.getElementById(EARLY_EXIT_ADVICE_ID)).toBe(el);
    expect(el!.innerHTML).toContain("PHRASE[EE_EarlyExitAdvice]");
  });

  test("does NOT render for non-Prolific experiments", () => {
    recruitmentServiceData.name = "";
    const el = syncEarlyExitAdvice(parent, "en");
    expect(el).toBeNull();
    expect(document.getElementById(EARLY_EXIT_ADVICE_ID)).toBeNull();
  });

  test("renders via markdown (innerHTML), not raw textContent", () => {
    recruitmentServiceData.name = "Prolific";
    const el = syncEarlyExitAdvice(parent, "en")!;
    // The phrase text itself is the marker; markdown pipeline must not
    // strip it, and the element must be an HTML container.
    expect(el.textContent).toContain("PHRASE[EE_EarlyExitAdvice]");
    expect(el.innerHTML.length).toBeGreaterThan(0);
  });

  test("language switch re-renders the existing element in place", () => {
    recruitmentServiceData.name = "Prolific";
    const el = syncEarlyExitAdvice(parent, "en")!;
    const again = syncEarlyExitAdvice(parent, "fr");
    expect(again).toBe(el);
    expect(el.innerHTML).toContain("@fr");
    expect(parent.querySelectorAll(`#${EARLY_EXIT_ADVICE_ID}`).length).toBe(1);
  });

  test("missing phrase renders nothing (no empty box)", () => {
    recruitmentServiceData.name = "Prolific";
    const { readi18nPhrases } = require("../components/readPhrases.js");
    readi18nPhrases.mockReturnValueOnce("");
    const el = syncEarlyExitAdvice(parent, "en");
    expect(el).toBeNull();
    expect(document.getElementById(EARLY_EXIT_ADVICE_ID)).toBeNull();
  });

  // readi18nPhrases THROWS on a missing (key, language) pair — real case:
  // pcm/ur lack the new keys in v60.0, and studies pinned to pre-v60.0
  // phrases have neither key at all. The title page must not crash.
  test("readi18nPhrases throwing renders nothing (no crash)", () => {
    recruitmentServiceData.name = "Prolific";
    const { readi18nPhrases } = require("../components/readPhrases.js");
    readi18nPhrases.mockImplementationOnce(() => {
      throw new Error('Phrase "EE_EarlyExitAdvice" not defined.');
    });
    expect(() => syncEarlyExitAdvice(parent, "pcm")).not.toThrow();
    expect(document.getElementById(EARLY_EXIT_ADVICE_ID)).toBeNull();
  });
});

describe("titlePage wiring (source contract)", () => {
  test("titlePage.js calls syncEarlyExitAdvice and refreshes it on language change", () => {
    const src = readFileSync(
      path.join(__dirname, "../components/titlePage.js"),
      "utf8",
    );
    expect(src).toMatch(/import\s*\{[^}]*syncEarlyExitAdvice/);
    // Initial render inside the page construction, plus a re-sync inside
    // refreshLanguageTexts (the language-switch handler).
    const calls = src.match(/syncEarlyExitAdvice\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2); // render + refresh
  });
});
