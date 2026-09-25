/**
 * Adversarial contracts for the fuzzer CLI — written RED against the original
 * code, now pinned GREEN:
 *  - non-integer count/seed and out-of-range invalid-frac are usage errors,
 *  - minimizing an oracle-miss finding never strips the planted invalidity
 *    (the minimized repro table must still exhibit it).
 *
 * @jest-environment node
 */
import { describe, test, expect } from "@jest/globals";
import { parseFuzzArgs } from "../../../server/fuzz/parseArgs";
import { ddmin } from "../../../server/fuzz/minimizer";
import { stillContainsInvalid } from "../../../server/fuzz/tier1";

describe("fuzz parseArgs adversarial", () => {
  test("non-integer count is a usage error, not a silent ceil", () => {
    // `-n 2.5` would otherwise run 3 tables (i < 2.5) — a count nobody asked for.
    expect(() => parseFuzzArgs(["-n", "2.5"])).toThrow(/count|integer|usage/i);
    expect(() => parseFuzzArgs(["--seed", "1.5"])).toThrow(
      /seed|integer|usage/i,
    );
  });

  test("invalid-frac outside [0,1] is a usage error", () => {
    // 1.5 would silently mean "plant an invalidity in every table".
    expect(() => parseFuzzArgs(["--invalid-frac", "1.5"])).toThrow(
      /invalid-frac|fraction|usage/i,
    );
    expect(() => parseFuzzArgs(["--invalid-frac=-0.2"])).toThrow(
      /invalid-frac|fraction|usage/i,
    );
  });
});

describe("fuzz compiler-tier minimization", () => {
  test("minimizing an oracle-miss finding never strips the planted invalidity", async () => {
    // ddmin removes whole rows; once the bogus-param row is dropped the table
    // is LEGITIMATELY accepted, so the predicate must also require that the
    // planted invalidity survives.
    const invalid = {
      kind: "bogus-param" as const,
      param: "_fuzzBogusParam123",
    };
    const rows = [
      ["_fuzzBogusParam123", "x", ""],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ];
    // The compiler under test: accepts everything (the oracle miss).
    const compile = async (_candidate: string[][]) => ({ outcome: "accepted" });
    // Same predicate composition as fuzzTables.ts:
    const predicate = async (candidate: string[][]) =>
      stillContainsInvalid(invalid, candidate) &&
      (await compile(candidate)).outcome === "accepted";

    const { rows: shrunk } = await ddmin(rows, predicate, { maxCalls: 24 });

    // The minimized finding still exhibits the planted invalidity...
    expect(shrunk.some((r) => r[0] === "_fuzzBogusParam123")).toBe(true);
    // ...and everything removable was removed.
    expect(shrunk.map((r) => r[0]).sort()).toEqual([
      "_fuzzBogusParam123",
      "block",
    ]);
  });

  test("bogus-value findings: row presence implies the bogus value survives", () => {
    // ddmin never edits cells, so keeping the param row keeps the bad value.
    const invalid = { kind: "bogus-value" as const, param: "conditionTrials" };
    expect(
      stillContainsInvalid(invalid, [["conditionTrials", "", "lots"]]),
    ).toBe(true);
    expect(stillContainsInvalid(invalid, [["block", "", "1"]])).toBe(false);
  });
});
