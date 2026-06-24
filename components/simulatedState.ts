/**
 * eeState — machine-readable experiment state via a hidden DOM element (#ee-state).
 *
 * Exposes the experiment's current action affordances (accepted input modalities,
 * valid response characters, trial progress) so that automated agents can reliably
 * observe and interact with the experiment without interpreting canvas content.
 * Updated synchronously at the exact source of each affordance change.
 *
 * For non-simulated experiments, {@link setEEState} is a no-op (after the first
 * DOM-element allocation) — see {@link simulateActive}.
 */

export const SIM_PHASE = {
  LOADING: "loading",
  COMPATIBILITY: "compatibility",
  CONSENT: "consent",
  CALIBRATION: "calibration",
  INSTRUCTIONS: "instructions",
  FIXATION: "fixation",
  STIMULUS: "stimulus",
  RESPONSE: "response",
  READING: "reading",
  DEBRIEF: "debrief",
  COMPLETE: "complete",
} as const;

export type SimPhase = (typeof SIM_PHASE)[keyof typeof SIM_PHASE];

export interface EEStateUpdate {
  phase?: SimPhase;
  trial?: number | string;
  trialTotal?: number | string;
  block?: number | string;
  responseTyped?: boolean;
  validCharsTyped?: string;
  responseClicked?: boolean;
  validCharsClicked?: string;
  keypadUrl?: string;
  correctResponse?: string;
  simulationModel?: string;
  trialLevel?: number | string;
  simulationThreshold?: number | string;
  simulationBeta?: number | string;
  simulationDelta?: number | string;
  thresholdProportionCorrect?: number | string;
  conditionName?: string;
  targetKind?: string | string[];
  targetTask?: string | string[];
  currentFunction?: string;
  error?: string;
  experimentName?: string;
  blockCount?: number | string;
  conditionCount?: number | string;
  language?: string;
  seed?: number | string;
  blockCondition?: string;
  enabled?: boolean;
  trialsCompleted?: number | string;
  trialsTotal?: number | string;
  blocksSkipped?: number | string;
  warnings?: string;
  blockTotal?: number | string;
  skipReason?: string;
  responseReceived?: string;
  responseKind?: string;
  responseCorrect?: boolean;
  schedulerEvent?: string;
  conditionState?: string;
  conditionEnabled?: boolean;
  fixationPx?: string;
  gazeMeasuredDeg?: string;
  targetOnScreen?: boolean;
  targetLocationPx?: string;
  targetEccentricityDeg?: string;
  dialogOpen?: string;
  usingGaze?: boolean;
}

/**
 * Toggle: when `false` (default, real participants), {@link setEEState} and
 * {@link publishResponseAffordance} are no-ops — zero attribute writes, zero
 * paramReader reads. When `true`, observers are listening and the full
 * state stream is published.
 *
 * Set to `true` by {@link startSimulatedParticipant} at startup, before
 * any trial logic runs.
 */
export let simulateActive = false;

/** Mark simulation as active. Called once from startSimulatedParticipant. */
export function activateSimulation(): void {
  simulateActive = true;
}

function getElement(): HTMLElement {
  let el = document.getElementById("ee-state");
  if (!el) {
    el = document.createElement("div");
    el.id = "ee-state";
    el.style.display = "none";
    document.body.appendChild(el);
  }
  return el;
}

function toAttr(key: string): string {
  return "data-" + key.replace(/([A-Z])/g, "-$1").toLowerCase();
}

export function setEEState(updates: EEStateUpdate): void {
  // No-op for real participants: no observer is listening, skip the DOM writes.
  if (!simulateActive) return;
  const el = getElement();
  for (const [key, value] of Object.entries(updates)) {
    el.setAttribute(toAttr(key), value == null ? "" : String(value));
  }
}

/**
 * Convenience helper for the verbose RESPONSE affordance block.
 * Accepts strings or numbers and an array-or-scalar for validCharsTyped /
 * correctResponse (multi-response kinds like rsvpReading pass arrays).
 */
export interface ResponseAffordance {
  validCharsTyped: string | string[];
  correctResponse: string | string[] | null;
  simulationModel?: string | null;
  trialLevel?: number | string | null;
  simulationThreshold?: number | string | null;
  simulationBeta?: number | string | null;
  simulationDelta?: number | string | null;
  thresholdProportionCorrect?: number | string | null;
}

export function publishResponseAffordance(a: ResponseAffordance): void {
  // No-op for real participants: avoids 5 paramReader.read() calls per trial.
  if (!simulateActive) return;
  const validChars = Array.isArray(a.validCharsTyped)
    ? a.validCharsTyped.join("")
    : String(a.validCharsTyped);
  const correct = Array.isArray(a.correctResponse)
    ? a.correctResponse[0]
    : a.correctResponse;
  setEEState({
    phase: SIM_PHASE.RESPONSE,
    responseTyped: true,
    validCharsTyped: validChars,
    correctResponse: correct == null ? "" : String(correct),
    simulationModel: a.simulationModel ?? "",
    trialLevel: a.trialLevel ?? "",
    simulationThreshold: a.simulationThreshold ?? "",
    simulationBeta: a.simulationBeta ?? "",
    simulationDelta: a.simulationDelta ?? "",
    thresholdProportionCorrect: a.thresholdProportionCorrect ?? "",
  });
}

export interface BootInfo {
  experimentName: string;
  blockCount: number;
  conditionCount: number;
  targetKinds: string;
  language: string;
  seed: number | string;
}

/**
 * Publish a one-shot boot event at simulator startup with experiment metadata.
 * Caller passes already-computed values — no paramReader dependency here.
 * No-op for real participants via {@link simulateActive}.
 */
export function publishBootEvent(info: BootInfo): void {
  if (!simulateActive) return;
  setEEState({
    phase: SIM_PHASE.LOADING,
    ...info,
  });
  console.debug(
    `[sim:boot] experiment=${info.experimentName} blocks=${info.blockCount} conditions=${info.conditionCount} targetKinds=${info.targetKinds} language=${info.language} seed=${info.seed}`,
  );
}

export interface BlockTransitionInfo {
  /** 1-based block number, matches snapshot.block + 1 in threshold.js. */
  block: number | string;
  /** Total blocks in the experiment (snapshot.nTotal). */
  blockTotal?: number | string;
  /** Block condition identifier, e.g. "1_1". */
  blockCondition?: string;
  /** Whether this block's conditions are enabled (conditionEnabledBool). */
  enabled?: boolean;
}

/**
 * Publish a block-begin event. Call from filterRoutineBegin (or equivalent
 * per-block entry point). No-op for real participants.
 *
 * Does NOT set `phase`: filterRoutineBegin runs as part of the block's
 * normal flow (between block begin and instruction routine). Setting phase
 * here would overwrite downstream phase publishes (e.g. INSTRUCTIONS set by
 * initInstructionRoutineBegin). Block metadata alone is sufficient — the
 * observer infers "loading next block" from the [sim:block] debug line.
 */
export function publishBlockBegin(info: BlockTransitionInfo): void {
  if (!simulateActive) return;
  setEEState({
    block: info.block,
    blockTotal: info.blockTotal ?? "",
    blockCondition: info.blockCondition ?? "",
    enabled: info.enabled ?? true,
  });
  console.debug(
    `[sim:block] begin block=${info.block}/${
      info.blockTotal ?? "?"
    } condition=${info.blockCondition ?? "?"} enabled=${info.enabled ?? true}`,
  );
}

/**
 * Publish a block-end event. Call from blocksLoopEnd (or equivalent).
 * No-op for real participants.
 */
export function publishBlockEnd(block?: number | string): void {
  if (!simulateActive) return;
  console.debug(`[sim:block] end block=${block ?? "?"}`);
}

/**
 * Publish a summary event at experiment completion. Caller passes
 * already-computed values. No-op for real participants.
 */
export interface SummaryInfo {
  trialsCompleted: number | string;
  trialsTotal?: number | string;
  blocksSkipped?: number | string;
  warnings?: string;
}

export function publishSummary(info: SummaryInfo): void {
  if (!simulateActive) return;
  setEEState({
    phase: SIM_PHASE.COMPLETE,
    trialsCompleted: info.trialsCompleted,
    trialsTotal: info.trialsTotal,
    blocksSkipped: info.blocksSkipped ?? 0,
    warnings: info.warnings ?? "",
  });
  // Set a persistence-layer flag so the observer can detect completion even
  // after the page reloads (psychoJS.quit triggers navigation). sessionStorage
  // survives same-origin reloads; the observer reads it via page.evaluate.
  // Also set window.__SIM_COMPLETE__ for instant detection on the same page.
  try {
    sessionStorage.setItem("__SIM_COMPLETE__", "1");
  } catch {
    /* best-effort */
  }
  (window as any).__SIM_COMPLETE__ = true;
  console.debug(
    `[sim:summary] trialsCompleted=${info.trialsCompleted}/${
      info.trialsTotal ?? "?"
    } blocksSkipped=${info.blocksSkipped ?? 0}`,
  );
}

/**
 * Publish a response event to #ee-state. Called from click/keypress/keypad
 * handlers so automated observers can confirm dispatched inputs were received
 * and whether the response was judged correct.
 * No-op for real participants via {@link simulateActive}.
 */
export function publishResponseEvent(
  char: string,
  kind: "key" | "click" | "keypad" | "spoken",
  correct?: boolean,
): void {
  if (!simulateActive) return;
  setEEState({
    responseReceived: char,
    responseKind: kind,
    responseCorrect: correct,
  });
  console.debug(`[sim:response] ${kind}="${char}" correct=${correct ?? "?"}`);
}
