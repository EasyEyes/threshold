/**
 * WASM font baker utilities for Node.js tests.
 *
 * Wraps the committed browser Rust WASM baker
 * for use in Jest tests. Provides a simple API to bake fonts with feature
 * settings, variable settings, and stylistic sets.
 *
 * General-purpose: usable for any test that needs a baked font file.
 *
 * The helper initializes the committed @rust/pkg artifact; no second Rust build is needed.
 */

import * as fs from "fs";
import * as path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const wasm = require("./nodeWasm.cjs");

const TMP_DIR = "/tmp/easyeyes-bake-test";

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

/**
 * Bake a font with feature settings.
 * @param fontPath Path to the raw font file
 * @param features Feature settings string (e.g., '"liga" 0, "smcp"')
 * @param variableSettings Variable font settings (optional)
 * @param stylisticSets Stylistic sets (optional)
 * @returns Baked font as a Buffer
 */
export function bakeFont(
  fontPath: string,
  features: string,
  variableSettings: string = "",
  stylisticSets: string = "",
): Buffer {
  const raw = new Uint8Array(fs.readFileSync(fontPath));
  const baked = wasm.process_font(
    raw,
    variableSettings,
    stylisticSets,
    features,
  );
  return Buffer.from(baked);
}

/**
 * Bake a font and save to a temp file.
 * @returns Path to the baked font file
 */
export function bakeFontToTemp(
  fontPath: string,
  features: string,
  variableSettings: string = "",
  stylisticSets: string = "",
): string {
  const baked = bakeFont(fontPath, features, variableSettings, stylisticSets);
  const bakedPath = path.join(
    TMP_DIR,
    `baked-${path.basename(fontPath)}-${Date.now()}.ttf`,
  );
  fs.writeFileSync(bakedPath, baked);
  return bakedPath;
}

/**
 * Bake a font and save to a specific path.
 */
export function bakeFontTo(
  fontPath: string,
  features: string,
  outputPath: string,
  variableSettings: string = "",
  stylisticSets: string = "",
): string {
  const baked = bakeFont(fontPath, features, variableSettings, stylisticSets);
  fs.writeFileSync(outputPath, baked);
  return outputPath;
}

/** Clean up temp baked fonts. Call in afterAll if needed. */
export function cleanupTempFonts(): void {
  if (fs.existsSync(TMP_DIR)) {
    for (const f of fs.readdirSync(TMP_DIR)) {
      if (f.startsWith("baked-")) {
        fs.unlinkSync(path.join(TMP_DIR, f));
      }
    }
  }
}
