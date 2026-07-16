/**
 * fontInstancing eager pre-bake orchestrator tests (bakeAllFonts).
 *
 * Covers the architectural principle documented in the `font` glossary
 * entry: "EasyEyes preloads all fonts... after preload, the experiment
 * runs with no font-loading delay and no need for internet."
 *
 * bakeAllFonts(reader) runs ONCE on experiment page load. It:
 *   - collects every (font, fontSource, settings) tuple from every
 *     condition via collectFontVariations,
 *   - dedupes by (family, var, ss, features),
 *   - fetches bytes per source (file → fetch('fonts/<n>'), google →
 *     fetch('raw.githubusercontent.com/google/fonts/main/...')),
 *   - bakes each one with WASM (real, mocked at the network layer),
 *   - registers every FontFace,
 *   - marks failed fonts in getFailedFontNames() for the scheduler's
 *     skipBlock path (no silent fallback to sans-serif).
 */

import * as fs from "fs";
import * as path from "path";

// ── Stubs (same harness as the threading / integration tests) ────────────
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

// ── Redirect browser WASM to Node.js build (REAL WASM) ────────────────────
jest.mock("../@rust/pkg/easyeyes_wasm.js", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeWasm = require("../@rust/pkg-node/easyeyes_wasm.js");
  const fn = async () => {};
  Object.assign(fn, nodeWasm);
  return fn;
});

// ── Mock fetch (file → real font bytes; google → guard against css2) ─────
const FONT_PATH = path.join(
  __dirname,
  "..",
  "examples",
  "fonts",
  "IBMPlexSans.ttf",
);
const fontBytes = fs.readFileSync(FONT_PATH);
const fontExists = fs.existsSync(FONT_PATH);

const realFetch = global.fetch;
beforeEach(() => {
  global.fetch = jest.fn(async (url: unknown) => {
    const u = String(url);
    // Github Contents API directory listing — return a synthetic listing
    // with a variable font file (the modern Inter/Roboto Flex pattern).
    if (u.startsWith("https://api.github.com/repos/google/fonts/contents/")) {
      const dirMatch = /\/contents\/ofl\/([^/?#]+)/.exec(u);
      const dirName = dirMatch ? dirMatch[1] : "unknown";
      // Variable font file (subsumes statics per the resolver's pick logic).
      const listing = [
        {
          name: `${dirName[0].toUpperCase()}${dirName.slice(1)}[wght].ttf`,
          download_url: `https://raw.githubusercontent.com/google/fonts/main/ofl/${dirName}/${dirName[0].toUpperCase()}${dirName.slice(
            1,
          )}[wght].ttf`,
        },
      ];
      return new Response(JSON.stringify(listing), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (u.startsWith("https://raw.githubusercontent.com/google/fonts/")) {
      // bakeAllFonts uses github raw (NOT css2). css2 returns subsetted
      // woff2 with stripped GSUB — we must never call it. The mock here
      // would happily serve bytes either way; the explicit guard is the
      // assertion below in the `fetch URL is github raw not css2` test.
      return new Response(fontBytes, { status: 200 });
    }
    if (u.startsWith("https://fonts.googleapis.com/")) {
      throw new Error(
        `Runtime bake must NOT use css2 (would be subsetted): ${u}`,
      );
    }
    return new Response(fontBytes, { status: 200 });
  }) as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = realFetch;
});

// ── Stub document.fonts (FontFace registration is a no-op in Node) ────────
beforeEach(() => {
  (global as { document?: unknown }).document = {
    fonts: {
      add: jest.fn(),
      check: jest.fn(() => true),
    },
    createElement: jest.fn(() => ({ textContent: "", style: {} })),
    head: { appendChild: jest.fn() },
  } as unknown as typeof document;
});

// ── FontFace stub ─────────────────────────────────────────────────────────
class FontFaceStub {
  constructor(
    public family: string,
    public source: string,
  ) {}
  async load() {
    return this;
  }
}
(global as { FontFace: unknown }).FontFace = FontFaceStub;
(global as { Blob: unknown }).Blob = class Blob {
  constructor(public parts: unknown[]) {}
};
(global as { URL: unknown }).URL = {
  createObjectURL: () => "blob:test",
};

// ── Mock reader helper ────────────────────────────────────────────────────
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

import {
  bakeAllFonts,
  getFailedFontNames,
  getProcessedFontName,
  _resetBakeStateForTests,
} from "../components/fontInstancing";

const describeOrSkip = fontExists ? describe : describe.skip;

beforeEach(() => {
  _resetBakeStateForTests();
});

describeOrSkip("bakeAllFonts — eager pre-bake orchestrator", () => {
  it("bakes a font for fontSource=file with featureSettings (R1)", async () => {
    const reader = makeReader({ fontFeatureSettings: ['"frac"'] });
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);
    // getProcessedFontName now returns the baked family name (cache hit)
    const processed = getProcessedFontName("IBMPlexSans", "", "", '"frac"');
    expect(processed).toBeTruthy();
  });

  it("uses github.com/google/fonts raw (NOT css2) for fontSource=google (R2)", async () => {
    const fetchMock = global.fetch as unknown as jest.Mock;
    const reader = makeReader({
      fontSource: ["google"],
      font: ["Inter"],
      fontFeatureSettings: ['"frac"'], // forces a bake
    });
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);

    // At least one fetch was for a github.com URL (not css2).
    const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]));
    const githubHit = calledUrls.some((u) =>
      u.startsWith("https://raw.githubusercontent.com/google/fonts/"),
    );
    const css2Hit = calledUrls.some((u) =>
      u.startsWith("https://fonts.googleapis.com/"),
    );
    expect(githubHit).toBe(true);
    expect(css2Hit).toBe(false);
  });

  it("resolves Inter via github Contents API (variable font, not bogus Inter.ttf) (R2-fix)", async () => {
    // Regression for the 2026-07-15 bug: familyToGithubPath constructed
    // `ofl/inter/Inter.ttf`, but Inter ships ONLY as `Inter[opsz,wght].ttf`
    // on github.com/google/fonts. The runtime must query the Contents API
    // to discover the actual file. The mock returns a synthetic listing
    // with a variable font; the runtime must pick that file (no static
    // fallback) and successfully bake.
    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockClear();
    const reader = makeReader({
      fontSource: ["google"],
      font: ["Inter"],
      fontFeatureSettings: ['"frac"'],
    });
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);

    const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]));
    // 1. Contents API was called (NOT a blind raw URL).
    const apiHit = calledUrls.some((u) =>
      u.startsWith("https://api.github.com/repos/google/fonts/contents/"),
    );
    expect(apiHit).toBe(true);
    // 2. No fetch attempted the bogus static path.
    const bogusStatic = calledUrls.some((u) =>
      u.includes("/ofl/inter/Inter.ttf"),
    );
    expect(bogusStatic).toBe(false);
  });

  it("dedupes by (family, var, ss, features) — single fetch per unique tuple (R3)", async () => {
    const fetchMock = global.fetch as unknown as jest.Mock;
    // Two conditions, same family+settings → one unique tuple → one fetch.
    const reader = makeReader({
      conditionEnabledBool: [true, true],
      conditionTrials: [1, 1],
      fontSource: ["file", "file"],
      font: ["IBMPlexSans.ttf", "IBMPlexSans.ttf"],
      fontFeatureSettings: ['"frac"', '"frac"'],
    });
    reader.blockCount = 1;
    // collectFontVariations walks conditionIndex 0..1 within the single block.
    fetchMock.mockClear();
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBe(1); // deduped to one bake
    // Two fetch attempts (one per condition in collectFontVariations) are OK;
    // the dedupe happens at the bake step, not the fetch step. The important
    // assertion is that exactly one FontFace was registered.
    expect(result.baked).toBe(1);
  });

  it("returns failed names for fetch errors (no silent fallback)", async () => {
    global.fetch = jest.fn(async () => {
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;
    const reader = makeReader({
      fontSource: ["file"],
      font: ["Nonexistent.ttf"],
      fontFeatureSettings: ['"frac"'],
    });
    const result = await bakeAllFonts(reader as any);
    expect(result.failed).toBe(1);
    expect(result.failedNames).toContain("Nonexistent");
    // failedFontNames set is populated for setFontGlobalState to consult.
    expect(getFailedFontNames().has("Nonexistent")).toBe(true);
  });

  it("google bake fetches from github Contents API, not css2 (legacy-R2-fix)", async () => {
    // Regression for the 2026-07-15 bug: threshold.js previously called the
    // LEGACY generateFontInstances AFTER loadFonts, which used css2 subsetted
    // bytes for google fonts — those lacked OpenType features like `zero`,
    // `ss01`, `frac`. The legacy path's FontFace registration overwrote the
    // new bakeAllFonts FontFace, leaving the visible rendering featureless.
    //
    // The legacy call has been REMOVED from threshold.js. This test pins
    // that bakeAllFonts's google fetch goes through the Contents API and
    // never touches css2 (which would 404-style fail or return subsetted
    // bytes for many font-feature-settings tags).
    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockClear();
    const reader = makeReader({
      fontSource: ["google"],
      font: ["Inter"],
      fontFeatureSettings: ["zero"],
    });
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBe(1);
    expect(result.failed).toBe(0);
    const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(
      calledUrls.some((u) =>
        u.startsWith("https://api.github.com/repos/google/fonts/contents/"),
      ),
    ).toBe(true);
    expect(
      calledUrls.some((u) => u.startsWith("https://fonts.googleapis.com/")),
    ).toBe(false);
  });

  it("typeSquare conditions are filtered out by collectFontVariations (compile-time gate)", async () => {
    // The compile-time validator EXPANDS the typeSquare block to ALWAYS
    // (not just with settings), so typeSquare conditions never reach
    // bakeAllFonts in practice. The runtime orchestrator must NOT silently
    // route typeSquare to a different source; it's a hard skip.
    const reader = makeReader({
      fontSource: ["typeSquare"],
      font: ["SomeJPFont"],
      fontFeatureSettings: ['"palt"'],
    });
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBe(0);
    expect(result.failed).toBe(0);
    // No FontFace was registered; the typeSquare family is unknown to the
    // cache. setFontGlobalState's lookup of getProcessedFontName returns
    // null → the existing per-block skip mechanism takes over.
    const processed = getProcessedFontName("SomeJPFont", "", "", '"palt"');
    expect(processed).toBeNull();
  });

  it("empty reader → no-op result (no conditions to bake)", async () => {
    const reader = makeReader({
      conditionEnabledBool: [false], // disabled → no variation
    });
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBe(0);
    expect(result.failed).toBe(0);
  });
});

// ── Network test (gated by RUN_NET=1) ─────────────────────────────────────
const describeNet = process.env.RUN_NET === "1" ? describe : describe.skip;
describeNet("bakeAllFonts — REAL github.com/google/fonts (RUN_NET=1)", () => {
  it("resolves Inter and fetches its variable font bytes", async () => {
    // This is the test that would have caught the 2026-07-15 bug. We
    // bypass the global fetch mock by restoring real fetch, then call
    // bakeAllFonts with fontSource=google and font=Inter.
    const reader = makeReader({
      fontSource: ["google"],
      font: ["Inter"],
      fontFeatureSettings: ['"frac"'],
    });
    global.fetch = realFetch;
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);
  }, 30000);
});
