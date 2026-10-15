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
    }),
  ),
}));
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
