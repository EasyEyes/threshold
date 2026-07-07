/**
 * fontTextRendering — Phase 1 of the Nastaliq OpenType plan.
 *
 * Two tracks, both RED against today's code (pre-implementation):
 *  - T1: `readFontTextRendering` (pure helper) — normalizes paramReader's
 *    array/scalar return and defaults blank/missing to "auto".
 *  - B5: the 4 stimulus TextStim call sites thread `textRendering: font.textRendering`
 *    next to `kerning: font.kerning` (the fontKerning precedent).
 *
 * See notes/PLAN-opentype-params-nastaliq.md §6.
 *
 * @jest-environment node
 */

// ─── T1: readFontTextRendering (pure helper) ────────────────────────────────
import { readFontTextRendering } from "../components/fontTextRendering";

const makeReader = (value: unknown) => ({
  read: jest.fn(() => value),
});

describe("readFontTextRendering", () => {
  it("passes a scalar categorical value through verbatim", () => {
    expect(readFontTextRendering(makeReader("optimizeLegibility"), "1_1")).toBe(
      "optimizeLegibility",
    );
  });

  it("normalizes a numeric-block array return to its first element", () => {
    // paramReader.read(name, <number>) returns an array; (name, "1_1") a scalar.
    expect(readFontTextRendering(makeReader(["auto"]), 1)).toBe("auto");
  });

  it("defaults blank/missing to 'auto' (the browser/canvas default)", () => {
    expect(readFontTextRendering(makeReader(""), "1_1")).toBe("auto");
    expect(readFontTextRendering(makeReader(undefined), "1_1")).toBe("auto");
    expect(readFontTextRendering(makeReader(null), "1_1")).toBe("auto");
  });

  it("reads fontTextRendering from the reader (not hardcoded)", () => {
    const r = makeReader("geometricPrecision");
    readFontTextRendering(r, "1_1");
    expect(r.read).toHaveBeenCalledWith("fontTextRendering", "1_1");
  });

  it("forwards the block/condition argument verbatim", () => {
    const r = makeReader("auto");
    readFontTextRendering(r, 1);
    expect(r.read).toHaveBeenCalledWith("fontTextRendering", 1);
  });
});

// ─── B5: TextStim call sites thread textRendering (like kerning) ────────────
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const readRel = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("B5: TextStim call sites thread `textRendering: font.textRendering`", () => {
  // The same 4 sites that thread kerning (rsvpReading ×2, letter, readingAddons).
  it.each([
    "components/rsvpReading.js",
    "components/letter.js",
    "components/readingAddons.js",
  ])("%s threads `textRendering: font.textRendering`", (file) => {
    expect(readRel(file)).toContain("textRendering: font.textRendering");
  });

  it("rsvpReading.js threads textRendering at BOTH stimulus sites", () => {
    const src = readRel("components/rsvpReading.js");
    const n = (src.match(/textRendering: font\.textRendering/g) || []).length;
    expect(n).toBe(2);
  });
});
