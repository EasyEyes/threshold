/**
 * RED: runDiagnosisReport crashes with "Cannot read properties of null
 * (reading 'getParameter')" when the browser cannot create a WebGL context.
 *
 * Seen in production: a participant whose browser/machine gave no WebGL
 * context (canvas.getContext("webgl2"/"webgl"/"experimental-webgl") all
 * null). The report handles null `gl` for the basic info, but then
 * unconditionally reads gl.getParameter(gl.MAX_TEXTURE_SIZE) and
 * gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0] — a fatal error at block 0,
 * before the experiment even starts. That participant failed 6 times in a
 * row and could never run the study.
 *
 * jsdom has no canvas rendering, so getContext returns null naturally —
 * exactly the failing environment.
 *
 * Desired: no throw; the recorded report says WebGL is unavailable.
 *
 * @jest-environment jsdom
 */

const addData = jest.fn();

// jsdom lacks PerformanceObserver; runDiagnosisReport only observes longtasks.
globalThis.PerformanceObserver =
  globalThis.PerformanceObserver ??
  class {
    observe() {}
    disconnect() {}
  };

jest.mock("../components/global", () => ({
  displayOptions: {},
  eyeTrackingStimulusRecords: {},
  fixationConfig: {},
  skipTrialOrBlock: {},
  status: {},
  targetEccentricityDeg: {},
  thisExperimentInfo: {},
  viewingDistanceCm: {},
}));

jest.mock("../components/globalPsychoJS", () => ({
  psychoJS: { experiment: { addData }, logger: { debug() {}, warn() {} } },
  psychojsMouse: {},
  to_px: (v) => v,
}));

jest.mock("../parameters/glossaryRegistry", () => ({
  getGlossary: () => ({}),
}));

jest.mock("../threshold", () => ({
  paramReader: { read: () => [0] },
}));

jest.mock("../components/eyeTrackingFacilitation", () => ({
  getAppleCoordinatePosition: () => ({}),
}));

jest.mock("../components/readingAddons", () => ({
  pxToPt: (v) => v,
}));

jest.mock("../components/errorHandling", () => ({
  warning: jest.fn(),
}));

jest.mock("../components/multiple-displays/globals.ts", () => ({
  Screens: [],
}));

jest.mock("../components/multiple-displays/utils.ts", () => ({
  XYDegOfPx: () => [0, 0],
  XYPxOfDeg: () => [0, 0],
}));

jest.mock("../components/readPhrases", () => ({
  useWordDigitBool: () => false,
}));

jest.mock("../components/letter", () => ({
  logWebGLInfoToFormspree: jest.fn(),
}));

jest.mock("../components/fontInstancing.ts", () => ({
  getFontInstancingTimesMs: () => [],
  getFontInstancingTotalTimeMs: () => 0,
}));

import { runDiagnosisReport } from "../components/utils";

describe("runDiagnosisReport without WebGL", () => {
  test("does not throw when no WebGL context is available", () => {
    expect(() => runDiagnosisReport()).not.toThrow();
  });

  test("records WebGL unavailable in the report", () => {
    addData.mockClear();
    runDiagnosisReport();
    const versionCall = addData.mock.calls.find(([k]) => k === "WebGLVersion");
    expect(versionCall).toBeDefined();
    expect(versionCall[1]).toMatch(/not supported/i);
  });
});
