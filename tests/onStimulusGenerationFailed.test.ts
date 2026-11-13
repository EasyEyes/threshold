/**
 * @jest-environment node
 *
 * Contract for the "stimulus generation failed" path: a failed stimulus must
 * never crash the run. It warns, skips the trial, and for letter stimuli
 * reports the parameters (unless debug) and clears the fixation re-run state.
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

const warning = jest.fn();
const skipTrial = jest.fn();
const logLetterParamsToFormspree = jest.fn();
const getFormspreeLoggingInfoLetter = jest.fn(() => ({ letter: "info" }));

jest.mock("../components/errorHandling.js", () => ({ warning }));
jest.mock("../components/skipTrialOrBlock", () => ({ skipTrial }));
jest.mock("../components/letter.js", () => ({ logLetterParamsToFormspree }));
jest.mock("../components/misc", () => ({ getFormspreeLoggingInfoLetter }));

import { onStimulusGenerationFailed } from "../components/onStimulusGenerationFailed";

const letterInput = (overrides: Record<string, unknown> = {}) => ({
  error: "no viable stimulus",
  level: 3,
  debug: false,
  screen: { fixationConfig: { fixationPosAfterDelay: "stale" } },
  block_condition: "1_1",
  reader: { read: () => 4 },
  characters: ["a"],
  viewingDistanceCm: 60,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("onStimulusGenerationFailed", () => {
  test("warns and skips the trial for every target kind", () => {
    for (const kind of ["letter", "reading", "image", "rsvpReading"]) {
      onStimulusGenerationFailed(kind, letterInput() as any);
    }
    expect(skipTrial).toHaveBeenCalledTimes(4);
    expect(warning.mock.calls[0][0]).toContain("skipping trial");
    // letter adds a second, more specific warning (level + error).
    expect(warning).toHaveBeenCalledTimes(5);
    expect(warning.mock.calls[1][0]).toContain("restrictLevelAfterFixation");
  });

  test("letter: reports the parameters to formspree when not debugging", () => {
    onStimulusGenerationFailed("letter", letterInput() as any);
    expect(getFormspreeLoggingInfoLetter).toHaveBeenCalledWith(
      "1_1",
      expect.anything(),
      ["a"],
      expect.anything(),
      60,
    );
    expect(logLetterParamsToFormspree).toHaveBeenCalledWith({ letter: "info" });
  });

  test("letter: stays silent when debug is on", () => {
    onStimulusGenerationFailed("letter", letterInput({ debug: true }) as any);
    expect(logLetterParamsToFormspree).not.toHaveBeenCalled();
  });

  test("letter: clears the pending fixation re-position", () => {
    const input = letterInput() as any;
    onStimulusGenerationFailed("letter", input);
    expect(input.screen.fixationConfig.fixationPosAfterDelay).toBeUndefined();
  });

  test("other kinds do not touch the letter-only reporting", () => {
    onStimulusGenerationFailed("reading", letterInput() as any);
    expect(logLetterParamsToFormspree).not.toHaveBeenCalled();
  });
});
