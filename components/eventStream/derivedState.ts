/**
 * Derived-state projection of the event log: the current-state view the
 * legacy #ee-state attrs are written from. Fields mirror the legacy attr
 * semantics (scalars; params "" for unknown; attrs are overwritten, never
 * cleared), so the projection is drop-in equivalent to the old explicit
 * setEEState writes at the converted publish points.
 *
 * applyEvent handles every schema event: wired events derive fields,
 * unwired ones return the state object unchanged (identity) — exhaustive
 * by type, so a new schema event forces a decision here.
 */

import type { Event } from "./schema";

export interface DerivedState {
  phase?: string;
  experimentName?: string;
  blockCount?: number;
  conditionCount?: number;
  targetKinds?: string;
  language?: string;
  seed?: number;
  block?: number;
  blockTotal?: number | null;
  blockCondition?: string | null;
  enabled?: boolean;
  targetKind?: string;
  targetTask?: string;
  trial?: number;
  trialTotal?: number | string;
  responseTyped?: boolean;
  validCharsTyped?: string;
  correctResponse?: string;
  trialLevel?: string | number;
  simulationModel?: string | number;
  simulationThreshold?: string | number;
  simulationBeta?: string | number;
  simulationDelta?: string | number;
  thresholdProportionCorrect?: string | number;
  responseClicked?: boolean;
  validCharsClicked?: string;
  dialogOpen?: string;
  /** Monotonic count of dialog.opened events (dedupe identity). */
  dialogs?: number;
  error?: string;
  /** Monotonic count of block.restarted events. */
  recalibrations?: number;
  responseReceived?: string;
  responseKind?: string;
  responseCorrect?: boolean | null;
  trialsCompleted?: number;
  trialsTotal?: number | string;
  blocksSkipped?: number;
  warnings?: string;
}

const orEmpty = (v: string | number | null): string | number =>
  v == null ? "" : v;

export function applyEvent(s: DerivedState, e: Event): DerivedState {
  switch (e.type) {
    case "session.started":
      return {
        ...s,
        experimentName: e.experimentName,
        blockCount: e.blockCount,
        conditionCount: e.conditionCount,
        targetKinds: e.targetKinds.join(","),
        language: e.language,
        seed: e.seed,
      };
    case "phase.entered":
      return { ...s, phase: e.phase };
    case "block.entered":
      return {
        ...s,
        block: e.block,
        blockTotal: e.blockTotal,
        blockCondition: e.blockCondition,
        enabled: e.enabled,
        targetKind: e.targetKind,
        targetTask: e.targetTask,
      };
    case "response.affordance":
      return {
        ...s,
        responseTyped: e.active ?? true,
        validCharsTyped: e.validChars.join(""),
        correctResponse: e.correctResponse == null ? "" : e.correctResponse[0],
        trialLevel: orEmpty(e.trialLevel),
        simulationModel: orEmpty(e.simulationModel),
        simulationThreshold: orEmpty(e.simulationThreshold),
        simulationBeta: orEmpty(e.simulationBeta),
        simulationDelta: orEmpty(e.simulationDelta),
        thresholdProportionCorrect: orEmpty(e.thresholdProportionCorrect),
      };
    case "response.recorded":
      return {
        ...s,
        responseReceived: e.value,
        responseKind: e.kind,
        responseCorrect: e.correct,
      };
    case "trial.started":
      return {
        ...s,
        trial: e.trial,
        trialTotal: e.trialTotal ?? "",
      };
    case "session.ended":
      return {
        ...s,
        trialsCompleted: e.trialsCompleted,
        trialsTotal: e.trialsTotal == null ? "" : e.trialsTotal,
        blocksSkipped: e.blocksSkipped,
        warnings: e.warningsSummary == null ? "" : e.warningsSummary,
      };
    case "dialog.opened":
      return { ...s, dialogOpen: e.label, dialogs: (s.dialogs ?? 0) + 1 };
    case "dialog.closed":
      return { ...s, dialogOpen: "" };
    case "error.reported":
      return { ...s, error: e.message };
    case "block.restarted":
      return { ...s, recalibrations: (s.recalibrations ?? 0) + 1 };
    case "click.affordance":
      return {
        ...s,
        ...(e.clicked === null ? {} : { responseClicked: e.clicked }),
        ...(e.validChars === null
          ? {}
          : { validCharsClicked: e.validChars.join("") }),
      };
    // Wired: no legacy attr equivalents yet — identity.
    case "blocks.scheduled":
    case "consent.decided":
    case "instruction.shown":
    case "block.exited":
    case "block.skipped":
    case "condition.entered":
    case "condition.skipped":
    case "condition.exited":
    case "stimulus.presented":
    case "trial.outcome":
    case "trial.skipped":
    case "estimator.snapshot":
    case "warning.emitted":
    case "routine.entered":
    case "scheduler.advanced":
    case "telemetry.frame.span":
    case "telemetry.latency":
    case "telemetry.gaze.sample":
    case "telemetry.clock.sample":
      return s;
  }
}

/** Replay a full event list. */
export function stateFromEvents(events: Event[]): DerivedState {
  let s: DerivedState = {};
  for (const e of events) s = applyEvent(s, e);
  return s;
}
