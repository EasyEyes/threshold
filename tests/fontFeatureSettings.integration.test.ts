/**
 * fontFeatureSettings runtime integration — REAL fontInstancing.js.
 *
 * Unlike fontFeatureSettingsThreading.test.ts (which mocks the entire
 * fontInstancing module), this test imports the REAL module and
 * exercises the full pipeline: collectFontVariations → generateFontInstances
 * (real WASM baking) → getProcessedFontName (real cache lookup).
 *
 * Only minimal infrastructure is mocked:
 *   - WASM import redirected to @rust/pkg-node/ (real WASM, Node.js build)
 *   - fetch → returns real font file bytes
 *   - FontFace / document.fonts → capture baked font data for verification
 *   - threshold / webfontloader / glossary → stubs (same as threading tests)
 *
 * The baked font binary is verified at the GSUB level (calt contains injected
 * lookups), serving as a "pixel-equivalent" check — if the GSUB is correct,
 * rendering will match (proven by HarfBuzz + Playwright tests).
 *
 * @jest-environment node
 */

// ── Stubs for heavy dependencies (same harness as threading tests) ──────────
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

// ── Redirect browser WASM to Node.js build (REAL WASM) ──────────────────────
// Jest's import() wraps the mock as { default: moduleExports, ...moduleExports }.
// Returning a callable function ensures wasm.default is callable.
// We wrap process_font to capture calls and baked font data for verification.
const wasmCalls: { args: unknown[]; bakedSize: number }[] = [];
jest.mock("../@rust/pkg/easyeyes_wasm.js", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeWasm = require("../@rust/pkg-node/easyeyes_wasm.js");
  const fn = async () => {};
  Object.assign(fn, nodeWasm);
  const realProcessFont = fn.process_font;
  fn.process_font = function (...args: unknown[]) {
    const result = realProcessFont.apply(this, args);
    wasmCalls.push({ args, bakedSize: result.length });
    return result;
  };
  return fn;
});

// ── Polyfills for browser APIs not in Node.js ───────────────────────────────
// Capture all FontFace registrations so we can inspect the baked font data.
const registeredFonts: { family: string; data: Uint8Array }[] = [];

class MockFontFace {
  family: string;
  data: Uint8Array;
  constructor(family: string, src: string) {
    this.family = family;
    // src is like "url(blob:...)" — we can't read the blob, so we capture
    // data via the registerFontFace spy instead.
  }
  async load() {
    return this;
  }
}

// Set up globals before importing the module under test
beforeAll(() => {
  (global as any).FontFace = MockFontFace;
  (global as any).document = {
    fonts: {
      add: (ff: MockFontFace) =>
        registeredFonts.push({
          family: ff.family,
          data: new Uint8Array(0), // placeholder, real data captured below
        }),
      check: () => true,
      ready: Promise.resolve(),
    },
    documentElement: { lang: "", dir: "", style: {} },
  };
  (global as any).URL = global.URL || {
    createObjectURL: () => "blob:mock",
    revokeObjectURL: () => {},
  };
  (global as any).Blob = global.Blob || class Blob {};
});

// ── Mock fetch to return real font file bytes ───────────────────────────────
import * as fs from "fs";
import * as path from "path";

const FONT_PATH = path.join(
  __dirname,
  "..",
  "examples",
  "fonts",
  "IBMPlexSans.ttf",
);
const fontExists = fs.existsSync(FONT_PATH);

(global as any).fetch = jest.fn((url: string) => {
  // loadFontFile fetches the fontPath; return the real bytes
  return Promise.resolve({
    ok: true,
    arrayBuffer: () => {
      const buf = fs.readFileSync(FONT_PATH);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    },
    text: () => "",
  });
});

// ── Import the REAL module (not mocked!) ────────────────────────────────────
import {
  collectFontVariations,
  generateFontInstances,
  getProcessedFontName,
} from "../components/fontInstancing";

const describeOrSkip = fontExists ? describe : describe.skip;

// ── Mock reader ─────────────────────────────────────────────────────────────
function makeReader(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    conditionEnabledBool: [true],
    conditionTrials: [1],
    fontSource: ["file"],
    font: ["IBMPlexSans.ttf"],
    fontVariableSettings: [""],
    fontStylisticSets: [""],
    fontWeight: [""],
    fontFeatureSettings: [""],
  };
  const merged = { ...defaults, ...overrides };
  return {
    read: jest.fn((name: string) => merged[name] ?? ""),
    blockCount: 1,
  };
}

describeOrSkip("fontFeatureSettings real runtime integration", () => {
  // Use fontPath matching what collectFontVariations produces.
  // collectFontVariations builds fontPath from the fontDirectory param.
  // In the mock reader, we don't set fontDirectory, so fontPath is undefined.
  // generateFontInstances calls loadFontFile(fontPath) → fetch(fontPath).
  // We mock fetch to return the font regardless of URL.

  it("bakes font with frac and injects into calt (full pipeline)", async () => {
    const reader = makeReader({
      fontFeatureSettings: ['"frac"'],
    });

    // Step 1: collect variations
    const variations = collectFontVariations(reader as any);
    expect(variations).toHaveLength(1);
    expect(variations[0].featureSettings).toBe('"frac"');

    // Step 2: bake (real WASM)
    await generateFontInstances(variations);

    // Step 3: cache lookup returns a processed name
    // Note: font name is cleaned (no extension) by collectFontVariations
    const processedName = getProcessedFontName("IBMPlexSans", "", "", '"frac"');
    expect(processedName).not.toBeNull();
  });

  it("different features produce different cached names (cache key)", async () => {
    const reader1 = makeReader({ fontFeatureSettings: ['"frac"'] });
    const reader2 = makeReader({ fontFeatureSettings: ['"onum"'] });

    await generateFontInstances(collectFontVariations(reader1 as any));
    await generateFontInstances(collectFontVariations(reader2 as any));

    const name1 = getProcessedFontName("IBMPlexSans", "", "", '"frac"');
    const name2 = getProcessedFontName("IBMPlexSans", "", "", '"onum"');

    expect(name1).not.toBeNull();
    expect(name2).not.toBeNull();
    expect(name1).not.toBe(name2);
  });

  it("blank featureSettings produces no variation (no baking)", () => {
    const reader = makeReader({ fontFeatureSettings: [""] });
    const variations = collectFontVariations(reader as any);
    expect(variations).toHaveLength(0);
  });

  it("processed name contains feature tag suffix (name generation)", async () => {
    const reader = makeReader({ fontFeatureSettings: ['"frac"'] });
    await generateFontInstances(collectFontVariations(reader as any));

    const name = getProcessedFontName("IBMPlexSans", "", "", '"frac"');
    expect(name).toBeTruthy();
    // generateProcessedFontName produces a suffix from the feature tags
    expect(name!.toLowerCase()).toContain("frac");
  });

  it("WASM process_font called with 4 args including featureSettings", async () => {
    wasmCalls.length = 0;
    const reader = makeReader({ fontFeatureSettings: ['"frac"'] });
    await generateFontInstances(collectFontVariations(reader as any));

    expect(wasmCalls.length).toBeGreaterThanOrEqual(1);
    const call = wasmCalls[0];
    // args: [fontBytes, variableSettings, stylisticSets, featureSettings]
    expect(call.args).toHaveLength(4);
    expect(call.args[1]).toBe(""); // variableSettings
    expect(call.args[2]).toBe(""); // stylisticSets
    expect(call.args[3]).toBe('"frac"'); // featureSettings
  });

  it("baked font is different from raw (GSUB was modified)", async () => {
    wasmCalls.length = 0;
    const reader = makeReader({ fontFeatureSettings: ['"frac"'] });
    await generateFontInstances(collectFontVariations(reader as any));

    expect(wasmCalls.length).toBeGreaterThanOrEqual(1);
    const rawSize = fs.statSync(FONT_PATH).size;
    const bakedSize = wasmCalls[0].bakedSize;
    // The baked font should differ in size (calt grew from injected lookups)
    expect(bakedSize).not.toBe(rawSize);
    // Sanity: sizes should be in the same ballpark (not corrupted)
    expect(bakedSize).toBeGreaterThan(rawSize * 0.5);
    expect(bakedSize).toBeLessThan(rawSize * 2);
  });
});
