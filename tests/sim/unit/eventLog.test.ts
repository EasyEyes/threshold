/**
 * @jest-environment jsdom
 *
 * Event-log substrate (components/eventStream/eventLog.ts):
 * append-only, seq-gapless, channel-classified envelopes; JSONL wire
 * format (stream.header first); window.__eeEvents exposure for the
 * external observer; honest placeholder init when events precede boot.
 */

import {
  channelOf,
  emitEvent,
  getEventLog,
  initEventLog,
  resetEventLogForTests,
  EVENT_CHANNEL_BY_TYPE,
} from "../../../components/eventStream/eventLog";
import type { Event } from "../../../components/eventStream/schema";

const sessionStarted = (seed: number): Event => ({
  type: "session.started",
  experimentName: "letter-sim",
  blockCount: 1,
  conditionCount: 1,
  targetKinds: ["letter"],
  language: "english",
  seed,
});

beforeEach(() => {
  resetEventLogForTests();
});

describe("EVENT_CHANNEL_BY_TYPE", () => {
  it("covers every event type tag exactly once", () => {
    expect(Object.keys(EVENT_CHANNEL_BY_TYPE).sort()).toEqual(
      [
        // logical
        "session.started",
        "blocks.scheduled",
        "consent.decided",
        "phase.entered",
        "dialog.opened",
        "dialog.closed",
        "instruction.shown",
        "block.entered",
        "block.exited",
        "block.skipped",
        "block.restarted",
        "condition.entered",
        "condition.skipped",
        "condition.exited",
        "trial.started",
        "stimulus.presented",
        "response.affordance",
        "click.affordance",
        "response.recorded",
        "trial.outcome",
        "trial.skipped",
        "estimator.snapshot",
        "warning.emitted",
        "error.reported",
        "session.ended",
        // trace
        "routine.entered",
        "scheduler.advanced",
        // telemetry
        "telemetry.frame.span",
        "telemetry.latency",
        "telemetry.gaze.sample",
        "telemetry.clock.sample",
      ].sort(),
    );
  });

  it("classifies sample events per channel", () => {
    expect(channelOf(sessionStarted(1))).toBe("logical");
    expect(channelOf({ type: "phase.entered", phase: "loading" })).toBe(
      "logical",
    );
    expect(channelOf({ type: "routine.entered", fn: "x" })).toBe("trace");
    expect(channelOf({ type: "telemetry.latency", what: "x", ms: 1 })).toBe(
      "telemetry",
    );
  });
});

describe("event log", () => {
  it("emit assigns schema version, 1-based gapless seq, channel, atMs", () => {
    initEventLog({ experimentName: "e", seed: 1, seedSource: "sim" });
    const a = emitEvent(sessionStarted(1));
    const b = emitEvent({ type: "phase.entered", phase: "loading" });
    expect(a.v).toBe(1);
    expect(a.seq).toBe(1);
    expect(a.ch).toBe("logical");
    expect(a.atMs).toEqual(expect.any(Number));
    expect(b.seq).toBe(2);
    expect(getEventLog()?.events).toHaveLength(2);
  });

  it("seq stays gapless across channels", () => {
    initEventLog({ experimentName: "e", seed: 1, seedSource: "sim" });
    emitEvent(sessionStarted(1));
    emitEvent({ type: "telemetry.latency", what: "x", ms: 5 });
    emitEvent({ type: "routine.entered", fn: "f" });
    const seqs = getEventLog()!.events.map((env) => env.seq);
    expect(seqs).toEqual([1, 2, 3]);
  });

  it("init is idempotent: boot info survives a second init", () => {
    initEventLog({ experimentName: "e", seed: 7, seedSource: "sim" });
    initEventLog({ experimentName: "other", seed: 9, seedSource: "url" });
    expect(getEventLog()?.header.seed).toBe(7);
    expect(getEventLog()?.header.experimentName).toBe("e");
  });

  it("emit before init auto-inits an honest unseeded placeholder", () => {
    emitEvent({ type: "phase.entered", phase: "loading" });
    const log = getEventLog();
    expect(log).not.toBeNull();
    expect(log!.header.seedSource).toBe("unseeded");
    expect(log!.events).toHaveLength(1);
  });

  it("toJSONL: header first, every line parses, envelope count matches", () => {
    initEventLog({ experimentName: "letter-sim", seed: 3, seedSource: "sim" });
    emitEvent(sessionStarted(3));
    emitEvent({ type: "phase.entered", phase: "loading" });
    const lines = getEventLog()!.toJSONL().split("\n").filter(Boolean);
    expect(lines).toHaveLength(3);
    const header = JSON.parse(lines[0]);
    expect(header.type).toBe("stream.header");
    expect(header.schemaVersion).toBe(1);
    expect(header.experimentName).toBe("letter-sim");
    expect(header.seed).toBe(3);
    expect(header.emittedAtIso).toEqual(expect.any(String));
    for (const line of lines.slice(1)) {
      const env = JSON.parse(line);
      expect(env.v).toBe(1);
      expect(typeof env.seq).toBe("number");
      expect(typeof env.ch).toBe("string");
    }
    expect(JSON.parse(lines[1]).e.type).toBe("session.started");
  });

  it("exposes events on window.__eeEvents (push-only, grows with emits)", () => {
    initEventLog({ experimentName: "e", seed: 1, seedSource: "sim" });
    const before = (window as any).__eeEvents as unknown[];
    emitEvent(sessionStarted(1));
    expect((window as any).__eeEvents).toBe(before); // same array reference
    expect((window as any).__eeEvents).toHaveLength(1);
  });
});
