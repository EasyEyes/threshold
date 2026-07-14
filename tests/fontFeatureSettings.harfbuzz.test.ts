/**
 * CSS faithfulness — HarfBuzz ground truth.
 *
 * Proves that baking feature settings into the GSUB produces the same
 * text shaping as CSS `font-feature-settings` on the raw font.
 *
 * HarfBuzz shapes text at the GSUB level — the same level used by both
 * DOM and canvas. If the baked font's HarfBuzz output matches the raw
 * font + feature toggle, the baker is faithful to CSS at the shaping level.
 *
 * This is the fastest and most definitive faithfulness check. The
 * Playwright test (featureSettings-css-faithfulness.e2e.test.ts) adds
 * browser-level rendering verification on top of this.
 *
 * @jest-environment node
 */

import * as path from "path";
import { findHbShape, shape, describeWithHarfbuzz } from "./helpers/harfbuzz";
import { bakeFontToTemp, cleanupTempFonts } from "./helpers/wasm-baker";

const FONTS_DIR = path.resolve(__dirname, "../examples/fonts");

const HB_SHAPE = findHbShape();

interface TestCase {
  name: string;
  font: string;
  text: string;
  features: string;
  /** If true, the feature should have NO effect (no-op). */
  noop?: boolean;
}

const TEST_CASES: TestCase[] = [
  // ── IBMPlexSans: Latin ligatures ──────────────────────────────────────
  {
    name: "plex-liga-off",
    font: "IBMPlexSans.ttf",
    text: "fi fl ffi",
    features: '"liga" 0',
  },
  {
    name: "plex-liga-on",
    font: "IBMPlexSans.ttf",
    text: "fi fl ffi",
    features: '"liga" 1',
    noop: true,
  },
  {
    name: "plex-calt-off",
    font: "IBMPlexSans.ttf",
    text: "friction",
    features: '"calt" 0',
  },
  {
    name: "plex-frac",
    font: "IBMPlexSans.ttf",
    text: "1/2 3/4",
    features: '"frac"',
  },
  {
    name: "plex-onum",
    font: "IBMPlexSans.ttf",
    text: "0123456789",
    features: '"onum"',
  },
  {
    name: "plex-liga-calt-off",
    font: "IBMPlexSans.ttf",
    text: "fi fl ffi",
    features: '"liga" 0, "calt" 0',
  },

  // ── Inter: stylistic alternates ───────────────────────────────────────
  { name: "inter-zero", font: "InterFull.ttf", text: "0O", features: '"zero"' },
  {
    name: "inter-cv11",
    font: "InterFull.ttf",
    text: "aabc",
    features: '"cv11"',
  },

  // ── Spectral: small caps + ligatures ──────────────────────────────────
  {
    name: "spectral-smcp",
    font: "Spectral-Regular.ttf",
    text: "Hello World",
    features: '"smcp"',
  },
  {
    name: "spectral-dlig",
    font: "Spectral-Regular.ttf",
    text: "fi fl",
    features: '"dlig"',
  },
  {
    name: "spectral-hist",
    font: "Spectral-Regular.ttf",
    text: "sh",
    features: '"hist"',
  },

  // ── NotoNastaliqUrdu: Arabic ──────────────────────────────────────────
  {
    name: "nastaliq-rlig-off",
    font: "NotoNastaliqUrdu.ttf",
    text: "السلام عليكم",
    features: '"rlig" 0',
  },
  {
    name: "nastaliq-init-off",
    font: "NotoNastaliqUrdu.ttf",
    text: "السلام",
    features: '"init" 0',
  },
  {
    name: "nastaliq-all-on-noop",
    font: "NotoNastaliqUrdu.ttf",
    text: "السلام",
    features: '"init, medi, fina, isol, rlig, ccmp"',
    noop: true,
  },
  {
    name: "nastaliq-ccmp-off",
    font: "NotoNastaliqUrdu.ttf",
    text: "السلام",
    features: '"ccmp" 0',
  },

  // ── Amiri: Arabic ─────────────────────────────────────────────────────
  // ── Amiri: Arabic ─────────────────────────────────────────────────────
  // Amiri has 8 Arabic-specific off-by-default stylistic sets.
  // This demonstrates the baker's value for Arabic/Persian typography.
  {
    name: "amiri-ss04",
    font: "Amiri-Regular.ttf",
    text: "ک",
    features: '"ss04"',
  },
  {
    name: "amiri-ss08",
    font: "Amiri-Regular.ttf",
    text: "،",
    features: '"ss08"',
  },
  {
    name: "amiri-ss04-ss08",
    font: "Amiri-Regular.ttf",
    text: "،ک",
    features: '"ss04, ss08"',
  },
  // pnum: proportional numbers — NOT a stylistic set, only fontFeatureSettings
  // can enable this. Digits change from tabular (uniform width) to proportional.
  {
    name: "amiri-pnum",
    font: "Amiri-Regular.ttf",
    text: "١٢٣٤٥",
    features: '"pnum"',
  },
  // ── Gulzar: Nastaliq (Urdu) ────────────────────────────────────────────
  // Gulzar is a Nastaliq font with off-by-default features. tnum makes
  // embedded Latin digits tabular (uniform width) for column alignment.
  {
    name: "gulzar-tnum",
    font: "Gulzar-Regular.ttf",
    text: "012345",
    features: "tnum",
  },
  {
    name: "gulzar-onum",
    font: "Gulzar-Regular.ttf",
    text: "012345",
    features: "onum",
  },
  // ── Fira Sans: calt disable regression ────────────────────────────────
  // Fira Sans calt turns '#&' into a fancy ampersand (ampersand.ss03).
  // This is one of the few Latin fonts where calt has a visible effect.
  // Regression test for the calt-disable bug (disable check must come
  // before the calt injection-point special case in build_modified_gsub).
  {
    name: "fira-calt-off",
    font: "FiraSans.ttf",
    text: "#&",
    features: '"calt" 0',
  },

  {
    name: "amiri-rlig-off",
    font: "Amiri-Regular.ttf",
    text: "السلام",
    features: '"rlig" 0',
  },
];

describeWithHarfbuzz("CSS faithfulness — HarfBuzz ground truth", () => {
  afterAll(() => cleanupTempFonts());

  it.each(TEST_CASES)(
    "$name: baked font shapes identically to raw+CSS",
    (tc: TestCase) => {
      const fontPath = path.join(FONTS_DIR, tc.font);
      const fs = require("fs");
      if (!fs.existsSync(fontPath)) {
        console.warn(`SKIP: ${tc.font} not found`);
        return;
      }

      // Baseline: raw font with no features (to detect no-ops)
      const baselineShaping = shape(HB_SHAPE!, fontPath, tc.text);

      // Ground truth: raw font + CSS feature toggle.
      // For no-op cases (enabling default-on features), the ground truth
      // is the baseline (no features), because HarfBuzz applies always-on
      // features in a specific pipeline order — listing them in --features
      // would change the order and produce different shaping.
      const cssShaping = tc.noop
        ? baselineShaping
        : shape(HB_SHAPE!, fontPath, tc.text, tc.features);

      // Our baker: bake features into GSUB, shape without --features
      const bakedPath = bakeFontToTemp(fontPath, tc.features);
      const bakedShaping = shape(HB_SHAPE!, bakedPath, tc.text);

      // The baked font must match the CSS ground truth
      expect(bakedShaping).toBe(cssShaping);

      // For no-op cases, the feature should not change shaping
      if (tc.noop) {
        expect(cssShaping).toBe(baselineShaping);
      }
    },
  );
});
