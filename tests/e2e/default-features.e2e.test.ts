/**
 * Browser default-on features — empirical verification of ALWAYS_ON_TAGS.
 *
 * The Rust baker filters features in ALWAYS_ON_TAGS from calt injection,
 * assuming browsers apply them by default. This test empirically verifies
 * that assumption by checking whether disabling/enabling features changes
 * DOM rendering width at 200px (amplifies sub-pixel differences).
 *
 * This bridges HarfBuzz ground truth to actual browser behavior (Problem 3):
 * if browser defaults match ALWAYS_ON_TAGS, the HarfBuzz no-op tests are
 * valid proxies.
 *
 * Run: npx playwright test tests/e2e/default-features.e2e.test.ts
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const PAGE = "/tests/e2e/pages/default-features-test.html";
const FONTS_DIR = path.join(__dirname, "..", "..", "examples", "fonts");
const FONT_REQUIRED = "IBMPlexSans.ttf";

test.describe("Browser default-on features match ALWAYS_ON_TAGS", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  // ── Tags IN ALWAYS_ON_TAGS: should be default-on ──────────────────────
  // Disabling them must change width (they were on by default).
  // liga: "fi" forms a ligature (567 units) vs two glyphs (574 units).
  // At 200px: ~1.4px difference — detectable above rounding noise.

  test("liga is default-on (disabling 'fi' changes width)", async ({
    page,
  }) => {
    test.skip(
      !fs.existsSync(path.join(FONTS_DIR, FONT_REQUIRED)),
      `${FONT_REQUIRED} not on disk`,
    );
    const r = JSON.parse(await page.evaluate(() => (window as any).runTest()));
    expect(Math.abs(r.fiLigaOff - r.fiBaseline)).toBeGreaterThan(0.5);
  });

  // ── Tags NOT in ALWAYS_ON_TAGS: should NOT be default-on ──────────────
  // Enabling them must change width (they were off by default).

  test("frac is NOT default-on (enabling changes width)", async ({ page }) => {
    test.skip(
      !fs.existsSync(path.join(FONTS_DIR, FONT_REQUIRED)),
      `${FONT_REQUIRED} not on disk`,
    );
    const r = JSON.parse(await page.evaluate(() => (window as any).runTest()));
    expect(Math.abs(r.f12FracOn - r.f12Baseline)).toBeGreaterThan(0.5);
  });

  test("ss01 is NOT default-on (enabling changes width)", async ({ page }) => {
    test.skip(
      !fs.existsSync(path.join(FONTS_DIR, FONT_REQUIRED)),
      `${FONT_REQUIRED} not on disk`,
    );
    const r = JSON.parse(await page.evaluate(() => (window as any).runTest()));
    // ss01 changes 'a' from 534→580 units; "aabc" has 2 a's → ~18px at 200px
    expect(Math.abs(r.aabcSs01On - r.aabcBaseline)).toBeGreaterThan(0.5);
  });
});
