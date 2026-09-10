/**
 * In-app ColorCAL test page for the EasyEyes color pipeline, requested by
 * the experiment-wide parameter _screenColorCheckBool (resolved by
 * screenColorPipeline.colorPipelineTestRequested, which also accepts the
 * same name as a URL parameter for experiments compiled before the glossary
 * gained it). threshold.js schedules the page after the compatibility page
 * and RC calibration, before the first block.
 *
 * This is a SCIENTIST'S page, not a participant page. It:
 *   1. exits fullscreen and offers a button that opens the Web Serial
 *      chooser to connect the CRS ColorCAL;
 *   2. draws a dashed square at the screen center showing where the
 *      photocell must rest (removed while a test runs, so only the
 *      stimulus lights the photocell);
 *   3. runs OPT-IN tests — one button per test, each with editable,
 *      explained parameters. Tests are defined in the TESTS registry below;
 *      to add one, append a definition (fields + run) and nothing else.
 *      Currently: protocol Test 3 (effective bit depth), Test 6
 *      (chromaticity / color-space tagging), and Test 9 (transfer function
 *      & the visual display-precision test's step series on black vs. the
 *      gray pedestal, with EasyEyes' dither suspended for the run).
 *   4. after each test, downloads a zip holding the raw CSV plus a
 *      self-contained report.html: the pipeline configuration, the
 *      parameters used, a titled/labeled SVG plot, and a glossary of every
 *      CSV column.
 *
 * The tests exercise whatever pipeline the experiment booted with
 * (_screenColorSpace / _screenFloat16Bool / _screenDitherBool). Because the
 * page implies instrumentation mode, those three are URL-overridable, so
 * control conditions (e.g. dither OFF) are one reload away — no recompile.
 * Method details: tests/e2e/COLOR_PIPELINE_PHOTOMETER_PROTOCOL.md.
 *
 */

import JSZip from "jszip";
import {
  ensureColorCAL,
  colorCALConnected,
  csvFromRecords,
  downloadBlob,
} from "./colorPipelineProbe.js";
import { requestFullscreenSafe } from "./utils.js";
import {
  suspendDither,
  resumeDither,
} from "../psychojs/src/util/ColorPipeline.js";
import {
  DISPLAY_PRECISION_LEVELS,
  PEDESTAL_CODE,
} from "./displayPrecisionScoring.js";

// ------------------------------ reference data -------------------------

// CIE 1931 chromaticities for the report's chromaticity diagram.
const SRGB_TRIANGLE = [
  [0.64, 0.33],
  [0.3, 0.6],
  [0.15, 0.06],
];
const P3_TRIANGLE = [
  [0.68, 0.32],
  [0.265, 0.69],
  [0.15, 0.06],
];
const D65 = [0.3127, 0.329];

// ------------------------------ small helpers --------------------------

// Same system font stack as the compatibility pages' chrome
// (TITLE_FONT_FAMILY in compatibilityUI.js), so this page matches the
// preview / report / headphone-check pages.
const COMPAT_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";

const el = (tag, style = {}, text = "") => {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text) node.textContent = text;
  return node;
};

const timestampForFilename = () =>
  new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Per-step mean and SD of the `nits` column of sweep records. */
const perStepStats = (records) => {
  const byStep = new Map();
  for (const r of records) {
    if (!byStep.has(r.step)) byStep.set(r.step, []);
    byStep.get(r.step).push(r);
  }
  return [...byStep.keys()]
    .sort((a, b) => a - b)
    .map((step) => {
      const rows = byStep.get(step);
      const nits = rows.map((r) => r.nits);
      const mean = nits.reduce((a, b) => a + b, 0) / nits.length;
      const sd = Math.sqrt(
        nits.reduce((a, b) => a + (b - mean) ** 2, 0) /
          Math.max(1, nits.length - 1),
      );
      const xs = rows.map((r) => r.xChroma);
      const ys = rows.map((r) => r.yChroma);
      return {
        step,
        rows,
        mean,
        sd,
        xChroma: xs.reduce((a, b) => a + b, 0) / xs.length,
        yChroma: ys.reduce((a, b) => a + b, 0) / ys.length,
      };
    });
};

// ------------------------------ SVG plots ------------------------------
// Self-contained SVG (no library), embedded in report.html. Every plot has
// a title, labeled axes with units, and a legend — a reader of the report
// alone must understand what they see.

const PLOT_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ca8a04"];

const niceTicks = (min, max, n = 6) => {
  if (!(max > min)) return [min];
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / n)));
  const err = span / n / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const s = mult * step;
  const ticks = [];
  for (let v = Math.ceil(min / s) * s; v <= max + 1e-12; v += s)
    ticks.push(Number(v.toPrecision(10)));
  return ticks;
};

/**
 * Ticks for a logarithmic axis: 1, 2, 5 × 10^n within [min, max]; decades
 * only when the range spans more than four of them.
 */
const logTicks = (min, max) => {
  const lo = Math.floor(Math.log10(min));
  const hi = Math.ceil(Math.log10(max));
  const mantissas = hi - lo > 4 ? [1] : [1, 2, 5];
  const ticks = [];
  for (let e = lo; e <= hi; e++)
    for (const k of mantissas) {
      const v = k * Math.pow(10, e);
      if (v >= min * (1 - 1e-9) && v <= max * (1 + 1e-9))
        ticks.push(Number(v.toPrecision(3)));
    }
  return ticks;
};

/**
 * Categorical-x line chart: one polyline+points per series.
 * series: [{name, values}] with values.length === categories.length.
 * yScale: "linear" (default) or "log" — a log axis shows a display's
 * transfer function as the near-straight line it is, and keeps the
 * near-black levels (a few tenths of a nit) legible next to white
 * (hundreds of nits). Values that cannot be placed on the axis (non-finite,
 * or ≤ 0 on a log axis) are skipped.
 */
const svgLineChart = ({
  title,
  xLabel,
  yLabel,
  categories,
  series,
  width = 800,
  height = 460,
  yScale = "linear",
}) => {
  const log = yScale === "log";
  const plottable = (v) => Number.isFinite(v) && (!log || v > 0);
  const m = { top: 64, right: 24, bottom: 72, left: 84 };
  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;
  const all = series.flatMap((s) => s.values).filter(plottable);
  let yMin = Math.min(...all);
  let yMax = Math.max(...all);
  if (log) {
    const lo = Math.log10(yMin);
    const hi = Math.log10(yMax);
    const pad = (hi - lo || 1) * 0.08;
    yMin = Math.pow(10, lo - pad);
    yMax = Math.pow(10, hi + pad);
  } else {
    const pad = (yMax - yMin || 1) * 0.08;
    yMin -= pad;
    yMax += pad;
  }
  const x = (i) =>
    m.left +
    (categories.length === 1
      ? plotW / 2
      : (i / (categories.length - 1)) * plotW);
  const frac = (v) =>
    log
      ? (Math.log10(v) - Math.log10(yMin)) /
        (Math.log10(yMax) - Math.log10(yMin))
      : (v - yMin) / (yMax - yMin);
  const y = (v) => m.top + plotH - frac(v) * plotH;

  const yTicks = log ? logTicks(yMin, yMax) : niceTicks(yMin, yMax);
  const xEvery = Math.max(1, Math.ceil(categories.length / 16));

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="system-ui, sans-serif" font-size="12">`,
    `<rect width="${width}" height="${height}" fill="white"/>`,
    `<text x="${
      width / 2
    }" y="24" text-anchor="middle" font-size="15" font-weight="600">${escapeHtml(
      title,
    )}</text>`,
  );
  // legend (top, under the title)
  let lx = m.left;
  series.forEach((s, si) => {
    const c = PLOT_COLORS[si % PLOT_COLORS.length];
    parts.push(
      `<line x1="${lx}" y1="42" x2="${
        lx + 22
      }" y2="42" stroke="${c}" stroke-width="2"/>`,
      `<circle cx="${lx + 11}" cy="42" r="3" fill="${c}"/>`,
      `<text x="${lx + 28}" y="46">${escapeHtml(s.name)}</text>`,
    );
    lx += 40 + s.name.length * 6.5;
  });
  // axes
  parts.push(
    `<line x1="${m.left}" y1="${m.top}" x2="${m.left}" y2="${
      m.top + plotH
    }" stroke="#555"/>`,
    `<line x1="${m.left}" y1="${m.top + plotH}" x2="${m.left + plotW}" y2="${
      m.top + plotH
    }" stroke="#555"/>`,
  );
  for (const t of yTicks) {
    const ty = y(t);
    parts.push(
      `<line x1="${m.left - 4}" y1="${ty}" x2="${
        m.left + plotW
      }" y2="${ty}" stroke="#e5e5e5"/>`,
      `<text x="${m.left - 8}" y="${ty + 4}" text-anchor="end">${t}</text>`,
    );
  }
  categories.forEach((c, i) => {
    if (i % xEvery) return;
    parts.push(
      `<text x="${x(i)}" y="${
        m.top + plotH + 18
      }" text-anchor="middle">${escapeHtml(String(c))}</text>`,
    );
  });
  // axis titles
  parts.push(
    `<text x="${m.left + plotW / 2}" y="${
      height - 18
    }" text-anchor="middle" font-size="13">${escapeHtml(xLabel)}</text>`,
    `<text transform="translate(20 ${
      m.top + plotH / 2
    }) rotate(-90)" text-anchor="middle" font-size="13">${escapeHtml(
      yLabel,
    )}</text>`,
  );
  // series
  series.forEach((s, si) => {
    const c = PLOT_COLORS[si % PLOT_COLORS.length];
    const pts = s.values
      .map((v, i) => (plottable(v) ? `${x(i)},${y(v)}` : null))
      .filter(Boolean)
      .join(" ");
    parts.push(
      `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2"/>`,
    );
    s.values.forEach((v, i) => {
      if (plottable(v))
        parts.push(`<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${c}"/>`);
    });
  });
  parts.push("</svg>");
  return parts.join("\n");
};

/**
 * CIE 1931 (x, y) chromaticity diagram: sRGB and Display-P3 primary
 * triangles, the D65 white point, and the measured points.
 * points: [{x, y, label}]
 */
const svgChromaticityPlot = ({ title, points, width = 620, height = 620 }) => {
  const m = { top: 64, right: 24, bottom: 72, left: 84 };
  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;
  const X_MAX = 0.8;
  const Y_MAX = 0.9;
  const px = (v) => m.left + (v / X_MAX) * plotW;
  const py = (v) => m.top + plotH - (v / Y_MAX) * plotH;
  const tri = (t) => t.map(([a, b]) => `${px(a)},${py(b)}`).join(" ");

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="system-ui, sans-serif" font-size="12">`,
    `<rect width="${width}" height="${height}" fill="white"/>`,
    `<text x="${
      width / 2
    }" y="24" text-anchor="middle" font-size="15" font-weight="600">${escapeHtml(
      title,
    )}</text>`,
  );
  // legend
  parts.push(
    `<line x1="${m.left}" y1="42" x2="${
      m.left + 22
    }" y2="42" stroke="#2563eb" stroke-width="2"/>`,
    `<text x="${m.left + 28}" y="46">sRGB primaries</text>`,
    `<line x1="${m.left + 130}" y1="42" x2="${
      m.left + 152
    }" y2="42" stroke="#dc2626" stroke-width="2" stroke-dasharray="5 3"/>`,
    `<text x="${m.left + 158}" y="46">Display-P3 primaries</text>`,
    `<circle cx="${m.left + 310}" cy="42" r="4" fill="#111"/>`,
    `<text x="${m.left + 320}" y="46">measured</text>`,
    `<text x="${m.left + 400}" y="46">+ D65 white</text>`,
  );
  // grid + axes
  for (let v = 0; v <= X_MAX + 1e-9; v += 0.1) {
    parts.push(
      `<line x1="${px(v)}" y1="${m.top}" x2="${px(v)}" y2="${
        m.top + plotH
      }" stroke="#eee"/>`,
      `<text x="${px(v)}" y="${
        m.top + plotH + 18
      }" text-anchor="middle">${v.toFixed(1)}</text>`,
    );
  }
  for (let v = 0; v <= Y_MAX + 1e-9; v += 0.1) {
    parts.push(
      `<line x1="${m.left}" y1="${py(v)}" x2="${m.left + plotW}" y2="${py(
        v,
      )}" stroke="#eee"/>`,
      `<text x="${m.left - 8}" y="${py(v) + 4}" text-anchor="end">${v.toFixed(
        1,
      )}</text>`,
    );
  }
  parts.push(
    `<line x1="${m.left}" y1="${m.top}" x2="${m.left}" y2="${
      m.top + plotH
    }" stroke="#555"/>`,
    `<line x1="${m.left}" y1="${m.top + plotH}" x2="${m.left + plotW}" y2="${
      m.top + plotH
    }" stroke="#555"/>`,
    `<text x="${m.left + plotW / 2}" y="${
      height - 18
    }" text-anchor="middle" font-size="13">CIE 1931 chromaticity x (dimensionless)</text>`,
    `<text transform="translate(20 ${
      m.top + plotH / 2
    }) rotate(-90)" text-anchor="middle" font-size="13">CIE 1931 chromaticity y (dimensionless)</text>`,
  );
  // gamut triangles + white point
  parts.push(
    `<polygon points="${tri(
      SRGB_TRIANGLE,
    )}" fill="none" stroke="#2563eb" stroke-width="2"/>`,
    `<polygon points="${tri(
      P3_TRIANGLE,
    )}" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="5 3"/>`,
    `<text x="${px(D65[0]) - 6}" y="${
      py(D65[1]) + 4
    }" text-anchor="end" font-size="14">+</text>`,
  );
  // measured points
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    parts.push(
      `<circle cx="${px(p.x)}" cy="${py(p.y)}" r="4" fill="#111"/>`,
      `<text x="${px(p.x) + 7}" y="${py(p.y) - 6}">${escapeHtml(
        p.label,
      )}</text>`,
    );
  }
  parts.push("</svg>");
  return parts.join("\n");
};

// ------------------------------ report.html ----------------------------

// One entry per column of the colorcal-text CSV (the schema both current
// tests share). Extend if a future test adds columns.
const CSV_COLUMN_GLOSSARY = [
  [
    "step",
    "Which level of the sweep (1-based). One level = one fg/bg pair held on screen.",
  ],
  ["sample", "Which of the repeated ColorCAL readings at that level."],
  [
    "fgR, fgG, fgB",
    "Requested text-foreground color, as fractions 0–1 of each channel's maximum (value × 255 = the 8-bit code).",
  ],
  ["bgR, bgG, bgB", "Requested background color, same 0–1 scale."],
  [
    "bufferPeakR/G/B",
    "Largest value found in a patch of the WebGL drawing buffer at screen center, read just before the photometer readings (0–1). The most-covered pixel — closest to pure foreground. With dithering it exceeds the request by up to half an 8-bit step (the largest noise excursion).",
  ],
  [
    "bufferMeanR/G/B",
    "Mean of the same patch (0–1). What our code delivered BEFORE the operating system's compositor and the panel; comparing it with nits tells you on which side of the compositor any loss happened.",
  ],
  [
    "distinct8BitLevels",
    "Number of different 8-bit codes present in the patch: 1 = uniform quantized field; ≥2 = dither noise straddling adjacent codes.",
  ],
  [
    "nits",
    "Measured luminance in cd/m² (= the Y column, repeated under a friendlier name).",
  ],
  [
    "X, Y, Z",
    "CIE 1931 tristimulus values from the ColorCAL (calibration matrix × raw counts). Y is luminance.",
  ],
  [
    "xChroma, yChroma",
    "CIE chromaticity: x = X/(X+Y+Z), y = Y/(X+Y+Z). Brightness-independent color. D65 white is (0.3127, 0.3290). Unreliable below ~0.5 nits (instrument noise floor).",
  ],
  ["timeSec", "Seconds since the sweep started when the reading returned."],
  [
    "series (Test 9 only)",
    "Which part of the run this level belongs to: 'transfer' = the 0→1 transfer-function ramp; 'base1', 'base2', … = the precision-step series built on the 1st, 2nd, … base level.",
  ],
  [
    "baseCode (Test 9 only)",
    "The base level (0–1) the step was added to — the field the photocell sees around the block; equals bgR. For transfer rows, the level itself.",
  ],
  [
    "stepCode (Test 9 only)",
    "The precision step added to the base (0–1 scale): 1/4095, 1/2047, 1/1023, 1/511, 1/255, 1/127 — the visual display-precision test's digit codes (12- down to 7-bit LSBs). 0 for the base itself and for transfer rows; fgR = baseCode + stepCode.",
  ],
  [
    "stepLabel (Test 9 only)",
    "Human-readable step: 'transfer', 'base', or '1/4095' … '1/127'.",
  ],
];

const pipelineConfigRows = (report) =>
  [
    ["colorSpace", report.colorSpace],
    ["float16Backbuffer", report.float16Backbuffer],
    ["dither", report.dither],
    ["ditherLsb", report.ditherLsb],
    ["floatColorPath", report.floatColorPath],
    ["failures", (report.failures ?? []).join("; ") || "none"],
    ["screenColorDepth (browser hint)", report.screenColorDepth],
    ["minColor10Bits (browser hint)", report.minColor10Bits],
    ["dynamicRangeHigh (browser hint)", report.dynamicRangeHigh],
    ["devicePixelRatio", report.devicePixelRatio],
  ]
    .map(
      ([k, v]) =>
        `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(String(v))}</td></tr>`,
    )
    .join("");

const buildReportHtml = ({
  testTitle,
  description,
  paramsUsed,
  report,
  plotSvg,
  summaryHtml,
}) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${escapeHtml(testTitle)}</title>
<style>
 body { font-family: system-ui, sans-serif; max-width: 880px; margin: 24px auto; padding: 0 16px; color: #111; }
 h1 { font-size: 22px; } h2 { font-size: 17px; margin-top: 28px; }
 table { border-collapse: collapse; margin: 8px 0; }
 td, th { border: 1px solid #ccc; padding: 4px 10px; font-size: 13px; text-align: left; vertical-align: top; }
 .muted { color: #555; font-size: 13px; }
</style></head><body>
<h1>${escapeHtml(testTitle)}</h1>
<p class="muted">EasyEyes color pipeline test (ColorCAL) · ${escapeHtml(
  new Date().toString(),
)} · ${escapeHtml(document.title || window.location.pathname)}</p>
<p>${escapeHtml(description)}</p>
<h2>Pipeline configuration during this run</h2>
<table>${pipelineConfigRows(report)}</table>
<h2>Test parameters used</h2>
<table>${Object.entries(paramsUsed)
  .map(
    ([k, v]) =>
      `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(String(v))}</td></tr>`,
  )
  .join("")}</table>
<h2>Plot</h2>
${plotSvg}
${summaryHtml ?? ""}
<h2>What each CSV column means</h2>
<table><tr><th>Column</th><th>Meaning</th></tr>${CSV_COLUMN_GLOSSARY.map(
  ([c, m]) => `<tr><td>${escapeHtml(c)}</td><td>${escapeHtml(m)}</td></tr>`,
).join("")}</table>
</body></html>`;

// ------------------------------ test registry --------------------------

/**
 * Each test: { id, title, blurb, fields, run }.
 * fields: [{ key, label, explain, default, parse }] — parse(string) must
 *   return the typed value or throw with a human-readable message.
 * run({ probe, values, onProgress }) → { baseName, records, plotSvg,
 *   description, summaryHtml, pipelineReport? } — the page zips records +
 *   report.html. A test that alters the pipeline for the duration of its
 *   run (e.g. suspends dither) returns `pipelineReport`, the probe report
 *   taken DURING the run, so report.html documents the state the readings
 *   were taken in rather than the restored state.
 */

const num =
  (label, { min = -Infinity, max = Infinity, integer = false } = {}) =>
  (s) => {
    const v = Number(s);
    if (
      !Number.isFinite(v) ||
      v < min ||
      v > max ||
      (integer && !Number.isInteger(v))
    )
      throw new Error(
        `${label} must be ${
          integer ? "an integer" : "a number"
        } in [${min}, ${max}]`,
      );
    return v;
  };

const parseTriplets = (s) => {
  const triplets = s
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const parts = t.split(",").map((p) => Number(p.trim()));
      if (
        parts.length !== 3 ||
        parts.some((v) => !Number.isFinite(v) || v < 0 || v > 1)
      )
        throw new Error(
          `Colors must be semicolon-separated R,G,B triplets with each value in 0–1 (got "${t}")`,
        );
      return parts;
    });
  if (!triplets.length) throw new Error("Give at least one R,G,B triplet");
  return triplets;
};

const configLabel = (report) =>
  `${report.dither ? "dither ON" : "dither OFF"}, ` +
  `${report.float16Backbuffer ? "float16 ON" : "float16 OFF"}, ` +
  `${report.colorSpace}`;

// --- Test 9 helpers ---------------------------------------------------

// The brightest precision step (1/127) must still fit below white.
const MAX_BASE = 1 - 1 / 127;

const parseBases = (s) => {
  const bases = s
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const v = Number(t);
      if (!Number.isFinite(v) || v < 0 || v > MAX_BASE)
        throw new Error(
          `Each base must be a number in [0, ${MAX_BASE.toFixed(
            4,
          )}] so that base + 1/127 ≤ 1 (got "${t}")`,
        );
      return v;
    });
  if (!bases.length) throw new Error("Give at least one base level");
  return bases;
};

const parseTransferLevels = (s) => {
  const v = Number(s);
  if (!Number.isInteger(v) || v < 0 || v === 1 || v > 64)
    throw new Error(
      "Transfer-function levels must be 0 (skip) or an integer in [2, 64]",
    );
  return v;
};

const parseOnOff = (s) => {
  const v = s.trim().toLowerCase();
  if (v !== "on" && v !== "off")
    throw new Error('Dither during this test must be "off" or "on"');
  return v;
};

const parseLabel = (s) => s.trim().slice(0, 80);

const safeFilenamePart = (s) =>
  s
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/** "1/4095" for a precision level. */
const stepLabelOf = (level) => `1/${Math.round(1 / level.value)}`;

/** Compact name of a base level (legends advance by name length); the
 * exact code is printed separately with fmtCode. */
const baseLabelOf = (base) =>
  base === 0
    ? "black (0)"
    : Math.abs(base - PEDESTAL_CODE) < 1e-12
    ? "pedestal 1/3"
    : String(base);

/** A code with its position on the 8-bit grid, e.g. "0.0800000 (×255 = 20.40)". */
const fmtCode = (v) => `${v.toFixed(7)} (×255 = ${(v * 255).toFixed(2)})`;

const fmtOrDash = (v, digits) => (Number.isFinite(v) ? v.toFixed(digits) : "—");

/**
 * Fit nits = a + b·code^γ to the transfer-function ramp (protocol Test 1):
 * a = the measured black level (code 0) when present, then ordinary least
 * squares of ln(nits − a) on ln(code) over the levels above black.
 * Returns null when there are too few points to say anything.
 */
const fitTransferFunction = (points) => {
  if (points.length < 3) return null;
  const sorted = [...points].sort((p, q) => p.code - q.code);
  const a =
    sorted[0].code === 0
      ? sorted[0].nits
      : Math.min(...sorted.map((p) => p.nits));
  const white = sorted[sorted.length - 1];
  const usable = sorted.filter((p) => p.code > 0 && p.nits - a > 0);
  if (usable.length < 2)
    return {
      blackNits: a,
      whiteNits: white.nits,
      gamma: NaN,
      scale: NaN,
      n: 0,
    };
  const xs = usable.map((p) => Math.log(p.code));
  const ys = usable.map((p) => Math.log(p.nits - a));
  const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const mx = mean(xs);
  const my = mean(ys);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  const gamma = sxx > 0 ? sxy / sxx : NaN;
  const scale = Math.exp(my - gamma * mx);
  return {
    blackNits: a,
    whiteNits: white.nits,
    gamma,
    scale,
    n: usable.length,
  };
};

const TESTS = [
  {
    id: "bitDepth",
    title: "Effective bit depth for text contrast steps",
    blurb:
      "Draws a solid block of text at the screen center and raises its gray " +
      "level in sub-8-bit steps on a fixed background, reading the ColorCAL " +
      "at each level. Without dithering, an 8-bit display shows a few flat " +
      "plateaus; with _screenDitherBool=TRUE the same steps should form a " +
      "strictly increasing ramp. This run tests the pipeline configuration " +
      "the experiment booted with (shown above); for the dither-OFF " +
      "control, reload with ?_screenDitherBool=FALSE&_screenFloat16Bool=FALSE " +
      "appended to the URL and run again.",
    fields: [
      {
        key: "background",
        label: "Background gray (0–1)",
        explain:
          "The uniform background behind the text block; the staircase starts at this value.",
        default: "0.5",
        parse: num("Background", { min: 0, max: 1 }),
      },
      {
        key: "steps",
        label: "Number of levels",
        explain:
          "How many foreground levels to measure, each one step above the last.",
        default: "16",
        parse: num("Number of levels", { min: 2, max: 64, integer: true }),
      },
      {
        key: "stepDenominator",
        label: "Step size: 1/D of the 0–1 gray scale (this is D)",
        explain:
          "How far apart consecutive levels are. D=255: each level is one full 8-bit " +
          "display step brighter — any display shows all of them. D=1023: levels are " +
          "4× closer than an 8-bit display can show, so they only appear distinct if " +
          "dithering (or a ≥10-bit display) works. D=4095: 16× closer (12-bit-sized).",
        default: "1023",
        parse: num("Step denominator", { min: 2, max: 65535, integer: true }),
      },
      {
        key: "samplesPerLevel",
        label: "Readings per level",
        explain:
          "ColorCAL readings at each level; 3 or more lets the report give mean ± SD.",
        default: "3",
        parse: num("Readings per level", { min: 1, max: 20, integer: true }),
      },
      {
        key: "settleSec",
        label: "Settle (s)",
        explain:
          "Wait after each level change before the first reading; the ColorCAL needs ~5 s to settle for full precision.",
        default: "5",
        parse: num("Settle", { min: 0, max: 60 }),
      },
    ],
    run: async ({ probe, values, onProgress }) => {
      const { background, steps, stepDenominator, samplesPerLevel, settleSec } =
        values;
      const pairs = Array.from({ length: steps }, (_, k) => ({
        fg: Math.min(1, background + k / stepDenominator),
        bg: background,
      }));
      const records = await probe.measureTextWithColorCAL({
        pairs,
        samplesPerLevel,
        settleSec,
        download: false,
        onProgress,
      });
      const report = probe.report();
      const stats = perStepStats(records);
      const increments = stats.slice(1).map((s, i) => s.mean - stats[i].mean);
      const upCount = increments.filter((d) => d > 0).length;
      const plotSvg = svgLineChart({
        title: `Text luminance vs requested gray step (${configLabel(report)})`,
        xLabel: `Requested foreground above ${background}: k/${stepDenominator} (k on axis; 0–1 color scale)`,
        yLabel: "Measured luminance (cd/m², i.e. nits; mean per level)",
        categories: stats.map((s) => `+${s.step - 1}`),
        series: [
          {
            name: `Measured, ${configLabel(report)}`,
            values: stats.map((s) => s.mean),
          },
        ],
      });
      const summaryHtml =
        `<h2>Per-level results</h2><table><tr><th>Level</th><th>Requested fg</th><th>Mean (nits)</th><th>SD</th><th>Δ vs previous</th></tr>` +
        stats
          .map(
            (s, i) =>
              `<tr><td>+${s.step - 1}/${stepDenominator}</td><td>${(
                background +
                (s.step - 1) / stepDenominator
              ).toFixed(7)}</td><td>${s.mean.toFixed(3)}</td><td>${s.sd.toFixed(
                4,
              )}</td><td>${
                i === 0 ? "—" : (s.mean - stats[i - 1].mean).toFixed(3)
              }</td></tr>`,
          )
          .join("") +
        `</table><p>${upCount} of ${increments.length} level-to-level increments are positive. ` +
        `A strictly increasing ramp (${increments.length}/${increments.length}) means every sub-8-bit step was resolved; ` +
        `flat plateaus separated by ~1/255 jumps mean the pipe quantized to 8 bits.</p>`;
      return {
        baseName: `colorcal-test3-bitDepth-${timestampForFilename()}`,
        records,
        plotSvg,
        summaryHtml,
        description:
          `Effective bit depth of the text path: ${steps} foreground levels, each 1/${stepDenominator} ` +
          `above the last, on a ${background} background; ${samplesPerLevel} ColorCAL readings per level, ` +
          `${settleSec} s settling. Configuration: ${configLabel(report)}.`,
      };
    },
  },
  {
    id: "chromaticity",
    title: "Chromatic pairs & color-space tagging",
    blurb:
      "Shows the text block in saturated colors and measures CIE chromaticity " +
      "(x, y) with the ColorCAL. With _screenColorSpace=srgb, red should land " +
      "near sRGB red (x, y ≈ 0.640, 0.330); with display-p3 on a wide-gamut " +
      "display, near P3 red (≈ 0.680, 0.320) — green and blue shift " +
      "analogously, and white/grays must NOT move (the two spaces share the " +
      "white point). On an sRGB-limited panel both taggings land on the " +
      "panel's own primaries. Run once per tagging: reload with " +
      "?_screenColorSpace=display-p3 (or =srgb) appended to the URL to switch.",
    fields: [
      {
        key: "colors",
        label: "Colors (R,G,B; …)",
        explain:
          "Semicolon-separated R,G,B triplets (each 0–1) shown as the text block's color, one level per triplet.",
        default: "1,0,0; 0,1,0; 0,0,1; 1,1,1",
        parse: parseTriplets,
      },
      {
        key: "background",
        label: "Background gray (0–1)",
        explain:
          "Background behind the block; black maximizes the color's share of the light.",
        default: "0",
        parse: num("Background", { min: 0, max: 1 }),
      },
      {
        key: "samplesPerLevel",
        label: "Readings per color",
        explain:
          "ColorCAL readings at each color; 3 or more lets the report give mean ± SD.",
        default: "3",
        parse: num("Readings per color", { min: 1, max: 20, integer: true }),
      },
      {
        key: "settleSec",
        label: "Settle (s)",
        explain:
          "Wait after each color change before the first reading; the ColorCAL needs ~5 s to settle for full precision.",
        default: "5",
        parse: num("Settle", { min: 0, max: 60 }),
      },
    ],
    run: async ({ probe, values, onProgress }) => {
      const { colors, background, samplesPerLevel, settleSec } = values;
      const pairs = colors.map((rgb) => ({ fg: rgb, bg: background }));
      const records = await probe.measureTextWithColorCAL({
        pairs,
        samplesPerLevel,
        settleSec,
        download: false,
        onProgress,
      });
      const report = probe.report();
      const stats = perStepStats(records);
      const label = (i) => `(${colors[i].join(", ")})`;
      const plotSvg = svgChromaticityPlot({
        title: `Measured chromaticity of text colors (tagged ${report.colorSpace})`,
        points: stats.map((s, i) => ({
          x: s.xChroma,
          y: s.yChroma,
          label: label(i),
        })),
      });
      const summaryHtml =
        `<h2>Per-color results</h2><table><tr><th>Requested R,G,B</th><th>x (measured)</th><th>y (measured)</th><th>Luminance (nits)</th></tr>` +
        stats
          .map(
            (s, i) =>
              `<tr><td>${label(i)}</td><td>${s.xChroma.toFixed(
                4,
              )}</td><td>${s.yChroma.toFixed(4)}</td><td>${s.mean.toFixed(
                2,
              )}</td></tr>`,
          )
          .join("") +
        `</table><p>Reference chromaticities — sRGB: R (0.640, 0.330), G (0.300, 0.600), B (0.150, 0.060); ` +
        `Display-P3: R (0.680, 0.320), G (0.265, 0.690), B (0.150, 0.060); D65 white: (0.3127, 0.3290). ` +
        `Chromaticity is unreliable below ~0.5 nits (instrument noise floor).</p>`;
      return {
        baseName: `colorcal-test6-chromaticity-${timestampForFilename()}`,
        records,
        plotSvg,
        summaryHtml,
        description:
          `Chromaticity of ${colors.length} text colors on a ${background} background; ` +
          `${samplesPerLevel} readings per color, ${settleSec} s settling. ` +
          `Configuration: ${configLabel(report)}.`,
      };
    },
  },
  {
    id: "transferFunction",
    title: "Transfer function & precision steps — black vs. gray pedestal",
    blurb:
      "Measures the display's transfer function (luminance vs code, 0→1) and " +
      "then, at each base level, exactly the code steps the visual " +
      "display-precision test (_screenMeasurePrecision) draws its digits at: " +
      "1/4095, 1/2047, 1/1023, 1/511, 1/255, 1/127 above the base. EasyEyes' " +
      "own dither is suspended for the run, as in that test, so only the " +
      "display pipe's quantization is measured. The report shows how much " +
      "light each step adds at black versus on the 1/3 pedestal (why " +
      "near-black digits vanish on some displays), and each step in units of " +
      "the 1/255 step at the same base — the quantization fingerprint: " +
      "proportional = fine or dithered pipe; zero = 8-bit; a full jump for " +
      "sub-8-bit steps = the mid-code-pedestal artifact. Label each run and " +
      "repeat under another display profile to show the profile's effect " +
      "near black. About 5–6 min at the defaults.",
    fields: [
      {
        key: "runLabel",
        label: "Run label (free text, e.g. the display profile)",
        explain:
          "Goes into the zip's filename and the report, so runs under different display profiles, brightness settings, or machines can be told apart.",
        default: "",
        parse: parseLabel,
      },
      {
        key: "transferLevels",
        label: "Transfer-function levels (0 = skip)",
        explain:
          "Uniform gray levels evenly spaced from 0 (black) to 1 (white). Luminance vs code is the display's transfer function (protocol Test 1) — the curve every step below is read against; the report fits nits = a + b·code^γ.",
        default: "11",
        parse: parseTransferLevels,
      },
      {
        key: "bases",
        label: "Base levels (0–1; semicolon-separated)",
        explain:
          "Each base is shown alone, then with each precision step added (faintest first). 0 = black, the visual test's original design. " +
          `${PEDESTAL_CODE} = float16(1/3), the visual test's default background (_screenMeasurePrecisionBackground): exactly on the 8-bit and 10-bit code grids (×255 = ${(
            PEDESTAL_CODE * 255
          ).toFixed(2)}, ×1023 = ${(PEDESTAL_CODE * 1023).toFixed(
            2,
          )}). 0.08 = the first-cut pedestal, mid-way between 8-bit codes (×255 = 20.40): on an 8-bit pipe its sub-8-bit steps round up to a whole code.`,
        default: `0; ${PEDESTAL_CODE}; 0.08`,
        parse: parseBases,
      },
      {
        key: "ditherDuringTest",
        label: "EasyEyes dither during this test (off | on)",
        explain:
          "off = suspend EasyEyes' own noisy-bit dither for the run, exactly as the visual display-precision test does, so the display pipe's own quantization is what gets measured. on = leave it running (control: the dither should make even the finest steps resolvable in luminance). Has no effect if the pipeline booted with dither off.",
        default: "off",
        parse: parseOnOff,
      },
      {
        key: "samplesPerLevel",
        label: "Readings per level",
        explain:
          "ColorCAL readings at each level; 3 or more lets the report give mean ± SD and decide whether a step is resolved (Δ > 2 SE).",
        default: "3",
        parse: num("Readings per level", { min: 1, max: 20, integer: true }),
      },
      {
        key: "settleSec",
        label: "Settle (s)",
        explain:
          "Wait after each level change before the first reading; the ColorCAL needs ~5 s to settle for full precision.",
        default: "5",
        parse: num("Settle", { min: 0, max: 60 }),
      },
    ],
    run: async ({ probe, values, onProgress }) => {
      const {
        runLabel,
        transferLevels,
        bases,
        ditherDuringTest,
        samplesPerLevel,
        settleSec,
      } = values;

      // Faintest step first, so every base's series ascends like the ramp
      // (monotone presentation; hysteresis shows up as a non-monotone run).
      const stepLevels = DISPLAY_PRECISION_LEVELS.slice().reverse();

      // The presentation plan: one entry per photometer level. The block's
      // foreground carries the code under test; the background is the base,
      // exactly the geometry of a digit on its pedestal.
      const plan = [];
      for (let k = 0; k < transferLevels; k++) {
        const code = k / (transferLevels - 1);
        plan.push({
          series: "transfer",
          baseCode: code,
          stepCode: 0,
          stepLabel: "transfer",
          bits: null,
          code,
        });
      }
      bases.forEach((base, bi) => {
        const series = `base${bi + 1}`;
        plan.push({
          series,
          baseCode: base,
          stepCode: 0,
          stepLabel: "base",
          bits: null,
          code: base,
        });
        for (const level of stepLevels)
          plan.push({
            series,
            baseCode: base,
            stepCode: level.value,
            stepLabel: stepLabelOf(level),
            bits: level.bits,
            code: base + level.value,
          });
      });

      // Dither OFF for the run (unless the control is requested): our own
      // dither would synthesize the very sub-LSB steps being measured. The
      // report gets the pipeline state that was in force DURING the run.
      const ditherSuspended =
        ditherDuringTest === "off" ? suspendDither() : false;
      let records;
      let pipelineReport;
      try {
        pipelineReport = probe.report();
        records = await probe.measureTextWithColorCAL({
          pairs: plan.map((p) => ({ fg: p.code, bg: p.baseCode })),
          samplesPerLevel,
          settleSec,
          download: false,
          onProgress,
        });
      } finally {
        if (ditherSuspended) resumeDither();
      }

      // Tie every reading to its place in the plan (step is 1-based).
      for (const r of records) {
        const p = plan[r.step - 1];
        r.series = p.series;
        r.baseCode = p.baseCode;
        r.stepCode = p.stepCode;
        r.stepLabel = p.stepLabel;
      }
      const stats = perStepStats(records);
      const statByStep = new Map(stats.map((s) => [s.step, s]));
      const statOf = (planIndex) => statByStep.get(planIndex + 1);
      const config = configLabel(pipelineReport);

      // --- transfer function ---
      const transferPoints = plan
        .map((p, i) => (p.series === "transfer" ? { p, s: statOf(i) } : null))
        .filter((x) => x && x.s)
        .map(({ p, s }) => ({ code: p.code, nits: s.mean, sd: s.sd }));
      const fit = fitTransferFunction(transferPoints);
      const plots = [];
      if (transferPoints.length >= 2) {
        const series = [
          {
            name: `Measured (${config})`,
            values: transferPoints.map((t) => t.nits),
          },
        ];
        if (fit && Number.isFinite(fit.gamma))
          series.push({
            name: `Fit: ${fit.blackNits.toFixed(3)} + ${fit.scale.toFixed(
              2,
            )}·code^${fit.gamma.toFixed(2)}`,
            values: transferPoints.map(
              (t) => fit.blackNits + fit.scale * Math.pow(t.code, fit.gamma),
            ),
          });
        plots.push(
          svgLineChart({
            title:
              "Display transfer function: luminance vs requested gray code",
            xLabel:
              "Requested gray code (0–1 scale; uniform field, text path, EasyEyes dither as stated)",
            yLabel:
              "Measured luminance (cd/m², i.e. nits; mean per level; log scale)",
            categories: transferPoints.map((t) => t.code.toFixed(2)),
            series,
            // Log axis: the black level (tenths of a nit) and white (hundreds
            // of nits) both stay legible, and a power-law curve plots as a
            // near-straight line whose bend near black is the point of Test 9.
            yScale: "log",
          }),
        );
      }

      // --- precision steps per base ---
      const baseSummaries = bases.map((base, bi) => {
        const series = `base${bi + 1}`;
        const indices = plan
          .map((p, i) => (p.series === series ? i : -1))
          .filter((i) => i >= 0);
        const baseStat = statOf(indices[0]);
        const rows = indices.slice(1).map((i) => {
          const p = plan[i];
          const s = statOf(i);
          const deltaNits = s.mean - baseStat.mean;
          // SE of a difference of two means of samplesPerLevel readings.
          const se = Math.sqrt(
            (s.sd ** 2 + baseStat.sd ** 2) / Math.max(1, samplesPerLevel),
          );
          return {
            ...p,
            mean: s.mean,
            sd: s.sd,
            deltaNits,
            se,
            weber: baseStat.mean > 0 ? deltaNits / baseStat.mean : NaN,
            resolved: deltaNits > 2 * se,
            expectedEightBitSteps: p.stepCode * 255,
            inEightBitSteps: NaN,
          };
        });
        // Normalize every step to the 1/255 step at the same base: a pipe
        // finer than 8 bits (or a dithered one) gives ≈ 255·step; a pure
        // 8-bit pipe gives 0 for sub-8-bit steps at an on-grid base and a
        // full 1.0 for them at a mid-code base (the false-positive artifact).
        const row255 = rows.find((r) => r.bits === 8);
        const unit = row255 && row255.deltaNits > 0 ? row255.deltaNits : NaN;
        for (const r of rows) r.inEightBitSteps = r.deltaNits / unit;
        return { base, baseStat, rows, unitNits: unit };
      });

      const stepCategories = stepLevels.map(stepLabelOf);
      plots.push(
        svgLineChart({
          title: `Light added by each precision step, per base level (${config})`,
          xLabel:
            "Code step added to the base (fraction of white's code): the visual display-precision test's digit codes",
          yLabel: "Δ luminance vs the base alone (cd/m²)",
          categories: stepCategories,
          series: baseSummaries.map((b) => ({
            name: `base ${baseLabelOf(b.base)}`,
            values: b.rows.map((r) => r.deltaNits),
          })),
        }),
      );
      const normalizable = baseSummaries.filter((b) =>
        Number.isFinite(b.unitNits),
      );
      if (normalizable.length)
        plots.push(
          svgLineChart({
            title:
              "Each step in units of the 1/255 step at the same base (quantization fingerprint)",
            xLabel:
              "Code step added to the base (ideal fine/dithered pipe: 255 × step; pure 8-bit pipe: 0 on-grid, 1 mid-code)",
            yLabel:
              "Δ luminance ÷ Δ luminance of the 1/255 step (dimensionless)",
            categories: stepCategories,
            series: [
              ...normalizable.map((b) => ({
                name: `base ${baseLabelOf(b.base)}`,
                values: b.rows.map((r) => r.inEightBitSteps),
              })),
              {
                name: "Ideal: 255 × step",
                values: stepLevels.map((l) => l.value * 255),
              },
            ],
          }),
        );

      // --- summary ---
      const stateLine =
        `<p><strong>Pipeline state during this run:</strong> EasyEyes dither ${
          pipelineReport.dither
            ? "ON (control)"
            : ditherSuspended
            ? "OFF — suspended for the run, exactly as the visual display-precision test does"
            : "OFF (not active in this pipeline)"
        }; float16 backbuffer ${
          pipelineReport.float16Backbuffer ? "ON" : "OFF"
        }; color space ${escapeHtml(String(pipelineReport.colorSpace))}.</p>` +
        (pipelineReport.float16Backbuffer
          ? ""
          : `<p style="color:#b42318"><strong>Warning:</strong> the drawing buffer was not float16, so every code finer than 1/255 was quantized in the browser's own buffer before reaching the display. The sub-8-bit rows below characterize the buffer, not the panel. Reload with ?_screenFloat16Bool=TRUE (Chrome/Edge ≥ 122) for a valid run.</p>`);

      const transferHtml =
        transferPoints.length >= 2
          ? `<h2>Transfer function</h2><table><tr><th>Code</th><th>×255</th><th>Mean (nits)</th><th>SD</th></tr>` +
            transferPoints
              .map(
                (t) =>
                  `<tr><td>${t.code.toFixed(4)}</td><td>${(
                    t.code * 255
                  ).toFixed(1)}</td><td>${t.nits.toFixed(
                    4,
                  )}</td><td>${t.sd.toFixed(4)}</td></tr>`,
              )
              .join("") +
            `</table>` +
            (fit
              ? `<p>Fit nits = a + b·code<sup>γ</sup>: black level a = ${fit.blackNits.toFixed(
                  4,
                )} nits (measured at code 0), white = ${fit.whiteNits.toFixed(
                  2,
                )} nits, γ = ${fmtOrDash(fit.gamma, 3)}, b = ${fmtOrDash(
                  fit.scale,
                  2,
                )} (${
                  fit.n
                } levels above black). Near black the curve is flattest: a code step there yields a small fraction of the light the same step yields at mid-gray — see the next tables.</p>`
              : "")
          : "";

      const baseTables = baseSummaries
        .map(
          (b) =>
            `<h2>Base ${escapeHtml(baseLabelOf(b.base))}: code ${escapeHtml(
              fmtCode(b.base),
            )} → ${b.baseStat.mean.toFixed(4)} ± ${b.baseStat.sd.toFixed(
              4,
            )} nits</h2>` +
            `<table><tr><th>Step added</th><th>Requested code (×255)</th><th>Mean (nits)</th><th>SD</th><th>Δ vs base (nits)</th><th>SE of Δ</th><th>Weber Δ/L<sub>base</sub></th><th>In 1/255-steps: measured / ideal</th><th>Resolved (Δ &gt; 2 SE)?</th></tr>` +
            b.rows
              .map(
                (r) =>
                  `<tr><td>${escapeHtml(r.stepLabel)} (${
                    r.bits
                  }-bit LSB)</td><td>${escapeHtml(
                    fmtCode(r.code),
                  )}</td><td>${r.mean.toFixed(4)}</td><td>${r.sd.toFixed(
                    4,
                  )}</td><td>${r.deltaNits.toFixed(4)}</td><td>${r.se.toFixed(
                    4,
                  )}</td><td>${
                    Number.isFinite(r.weber)
                      ? `${(r.weber * 100).toFixed(2)}%`
                      : "—"
                  }</td><td>${fmtOrDash(
                    r.inEightBitSteps,
                    2,
                  )} / ${r.expectedEightBitSteps.toFixed(2)}</td><td>${
                    r.resolved ? "yes" : "no"
                  }</td></tr>`,
              )
              .join("") +
            `</table>`,
        )
        .join("");

      // Reading of the two headline comparisons, in the data's own numbers.
      const interpretation = [];
      const find = (b, bits) => b.rows.find((r) => r.bits === bits);
      const black = baseSummaries.find((b) => b.base === 0);
      const pedestal = baseSummaries.find(
        (b) => Math.abs(b.base - PEDESTAL_CODE) < 1e-12,
      );
      if (black && pedestal) {
        const b7 = find(black, 7);
        const p7 = find(pedestal, 7);
        const b8 = find(black, 8);
        const p8 = find(pedestal, 8);
        interpretation.push(
          `<li><strong>Black vs pedestal.</strong> The brightest digit step (1/127) added ${b7.deltaNits.toFixed(
            4,
          )} nits on black and ${p7.deltaNits.toFixed(
            4,
          )} nits on the 1/3 pedestal (${
            b7.deltaNits > 0
              ? `${(p7.deltaNits / b7.deltaNits).toFixed(1)}×`
              : "black: none measurable"
          }); the one-8-bit-code step (1/255): ${b8.deltaNits.toFixed(
            4,
          )} vs ${p8.deltaNits.toFixed(
            4,
          )} nits. Whether a near-black step is visible depends on that small absolute amount of light competing with the panel's black glow and room reflections (which the photocell, resting on the screen, does not see), and on how the display profile maps the lowest codes; on the pedestal the same code step is a fixed few percent of a comfortable luminance (Weber ${
            Number.isFinite(p8.weber) ? (p8.weber * 100).toFixed(2) : "—"
          }% for 1/255).</li>`,
        );
      }
      for (const b of baseSummaries) {
        const sub = b.rows.filter((r) => r.bits >= 9);
        const resolved = sub.filter((r) => r.resolved);
        const isProportional = (r) =>
          r.resolved &&
          Number.isFinite(r.inEightBitSteps) &&
          r.inEightBitSteps > 0.5 * r.expectedEightBitSteps &&
          r.inEightBitSteps < 1.5 * r.expectedEightBitSteps;
        const fullJumps = resolved.filter(
          (r) => Number.isFinite(r.inEightBitSteps) && r.inEightBitSteps > 0.75,
        );
        // The two largest sub-8-bit steps carry the evidence: a pipe finer
        // than 8 bits must show 1/511 (0.50 of an 8-bit step) AND 1/1023
        // (0.25) in proportion. A ~2 SE detection of a tiny step while 1/511
        // is absent is noise or drift, not resolution.
        const step511 = sub.find((r) => r.bits === 9);
        const step1023 = sub.find((r) => r.bits === 10);
        const finerThan8Bit =
          isProportional(step511) && isProportional(step1023);
        const proportional = sub.filter(isProportional);
        const step255 = b.rows.find((r) => r.bits === 8);
        let verdict;
        if (!step255.resolved)
          verdict = `not even the one-8-bit-code step (1/255: Δ = ${step255.deltaNits.toFixed(
            4,
          )} ± ${step255.se.toFixed(
            4,
          )} nits) was resolved at this base — every step here is at or below the instrument's noise floor, so this base supports no inference about the pipe's precision. (For black, that IS the finding: the light these codes add is minuscule.)`;
        else if (fullJumps.length && !finerThan8Bit)
          verdict = `${fullJumps
            .map((r) => r.stepLabel)
            .join(" and ")} produced a FULL 8-bit jump (${fullJumps
            .map((r) => r.inEightBitSteps.toFixed(2))
            .join("/")} of an 8-bit step instead of ${fullJumps
            .map((r) => r.expectedEightBitSteps.toFixed(2))
            .join(
              "/",
            )}): the mid-code-base artifact — the base sits between two 8-bit codes (×255 = ${(
            b.base * 255
          ).toFixed(
            2,
          )}), so adding a fraction of a code crosses the rounding boundary and the pipe emits a whole code. A visual test on this base over-reads the display's precision.`;
        else if (finerThan8Bit)
          verdict = `sub-8-bit steps resolved in proportion to their size (1/511 → ${step511.inEightBitSteps.toFixed(
            2,
          )} of an 8-bit step, ideal 0.50; 1/1023 → ${step1023.inEightBitSteps.toFixed(
            2,
          )}, ideal 0.25), down to ${
            proportional[0].stepLabel
          }: consistent with a pipe finer than 8 bits (native ≥10-bit or FRC/driver dithering).`;
        else if (0.5 * b.unitNits < 3 * step511.se)
          verdict = `inconclusive at this base: even a pipe finer than 8 bits would put the 1/511 step at only ≈ ${(
            0.5 * b.unitNits
          ).toFixed(4)} nits here, within the noise (SE ${step511.se.toFixed(
            4,
          )} nits) — judge the pipe's precision from a brighter base.`;
        else
          verdict = `no sub-8-bit step resolved in proportion to its size — the largest, 1/511, gave ${fmtOrDash(
            step511.inEightBitSteps,
            2,
          )} of an 8-bit step instead of 0.50${
            resolved.length
              ? ` (${resolved
                  .map((r) => r.stepLabel)
                  .join(
                    ", ",
                  )} flagged at ~2 SE, but with 1/511 absent that is noise or drift, not resolution)`
              : ""
          }: consistent with an 8-bit pipe.`;
        interpretation.push(
          `<li><strong>Base ${escapeHtml(
            baseLabelOf(b.base),
          )}:</strong> ${verdict}</li>`,
        );
      }
      interpretation.push(
        `<li><strong>Display profile.</strong> Repeat this run under another OS display profile with a different run label and compare the two reports: a profile with a pure-power-law curve (e.g. Adobe RGB (1998)) lifts the near-black codes several-fold (1/127 → about 9/255 sent to the panel) while changing the pedestal rows by only a few percent — the black-based digits come and go with the profile; the pedestal-based ones do not.</li>`,
      );

      const summaryHtml =
        stateLine +
        transferHtml +
        baseTables +
        `<h2>Reading</h2><ul>${interpretation.join("")}</ul>` +
        `<p class="muted">Resolved = Δ &gt; 2 SE, with SE the standard error of the difference of the two level means (${samplesPerLevel} readings each). Weber contrast at black divides by the black level alone and so overstates visibility in a lit room; the absolute Δ (nits) is the relevant quantity there.</p>`;

      const labelPart = runLabel ? `-${safeFilenamePart(runLabel)}` : "";
      return {
        baseName: `colorcal-test9-transferFunction${labelPart}-${timestampForFilename()}`,
        records,
        plotSvg: plots.join("\n"),
        summaryHtml,
        pipelineReport,
        description:
          `Transfer function (${transferLevels} uniform levels 0→1) and the visual display-precision test's ` +
          `step series (${stepCategories.join(", ")} above the base) at ${
            bases.length
          } base level(s): ${bases
            .map(baseLabelOf)
            .join(
              "; ",
            )}; ${samplesPerLevel} readings per level, ${settleSec} s settling. ` +
          `EasyEyes dither ${
            ditherSuspended
              ? "suspended for the run"
              : pipelineReport.dither
              ? "ON (control)"
              : "off (not active in this pipeline)"
          }. Configuration during the run: ${config}.` +
          (runLabel ? ` Run label: ${runLabel}.` : ""),
      };
    },
  },
];

// ------------------------------ the page -------------------------------

const PAGE_ID = "color-pipeline-test-page";

/**
 * Show the test page; resolves when the tester clicks Continue.
 * Requires window.__EEcolorProbe (installColorPipelineProbe with force).
 */
export const showColorPipelineTestPage = async ({ rc } = {}) => {
  const probe = window.__EEcolorProbe;
  if (!probe) {
    console.error(
      "[EEcolorCAL] test page requested but the color probe is not installed",
    );
    return;
  }

  // Web Serial's chooser and the page's form are easier outside fullscreen.
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch (e) {
      /* ignore */
    }
  }

  return new Promise((resolve) => {
    const page = el("div", {
      position: "fixed",
      inset: "0",
      zIndex: "99990",
      background: "#eee",
      color: "#000",
      fontFamily: COMPAT_FONT_FAMILY,
      overflow: "hidden",
    });
    page.id = PAGE_ID;
    page.dataset.eeColorPipelineTestPage = "";

    // Left panel holds all controls; the rest of the screen stays clear so
    // the centered target square (and, during a run, the stimulus drawn on
    // the canvas underneath) is unobstructed. A non-scrolling header
    // (eyebrow + light-weight H1, styled like mountCompatibilityChrome's
    // page title) sits above the scrolling body, so the title stays put the
    // way the compatibility pages' fixed title does.
    const panel = el("div", {
      position: "absolute",
      left: "0",
      top: "0",
      bottom: "0",
      width: "460px",
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
      background: "#eee",
      borderRight: "1px solid #ddd",
    });
    page.appendChild(panel);

    const header = el("div", { flex: "none", padding: "2rem 24px 12px 3rem" });
    const eyebrow = el(
      "div",
      {
        margin: "0 0 0.15em 0",
        fontSize: "1.4rem",
        fontWeight: "400",
        color: "#000",
        lineHeight: "1.6",
      },
      "EasyEyes",
    );
    // 1.8rem / 120% is the compatibility chrome's small-screen H1 size —
    // the right scale for this 460px column.
    const h1 = el("h1", {
      margin: "0",
      padding: "0",
      fontSize: "1.8rem",
      fontWeight: "400",
      color: "#000",
      lineHeight: "120%",
    });
    h1.textContent = "Color pipeline test (ColorCAL)";
    header.appendChild(eyebrow);
    header.appendChild(h1);
    panel.appendChild(header);

    const body = el("div", {
      flex: "1",
      overflowY: "auto",
      padding: "0 24px 20px 3rem",
      boxSizing: "border-box",
    });
    panel.appendChild(body);

    const report = probe.report();
    const configLine = el(
      "div",
      { fontSize: "0.9rem", color: "#555", marginBottom: "14px" },
      `Pipeline this run: ${configLabel(report)}` +
        (report.failures?.length
          ? ` — failures: ${report.failures.join("; ")}`
          : ""),
    );
    body.appendChild(configLine);

    const intro = el("div", { fontSize: "1rem", lineHeight: "1.5" });
    intro.textContent =
      "Plug the CRS ColorCAL into a USB port, lay the screen on its back, " +
      "and rest the photocell gently on the dashed square at the screen " +
      "center. Then connect. In the port chooser the ColorCAL appears as " +
      "“USB Serial Device (COMn)” on Windows or “usbmodem…” on macOS. " +
      "The square disappears while a test runs; only the test stimulus " +
      "lights the photocell.";
    body.appendChild(intro);

    // --- connect ---
    const connectBtn = compatButton(
      "Connect ColorCAL (opens the port chooser)",
    );
    const connectStatus = el("div", {
      fontSize: "0.85rem",
      margin: "6px 0 16px",
      color: "#555",
    });
    connectStatus.textContent = colorCALConnected()
      ? "Connected."
      : "Not connected.";
    body.appendChild(connectBtn);
    body.appendChild(connectStatus);

    // --- center target square ---
    const box = el("div", {
      position: "absolute",
      left: "50%",
      top: "50%",
      width: "220px",
      height: "220px",
      transform: "translate(-50%, -50%)",
      border: "2px dashed #888",
      borderRadius: "8px",
      pointerEvents: "none",
    });
    const boxLabel = el(
      "div",
      {
        position: "absolute",
        left: "50%",
        top: "-34px",
        transform: "translateX(-50%)",
        whiteSpace: "nowrap",
        fontSize: "0.9rem",
        color: "#444",
      },
      "Rest the ColorCAL photocell here",
    );
    box.appendChild(boxLabel);
    page.appendChild(box);

    // --- corner progress indicator (visible while the panel is hidden) ---
    // Deliberately small, dim, and in the corner: the ColorCAL is a contact
    // measurement (it sees only the panel area under its aperture at screen
    // center), and this is DOM, so it never alters the drawing buffer we
    // read back. Keeping it tiny and dark also makes it negligible for
    // OLED/dynamic-contrast panels, whose average picture level can couple
    // into other pixels' luminance.
    const progress = el("div", {
      position: "fixed",
      left: "6px",
      top: "6px",
      zIndex: "99999",
      display: "none",
      pointerEvents: "none",
    });
    const progressText = el("div", {
      font: "12px monospace",
      color: "#777",
    });
    const progressTrack = el("div", {
      width: "240px",
      height: "6px",
      background: "#2c2c2e",
      borderRadius: "3px",
      marginTop: "4px",
      overflow: "hidden",
    });
    const progressFill = el("div", {
      width: "0%",
      height: "100%",
      background: "#56565c",
    });
    progressTrack.appendChild(progressFill);
    progress.appendChild(progressText);
    progress.appendChild(progressTrack);
    page.appendChild(progress);

    const formatSeconds = (s) =>
      s >= 90
        ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`
        : `${Math.round(s)} s`;

    const runButtons = [];
    const setRunning = (running) => {
      panel.style.display = running ? "none" : "flex";
      box.style.display = running ? "none" : "block";
      progress.style.display = running ? "block" : "none";
      // While a test runs, the page must not stand between the canvas and
      // the photocell: the sweep draws on the PsychoJS canvas BENEATH this
      // page, so the page goes transparent (only the corner progress line
      // stays visible).
      page.style.background = running ? "transparent" : "#eee";
      page.style.pointerEvents = running ? "none" : "auto";
    };

    // --- tests ---
    for (const test of TESTS) {
      const card = el("div", {
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "14px 16px",
        margin: "0 0 14px",
        background: "#fff",
      });
      const title = el("div", { fontWeight: "500", fontSize: "1.2rem" });
      title.textContent = test.title;
      card.appendChild(title);
      const blurb = el("div", {
        fontSize: "0.9rem",
        color: "#555",
        margin: "6px 0 10px",
        lineHeight: "1.5",
      });
      blurb.textContent = test.blurb;
      card.appendChild(blurb);

      const inputs = new Map();
      for (const field of test.fields) {
        const row = el("div", { margin: "0 0 8px" });
        const label = el("label", {
          display: "block",
          fontSize: "0.9rem",
          fontWeight: "600",
        });
        label.textContent = field.label;
        const input = el("input", {
          width: "100%",
          boxSizing: "border-box",
          background: "#fff",
          color: "#000",
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "4px 8px",
          font: "13px monospace",
        });
        input.value = field.default;
        input.dataset.eeField = `${test.id}.${field.key}`;
        const explain = el(
          "div",
          { fontSize: "0.8rem", color: "#555", marginTop: "2px" },
          field.explain,
        );
        row.appendChild(label);
        row.appendChild(input);
        row.appendChild(explain);
        card.appendChild(row);
        inputs.set(field.key, input);
      }

      const runBtn = compatButton("Run");
      runBtn.disabled = !colorCALConnected();
      runBtn.dataset.eeRunTest = test.id;
      const result = el("div", {
        fontSize: "0.85rem",
        marginTop: "6px",
        color: "#555",
        whiteSpace: "pre-wrap",
      });
      card.appendChild(runBtn);
      card.appendChild(result);
      body.appendChild(card);
      runButtons.push(runBtn);

      runBtn.onclick = async () => {
        let values;
        try {
          values = {};
          for (const field of test.fields)
            values[field.key] = field.parse(inputs.get(field.key).value.trim());
        } catch (e) {
          result.style.color = "#b42318";
          result.textContent = String(e.message ?? e);
          return;
        }
        result.style.color = "#555";
        result.textContent = "Running…";
        setRunning(true);
        progressFill.style.width = "0%";
        progressText.textContent = "Starting…";
        const runStart = performance.now();
        try {
          const out = await test.run({
            probe,
            values,
            onProgress: ({ step, of, phase, sample, samples }) => {
              // Rough within-level weighting: settling ≈ 40% of a level,
              // the readings share the rest. Good enough for a monotonic,
              // roughly linear bar.
              const SETTLE_WEIGHT = 0.4;
              const within =
                phase === "settling"
                  ? 0
                  : SETTLE_WEIGHT +
                    ((1 - SETTLE_WEIGHT) * ((sample ?? 1) - 1)) /
                      (samples ?? 1);
              const fraction = Math.min(1, (step - 1 + within) / of);
              const elapsedSec = (performance.now() - runStart) / 1000;
              const etaSec =
                fraction > 0.04 ? elapsedSec / fraction - elapsedSec : null;
              progressText.textContent =
                `${test.title
                  .split("—")[0]
                  .trim()}: level ${step}/${of} · ${phase}` +
                (sample ? ` ${sample}/${samples}` : "") +
                (etaSec !== null ? ` · ~${formatSeconds(etaSec)} left` : "");
              progressFill.style.width = `${(fraction * 100).toFixed(1)}%`;
            },
          });
          const zip = new JSZip();
          zip.file(`${out.baseName}.csv`, csvFromRecords(out.records));
          zip.file(
            "report.html",
            buildReportHtml({
              testTitle: test.title,
              description: out.description,
              paramsUsed: values,
              // Tests that alter the pipeline for the run (Test 9 suspends
              // dither) report the state the readings were taken in.
              report: out.pipelineReport ?? probe.report(),
              plotSvg: out.plotSvg,
              summaryHtml: out.summaryHtml,
            }),
          );
          const blob = await zip.generateAsync({ type: "blob" });
          downloadBlob(blob, `${out.baseName}.zip`, "application/zip");
          result.style.color = "#1a7f37";
          result.textContent = `Done. Saved ${out.baseName}.zip (${out.records.length} readings) to Downloads.`;
        } catch (e) {
          console.error("[EEcolorCAL] test failed:", e);
          result.style.color = "#b42318";
          result.textContent = `Failed: ${e.message ?? e}`;
        } finally {
          setRunning(false);
        }
      };
    }

    connectBtn.onclick = async () => {
      connectStatus.textContent = "Opening port chooser…";
      try {
        await ensureColorCAL();
        connectStatus.textContent =
          "Connected. Calibration matrix read. You can run tests.";
        for (const b of runButtons) b.disabled = false;
      } catch (e) {
        connectStatus.textContent = String(e.message ?? e);
      }
    };

    // --- continue ---
    // Bold, like the compatibility report page's Proceed button.
    const continueBtn = compatButton("Continue to the experiment", {
      bold: true,
    });
    continueBtn.style.margin = "16px 0 0";
    continueBtn.dataset.eeColorTestContinue = "";
    continueBtn.onclick = async () => {
      page.remove();
      // Restore the fullscreen the experiment expects (click = user gesture).
      try {
        await requestFullscreenSafe(rc);
      } catch (e) {
        /* non-fatal */
      }
      resolve();
    };
    body.appendChild(continueBtn);

    document.body.appendChild(page);
  });
};

// Buttons match the compatibility pages (the preview page's "Run tests",
// the headphone check's buttons, the report page's Proceed): Bootstrap
// btn-success, width fit-content, 10px padding, 9rem minimum width.
// Bootstrap 5 is loaded by every generated experiment's index.html.
function compatButton(label, { bold = false } = {}) {
  const btn = document.createElement("button");
  btn.classList.add("btn", "btn-success");
  Object.assign(btn.style, {
    display: "block",
    width: "fit-content",
    minWidth: "9rem",
    padding: "10px",
    margin: "10px 0 0",
  });
  if (bold) btn.style.fontWeight = "bold";
  btn.textContent = label;
  return btn;
}
