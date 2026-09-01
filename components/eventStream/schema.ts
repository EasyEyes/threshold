/**
 * Event-stream schema — the contract for differential testing and profiling.
 *
 * The experiment emits an append-only log of typed events, one JSON envelope
 * per line (JSONL). The stream opens with a StreamHeader line. Events are
 * classified into channels:
 *
 * - "logical":   deterministic content; diffed exactly across two runs with
 *                the same table, seed, and input script.
 * - "telemetry": timing-dependent content (latencies, frame data, clocks);
 *                never diffed — aggregated into separate timing invariants.
 * - "trace":     implementation-detail events (routine/scheduler flow).
 *                Diffable, but expected to churn under refactor; the
 *                divergence registry may ignore them wholesale.
 *
 * Diff rules declared here, enforced by the diff tool:
 * - Telemetry-channel events are excluded from diffs entirely.
 * - VOLATILE_EVENT_FIELDS are stripped from every event before diffing.
 * - Any remaining divergence must be covered by a registered divergence
 *   rule, else the harness fails.
 *
 * Vocabulary deliberately reuses the existing sim instrumentation
 * (SIM_PHASE phases, LoopTrailRow estimator fields, response kinds, trial
 * data-column semantics), so emitters are thin adapters at the existing
 * publish points rather than a parallel reporting path.
 *
 * This module is types + contract constants only; runtime (emitter, diff
 * tool) is implemented separately with tests first.
 */

import type { SimPhase } from "../simulatedState";
import type { LoopTrailRow } from "../loopTrailSnapshot";

export const EVENT_SCHEMA_VERSION = 1;

export type EventChannel = "logical" | "telemetry" | "trace";

/**
 * Envelope fields stripped from every event before diffing. Timing and
 * identity, never logical content.
 */
export const VOLATILE_EVENT_FIELDS = ["atMs"] as const;

export interface EventEnvelope<E> {
  /** Schema version of this event's shape (EVENT_SCHEMA_VERSION). */
  v: number;
  /**
   * 1-based, gapless emission order. The total order used for diff
   * alignment — the stream has no other ordering authority.
   */
  seq: number;
  ch: EventChannel;
  /** performance.now() at emission. Volatile: stripped before diffing. */
  atMs?: number;
  e: E;
}

export type EventEnvelopeOf<E extends { type: string }> = EventEnvelope<E> & {
  e: E;
};

/** First line of every stream, before any event envelope. */
export interface StreamHeader {
  type: "stream.header";
  schemaVersion: number;
  experimentName: string;
  seed: number;
  /**
   * How the run's RNG was seeded. Runs logged as "unseeded" are excluded
   * from strict diffs (their order/content may legitimately diverge);
   * every seedable randomness site patched is one step toward "sim"/"url"
   * being the only values in practice.
   */
  seedSource: "sim" | "url" | "unseeded";
  /** Wall-clock ISO timestamp. Volatile: informational only. */
  emittedAtIso: string;
}

/* ---------------------------------------------------------------------------
 * Logical channel — diffed exactly
 * ------------------------------------------------------------------------- */

export interface SessionStartedEvent {
  type: "session.started";
  experimentName: string;
  blockCount: number;
  conditionCount: number;
  targetKinds: string[];
  language: string;
  seed: number;
}

/** Emitted when the run order of blocks is determined (post-shuffle). */
export interface BlocksScheduledEvent {
  type: "blocks.scheduled";
  /** Block numbers in run order, e.g. [2, 1, 3]. */
  order: number[];
}

export interface ConsentDecidedEvent {
  type: "consent.decided";
  given: boolean;
}

export interface PhaseEnteredEvent {
  type: "phase.entered";
  /** The participant-facing phase vocabulary (SIM_PHASE). */
  phase: SimPhase;
}

export interface DialogOpenedEvent {
  type: "dialog.opened";
  kind: "swal" | "jquery" | "browser";
  /** Raw title text. */
  title: string;
  /** Exactly what the legacy dialogOpen attr showed, e.g. "Swal: <title>". */
  label: string;
}

export interface DialogClosedEvent {
  type: "dialog.closed";
}

/** A fatal/problematic condition reported to sim instrumentation. */
export interface ErrorReportedEvent {
  type: "error.reported";
  message: string;
}

/** Instruction overlay text (.ee-html-text-stim) at show time. */
export interface InstructionShownEvent {
  type: "instruction.shown";
  text: string;
}

export interface BlockEnteredEvent {
  type: "block.entered";
  /** 1-based conserved block number (status.block). */
  block: number;
  /** Sequential block count in this run (status.nthBlock). */
  nthBlock: number;
  /** Total blocks in the experiment (loop snapshot.nTotal). */
  blockTotal: number | null;
  blockCondition: string | null;
  enabled: boolean;
  targetKind: string;
  targetTask: string;
}

export interface BlockExitedEvent {
  type: "block.exited";
  block: number;
}

export interface BlockSkippedEvent {
  type: "block.skipped";
  block: number;
  reason: string;
}

/** Mid-experiment recalibration restarts the block (e.g. distance change). */
export interface BlockRestartedEvent {
  type: "block.restarted";
  block: number;
  cause: string;
}

export interface ConditionEnteredEvent {
  type: "condition.entered";
  /** Block condition id, e.g. "1_1" (status.block_condition). */
  blockCondition: string;
  conditionName: string | null;
  enabled: boolean;
}

export interface ConditionSkippedEvent {
  type: "condition.skipped";
  blockCondition: string;
  reason: string;
}

export interface ConditionExitedEvent {
  type: "condition.exited";
  blockCondition: string;
}

export interface TrialStartedEvent {
  type: "trial.started";
  /** 1-based trial number (status.trial). */
  trial: number;
  blockCondition: string;
  /** Total trials of the context the counter displays, if known. */
  trialTotal?: number | string | null;
  /** Current estimator level, when known at trial start. */
  level?: number | null;
  fixationPosPx?: readonly [number, number] | null;
  usingGaze?: boolean;
}

export interface StimulusPresentedEvent {
  type: "stimulus.presented";
  targetKind: string;
  level: number | null;
  /**
   * Serialized stim attributes at presentation, keyed by attr name
   * (the stim-change allowlist vocabulary: text, pos, size, contrast, …).
   */
  spec: Record<string, string>;
  /** Result of the off-screen check at presentation; null when unchecked. */
  onScreen: boolean | null;
  locationPx?: readonly [number, number];
  eccentricityDeg?: number;
}

/**
 * Click affordance: whether click responses are currently active and the
 * clickable character set. null = leave that aspect unchanged.
 */
export interface ClickAffordanceEvent {
  type: "click.affordance";
  clicked: boolean | null;
  validChars: string[] | null;
}

/** Response modality vocabulary of publishResponseEvent. */
export type ResponseKind = "key" | "click" | "keypad" | "spoken";

/**
 * The set of responses currently accepted (valid chars, expected answer,
 * simulation model params). Consumed by the simulated participant; in the
 * engine future this is part of AwaitResponse.
 */
export interface ResponseAffordanceEvent {
  type: "response.affordance";
  /** Whether typed responses are accepted (default true; false closes it). */
  active?: boolean;
  /** Canonical lossless form: chars for single-response kinds, tokens for
   * multi-response kinds. */
  validChars: string[];
  correctResponse: string[] | null;
  trialLevel: string | number | null;
  simulationModel: string | number | null;
  simulationThreshold: string | number | null;
  simulationBeta: string | number | null;
  simulationDelta: string | number | null;
  thresholdProportionCorrect: string | number | null;
}

export interface ResponseRecordedEvent {
  type: "response.recorded";
  kind: ResponseKind;
  value: string;
  correct: boolean | null;
}

/**
 * Trial kind vocabulary of the trialKind data column / CSV trail oracle.
 */
export type TrialKindTag =
  | "goodtest"
  | "badtest"
  | "goodpractice"
  | "badpractice";

export interface TrialOutcomeEvent {
  type: "trial.outcome";
  trial: number | null;
  blockCondition: string;
  /** key_resp.corr. */
  correct: boolean | null;
  level: number | null;
  /** trialGivenToQuest. */
  givenToEstimator: boolean;
  /** retryingThisTrialBool. */
  retrying: boolean;
  kind: TrialKindTag | null;
  /** questResetByThresholdPracticeUntilCorrectBool. */
  estimatorReset: boolean;
  /** Estimator trial count after the response (_jsQuest.trialCount). */
  estimatorCount: number | null;
}

/** A trial aborted without a response (fixation loss, error skip, …). */
export interface TrialSkippedEvent {
  type: "trial.skipped";
  trial: number | null;
  blockCondition: string | null;
  reason: string;
}

/**
 * Estimator internals after a response — the LoopTrailRow vocabulary
 * (MultiStairHandler/QuestHandler iterator-safety trail), order carried by
 * the envelope's seq instead of the row's nth.
 */
export type EstimatorSnapshotEvent = Omit<LoopTrailRow, "nth"> & {
  type: "estimator.snapshot";
};

/** Non-fatal problem: appended to the CSV warning column via warning(). */
export interface WarningEmittedEvent {
  type: "warning.emitted";
  message: string;
}

export interface SessionEndedEvent {
  type: "session.ended";
  status: "completed" | "failed" | "incomplete";
  trialsCompleted: number;
  trialsTotal: number | null;
  blocksSkipped: number;
  /** Concatenated warnings summary (the legacy summary attr). */
  warningsSummary: string | null;
}

export type LogicalEvent =
  | SessionStartedEvent
  | BlocksScheduledEvent
  | ConsentDecidedEvent
  | PhaseEnteredEvent
  | DialogOpenedEvent
  | DialogClosedEvent
  | InstructionShownEvent
  | BlockEnteredEvent
  | BlockExitedEvent
  | BlockSkippedEvent
  | BlockRestartedEvent
  | ConditionEnteredEvent
  | ConditionSkippedEvent
  | ConditionExitedEvent
  | TrialStartedEvent
  | StimulusPresentedEvent
  | ResponseAffordanceEvent
  | ClickAffordanceEvent
  | ResponseRecordedEvent
  | TrialOutcomeEvent
  | TrialSkippedEvent
  | EstimatorSnapshotEvent
  | WarningEmittedEvent
  | ErrorReportedEvent
  | SessionEndedEvent;

/* ---------------------------------------------------------------------------
 * Trace channel — diffable, expected to churn under refactor
 * ------------------------------------------------------------------------- */

/** Routine breadcrumb (setCurrentFn vocabulary: trialRoutineBegin, …). */
export interface RoutineEnteredEvent {
  type: "routine.entered";
  fn: string;
}

/** Scheduler step outcomes (Scheduler.Event values: NEXT, QUIT, …). */
export interface SchedulerAdvancedEvent {
  type: "scheduler.advanced";
  event: string;
}

export type TraceEvent = RoutineEnteredEvent | SchedulerAdvancedEvent;

/* ---------------------------------------------------------------------------
 * Telemetry channel — never diffed, aggregated into timing invariants
 * ------------------------------------------------------------------------- */

export interface FrameSpanEvent {
  type: "telemetry.frame.span";
  rafDeltaMs: number;
}

export interface LatencyEvent {
  type: "telemetry.latency";
  /** What was measured, e.g. "responseFromStimulus". */
  what: string;
  ms: number;
}

/** Live gaze sample relative to fixation (noisy input, not logical state). */
export interface GazeSampleEvent {
  type: "telemetry.gaze.sample";
  gazeMeasuredDeg: number | null;
  fixationPx: string | null;
}

/** Wall-clock↔performance.now pairing, for offline timestamp reconstruction. */
export interface ClockSampleEvent {
  type: "telemetry.clock.sample";
  epochMs: number;
  perfNowMs: number;
}

export type TelemetryEvent =
  | FrameSpanEvent
  | LatencyEvent
  | GazeSampleEvent
  | ClockSampleEvent;

/* ---------------------------------------------------------------------------
 * Union
 * ------------------------------------------------------------------------- */

export type Event = LogicalEvent | TraceEvent | TelemetryEvent;

export type AnyEventEnvelope = EventEnvelope<Event>;
