import { jest, expect, describe, test, beforeEach } from "@jest/globals";

// ── dependency mocks ──────────────────────────────────────────────────────────
// All factories must be self-contained (jest.mock is hoisted before imports).
// Avoid chaining .mockResolvedValue() inside factories — TypeScript infers
// jest.fn() return type as `never` there, causing TS2345 errors.

jest.mock("../psychojs/src/core/index.js", () => ({
  PsychoJS: { Status: { FINISHED: "FINISHED" } },
}));

jest.mock("../psychojs/src/util/index.js", () => ({
  Scheduler: { Event: { QUIT: "QUIT" } },
}));

jest.mock("../psychojs/src/data/ExperimentHandler.js", () => ({
  ExperimentHandler: { Environment: { SERVER: "SERVER" } },
}));

jest.mock("../components/globalPsychoJS", () => {
  const experiment = {
    experimentEnded: false,
    addData: jest.fn(),
    save: jest.fn(),
    isEntryEmpty: jest.fn(),
    nextEntry: jest.fn(),
    saveCSV: jest.fn(),
  };
  return {
    clock: { global: { getTime: jest.fn() } },
    psychoJS: {
      _experiment: experiment,
      _status: null,
      experiment,
      gui: {
        dialog: jest.fn(),
        displayMessage: jest.fn(),
        closeDialog: jest.fn(),
      },
      window: { close: jest.fn(), _windowAlreadyInFullScreen: false },
      quit: jest.fn(),
    },
  };
});

jest.mock("../components/global", () => ({
  eyeTrackingStimulusRecords: [],
  localStorageKey: "__EASYEYES__",
  rc: {
    endGaze: jest.fn(),
    endNudger: jest.fn(),
    endDistance: jest.fn(),
    isFullscreen: { value: false },
    language: { value: "en" },
    id: { value: "test-id" },
  },
  showCharacterSetResponse: { current: null },
  thisExperimentInfo: { participant: "" },
  microphoneCalibrationResults: [],
  cursorTracking: { records: [] },
  status: { consentGiven: false },
}));

jest.mock("../components/recruitmentService", () => ({
  recruitmentServiceData: { name: "", url: "" },
}));

jest.mock("../components/forms", () => ({
  showForm: jest.fn(),
  hideForm: jest.fn(),
  showDebriefFollowUp: jest.fn(),
}));

jest.mock("../components/instructions.js", () => ({
  removeBeepButton: jest.fn(),
  removeProceedButton: jest.fn(),
}));

jest.mock("../components/progressBar.js", () => ({
  destroyExperimentProgressBar: jest.fn(),
}));

jest.mock("../components/showCharacterSet", () => ({
  removeClickableCharacterSet: jest.fn(),
}));

// Mutable holder so tests can flip the gated flag without fighting Jest's
// mock-object freezing. The mock factory below closes over this object.
const simState = { active: false };

jest.mock("../components/simulatedState", () => ({
  setEEState: jest.fn(),
  publishSummary: jest.fn(),
  // Live-binding stand-in: lifetime.js reads this each call.
  get simulateActive() {
    return simState.active;
  },
  SIM_PHASE: {
    LOADING: "loading",
    COMPATIBILITY: "compatibility",
    CONSENT: "consent",
    CALIBRATION: "calibration",
    INSTRUCTIONS: "instructions",
    FIXATION: "fixation",
    STIMULUS: "stimulus",
    RESPONSE: "response",
    READING: "reading",
    DEBRIEF: "debrief",
    COMPLETE: "complete",
  },
}));

jest.mock("../components/utils", () => ({
  showCursor: jest.fn(),
  sleep: jest.fn(),
}));

jest.mock("../components/connectMatlab", () => ({
  useMatlab: { current: false },
  closeMatlab: jest.fn(),
}));

jest.mock("../components/readPhrases.js", () => ({
  readi18nPhrases: jest.fn(),
}));

jest.mock("../components/externalServices.ts", () => ({
  isProlificExperiment: jest.fn(),
}));

// ── imports (after mocks are registered) ─────────────────────────────────────

import { psychoJS } from "../components/globalPsychoJS";
import { quitPsychoJS } from "../components/lifetime";
import * as simulatedState from "../components/simulatedState";
import { recruitmentServiceData } from "../components/recruitmentService";

// ── helpers ───────────────────────────────────────────────────────────────────

/** Toggle the gated `simulateActive` flag in the simulatedState mock. */
function setSimulateActive(value: boolean) {
  simState.active = value;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const mockParamReader = { read: jest.fn() };

function mocks() {
  const p = psychoJS as any;
  return {
    dialog: p.gui.dialog as jest.Mock,
    closeDialog: p.gui.closeDialog as jest.Mock,
    save: p.experiment.save as jest.Mock,
    quit: p.quit as jest.Mock,
    clockGetTime: p._psychoJS?.clock?.global?.getTime as jest.Mock,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: real-participant mode (sim off). Tests that need sim-on flip it.
  setSimulateActive(false);
  const p = psychoJS as any;
  // Restore default implementations after clearAllMocks wipes them.
  p.experiment.save.mockResolvedValue(undefined);
  p.quit.mockResolvedValue(undefined);
  p.experiment.isEntryEmpty.mockReturnValue(false);
  // clock is on the separate `clock` export; grab it via require
  const { clock } = require("../components/globalPsychoJS");
  clock.global.getTime.mockReturnValue(100);
  // Reset duplicate-call guard.
  p._experiment.experimentEnded = false;
  p._status = null;
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("quitPsychoJS — save-then-quit orchestration", () => {
  // ── tracer bullet ──────────────────────────────────────────────────────────
  test("calls psychoJS.quit() with skipSave: true", async () => {
    const { quit } = mocks();

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect(quit).toHaveBeenCalledTimes(1);
    expect(quit.mock.calls[0][0]).toMatchObject({ skipSave: true });
  });

  // ── publishSummary fires on the non-Prolific quit path ─────────────────────
  test("calls publishSummary on the non-Prolific quit path (isCompleted=true) WHEN simulateActive=true", async () => {
    setSimulateActive(true);
    recruitmentServiceData.name = ""; // non-Prolific → else branch in lifetime.js

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect(simulatedState.publishSummary).toHaveBeenCalledTimes(1);
    expect(simulatedState.publishSummary).toHaveBeenCalledWith(
      expect.objectContaining({ trialsCompleted: expect.anything() }),
    );
  });

  // ── publishSummary fires on the Prolific quit path ─────────────────────────
  test("calls publishSummary on the Prolific quit path (recruitmentServiceData.name='Prolific', isCompleted=true) WHEN simulateActive=true", async () => {
    setSimulateActive(true);
    recruitmentServiceData.name = "Prolific";

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect(simulatedState.publishSummary).toHaveBeenCalledTimes(1);
    expect(simulatedState.publishSummary).toHaveBeenCalledWith(
      expect.objectContaining({ trialsCompleted: expect.anything() }),
    );
  });

  // ── NEW INVARIANT: gating skips publishSummary when sim is off ─────────────
  test("does NOT call publishSummary when simulateActive=false (real participant)", async () => {
    setSimulateActive(false);
    recruitmentServiceData.name = "";

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect(simulatedState.publishSummary).not.toHaveBeenCalled();
  });

  // ── no saving-wait dialog (deliberately removed, bb677030) ────────────────
  test("does not show a saving-wait dialog, but still saves before quitting", async () => {
    const { dialog, save, quit } = mocks();
    const callOrder: string[] = [];

    save.mockImplementation(() => {
      callOrder.push("save");
      return Promise.resolve();
    });
    quit.mockImplementation(() => {
      callOrder.push("quit");
      return Promise.resolve();
    });

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect(dialog).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
    expect(callOrder.indexOf("save")).toBeLessThan(callOrder.indexOf("quit"));
  });

  // ── save resolves before quit is called ────────────────────────────────────
  test("experiment.save() resolves before psychoJS.quit() is called", async () => {
    const { save, quit } = mocks();
    const callOrder: string[] = [];
    let saveResolved = false;

    save.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          Promise.resolve().then(() => {
            saveResolved = true;
            callOrder.push("save-resolved");
            resolve();
          });
        }),
    );
    quit.mockImplementation(() => {
      callOrder.push("quit");
      if (!saveResolved) throw new Error("quit called before save resolved");
      return Promise.resolve();
    });

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect(callOrder.indexOf("save-resolved")).toBeLessThan(
      callOrder.indexOf("quit"),
    );
  });

  // ── save error does not hang the experiment ────────────────────────────────
  test("psychoJS.quit() is still called with skipSave:true when experiment.save() rejects", async () => {
    const { save, quit } = mocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (save as any).mockRejectedValue(new Error("network error"));

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect(quit).toHaveBeenCalledTimes(1);
    expect(quit.mock.calls[0][0]).toMatchObject({ skipSave: true });
  });

  // ── no closeDialog either (removed with the dialog, bb677030) ─────────────
  test("does not call closeDialog; quit still waits for save to complete", async () => {
    const { closeDialog, save, quit } = mocks();
    const callOrder: string[] = [];

    save.mockImplementation(() => {
      callOrder.push("save");
      return Promise.resolve();
    });
    quit.mockImplementation(() => {
      callOrder.push("quit");
      return Promise.resolve();
    });

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect(closeDialog).not.toHaveBeenCalled();
    expect(callOrder.indexOf("save")).toBeLessThan(callOrder.indexOf("quit"));
  });
});
