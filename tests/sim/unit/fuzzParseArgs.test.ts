import { describe, test, expect } from "@jest/globals";
import { parseFuzzArgs } from "../../../server/fuzz/parseArgs";

describe("fuzz parseArgs", () => {
  test("defaults: tier all, count 10, invalid-frac 0.15, minimize on", () => {
    const a = parseFuzzArgs([]);
    expect(a.tier).toBe("all");
    expect(a.count).toBe(10);
    expect(a.invalidFrac).toBe(0.15);
    expect(a.minimize).toBe(true);
    expect(a.forever).toBe(false);
    expect(a.report).toBe(false);
    expect(a.seedExplicit).toBe(false);
  });

  test("positional tier + short flags with space-separated values", () => {
    const a = parseFuzzArgs(["runtime", "-n", "2", "--seed", "99"]);
    expect(a.tier).toBe("runtime");
    expect(a.count).toBe(2);
    expect(a.seed).toBe(99);
    expect(a.seedExplicit).toBe(true);
  });

  test("equals-style flags", () => {
    const a = parseFuzzArgs([
      "compiler",
      "--count=6",
      "--seed=7",
      "--no-minimize",
      "--forever",
      "--report",
    ]);
    expect(a.tier).toBe("compiler");
    expect(a.count).toBe(6);
    expect(a.seed).toBe(7);
    expect(a.minimize).toBe(false);
    expect(a.forever).toBe(true);
    expect(a.report).toBe(true);
  });

  test("ADVERSARIAL: non-numeric -n is a usage error, not a silent zero-table batch", () => {
    expect(() => parseFuzzArgs(["-n", "junk"])).toThrow(/count|number|usage/i);
  });

  test("ADVERSARIAL: non-numeric --seed is a usage error", () => {
    expect(() => parseFuzzArgs(["--seed=abc"])).toThrow(/seed|number|usage/i);
  });

  test("ADVERSARIAL: unknown positional tier is a usage error, not silent 'all'", () => {
    expect(() => parseFuzzArgs(["bogus"])).toThrow(/tier|usage/i);
  });

  test("flag-looking value does not get eaten: -n followed by another flag is a usage error", () => {
    expect(() => parseFuzzArgs(["-n", "--forever"])).toThrow(
      /count|number|usage/i,
    );
  });
});
