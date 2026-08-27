/**
 * @jest-environment jsdom
 *
 * Crash-watchdog breadcrumbs: when window.onerror / onunhandledrejection
 * fire, the error row must also carry unmetNeeds ("_crash:<currentFunction>")
 * and the currentFunction breadcrumb, so a crashed session's CSV says both
 * WHY it died and WHERE. Model: compatibilityCheck's unmetNeeds recording.
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

// ── dependency mocks (hoisted) ────────────────────────────────────────────────

jest.mock("../components/globalPsychoJS.js", () => {
  const experiment = {
    experimentEnded: false,
    addData: jest.fn(),
    save: jest.fn(),
    isEntryEmpty: jest.fn(),
    nextEntry: jest.fn(),
  };
  return {
    clock: { global: { getTime: jest.fn() } },
    psychoJS: {
      experiment,
      _experiment: experiment,
      _status: null,
      _scheduler: { stop: jest.fn() },
      _gui: { dialog: jest.fn(), displayMessage: jest.fn() },
      window: { close: jest.fn() },
      quit: jest.fn(),
    },
  };
});

jest.mock("../components/lifetime.js", () => ({
  quitPsychoJS: jest.fn(),
}));

jest.mock("../components/utils.js", () => ({
  showCursor: jest.fn(),
}));

jest.mock("../components/sentry", () => ({
  captureError: jest.fn(),
}));

jest.mock("../components/simulatedState", () => ({
  setEEState: jest.fn(),
  simulateActive: false,
}));

jest.mock("sweetalert2", () => ({
  default: { isVisible: jest.fn(() => false), close: jest.fn() },
}));

jest.mock("../components/errorContext.js", () => ({
  buildErrorContext: jest.fn(() => ({})),
}));

jest.mock("../components/runtimeErrorMessage.js", () => ({
  formatErrorContextAsText: jest.fn(() => ""),
}));

jest.mock("../components/global", () => ({
  status: { currentFunction: "questionAndAnswerRoutineEachFrame" },
}));

// ── imports (after mocks) ─────────────────────────────────────────────────────

import { psychoJS } from "../components/globalPsychoJS.js";
import { buildWindowErrorHandling } from "../components/errorHandling.js";
import { quitPsychoJS } from "../components/lifetime.js";

const mockParamReader = { read: jest.fn() };

// Capture the raw dialog mock at module scope, before any
// buildWindowErrorHandling() call wraps it.
const ORIGINAL_DIALOG = (psychoJS as any)._gui.dialog as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (psychoJS as any).experiment.save.mockResolvedValue(undefined);
});

const fireOnError = () =>
  (window as any).onerror(
    "boom message",
    "threshold.js",
    1,
    1,
    new Error("boom"),
  );

const fireOnUnhandledRejection = () =>
  (window as any).onunhandledrejection({ reason: new Error("async boom") });

describe("crash watchdog — unmetNeeds breadcrumbs in error rows", () => {
  test("window.onerror records unmetNeeds=_crash:<currentFunction> + currentFunction", () => {
    buildWindowErrorHandling(mockParamReader);
    fireOnError();

    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith("error", expect.any(String));
    expect(addData).toHaveBeenCalledWith(
      "unmetNeeds",
      "_crash:questionAndAnswerRoutineEachFrame",
    );
    expect(addData).toHaveBeenCalledWith(
      "currentFunction",
      "questionAndAnswerRoutineEachFrame",
    );
  });

  test("window.onerror flushes and saves the crash row", () => {
    buildWindowErrorHandling(mockParamReader);
    fireOnError();

    expect((psychoJS as any).experiment.nextEntry).toHaveBeenCalled();
    expect((psychoJS as any).experiment.save).toHaveBeenCalled();
  });

  test("crash fields land in the SAME row (written before nextEntry flush)", () => {
    buildWindowErrorHandling(mockParamReader);
    fireOnError();

    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    const nextEntry = (psychoJS as any).experiment.nextEntry as jest.Mock;
    const needsIdx = addData.mock.calls.findIndex(
      (c: unknown[]) => c[0] === "unmetNeeds",
    );
    expect(needsIdx).toBeGreaterThanOrEqual(0);
    expect(addData.mock.invocationCallOrder[needsIdx]).toBeLessThan(
      nextEntry.mock.invocationCallOrder[0],
    );
  });

  test("window.onunhandledrejection records the same crash breadcrumb", () => {
    buildWindowErrorHandling(mockParamReader);
    fireOnUnhandledRejection();

    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith("error", expect.any(String));
    expect(addData).toHaveBeenCalledWith(
      "unmetNeeds",
      "_crash:questionAndAnswerRoutineEachFrame",
    );
    expect(addData).toHaveBeenCalledWith(
      "currentFunction",
      "questionAndAnswerRoutineEachFrame",
    );
    expect((psychoJS as any).experiment.nextEntry).toHaveBeenCalled();
    expect((psychoJS as any).experiment.save).toHaveBeenCalled();
  });

  test("error dialog OK quits with a _crash code in the final row", async () => {
    buildWindowErrorHandling(mockParamReader);
    fireOnError();

    const onOK = ORIGINAL_DIALOG.mock.calls[0][0].onOK as () => void;
    await onOK();
    expect(quitPsychoJS).toHaveBeenCalledWith(
      "",
      false,
      mockParamReader,
      true,
      false,
      "_crash:questionAndAnswerRoutineEachFrame",
    );
  });

  test("unhandled-rejection dialog OK quits with a _crash code too", async () => {
    buildWindowErrorHandling(mockParamReader);
    fireOnUnhandledRejection();

    const onOK = ORIGINAL_DIALOG.mock.calls[0][0].onOK as () => void;
    await onOK();
    expect(quitPsychoJS).toHaveBeenCalledWith(
      "",
      false,
      mockParamReader,
      true,
      false,
      "_crash:questionAndAnswerRoutineEachFrame",
    );
  });

  test("PsychoJS's own error dialogs are routed through the audited pipeline", async () => {
    buildWindowErrorHandling(mockParamReader);
    const wrappedDialog = (psychoJS as any)._gui.dialog as unknown as (
      o: unknown,
    ) => void;

    // e.g. psychoJS.start()'s catch shows {error} with no onOK — the
    // experiment would otherwise die silently, unaudited.
    wrappedDialog({ error: new Error("setup boom") });

    const addData = (psychoJS as any).experiment.addData as jest.Mock;
    expect(addData).toHaveBeenCalledWith(
      "unmetNeeds",
      "_crash:questionAndAnswerRoutineEachFrame",
    );
    const forwarded = ORIGINAL_DIALOG.mock.calls.find(
      (c: unknown[]) => (c[0] as any)?.onOK,
    );
    expect(forwarded).toBeDefined();
    await (forwarded![0] as any).onOK();
    expect(quitPsychoJS).toHaveBeenCalledWith(
      "",
      false,
      mockParamReader,
      true,
      false,
      "_crash:questionAndAnswerRoutineEachFrame",
    );
  });
});
