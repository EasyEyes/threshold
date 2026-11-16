/**
 * @jest-environment jsdom
 *
 * Unit coverage for components/instructions.js — instruction-text
 * composition per response type / target kind, beep & proceed buttons,
 * click-fixation handling, the tracking gate, and instruction font/margin
 * helpers. i18n, psychoJS, and heavy sibling modules are mocked; the
 * branching logic and DOM assembly run for real.
 */

jest.mock("../components/global.js", () => ({
  clickedContinue: { current: false, timestamps: [] },
  fixationConfig: { pos: [0, 0], nominalPos: [0, 0] },
  instructionFont: { current: "" },
  modalButtonTriggeredViaKeyboard: { current: false },
  targetKind: { current: "letter" },
  status: { block: 1, block_condition: "1_1" },
  fontCharacterSet: { current: undefined },
}));
jest.mock("../components/fonts.js", () => ({
  cleanFontName: (f: string) => `clean:${f}`,
}));
jest.mock("../components/response.js", () => ({
  // accurate reimplementation: only responseType 1 is click-only
  _onlyClick: (responseType: number) => responseType === 1,
}));
jest.mock("../components/utils.js", () => ({
  hideCursor: jest.fn(),
  logger: jest.fn(),
  cursorNearFixation: jest.fn(() => true),
}));
jest.mock("../components/errorHandling", () => ({ warning: jest.fn() }));
jest.mock("../components/globalPsychoJS.js", () => ({
  psychoJS: {
    _window: { _size: [800, 600] },
    window: { size: [800, 600] },
    experiment: { addData: jest.fn() },
  },
}));
jest.mock("../components/readPhrases.js", () => ({
  readi18nPhrases: jest.fn((key: string) => `t:${key}`),
}));
jest.mock("../components/photometry.js", () => ({
  colorCALReadyForBlock: jest.fn(async () => true),
}));
jest.mock("../components/multiple-displays/globals.ts", () => ({
  Screens: [
    {
      pxPerCm: 40,
      fixationConfig: { pos: [0, 0], nominalPos: [0, 0] },
    },
  ],
}));
jest.mock("../components/fixation.ts", () => ({
  computeFixationPosNow: jest.fn(() => [9, 9]),
}));

import { psychoJS } from "../components/globalPsychoJS.js";
import {
  clickedContinue,
  fontCharacterSet,
  instructionFont,
  modalButtonTriggeredViaKeyboard,
  targetKind,
} from "../components/global.js";
import { readi18nPhrases } from "../components/readPhrases.js";
import { colorCALReadyForBlock } from "../components/photometry.js";
import { cursorNearFixation } from "../components/utils.js";
import { warning } from "../components/errorHandling";
import { Screens } from "../components/multiple-displays/globals.ts";
import { computeFixationPosNow } from "../components/fixation.ts";
import {
  addBeepButton,
  addHandlerForClickingFixation,
  addProceedButton,
  checkIfCursorIsTrackingFixation,
  getCustomInstructionText,
  getInstructionTextMarginPx,
  getStimulusCustomInstructionPos,
  instructionsText,
  movePastFixation,
  removeBeepButton,
  removeHandlerForClickingFixation,
  removeProceedButton,
  resetTrackingStats,
  returnOrClickProceed,
  spaceOrCrosshair,
  updateInstructionFont,
} from "../components/instructions";

const nearFixationMock = cursorNearFixation as unknown as jest.Mock;
const readPhraseMock = readi18nPhrases as unknown as jest.Mock;
const addDataMock = psychoJS.experiment.addData as jest.Mock;
const calMock = colorCALReadyForBlock as unknown as jest.Mock;

const originalScreen = Screens[0];

beforeEach(() => {
  nearFixationMock.mockReset().mockReturnValue(true);
  addDataMock.mockClear();
  calMock.mockReset().mockResolvedValue(true);
  readPhraseMock.mockReset().mockImplementation((key: string) => `t:${key}`);
  (warning as jest.Mock).mockClear();
  clickedContinue.current = false;
  clickedContinue.timestamps.length = 0;
  modalButtonTriggeredViaKeyboard.current = false;
  targetKind.current = "letter";
  fontCharacterSet.current = undefined;
  Screens[0] = {
    pxPerCm: 40,
    fixationConfig: {
      pos: [0, 0],
      nominalPos: [0, 0],
      trackingTimeAfterDelay: undefined,
    },
  };
});

afterEach(() => {
  document.body.innerHTML = "";
  Screens[0] = originalScreen;
});

// ---------------------------------------------------------------------------
// Instruction text composition
// ---------------------------------------------------------------------------

describe("returnOrClickProceed", () => {
  it("picks the proceed phrase per response type", () => {
    expect(returnOrClickProceed("en", 0)).toBe("t:T_continueHitReturn");
    expect(returnOrClickProceed("en", 1)).toBe("t:T_continueClickProceed");
    expect(returnOrClickProceed("en", 3)).toBe("t:T_continueHitReturn");
    expect(returnOrClickProceed("en", 4)).toBe("t:T_continueHitReturn");
    expect(returnOrClickProceed("en", 5)).toBe(
      "t:T_continueHitReturnOrClickProceed",
    );
    expect(returnOrClickProceed("en", 6)).toBe(
      "t:T_continueHitReturnOrClickProceed",
    );
    expect(returnOrClickProceed("en", 99)).toBe(
      "t:T_continueHitReturnOrClickProceed",
    );
  });

  it("keeps any preceding text", () => {
    expect(returnOrClickProceed("en", 0, "Ready. ")).toBe(
      "Ready. t:T_continueHitReturn",
    );
  });
});

describe("spaceOrCrosshair", () => {
  it("repeatedLetters: press/click/track/press-or-click", () => {
    targetKind.current = "repeatedLetters";
    expect(spaceOrCrosshair("en", 0)).toBe(
      "t:T_readyPressSpaceRepeatedLetters",
    );
    expect(spaceOrCrosshair("en", 1)).toBe(
      "t:T_readyClickCrosshairRepeatedLetters",
    );
    expect(spaceOrCrosshair("en", 3)).toBe(
      "t:T_readyTrackCrosshairRepeatedLetters",
    );
    expect(spaceOrCrosshair("en", 9)).toBe(
      "t:T_readyPressSpaceOrClickCrosshairRepeatedLetters",
    );
  });

  it("rsvpReading: press/click/track/press-or-click", () => {
    targetKind.current = "rsvpReading";
    expect(spaceOrCrosshair("en", 0)).toBe("t:T_readyPressSpaceRsvpReading");
    expect(spaceOrCrosshair("en", 1)).toBe(
      "t:T_readyClickCrosshairRsvpReading",
    );
    expect(spaceOrCrosshair("en", 3)).toBe(
      "t:T_readyTrackCrosshairRsvpReading",
    );
    expect(spaceOrCrosshair("en", 9)).toBe(
      "t:T_readyPressSpaceOrClickCrosshairRsvpReading",
    );
  });

  it("default kinds: press/click/track/press-or-click", () => {
    expect(spaceOrCrosshair("en", 0)).toBe("t:T_readyPressSpace");
    expect(spaceOrCrosshair("en", 1)).toBe("t:T_readyClickCrosshair");
    expect(spaceOrCrosshair("en", 3)).toBe("t:T_readyTrackCrosshair");
    expect(spaceOrCrosshair("en", 4)).toBe("t:T_readyPressSpace");
    expect(spaceOrCrosshair("en", 5)).toBe("t:T_readyClickCrosshair");
    expect(spaceOrCrosshair("en", 9)).toBe(
      "t:T_readyPressSpaceOrClickCrosshair",
    );
  });
});

describe("instructionsText blocks", () => {
  it("simple block intros", () => {
    expect(instructionsText.initial("en")).toBe("t:T_thresholdSoundCheck\n\n");
    expect(instructionsText.vocoderPhraseBegin("en")).toBe(
      "t:T_soundPhraseBlock\n\n",
    );
    expect(instructionsText.soundBegin("en")).toBe(
      "t:T_thresholdSoundBeginBlock\n\n",
    );
    expect(instructionsText.speechInNoiseBegin("en")).toBe(
      "t:T_sentenceProcedure\n\nt:T_sentenceGuessingGame\n\n",
    );
  });

  it("imageBegin adjusts or instructs", () => {
    expect(instructionsText.imageBegin("en", 0, "adjust")).toBe(
      "t:T_adjustImageEccentricity",
    );
    expect(instructionsText.imageBegin("en", 12)).toBe(
      "t:T_imageDemo\n\nt:T_imageTask\n\n",
    );
  });

  it("vernierBegin appends the response modality", () => {
    expect(instructionsText.vernierBegin("en", 0)).toBe(
      "t:T_thresholdVenierBeginBlockt:T_type\n\n",
    );
    expect(instructionsText.vernierBegin("en", 1)).toBe(
      "t:T_thresholdVenierBeginBlockt:T_clickingLetter\n\n",
    );
    expect(instructionsText.vernierBegin("en", 2)).toBe(
      "t:T_thresholdVenierBeginBlockt:T_typeOrClickLetter\n\n",
    );
  });

  it("spacingDeg begin text branches on repeatedLetters", () => {
    targetKind.current = "repeatedLetters";
    expect(
      instructionsText.initialByThresholdParameter.spacingDeg("en", 0),
    ).toContain("t:T_typeRepeatedLetters");
    expect(
      instructionsText.initialByThresholdParameter.spacingDeg("en", 1),
    ).toContain("t:T_clickingLetterRepeatedLetters");
    expect(
      instructionsText.initialByThresholdParameter.spacingDeg("en", 2),
    ).toContain("t:T_typeOrClickRepeatedLetters");

    targetKind.current = "letter";
    expect(
      instructionsText.initialByThresholdParameter.spacingDeg("en", 0),
    ).toContain("t:T_type\n\n");
    expect(
      instructionsText.initialByThresholdParameter.spacingDeg("en", 1),
    ).toContain("t:T_clickingLetter");
    expect(
      instructionsText.initialByThresholdParameter.spacingDeg("en", 9),
    ).toContain("t:T_typeOrClickLetter");
  });

  it("targetSizeDeg begin text covers click/type variants", () => {
    targetKind.current = "repeatedLetters";
    expect(
      instructionsText.initialByThresholdParameter.targetSizeDeg("en", 0),
    ).toContain("t:T_typeRepeatedLetters");
    targetKind.current = "letter";
    expect(
      instructionsText.initialByThresholdParameter.targetSizeDeg("en", 1),
    ).toContain("t:T_clickingLetter");
    expect(
      instructionsText.initialByThresholdParameter.targetSizeDeg("en", 3),
    ).toContain("t:T_type\n\n");
    expect(
      instructionsText.initialByThresholdParameter.targetSizeDeg("en", 4),
    ).toContain("t:T_type\n\n");
    expect(
      instructionsText.initialByThresholdParameter.targetSizeDeg("en", 5),
    ).toContain("t:T_clickingLetter");
  });

  it("timing intro lists the rsvpReading response modality", () => {
    targetKind.current = "rsvpReading";
    const base = "t:T_thresholdRsvpReadingBeginBlock";
    expect(instructionsText.initialByThresholdParameter.timing("en", 0)).toBe(
      base + "t:T_typeRsvpReading t:T_escapeToQuit t:T_continueHitReturn\n\n",
    );
    expect(instructionsText.initialByThresholdParameter.timing("en", 1)).toBe(
      base +
        "t:T_clickingWordRsvpReading t:T_escapeToQuit t:T_continueClickProceed\n\n",
    );
    expect(instructionsText.initialByThresholdParameter.timing("en", 2)).toBe(
      base +
        "t:T_clickingWordRsvpReading t:T_escapeToQuit t:T_continueHitReturnOrClickProceed\n\n",
    );
    // spaces between phrases only when the language uses spaces
    readPhraseMock.mockImplementation((key: string) =>
      key === "EE_LanguageUsesSpacesBool" ? "TRUE" : `t:${key}`,
    );
    expect(instructionsText.initialByThresholdParameter.timing("en", 0)).toBe(
      base + " t:T_typeRsvpReading t:T_escapeToQuit t:T_continueHitReturn\n\n",
    );
  });

  it("initialEnd adds the why-click note for click-only responses", () => {
    expect(instructionsText.initialEnd("en", 2)).toBe(
      "t:T_guessingGame t:T_escapeToQuit t:T_continueHitReturnOrClickProceed",
    );
    expect(instructionsText.initialEnd("en", 1)).toBe(
      "t:T_guessingGame \n\nt:T_whyClick\n\nt:T_escapeToQuit t:T_continueClickProceed",
    );
    // no escape phrase → no extra text
    readPhraseMock.mockImplementation((key: string) =>
      key === "T_escapeToQuit" ? "" : `t:${key}`,
    );
    expect(instructionsText.initialEnd("en", 2)).toBe(
      "t:T_guessingGame t:T_continueHitReturnOrClickProceed",
    );
  });

  it("edu & trial-break snippets", () => {
    expect(instructionsText.edu.spacingDeg("en")).toBe(
      "t:T_middleLetterDemoWithStimulus",
    );
    expect(instructionsText.edu.targetSizeDeg("en")).toBe("t:T_letterDemo");
    expect(instructionsText.edu.targetOffsetDeg("en")).toBe("t:T_VernierDemo");
    expect(instructionsText.trialBreak("en", 0)).toBe("t:T_continueHitReturn");
    expect(instructionsText.readingEdu("en", 3)).toBe("t:T_readingTask");
  });

  it("trial.fixate snippets", () => {
    expect(instructionsText.trial.fixate.vocoderPhrase("en")).toBe(
      "t:T_soundPhraseTrial",
    );
    expect(instructionsText.trial.fixate.sound("en")).toBe(
      "t:T_thresholdSoundNewTrial",
    );
    expect(instructionsText.trial.fixate.spacingDeg("en", 0)).toBe(
      "t:T_readyPressSpace",
    );
    expect(instructionsText.trial.fixate.image("en", 0, "adjust")).toBe(
      "t:T_adjustImageEccentricity",
    );
  });

  it("trial.respond snippets across kinds and modalities", () => {
    const respond = instructionsText.trial.respond;
    expect(respond.rsvpReading("en", 0)).toBe("t:T_identifyPressItRsvpReading");
    expect(respond.rsvpReading("en", 1)).toBe("t:T_identifyClickItRsvpReading");
    expect(respond.vocoderPhrase("en")).toBe("t:T_soundPhraseResponse");
    expect(respond.speechInNoise("en")).toBe("t:T_sentenceIdentifyClick");

    // sound response arrows come from the font character set
    readPhraseMock.mockImplementation((key: string) =>
      key === "T_thresholdSoundResponse" ? "up 🔼 down 🔽" : `t:${key}`,
    );
    fontCharacterSet.current = undefined;
    expect(respond.sound("en")).toBe("up 🔼 down 🔽"); // default arrows
    fontCharacterSet.current = "XY";
    expect(respond.sound("en")).toBe("up X down Y"); // BMP charset swap
    fontCharacterSet.current = "🔼🔽"; // surrogate pair: kept whole
    expect(respond.sound("en")).toBe("up 🔼 down 🔽");
    readPhraseMock.mockImplementation((key: string) => `t:${key}`);

    expect(respond.spacingDeg("en", 0)).toBe("t:T_identifyMiddleLetterPressIt");
    expect(respond.spacingDeg("en", 1)).toBe("t:T_identifyMiddleLetterClickIt");
    targetKind.current = "repeatedLetters";
    expect(respond.spacingDeg("en", 0)).toBe(
      "t:T_identifyPressItRepeatedLetters",
    );
    expect(respond.spacingDeg("en", 1)).toBe(
      "t:T_identifyRepeatedLettersClickIt",
    );
    expect(respond.spacingDeg("en", 4)).toBe(
      "t:T_identifyPressItRepeatedLetters",
    );
    expect(respond.spacingDeg("en", 9)).toBe(
      "t:T_identifyPressItOrClickItRepeatedLetters",
    );

    targetKind.current = "letter";
    expect(respond.targetSizeDeg("en", 0)).toBe("t:T_identifyLetterPressIt");
    expect(respond.targetSizeDeg("en", 1)).toBe("t:T_identifyLetterClickIt");
    targetKind.current = "repeatedLetters";
    expect(respond.targetSizeDeg("en", 9)).toBe(
      "t:T_identifyPressItOrClickItRepeatedLetters",
    );

    targetKind.current = "vernier";
    expect(respond.targetOffsetDeg("en", 0)).toBe("t:T_identifyVernierPressIt");
    expect(respond.targetOffsetDeg("en", 1)).toBe("t:T_identifyVernierClickIt");
    expect(respond.targetOffsetDeg("en", 9)).toBe(
      "t:T_identifyVernierPressItOrClickIt",
    );
  });

  it("rsvpReadingAutomaticSpeech begin/response", () => {
    expect(instructionsText.rsvpReadingAutomaticSpeechResponse("en")).toBe(
      "t:T_speakRsvpReading\n\n",
    );
    const begin = instructionsText.rsvpReadingAutomaticSpeechBegin("en", 1);
    expect(begin).toContain("t:T_speakRsvpReading");
    expect(begin).toContain("t:T_continueClickProceed");
  });
});

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

describe("beep & proceed buttons", () => {
  it("beep button plays the synth on click and is removable", () => {
    const synth = { play: jest.fn() };
    const b = addBeepButton("en", synth as any);
    expect(b.id).toBe("threshold-beep-button");
    b.click();
    expect(synth.play).toHaveBeenCalledTimes(1);
    removeBeepButton();
    expect(document.getElementById("threshold-beep-button")).toBeNull();
    removeBeepButton(); // idempotent
  });

  it("proceed button click continues without luminance measurement", async () => {
    const reader = {
      read: (p: string) => (p === "measureLuminance" ? ["none"] : [undefined]),
    };
    const b = addProceedButton("en", reader as any);
    expect(b.id).toBe("threshold-proceed-button");
    await b.onclick!(new MouseEvent("click") as any);
    expect(clickedContinue.current).toBe(true);
    expect(document.getElementById("threshold-proceed-button")).toBeNull();
    removeProceedButton();
  });

  it("proceed waits for the ColorCAL gate when measuring", async () => {
    const reader = {
      read: (p: string) =>
        p === "measureLuminance" ? ["measure"] : [undefined],
    };
    calMock.mockResolvedValue(false);
    const b = addProceedButton("en", reader as any);
    await b.onclick!(new MouseEvent("click") as any);
    expect(calMock).toHaveBeenCalledTimes(1);
    expect(clickedContinue.current).toBe(false);
    expect(document.getElementById("threshold-proceed-button")).not.toBeNull();

    calMock.mockResolvedValue(true);
    await b.onclick!(new MouseEvent("click") as any);
    expect(clickedContinue.current).toBe(true);
    expect(document.getElementById("threshold-proceed-button")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Clicking the fixation
// ---------------------------------------------------------------------------

describe("clicking fixation", () => {
  const canvasClick = () => {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    canvas.dispatchEvent(
      new MouseEvent("click", { clientX: 405, clientY: 295, bubbles: true }),
    );
  };

  it("handler is added only when the response is click (not track)", () => {
    const addSpy = jest.spyOn(document, "addEventListener");
    const reader = {
      read: (p: string) =>
        p === "responseMustTrackContinuouslyBool"
          ? false
          : p === "responseClickedBool"
          ? true
          : undefined,
    };
    addHandlerForClickingFixation(reader as any);
    expect(addSpy).toHaveBeenCalledWith("click", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("touchend", expect.any(Function));
    addSpy.mockRestore();
    removeHandlerForClickingFixation();
  });

  it("a click on the canvas near fixation continues the trial", () => {
    addHandlerForClickingFixation({
      read: (p: string) => (p === "responseClickedBool" ? true : false),
    } as any);
    nearFixationMock.mockImplementation(
      (cX: number, cY: number) => cX === 5 && cY === 5,
    );
    canvasClick();
    expect(clickedContinue.current).toBe(true);
    removeHandlerForClickingFixation();
    clickedContinue.current = false;
    canvasClick(); // handler removed: no effect
    expect(clickedContinue.current).toBe(false);
  });

  it("ignores clicks off-canvas, on modal buttons, or without coordinates", () => {
    addHandlerForClickingFixation({
      read: (p: string) => (p === "responseClickedBool" ? true : false),
    } as any);

    document.body.click(); // not a canvas
    expect(clickedContinue.current).toBe(false);

    modalButtonTriggeredViaKeyboard.current = true;
    canvasClick();
    expect(clickedContinue.current).toBe(false);
    expect(modalButtonTriggeredViaKeyboard.current).toBe(false);

    nearFixationMock.mockReturnValue(false);
    canvasClick();
    expect(clickedContinue.current).toBe(false);

    // touch with coordinates, and events with none
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const touch = new Event("touchend", { bubbles: true });
    (touch as any).changedTouches = [{ clientX: 405, clientY: 295 }];
    nearFixationMock.mockReturnValue(true);
    canvas.dispatchEvent(touch);
    expect(clickedContinue.current).toBe(true);

    clickedContinue.current = true;
    const bare = new Event("touchend", { bubbles: true });
    (bare as any).changedTouches = [{}];
    canvas.dispatchEvent(bare);
    expect(clickedContinue.current).toBe(false);
    removeHandlerForClickingFixation();
  });
});

// ---------------------------------------------------------------------------
// Tracking gate
// ---------------------------------------------------------------------------

describe("checkIfCursorIsTrackingFixation", () => {
  const readerOf = (over: Record<string, unknown> = {}) => ({
    read: (p: string) =>
      p in over
        ? over[p]
        : p === "responseMustTrackMinSec"
        ? 1
        : p === "responseMustTrackMaxSec"
        ? 3
        : false,
  });

  it("flags an invalid fixation position once per trial", () => {
    const fc = Screens[0].fixationConfig as any;
    fc.pos = [NaN, NaN];
    checkIfCursorIsTrackingFixation(0, readerOf() as any);
    checkIfCursorIsTrackingFixation(0.1, readerOf() as any);
    const flagged = addDataMock.mock.calls.filter(
      (c) => c[0] === "fixationEverInvalidBool",
    );
    expect(flagged.length).toBe(1);
    expect(warning).toHaveBeenCalled();
  });

  it("does not flag off-screen positions when the window size is unknown", () => {
    (psychoJS as any).window = { size: [0, 0] };
    const fc = Screens[0].fixationConfig as any;
    fc.pos = [5000, 0];
    checkIfCursorIsTrackingFixation(0, readerOf() as any);
    expect(warning).not.toHaveBeenCalled();
    (psychoJS as any).window = { size: [800, 600] };
  });

  it("arms the gate when the cursor reaches fixation", () => {
    const fc = Screens[0].fixationConfig as any;
    checkIfCursorIsTrackingFixation(10, readerOf() as any);
    expect(typeof fc.trackingTimeAfterDelay).toBe("number");
    expect(fc.trackingTimeAfterDelay).toBeGreaterThan(11);
    expect(fc.trackingTimeAfterDelay).toBeLessThanOrEqual(13);
    expect(fc.fixationPosAfterDelay).toEqual([9, 9]);
    // the predicted fixation position is for now + delaySec (delay ∈ [1, 3])
    const predictedAt = (computeFixationPosNow as jest.Mock).mock.calls.at(
      -1,
    )[0] as number;
    const nowSec = performance.now() / 1000;
    expect(predictedAt).toBeGreaterThanOrEqual(nowSec);
    expect(predictedAt).toBeLessThanOrEqual(nowSec + 3.5);
    const keys = addDataMock.mock.calls.map((c) => c[0]);
    expect(keys).toContain("mustTrackSec");
    expect(keys).toContain("numberOfTimesTrackingStarted");
    expect(clickedContinue.current).toBe(false);
  });

  it("continues once the required duration has elapsed near fixation", () => {
    const fc = Screens[0].fixationConfig as any;
    checkIfCursorIsTrackingFixation(0, readerOf() as any); // arm: deadline ≤ 3
    checkIfCursorIsTrackingFixation(1, readerOf() as any); // still waiting
    expect(clickedContinue.current).toBe(false);
    checkIfCursorIsTrackingFixation(10, readerOf() as any); // past deadline
    expect(clickedContinue.current).toBe(true);
    expect(fc.trackingTimeAfterDelay).toBeUndefined();
  });

  it("an early departure (non-continuous) keeps the gate armed", () => {
    const fc = Screens[0].fixationConfig as any;
    checkIfCursorIsTrackingFixation(0, readerOf() as any); // arm
    nearFixationMock.mockReturnValue(false);
    checkIfCursorIsTrackingFixation(0.5, readerOf() as any); // leaves early
    expect(typeof fc.trackingTimeAfterDelay).toBe("number"); // still armed
    expect(addDataMock.mock.calls.map((c) => c[0])).not.toContain(
      "numberOfTimesTrackingStopped",
    );
  });

  it("a departure after the deadline disarms and counts a stop", () => {
    const fc = Screens[0].fixationConfig as any;
    checkIfCursorIsTrackingFixation(0, readerOf() as any); // arm, deadline ≤ 3
    nearFixationMock.mockReturnValue(false);
    checkIfCursorIsTrackingFixation(10, readerOf() as any); // late departure
    expect(fc.trackingTimeAfterDelay).toBeUndefined();
    const keys = addDataMock.mock.calls.map((c) => c[0]);
    expect(keys).toContain("numberOfTimesTrackingStopped");
  });

  it("a continuous-tracking response disarms on any departure", () => {
    const fc = Screens[0].fixationConfig as any;
    checkIfCursorIsTrackingFixation(0, readerOf() as any); // arm
    nearFixationMock.mockReturnValue(false);
    checkIfCursorIsTrackingFixation(
      0.1,
      readerOf({ responseMustTrackContinuouslyBool: true }) as any,
    );
    expect(fc.trackingTimeAfterDelay).toBeUndefined();
  });

  it("logs frame gaps ≥0.3 s as blocked time while armed", () => {
    const fc = Screens[0].fixationConfig as any;
    fc.trackingTimeAfterDelay = 100;
    fc.trackingStartedAtT = 0;
    fc.trackingLastFrameT = 0;
    checkIfCursorIsTrackingFixation(0.5, readerOf() as any);
    expect(fc.trackingBlockedSec).toBeCloseTo(0.5, 6);
    const data = Object.fromEntries(addDataMock.mock.calls);
    expect(data.trackingBlockedSec).toBeCloseTo(0.5, 6);
    expect(data.trackingDurationSec).toBeCloseTo(0.5, 6);
  });

  it("resetTrackingStats clears the gate bookkeeping", () => {
    const fc = Screens[0].fixationConfig as any;
    fc.trackingStartCount = 3;
    fc.trackingStopCount = 2;
    fc.trackingBlockedSec = 1.5;
    fc.trackingStartedAtT = 5;
    fc.trackingLastFrameT = 6;
    fc.fixationPositionWasInvalid = true;
    resetTrackingStats();
    expect(fc.trackingStartCount).toBe(0);
    expect(fc.trackingStopCount).toBe(0);
    expect(fc.trackingBlockedSec).toBe(0);
    expect(fc.trackingStartedAtT).toBeUndefined();
    expect(fc.trackingLastFrameT).toBeUndefined();
    expect(fc.fixationPositionWasInvalid).toBe(false);
  });
});

describe("movePastFixation", () => {
  it("hides the cursor and records the continue timestamp", () => {
    const { hideCursor } = require("../components/utils");
    movePastFixation();
    expect(hideCursor).toHaveBeenCalled();
    expect(clickedContinue.current).toBe(true);
    expect(clickedContinue.timestamps.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Custom instructions & fonts
// ---------------------------------------------------------------------------

describe("custom instructions", () => {
  it("getCustomInstructionText joins block instructions, passes others through", () => {
    const reader = {
      read: (p: string) =>
        p === "instructionForBlock"
          ? ["first", "", "third"]
          : p === "instructionForStimulus"
          ? ["stim"]
          : ["resp"],
    };
    expect(getCustomInstructionText("block", reader as any, "1_1")).toBe(
      "first\n\nthird",
    );
    expect(
      getCustomInstructionText("block", { read: () => ["", ""] } as any, "1_1"),
    ).toBe("");
    expect(getCustomInstructionText("stimulus", reader as any, "1_1")).toEqual([
      "stim",
    ]);
    expect(getCustomInstructionText("response", reader as any, "1_1")).toEqual([
      "resp",
    ]);
  });

  it("getStimulusCustomInstructionPos accepts only known positions", () => {
    const reader = {
      read: (p: string, BC: string) => (BC === "1_1" ? "top" : "middle"),
    };
    expect(getStimulusCustomInstructionPos(reader as any, "1_1")).toBe("top");
    expect(
      getStimulusCustomInstructionPos(reader as any, "2_1"),
    ).toBeUndefined();
  });

  it("updateInstructionFont unwraps arrays and cleans file fonts", () => {
    const stims = [{ setFont: jest.fn() }];
    const fileReader = {
      read: (p: string) => (p === "instructionFont" ? ["MyFont"] : ["file"]),
    };
    updateInstructionFont(fileReader as any, "1_1", stims as any);
    expect(instructionFont.current).toBe("clean:MyFont");
    expect(stims[0].setFont).toHaveBeenCalledWith("clean:MyFont");

    const googleReader = {
      read: (p: string) => (p === "instructionFont" ? "WebFont" : "google"),
    };
    updateInstructionFont(googleReader as any, "1_1", stims as any);
    expect(instructionFont.current).toBe("WebFont");
    expect(stims[0].setFont).toHaveBeenCalledWith("WebFont");
  });

  it("getInstructionTextMarginPx scales with pxPerCm", () => {
    expect(getInstructionTextMarginPx(true)).toBe(80);
    expect(getInstructionTextMarginPx(false)).toBe(4);
    Screens[0] = { fixationConfig: { pos: [0, 0] } } as any;
    expect(getInstructionTextMarginPx(true)).toBe(100);
    expect(getInstructionTextMarginPx(false)).toBe(5);
  });
});
