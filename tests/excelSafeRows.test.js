import { expect, describe, test } from "@jest/globals";
import {
  excelSafeCellValue,
  excelSafeRows,
} from "../psychojs/src/data/excelSafe.js";

// excelSafeRows is the save-time chokepoint: every results row passes
// through it on the way to json_to_sheet. It must (a) format cells, (b)
// never mutate the input rows, and (c) NEVER throw — a throwing transform
// at save time could lose the whole session's data.
describe("excelSafeRows", () => {
  test("formats every cell of every row", () => {
    const out = excelSafeRows([
      { a: [1, 2], b: "x,y", c: 3 },
      { a: 4, b: "plain" },
    ]);
    expect(out).toEqual([
      { a: "[1, 2]", b: "x, y", c: 3 },
      { a: 4, b: "plain" },
    ]);
  });

  test("does not mutate the input rows", () => {
    const rows = [{ a: [1, 2], b: "x,y" }];
    const snapshot = JSON.stringify(rows);
    excelSafeRows(rows);
    expect(JSON.stringify(rows)).toBe(snapshot);
    expect(rows[0].b).toBe("x,y");
  });

  test("is idempotent", () => {
    const rows = [{ a: "1,2", b: [3, 4] }];
    expect(excelSafeRows(excelSafeRows(rows))).toEqual(excelSafeRows(rows));
  });

  test("empty rows array yields empty array", () => {
    expect(excelSafeRows([])).toEqual([]);
  });

  // ---- Totality: no input may make it throw.
  test("row with a throwing getter passes through unchanged", () => {
    const row = { ok: "a,b" };
    Object.defineProperty(row, "boom", {
      enumerable: true,
      get() {
        throw new Error("boom");
      },
    });
    expect(() => excelSafeRows([row])).not.toThrow();
    expect(excelSafeRows([row])).toEqual([row]);
  });

  test("null/undefined rows pass through unchanged", () => {
    expect(excelSafeRows([null, undefined, { a: 1 }])).toEqual([
      null,
      undefined,
      { a: 1 },
    ]);
  });

  test("frozen rows are handled without mutation", () => {
    const row = Object.freeze({ a: "1,2" });
    expect(() => excelSafeRows([row])).not.toThrow();
    expect(excelSafeRows([row])).toEqual([{ a: "1, 2" }]);
    expect(row).toEqual({ a: "1,2" });
  });

  test("non-array argument passes through unchanged (upstream behavior)", () => {
    const notRows = { a: [1, 2] };
    expect(excelSafeRows(notRows)).toBe(notRows);
  });
});
