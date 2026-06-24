/**
 * In-browser simulated participant.
 *
 * Subscribes to the #ee-state DOM element (published by simulatedState.ts) and
 * dispatches synthetic keyboard / click events to drive the experiment. Lives
 * entirely in the browser — the Node-side Playwright script (server/simulate.ts)
 * is purely an observer of side-effects (state changes, output CSV).
 *
 * Seeded RNG: if window.__SIM_SEED__ is set (e.g. via page.addInitScript from
 * the simulate CLI), uses mulberry32(seed) for deterministic responses.
 * Otherwise uses Math.random (production/dev with no CLI).
 */

import {
  selectTypedResponse,
  selectClickedIndex,
  mulberry32,
  type Rng,
} from "./simulationModel";
import { enableInstrumentation } from "./psychojsInstrumentation";
import { installParamReaderReporter } from "./paramReaderInstrumentation";
import { installErrorReporter } from "./errorInstrumentation";
import { installDialogReporter } from "./dialogInstrumentation";
import { logDispatch } from "./simDispatchLog";
import { activateSimulation } from "./simulatedState";
import { MinimalStim } from "../psychojs/src/core/MinimalStim.js";
import { ParamReader } from "../parameters/paramReader.js";

interface BrowserEEState {
  phase: string | null;
  trial: string | null;
  trialTotal: string | null;
  block: string | null;
  responseTyped: boolean;
  validCharsTyped: string;
  responseClicked: boolean;
  validCharsClicked: string;
  keypadUrl: string | null;
  dialogOpen: string | null;
  correctResponse: string | null;
  simulationModel: string | null;
  trialLevel: string | null;
  simulationThreshold: string | null;
  simulationBeta: string | null;
  simulationDelta: string | null;
  thresholdProportionCorrect: string | null;
  error: string | null;
}

function readEEStateFromDOM(): BrowserEEState {
  const s = document.getElementById("ee-state");
  const get = (k: string) => s?.getAttribute(k) ?? null;
  return {
    phase: get("data-phase"),
    trial: get("data-trial"),
    trialTotal: get("data-trial-total"),
    block: get("data-block"),
    responseTyped: get("data-response-typed") === "true",
    validCharsTyped: get("data-valid-chars-typed") ?? "",
    responseClicked: get("data-response-clicked") === "true",
    validCharsClicked: get("data-valid-chars-clicked") ?? "",
    keypadUrl: get("data-keypad-url"),
    dialogOpen: get("data-dialog-open"),
    correctResponse: get("data-correct-response"),
    simulationModel: get("data-simulation-model"),
    trialLevel: get("data-trial-level"),
    simulationThreshold: get("data-simulation-threshold"),
    simulationBeta: get("data-simulation-beta"),
    simulationDelta: get("data-simulation-delta"),
    thresholdProportionCorrect: get("data-threshold-proportion-correct"),
    error: get("data-error"),
  };
}

/**
 * Map PsychoJS key names to the character/code that the DOM KeyboardEvent
 * needs. PsychoJS stores keys by name ("space", "ArrowLeft", etc.), but
 * KeyboardEvent.key uses " " for space and KeyboardEvent.code uses "Space".
 * Without this mapping, dispatchKey("space") would create a 5-char key event
 * that PsychoJS's keyList:["space"] matcher won't recognize.
 */
const KEY_NAME_MAP: Record<
  string,
  { key: string; code: string; keyCode: number }
> = {
  space: { key: " ", code: "Space", keyCode: 32 },
  Space: { key: " ", code: "Space", keyCode: 32 },
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  ArrowUp: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
  up: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
  down: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
  left: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
  right: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  Enter: { key: "Enter", code: "Enter", keyCode: 13 },
  return: { key: "Enter", code: "Enter", keyCode: 13 },
  Escape: { key: "Escape", code: "Escape", keyCode: 27 },
  esc: { key: "Escape", code: "Escape", keyCode: 27 },
};

export function dispatchKey(char: string): void {
  const mapped = KEY_NAME_MAP[char];
  const key = mapped?.key ?? (char === " " ? " " : char);
  const code =
    mapped?.code ??
    (char === " "
      ? "Space"
      : char.length === 1
      ? `Key${char.toUpperCase()}`
      : char);
  const keyCode = mapped?.keyCode ?? char.charCodeAt(0);
  // Log BEFORE dispatching so the [sim:dispatch] line precedes any synchronous
  // side-effects (SweetAlert confirms, jQuery UI clicks, PsychoJS eventManager
  // queues). Observer can then correlate dispatch → state-change in JSONL order.
  logDispatch("key", char === " " ? "Space" : char);
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      code,
      key,
      keyCode,
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** Click an element (if it exists) and log the dispatch.
 * `label` should be a short, descriptive tag for log readability.
 * Logs BEFORE click so synchronous side-effects appear after in JSONL. */
export function dispatchClick(
  el: HTMLElement | null | undefined,
  label: string,
): void {
  if (!el) return;
  logDispatch("click", label);
  el.click();
  // Dispatch mouse events at the element's coordinates for components
  // that use PsychoJS Mouse (mousedown/mouseup) instead of DOM onclick.
  // mousedown and mouseup are split across frames so PsychoJS's per-frame
  // mouse.getPressed() sees the pressed state.
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const opts = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  };
  window.dispatchEvent(new MouseEvent("mousemove", opts));
  window.dispatchEvent(new MouseEvent("mousedown", opts));
  setTimeout(() => {
    window.dispatchEvent(new MouseEvent("mouseup", opts));
  }, 50);
}

/** Poll until the experiment has fully loaded (phase is non-null and not "loading"). */
export function buildKey(
  phase: string | null,
  trial: string | null,
  dialogOpen: string | null,
): string {
  return `${phase}:${trial}:${dialogOpen ?? ""}`;
}

function waitForLoad(): Promise<void> {
  return new Promise((resolve) => {
    const poll = setInterval(() => {
      const { phase } = readEEStateFromDOM();
      if (phase && phase !== "loading") {
        clearInterval(poll);
        resolve();
      }
    }, 300);
  });
}

/**
 * Handle an open SweetAlert2 dialog (Q&A block). Returns true if the dialog
 * was handled (radio or textarea found), false to let the phase handler run.
 *
 * Radio (multiple choice): check a random option. The 200ms auto-confirm
 * interval in threshold.js detects the checked input and clicks .swal2-confirm.
 * Textarea (free-form): type a short response and click .swal2-confirm.
 */
function handleQADialog(rng: Rng): boolean {
  const radios =
    document.querySelectorAll<HTMLInputElement>(".swal2-radio input");
  if (radios.length > 0) {
    const idx = Math.floor(rng() * radios.length);
    radios[idx].checked = true;
    radios[idx].dispatchEvent(new Event("change", { bubbles: true }));
    logDispatch("qa-radio", `idx=${idx}/${radios.length}`);
    return true;
  }
  const textarea =
    document.querySelector<HTMLTextAreaElement>(".swal2-textarea");
  if (textarea) {
    textarea.value = "sim";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    const confirm = document.querySelector<HTMLElement>(".swal2-confirm");
    dispatchClick(confirm, ".swal2-confirm (qa-textarea)");
    return true;
  }
  return false;
}

/**
 * Handle a SweetAlert dialog that blocks the loading phase — typically the
 * participant-ID confirmation prompt ("Press OK if that's you") or any other
 * pre-experiment modal. Returns true if the dialog was handled.
 *
 * Strategy:
 *   1. Radio buttons → check one (Q&A during loading).
 *   2. Textarea → type "sim" and confirm.
 *   3. Plain confirm button (no radio/textarea) → click .swal2-confirm.
 *      This dismisses participant-ID prompts, "are you sure?" popups, etc.
 */
function handleLoadingDialog(rng: Rng): boolean {
  if (handleQADialog(rng)) return true;
  const confirm = document.querySelector<HTMLElement>(".swal2-confirm");
  if (confirm && confirm.offsetParent !== null) {
    dispatchClick(confirm, ".swal2-confirm (loading dialog)");
    return true;
  }
  return false;
}

export function act(
  state: BrowserEEState,
  rng: Rng,
  onInstructionClick: () => void,
): void {
  const phase = state.phase!;

  // When an error has been reported (e.g. crash, render failure, NaN in
  // response model), stop driving the experiment. Continued dispatch into
  // a broken state machine produces misleading logs and may compound errors.
  if (state.error) {
    return;
  }

  // Handle open Swal dialogs first (Q&A during fixation phase, etc.).
  if (state.dialogOpen && handleQADialog(rng)) return;

  switch (phase) {
    case "compatibility": {
      // Device-compatibility flow renders many sub-pages. Try each handle
      // in priority order; the first match wins. Always clear pendingKey
      // after acting so the next sub-page is handled on the next poll.

      // 1. Camera-preview selection: "click the video in which you face
      //    yourself". This screen has no button — the participant clicks a
      //    <video> element to confirm the camera. RETURN is also accepted.
      const cameraPreview = document.querySelector<HTMLElement>(
        "video[id^='camera-preview']:not([id*='bottom'])",
      );
      if (cameraPreview && cameraPreview.offsetParent !== null) {
        dispatchClick(cameraPreview, "video#camera-preview (select camera)");
        onInstructionClick();
        break;
      }

      // 2. Standard primary-action button ("Run remaining tests", "Proceed",
      //    "Continue"…) — these all carry the `btn-success` class.
      const visibleSuccessBtn = Array.from(
        document.querySelectorAll<HTMLButtonElement>("button.btn-success"),
      ).find((b) => b.offsetParent !== null && !b.disabled);
      if (visibleSuccessBtn) {
        dispatchClick(visibleSuccessBtn, "button.btn-success (compat)");
        onInstructionClick();
        break;
      }

      // 3. Fallback: legacy #procced-btn id, or any visible Proceed/Continue
      //    button. As a last resort, dispatch Enter (some screens accept
      //    RETURN as a shortcut).
      const fallback =
        document.getElementById("procced-btn") ??
        document.querySelector<HTMLElement>(
          'button[id*="proceed" i], button[id*="continue" i]',
        );
      if (fallback) {
        dispatchClick(fallback, "#procced-btn|proceed|continue");
        onInstructionClick();
      } else {
        dispatchKey("Enter");
        onInstructionClick();
      }
      break;
    }
    case "consent":
      dispatchClick(document.getElementById("form-yes"), "#form-yes");
      break;
    case "calibration": {
      // The sim forces debug:true (threshold.js rc.panel call), so rc renders
      // its own "Simulate calibration and continue" button. Click it once per
      // calibration task — the polling loop resets pendingKey after each act()
      // so we re-enter on the next tick for multi-task panels.
      const simBtn = document.querySelector<HTMLElement>(
        ".rc-panel-debug-control-next",
      );
      if (simBtn) {
        dispatchClick(simBtn, ".rc-panel-debug-control-next");
        break;
      }
      // Fallback: click any continue/proceed/done button, else press Enter.
      const calBtn =
        document.querySelector<HTMLElement>(
          'button[id*="continue" i], button[id*="proceed" i], button[id*="done" i]',
        ) ?? document.querySelector<HTMLElement>("button");
      if (calBtn) {
        dispatchClick(calBtn, 'button[id*="continue|proceed|done" i]');
      } else {
        dispatchKey("Enter");
      }
      break;
    }
    case "instructions": {
      // Click the proceed button if present (non-reading blocks).
      // Narrowed to #threshold-proceed-button (exact match) so stray
      // buttons from earlier screens (e.g. #easyeyes-title-page-proceed-
      // button) don't hijack the dispatch.
      const proceedBtn = document.getElementById("threshold-proceed-button");
      if (proceedBtn) {
        dispatchClick(proceedBtn, "#threshold-proceed-button");
      } else {
        // Reading blocks have no proceed button — SPACE is the only way
        // to advance (threshold.js:2677-2685). Using if/else (not always-
        // dispatch) prevents the extra space from bleeding into the trial
        // instruction routine (threshold.js:6530) for non-reading blocks.
        dispatchKey(" ");
      }
      onInstructionClick();
      break;
    }
    case "fixation":
      dispatchKey(" ");
      break;
    case "reading": {
      // Check if answer options are visible (reading response phase).
      // Standard reading uses #characterSet-holder .characterSet;
      // rsvpReading uses .phrase-identification-category-item.
      // For rsvpReading, skip items already selected (each category accepts
      // only one response — clicking an already-selected category is a no-op).
      let answerEls = document.querySelectorAll<HTMLElement>(
        "#characterSet-holder .characterSet",
      );
      if (answerEls.length === 0) {
        answerEls = document.querySelectorAll<HTMLElement>(
          ".phrase-identification-category-item:not(.phrase-identification-item-selected)",
        );
      }
      if (answerEls.length > 0) {
        const chars = Array.from(answerEls).map((el) => el.textContent ?? "");
        const idx = selectClickedIndex(chars, state, rng);
        dispatchClick(answerEls[idx], `[idx=${idx}]="${chars[idx] ?? ""}"`);
      } else {
        // Page through reading text / wait for RSVP presentation
        dispatchKey(" ");
      }
      onInstructionClick();
      break;
    }
    case "response":
      if (state.responseClicked) {
        const els = document.querySelectorAll<HTMLElement>(
          "#characterSet-holder .characterSet",
        );
        const chars = Array.from(els).map((el) => el.textContent ?? "");
        const idx = selectClickedIndex(chars, state, rng);
        // Use array-indexed label (idx is position in the .characterSet
        // NodeList, NOT necessarily the DOM child position).
        dispatchClick(
          els[idx],
          `.characterSet[idx=${idx}]="${chars[idx] ?? ""}"`,
        );
      } else if (state.responseTyped && state.validCharsTyped.length > 0) {
        dispatchKey(selectTypedResponse(state, rng));
      }
      break;
    case "debrief":
      dispatchClick(
        document.querySelector<HTMLElement>(
          'button[aria-label*="Yes" i], .swal2-confirm',
        ),
        'button[aria-label*="Yes" i], .swal2-confirm',
      );
      break;
    case "complete":
      // Nothing to do; experiment finished.
      break;
  }
}

// How long (ms) to wait after detecting a new phase before acting on it.
// Allows the DOM to fully settle before synthetic events are dispatched.
const ACTION_DELAY_MS = 500;

/**
 * Install all sim-mode instrumentation. Called once from
 * {@link startSimulatedParticipant} before the polling loop starts.
 *
 * - Activates the simulation flag so {@link setEEState} /
 *   {@link publishResponseAffordance} stop being no-ops.
 * - Wraps `MinimalStim.prototype._reportChange` to publish stim attribute
 *   changes into `#ee-state` + the JSONL debug stream.
 * - Wraps `ParamReader.prototype.read` to emit `[sim:read]` for every call.
 * - Adds `error` / `unhandledrejection` listeners for `[sim:error]`.
 *
 * Extracted as a named export so a unit test can verify the composition
 * without starting the polling `setInterval` / `waitForLoad` chain.
 */
export function setupInstrumentation(): void {
  activateSimulation();
  enableInstrumentation(MinimalStim);
  installParamReaderReporter(ParamReader);
  installErrorReporter();
  installDialogReporter();
}

// Originals saved before stubbing so stopSimulatedParticipant can restore.
const _savedOriginals: {
  getUserMedia:
    | ((constraints: MediaStreamConstraints) => Promise<MediaStream>)
    | null;
  enumerateDevices: (() => Promise<MediaDeviceInfo[]>) | null;
  requestFullscreen: (() => Promise<void>) | null;
  exitFullscreen: (() => Promise<void>) | null;
  fullscreenElementDescriptor: PropertyDescriptor | null;
} = {
  getUserMedia: null,
  enumerateDevices: null,
  requestFullscreen: null,
  exitFullscreen: null,
  fullscreenElementDescriptor: null,
};
let _intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Graceful teardown: clear the polling loop, restore stubbed browser APIs.
 * Idempotent — safe to call multiple times. Call at experiment completion
 * or when the page is about to be reused without a reload.
 */
export function stopSimulatedParticipant(): void {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  const sd = navigator.mediaDevices as any;
  if (sd && _savedOriginals.getUserMedia) {
    sd.getUserMedia = _savedOriginals.getUserMedia;
  }
  if (sd && _savedOriginals.enumerateDevices) {
    sd.enumerateDevices = _savedOriginals.enumerateDevices;
  }
  if (_savedOriginals.requestFullscreen) {
    document.documentElement.requestFullscreen =
      _savedOriginals.requestFullscreen;
  }
  if (_savedOriginals.exitFullscreen) {
    document.exitFullscreen = _savedOriginals.exitFullscreen;
  }
  if (_savedOriginals.fullscreenElementDescriptor) {
    Object.defineProperty(
      document,
      "fullscreenElement",
      _savedOriginals.fullscreenElementDescriptor,
    );
  }
}

/**
 * Stub `navigator.mediaDevices.getUserMedia` (and `enumerateDevices`) so any
 * caller — Remote Calibrator, headphone check, soundTest — gets back a real
 * MediaStream with one silent video track without prompting for permission
 * or waiting on a physical webcam. Headless browsers have no camera; without
 * this stub the compatibility flow hangs forever on "Connecting to your
 * camera(s) …".
 *
 * The synthesized stream is built from an offscreen canvas via
 * `captureStream()` so it satisfies code that inspects track settings,
 * dimensions, or calls `getTracks()`.
 *
 * Idempotent: re-installation is a no-op.
 */
let cameraStubInstalled = false;
export function installCameraStub(): void {
  if (cameraStubInstalled) return;
  cameraStubInstalled = true;

  // Some test environments (jsdom) lack `captureStream` entirely; guard.
  const makeFakeStream = (): MediaStream | null => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      ctx?.fillRect(0, 0, 320, 240);
      const stream =
        (canvas as any).captureStream?.(30) ??
        (canvas as any).mozCaptureStream?.(30);
      return stream ?? null;
    } catch {
      return null;
    }
  };

  const fakeStream = makeFakeStream();
  const safeMediaDevices =
    navigator.mediaDevices ??
    ((navigator as any).mediaDevices = {} as MediaDevices);

  // getUserMedia: return the fake stream. If canvas.captureStream is
  // unavailable (jsdom), return an empty MediaStream so callers that only
  // check for a resolved promise still proceed.
  const origGetUserMedia =
    safeMediaDevices.getUserMedia?.bind(safeMediaDevices);
  (safeMediaDevices as any).getUserMedia = async (
    constraints: MediaStreamConstraints,
  ): Promise<MediaStream> => {
    // Audio-only requests (mic calibration, headphone check) get an empty
    // audio-less stream — the simulator doesn't generate audio. Callers
    // that require real audio will fail gracefully downstream.
    if (fakeStream) return fakeStream;
    return new MediaStream();
  };

  // enumerateDevices: pretend a video input exists so rc's "has camera?"
  // check passes.
  const origEnumerate =
    safeMediaDevices.enumerateDevices?.bind(safeMediaDevices);
  if (origEnumerate) {
    (safeMediaDevices as any).enumerateDevices = async (): Promise<
      MediaDeviceInfo[]
    > => {
      try {
        const real = await origEnumerate();
        if (real.some((d) => d.kind === "videoinput")) return real;
      } catch {
        /* ignore */
      }
      return [
        {
          deviceId: "sim-camera",
          groupId: "sim-group",
          kind: "videoinput",
          label: "Simulated Camera",
          toJSON() {},
        } as MediaDeviceInfo,
      ];
    };
  }
}

/**
 * Set the two rc flags the host app / UI flow still need when running under
 * simulation. The sim forces `debug:true` on `rc.panel()` (threshold.js), so
 * rc renders its own "Simulate calibration and continue" button and populates
 * all `rc.new*Data` values natively via `_wrapValues()` — we no longer need to
 * pre-fill those ourselves or poke `_panelStatus.panelFinished`.
 *
 * Two flags remain required:
 *
 * 1. **`rc._cameraSelectionDone = true`** — bypasses rc's "click the camera
 *    video" UI step. Without this, the compatibility flow hangs on the camera
 *    selection screen even with `debug:true`.
 *
 * 2. **`rc.calibrationSimulatedBool = true`** — informational flag read by
 *    threshold.js (gates distance-tracking "nudger" during reading/QA trials).
 *    rc's `_wrapValues()` does not set this; we must.
 *
 * No-op if rc isn't loaded yet — retries on a 100ms poll for up to 10s while
 * the CDN <script> loads.
 */
let rcDefaultsInstalled = false;
export function installRcDebugDefaults(): void {
  if (rcDefaultsInstalled) return;
  rcDefaultsInstalled = true;
  const startedAt = Date.now();
  const apply = () => {
    const rc = (window as any).RemoteCalibrator;
    if (!rc) {
      // rc loads async from CDN; retry until available. Cap at ~10s.
      if (Date.now() - startedAt < 10_000) setTimeout(apply, 100);
      return;
    }
    try {
      rc._cameraSelectionDone = true;
      rc.calibrationSimulatedBool = true;
    } catch {
      /* best-effort */
    }
  };
  apply();
}

export function startSimulatedParticipant(): void {
  // Idempotent: a second call (HMR, double init) would leak a second
  // polling interval that double-dispatches events forever.
  if (_intervalId !== null) return;

  // Activate simulation + install all instrumentation (see
  // setupInstrumentation). Real participants never reach this branch.
  setupInstrumentation();

  // Save originals before stubbing so stopSimulatedParticipant can restore.
  _savedOriginals.requestFullscreen =
    document.documentElement.requestFullscreen;
  _savedOriginals.exitFullscreen = document.exitFullscreen;
  _savedOriginals.fullscreenElementDescriptor = Object.getOwnPropertyDescriptor(
    document,
    "fullscreenElement",
  ) ?? {
    configurable: true,
    get: () => null,
  };

  // Stub requestFullscreen so rc.getFullscreen() resolves without requiring
  // a real user gesture. Remote-calibrator otherwise shows a blocking Swal
  // popup ("The browser needs your permission...") during simulation.
  document.documentElement.requestFullscreen = () => Promise.resolve();
  // Pretend fullscreen is active so requireFullscreenForTrialInitiation
  // doesn't block every trial-initiation click with a buzz + restore cycle.
  // Headless / Playwright browsers can't enter real fullscreen.
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => document.documentElement,
  });
  // Stub exitFullscreen so the end-of-experiment cleanup
  // (lifetime.js:quitPsychoJS) doesn't throw "Document not active" when the
  // headless browser rejects the call.
  document.exitFullscreen = () => Promise.resolve();

  // Suppress audio/video playback. Headless browsers block autoplay
  // (HTMLMediaElement.play rejects without a real user gesture), causing
  // "The play method is not allowed…" crashes e.g. readingSound.play().
  // correctSynth (TonePlayer/WebAudio) is unaffected — its AudioContext is
  // already suspended, so .play() silently no-ops.
  (HTMLMediaElement.prototype as any).play = function () {
    return Promise.resolve(this);
  };

  // Stub camera access so rc / compatibility flow don't hang waiting for a
  // real webcam in headless mode. We synthesize a real MediaStream with one
  // video track via an offscreen canvas — this satisfies both
  // getUserMedia consumers and any code that reads track settings or calls
  // getTracks(). rc's debug "Simulate calibration" button (forced on by the
  // sim via debug:true) short-circuits the actual measurement.
  // Save mediaDevices originals before installCameraStub replaces them.
  const safeMediaDevices =
    navigator.mediaDevices ??
    ((navigator as any).mediaDevices = {} as MediaDevices);
  _savedOriginals.getUserMedia =
    (safeMediaDevices as any).getUserMedia?.bind(safeMediaDevices) ?? null;
  _savedOriginals.enumerateDevices =
    (safeMediaDevices as any).enumerateDevices?.bind(safeMediaDevices) ?? null;

  installCameraStub();
  // Set rc flags (_cameraSelectionDone, calibrationSimulatedBool) before the
  // compatibility / panel flow reads them. Calibration values themselves are
  // populated natively by rc's debug "Simulate" button at panel time.
  installRcDebugDefaults();

  const seed = (window as any).__SIM_SEED__;
  const rng: Rng = typeof seed === "number" ? mulberry32(seed) : Math.random;

  // Overlay fast-mode for simulateWithDisplayBool=FALSE: hide the canvas so
  // Pixi skips rendering work. (Real render-skip would require deeper changes
  // to PsychoJS; this is a pragmatic speed-up for batched simulation runs.)
  const params = new URLSearchParams(window.location.search);
  if (params.get("simFastMode") === "1") {
    const style = document.createElement("style");
    style.textContent = "canvas { visibility: hidden !important; }";
    document.head.appendChild(style);
  }

  // Start the polling loop immediately — do NOT wait for the experiment to
  // finish loading. We need to handle SweetAlert dialogs (participant-ID
  // prompt, etc.) that appear DURING the loading phase, before any trial
  // phase is published. Without this, those dialogs block experiment
  // startup forever in headless mode.
  {
    let pendingKey = "";
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    _intervalId = setInterval(() => {
      const state = readEEStateFromDOM();
      const phase = state.phase;

      // Handle SweetAlert dialogs (participant-ID prompt, Q&A, etc.) even
      // during the loading phase. These block experiment startup and would
      // otherwise hang the simulator forever. The handler dismisses or
      // answers the modal without advancing the experiment phase.
      if (state.dialogOpen && (phase === "loading" || !phase)) {
        // Dedup on dialogOpen so we only act once per dialog instance.
        const dialogKey = `__dialog__:${state.dialogOpen}`;
        if (dialogKey !== pendingKey) {
          pendingKey = dialogKey;
          if (pendingTimer !== null) clearTimeout(pendingTimer);
          pendingTimer = setTimeout(() => {
            pendingTimer = null;
            // Re-check the dialog is still open.
            if (readEEStateFromDOM().dialogOpen !== state.dialogOpen) return;
            if (!handleLoadingDialog(rng)) pendingKey = "";
          }, ACTION_DELAY_MS);
        }
        return;
      }

      // Also catch Swal dialogs that appear during loading but weren't
      // published via dialogOpen (e.g. the dialogReporter patch hasn't
      // taken effect on window.Swal yet, or Swal was called before the
      // patch installed). Fall back to DOM probing.
      if ((phase === "loading" || !phase) && !state.dialogOpen) {
        const swalVisible =
          document.querySelector(".swal2-popup") &&
          document.querySelector(".swal2-popup")?.parentElement
            ?.offsetParent !== null;
        if (swalVisible) {
          const dialogKey = `__swal_fallback__:${phase ?? ""}`;
          if (dialogKey !== pendingKey) {
            pendingKey = dialogKey;
            if (pendingTimer !== null) clearTimeout(pendingTimer);
            pendingTimer = setTimeout(() => {
              pendingTimer = null;
              if (!handleLoadingDialog(rng)) pendingKey = "";
            }, ACTION_DELAY_MS);
          }
          return;
        }
      }

      if (!phase || phase === "loading") return;

      const key = buildKey(phase, state.trial, state.dialogOpen);
      if (key === pendingKey) return;
      pendingKey = key;

      if (pendingTimer !== null) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        pendingTimer = null;

        // Re-read state; skip if it changed during the delay.
        const current = readEEStateFromDOM();
        const currentKey = buildKey(
          current.phase,
          current.trial,
          current.dialogOpen,
        );
        if (currentKey !== key) return;

        act(current, rng, () => {
          pendingKey = "";
        });
        if (current.phase === "complete") {
          stopSimulatedParticipant();
        }
      }, ACTION_DELAY_MS);
    }, 200);
  }
}
