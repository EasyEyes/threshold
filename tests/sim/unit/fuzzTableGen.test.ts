import { describe, test, expect } from "@jest/globals";
import { parseCsv, toCsv, generateTable } from "../../../server/fuzz/tableGen";
import type { GlossarySpec } from "../../../server/fuzz/glossaryAdapter";

/* eslint-disable @typescript-eslint/no-explicit-any */
const spec: GlossarySpec = {
  version: "1.0",
  params: [
    {
      name: "_globalFlag",
      scope: "global",
      type: "boolean",
      obsolete: false,
      default: "TRUE",
      categories: [],
      example: "",
    },
    {
      name: "_globalNum",
      scope: "global",
      type: "numerical",
      obsolete: false,
      default: "40",
      categories: [],
      example: "",
    },
    {
      name: "_underCovered",
      scope: "global",
      type: "boolean",
      obsolete: false,
      default: "FALSE",
      categories: [],
      example: "",
    },
    {
      name: "_saturated",
      scope: "global",
      type: "boolean",
      obsolete: false,
      default: "FALSE",
      categories: [],
      example: "",
    },
    {
      name: "conditionTrials",
      scope: "condition",
      type: "integer",
      obsolete: false,
      default: "3",
      categories: [],
      example: "",
    },
    {
      name: "spacingDirection",
      scope: "condition",
      type: "categorical",
      obsolete: false,
      default: "radial",
      categories: ["radial", "tangential"],
      example: "",
    },
    {
      name: "aboutText",
      scope: "condition",
      type: "text",
      obsolete: false,
      default: "hi",
      categories: [],
      example: "",
    },
  ],
  obsolete: [],
};

const corpusCsv = [
  '_about,"fuzz corpus"',
  "block,,one",
  "_globalFlag,,TRUE",
  "conditionTrials,,3",
  "spacingDirection,,radial",
].join("\n");

const corpus = [{ name: "tiny.csv", csv: corpusCsv }];

describe("fuzz tableGen", () => {
  test("parseCsv/toCsv roundtrips cells with commas and quotes", () => {
    const rows = parseCsv('a,"b,c","say ""hi"""\nblock,,1');
    expect(rows[0]).toEqual(["a", "b,c", 'say "hi"']);
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  test("generateTable is deterministic for a given seed", () => {
    const a = generateTable({
      genSeed: 42,
      spec,
      corpus,
      invalidFrac: 0,
      counts: new Map(),
    });
    const b = generateTable({
      genSeed: 42,
      spec,
      corpus,
      invalidFrac: 0,
      counts: new Map(),
    });
    expect(a.csv).toBe(b.csv);
    expect(a.params).toEqual(b.params);
  });

  test("different seeds eventually produce different tables", () => {
    const csvs = new Set(
      Array.from(
        { length: 30 },
        (_, i) =>
          generateTable({
            genSeed: 1000 + i,
            spec,
            corpus,
            invalidFrac: 0,
            counts: new Map(),
          }).csv,
      ),
    );
    expect(csvs.size).toBeGreaterThan(1);
  });

  test("structure survives mutation: block row and underscore globals kept", () => {
    for (let i = 0; i < 25; i++) {
      const g = generateTable({
        genSeed: 2000 + i,
        spec,
        corpus,
        invalidFrac: 0,
        counts: new Map(),
      });
      const rows = parseCsv(g.csv);
      expect(rows.some((r) => r[0] === "block")).toBe(true);
      expect(rows.some((r) => r[0] === "_about")).toBe(true);
    }
  });

  test("invalid planting tags the sidecar and plants a bogus artifact", () => {
    for (let i = 0; i < 10; i++) {
      const g = generateTable({
        genSeed: 3000 + i,
        spec,
        corpus,
        invalidFrac: 1,
        counts: new Map(),
      });
      expect(g.invalid).toBeDefined();
      expect(g.invalid?.kind.length).toBeGreaterThan(0);
      // The planted artifact must be visible in the csv itself.
      expect(g.csv).toMatch(/fuzz|bogus|zzz/i);
    }
  });

  test("valid generation plants nothing bogus", () => {
    for (let i = 0; i < 25; i++) {
      const g = generateTable({
        genSeed: 4000 + i,
        spec,
        corpus,
        invalidFrac: 0,
        counts: new Map(),
      });
      expect(g.invalid).toBeUndefined();
      expect(g.csv).not.toMatch(/fuzzBogus|zzz-not/i);
    }
  });

  test("params reported are glossary params present in the csv", () => {
    const g = generateTable({
      genSeed: 7,
      spec,
      corpus,
      invalidFrac: 0,
      counts: new Map(),
    });
    for (const p of g.params) {
      expect(spec.params.some((s) => s.name === p)).toBe(true);
      expect(g.csv).toContain(p);
    }
    expect(g.params.length).toBeGreaterThan(0);
  });

  test("coverage bias: zero-count globals appear more often than saturated ones", () => {
    const counts = new Map<string, number>([
      ["_underCovered", 0],
      ["_saturated", 10000],
    ]);
    let under = 0;
    let saturated = 0;
    for (let i = 0; i < 100; i++) {
      const g = generateTable({
        genSeed: 5000 + i,
        spec,
        corpus,
        invalidFrac: 0,
        counts,
      });
      if (g.csv.includes("_underCovered")) under++;
      if (g.csv.includes("_saturated")) saturated++;
    }
    expect(under).toBeGreaterThan(saturated);
  });

  test("ADVERSARIAL: same seed + same corpus (any order) → same table (seed is the identity)", () => {
    const corpusA = [
      { name: "aaa.csv", csv: corpusCsv },
      { name: "zzz.csv", csv: corpusCsv.replace("radial", "tangential") },
    ];
    const corpusB = [...corpusA].reverse();
    const a = generateTable({
      genSeed: 4242,
      spec,
      corpus: corpusA,
      invalidFrac: 0,
      counts: new Map(),
    });
    const b = generateTable({
      genSeed: 4242,
      spec,
      corpus: corpusB,
      invalidFrac: 0,
      counts: new Map(),
    });
    expect(b.csv).toBe(a.csv);
  });

  test("ADVERSARIAL: empty corpus throws a descriptive error (CLI must exit 2, not TypeError)", () => {
    expect(() =>
      generateTable({
        genSeed: 1,
        spec,
        corpus: [],
        invalidFrac: 0,
        counts: new Map(),
      }),
    ).toThrow(/corpus/i);
  });
});
