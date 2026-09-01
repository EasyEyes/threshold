/**
 * Event-log substrate (append-only, seq-gapless). One emission path for the
 * whole instrumentation layer: publishers emit typed schema events here;
 * legacy #ee-state attrs become a derived projection of this log.
 *
 * This module has no DOM knowledge beyond the window.__eeEvents exposure
 * for the external observer — projection wiring lives in the publishers
 * (simulatedState.ts), which keeps the log dependency-free and testable.
 */

import {
  EVENT_SCHEMA_VERSION,
  type AnyEventEnvelope,
  type Event,
  type EventChannel,
  type StreamHeader,
} from "./schema";

/** The channel contract per event type tag. Record<Event["type"], …>
 * makes an unmapped or extra tag a compile error. */
export const EVENT_CHANNEL_BY_TYPE: Record<Event["type"], EventChannel> = {
  // logical
  "session.started": "logical",
  "blocks.scheduled": "logical",
  "consent.decided": "logical",
  "phase.entered": "logical",
  "dialog.opened": "logical",
  "dialog.closed": "logical",
  "instruction.shown": "logical",
  "block.entered": "logical",
  "block.exited": "logical",
  "block.skipped": "logical",
  "block.restarted": "logical",
  "condition.entered": "logical",
  "condition.skipped": "logical",
  "condition.exited": "logical",
  "trial.started": "logical",
  "stimulus.presented": "logical",
  "response.affordance": "logical",
  "click.affordance": "logical",
  "response.recorded": "logical",
  "trial.outcome": "logical",
  "trial.skipped": "logical",
  "estimator.snapshot": "logical",
  "warning.emitted": "logical",
  "error.reported": "logical",
  "session.ended": "logical",
  // trace
  "routine.entered": "trace",
  "scheduler.advanced": "trace",
  // telemetry
  "telemetry.frame.span": "telemetry",
  "telemetry.latency": "telemetry",
  "telemetry.gaze.sample": "telemetry",
  "telemetry.clock.sample": "telemetry",
};

export function channelOf(e: Event): EventChannel {
  return EVENT_CHANNEL_BY_TYPE[e.type];
}

export class EventLog {
  readonly header: StreamHeader;
  readonly events: AnyEventEnvelope[] = [];

  constructor(headerBase: {
    experimentName: string;
    seed: number;
    seedSource: StreamHeader["seedSource"];
  }) {
    this.header = {
      type: "stream.header",
      schemaVersion: EVENT_SCHEMA_VERSION,
      experimentName: headerBase.experimentName,
      seed: headerBase.seed,
      seedSource: headerBase.seedSource,
      emittedAtIso: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__eeEvents = this.events;
    }
  }

  emit(e: Event): AnyEventEnvelope {
    const envelope: AnyEventEnvelope = {
      v: EVENT_SCHEMA_VERSION,
      seq: this.events.length + 1,
      ch: channelOf(e),
      atMs: typeof performance !== "undefined" ? performance.now() : undefined,
      e,
    };
    this.events.push(envelope);
    return envelope;
  }

  /** One JSON object per line; stream.header first. */
  toJSONL(): string {
    const lines = [JSON.stringify(this.header)];
    for (const env of this.events) lines.push(JSON.stringify(env));
    return lines.join("\n");
  }
}

let log: EventLog | null = null;

/** Create (or return the existing) log. Boot info wins over placeholders. */
export function initEventLog(headerBase: {
  experimentName: string;
  seed: number;
  seedSource: StreamHeader["seedSource"];
}): EventLog {
  if (!log) log = new EventLog(headerBase);
  return log;
}

export function getEventLog(): EventLog | null {
  return log;
}

/**
 * Append an event. If nothing initialized the log yet (an emitter fired
 * before boot), initialize an honest placeholder: seedSource "unseeded",
 * so strict diffs exclude such runs rather than fail on them.
 */
export function emitEvent(e: Event): AnyEventEnvelope {
  if (!log)
    log = new EventLog({ experimentName: "", seed: 0, seedSource: "unseeded" });
  return log.emit(e);
}

/** Test-only: drop the singleton so each test starts a fresh log. */
export function resetEventLogForTests(): void {
  log = null;
}
