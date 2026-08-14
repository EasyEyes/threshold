/**
 * colorPipelineProbe — measurement hooks for the EasyEyes color pipeline
 * (psychojs/src/util/ColorPipeline.js), inside the REAL app environment.
 *
 * Why this exists: docs/hdr/p_canvascolor.html re-implements the pipeline's
 * ideas in hand-written WebGL2, so it characterizes the DISPLAY but exercises
 * none of the shipped code (PIXI filters, the HALF_FLOAT filter-texture pool,
 * the float background quad, the white-glyph + ColorizeFilter text path).
 * Everything here measures pixels produced by the actual PsychoJS Window and
 * PIXI renderer that participants see.
 *
 * Entirely URL-gated and inert otherwise:
 *
 *   ?colorPipelineProbe        install window.__EEcolorProbe (below)
 *   ?colorPipelineLog          console.log a color report on every stimulus
 *                              presentation, and append it to
 *                              window.__EEcolorLog. Works for real (human)
 *                              participants as well as simulated ones.
 *
 * Combine with the pipeline switches, e.g.
 *   ?colorPipelineProbe=1&_screenDitherBool=TRUE
 *   ?colorPipelineLog=1&_screenFloat16Bool=TRUE&_screenColorSpace=display-p3
 *
 * Readbacks measure the DRAWING BUFFER, i.e. everything up to and including
 * the pipeline's own quantization. They cannot see what the OS compositor
 * does afterwards (ICC transform, panel dithering, cable bit depth) — that
 * needs a photometer; see photometer() below and
 * tests/e2e/COLOR_PIPELINE_PHOTOMETER_PROTOCOL.md.
 */

import * as visual from "../psychojs/src/visual/index.js";
import * as util from "../psychojs/src/util/index.js";
import {
  drawingBufferIsFloat,
  getColorPipelineReport,
  readDrawingBufferRect,
} from "../psychojs/src/util/ColorPipeline.js";
import { checkForBlackout } from "./boundingNew.js";
import { Screens } from "./multiple-displays/globals.ts";

const urlHas = (name) => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.has(name) || params.has(name.toLowerCase());
  } catch (e) {
    return false;
  }
};

export const colorPipelineProbeActive = () => urlHas("colorPipelineProbe");
export const colorPipelineLogActive = () => urlHas("colorPipelineLog");

// Set at install time so logStimulusColor works from the trial loop without
// threading psychoJS through every call site.
let installedPsychoJS = null;

// ------------------------------ geometry -------------------------------

const getGl = (psychoJS) => psychoJS?.window?._renderer?.gl ?? null;

/**
 * Drawing-buffer pixels per CSS pixel. The canvas is devicePixelRatio-scaled,
 * so a CSS-pixel rect must be scaled before readPixels.
 */
const bufferScale = (psychoJS) => {
  const gl = getGl(psychoJS);
  const cssWidth = psychoJS?.window?._size?.[0];
  if (!gl || !cssWidth) return 1;
  return gl.drawingBufferWidth / cssWidth;
};

/**
 * Convert a PsychoJS center-origin, y-up CSS-pixel rect to a
 * bottom-left-origin drawing-buffer rect, clamped to the buffer.
 */
const toBufferRect = (psychoJS, xCss, yCss, wCss, hCss) => {
  const gl = getGl(psychoJS);
  const s = bufferScale(psychoJS);
  const bw = gl.drawingBufferWidth;
  const bh = gl.drawingBufferHeight;
  const w = Math.max(1, Math.round(wCss * s));
  const h = Math.max(1, Math.round(hCss * s));
  // PsychoJS y is up and origin-centered; readPixels y is up from the bottom.
  let x = Math.round(bw / 2 + xCss * s - w / 2);
  let y = Math.round(bh / 2 + yCss * s - h / 2);
  x = Math.min(Math.max(0, x), Math.max(0, bw - w));
  y = Math.min(Math.max(0, y), Math.max(0, bh - h));
  return { x, y, width: Math.min(w, bw), height: Math.min(h, bh) };
};

// ------------------------------ statistics -----------------------------

/**
 * Per-channel statistics of an RGBA Float32Array in [0,1].
 * `sum` is the quantity to use for glyph "ink": it is linear in the stim
 * color and averages over the 8-bit coverage quantization of the glyph
 * texture, so it resolves color differences far below one output LSB.
 * `width` (device pixels per row) enables the neighbor-agreement statistic.
 */
const rgbaStats = (px, width = 0) => {
  const n = px.length / 4;
  const sum = [0, 0, 0, 0];
  const min = [Infinity, Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < px.length; i += 4) {
    for (let c = 0; c < 4; c++) {
      const v = px[i + c];
      sum[c] += v;
      if (v < min[c]) min[c] = v;
      if (v > max[c]) max[c] = v;
    }
  }
  return {
    n,
    sum,
    mean: sum.map((s) => s / n),
    min,
    max,
    // Distinct 8-bit levels present in the red channel: the direct measure of
    // banding. An 8-bit pipe cannot exceed the number of requested levels.
    distinct8Bit: (() => {
      const seen = new Set();
      for (let i = 0; i < px.length; i += 4) seen.add(Math.round(px[i] * 255));
      return seen.size;
    })(),
    // Fraction of horizontally adjacent DEVICE pixels whose 8-bit red values
    // agree. The signature of dither-noise granularity: independent
    // per-device-pixel noise at a level halfway between two 8-bit codes
    // agrees ~0.5; noise generated in a low-resolution filter texture and
    // upscaled (the PIXI FILTER_RESOLUTION=1 bug) is spatially correlated
    // and agrees far more often.
    horizAgree8Bit: (() => {
      if (!width || width < 2) return undefined;
      const rows = Math.floor(n / width);
      let agree = 0;
      let pairs = 0;
      for (let r = 0; r < rows; r++) {
        for (let x = 0; x < width - 1; x++) {
          const i = 4 * (r * width + x);
          if (Math.round(px[i] * 255) === Math.round(px[i + 4] * 255)) agree++;
          pairs++;
        }
      }
      return pairs ? agree / pairs : undefined;
    })(),
  };
};

// ------------------------------- rendering -----------------------------

/**
 * Render one frame synchronously. Each call advances the dither noise field
 * (Window.render → advanceDitherFrame), so N calls give N independent noise
 * fields — which is what the temporal average of noisy-bit dithering needs.
 * Synchronous rather than rAF-driven so the app's own render loop cannot
 * interleave and so the measurement is deterministic.
 */
const renderOnce = (psychoJS) => psychoJS.window.render();

const readRect = (psychoJS, xCss, yCss, wCss, hCss) => {
  const gl = getGl(psychoJS);
  const r = toBufferRect(psychoJS, xCss, yCss, wCss, hCss);
  return rgbaStats(
    readDrawingBufferRect(gl, r.x, r.y, r.width, r.height),
    r.width,
  );
};

/** [0,1] RGB triplet → the "rgb(...)" string EasyEyes feeds to util.Color,
 * keeping full float precision exactly as colorRGBASnippetToRGBA does. */
const rgbString = ([r, g, b]) => `rgb(${r * 255},${g * 255},${b * 255})`;

const setBackground = (psychoJS, rgb) => {
  psychoJS.window.color = new util.Color(rgbString(rgb));
  // First render applies the color (render → _refresh → _updateIfNeeded);
  // the second is the first frame actually drawn with it.
  renderOnce(psychoJS);
  renderOnce(psychoJS);
};

// -------------------------------- probe --------------------------------

const buildProbe = (psychoJS) => ({
  /** Requested-vs-achieved pipeline state, plus the GL facts that explain it. */
  report: () => {
    const gl = getGl(psychoJS);
    const attrs = gl?.getContextAttributes?.() ?? {};
    return {
      ...getColorPipelineReport(),
      webGLVersion: gl
        ? gl.getParameter(gl.VERSION)
        : "no WebGL (canvas fallback)",
      drawingBufferFormatIsRGBA16F: drawingBufferIsFloat(),
      drawingBufferSize: gl
        ? [gl.drawingBufferWidth, gl.drawingBufferHeight]
        : null,
      contextAlpha: attrs.alpha,
      contextAntialias: attrs.antialias,
      extColorBufferFloat: !!gl?.getExtension?.("EXT_color_buffer_float"),
      extColorBufferHalfFloat: !!gl?.getExtension?.(
        "EXT_color_buffer_half_float",
      ),
    };
  },

  /** Statistics of a CSS-pixel rect of the current drawing buffer. */
  readRect: (xCss = 0, yCss = 0, wCss = 32, hCss = 32) =>
    readRect(psychoJS, xCss, yCss, wCss, hCss),

  renderFrames: (n = 1) => {
    for (let i = 0; i < n; i++) renderOnce(psychoJS);
  },

  /**
   * Set the window background through the real float-background path and
   * sample the center of the screen once per frame.
   *
   * The background is the cleanest probe of color precision: full-screen,
   * uniform, no glyph coverage to confound it.
   *
   * @returns {{requested:number[], frames:object[], temporalMean:number[]}}
   */
  measureBackground: ({ rgb, frames = 1, patchCss = 64 } = {}) => {
    setBackground(psychoJS, rgb);
    const out = [];
    for (let i = 0; i < frames; i++) {
      renderOnce(psychoJS);
      out.push(readRect(psychoJS, 0, 0, patchCss, patchCss));
    }
    const temporalMean = [0, 1, 2].map(
      (c) => out.reduce((a, s) => a + s.mean[c], 0) / out.length,
    );
    return { requested: rgb, frames: out, temporalMean };
  },

  /**
   * Draw a real visual.TextStim through the real text path and measure its
   * "ink" — the summed pixel value in a box around it, minus the same box
   * with the glyph hidden.
   *
   * Ink is linear in the stim color, so comparing the ink of two colors that
   * differ by less than one 8-bit step is a direct test of whether float
   * color survives to the framebuffer.
   */
  measureTextInk: ({
    text = "H",
    rgb,
    heightPx = 200,
    backgroundRgb = [0, 0, 0],
    frames = 1,
  } = {}) => {
    setBackground(psychoJS, backgroundRgb);
    const boxCss = heightPx * 2;
    const baseline = [];
    for (let i = 0; i < frames; i++) {
      renderOnce(psychoJS);
      baseline.push(readRect(psychoJS, 0, 0, boxCss, boxCss));
    }

    const stim = new visual.TextStim({
      win: psychoJS.window,
      name: "colorPipelineProbe",
      text,
      units: "pix",
      height: heightPx,
      pos: [0, 0],
      color: new util.Color(rgbString(rgb)),
      wrapWidth: Infinity,
      autoLog: false,
    });
    stim.setAutoDraw(true);

    const withInk = [];
    try {
      for (let i = 0; i < frames; i++) {
        renderOnce(psychoJS);
        withInk.push(readRect(psychoJS, 0, 0, boxCss, boxCss));
      }
    } finally {
      stim.setAutoDraw(false);
      renderOnce(psychoJS);
    }

    const meanSum = (arr, c) =>
      arr.reduce((a, s) => a + s.sum[c], 0) / arr.length;
    return {
      requested: rgb,
      ink: [0, 1, 2].map((c) => meanSum(withInk, c) - meanSum(baseline, c)),
      peak: [0, 1, 2].map((c) => Math.max(...withInk.map((s) => s.max[c]))),
      baseline: [0, 1, 2].map((c) => meanSum(baseline, c)),
      frames: withInk,
    };
  },

  /**
   * Run the app's OWN blackout detector (components/boundingNew.js
   * checkForBlackout) against a nominally black screen, and return the raw
   * pixel values it is judging.
   *
   * A true blackout must be detected in every configuration. With dither on,
   * black + noise quantizes to 0 or 1/255, and isPointBlack's fixed
   * "< 0.5/255" threshold rejects the 1/255 pixels — so this is the probe
   * that catches that regression.
   */
  blackout: ({ frames = 8 } = {}) => {
    // checkForBlackout reads Screens[0].window._size. Screens[0].window is
    // seeded with the DOM window and only replaced by the PsychoJS window
    // later in boot, so test for _size rather than for truthiness.
    if (Screens?.[0] && !Screens[0].window?._size)
      Screens[0].window = psychoJS.window;
    setBackground(psychoJS, [0, 0, 0]);
    const gl = getGl(psychoJS);
    const detected = [];
    const samples = [];
    for (let i = 0; i < frames; i++) {
      renderOnce(psychoJS);
      detected.push(checkForBlackout(gl, [0, 0], false) === true);
      const side =
        0.5 * Math.min(psychoJS.window._size[0], psychoJS.window._size[1]);
      samples.push(readRect(psychoJS, 0, 0, side, side));
    }
    return {
      frames,
      detectedCount: detected.filter(Boolean).length,
      detectedEveryFrame: detected.every(Boolean),
      // The threshold isPointBlack applies, for interpreting maxima below.
      isPointBlackThreshold: 0.5 / 255,
      maxRed: Math.max(...samples.map((s) => s.max[0])),
      meanRed: samples.reduce((a, s) => a + s.mean[0], 0) / samples.length,
      distinct8BitLevels: Math.max(...samples.map((s) => s.distinct8Bit)),
    };
  },

  /** Emit one per-presentation color report on demand (see logStimulusColor). */
  logStimulus: (label = "manual", xyPx = [0, 0]) =>
    logStimulusColor(label, xyPx),

  /**
   * PHOTOMETER MODE. Takes over the window and presents a sequence of
   * full-screen uniform levels through the real pipeline, advancing on
   * SPACE / ArrowRight (or programmatically via next()).
   *
   * Keeps rendering in a rAF loop — essential, because dithering only
   * delivers extra bits when the noise field is refreshed every frame. A
   * frozen frame measures 8 bits no matter what.
   *
   * Reload the page when finished; this deliberately hides the app's stimuli.
   *
   * @param {number[]} [levels] achromatic levels in [0,1]
   * @returns {{next:Function, stop:Function, level:Function}}
   */
  photometer: ({ levels, holdLabel = false } = {}) => {
    const seq =
      levels ?? // 10-bit staircase around mid-gray for effective bit depth. // 11-step coarse ramp for the transfer function, then a 16-step
      [
        ...Array.from({ length: 11 }, (_, i) => i / 10),
        ...Array.from({ length: 16 }, (_, i) => 0.5 + i / 1023),
      ];

    // Hide whatever the app currently draws so the field is uniform.
    for (const stim of psychoJS.window._drawList.slice()) {
      try {
        stim.hide();
      } catch (e) {
        /* not all stims support hide(); ignore */
      }
    }

    let index = -1;
    let rafId = 0;
    let stopped = false;
    const label = document.createElement("div");
    if (holdLabel) {
      label.style.cssText =
        "position:fixed;left:4px;top:4px;z-index:99999;font:12px monospace;" +
        "color:#888;background:transparent;pointer-events:none";
      document.body.appendChild(label);
    }

    const show = (i) => {
      index = i;
      const v = seq[index];
      setBackground(psychoJS, [v, v, v]);
      const stats = readRect(psychoJS, 0, 0, 64, 64);
      const line = {
        step: index + 1,
        of: seq.length,
        requested: v,
        requested8Bit: Math.round(v * 255),
        bufferMeanRed: stats.mean[0],
        bufferMinRed: stats.min[0],
        bufferMaxRed: stats.max[0],
      };
      if (holdLabel) label.textContent = `${line.step}/${line.of}  ${v}`;
      console.log(
        `[EEphotometer] step ${line.step}/${line.of} requested=${v.toFixed(
          6,
        )} ` +
          `buffer mean=${line.bufferMeanRed.toFixed(6)} ` +
          `[${line.bufferMinRed.toFixed(6)}, ${line.bufferMaxRed.toFixed(6)}]`,
        line,
      );
      (window.__EEphotometerLog ??= []).push(line);
      return line;
    };

    const loop = () => {
      if (stopped) return;
      // Fresh dither noise every frame; also keeps the level on screen.
      renderOnce(psychoJS);
      rafId = requestAnimationFrame(loop);
    };

    const next = () => show((index + 1) % seq.length);
    const onKey = (e) => {
      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        show((index - 1 + seq.length) % seq.length);
      }
    };
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKey);
      label.remove();
      console.log(
        "[EEphotometer] stopped. window.__EEphotometerLog holds the sequence; " +
          "reload the page to restore the experiment.",
      );
    };

    window.addEventListener("keydown", onKey);
    next();
    loop();
    console.log(
      `[EEphotometer] ${seq.length} levels. SPACE / → next, ← previous. ` +
        "Take one photometer reading per level; call stop() when done.",
    );
    return { next, stop, level: () => seq[index], levels: seq };
  },
});

/**
 * Install window.__EEcolorProbe when ?colorPipelineProbe is present.
 * Call immediately after psychoJS.openWindow() — the probe needs the WebGL
 * context, and e2e tests wait on the hook before the boot flow advances.
 */
export const installColorPipelineProbe = (psychoJS) => {
  installedPsychoJS = psychoJS;
  if (!colorPipelineProbeActive()) return;
  window.__EEcolorProbe = buildProbe(psychoJS);
  console.info(
    "[EasyEyes color pipeline] probe installed (window.__EEcolorProbe)",
    window.__EEcolorProbe.report(),
  );
};

/**
 * Per-presentation color report: what was requested vs. what reached the
 * drawing buffer, for the frame that has just been flipped.
 *
 * MUST be called at a point where the stimulus is confirmed DRAWN (i.e. a
 * render has already included it), not where it is merely scheduled —
 * otherwise the buffer still holds the previous frame.
 *
 * No-op unless ?colorPipelineLog is present, so this is safe on the hot path
 * and safe for real participants.
 *
 * @param {string} label stimulus kind, e.g. "letter"
 * @param {number[]} [xyPx] stimulus center in PsychoJS CSS pixels
 * @param {object} [extra] extra fields to merge into the record
 */
export const logStimulusColor = (label, xyPx = [0, 0], extra = {}) => {
  if (!colorPipelineLogActive()) return undefined;
  const psychoJS = installedPsychoJS;
  const gl = getGl(psychoJS);
  if (!gl) return undefined;
  try {
    const report = getColorPipelineReport();
    // A patch on the stimulus, and one far from it for the background.
    const at = readRect(psychoJS, xyPx[0], xyPx[1], 48, 48);
    const record = {
      t: Number(performance.now().toFixed(1)),
      label,
      xyPx: [Math.round(xyPx[0]), Math.round(xyPx[1])],
      colorSpace: report.colorSpace,
      float16: report.float16Backbuffer,
      floatColorPath: report.floatColorPath,
      dither: report.dither,
      // Peak is the most-covered pixel (closest to the requested stim color);
      // mean and distinct-level count characterize precision and banding.
      peakRGB: at.max.slice(0, 3).map((v) => Number(v.toFixed(6))),
      meanRGB: at.mean.slice(0, 3).map((v) => Number(v.toFixed(6))),
      distinct8BitLevels: at.distinct8Bit,
      ...extra,
    };
    (window.__EEcolorLog ??= []).push(record);
    console.log(
      `[EEcolor] ${label} @${record.xyPx} peak=${record.peakRGB.join(",")} ` +
        `mean=${record.meanRGB.join(",")} levels=${
          record.distinct8BitLevels
        } ` +
        `(${report.colorSpace}${report.float16Backbuffer ? " float16" : ""}` +
        `${report.dither ? " dither" : ""})`,
      record,
    );
    return record;
  } catch (e) {
    console.warn("[EEcolor] logStimulusColor failed", e);
    return undefined;
  }
};
