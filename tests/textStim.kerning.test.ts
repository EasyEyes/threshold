/**
 * T4 — TextStim wires `fontKerning` into its render path via the unified
 * `persistCanvasContextState` mechanism (the same one `direction` uses).
 *
 * Runs the REAL TextStim class (real constructor, real `_addAttribute`, real
 * `_updateIfNeeded`, real `_getTextStyle`), stubbing only the PsychoJS core +
 * PIXI/window.
 *
 * The resize-survival effect is proven in canvasContextState.test.ts; this
 * file proves the TextStim WIRING: accepts a `kerning` option, and during
 * render calls applyKerningAcrossResizes on both the PIXI render canvas and
 * the shared PIXI.TextMetrics sizing canvas.
 *
 * @jest-environment node
 */

// Stub PsychoJS core to break the global.js TLA chain. MinimalStim only needs
// PsychoJS.Status (enum). Everything else is REAL.
jest.mock("../psychojs/src/core/PsychoJS.js", () => ({
  PsychoJS: { Status: { NOT_STARTED: 0, STARTED: 1, STOPPED: 2, FINISHED: 3 } },
}));
jest.mock(
  "log4javascript",
  () => ({
    getLogger: () => ({
      debug: () => {},
      info: () => {},
      error: () => {},
      warn: () => {},
    }),
    Level: { ALL: 0 },
  }),
  { virtual: true },
);

// A spec-faithful recording mock pixi. The render canvas has width/height as
// PROTOTYPE accessors and resets ctx state on resize (HTML §4.12.5.1), so the
// real persistCanvasContextState mechanism runs end-to-end through TextStim.
function makePixiMock() {
  // The set of ctx properties our mechanism persists. Resize wipes them to
  // these defaults (HTML §4.12.5.1).
  const CTX_DEFAULTS = {
    fontKerning: "auto",
    direction: "ltr",
    textAlign: "start",
    lang: "",
  };
  class RenderCanvas {
    _w = 10;
    _h = 10;
    _ctx: Record<string, unknown> = { ...CTX_DEFAULTS };
    setAttribute = jest.fn();
    getContext() {
      return this._ctx;
    }
  }
  Object.defineProperty(RenderCanvas.prototype, "width", {
    configurable: true,
    get() {
      return this._w;
    },
    set(v) {
      this._w = v;
      this._ctx = { ...CTX_DEFAULTS };
    }, // spec: resize wipes
  });
  Object.defineProperty(RenderCanvas.prototype, "height", {
    configurable: true,
    get() {
      return this._h;
    },
    set(v) {
      this._h = v;
      this._ctx = { ...CTX_DEFAULTS };
    },
  });

  class Text {
    text: string;
    style: unknown;
    canvas: RenderCanvas;
    anchor: { x: number; y: number };
    scale: { x: number; y: number };
    dirty = true;
    constructor(text: string, style: unknown) {
      this.text = text;
      this.style = style;
      this.canvas = new RenderCanvas();
      this.anchor = { x: 0, y: 0 };
      this.scale = { x: 1, y: 1 };
    }
    updateText = jest.fn();
    destroy() {}
    get width() {
      return 10;
    }
    get height() {
      return 10;
    }
  }

  // --- shared sizing canvas (PIXI.TextMetrics._canvas) ---
  const metricsCanvas = new RenderCanvas();

  return {
    Text,
    metricsCanvas,
    TextStyle: class {
      constructor(o: unknown) {
        Object.assign(this, o);
      }
      toFontString() {
        return "10px Arial";
      }
    },
    Rectangle: class {
      constructor(
        public x = 0,
        public y = 0,
        public width = 0,
        public height = 0,
      ) {}
      static EMPTY = { x: 0, y: 0, width: 0, height: 0 };
    },
    Point: class {
      constructor(
        public x = 0,
        public y = 0,
      ) {}
    },
    TextMetrics: { _canvas: metricsCanvas },
  };
}
const pixiMock = makePixiMock();

jest.mock("pixi.js-legacy", () => pixiMock, { virtual: true });

import { TextStim } from "../psychojs/src/visual/TextStim.js";

const fakeWin = () =>
  ({
    _psychoJS: { fontRenderMaxPx: 1000 },
    units: "height",
    autoLog: false,
    _drawList: [] as unknown[],
    size: [1000, 1000],
  }) as never;

/** Construct + render a TextStim. Returns the instance and its pixi canvas ctx. */
function render(
  opts: { kerning?: string; direction?: string; language?: string } = {},
) {
  const t = new TextStim({
    win: fakeWin(),
    name: "t",
    text: "AV",
    height: 0.1,
    kerning: opts.kerning,
    direction: opts.direction,
    language: opts.language,
  } as never) as unknown as {
    _kerning?: string;
    _direction?: string;
    _language?: string;
    _pixi?: { canvas?: RenderCanvas };
    _needUpdate: boolean;
    _needPixiUpdate: boolean;
    _updateIfNeeded: () => void;
  };
  t._needUpdate = true;
  t._needPixiUpdate = true;
  t._updateIfNeeded();
  return { t, renderCtx: t._pixi?.canvas?._ctx };
}

type RenderCanvas = { _ctx: Record<string, unknown> };

describe("TextStim — fontKerning wiring via persistCanvasContextState (T4)", () => {
  it("stores the kerning constructor option as _kerning", () => {
    const { t } = render({ kerning: "none" });
    expect(t._kerning).toBe("none");
  });

  it("applies fontKerning to the RENDER canvas during _updateIfNeeded", () => {
    const { renderCtx } = render({ kerning: "normal" });
    expect(renderCtx?.fontKerning).toBe("normal");
  });

  it("defaults to 'auto' when no kerning option is given", () => {
    const { renderCtx } = render();
    expect(renderCtx?.fontKerning).toBe("auto");
  });

  it("forwards distinct values verbatim to the render canvas", () => {
    expect(render({ kerning: "none" }).renderCtx?.fontKerning).toBe("none");
    expect(render({ kerning: "normal" }).renderCtx?.fontKerning).toBe("normal");
  });

  it("SURVIVES the resize wipe: fontKerning still set after updateText's resize", () => {
    // The render path (TextStim) calls updateText, whose real PIXI impl resizes
    // the canvas (wiping ctx state) right before drawing. Our mock's updateText
    // is a no-op, so simulate the wipe explicitly: re-read after a resize.
    const { t } = render({ kerning: "none" });
    const canvas = t._pixi!.canvas!;
    // Simulate the resize that PIXI.updateText() does internally.
    (canvas as unknown as { width: number }).width = 999;
    // persistCanvasContextState re-applies on resize → fontKerning survives.
    expect(canvas._ctx.fontKerning).toBe("none");
  });

  it("measure-as-render: also applies fontKerning to the TextMetrics sizing canvas", () => {
    render({ kerning: "none" });
    // The metrics canvas must receive fontKerning=none so sizing matches render.
    expect(pixiMock.metricsCanvas._ctx.fontKerning).toBe("none");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Direction wiring. Mirrors the kerning suite, but for the canvas half of
// fontDirection — which fontDirection.behavior.test.ts does NOT cover (it only
// asserts the global `font.direction` + <html dir>, never the TextStim render
// path). This file was the only place exercising that path until these tests
// were added, so they guard the canvasTextDirection → canvasContextState
// refactor (and any future regression in the TextStim direction call site).
// ────────────────────────────────────────────────────────────────────────────
describe("TextStim — direction canvas wiring via persistCanvasContextState", () => {
  it("stores the direction constructor option as _direction", () => {
    const { t } = render({ direction: "rtl" });
    expect(t._direction).toBe("rtl");
  });

  it("applies direction to the RENDER canvas during _updateIfNeeded", () => {
    const { renderCtx } = render({ direction: "rtl", language: "ar" });
    expect(renderCtx?.direction).toBe("rtl");
  });

  it("defaults to 'ltr' when no direction option is given", () => {
    const { renderCtx } = render();
    expect(renderCtx?.direction).toBe("ltr");
  });

  it("forces textAlign='left' under rtl (PIXI draws left-anchored)", () => {
    const { renderCtx } = render({ direction: "rtl", language: "ar" });
    expect(renderCtx?.textAlign).toBe("left");
  });

  it("SURVIVES the resize wipe: direction still set after updateText's resize", () => {
    const { t } = render({ direction: "rtl", language: "ar" });
    const canvas = t._pixi!.canvas!;
    // Simulate the resize PIXI.updateText() does internally (wipes ctx state).
    (canvas as unknown as { width: number }).width = 999;
    expect(canvas._ctx.direction).toBe("rtl");
    expect(canvas._ctx.textAlign).toBe("left");
  });

  it("direction + kerning coexist on the SAME render canvas (the merge case)", () => {
    // The render canvas holds both via persistCanvasContextState's merged store.
    // Guards against a regression where one call clobbers the other's state.
    const { renderCtx } = render({
      direction: "rtl",
      language: "ar",
      kerning: "none",
    });
    expect(renderCtx?.direction).toBe("rtl");
    expect(renderCtx?.textAlign).toBe("left");
    expect(renderCtx?.fontKerning).toBe("none");
  });

  it("rtl with lang 'ar' sets ctx.lang (guarded: only when ctx declares support)", () => {
    // Our mock ctx carries `lang` in its defaults, so it is set.
    const { renderCtx } = render({ direction: "rtl", language: "ar" });
    expect(renderCtx?.lang).toBe("ar");
  });
});
