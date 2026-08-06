// Brute-force worst-case triplets (max ink ascent / max ink descent) per
// font x alphabet, measured with canvas measureText in Chrome — the same
// engine and settings EasyEyes' TextStim uses for its tight bounding box.
import { chromium } from "playwright-core";
import { createServer } from "http";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const FONTS_DIR = "examples/fonts";
const FONTS = {
  "Parastoo-Regular": "Parastoo-Regular.ttf",
  "B-NAZANIN": "B-NAZANIN.TTF",
  IranNastaliq: "IranNastaliq.ttf",
  Mj_Hoor_0: "Mj_Hoor_0.ttf",
  Mj_Barik: "Mj_Barik.ttf",
  "Kalameh-Regular": "Kalameh-Regular.ttf",
  "Gulzar-Regular": "Gulzar-Regular.ttf",
};
const CHARSETS = {
  fa: "ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی", // 32, Persian study
  ar: "ابتثجحخدذرزسشصضطظعغفقكلمنهوي", // 28, Arabic study
  ur: "ابپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںوہھءیے", // 39, standard Urdu
};
// Which font x language combinations occur in the two studies (plus Mj_Barik
// and Kalameh measured under both alphabets for the cross-language question).
const JOBS = [];
for (const fam of Object.keys(FONTS))
  for (const lang of ["fa", "ar", "ur"]) JOBS.push({ fam, lang });

const server = createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<!doctype html><html><body>metrics</body></html>");
    return;
  }
  try {
    const data = readFileSync(join(FONTS_DIR, decodeURIComponent(req.url.slice(1))));
    res.writeHead(200, { "content-type": "font/ttf" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
await page.goto(`http://localhost:${port}/`);

const results = await page.evaluate(
  async ({ fonts, charsets, jobs, port }) => {
    const px = 300;
    const out = [];
    for (const [fam, file] of Object.entries(fonts)) {
      const face = new FontFace(fam, `url(/${encodeURIComponent(file)})`);
      await face.load();
      document.fonts.add(face);
    }
    for (const { fam, lang } of jobs) {
      const cs = [...charsets[lang]];
      const cv = document.createElement("canvas");
      cv.setAttribute("lang", lang);
      cv.setAttribute("dir", "rtl");
      const ctx = cv.getContext("2d");
      if ("lang" in ctx) ctx.lang = lang;
      ctx.direction = "rtl";
      ctx.font = `${px}px "${fam}"`;
      // Sanity: font actually used? (measure a letter with and without fallback)
      // EasyEyes samples target+flankers WITHOUT replacement: all ordered
      // triplets of three DISTINCT letters (flanker1+target+flanker2).
      const A = { v: -1, s: "" };
      const D = { v: -1, s: "" };
      for (const a of cs)
        for (const b of cs) {
          if (b === a) continue;
          for (const c of cs) {
            if (c === a || c === b) continue;
            const m = ctx.measureText(a + b + c);
            if (m.actualBoundingBoxAscent > A.v) {
              A.v = m.actualBoundingBoxAscent;
              A.s = a + b + c;
            }
            if (m.actualBoundingBoxDescent > D.v) {
              D.v = m.actualBoundingBoxDescent;
              D.s = a + b + c;
            }
          }
        }
      // Isolated single letters (acuity-style display; also cheap insurance).
      const sA = { v: -1, s: "" };
      const sD = { v: -1, s: "" };
      for (const a of cs) {
        const m = ctx.measureText(a);
        if (m.actualBoundingBoxAscent > sA.v) {
          sA.v = m.actualBoundingBoxAscent;
          sA.s = a;
        }
        if (m.actualBoundingBoxDescent > sD.v) {
          sD.v = m.actualBoundingBoxDescent;
          sD.s = a;
        }
      }
      const ref = ctx.measureText(cs.join(""));
      let rec = A.s + " " + D.s;
      if (sA.v > A.v) rec += " " + sA.s;
      if (sD.v > D.v) rec += " " + sD.s;
      const recM = ctx.measureText(rec);
      out.push({
        fam,
        lang,
        worstAscentTriplet: A.s,
        worstAscentEm: A.v / px,
        worstDescentTriplet: D.s,
        worstDescentEm: D.v / px,
        worstSingleAscent: sA.s,
        worstSingleAscentEm: sA.v / px,
        worstSingleDescent: sD.s,
        worstSingleDescentEm: sD.v / px,
        charsetAscentEm: ref.actualBoundingBoxAscent / px,
        charsetDescentEm: ref.actualBoundingBoxDescent / px,
        recommended: rec,
        recAscentEm: recM.actualBoundingBoxAscent / px,
        recDescentEm: recM.actualBoundingBoxDescent / px,
      });
    }
    return out;
  },
  { fonts: FONTS, charsets: CHARSETS, jobs: JOBS, port },
);

writeFileSync(".tmp-metrics-results.json", JSON.stringify(results, null, 1), "utf8");
console.log("done", results.length, "jobs");
await browser.close();
server.close();
