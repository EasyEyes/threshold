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
  SHOWIMAGE: "showimage",
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
  /** Monotonic count of Swal fires (sim only): lets the simulated
   * participant's dedupe key distinguish consecutive dialogs with
   * identical titles (e.g. two freeform questions with empty titles). */
  dialogs?: number | string;
  usingGaze?: boolean;
  /** Bumped when a mid-experiment recalibration completes (stimuli
   * regenerated) so the simulated participant re-arms its action dedupe —
   * a real participant would simply press/click again. */
  recalibrations?: number | string;
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

import { initEventLog, emitEvent } from "./eventStream/eventLog";
import { getMasterSeed, getSeedSource } from "./rng";
import { applyEvent, type DerivedState } from "./eventStream/derivedState";
import type { Event } from "./eventStream/schema";

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
    // A fresh element knows nothing: forget the mirror so the next
    // projection re-writes every event-derived field, even unchanged ones.
    attrMirror = {};
  }
  return el;
}

function toAttr(key: string): string {
  return "data-" + key.replace(/([A-Z])/g, "-$1").toLowerCase();
}

export function setEEState(updates: EEStateUpdate): void {
  // No-op for real participants: no observer is listening, skip the DOM writes.
  if (!simulateActive) return;
  writeAttrs(updates as Record<string, unknown>);
}

/**
 * Last-written #ee-state attr strings — the mirror the event projection
 * diffs against. Every attr write (event-driven or direct setEEState)
 * updates it, so an event correctly rewrites a key that a scatter write
 * overwrote in between (e.g. phase=response, scatter stimulus, response).
 */
let attrMirror: Record<string, string> = {};

function writeAttrs(updates: Record<string, unknown>): void {
  const el = getElement();
  for (const [key, value] of Object.entries(updates)) {
    const attrVal = value == null ? "" : String(value);
    el.setAttribute(toAttr(key), attrVal);
    attrMirror[key] = attrVal;
  }
}

/**
 * Running derived projection of the event log (supersede design: events are
 * the substrate, #ee-state attrs are a view).
 */
let eeProjection: DerivedState = {};

/** Emit a schema event and project changed attrs onto #ee-state. */
function emit(e: Event): void {
  emitEvent(e);
  // Ensure the element exists (and reset the mirror if it was recreated)
  // BEFORE diffing, else an unchanged value against a stale mirror would
  // skip the write onto a fresh, empty element.
  getElement();
  eeProjection = applyEvent(eeProjection, e);
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(eeProjection)) {
    if (v === undefined) continue;
    const attrVal = v == null ? "" : String(v);
    if (attrMirror[k] !== attrVal) updates[k] = v;
  }
  if (Object.keys(updates).length > 0) writeAttrs(updates);
}

/** Test-only: clear projection + attr mirror (DOM attrs are the test's to reset). */
export function resetEEStateForTests(): void {
  eeProjection = {};
  attrMirror = {};
}

/**
 * Convenience helper for the verbose RESPONSE affordance block.
 * Accepts strings or numbers and an array-or-scalar for validCharsTyped /
 * correctResponse (multi-response kinds like rsvpReading pass arrays).
 */
export interface ResponseAffordance {
  validCharsTyped: string | string[];
  /** false closes the typed affordance (debrief); default true. */
  active?: boolean;
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
    ? a.validCharsTyped.map(String)
    : [...String(a.validCharsTyped)];
  const correctResponse =
    a.correctResponse == null
      ? null
      : Array.isArray(a.correctResponse)
      ? a.correctResponse.map(String)
      : [String(a.correctResponse)];
  emit({
    type: "response.affordance",
    ...(a.active === undefined ? {} : { active: a.active }),
    validChars,
    correctResponse,
    trialLevel: a.trialLevel ?? null,
    simulationModel: a.simulationModel ?? null,
    simulationThreshold: a.simulationThreshold ?? null,
    simulationBeta: a.simulationBeta ?? null,
    simulationDelta: a.simulationDelta ?? null,
    thresholdProportionCorrect: a.thresholdProportionCorrect ?? null,
  });
}

/**
 * Publish a phase transition. Call sites own phases: an affordance publish
 * no longer implies one (instructions/reading need different phases with
 * the same affordance).
 */
export function publishPhaseEntered(
  phase: (typeof SIM_PHASE)[keyof typeof SIM_PHASE],
): void {
  if (!simulateActive) return;
  emit({ type: "phase.entered", phase });
}

/** Publish trial metadata at trial start. No-op for real participants. */
export function publishTrialStarted(
  trial: number,
  blockCondition: string | undefined,
  trialTotal: number | string | undefined,
): void {
  if (!simulateActive) return;
  emit({
    type: "trial.started",
    trial,
    blockCondition: blockCondition ?? "",
    trialTotal: trialTotal ?? "",
  });
}

/**
 * Publish a modal/dialog opening (label = exactly what the legacy dialogOpen
 * attr showed). No-op for real participants.
 */
export function publishDialogOpened(
  kind: "swal" | "jquery" | "browser",
  title: string,
  label: string,
): void {
  if (!simulateActive) return;
  emit({ type: "dialog.opened", kind, title, label });
}

/** Publish a modal/dialog closing. No-op for real participants. */
export function publishDialogClosed(): void {
  if (!simulateActive) return;
  emit({ type: "dialog.closed" });
}

/** Publish a reported error/problem. No-op for real participants. */
export function publishErrorReported(message: string): void {
  if (!simulateActive) return;
  emit({ type: "error.reported", message });
}

/** Publish a mid-run block restart (e.g. distance recalibration). */
export function publishBlockRestarted(block: number, cause: string): void {
  if (!simulateActive) return;
  emit({ type: "block.restarted", block, cause });
}

/** Publish click-affordance changes. No-op for real participants. */
export function publishClickAffordance(a: {
  clicked: boolean | null;
  validChars: string[] | null;
}): void {
  if (!simulateActive) return;
  emit({
    type: "click.affordance",
    clicked: a.clicked,
    validChars: a.validChars,
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
 *
 * Also initializes the event log with real boot info (an emit before this
 * point would have auto-initialized an "unseeded" placeholder header).
 */
export function publishBootEvent(info: BootInfo): void {
  if (!simulateActive) return;
  const masterSeed = getMasterSeed();
  const seed = masterSeed ?? (info.seed === "" ? 0 : Number(info.seed));
  initEventLog({
    experimentName: info.experimentName,
    seed,
    seedSource: masterSeed === null ? "unseeded" : getSeedSource(),
  });
  emit({
    type: "session.started",
    experimentName: info.experimentName,
    blockCount: info.blockCount,
    conditionCount: info.conditionCount,
    targetKinds: String(info.targetKinds).split(","),
    language: info.language,
    seed,
  });
  emit({ type: "phase.entered", phase: SIM_PHASE.LOADING });
  console.debug(
    `[sim:boot] experiment=${info.experimentName} blocks=${info.blockCount} conditions=${info.conditionCount} targetKinds=${info.targetKinds} language=${info.language} seed=${info.seed}`,
  );
}

export interface BlockTransitionInfo {
  /** 1-based block number (status.block in threshold.js). */
  block: number | string;
  /** Total blocks in the experiment (snapshot.nTotal). */
  blockTotal?: number | string;
  /** Block condition identifier, e.g. "1_1". */
  blockCondition?: string;
  /** Whether this block's conditions are enabled (conditionEnabledBool). */
  enabled?: boolean;
  /** Sequential block count in this run (status.nthBlock). */
  nthBlock: number | string;
  targetKind: string | string[];
  targetTask: string | string[];
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
  emit({
    type: "block.entered",
    block: Number(info.block),
    nthBlock: Number(info.nthBlock),
    blockTotal: info.blockTotal == null ? null : Number(info.blockTotal),
    blockCondition: info.blockCondition ?? null,
    enabled: info.enabled ?? true,
    targetKind: String(info.targetKind),
    targetTask: String(info.targetTask),
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
  emit({ type: "block.exited", block: Number(block ?? 0) });
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
  status?: "completed" | "failed" | "incomplete";
}

export function publishSummary(info: SummaryInfo): void {
  if (!simulateActive) return;
  emit({
    type: "session.ended",
    status: info.status ?? "completed",
    trialsCompleted: Number(info.trialsCompleted),
    trialsTotal: info.trialsTotal == null ? null : Number(info.trialsTotal),
    blocksSkipped: info.blocksSkipped == null ? 0 : Number(info.blocksSkipped),
    warningsSummary: info.warnings ?? null,
  });
  emit({ type: "phase.entered", phase: SIM_PHASE.COMPLETE });
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
  emit({
    type: "response.recorded",
    kind,
    value: char,
    correct: correct ?? null,
  });
  console.debug(`[sim:response] ${kind}="${char}" correct=${correct ?? "?"}`);
}
