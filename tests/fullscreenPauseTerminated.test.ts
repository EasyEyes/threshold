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

// Default resolution (Resume) so the overlay's _overlayOpen flag resets
// between tests; individual tests override with mockImplementationOnce.
const swalFire = jest.fn(() => Promise.resolve({ isConfirmed: true }));
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

const flushMicrotasks = () => new Promise((r) => setTimeout(r, 0));

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

// ── RC onQuit with an unknown/future trigger routes here instead of ────────
// terminating directly. The Quit the participant then chooses must carry
// RC's trigger in its label, and only for that overlay invocation.
describe("overlay opened by RC's onQuit hook carries the trigger", () => {
  test("Quit from an RC-opened overlay labels fullscreenExit(rc:<trigger>)", async () => {
    swalFire.mockImplementationOnce(() => Promise.resolve({ isDenied: true }));

    showFullscreenPauseOverlay("futureQuitHook");
    await flushMicrotasks();

    expect(quitPsychoJS).toHaveBeenCalledTimes(1);
    expect(quitPsychoJS.mock.calls[0][5]).toBe(
      "fullscreenExit(rc:futureQuitHook)",
    );
  });

  test("Resume consumes the trigger; a later genuine Esc quit is plain fullscreenExit", async () => {
    swalFire.mockImplementationOnce(() =>
      Promise.resolve({ isConfirmed: true }),
    );
    showFullscreenPauseOverlay("futureQuitHook");
    await flushMicrotasks();
    expect(quitPsychoJS).not.toHaveBeenCalled();

    // Later, unrelated exit (participant pressed Esc) → overlay without a
    // pending RC trigger: the stale trigger must NOT ride this quit.
    quitPsychoJS.mockClear();
    swalFire.mockImplementationOnce(() => Promise.resolve({ isDenied: true }));
    showFullscreenPauseOverlay();
    await flushMicrotasks();

    expect(quitPsychoJS).toHaveBeenCalledTimes(1);
    expect(quitPsychoJS.mock.calls[0][5]).toBe("fullscreenExit");
  });

  test("overlay that cannot open (terminated) still consumes the trigger", async () => {
    mockStatus.terminated = true;
    showFullscreenPauseOverlay("futureQuitHook");
    expect(swalFire).not.toHaveBeenCalled();

    mockStatus.terminated = false;
    swalFire.mockImplementationOnce(() => Promise.resolve({ isDenied: true }));
    showFullscreenPauseOverlay();
    await flushMicrotasks();

    expect(quitPsychoJS.mock.calls[0][5]).toBe("fullscreenExit");
  });
});
