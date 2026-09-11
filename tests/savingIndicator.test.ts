/**
 * @jest-environment jsdom
 *
 * The final data save (quitPsychoJS's `await experiment.save()`) can retry
 * for many minutes (field: participants stared at a BLANK screen for 9-12
 * minutes, then bailed — 2 NOCODE completions + 1 aborted-code completion).
 * A saving indicator must be visible for the whole save, then removed —
 * on success AND on failure — with no button (the completion path
 * auto-redirects; no OK gate).
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

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
  let resolveSave: ((v?: unknown) => void) | null = null;
  const experiment = {
    experimentEnded: false,
    addData: jest.fn(),
    save: jest.fn(
      () =>
        new Promise((res) => {
          resolveSave = res;
        }),
    ),
    isEntryEmpty: jest.fn(),
    nextEntry: jest.fn(),
    saveCSV: jest.fn(),
  };
  return {
    __resolveSave: () => resolveSave?.(),
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
  status: { consentGiven: false, currentFunction: "", nthBlock: 1, trial: 3 },
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
  readi18nPhrases: jest.fn((_k: string, lang: string) => `SAVING[${lang}]`),
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

import { psychoJS } from "../components/globalPsychoJS";
import { quitPsychoJS } from "../components/lifetime";
import { notifyRetryAttempt } from "../preprocess/retry";
const { __resolveSave } = require("../components/globalPsychoJS");

const mockParamReader = { read: jest.fn() };
const indicator = () => document.getElementById("threshold-saving-indicator");

beforeEach(() => {
  jest.clearAllMocks();
  const p = psychoJS as any;
  p._experiment.experimentEnded = false;
  p._status = null;
  p.quit.mockResolvedValue(undefined);
  p.experiment.isEntryEmpty.mockReturnValue(true);
  const { clock } = require("../components/globalPsychoJS");
  clock.global.getTime.mockReturnValue(100);
});

describe("quitPsychoJS — saving indicator around the final save", () => {
  test("indicator stays up for the WHOLE quit() call (the save runs inside quit), then is removed", async () => {
    const p = psychoJS as any;
    let resolveQuit: (() => void) | null = null;
    p.quit.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveQuit = res;
        }),
    );
    const done = quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "escapeKey",
    );
    await new Promise((r) => setTimeout(r, 0)); // let quitPsychoJS reach quit()
    expect(p.quit).toHaveBeenCalledTimes(1);
    expect(p.quit.mock.calls[0][0]).toMatchObject({ skipSave: false });
    // quit() is still mid-save: the indicator must still be up.
    expect(indicator()).not.toBeNull();
    expect(indicator()!.textContent).toContain("SAVING[en]");
    expect(indicator()!.querySelector("button")).toBeNull();
    // Sized to content (no haphazard wrap of the big warning line),
    // centered like the final screens. (width:max-content itself can't be
    // asserted here — jsdom's CSS parser drops it; verified visually.)
    expect(indicator()!.style.maxWidth).toBe("92vw");
    expect(indicator()!.style.textAlign).toBe("center");
    resolveQuit!();
    await done;
    expect(indicator()).toBeNull();
  });

  test("indicator is removed when quit() REJECTS (a failed save must not strand the UI)", async () => {
    const p = psychoJS as any;
    jest.spyOn(console, "warn").mockImplementation(() => {});
    p.quit.mockRejectedValueOnce(new Error("upload failed"));
    await quitPsychoJS("", false, mockParamReader, true, false, "escapeKey");
    expect(indicator()).toBeNull();
  });

  test("shows a live retry counter once the upload starts retrying; counter resets per quit", async () => {
    const p = psychoJS as any;
    let resolveQuit: (() => void) | null = null;
    p.quit.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveQuit = res;
        }),
    );
    const done = quitPsychoJS(
      "",
      false,
      mockParamReader,
      true,
      false,
      "escapeKey",
    );
    await new Promise((r) => setTimeout(r, 0));
    // No retries yet: no counter.
    expect(indicator()!.textContent).not.toContain("↻");
    // The upload hits its first retryable failure: counter appears.
    notifyRetryAttempt(1, { status: 503 });
    expect(indicator()!.textContent).toContain("↻");
    expect(indicator()!.textContent).toContain("1");
    notifyRetryAttempt(7, { status: 504 });
    expect(indicator()!.textContent).toContain("7");
    resolveQuit!();
    await done;
    // After the quit settles, later retries (none expected) must not crash.
    notifyRetryAttempt(8, {});
    expect(indicator()).toBeNull();
  });
});
