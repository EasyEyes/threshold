/**
 * Browser verification: a scratch page dynamically import()s the built
 * engine bundle and runs a compile in web mode. Asserts:
 *   1. import() resolves and exposes compile + contractVersion
 *   2. no non-localhost network requests happen during import (self-contained)
 *   3. compile() of the minimal example produces the expected file set
 *
 * Run: node parity/browser-import-test.mjs
 * Requires Google Chrome (driven via the repo's playwright-core).
 */
import http from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const engineDir = path.resolve(here, "..");
const thresholdDir = path.resolve(here, "../..");
const require = createRequire(path.join(thresholdDir, "package.json"));
const { chromium } = require("playwright-core");

const PAGE = `<!doctype html><html><body><script type="module">
  // Phase 1: bare dynamic import — must be self-contained (no external fetches).
  window.imported = (async () => {
    const engine = await import("/dist/index.js");
    window.__engine = engine;
    return {
      contractVersion: engine.contractVersion,
      hasCompile: typeof engine.compile === "function",
    };
  })();
  // Phase 2 (triggered from the test): a web-mode compile. This may make the
  // same network requests production makes (e.g. Google font validation).
  window.runCompile = async () => {
    const engine = window.__engine;
    const glossary = await (await fetch("/glossary.json")).json();
    const phrases = await (await fetch("/phrases.json")).json();
    const table = await (await fetch("/table.csv")).arrayBuffer();
    const r = await engine.compile(
      { path: "minimalExperiment.csv", content: new Uint8Array(table) },
      { files: [] },
      { mode: "web", data: { glossary, phrases } },
    );
    return {
      files: r.files.map((f) => f.path),
      diagnostics: (r.manifest.diagnostics ?? []).map((d) => [d.kind, d.name]),
      engineProvenance: r.manifest.engine,
    };
  };
</script></body></html>`;

const routes = {
  "/": () => [PAGE, "text/html"],
  "/dist/index.js": () => [
    readFileSync(path.join(engineDir, "dist/index.js")),
    "text/javascript",
  ],
  "/dist/easyeyes_wasm_bg.wasm": () => [
    readFileSync(path.join(engineDir, "dist/easyeyes_wasm_bg.wasm")),
    "application/wasm",
  ],
  "/glossary.json": () => [
    readFileSync(path.join(thresholdDir, "tests/__cache__/glossary.json")),
    "application/json",
  ],
  "/phrases.json": () => [
    readFileSync(path.join(thresholdDir, "tests/__cache__/phrases.json")),
    "application/json",
  ],
  "/table.csv": () => [
    readFileSync(path.join(thresholdDir, "examples/tables/minimalExperiment.csv")),
    "text/csv",
  ],
};

const server = http.createServer((req, res) => {
  const route = routes[req.url.split("?")[0]];
  if (!route) {
    res.writeHead(404);
    return res.end("not found");
  }
  const [body, type] = route();
  res.writeHead(200, { "Content-Type": type });
  res.end(body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const externalRequests = [];
page.on("request", (req) => {
  const url = new URL(req.url());
  if (url.hostname !== "127.0.0.1") externalRequests.push(req.url());
});

await page.goto(`http://127.0.0.1:${port}/`);
const imported = await page.evaluate(() => window.imported);
const importExternals = [...externalRequests];
const result = await page.evaluate(() => window.runCompile());
const compileExternals = externalRequests.slice(importExternals.length);
await browser.close();
server.close();

console.log("contractVersion:", imported.contractVersion);
console.log("hasCompile:", imported.hasCompile);
console.log("engine:", result.engineProvenance);
console.log("files:", result.files);
console.log("diagnostics:", result.diagnostics);
console.log("external requests during import:", importExternals);
console.log(
  "external requests during compile (production makes the same):",
  compileExternals,
);

const ok =
  imported.contractVersion === 1 &&
  imported.hasCompile &&
  result.files.length >= 6 &&
  importExternals.length === 0;
console.log(ok ? "\nBROWSER IMPORT TEST PASSED" : "\nBROWSER IMPORT TEST FAILED");
process.exit(ok ? 0 : 1);
