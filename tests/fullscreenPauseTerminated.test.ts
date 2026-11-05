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
const phraseOrNull = jest.fn(() => null);
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
  phraseOrNull: (...args: unknown[]) => phraseOrNull(...args),
}));

jest.mock("../components/markdownInline.js", () => ({
  renderMarkdown: (s: string) => s,
  renderPhraseMarkdown: (s: string) => s,
}));

import {
  showFullscreenPauseOverlay,
  initFullscreenPauseOverlay,
  fullscreenPauseIsActive,
} from "../components/fullscreenPause.js";
import {
  startInteractionObservation,
  stopInteractionObservation,
} from "../components/interaction/observation";

const flushMicrotasks = () => new Promise((r) => setTimeout(r, 0));

test("managed pause never opens SweetAlert and shutdown removes its modal", () => {
  startInteractionObservation({
    enabled: true,
    managed: true,
    rc: {},
    window,
    document,
  });
  try {
    initFullscreenPauseOverlay();
    showFullscreenPauseOverlay();
    expect(swalFire).not.toHaveBeenCalled();
    expect(document.getElementById("ee-interaction-pause")).not.toBeNull();
    expect(fullscreenPauseIsActive()).toBe(true);
    const rcEscape = jest.fn();
    document.addEventListener("keydown", rcEscape, true);
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    document.activeElement.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(rcEscape).not.toHaveBeenCalled();
    document.removeEventListener("keydown", rcEscape, true);
  } finally {
    stopInteractionObservation();
  }
  expect(document.getElementById("ee-interaction-pause")).toBeNull();
  expect(fullscreenPauseIsActive()).toBe(false);
});

test("observation retains pause until popup destruction, even after Resume resolves", async () => {
  const diagnostics = startInteractionObservation({
    enabled: true,
    rc: {},
    window,
    document,
  })!;
  try {
    showFullscreenPauseOverlay();
    const popup = (
      swalFire.mock.calls[0] as unknown as [{ didDestroy: () => void }]
    )[0];
    expect(diagnostics.getSnapshot().interruptions).toHaveLength(1);
    await flushMicrotasks();
    expect(diagnostics.getSnapshot().interruptions).toHaveLength(1);
    popup.didDestroy();
    expect(diagnostics.getSnapshot().interruptions).toHaveLength(0);
    expect(quitPsychoJS).not.toHaveBeenCalled();
  } finally {
    stopInteractionObservation();
  }
});

beforeEach(() => {
  swalFire.mockClear();
  quitPsychoJS.mockClear();
  addData.mockClear();
  phraseOrNull.mockClear();
  mockStatus.terminated = false;
  delete (mockStatus as any).fullscreenQuitAudit;
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
  test("Quit from an RC-opened overlay labels fullscreenQuit(rc:<trigger>)", async () => {
    swalFire.mockImplementationOnce(() => Promise.resolve({ isDenied: true }));

    showFullscreenPauseOverlay("futureQuitHook");
    await flushMicrotasks();

    expect(quitPsychoJS).toHaveBeenCalledTimes(1);
    expect(quitPsychoJS.mock.calls[0][5]).toBe(
      "fullscreenQuit(rc:futureQuitHook)",
    );
  });

  test("Resume consumes the trigger; a later genuine Esc quit is plain fullscreenQuit", async () => {
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
    expect(quitPsychoJS.mock.calls[0][5]).toBe("fullscreenQuit");
  });

  test("overlay that cannot open (terminated) still consumes the trigger", async () => {
    mockStatus.terminated = true;
    showFullscreenPauseOverlay("futureQuitHook");
    expect(swalFire).not.toHaveBeenCalled();

    mockStatus.terminated = false;
    swalFire.mockImplementationOnce(() => Promise.resolve({ isDenied: true }));
    showFullscreenPauseOverlay();
    await flushMicrotasks();

    expect(quitPsychoJS.mock.calls[0][5]).toBe("fullscreenQuit");
  });
});

describe("whyQuit feedback", () => {
  test("Quit asks EE_WhyQuit and saves the answer before termination", async () => {
    swalFire
      .mockImplementationOnce(() => Promise.resolve({ isDenied: true }))
      .mockImplementationOnce(() =>
        Promise.resolve({ isConfirmed: true, value: "  Too long.  " }),
      );

    showFullscreenPauseOverlay();
    await flushMicrotasks();

    expect(phraseOrNull).toHaveBeenCalledWith("EE_WhyQuit", "en");
    expect(swalFire).toHaveBeenCalledTimes(2);
    expect(swalFire.mock.calls[1][0]).toMatchObject({
      html: "We’re sorry to see you go. Would you be willing to share why? Your feedback helps us improve.",
      input: "textarea",
      showCancelButton: false,
      confirmButtonText: "OK",
      customClass: { popup: "ee-why-quit-popup" },
    });
    expect(addData).toHaveBeenCalledWith("whyQuit", "Too long.");
    expect(addData.mock.invocationCallOrder[0]).toBeLessThan(
      quitPsychoJS.mock.invocationCallOrder[0],
    );
    expect(quitPsychoJS.mock.calls[0][5]).toBe("fullscreenQuit");
  });

  test("blank optional feedback still quits, with the empty whyQuit cell in place", async () => {
    swalFire
      .mockImplementationOnce(() => Promise.resolve({ isDenied: true }))
      .mockImplementationOnce(() =>
        Promise.resolve({ isConfirmed: true, value: "   " }),
      );

    showFullscreenPauseOverlay();
    await flushMicrotasks();

    expect(swalFire).toHaveBeenCalledTimes(2);
    // The cell is present (pre-stamped empty) because the modal was shown;
    // a blank answer never overwrites it with anything else.
    expect(addData.mock.calls.filter(([k]) => k === "whyQuit")).toEqual([
      ["whyQuit", ""],
    ]);
    expect(quitPsychoJS).toHaveBeenCalledTimes(1);
  });

  test("a feedback-popup failure cannot block Quit", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    swalFire
      .mockImplementationOnce(() => Promise.resolve({ isDenied: true }))
      .mockRejectedValueOnce(new Error("popup failed"));

    try {
      showFullscreenPauseOverlay();
      await flushMicrotasks();

      expect(swalFire).toHaveBeenCalledTimes(2);
      expect(addData).toHaveBeenCalledWith("whyQuit", "");
      expect(quitPsychoJS).toHaveBeenCalledTimes(1);
      expect(quitPsychoJS.mock.calls[0][5]).toBe("fullscreenQuit");
    } finally {
      warn.mockRestore();
    }
  });

  test("managed pause Quit uses the same feedback prompt", async () => {
    startInteractionObservation({
      enabled: true,
      managed: true,
      rc: {},
      window,
      document,
    });
    try {
      initFullscreenPauseOverlay();
      showFullscreenPauseOverlay();
      swalFire.mockImplementationOnce(() =>
        Promise.resolve({ isConfirmed: true, value: "Frustrating setup" }),
      );
      const quit = document.querySelector<HTMLElement>(
        "#ee-interaction-pause button[data-action='quit']",
      )!;
      quit.click();
      await flushMicrotasks();

      expect(swalFire).toHaveBeenCalledTimes(1);
      expect(addData).toHaveBeenCalledWith("whyQuit", "Frustrating setup");
      expect(quitPsychoJS.mock.calls[0][5]).toBe("fullscreenQuit");
    } finally {
      stopInteractionObservation();
    }
  });
});

// ── staged quit audit ──────────────────────────────────────────────────────
// Quit metadata stays OUTSIDE the live trial row while feedback is open.
// Visibility breadcrumbs and other asynchronous row commits therefore cannot
// detach the audit from its answer. A real unload applies and commits it.

type PromptResult = { isConfirmed: boolean; value: string };

/** Overlay -> Quit, with the why-quit prompt held open; returns its releaser. */
const heldWhyQuitPrompt = async () => {
  let releasePrompt!: (v: PromptResult) => void;
  const promptGate = new Promise<PromptResult>((resolve) => {
    releasePrompt = resolve;
  });
  swalFire
    .mockImplementationOnce(() => Promise.resolve({ isDenied: true }))
    .mockImplementationOnce(() => promptGate);
  showFullscreenPauseOverlay();
  await flushMicrotasks();
  return releasePrompt;
};

describe("staged quit audit (tab close during the prompt)", () => {
  test("label, breadcrumb and empty whyQuit are staged outside the live row", async () => {
    const releasePrompt = await heldWhyQuitPrompt();

    try {
      expect(swalFire).toHaveBeenCalledTimes(2);
      expect((mockStatus as any).fullscreenQuitAudit).toEqual({
        error: "fullscreenQuit",
        currentFunction: "",
        experimentCompleteBool: false,
        whyQuit: "",
      });
      expect(addData).not.toHaveBeenCalledWith("error", expect.anything());
      expect(addData).not.toHaveBeenCalledWith("whyQuit", expect.anything());
    } finally {
      releasePrompt({ isConfirmed: true, value: "Too long" });
      await flushMicrotasks();
    }

    expect(addData).toHaveBeenCalledWith("whyQuit", "Too long");
    expect(quitPsychoJS).toHaveBeenCalledTimes(1);
    expect(quitPsychoJS.mock.calls[0][5]).toBe("fullscreenQuit");
  });

  test("the staged audit is complete and blank feedback reaches the final row", async () => {
    const releasePrompt = await heldWhyQuitPrompt();

    try {
      expect((mockStatus as any).fullscreenQuitAudit).toMatchObject({
        experimentCompleteBool: false,
        whyQuit: "",
      });
    } finally {
      releasePrompt({ isConfirmed: true, value: "" });
      await flushMicrotasks();
    }

    expect(addData).toHaveBeenCalledWith("whyQuit", "");
    expect(quitPsychoJS).toHaveBeenCalledTimes(1);
  });

  test("trial pause remains active during the why-quit prompt (legacy)", async () => {
    const releasePrompt = await heldWhyQuitPrompt();
    try {
      expect(fullscreenPauseIsActive()).toBe(true);
    } finally {
      releasePrompt({ isConfirmed: true, value: "" });
      await flushMicrotasks();
    }
  });

  test("trial pause remains active during the why-quit prompt (managed)", async () => {
    let releasePrompt: (v: {
      isConfirmed: boolean;
      value: string;
    }) => void = () => {};
    const promptGate = new Promise<{ isConfirmed: boolean; value: string }>(
      (resolve) => {
        releasePrompt = resolve;
      },
    );
    startInteractionObservation({
      enabled: true,
      managed: true,
      rc: {},
      window,
      document,
    });
    try {
      initFullscreenPauseOverlay();
      showFullscreenPauseOverlay();
      swalFire.mockImplementationOnce(() => promptGate);
      const quit = document.querySelector<HTMLElement>(
        "#ee-interaction-pause button[data-action='quit']",
      )!;
      quit.click();
      await flushMicrotasks();

      expect(fullscreenPauseIsActive()).toBe(true);
    } finally {
      releasePrompt({ isConfirmed: true, value: "" });
      await flushMicrotasks();
      stopInteractionObservation();
    }
  });

  test("Esc during the why-quit prompt cannot re-open the pause overlay (managed)", async () => {
    let releasePrompt: (v: {
      isConfirmed: boolean;
      value: string;
    }) => void = () => {};
    const promptGate = new Promise<{ isConfirmed: boolean; value: string }>(
      (resolve) => {
        releasePrompt = resolve;
      },
    );
    startInteractionObservation({
      enabled: true,
      managed: true,
      rc: {},
      window,
      document,
    });
    try {
      initFullscreenPauseOverlay();
      showFullscreenPauseOverlay();
      swalFire.mockImplementationOnce(() => promptGate);
      const quit = document.querySelector<HTMLElement>(
        "#ee-interaction-pause button[data-action='quit']",
      )!;
      quit.click();
      await flushMicrotasks();
      expect(swalFire).toHaveBeenCalledTimes(1); // prompt open, unanswered

      // A real Esc press exits fullscreen → fullscreenchange →
      // _onFullscreenExit → _managedPause.request(). Monitoring is mocked
      // here, so re-enter through the public entry to drive that exact
      // chain: the pause modal must not reappear over the open prompt.
      showFullscreenPauseOverlay();
      await flushMicrotasks();

      expect(document.getElementById("ee-interaction-pause")).toBeNull();
      expect(swalFire).toHaveBeenCalledTimes(1);
      releasePrompt({ isConfirmed: true, value: "" });
      await flushMicrotasks();
      expect(quitPsychoJS).toHaveBeenCalledTimes(1);
    } finally {
      stopInteractionObservation();
    }
  });

  test("a second overlay request while quitting is ignored (no Resume after Quit)", async () => {
    const releasePrompt = await heldWhyQuitPrompt();
    expect(swalFire).toHaveBeenCalledTimes(2);

    // Mid-prompt re-fire (RC onQuit unknown trigger re-firing, or a
    // re-enter+re-exit of fullscreen): must not replace the why-quit
    // prompt with another Resume/Quit overlay — the participant already
    // chose Quit.
    showFullscreenPauseOverlay("lateRcHook");
    await flushMicrotasks();
    expect(swalFire).toHaveBeenCalledTimes(2);

    releasePrompt({ isConfirmed: true, value: "Too long" });
    await flushMicrotasks();
    expect(quitPsychoJS).toHaveBeenCalledTimes(1);
    expect(quitPsychoJS.mock.calls[0][5]).toBe("fullscreenQuit");
  });

  test("Resume never touches the row: no whyQuit column without the modal", async () => {
    swalFire.mockImplementationOnce(() =>
      Promise.resolve({ isConfirmed: true }),
    );

    showFullscreenPauseOverlay();
    await flushMicrotasks();

    expect(addData).not.toHaveBeenCalled();
    expect(quitPsychoJS).not.toHaveBeenCalled();
  });
});
