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
  // Fresh session per test: quitPsychoJS's re-entry guard is sticky.
  status.terminated = false;
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

  test("a direct generic incompatible label cannot bypass the needs rule", () => {
    for (const generic of ["incompatible", "compatibilityNotMet"]) {
      expect(splitTerminationColumns(generic)).toEqual({
        unmetNeeds: "",
        error: "compatibility:unclassifiedRejection",
      });
    }
    expect(splitTerminationColumns("incompatible,_needMemoryGB")).toEqual({
      unmetNeeds: "_needMemoryGB",
      error: "incompatible",
    });
  });

  test("a specific label survives while a redundant generic label is dropped", () => {
    expect(splitTerminationColumns("incompatible,rc:noCameraDetected")).toEqual(
      {
        unmetNeeds: "",
        error: "rc:noCameraDetected",
      },
    );
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
    // Second, independent session: re-arm the re-entry guard. Uses the
    // currently-emitted device-incompatible code.
    status.terminated = false;
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "incompatible,_needMemoryGB",
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

// ── the incompatible exit — Denis's rule, made total ─────────────────────────
//
// Field evidence (Acuity24FontsAddSloan4/7/9, 2026-10): the failed needs
// were written as their OWN unmetNeeds row (compatibilityCheck.js), and the
// termination row below carried only the "incompatible" label — so a reader
// of the final row (Shiny) saw Error=incompatible with an EMPTY unmetNeeds
// column. The rule, enforced here for every outcome combination:
//   needs + generic/absent label → needs AND incompatible on ONE row
//   specific label (no needs)    → the specific label in error
//   needs + specific label       → BOTH on one row
//   neither                      → compatibility:unclassifiedRejection
//     (a visible accounting gap, never a bare "incompatible" — a rejection
//     with no unmet requirement must carry a specific, explainable label)

import { incompatibleExitReason } from "../components/lifetime";

describe("incompatibleExitReason — the full outcome matrix", () => {
  test("needs, no specific label → needs joined with incompatible", () => {
    expect(
      incompatibleExitReason("", [
        "_needProcessorCoresMinimum",
        "_needMemoryGB",
      ]),
    ).toBe("_needProcessorCoresMinimum,_needMemoryGB,incompatible");
  });

  test("legacy generic labels are treated as no label", () => {
    // "incompatible"/"compatibilityNotMet"/true carry no specific cause.
    for (const generic of ["incompatible", "compatibilityNotMet", true]) {
      expect(incompatibleExitReason(generic as any, ["_needMemoryGB"])).toBe(
        "_needMemoryGB,incompatible",
      );
    }
    expect(incompatibleExitReason("incompatible", [])).toBe(
      "compatibility:unclassifiedRejection",
    );
  });

  test("specific label, no needs → the specific label, never incompatible", () => {
    expect(incompatibleExitReason("rc:noCameraDetected", [])).toBe(
      "rc:noCameraDetected",
    );
    expect(incompatibleExitReason("soundOutput:selectionQuit", [])).toBe(
      "soundOutput:selectionQuit",
    );
  });

  test("specific label + needs → BOTH preserved on one row", () => {
    expect(
      incompatibleExitReason("rc:noCameraDetected", ["_needMemoryGB"]),
    ).toBe("_needMemoryGB,rc:noCameraDetected");
  });

  test("neither needs nor label → visible unclassified rejection", () => {
    expect(incompatibleExitReason("", [])).toBe(
      "compatibility:unclassifiedRejection",
    );
  });

  test("rc label with paren detail + needs round-trips through the split", async () => {
    const label =
      "rc:cameraReconnectPopup:quit(status=ended, camera=FaceTime, attempts=2)";
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      incompatibleExitReason(label, ["_needMemoryGB"]),
      { deviceIncompatible: true },
    );
    expect(cells("unmetNeeds")).toEqual(["_needMemoryGB"]);
    const error = cells("error")[0] as string;
    expect(error.startsWith(label)).toBe(true);
    expect(error).toContain("attempts=2");
  });

  test("whitespace-padded label still lands intact in error", async () => {
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      incompatibleExitReason(" rc:noCameraDetected ", []),
      { deviceIncompatible: true },
    );
    expect(cells("error")[0]).toMatch(/^rc:noCameraDetected/);
  });

  test("needs-only reason survives a progress suffix", async () => {
    status.nthBlock = 2;
    status.trial = 5;
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      incompatibleExitReason("", ["_needMemoryGB"]),
      { deviceIncompatible: true },
    );
    expect(cells("unmetNeeds")).toEqual(["_needMemoryGB"]);
    expect(cells("error")[0]).toMatch(
      /^incompatible \(block 2\/31, trial 5\/40\)$/,
    );
  });

  test("needs are deduplicated and empties dropped", () => {
    expect(
      incompatibleExitReason("", ["_needMemoryGB", "_needMemoryGB", ""]),
    ).toBe("_needMemoryGB,incompatible");
  });

  test("stringified nullish labels are generic, not fake labels", () => {
    // "null"/"undefined" strings would otherwise land in the error column
    // as unexplainable labels with no Error Table row.
    for (const nullish of ["null", "undefined"]) {
      expect(incompatibleExitReason(nullish, ["_needMemoryGB"])).toBe(
        "_needMemoryGB,incompatible",
      );
      expect(incompatibleExitReason(nullish, [])).toBe(
        "compatibility:unclassifiedRejection",
      );
    }
  });
});

describe("quitPsychoJS routes every incompatible outcome to both columns of ONE row", () => {
  test("the final termination boundary rejects a direct bare incompatible", async () => {
    // Deliberately bypass incompatibleExitReason: every present and future
    // caller must get the same postcondition from quitPsychoJS itself.
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "incompatible",
      { deviceIncompatible: true },
    );
    expect(cells("unmetNeeds")).toEqual([]);
    expect(cells("error")).toEqual(["compatibility:unclassifiedRejection"]);
    expect(cells("completionCodeEnglish")).toEqual(["deviceIncompatible"]);
  });

  const route = async (label: string, needs: string[]) => {
    await quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      incompatibleExitReason(label, needs),
      { deviceIncompatible: true },
    );
    return {
      unmetNeeds: cells("unmetNeeds"),
      error: cells("error"),
      code: cells("completionCodeEnglish"),
    };
  };

  test("needs only → needs cell + incompatible error cell", async () => {
    const out = await route("", ["_needProcessorCoresMinimum"]);
    expect(out.unmetNeeds).toEqual(["_needProcessorCoresMinimum"]);
    expect(out.error).toEqual(["incompatible"]);
    expect(out.code).toEqual(["deviceIncompatible"]);
  });

  test("specific label only → specific error, NO unmetNeeds cell, same code", async () => {
    const out = await route("rc:noCameraDetected", []);
    expect(out.unmetNeeds).toEqual([]);
    expect(out.error[0]).toMatch(/^rc:noCameraDetected/);
    expect(out.code).toEqual(["deviceIncompatible"]);
  });

  test("label + needs → both cells on one row", async () => {
    const out = await route("soundOutput:selectionQuit", ["_needMemoryGB"]);
    expect(out.unmetNeeds).toEqual(["_needMemoryGB"]);
    expect(out.error[0]).toMatch(/^soundOutput:selectionQuit/);
  });

  test("unclassified rejection → error names it; still the incompatible exit", async () => {
    const out = await route("", []);
    expect(out.unmetNeeds).toEqual([]);
    expect(out.error).toEqual(["compatibility:unclassifiedRejection"]);
    expect(out.code).toEqual(["deviceIncompatible"]);
  });
});
