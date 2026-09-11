/**
 * @jest-environment jsdom
 *
 * Unload-exit stamp: every incomplete exit must be explained. Field data
 * (Compare3Languages 127–129): 27 of 73 sessions ended as 1-row files at
 * block-1 onset — the participant closed/reloaded a wedged page, PsychoJS's
 * `unload` sync-save uploaded the pending row, but nothing ever stamped
 * `unmetNeeds`, so the sessions were unexplained. When the page unloads
 * while the experiment is still live, the pending row must be stamped
 * `participant:tabClosed:<where>` (+ progress) BEFORE the sync save, so no
 * incomplete session can reach the scientist unexplained.
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import { readFileSync } from "fs";
import path from "path";

// ── dependency mocks (copied from lifetime.test.ts, adapted) ─────────────────

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

// ── imports (after mocks) ─────────────────────────────────────────────────────

import { psychoJS } from "../components/globalPsychoJS";
import {
  quitPsychoJS,
  stampUnloadExit,
  registerUnloadExitStamp,
} from "../components/lifetime";

const mockParamReader = { read: jest.fn() };

const experiment = () => psychoJS as any;
const { status } = require("../components/global");

const resetState = () => {
  const p = experiment();
  p._experiment.experimentEnded = false;
  p._status = null;
  p._experiment._currentTrialData = {};
  (p._experiment as any).__unloadStamped = false; // fresh session per test
  status.currentFunction = "";
  status.nthBlock = undefined;
  status.trial = undefined;
  status.terminated = false;
};

beforeEach(() => {
  jest.clearAllMocks();
  resetState();
  const p = experiment();
  p.experiment.save.mockResolvedValue(undefined);
  p.quit.mockResolvedValue(undefined);
  p.experiment.isEntryEmpty.mockReturnValue(true);
  const { clock } = require("../components/globalPsychoJS");
  clock.global.getTime.mockReturnValue(100);
});

// ── stampUnloadExit ───────────────────────────────────────────────────────────

describe("stampUnloadExit — label the pending row when the page unloads live", () => {
  test("beforeunload mid-experiment stamps participant:tabClosed:<where> + progress + incomplete flag", () => {
    status.currentFunction = "filterRoutineBegin";
    status.nthBlock = 1; // block-1 onset hang, the field signature

    stampUnloadExit();

    const addData = experiment().experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith(
      "unmetNeeds",
      "participant:tabClosed:filterRoutineBegin (block 1/31)",
    );
    expect(addData).toHaveBeenCalledWith("experimentCompleteBool", false);
    expect(addData).toHaveBeenCalledWith(
      "currentFunction",
      "filterRoutineBegin",
    );
  });

  test("includes trial progress when a trial is underway", () => {
    status.currentFunction = "trialRoutineEachFrame";
    status.nthBlock = 3;
    status.trial = 12;

    stampUnloadExit();

    expect(experiment().experiment.addData).toHaveBeenCalledWith(
      "unmetNeeds",
      "participant:tabClosed:trialRoutineEachFrame (block 3/31, trial 12/40)",
    );
  });

  test("early startup (no breadcrumb yet) yields the bare code, no dangling colon", () => {
    stampUnloadExit();
    expect(experiment().experiment.addData).toHaveBeenCalledWith(
      "unmetNeeds",
      "participant:tabClosed",
    );
  });

  test("does NOT stamp after a recorded termination (quitPsychoJS ran)", async () => {
    status.terminated = true;
    stampUnloadExit();
    const addData = experiment().experiment.addData as jest.Mock;
    expect(addData.mock.calls.filter(([k]) => k === "unmetNeeds")).toHaveLength(
      0,
    );
  });

  test("does NOT stamp when PsychoJS already ended the experiment", () => {
    experiment()._experiment.experimentEnded = true;
    stampUnloadExit();
    const addData = experiment().experiment.addData as jest.Mock;
    expect(addData.mock.calls.filter(([k]) => k === "unmetNeeds")).toHaveLength(
      0,
    );
  });

  test("does NOT overwrite a termination audit already pending in the row", () => {
    // e.g. participant closes during the debrief screen: the audit fields
    // (unmetNeeds=fullscreenExit …) are already in the unflushed entry.
    experiment()._experiment._currentTrialData = {
      unmetNeeds: "fullscreenExit (block 12/31, trial 22/70)",
    };
    stampUnloadExit();
    const addData = experiment().experiment.addData as jest.Mock;
    expect(addData.mock.calls.filter(([k]) => k === "unmetNeeds")).toHaveLength(
      0,
    );
  });

  test("quitPsychoJS marks the run terminated (guards the unload stamp)", async () => {
    status.currentFunction = "trialRoutineEachFrame";
    expect(status.terminated).toBeFalsy();
    await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");
    expect(status.terminated).toBe(true);
  });
});

// ── registerUnloadExitStamp — listeners fire stamp + sync save ────────────────

describe("registerUnloadExitStamp — window listeners", () => {
  test("beforeunload: stamps, then sync-saves (row reaches the server labeled)", () => {
    registerUnloadExitStamp();
    status.currentFunction = "filterRoutineBegin";
    status.nthBlock = 1;

    window.dispatchEvent(new Event("beforeunload"));

    const p = experiment();
    expect(p.experiment.addData).toHaveBeenCalledWith(
      "unmetNeeds",
      "participant:tabClosed:filterRoutineBegin (block 1/31)",
    );
    expect(p.experiment.save).toHaveBeenCalledWith({ sync: true });
  });

  test("pagehide (mobile close): stamps + sync-saves too", () => {
    registerUnloadExitStamp();
    status.currentFunction = "rcCalibration";

    window.dispatchEvent(new Event("pagehide"));

    const p = experiment();
    expect(p.experiment.addData).toHaveBeenCalledWith(
      "unmetNeeds",
      "participant:tabClosed:rcCalibration",
    );
    expect(p.experiment.save).toHaveBeenCalledWith({ sync: true });
  });

  test("after termination the listeners save nothing more and stamp nothing", () => {
    registerUnloadExitStamp();
    status.terminated = true;

    window.dispatchEvent(new Event("beforeunload"));
    window.dispatchEvent(new Event("pagehide"));

    const p = experiment();
    expect(
      (p.experiment.addData as jest.Mock).mock.calls.filter(
        ([k]) => k === "unmetNeeds",
      ),
    ).toHaveLength(0);
    expect(p.experiment.save).not.toHaveBeenCalled();
  });

  test("tab switch (visibilitychange hidden) is NOT an exit: no stamp", () => {
    registerUnloadExitStamp();
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    const p = experiment();
    expect(
      (p.experiment.addData as jest.Mock).mock.calls.filter(
        ([k]) => k === "unmetNeeds",
      ),
    ).toHaveLength(0);
  });
});

// ── wiring guard — the registrar must actually run in the experiment ─────────

describe("wiring — registerUnloadExitStamp is called by the experiment", () => {
  test("threshold.js calls registerUnloadExitStamp (dead-import regression)", () => {
    const src = readFileSync(
      path.join(__dirname, "..", "threshold.js"),
      "utf8",
    );
    const callSites = src.match(/registerUnloadExitStamp\(\)/g) ?? [];
    expect(callSites.length).toBeGreaterThan(0);
  });
});

describe("stampUnloadExit — the stamp must actually reach the server", () => {
  test("commits the stamped row via nextEntry (ExperimentHandler.save uploads ONLY completed entries)", () => {
    status.currentFunction = "filterRoutineBegin";
    status.nthBlock = 1;

    stampUnloadExit();

    // save() serializes _trialsData; addData writes the PENDING entry, which
    // only a nextEntry() commits. Without it the label dies with the page.
    const nextEntry = experiment().experiment.nextEntry as jest.Mock;
    const addData = experiment().experiment.addData as jest.Mock;
    expect(nextEntry).toHaveBeenCalled();
    // commit AFTER stamping, not before
    expect(addData.mock.invocationCallOrder[0]).toBeLessThan(
      nextEntry.mock.invocationCallOrder[0],
    );
  });
});

describe("stampUnloadExit — double-fire safety (early registration + backstop)", () => {
  test("beforeunload AND pagehide both firing (double-registered) stamp exactly ONE row", () => {
    registerUnloadExitStamp();
    registerUnloadExitStamp(); // early call + displayNeedsPage backstop
    status.currentFunction = "filterRoutineBegin";
    status.nthBlock = 1;

    window.dispatchEvent(new Event("beforeunload"));
    window.dispatchEvent(new Event("pagehide"));

    const p = experiment();
    const unmet = (p.experiment.addData as jest.Mock).mock.calls.filter(
      ([k]) => k === "unmetNeeds",
    );
    expect(unmet).toHaveLength(1);
    expect(p.experiment.nextEntry).toHaveBeenCalledTimes(1);
    // One sync save per EVENT (pagehide is the mobile fallback) — not one
    // per registration.
    expect(p.experiment.save).toHaveBeenCalledTimes(2);
  });

  test("registration is armed right after psychoJS.start() (loading-window closes are covered)", () => {
    // The 18 BOM-only field files: closed after session open but before the
    // first scheduled task (welcome → resources → OK). The stamp must be
    // armed in that window, not first at displayNeedsPage.
    const src = require("fs").readFileSync("threshold.js", "utf8");
    const startThen = src.indexOf("psychoJS\n    .start(");
    const needsPage = src.indexOf("async function displayNeedsPage");
    const earlyCall = src.indexOf("registerUnloadExitStamp();", startThen);
    expect(startThen).toBeGreaterThan(-1);
    expect(earlyCall).toBeGreaterThan(startThen);
    expect(earlyCall).toBeLessThan(needsPage);
  });
});

describe("stampUnloadExit — close during the debrief window (audit pending, uncommitted)", () => {
  test("commits the pending audit row so it reaches the server too", () => {
    // quitPsychoJS has written its audit into the pending entry and set
    // terminated, but nextEntry hasn't run (participant sits on the debrief
    // screen). Closing then must still upload the audit row.
    const p = experiment();
    p._experiment._currentTrialData = {
      experimentCompleteBool: false,
      unmetNeeds: "escapeKey (block 3/31)",
    };
    status.terminated = true;

    stampUnloadExit();

    expect(p.experiment.addData).not.toHaveBeenCalled(); // audit kept verbatim
    expect(p.experiment.nextEntry).toHaveBeenCalledTimes(1); // but committed
  });
});
