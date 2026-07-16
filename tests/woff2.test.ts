/**
 * Real-woff2 handling by the WASM baker (the paid-Typekit-path dependency).
 *
 * Both adobe bake paths feed bytes into the SAME `wasmModule.process_font`
 * call — github (TTF) and Typekit (woff2). The WASM uses `allsorts`, which
 * decompresses woff2 internally, so NO JS-side decoder is needed (the old
 * `components/woff2.ts` was removed as dead code). These tests prove the
 * WASM decodes REAL woff2 fixtures and produces valid sfnt — the thing the
 * Typekit (paid-font) path relies on but the mocked adobe tests never
 * exercise (they mock woff2 responses with TTF bytes).
 *
 * Note: process_font only decodes woff2→sfnt when there is processing to do
 * (instancing / feature bake). With empty settings it's a pass-through — but
 * the production bake only runs when settings are present, so these tests
 * always pass settings, matching production.
 *
 * @jest-environment node
 */

import * as fs from "fs";
import * as path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const wasm = require("../@rust/pkg-node/easyeyes_wasm.js");

const font = (name: string) =>
  new Uint8Array(
    fs.readFileSync(path.join(__dirname, "..", "examples", "fonts", name)),
  );

/** Valid sfnt magic: 0x00010000 (TTF), 'OTTO' (CFF), or 'true' (Apple TT). */
const isSfnt = (u8: Uint8Array): boolean => {
  const m = Buffer.from(u8.slice(0, 4));
  return (
    m.equals(Buffer.from([0, 1, 0, 0])) ||
    m.toString() === "OTTO" ||
    m.toString() === "true"
  );
};

describe("WASM process_font — real woff2 decode", () => {
  it("decodes a variable woff2 and instances it to valid sfnt", () => {
    const bytes = font("RobotoFlex-Variable.woff2");
    // Confirm the fixture really is woff2 (magic 'wOF2').
    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe("wOF2");

    const out = new Uint8Array(wasm.process_font(bytes, '"wght" 700', "", ""));
    expect(isSfnt(out)).toBe(true);
    // Instancing applied: output differs from input.
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).not.toBe(bytes.length);
  });

  it("decodes a static woff2 and bakes a feature into valid sfnt", () => {
    const bytes = font("Inter-Regular.woff2");
    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe("wOF2");
    // Feature bake on woff2 input — the Typekit + fontFeatureSettings combo.
    const out = new Uint8Array(wasm.process_font(bytes, "", "", '"zero"'));
    expect(isSfnt(out)).toBe(true);
  });
});
