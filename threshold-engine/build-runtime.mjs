/**
 * Copies the participant runtime into the package (runtime/), so a release
 * pins compile logic + runtime engine atomically (PRD #144, issue #174).
 *
 * Sources are the threshold repo's vite build outputs (js/) and its static
 * assets. Run `npx vite build --mode production` in the threshold root
 * first; this script fails loudly when a build output is missing.
 *
 * The referenced experiment repo carries none of these files: the entry
 * HTML loads js/first.min.js + js/threshold.min.js from the release URL,
 * the wasm chunk (js/easyeyes_wasm.js) resolves relative to the importing
 * module's URL (native ESM), and everything the page requests
 * same-origin (js/threshold.css, models/, components/) is served by the
 * asset-bridge service worker (src/runtime/assetBridge.sw.js).
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const thresholdDir = path.resolve(here, "..");
const outDir = path.join(here, "runtime");

const RUNTIME_FILES = [
  "js/first.min.js",
  "js/threshold.min.js",
  "js/threshold.css",
  "js/easyeyes_wasm.js",
  "models/detector/group1-shard1of1.bin",
  "models/detector/model.json",
  "models/landmark/group1-shard1of1.bin",
  "models/landmark/model.json",
  "models/landmark_attention/group1-shard1of1.bin",
  "models/landmark_attention/model.json",
  "components/images/favicon.ico",
  "components/images/ios_settings.png",
  "components/multiple-displays/multipleDisplay.css",
  "components/multiple-displays/peripheralDisplay.html",
  "components/multiple-displays/peripheralDisplay.js",
];

const missing = RUNTIME_FILES.filter(
  (f) => !existsSync(path.join(thresholdDir, f)),
);
if (missing.length > 0) {
  console.error(
    "build-runtime: missing threshold build outputs (run `npx vite build --mode production` in the threshold root first):",
  );
  for (const f of missing) console.error(`  ${f}`);
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
for (const f of RUNTIME_FILES) {
  const target = path.join(outDir, f);
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(path.join(thresholdDir, f), target);
}
console.log(`build-runtime: ${RUNTIME_FILES.length} files copied to runtime/`);
