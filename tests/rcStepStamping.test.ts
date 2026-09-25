/**
 * RC calibration sub-step breadcrumb (Feature: stamp RC sub-steps into
 * currentFunction).
 *
 * `setCurrentFn("rcCalibration")` covers the whole RemoteCalibrator panel,
 * so a participant who quits 7 minutes into the paper-card distance
 * calibration is indistinguishable from one who quit the 10-second screen
 * size step (Acuity2026-9: both fullscreenExit quitters died inside
 * rcCalibration with no sub-step recorded). RC exposes its active panel
 * task via `rc.panelState.activeTask` (no step-change event), so the host
 * polls it and restamps currentFunction as `rcCalibration:<task>`.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  jest,
} from "@jest/globals";

import {
  RC_CALIBRATION_FN,
  rcStepFunctionName,
  watchRcPanelSteps,
} from "../components/rcStepStamping";

describe("rcStepFunctionName", () => {
  test("active RC panel task → rcCalibration:<task>", () => {
    expect(rcStepFunctionName("screenSize")).toBe("rcCalibration:screenSize");
    expect(rcStepFunctionName("measureDistance")).toBe(
      "rcCalibration:measureDistance",
    );
    expect(rcStepFunctionName("trackGaze")).toBe("rcCalibration:trackGaze");
  });

  test("no active task → plain rcCalibration phase name", () => {
    expect(rcStepFunctionName(null)).toBe(RC_CALIBRATION_FN);
    expect(rcStepFunctionName(undefined)).toBe("rcCalibration");
    expect(rcStepFunctionName("")).toBe("rcCalibration");
  });

  test("non-string or unsafe task names come out CSV/grammar-safe", () => {
    expect(rcStepFunctionName(42)).toBe("rcCalibration");
    expect(rcStepFunctionName({})).toBe("rcCalibration");
    expect(rcStepFunctionName("bad step!name")).toBe(
      "rcCalibration:badstepname",
    );
  });
});

describe("watchRcPanelSteps", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test("stamps each sub-step as RC's activeTask advances (and only on change)", () => {
    const rc = { panelState: { activeTask: null } };
    const stamps: string[] = [];
    const stop = watchRcPanelSteps(rc, (name) => stamps.push(name));

    jest.advanceTimersByTime(500); // panel opened, no task active yet
    rc.panelState.activeTask = "screenSize";
    jest.advanceTimersByTime(500);
    rc.panelState.activeTask = "measureDistance";
    jest.advanceTimersByTime(1500); // long task: no duplicate stamps
    stop();
    rc.panelState.activeTask = "trackDistance";
    jest.advanceTimersByTime(2000); // stopped: nothing more

    expect(stamps).toEqual([
      "rcCalibration",
      "rcCalibration:screenSize",
      "rcCalibration:measureDistance",
    ]);
  });

  test("task completing (activeTask → null) restamps the plain phase name", () => {
    const rc = { panelState: { activeTask: "screenSize" } };
    const stamps: string[] = [];
    const stop = watchRcPanelSteps(rc, (name) => stamps.push(name));
    jest.advanceTimersByTime(500);
    rc.panelState.activeTask = null;
    jest.advanceTimersByTime(500);
    stop();
    expect(stamps).toEqual(["rcCalibration:screenSize", "rcCalibration"]);
  });

  test("old RC build without panelState: stamps only the plain phase name", () => {
    const stamps: string[] = [];
    const stop = watchRcPanelSteps({}, (name) => stamps.push(name));
    jest.advanceTimersByTime(1500);
    stop();
    expect(stamps).toEqual(["rcCalibration"]);
  });

  test("rc itself absent (defensive): still safe, one plain stamp", () => {
    const stamps: string[] = [];
    const stop = watchRcPanelSteps(null, (name) => stamps.push(name));
    jest.advanceTimersByTime(500);
    stop();
    expect(stamps).toEqual(["rcCalibration"]);
  });
});
