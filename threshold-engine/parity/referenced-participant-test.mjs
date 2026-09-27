/**
 * Participant e2e for the reference-by-URL flow (issue #174, spike b), as
 * far as it can go without Pavlovia:
 *
 *   repo origin (:A)  — the generated experiment repo, exactly the files
 *                       compile() emitted (plus recruitmentServiceConfig,
 *                       as the shell writes it). No COOP/COEP headers —
 *                       matching production Pavlovia (the COI service
 *                       worker is currently disabled/commented out).
 *   cdn origin  (:B)  — the engine package (dist/ + runtime/), served
 *                       jsDelivr-like: Access-Control-Allow-Origin: *,
 *                       Cross-Origin-Resource-Policy: cross-origin,
 *                       Cache-Control: public, max-age=31536000, immutable.
 *
 * Asserts, in a real Chromium:
 *   1. the asset-bridge service worker takes control without a reload
 *   2. first.min.js / threshold.min.js load from the cdn origin
 *   3. page-relative runtime assets (js/threshold.css, models/) are served
 *      through the bridge with content identical to the release files
 *   4. compiled data (js/experimentLanguage.js) still comes from the repo
 *   5. no script on the page fails to load
 *   6. a reload serves the runtime from the browser/CDN cache (no new
 *      requests hit the cdn origin for immutable runtime files)
 *
 * Run: node parity/referenced-participant-test.mjs   (after npm run verify)
 */
import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const engineDir = path.resolve(here, "..");
const thresholdDir = path.resolve(here, "../..");
const require = createRequire(path.join(thresholdDir, "package.json"));
const { chromium } = require("playwright-core");

const CONTENT_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".bin": "application/octet-stream",
  ".ico": "image/x-icon",
  ".png": "image/png",
};
const contentType = (p) => CONTENT_TYPES[path.extname(p)] ?? "application/octet-stream";

const listen = (server) =>
  new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));

// ---------------------------------------------------------------- cdn origin
const cdnHits = [];
const cdnServer = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).slice(1);
  const file = path.join(engineDir, rel);
  if (!rel || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  cdnHits.push(rel);
  res.writeHead(200, {
    "Content-Type": contentType(file),
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  res.end(readFileSync(file));
});
const cdnPort = await listen(cdnServer);
const runtimeBase = `http://127.0.0.1:${cdnPort}/runtime/`;

// ------------------------------------------------- compile the experiment
const engine = (await import(path.join(engineDir, "dist/index.js"))).default;
const glossary = JSON.parse(
  readFileSync(path.join(thresholdDir, "tests/__cache__/glossary.json"), "utf8"),
);
const phrases = JSON.parse(
  readFileSync(path.join(thresholdDir, "tests/__cache__/phrases.json"), "utf8"),
);
const table = readFileSync(
  path.join(thresholdDir, "examples/tables/minimalExperiment.csv"),
  "utf8",
);
const result = await engine.compile(
  { path: "minimalExperiment.csv", content: table },
  { files: [] },
  { mode: "node", data: { glossary, phrases, entryBaseUrl: runtimeBase } },
);
const blocking = (result.manifest.diagnostics ?? []).filter((d) => d.kind === "error");
if (blocking.length > 0) {
  console.error("compile produced blocking diagnostics:", blocking);
  process.exit(1);
}

// ---------------------------------------------------------------- repo origin
const repoFiles = new Map(result.files.map((f) => [f.path, f.content]));
// The shell writes this one (see gatherReferencedCoreFileActions).
repoFiles.set(
  "recruitmentServiceConfig.csv",
  readFileSync(path.join(thresholdDir, "recruitmentServiceConfig.csv"), "utf8"),
);
const repoServer = http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, "http://x").pathname).slice(1);
  if (rel === "") rel = "index.html";
  if (!repoFiles.has(rel)) {
    res.writeHead(404).end();
    return;
  }
  const body = repoFiles.get(rel);
  res.writeHead(200, { "Content-Type": contentType(rel) });
  res.end(typeof body === "string" ? body : Buffer.from(body));
});
const repoPort = await listen(repoServer);
const repoUrl = `http://127.0.0.1:${repoPort}/index.html`;

// -------------------------------------------------------------------- drive
let failures = 0;
const check = (label, ok, detail) => {
  if (ok) {
    console.log(`  ok - ${label}`);
  } else {
    failures++;
    console.error(`  FAIL - ${label}`);
    if (detail) console.error(`         ${detail}`);
  }
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const pageRequests = [];
page.on("request", (r) => pageRequests.push(r.url()));

await page.goto(repoUrl, { waitUntil: "load" });

// 1. bridge takes control without reload
const controlled = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const done = () => resolve(!!navigator.serviceWorker.controller);
      if (navigator.serviceWorker.controller) return done();
      navigator.serviceWorker.addEventListener("controllerchange", done, { once: true });
      setTimeout(done, 10000);
    }),
);
check("asset-bridge service worker controls the page without reload", controlled);

// 2. runtime entries load from the cdn origin
await page.waitForFunction(
  (base) =>
    performance.getEntriesByType("resource").some((e) => e.name === base + "js/threshold.min.js"),
  runtimeBase,
  { timeout: 30000 },
).catch(() => {});
check(
  "first.min.js and threshold.min.js were requested from the release URL",
  cdnHits.includes("runtime/js/first.min.js") && cdnHits.includes("runtime/js/threshold.min.js"),
  `cdn hits: ${[...new Set(cdnHits)].join(", ")}`,
);

// give the runtime a moment to settle (css load, etc.)
await page.waitForTimeout(3000);

// 3. page-relative runtime assets arrive through the bridge, byte-faithful
const cssThroughBridge = await page.evaluate(async () => {
  const r = await fetch("js/threshold.css");
  return { ok: r.ok, text: await r.text() };
});
check(
  "js/threshold.css is served through the bridge from the release",
  cssThroughBridge.ok &&
    cssThroughBridge.text === readFileSync(path.join(engineDir, "runtime/js/threshold.css"), "utf8"),
);
const modelThroughBridge = await page.evaluate(async () => {
  const r = await fetch("models/detector/model.json");
  try {
    return { ok: r.ok, isJson: !!(await r.json()) };
  } catch {
    return { ok: r.ok, isJson: false };
  }
});
check(
  "models/detector/model.json is served through the bridge",
  modelThroughBridge.ok && modelThroughBridge.isJson,
);

// 4. compiled data still comes from the repo
const langFromRepo = await page.evaluate(async () => (await fetch("js/experimentLanguage.js")).text());
check(
  "js/experimentLanguage.js passes through to the repo",
  String(repoFiles.get("js/experimentLanguage.js")) === langFromRepo,
);

// 5. no script on the page failed to load
const failedScripts = await page.evaluate(() => window._failedScripts ?? []);
check("no script failed to load", failedScripts.length === 0, failedScripts.join(", "));

// 6. second load: immutable runtime files come from cache, not the cdn origin
const hitsBefore = cdnHits.filter((h) => h.startsWith("runtime/js/")).length;
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(3000);
const hitsAfter = cdnHits.filter((h) => h.startsWith("runtime/js/")).length;
check(
  "reload serves runtime js from the browser cache (immutable)",
  hitsAfter === hitsBefore,
  `runtime/js hits before reload: ${hitsBefore}, after: ${hitsAfter}`,
);

await browser.close();
cdnServer.close();
repoServer.close();

if (failures > 0) {
  console.error(`referenced-participant-test: ${failures} failure(s)`);
  process.exit(1);
}
console.log("referenced-participant-test: all checks passed");
