/**
 * Bug 1 RED test — TextStim rendering path: ALL-ON double-firing.
 *
 * Uses the EXACT TextStim rendering path:
 *   PIXI.Text + canvasContextState (applyDirectionAcrossResizes, etc.)
 *   + ctx.lang="ar" + ctx.direction="rtl" + pixi.updateText(true)
 *
 * DESIRED: ALL-ON renders identically to RAW (totalDiff === 0).
 * CURRENT: FAILS — ALL-ON produces different rendering (compaction + artifacts).
 */

import * as PIXI from "/psychojs/node_modules/pixi.js-legacy/dist/browser/pixi-legacy.mjs";
import {
  applyDirectionAcrossResizes,
  applyKerningAcrossResizes,
  applyTextRenderingAcrossResizes,
} from "/psychojs/src/visual/canvasContextState.js";

const FONT_URL = "/examples/fonts/NotoNastaliqUrdu.ttf";
const TEXT_LINES = [
  "السلام عليكم ورحمة الله وبركاته",
  "الجمهورية الإسلامية والمسؤوليات التقنية",
  "كتب المستشارون رسائل إلى الملك والوزراء",
  "المتخصصون في التكنولوجيا والابتكار",
];

async function loadFont(url, familyName) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const blob = new Blob([buf], { type: "font/ttf" });
  const ff = new FontFace(familyName, `url(${URL.createObjectURL(blob)})`);
  await ff.load();
  document.fonts.add(ff);
  return new Uint8Array(buf);
}

async function main() {
  const log = document.getElementById("log");
  log.textContent = "Loading WASM...\n";
  const wasm = await import("/@rust/pkg/easyeyes_wasm.js");
  await wasm.default();

  log.textContent += "Loading fonts...\n";
  const rawFont = await loadFont(FONT_URL, "RawNastaliq");

  const allOnFont = wasm.process_font(
    rawFont,
    "",
    "",
    "init, medi, fina, isol, rlig, ccmp",
  );
  const allOnBlob = new Blob([allOnFont], { type: "font/ttf" });
  const allOnFF = new FontFace(
    "AllOnNastaliq",
    `url(${URL.createObjectURL(allOnBlob)})`,
  );
  await allOnFF.load();
  document.fonts.add(allOnFF);

  await document.fonts.ready;
  const rawLoaded = await document.fonts.check("40px RawNastaliq");
  const allOnLoaded = await document.fonts.check("40px AllOnNastaliq");
  if (!rawLoaded || !allOnLoaded) {
    throw new Error(
      `Font loading failed: Raw=${rawLoaded}, AllOn=${allOnLoaded}`,
    );
  }

  function renderViaTextStimPath(family, text) {
    const style = new PIXI.TextStyle({
      fontFamily: family,
      fontSize: 40,
      fill: "black",
      align: "right",
      wordWrap: false,
      padding: 4,
    });

    const pixi = new PIXI.Text(text, style);

    const pixiCanvas = pixi.canvas || (pixi.context && pixi.context.canvas);
    if (pixiCanvas) {
      pixiCanvas.setAttribute("lang", "ar");
      applyDirectionAcrossResizes(pixiCanvas, "rtl", "ar");
      applyKerningAcrossResizes(pixiCanvas, "auto");
      applyTextRenderingAcrossResizes(pixiCanvas, "auto");
      applyKerningAcrossResizes(PIXI.TextMetrics._canvas, "auto");
      applyTextRenderingAcrossResizes(PIXI.TextMetrics._canvas, "auto");
      pixi.updateText(true);
    }

    return pixi.canvas;
  }

  let totalDiff = 0;
  const perLine = [];

  for (let i = 0; i < TEXT_LINES.length; i++) {
    const text = TEXT_LINES[i];
    const rawCanvas = renderViaTextStimPath("RawNastaliq", text);
    const allOnCanvas = renderViaTextStimPath("AllOnNastaliq", text);

    const w = Math.max(rawCanvas.width, allOnCanvas.width);
    const h = Math.max(rawCanvas.height, allOnCanvas.height);
    const cmp = document.createElement("canvas");
    cmp.width = w;
    cmp.height = h;
    const ctx = cmp.getContext("2d", { willReadFrequently: true });

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(rawCanvas, 0, 0);
    const rawData = ctx.getImageData(0, 0, w, h).data;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(allOnCanvas, 0, 0);
    const allOnData = ctx.getImageData(0, 0, w, h).data;

    let diff = 0;
    for (let j = 0; j < rawData.length; j += 4) {
      if (Math.abs(rawData[j] - allOnData[j]) > 10) diff++;
    }
    totalDiff += diff;
    perLine.push({
      line: i + 1,
      diff,
      rawWidth: rawCanvas.width,
      allOnWidth: allOnCanvas.width,
      widthDiff: allOnCanvas.width - rawCanvas.width,
    });
  }

  const result = {
    test: "Bug 1: ALL-ON baked font should render identically to RAW",
    desiredBehavior:
      "totalDiff === 0 (enabling default-on features is a no-op)",
    totalDiff,
    perLine,
    rawFontBytes: rawFont.length,
    allOnFontBytes: allOnFont.length,
    fontBytesDiff: allOnFont.length - rawFont.length,
    PASS: totalDiff === 0,
  };

  log.textContent = JSON.stringify(result, null, 2);
  window.__testResult = result;
}

main().catch((e) => {
  document.getElementById("log").textContent =
    "ERROR: " + e.message + "\n" + e.stack;
  window.__testResult = { error: e.message, PASS: false };
});
