/**
 * @jest-environment jsdom
 *
 * visual.HTMLTextStim — DOM-overlay stim in psychojs (notes/PLAN-html-text-stim.md).
 *
 * Contract under test:
 *  - overlay layer win._htmlTextLayer lives at document.body (removed by
 *    Window.close), below SweetAlert (z-index 1060)
 *  - setText renders via the INJECTED textRenderer (markdown); default
 *    renderer is safe plain text (no HTML interpretation)
 *  - units conversion via util.to_px (pix/norm/height); positions map
 *    center-origin y-up → CSS using the canvas rect (letterbox-safe)
 *  - isInstruction mirrors TextStim: pt font-size for instructions, px else
 *  - TextStim-API subset: setText/setPos/setAutoDraw/setColor/setOpacity/
 *    setWrapWidth/setAlignHoriz/setAlignVert, _autoDraw, _needUpdate, status
 *    (PsychoJS.Status symbols), name, dispose, getBoundingBox → {width,height}
 *  - non-interactive: user-select none, pointer-events none
 *  - bidi: language/direction → lang/dir attributes
 *
 * jsdom has no layout: getBoundingBox values covered by e2e, not here.
 */
import { marked } from "marked";
import { HTMLTextStim } from "../psychojs/src/visual/HTMLTextStim.js";
import {
  renderMarkdown,
  renderInstructionMarkdown,
} from "../components/markdownInline";

(globalThis as any).marked = marked;

const LAYER_SEL = "#ee-html-text-layer";
const STIM_SEL = ".ee-html-text-stim";

let canvas: HTMLCanvasElement;
let win: any;

beforeEach(() => {
  document.body.innerHTML = "";
  canvas = document.createElement("canvas");
  canvas.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 800, height: 600 }) as DOMRect;
  document.body.appendChild(canvas);
  win = { size: [800, 600], _renderer: { view: canvas } };
});

const makeStim = (overrides: Record<string, unknown> = {}) =>
  new HTMLTextStim({
    win,
    textRenderer: renderMarkdown,
    name: "testStim",
    text: "",
    font: "TestFont",
    units: "pix",
    height: 25,
    pos: [0, 0],
    alignHoriz: "center",
    alignVert: "center",
    color: "#000000",
    opacity: 1,
    autoDraw: false,
    ...overrides,
  } as any);

describe("overlay layer", () => {
  test("layer is created as win._htmlTextLayer at document.body", () => {
    makeStim();
    expect(win._htmlTextLayer).toBeDefined();
    const layer = document.body.querySelector(LAYER_SEL);
    expect(layer).not.toBeNull();
    expect(layer).toBe(win._htmlTextLayer);
  });

  test("multiple stims on one window share the layer", () => {
    makeStim({ name: "a" });
    makeStim({ name: "b" });
    expect(document.body.querySelectorAll(LAYER_SEL)).toHaveLength(1);
    expect(document.body.querySelectorAll(STIM_SEL)).toHaveLength(2);
  });

  test("layer is non-interactive and below SweetAlert (z-index 1060)", () => {
    makeStim();
    const layer = document.body.querySelector(LAYER_SEL) as HTMLElement;
    expect(layer.style.pointerEvents).toBe("none");
    expect(Number(layer.style.zIndex)).toBeLessThan(1060);
  });
});

describe("setText — injected renderer vs safe default", () => {
  test("textRenderer renders **bold** as <strong>, no literal asterisks", () => {
    const s = makeStim();
    s.setText("Press **space** for next page.");
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.innerHTML).toContain("<strong>space</strong>");
    expect(el.textContent).toBe("Press space for next page.");
  });

  test("inline HTML passes through the injected renderer", () => {
    const s = makeStim();
    s.setText('<span style="font-style: normal">✅</span> Done.');
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.querySelector("span")).not.toBeNull();
  });

  test("DEFAULT renderer is safe plain text (markdown stays literal)", () => {
    const s = makeStim({ textRenderer: undefined });
    s.setText("Press **space** <b>now</b>");
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.textContent).toBe("Press **space** <b>now</b>");
    expect(el.querySelector("b")).toBeNull();
  });

  test("empty text clears content", () => {
    const s = makeStim({ text: "hello" });
    s.setText("");
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.innerHTML).toBe("");
  });

  test("overlay renderer preserves line structure (breaks: true) — canvas parity", () => {
    // Phrases use \n for line breaks (e.g. bullet lines in T_readingTask).
    // Canvas TextStim honored them; marked's default collapses them. The
    // instruction renderer (renderInstructionMarkdown) must keep them.
    const s = makeStim({ textRenderer: renderInstructionMarkdown });
    s.setText("Story time!\n• Press **space** to go.\n• Continue.");
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.textContent).toContain("• Press space to go.");
    // each bullet on its own line → two <br> separators
    expect(el.querySelectorAll("br").length).toBe(2);
  });

  test("overlay preserves significant whitespace runs (canvas parity)", () => {
    // T_readingTask bullet lines: "\n        •        Press ..." — canvas
    // rendered the 8-space runs (indent + bullet gap); HTML must too.
    const s = makeStim({ textRenderer: renderInstructionMarkdown });
    s.setText("line\n        •        bullet");
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.style.whiteSpace).toBe("break-spaces");
    expect(el.innerHTML).toContain("        •        bullet");
  });

  test("break-spaces must NOT render marked's inter-tag newlines", () => {
    // Multi-paragraph marked output joins blocks with \n (</p>\n<p>) and
    // ends with \n — invisible under normal white-space, but break-spaces
    // would render them as spurious blank lines.
    const s = makeStim({ textRenderer: renderInstructionMarkdown });
    s.setText("first para\n\nsecond para");
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.innerHTML).not.toMatch(/>\n+</);
    expect(el.innerHTML).not.toMatch(/\n+$/);
  });
});

describe("positioning — units → CSS via canvas rect", () => {
  test("pix: center-origin maps via canvas rect; y flips", () => {
    makeStim({ pos: [100, -50] });
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    // left = 0 + 800/2 + 100 = 500 ; top = 0 + 600/2 - (-50) = 350
    expect(el.style.left).toBe("500px");
    expect(el.style.top).toBe("350px");
  });

  test("norm units convert via win.size", () => {
    makeStim({ units: "norm", pos: [0.5, 0.5] });
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    // to_px norm: [0.5*800/2, 0.5*600/2] = [200, 150]
    // left = 400 + 200 = 600 ; top = 300 - 150 = 150
    expect(el.style.left).toBe("600px");
    expect(el.style.top).toBe("150px");
  });

  test("height units convert via min(win.size)", () => {
    makeStim({ units: "height", pos: [0.5, 0] });
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    // to_px height: 0.5 * min(800,600) = 300 ; left = 400 + 300 = 700
    expect(el.style.left).toBe("700px");
  });

  test("canvas offset in viewport is respected (letterbox-safe)", () => {
    canvas.getBoundingClientRect = () =>
      ({ left: 40, top: 20, width: 800, height: 600 }) as DOMRect;
    makeStim({ pos: [0, 0] });
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.style.left).toBe("440px");
    expect(el.style.top).toBe("320px");
  });

  test.each([
    ["left", "top", "translate(0%, 0%)"],
    ["right", "bottom", "translate(-100%, -100%)"],
    ["center", "bottom", "translate(-50%, -100%)"],
  ])("anchor %s/%s → %s", (h, v, expected) => {
    makeStim({ alignHoriz: h, alignVert: v });
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.style.transform).toBe(expected);
  });

  test("setPos updates position", () => {
    const s = makeStim();
    s.setPos([0, -300]);
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.style.left).toBe("400px");
    expect(el.style.top).toBe("600px");
  });

  test("repositions on window resize using new canvas rect", () => {
    makeStim({ pos: [0, 0] });
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 1000, height: 700 }) as DOMRect;
    window.dispatchEvent(new Event("resize"));
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.style.left).toBe("500px");
    expect(el.style.top).toBe("350px");
  });

  test("resize after Window.close (renderer null) is a no-op, not a crash", () => {
    // Window.close() sets win._renderer = null; the quit flow then exits
    // fullscreen, firing fullscreenchange/resize → repositionAll.
    makeStim({ pos: [0, 0] });
    win._renderer = null;
    expect(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("fullscreenchange"));
    }).not.toThrow();
  });
});

describe("font size — TextStim isInstruction parity", () => {
  test("isInstruction: true → pt (instruction convention)", () => {
    makeStim({ isInstruction: true, height: 18 });
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.style.fontSize).toBe("18pt");
  });

  test("isInstruction: false → px (tinyHint parity with old TextStim)", () => {
    makeStim({ isInstruction: false, height: 20 });
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.style.fontSize).toBe("20px");
  });

  test("setHeight defaults to the instance's isInstruction (dynamicSetSize)", () => {
    const instr = makeStim({ isInstruction: true, height: 18 });
    instr.setHeight(30); // dynamicSetSize calls setHeight(h) with ONE arg
    const hint = makeStim({ isInstruction: false, height: 20 });
    hint.setHeight(26);
    const els = document.body.querySelectorAll(STIM_SEL);
    expect((els[0] as HTMLElement).style.fontSize).toBe("30pt");
    expect((els[1] as HTMLElement).style.fontSize).toBe("26px");
  });

  test("setFont updates font-family (updateInstructionFont)", () => {
    const s = makeStim({ font: "FontA" });
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.style.fontFamily).toContain("FontA");
    s.setFont("FontB");
    expect(el.style.fontFamily).toContain("FontB");
    expect(el.style.fontFamily).not.toContain("FontA");
  });
});

describe("TextStim-API subset", () => {
  test("setAutoDraw toggles visibility and status; _autoDraw reflects", () => {
    const s = makeStim();
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(s._autoDraw).toBe(false);
    expect(el.style.display).toBe("none");
    s.setAutoDraw(true);
    expect(s._autoDraw).toBe(true);
    expect(el.style.display).not.toBe("none");
    expect(s.status).toBe(Symbol.for("STARTED"));
  });

  test("status starts as PsychoJS.Status.NOT_STARTED", () => {
    const s = makeStim();
    expect(s.status).toBe(Symbol.for("NOT_STARTED"));
  });

  test("setWrapWidth maps to max-width", () => {
    const s = makeStim();
    s.setWrapWidth(300);
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.style.maxWidth).toBe("300px");
  });

  test("setColor accepts css string and {hex} Color-like", () => {
    const s = makeStim();
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    s.setColor("#ff0000");
    expect(el.style.color).toBe("rgb(255, 0, 0)");
    s.setColor({ hex: "#00ff00" });
    expect(el.style.color).toBe("rgb(0, 255, 0)");
  });

  test("setOpacity maps to css opacity", () => {
    const s = makeStim();
    s.setOpacity(0.5);
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.style.opacity).toBe("0.5");
  });

  test("name and log-field no-ops exist; _needUpdate false", () => {
    const s = makeStim({ name: "tinyHint" });
    expect(s.name).toBe("tinyHint");
    expect(s).toHaveProperty("frameNStart");
    expect(s).toHaveProperty("tStart");
    expect(s._needUpdate).toBe(false);
  });

  test("getBoundingBox returns {width, height}", () => {
    const s = makeStim();
    const bb = s.getBoundingBox();
    expect(bb).toHaveProperty("width");
    expect(bb).toHaveProperty("height");
  });
});

describe("user-experience parity with canvas", () => {
  test("text is not selectable and not clickable", () => {
    makeStim();
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.style.userSelect).toBe("none");
    expect(el.style.pointerEvents).toBe("none");
  });
});

describe("bidi / i18n", () => {
  test("direction rtl sets dir attribute; language sets lang", () => {
    makeStim({ direction: "rtl", language: "ar" });
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.getAttribute("dir")).toBe("rtl");
    expect(el.getAttribute("lang")).toBe("ar");
  });

  test("default direction is ltr", () => {
    makeStim();
    const el = document.body.querySelector(STIM_SEL) as HTMLElement;
    expect(el.getAttribute("dir")).toBe("ltr");
  });
});

describe("dispose", () => {
  test("removes the stim element; layer survives while other stims remain", () => {
    const a = makeStim({ name: "a" });
    makeStim({ name: "b" });
    a.dispose();
    expect(document.body.querySelectorAll(STIM_SEL)).toHaveLength(1);
    expect(document.body.querySelector(LAYER_SEL)).not.toBeNull();
  });
});
