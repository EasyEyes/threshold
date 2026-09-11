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

jest.mock("../components/speech/speechPreflight.ts", () => ({
  cancelActiveRsvpSpeechPreflight: jest.fn(),
}));

jest.mock("../components/rsvpSpeech/rsvpSpeechRuntime.ts", () => ({
  hasActiveRsvpSpeechResources: jest.fn(() => false),
  closeActiveRsvpSpeechTrial: jest.fn(),
}));

// ── imports (after mocks are registered) ─────────────────────────────────────

import { psychoJS } from "../components/globalPsychoJS";
import { completionCodeIssuedFor, quitPsychoJS } from "../components/lifetime";
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
  p.experiment.isEntryEmpty.mockReturnValue(true);
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
  test("calls psychoJS.quit() with skipSave: false (quit owns the awaited save)", async () => {
    const { quit } = mocks();

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect(quit).toHaveBeenCalledTimes(1);
    expect(quit.mock.calls[0][0]).toMatchObject({ skipSave: false });
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

  // ── the save is delegated to quit(): threshold never saves directly ──────
  test("never calls gui.dialog; threshold does NOT call experiment.save itself", async () => {
    const { dialog, save, quit } = mocks();

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect(dialog).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(quit).toHaveBeenCalledTimes(1);
  });

  // ── quit() (which awaits the save) resolves before the completion redirect ─
  test("completion redirect fires only after psychoJS.quit() resolves", async () => {
    (global as any).window = { location: { href: "" } };
    recruitmentServiceData.name = "Prolific";
    recruitmentServiceData.url =
      "https://app.prolific.com/submissions/complete?cc=ABC123";
    const { quit } = mocks();
    let resolveQuit: (() => void) | null = null;
    quit.mockImplementation(
      () =>
        new Promise<void>((res) => {
          resolveQuit = res;
        }),
    );

    const done = quitPsychoJS("", true, mockParamReader, false, false);
    await new Promise((r) => setTimeout(r, 0));
    expect((global as any).window.location.href).toBe("");
    resolveQuit!();
    await done;
    expect((global as any).window.location.href).toBe(
      recruitmentServiceData.url,
    );
    recruitmentServiceData.name = "";
    recruitmentServiceData.url = "";
  });

  // ── quit failure must not strand the participant ───────────────────────────
  test("completion redirect still fires when psychoJS.quit() rejects", async () => {
    (global as any).window = { location: { href: "" } };
    recruitmentServiceData.name = "Prolific";
    recruitmentServiceData.url =
      "https://app.prolific.com/submissions/complete?cc=ABC123";
    const { quit } = mocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    quit.mockRejectedValue(new Error("upload failed"));

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect((global as any).window.location.href).toBe(
      recruitmentServiceData.url,
    );
    recruitmentServiceData.name = "";
    recruitmentServiceData.url = "";
  });

  // ── no double wait-UI: the threshold indicator is the only stall message ──
  test("does not call closeDialog; passes doNotCloseMessage:'' so quit's wait message cannot double-render", async () => {
    const { closeDialog, quit } = mocks();

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect(closeDialog).not.toHaveBeenCalled();
    expect(quit.mock.calls[0][0].doNotCloseMessage).toBe("");
  });
});

// ── termination audit (unmetNeeds) ───────────────────────────────────────────
// Every non-completion termination must record WHY it ended in the unmetNeeds
// column (model: compatibilityCheck's _needBrowser recording), plus the
// currentFunction breadcrumb saying where the participant was.
describe("quitPsychoJS — termination audit (unmetNeeds)", () => {
  const audit = () => {
    const p = psychoJS as any;
    return {
      addData: p.experiment.addData as jest.Mock,
      nextEntry: p.experiment.nextEntry as jest.Mock,
      save: p.experiment.save as jest.Mock,
    };
  };

  test("records unmetNeeds + currentFunction when a reason is given", async () => {
    const { status } = require("../components/global");
    status.currentFunction = "questionAndAnswerRoutineEachFrame";
    const { addData } = audit();

    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "remoteCalibratorQuit",
    );

    expect(addData).toHaveBeenCalledWith("unmetNeeds", "remoteCalibratorQuit");
    expect(addData).toHaveBeenCalledWith(
      "currentFunction",
      "questionAndAnswerRoutineEachFrame",
    );
  });

  test("flushes the audit row (nextEntry) even when no debrief form is shown", async () => {
    // RC-quit and several other paths pass showDebriefForm=false; without an
    // explicit flush the in-flight audit data would be lost on save.
    const { nextEntry } = audit();

    await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");

    expect(nextEntry).toHaveBeenCalled();
  });

  test("audit fields are written before the row is flushed", async () => {
    const { addData, nextEntry } = audit();

    await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");

    const needsIdx = addData.mock.calls.findIndex(
      (c: unknown[]) => c[0] === "unmetNeeds",
    );
    expect(needsIdx).toBeGreaterThanOrEqual(0);
    expect(addData.mock.invocationCallOrder[needsIdx]).toBeLessThan(
      nextEntry.mock.invocationCallOrder[0],
    );
  });

  test("records currentFunction but NOT unmetNeeds on normal completion", async () => {
    const { addData } = audit();

    await quitPsychoJS("", true, mockParamReader, false, false);

    expect(addData).toHaveBeenCalledWith("currentFunction", expect.any(String));
    expect(
      addData.mock.calls.some((c: unknown[]) => c[0] === "unmetNeeds"),
    ).toBe(false);
  });

  test("normal completion flushes exactly one row, with no unmetNeeds (completer data shape unchanged)", async () => {
    const { addData, nextEntry } = audit();

    await quitPsychoJS("", true, mockParamReader, false, false);

    // Pre-existing completer shape: one rescue-flushed row carrying
    // experimentCompleteBool — now also carrying currentFunction.
    expect(nextEntry).toHaveBeenCalledTimes(1);
    expect(
      addData.mock.calls.some((c: unknown[]) => c[0] === "unmetNeeds"),
    ).toBe(false);
  });

  test("currentFunction falls back to empty string when never set", async () => {
    const { status } = require("../components/global");
    status.currentFunction = undefined;
    const { addData } = audit();

    await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");

    expect(addData).toHaveBeenCalledWith("currentFunction", "");
  });
});

// ── adversarial: the quit row must be the LAST row, and there must be only
// ONE of it. quitPsychoJS's post-audit "rescue flush" (isEntryEmpty is really
// isEntryNOTEmpty) fires again after an explicit audit nextEntry, emitting a
// trailing {secs, currentFunction}-only row — which displaces
// experimentCompleteBool from the last row forensic scripts key on.
describe("quitPsychoJS — no trailing orphan row after the audit row", () => {
  beforeEach(() => {
    // Realistic ExperimentHandler semantics: addData accumulates into the
    // current entry; nextEntry pushes the entry to rows and reseeds {secs};
    // isEntryEmpty() actually means "entry NOT empty" (see its @todo).
    const p = psychoJS as any;
    let entry: Record<string, unknown>;
    const rows: Record<string, unknown>[] = [];
    const reset = () => {
      entry = { secs: 0 };
      rows.length = 0;
    };
    reset();
    p.__rows = rows;
    p.experiment.addData.mockImplementation((k: string, v: unknown) => {
      entry[k] = v;
    });
    p.experiment.nextEntry.mockImplementation(() => {
      rows.push(entry);
      entry = { secs: 0 };
    });
    p.experiment.isEntryEmpty.mockImplementation(
      () => Object.keys(entry).length > 0,
    );
  });

  test("a needsUnmet quit flushes exactly one row, which is the audit row", async () => {
    await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");

    const rows = (psychoJS as any).__rows as Record<string, unknown>[];
    expect(rows.length).toBe(1);
    expect(rows[0].unmetNeeds).toBe("escapeKey");
    expect(rows[0].experimentCompleteBool).toBe(false);
    expect(typeof rows[0].currentFunction).toBe("string");
  });

  test("no bare orphan row when the debrief step has no form to show", async () => {
    // showDebriefForm=true but the table defines no _debriefForm: the debrief
    // promise resolves immediately. The post-debrief flush must not emit a
    // {secs}-only row after the audit row.
    mockParamReader.read.mockReturnValue([]);

    await quitPsychoJS("", false, mockParamReader, true, true, "escapeKey");

    const rows = (psychoJS as any).__rows as Record<string, unknown>[];
    expect(rows.length).toBe(1);
    expect(rows[0].unmetNeeds).toBe("escapeKey");
    expect(rows[0].experimentCompleteBool).toBe(false);
  });
});

// ── completion code issued (Trello: EXPLAIN EVERY FAILURE / ✅+NO CODE) ─────
// Every return to Prolific carries a completion code or explains why not:
// completions get the study's completion code (and now auto-redirect so
// "finished but NO CODE" cannot happen), device/compatibility failures get
// the incompatible-completion code (Prolific classifies as Returned, no
// scientist review), and the completionCodeIssued column tells Analyze which
// one, so raw Prolific codes (e.g. W6FUgZw) can be translated back to English.
describe("quitPsychoJS — completionCodeIssued", () => {
  test("classifier: completed / deviceIncompatible / none-yet", () => {
    expect(completionCodeIssuedFor(true, "")).toBe("completed");
    expect(completionCodeIssuedFor(true, "anything")).toBe("completed");
    // Codes whose call sites redirect with the incompatible-completion code.
    expect(completionCodeIssuedFor(false, "rc:cameraReconnectPopup:quit")).toBe(
      "deviceIncompatible",
    );
    expect(completionCodeIssuedFor(false, "rc:chooseScreenQuit:quit")).toBe(
      "deviceIncompatible",
    );
    expect(completionCodeIssuedFor(false, "compatibilityNotMet")).toBe(
      "deviceIncompatible",
    );
    expect(completionCodeIssuedFor(false, "calibrationObjectUnavailable")).toBe(
      "deviceIncompatible",
    );
    expect(completionCodeIssuedFor(false, "emailVerificationFailed")).toBe(
      "deviceIncompatible",
    );
    // Everything else incomplete carries the study's aborted-completion
    // code (generated per study by the scientist app): Prolific classifies
    // the session as Returned instead of demanding a manual review.
    expect(completionCodeIssuedFor(false, "escapeKey")).toBe("aborted");
    expect(completionCodeIssuedFor(false, "consentDeclined")).toBe("aborted");
    expect(
      completionCodeIssuedFor(false, "_crash:trialRoutineEnd:Error:X"),
    ).toBe("aborted");
    expect(completionCodeIssuedFor(false, "fullscreenExit")).toBe("aborted");
    // No code info at all (should not happen; coverage guard enforces codes).
    expect(completionCodeIssuedFor(false, "")).toBe("");
  });

  test("writes completionCodeIssued on the final row", async () => {
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "rc:cameraReconnectPopup:quit",
    );
    const { addData } = {
      addData: (psychoJS as any).experiment.addData as jest.Mock,
    };
    expect(addData).toHaveBeenCalledWith(
      "completionCodeIssued",
      "deviceIncompatible",
    );
  });

  test("completed run records completed", async () => {
    await quitPsychoJS("", true, mockParamReader, false, false);
    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith("completionCodeIssued", "completed");
  });
});

describe("quitPsychoJS — Prolific completion auto-redirect", () => {
  beforeEach(() => {
    (global as any).window = { location: { href: "" } };
    recruitmentServiceData.name = "Prolific";
    recruitmentServiceData.url =
      "https://app.prolific.com/submissions/complete?cc=ABC123";
  });

  test("redirects to the completion URL as soon as the save resolves", async () => {
    // No timer window: a participant closing the tab in the first seconds
    // after finishing must still reach Prolific with the completion code.
    await quitPsychoJS("", true, mockParamReader, false, false);
    expect((global as any).window.location.href).toBe(
      recruitmentServiceData.url,
    );
  });

  test("never auto-redirects for simulated runs", async () => {
    simState.active = true;
    jest.useFakeTimers();
    try {
      await quitPsychoJS("", true, mockParamReader, false, false);
      jest.advanceTimersByTime(3100);
      expect((global as any).window.location.href).toBe("");
    } finally {
      jest.useRealTimers();
      simState.active = false;
    }
  });

  test("never auto-redirects for non-Prolific studies", async () => {
    recruitmentServiceData.name = "";
    jest.useFakeTimers();
    try {
      await quitPsychoJS("", true, mockParamReader, false, false);
      jest.advanceTimersByTime(3100);
      expect((global as any).window.location.href).toBe("");
    } finally {
      jest.useRealTimers();
    }
  });
});

// ── completionCode literal (Analyze translation, join-free) ─────────────────
// The literal string Prolific's export will show in its "Completion code"
// column for this session, so Analyze can translate codes (W6FUgZw …) by
// direct string match — no participant-ID join, no parallel Analyze change.
// Purely additive: the class column and unmetNeeds stay as they are.
describe("quitPsychoJS — completionCode literal", () => {
  test("completed → the study's completion code string", async () => {
    recruitmentServiceData.code = "433";
    await quitPsychoJS("", true, mockParamReader, false, false);
    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith("completionCode", "433");
    recruitmentServiceData.code = "";
  });

  test("deviceIncompatible → the incompatible-completion code string", async () => {
    recruitmentServiceData.incompatibleCode = "W6FUgZw";
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "rc:cameraReconnectPopup:quit",
    );
    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith("completionCode", "W6FUgZw");
    recruitmentServiceData.incompatibleCode = "";
  });

  test("aborted terminations carry the aborted-completion code string", async () => {
    recruitmentServiceData.abortedCode = "ab9987";
    await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");
    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith("completionCodeIssued", "aborted");
    expect(addData).toHaveBeenCalledWith("completionCode", "ab9987");
    recruitmentServiceData.abortedCode = "";
  });

  test("aborted class with no configured code → empty literal, class kept", async () => {
    await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");
    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith("completionCodeIssued", "aborted");
    expect(addData).toHaveBeenCalledWith("completionCode", "");
  });

  test("aborted terminations redirect to Prolific with the aborted code", async () => {
    recruitmentServiceData.name = "Prolific";
    recruitmentServiceData.abortedCode = "ab9987";
    try {
      (global as any).window = { location: { href: "" } };
      await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");
      expect((global as any).window.location.href).toBe(
        "https://app.prolific.com/submissions/complete?cc=ab9987",
      );
    } finally {
      recruitmentServiceData.name = "";
      recruitmentServiceData.abortedCode = "";
    }
  });

  test("aborted redirect navigates the same tab — never a blockable popup", async () => {
    // window.open is silently blocked outside user gestures (returns null,
    // no throw) → the participant would reach Prolific with NO code, the
    // exact Review-queue bug this fixes. The established pattern (compat
    // "return to Prolific" button, completion redirect) is same-tab
    // navigation. quit() uses skipSave, so navigation cancels nothing.
    recruitmentServiceData.name = "Prolific";
    recruitmentServiceData.abortedCode = "ab9987";
    const open = jest.fn(() => null); // blocked popup
    (global as any).window = { location: { href: "" }, open };
    try {
      await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");
      expect(open).not.toHaveBeenCalled();
      expect((global as any).window.location.href).toBe(
        "https://app.prolific.com/submissions/complete?cc=ab9987",
      );
    } finally {
      recruitmentServiceData.name = "";
      recruitmentServiceData.abortedCode = "";
    }
  });

  test("no redirect without an aborted code configured", async () => {
    recruitmentServiceData.name = "Prolific";
    try {
      (global as any).window = { location: { href: "" } };
      await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");
      expect((global as any).window.location.href).toBe("");
    } finally {
      recruitmentServiceData.name = "";
    }
  });

  test("deviceIncompatible but study configured no code → empty literal, class kept", async () => {
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "rc:cameraReconnectPopup:quit",
    );
    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith("completionCode", "");
    expect(addData).toHaveBeenCalledWith(
      "completionCodeIssued",
      "deviceIncompatible",
    );
  });

  test("terminations with no reason recorded → empty literal (guard forbids)", async () => {
    await quitPsychoJS("", false, mockParamReader, true, false, "");
    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith("completionCode", "");
  });

  test("code field empty → falls back to the cc= param of the redirect URL", async () => {
    recruitmentServiceData.url =
      "https://app.prolific.com/submissions/complete?cc=815";
    await quitPsychoJS("", true, mockParamReader, false, false);
    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith("completionCode", "815");
    recruitmentServiceData.url = "";
  });
});

// ── progress suffix (card: 11 sessions with no reason; scientist must see
// how far an incomplete session got, inside the reason cell Analyze shows).
describe("quitPsychoJS — unmetNeeds carries progress", () => {
  test("incomplete termination suffixes how far the participant got", async () => {
    const { status } = require("../components/global");
    status.nthBlock = 3;
    status.trial = 12;
    await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");
    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith(
      "unmetNeeds",
      "escapeKey (block 3/31, trial 12/40)",
    );
    status.nthBlock = undefined;
    status.trial = undefined;
  });

  test("pre-consent termination: no progress parts, no suffix", async () => {
    await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");
    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith("unmetNeeds", "escapeKey");
  });

  test("progress suffix keeps the code prefix machine-parseable", async () => {
    const { status } = require("../components/global");
    status.nthBlock = 1;
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "rc:cameraReconnectPopup:quit(status=ended)",
    );
    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    const call = addData.mock.calls.find(
      (c: unknown[]) => c[0] === "unmetNeeds",
    );
    expect(String(call?.[1])).toMatch(/^rc:cameraReconnectPopup:quit\(/);
    expect(String(call?.[1])).toMatch(/\(block 1\/31\)$/);
    status.nthBlock = undefined;
  });
});
