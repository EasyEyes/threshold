/**
 * HarfBuzz text shaping utilities for Node.js tests.
 *
 * General-purpose: usable for any test that needs to verify glyph-level
 * shaping (not just font feature settings). HarfBuzz shapes text at the
 * GSUB/GPOS level — the same level used by both DOM and canvas rendering.
 *
 * Requires `hb-shape` on PATH (brew install harfbuzz on macOS).
 */

import { execSync } from "child_process";
import * as fs from "fs";

/** Find the hb-shape binary. Returns null if not installed. */
export function findHbShape(): string | null {
  const paths = [
    "/opt/homebrew/bin/hb-shape",
    "/usr/local/bin/hb-shape",
    "/usr/bin/hb-shape",
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  // Try PATH
  try {
    const which = execSync("which hb-shape", { encoding: "utf-8" }).trim();
    if (which && fs.existsSync(which)) return which;
  } catch {
    // not on PATH
  }
  return null;
}

/** A single shaped glyph. */
export interface ShapedGlyph {
  name: string;
  cluster: number;
  dx: number;
  dy: number;
  advance: number;
}

/** Parsed HarfBuzz shaping result. */
export interface ShapingResult {
  glyphs: ShapedGlyph[];
  totalAdvance: number;
  raw: string;
}

/**
 * Shape text with HarfBuzz, returning the raw glyph string.
 * @param hbShape Path to hb-shape binary
 * @param fontPath Path to font file
 * @param text Text to shape
 * @param features OpenType features (e.g., '"liga" 0, "smcp"'). Omit for defaults.
 */
export function shape(
  hbShape: string,
  fontPath: string,
  text: string,
  features?: string,
): string {
  const hbFeatures = features ? cssFeaturesToHarfbuzz(features) : "";
  const featArg = hbFeatures ? `--features=${hbFeatures}` : "";
  const cmd = `${hbShape} ${featArg} "${fontPath}" "${text}"`;
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

/**
 * Shape text and return structured glyph data.
 * Parses the hb-shape output format: [name=cluster@dx,dy+advance|...]
 */
export function shapeStructured(
  hbShape: string,
  fontPath: string,
  text: string,
  features?: string,
): ShapingResult {
  const raw = shape(hbShape, fontPath, text, features);
  // Strip leading [ and trailing ]
  const inner = raw.replace(/^\[/, "").replace(/\]$/, "");
  const glyphs: ShapedGlyph[] = [];
  let totalAdvance = 0;

  for (const part of inner.split("|")) {
    // Format: name=cluster@dx,dy+advance
    const nameMatch = part.match(/^([^=]+)=/);
    const clusterMatch = part.match(/=(\d+)/);
    const offsetMatch = part.match(/@([-\d]+),([-\d]+)/);
    const advanceMatch = part.match(/\+([-\d]+)/);

    if (nameMatch) {
      const dx = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;
      const dy = offsetMatch ? parseInt(offsetMatch[2], 10) : 0;
      const advance = advanceMatch ? parseInt(advanceMatch[1], 10) : 0;
      glyphs.push({
        name: nameMatch[1],
        cluster: clusterMatch ? parseInt(clusterMatch[1], 10) : 0,
        dx,
        dy,
        advance,
      });
      totalAdvance += advance;
    }
  }

  return { glyphs, totalAdvance, raw };
}

/**
 * Convert a CSS font-feature-settings string to HarfBuzz --features format.
 * CSS:   '"liga" 0, "smcp"'
 * HB:    'liga=0,smcp'
 * CSS:   '"init, medi, fina, isol, rlig, ccmp"'
 * HB:    'init,medi,fina,isol,rlig,ccmp'
 */
export function cssFeaturesToHarfbuzz(css: string): string {
  return css
    .replace(/["]/g, "") // strip quotes
    .split(",") // split by comma
    .map((s) => s.trim()) // trim whitespace
    .filter(Boolean) // drop empty
    .map((s) => {
      // "tag 0" → "tag=0", "tag 1" → "tag", "tag" → "tag"
      const parts = s.split(/\s+/);
      if (parts.length === 2) {
        return parts[1] === "0" ? `${parts[0]}=0` : parts[0];
      }
      return parts[0];
    })
    .join(",");
}

/** Skip helper for tests that require HarfBuzz. */
export function describeWithHarfbuzz(name: string, fn: () => void): void {
  const hbShape = findHbShape();
  if (hbShape) {
    describe(name, fn);
  } else {
    describe.skip(name, fn);
  }
}
