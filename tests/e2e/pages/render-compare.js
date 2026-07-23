/**
 * General-purpose browser rendering comparison page.
 *
 * Compares text rendering between:
 *   1. Canvas + baked font (our approach: features baked into GSUB, no CSS)
 *   2. DOM + CSS font-feature-settings (ground truth: raw font + CSS)
 *   3. Canvas + raw font (baseline: no feature modification)
 *
 * Uses the TextStim rendering path:
 *   PIXI.Text + canvasContextState (applyDirectionAcrossResizes, etc.)
 *   + ctx.lang + ctx.direction + pixi.updateText(true)
 *   + fontPadding (prevents canvas text clipping, like TextStim)
 *
 * Usage (from Playwright):
 *   const result = await page.evaluate((config) => window.runComparison(config), testCase);
 *
 * Future use: any text-centric parameter (kerning, direction, textRendering,
 * letter spacing, etc.) can be tested by extending the config.
 */

import * as PIXI from "/psychojs/node_modules/pixi.js-legacy/dist/browser/pixi-legacy.mjs";
import {
  applyDirectionAcrossResizes,
  applyKerningAcrossResizes,
  applyTextRenderingAcrossResizes,
} from "/psychojs/src/visual/canvasContextState.js";
import { mergeLigatureFeatureSettings } from "/components/fontVariantLigatures.ts";

/**
 * @typedef {Object} ComparisonConfig
 * @property {string} fontUrl - URL to the raw font file
 * @property {string} rawFamily - Font family name for the raw font
 * @property {string} bakedFamily - Font family name for the baked font
 * @property {string} text - Text to render
 * @property {string} features - fontFeatureSettings string (e.g., '"liga" 0')
 * @property {string} [ligatures] - fontVariantLigatures keywords (e.g.,
 *   "discretionary-ligatures"). When set, the DOM ground truth uses the CSS
 *   font-variant-ligatures property and the bake string is produced by the
 *   PRODUCTION translation (mergeLigatureFeatureSettings), so the comparison
 *   covers the full chain: keywords → translation → WASM bake → canvas.
 * @property {string} [lang="en"] - Language for ctx.lang / HTML lang
 * @property {string} [direction="ltr"] - "ltr" or "rtl"
 * @property {string} [kerning="auto"] - ctx.fontKerning value
 * @property {string} [textRendering="auto"] - ctx.textRendering value
 * @property {number} [fontSize=40] - Font size in pixels
 * @property {number} [padding=0.2] - fontPadding multiplier (× fontSize)
 */

/**
 * @typedef {Object} ComparisonResult
 * @property {number} canvasWidth - ctx.measureText width with baked font
 * @property {number} canvasInk - dark pixel count with baked font
 * @property {number} domWidth - DOM element width with CSS features
 * @property {number} baselineWidth - ctx.measureText width with raw font
 * @property {number} baselineInk - dark pixel count with raw font
 * @property {number} widthDiff - |canvasWidth - domWidth|
 * @property {boolean} widthMatch - widthDiff <= tolerance
 * @property {boolean} featureHadEffect - baseline != baked (rendering changed)
 * @property {boolean} bakedMatchesCss - canvas baked == DOM CSS (faithfulness)
 */

const FONT_CACHE = new Map();

async function loadFont(url, familyName) {
  if (FONT_CACHE.has(familyName)) return FONT_CACHE.get(familyName);
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const blob = new Blob([buf], { type: "font/ttf" });
  const ff = new FontFace(familyName, `url(${URL.createObjectURL(blob)})`);
  await ff.load();
  document.fonts.add(ff);
  FONT_CACHE.set(familyName, new Uint8Array(buf));
  return FONT_CACHE.get(familyName);
}

async function loadWasm() {
  const wasm = await import("/@rust/pkg/easyeyes_wasm.js");
  await wasm.default();
  return wasm;
}

/**
 * Render text on canvas using the TextStim rendering path.
 * Returns the PIXI canvas (for pixel inspection) and advance width.
 */
function renderOnCanvas(family, text, config) {
  const padding = Math.round((config.padding ?? 0.2) * config.fontSize);
  const style = new PIXI.TextStyle({
    fontFamily: family,
    fontSize: config.fontSize,
    fill: "black",
    align: config.direction === "rtl" ? "right" : "left",
    wordWrap: false,
    padding,
  });

  const pixi = new PIXI.Text(text, style);

  // TextStim._updateIfNeeded() canvas setup
  const canvas = pixi.canvas || (pixi.context && pixi.context.canvas);
  if (canvas) {
    const lang = config.lang || "en";
    const dir = config.direction || "ltr";
    canvas.setAttribute("lang", lang);
    applyDirectionAcrossResizes(canvas, dir, lang);
    applyKerningAcrossResizes(canvas, config.kerning || "auto");
    applyTextRenderingAcrossResizes(canvas, config.textRendering || "auto");
    applyKerningAcrossResizes(
      PIXI.TextMetrics._canvas,
      config.kerning || "auto",
    );
    applyTextRenderingAcrossResizes(
      PIXI.TextMetrics._canvas,
      config.textRendering || "auto",
    );
    pixi.updateText(true);
  }

  // Measure advance width (independent of canvas size/padding)
  const measureCanvas = document.createElement("canvas").getContext("2d");
  measureCanvas.font = `${config.fontSize}px ${family}`;
  measureCanvas.direction = config.direction || "ltr";
  if ("lang" in measureCanvas) measureCanvas.lang = config.lang || "en";
  const advanceWidth = measureCanvas.measureText(text).width;

  return { canvas: pixi.canvas, advanceWidth };
}

/**
 * Render text in a DOM element with CSS font-feature-settings.
 * Returns the element's rendered width.
 */
function renderOnDom(family, text, config) {
  const span = document.createElement("span");
  span.style.cssText = `
    font-family: ${family};
    font-size: ${config.fontSize}px;
    ${
      config.ligatures
        ? `font-variant-ligatures: ${config.ligatures};`
        : `font-feature-settings: ${config.features || "normal"};`
    }
    direction: ${config.direction || "ltr"};
    position: absolute;
    left: 0; top: 0;
    margin: 0; padding: 0; border: 0;
    white-space: nowrap;
    visibility: hidden;
  `;
  span.setAttribute("lang", config.lang || "en");
  span.textContent = text;
  document.body.appendChild(span);
  const width = span.getBoundingClientRect().width;
  document.body.removeChild(span);
  return width;
}

/** Count dark (non-white) pixels in a canvas. */
function countInk(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) ink++;
  }
  return ink;
}

/**
 * Run a rendering comparison.
 * @param {ComparisonConfig} config
 * @returns {Promise<ComparisonResult>}
 */
async function runComparison(config) {
  const log = document.getElementById("log");
  log.textContent = `Comparing: ${config.text.substring(0, 30)}...`;

  // Load WASM and fonts
  const wasm = await loadWasm();
  const rawFont = await loadFont(config.fontUrl, config.rawFamily);

  // Bake font. When ligature keywords are given, translate them via the
  // production module (union with any explicit features) — this is exactly
  // the string setFontGlobalState/collectFontVariations would produce.
  const features = config.ligatures
    ? mergeLigatureFeatureSettings(config.features || "", config.ligatures)
    : config.features || "";
  const bakedFont = features.trim()
    ? wasm.process_font(rawFont, "", "", features)
    : rawFont;
  const bakedBlob = new Blob([bakedFont], { type: "font/ttf" });
  const bakedFF = new FontFace(
    config.bakedFamily,
    `url(${URL.createObjectURL(bakedBlob)})`,
  );
  await bakedFF.load();
  document.fonts.add(bakedFF);

  await document.fonts.ready;

  // Render: canvas with baked font (our approach)
  const bakedResult = renderOnCanvas(config.bakedFamily, config.text, config);

  // Render: DOM with CSS features on raw font (ground truth)
  const domWidth = renderOnDom(config.rawFamily, config.text, config);

  // Render: canvas with raw font, no features (baseline)
  const baselineResult = renderOnCanvas(config.rawFamily, config.text, {
    ...config,
    features: "",
  });

  const canvasInk = countInk(bakedResult.canvas);
  const baselineInk = countInk(baselineResult.canvas);

  const tolerance = Math.max(2, config.fontSize * 0.02); // 2% of fontSize
  const widthDiff = Math.abs(bakedResult.advanceWidth - domWidth);

  const result = {
    canvasWidth: Math.round(bakedResult.advanceWidth * 100) / 100,
    canvasInk,
    domWidth: Math.round(domWidth * 100) / 100,
    baselineWidth: Math.round(baselineResult.advanceWidth * 100) / 100,
    baselineInk,
    widthDiff: Math.round(widthDiff * 100) / 100,
    tolerance: Math.round(tolerance * 100) / 100,
    widthMatch: widthDiff <= tolerance,
    featureHadEffect:
      Math.abs(bakedResult.advanceWidth - baselineResult.advanceWidth) > 0.5 ||
      canvasInk !== baselineInk,
    bakedMatchesCss: widthDiff <= tolerance,
    text: config.text,
    features,
    ligatures: config.ligatures || "",
    fontFamily: config.rawFamily,
    fontSize: config.fontSize,
    lang: config.lang || "en",
    direction: config.direction || "ltr",
  };

  log.textContent = JSON.stringify(result, null, 2);
  return result;
}

window.runComparison = runComparison;
