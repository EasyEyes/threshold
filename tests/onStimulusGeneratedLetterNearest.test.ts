/** @jest-environment jsdom */
/**
 * RED: onStimulusGeneratedLetter receives a SINGLE screen object at every
 * call site (threshold.js passes Screens[0]), though the parameter is
 * misnamed `Screens`. The nearest-point logging must not index it as an
 * array — Screens[0] on a screen object is undefined, and reading .window
 * off it threw "Cannot read properties of undefined (reading 'window')",
 * skipping every trial when improved distance tracking data was present.
 *
 * Also pins: logged nearestXYPx values are psychoJS center-origin y-up px.
 */

const updateTargetSpecs = jest.fn();

beforeEach(() => {
  jest.resetModules();
  updateTargetSpecs.mockClear();

  jest.doMock("../components/response", () => ({
    __esModule: true,
    clearPhraseIdentificationRegisters: jest.fn(),
    setupPhraseIdentification: jest.fn(),
  }));
  jest.doMock("../components/rsvpReading", () => ({
    __esModule: true,
    Category: class {},
  }));
  jest.doMock("../components/rsvpSpeech/rsvpSpeechRegistrar", () => ({
    __esModule: true,
    resetRsvpSpeechResponseRegistration: jest.fn(),
  }));
  jest.doMock("../components/rsvpSpeech/rsvpSpeechMode", () => ({
    __esModule: true,
    isRsvpReadingAutomaticSpeechResponseMode: jest.fn(() => false),
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
    viewingDistanceCm: { current: 50 },
    rc: {
      improvedDistanceTrackingData: {
        left: {
          nearestXYPx: [690, 330],
          nearestDistanceCm: 49,
          distanceCm: 50,
        },
        right: {
          nearestXYPx: [710, 330],
          nearestDistanceCm: 48,
          distanceCm: 49,
        },
        nearestXYPx: [700, 340],
        nearestDistanceCm: 48.5,
        distanceCm: 49.5,
        nearEye: "right",
        oldDistanceCm: 51,
      },
    },
  }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

const W = 1280;
const H = 720;
// What production passes: ONE screen object, not the Screens array.
const singleScreen: any = { window: { _size: [W, H] } };

const makeStimulus = (): any => ({
  level: 1,
  stims: {
    target: { getBoundingBox: () => ({}), getHeight: () => 10 },
  },
  stimulusParameters: { flankerXYDegs: [] },
});

const makeReader = () => ({
  read: (param: string) => {
    if (param === "_logFontBool") return [false];
    if (param === "EasyEyesLettersVersion") return 1;
    return false;
  },
});

describe("onStimulusGeneratedLetter — nearest-point logging", () => {
  it("does not throw when passed a single screen (production call signature)", async () => {
    const { onStimulusGeneratedLetter } = await import(
      "../components/onStimulusGenerated"
    );
    const psychoJS: any = { experiment: { addData: jest.fn() } };
    expect(() =>
      onStimulusGeneratedLetter(
        makeStimulus(),
        makeReader() as any,
        "1_1",
        psychoJS,
        singleScreen,
        50,
        [],
        [],
        "duringTrial" as any,
      ),
    ).not.toThrow();
  });

  it("logs nearestXYPx in psychoJS center-origin y-up px", async () => {
    const { onStimulusGeneratedLetter } = await import(
      "../components/onStimulusGenerated"
    );
    const addData = jest.fn();
    const psychoJS: any = { experiment: { addData } };
    onStimulusGeneratedLetter(
      makeStimulus(),
      makeReader() as any,
      "1_1",
      psychoJS,
      singleScreen,
      50,
      [],
      [],
      "duringTrial" as any,
    );
    const logged = Object.fromEntries(addData.mock.calls);
    // rc [700, 340] top-left/y-down on 1280x720 -> [60, 20] center/y-up.
    expect(logged["nearestXYPx"]).toBe("60, 20");
    expect(logged["nearestXYPx_left"]).toBe("50, 30");
    expect(logged["nearestXYPx_right"]).toBe("70, 30");
    // Non-position fields untouched.
    expect(logged["nearEye"]).toBe("right");
    expect(logged["nearestDistanceCm"]).toBe(48.5);
  });
});
