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
  skipTrialOrBlock: {
    skipTrial: false,
    skipBlock: false,
    trialId: -1,
    blockId: -1,
  },
}));

// Capture the featureSettings argument passed to getProcessedFontName.
const getProcessedFontName = jest.fn(() => null);
const getFailedFontNames = jest.fn(() => new Set<string>());
jest.mock("../components/fontInstancing", () => ({
  getProcessedFontName,
  generateFontInstances: jest.fn(),
  collectFontVariations: jest.fn(),
  combineVariableSettingsWithWeight: jest.fn((_a, _b) => ""),
  getInstancedFontName: jest.fn(),
  getFailedFontNames,
  bakeAllFonts: jest.fn(async () => ({ baked: 0, failed: 0, failedNames: [] })),
}));

beforeEach(() => {
  (global as { document?: unknown }).document = {
    documentElement: { lang: "", dir: "", style: {} },
  } as unknown as typeof document;
  for (const key of Object.keys(mockFont)) delete mockFont[key];
  getProcessedFontName.mockClear();
  getProcessedFontName.mockReturnValue(null);
  getFailedFontNames.mockClear();
  getFailedFontNames.mockReturnValue(new Set<string>());
  typekitFontsMap.clear();
  mockSkip.skipBlock = false;
  mockSkip.blockId = -1;
});

import { setFontGlobalState } from "../components/fonts";
import { typekit, skipTrialOrBlock } from "../components/global";

const typekitFontsMap = typekit.fonts as Map<string, string>;
const mockSkip = skipTrialOrBlock as {
  skipBlock: boolean;
  blockId: number;
};

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

  it("routes adobe fonts through getProcessedFontName when settings present", () => {
    // Regression: needsProcessedFont previously only listed file|google, so
    // adobe blocks never looked up the baked name — font.name stayed the raw
    // family ("source-sans-pro") with no registered FontFace → serif fallback.
    const reader = makeReader({
      fontSource: "adobe",
      font: "source-sans-pro",
      fontFeatureSettings: '"frac"',
    });
    setFontGlobalState("1_1", reader);
    expect(getProcessedFontName).toHaveBeenCalledTimes(1);
    const args = getProcessedFontName.mock.calls[0];
    expect(args[0]).toBe("source-sans-pro");
    expect(args[3]).toBe('"frac"');
  });

  it.each(["file", "google", "adobe"])(
    "routes %s fonts through getProcessedFontName (all bakeable sources)",
    (fontSource) => {
      const reader = makeReader({
        fontSource,
        font: fontSource === "file" ? "MyFont.woff2" : "some-family",
        fontFeatureSettings: '"zero"',
      });
      setFontGlobalState("1_1", reader);
      expect(getProcessedFontName).toHaveBeenCalledTimes(1);
    },
  );

  it("adobe: baked name wins over typekit css_name mapping", () => {
    // Regression: the css_name mapping used to run BEFORE the baked-name
    // lookup, so when the Typekit css_name differed from the table family
    // name, the bake-key lookup missed and the raw Typekit font rendered
    // (bake silently had no effect). The lookup must use the RAW family
    // name, and the baked name must win when present.
    typekitFontsMap.set("source-serif-pro", "source-serif-pro-CSSNAME");
    getProcessedFontName.mockReturnValue("source-serif-pro-smcp");
    const reader = makeReader({
      fontSource: "adobe",
      font: "source-serif-pro",
      fontFeatureSettings: '"smcp"',
    });
    setFontGlobalState("1_1", reader);
    // Lookup used the RAW family name (not the css_name):
    expect(getProcessedFontName.mock.calls[0][0]).toBe("source-serif-pro");
    // Baked name wins:
    expect(mockFont.name).toBe("source-serif-pro-smcp");
  });

  it("adobe: css_name mapping applies when NO baked font (control block)", () => {
    // No settings → no bake → the raw font renders via the Typekit
    // kit-registered css_name (production path).
    typekitFontsMap.set("source-serif-pro", "source-serif-pro-CSSNAME");
    const reader = makeReader({
      fontSource: "adobe",
      font: "source-serif-pro",
      fontFeatureSettings: "",
    });
    setFontGlobalState("1_1", reader);
    expect(getProcessedFontName).not.toHaveBeenCalled();
    expect(mockFont.name).toBe("source-serif-pro-CSSNAME");
  });

  it("no-settings block is NOT skipped when its family failed to bake in ANOTHER block", () => {
    // Adversarial regression: block A (Inter + zero) fails to bake → "Inter"
    // lands in failedFontNames. Block B (Inter, NO settings) renders the RAW
    // font via WebFont.load — it does NOT depend on the bake, so it must NOT
    // be skipped. The failedFonts skip must be gated on needsProcessedFont.
    getFailedFontNames.mockReturnValue(new Set(["Inter"]));
    const reader = makeReader({
      fontSource: "google",
      font: "Inter",
      fontFeatureSettings: "", // no settings → raw font, no bake needed
      fontVariableSettings: "",
      fontStylisticSets: "",
    });
    setFontGlobalState("1_1", reader);
    expect(mockSkip.skipBlock).toBe(false);
  });

  it("settings block IS skipped when its family failed to bake", () => {
    // The intended behavior: a block that NEEDS the baked font but whose
    // bake failed must be skipped (no silent fallback to sans-serif).
    getFailedFontNames.mockReturnValue(new Set(["Inter"]));
    const reader = makeReader({
      fontSource: "google",
      font: "Inter",
      fontFeatureSettings: "zero", // needs the bake
    });
    setFontGlobalState("1_1", reader);
    expect(mockSkip.skipBlock).toBe(true);
  });
});
