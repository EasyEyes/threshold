/**
 * @jest-environment jsdom
 */
import { jest, expect, test } from "@jest/globals";

const swalFire = jest.fn();
const quitPsychoJS = jest.fn();
const mockStatus = {
  terminated: false,
  currentFunction: "trialRoutineEachFrame",
};
const rows: Array<Record<string, unknown>> = [];
const currentData: Record<string, unknown> = {};
const experiment = {
  experimentEnded: false,
  addData: jest.fn((key: string, value: unknown) => {
    currentData[key] = value;
  }),
  nextEntry: jest.fn(() => {
    rows.push({ ...currentData });
    for (const key of Object.keys(currentData)) delete currentData[key];
  }),
  save: jest.fn(),
};

jest.mock("sweetalert2", () => ({
  __esModule: true,
  default: { fire: (...args: unknown[]) => swalFire(...args) },
}));
jest.mock("../components/global", () => ({
  rc: { isIntentionalFullscreenExit: () => false },
  status: mockStatus,
}));
jest.mock("../components/lifetime.js", () => ({
  quitPsychoJS: (...args: unknown[]) => quitPsychoJS(...args),
  terminationProgressSuffix: () => "",
}));
jest.mock("../components/globalPsychoJS.js", () => ({
  psychoJS: {
    eventManager: { clearKeys: jest.fn() },
    experiment,
  },
}));
jest.mock("../components/utils.js", () => ({
  clearFullscreenWasLost: jest.fn(),
  isFullscreen: () => false,
  requestFullscreenSafe: jest.fn(),
  requestNativeFullscreen: jest.fn(),
  setupFullscreenMonitoring: jest.fn(),
  showCursor: jest.fn(),
}));
jest.mock("../components/runtimeErrorMessage.js", () => ({
  getLanguageDirection: () => "ltr",
  getParticipantLanguage: () => "en",
  phraseOrNull: () => null,
}));
jest.mock("../components/markdownInline.js", () => ({
  renderMarkdown: (s: string) => s,
  renderPhraseMarkdown: (s: string) => s,
}));

import {
  fullscreenPauseIsActive,
  showFullscreenPauseOverlay,
} from "../components/fullscreenPause.js";
import { registerVisibilityBreadcrumb } from "../components/visibilityBreadcrumb";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("tab hiding during WhyQuit commits only a breadcrumb, not the quit audit", async () => {
  let releasePrompt!: (value: { isConfirmed: boolean; value: string }) => void;
  const prompt = new Promise<{ isConfirmed: boolean; value: string }>(
    (resolve) => {
      releasePrompt = resolve;
    },
  );
  swalFire
    .mockImplementationOnce(() => Promise.resolve({ isDenied: true }))
    .mockImplementationOnce(() => prompt);

  const unregister = registerVisibilityBreadcrumb({
    stamp: (note) => {
      experiment.addData("warning", note);
      experiment.nextEntry();
    },
    save: experiment.save,
    enabled: () => !mockStatus.terminated && !experiment.experimentEnded,
    getCurrentFunction: () => mockStatus.currentFunction,
    now: () => 1000,
  });

  showFullscreenPauseOverlay();
  await flush();
  expect(fullscreenPauseIsActive()).toBe(true);

  try {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(rows).toEqual([{ warning: "tabHiddenAt:trialRoutineEachFrame" }]);
  } finally {
    if (unregister) unregister();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    releasePrompt({ isConfirmed: true, value: "" });
    await flush();
  }
});
