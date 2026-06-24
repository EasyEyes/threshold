/**
 * @jest-environment jsdom
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

// Real MinimalStim / ParamReader shapes (the installers mutate their
// prototypes, so we need the real classes, not fakes — but stubbed enough
// to load without dragging in PsychoJS's full runtime).
jest.mock("../../../psychojs/src/core/MinimalStim.js", () => {
  class FakeMinimalStim {
    _reportChange(_attr: string, _val: unknown): void {}
  }
  return { MinimalStim: FakeMinimalStim };
});
jest.mock("../../../parameters/paramReader.js", () => {
  class FakeParamReader {
    has(_name: string): boolean {
      return false;
    }
    read(_name: string, _bc?: string | number): unknown {
      return undefined;
    }
  }
  return { ParamReader: FakeParamReader };
});

import {
  setupInstrumentation,
  installRcDebugDefaults,
  startSimulatedParticipant,
  stopSimulatedParticipant,
} from "../../../components/simulatedParticipant";
import { MinimalStim } from "../../../psychojs/src/core/MinimalStim.js";
import { ParamReader } from "../../../parameters/paramReader.js";
import { setEEState, SIM_PHASE } from "../../../components/simulatedState";

// Capture the unwrapped prototype references at module-load time, before any
// test in this file has invoked setupInstrumentation(). Later tests would
// otherwise see the already-wrapped prototype.
const MIN_STIM_REPORT_BEFORE = MinimalStim.prototype._reportChange;
const PARAM_READ_BEFORE = ParamReader.prototype.read;

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("setupInstrumentation — composition", () => {
  // NOTE: Assumes simulateActive starts false (module default). If another
  // test file in the same Jest worker calls activateSimulation() without
  // jest.resetModules(), this check would produce a false negative.
  test("activateSimulation flips simulateActive true (setEEState becomes live)", () => {
    // Before: setEEState is a no-op (no #ee-state created).
    setEEState({ phase: SIM_PHASE.LOADING });
    expect(document.getElementById("ee-state")).toBeNull();

    setupInstrumentation();

    // After: setEEState writes attributes.
    setEEState({ phase: SIM_PHASE.RESPONSE });
    const el = document.getElementById("ee-state");
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-phase")).toBe("response");
  });

  test("wraps MinimalStim.prototype._reportChange (reference changes)", () => {
    setupInstrumentation();
    expect(MinimalStim.prototype._reportChange).not.toBe(
      MIN_STIM_REPORT_BEFORE,
    );
  });

  test("MinimalStim._reportChange now publishes to #ee-state via stimChangeReporter", () => {
    setupInstrumentation();
    // _reportChange is invoked by _setAttribute in production. We call it
    // directly here to verify the wrapping wired it to setEEState.
    (MinimalStim.prototype as any)._reportChange.call(
      { _name: "target" },
      "autoDraw",
      true,
    );
    const el = document.getElementById("ee-state");
    expect(el?.getAttribute("data-stim-target-auto-draw")).toBe("true");
  });

  test("wraps ParamReader.prototype.read (emits [sim:read] debug log)", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    setupInstrumentation();
    const r = new (ParamReader as any)();
    r.read("targetKind", "1_1");
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[sim:read\] targetKind\["1_1"\]/),
    );
    spy.mockRestore();
  });

  test("installs window error listener (emits [sim:error] on error event)", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    setupInstrumentation();
    window.dispatchEvent(
      new ErrorEvent("error", { message: "boom from setupInstrumentation" }),
    );
    expect(spy).toHaveBeenCalledWith(
      "[sim:error] boom from setupInstrumentation",
    );
    spy.mockRestore();
  });

  test("installs window unhandledrejection listener", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    setupInstrumentation();
    const ev = new Event("unhandledrejection");
    Object.defineProperty(ev, "reason", {
      value: new Error("async boom"),
      configurable: true,
    });
    window.dispatchEvent(ev);
    expect(spy).toHaveBeenCalledWith(
      "[sim:error] Unhandled rejection: async boom",
    );
    spy.mockRestore();
  });

  test("is idempotent: calling twice does not double-wrap", () => {
    setupInstrumentation();
    const afterRead = ParamReader.prototype.read;
    const afterReport = MinimalStim.prototype._reportChange;
    setupInstrumentation();
    // Reference equality preserved (the installers' WeakSet / boolean guards
    // prevent re-wrapping).
    expect(ParamReader.prototype.read).toBe(afterRead);
    expect(MinimalStim.prototype._reportChange).toBe(afterReport);
    // And both remain wrapped (different from the originals).
    expect(ParamReader.prototype.read).not.toBe(PARAM_READ_BEFORE);
    expect(MinimalStim.prototype._reportChange).not.toBe(
      MIN_STIM_REPORT_BEFORE,
    );
  });
});

describe("installRcDebugDefaults — rc flags", () => {
  test("sets _cameraSelectionDone and calibrationSimulatedBool when rc is loaded", () => {
    const rc: any = ((window as any).RemoteCalibrator = {});
    expect(rc._cameraSelectionDone).toBeUndefined();
    expect(rc.calibrationSimulatedBool).toBeUndefined();

    installRcDebugDefaults();

    expect(rc._cameraSelectionDone).toBe(true);
    expect(rc.calibrationSimulatedBool).toBe(true);
  });

  test("is idempotent (guarded by rcDefaultsInstalled)", () => {
    const rc: any = ((window as any).RemoteCalibrator = {
      _cameraSelectionDone: false,
      calibrationSimulatedBool: false,
    });
    // Already installed by the prior test in this file (module-level guard).
    installRcDebugDefaults();
    // Guard short-circuited — values unchanged.
    expect(rc._cameraSelectionDone).toBe(false);
    expect(rc.calibrationSimulatedBool).toBe(false);
  });
});

describe("startSimulatedParticipant — audio stub", () => {
  test("stubs HTMLMediaElement.prototype.play to resolve (no autoplay crash)", async () => {
    const originalPlay = HTMLMediaElement.prototype.play;
    startSimulatedParticipant();
    try {
      // The stub should return a resolved Promise, not reject.
      const audio = new Audio();
      const result = audio.play();
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBe(audio);
    } finally {
      // Restore + stop the polling interval.
      HTMLMediaElement.prototype.play = originalPlay;
      stopSimulatedParticipant();
    }
  });
});
