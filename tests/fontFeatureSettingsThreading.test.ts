/**
 * fontFeatureSettings runtime threading (B8).
 *
 * setFontGlobalState must read `fontFeatureSettings`, store it on `font`,
 * cascade it to DOM CSS (font-feature-settings), and pass it through to
 * getProcessedFontName (which selects the WASM-baked font instance).
 *
 * Mirrors the fonts.test.ts mock harness.
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
}));

// Capture the featureSettings argument passed to getProcessedFontName.
const getProcessedFontName = jest.fn(() => null);
jest.mock("../components/fontInstancing", () => ({
  getProcessedFontName,
  generateFontInstances: jest.fn(),
  collectFontVariations: jest.fn(),
  combineVariableSettingsWithWeight: jest.fn((_a, _b) => ""),
  getInstancedFontName: jest.fn(),
}));

beforeEach(() => {
  (global as { document?: unknown }).document = {
    documentElement: { lang: "", dir: "", style: {} },
  } as unknown as typeof document;
  for (const key of Object.keys(mockFont)) delete mockFont[key];
  getProcessedFontName.mockClear();
});

import { setFontGlobalState } from "../components/fonts";

const makeReader = (overrides: Record<string, unknown> = {}) => ({
  read: jest.fn((name: string) =>
    overrides[name] !== undefined ? overrides[name] : "",
  ),
});

describe("setFontGlobalState — fontFeatureSettings threading", () => {
  it("reads fontFeatureSettings into font.featureSettings", () => {
    const reader = makeReader({ fontFeatureSettings: '"calt" 1, "smcp"' });
    setFontGlobalState("1_1", reader);
    expect(reader.read).toHaveBeenCalledWith("fontFeatureSettings", "1_1");
    expect(mockFont.featureSettings).toBe('"calt" 1, "smcp"');
  });

  it("does NOT cascade fontFeatureSettings to DOM CSS (baked into font instead)", () => {
    const reader = makeReader({ fontFeatureSettings: '"dlig" 1' });
    setFontGlobalState("1_1", reader);
    // font-feature-settings is NOT set on <html> — it would cascade to canvas
    // and override the baked calt lookups. Features are baked into the font
    // via the WASM baker instead.
    expect(
      (
        global as {
          document: { documentElement: { style: Record<string, string> } };
        }
      ).document.documentElement.style.fontFeatureSettings,
    ).toBeUndefined();
  });

  it("blank fontFeatureSettings → empty field, no DOM CSS", () => {
    const reader = makeReader({});
    setFontGlobalState("1_1", reader);
    expect(mockFont.featureSettings).toBe("");
    expect(
      (
        global as {
          document: { documentElement: { style: Record<string, string> } };
        }
      ).document.documentElement.style.fontFeatureSettings,
    ).toBeUndefined();
  });

  it("passes featureSettings as the 4th arg to getProcessedFontName (file font)", () => {
    const reader = makeReader({
      fontSource: "file",
      font: "MyFont.woff2",
      fontFeatureSettings: '"calt" 1',
    });
    setFontGlobalState("1_1", reader);
    expect(getProcessedFontName).toHaveBeenCalledTimes(1);
    const args = getProcessedFontName.mock.calls[0];
    // (fontName, variableSettings, stylisticSets, featureSettings)
    expect(args[3]).toBe('"calt" 1');
  });

  it("triggers font processing when ONLY fontFeatureSettings is set", () => {
    // No variable settings, no stylistic sets — feature settings alone must
    // route through getProcessedFontName.
    const reader = makeReader({
      fontSource: "file",
      font: "MyFont.woff2",
      fontFeatureSettings: '"smcp"',
    });
    setFontGlobalState("1_1", reader);
    expect(getProcessedFontName).toHaveBeenCalledTimes(1);
  });
});
