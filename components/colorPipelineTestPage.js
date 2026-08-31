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
 * Categorical-x line chart: one polyline+points per series.
 * series: [{name, values}] with values.length === categories.length.
 */
const svgLineChart = ({
  title,
  xLabel,
  yLabel,
  categories,
  series,
  width = 800,
  height = 460,
}) => {
  const m = { top: 64, right: 24, bottom: 72, left: 84 };
  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;
  const all = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  let yMin = Math.min(...all);
  let yMax = Math.max(...all);
  const pad = (yMax - yMin || 1) * 0.08;
  yMin -= pad;
  yMax += pad;
  const x = (i) =>
    m.left +
    (categories.length === 1
      ? plotW / 2
      : (i / (categories.length - 1)) * plotW);
  const y = (v) => m.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const yTicks = niceTicks(yMin, yMax);
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
    const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    parts.push(
      `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2"/>`,
    );
    s.values.forEach((v, i) =>
      parts.push(`<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${c}"/>`),
    );
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
 *   description, summaryHtml } — the page zips records + report.html.
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
              report: probe.report(),
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
