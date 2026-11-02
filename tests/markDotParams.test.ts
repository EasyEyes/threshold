import type { ParamReader } from "../parameters/paramReader";
import { ParamReader as RealParamReader } from "../parameters/paramReader";
import { initGlossary } from "../parameters/glossaryRegistry";
import type { GlossaryData } from "../../source/components/types";
import { loadGlossaryForTests } from "./helpers/glossary";
import { parseVectorType, parseVectorValue } from "../components/vectorParsing";
import { parseMarkDot, resolveDotSpec } from "../components/markDotParams";

const BC = "1_1";
const LEGACY_DOT = "1, -2, 0.3, 1, 0, 0, 0.5";

const DEFAULTS: Record<string, { type: string; default: string }> = {
  markDot: { type: "text", default: "0, 0, 0, 0, 0, 0, 1" },
  markDotColorRGBA: { type: "text", default: "0, 0, 0, 1" },
  markDotDiameterDeg: { type: "numerical", default: "0" },
  markDotTrackFixationBool: { type: "boolean", default: "FALSE" },
  markDotXYDeg: { type: "text", default: "0, 0" },
};

const VECTOR_DEFAULTS = {
  ...DEFAULTS,
  markDotXYDeg: { type: "2*numerical", default: "0, 0" },
  markDotColorRGBA: { type: "4*numerical", default: "0, 0, 0, 1" },
};

const buildGlossary = (
  defaults: Record<string, { type: string; default: string }>,
): GlossaryData => ({
  version: "test",
  glossary: Object.fromEntries(
    Object.entries(defaults).map(([name, entry]) => [
      name,
      {
        name,
        availability: "",
        type: entry.type,
        default: entry.default,
        explanation: "",
        example: "",
        categories: [],
      },
    ]),
  ),
  glossaryFull: [],
  superMatchingParams: [],
});

const parseCell = (value: string, type?: string): unknown => {
  const spec = type ? parseVectorType(type) : null;
  if (spec) return parseVectorValue(spec, value, () => {});
  const scalar = value.trim().toLowerCase();
  if (scalar === "true") return true;
  if (scalar === "false") return false;
  if (value.trim() !== "" && !isNaN(Number(value))) return Number(value);
  return value;
};

const makeReader = (
  table: Record<string, unknown>,
  defaults: Record<string, { type: string; default: string }> = DEFAULTS,
): ParamReader =>
  ({
    read: (name: string, bc?: string) => {
      if (bc !== undefined && bc !== BC) return undefined;
      const type = defaults[name]?.type;
      if (name in table) {
        const value = table[name];
        return typeof value === "string" ? parseCell(value, type) : value;
      }
      if (name in defaults) return parseCell(defaults[name].default, type);
      return undefined;
    },
  }) as unknown as ParamReader;

describe("parseMarkDot (legacy seven-value string)", () => {
  test("parses position, diameter, and color; legacy dots do not track", () => {
    expect(parseMarkDot(LEGACY_DOT)).toEqual({
      xyDeg: [1, -2],
      diameterDeg: 0.3,
      colorRGBA: "1,0,0,0.5",
    });
  });

  test("tolerates whitespace around every field", () => {
    expect(parseMarkDot(" 1 , -2 , 0.3 , 0 , 0 , 1 , 1 ")).toEqual({
      xyDeg: [1, -2],
      diameterDeg: 0.3,
      colorRGBA: "0,0,1,1",
    });
  });

  test("wrong field count returns undefined", () => {
    expect(parseMarkDot("1,2,3,0,0,1")).toBeUndefined();
    expect(parseMarkDot("1,2,3,0,0,0,1,1")).toBeUndefined();
  });

  test("non-finite position or diameter returns undefined", () => {
    expect(parseMarkDot("banana,2,3,0,0,0,1")).toBeUndefined();
    expect(parseMarkDot("1,2,Infinity,0,0,0,1")).toBeUndefined();
  });

  test("non-finite color returns undefined instead of constructing NaN colors", () => {
    expect(parseMarkDot("1,2,3,0,banana,0,1")).toBeUndefined();
  });
});

describe("resolveDotSpec", () => {
  beforeEach(() => initGlossary(buildGlossary(DEFAULTS)));

  test("glossary defaults produce no dot", () => {
    expect(resolveDotSpec(makeReader({}), BC)).toBeUndefined();
  });

  test("legacy markDot remains fully functional", () => {
    expect(resolveDotSpec(makeReader({ markDot: LEGACY_DOT }), BC)).toEqual({
      xyDeg: [1, -2],
      diameterDeg: 0.3,
      colorRGBA: "1,0,0,0.5",
      trackFixationBool: false,
    });
  });

  test("all four new parameters specify a dot without legacy markDot", () => {
    expect(
      resolveDotSpec(
        makeReader({
          markDotXYDeg: "2, 3",
          markDotDiameterDeg: 0.5,
          markDotColorRGBA: "0, 1, 0, 0.25",
          markDotTrackFixationBool: true,
        }),
        BC,
      ),
    ).toEqual({
      xyDeg: [2, 3],
      diameterDeg: 0.5,
      colorRGBA: "0,1,0,0.25",
      trackFixationBool: true,
    });
  });

  test("compiler-materialized new defaults do not clobber legacy fields", () => {
    expect(
      resolveDotSpec(
        makeReader({
          markDot: LEGACY_DOT,
          markDotXYDeg: "0, 0",
          markDotDiameterDeg: 0,
          markDotColorRGBA: "0, 0, 0, 1",
          markDotTrackFixationBool: false,
        }),
        BC,
      ),
    ).toEqual({
      xyDeg: [1, -2],
      diameterDeg: 0.3,
      colorRGBA: "1,0,0,0.5",
      trackFixationBool: false,
    });
  });

  test("new XY independently overrides legacy XY", () => {
    expect(
      resolveDotSpec(
        makeReader({ markDot: LEGACY_DOT, markDotXYDeg: "4, 5" }),
        BC,
      )?.xyDeg,
    ).toEqual([4, 5]);
  });

  test("new diameter independently overrides legacy diameter", () => {
    expect(
      resolveDotSpec(
        makeReader({ markDot: LEGACY_DOT, markDotDiameterDeg: 0.8 }),
        BC,
      )?.diameterDeg,
    ).toBe(0.8);
  });

  test("new color independently overrides legacy color", () => {
    expect(
      resolveDotSpec(
        makeReader({
          markDot: LEGACY_DOT,
          markDotColorRGBA: "0, 0, 1, 1",
        }),
        BC,
      )?.colorRGBA,
    ).toBe("0,0,1,1");
  });

  test("new trackFixation TRUE enables tracking for a legacy dot", () => {
    expect(
      resolveDotSpec(
        makeReader({
          markDot: LEGACY_DOT,
          markDotTrackFixationBool: true,
        }),
        BC,
      )?.trackFixationBool,
    ).toBe(true);
  });

  test("zero and negative diameters disable the dot", () => {
    expect(
      resolveDotSpec(makeReader({ markDotDiameterDeg: 0 }), BC),
    ).toBeUndefined();
    expect(
      resolveDotSpec(makeReader({ markDotDiameterDeg: -1 }), BC),
    ).toBeUndefined();
  });

  test("malformed new XY skips the dot instead of throwing", () => {
    expect(
      resolveDotSpec(
        makeReader({ markDotDiameterDeg: 1, markDotXYDeg: "1" }),
        BC,
      ),
    ).toBeUndefined();
    expect(
      resolveDotSpec(
        makeReader({ markDotDiameterDeg: 1, markDotXYDeg: "1, banana" }),
        BC,
      ),
    ).toBeUndefined();
  });

  test("malformed new color skips the dot instead of constructing NaN colors", () => {
    expect(
      resolveDotSpec(
        makeReader({ markDotDiameterDeg: 1, markDotColorRGBA: "1,0,0" }),
        BC,
      ),
    ).toBeUndefined();
    expect(
      resolveDotSpec(
        makeReader({
          markDotDiameterDeg: 1,
          markDotColorRGBA: "1,0,banana,1",
        }),
        BC,
      ),
    ).toBeUndefined();
  });

  test("non-finite new diameter skips the dot", () => {
    expect(
      resolveDotSpec(makeReader({ markDotDiameterDeg: NaN }), BC),
    ).toBeUndefined();
  });

  test("unknown condition returns no dot without throwing", () => {
    expect(
      resolveDotSpec(makeReader({ markDot: LEGACY_DOT }), "99_1"),
    ).toBeUndefined();
  });

  test("legacy support survives new parameters being absent from an old glossary", () => {
    const legacyOnly = { markDot: DEFAULTS.markDot };
    initGlossary(buildGlossary(legacyOnly));
    expect(
      resolveDotSpec(makeReader({ markDot: LEGACY_DOT }, legacyOnly), BC),
    ).toEqual({
      xyDeg: [1, -2],
      diameterDeg: 0.3,
      colorRGBA: "1,0,0,0.5",
      trackFixationBool: false,
    });
  });

  test("new parameters survive legacy markDot being deleted from the glossary", () => {
    const withoutLegacy = { ...DEFAULTS };
    delete withoutLegacy.markDot;
    initGlossary(buildGlossary(withoutLegacy));
    expect(
      resolveDotSpec(
        makeReader({ markDotDiameterDeg: 0.4 }, withoutLegacy),
        BC,
      ),
    ).toEqual({
      xyDeg: [0, 0],
      diameterDeg: 0.4,
      colorRGBA: "0,0,0,1",
      trackFixationBool: false,
    });
  });

  test("accepts vector-typed XY and color reads", () => {
    initGlossary(buildGlossary(VECTOR_DEFAULTS));
    expect(
      resolveDotSpec(
        makeReader(
          {
            markDotDiameterDeg: 0.4,
            markDotXYDeg: [2, 3],
            markDotColorRGBA: [1, 0, 0, 0.5],
          },
          VECTOR_DEFAULTS,
        ),
        BC,
      ),
    ).toEqual({
      xyDeg: [2, 3],
      diameterDeg: 0.4,
      colorRGBA: "1,0,0,0.5",
      trackFixationBool: false,
    });
  });

  test("default-filled vector values read as unset, preserving legacy values", () => {
    initGlossary(buildGlossary(VECTOR_DEFAULTS));
    expect(
      resolveDotSpec(makeReader({ markDot: LEGACY_DOT }, VECTOR_DEFAULTS), BC),
    ).toEqual({
      xyDeg: [1, -2],
      diameterDeg: 0.3,
      colorRGBA: "1,0,0,0.5",
      trackFixationBool: false,
    });
  });

  test("documents default-value limitation: explicit zero cannot override legacy diameter", () => {
    expect(
      resolveDotSpec(
        makeReader({ markDot: LEGACY_DOT, markDotDiameterDeg: 0 }),
        BC,
      )?.diameterDeg,
    ).toBe(0.3);
  });
});

describe("resolveDotSpec with real ParamReader and glossary", () => {
  beforeAll(async () => loadGlossaryForTests());

  const makeRealReader = (cells: Record<string, string>) => {
    const reader = Object.create(RealParamReader.prototype) as RealParamReader;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const glossaryEntry = (reader as any)._glossaryEntry.bind(reader);
    const condition: Record<string, unknown> = {
      block: 1,
      block_condition: BC,
      conditionName: "dot-test",
    };
    for (const [name, value] of Object.entries(cells)) {
      condition[name] = reader.parse(value, glossaryEntry(name)?.type);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reader as any)._experiment = [condition];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reader as any)._blockCount = 1;
    return reader;
  };

  test("legacy and materialized new defaults resolve through the real reader", () => {
    const reader = makeRealReader({
      markDot: LEGACY_DOT,
      markDotColorRGBA: "0, 0, 0, 1",
      markDotDiameterDeg: "0",
      markDotTrackFixationBool: "FALSE",
      markDotXYDeg: "0, 0",
    });
    expect(resolveDotSpec(reader, BC)).toEqual({
      xyDeg: [1, -2],
      diameterDeg: 0.3,
      colorRGBA: "1,0,0,0.5",
      trackFixationBool: false,
    });
  });

  test("new values resolve through the real reader", () => {
    const reader = makeRealReader({
      markDotColorRGBA: "0, 1, 0, 1",
      markDotDiameterDeg: "0.4",
      markDotTrackFixationBool: "TRUE",
      markDotXYDeg: "2, -3",
    });
    expect(resolveDotSpec(reader, BC)).toEqual({
      xyDeg: [2, -3],
      diameterDeg: 0.4,
      colorRGBA: "0,1,0,1",
      trackFixationBool: true,
    });
  });
});
