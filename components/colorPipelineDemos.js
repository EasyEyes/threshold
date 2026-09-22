/**
 * Perceptual demos for the _screenColorCheckBool page.
 *
 * Stairs shows one requested gray ramp twice. The top half is rounded to
 * 8-bit in the shader. The bottom half is the live EasyEyes pipeline:
 * full precision into the shipped noisy-bit pass when dither is on. F
 * rounds that live half too, which is the float16 point — dither of a
 * value that was already snapped to a code averages back to that code.
 * D suspends or installs the real dither filter.
 *
 * Greener green is the color-space demo. Grays cannot show it. Two canvas
 * quads request (0, 1, 0); CSS swatches of sRGB green and Display P3 green
 * sit beside them. C retags the drawing buffer. The bar under them is the
 * greens that lie outside sRGB.
 */

import * as PIXI from "pixi.js-legacy";
import {
  beginPipelineDemo,
  endPipelineDemo,
  getColorPipelineReport,
  setDrawingBufferColorSpace,
  setPipelineDemoDither,
} from "../psychojs/src/util/ColorPipeline.js";
import {
  GREEN_LAYOUT,
  SRGB_GREEN_IN_DISPLAY_P3,
  STAIRS_SPAN_START,
  calibrateFragmentShader,
  eightBitCodesAcross,
  greenFragmentShader,
  stairsEnds,
  stairsFragmentShader,
  stepStairsSpan,
} from "./colorPipelineDemoMath.js";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";

const el = (tag, style = {}, text = "") => {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text) node.textContent = text;
  return node;
};

const fitSprite = (sprite, renderer) => {
  sprite.width = renderer.screen.width;
  sprite.height = renderer.screen.height;
};

const makeFilter = (renderer, source, uniforms) => {
  const filter = new PIXI.Filter(undefined, source, uniforms);
  filter.resolution = renderer.resolution || 1;
  filter.padding = 0;
  return filter;
};

const addSprite = (root, renderer, filter) => {
  const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
  sprite.anchor.set(0.5);
  sprite.position.set(0, 0);
  sprite.name = "ee-color-demo";
  sprite.filters = [filter];
  fitSprite(sprite, renderer);
  root.addChild(sprite);
  return sprite;
};

const removeSprite = (root, sprite) => {
  if (!sprite) return;
  if (root && sprite.parent === root) root.removeChild(sprite);
  const filters = sprite.filters ? sprite.filters.slice() : [];
  sprite.filters = null;
  sprite.destroy();
  for (const filter of filters) {
    try {
      filter.destroy();
    } catch (e) {
      /* already destroyed */
    }
  }
};

/**
 * vTextureCoord.y = 0 is whichever edge of the filter texture the GPU
 * treats as the origin. One frame paints that edge white; the drawing
 * buffer says whether that edge is the top of the screen.
 */
const calibrateFlip = (probe, win) => {
  const renderer = win._renderer;
  const root = win._rootContainer;
  const filter = makeFilter(renderer, calibrateFragmentShader(), {});
  const sprite = addSprite(root, renderer, filter);
  try {
    win.render();
    win.render();
    const h = win._size[1];
    const top = probe.readRect(0, h * 0.5 - h * 0.04, 24, 12);
    const bot = probe.readRect(0, -h * 0.5 + h * 0.04, 24, 12);
    return top.mean[0] + 0.2 < bot.mean[0] ? 1 : 0;
  } catch (e) {
    return 0;
  } finally {
    removeSprite(root, sprite);
  }
};

const vec4 = (rect) => new Float32Array(rect);

const pill = (text) =>
  el(
    "div",
    {
      position: "absolute",
      color: "#fff",
      font: `600 14px ${FONT}`,
      textShadow: "0 1px 2px #000",
      pointerEvents: "none",
    },
    text,
  );

const mountChrome = (demo, state) => {
  const overlay = el("div", {
    position: "fixed",
    inset: "0",
    zIndex: "100000",
    pointerEvents: "none",
    fontFamily: FONT,
  });
  overlay.dataset.eeColorDemo = demo;
  let greenCaptions = null;

  if (demo === "stairs") {
    const line = el("div", {
      position: "absolute",
      left: "0",
      right: "0",
      top: "50%",
      height: "1px",
      background: "rgba(255,255,255,0.45)",
    });
    const top = pill("8-bit");
    Object.assign(top.style, { left: "20px", top: "18%" });
    const bot = pill("EasyEyes");
    Object.assign(bot.style, { left: "20px", top: "68%" });
    overlay.append(line, top, bot);
  } else {
    const place = (rect, label, cssColor) => {
      const caption = el(
        "div",
        {
          position: "absolute",
          left: `${rect[0] * 100}%`,
          top: `calc(${rect[1] * 100}% - 1.5em)`,
          color: "#111",
          font: `600 14px ${FONT}`,
          textShadow: "0 0 4px #fff",
        },
        label,
      );
      overlay.appendChild(caption);
      if (!cssColor) return caption;
      const swatch = el("div", {
        position: "absolute",
        left: `${rect[0] * 100}%`,
        top: `${rect[1] * 100}%`,
        width: `${rect[2] * 100}%`,
        height: `${rect[3] * 100}%`,
        backgroundColor: "#888",
        background: cssColor,
      });
      overlay.appendChild(swatch);
      return caption;
    };
    place(
      GREEN_LAYOUT.p3Css,
      "Browser · Display P3",
      "color(display-p3 0 1 0)",
    );
    const p3CanvasCaption = place(GREEN_LAYOUT.p3Canvas, "Canvas · (0, 1, 0)");
    place(GREEN_LAYOUT.srgbCss, "Browser · sRGB", "color(srgb 0 1 0)");
    const srgbCanvasCaption = place(
      GREEN_LAYOUT.srgbCanvas,
      "Canvas · (0, 1, 0)",
    );
    const ramp = GREEN_LAYOUT.ramp;
    const rampCaption = el("div", {
      position: "absolute",
      left: `${ramp[0] * 100}%`,
      top: `calc(${ramp[1] * 100}% - 2.6em)`,
      width: `${ramp[2] * 100}%`,
      color: "#111",
      font: `600 14px ${FONT}`,
      textShadow: "0 0 4px #fff",
    });
    overlay.appendChild(rampCaption);
    greenCaptions = { p3CanvasCaption, srgbCanvasCaption, rampCaption };
  }

  const hud = el("div", {
    position: "absolute",
    left: "0",
    right: "0",
    bottom: "0",
    padding: "12px 20px 16px",
    background: "rgba(0,0,0,0.78)",
    color: "#fff",
    font: `15px ${FONT}`,
    lineHeight: "1.45",
    pointerEvents: "auto",
  });
  const title = el("div", { fontWeight: "600", marginBottom: "2px" });
  const body = el("div");
  const keys = el("div", { opacity: "0.85", marginTop: "2px" });
  const back = el(
    "button",
    {
      marginTop: "8px",
      padding: "6px 14px",
      font: `600 14px ${FONT}`,
      cursor: "pointer",
    },
    "Back",
  );
  back.type = "button";
  back.dataset.eeColorDemoBack = "";
  hud.append(title, body, keys, back);
  overlay.appendChild(hud);
  document.body.appendChild(overlay);

  const paint = () => {
    const report = getColorPipelineReport();
    const dither = report.dither ? "on" : "off";
    const lsb = report.ditherLsb;
    if (demo === "green") {
      title.textContent = "Greener green";
      const tag = report.colorSpace;
      const tagged = tag === "display-p3" ? "tagged Display P3" : "tagged sRGB";
      const wide = report.displayP3Gamut;
      if (greenCaptions) {
        const canvasLabel = `Canvas · (0, 1, 0) · ${tagged}`;
        greenCaptions.p3CanvasCaption.textContent = canvasLabel;
        greenCaptions.srgbCanvasCaption.textContent = canvasLabel;
        greenCaptions.rampCaption.textContent =
          tag === "display-p3"
            ? `sRGB green  →  Display P3 green · ${tagged} · the bar gets greener toward the right`
            : `sRGB green  →  Display P3 green · ${tagged} · the bar is one flat green`;
      }
      body.textContent =
        `Canvas tag: ${tag}. ` +
        (tag === "display-p3"
          ? "The canvas greens match the Display P3 sample, and the bar gets greener toward the right."
          : "The canvas greens match the sRGB sample, and the bar is one flat green.") +
        (wide
          ? ""
          : " This display does not report a Display P3 gamut, so the two browser greens may look alike.") +
        (state.tagRejected ? " This browser rejected the display-p3 tag." : "");
      keys.textContent = "C  switch the canvas tag      Esc  back";
      return;
    }
    const precision = state.fullPrecision
      ? "full precision"
      : "rounded to 8-bit";
    const floatNote = state.floatTextures
      ? ""
      : " This browser cannot keep shades between 8-bit codes, so the halves match.";
    const { low, high } = stairsEnds(state.span);
    const codes = eightBitCodesAcross(low, high);
    title.textContent = "Stairs";
    body.textContent =
      `${low.toFixed(3)} → ${high.toFixed(
        3,
      )}, about ${codes} eight-bit codes. ` +
      `Top is rounded to 8-bit. Bottom is ${precision}. Dither ${dither}` +
      (lsb ? ` (±½ × ${lsb.toFixed(5)})` : "") +
      ". The top bands jump as the ramp moves; the bottom glides when dither is carrying the in-between shades." +
      floatNote;
    keys.textContent =
      "D  dither      F  bottom half      ↑↓  widen or narrow the ramp      Esc  back";
  };
  paint();
  return { overlay, back, paint };
};

/**
 * Show one demo. Resolves when the viewer presses Esc or Back.
 * Restores the pipeline either way.
 *
 * @param {object} opts
 * @param {object} opts.probe - window.__EEcolorProbe
 * @param {HTMLElement} opts.page - the ColorCAL page; hidden while the demo is up
 * @param {"stairs"|"green"} opts.demo
 */
export const showColorPipelineDemo = async ({ probe, page, demo }) => {
  const win = probe?.psychoJS?.window;
  if (
    !win?._renderer ||
    !win?._rootContainer ||
    typeof win.render !== "function"
  ) {
    throw new Error(
      "The experiment window is not ready, so the demo cannot draw on the color-managed canvas.",
    );
  }

  const root = win._rootContainer;
  const renderer = win._renderer;
  const boot = beginPipelineDemo();
  let stopped = false;
  let raf = 0;
  let sprite = null;
  let overlay = null;
  let onKey = null;
  let hidPage = false;

  const state = {
    fullPrecision: true,
    floatTextures: boot.floatTextures,
    span: STAIRS_SPAN_START,
    tagRejected: false,
  };

  const finish = () => {
    if (stopped) return;
    stopped = true;
  };

  try {
    // The ColorCAL page has already left fullscreen, on purpose: its form
    // and the port chooser are miserable there, and a fullscreen exit is
    // what the experiment treats as a pause. Stay in the window. The
    // canvas is already the full viewport.
    setPipelineDemoDither(false);
    const flip = calibrateFlip(probe, win);
    if (stopped) return;
    if (page) {
      page.style.display = "none";
      hidPage = true;
    }

    const filter = buildFilter(demo, renderer, flip, state);
    sprite = addSprite(root, renderer, filter);
    // Stairs uses the shipped full-screen dither so both halves go through
    // the same pass. Green is a color-space demo and does not dither.
    setPipelineDemoDither(demo === "stairs");

    const chrome = mountChrome(demo, state);
    overlay = chrome.overlay;
    chrome.back.onclick = finish;

    const sync = () => {
      const u = sprite.filters[0].uniforms;
      if (demo === "stairs") {
        const { low, high } = stairsEnds(state.span);
        u.uLow = low;
        u.uHigh = high;
        u.uQuantizeLive = state.fullPrecision && state.floatTextures ? 0 : 1;
      } else {
        const tag = getColorPipelineReport().colorSpace;
        u.uSrgbMode = tag === "srgb" ? 1 : 0;
      }
      fitSprite(sprite, renderer);
      chrome.paint();
    };
    sync();

    onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        finish();
        return;
      }
      if (demo === "green") {
        if (e.repeat) return;
        if (e.key === "c" || e.key === "C") {
          e.preventDefault();
          const next =
            getColorPipelineReport().colorSpace === "srgb"
              ? "display-p3"
              : "srgb";
          state.tagRejected = !setDrawingBufferColorSpace(next);
          sync();
        }
        return;
      }
      if (e.key === "d" || e.key === "D") {
        if (e.repeat) return;
        e.preventDefault();
        setPipelineDemoDither(!getColorPipelineReport().dither);
        sync();
        return;
      }
      if (e.key === "f" || e.key === "F") {
        if (e.repeat) return;
        e.preventDefault();
        state.fullPrecision = !state.fullPrecision;
        sync();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const dir = e.key === "ArrowUp" ? 1 : -1;
        if (demo === "stairs") state.span = stepStairsSpan(state.span, dir);
        sync();
      }
    };
    window.addEventListener("keydown", onKey, true);

    let last = performance.now();
    await new Promise((resolve) => {
      const frame = (now) => {
        if (stopped) {
          resolve();
          return;
        }
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (demo === "stairs" && sprite?.filters?.[0]) {
          const u = sprite.filters[0].uniforms;
          u.uPhase = (u.uPhase + dt * (1 / 12)) % 1;
        }
        try {
          win.render();
        } catch (e) {
          console.error("[EEcolorDemo] render failed", e);
          stopped = true;
          resolve();
          return;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });
  } finally {
    if (raf) cancelAnimationFrame(raf);
    if (onKey) window.removeEventListener("keydown", onKey, true);
    if (overlay) overlay.remove();
    removeSprite(root, sprite);
    endPipelineDemo();
    if (hidPage && page) page.style.display = "";
  }
};

const buildFilter = (demo, renderer, flip, state) => {
  if (demo === "stairs") {
    const { low, high } = stairsEnds(state.span);
    return makeFilter(renderer, stairsFragmentShader(), {
      uLow: low,
      uHigh: high,
      uPhase: 0,
      uFlipY: flip,
      uQuantizeLive: 0,
    });
  }
  return makeFilter(renderer, greenFragmentShader(), {
    uFlipY: flip,
    uSrgbMode: getColorPipelineReport().colorSpace === "srgb" ? 1 : 0,
    uRampStart: new Float32Array(SRGB_GREEN_IN_DISPLAY_P3),
    uP3Canvas: vec4(GREEN_LAYOUT.p3Canvas),
    uSrgbCanvas: vec4(GREEN_LAYOUT.srgbCanvas),
    uRamp: vec4(GREEN_LAYOUT.ramp),
  });
};
