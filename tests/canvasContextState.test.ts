/**
 * Spec-faithful test for the unified "persist canvas 2D-context state across
 * resizes" mechanism — the ONE technique EasyEyes uses to keep ctx properties
 * (fontKerning, direction, …) alive despite HTML-spec §4.12.5.1 (setting
 * canvas.width/height resets ALL 2D-context state).
 *
 * This is the regression net for the class of bug Nati Tsegaye found for
 * `direction` (canvas resize wiped ctx.direction) — generalized so it also
 * guards `fontKerning` and any future ctx property. It proves the mechanism
 * against the *spec semantics* (prototype accessors + reset-on-resize), not a
 * toy object, and exercises the real `PIXI.Text.updateText` resize→draw cycle.
 *
 * @jest-environment node
 */

import {
  persistCanvasContextState,
  applyKerningAcrossResizes,
  applyDirectionAcrossResizes,
} from "../psychojs/src/visual/canvasContextState.js";

// ─── Spec-faithful canvas ───────────────────────────────────────────────────
// Mirrors HTMLCanvasElement structure (width/height are PROTOTYPE accessors)
// and the HTML spec (assigning width/height resets ALL context state). A plain
// object can't model this: its accessors would be own-properties, not
// inherited, so the prototype-chain walk in the implementation wouldn't fire.
const CTX_DEFAULTS = {
  fontKerning: "auto",
  direction: "ltr",
  textAlign: "start",
  lang: "",
};

/** A canvas whose width/height accessors live on the prototype and wipe ctx. */
class SpecCanvas {
  _w = 10;
  _h = 10;
  _ctx: Record<string, unknown>;
  constructor() {
    this._ctx = { ...CTX_DEFAULTS, measureText: () => ({ width: 10 }) };
  }
  getContext() {
    return this._ctx;
  }
  setAttribute() {}
}
// Prototype accessors (like HTMLCanvasElement.prototype) — assignment resets ctx.
let protoW = 10;
let protoH = 10;
Object.defineProperty(SpecCanvas.prototype, "width", {
  configurable: true,
  get() {
    return (this as unknown as { _w: number })._w;
  },
  set(v) {
    (this as unknown as { _w: number })._w = v;
    // HTML spec: resize resets ALL 2D-context state to defaults.
    Object.assign((this as unknown as SpecCanvas)._ctx, CTX_DEFAULTS);
  },
});
Object.defineProperty(SpecCanvas.prototype, "height", {
  configurable: true,
  get() {
    return (this as unknown as { _h: number })._h;
  },
  set(v) {
    (this as unknown as { _h: number })._h = v;
    Object.assign((this as unknown as SpecCanvas)._ctx, CTX_DEFAULTS);
  },
});

/** Canvas with NO width/height accessors anywhere (non-standard test mock). */
class BareCanvas {
  _ctx = { ...CTX_DEFAULTS };
  getContext() {
    return this._ctx;
  }
}

// ─── persistCanvasContextState (the primitive) ──────────────────────────────
describe("persistCanvasContextState", () => {
  it("applies the given state to the context immediately", () => {
    const c = new SpecCanvas();
    persistCanvasContextState(c as unknown as HTMLCanvasElement, {
      fontKerning: "none",
    });
    expect(c._ctx.fontKerning).toBe("none");
  });

  it("re-applies state after a width resize wipes it (the spec hazard)", () => {
    const c = new SpecCanvas();
    persistCanvasContextState(c as unknown as HTMLCanvasElement, {
      fontKerning: "normal",
    });
    expect(c._ctx.fontKerning).toBe("normal");
    (c as unknown as { width: number }).width = 200; // resize → wipe → re-apply
    expect(c._ctx.fontKerning).toBe("normal");
  });

  it("re-applies state after a height resize wipes it", () => {
    const c = new SpecCanvas();
    persistCanvasContextState(c as unknown as HTMLCanvasElement, {
      direction: "rtl",
    });
    (c as unknown as { height: number }).height = 50;
    expect(c._ctx.direction).toBe("rtl");
  });

  it("keeps the underlying dimensions correct (getter delegation)", () => {
    const c = new SpecCanvas();
    persistCanvasContextState(c as unknown as HTMLCanvasElement, {
      fontKerning: "none",
    });
    (c as unknown as { width: number }).width = 333;
    (c as unknown as { height: number }).height = 222;
    expect((c as unknown as { width: number }).width).toBe(333);
    expect((c as unknown as { height: number }).height).toBe(222);
  });

  it("is idempotent: a second call does not double-patch the accessors", () => {
    const c = new SpecCanvas();
    persistCanvasContextState(c as unknown as HTMLCanvasElement, {
      fontKerning: "none",
    });
    const wSet = Object.getOwnPropertyDescriptor(c, "width")!.set;
    persistCanvasContextState(c as unknown as HTMLCanvasElement, {
      fontKerning: "normal",
    });
    expect(Object.getOwnPropertyDescriptor(c, "width")!.set).toBe(wSet); // same fn
    expect(c._ctx.fontKerning).toBe("normal"); // state updated, re-applied
  });

  it("MERGES state across calls so direction + kerning coexist on one canvas", () => {
    // The render canvas needs BOTH direction and kerning. Two separate calls
    // must not clobber each other's persisted state.
    const c = new SpecCanvas();
    applyDirectionAcrossResizes(c as unknown as HTMLCanvasElement, "rtl", "ar");
    applyKerningAcrossResizes(c as unknown as HTMLCanvasElement, "none");
    (c as unknown as { width: number }).width = 99; // resize wipes → re-apply BOTH
    expect(c._ctx.direction).toBe("rtl");
    expect(c._ctx.textAlign).toBe("left");
    expect(c._ctx.fontKerning).toBe("none");
  });

  it("reads state FRESH on each apply (a change between renders is honored)", () => {
    const c = new SpecCanvas();
    applyKerningAcrossResizes(c as unknown as HTMLCanvasElement, "normal");
    applyKerningAcrossResizes(c as unknown as HTMLCanvasElement, "none"); // value changed
    (c as unknown as { width: number }).width = 5;
    expect(c._ctx.fontKerning).toBe("none");
  });

  it("guards `lang` (non-standard) — only set when the ctx declares support", () => {
    const c = new SpecCanvas();
    applyDirectionAcrossResizes(c as unknown as HTMLCanvasElement, "rtl", "ar");
    expect("lang" in c._ctx).toBe(true);
    expect(c._ctx.lang).toBe("ar");
  });

  it("does not throw when a ctx property is unsupported (Safari fontKerning)", () => {
    // Model a Safari ctx: no fontKerning property at all.
    const c = new BareCanvas();
    // @ts-expect-error — intentionally modeling a Safari ctx without fontKerning
    delete c._ctx.fontKerning;
    expect(() =>
      applyKerningAcrossResizes(c as unknown as HTMLCanvasElement, "none"),
    ).not.toThrow();
    // Inert expando or skipped — either way no effect, no throw.
  });

  it("degrades gracefully on a non-standard canvas (no accessors): apply-only", () => {
    const c = new BareCanvas();
    persistCanvasContextState(c as unknown as HTMLCanvasElement, {
      fontKerning: "none",
    });
    expect(c._ctx.fontKerning).toBe("none"); // immediate apply worked
    expect(Object.getOwnPropertyDescriptor(c, "width")).toBeUndefined(); // not patched
  });
});

// ─── wrappers ───────────────────────────────────────────────────────────────
describe("applyKerningAcrossResizes", () => {
  it("sets fontKerning to the given value", () => {
    const c = new SpecCanvas();
    applyKerningAcrossResizes(c as unknown as HTMLCanvasElement, "none");
    expect(c._ctx.fontKerning).toBe("none");
  });

  it('falls back to "auto" (browser decides) for a falsy value', () => {
    const c = new SpecCanvas();
    applyKerningAcrossResizes(c as unknown as HTMLCanvasElement, undefined);
    expect(c._ctx.fontKerning).toBe("auto");
  });
});

describe("applyDirectionAcrossResizes", () => {
  it("sets direction, forces textAlign left (PIXI is left-anchored), and lang", () => {
    const c = new SpecCanvas();
    applyDirectionAcrossResizes(c as unknown as HTMLCanvasElement, "rtl", "he");
    expect(c._ctx.direction).toBe("rtl");
    expect(c._ctx.textAlign).toBe("left");
    expect(c._ctx.lang).toBe("he");
  });

  it("preserves direction semantics previously guaranteed by canvasTextDirection", () => {
    // Characterization guard for the refactor: the three properties direction
    // relied on must survive a resize together.
    const c = new SpecCanvas();
    applyDirectionAcrossResizes(c as unknown as HTMLCanvasElement, "rtl", "ar");
    (c as unknown as { width: number }).width = 40;
    expect(c._ctx.direction).toBe("rtl");
    expect(c._ctx.textAlign).toBe("left");
  });
});
