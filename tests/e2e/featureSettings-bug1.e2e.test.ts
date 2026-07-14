/**
 * Bug 1 RED test — TextStim rendering path: ALL-ON double-firing.
 *
 * When fontFeatureSettings enables features that are ALREADY default-on (in the
 * GSUB LangSys), the baker injects their lookups into calt, causing them to
 * fire TWICE. This is idempotent without ctx.lang, but when ctx.lang="ar"
 * activates the locl feature, the alternate glyph forms make the double-firing
 * non-idempotent, producing visibly different (compacted) rendering.
 *
 * This test uses the EXACT TextStim rendering path:
 *   PIXI.Text + canvasContextState (applyDirectionAcrossResizes, etc.)
 *   + ctx.lang="ar" + ctx.direction="rtl" + pixi.updateText(true)
 *
 * DESIRED: ALL-ON renders identically to RAW (totalDiff === 0).
 * CURRENT: FAILS — ALL-ON produces different rendering (compaction + artifacts).
 *
 * Run: npx playwright test tests/fontFeatureSettings.bug1.e2e.test.ts
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const TEST_PAGE = "/tests/e2e/pages/featureSettings-bug1.html";
const FONTS_DIR = path.join(__dirname, "..", "..", "examples", "fonts");
const FONT_REQUIRED = "NotoNastaliqUrdu.ttf";

test.describe("Bug 1: TextStim rendering — ALL-ON must equal RAW", () => {
  test("enabling default-on features is a no-op (0 pixel diff)", async ({
    page,
  }) => {
    test.skip(
      !fs.existsSync(path.join(FONTS_DIR, FONT_REQUIRED)),
      `${FONT_REQUIRED} not on disk`,
    );
    await page.goto(TEST_PAGE);

    // Wait for the test to complete (window.__testResult is set)
    await page.waitForFunction(() => window.__testResult !== undefined, {
      timeout: 30000,
    });

    const result = await page.evaluate(() => window.__testResult);

    // The test page reports any errors
    expect(result.error).toBeUndefined();

    // DESIRED behavior: totalDiff === 0
    // This assertion FAILS (RED) on current code because the baker
    // injects default-on features into calt, causing double-firing.
    expect(result.totalDiff).toBe(0);

    // When this test passes (after the fix), verify the details
    if (result.totalDiff === 0) {
      for (const line of result.perLine) {
        expect(line.diff).toBe(0);
        expect(line.widthDiff).toBe(0);
      }
    }
  });
});
