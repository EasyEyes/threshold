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
  recalibrations: string | null;
  targetTask: string | null;
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
    recalibrations: get("data-recalibrations"),
    targetTask: get("data-target-task"),
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
/**
 * Click like a REAL pointer: hit-test the element's center point with
 * document.elementFromPoint — if something else is on top, a real user
 * could not click this element, so neither may the sim. Without this
 * guard, el.click() dispatches directly on the element and pierces any
 * overlay (found in manual runs: an unmounted compatibility page dead-
 * covering a live page still let the sim click through — synthetic clicks
 * bypass hit-testing, so every e2e sailed past the bug).
 *
 * Returns true when the click was dispatched; false when blocked (logged
 * as click-blocked). Callers re-arm their phase dedupe and retry next
 * tick, so a persistently blocked click ends as an INCOMPLETE run via the
 * stuck detector — the failure a real participant would experience as
 * "the button does nothing" becomes a caught, explained failure.
 *
 * elementFromPoint honors pointer-events:none (returns what's beneath), so
 * decorative shields that don't intercept real pointers don't block here
 * either. Layout-less environments (jsdom unit tests: zero rects, null
 * elementFromPoint) provide no positive evidence, so the click is allowed —
 * the guard blocks only when a DIFFERENT element is provably on top, which
 * is exactly the false-positive class this exists to kill. Deliberately NOT
 * isTrusted — autoplay/fullscreen remain stubbed.
 */
export function dispatchClick(
  el: HTMLElement | null | undefined,
  label: string,
): boolean {
  if (!el) return false;

  // Real users scroll covered-by-viewport elements into view before
  // clicking; approximate by centering, then measuring.
  const r0 = el.getBoundingClientRect();
  if (
    r0.width > 0 &&
    r0.height > 0 &&
    (r0.top < 0 || r0.bottom > window.innerHeight)
  ) {
    el.scrollIntoView({ block: "center" });
  }
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) {
    // No rendered box — indeterminate (jsdom has no layout); allow.
    logDispatch("click", label);
    el.click();
    return true;
  }
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
    logDispatch("click-blocked", `${label} off-viewport at ${x | 0},${y | 0}`);
    return false;
  }
  const hit = document.elementFromPoint(x, y);
  if (hit == null) {
    // Indeterminate (jsdom / clipped ancestor) — no positive cover evidence.
    logDispatch("click", label);
    el.click();
    return true;
  }
  if (hit !== el && !el.contains(hit)) {
    const coveredBy =
      hit && hit !== el
        ? `<${hit.tagName?.toLowerCase()} id=${hit.id || "-"} class=${(
            hit.className?.toString?.() || ""
          ).slice(0, 30)} z=${
            (hit as HTMLElement).style?.zIndex || "-"
          } text="${(hit.textContent || "").trim().slice(0, 30)}">`
        : "nothing (no hit)";
    logDispatch(
      "click-blocked",
      `${label} covered by ${coveredBy} at ${x | 0},${y | 0}`,
    );
    return false;
  }

  logDispatch("click", label);
  el.click();
  // Dispatch mouse events at the element's coordinates for components
  // that use PsychoJS Mouse (mousedown/mouseup) instead of DOM onclick.
  // mousedown and mouseup are split across frames so PsychoJS's per-frame
  // mouse.getPressed() sees the pressed state.
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
  return true;
}

/** Poll until the experiment has fully loaded (phase is non-null and not "loading"). */
export function buildKey(
  phase: string | null,
  trial: string | null,
  dialogOpen: string | null,
): string {
  return `${phase}:${trial}:${dialogOpen ?? ""}`;
}

/**
 * Record visible Swal popup texts and instruction-overlay texts in-page, so
 * the sim harness can assert on them (server/simulate.ts reads
 * window.__simSwalPopupTexts / window.__simInstructionTexts at the end).
 * Observer polling can miss short-lived popups; the in-page participant sees
 * every one.
 */
function recordVisiblePopupAndInstructionTexts(): void {
  const swal = document.querySelector<HTMLElement>(".swal2-popup");
  if (swal && swal.offsetParent !== null) {
    const texts: string[] = ((window as any).__simSwalPopupTexts ??= []);
    const t = swal.textContent?.trim() ?? "";
    if (t && !texts.includes(t)) texts.push(t);
  }
  for (const el of Array.from(
    document.querySelectorAll<HTMLElement>(".ee-html-text-stim"),
  )) {
    if (el.offsetParent === null) continue;
    const texts: string[] = ((window as any).__simInstructionTexts ??= []);
    const t = el.textContent?.trim() ?? "";
    if (t && !texts.includes(t)) texts.push(t);
    // text → fontFamily, so e2e can assert per-condition instructionFont
    const fonts: Record<string, string> = ((
      window as any
    ).__simInstructionFonts ??= {});
    if (t && !(t in fonts)) fonts[t] = el.style.fontFamily ?? "";
  }

  // Compat-flow chrome title ("Device Compatibility" eyebrow + step H1):
  // the Requirements-page sound-output step and the headphone check are
  // plain DOM pages, invisible to the Swal/instruction recorders. Several
  // compat pages may coexist in the DOM transiently (the report page is not
  // unmounted immediately), so record EVERY visible title element. The
  // title elements are position:fixed (offsetParent always null), so test
  // visibility via getClientRects.
  for (const chrome of document.querySelectorAll<HTMLElement>(
    "#compatibility-chrome-title",
  )) {
    if (chrome.getClientRects().length === 0) continue;
    const titles: string[] = ((window as any).__simEePopupTitles ??= []);
    const t = chrome.textContent?.trim() ?? "";
    if (t && !titles.includes(t)) titles.push(t);
  }

  // Compatibility-report ✓/✗ fact rows (e.g. the RC_BrowserLacksSoundSupport
  // ✗ when the browser lacks setSinkId): plain DOM, invisible to the other
  // recorders. Record the whole visible list once per distinct content so
  // e2e can assert WHICH rows the participant could see.
  for (const list of document.querySelectorAll<HTMLElement>(
    "#compatibility-known-list",
  )) {
    if (list.getClientRects().length === 0) continue;
    const texts: string[] = ((window as any).__simCompatFactTexts ??= []);
    const t = list.textContent?.trim() ?? "";
    if (t && !texts.includes(t)) texts.push(t);
  }
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
    // Native .click() on a radio fires click→input→change per spec — the
    // same event sequence a real participant produces. Manual
    // checked=true + synthetic events can miss listeners bound to other
    // event types.
    radios[idx].click();
    logDispatch("qa-radio", `idx=${idx}/${radios.length}`);
    // Click confirm on a LATER tick, like a human: same-tick clicks race
    // popups whose html is rebuilt asynchronously (V1 sound-output picker's
    // devicechange → Swal.update can swap the radios between our check and
    // confirm, yielding a spurious dismiss).
    setTimeout(() => {
      const confirm = document.querySelector<HTMLElement>(".swal2-confirm");
      if (confirm && confirm.offsetParent !== null) {
        dispatchClick(confirm, ".swal2-confirm (qa-radio)");
      }
    }, 120);
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

/**
 * Global sound-output modals — pages that can appear over ANY phase:
 * the reconnect overlay (device disappeared; trumps everything) and the
 * per-block reminder interstitial (put on / take off headphones). Returns
 * true when a modal was handled (caller should skip the rest of the tick).
 * Synthetic el.click() bypasses hit-testing, so an unhandled modal here
 * would let the experiment silently continue underneath it.
 */
function handleSoundOutputGlobalModals(
  onInstructionClick: () => void,
): boolean {
  // Sound-output reconnect overlay (RC_TryToReconnectDevice): a GLOBAL
  // modal — it can appear over any phase (it typically mounts right as the
  // compat flow hands off to consent/calibration). Record the sighting
  // once; while the device is missing, reconnect it via the sim stub; once
  // restored, click the overlay's own Proceed (synthetic clicks would
  // otherwise pierce the opaque layer to buttons underneath).
  const reconnectOverlay = document.querySelector<HTMLElement>(
    "[data-ee-sound-output-reconnect]",
  );
  if (reconnectOverlay && reconnectOverlay.getClientRects().length > 0) {
    const w = window as any;
    if (!w.__simReconnectShown) {
      w.__simReconnectShown = true;
      w.__simSoundOutputActions.push({ action: "reconnect-shown" });
    }
    if (reconnectOverlay.dataset.state !== "restored") {
      const sel = [...(w.__simSoundOutputActions ?? [])]
        .reverse()
        .find((a: any) => a.action === "select");
      if (sel?.label && !w.__simReconnectDidConnect) {
        w.__simReconnectDidConnect = true;
        w.__simConnectAudioOutput(sel.label);
        w.__simSoundOutputActions.push({
          action: "connect",
          label: sel.label,
        });
        onInstructionClick();
        return true;
      }
    } else {
      const proceedBtn = reconnectOverlay.querySelector<HTMLElement>(
        "[data-ee-sound-output-reconnect-proceed]",
      );
      if (proceedBtn && proceedBtn.getClientRects().length > 0) {
        dispatchClick(proceedBtn, "sound-output reconnect Proceed");
        onInstructionClick();
        return true;
      }
    }
  }

  // Per-block sound-output reminder page (Phase 6): an interstitial shown
  // at block start when the demanded kind changes (put on / take off
  // headphones). Like the reconnect overlay it can appear over any phase —
  // handle it globally, and record the sighting (kind + phrase-filled body)
  // once per page for ground truth. (After the reconnect overlay: a
  // missing device blocks everything else.)
  const reminderPage = document.querySelector<HTMLElement>(
    "[data-ee-sound-output-reminder]",
  );
  if (reminderPage && reminderPage.getClientRects().length > 0) {
    if (!reminderPage.dataset.simRecorded) {
      reminderPage.dataset.simRecorded = "1";
      (window as any).__simSoundOutputActions.push({
        action: "reminder",
        kind: reminderPage.dataset.kind ?? "",
        text: reminderPage.querySelector("p")?.textContent?.trim() ?? "",
      });
    }
    const reminderProceed = reminderPage.querySelector<HTMLElement>(
      "[data-ee-sound-output-reminder-proceed]",
    );
    if (reminderProceed && reminderProceed.getClientRects().length > 0) {
      dispatchClick(reminderProceed, "sound-output reminder Proceed");
      onInstructionClick();
      return true;
    }
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
  recordVisiblePopupAndInstructionTexts();
  if (state.dialogOpen && handleQADialog(rng)) return;

  // Sound-output global modals (reconnect overlay, per-block reminder):
  // shared with the polling loop, which must also handle them during the
  // loading phase (filterRoutineBegin mounts the reminder while
  // phase=loading, before act() is ever reached).
  if (handleSoundOutputGlobalModals(onInstructionClick)) return;

  // Custom EasyEyes popup (showPopup/addPopupLogic in popup.js), e.g. the
  // end-of-block percent-correct popup or the take-a-break popup. Dismissal:
  // click the proceed button when shown (clickable response types), else
  // RETURN (addPopupLogic's keydown listener requires e.key === "Enter").
  const eePopup = document.getElementById("threshold-container");
  if (eePopup && eePopup.offsetParent !== null) {
    // Record popup titles so the sim harness can assert on them
    // (server/simulate.ts reads window.__simEePopupTitles at the end).
    const titles: string[] = ((window as any).__simEePopupTitles ??= []);
    const title =
      document.getElementById("threshold-title")?.textContent?.trim() ?? "";
    if (title && !titles.includes(title)) titles.push(title);
    const continueBtn = document.getElementById("threshold-continue-button");
    if (
      continueBtn &&
      continueBtn.offsetParent !== null &&
      continueBtn.onclick
    ) {
      dispatchClick(continueBtn, "#threshold-continue-button (popup)");
    } else {
      dispatchKey("Enter");
    }
    return;
  }

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

      // 1b. Sound-output selection step (Requirements page, v1.5). Rows are
      // marked [data-ee-sound-output-row] with kind=loudspeakers|headphones;
      // each row has a <select> and an identical test button. Policy comes
      // from window.__SIM_OPTIONS__.soundOutputPolicy (default "first" =
      // first non-"None" option). "none" selects the None option → the UI
      // must swap Proceed for Quit, which we click when visible.
      const soStep = document.querySelector<HTMLElement>(
        "[data-ee-sound-output-step]",
      );
      if (soStep && soStep.offsetParent !== null) {
        const w = window as any;
        const policy = w.__SIM_OPTIONS__?.soundOutputPolicy ?? {};
        const rows = Array.from(
          document.querySelectorAll<HTMLElement>("[data-ee-sound-output-row]"),
        ).filter((r) => r.offsetParent !== null);
        for (const row of rows) {
          const kind = row.dataset.eeSoundOutputRow ?? "";
          const select = row.querySelector<HTMLSelectElement>("select");
          if (!select) continue;
          const want = policy[kind] ?? "first";
          let choice: HTMLOptionElement | undefined;
          if (want === "none") {
            choice = Array.from(select.options).find((o) => o.value === "none");
          } else if (want === "first" || !want) {
            choice = Array.from(select.options).find(
              (o) => o.value && o.value !== "none",
            );
          } else {
            // Label substring, e.g. "AirPods".
            choice = Array.from(select.options).find(
              (o) =>
                o.value && o.value !== "none" && o.textContent?.includes(want),
            );
          }
          if (choice && select.value !== choice.value) {
            select.value = choice.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
          }
          // Record the effective selection once per row — even when the
          // preselected value already matched (no change event fired). The
          // reconnect policy uses this as the ground-truth device.
          if (choice && !select.dataset.simSelected) {
            select.dataset.simSelected = "1";
            w.__simSoundOutputActions.push({
              action: "select",
              kind,
              value: select.value,
              label: select.selectedOptions[0]?.textContent?.trim() ?? "",
            });
          }
          // One bark-button click per row (dataset guard).
          const testBtn = row.querySelector<HTMLElement>(
            "button[data-ee-sound-output-test]",
          );
          if (testBtn && !testBtn.dataset.simClicked) {
            testBtn.dataset.simClicked = "1";
            dispatchClick(testBtn, "sound-output test button");
            w.__simSoundOutputActions.push({ action: "test-button", kind });
          }
        }
        // Quit replaces Proceed whenever a needed row is "None"; when
        // requirements are met, fall THROUGH (no break) so the btn-success
        // branch below clicks Proceed this same tick.
        const quitBtn = document.querySelector<HTMLElement>(
          "button[data-ee-sound-output-quit]",
        );
        if (quitBtn && quitBtn.offsetParent !== null) {
          w.__simSoundOutputActions.push({ action: "quit" });
          dispatchClick(quitBtn, "sound-output Quit");
          onInstructionClick(); // re-arm: next poll handles next state
          break;
        }
      }

      // 1b2. Block-0 "Setting sound output" page (compat exit). Its
      // Proceed is a plain btn-success — the generic branch below clicks
      // it. With the reconnect policy, FIRST disconnect the selected
      // device (once) so the reconnect watch fires; the page's Proceed is
      // clicked on a later poll.
      const b0Page = document.querySelector<HTMLElement>(
        "[data-ee-sound-output-block0]",
      );
      if (b0Page && b0Page.offsetParent !== null) {
        const w = window as any;
        if (
          w.__SIM_OPTIONS__?.soundOutputPolicy?.reconnect &&
          !w.__simReconnectDidDisconnect
        ) {
          const sel = [...(w.__simSoundOutputActions ?? [])]
            .reverse()
            .find((a: any) => a.action === "select");
          if (sel?.value) {
            w.__simReconnectDidDisconnect = true;
            w.__simDisconnectAudioOutput(sel.value);
            w.__simSoundOutputActions.push({
              action: "disconnect",
              id: sel.value,
              label: sel.label,
            });
            onInstructionClick();
            break; // let the watch react before proceeding
          }
        }
        // fall through: generic btn-success clicks Proceed
      }

      // 1c. Huggins headphone-check trials: three enabled choice buttons
      // labeled 1/2/3. __SIM_OPTIONS__.headphoneCheck selects the listener
      // model: "ideal" (default — answers correctly via the sim-only
      // oracle the check publishes per trial; matches simulationModel=
      // "ideal" for trials) or "random" (1/3 correct — for rehearsing the
      // rejection path).
      const hugginsChoice = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          "button.btn-outline-secondary",
        ),
      ).filter(
        (b) =>
          b.offsetParent !== null &&
          !b.disabled &&
          /^[123]$/.test(b.textContent?.trim() ?? ""),
      );
      if (hugginsChoice.length > 0) {
        const listenerModel =
          (window as any).__SIM_OPTIONS__?.headphoneCheck ?? "ideal";
        const oracle =
          listenerModel === "ideal"
            ? (window as any).__simHeadphoneCheckTarget
            : undefined;
        let pick = hugginsChoice[Math.floor(rng() * hugginsChoice.length)];
        if (typeof oracle === "number" && hugginsChoice[oracle - 1]) {
          pick = hugginsChoice[oracle - 1];
          delete (window as any).__simHeadphoneCheckTarget;
        }
        dispatchClick(
          pick,
          `huggins choice (${listenerModel}${
            typeof oracle === "number" ? ", oracle" : ""
          })`,
        );
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
      // The title page (_showTitlePage, default "title") publishes the
      // INSTRUCTIONS phase so the sim advances it, but its Proceed button is
      // DOM-only — a synthetic Space keydown on window never activates it.
      // Click it directly, but only while its container is up: an orphaned
      // button from a dismissed title page must not hijack the dispatch.
      const titlePageBtn = document.getElementById("easyeyes-title-page")
        ? document.getElementById("easyeyes-title-page-proceed-button")
        : null;
      // #threshold-proceed-button: exact match so stray buttons from other
      // screens don't hijack the dispatch.
      const proceedBtn =
        titlePageBtn ?? document.getElementById("threshold-proceed-button");
      if (proceedBtn) {
        dispatchClick(proceedBtn, `#${proceedBtn.id}`);
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
    case "showimage":
      // Display-only block: showImageEachFrame advances on "return" (or a
      // click). PsychoJS maps the pyglet name "return" → W3C "Enter", which
      // dispatchKey("return") emits.
      dispatchKey("return");
      break;
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
      // Adjust trials: arrow keys adjust, SPACE finishes (see
      // prepareImageAdjust's keydown handler). Do a couple of adjustments
      // so there is a pending adjustment on record, then finish.
      if (state.targetTask === "adjust") {
        dispatchKey("ArrowRight");
        dispatchKey("ArrowRight");
        dispatchKey(" ");
        break;
      }
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
  // Undo prototype-level sim patches (setSinkId wrap/delete) so no stub
  // outlives the experiment on a reused page.
  while (_simRestores.length) _simRestores.pop()?.();
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
  // A cached silent audio track, added to streams for audio-constrained
  // requests. A real getUserMedia({audio:true}) grant ALWAYS yields a
  // stream with an audio track; handing callers a video-only stream makes
  // any code that inspects getAudioTracks() diverge from reality. Silent,
  // cached (one AudioContext total), and jsdom-safe.
  let silentAudioTrack: MediaStreamTrack | null = null;
  const getSilentAudioTrack = (): MediaStreamTrack | null => {
    if (silentAudioTrack) return silentAudioTrack;
    try {
      const AC = (window as any).AudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0; // silence — presence, not content
      osc.connect(gain).connect(dest);
      osc.start();
      silentAudioTrack = dest.stream.getAudioTracks()[0] ?? null;
    } catch {
      silentAudioTrack = null;
    }
    return silentAudioTrack;
  };

  (safeMediaDevices as any).getUserMedia = async (
    constraints: MediaStreamConstraints,
  ): Promise<MediaStream> => {
    if (fakeStream) {
      // Honor the request's constraints: audio-constrained calls get the
      // video stream PLUS a silent audio track, mirroring a real grant.
      if (constraints && (constraints as any).audio) {
        const track = getSilentAudioTrack();
        if (track && !fakeStream.getAudioTracks().length) {
          try {
            fakeStream.addTrack(track);
          } catch {
            /* stream already ended (page teardown) — return as-is */
          }
        }
      }
      return fakeStream;
    }
    // jsdom fallback: no captureStream; still honor audio constraints.
    const s = new MediaStream();
    if (constraints && (constraints as any).audio) {
      const track = getSilentAudioTrack();
      if (track) s.addTrack(track);
    }
    return s;
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
 * Fake audio-OUTPUT device stub + setSinkId ground-truth recorder.
 *
 * Real headless Chromium exposes only the OS default output (and often with
 * an empty label, since output labels require a getUserMedia grant), so the
 * sound-output selection UI would show one blank entry. This stub merges a
 * list of realistic fake `audiooutput` devices (names from the EasyEyes
 * device-name corpus) into enumerateDevices, and lets tests add/remove them
 * live — each mutation fires a REAL `devicechange` event, exercising the
 * live-list refresh and reconnect-watch code paths deterministically.
 *
 * Ground truth for "sound actually went to the chosen device": both
 * AudioContext.prototype.setSinkId and HTMLMediaElement.prototype.setSinkId
 * are patched to record {target, deviceId, label, t} into
 * window.__simSinkCalls and then resolve. No audio hardware needed.
 *
 * window.__simGroundTruth() returns {sinkCalls, mediaPlays,
 * soundOutputActions, audioOutputs} — read by server/simulate.ts at run end.
 *
 * Sim options (window.__SIM_OPTIONS__, injected by server/simulate.ts):
 *   soundOutputPolicy: { loudspeakers?: "first"|"none"|<label-substring>,
 *                        headphones?:  "first"|"none"|<label-substring> }
 *     — how the simulated participant fills each Requirements-page row.
 *   deviceScript: Array<{ atMs: number, action: "connect"|"disconnect",
 *                        label?: string, id?: string }> — scheduled relative
 *     to stub installation (boot), for reconnect-watch scenarios.
 *   simNoSinkSupport: true — delete setSinkId entirely, to exercise the
 *     browser-lacks-sound-support gate (RC_BrowserLacksSoundSupport).
 */
let audioOutputStubInstalled = false;
// Restore callbacks for prototype patches made here, run by
// stopSimulatedParticipant so no stub outlives the experiment.
const _simRestores: Array<() => void> = [];
export function installAudioOutputStub(): void {
  if (audioOutputStubInstalled) return;
  audioOutputStubInstalled = true;
  const w = window as any;

  w.__simSinkCalls ??= [];
  w.__simMediaPlays ??= [];
  w.__simSoundOutputActions ??= [];
  w.__simAudioOutputs ??= [
    { id: "sim-output-speakers", label: "MacBook Pro Speakers" },
    { id: "sim-output-airpods", label: "Denis's AirPods Pro #2" },
  ];

  const fireDeviceChange = () => {
    navigator.mediaDevices?.dispatchEvent?.(new Event("devicechange"));
  };

  // Simulate the audio-OUTPUT world: fake devices (deterministic, one
  // speakers-like + one headphones-like) PLUS any real labeled outputs.
  // Real headless outputs are degenerate — empty label and often an empty
  // deviceId, because no real permission grant ever happens under sim (the
  // camera stub short-circuits getUserMedia) — and a blank-valued option
  // makes selections ambiguous (V1's preConfirm treats "" as dismiss), so
  // those are dropped. On a researcher's real machine, labeled real
  // devices stay visible: simulation should extend their world, not
  // replace it. Fakes come first so policy "first" is deterministic.
  const md = navigator.mediaDevices as any;
  if (md?.enumerateDevices) {
    const inner = md.enumerateDevices.bind(md);
    md.enumerateDevices = async (): Promise<MediaDeviceInfo[]> => {
      const real = await inner();
      const nonOutput = real.filter(
        (d: MediaDeviceInfo) => d.kind !== "audiooutput",
      );
      const labeledRealOutputs = real.filter(
        (d: MediaDeviceInfo) =>
          d.kind === "audiooutput" && d.label && d.deviceId,
      );
      const fakes: MediaDeviceInfo[] = w.__simAudioOutputs.map(
        (d: { id: string; label: string }) =>
          ({
            deviceId: d.id,
            groupId: "sim-output-group",
            kind: "audiooutput",
            label: d.label,
            toJSON() {},
          }) as MediaDeviceInfo,
      );
      return [...nonOutput, ...fakes, ...labeledRealOutputs];
    };
  }

  // Live connect/disconnect — fires a real devicechange so the product's
  // listeners (list refresh, reconnect watch) run exactly as with hardware.
  // Tombstones of disconnected devices: reconnecting a label restores its
  // ORIGINAL id (a replugged physical device keeps its deviceId in
  // Chromium), so sinks/watchers keyed on the old id see it return.
  w.__simAudioOutputTombstones ??= [];
  w.__simConnectAudioOutput = (label: string) => {
    const tombstone = w.__simAudioOutputTombstones.find(
      (d: any) => d.label === label,
    );
    const id =
      tombstone?.id ??
      "sim-output-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (tombstone)
      w.__simAudioOutputTombstones = w.__simAudioOutputTombstones.filter(
        (d: any) => d.id !== id,
      );
    if (!w.__simAudioOutputs.some((d: any) => d.id === id)) {
      w.__simAudioOutputs.push({ id, label });
      fireDeviceChange();
    }
    return id;
  };
  w.__simDisconnectAudioOutput = (id: string) => {
    const removed = w.__simAudioOutputs.find((d: any) => d.id === id);
    if (removed) w.__simAudioOutputTombstones.push(removed);
    const n = w.__simAudioOutputs.length;
    w.__simAudioOutputs = w.__simAudioOutputs.filter((d: any) => d.id !== id);
    if (w.__simAudioOutputs.length !== n) fireDeviceChange();
  };

  // Optional deviceScript: scheduled connect/disconnect from boot.
  const opts = w.__SIM_OPTIONS__ ?? {};
  for (const ev of opts.deviceScript ?? []) {
    setTimeout(
      () => {
        if (ev.action === "disconnect") w.__simDisconnectAudioOutput(ev.id);
        else if (ev.label) w.__simConnectAudioOutput(ev.label);
      },
      Math.max(0, ev.atMs | 0),
    );
  }

  if (opts.simNoSinkSupport) {
    const saved: Array<[any, any]> = [];
    for (const proto of [
      typeof AudioContext !== "undefined" ? AudioContext.prototype : null,
      HTMLMediaElement.prototype,
    ]) {
      const p = proto as any;
      if (p && "setSinkId" in p) {
        saved.push([p, p.setSinkId]);
        delete p.setSinkId;
      }
    }
    _simRestores.push(() => {
      for (const [p, orig] of saved) p.setSinkId = orig;
    });
  } else {
    // Wrap-and-record even when a NATIVE setSinkId exists (Chromium has
    // one): the record fires first, then the native routing runs so real
    // audio hardware still works under --headful runs. jsdom has no
    // AudioContext — guard.
    const protos: any[] =
      typeof AudioContext !== "undefined"
        ? [AudioContext.prototype, HTMLMediaElement.prototype]
        : [HTMLMediaElement.prototype];
    for (const proto of protos) {
      const p = proto as any;
      if (p.__simPatched) continue;
      p.__simPatched = true;
      const target =
        protos.length === 2 && proto === protos[0]
          ? "AudioContext"
          : "HTMLMediaElement";
      const orig = p.setSinkId;
      p.setSinkId = function (this: any, ...args: any[]) {
        const deviceId = args[0];
        const isFake = w.__simAudioOutputs.some((d: any) => d.id === deviceId);
        const label =
          w.__simAudioOutputs.find((d: any) => d.id === deviceId)?.label ?? "";
        w.__simSinkCalls.push({
          target,
          deviceId,
          label,
          t: Date.now() - (w.__simBootTime ?? Date.now()),
        });
        // Chain to NATIVE setSinkId only for real device ids: native rejects
        // our fake ids (NotFoundError → FATAL under sim). Fake ids resolve.
        if (isFake || typeof orig !== "function") return Promise.resolve();
        return orig.apply(this, args);
      };
      _simRestores.push(() => {
        if (typeof orig === "function") p.setSinkId = orig;
        else delete p.setSinkId;
        p.__simPatched = false;
      });
    }
  }

  w.__simBootTime = Date.now();
  w.__simGroundTruth = () => ({
    sinkCalls: w.__simSinkCalls,
    mediaPlays: w.__simMediaPlays,
    soundOutputActions: w.__simSoundOutputActions,
    audioOutputs: w.__simAudioOutputs,
  });
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
    // Record plays (src + time) as media ground truth — the sound-output
    // test button's bark lands here. Installed before the audio stub reads
    // __simMediaPlays; both use ??=-style guards so order doesn't matter.
    ((window as any).__simMediaPlays ??= []).push({
      src: (this.currentSrc || this.src || "").slice(0, 80),
      id: this.id ?? "",
      t: Date.now() - ((window as any).__simBootTime ?? Date.now()),
    });
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
  // Fake audiooutput devices + setSinkId ground-truth recorder (see
  // installAudioOutputStub). After the camera stub so the enumerateDevices
  // chain is camera → audio-output merge.
  installAudioOutputStub();
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
    let lastRecalibrations: string | null = null;

    _intervalId = setInterval(() => {
      try {
        const state = readEEStateFromDOM();
        const phase = state.phase;

        // A completed recalibration flushed any input the sim already
        // dispatched (keys are cleared on recalibrate start/end) without
        // changing (phase, trial) — re-arm the dedupe so the sim re-acts,
        // as a real participant would.
        if (state.recalibrations !== lastRecalibrations) {
          lastRecalibrations = state.recalibrations;
          pendingKey = "";
        }

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

        // Sound-output global modals (reconnect overlay, per-block
        // reminder) can mount during loading — filterRoutineBegin shows the
        // reminder while phase is still "loading", before act() runs.
        if (handleSoundOutputGlobalModals(() => {})) return;

        if (!phase || phase === "loading") {
          logDispatch("tick-return", `loading-early phase=${phase}`);
          return;
        }

        // Mid-run Swal-radio popups (e.g. the V1 per-block sound-output
        // picker): the phase-key dedupe below would starve them forever, so
        // handle them here with their own per-popup dedupe. The DOM check is
        // authoritative — `dialogOpen` can go STALE (a Swal closed via its
        // confirm button doesn't call the patched Swal.close, so the
        // attribute keeps the last title forever) and would wedge every tick.
        {
          const swal = document.querySelector<HTMLElement>(".swal2-popup");
          const radios = document.querySelectorAll<HTMLInputElement>(
            ".swal2-popup .swal2-radio input",
          );
          const swalVisibleWithRadios =
            !!swal &&
            swal.offsetParent !== null &&
            radios.length > 0 &&
            !Array.from(radios).every((r) => r.disabled);
          // The dialog key dedupes consecutive ticks, but a SECOND identical
          // popup (e.g. block 2's audio-output popup: same title, same device
          // list) must re-arm — clear the key once the popup actually closes.
          if (
            !swalVisibleWithRadios &&
            pendingKey.startsWith("__midrun_dialog__:")
          ) {
            pendingKey = "";
          }
          if (swalVisibleWithRadios) {
            // Record NOW: this branch returns before act(), which is where
            // recording normally happens — a mid-run popup handled here
            // would otherwise never land in __simSwalPopupTexts.
            recordVisiblePopupAndInstructionTexts();
            const dialogKey = `__midrun_dialog__:${(swal?.textContent || "")
              .trim()
              .slice(0, 60)}`;
            if (dialogKey !== pendingKey) {
              pendingKey = dialogKey;
              if (pendingTimer !== null) clearTimeout(pendingTimer);
              pendingTimer = setTimeout(() => {
                pendingTimer = null;
                if (handleQADialog(rng)) return;
                pendingKey = ""; // not a QA dialog after all — re-arm
              }, ACTION_DELAY_MS);
            }
            return;
          }
        }

        const key = buildKey(phase, state.trial, state.dialogOpen);
        if (key === pendingKey) {
          logDispatch("dedupe-skip", key);
          return;
        }
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
          if (currentKey !== key) {
            logDispatch("tick-return", `stale-key ${key} -> ${currentKey}`);
            return;
          }

          act(current, rng, () => {
            pendingKey = "";
          });
          if (current.phase === "complete") {
            stopSimulatedParticipant();
          }
        }, ACTION_DELAY_MS);
      } catch (e) {
        // A crashing tick would silently kill every later action (setInterval
        // keeps firing, each tick rethrows) — surface it for the run log.
        console.error("[sim] tick threw:", e);
      }
    }, 200);
  }
}
