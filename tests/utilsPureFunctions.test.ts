/**
 * @jest-environment jsdom
 *
 * Unit coverage for the exported helpers of components/utils.js.
 *
 * These are characterization tests: they pin down current CORRECT behavior
 * of pure (or easily-seamed) utilities that previously had no jest
 * coverage. utils.js pulls in psychojs/browser-only modules; only those
 * seams are mocked. The functions under test run for real.
 *
 * Coordinate mocks: Screens[0] models a flat screen — pxPerCm 40,
 * viewingDistance 40 cm, nearest point & fixation at the origin. The
 * multiple-displays XYPxOfDeg/XYDegOfPx mocks are linear (deg*40) so
 * degreesToPixels/pxScalar results are exactly predictable, while the
 * utils.js trigonometric conversions (xyPxOfDeg, xyDegOfPx, *_OLD) are
 * exercised with real math against those constants.
 */

jest.mock("../components/global", () => ({
  displayOptions: { pixPerCm: 40 },
  eyeTrackingStimulusRecords: [],
  fixationConfig: { pos: [0, 0], nominalPos: [0, 0] },
  skipTrialOrBlock: {},
  status: { trial: 1, block: 1 },
  targetEccentricityDeg: { x: 0, y: 0 },
  thisExperimentInfo: {},
  viewingDistanceCm: { current: 40 },
}));
jest.mock("../components/globalPsychoJS", () => ({
  psychoJS: {
    window: { _size: [1920, 1080] },
    experiment: { addData: jest.fn(), nextEntry: jest.fn() },
  },
  psychojsMouse: { getPos: () => [0, 0] },
  to_px: () => [0, 0],
}));
jest.mock("../parameters/paramReader", () => ({
  paramReader: { read: jest.fn(), has: jest.fn() },
}));
jest.mock("../psychojs/src/data/MultiStairHandler.js", () => ({
  MultiStairHandler: class {},
}));
jest.mock("../components/eyeTrackingFacilitation", () => ({
  getAppleCoordinatePosition: jest.fn(() => 0),
}));
jest.mock("../components/readingAddons", () => ({
  pxToPt: (px) => px,
}));
jest.mock("../components/errorHandling", () => ({
  warning: jest.fn(),
}));
jest.mock("../components/multiple-displays/globals.ts", () => ({
  Screens: [
    {
      pxPerCm: 40,
      fixationConfig: {
        pos: [0, 0],
        nominalPos: [0, 0],
        markingFixationHotSpotRadiusPx: 5,
      },
      nearestPointXYZDeg: [0, 0],
      nearestPointXYZPx: [0, 0],
    },
  ],
}));
jest.mock("../components/multiple-displays/utils.ts", () => ({
  XYDegOfPx: jest.fn((_, [x, y]) => [x / 40, y / 40]),
  XYPxOfDeg: jest.fn((_, [x, y]) => [x * 40, y * 40]),
}));
jest.mock("../components/readPhrases.js", () => ({
  useWordDigitBool: { current: false },
}));
jest.mock("../components/letter", () => ({
  logWebGLInfoToFormspree: jest.fn(),
}));
jest.mock("../components/webglRequirements", () => ({
  measureWebGLCapabilities: jest.fn(() => ({ supported: false })),
}));
jest.mock("../components/fontInstancing", () => ({
  getFontInstancingTimesMs: jest.fn(() => null),
  getFontInstancingTotalTimeMs: jest.fn(() => null),
}));
const mockRecorder = { flushTrial: jest.fn(), record: jest.fn() };
jest.mock("../components/longTaskRecorder", () => ({
  createLongTaskRecorder: () => mockRecorder,
}));

import { MultiStairHandler } from "../psychojs/src/data/MultiStairHandler.js";
import { paramReader } from "../parameters/paramReader";
import { getFontInstancingTimesMs } from "../components/fontInstancing";
import { warning } from "../components/errorHandling";
import { Screens } from "../components/multiple-displays/globals.ts";
import {
  status,
  targetEccentricityDeg,
  viewingDistanceCm,
} from "../components/global";
import { initGlossary } from "../parameters/glossaryRegistry";
import {
  addApparatusInfoToData,
  addBlockStaircaseSummariesToData,
  addConditionToData,
  addTrialStaircaseSummariesToData,
  arraysEqual,
  areQuestionAndAnswerParametersPresent,
  clipRectangle,
  closeEnough,
  colorRGBASnippetToRGBA,
  colorRGBSnippetToRGB,
  currentViewingDistanceCm,
  cursorNearFixation,
  degreesToPixels,
  distance,
  fillNumberLength,
  flushLongTaskRecorder,
  getEvenlySpacedValues,
  getParamValueForBlockOrCondition,
  getPairs,
  getRandomInt,
  getUseWordDigitBool,
  getViewingDistancedCm,
  hideCursor,
  ifTrue,
  isBlockLabel,
  isInRect,
  isRectInRect,
  isRectTouchingRect,
  isFullscreen,
  isReadingWithSimultaneousQuestionAndAnswer,
  lastConditionNamed,
  maxViewingDistanceCmForScreenWidthDeg,
  totalEnabledTrialsThisBlock,
  getUnionRect,
  log,
  norm,
  offsetToTrueCenter,
  psychojsUnitsFromWindowUnits,
  pxScalar,
  readTargetTask,
  Rectangle,
  rectFromPixiRect,
  reportStartOfNewBlock,
  rotate,
  safeExecuteFunc,
  sampleWithReplacement,
  sampleWithoutReplacement,
  sendEmailForDebugging,
  setTargetEccentricityDeg,
  shuffle,
  tand,
  toFixedNumber,
  toShowCursor,
  showCursor,
  trueCenter,
  validateRectPoints,
  XYDegOfXYPix_OLD,
  XYPixOfXYDeg_OLD,
  xyDegOfPx,
  xyPxOfDeg,
} from "../components/utils";
import {
  clearFullscreenWasLost,
  requestNativeFullscreen,
  requireFullscreenForTrialInitiation,
  setupFullscreenMonitoring,
  teardownFullscreenMonitoring,
} from "../components/utils";

const readMock = paramReader.read as unknown as jest.Mock;
const hasMock = paramReader.has as unknown as jest.Mock;
const originalScreen = Screens[0];
const originalFetch = global.fetch;

beforeEach(() => {
  readMock.mockReset();
  hasMock.mockReset();
  (getFontInstancingTimesMs as jest.Mock).mockReturnValue(null);
});

afterEach(() => {
  Screens[0] = originalScreen;
  // tests may mutate properties of the shared screen object in place
  originalScreen.nearestPointXYZPx = [0, 0];
  originalScreen.nearestPointXYZDeg = [0, 0];
  originalScreen.fixationConfig.pos = [0, 0];
  originalScreen.fixationConfig.nominalPos = [0, 0];
  viewingDistanceCm.current = 40;
  status.trial = 1;
  status.block = 1;
  (status as any).block_condition = undefined;
  const globalAny = require("../components/global") as any;
  globalAny.skipTrialOrBlock.trialId = undefined;
  globalAny.skipTrialOrBlock.blockId = undefined;
  globalAny.skipTrialOrBlock.skipTrial = false;
  globalAny.skipTrialOrBlock.skipBlock = false;
});

// ---------------------------------------------------------------------------
// Small scalar helpers
// ---------------------------------------------------------------------------

describe("scalar helpers", () => {
  it("safeExecuteFunc calls the function with and without args", () => {
    const f = jest.fn((a?: number, b?: number) => (a ?? 0) + (b ?? 0));
    expect(safeExecuteFunc(f)).toBe(0);
    expect(safeExecuteFunc(f, 2, 3)).toBe(5);
    expect(safeExecuteFunc(undefined as any)).toBeUndefined();
    expect(safeExecuteFunc(null, 1)).toBeUndefined();
  });

  it("toFixedNumber rounds to the given digits", () => {
    expect(toFixedNumber(1.23456, 3)).toBe(1.235);
    expect(toFixedNumber(1.7)).toBe(2);
    expect(toFixedNumber(-1.234, 1)).toBe(-1.2);
  });

  it("ifTrue is true iff some element is truthy", () => {
    expect(ifTrue([false, 0, "", null])).toBe(false);
    expect(ifTrue([])).toBe(false);
    expect(ifTrue([false, "x"])).toBe(true);
  });

  it("fillNumberLength zero-pads without truncating", () => {
    expect(fillNumberLength(7, 3)).toBe("007");
    expect(fillNumberLength(1234, 2)).toBe("1234");
    expect(fillNumberLength(0, 2)).toBe("00");
  });

  it("colorRGBASnippetToRGBA converts 0-1 floats to a css rgba() string", () => {
    expect(colorRGBASnippetToRGBA("0.5,0.5,0.5,0.9")).toBe(
      "rgba(127.5,127.5,127.5,0.9)",
    );
  });

  it("colorRGBASnippetToRGBA defaults alpha to 1 for 3 components", () => {
    expect(colorRGBASnippetToRGBA("0.5,0,1")).toBe("rgba(127.5,0,255,1)");
  });

  it("colorRGBSnippetToRGB converts to a css rgb() string", () => {
    expect(colorRGBSnippetToRGB("0.5,0,1")).toBe("rgb(127.5,0,255)");
  });

  it("log computes log in an arbitrary base", () => {
    expect(log(8, 2)).toBe(3);
    expect(log(100, 10)).toBe(2);
  });

  it("norm is the euclidean length", () => {
    expect(norm([3, 4])).toBe(5);
    expect(norm([0, 0])).toBe(0);
    expect(norm([2, 3, 6])).toBe(7);
  });

  it("tand converts degrees to tan", () => {
    expect(tand(45)).toBeCloseTo(1, 10);
    expect(tand(0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// shuffle / sampling
// ---------------------------------------------------------------------------

describe("shuffle and sampling", () => {
  it("shuffle permutes without mutating, deterministically, and handles empty", () => {
    const input = [1, 2, 3, 4, 5];
    const frozen = [...input];
    const a = shuffle(input, () => 0.5);
    expect([...a].sort()).toEqual(frozen); // same multiset
    expect(input).toEqual(frozen); // input untouched
    expect(shuffle([1, 2, 3, 4, 5], () => 0.5)).toEqual(a); // deterministic
    expect(shuffle([], () => 0.5)).toEqual([]);
  });

  it("getRandomInt is in [min, max)", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = getRandomInt(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThan(5);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([2, 3, 4]);
  });

  it("sampleWithoutReplacement draws unique elements, in population order if requested", () => {
    const population = ["A", "B", "C", "D", "E", "F"];
    const s = sampleWithoutReplacement(population, 3);
    expect(s).toHaveLength(3);
    expect(new Set(s).size).toBe(3);
    s.forEach((x) => expect(population).toContain(x));

    const ordered = sampleWithoutReplacement(population, 3, true);
    const indices = ordered.map((x) => population.indexOf(x));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it("sampleWithReplacement length is the (rounded) sampleSize, values from population", () => {
    const s = sampleWithReplacement(["a", "b"], 5);
    expect(s).toHaveLength(5);
    s.forEach((x) => expect(["a", "b"]).toContain(x));
    expect(sampleWithReplacement(["a"], 4.4)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Cursor / block-label parameter helpers
// ---------------------------------------------------------------------------

describe("cursor & parameter helpers", () => {
  it("cursorNearFixation compares against the given fixation position", () => {
    expect(cursorNearFixation(10, 0, [10, 0])).toBe(true);
    expect(cursorNearFixation(20, 0, [10, 0])).toBe(false);
  });

  it("cursorNearFixation falls back to Screens[0].fixationConfig.pos", () => {
    expect(cursorNearFixation(4, 0, undefined)).toBe(true);
    expect(cursorNearFixation(6, 0, undefined)).toBe(false);
  });

  it("getViewingDistancedCm applies dCm = sqrt(vCm^2 - (hCm/2 + 0.5)^2)", () => {
    // screenHeightPx 800, pxPerCm 40 → hCm/2 = 10, +0.5 camera offset = 10.5
    expect(getViewingDistancedCm(50, { pxPerCm: 40 }, 800)).toBeCloseTo(
      Math.sqrt(50 ** 2 - 10.5 ** 2),
      6,
    );
  });

  it("isBlockLabel is true for whole numbers, false for block_condition labels", () => {
    expect(isBlockLabel("1")).toBe(true);
    expect(isBlockLabel(1)).toBe(true);
    expect(isBlockLabel("1_1")).toBe(false);
  });

  it("getParamValueForBlockOrCondition unwraps block values, passes conditions through", () => {
    readMock.mockImplementation((param, BC) =>
      BC === "1" ? ["identify"] : "elongate",
    );
    expect(getParamValueForBlockOrCondition("targetKind", "1")).toBe(
      "identify",
    );
    expect(getParamValueForBlockOrCondition("targetKind", "1_1")).toBe(
      "elongate",
    );
  });

  it("pxScalar converts a deg length to px via the (linear mock) conversion", () => {
    expect(pxScalar(1)).toBe(40);
  });

  it("getPairs returns all unordered pairs", () => {
    expect(getPairs([1, 2, 3])).toEqual([
      [1, 2],
      [1, 3],
      [2, 3],
    ]);
    expect(getPairs([1])).toEqual([]);
  });

  it("distance is euclidean", () => {
    expect(distance([0, 0], [3, 4])).toBe(5);
  });

  it("closeEnough uses tolerance 0.01 by default", () => {
    expect(closeEnough(1, 1.005)).toBe(true);
    expect(closeEnough(1, 1.02)).toBe(false);
    expect(closeEnough(1, 1.4, 0.5)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// readTargetTask family
// ---------------------------------------------------------------------------

describe("readTargetTask family", () => {
  it("readTargetTask returns '' without a block/condition", () => {
    expect(readTargetTask(undefined)).toBe("");
    expect(readTargetTask("")).toBe("");
  });

  it("readTargetTask returns the table's targetTask when present", () => {
    readMock.mockReturnValue("elongation");
    expect(readTargetTask("1_1")).toBe("elongation");
  });

  it("readTargetTask infers questionAndAnswer from question parameters", () => {
    readMock.mockImplementation((param) =>
      param === "targetTask"
        ? ""
        : param === "questionAndAnswer03"
        ? "What is it?"
        : "",
    );
    hasMock.mockImplementation((q) => q === "questionAndAnswer03");
    expect(readTargetTask("1_1")).toBe("questionAndAnswer");
  });

  it("areQuestionAndAnswerParametersPresent scans both parameter spellings", () => {
    hasMock.mockImplementation((q) => q === "questionAnswer07");
    readMock.mockImplementation((param) =>
      param === "questionAnswer07" ? "Q?" : "",
    );
    expect(areQuestionAndAnswerParametersPresent("1_1")).toBe(true);
  });

  it("areQuestionAndAnswerParametersPresent finds questionAndAnswerNN", () => {
    hasMock.mockImplementation((q) => q === "questionAndAnswer03");
    readMock.mockImplementation((param) =>
      param === "questionAndAnswer03" ? "Q?" : "",
    );
    expect(areQuestionAndAnswerParametersPresent("1_1")).toBe(true);
  });

  it("areQuestionAndAnswerParametersPresent is false for empty questions or no BC", () => {
    expect(areQuestionAndAnswerParametersPresent(undefined)).toBe(false);
    hasMock.mockImplementation((q) => q === "questionAndAnswer01");
    readMock.mockImplementation(() => "");
    expect(areQuestionAndAnswerParametersPresent("1_1")).toBe(false);
  });

  it("isReadingWithSimultaneousQuestionAndAnswer needs reading + QA + spare fraction", () => {
    readMock.mockImplementation((param) => {
      switch (param) {
        case "targetKind":
          return "reading";
        case "targetImageSpareFraction":
          return "0.5";
        case "questionAndAnswer01":
          return "Q?";
        default:
          return undefined;
      }
    });
    hasMock.mockImplementation((q) => q === "questionAndAnswer01");
    expect(isReadingWithSimultaneousQuestionAndAnswer("1_1")).toBe(true);

    readMock.mockImplementation((param) =>
      param === "targetKind" ? "identify" : undefined,
    );
    expect(isReadingWithSimultaneousQuestionAndAnswer("1_1")).toBe(false);

    readMock.mockImplementation((param) =>
      param === "targetKind" ? "reading" : undefined,
    );
    expect(isReadingWithSimultaneousQuestionAndAnswer(undefined)).toBe(false);
  });

  it("getUseWordDigitBool checks charset ⊆ digits for blocks and conditions", () => {
    const reader = {
      read: (p: string) =>
        p === "digits"
          ? ["0123456789"]
          : p === "fontCharacterSet"
          ? ["123"]
          : undefined,
    } as any;
    expect(getUseWordDigitBool(reader, "1")).toBe(true);

    const readerCondition = {
      read: (p: string, BC: string) =>
        p === "digits" ? "0123" : p === "fontCharacterSet" ? "ab0" : undefined,
    } as any;
    expect(getUseWordDigitBool(readerCondition, "1_1")).toBe(false);
  });

  it("setTargetEccentricityDeg unwraps array values", () => {
    const reader = {
      read: (p: string) => (p.includes("X") ? [4] : [3]),
    } as any;
    setTargetEccentricityDeg(reader, "1");
    expect(targetEccentricityDeg.x).toBe(4);
    expect(targetEccentricityDeg.y).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Rect geometry
// ---------------------------------------------------------------------------

describe("rect geometry", () => {
  const rect = { left: 0, right: 10, bottom: 0, top: 10 };

  it("isInRect includes boundaries", () => {
    expect(isInRect(5, 5, rect)).toBe(true);
    expect(isInRect(0, 0, rect)).toBe(true);
    expect(isInRect(10, 10, rect)).toBe(true);
    expect(isInRect(10.1, 5, rect)).toBe(false);
    expect(isInRect(5, -0.1, rect)).toBe(false);
  });

  it("isRectInRect requires full containment", () => {
    expect(isRectInRect({ left: 1, right: 9, bottom: 1, top: 9 }, rect)).toBe(
      true,
    );
    expect(isRectInRect({ left: -1, right: 9, bottom: 1, top: 9 }, rect)).toBe(
      false,
    );
  });

  it("isRectTouchingRect detects any overlap", () => {
    expect(
      isRectTouchingRect({ left: 5, right: 15, bottom: 5, top: 15 }, rect),
    ).toBe(true);
    expect(
      isRectTouchingRect({ left: 11, right: 15, bottom: 0, top: 10 }, rect),
    ).toBe(false);
  });

  it("getUnionRect unions point-pair rects and Rectangle instances", () => {
    const a = [
      [0, 0],
      [2, 2],
    ];
    const b = [
      [1, -1],
      [3, 1],
    ];
    expect(getUnionRect(a, b)).toEqual([
      [0, -1],
      [3, 2],
    ]);
    const ra = new Rectangle([0, 0], [2, 2]);
    const rb = new Rectangle([1, 1], [3, 3]);
    const union = getUnionRect(ra, rb);
    expect(union).toBeInstanceOf(Rectangle);
    expect([union.left, union.bottom, union.right, union.top]).toEqual([
      0, 0, 3, 3,
    ]);
  });

  it("getUnionRect returns the other rect when one is empty", () => {
    const empty = [
      [1, 1],
      [1, 1],
    ];
    const b = [
      [0, 0],
      [2, 2],
    ];
    expect(getUnionRect(empty, b)).toBe(b);
    expect(getUnionRect(b, empty)).toBe(b);
    const emptyRect = new Rectangle([1, 1], [1, 1]);
    expect(getUnionRect(emptyRect, new Rectangle(b[0], b[1]))).toBeInstanceOf(
      Rectangle,
    );
  });

  it("rectFromPixiRect converts a center-aligned pixi rect", () => {
    const r = rectFromPixiRect({ x: 10, y: 20, width: 6, height: 8 });
    expect(r).toBeInstanceOf(Rectangle);
    expect([r.left, r.right, r.bottom, r.top]).toEqual([7, 13, 16, 24]);
    expect(r.getUnits()).toBe("pix");
  });

  it("clipRectangle returns the intersection or null", () => {
    const a = [
      [0, 0],
      [10, 10],
    ];
    const b = [
      [5, 5],
      [15, 15],
    ];
    const clipped = clipRectangle(a, b);
    expect([clipped.left, clipped.bottom, clipped.right, clipped.top]).toEqual([
      5, 5, 10, 10,
    ]);
    const disjoint = clipRectangle(a, [
      [11, 11],
      [12, 12],
    ]);
    expect(disjoint).toBeNull();
  });

  it("validateRectPoints reports invalid rects via console.error", () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    validateRectPoints([
      [2, 2],
      [1, 1],
    ]);
    expect(errSpy).toHaveBeenCalledTimes(2);
    validateRectPoints([
      [1, 1],
      [2, 2],
    ]);
    expect(errSpy).toHaveBeenCalledTimes(2);
    errSpy.mockRestore();
  });
});

describe("Rectangle", () => {
  const r = () => new Rectangle([0, 0], [10, 6], "pix");

  it("exposes width, height, units, and point-pair forms", () => {
    const x = r();
    expect(x.getWidth()).toBe(10);
    expect(x.getHeight()).toBe(6);
    expect(x.getUnits()).toBe("pix");
    expect(x.toArray()).toEqual([
      [0, 0],
      [10, 6],
    ]);
  });

  it("toString rounds to nDigits", () => {
    const x = new Rectangle([0.123456, 0.654321], [10.987654, 6.54321], "pix");
    expect(x.toString(2)).toBe("[(0.12, 0.65), (10.99, 6.54)]");
    expect(x.toString()).toBe("[(0.1235, 0.6543), (10.9877, 6.5432)]");
  });

  it("toString can convert to pt", () => {
    const x = new Rectangle([1.25, 2.5], [3.75, 4.5], "pix");
    expect(x.toString(1, true)).toBe("[(1.3, 2.5), (3.8, 4.5)]");
  });

  it("scale grows about the center", () => {
    const s = r().scale(2);
    expect([s.left, s.bottom, s.right, s.top]).toEqual([-5, -3, 15, 9]);
  });

  it("offset translates", () => {
    const o = r().offset([3, -2]);
    expect([o.left, o.bottom, o.right, o.top]).toEqual([3, -2, 13, 4]);
  });

  it("inset shrinks", () => {
    const i = r().inset(1, 2);
    expect([i.left, i.bottom, i.right, i.top]).toEqual([1, 2, 9, 4]);
  });

  it("centerAt re-centers", () => {
    const c = r().centerAt([0, 0]);
    expect([c.left, c.bottom, c.right, c.top]).toEqual([-5, -3, 5, 3]);
  });
});

// ---------------------------------------------------------------------------
// Coordinate conversions (real trig against mocked screen constants)
// ---------------------------------------------------------------------------

describe("coordinate conversions", () => {
  it("degreesToPixels measures horizontal/vertical extent in px", () => {
    // Linear mock: XYPxOfDeg(0, [x, y]) = [x*40, y*40]
    expect(degreesToPixels(10, [5, 5], "horizontal")).toBe(400);
    expect(degreesToPixels(10, [5, 5], "vertical")).toBe(400);
    // default centeredAtDeg [0,0], direction horizontal
    expect(degreesToPixels(1)).toBe(40);
  });

  it("psychojsUnitsFromWindowUnits re-centers and flips y", () => {
    expect(
      psychojsUnitsFromWindowUnits([799, 299], [800, 600], [0, 0]),
    ).toEqual([399, 1]);
    expect(
      psychojsUnitsFromWindowUnits([800, 300], [800, 600], [100, 50]),
    ).toEqual([300, -50]);
  });

  it("getEvenlySpacedValues centers evenly-spaced values at 0", () => {
    // values evenly spaced BY intervalSize (gaps 25,25,25), centered at 0
    expect(getEvenlySpacedValues(4, 25)).toEqual([-37.5, -12.5, 12.5, 37.5]);
    expect(getEvenlySpacedValues(3, 25)).toEqual([-25, 0, 25]);
    expect(getEvenlySpacedValues(4.7, 10)).toEqual([-15, -5, 5, 15]);
  });

  it("xyPxOfDeg converts deg→px with real trig", () => {
    const px = xyPxOfDeg([1, 0]);
    expect(px[0]).toBeCloseTo(1600 * Math.tan((Math.PI / 180) * 1), 6);
    expect(px[1]).toBeCloseTo(0, 8);
  });

  it("xyPxOfDeg and xyDegOfPx round-trip single points", () => {
    for (const deg of [
      [3, 4],
      [-5, 0],
      [0, 0],
      [2, -2],
    ]) {
      const px = xyPxOfDeg(deg);
      const back = xyDegOfPx(px);
      expect(back[0]).toBeCloseTo(deg[0], 4);
      expect(back[1]).toBeCloseTo(deg[1], 4);
    }
  });

  it("xyPxOfDeg and xyDegOfPx handle arrays of points", () => {
    const px = xyPxOfDeg([
      [1, 0],
      [2, 0],
    ]);
    expect(px).toHaveLength(2);
    const back = xyDegOfPx(px);
    expect(back[0][0]).toBeCloseTo(1, 4);
    expect(back[1][0]).toBeCloseTo(2, 4);
  });

  it("xyPxOfDeg and xyDegOfPx reject malformed input", () => {
    expect(() => xyPxOfDeg(5 as any)).toThrow(/xyDeg must be an array/);
    expect(() => xyPxOfDeg([[1, 2, 3]] as any)).toThrow(
      /xyDeg must be an array/,
    );
    expect(() => xyDegOfPx("nope" as any)).toThrow(/xyPx must be an array/);
    Screens[0].nearestPointXYZPx = [1, 2, 3] as any;
    expect(() => xyDegOfPx([1, 1])).toThrow(/nearPointXYPix must have length/);
  });

  it("XYPixOfXYDeg_OLD converts deg→px with real trig", () => {
    const px = XYPixOfXYDeg_OLD([1, 0]);
    expect(px[0]).toBeCloseTo(1600 * Math.tan((Math.PI / 180) * 1), 6);
    expect(px[1]).toBeCloseTo(0, 8);
  });

  it("XYPixOfXYDeg_OLD honors nominal fixation", () => {
    Screens[0].fixationConfig.nominalPos = [5, 7];
    const px = XYPixOfXYDeg_OLD([1, 0], false);
    expect(px[0]).toBeCloseTo(1600 * Math.tan((Math.PI / 180) * 1) + 5, 6);
    expect(px[1]).toBeCloseTo(7, 8);
    Screens[0].fixationConfig.nominalPos = [0, 0];
  });

  it("XYPixOfXYDeg_OLD clamps angles beyond 89 deg", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const px = XYPixOfXYDeg_OLD([100, 0]);
    // clamped to exactly 89°: 40 px/cm · 40 cm · tan(89°)
    expect(px[0]).toBeCloseTo(1600 * Math.tan((89 * Math.PI) / 180), 3);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("XYPixOfXYDeg_OLD throws when screen parameters are missing", () => {
    Screens[0] = {
      nearestPointXYZDeg: [0, 0],
      nearestPointXYZPx: [0, 0],
    } as any;
    expect(() => XYPixOfXYDeg_OLD([1, 0])).toThrow(
      /displayOptions doesn't have correct parameters/,
    );
  });

  it("XYDegOfXYPix_OLD round-trips px→deg", () => {
    const px = XYPixOfXYDeg_OLD([2, 1]);
    const deg = XYDegOfXYPix_OLD(px);
    expect(deg[0]).toBeCloseTo(2, 4);
    expect(deg[1]).toBeCloseTo(1, 4);
  });

  it("XYDegOfXYPix_OLD validates input lengths", () => {
    expect(() => XYDegOfXYPix_OLD([1, 2, 3])).toThrow(/length 2/);
    Screens[0] = {
      fixationConfig: { pos: [0, 0], nominalPos: [0, 0] },
      nearestPointXYZPx: [0, 0],
    } as any;
    expect(() => XYDegOfXYPix_OLD([1, 1])).toThrow(/nearPointXYDeg/);
  });

  it("trueCenter / offsetToTrueCenter read the stim bounding box", () => {
    const stim = {
      getBoundingBox: () => ({ x: 3, y: -2 }),
      getPos: () => [10, 10],
    };
    expect(trueCenter(stim as any)).toEqual([3, -2]);
    // offset = nominal - trueCenter = [7, 12]; shifted = nominal + offset
    expect(offsetToTrueCenter(stim as any)).toEqual([17, 22]);
    expect(offsetToTrueCenter(stim as any, [0, 0])).toEqual([-3, 2]);
  });
});

// ---------------------------------------------------------------------------
// arraysEqual, rotate
// ---------------------------------------------------------------------------

describe("array helpers", () => {
  it("arraysEqual compares element-wise", () => {
    const a = [1, 2, 3];
    expect(arraysEqual(a, a)).toBe(true);
    expect(arraysEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(arraysEqual([1, 2, 3], [1, 2])).toBe(false);
    expect(arraysEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(arraysEqual(null, [1])).toBe(false);
  });

  it("rotate moves the first element to the end", () => {
    expect(rotate([1, 2, 3])).toEqual([2, 3, 1]);
    expect(rotate(["a"])).toEqual(["a"]);
    expect(rotate([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Cursor visibility
// ---------------------------------------------------------------------------

describe("cursor visibility", () => {
  it("hideCursor/showCursor toggle the body class", () => {
    hideCursor();
    expect(document.body.classList.contains("hide-cursor")).toBe(true);
    showCursor();
    expect(document.body.classList.contains("hide-cursor")).toBe(false);
  });

  it("toShowCursor reflects the pending skip state", () => {
    const globalAny = require("../components/global") as any;
    const { skipTrialOrBlock } = globalAny;
    expect(toShowCursor()).toBe(false);
    skipTrialOrBlock.trialId = 1;
    skipTrialOrBlock.blockId = 1;
    skipTrialOrBlock.skipTrial = true;
    expect(toShowCursor()).toBe(true);
    skipTrialOrBlock.skipTrial = false;
    skipTrialOrBlock.skipBlock = true;
    expect(toShowCursor()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Data recording
// ---------------------------------------------------------------------------

describe("data recording", () => {
  const makeExperiment = () => ({
    addData: jest.fn(),
    nextEntry: jest.fn(),
  });

  it("reportStartOfNewBlock starts a new entry", () => {
    const e = makeExperiment();
    reportStartOfNewBlock(3, e as any);
    expect(e.nextEntry).toHaveBeenCalledTimes(1);
  });

  it("addTrialStaircaseSummariesToData writes QUEST summaries", () => {
    const psychoJS = { experiment: makeExperiment() };
    const loop = {
      _currentStaircase: {
        _name: "1_1",
        mean: () => 1,
        sd: () => 0.5,
        quantile: () => 0.6,
        _jsQuest: { quantileOrder: 0.5 },
      },
    };
    addTrialStaircaseSummariesToData(loop as any, psychoJS as any);
    const calls = psychoJS.experiment.addData.mock.calls;
    expect(calls).toEqual([
      ["staircaseName", "1_1"],
      ["questMeanBeforeThisTrialResponse", 1],
      ["questSDBeforeThisTrialResponse", 0.5],
      ["questQuantileOfQuantileOrderBeforeThisTrialResponse", 0.6],
    ]);
  });

  it("addTrialStaircaseSummariesToData throws without a current staircase", () => {
    expect(() =>
      addTrialStaircaseSummariesToData({} as any, { experiment: {} } as any),
    ).toThrow(/undefined currentLoop._currentStaircase/);
  });

  const makeStaircase = (name: string) => ({
    _name: name,
    mean: () => 1,
    sd: () => 0.5,
    quantile: () => 0.6,
    _jsQuest: { quantileOrder: 0.5 },
  });

  it("addBlockStaircaseSummariesToData: retina symmetry keeps inner = outer", () => {
    const psychoJS = { experiment: makeExperiment() };
    const loop = Object.assign(new MultiStairHandler(), {
      _staircases: [makeStaircase("1_1")],
      _conditions: [
        {
          thresholdParameter: "spacingDeg",
          targetEccentricityXDeg: 5,
          targetEccentricityYDeg: 0,
          spacingSymmetry: "retina",
        },
      ],
    });
    readMock.mockImplementation((p, BC) =>
      p === "conditionName" ? "condA" : undefined,
    );
    addBlockStaircaseSummariesToData(loop as any, psychoJS as any, {});
    const data = Object.fromEntries(
      psychoJS.experiment.addData.mock.calls,
    ) as any;
    // mean 1 → outer spacing 10^1; retina: inner == outer
    expect(data.innerSpacingThresholdDeg).toBeCloseTo(10, 6);
    expect(data.staircaseName).toBe("1_1");
    expect(data.conditionName).toBe("condA");
    expect(data.questMeanAtEndOfTrialsLoop).toBe(1);
    expect(psychoJS.experiment.nextEntry).not.toHaveBeenCalled();
  });

  it("addBlockStaircaseSummariesToData: cortex symmetry shrinks inner spacing", () => {
    const psychoJS = { experiment: makeExperiment() };
    const loop = Object.assign(new MultiStairHandler(), {
      _staircases: [makeStaircase("1_1")],
      _conditions: [
        {
          thresholdParameter: "spacingDeg",
          targetEccentricityXDeg: 5,
          targetEccentricityYDeg: 0,
          spacingSymmetry: "cortex",
        },
      ],
    });
    addBlockStaircaseSummariesToData(loop as any, psychoJS as any, {});
    const data = Object.fromEntries(
      psychoJS.experiment.addData.mock.calls,
    ) as any;
    // inner = e - e²/(e+outer) = 5 - 25/15
    expect(data.innerSpacingThresholdDeg).toBeCloseTo(5 - 25 / 15, 6);
  });

  it("addBlockStaircaseSummariesToData: screen symmetry uses px conversion", () => {
    const psychoJS = { experiment: makeExperiment() };
    const loop = Object.assign(new MultiStairHandler(), {
      _staircases: [makeStaircase("1_1")],
      _conditions: [
        {
          thresholdParameter: "spacingDeg",
          targetEccentricityXDeg: 5,
          targetEccentricityYDeg: 0,
          spacingSymmetry: "screen",
        },
      ],
    });
    addBlockStaircaseSummariesToData(loop as any, psychoJS as any, {});
    const data = Object.fromEntries(
      psychoJS.experiment.addData.mock.calls,
    ) as any;
    // With the linear px↔deg mock, screen symmetry reduces to retina: 10
    expect(data.innerSpacingThresholdDeg).toBeCloseTo(10, 6);
  });

  it("addBlockStaircaseSummariesToData: non-spacing threshold reports 10^mean", () => {
    const psychoJS = { experiment: makeExperiment() };
    const loop = Object.assign(new MultiStairHandler(), {
      _staircases: [makeStaircase("1_1")],
      _conditions: [{ thresholdParameter: "sizeDeg" }],
    });
    addBlockStaircaseSummariesToData(loop as any, psychoJS as any, {});
    const data = Object.fromEntries(
      psychoJS.experiment.addData.mock.calls,
    ) as any;
    expect(data.innerSpacingThresholdDeg).toBeCloseTo(10, 6);
  });

  it("addBlockStaircaseSummariesToData separates staircases with nextEntry", () => {
    const psychoJS = { experiment: makeExperiment() };
    const loop = Object.assign(new MultiStairHandler(), {
      _staircases: [makeStaircase("1_1"), makeStaircase("2_1")],
      _conditions: [{ thresholdParameter: "sizeDeg" }, {}],
    });
    addBlockStaircaseSummariesToData(loop as any, psychoJS as any, {});
    expect(psychoJS.experiment.nextEntry).toHaveBeenCalledTimes(1);
  });

  it("addBlockStaircaseSummariesToData throws on an undefined staircase", () => {
    const psychoJS = { experiment: makeExperiment() };
    const loop = Object.assign(new MultiStairHandler(), {
      _staircases: [undefined],
      _conditions: [{}],
    });
    expect(() =>
      addBlockStaircaseSummariesToData(loop as any, psychoJS as any, {}),
    ).toThrow(/undefined staircase/);
  });

  it("addBlockStaircaseSummariesToData: non-staircase loop summarizes snapshots", () => {
    const psychoJS = { experiment: makeExperiment() };
    const loop = {
      _snapshots: [{ block_condition: "1_1", conditionName: "c" }],
    };
    addBlockStaircaseSummariesToData(loop as any, psychoJS as any, {});
    const calls = psychoJS.experiment.addData.mock.calls;
    expect(calls).toContainEqual(["block_condition", "1_1"]);
    expect(calls).toContainEqual(["conditionName", "c"]);
    expect(psychoJS.experiment.nextEntry).toHaveBeenCalledTimes(1);
  });

  it("addBlockStaircaseSummariesToData: empty non-staircase loop is a no-op", () => {
    const psychoJS = { experiment: makeExperiment() };
    addBlockStaircaseSummariesToData({} as any, psychoJS as any, {});
    expect(psychoJS.experiment.addData).not.toHaveBeenCalled();
  });

  it("addApparatusInfoToData records screen metrics", () => {
    const psychoJS = { experiment: makeExperiment() };
    addApparatusInfoToData(
      { pxPerCm: 40.123456 } as any,
      { windowHeightPx: { value: 800 } } as any,
      psychoJS as any,
    );
    const data = Object.fromEntries(
      psychoJS.experiment.addData.mock.calls,
    ) as any;
    expect(data.pxPerCm).toBe(40.12);
    expect(data.screenWidthPx).toBe(window.screen.width);
    expect(data.screenHeightPx).toBe(window.screen.height);
    expect(data.fontInstancingTimesMs).toBeUndefined();
  });

  it("addApparatusInfoToData includes font instancing times when available", () => {
    (getFontInstancingTimesMs as jest.Mock).mockReturnValue([12.34, 20]);
    const {
      getFontInstancingTotalTimeMs,
    } = require("../components/fontInstancing");
    getFontInstancingTotalTimeMs.mockReturnValue(32.34);
    const psychoJS = { experiment: makeExperiment() };
    addApparatusInfoToData({ pxPerCm: 40 } as any, {} as any, psychoJS as any);
    const data = Object.fromEntries(
      psychoJS.experiment.addData.mock.calls,
    ) as any;
    expect(data.fontInstancingTimesMs).toBe("12.3, 20.0");
    expect(data.fontInstancingTotalTimeMs).toBe("32.3");
  });

  it("addConditionToData writes condition parameters and calibrate-check values", () => {
    // jsdom's window.screen is 0×0; model a real screen so the screen-bounds
    // data is meaningful.
    Object.defineProperty(window.screen, "width", {
      value: 1024,
      configurable: true,
    });
    Object.defineProperty(window.screen, "height", {
      value: 768,
      configurable: true,
    });
    initGlossary({
      glossary: {
        targetKind: { type: "string" },
        obsoleteThing: { type: "obsolete" },
      },
      version: "test",
    } as any);
    const experiment = makeExperiment();
    const reader = {
      read: (p: string, BC?: string) => {
        if (p === "_calibrateDistanceCheckCm") return ["57,43"];
        if (p === "_calibrateDistanceCheckLengthCm") return [40];
        if (p === "targetKind") return "identify";
        if (p === "digits") return ["0123456789"];
        if (p === "fontCharacterSet") return ["123"];
        return undefined;
      },
    } as any;
    status.block_condition = "1";
    addConditionToData(reader, "1_1", experiment as any, ["excludedParam"]);
    const data = Object.fromEntries(experiment.addData.mock.calls) as any;
    expect(data.block_condition).toBe("1_1");
    expect(data.targetKind).toBe("identify");
    expect(data.obsoleteThing).toBeUndefined();
    expect(data.excludedParam).toBeUndefined();
    expect(data._calibrateDistanceCheckCm).toBe("57, 43");
    expect(data._calibrateDistanceCheckLengthCm).toBe("40");
    expect(data.nearpointXYPxAppleCoords).toBe("0");
    expect(data.useWordDigitBool).toBe(true);
    expect(data.screenBoundingRectDeg).toBe("[(-12.8, -9.6), (12.8, 9.6)]");
  });
});

// ---------------------------------------------------------------------------
// Long-task recorder flush
// ---------------------------------------------------------------------------

describe("flushLongTaskRecorder", () => {
  it("flushes the shared recorder", () => {
    flushLongTaskRecorder();
    expect(mockRecorder.flushTrial).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// sendEmailForDebugging
// ---------------------------------------------------------------------------

describe("sendEmailForDebugging", () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("enriches form data with experimenter info and posts it", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;
    readMock.mockImplementation((p) =>
      p === "_authorEmails" ? " scientist@nyu.edu " : undefined,
    );
    const result = await sendEmailForDebugging({ subject: "log" });
    expect(result).toBe(false);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("formspree.io");
    const body = JSON.parse(init.body);
    expect(body.experimenterEmail).toBe("scientist@nyu.edu");
    expect(body.subject).toBe("log");
    expect(body._replyto).toBe("scientist@nyu.edu");
  });

  it("does not overwrite a caller-provided _replyto", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;
    readMock.mockImplementation((p) =>
      p === "_authorEmails" ? "a@b.c" : undefined,
    );
    await sendEmailForDebugging({ _replyto: "keep@me" });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body._replyto).toBe("keep@me");
  });

  it("reports fetch failure via warning and still resolves", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as any;
    readMock.mockImplementation(() => undefined);
    await expect(sendEmailForDebugging({})).resolves.toBe(false);
    expect(warning).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Fullscreen
// ---------------------------------------------------------------------------

describe("fullscreen", () => {
  afterEach(() => {
    teardownFullscreenMonitoring();
    clearFullscreenWasLost();
    jest.useRealTimers();
  });

  it("isFullscreen is false in jsdom", () => {
    expect(isFullscreen()).toBe(false);
  });

  it("requestNativeFullscreen returns false without a fullscreen API", async () => {
    expect(document.documentElement.requestFullscreen).toBeUndefined();
    await expect(requestNativeFullscreen()).resolves.toBe(false);
  });

  it("requireFullscreenForTrialInitiation blocks when not fullscreen", async () => {
    await expect(requireFullscreenForTrialInitiation(null)).resolves.toBe(true);
  });

  it("setupFullscreenMonitoring debounces and fires onFullscreenLost", async () => {
    jest.useFakeTimers();
    const lost = jest.fn();
    setupFullscreenMonitoring(lost);
    document.dispatchEvent(new Event("fullscreenchange"));
    // Debounced 300 ms
    expect(lost).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);
    expect(lost).toHaveBeenCalledTimes(1);
    // Latch set: still blocked
    await expect(requireFullscreenForTrialInitiation(null)).resolves.toBe(true);
  });

  it("shouldIgnoreFullscreenLost suppresses the latch and callback", () => {
    jest.useFakeTimers();
    const lost = jest.fn();
    setupFullscreenMonitoring(lost, () => true);
    document.dispatchEvent(new Event("fullscreenchange"));
    jest.advanceTimersByTime(300);
    expect(lost).not.toHaveBeenCalled();
    clearFullscreenWasLost();
  });

  it("teardownFullscreenMonitoring removes the listener", () => {
    jest.useFakeTimers();
    const lost = jest.fn();
    setupFullscreenMonitoring(lost);
    teardownFullscreenMonitoring();
    document.dispatchEvent(new Event("fullscreenchange"));
    jest.advanceTimersByTime(300);
    expect(lost).not.toHaveBeenCalled();
  });

  it("gate lets a held fullscreen through; the latch eats a restored one", async () => {
    // jsdom has no fullscreen — fake a held fullscreen element.
    const holdFullscreen = () =>
      Object.defineProperty(document, "fullscreenElement", {
        get: () => document.documentElement,
        configurable: true,
      });
    const releaseFullscreen = () => {
      delete (document as any).fullscreenElement;
    };
    holdFullscreen();
    try {
      // held + never lost → NOT blocked (the normal trial path)
      await expect(requireFullscreenForTrialInitiation(null)).resolves.toBe(
        false,
      );

      // participant drops fullscreen: latch must set even though it is
      // restored before the gate runs (the race the latch exists for)
      jest.useFakeTimers();
      const lost = jest.fn();
      setupFullscreenMonitoring(lost);
      releaseFullscreen();
      document.dispatchEvent(new Event("fullscreenchange"));
      await jest.advanceTimersByTimeAsync(300);
      expect(lost).toHaveBeenCalledTimes(1);

      holdFullscreen(); // restored before the gate...
      await expect(requireFullscreenForTrialInitiation(null)).resolves.toBe(
        true,
      ); // ...but still blocked
      clearFullscreenWasLost(); // gate acknowledges
      await expect(requireFullscreenForTrialInitiation(null)).resolves.toBe(
        false,
      );
    } finally {
      releaseFullscreen();
    }
  });
});

// ---------------------------------------------------------------------------
// threshold.js extraction helpers (batch 1). Pure logic moved out of the
// untestable monolith; see notes/DONE-threshold-extraction-batch-1.md.
// The imports live in the main utils.js import at the top of this file.
// ---------------------------------------------------------------------------

const readerWith = (
  trials: unknown[],
  enabled: unknown[],
): { read: (p: string, b: string) => unknown[] } => ({
  read: (p: string) => (p === "conditionTrials" ? trials : enabled),
});

describe("totalEnabledTrialsThisBlock", () => {
  test("sums trials of enabled conditions only", () => {
    expect(
      totalEnabledTrialsThisBlock(
        readerWith([5, 10, 3], [true, false, true]),
        "2",
      ),
    ).toBe(8);
  });
  test.each([
    [[0, 4], [true, true], 4], // 0-trial conditions contribute nothing
    [[-2, 0, 6], [true, true, true], 6], // strict c>0 excludes 0/negative
    [[1, 2, 3], [false, false, true], 3], // enabled flag paired by index
    [[1, 2], [false, false], 0], // all disabled
    [[], [], 0], // empty block
  ])("trials %p enabled %p → %p", (trials, enabled, expected) => {
    expect(totalEnabledTrialsThisBlock(readerWith(trials, enabled), "1")).toBe(
      expected,
    );
  });
});

describe("maxViewingDistanceCmForScreenWidthDeg", () => {
  test("needScreenWidthDeg 0 means unconstrained → Infinity", () => {
    expect(maxViewingDistanceCmForScreenWidthDeg(34.5, 0)).toBe(Infinity);
  });
  test("width / (2·tan(deg/2)) for a typical laptop panel", () => {
    const expected = 34.5 / (2 * Math.tan((40 / 2) * (Math.PI / 180)));
    expect(maxViewingDistanceCmForScreenWidthDeg(34.5, 40)).toBeCloseTo(
      expected,
      12,
    );
  });
  test("inverse relationship: from the max distance the screen subtends deg", () => {
    const width = 30;
    const deg = 60;
    const d = maxViewingDistanceCmForScreenWidthDeg(width, deg);
    const regained = (2 * Math.atan(width / 2 / d) * 180) / Math.PI;
    expect(regained).toBeCloseTo(deg, 9);
  });
  test("wider allowed angle → smaller max distance", () => {
    expect(maxViewingDistanceCmForScreenWidthDeg(34.5, 80)).toBeLessThan(
      maxViewingDistanceCmForScreenWidthDeg(34.5, 20),
    );
  });
});

describe("lastConditionNamed", () => {
  const conds = [
    { block_condition: "1_a", v: 1 },
    { block_condition: "1_b", v: 2 },
    { block_condition: "1_a", v: 3 },
  ];
  test("returns the LAST matching condition (original loop never breaks)", () => {
    expect(lastConditionNamed(conds, "1_a").v).toBe(3);
  });
  test("unique name → that condition", () => {
    expect(lastConditionNamed(conds, "1_b").v).toBe(2);
  });
  test("no match / empty → undefined", () => {
    expect(lastConditionNamed(conds, "9_z")).toBeUndefined();
    expect(lastConditionNamed([], "1_a")).toBeUndefined();
  });
});

describe("currentViewingDistanceCm", () => {
  test("measured rc distance wins", () => {
    expect(currentViewingDistanceCm({ value: 57 }, 40, 100)).toBe(57);
  });
  test.each([
    ["desired below max → desired", undefined, 40, Infinity, 40],
    ["desired beyond max → max", undefined, 120, 100, 100],
  ])("%s", (_label, rc, desired, max, expected) => {
    expect(currentViewingDistanceCm(rc, desired, max)).toBe(expected);
  });
  test("rc signal present but value undefined → undefined propagates (current behavior)", () => {
    expect(currentViewingDistanceCm({} as any, 40, 100)).toBeUndefined();
  });
});
