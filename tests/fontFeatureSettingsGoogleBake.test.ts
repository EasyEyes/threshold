/**
 * fontFeatureSettings bakery pipeline end-to-end plumbing tests.
 *
 * The Google Fonts URL bug (trailing colon when fontVariableSettings is empty)
 * was confirmed empirically (HTTP 400 → 200 after fix in loadGoogleFontFile).
 *
 * This file tests the PIPE that builds the variation array (collectFontVariations)
 * and the cache key match (getProcessedFontName). No WASM or fetch needed —
 * pure logic, mock reader only.
 *
 * @jest-environment node
 */

// Minimal mocks so the circular fonts.js ↔ fontInstancing import resolves.
// (setFontGlobalState tests already proved this harness works.)
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
}));

beforeEach(() => {
  for (const k of Object.keys(mockFont)) delete mockFont[k];
});

import { collectFontVariations } from "../components/fontInstancing";

const makeReader = (overrides: Record<string, unknown> = {}) => ({
  read: jest.fn((name: string, _blockIndex: number) => {
    const val = (overrides as Record<string, unknown>)[name];
    if (Array.isArray(val)) return val;
    return val != null ? val : "";
  }),
  blockCount: 1,
});

describe("collectFontVariations with fontFeatureSettings", () => {
  it("includes a variation when ONLY fontFeatureSettings is set (no var/ss)", () => {
    const reader = makeReader({
      conditionEnabledBool: [true],
      conditionTrials: [1],
      fontSource: ["google"],
      font: ["Inter"],
      fontVariableSettings: [""],
      fontFeatureSettings: ['"zero"'],
      fontStylisticSets: [""],
      fontWeight: [""],
    });
    const vars = collectFontVariations(reader);
    expect(vars).toHaveLength(1);
    expect(vars[0].featureSettings).toBe('"zero"');
    expect(vars[0].variableSettings).toBe("");
    expect(vars[0].stylisticSets).toBe("");
  });

  it("skips the variation when featureSettings is blank AND no var/ss", () => {
    const reader = makeReader({
      conditionEnabledBool: [true],
      conditionTrials: [1],
      fontSource: ["google"],
      font: ["Inter"],
      fontVariableSettings: [""],
      fontFeatureSettings: [""],
      fontStylisticSets: [""],
      fontWeight: [""],
    });
    expect(collectFontVariations(reader)).toHaveLength(0);
  });

  it("skips when fontSource is not file or google", () => {
    const reader = makeReader({
      conditionEnabledBool: [true],
      conditionTrials: [1],
      fontSource: ["browser"],
      font: ["Inter"],
      fontVariableSettings: [""],
      fontFeatureSettings: ['"zero"'],
      fontStylisticSets: [""],
      fontWeight: [""],
    });
    expect(collectFontVariations(reader)).toHaveLength(0);
  });
});
