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
      gui: { dialog: jest.fn(), displayMessage: jest.fn() },
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

// ── helpers ───────────────────────────────────────────────────────────────────

const mockParamReader = { read: jest.fn() };

function mocks() {
  const p = psychoJS as any;
  return {
    dialog: p.gui.dialog as jest.Mock,
    save: p.experiment.save as jest.Mock,
    quit: p.quit as jest.Mock,
    clockGetTime: p._psychoJS?.clock?.global?.getTime as jest.Mock,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
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

  // ── wait dialog shown before save resolves ─────────────────────────────────
  test("shows wait dialog before experiment.save() resolves", async () => {
    const { dialog, save } = mocks();
    const callOrder: string[] = [];

    dialog.mockImplementation(() => callOrder.push("dialog"));
    save.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          callOrder.push("save-start");
          resolve();
        }),
    );

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect(callOrder[0]).toBe("dialog");
    expect(callOrder).toContain("save-start");
    expect(callOrder.indexOf("dialog")).toBeLessThan(
      callOrder.indexOf("save-start"),
    );
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
});
