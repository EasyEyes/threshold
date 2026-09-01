import { describe, test, expect } from "@jest/globals";
import {
  toSpec,
  valuePool,
  bogusValues,
} from "../../../server/fuzz/glossaryAdapter";

/* eslint-disable @typescript-eslint/no-explicit-any */
const payload = (entries: Record<string, any>, version = "9.9") => ({
  version,
  glossary: entries,
  glossaryFull: [],
  superMatchingParams: [],
});

describe("fuzz glossaryAdapter", () => {
  test("derives scope from underscore prefix and splits obsolete params", () => {
    const spec = toSpec(
      payload({
        _globalThing: {
          name: "_globalThing",
          type: "boolean",
          default: "TRUE",
          categories: [],
          example: "",
        },
        conditionThing: {
          name: "conditionThing",
          type: "boolean",
          default: "FALSE",
          categories: [],
          example: "",
        },
        _oldThing: {
          name: "_oldThing",
          type: "obsolete",
          default: "",
          categories: [],
          example: "",
        },
      }),
    );
    expect(spec.version).toBe("9.9");
    const global = spec.params.find((p) => p.name === "_globalThing");
    expect(global?.scope).toBe("global");
    const cond = spec.params.find((p) => p.name === "conditionThing");
    expect(cond?.scope).toBe("condition");
    expect(spec.params.map((p) => p.name)).not.toContain("_oldThing");
    expect(spec.obsolete.map((p) => p.name)).toContain("_oldThing");
  });

  test("boolean pool is exactly TRUE/FALSE", () => {
    const spec = toSpec(
      payload({
        _b: {
          name: "_b",
          type: "boolean",
          default: "TRUE",
          categories: [],
          example: "",
        },
      }),
    );
    expect(valuePool(spec.params[0])).toEqual(["TRUE", "FALSE"]);
  });

  test("categorical pool uses categories plus default", () => {
    const spec = toSpec(
      payload({
        _c: {
          name: "_c",
          type: "categorical",
          default: "radial",
          categories: ["radial", "tangential"],
          example: "",
        },
      }),
    );
    const pool = valuePool(spec.params[0]);
    expect(pool).toContain("radial");
    expect(pool).toContain("tangential");
    expect(pool.every((v) => v.trim() !== "")).toBe(true);
  });

  test("categorical without categories falls back to default/example", () => {
    const spec = toSpec(
      payload({
        _c: {
          name: "_c",
          type: "categorical",
          default: "x",
          categories: [],
          example: "y",
        },
      }),
    );
    const pool = valuePool(spec.params[0]);
    expect(pool).toContain("x");
    expect(pool).toContain("y");
    expect(pool.length).toBeGreaterThanOrEqual(2);
  });

  test("integer pool contains only integers", () => {
    const spec = toSpec(
      payload({
        _i: {
          name: "_i",
          type: "integer",
          default: "3",
          categories: [],
          example: "",
        },
      }),
    );
    const pool = valuePool(spec.params[0]);
    expect(pool.length).toBeGreaterThan(1);
    for (const v of pool) expect(Number.isInteger(Number(v))).toBe(true);
  });

  test("numerical pool values all parse as finite numbers", () => {
    const spec = toSpec(
      payload({
        _n: {
          name: "_n",
          type: "numerical",
          default: "2.5",
          categories: [],
          example: "",
        },
      }),
    );
    const pool = valuePool(spec.params[0]);
    expect(pool.length).toBeGreaterThan(2);
    for (const v of pool) expect(Number.isFinite(Number(v))).toBe(true);
  });

  test("text pool is non-empty strings and includes a comma (CSV quoting stress)", () => {
    const spec = toSpec(
      payload({
        _t: {
          name: "_t",
          type: "text",
          default: "hello",
          categories: [],
          example: "",
        },
      }),
    );
    const pool = valuePool(spec.params[0]);
    expect(pool.length).toBeGreaterThan(1);
    expect(pool.some((v) => v.includes(","))).toBe(true);
    expect(pool.every((v) => v !== "")).toBe(true);
  });

  test("unknown type degrades to text pool", () => {
    const spec = toSpec(
      payload({
        _u: {
          name: "_u",
          type: "hypergrid",
          default: "zz",
          categories: [],
          example: "",
        },
      }),
    );
    const pool = valuePool(spec.params[0]);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((v) => typeof v === "string" && v !== "")).toBe(true);
  });

  test("bogus values exist per class; text has none", () => {
    const spec = toSpec(
      payload({
        _b: {
          name: "_b",
          type: "boolean",
          default: "TRUE",
          categories: [],
          example: "",
        },
        _c: {
          name: "_c",
          type: "categorical",
          default: "radial",
          categories: ["radial"],
          example: "",
        },
        _t: {
          name: "_t",
          type: "text",
          default: "hi",
          categories: [],
          example: "",
        },
      }),
    );
    const byName = (n: string) => spec.params.find((p) => p.name === n)!;
    expect(bogusValues(byName("_b")).length).toBeGreaterThan(0);
    expect(bogusValues(byName("_c")).length).toBeGreaterThan(0);
    expect(bogusValues(byName("_t"))).toEqual([]);
  });

  test("schema check throws a descriptive error on entries missing type", () => {
    expect(() =>
      toSpec(payload({ _bad: { name: "_bad", default: "x" } })),
    ).toThrow(/glossary.*_bad|_bad.*glossary/i);
  });

  test("schema check throws when glossary map is absent", () => {
    expect(() => toSpec({ version: "1" } as any)).toThrow(/glossary/i);
  });
});
