/**
 * fontPreRender=buffer pre-render contract — when the parameter is
 * "buffer", the BEFORE-fixation letter generation routes to the REAL
 * bounding (restrictLevelAfterFixation at the current fixation position)
 * instead of the offscreen placeholder, so the tracking window's
 * regeneration reuses the raster (setPos/rescale only) and never
 * rasterizes inside the gate. With the default "none", the status-quo
 * placeholder path is kept. Offscreen at pre-render falls back to the
 * placeholder, deferring to the normal afterFixation handling.
 *
 * Contract-level: boundingNew's restrict functions and getTargetStim are
 * mocked; getStimulus's routing is what's under test.
 *
 * @jest-environment node
 */
jest.mock("../components/global", () => ({
  rc: {},
  viewingDistanceCm: { current: 50, desired: 50, max: 100 },
}));
jest.mock("../components/multiple-displays/globals", () => ({
  Screens: [{ fixationConfig: { pos: [0, 0] } }],
}));
jest.mock("../components/multiple-displays/utils", () => ({
  updateNearestPointFromRc: jest.fn(),
}));
jest.mock("../components/bounding", () => ({ restrictLevel: jest.fn() }));
jest.mock("../components/boundingNew", () => ({
  restrictLevelBeforeFixation: jest.fn(() => [
    0,
    { placeholder: true, heightPx: 300, sizeDeg: undefined },
    {},
  ]),
  restrictLevelAfterFixation: jest.fn(() => [
    0.5,
    { heightPx: 20, sizeDeg: 0.7 },
    {},
  ]),
}));
jest.mock("../components/repeatedLetters", () => ({
  restrictRepeatedLettersSpacing: jest.fn(),
  generateRepeatedLettersStims: jest.fn(),
}));
jest.mock("../components/rsvpReading", () => ({
  generateRSVPReadingTargetSets: jest.fn(),
}));
jest.mock("../components/errorHandling", () => ({ warning: jest.fn() }));
jest.mock("../components/letter", () => ({
  getTargetStim: jest.fn(
    (stimulusParameters: any, _reader: any, _bc: any, text: string) => ({
      text,
      height: stimulusParameters.heightPx,
      setOpacity: jest.fn(),
      setAutoDraw: jest.fn(),
      _updateIfNeeded: jest.fn(() => {
        mockClockMs += mockRasterMsPerStim;
      }),
    }),
  ),
}));
// Driven by the mocked _updateIfNeeded (fontPreRender=auto forces a
// synchronous, measurable raster in the pre-render loop); read through a
// performance.now spy installed by the auto tests.
let mockClockMs = 1000;
let mockRasterMsPerStim = 0;
jest.mock("../components/utils", () => ({
  logger: { debug() {}, info() {}, error() {}, warn() {} },
  readTargetTask: jest.fn(() => "identify"),
}));
jest.mock("../components/fontDirection.js", () => ({
  isFontLTR: jest.fn(() => true),
  readFontDirection: jest.fn(() => "ltr"),
}));
jest.mock("../psychojs/src/core", () => ({
  PsychoJS: { Status: { NOT_STARTED: 0, STARTED: 1, STOPPED: 2, FINISHED: 3 } },
}));
jest.mock("../parameters/paramReader", () => ({ ParamReader: class {} }));

import { getStimulus } from "../components/stimulusGeneration";
import {
  beginAutoTrial,
  resolveAutoMode,
} from "../components/fontPreRenderAuto";
import {
  restrictLevelBeforeFixation,
  restrictLevelAfterFixation,
} from "../components/boundingNew";

const makeReader = (fontPreRender: string) => {
  const values: Record<string, unknown> = {
    targetKind: "letter",
    EasyEyesLettersVersion: "2",
    fontPreRender,
    thresholdParameter: "spacingDeg",
    spacingRelationToSize: "ratio",
    spacingSymmetry: "screen",
    spacingOverSizeRatio: 1.1,
    fontCharacterSet: "ABC",
    spacingDirection: "horizontal",
    targetSizeIsHeightBool: true,
    spacingIsOuterBool: false,
    showBoundingBoxBool: false,
    fontSizeReferencePx: 300,
    thresholdParameterMax: 10,
    fontDirection: "ltr",
    targetTask: "identify",
  };
  return {
    read: jest.fn((name: string) => values[name]),
  };
};

const extraInfo = {
  proposedLevel: 0.5,
  characterSetBoundingRect: {},
  textStims: {},
  characters: { target: "S", flanker1: "X", flanker2: "Z" },
  stage: "beforeFixation" as const,
  frameN: 0,
  t: 0,
};

beforeEach(() => {
  (restrictLevelBeforeFixation as jest.Mock).mockClear();
  (restrictLevelAfterFixation as jest.Mock).mockClear();
});

describe("fontPreRender=buffer pre-render routing", () => {
  it("none (default): beforeFixation uses the placeholder path", () => {
    getStimulus("1_1", makeReader("none") as never, { ...extraInfo });
    expect(restrictLevelBeforeFixation).toHaveBeenCalled();
    expect(restrictLevelAfterFixation).not.toHaveBeenCalled();
  });

  it("buffer: beforeFixation routes to the real bounding", () => {
    const result = getStimulus("1_1", makeReader("buffer") as never, {
      ...extraInfo,
    });
    expect(restrictLevelAfterFixation).toHaveBeenCalledTimes(1);
    const args = (restrictLevelAfterFixation as jest.Mock).mock.calls[0];
    expect(args[0]).toBe(0.5); // proposedLevel, unclamped
    expect(args[13]).toBe("S"); // the real target character
    expect(restrictLevelBeforeFixation).not.toHaveBeenCalled();
    expect((result.stimulusParameters as any).placeholder).toBeUndefined();
  });

  it("buffer: offscreen at pre-render falls back to the placeholder", () => {
    (restrictLevelAfterFixation as jest.Mock).mockReturnValueOnce([
      "target is offscreen",
      {},
      {},
    ]);
    const result = getStimulus("1_1", makeReader("buffer") as never, {
      ...extraInfo,
    });
    expect(restrictLevelBeforeFixation).toHaveBeenCalled();
    expect((result.stimulusParameters as any).placeholder).toBe(true);
  });
});

describe("fontPreRender=auto raster measurement (pre-render loop)", () => {
  let nowSpy: jest.SpyInstance;
  const runAuto = (overrides: Record<string, unknown> = {}) =>
    getStimulus("1_1", makeReader("auto") as never, {
      ...extraInfo,
      ...overrides,
    });
  beforeEach(() => {
    mockClockMs = 1000;
    mockRasterMsPerStim = 0;
    nowSpy = jest
      .spyOn(performance, "now")
      .mockImplementation(() => mockClockMs);
    beginAutoTrial();
  });
  afterEach(() => nowSpy.mockRestore());

  it("auto: forces a synchronous raster per stim and accumulates the trial total", () => {
    mockRasterMsPerStim = 10; // 10ms x 3 stims = 30ms > 16.7ms frame @60Hz
    const result = runAuto();
    const stims = Object.values(result.stims) as any[];
    expect(stims.length).toBe(3);
    for (const s of stims) expect(s._updateIfNeeded).toHaveBeenCalled();
    // The accumulated total drives the re-arm decision (letter.js).
    expect(resolveAutoMode(60, "").mode).toBe("buffer");
  });

  it("auto: a fast trial stays none", () => {
    mockRasterMsPerStim = 1; // 3ms total
    runAuto();
    expect(resolveAutoMode(60, "").mode).toBe("none");
  });

  it("auto: resets at the new trial even though the runtime passes the PREVIOUS trial's stims", () => {
    // Production shape: threshold.js keeps letterTextStims current
    // across trials, so a new trial's beforeFixation generation receives
    // the previous trial's stims (identity mismatch forces recreation
    // anyway). The reset must key on the beforeFixation stage, not on
    // old-stim presence — otherwise the latch and accumulator leak
    // across the whole session.
    mockRasterMsPerStim = 10; // slow trial → buffer
    const first = runAuto();
    expect(resolveAutoMode(60, "").mode).toBe("buffer");
    mockRasterMsPerStim = 1; // fast trial, still carrying trial 1's stims
    runAuto({ textStims: first.stims });
    expect(resolveAutoMode(60, "").mode).toBe("none");
  });

  it("auto: a re-arm (afterFixation stage, old stims) does NOT reset", () => {
    mockRasterMsPerStim = 10; // slow initial generation (beforeFixation)
    const first = runAuto();
    mockRasterMsPerStim = 1; // re-arm rasters would be fast (e.g. smaller)
    runAuto({
      stage: "afterFixation" as const,
      textStims: first.stims, // re-arm: old stims present
    });
    // 33ms accumulated (30 + 3); a reset would leave only 3ms → none.
    expect(resolveAutoMode(60, "").mode).toBe("buffer");
  });

  it("none and buffer: no synchronous raster forced (status quo timing)", () => {
    for (const mode of ["none", "buffer"]) {
      const result = getStimulus("1_1", makeReader(mode) as never, {
        ...extraInfo,
      });
      for (const s of Object.values(result.stims) as any[])
        expect(s._updateIfNeeded).not.toHaveBeenCalled();
    }
  });
});

describe("fontPreRender=auto pre-render routing", () => {
  it("auto: beforeFixation routes to the real bounding (like buffer)", () => {
    getStimulus("1_1", makeReader("auto") as never, { ...extraInfo });
    expect(restrictLevelAfterFixation).toHaveBeenCalledTimes(1);
    expect(restrictLevelBeforeFixation).not.toHaveBeenCalled();
  });
});
