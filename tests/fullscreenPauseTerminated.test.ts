/**
 * @jest-environment jsdom
 *
 * quitPsychoJS leaves fullscreen itself, right before the final upload. The
 * fullscreen-exit pause overlay must NOT react to that exit: it would place a
 * "Quit study" button beside the saving indicator, and a participant pressing
 * it during a slow upload re-enters quitPsychoJS with isCompleted=false,
 * overwriting a finished session as "fullscreenExit (block 31/31, trial 6/6)"
 * (Compare3Languages131, Sep 2026).
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

const swalFire = jest.fn(() => new Promise(() => {}));
jest.mock("sweetalert2", () => ({
  __esModule: true,
  default: { fire: (...args: unknown[]) => swalFire(...args) },
}));

const mockStatus: { terminated: boolean } = { terminated: false };
jest.mock("../components/global", () => ({
  rc: { isIntentionalFullscreenExit: () => false },
  status: mockStatus,
}));

jest.mock("../threshold", () => ({ paramReader: {} }));

const quitPsychoJS = jest.fn();
jest.mock("../components/lifetime.js", () => ({
  quitPsychoJS: (...args: unknown[]) => quitPsychoJS(...args),
}));

jest.mock("../components/globalPsychoJS.js", () => ({
  psychoJS: { eventManager: { clearKeys: jest.fn() } },
}));

jest.mock("../components/utils.js", () => ({
  clearFullscreenWasLost: jest.fn(),
  isFullscreen: () => false,
  requestFullscreenSafe: jest.fn(),
  setupFullscreenMonitoring: jest.fn(),
  showCursor: jest.fn(),
}));

jest.mock("../components/runtimeErrorMessage.js", () => ({
  getLanguageDirection: () => "ltr",
  getParticipantLanguage: () => "en",
  phraseOrNull: () => null,
}));

jest.mock("../components/markdownInline.js", () => ({
  renderPhraseMarkdown: (s: string) => s,
}));

import { showFullscreenPauseOverlay } from "../components/fullscreenPause.js";

beforeEach(() => {
  swalFire.mockClear();
  quitPsychoJS.mockClear();
  mockStatus.terminated = false;
});

describe("fullscreen pause overlay vs. experiment termination", () => {
  test("shows Resume/Quit when the participant leaves fullscreen mid-study", () => {
    showFullscreenPauseOverlay();
    expect(swalFire).toHaveBeenCalledTimes(1);
  });

  test("stays silent once quitPsychoJS has begun terminating (final save in flight)", () => {
    mockStatus.terminated = true;
    showFullscreenPauseOverlay();
    expect(swalFire).not.toHaveBeenCalled();
    expect(quitPsychoJS).not.toHaveBeenCalled();
  });
});
