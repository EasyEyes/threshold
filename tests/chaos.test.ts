/**
 * @jest-environment node
 *
 * Unit tests for components/chaos.js — the deterministic chaos-injection
 * e2e machinery extracted from threshold.js (strHash, seed resolution,
 * state creation, and the fire-at-Nth-distinct-routine decision).
 *
 * These are characterization tests pinning the CURRENT behavior the sim
 * e2e suite (chaosRobustness.e2e.test.ts) depends on:
 *  - strHash is a 32-bit rolling h*31+c hash (>>> 0 wrap).
 *  - the seed comes from __SIM_OPTIONS__.chaos FIRST, then ?chaos=, else null.
 *  - targetDistinct = (strHash(seed) % 22) + 2, i.e. 2..23 distinct routines.
 *  - the error fires on the Nth DISTINCT routine name and never again.
 */
import {
  strHash,
  chaosSeedFromLocation,
  createChaosState,
  chaosFireIfDue,
} from "../components/chaos.js";

describe("strHash", () => {
  test("empty string hashes to 0", () => {
    expect(strHash("")).toBe(0);
  });
  test("single char is its char code", () => {
    expect(strHash("a")).toBe(97);
  });
  test("rolling h*31+c", () => {
    expect(strHash("ab")).toBe(97 * 31 + 98);
  });
  test("wraps at 32 bits (never negative)", () => {
    // A long string overflows 2^31; >>>0 must keep the result unsigned.
    const h = strHash("chaos-overflow-probe-0123456789".repeat(8));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe("chaosSeedFromLocation", () => {
  test("no sim options, no query → null", () => {
    expect(chaosSeedFromLocation({}, "")).toBeNull();
  });
  test("?chaos=7 → '7' (string from the query)", () => {
    expect(chaosSeedFromLocation({}, "?chaos=7")).toBe("7");
  });
  test("__SIM_OPTIONS__.chaos wins over the query", () => {
    expect(chaosSeedFromLocation({ chaos: "sim" }, "?chaos=query")).toBe("sim");
  });
  test("falsy sim chaos (0) falls through to the query param", () => {
    expect(chaosSeedFromLocation({ chaos: 0 }, "?chaos=7")).toBe("7");
  });
  test("missing __SIM_OPTIONS__ object falls through to the query param", () => {
    expect(chaosSeedFromLocation(undefined, "?chaos=9")).toBe("9");
  });
});

describe("createChaosState", () => {
  test("no seed → null (inert)", () => {
    expect(createChaosState(null)).toBeNull();
    expect(createChaosState(undefined)).toBeNull();
  });
  test("targetDistinct is always within 2..23", () => {
    for (let i = 0; i < 500; i++) {
      const t = createChaosState(String(i)).targetDistinct;
      expect(t).toBeGreaterThanOrEqual(2);
      expect(t).toBeLessThanOrEqual(23);
    }
  });
  test("fresh state: empty seen, not fired", () => {
    const s = createChaosState("x");
    expect(s.seen.size).toBe(0);
    expect(s.fired).toBe(false);
  });
  test("seed is stringified (numeric seeds allowed)", () => {
    expect(createChaosState(123).targetDistinct).toBe(
      createChaosState("123").targetDistinct,
    );
  });
});

describe("chaosFireIfDue", () => {
  test("null state is a no-op", () => {
    expect(() => chaosFireIfDue(null, "anyRoutine")).not.toThrow();
  });

  // A state whose targetDistinct is exactly n (the only fields the fire
  // check consumes).
  const stateFiringAt = (n: number) => ({
    targetDistinct: n,
    seen: new Set<string>(),
    fired: false,
  });

  test("fires exactly on the Nth distinct routine", () => {
    const s = stateFiringAt(3);
    expect(() => chaosFireIfDue(s, "a")).not.toThrow();
    expect(() => chaosFireIfDue(s, "b")).not.toThrow();
    expect(() => chaosFireIfDue(s, "a")).not.toThrow(); // repeat: not distinct
    expect(() => chaosFireIfDue(s, "c")).toThrow(/CHAOS injected at c/);
    expect(s.fired).toBe(true);
    expect(s.seen.size).toBe(3);
  });

  test("never fires again after the first throw", () => {
    const s = stateFiringAt(2);
    expect(() => chaosFireIfDue(s, "one")).not.toThrow();
    expect(() => chaosFireIfDue(s, "two")).toThrow();
    expect(() => chaosFireIfDue(s, "three")).not.toThrow();
    expect(() => chaosFireIfDue(s, "four")).not.toThrow();
  });

  test("error message names the routine", () => {
    const s = stateFiringAt(2);
    chaosFireIfDue(s, "first");
    expect(() => chaosFireIfDue(s, "trialRoutineBegin")).toThrow(
      "CHAOS injected at trialRoutineBegin",
    );
  });
});
