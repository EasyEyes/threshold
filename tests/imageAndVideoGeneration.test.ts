/**
 * RED test: Movie evaluateJSCode passes xyDeg array as iScreen to XYPxOfDeg.
 *
 * Movie compute JS files call coordinate conversion with the OLD 2-arg convention:
 *   XYPixOfXYDeg(xyDeg, displayOptions)
 * But evaluateJSCode maps them directly to XYPxOfDeg(iScreen, xyDeg, ...),
 * which expects a screen index as first argument.
 *
 * Result: iScreen receives a [x, y] array → Screens["x,y"] → undefined → crash.
 *
 * @jest-environment node
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockXYPxOfDeg = jest.fn((iScreen, xyDeg) => [0, 0]);
const mockXYDegOfPx = jest.fn((iScreen, xyPx) => [0, 0]);

jest.mock("../components/multiple-displays/utils.ts", () => ({
  XYPxOfDeg: mockXYPxOfDeg,
  XYDegOfPx: mockXYDegOfPx,
}));

jest.mock("../components/global", () => ({
  displayOptions: {
    window: {
      _size: [800, 600],
    },
  },
}));

jest.mock("../components/globalPsychoJS", () => ({
  psychoJS: {
    experiment: { addData: jest.fn() },
  },
}));

jest.mock("../components/utils", () => ({
  logger: { log: jest.fn() },
  xyPxOfDeg: jest.fn(),
  xyDegOfPx: jest.fn(),
  isRectInRect: jest.fn(),
  Rectangle: jest.fn(function (a, b) {
    return [a, b];
  }),
}));

jest.mock("../components/transformColorSpace.js", () => ({
  im_ctrans: jest.fn(),
}));

jest.mock("../components/reading.ts", () => ({
  preprocessRawCorpus: (s: string) => s,
}));

jest.mock("image-js", () => ({
  Image: { load: jest.fn() },
}));

let mockAxiosGet = jest.fn();
jest.mock("axios", () => ({
  get: (...args: unknown[]) => mockAxiosGet(...args),
  default: { get: (...args: unknown[]) => mockAxiosGet(...args) },
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { evaluateJSCode } from "../components/imageAndVideoGeneration.js";

// ── Minimal compute JS ─────────────────────────────────────────────────────

const simpleComputeJS = `function testMovie(
  questSuggestedLevel,
  targetCharacter,
  XYPixOfXYDeg,
  XYDegOfXYPix,
  targetEccentricityXDeg,
  displayOptions
) {
  var xyPx = XYPixOfXYDeg([1.5, 2.0], displayOptions);
  var xyDeg = XYDegOfXYPix([100, 200], displayOptions);
  return [0, questSuggestedLevel];
}`;

// ── Helpers ────────────────────────────────────────────────────────────────

function makeParamReader(overrides: Record<string, string> = {}) {
  return {
    read: jest.fn((name: string, _bc?: string) => {
      if (name === "movieComputeJS") return "testMovie.js";
      if (name === "movieHz") return "60";
      if (name in overrides) return overrides[name];
      return "";
    }),
  };
}

function makeStatus(block_condition = "1_1") {
  return { block_condition };
}

function makeDisplayOptions() {
  return {
    window: { _size: [800, 600] },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("evaluateJSCode — coordinate mapping", () => {
  beforeEach(() => {
    mockXYPxOfDeg.mockClear();
    mockXYDegOfPx.mockClear();
    mockAxiosGet.mockClear();
  });

  test("XYPixOfXYDeg wraps to XYPxOfDeg with iScreen=0, discarding legacy displayOptions", async () => {
    mockAxiosGet.mockResolvedValue({ data: simpleComputeJS });

    const paramReader = makeParamReader();
    const status = makeStatus();
    const displayOpts = makeDisplayOptions();
    const psychoJS = { experiment: { addData: jest.fn() } };

    await evaluateJSCode(
      paramReader,
      status,
      displayOpts,
      "H",
      -1,
      psychoJS as any,
    );

    expect(mockXYPxOfDeg).toHaveBeenCalled();
    const callArgs = mockXYPxOfDeg.mock.calls[0];

    // GREEN: first arg is iScreen=0, xyDeg array is second arg
    expect(callArgs[0]).toBe(0);
    expect(callArgs[1]).toEqual([1.5, 2.0]);
  });

  test("XYDegOfXYPix wraps to XYDegOfPx with iScreen=0, discarding legacy displayOptions", async () => {
    mockAxiosGet.mockResolvedValue({ data: simpleComputeJS });

    const paramReader = makeParamReader();
    const status = makeStatus();
    const displayOpts = makeDisplayOptions();
    const psychoJS = { experiment: { addData: jest.fn() } };

    await evaluateJSCode(
      paramReader,
      status,
      displayOpts,
      "H",
      -1,
      psychoJS as any,
    );

    expect(mockXYDegOfPx).toHaveBeenCalled();
    const callArgs = mockXYDegOfPx.mock.calls[0];

    // GREEN: first arg is iScreen=0, xyPx array is second arg
    expect(callArgs[0]).toBe(0);
    expect(callArgs[1]).toEqual([100, 200]);
  });
});
