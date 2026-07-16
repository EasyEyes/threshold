/**
 * bakeAllFonts per-source × per-settings parametrized matrix (Phase 4).
 *
 * Every (fontSource × settings) combination should either:
 *   - succeed with a baked FontFace, OR
 *   - fail LOUD (the failed font goes into getFailedFontNames() so the
 *     scheduler can mark its condition for skipBlock).
 *
 * No silent fallback to sans-serif. No per-condition fetch in production.
 */

import * as fs from "fs";
import * as path from "path";

// ── Stubs ──────────────────────────────────────────────────────────────────
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

jest.mock("../@rust/pkg/easyeyes_wasm.js", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeWasm = require("../@rust/pkg-node/easyeyes_wasm.js");
  // Track the WASM init call (wasm.default()) so tests can assert that
  // no-settings experiments NEVER pay the ~6.6MB WASM load.
  const initFn = jest.fn(async () => {});
  (global as { __wasmInitFn?: unknown }).__wasmInitFn = initFn;
  return { ...nodeWasm, default: initFn, __esModule: true };
});

// The mock factory sets __wasmInitFn lazily on first dynamic import (first
// initWasm). For no-settings tests the WASM is never imported, so the global
// may be unset — treat "unset" as "not called".
const wasmInitCalled = () => {
  const fn = (global as { __wasmInitFn?: jest.Mock }).__wasmInitFn;
  return fn ? fn.mock.calls.length > 0 : false;
};

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
    if (u === "typekit.json") {
      return new Response(JSON.stringify({ kitId: "abc123" }), {
        status: 200,
      });
    }
    if (u.endsWith(".css")) {
      return new Response(
        `@font-face { font-family: "adobe-font"; src: url(https://use.typekit.net/fonts/af.woff2) format("woff2"); }`,
        { status: 200 },
      );
    }
    if (u.startsWith("https://api.github.com/repos/google/fonts/contents/")) {
      // Synthetic Contents-API listing pointing at a variable font file
      // under ofl/. Mirrors the modern Inter/Roboto Flex pattern (only a
      // variable file ships on github.com/google/fonts for these families).
      const dirMatch = /\/contents\/ofl\/([^/?#]+)/.exec(u);
      const dirName = dirMatch ? dirMatch[1] : "unknown";
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
    return new Response(fontBytes, { status: 200 });
  }) as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = realFetch;
});

beforeEach(() => {
  (global as { document?: unknown }).document = {
    fonts: { add: jest.fn(), check: jest.fn(() => true) },
    createElement: jest.fn(() => ({ textContent: "", style: {} })),
    head: { appendChild: jest.fn() },
  } as unknown as typeof document;
});
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

import {
  bakeAllFonts,
  collectFontVariations,
  _resetBakeStateForTests,
} from "../components/fontInstancing";

beforeEach(() => {
  _resetBakeStateForTests();
  const fn = (global as { __wasmInitFn?: jest.Mock }).__wasmInitFn;
  if (fn) fn.mockClear();
});

const describeOrSkip = fontExists ? describe : describe.skip;

const SOURCES = ["file", "google", "adobe"];
const SETTINGS = [
  {
    label: "featureSettings",
    value: '"frac"',
    paramName: "fontFeatureSettings",
  },
  {
    label: "variableSettings",
    value: '"wght" 600',
    paramName: "fontVariableSettings",
  },
  {
    label: "stylisticSets",
    value: "ss01",
    paramName: "fontStylisticSets",
  },
];

describeOrSkip("bakeAllFonts — per-source × per-settings matrix (U1)", () => {
  for (const source of SOURCES) {
    for (const setting of SETTINGS) {
      it(`${source} + ${setting.label}: succeeds OR fails loud`, async () => {
        const reader = {
          read: jest.fn((name: string) => {
            if (name === "fontSource") return [source];
            if (name === "font")
              return [source === "adobe" ? "adobe-font" : "TestFont.ttf"];
            if (name === "conditionEnabledBool") return [true];
            if (name === "conditionTrials") return [1];
            if (name === "fontWeight") return [""];
            if (name === "fontVariableSettings")
              return [
                setting.paramName === "fontVariableSettings"
                  ? setting.value
                  : "",
              ];
            if (name === "fontStylisticSets")
              return [
                setting.paramName === "fontStylisticSets" ? setting.value : "",
              ];
            if (name === "fontFeatureSettings")
              return [
                setting.paramName === "fontFeatureSettings"
                  ? setting.value
                  : "",
              ];
            return "";
          }),
          blockCount: 1,
        };
        const result = await bakeAllFonts(reader as any);
        // Every cell must have a definitive outcome: either baked or failed.
        // No silent fallback (e.g., failed === 0 with baked === 0 is only
        // acceptable if no conditions needed baking — which is NOT the case
        // here since we set a setting).
        expect(result.baked + result.failed).toBeGreaterThanOrEqual(1);
        expect(result.baked).toBeGreaterThanOrEqual(1);
        expect(result.failed).toBe(0);
      });
    }
  }
});

describe("fontSource=browser + any setting: no runtime bake attempted (U2)", () => {
  it("browser + fontFeatureSettings: compile-time WARNING only; runtime skips", async () => {
    // browser fonts cannot be baked (no byte access). The runtime path
    // MUST NOT attempt a fetch for browser. The compile-time validator
    // emits a WARNING (we don't test that here — see
    // preprocess/experimentFileChecks.ts).
    const reader = {
      read: jest.fn((name: string) => {
        if (name === "fontSource") return ["browser"];
        if (name === "font") return ["Arial"];
        if (name === "conditionEnabledBool") return [true];
        if (name === "conditionTrials") return [1];
        if (name === "fontVariableSettings") return [""];
        if (name === "fontStylisticSets") return [""];
        if (name === "fontWeight") return [""];
        if (name === "fontFeatureSettings") return ['"frac"'];
        return "";
      }),
      blockCount: 1,
    };
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBe(0);
    expect(result.failed).toBe(0);
    // No fetch was attempted for browser.
    const calledUrls = (global.fetch as unknown as jest.Mock).mock.calls.map(
      (c) => String(c[0]),
    );
    expect(calledUrls.some((u) => u.includes("Arial"))).toBe(false);
  });
});

describe("non-user safety invariant: NO font settings → ZERO bake side effects", () => {
  // The vast majority of experiments never set fontFeatureSettings /
  // fontVariableSettings / fontStylisticSets. Our changes must be INVISIBLE
  // to them: no bake, no network fetch, no FontFace registration, and —
  // critically — no ~6.6MB WASM module load. This is the regression guard
  // against "did we add overhead/behavior for experiments that don't opt in?"
  const noSettingsReader = (source: string) => ({
    read: jest.fn((name: string) => {
      if (name === "fontSource") return [source];
      if (name === "font")
        return [source === "file" ? "TestFont.ttf" : "some-family"];
      if (name === "conditionEnabledBool") return [true];
      if (name === "conditionTrials") return [1];
      if (name === "fontVariableSettings") return [""];
      if (name === "fontStylisticSets") return [""];
      if (name === "fontWeight") return [""];
      if (name === "fontFeatureSettings") return [""];
      return "";
    }),
    blockCount: 1,
  });

  it.each(["file", "google", "adobe"])(
    "%s + no settings: no variations, no fetch, no FontFace, no WASM init",
    async (source) => {
      const reader = noSettingsReader(source);
      expect(collectFontVariations(reader as any)).toEqual([]);
      const result = await bakeAllFonts(reader as any);
      expect(result).toEqual({ baked: 0, failed: 0, failedNames: [] });
      // No network fetch at all.
      expect((global.fetch as unknown as jest.Mock).mock.calls).toEqual([]);
      // No FontFace registered.
      const fontsAdd = (
        global.document as unknown as { fonts: { add: jest.Mock } }
      ).fonts.add;
      expect(fontsAdd).not.toHaveBeenCalled();
      // No ~6.6MB WASM module load.
      expect(wasmInitCalled()).toBe(false);
    },
  );

  it("mixed experiment: settings block bakes, no-settings block is untouched", () => {
    // Block 1: google Inter + zero (settings → bake). Block 2: google Inter,
    // NO settings (raw via WebFont.load → must NOT be collected for bake).
    const reader = {
      read: jest.fn((name: string, blockIndex: number) => {
        if (name === "fontSource") return ["google"];
        if (name === "font") return ["Inter"];
        if (name === "conditionEnabledBool") return [true];
        if (name === "conditionTrials") return [1];
        if (name === "fontVariableSettings") return [""];
        if (name === "fontStylisticSets") return [""];
        if (name === "fontWeight") return [""];
        if (name === "fontFeatureSettings")
          return blockIndex === 1 ? ['"zero"'] : [""];
        return "";
      }),
      blockCount: 2,
    };
    const variations = collectFontVariations(reader as any);
    // Exactly ONE variation (block 1 only). Block 2 is not collected.
    expect(variations).toHaveLength(1);
    expect(variations[0].blockIndex).toBe(1);
    expect(variations[0].featureSettings).toBe('"zero"');
  });
});
