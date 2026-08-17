import { expect, describe, test } from "@jest/globals";
import { excelSafeCellValue } from "../psychojs/src/data/excelSafe.js";

describe("excelSafeCellValue", () => {
  test("array of numbers is stored with ', ' separator", () => {
    expect(excelSafeCellValue([1000, 625])).toBe("[1000, 625]");
  });

  test("array JSON remains parseable after spacing", () => {
    expect(JSON.parse(excelSafeCellValue([1000, 625]))).toEqual([1000, 625]);
  });

  test("nested arrays stay valid JSON", () => {
    const v = excelSafeCellValue([
      [1, 2],
      [3, 4],
    ]);
    expect(JSON.parse(v)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  test("string with bare commas gets a space after each comma", () => {
    expect(excelSafeCellValue("cat,dog,bird")).toBe("cat, dog, bird");
  });

  test("string already using ', ' is unchanged (idempotent)", () => {
    expect(excelSafeCellValue("1000, 625")).toBe("1000, 625");
  });

  test("applying twice is idempotent", () => {
    expect(excelSafeCellValue(excelSafeCellValue("x,y"))).toBe("x, y");
  });

  test("comma at end of string is left alone", () => {
    expect(excelSafeCellValue("hello,")).toBe("hello,");
  });

  test("comma before other whitespace is left alone", () => {
    expect(excelSafeCellValue("a,\tb")).toBe("a,\tb");
  });

  test("numbers, booleans, null pass through unchanged", () => {
    expect(excelSafeCellValue(42)).toBe(42);
    expect(excelSafeCellValue(true)).toBe(true);
    expect(excelSafeCellValue(null)).toBe(null);
    expect(excelSafeCellValue(undefined)).toBe(undefined);
  });

  test("string without commas is unchanged", () => {
    expect(excelSafeCellValue("no commas here")).toBe("no commas here");
  });

  // ---- Totality: whatever the value, excelSafeCellValue must never throw.
  // It runs at save time; a throwing cell transform could block the save of
  // an entire session's data. On any failure the original value is returned
  // unchanged (caller-side behavior is then exactly upstream).
  test("array containing a BigInt does not throw, returns input unchanged", () => {
    const v = [1, 2n];
    expect(() => excelSafeCellValue(v)).not.toThrow();
    expect(excelSafeCellValue(v)).toBe(v);
  });

  test("circular array does not throw, returns input unchanged", () => {
    const v = [1, 2];
    v.push(v);
    expect(() => excelSafeCellValue(v)).not.toThrow();
    expect(excelSafeCellValue(v)).toBe(v);
  });

  test("nested circular arrays do not throw", () => {
    const inner = [3, 4];
    const v = [1, inner];
    inner.push(v);
    expect(() => excelSafeCellValue(v)).not.toThrow();
  });

  test("non-array objects pass through unchanged (same reference)", () => {
    const obj = { a: 1, b: "x,y" };
    const d = new Date(0);
    const fn = () => {};
    expect(excelSafeCellValue(obj)).toBe(obj);
    expect(excelSafeCellValue(d)).toBe(d);
    expect(excelSafeCellValue(fn)).toBe(fn);
  });

  test("symbol values pass through unchanged", () => {
    const s = Symbol("comma,symbol");
    expect(excelSafeCellValue(s)).toBe(s);
  });

  test("string with lone surrogates and commas is handled", () => {
    expect(() => excelSafeCellValue("\ud800,\udfff,x")).not.toThrow();
  });

  test("empty array becomes empty JSON array", () => {
    expect(excelSafeCellValue([])).toBe("[]");
  });

  test("array of strings with commas stays parseable JSON (elements get spaced, like any string cell)", () => {
    const out = excelSafeCellValue(["a,b", "c"]);
    expect(JSON.parse(out)).toEqual(["a, b", "c"]);
  });
});
