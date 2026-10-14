/**
 * Behavior test: reference-by-URL entry generation (issue #174).
 *
 * When the shell passes options.data.entryBaseUrl, compile() emits the
 * same-origin-required entry files — index.html and the asset-bridge
 * service worker (in the coi-serviceworker.js slot) — that load the
 * participant runtime from the immutable release URL instead of copies
 * in the experiment repo. Without the option, compile() emits exactly
 * what it always did (byte-parity is covered by parity-node.mjs).
 *
 * Run: node parity/entry-emission-test.mjs   (after npm run build)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const thresholdDir = path.resolve(here, "../..");

const engine = (await import(path.join(here, "../dist/index.js"))).default;

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

const BASE = "https://cdn.example/npm/threshold-engine@2026.7.7/runtime/";

const compile = (data = {}) =>
  engine.compile(
    { path: "minimalExperiment.csv", content: table },
    { files: [] },
    { mode: "node", data: { glossary, phrases, ...data } },
  );

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
const fileMap = (result) =>
  new Map(result.files.map((f) => [f.path, String(f.content)]));

// 1. Without entryBaseUrl: no entry files (legacy output only).
const legacy = await compile();
const legacyFiles = fileMap(legacy);
check(
  "no entry files without entryBaseUrl",
  !legacyFiles.has("index.html") && !legacyFiles.has("coi-serviceworker.js"),
  `paths: ${[...legacyFiles.keys()].join(", ")}`,
);

// 2. With entryBaseUrl: entry HTML references the runtime by immutable URL.
const referenced = await compile({ entryBaseUrl: BASE });
const files = fileMap(referenced);
const entry = files.get("index.html") ?? "";
const sw = files.get("coi-serviceworker.js") ?? "";

check("index.html is emitted", entry !== "");
check("coi-serviceworker.js is emitted", sw !== "");
check(
  "entry loads first.min.js and threshold.min.js from the release URL",
  entry.includes(`${BASE}js/first.min.js`) &&
    entry.includes(`${BASE}js/threshold.min.js`),
);
check(
  "entry keeps no repo-relative runtime script tags",
  !entry.includes('src="js/first.min.js"') &&
    !entry.includes('src="js/threshold.min.js"'),
);
check(
  "favicon comes from the release URL",
  entry.includes(`${BASE}components/images/favicon.ico`),
);
check(
  "entry gates runtime loading on service-worker control",
  entry.includes("serviceWorker") && entry.includes("controllerchange"),
);
check(
  "stepper default picks the index.html template (remote-calibrator 0.9.x)",
  entry.includes("remote-calibrator@0.9"),
);

check(
  "asset bridge rewrites runtime prefixes to the release URL",
  sw.includes(BASE) &&
    sw.includes('"js/"') &&
    sw.includes('"models/"') &&
    sw.includes('"components/"'),
);
check(
  "asset bridge passes the compiled-data file js/experimentLanguage.js through",
  sw.includes("js/experimentLanguage.js"),
);

// 3. A base without a trailing slash still produces well-formed URLs.
const noSlash = await compile({ entryBaseUrl: BASE.slice(0, -1) });
const entryNoSlash = fileMap(noSlash).get("index.html") ?? "";
check(
  "base URL without trailing slash is normalized",
  entryNoSlash.includes(`${BASE}js/first.min.js`),
);

if (failures > 0) {
  console.error(`entry-emission-test: ${failures} failure(s)`);
  process.exit(1);
}
console.log("entry-emission-test: all checks passed");
