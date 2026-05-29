/**
 * Tests that toNumerical throws on NaN in arrays and rejects null/undefined.
 * NaN by itself passes through (typeof NaN === "number").
 */

import { toNumerical } from "../psychojs/src/util/Util.js";

describe("toNumerical — NaN in array", () => {
  it("throws when array contains NaN", () => {
    expect(() => toNumerical([NaN, 2])).toThrow();
    expect(() => toNumerical([3, NaN])).toThrow();
    expect(() => toNumerical([NaN, NaN])).toThrow();
  });

  it("error includes origin and context", () => {
    let caught: any;
    try {
      toNumerical([1, NaN, 3]);
    } catch (e: any) {
      caught = e;
    }
    expect(caught).toBeDefined();
    expect(caught.origin).toBe("util.toNumerical");
    expect(caught.context).toBe(
      "when converting an object to its numerical form",
    );
    expect(typeof caught.error).toBe("string");
  });

  it("NaN directly returns NaN (typeof NaN === 'number')", () => {
    expect(toNumerical(NaN)).toBeNaN();
  });

  it("string 'NaN' throws", () => {
    expect(() => toNumerical("NaN")).toThrow();
  });
});

describe("toNumerical — defensive validation", () => {
  it("rejects null", () => {
    try {
      toNumerical(null as any);
    } catch (e: any) {
      expect(e.origin).toBe("util.toNumerical");
      expect(e.error).toBe("unable to convert null to a number");
      return;
    }
    throw new Error("expected to throw");
  });

  it("rejects undefined", () => {
    try {
      toNumerical(undefined as any);
    } catch (e: any) {
      expect(e.origin).toBe("util.toNumerical");
      expect(e.error).toBe("unable to convert undefined to a number");
      return;
    }
    throw new Error("expected to throw");
  });

  it("accepts valid number array unchanged", () => {
    expect(toNumerical([1, 2.5, -3])).toEqual([1, 2.5, -3]);
  });

  it("accepts array of numeric strings", () => {
    expect(toNumerical(["1", "2.5", "-3"])).toEqual([1, 2.5, -3]);
  });
});
