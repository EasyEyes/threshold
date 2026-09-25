/**
 * @jest-environment jsdom
 *
 * External and post-termination errors must not kill the study
 * (Acuity24Fonts5-12 field data):
 *
 * - gtmObject ×6: a participant's Chrome extension
 *   (chrome-extension://…/scrapers/OneTrustScraper.js) threw an uncaught
 *   ReferenceError on our page; window.onerror/onunhandledrejection treated
 *   it as an EasyEyes crash — scheduler stopped, UI hidden, error dialog,
 *     crashQuit. The participant lost the study to their browser extension.
 * - getTracks ×6: RemoteCalibrator's stopVideo threw during quit cleanup;
 *     after the fullscreenExit audit was already written. The crash handler
 *     then stacked a second (_crash:) termination on top.
 *
 * Fixes under test: (1) extension-origin errors are ignored (warning only);
 * (2) once the experiment is terminating, crash handling stands down — the
 *   first termination label is final (quitPsychoJS's re-entry guard enforces
 *   the same for the quit path itself).
 */

import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const mockStatus: { terminated: boolean; currentFunction?: string } = {
  terminated: false,
};
const addData = jest.fn();
const schedulerStop = jest.fn();
const guiDialog = jest.fn();
const quitPsychoJS = jest.fn();

jest.mock("../components/globalPsychoJS", () => ({
  psychoJS: {
    _experiment: {
      addData,
      nextEntry: jest.fn(),
      save: jest.fn(),
      _thisEntry: {},
    },
    _scheduler: { stop: schedulerStop },
    _gui: { dialog: guiDialog },
    experiment: {
      addData,
      nextEntry: jest.fn(),
      save: jest.fn(),
      _thisEntry: {},
    },
  },
}));
jest.mock("../components/global", () => ({ status: mockStatus }));
jest.mock("../components/lifetime.js", () => ({
  quitPsychoJS: (...args: unknown[]) => quitPsychoJS(...args),
}));
jest.mock("../components/sentry", () => ({
  captureError: jest.fn(),
}));
jest.mock("sweetalert2", () => ({
  __esModule: true,
  default: { isVisible: () => false, close: jest.fn() },
}));
jest.mock("../components/errorContext.js", () => ({
  buildErrorContext: () => ({}),
}));
jest.mock("../components/runtimeErrorMessage.js", () => ({
  formatErrorContextAsText: () => "",
}));
jest.mock("../components/multiple-displays/utils.ts", () => ({
  setRcBoundaryWarningHandler: jest.fn(),
}));
jest.mock("../components/simulatedState", () => ({
  simulateActive: false,
  setEEState: jest.fn(),
}));
jest.mock("../components/utils.js", () => ({
  showCursor: jest.fn(),
}));

import { buildWindowErrorHandling } from "../components/errorHandling.js";

const OUR_SOURCE = "https://run.pavlovia.org/experiment/js/threshold.min.js";

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus.terminated = false;
  buildWindowErrorHandling({ read: () => [false] });
});

describe("window.onerror — extension-origin errors", () => {
  test("a chrome-extension script error does not crash the study", () => {
    const err = new ReferenceError("gtmObject is not defined");
    err.stack =
      "ReferenceError: gtmObject is not defined\n" +
      "    at chrome-extension://lcmpocpmhongcpejbnbhngadbhkadnin/scrapers/OneTrustScraper.js:88:20\n" +
      "    at sentryWrapped (https://browser.sentry-cdn.com/10.75.1/bundle.min.js:2:59527)";

    const ret = window.onerror!(
      "Uncaught ReferenceError: gtmObject is not defined",
      "chrome-extension://lcmpocpmhongcpejbnbhngadbhkadnin/scrapers/OneTrustScraper.js",
      88,
      20,
      err,
    );

    expect(ret).toBe(true);
    expect(addData).not.toHaveBeenCalledWith("error", expect.anything());
    expect(schedulerStop).not.toHaveBeenCalled();
    expect(guiDialog).not.toHaveBeenCalled();
    // Visible to the scientist as a non-fatal warning, not a termination.
    expect(addData).toHaveBeenCalledWith(
      "warning",
      expect.stringContaining("ignoredExtensionError"),
    );
  });

  test("our own errors still crash the study (GREEN preservation)", () => {
    const ret = window.onerror!(
      "Uncaught TypeError: bad thing",
      OUR_SOURCE,
      1,
      1,
      new TypeError("bad thing"),
    );

    expect(ret).toBe(true);
    expect(addData).toHaveBeenCalledWith("error", expect.anything());
    expect(schedulerStop).toHaveBeenCalledTimes(1);
    expect(guiDialog).toHaveBeenCalledWith(
      expect.objectContaining({ error: "bad thing", showOK: true }),
    );
  });
});

describe("window.onunhandledrejection — extension-origin errors", () => {
  test("an extension-stack rejection does not crash the study", () => {
    const err = new ReferenceError("gtmObject is not defined");
    err.stack =
      "ReferenceError: gtmObject is not defined\n" +
      "    at chrome-extension://abc/scrapers/S.js:1:1";

    const ret = window.onunhandledrejection!({
      reason: err,
    } as PromiseRejectionEvent);

    expect(ret).toBe(true);
    expect(addData).not.toHaveBeenCalledWith("error", expect.anything());
    expect(schedulerStop).not.toHaveBeenCalled();
    expect(guiDialog).not.toHaveBeenCalled();
    expect(addData).toHaveBeenCalledWith(
      "warning",
      expect.stringContaining("ignoredExtensionError"),
    );
  });

  test("our own rejections still crash the study (GREEN preservation)", () => {
    const ret = window.onunhandledrejection!({
      reason: new TypeError("our failure"),
    } as PromiseRejectionEvent);

    expect(ret).toBe(true);
    expect(addData).toHaveBeenCalledWith("error", expect.anything());
    expect(schedulerStop).toHaveBeenCalledTimes(1);
    expect(guiDialog).toHaveBeenCalled();
  });
});

describe("post-termination errors stand down (quit path is sacred)", () => {
  test("onerror after termination adds no rows, no dialog, no quit", () => {
    mockStatus.terminated = true;
    const ret = window.onerror!(
      "Uncaught TypeError: Cannot read properties of null (reading 'getTracks')",
      "https://browser.sentry-cdn.com/10.75.1/bundle.min.js",
      2,
      59550,
      new TypeError("Cannot read properties of null (reading 'getTracks')"),
    );

    expect(ret).toBe(true);
    expect(addData).not.toHaveBeenCalledWith("error", expect.anything());
    expect(schedulerStop).not.toHaveBeenCalled();
    expect(guiDialog).not.toHaveBeenCalled();
  });

  test("onunhandledrejection after termination stands down too", () => {
    mockStatus.terminated = true;
    const ret = window.onunhandledrejection!({
      reason: new TypeError("late failure"),
    } as PromiseRejectionEvent);

    expect(ret).toBe(true);
    expect(addData).not.toHaveBeenCalledWith("error", expect.anything());
    expect(guiDialog).not.toHaveBeenCalled();
  });
});
