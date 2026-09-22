/**
 * @jest-environment jsdom
 *
 * Termination-column routing (Denis's rule): the unmetNeeds column holds
 * ONLY true unmet needs — underscore glossary parameters (e.g.
 * _needMemoryGB, _screenColorSpace) — while every termination LABEL
 * (fullscreenExit, participant:tabClosed:…, rc:…, _crash:…, and the
 * one-word legacy codes) lands in the error column, where Shiny can link
 * each label to the EasyEyes Error Table.
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

// ── dependency mocks (same shape as lifetime.test.ts) ────────────────────────

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
    _currentTrialData: {},
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
  status: {
    consentGiven: false,
    currentFunction: "",
    nthBlock: undefined,
    trial: undefined,
    terminated: false,
  },
  totalBlocks: { current: 31 },
  totalTrialsThisBlock: { current: 40 },
  rsvpSpeechRuntime: { controller: undefined },
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

jest.mock("../components/simulatedState", () => ({
  setEEState: jest.fn(),
  publishSummary: jest.fn(),
  simulateActive: false,
  SIM_PHASE: { DEBRIEF: "debrief" },
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

jest.mock("../components/speech/speechPreflight.ts", () => ({
  cancelActiveRsvpSpeechPreflight: jest.fn(),
}));

jest.mock("../components/rsvpSpeech/rsvpSpeechRuntime.ts", () => ({
  hasActiveRsvpSpeechResources: jest.fn(() => false),
  closeActiveRsvpSpeechTrial: jest.fn(),
}));

// ── imports ───────────────────────────────────────────────────────────────────

import { psychoJS } from "../components/globalPsychoJS";
import { quitPsychoJS, stampUnloadExit } from "../components/lifetime";

const mockParamReader = { read: jest.fn() };
const { status } = require("../components/global");

const addData = () => (psychoJS as any).experiment.addData as jest.Mock;
const cells = (column: string) =>
  addData()
    .mock.calls.filter(([k]) => k === column)
    .map(([, v]) => v);

beforeEach(() => {
  jest.clearAllMocks();
  const p = psychoJS as any;
  p.experiment.save.mockResolvedValue(undefined);
  p.quit.mockResolvedValue(undefined);
  p.experiment.isEntryEmpty.mockReturnValue(true);
  p._experiment.experimentEnded = false;
  p._status = null;
  p._experiment._currentTrialData = {};
  p._experiment.__unloadStamped = false;
  status.currentFunction = "";
  status.nthBlock = undefined;
  status.trial = undefined;
  status.terminated = false;
});

// ── splitTerminationColumns — the pure router ─────────────────────────────────

import { splitTerminationColumns } from "../components/lifetime";

describe("splitTerminationColumns — needs stay, labels move to error", () => {
  test("pure label → all of it to error, none to unmetNeeds", () => {
    expect(splitTerminationColumns("fullscreenExit")).toEqual({
      unmetNeeds: "",
      error: "fullscreenExit",
    });
  });

  test("pure unmet need → stays in unmetNeeds, error empty", () => {
    expect(splitTerminationColumns("_needMemoryGB")).toEqual({
      unmetNeeds: "_needMemoryGB",
      error: "",
    });
  });

  test("underscore requirement that is not _need* is still a need", () => {
    expect(splitTerminationColumns("_screenColorSpace")).toEqual({
      unmetNeeds: "_screenColorSpace",
      error: "",
    });
  });

  test("_crash is a label, not a need — moves to error", () => {
    expect(splitTerminationColumns("_crash:trialRoutineEnd:Error:fn")).toEqual({
      unmetNeeds: "",
      error: "_crash:trialRoutineEnd:Error:fn",
    });
  });

  test("mixed needs+label splits across the two columns, order kept", () => {
    expect(
      splitTerminationColumns("_needMemoryGB,compatibilityNotMet"),
    ).toEqual({ unmetNeeds: "_needMemoryGB", error: "compatibilityNotMet" });
    expect(
      splitTerminationColumns("compatibilityNotMet,_needBrowser,_needMemoryGB"),
    ).toEqual({
      unmetNeeds: "_needBrowser,_needMemoryGB",
      error: "compatibilityNotMet",
    });
  });

  test("commas inside parentheses do not split (rc detail suffix)", () => {
    const rc = "rc:cameraReconnectPopup:quit(status=ended,camera=HD,min=12.4)";
    expect(splitTerminationColumns(rc)).toEqual({
      unmetNeeds: "",
      error: rc,
    });
    expect(splitTerminationColumns(`_needMemoryGB,${rc}`)).toEqual({
      unmetNeeds: "_needMemoryGB",
      error: rc,
    });
  });

  test("empty string → both empty", () => {
    expect(splitTerminationColumns("")).toEqual({ unmetNeeds: "", error: "" });
  });
});

// ── quitPsychoJS — the final audit row ────────────────────────────────────────

describe("quitPsychoJS writes the label to the error column", () => {
  test("fullscreenExit → error column, no unmetNeeds cell at all", async () => {
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "fullscreenExit",
    );
    expect(cells("error")).toEqual(["fullscreenExit"]);
    expect(cells("unmetNeeds")).toEqual([]);
  });

  test("escapeKey → error column", async () => {
    await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");
    expect(cells("error")).toEqual(["escapeKey"]);
  });

  test("tabClosed-style label → error column", async () => {
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "participant:tabClosed:compatibilityFlow",
    );
    expect(cells("error")).toEqual(["participant:tabClosed:compatibilityFlow"]);
    expect(cells("unmetNeeds")).toEqual([]);
  });

  test("_crash label → error column (not unmetNeeds, despite underscore)", async () => {
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "_crash:trialRoutineEnd:Error:QuestHandler.addResponse",
    );
    expect(cells("error")).toEqual([
      "_crash:trialRoutineEnd:Error:QuestHandler.addResponse",
    ]);
    expect(cells("unmetNeeds")).toEqual([]);
  });

  test("pure unmet needs stay in unmetNeeds; no error cell", async () => {
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "_needMemoryGB,_needBrowser",
    );
    expect(cells("unmetNeeds")).toEqual(["_needMemoryGB,_needBrowser"]);
    expect(cells("error")).toEqual([]);
  });

  test("mixed: needs in unmetNeeds, label in error", async () => {
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "_needMemoryGB,compatibilityNotMet",
    );
    expect(cells("unmetNeeds")).toEqual(["_needMemoryGB"]);
    expect(cells("error")).toEqual(["compatibilityNotMet"]);
  });

  test("progress suffix lands on the error cell, needs stay clean", async () => {
    status.nthBlock = 3;
    status.trial = 12;
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "_needMemoryGB,compatibilityNotMet",
    );
    expect(cells("unmetNeeds")).toEqual(["_needMemoryGB"]);
    expect(cells("error")).toEqual([
      "compatibilityNotMet (block 3/31, trial 12/40)",
    ]);
    status.nthBlock = undefined;
    status.trial = undefined;
  });

  test("completion code classification unchanged by the split", async () => {
    // Anchored classifier: only a label-leading string matches. The split
    // must not alter this (classification reads the reason, not the cells).
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "_needMemoryGB,compatibilityNotMet",
    );
    expect(cells("completionCodeEnglish")).toEqual(["aborted"]);
    jest.clearAllMocks();
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "compatibilityNotMet,_needMemoryGB",
    );
    expect(cells("completionCodeEnglish")).toEqual(["deviceIncompatible"]);
  });
});

// ── stampUnloadExit — tab-close stamp ─────────────────────────────────────────

describe("stampUnloadExit writes participant:tabClosed to the error column", () => {
  test("label + progress land in error, no unmetNeeds cell", () => {
    status.currentFunction = "filterRoutineBegin";
    status.nthBlock = 1;

    stampUnloadExit();

    expect(cells("error")).toEqual([
      "participant:tabClosed:filterRoutineBegin (block 1/31)",
    ]);
    expect(cells("unmetNeeds")).toEqual([]);
  });

  test("a pending audit row keyed by error is committed, not overwritten", () => {
    const p = psychoJS as any;
    p._experiment._currentTrialData = {
      experimentCompleteBool: false,
      error: "fullscreenExit (block 12/31, trial 22/70)",
    };
    status.terminated = true;

    stampUnloadExit();

    expect(addData()).not.toHaveBeenCalled(); // audit kept verbatim
    expect(p.experiment.nextEntry).toHaveBeenCalledTimes(1); // but committed
  });
});
