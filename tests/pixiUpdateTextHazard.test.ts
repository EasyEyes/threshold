/**
 * Static analysis of the REAL vendored @pixi/text — pins the hazard that
 * `persistCanvasContextState` defends against: PIXI's updateText() resizes the
 * canvas (wiping ctx state) and does NOT restore fontKerning/direction. A PIXI
 * upgrade that, say, added `context.fontKerning` to updateText would fail this
 * test loudly, forcing a revisit — instead of silently making the mechanism
 * a no-op.
 *
 * @jest-environment node
 */

// Stub only PIXI's WebGL peer modules (irrelevant to updateText's source). The
// @pixi/text CJS bundle imports them at top level; we never execute updateText
// here, we only read its toString(), so these just need to load.
jest.mock("@pixi/sprite", () => ({ Sprite: class {} }), { virtual: true });
jest.mock("@pixi/core", () => ({ Texture: { from: () => ({}) } }), {
  virtual: true,
});
jest.mock("@pixi/settings", () => ({ settings: { RESOLUTION: 1 } }), {
  virtual: true,
});
jest.mock("@pixi/math", () => ({ Rectangle: class {} }), { virtual: true });
jest.mock(
  "@pixi/utils",
  () => ({
    hex2string: () => "",
    hex2rgb: () => [],
    string2hex: () => 0,
    trimCanvas: () => ({}),
    sign: (x: number) => Math.sign(x),
  }),
  { virtual: true },
);

// drawLetterSpacing references CanvasRenderingContext2D.prototype at load.
class FakeCanvasRenderingContext2D {}
(
  globalThis as unknown as { CanvasRenderingContext2D: unknown }
).CanvasRenderingContext2D = FakeCanvasRenderingContext2D;

import "@jest/globals";

/** The REAL vendored @pixi/text v6.5.x, peers stubbed. */
const PIXI =
  require("../psychojs/node_modules/@pixi/text/dist/cjs/text.js") as {
    Text: { prototype: { updateText: Function; drawLetterSpacing: Function } };
  };

const UPDATE_TEXT = PIXI.Text.prototype.updateText.toString();

describe("REAL @pixi/text updateText — root cause of the resize-wipe hazard", () => {
  it("resizes the canvas (this.canvas.width/height = …) — the HTML-spec wipe trigger", () => {
    // HTML §4.12.5.1: assigning canvas.width/height resets ALL 2D-context state.
    // If PIXI stopped resizing (e.g. cached), our accessor would never fire and
    // the mechanism would be inert — this assertion catches that.
    expect(UPDATE_TEXT).toContain("this.canvas.width =");
    expect(UPDATE_TEXT).toContain("this.canvas.height =");
  });

  it("does NOT restore context.fontKerning after the resize — the gap we fill", () => {
    // The entire reason applyKerningAcrossResizes exists. If PIXI ever adds this,
    // our mechanism becomes a redundant no-op → revisit.
    expect(UPDATE_TEXT).not.toContain("fontKerning");
  });

  it("does NOT restore context.direction after the resize — the gap fontDirection fills", () => {
    // Root cause Nati found for the bidi/commas bug.
    expect(UPDATE_TEXT).not.toMatch(/context\.direction\b/);
  });

  it("DOES restore the known subset (contrast: confirms our reading of updateText)", () => {
    // Sanity: updateText re-applies scale/font/textBaseline/lineJoin/miterLimit.
    // If these disappeared, PIXI's own output would break — so their presence
    // confirms we're reading the real method, not a stub.
    for (const expected of [
      "context.scale(",
      "context.font =",
      "context.textBaseline",
      "context.lineJoin",
      "context.miterLimit",
    ]) {
      expect(UPDATE_TEXT).toContain(expected);
    }
  });
});
