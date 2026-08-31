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
 * needs a photometer. Three photometer modes below:
 *
 *   photometer()                  manual sweep for ANY photometer
 *                                 (SPACE advances the level)
 *   measureBackgroundWithColorCAL automated full-field sweep driven by the
 *                                 CRS ColorCAL (Web Serial)
 *   measureTextWithColorCAL       automated fg/bg TEXT sweep through the
 *                                 real TextStim path, driven by the ColorCAL
 *
 * See tests/e2e/COLOR_PIPELINE_PHOTOMETER_PROTOCOL.md for the full protocol.
 */

import * as visual from "../psychojs/src/visual/index.js";
import * as util from "../psychojs/src/util/index.js";
import {
  drawingBufferIsFloat,
  getColorPipelineReport,
  readDrawingBufferRect,
} from "../psychojs/src/util/ColorPipeline.js";
import { checkForBlackout } from "./boundingNew.js";
import { ColorCAL } from "./ColorCAL.js";
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

// ------------------------- ColorCAL-driven sweeps ----------------------

// One shared device for all probe sweeps. NOTE: do not combine with an
// experiment that itself connects the ColorCAL (measureLuminance=measure);
// the Web Serial port supports one reader at a time.
let probeColorCAL = null;

/** Connected and calibrated? (For UI state; connecting is ensureColorCAL.) */
export const colorCALConnected = () => probeColorCAL !== null;

export const ensureColorCAL = async () => {
  if (!probeColorCAL) {
    const device = new ColorCAL();
    // Prompts the user to pick the serial port (requires a user gesture;
    // calls from the DevTools console count). The chooser does NOT show the
    // device by name: Windows lists the ColorCAL as the generic "USB Serial
    // Device (COMn)" (its USB vendor id 0861 is Cambridge Research Systems),
    // macOS as a "usbmodem…" port. Chrome console warnings about Bluetooth
    // devices "blocked by the Serial blocklist" (headphones, game
    // controllers) are unrelated noise.
    await device.connect();
    if (!device.globalReader)
      throw new Error(
        "ColorCAL not connected. In the port chooser pick " +
          '"USB Serial Device (COMn)" (Windows) or "usbmodem…" (macOS) — ' +
          "the chooser does not show the ColorCAL by name. If no such entry " +
          "exists, check the USB cable and that no other program (e.g. CRS " +
          "software, another tab) holds the port.",
      );
    // Cache as soon as the port is open: a calibration failure below must
    // not orphan the open port (a second connect() would find it locked).
    probeColorCAL = device;
  }
  // A zero calibration matrix would map every reading to 0 nits, so a
  // sweep must not run with one. Re-calibrating on the cached device is
  // free, so retry here (covers a failed first calibration too).
  const allZeros = (m) => m.every((row) => row.every((v) => v === 0));
  if (allZeros(probeColorCAL.calibMatrix)) {
    await probeColorCAL.calibrate();
    if (allZeros(probeColorCAL.calibMatrix))
      throw new Error(
        "[EEcolorCAL] calibration matrix is all zeros — every reading " +
          "would be 0 nits. Unplug/replug the ColorCAL, reload the page, " +
          "and reconnect.",
      );
  }
  return probeColorCAL;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** CIE 1931 chromaticity (x, y) from tristimulus [X, Y, Z]. */
const chromaticity = ([X, Y, Z]) => {
  const s = X + Y + Z;
  return s > 0 ? [X / s, Y / s] : [NaN, NaN];
};

/** Array of flat records → CSV string (header from the first record). */
export const csvFromRecords = (records) => {
  if (!records.length) return "";
  const columns = Object.keys(records[0]);
  const escape = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    columns.join(","),
    ...records.map((r) => columns.map((c) => escape(r[c])).join(",")),
  ].join("\n");
};

/** Save a Blob (or string) into the Downloads folder. */
export const downloadBlob = (content, filename, type = "text/csv") => {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

/** Save an array of flat records as CSV into the Downloads folder. */
const downloadCSV = (records, filename) => {
  if (!records.length) return;
  downloadBlob(csvFromRecords(records), filename);
  console.log(`[EEcolorCAL] saved ${records.length} rows to ${filename}`);
};

/** Scalar gray or [r,g,b] → [r,g,b], values in [0,1]. */
const toRGB = (v) => (Array.isArray(v) ? v.slice(0, 3) : [v, v, v]);

const timestampForFilename = () =>
  new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

/**
 * Shared sweep engine. Presents each step through `apply(step)`, keeps a
 * rAF render loop alive throughout (so the dither noise field advances
 * every frame: per-pixel temporal unbiasedness, and no frozen noise
 * pattern), waits `settleSec` for the ColorCAL to settle at
 * the new luminance, then takes `samplesPerLevel` XYZ readings. One CSV
 * row per reading (raw data; average offline).
 */
const runColorCALSweep = async (
  psychoJS,
  steps,
  {
    settleSec,
    samplesPerLevel,
    apply,
    bufferStats,
    filename,
    // false → skip the automatic CSV download (the in-app test page
    // packages the records into a zip instead).
    download = true,
    // Optional per-step callback for UI progress: ({step, of, phase}).
    onProgress,
  },
) => {
  const colorcal = await ensureColorCAL();

  // Hide whatever the app currently draws so the field is controlled.
  for (const stim of psychoJS.window._drawList.slice()) {
    try {
      stim.hide();
    } catch (e) {
      /* not all stims support hide(); ignore */
    }
  }

  let stopped = false;
  let rafId = 0;
  const loop = () => {
    if (stopped) return;
    renderOnce(psychoJS);
    rafId = requestAnimationFrame(loop);
  };
  loop();

  const t0 = performance.now();
  const records = [];
  try {
    for (let i = 0; i < steps.length; i++) {
      apply(steps[i]);
      console.log(
        `[EEcolorCAL] step ${i + 1}/${steps.length} — settling ${settleSec} s`,
        steps[i],
      );
      onProgress?.({ step: i + 1, of: steps.length, phase: "settling" });
      await sleep(settleSec * 1000);
      const stats = bufferStats();
      const nitsOfStep = [];
      for (let s = 0; s < samplesPerLevel; s++) {
        onProgress?.({
          step: i + 1,
          of: steps.length,
          phase: "reading",
          sample: s + 1,
          samples: samplesPerLevel,
        });
        const XYZ = await colorcal.measureXYZ();
        const [xChroma, yChroma] = chromaticity(XYZ);
        nitsOfStep.push(XYZ[1]);
        records.push({
          step: i + 1,
          sample: s + 1,
          ...steps[i].record,
          ...stats,
          nits: XYZ[1],
          X: XYZ[0],
          Y: XYZ[1],
          Z: XYZ[2],
          xChroma,
          yChroma,
          timeSec: ((performance.now() - t0) / 1000).toFixed(3),
        });
      }
      const mean = nitsOfStep.reduce((a, b) => a + b, 0) / nitsOfStep.length;
      const sd = Math.sqrt(
        nitsOfStep.reduce((a, b) => a + (b - mean) ** 2, 0) /
          Math.max(1, nitsOfStep.length - 1),
      );
      console.log(
        `[EEcolorCAL] step ${i + 1}/${steps.length}: ${mean.toFixed(4)} nits` +
          (samplesPerLevel > 1 ? ` ± ${sd.toFixed(4)} (SD)` : ""),
      );
    }
  } catch (error) {
    // Salvage a mid-sweep failure: save what was measured, then rethrow.
    if (records.length) {
      const partial = filename.replace(/\.csv$/, "-partial.csv");
      (window.__EEcolorCALLog ??= []).push({ filename: partial, records });
      downloadCSV(records, partial);
    }
    throw error;
  } finally {
    stopped = true;
    cancelAnimationFrame(rafId);
  }

  (window.__EEcolorCALLog ??= []).push({ filename, records });
  if (download) {
    downloadCSV(records, filename);
    console.log(
      "[EEcolorCAL] sweep done. Reload the page to restore the experiment.",
    );
  }
  return records;
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
   * Keeps rendering in a rAF loop so the dither noise field advances
   * every frame (per-pixel temporal unbiasedness; a frozen frame would
   * hold a single static noise realization).
   *
   * Reload the page when finished; this deliberately hides the app's stimuli.
   *
   * @param {number[]} [levels] achromatic levels in [0,1]
   * @returns {{next:Function, stop:Function, level:Function}}
   */
  photometer: ({ levels, holdLabel = false } = {}) => {
    const seq = levels ?? [
      // 10-bit staircase around mid-gray for effective bit depth. // 11-step coarse ramp for the transfer function, then a 16-step
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

  /**
   * AUTOMATED full-field background sweep with the CRS ColorCAL.
   *
   * Presents each level through the real float-background path (white quad
   * × ColorizeFilter when the pipeline is on), keeps the dither noise
   * advancing every frame, waits settleSec (the ColorCAL is a slow precise
   * instrument: 5 s to settle for >12-bit readings), then reads CIE XYZ.
   * Saves colorcal-background-*.csv (one row per reading) to Downloads.
   *
   * @param {(number|number[])[]} [levels] gray scalars or [r,g,b] triplets
   * @param {number} [settleSec] settling time before the first reading
   * @param {number} [samplesPerLevel] readings per level (SD printed)
   * @param {number} [patchCss] side of the center patch for buffer stats
   * @param {string} [filename]
   */
  measureBackgroundWithColorCAL: async ({
    levels,
    settleSec = 5,
    samplesPerLevel = 1,
    patchCss = 64,
    filename,
    download = true,
    onProgress,
  } = {}) => {
    const seq = levels ?? [
      // 11-step coarse ramp for the transfer function, then a 16-step
      // 10-bit staircase around mid-gray for effective bit depth.
      ...Array.from({ length: 11 }, (_, i) => i / 10),
      ...Array.from({ length: 16 }, (_, i) => 0.5 + i / 1023),
    ];
    const steps = seq.map((v) => {
      const rgb = toRGB(v);
      return {
        rgb,
        record: {
          requestedR: rgb[0],
          requestedG: rgb[1],
          requestedB: rgb[2],
          requestedR8Bit: Math.round(rgb[0] * 255),
        },
      };
    });
    return runColorCALSweep(psychoJS, steps, {
      settleSec,
      samplesPerLevel,
      download,
      onProgress,
      apply: (step) => setBackground(psychoJS, step.rgb),
      bufferStats: () => {
        const s = readRect(psychoJS, 0, 0, patchCss, patchCss);
        return {
          bufferMeanR: s.mean[0],
          bufferMeanG: s.mean[1],
          bufferMeanB: s.mean[2],
          bufferMinR: s.min[0],
          bufferMaxR: s.max[0],
          distinct8BitLevels: s.distinct8Bit,
        };
      },
      filename: filename ?? `colorcal-background-${timestampForFilename()}.csv`,
    });
  },

  /**
   * AUTOMATED text foreground/background sweep with the CRS ColorCAL —
   * the text counterpart of measureBackgroundWithColorCAL, and the direct
   * photometric test of EasyEyes text color management for legibility
   * studies. Each step presents a real visual.TextStim (the same class
   * that draws letter, rsvpReading, and reading stimuli) with the step's
   * foreground color on the step's background color, through whatever
   * pipeline is configured (_screen* parameters or their URL overrides).
   *
   * The default stimulus is a solid block of █ glyphs centered on the
   * screen, large enough that the photocell resting on the screen center
   * sees essentially pure foreground: any row-seam coverage is a constant
   * factor that cancels in linear fits. Pass real letters as `text` (and a
   * `font`) to measure antialiased text instead — then the photometer sees
   * the space-average of foreground ink and background showing through.
   *
   * Saves colorcal-text-*.csv (one row per reading) to Downloads.
   *
   * @param {{fg:(number|number[]), bg:(number|number[])}[]} [pairs]
   * @param {string} [text] stimulus text; default solid █ block
   * @param {string} [font] font family for the TextStim
   * @param {number} [heightPx] per-line text height in px
   * @param {number} [settleSec]
   * @param {number} [samplesPerLevel]
   * @param {number} [patchCss] side of the center patch for buffer stats
   * @param {string} [filename]
   */
  measureTextWithColorCAL: async ({
    pairs,
    text = "██████\n██████\n██████",
    font,
    heightPx = 150,
    settleSec = 5,
    samplesPerLevel = 1,
    patchCss = 64,
    filename,
    download = true,
    onProgress,
  } = {}) => {
    // Default: 11-step foreground gray ramp on a white background — the
    // transfer function of the TEXT path.
    const seq =
      pairs ?? Array.from({ length: 11 }, (_, i) => ({ fg: i / 10, bg: 1 }));

    const stim = new visual.TextStim({
      win: psychoJS.window,
      name: "colorPipelineProbe-colorcal",
      text,
      font,
      units: "pix",
      height: heightPx,
      pos: [0, 0],
      color: new util.Color(rgbString([0, 0, 0])),
      wrapWidth: Infinity,
      autoLog: false,
    });

    const steps = seq.map((pair) => {
      const fg = toRGB(pair.fg);
      const bg = toRGB(pair.bg);
      return {
        fg,
        bg,
        record: {
          fgR: fg[0],
          fgG: fg[1],
          fgB: fg[2],
          bgR: bg[0],
          bgG: bg[1],
          bgB: bg[2],
        },
      };
    });

    try {
      return await runColorCALSweep(psychoJS, steps, {
        settleSec,
        samplesPerLevel,
        download,
        onProgress,
        apply: (step) => {
          setBackground(psychoJS, step.bg);
          stim.setColor(new util.Color(rgbString(step.fg)));
          stim.setAutoDraw(true);
          renderOnce(psychoJS);
        },
        bufferStats: () => {
          const s = readRect(psychoJS, 0, 0, patchCss, patchCss);
          return {
            // Peak = most-covered pixel (closest to pure foreground);
            // mean = space-average of the patch (fg ink + bg through).
            bufferPeakR: s.max[0],
            bufferPeakG: s.max[1],
            bufferPeakB: s.max[2],
            bufferMeanR: s.mean[0],
            bufferMeanG: s.mean[1],
            bufferMeanB: s.mean[2],
            distinct8BitLevels: s.distinct8Bit,
          };
        },
        filename: filename ?? `colorcal-text-${timestampForFilename()}.csv`,
      });
    } finally {
      stim.setAutoDraw(false);
      renderOnce(psychoJS);
    }
  },
});

/**
 * Install window.__EEcolorProbe when ?colorPipelineProbe is present, or
 * unconditionally with `force` (the _screenColorCheckBool test
 * page needs the probe with no URL parameter).
 * Call immediately after psychoJS.openWindow() — the probe needs the WebGL
 * context, and e2e tests wait on the hook before the boot flow advances.
 */
export const installColorPipelineProbe = (psychoJS, { force = false } = {}) => {
  installedPsychoJS = psychoJS;
  if (!force && !colorPipelineProbeActive()) return;
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
