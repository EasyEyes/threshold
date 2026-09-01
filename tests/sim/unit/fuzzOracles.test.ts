import { describe, test, expect } from "@jest/globals";
import {
  checkInvariants,
  signatureOf,
  firstFatalError,
  arbitrationOutcome,
} from "../../../server/fuzz/oracles";
import type { EventEnvelope } from "../../../server/diffEvents";

/* eslint-disable @typescript-eslint/no-explicit-any */
const env = (seq: number, e: any, ch = "logical"): EventEnvelope =>
  ({ v: 1, seq, ch, atMs: 1, e }) as any;

describe("fuzz oracles", () => {
  test("gapless 1..N stream with well-formed envelopes passes", () => {
    const events = [
      env(1, { type: "run.started" }),
      env(2, { type: "block.began" }),
      env(3, { type: "trial.response", correct: true }),
    ];
    expect(checkInvariants(events)).toEqual({ ok: true, violations: [] });
  });

  test("a gap in seq is reported", () => {
    const events = [env(1, { type: "a" }), env(3, { type: "b" })];
    const r = checkInvariants(events);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.includes("seq"))).toBe(true);
  });

  test("missing e.type is reported", () => {
    const events = [env(1, { foo: 1 }) as any];
    const r = checkInvariants(events);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => /type/i.test(v))).toBe(true);
  });

  test("non-finite numeric leaves are violations; string leaves are not", () => {
    const bad = [
      env(1, { type: "a", level: NaN }),
      env(2, { type: "b", nested: { x: Infinity } }),
    ];
    const r = checkInvariants(bad);
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBe(2);
    // A string mentioning NaN must not trigger anything.
    const ok = [env(1, { type: "a", message: "NaN appeared 3 times" })];
    expect(checkInvariants(ok)).toEqual({ ok: true, violations: [] });
  });

  test("signatureOf normalizes digits and case, keeps names distinct", () => {
    const a = signatureOf(
      "runtime-fatal",
      "Invalid parameter name _thingTweak at line 3",
    );
    const b = signatureOf(
      "runtime-fatal",
      "invalid PARAMETER name _thingTweak at line 71",
    );
    const c = signatureOf(
      "runtime-fatal",
      "Invalid parameter name _otherTweak at line 3",
    );
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    // Different kinds never collide.
    expect(signatureOf("invariant", "x")).not.toBe(
      signatureOf("runtime-fatal", "x"),
    );
  });

  test("firstFatalError returns the first error.reported message, else null", () => {
    const events = [
      env(1, { type: "run.started" }),
      env(2, { type: "error.reported", message: "Unhandled rejection: boom" }),
      env(3, { type: "error.reported", message: "second" }),
    ];
    expect(firstFatalError(events)).toBe("Unhandled rejection: boom");
    expect(firstFatalError([env(1, { type: "run.started" })])).toBe(null);
  });

  test("ADVERSARIAL: arbitration-run timeout is a timeout, not nondeterminism", () => {
    const r1 = [env(1, { type: "trial.response", correct: true })];
    const r2 = [env(1, { type: "trial.response", correct: false })];
    expect(
      arbitrationOutcome(r1, r2, {
        threw: new Error("Timeout 60000ms"),
        events: null,
      }),
    ).toBe("timeout");
  });

  test("arbitration: matching third run is a flake; still-diverging is nondeterminism", () => {
    const r1 = [env(1, { type: "a" })];
    const r2 = [env(1, { type: "b" })];
    expect(arbitrationOutcome(r1, r2, { threw: null, events: r1 })).toBe(
      "flake",
    );
    expect(arbitrationOutcome(r1, r2, { threw: null, events: r2 })).toBe(
      "flake",
    );
    expect(
      arbitrationOutcome(r1, r2, {
        threw: null,
        events: [env(1, { type: "c" })],
      }),
    ).toBe("nondeterminism");
  });
});
