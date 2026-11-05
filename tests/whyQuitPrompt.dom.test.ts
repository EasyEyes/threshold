/**
 * @jest-environment jsdom
 *
 * EE_WhyQuit prompt (Denis request 2): choosing Quit in the fullscreen-pause
 * overlay must ask, via REAL SweetAlert2 (not the fire mock elsewhere), why
 * the participant is leaving — a textarea they may leave empty — and save any
 * answer to the termination row (whyQuit column) BEFORE quitPsychoJS starts.
 * The prompt is optional: blank or dismissed still quits.
 */

import {
  jest,
  expect,
  describe,
  test,
  beforeAll,
  afterEach,
  beforeEach,
} from "@jest/globals";

const mockStatus: { terminated: boolean } = { terminated: false };
jest.mock("../components/global", () => ({
  rc: { isIntentionalFullscreenExit: () => false },
  status: mockStatus,
}));

jest.mock("../threshold", () => ({ paramReader: {} }));

const quitPsychoJS = jest.fn();
jest.mock("../components/lifetime.js", () => ({
  quitPsychoJS: (...args: unknown[]) => quitPsychoJS(...args),
  terminationProgressSuffix: () => "",
}));

const addData = jest.fn();
jest.mock("../components/globalPsychoJS.js", () => ({
  psychoJS: {
    eventManager: { clearKeys: jest.fn() },
    experiment: { addData },
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

// Real markdownInline (marked absent in jsdom → its regex fallback runs) and
// REAL sweetalert2 — this file exists to exercise the actual Swal config.
import { showFullscreenPauseOverlay } from "../components/fullscreenPause.js";
import Swal from "sweetalert2";

const flush = () => new Promise((r) => setTimeout(r, 0));

let scrollSpy: jest.SpyInstance;

beforeAll(() => {
  scrollSpy = jest.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  // Close whatever popup is open so a failing assertion cannot bleed Swal's
  // singleton state into the next test (a replaced popup resolves as
  // dismissed, auto-advancing _handleQuit).
  Swal.close();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus.terminated = false;
  delete (mockStatus as any).fullscreenQuitAudit;
});

/** Overlay → Quit (deny); resolves once the why-quit prompt is open. */
const openWhyQuitPrompt = async () => {
  showFullscreenPauseOverlay();
  await flush();
  Swal.clickDeny();
  await flush();
  expect(Swal.getPopup()?.classList.contains("ee-why-quit-popup")).toBe(true);
};

describe("why-quit prompt (real SweetAlert2)", () => {
  test("Quit → textarea prompt → answer saved before quitPsychoJS", async () => {
    await openWhyQuitPrompt();

    // Second popup: the why-quit prompt — a real, empty-able textarea.
    const popup = Swal.getPopup();
    const input = Swal.getInput() as HTMLTextAreaElement | null;
    expect(input?.tagName).toBe("TEXTAREA");
    expect(input?.value).toBe("");
    expect(popup?.textContent).toContain("sorry to see you go");
    input!.value = "  Took too long  ";
    Swal.clickConfirm();
    await flush();
    await flush();

    expect(addData).toHaveBeenCalledWith("whyQuit", "Took too long");
    expect(addData.mock.invocationCallOrder[0]).toBeLessThan(
      quitPsychoJS.mock.invocationCallOrder[0],
    );
    expect(quitPsychoJS).toHaveBeenCalledTimes(1);
    expect(quitPsychoJS.mock.calls[0][5]).toBe("fullscreenQuit");
  });

  test("blank answer: modal was shown, so the empty whyQuit cell rides the row", async () => {
    await openWhyQuitPrompt();
    Swal.clickConfirm();
    await flush();
    await flush();

    // Pre-stamped empty cell stays (modal was shown); blank adds nothing.
    expect(addData.mock.calls.filter(([k]) => k === "whyQuit")).toEqual([
      ["whyQuit", ""],
    ]);
    expect(quitPsychoJS).toHaveBeenCalledTimes(1);
    expect(quitPsychoJS.mock.calls[0][5]).toBe("fullscreenQuit");
  });

  test("keys typed at the why-quit prompt never reach the experiment's key listeners", async () => {
    await openWhyQuitPrompt();

    // PsychoJS's EventManager buffers every window keydown with no target
    // filtering (psychojs/src/core/EventManager.js _addKeyListeners). While
    // the legacy-path scheduler is still live, a stray key with focus outside
    // the textarea must not become a trial response (and must not complete a
    // trial mid-quit, splitting the staged audit from its feedback).
    const received: string[] = [];
    const listener = (e: KeyboardEvent) => received.push(e.key);
    window.addEventListener("keydown", listener);
    let typed: KeyboardEvent | null = null;
    try {
      const input = Swal.getInput() as HTMLTextAreaElement;
      typed = new KeyboardEvent("keydown", { key: "a", bubbles: true });
      input.dispatchEvent(typed);
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "b", bubbles: true }),
      );
    } finally {
      window.removeEventListener("keydown", listener);
    }
    expect(received).toEqual([]);
    // Only propagation is stopped — the textarea's default typing action
    // (character insertion) must survive.
    expect(typed?.defaultPrevented).toBe(false);

    Swal.clickConfirm();
    await flush();
    await flush();
    expect(quitPsychoJS).toHaveBeenCalledTimes(1);
  });

  test("Resume never asks; only Quit does", async () => {
    showFullscreenPauseOverlay();
    await flush();
    Swal.clickConfirm(); // Resume
    await flush();
    await flush();

    expect(document.querySelector(".ee-why-quit-popup")).toBeNull();
    expect(quitPsychoJS).not.toHaveBeenCalled();
    expect(addData).not.toHaveBeenCalled();
  });

  test("an externally closed prompt still quits and releases the key blocker", async () => {
    await openWhyQuitPrompt();
    // Hostile close (console script, extension, ...) — not our afterEach.
    Swal.close();
    await flush();
    await flush();
    await flush();

    expect(quitPsychoJS).toHaveBeenCalledTimes(1);
    expect(window.getEventListeners?.(window)?.keydown ?? true).toBeTruthy();
    // Blocker released: a keydown now propagates to window listeners again.
    const received: string[] = [];
    const listener = (e: KeyboardEvent) => received.push(e.key);
    window.addEventListener("keydown", listener);
    try {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "c", bubbles: true }),
      );
    } finally {
      window.removeEventListener("keydown", listener);
    }
    expect(received).toEqual(["c"]);
  });

  test("confirming the prompt removes the key blocker for the rest of the session", async () => {
    await openWhyQuitPrompt();
    Swal.clickConfirm();
    await flush();
    await flush();
    expect(quitPsychoJS).toHaveBeenCalledTimes(1);

    const received: string[] = [];
    const listener = (e: KeyboardEvent) => received.push(e.key);
    window.addEventListener("keydown", listener);
    try {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "d", bubbles: true }),
      );
    } finally {
      window.removeEventListener("keydown", listener);
    }
    expect(received).toEqual(["d"]);
  });
});
