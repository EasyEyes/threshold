import { describe, test, expect } from "@jest/globals";
import { ddmin } from "../../../server/fuzz/minimizer";

const row = (name: string) => [name, ""];
const names = (rows: string[][]) => rows.map((r) => r[0]).sort();

describe("fuzz minimizer (ddmin)", () => {
  test("shrinks to a minimal failing subset", async () => {
    // "Fails" iff at least two of a/b/c are present.
    const pred = async (rows: string[][]) => {
      const n = rows.filter((r) => ["a", "b", "c"].includes(r[0])).length;
      return n >= 2;
    };
    const rows = [
      row("a"),
      row("b"),
      row("c"),
      row("d"),
      row("e"),
      row("block"),
    ];
    const { rows: min } = await ddmin(rows, pred);
    const removableKept = min.filter((r) => r[0] !== "block").length;
    expect(removableKept).toBe(2);
    const kept = min
      .map((r) => r[0])
      .filter((n) => ["a", "b", "c"].includes(n));
    expect(kept.length).toBe(2);
  });

  test("protected rows (block) are never removed", async () => {
    const pred = async () => true; // always fails → shrink everything else
    const rows = [row("block"), row("_about"), row("x"), row("y")];
    const { rows: min } = await ddmin(rows, pred);
    expect(min.some((r) => r[0] === "block")).toBe(true);
  });

  test("never-failing predicate returns the input unchanged", async () => {
    const pred = async () => false;
    const rows = [row("a"), row("b")];
    const { rows: min, calls } = await ddmin(rows, pred);
    expect(min.length).toBe(2);
    expect(calls).toBeLessThanOrEqual(4);
  });

  test("respects the predicate-call cap", async () => {
    let calls = 0;
    const pred = async () => {
      calls++;
      return true;
    };
    const rows = Array.from({ length: 20 }, (_, i) => row(`r${i}`));
    rows[0][0] = "block";
    const { calls: used } = await ddmin(rows, pred, { maxCalls: 5 });
    expect(used).toBeLessThanOrEqual(5);
  });

  test("always-failing single-row-pair protection keeps at least one removable-protected set", async () => {
    // Fails iff the block row is present (it always is) — ddmin should strip
    // everything else down to the protected row alone.
    const pred = async (rows: string[][]) => rows.some((r) => r[0] === "block");
    const rows = [row("block"), row("a"), row("b"), row("c")];
    const { rows: min } = await ddmin(rows, pred);
    expect(min.length).toBe(1);
    expect(min[0][0]).toBe("block");
  });
});
