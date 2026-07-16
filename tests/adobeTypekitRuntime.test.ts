/**
 * Adobe Typekit runtime bake tests (Phase 2).
 *
 * Strategy: parse the CSS at https://use.typekit.net/<kitId>.css to find the
 * woff/woff2 URL for each font, fetch those bytes, and pipe them through
 * the same WASM bake path as file/google. Without this, fontFeatureSettings
 * + fontSource=adobe is silently ignored at runtime (the existing Typekit
 * path only registers the raw woff as a CSS @font-face, with no bake).
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

// ── WASM to Node ───────────────────────────────────────────────────────────
jest.mock("../@rust/pkg/easyeyes_wasm.js", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeWasm = require("../@rust/pkg-node/easyeyes_wasm.js");
  const fn = async () => {};
  Object.assign(fn, nodeWasm);
  return fn;
});

const FONT_PATH = path.join(
  __dirname,
  "..",
  "examples",
  "fonts",
  "IBMPlexSans.ttf",
);
const fontBytes = fs.readFileSync(FONT_PATH);

// Sample CSS from use.typekit.net. In reality Adobe serves a kit CSS with
// multiple @font-face blocks (one per family in the kit). For testing we
// fake a minimal CSS with a single @font-face pointing at a woff2 URL.
const SAMPLE_TYPEKIT_CSS = `
/* Typekit kit abc123 — auto-generated */
@font-face {
  font-family: "sample-kit-font";
  src: url(https://use.typekit.net/fonts/sample-font.woff2) format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
`;

const realFetch = global.fetch;
beforeEach(() => {
  global.fetch = jest.fn(async (url: unknown) => {
    const u = String(url);
    if (u === "typekit.json") {
      // Default: Typekit JSON exists (kitId=abc123) so the existing Typekit
      // tests still flow through use.typekit.net. The github-fallback tests
      // below override this mock to return 404 for typekit.json.
      return new Response(JSON.stringify({ kitId: "abc123" }), {
        status: 200,
      });
    }
    if (u.endsWith(".css")) {
      return new Response(SAMPLE_TYPEKIT_CSS, { status: 200 });
    }
    if (u.startsWith("https://api.github.com/repos/adobe-fonts/")) {
      // Synthetic Contents-API listing pointing at a Regular TTF. Mirror
      // the real adobe-fonts/source-sans/TTF/SourceSans3-Regular.ttf shape.
      const repoMatch = /\/repos\/adobe-fonts\/([^/]+)\/contents\/TTF/.exec(u);
      const repo = repoMatch ? repoMatch[1] : "unknown";
      const listing = [
        {
          name: "SampleFamily-Regular.ttf",
          download_url: `https://raw.githubusercontent.com/adobe-fonts/${repo}/release/TTF/SampleFamily-Regular.ttf`,
        },
      ];
      return new Response(JSON.stringify(listing), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (
      u.startsWith("https://raw.githubusercontent.com/adobe-fonts/") &&
      u.endsWith(".ttf")
    ) {
      return new Response(fontBytes, { status: 200 });
    }
    if (u.endsWith(".woff2") || u.endsWith(".woff")) {
      return new Response(fontBytes, { status: 200 });
    }
    return new Response("not found", { status: 404 });
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

function makeReader(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    conditionEnabledBool: [true],
    conditionTrials: [1],
    fontSource: ["adobe"],
    font: ["sample-kit-font"],
    fontVariableSettings: [""],
    fontStylisticSets: [""],
    fontWeight: [""],
    fontFeatureSettings: ['"frac"'],
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
  registerAdobeFontsFromGithubMirror,
  _resetBakeStateForTests,
} from "../components/fontInstancing";

beforeEach(() => {
  _resetBakeStateForTests();
});

describe("bakeAllFonts — adobe Typekit fallback (paid fonts github lacks)", () => {
  // GITHUB-FIRST ordering (2026-07-16): the bake prefers the FULL github
  // font (all GSUB features) because a Typekit kit woff2 is SUBSETTED and
  // can strip the very lookups a feature needs. Typekit is now the
  // FALLBACK, exercised only when github.com/adobe-fonts doesn't carry the
  // family (paid/closed-source fonts). These tests 404 github to force the
  // Typekit path.
  function installTypekitOnlyMock(cssResponse: () => Response) {
    global.fetch = jest.fn(async (url: unknown) => {
      const u = String(url);
      if (u === "typekit.json") {
        return new Response(JSON.stringify({ kitId: "abc123" }), {
          status: 200,
        });
      }
      // github has no listing for this (paid) family → 404.
      if (u.startsWith("https://api.github.com/repos/adobe-fonts/")) {
        return new Response(JSON.stringify({ message: "Not Found" }), {
          status: 404,
        });
      }
      if (u.endsWith(".css")) return cssResponse();
      if (u.endsWith(".woff2") || u.endsWith(".woff")) {
        return new Response(fontBytes, { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;
  }

  it("github miss → falls back to Typekit: parses kit CSS, fetches woff2, bakes", async () => {
    installTypekitOnlyMock(
      () => new Response(SAMPLE_TYPEKIT_CSS, { status: 200 }),
    );
    const fetchMock = global.fetch as unknown as jest.Mock;
    const reader = makeReader();
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);

    const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]));
    // github was tried FIRST (and 404'd).
    const githubHit = calledUrls.some((u) =>
      u.startsWith("https://api.github.com/repos/adobe-fonts/"),
    );
    expect(githubHit).toBe(true);
    // Then the Typekit kit CSS + woff2 were fetched.
    const cssHit = calledUrls.some(
      (u) => u.startsWith("https://use.typekit.net/") && u.endsWith(".css"),
    );
    expect(cssHit).toBe(true);
    const woffHit = calledUrls.some(
      (u) => u.endsWith(".woff2") || u.endsWith(".woff"),
    );
    expect(woffHit).toBe(true);
  });

  it("github miss + Typekit css fails → condition fails loud (no silent fallback)", async () => {
    installTypekitOnlyMock(() => new Response("not found", { status: 404 }));
    const reader = makeReader();
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBe(0);
    expect(result.failed).toBe(1);
    expect(getFailedFontNames().has("sample-kit-font")).toBe(true);
  });
});

describe("bakeAllFonts — adobe github-first (open-source, preferred)", () => {
  // GITHUB-FIRST (2026-07-16): for open-source Adobe fonts the bake uses the
  // FULL github.com/adobe-fonts font (all GSUB features) — even when
  // typekit.json exists. This is the primary path for Source Sans/Serif/Code
  // Pro (no kit-config step, always the complete font). Typekit is only the
  // fallback for paid fonts github lacks — and those kits are created with
  // subset=all (preprocess/fontCheck.ts), so the kit woff2 is also full.
  // (Originally added 2026-07-15 as a fallback for missing typekit.json;
  // promoted to primary on 2026-07-16.)
  function installGithubFallbackMock(familyName: string) {
    global.fetch = jest.fn(async (url: unknown) => {
      const u = String(url);
      if (u === "typekit.json")
        return new Response("not found", { status: 404 });
      if (u.startsWith("https://use.typekit.net/"))
        return new Response("not found", { status: 404 });
      if (u.startsWith("https://api.github.com/repos/adobe-fonts/")) {
        // Generate a family-stem matching the requested family (lower-cased
        // no-hyphens, with version suffix stripped — mirrors adobe-fonts repos).
        const stem =
          familyName
            .replace(/-pro$/, "")
            .split("-")
            .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
            .join("")
            .replace(/[^A-Za-z0-9]/g, "") + "Family";
        const listing = [
          {
            name: `${stem}-Regular.ttf`,
            download_url: `https://raw.githubusercontent.com/adobe-fonts/x/release/TTF/${stem}-Regular.ttf`,
          },
          {
            name: `${stem}-Bold.ttf`,
            download_url: `https://raw.githubusercontent.com/adobe-fonts/x/release/TTF/${stem}-Bold.ttf`,
          },
        ];
        return new Response(JSON.stringify(listing), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (u.endsWith(".ttf")) return new Response(fontBytes, { status: 200 });
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;
  }

  it("open-source font bakes from github Contents API (primary path)", async () => {
    installGithubFallbackMock("source-sans-pro");
    const fetchMock = global.fetch as unknown as jest.Mock;
    const reader = makeReader({
      font: ["source-sans-pro"],
      fontFeatureSettings: ['"frac"'],
    });
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);

    const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]));
    // 1. Contents API was queried for at least one repo candidate.
    const apiHit = calledUrls.some((u) =>
      u.startsWith("https://api.github.com/repos/adobe-fonts/"),
    );
    expect(apiHit).toBe(true);
    // 2. A raw github URL was fetched (the bytes we bake).
    const rawHit = calledUrls.some((u) =>
      u.startsWith("https://raw.githubusercontent.com/adobe-fonts/"),
    );
    expect(rawHit).toBe(true);
    // 3. NO call to use.typekit.net (no kitId in this test).
    const typekitHit = calledUrls.some((u) =>
      u.startsWith("https://use.typekit.net/"),
    );
    expect(typekitHit).toBe(false);
  });

  it("github primary even when typekit.json absent (source-serif-pro)", async () => {
    installGithubFallbackMock("source-serif-pro");
    const reader = makeReader({
      font: ["source-serif-pro"],
      fontFeatureSettings: ['"frac"'],
    });
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);
  });

  it("unknown adobe family → fails loud (no silent fallback to sans-serif)", async () => {
    // Use the github-fallback mock (returns 404 for adobe-fonts repos because
    // the family name doesn't match any known repo).
    global.fetch = jest.fn(async (url: unknown) => {
      const u = String(url);
      if (u === "typekit.json")
        return new Response("not found", { status: 404 });
      if (u.startsWith("https://use.typekit.net/"))
        return new Response("not found", { status: 404 });
      if (u.startsWith("https://api.github.com/repos/adobe-fonts/"))
        return new Response(JSON.stringify({ message: "Not Found" }), {
          status: 404,
        });
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;
    const reader = makeReader({
      font: ["nonexistent-adobe-font-xyzzy"],
      fontFeatureSettings: ['"frac"'],
    });
    const result = await bakeAllFonts(reader as any);
    expect(result.baked).toBe(0);
    expect(result.failed).toBe(1);
    expect(getFailedFontNames().has("nonexistent-adobe-font-xyzzy")).toBe(true);
  });
});

describe("registerAdobeFontsFromGithubMirror — dev fallback (no typekit.json)", () => {
  // Regression for 2026-07-16: adobe CONTROL blocks (no fontFeatureSettings)
  // rendered in the browser default serif in local dev. Their font comes from
  // WebFont.load({typekit}), which only runs when typekit.json exists
  // (production). In dev nothing registered the raw family → serif fallback.
  // This function registers the RAW font (original family name, no bake)
  // from the github.com/adobe-fonts mirror.
  function installGithubMock() {
    global.fetch = jest.fn(async (url: unknown) => {
      const u = String(url);
      if (u.startsWith("https://api.github.com/repos/adobe-fonts/")) {
        const listing = [
          {
            name: "SampleFamily-Regular.ttf",
            download_url:
              "https://raw.githubusercontent.com/adobe-fonts/x/release/TTF/SampleFamily-Regular.ttf",
          },
        ];
        return new Response(JSON.stringify(listing), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (u.endsWith(".ttf")) return new Response(fontBytes, { status: 200 });
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;
  }

  it("registers a FontFace under the ORIGINAL family name (no bake)", async () => {
    installGithubMock();
    const fontsAdd = (
      global.document as unknown as { fonts: { add: jest.Mock } }
    ).fonts.add;
    fontsAdd.mockClear();
    const registered = await registerAdobeFontsFromGithubMirror([
      "source-sans-pro",
    ]);
    expect(registered).toEqual(["source-sans-pro"]);
    expect(fontsAdd).toHaveBeenCalledTimes(1);
    const face = fontsAdd.mock.calls[0][0] as { family: string };
    // Original family name — NOT a baked "-frac"-style name.
    expect(face.family).toBe("source-sans-pro");
  });

  it("registers each family independently; one failure doesn't block others", async () => {
    global.fetch = jest.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes("/source-sans/")) {
        const listing = [
          {
            name: "SampleFamily-Regular.ttf",
            download_url:
              "https://raw.githubusercontent.com/adobe-fonts/x/release/TTF/SampleFamily-Regular.ttf",
          },
        ];
        return new Response(JSON.stringify(listing), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (u.endsWith(".ttf")) return new Response(fontBytes, { status: 200 });
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const registered = await registerAdobeFontsFromGithubMirror([
      "source-sans-pro", // resolves via adobe-fonts/source-sans
      "nonexistent-xyzzy", // 404 everywhere
    ]);
    expect(registered).toEqual(["source-sans-pro"]);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

const describeNet = process.env.RUN_NET === "1" ? describe : describe.skip;
describeNet(
  "bakeAllFonts — adobe REAL github.com/adobe-fonts (RUN_NET=1)",
  () => {
    it("resolves source-sans-pro via github Contents API and fetches ttf bytes", async () => {
      // Regression test: the adobe-fonts path was added 2026-07-15 to remove
      // the "must have a real Typekit kit" dev-friction. This test exercises
      // the full path against the real github API. Without RUN_NET=1 it
      // skips; with RUN_NET=1 it fetches ~430KB from github and bakes.
      const reader = makeReader({
        font: ["source-sans-pro"],
        fontFeatureSettings: ['"frac"'],
      });
      global.fetch = realFetch;
      const result = await bakeAllFonts(reader as any);
      expect(result.baked).toBeGreaterThanOrEqual(1);
      expect(result.failed).toBe(0);
    }, 30000);
  },
);
