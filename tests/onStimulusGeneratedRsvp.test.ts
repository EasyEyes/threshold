/**
 * RED (adversarial): stale RSVP phrase-identification registers across
 * skipped trials.
 *
 * `phraseIdentificationResponse` (components/response.js) accumulates the
 * participant's word identifications and the stimulus onset time. It is
 * cleared ONLY at the end of a normally-completed RSVP trial
 * (_rsvpReading_trialRoutineEnd). A trial that is SKIPPED (escape-key skip,
 * response timeout, bad-tracking skip) returns early from trialRoutineEnd
 * and never clears the registers. The next (possibly retried) RSVP trial
 * then inherits:
 *   - stale responses → pollutes the `.every()` scoring and the array
 *     handed to QUEST at the end of the retried trial;
 *   - stale onsetTime → response times measured from the SKIPPED trial's
 *     stimulus onset (noteStimulusOnsetForPhraseIdentification only sets
 *     onsetTime when undefined).
 *
 * Invariant: every RSVP trial begins with empty registers. The natural
 * enforcement point is onStimulusGeneratedRsvpReading (runs at trial
 * begin), which already resets the other per-trial RSVP state
 * (skippedDueToBadTracking).
 */

const clearPhraseIdentificationRegisters = jest.fn();
const setupPhraseIdentification = jest.fn(() => ({
  innerHTML: "<div></div>",
}));
const updateTargetSpecs = jest.fn();

class MockCategory {
  word: string;
  foils: string[];
  constructor(word: string, foils: string[]) {
    this.word = word;
    this.foils = foils;
  }
  toString() {
    return this.word;
  }
}

beforeEach(() => {
  jest.resetModules();
  clearPhraseIdentificationRegisters.mockClear();
  setupPhraseIdentification.mockClear();
  updateTargetSpecs.mockClear();

  jest.doMock("../components/response", () => ({
    __esModule: true,
    clearPhraseIdentificationRegisters,
    setupPhraseIdentification,
  }));
  jest.doMock("../components/rsvpReading", () => ({
    __esModule: true,
    Category: MockCategory,
  }));
  jest.doMock("../components/boundingBoxes", () => ({
    __esModule: true,
    prettyPrintPsychojsBoundingBox: jest.fn(),
    getBoundingBoxVisualRect: jest.fn(),
  }));
  jest.doMock("../components/errorMeasurement", () => ({
    __esModule: true,
    targetsOverlap: jest.fn(),
  }));
  jest.doMock("../components/readingAddons", () => ({
    __esModule: true,
    pxToPt: jest.fn(),
  }));
  jest.doMock("../components/errorHandling", () => ({
    __esModule: true,
    warning: jest.fn(),
  }));
  jest.doMock("../components/cursorTracking", () => ({
    __esModule: true,
    defineTargetForCursorTracking: jest.fn(),
  }));
  jest.doMock("../components/showTrialInformation", () => ({
    __esModule: true,
    updateTargetSpecs,
  }));
  jest.doMock("../components/letter", () => ({
    __esModule: true,
    logLetterParamsToFormspree: jest.fn(),
  }));
  jest.doMock("../components/utils", () => ({
    __esModule: true,
    norm: jest.fn(),
    logger: jest.fn(),
  }));
  jest.doMock("../components/eyeTrackingFacilitation", () => ({
    __esModule: true,
    recordStimulusPositionsForEyetracking: jest.fn(),
  }));
  jest.doMock("../components/misc", () => ({
    __esModule: true,
    getFormspreeLoggingInfoLetter: jest.fn(),
  }));
  jest.doMock("../components/global.js", () => ({
    __esModule: true,
    rc: {},
  }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

const makeStimulusResults = () => ({
  targetSets: [
    { word: "cat", foilWords: ["dog"], _heightPx: 20 },
    { word: "sun", foilWords: ["sky"], _heightPx: 20 },
  ],
  identificationSets: [
    { word: "cat", foilWords: ["dog"], _heightPx: 20 },
    { word: "sun", foilWords: ["sky"], _heightPx: 20 },
  ],
});

const makeReader = () => ({
  read: (param: string) => {
    if (param === "rsvpReadingNumberOfWords") return 3;
    return false;
  },
});

const psychoJS = { experiment: { addData: jest.fn() } };

describe("onStimulusGeneratedRsvpReading — per-trial state reset", () => {
  it("clears phrase-identification registers at the start of every RSVP trial", async () => {
    const { onStimulusGeneratedRsvpReading } = await import(
      "../components/onStimulusGenerated"
    );
    onStimulusGeneratedRsvpReading(
      makeStimulusResults() as any,
      2,
      0,
      makeReader() as any,
      "1_1",
      psychoJS as any,
      "spoken",
      0.15,
    );
    expect(clearPhraseIdentificationRegisters).toHaveBeenCalled();
  });

  it("resets skippedDueToBadTracking so a skipped trial's state can't leak", async () => {
    const { onStimulusGeneratedRsvpReading } = await import(
      "../components/onStimulusGenerated"
    );
    const out = onStimulusGeneratedRsvpReading(
      makeStimulusResults() as any,
      2,
      0,
      makeReader() as any,
      "1_1",
      psychoJS as any,
      "spoken",
      0.15,
    );
    expect(out.rsvpReadingTargetSets.skippedDueToBadTracking).toBe(0);
    expect(out.rsvpReadingTargetSets.past).toEqual([]);
  });

  it.each([
    ["silent", true],
    ["spoken", false],
    ["automaticSpeech", false],
  ] as const)(
    "creates the choice matrix only for %s mode",
    async (responseMode, expectsMatrix) => {
      const { onStimulusGeneratedRsvpReading } = await import(
        "../components/onStimulusGenerated"
      );

      onStimulusGeneratedRsvpReading(
        makeStimulusResults() as any,
        2,
        0,
        makeReader() as any,
        "1_1",
        psychoJS as any,
        responseMode,
        0.15,
      );

      expect(setupPhraseIdentification).toHaveBeenCalledTimes(
        expectsMatrix ? 1 : 0,
      );
      expect(updateTargetSpecs).toHaveBeenCalledWith(
        expect.objectContaining({
          rsvpReadingResponseModality: responseMode,
        }),
        "rsvpReading",
        expect.anything(),
        "1_1",
      );
    },
  );
});
