/**
 * fontVariantLigatures runtime threading (Phase 3).
 *
 * setFontGlobalState must read `fontVariantLigatures`, store the normalized
 * keywords on `font.variantLigatures`, and pass the MERGED feature string
 * (fontFeatureSettings ∪ translated ligature tags) to getProcessedFontName.
 * collectFontVariations must emit the same merged string per condition so the
 * eager pre-bake key matches the runtime lookup key.
 *
 * fontInstancing is the REAL module (spread) with only the two lookup
 * functions stubbed, so collectFontVariations is exercised for real.
 *
 * @jest-environment node
 */

jest.mock("webfontloader", () => ({ load: jest.fn() }));
jest.mock("../threshold", () => ({ paramReader: {} }));
jest.mock("../components/utils", () => ({
  isBlockLabel: (bc: string) => /^[0-9]+$/.test(String(bc)),
  toFixedNumber: jest.fn(),
}));
jest.mock("../parameters/glossaryRegistry", () => ({
  getGlossary: () => ({}),
}));
jest.mock("../psychojs/src/visual/punctuationRTL.js", () => ({
  setPunctuationRTL: jest.fn(),
}));

const mockFont: Record<string, unknown> = {};
jest.mock("../components/global", () => ({
  font: mockFont,
  status: {},
  targetKind: {},
  typekit: { fonts: new Map() },
  skipTrialOrBlock: {
    skipTrial: false,
    skipBlock: false,
    trialId: -1,
    blockId: -1,
  },
}));

// Real fontInstancing, with only the bake-lookup functions stubbed.
const getProcessedFontName = jest.fn(() => null);
const getFailedFontNames = jest.fn(() => new Set<string>());
jest.mock("../components/fontInstancing", () => {
  const actual = jest.requireActual("../components/fontInstancing");
  return {
    ...actual,
    getProcessedFontName,
    getFailedFontNames,
  };
});

beforeEach(() => {
  (global as { document?: unknown }).document = {
    documentElement: { lang: "", dir: "", style: {} },
  } as unknown as typeof document;
  for (const key of Object.keys(mockFont)) delete mockFont[key];
  getProcessedFontName.mockClear();
  getProcessedFontName.mockReturnValue(null);
  getFailedFontNames.mockClear();
  getFailedFontNames.mockReturnValue(new Set<string>());
});

import { setFontGlobalState } from "../components/fonts";
import {
  collectFontVariations,
  generateProcessedFontName,
} from "../components/fontInstancing";

const makeReader = (overrides: Record<string, unknown> = {}) => ({
  read: jest.fn((name: string) =>
    overrides[name] !== undefined ? overrides[name] : "",
  ),
});

describe("setFontGlobalState — fontVariantLigatures threading", () => {
  it("reads fontVariantLigatures into font.variantLigatures (normalized)", () => {
    const reader = makeReader({
      fontVariantLigatures: "discretionary-ligatures, contextual",
    });
    setFontGlobalState("1_1", reader);
    expect(reader.read).toHaveBeenCalledWith("fontVariantLigatures", "1_1");
    expect(mockFont.variantLigatures).toBe(
      "discretionary-ligatures, contextual",
    );
  });

  it("does NOT set font-variant-ligatures on <html> (baked into font instead)", () => {
    // Parity with fontFeatureSettings: inherited CSS must not fight the
    // baked calt (e.g. `none` would zero the calt the baker injected into).
    const reader = makeReader({
      fontVariantLigatures: "discretionary-ligatures",
    });
    setFontGlobalState("1_1", reader);
    expect(
      (
        global as {
          document: { documentElement: { style: Record<string, string> } };
        }
      ).document.documentElement.style.fontVariantLigatures,
    ).toBeUndefined();
  });

  it("ligatures alone route through getProcessedFontName with translated tag", () => {
    const reader = makeReader({
      fontSource: "file",
      font: "MyFont.woff2",
      fontVariantLigatures: "discretionary-ligatures",
    });
    setFontGlobalState("1_1", reader);
    expect(getProcessedFontName).toHaveBeenCalledTimes(1);
    const args = getProcessedFontName.mock.calls[0];
    // (fontName, variableSettings, stylisticSets, featureSettings)
    expect(args[3]).toBe('"dlig" 1');
  });

  it("unions with fontFeatureSettings (ligature tag appended)", () => {
    const reader = makeReader({
      fontSource: "file",
      font: "MyFont.woff2",
      fontFeatureSettings: '"smcp"',
      fontVariantLigatures: "discretionary-ligatures",
    });
    setFontGlobalState("1_1", reader);
    expect(getProcessedFontName.mock.calls[0][3]).toBe('"smcp", "dlig" 1');
  });

  it("variant keyword wins a tag conflict with fontFeatureSettings (CSS precedence)", () => {
    const reader = makeReader({
      fontSource: "file",
      font: "MyFont.woff2",
      fontFeatureSettings: '"dlig" 0',
      fontVariantLigatures: "discretionary-ligatures",
    });
    setFontGlobalState("1_1", reader);
    expect(getProcessedFontName.mock.calls[0][3]).toBe('"dlig" 1');
  });

  it("'normal' (the default) does NOT trigger font processing", () => {
    const reader = makeReader({
      fontSource: "file",
      font: "MyFont.woff2",
      fontVariantLigatures: "normal",
    });
    setFontGlobalState("1_1", reader);
    expect(getProcessedFontName).not.toHaveBeenCalled();
    expect(mockFont.variantLigatures).toBe("normal");
  });

  it("blank ligatures leave fontFeatureSettings threading unchanged", () => {
    const reader = makeReader({
      fontSource: "file",
      font: "MyFont.woff2",
      fontFeatureSettings: '"smcp"',
    });
    setFontGlobalState("1_1", reader);
    expect(getProcessedFontName.mock.calls[0][3]).toBe('"smcp"');
  });
});

describe("generateProcessedFontName — feature VALUE must disambiguate the name", () => {
  // Regression: the name used to include only the feature TAGS, so
  // '"liga" 1, "clig" 1' (common-ligatures) and '"liga" 0, "clig" 0'
  // (no-common-ligatures) BOTH produced "Font-liga+clig". The cache keys
  // are full strings (distinct), but both pointed at the SAME FontFace
  // family — the serial bake registered the liga-ON no-op, then overwrote
  // the family with the liga-OFF bake. The ON block then rendered with
  // ligatures stripped ("common-ligatures doesn't work").
  it("on vs off of the same tag(s) get DIFFERENT names", () => {
    const on = generateProcessedFontName("F.ttf", "", "", '"liga" 1, "clig" 1');
    const off = generateProcessedFontName(
      "F.ttf",
      "",
      "",
      '"liga" 0, "clig" 0',
    );
    expect(on).not.toBe(off);
  });

  it("absent value defaults to 1 (CSS), so '\"dlig\"' == '\"dlig\" 1'", () => {
    expect(generateProcessedFontName("F.ttf", "", "", '"dlig"')).toBe(
      generateProcessedFontName("F.ttf", "", "", '"dlig" 1'),
    );
  });
});

describe("collectFontVariations — fontVariantLigatures (eager pre-bake)", () => {
  const makeBlockReader = (perCondition: Record<string, unknown[]>) => ({
    read: jest.fn((name: string) => {
      if (name === "conditionEnabledBool") return [true];
      if (name === "conditionTrials") return [1];
      if (name === "fontSource") return ["file"];
      if (name === "font") return ["MyFont.woff2"];
      const v = perCondition[name];
      return v !== undefined ? v : [""];
    }),
    blockCount: 1,
  });

  it("ligatures alone produce a variation with the translated tag", () => {
    const reader = makeBlockReader({
      fontVariantLigatures: ["discretionary-ligatures"],
    });
    const variations = collectFontVariations(reader as never);
    expect(variations).toHaveLength(1);
    expect(variations[0].featureSettings).toBe('"dlig" 1');
  });

  it("unions with fontFeatureSettings per condition", () => {
    const reader = makeBlockReader({
      fontFeatureSettings: ['"smcp"'],
      fontVariantLigatures: ["historical-ligatures"],
    });
    const variations = collectFontVariations(reader as never);
    expect(variations[0].featureSettings).toBe('"smcp", "hlig" 1');
  });

  it("'normal' produces NO variation (non-user invariant)", () => {
    const reader = makeBlockReader({
      fontVariantLigatures: ["normal"],
    });
    expect(collectFontVariations(reader as never)).toEqual([]);
  });

  it("blank produces NO variation", () => {
    const reader = makeBlockReader({});
    expect(collectFontVariations(reader as never)).toEqual([]);
  });
});
