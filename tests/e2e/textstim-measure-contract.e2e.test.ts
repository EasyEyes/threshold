/**
 * Contract test: TextStim.measureText (tight) ≡ getBoundingBox(true).width
 *
 * The reading-pagination probe (components/readingAddons.js) measures line
 * widths via the cheap TextStim.measureText instead of
 * setText + getBoundingBox(true) (~2ms/probe). Both paths share
 * _getBoundingBoxCtx inside TextStim, so the measurements are identical by
 * construction — this test pins that equivalence empirically across fonts,
 * scripts, directions, and letterSpacing, inside the REAL app environment
 * (a compiled experiment page with its Window, renderer, and fonts), so a
 * future TextStim change that breaks it fails in CI.
 *
 * Uses the ?textStimContract hook in threshold.js (inert otherwise).
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const EXPERIMENT = "/examples/generated/gpos-features-test/index.html";
const FONT_BASE = "/examples/fonts";

const FONT_FILES = {
  plex: "IBMPlexSans.ttf",
  spectral: "Spectral-Regular.ttf",
  amiri: "Amiri-Regular.ttf",
  gulzar: "Gulzar-Regular.ttf",
};

const fontExists = (file: string) =>
  fs.existsSync(path.join(__dirname, "..", "..", FONT_BASE, file));

const STRINGS = [
  "AV To Yo WAV fi fl ffi",
  "office flags fluff", // ligature-rich
  "بِسْمِ اللَّهِ الرَّحْمَٰنِ", // Arabic + diacritics
  "کے بعد کے", // Nastaliq Urdu
  "The quick brown fox, jumps!",
];

test.describe("TextStim measurement contract", () => {
  test("cheap probe ≡ authoritative tight bounding box", async ({ page }) => {
    const present = Object.entries(FONT_FILES).filter(([, f]) => fontExists(f));
    test.skip(present.length === 0, "no test fonts on disk");
    test.skip(
      !fs.existsSync(
        path.join(
          __dirname,
          "..",
          "..",
          "examples/generated/gpos-features-test/index.html",
        ),
      ),
      "gpos-features-test not compiled (run npm run examples)",
    );

    // simulateParticipantBool lets the app boot unattended; the contract hook
    // is what we're actually here for.
    await page.goto(
      `${EXPERIMENT}?textStimContract=1&simulateParticipantBool=true&seed=1`,
    );
    await page.waitForFunction(
      () => typeof (window as any).__textStimContract === "function",
      null,
      { timeout: 60000 },
    );

    const cases = [];
    for (const [family, file] of present) {
      for (const text of STRINGS) {
        const rtl = /[؀-ۿ]/.test(text);
        for (const letterSpacing of [0, 4]) {
          cases.push({
            font: family,
            fontUrl: `${FONT_BASE}/${file}`,
            text,
            letterSpacing,
            direction: rtl ? "rtl" : "ltr",
            language: rtl ? (family === "gulzar" ? "ur" : "ar") : "en",
          });
        }
      }
    }

    const results = await page.evaluate(
      (c) => (window as any).__textStimContract(c),
      cases,
    );

    const failures = results.filter((r: any) => r.diff > 0.01);
    expect(
      failures,
      `probe/authoritative mismatches:\n${failures
        .map(
          (f: any) =>
            `  ${f.font} "${f.text.slice(0, 24)}" ls=${f.letterSpacing} ${
              f.direction
            }: cheap=${f.cheap} vs tight=${f.authoritative} (diff ${f.diff})`,
        )
        .join("\n")}`,
    ).toEqual([]);
  });
});
