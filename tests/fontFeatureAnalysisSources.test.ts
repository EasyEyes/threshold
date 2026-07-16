/**
 * validateFontFeatureAnalysis — per-source coverage.
 *
 * Regression: the feature-existence validator used to do
 * `if (source !== "file") continue;`, so google and adobe conditions with
 * fontFeatureSettings were NEVER checked — a valid-but-absent feature (e.g.
 * "smcp" on a font that lacks it) slipped through compile and silently
 * no-opped at runtime. The validator now fetches google + open-source adobe
 * bytes from github and checks them too. browser / typeSquare are skipped
 * (not bakeable); paid adobe (not on github) is skipped.
 *
 * @jest-environment node
 */

import * as fs from "fs";
import * as path from "path";
import { loadGlossaryForTests } from "./helpers/glossary";
import { validateFontFeatureAnalysis } from "../preprocess/experimentFileChecks";
import {
  fetchAdobeOpenFontBytes,
  fetchGoogleFontBytes,
} from "../preprocess/fontFetch";

jest.mock("../preprocess/global", () => ({
  typekit: { kitId: "", fonts: new Map() },
}));
import { typekit } from "../preprocess/global";
const mockTypekit = typekit as unknown as {
  kitId: string;
  fonts: Map<string, string>;
};

const PLEX = fs.readFileSync(
  path.join(__dirname, "..", "examples", "fonts", "IBMPlexSans.ttf"),
);
const PLEX_AB = PLEX.buffer.slice(
  PLEX.byteOffset,
  PLEX.byteOffset + PLEX.byteLength,
) as ArrayBuffer;

beforeAll(async () => {
  await loadGlossaryForTests();
});

/** Minimal dataframe-js stand-in for getColumnValuesOrDefaults/getColumnValues. */
const makeDf = (cols: Record<string, string[]>) => {
  const names = Object.keys(cols);
  const rows = cols[names[0]]?.length ?? 0;
  return {
    listColumns: () => names,
    dim: () => [rows, names.length],
    select: (col: string) => ({
      toArray: () => (cols[col] ?? []).map((v) => [v]),
    }),
  };
};

const oneConditionDf = (fontSource: string, featureSettings: string) =>
  makeDf({
    font: ["SomeFont"],
    fontSource: [fontSource],
    fontFeatureSettings: [featureSettings],
  });

const setsDf = (fontSource: string, stylisticSets: string) =>
  makeDf({
    font: ["SomeFont"],
    fontSource: [fontSource],
    fontStylisticSets: [stylisticSets],
  });

/** Mock github so fetchGoogleFontBytes / fetchAdobeOpenFontBytes return PLEX. */
const installGithubMock = () => {
  global.fetch = jest.fn(async (url: unknown) => {
    const u = String(url);
    if (u.startsWith("https://api.github.com/repos/")) {
      const listing = [
        {
          name: "SomeFont[wght].ttf",
          download_url: "https://raw.example/SomeFont.ttf",
        },
      ];
      return new Response(JSON.stringify(listing), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (u.startsWith("https://raw.example/")) {
      return new Response(PLEX, { status: 200 });
    }
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
};

/** fontCache that serves PLEX for any file font name. */
const plexCache = {
  getFontData: async (names: string[]) =>
    names.map((name) => ({ name, data: PLEX_AB })),
};

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  mockTypekit.kitId = "";
  mockTypekit.fonts.clear();
});

/** Mock a Typekit kit whose CSS points at PLEX bytes (for paid-adobe tests). */
const installTypekitKitMock = (kitId: string, cssName: string) => {
  mockTypekit.kitId = kitId;
  const css = `@font-face { font-family: "${cssName}"; src: url(https://use.typekit.net/af/x/y/l?primer=abc&fvd=n4&v=3) format("woff2"); }`;
  global.fetch = jest.fn(async (url: unknown) => {
    const u = String(url);
    if (u.startsWith("https://api.github.com/repos/"))
      return new Response("nf", { status: 404 }); // paid font not on github
    if (u === `https://use.typekit.net/${kitId}.css`)
      return new Response(css, { status: 200 });
    if (u.startsWith("https://use.typekit.net/af/"))
      return new Response(PLEX, { status: 200 });
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
};

// IBMPlexSans has `zero` but NOT `smcp` (verified in fontFeatureAnalysis.test.ts).
describe("validateFontFeatureAnalysis — per-source coverage", () => {
  it("file: feature the font lacks (smcp) → error", async () => {
    const errs = await validateFontFeatureAnalysis(
      oneConditionDf("file", '"smcp"'),
      "node",
      undefined,
      undefined,
      plexCache as never,
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(JSON.stringify(errs[0])).toContain("smcp");
  });

  it("file: feature the font has (zero) → no error", async () => {
    const errs = await validateFontFeatureAnalysis(
      oneConditionDf("file", '"zero"'),
      "node",
      undefined,
      undefined,
      plexCache as never,
    );
    expect(errs).toEqual([]);
  });

  it("google: feature the font lacks (smcp) → error (fetched from github)", async () => {
    installGithubMock();
    const errs = await validateFontFeatureAnalysis(
      oneConditionDf("google", '"smcp"'),
      "node",
      undefined,
      undefined,
      plexCache as never,
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(JSON.stringify(errs[0])).toContain("smcp");
  });

  it("google: feature the font has (zero) → no error", async () => {
    installGithubMock();
    const errs = await validateFontFeatureAnalysis(
      oneConditionDf("google", '"zero"'),
      "node",
      undefined,
      undefined,
      plexCache as never,
    );
    expect(errs).toEqual([]);
  });

  it("adobe: feature the font lacks (smcp) → error (github mirror)", async () => {
    installGithubMock();
    const errs = await validateFontFeatureAnalysis(
      oneConditionDf("adobe", '"smcp"'),
      "node",
      undefined,
      undefined,
      plexCache as never,
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(JSON.stringify(errs[0])).toContain("smcp");
  });

  it("browser: skipped (not bakeable) even with settings → no error", async () => {
    const errs = await validateFontFeatureAnalysis(
      oneConditionDf("browser", '"smcp"'),
      "node",
      undefined,
      undefined,
      plexCache as never,
    );
    expect(errs).toEqual([]);
  });

  it("adobe github miss (paid font): skipped, no error, no crash", async () => {
    // github 404s everywhere → fetchAdobeOpenFontBytes returns null → skip.
    global.fetch = jest.fn(async () => new Response("nf", { status: 404 }));
    const errs = await validateFontFeatureAnalysis(
      oneConditionDf("adobe", '"smcp"'),
      "node",
      undefined,
      undefined,
      plexCache as never,
    );
    expect(errs).toEqual([]);
  });

  // fontStylisticSets (ss0X) are GSUB features too — same silent-no-op risk.
  // IBMPlexSans has ss01–ss06 but not ss20.
  it("fontStylisticSets only: google + ss20 (font lacks) → error", async () => {
    installGithubMock();
    const errs = await validateFontFeatureAnalysis(
      setsDf("google", "ss20"),
      "node",
      undefined,
      undefined,
      plexCache as never,
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(JSON.stringify(errs[0])).toContain("ss20");
  });

  it("fontStylisticSets only: google + ss01 (font has) → no error", async () => {
    installGithubMock();
    const errs = await validateFontFeatureAnalysis(
      setsDf("google", "ss01"),
      "node",
      undefined,
      undefined,
      plexCache as never,
    );
    expect(errs).toEqual([]);
  });

  it("fontStylisticSets only: file + ss20 (font lacks) → error", async () => {
    const errs = await validateFontFeatureAnalysis(
      setsDf("file", "ss20"),
      "node",
      undefined,
      undefined,
      plexCache as never,
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(JSON.stringify(errs[0])).toContain("ss20");
  });

  // Paid adobe: not on github, but processTypekitFonts already published a
  // kit this compile (typekit.kitId set), so the Typekit kit CSS yields the
  // full font for validation.
  it("adobe PAID (Typekit kit): feature the font lacks (smcp) → error", async () => {
    installTypekitKitMock("kit123", "SomeFont");
    const errs = await validateFontFeatureAnalysis(
      oneConditionDf("adobe", '"smcp"'),
      "node",
      undefined,
      undefined,
      plexCache as never,
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(JSON.stringify(errs[0])).toContain("smcp");
  });

  it("adobe PAID (Typekit kit): feature the font has (zero) → no error", async () => {
    installTypekitKitMock("kit123", "SomeFont");
    const errs = await validateFontFeatureAnalysis(
      oneConditionDf("adobe", '"zero"'),
      "node",
      undefined,
      undefined,
      plexCache as never,
    );
    expect(errs).toEqual([]);
  });

  it("adobe PAID: css_name from typekit.fonts map is used for the CSS lookup", async () => {
    // Kit CSS declares the css_name, not the table family name — the
    // validator must look up typekit.fonts[font] to find the right block.
    mockTypekit.fonts.set("SomeFont", "somefont-cssname");
    installTypekitKitMock("kit123", "somefont-cssname");
    const errs = await validateFontFeatureAnalysis(
      oneConditionDf("adobe", '"smcp"'),
      "node",
      undefined,
      undefined,
      plexCache as never,
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(JSON.stringify(errs[0])).toContain("smcp");
  });
});

const describeNet = process.env.RUN_NET === "1" ? describe : describe.skip;
describeNet("githubFontFetch — REAL github (RUN_NET=1)", () => {
  const isSfnt = (u8: Uint8Array) => {
    const m = Buffer.from(u8.slice(0, 4));
    return (
      m.equals(Buffer.from([0, 1, 0, 0])) ||
      m.toString() === "OTTO" ||
      m.toString() === "true"
    );
  };
  it("fetchGoogleFontBytes('Inter') → valid sfnt", async () => {
    const bytes = await fetchGoogleFontBytes("Inter");
    expect(bytes).not.toBeNull();
    expect(isSfnt(bytes!)).toBe(true);
  }, 30000);
  it("fetchAdobeOpenFontBytes('source-sans-pro') → valid sfnt", async () => {
    const bytes = await fetchAdobeOpenFontBytes("source-sans-pro");
    expect(bytes).not.toBeNull();
    expect(isSfnt(bytes!)).toBe(true);
  }, 30000);
  it("fetchAdobeOpenFontBytes(paid-only font) → null (skip, no crash)", async () => {
    // A Typekit-only family isn't on github.com/adobe-fonts → null.
    const bytes = await fetchAdobeOpenFontBytes("adobe-clean");
    expect(bytes).toBeNull();
  }, 30000);
});
