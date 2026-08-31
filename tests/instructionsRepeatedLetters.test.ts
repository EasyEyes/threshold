/**
 * RED regression test: a `repeatedLetters` block with
 * `thresholdParameter = spacingDeg` (or targetSizeDeg) crashed at
 * block-instruction time because instructions.js looked up the base phrase
 * name `T_thresholdRepeatedLettersBeginBlock`, which has never existed in the
 * phrase table — only the numbered variant `...BeginBlock1` is defined.
 *
 * The test initializes the phrase registry from the cached deployed table
 * (tests/__cache__/phrases.json) and exercises the real instruction builders,
 * both for letters and for digits (useWordDigitBool), which resolves names by
 * swapping "Letter" -> "Digit".
 */

import { jest, expect, describe, test, beforeAll } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("../components/fonts.js", () => ({
  cleanFontName: (f: string) => f,
}));
jest.mock("../components/response.js", () => ({ _onlyClick: false }));
jest.mock("../components/utils.js", () => ({
  hideCursor: () => {},
  logger: () => {},
  cursorNearFixation: () => false,
}));
jest.mock("../components/globalPsychoJS", () => ({ psychoJS: {} }));
jest.mock("../components/global.js", () => ({
  clickedContinue: { current: false },
  fixationConfig: {},
  instructionFont: "Arial",
  modalButtonTriggeredViaKeyboard: { current: false },
  targetKind: { current: "repeatedLetters" },
  status: {},
  displayOptions: {},
  fontCharacterSet: { current: "" },
}));
jest.mock("../components/photometry.js", () => ({ initColorCAL: () => {} }));
jest.mock("../components/fixation.ts", () => ({
  computeFixationPosNow: () => ({ x: 0, y: 0 }),
}));
jest.mock("../components/multiple-displays/globals.ts", () => ({
  Screens: { INSTRUCTIONS: 0 },
}));

import { instructionsText } from "../components/instructions.js";
import { targetKind } from "../components/global.js";
import { initPhrases } from "../parameters/phrasesRegistry";
import {
  readi18nPhrases,
  useWordDigitBool,
} from "../components/readPhrases.js";

const phrases = JSON.parse(
  readFileSync(join(__dirname, "__cache__", "phrases.json"), "utf-8"),
);

describe("repeatedLetters block instructions (spacingDeg/targetSizeDeg)", () => {
  beforeAll(() => {
    initPhrases(phrases);
    targetKind.current = "repeatedLetters";
  });

  test.each([["spacingDeg"], ["targetSizeDeg"]] as const)(
    "%s: builds begin-block text for letters without throwing",
    (thresholdParameter) => {
      const text = instructionsText.initialByThresholdParameter[
        thresholdParameter
      ]("en", 2, 5) as string;
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
      expect(text).toContain("5");
    },
  );

  test("spacingDeg: builds begin-block text for digits (useWordDigitBool)", () => {
    useWordDigitBool.current = true;
    try {
      // Sanity: the digit variant phrase exists in the table.
      expect(
        readi18nPhrases("T_thresholdRepeatedLettersBeginBlock1", "en"),
      ).toBeDefined();
      const text = instructionsText.initialByThresholdParameter.spacingDeg(
        "en",
        2,
        5,
      ) as string;
      expect(text.length).toBeGreaterThan(0);
    } finally {
      useWordDigitBool.current = false;
    }
  });
});

describe("rsvpReading automatic-speech instructions", () => {
  beforeAll(() => {
    initPhrases(phrases);
    targetKind.current = "rsvpReading";
  });

  test("speech response fragment builds without throwing", () => {
    const text = instructionsText.rsvpReadingAutomaticSpeechResponse(
      "en",
    ) as string;
    expect(text.toLowerCase()).toContain("saying");
  });

  test("speech begin text builds without throwing", () => {
    const text = instructionsText.rsvpReadingAutomaticSpeechBegin(
      "en",
      1,
      5,
    ) as string;
    expect(text).toContain("5");
    expect(text.toLowerCase()).toContain("saying");
  });
});
