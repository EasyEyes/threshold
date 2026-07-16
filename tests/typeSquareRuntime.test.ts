/**
 * typeSquare runtime bake tests (Phase 3) — DRAFT, gated.
 *
 * These tests are SKIPPED in this push because the runtime path is gated
 * behind `_typeSquareDistributionKey` (Denis's pending glossary add). When
 * Denis adds the param, flip the `describe.skip` to `describe` to enable
 * the runtime path AND these tests.
 *
 * Until then, the compile-time gate (see tests/typeSquareCompileGate.test.ts
 * and _typeSquareGate_t in preprocess/experimentFileChecks.ts) blocks
 * fontSource=typeSquare at compile time, so the runtime code path is
 * unreachable in production.
 *
 * To enable these tests, two things must happen:
 *   1. The Jest test environment needs @jest-environment jsdom (the
 *      typeSquare loader dance is browser-only — it injects script tags,
 *      adds probe elements to document.body, etc.).
 *   2. `describe.skip` → `describe`.
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
const fontExists = fs.existsSync(FONT_PATH);

const realFetch = global.fetch;
beforeEach(() => {
  global.fetch = jest.fn(async (url: unknown) => {
    const u = String(url);
    // Mock the typeSquare mkfont URL pattern with realistic bytes.
    if (u.includes("wf.typesquare.com/3/tsst/api/")) {
      return new Response(fontBytes, { status: 200 });
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
    head: { appendChild: jest.fn(), removeChild: jest.fn() },
    body: { appendChild: jest.fn(), removeChild: jest.fn() },
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
  // Mock window.Ts (the typeSquare loader object).
};

import {
  preloadTypeSquareFonts,
  installFetchInterceptor,
} from "../components/typeSquareLoader";

const describeOrSkip = fontExists ? describe.skip : describe.skip;

describeOrSkip("preloadTypeSquareFonts (loader dance — DRAFT, gated)", () => {
  it("installs a fetch interceptor that passes through non-tsst URLs", async () => {
    installFetchInterceptor();
    // A fetch to a non-typesquare URL should still work normally.
    const response = await fetch("https://example.com/foo.css");
    expect(response.ok).toBe(true);
  });

  it("fetches bytes for a single typeSquare family via mkfont interception", async () => {
    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockClear();
    const distributionKey = "TEST_DIST_KEY";
    const fontIds = ["Ryumin L-KL"];
    const result = await preloadTypeSquareFonts(distributionKey, fontIds);
    expect(result.size).toBe(1);
    expect(result.has("Ryumin L-KL")).toBe(true);

    const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]));
    const tsstHit = calledUrls.some((u) =>
      u.includes("wf.typesquare.com/3/tsst/api/"),
    );
    expect(tsstHit).toBe(true);
  });

  it("handles multiple families in parallel", async () => {
    const fontIds = ["Ryumin L-KL", "FutoMin A101", "Hiragino Mincho ProN"];
    const result = await preloadTypeSquareFonts("KEY", fontIds);
    expect(result.size).toBe(3);
    for (const id of fontIds) expect(result.has(id)).toBe(true);
  });

  it("per-family timeout: missing family → not in result map (no throw)", async () => {
    // Simulate a fetch that never returns for one of the families.
    global.fetch = jest.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes("fonts[id]=SlowFamily")) {
        // Never resolves — but our test harness awaits Promise.allSettled,
        // so the test itself doesn't hang.
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      return new Response(fontBytes, { status: 200 });
    }) as unknown as typeof fetch;
    const result = await preloadTypeSquareFonts("KEY", ["SlowFamily"], {
      timeoutMs: 100,
    });
    expect(result.size).toBe(0);
    // Caller checks: not in `results` means failed → mark conditions skipped.
  });

  it("partial success: some families work, others fail (no abort)", async () => {
    global.fetch = jest.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes("fonts[id]=MissingFamily")) {
        return new Response("not found", { status: 404 });
      }
      return new Response(fontBytes, { status: 200 });
    }) as unknown as typeof fetch;
    const result = await preloadTypeSquareFonts("KEY", [
      "WorkingFamily",
      "MissingFamily",
    ]);
    expect(result.has("WorkingFamily")).toBe(true);
    expect(result.has("MissingFamily")).toBe(false);
  });
});
