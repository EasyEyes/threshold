/**
 * RED: markFlies transparent-naming migration.
 *
 * Card "MORE TRANSPARENT NAMING OF markFlies": the legacy 10-value
 * markFlies string is replaced by self-documenting scalar parameters —
 * markFliesBool, markFliesNumber, markFliesRadiusDeg, markFliesDegPerSec
 * (glossary name today: markFliesSpeedDegPerSec), markFliesTrackFixationBool,
 * markFliesThicknessDeg, markFliesLengthDeg, markFliesColorRGBA — with
 * markFliesGravity already implemented. This is NOT a functional change:
 * legacy markFlies tables must behave exactly as before until the old
 * parameter is removed.
 *
 * Resolution rule per aspect: explicitly-set new parameter wins, then the
 * legacy markFlies field (when that string is in the condition), then the
 * new parameter's glossary default. markFliesBool FALSE (explicit) is
 * equivalent to markFliesNumber zero — the master off switch; ABSENT, it
 * neither enables nor disables (a legacy n>0 or explicit Number still
 * produces flies).
 *
 * Names not yet in the deployed glossary (markFliesBool, markFliesDegPerSec
 * at the time of writing) must be read tolerantly: absent from the glossary
 * means "contributes nothing", never a throw.
 */

import type { ParamReader } from "../parameters/paramReader";
import { ParamReader as RealParamReader } from "../parameters/paramReader";
import { initGlossary, getGlossary } from "../parameters/glossaryRegistry";
import type { GlossaryData } from "../../source/components/types";
import { loadGlossaryForTests } from "./helpers/glossary";
import { parseVectorType, parseVectorValue } from "../components/vectorParsing";
import { parseMarkFlies, resolveFliesSpec } from "../components/fliesParams";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BC = "1_1";

/**
 * Glossary 36.0 (live): markFliesBool added, speed is markFliesDegPerSec
 * (markFliesSpeedDegPerSec REMOVED), color is 4*numerical, gravity -0.5.
 */
const G36_DEFAULTS: Record<string, { type: string; default: string }> = {
  markFlies: { type: "text", default: "0, 1, 0.3, FALSE, 0.05, 2, 0, 0, 1, 1" },
  markFliesBool: { type: "boolean", default: "FALSE" },
  markFliesGravity: { type: "numerical", default: "-0.5" },
  markFliesNumber: { type: "numerical", default: "0" },
  markFliesRadiusDeg: { type: "numerical", default: "1.5" },
  markFliesDegPerSec: { type: "numerical", default: "0.2" },
  markFliesTrackFixationBool: { type: "boolean", default: "FALSE" },
  markFliesThicknessDeg: { type: "numerical", default: "0.05" },
  markFliesLengthDeg: { type: "numerical", default: "2" },
  markFliesColorRGBA: { type: "4*numerical", default: "0, 0, 1, 1" },
};

/** Glossary-35.6 era: speed named markFliesSpeedDegPerSec; no Bool/DegPerSec. */
const G35_DEFAULTS: Record<string, { type: string; default: string }> = {
  markFlies: { type: "text", default: "0, 1, 0.3, FALSE, 0.05, 2, 0, 0, 1, 1" },
  markFliesGravity: { type: "numerical", default: "0" },
  markFliesNumber: { type: "numerical", default: "0" },
  markFliesRadiusDeg: { type: "numerical", default: "1.5" },
  markFliesSpeedDegPerSec: { type: "numerical", default: "0.2" },
  markFliesTrackFixationBool: { type: "boolean", default: "FALSE" },
  markFliesThicknessDeg: { type: "numerical", default: "0.05" },
  markFliesLengthDeg: { type: "numerical", default: "2" },
  markFliesColorRGBA: { type: "text", default: "0, 0, 1, 1" },
};

/** Overlap era: BOTH speed names known (priority test). */
const BOTH_SPEED_DEFAULTS: Record<string, { type: string; default: string }> = {
  ...G36_DEFAULTS,
  markFliesSpeedDegPerSec: { type: "numerical", default: "0.2" },
};

const buildGlossary = (
  defaults: Record<string, { type: string; default: string }>,
): GlossaryData => ({
  version: "test",
  glossary: Object.fromEntries(
    Object.entries(defaults).map(([name, e]) => [
      name,
      {
        name,
        availability: "",
        type: e.type,
        default: e.default,
        explanation: "",
        example: "",
        categories: [],
      },
    ]),
  ),
  glossaryFull: [],
  superMatchingParams: [],
});

/** Mirror ParamReader.parse for the value shapes these params produce
 * (vector-typed params — markFliesColorRGBA since glossary 36.0 — parse via
 * the REAL vectorParsing so the fake matches runtime behavior). */
const parseCell = (s: string, type?: string): unknown => {
  const spec = type ? parseVectorType(type) : null;
  if (spec) return parseVectorValue(spec, s, () => {});
  const t = s.trim().toLowerCase();
  if (t === "true") return true;
  if (t === "false") return false;
  if (s.trim() !== "" && !isNaN(Number(s))) return Number(s);
  return s;
};

/**
 * Fake ParamReader: `table` is the condition's column set (what the compiled
 * block CSV would contain); unknown names resolve to the glossary default —
 * exactly what ParamReader.read does for absent params. The resolver only
 * ever calls read(), so that is the whole fake.
 */
const makeReader = (
  table: Record<string, unknown>,
  defaults: Record<string, { type: string; default: string }> = G36_DEFAULTS,
): ParamReader =>
  ({
    read: (name: string, bc?: string) => {
      // Real ParamReader's condition-string branch returns undefined for an
      // unknown label — whether or not the param is a column elsewhere.
      if (bc !== undefined && bc !== BC) return undefined;
      const type = name in defaults ? defaults[name].type : undefined;
      return name in table
        ? typeof table[name] === "string"
          ? parseCell(table[name], type)
          : table[name]
        : name in defaults
        ? parseCell(defaults[name].default, type)
        : undefined;
    },
  }) as unknown as ParamReader;

// (No module-level glossary init: each describe installs the glossary its
// scenario needs — synthetic fixtures for the unit describes, the real
// cached/live glossary for the integration describe below.)

// ---------------------------------------------------------------------------
// parseMarkFlies — legacy 10-value string (behavior preserved from getFlies)
// ---------------------------------------------------------------------------

describe("parseMarkFlies (legacy string)", () => {
  beforeEach(() => initGlossary(buildGlossary(G36_DEFAULTS)));
  test("parses a 10-value spec, inverting the 4th field into trackFixationBool", () => {
    expect(parseMarkFlies("3, 1, 0.3, TRUE, 0.05, 2, 0, 0, 1, 1")).toEqual({
      n: 3,
      radiusDeg: 1,
      degPerSec: 0.3,
      // centeredOnNominalFixationBool TRUE → track the NOMINAL fixation
      trackFixationBool: false,
      thicknessDeg: 0.05,
      lengthDeg: 2,
      colorRGBA: "0,0,1,1",
    });
  });

  test("4th field FALSE → trackFixationBool true (follow the moving crosshair)", () => {
    expect(
      parseMarkFlies("3, 1, 0.3, FALSE, 0.05, 2, 0, 0, 1, 1")!
        .trackFixationBool,
    ).toBe(true);
  });

  test("glossary-recommended comma spacing is tolerated (fields are trimmed)", () => {
    // " TRUE" (space after comma) must mean TRUE — the raw split would
    // silently read it as FALSE and center the flies on the moving crosshair.
    expect(
      parseMarkFlies("3, 1, 0.3, TRUE, 0.05, 2, 0, 0, 1, 1")!.trackFixationBool,
    ).toBe(false);
    expect(
      parseMarkFlies("3, 1, 0.3, TRUE, 0.05, 2, 0, 0, 1, 1")!.colorRGBA,
    ).toBe("0,0,1,1");
  });

  test("wrong field count → undefined", () => {
    expect(parseMarkFlies("3, 1, 0.3, TRUE, 0.05, 2, 0, 0, 1")).toBeUndefined();
    expect(
      parseMarkFlies("3, 1, 0.3, TRUE, 0.05, 2, 0, 0, 1, 1, 1"),
    ).toBeUndefined();
  });

  test("non-finite numeric field → undefined", () => {
    expect(
      parseMarkFlies("banana, 1, 0.3, TRUE, 0.05, 2, 0, 0, 1, 1"),
    ).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// resolveFliesSpec — legacy-only and new-only tables
// ---------------------------------------------------------------------------

describe("resolveFliesSpec (glossary 36.0 live shape: markFliesDegPerSec, markFliesBool, 4*numerical color, gravity -0.5)", () => {
  beforeEach(() => initGlossary(buildGlossary(G36_DEFAULTS)));
  test("empty table → undefined (no flies)", () => {
    expect(resolveFliesSpec(makeReader({}), BC)).toBeUndefined();
  });

  test("legacy markFlies only → full legacy spec (n>0, legacy fields win over new defaults)", () => {
    expect(
      resolveFliesSpec(
        makeReader({ markFlies: "3, 1, 0.4, TRUE, 0.05, 2, 0, 0, 1, 1" }),
        BC,
      ),
    ).toEqual({
      n: 3,
      radiusDeg: 1, // legacy 1 beats new default 1.5
      degPerSec: 0.4, // legacy 0.4 beats new default 0.2
      trackFixationBool: false,
      thicknessDeg: 0.05,
      lengthDeg: 2,
      colorRGBA: "0,0,1,1",
      gravity: -0.5, // 36.0 default (absent gravity → repulsion on)
    });
  });

  test("legacy n=0 → undefined (legacy disable preserved)", () => {
    expect(
      resolveFliesSpec(
        makeReader({ markFlies: "0, 1, 0.3, TRUE, 0.05, 2, 0, 0, 1, 1" }),
        BC,
      ),
    ).toBeUndefined();
  });

  test("malformed legacy string → undefined (legacy garbage still means no flies)", () => {
    expect(
      resolveFliesSpec(makeReader({ markFlies: "junk" }), BC),
    ).toBeUndefined();
  });

  test("new params only → spec from the new params, new glossary defaults filling the gaps", () => {
    expect(
      resolveFliesSpec(
        makeReader({
          markFliesBool: true,
          markFliesNumber: 3,
          markFliesRadiusDeg: 2,
          markFliesDegPerSec: 0.5,
          markFliesTrackFixationBool: true,
          markFliesThicknessDeg: 0.1,
          markFliesLengthDeg: 3,
          markFliesColorRGBA: "1, 0, 0, 1",
          markFliesGravity: -0.5,
        }),
        BC,
      ),
    ).toEqual({
      n: 3,
      radiusDeg: 2,
      degPerSec: 0.5,
      trackFixationBool: true,
      thicknessDeg: 0.1,
      lengthDeg: 3,
      colorRGBA: "1,0,0,1",
      gravity: -0.5,
    });
  });

  test("only markFliesNumber set → new defaults for every other aspect", () => {
    expect(resolveFliesSpec(makeReader({ markFliesNumber: 3 }), BC)).toEqual({
      n: 3,
      radiusDeg: 1.5,
      degPerSec: 0.2,
      trackFixationBool: false,
      thicknessDeg: 0.05,
      lengthDeg: 2,
      colorRGBA: "0,0,1,1", // glossary default via vector-typed read
      gravity: -0.5,
    });
  });

  test("a table row for a param the glossary lacks (e.g. removed markFliesSpeedDegPerSec) is tolerated, not thrown", () => {
    // Hand-edited block CSV, glossary lag, or a study compiled against an
    // older glossary: the row exists but the name is unknown to the current
    // glossary — must behave as if absent (no throw).
    expect(() =>
      resolveFliesSpec(
        makeReader({
          markFlies: "3, 1, 0.3, TRUE, 0.05, 2, 0, 0, 1, 1",
          markFliesSpeedDegPerSec: 0.5,
        }),
        BC,
      ),
    ).not.toThrow();
    expect(
      resolveFliesSpec(
        makeReader({
          markFlies: "3, 1, 0.3, TRUE, 0.05, 2, 0, 0, 1, 1",
          markFliesSpeedDegPerSec: 0.5,
        }),
        BC,
      )?.degPerSec,
    ).toBe(0.3); // legacy string's speed wins; the unknown row contributes nothing
  });

  test("default-filled materialized columns (compiled block CSV) do not clobber the legacy string", () => {
    // The compiler materializes every table-mentioned param into EVERY
    // condition, filling blanks with glossary defaults — so a legacy block
    // of a table that also uses the new params carries markFliesNumber 0,
    // markFliesRadiusDeg 1.5, … columns. Those defaults must read as UNSET.
    expect(
      resolveFliesSpec(
        makeReader({
          markFlies: "3, 1, 0.4, TRUE, 0.05, 2, 0, 0, 1, 1",
          markFliesNumber: 0,
          markFliesRadiusDeg: 1.5,
          markFliesSpeedDegPerSec: 0.2,
          markFliesTrackFixationBool: false,
          markFliesThicknessDeg: 0.05,
          markFliesLengthDeg: 2,
          markFliesColorRGBA: "0, 0, 1, 1",
          markFliesGravity: 0,
        }),
        BC,
      ),
    ).toEqual({
      n: 3,
      radiusDeg: 1,
      degPerSec: 0.4,
      trackFixationBool: false,
      thicknessDeg: 0.05,
      lengthDeg: 2,
      colorRGBA: "0,0,1,1",
      gravity: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// resolveFliesSpec — mixing legacy and new (per-aspect override)
// ---------------------------------------------------------------------------

describe("resolveFliesSpec (mixed legacy + new)", () => {
  beforeEach(() => initGlossary(buildGlossary(G36_DEFAULTS)));
  const LEGACY = "3, 1, 0.4, TRUE, 0.05, 2, 0, 0, 1, 1";

  test("explicit new color overrides only the color", () => {
    expect(
      resolveFliesSpec(
        makeReader({ markFlies: LEGACY, markFliesColorRGBA: "1, 0, 0, 1" }),
        BC,
      ),
    ).toMatchObject({
      n: 3,
      radiusDeg: 1,
      degPerSec: 0.4,
      colorRGBA: "1,0,0,1",
    });
  });

  test("explicit new speed overrides the legacy speed", () => {
    expect(
      resolveFliesSpec(
        makeReader({ markFlies: LEGACY, markFliesDegPerSec: 0.9 }),
        BC,
      ),
    ).toMatchObject({ degPerSec: 0.9 });
  });

  test("default-filled VECTOR colorRGBA reads as UNSET — legacy color wins (glossary 36.0)", () => {
    // read() returns the vector-parsed [0,0,1,1]; comparing it against the
    // scalar-parsed default must not mistake it for an experimenter value.
    expect(
      resolveFliesSpec(
        makeReader({
          markFlies: "3, 1, 0.4, TRUE, 0.05, 2, 1, 0, 0, 1",
          markFliesColorRGBA: "0, 0, 1, 1", // == glossary default
        }),
        BC,
      ),
    ).toMatchObject({ n: 3, colorRGBA: "1,0,0,1" }); // legacy red wins
  });

  test("explicit new number overrides the legacy n", () => {
    expect(
      resolveFliesSpec(
        makeReader({ markFlies: LEGACY, markFliesNumber: 7 }),
        BC,
      ),
    ).toMatchObject({ n: 7 });
  });

  test("malformed legacy + explicit Number → flies from Number with new defaults", () => {
    expect(
      resolveFliesSpec(
        makeReader({ markFlies: "junk", markFliesNumber: 3 }),
        BC,
      ),
    ).toMatchObject({ n: 3, radiusDeg: 1.5, degPerSec: 0.2 });
  });
});

// ---------------------------------------------------------------------------
// resolveFliesSpec — markFliesBool semantics (glossary 36.0: Bool live,
// default FALSE) + speed-name priority (both names known)
// ---------------------------------------------------------------------------

describe("resolveFliesSpec (markFliesBool semantics)", () => {
  beforeEach(() => initGlossary(buildGlossary(G36_DEFAULTS)));

  test("markFliesBool FALSE coincides with the no-flies default state (FALSE is the glossary default, so it reads as unset)", () => {
    // A default-filled FALSE is indistinguishable from absent at runtime;
    // with markFliesNumber also unset, its default 0 means no flies either way.
    expect(
      resolveFliesSpec(makeReader({ markFliesBool: false }), BC),
    ).toBeUndefined();
  });

  test("markFliesBool TRUE switches on the flies (the Hu et al. setup)", () => {
    expect(
      resolveFliesSpec(
        makeReader({ markFliesBool: true, markFliesNumber: 3 }),
        BC,
      ),
    ).toMatchObject({ n: 3 });
  });

  test("markFliesBool absent + markFliesNumber 3 → flies (rename is not a functional change)", () => {
    expect(
      resolveFliesSpec(makeReader({ markFliesNumber: 3 }), BC),
    ).toMatchObject({ n: 3 });
  });

  test("markFliesBool absent + legacy n=3 → flies (legacy preserved)", () => {
    expect(
      resolveFliesSpec(
        makeReader({ markFlies: "3, 1, 0.3, TRUE, 0.05, 2, 0, 0, 1, 1" }),
        BC,
      ),
    ).toMatchObject({ n: 3 });
  });

  test("markFliesBool TRUE with nothing else → no flies (number defaults to 0)", () => {
    expect(
      resolveFliesSpec(makeReader({ markFliesBool: true }), BC),
    ).toBeUndefined();
  });

  test("markFliesBool TRUE + explicit markFliesDegPerSec beats legacy speed", () => {
    expect(
      resolveFliesSpec(
        makeReader({
          markFlies: "3, 1, 0.4, TRUE, 0.05, 2, 0, 0, 1, 1",
          markFliesBool: true,
          markFliesDegPerSec: 0.7,
        }),
        BC,
      ),
    ).toMatchObject({ n: 3, degPerSec: 0.7 });
  });
});

describe("resolveFliesSpec (speed-name priority: both markFliesDegPerSec and markFliesSpeedDegPerSec known)", () => {
  beforeEach(() => initGlossary(buildGlossary(BOTH_SPEED_DEFAULTS)));

  test("explicit markFliesDegPerSec wins over explicit markFliesSpeedDegPerSec", () => {
    expect(
      resolveFliesSpec(
        makeReader(
          {
            markFliesNumber: 3,
            markFliesDegPerSec: 0.7,
            markFliesSpeedDegPerSec: 0.5,
          },
          BOTH_SPEED_DEFAULTS,
        ),
        BC,
      ),
    ).toMatchObject({ n: 3, degPerSec: 0.7 });
  });

  test("explicit markFliesSpeedDegPerSec still works when markFliesDegPerSec is merely known", () => {
    expect(
      resolveFliesSpec(
        makeReader(
          {
            markFlies: "3, 1, 0.4, TRUE, 0.05, 2, 0, 0, 1, 1",
            markFliesSpeedDegPerSec: 0.5,
          },
          BOTH_SPEED_DEFAULTS,
        ),
        BC,
      ),
    ).toMatchObject({ degPerSec: 0.5 });
  });
});

// ---------------------------------------------------------------------------
// resolveFliesSpec — glossary 35.6 era (studies compiled before 36.0 carry
// markFliesSpeedDegPerSec columns; markFliesBool/DegPerSec did not exist)
// ---------------------------------------------------------------------------

describe("resolveFliesSpec (glossary 35.6 era: speed named markFliesSpeedDegPerSec; no Bool/DegPerSec)", () => {
  beforeEach(() => initGlossary(buildGlossary(G35_DEFAULTS)));

  test("explicit markFliesSpeedDegPerSec drives the speed", () => {
    expect(
      resolveFliesSpec(
        makeReader(
          { markFliesNumber: 3, markFliesSpeedDegPerSec: 0.5 },
          G35_DEFAULTS,
        ),
        BC,
      ),
    ).toMatchObject({ n: 3, degPerSec: 0.5 });
  });

  test("rows for then-unknown names (markFliesBool, markFliesDegPerSec) are tolerated, not thrown", () => {
    expect(() =>
      resolveFliesSpec(
        makeReader(
          { markFliesNumber: 3, markFliesBool: true, markFliesDegPerSec: 0.4 },
          G35_DEFAULTS,
        ),
        BC,
      ),
    ).not.toThrow();
    // Unknown names contribute nothing: speed stays at the era default 0.2.
    expect(
      resolveFliesSpec(
        makeReader(
          { markFliesNumber: 3, markFliesDegPerSec: 0.4 },
          G35_DEFAULTS,
        ),
        BC,
      ),
    ).toMatchObject({ degPerSec: 0.2 });
  });
});

// ---------------------------------------------------------------------------
// resolveFliesSpec — hardening
// ---------------------------------------------------------------------------

describe("resolveFliesSpec (hardening)", () => {
  beforeEach(() => initGlossary(buildGlossary(G36_DEFAULTS)));
  test("non-integer fly count → undefined (would crash new Array(n))", () => {
    expect(
      resolveFliesSpec(
        makeReader({ markFlies: "2.5, 1, 0.3, TRUE, 0.05, 2, 0, 0, 1, 1" }),
        BC,
      ),
    ).toBeUndefined();
  });

  test("unknown condition name → undefined (no flies, as today)", () => {
    expect(
      resolveFliesSpec(
        makeReader({ markFlies: "3, 1, 0.3, TRUE, 0.05, 2, 0, 0, 1, 1" }),
        "no_such_condition",
      ),
    ).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Adversarial: colorRGBA integrity. The legacy 10-field count check
// guaranteed exactly 4 color components; the free-text new parameter (and a
// legacy string with garbage color fields) guarantees nothing — NaN color or
// NaN opacity would flow straight into ShapeStim. A malformed color must
// skip the flies (with a warning), like every other malformed marking field.
// ---------------------------------------------------------------------------

describe("resolveFliesSpec (colorRGBA integrity)", () => {
  beforeEach(() => initGlossary(buildGlossary(G36_DEFAULTS)));

  test("3-component markFliesColorRGBA → undefined (skip flies)", () => {
    expect(
      resolveFliesSpec(
        makeReader({ markFliesNumber: 3, markFliesColorRGBA: "1, 0, 0" }),
        BC,
      ),
    ).toBeUndefined();
  });

  test("5-component markFliesColorRGBA → vector parsing truncates to a valid color (flies on; compiler rejects the table anyway)", () => {
    // Glossary 36.0 types the param 4*numerical: the compiler now rejects a
    // 5-component cell; a hand-edited block CSV reaches the runtime, where
    // parseVectorValue truncates to 4 (with its own warning) — no NaN.
    expect(
      resolveFliesSpec(
        makeReader({ markFliesNumber: 3, markFliesColorRGBA: "1, 0, 0, 1, 9" }),
        BC,
      ),
    ).toMatchObject({ n: 3, colorRGBA: "1,0,0,1" });
  });

  test("non-numeric markFliesColorRGBA → undefined (skip flies)", () => {
    expect(
      resolveFliesSpec(
        makeReader({ markFliesNumber: 3, markFliesColorRGBA: "x, 0, 0, 1" }),
        BC,
      ),
    ).toBeUndefined();
  });

  test("legacy string with garbage color fields → undefined (skip flies)", () => {
    expect(
      resolveFliesSpec(
        makeReader({
          markFlies: "3, 1, 0.3, TRUE, 0.05, 2, a, b, c, d",
        }),
        BC,
      ),
    ).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Integration: the REAL ParamReader + the real (cached/live) glossary,
// with conditions exactly as the compiler materializes them (every
// table-mentioned param a column in every condition, blanks default-filled
// — captured from examples/generated/test-mark-flies-new-params).
// ---------------------------------------------------------------------------

describe("resolveFliesSpec (integration: real ParamReader + real glossary)", () => {
  const buildConditions = (reader: RealParamReader, block: 1 | 2) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (reader as any)._glossaryEntry.bind(reader);
    const cells: Record<string, string> =
      block === 1
        ? {
            block: "1",
            conditionName: "letter-legacy",
            block_condition: "1_1",
            markFlies: "3, 1, 0.3, TRUE, 0.05, 2, 0, 0, 1, 1",
            markFliesColorRGBA: "0, 0, 1, 1",
            markFliesGravity: "0",
            markFliesLengthDeg: "2",
            markFliesNumber: "0",
            markFliesRadiusDeg: "1.5",
            markFliesSpeedDegPerSec: "0.2",
            markFliesThicknessDeg: "0.05",
            markFliesTrackFixationBool: "FALSE",
          }
        : {
            block: "2",
            conditionName: "letter-newparams",
            block_condition: "2_1",
            markFlies: "0, 1, 0.3, FALSE, 0.05, 2, 0, 0, 1, 1",
            markFliesBool: "TRUE",
            markFliesColorRGBA: "1, 0, 0, 1",
            markFliesGravity: "-0.5",
            markFliesLengthDeg: "3",
            markFliesNumber: "4",
            markFliesRadiusDeg: "2",
            markFliesDegPerSec: "0.5",
            markFliesThicknessDeg: "0.1",
            markFliesTrackFixationBool: "TRUE",
          };
    const condition: Record<string, unknown> = {};
    for (const [header, cell] of Object.entries(cells)) {
      const entry = g(header);
      condition[header] = reader.parse(cell, entry?.type);
    }
    return condition;
  };

  beforeAll(async () => {
    await loadGlossaryForTests();
  });

  test("legacy block: materialized defaults read as unset, legacy fields win", () => {
    const reader = Object.create(RealParamReader.prototype) as RealParamReader;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reader as any)._experiment = [buildConditions(reader, 1)];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reader as any)._blockCount = 2;
    expect(resolveFliesSpec(reader, "1_1")).toEqual({
      n: 3,
      radiusDeg: 1,
      degPerSec: 0.3,
      trackFixationBool: false,
      thicknessDeg: 0.05,
      lengthDeg: 2,
      colorRGBA: "0,0,1,1",
      gravity: 0,
    });
  });

  test("new-params block: explicit new values win", () => {
    const reader = Object.create(RealParamReader.prototype) as RealParamReader;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reader as any)._experiment = [buildConditions(reader, 2)];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reader as any)._blockCount = 2;
    expect(resolveFliesSpec(reader, "2_1")).toEqual({
      n: 4,
      radiusDeg: 2,
      degPerSec: 0.5,
      trackFixationBool: true,
      thicknessDeg: 0.1,
      lengthDeg: 3,
      colorRGBA: "1,0,0,1",
      gravity: -0.5,
    });
  });

  test("two conditions in one block resolve independently (N>1)", () => {
    const reader = Object.create(RealParamReader.prototype) as RealParamReader;
    const legacy = buildConditions(reader, 1); // 1_1: explicit legacy string
    // 1_2: experimenter left markFlies blank for this condition — the
    // compiler default-fills the cell (== glossary default ⇒ reads as unset).
    const plain = {
      ...legacy,
      block_condition: "1_2",
      markFlies: reader.parse(
        getGlossary()["markFlies"].default,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (reader as any)._glossaryEntry("markFlies")?.type,
      ),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reader as any)._experiment = [legacy, plain];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reader as any)._blockCount = 1;
    expect(resolveFliesSpec(reader, "1_1")?.n).toBe(3);
    expect(resolveFliesSpec(reader, "1_2")).toBeUndefined();
  });
});
