/**
 * diffStreams — the event-stream diff (1f-LITE). Pure logic: given two
 * serialized event streams, strip volatile fields (atMs), walk side by side,
 * report the FIRST divergence (or length mismatch), never mutating inputs.
 * Consumed by the diff:events CLI and the determinism drill/tests.
 */
import { describe, test, expect } from "@jest/globals";
import {
  parseStream,
  serializeStream,
  diffStreams,
  type EventEnvelope,
} from "../../../server/diffEvents";

const env = (
  seq: number,
  type: string,
  e: Record<string, unknown>,
  atMs = 1234,
): EventEnvelope => ({
  v: 1,
  seq,
  ch: "logical",
  atMs,
  e: { type, ...e },
});

describe("parseStream / serializeStream", () => {
  test("roundtrips", () => {
    const stream = [env(1, "boot", {}), env(2, "block.begin", { block: 1 })];
    expect(parseStream(serializeStream(stream))).toEqual(stream);
  });

  test("tolerates trailing newline and blank lines", () => {
    const text = serializeStream([env(1, "boot", {})]) + "\n\n";
    expect(parseStream(text)).toHaveLength(1);
  });

  test("malformed line throws with its 1-based line number", () => {
    const text = `${JSON.stringify(env(1, "boot", {}))}\n{oops\n`;
    expect(() => parseStream(text)).toThrow(/line 2/);
  });
});

describe("diffStreams", () => {
  test("identical streams are equal", () => {
    const a = [
      env(1, "boot", {}),
      env(2, "trial.started", { trial: 0 }),
      env(3, "block.end", {}),
    ];
    expect(diffStreams(a, [...a]).equal).toBe(true);
  });

  test("atMs differences are volatile — stripped, not divergences", () => {
    const a = [env(1, "boot", {}, 100), env(2, "response", { k: "z" }, 200)];
    const b = [env(1, "boot", {}, 999), env(2, "response", { k: "z" }, 8888)];
    const r = diffStreams(a, b);
    expect(r.equal).toBe(true);
    expect(r.commonPrefix).toBe(2);
  });

  test("mid-stream payload difference localizes to its seq and field", () => {
    const a = [
      env(1, "boot", {}),
      env(2, "trial.started", { trial: 0 }),
      env(3, "response", { key: "q" }),
      env(4, "block.end", {}),
    ];
    const b = [
      env(1, "boot", {}),
      env(2, "trial.started", { trial: 0 }),
      env(3, "response", { key: "p" }),
      env(4, "block.end", {}),
    ];
    const r = diffStreams(a, b);
    expect(r.equal).toBe(false);
    expect(r.commonPrefix).toBe(2);
    expect(r.divergence?.seq).toBe(3);
    expect(r.divergence?.reason).toBe("field");
    expect(r.divergence?.fieldDiffs).toContainEqual(
      expect.objectContaining({ field: "e.key", a: "q", b: "p" }),
    );
  });

  test("divergence at the FIRST event is reported (no off-by-one)", () => {
    const a = [env(1, "boot", { seed: 1 })];
    const b = [env(1, "boot", { seed: 2 })];
    expect(diffStreams(a, b).divergence?.seq).toBe(1);
  });

  test("divergence at the LAST event is reported (last-element pattern)", () => {
    const a = [env(1, "boot", {}), env(2, "x", { n: 1 })];
    const b = [env(1, "boot", {}), env(2, "x", { n: 2 })];
    expect(diffStreams(a, b).divergence?.seq).toBe(2);
  });

  test("length mismatch: extra events reported as missing/extra with the right seq", () => {
    const a = [
      env(1, "boot", {}),
      env(2, "block.end", {}),
      env(3, "summary", {}),
    ];
    const b = [env(1, "boot", {}), env(2, "block.end", {})];
    const r = diffStreams(a, b);
    expect(r.equal).toBe(false);
    expect(r.commonPrefix).toBe(2);
    expect(r.divergence?.reason).toBe("b-missing");
    expect(r.divergence?.seq).toBe(3);
  });

  test("empty vs empty is equal; empty vs one is a divergence", () => {
    expect(diffStreams([], []).equal).toBe(true);
    expect(diffStreams([env(1, "boot", {})], []).divergence?.reason).toBe(
      "b-missing",
    );
  });

  test("same envelopes in different order are divergent (seq is structural)", () => {
    const a = [env(1, "boot", {}), env(2, "trial.started", { t: 0 })];
    const b = [env(2, "trial.started", { t: 0 }), env(1, "boot", {})];
    expect(diffStreams(a, b).equal).toBe(false);
  });

  test("inputs are not mutated by volatility stripping", () => {
    const a = [env(1, "boot", {}, 42)];
    const b = [env(1, "boot", {}, 77)];
    diffStreams(a, b);
    expect(a[0].atMs).toBe(42);
    expect(b[0].atMs).toBe(77);
  });

  test("fieldDiffs reach one level into the payload (e.*)", () => {
    const a = [env(1, "response", { response: { key: "a", correct: true } })];
    const b = [env(1, "response", { response: { key: "a", correct: false } })];
    const diffs = diffStreams(a, b).divergence?.fieldDiffs ?? [];
    expect(diffs).toContainEqual(
      expect.objectContaining({
        field: "e.response.correct",
        a: true,
        b: false,
      }),
    );
  });
});
