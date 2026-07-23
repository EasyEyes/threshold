/**
 * fontVariantLigatures CSS faithfulness — DOM (CSS font-variant-ligatures)
 * vs canvas (font baked via the PRODUCTION keyword→tag translation).
 *
 * Strong-signal test for Phase 3: the DOM span renders the raw font with the
 * CSS `font-variant-ligatures` property (ground truth); the canvas renders
 * the font baked by process_font with the string our translation module
 * produces from the same keywords. If the keyword→tag map were wrong
 * (e.g. dlig→hlig), the widths would diverge.
 *
 * Two fonts, exercising enable, disable, and no-op paths:
 *   - Spectral: dlig ligation of Th/ct/st/sp (type-4 lookups)
 *   - Inter: dlig interrobang from "?!" (type-6 chained + type-4)
 *   - Spectral: no-common-ligatures disables default-on liga (fi fl)
 *
 * Run: npx playwright test tests/e2e/variantLigatures-css-faithfulness.e2e.test.ts
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const PAGE = "/tests/e2e/pages/render-compare.html";
const FONT_BASE = "/examples/fonts";
const FONTS_DIR = path.join(__dirname, "..", "..", "examples", "fonts");
const fontExists = (f: string) => fs.existsSync(path.join(FONTS_DIR, f));

interface LigatureCase {
  name: string;
  font: string;
  text: string;
  ligatures: string;
  /** Should the keywords change rendering vs the un-baked baseline? */
  expectEffect: boolean;
}

const CASES: LigatureCase[] = [
  // ── Enable: discretionary ligatures ───────────────────────────────────
  {
    name: "spectral-dlig-on",
    font: "Spectral-Regular.ttf",
    text: "Th ct st sp",
    ligatures: "discretionary-ligatures",
    expectEffect: true,
  },
  {
    name: "inter-dlig-on",
    font: "InterFull.ttf",
    text: "?!",
    ligatures: "discretionary-ligatures",
    expectEffect: true,
  },

  // ── Disable: default-on common ligatures off ──────────────────────────
  // IBM Plex Sans fi ligature is NOT advance-preserving (567 vs 574 units),
  // so 5 repetitions give a ~1.4px width signal. (Spectral's ligatures are
  // all advance-preserving — width cannot discriminate liga on/off there.)
  {
    name: "plex-liga-off",
    font: "IBMPlexSans.ttf",
    text: "fi fi fi fi fi",
    ligatures: "no-common-ligatures",
    expectEffect: true,
  },

  // ── No-op: normal = browser/font defaults ─────────────────────────────
  {
    name: "spectral-normal-noop",
    font: "Spectral-Regular.ttf",
    text: "fi fl",
    ligatures: "normal",
    expectEffect: false,
  },
];

test.describe("fontVariantLigatures — canvas (translated+baked) vs DOM (CSS)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  for (const tc of CASES) {
    test(`${tc.name}: canvas == DOM CSS`, async ({ page }) => {
      test.skip(!fontExists(tc.font), `${tc.font} not on disk`);
      const config = {
        fontUrl: `${FONT_BASE}/${tc.font}`,
        rawFamily: `Raw-${tc.name}`,
        bakedFamily: `Baked-${tc.name}`,
        text: tc.text,
        ligatures: tc.ligatures,
        lang: "en",
        direction: "ltr",
        fontSize: 40,
      };

      const result = await page.evaluate(
        (cfg) => (window as any).runComparison(cfg),
        config,
      );

      // Core assertion: canvas width (translated+baked) ≈ DOM width (CSS)
      expect(result.widthMatch).toBe(true);
      // Strong signal: the keywords did (or did not) change rendering
      expect(result.featureHadEffect).toBe(tc.expectEffect);
    });
  }
});
