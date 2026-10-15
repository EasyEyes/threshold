// import {Window, PsychoJS } from "../psychojs/src/core/index.js";
// import {TextStim} from "../psychojs/src/visual/index.js";

export function measureFontRenderCanvas() {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = "600pt Verdana";
    ctx.fillText("ABC", 10, 50);
    const loremIpsum =
      "Aliquam qui enim et est. Odit et facere quia sit. Assumenda corporis repellendus molestiae culpa maiores eius debitis. Fugit provident odit qui ea et id molestias. Rerum blanditiis error sit quod ab culpa. Autem labore veritatis natus tempora aspernatur unde. Aut doloribus a et voluptate aut voluptatibus beatae ullam. Delectus enim temporibus eligendi pariatur recusandae quidem qui in. Inventore doloremque magni autem. Facilis iste cupiditate et. Nulla hic commodi et non aliquam nihil. Incidunt aut dolorem reiciendis suscipit nesciunt voluptatem. Fugit quae ullam quis dolores qui. Vel fuga quibusdam ratione. Aperiam aliquid vitae occaecati. Fuga sequi minima quam excepturi architecto autem. Quas possimus fuga esse dolor. Voluptates repellat officia quisquam accusantium. Ullam magni impedit necessitatibus. Rem maxime ea molestias dolores facere blanditiis ducimus. Perferendis dolor odit maxime velit est.";
    const shortText = "XYZ";
    const longText = loremIpsum.repeat(1000);
    const t0 = performance.now();
    ctx.fillText(shortText, 500, 500);
    ctx.measureText(shortText);
    const t1 = performance.now();
    const durationSec = (t1 - t0) / 1000;
    resolve(durationSec);
  });
}

// export function measureFontRenderPsychojs() {
//   return new Promise((resolve) => {
//     const psychoJS = new PsychoJS({
//       debug: true,
//     });
//     const win = new Window({
//       name: "Window",
//       fullscr: false,
//       screen: 0,
//       color: [0, 0, 0],
//       colorSpace: "rgb",
//       units: "height",
//       waitBlanking: true,
//       autoLog: true,
//     });
//     const text = new TextStim({
//       win: win,
//       name: "text",
//       text: "ABC",
//       font: "Arial",
//       pos: [0, 0],
//       height: 0.1,
//       wrapWidth: undefined,
//       ori: 0.0,
//       color: "white",
//       colorSpace: "rgb",
//       opacity: undefined,
//       depth: -4.0,
//     });
//     text.draw();
//     win.flip();
//     const t0 = performance.now();
//     text.setText("XYZ");
//     text.draw();
//     win.flip();
//     const t1 = performance.now();
//     resolve(t1 - t0);
//   });
// }

export function measureHeapAllocation() {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const arr = new Array(12500000).fill(0);
    const t1 = performance.now();
    const durationSec = (t1 - t0) / 1000;
    resolve(durationSec);
  });
}

export function measureFontRender() {
  return new Promise(async (resolve) => {
    try {
      const canvasTime = await measureFontRenderCanvas();
      // const psychojsTime = await measureFontRenderPsychojs();
      resolve(canvasTime);
    } catch (error) {
      console.error("Error calculating measureFontRender", error);
      resolve(-1);
    }
  });
}

// In-situ measurement of the raster reuse/rescale tradeoff — the empirical
// basis for fontPreRender=buffer. Runs at the compatibility check (real
// browser, real font stack) and logs to the session output:
//  - fontRasterIdentityDeltaPct: largest probed scale delta at which a
//    native re-raster is pixel-identical (alpha channel; intersection
//    region identical AND both margins empty) across every probe
//    letter/size — below it, reusing the existing texture is exact.
//    Strict: real fonts antialias, so this can read 0 — pair it with
//    fontRasterStaleMeanAt1pct (the low end of the stale-error curve).
//  - fontRasterResampleMeanAt4pct / MaxAt4pct: alpha-channel difference
//    between the ORIGINAL rescaled to +4% and the native +4% raster —
//    the blur the rescale display path would introduce.
//  - fontRasterFillTextMs / fontRasterDrawImageMs: median cost of a
//    native raster vs a texture rescale on this machine.
// Canvas-2d fillText is the same rasterizer PIXI.Text uses for glyphs.
// Mirrored (with real rasterization) by the opt-in e2e "raster benchmark".
export function measureRasterResample({ canvasFactory } = {}) {
  return new Promise((resolve) => {
    try {
      const mk = canvasFactory || (() => document.createElement("canvas"));
      const LETTERS = ["S", "I", "O"];
      const SIZES = [16, 32];
      const DELTAS = [0.005, 0.01, 0.02, 0.04, 0.08];
      const raster = (letter, size) => {
        const c = mk();
        const g = c.getContext("2d", { willReadFrequently: true });
        c.width = c.height = Math.ceil(size * 4);
        g.font = size + "px Verdana";
        g.textBaseline = "alphabetic";
        g.fillStyle = "#000";
        g.fillText(letter, size, size * 2.5);
        return c;
      };
      const alphaOf = (c) => {
        const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        const a = new Uint8Array(c.width * c.height);
        for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
        return { a, w: c.width, h: c.height };
      };
      // Pixel-identical: alpha equal over the shared region, and the
      // larger canvas's extra margin carries no ink.
      const identical = (p, q) => {
        const w = Math.min(p.w, q.w),
          h = Math.min(p.h, q.h);
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++)
            if (p.a[y * p.w + x] !== q.a[y * q.w + x]) return false;
        for (const r of [p, q]) {
          for (let y = 0; y < r.h; y++)
            for (let x = 0; x < r.w; x++)
              if ((x >= w || y >= h) && r.a[y * r.w + x] !== 0) return false;
        }
        return true;
      };
      // Mean |Δα| over the shared region (rasters of nearby sizes have
      // unequal canvas dims; flat indexing would compare misaligned rows).
      const diff = (p, q) => {
        const w = Math.min(p.w, q.w),
          h = Math.min(p.h, q.h);
        let max = 0,
          sum = 0,
          n = 0;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const d = Math.abs(p.a[y * p.w + x] - q.a[y * q.w + x]);
            if (d > max) max = d;
            sum += d;
            n++;
          }
        return { max, mean: n ? sum / n : 0 };
      };

      let identityPct = 0,
        mean4 = 0,
        max4 = 0,
        n4 = 0,
        stale1 = 0,
        n1 = 0;
      for (const size of SIZES) {
        for (const letter of LETTERS) {
          const A = raster(letter, size);
          const aA = alphaOf(A);
          for (const d of DELTAS) {
            const B = raster(letter, size * (1 + d));
            const aB = alphaOf(B);
            if (identical(aA, aB) && d * 100 > identityPct)
              identityPct = d * 100;
            if (d === 0.01) {
              stale1 += diff(aA, aB).mean;
              n1++;
            }
            if (d === 0.04) {
              const c = mk();
              const g = c.getContext("2d", { willReadFrequently: true });
              c.width = B.width;
              c.height = B.height;
              g.imageSmoothingEnabled = true;
              g.drawImage(A, 0, 0, c.width, c.height);
              const r = diff(alphaOf(c), aB);
              mean4 += r.mean;
              if (r.max > max4) max4 = r.max;
              n4++;
            }
          }
        }
      }

      // Timings: whole native raster vs rescale-only, median of 101.
      const A32 = raster("S", 32),
        B33 = raster("S", 33);
      const tFill = [],
        tDraw = [];
      for (let i = 0; i < 101; i++) {
        let t0 = performance.now();
        raster("S", 32);
        tFill.push(performance.now() - t0);
        const d = mk();
        const g = d.getContext("2d", { willReadFrequently: true });
        d.width = B33.width;
        d.height = B33.height;
        t0 = performance.now();
        g.drawImage(A32, 0, 0, d.width, d.height);
        tDraw.push(performance.now() - t0);
      }
      const med = (a) =>
        a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
      const round2 = (v) => Math.round(v * 100) / 100;
      const summary = {
        fontRasterIdentityDeltaPct: round2(identityPct),
        fontRasterStaleMeanAt1pct: round2(stale1 / n1),
        fontRasterResampleMeanAt4pct: round2(mean4 / n4),
        fontRasterResampleMaxAt4pct: max4,
        fontRasterFillTextMs: round2(med(tFill)),
        fontRasterDrawImageMs: round2(med(tDraw)),
      };
      globalThis.__rasterProbe = summary;
      resolve(summary);
    } catch (error) {
      console.error("Error calculating measureRasterResample", error);
      resolve(null);
    }
  });
}
