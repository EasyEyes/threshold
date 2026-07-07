/**
 * End-to-end against a REAL native canvas 2D context (node-canvas), proving
 * persistCanvasContextState survives the actual HTML-spec resize wipe — not a
 * model of it. This is the strongest available automated proof of the mechanism.
 *
 * Why this file exists separately from canvasContextState.test.ts: that file
 * uses a hand-rolled SpecCanvas that *models* "resize resets ctx state". This
 * file uses the real native ctx, so the spec behavior is the engine's, not ours.
 *
 * HONEST LIMITS (probed empirically before writing):
 *  - `direction`: node-canvas implements it natively AND wipes it on resize
 *    (verified: rtl → ltr after width assignment). This is the real end-to-end
 *    proof — the mechanism must and does keep rtl alive.
 *  - `fontKerning`: node-canvas does NOT implement it (`'fontKerning' in ctx`
 *    is false; measureText is identical regardless of value). Assigning it
 *    creates an inert JS expando that survives resize trivially (node-canvas
 *    never tracked it). So fontKerning here is the same graceful-no-op profile
 *    as Safari — it CANNOT validate the kerning *effect* on rendering; that
 *    remains browser-only. direction carries the real proof in this file.
 *
 * Requires node-canvas (devDependency). Skips gracefully if unavailable so the
 * suite stays green in environments without it.
 *
 * @jest-environment node
 */

import "@jest/globals";
import { applyDirectionAcrossResizes } from "../psychojs/src/visual/canvasContextState.js";

let createCanvas:
  | (() => {
      width: number;
      height: number;
      getContext: (t: string) => CanvasRenderingContext2D;
    })
  | null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  createCanvas = require("canvas").createCanvas;
} catch (_e) {
  createCanvas = null;
}

const withCanvas = createCanvas ? describe : describe.skip;

withCanvas(
  "persistCanvasContextState vs a REAL native canvas (node-canvas)",
  () => {
    it("native ctx wipes direction on resize (the real spec behavior, not our model)", () => {
      const c = createCanvas!();
      const ctx = c.getContext("2d") as unknown as Record<string, unknown>;
      ctx.direction = "rtl";
      expect(ctx.direction).toBe("rtl");
      (c as { width: number }).width = 20; // resize → wipe
      expect(ctx.direction).toBe("ltr"); // native engine reset, not our SpecCanvas
    });

    it("applyDirectionAcrossResizes keeps direction alive across a REAL native resize", () => {
      const c = createCanvas!();
      const ctx = c.getContext("2d") as unknown as Record<string, unknown>;
      applyDirectionAcrossResizes(
        c as unknown as HTMLCanvasElement,
        "rtl",
        "ar",
      );
      expect(ctx.direction).toBe("rtl");
      (c as { width: number }).width = 40; // resize → native wipe → our re-apply
      expect(ctx.direction).toBe("rtl"); // survived
      (c as { height: number }).height = 50; // and via height
      expect(ctx.direction).toBe("rtl");
    });

    it("survives multiple resizes (re-applied every time, not just once)", () => {
      const c = createCanvas!();
      const ctx = c.getContext("2d") as unknown as Record<string, unknown>;
      applyDirectionAcrossResizes(
        c as unknown as HTMLCanvasElement,
        "rtl",
        "ar",
      );
      for (let i = 0; i < 3; i++) {
        (c as { width: number }).width = 100 + i;
        expect(ctx.direction).toBe("rtl");
      }
    });

    it("keeps the real dimensions correct (native getter delegation)", () => {
      const c = createCanvas!();
      applyDirectionAcrossResizes(
        c as unknown as HTMLCanvasElement,
        "rtl",
        "ar",
      );
      (c as { width: number }).width = 333;
      (c as { height: number }).height = 222;
      expect((c as { width: number }).width).toBe(333);
      expect((c as { height: number }).height).toBe(222);
    });

    it("fontKerning is an inert expando on node-canvas (documents the no-op profile, like Safari)", () => {
      // node-canvas doesn't implement fontKerning: assignment is a JS-property
      // expando that survives resize trivially. This is the same graceful-no-op
      // behavior Safari ships. The fontKerning *rendering effect* cannot be
      // tested without a real browser — see file header.
      const c = createCanvas!();
      const ctx = c.getContext("2d") as unknown as Record<string, unknown>;
      expect("fontKerning" in ctx).toBe(false); // node-canvas: not a real property
      const {
        applyKerningAcrossResizes,
      } = require("../psychojs/src/visual/canvasContextState.js");
      applyKerningAcrossResizes(c, "none");
      expect(ctx.fontKerning).toBe("none"); // applied (as an expando)
      (c as { width: number }).width = 20;
      expect(ctx.fontKerning).toBe("none"); // survived (trivially — it's a plain prop)
    });
  },
);
