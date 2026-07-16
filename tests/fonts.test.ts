/**
 * T1 (RED) — setFontGlobalState reads `fontKerning` into `font.kerning`,
 * mirroring `fontTrackingForLetters` → `font.letterSpacing`.
 *
 * @jest-environment node
 */

// Mock heavy / browser-only imports pulled in transitively by fonts.js.
jest.mock("webfontloader", () => ({ load: jest.fn() }));
// fonts.js imports { paramReader } from "../threshold" (9000+ lines); not used
// by setFontGlobalState (which receives paramReader as an arg). Stub the import.
jest.mock("../threshold", () => ({ paramReader: {} }));
// utils.js transitively imports psychojs → multiple-displays/globals.ts which
// references top-level `window` (undefined in node env). fonts.js only needs the
// pure isBlockLabel/toFixedNumber from utils, so mock just those.
jest.mock("../components/utils", () => ({
  // block labels are bare numbers ("1"); condition labels contain "_" ("1_2").
  isBlockLabel: (bc: string) => /^[0-9]+$/.test(String(bc)),
  toFixedNumber: jest.fn(),
}));

// fonts.js also reads `fontPunctuationRTL` (guarded by a getGlossary() lookup)
// and calls setPunctuationRTL(). Those are unrelated to fontKerning; stub them
// so this test stays focused on the fontKerning read. getGlossary() returns an
// empty record so the fontPunctuationRTL branch is skipped entirely.
jest.mock("../parameters/glossaryRegistry", () => ({
  getGlossary: () => ({}),
}));
jest.mock("../psychojs/src/visual/punctuationRTL.js", () => ({
  setPunctuationRTL: jest.fn(),
}));

// global.js imports the Firebase phrases-loader (top-level await) at module load.
// Mock it, but provide a REAL mutable `font` object so we can assert mutations.
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

// setFontGlobalState sets document.documentElement.lang/dir and now also
// document.documentElement.style.textRendering; node env has no DOM.
beforeEach(() => {
  (global as { document?: unknown }).document = {
    documentElement: { lang: "", dir: "", style: {} },
  } as unknown as typeof document;
  // reset the shared mock font between tests
  for (const key of Object.keys(mockFont)) delete mockFont[key];
});

import { setFontGlobalState } from "../components/fonts";

/** Build a fake paramReader whose read() returns `overrides[name]`, else "". */
const makeReader = (overrides: Record<string, unknown> = {}) => ({
  read: jest.fn((name: string) =>
    overrides[name] !== undefined ? overrides[name] : "",
  ),
});

describe("setFontGlobalState — fontKerning (T1)", () => {
  it("reads fontKerning into font.kerning", () => {
    const reader = makeReader({ fontKerning: "normal" });
    setFontGlobalState("1_1", reader);
    expect(mockFont.kerning).toBe("normal");
  });

  it("passes the fontKerning value through verbatim (e.g. 'none')", () => {
    const reader = makeReader({ fontKerning: "none" });
    setFontGlobalState("1_1", reader);
    expect(mockFont.kerning).toBe("none");
  });

  it("reads fontKerning from paramReader (not hardcoded)", () => {
    // Guards against an implementation that hardcodes "normal" instead of
    // forwarding the paramReader value. The glossary default ("normal") is
    // applied by paramReader itself, not by fonts.js.
    const reader = makeReader({ fontKerning: "auto" });
    setFontGlobalState("1_1", reader);
    expect(reader.read).toHaveBeenCalledWith("fontKerning", "1_1");
    expect(mockFont.kerning).toBe("auto");
  });
});

describe("setFontGlobalState — fontTextRendering", () => {
  it("reads fontTextRendering into font.textRendering", () => {
    const reader = makeReader({ fontTextRendering: "optimizeLegibility" });
    setFontGlobalState("1_1", reader);
    expect(reader.read).toHaveBeenCalledWith("fontTextRendering", "1_1");
    expect(mockFont.textRendering).toBe("optimizeLegibility");
  });

  it("defaults blank to 'auto' (browser/canvas default)", () => {
    const reader = makeReader({});
    setFontGlobalState("1_1", reader);
    expect(mockFont.textRendering).toBe("auto");
  });

  it("sets document.documentElement.style.textRendering (DOM cascade)", () => {
    const reader = makeReader({ fontTextRendering: "optimizeLegibility" });
    setFontGlobalState("1_1", reader);
    expect(
      (
        global as {
          document: { documentElement: { style: Record<string, string> } };
        }
      ).document.documentElement.style.textRendering,
    ).toBe("optimizeLegibility");
  });
});
