// Verifies that every shaperglot id in
// preprocess/easyeyesShaperglotLanguages.ts resolves in the gflanguages
// database embedded in the committed wasm (pkg/). Run after adding
// languages to the map: `node verify-language-ids.mjs`
// ok:true means the language was found and its checks ran.
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const wasm = await import(
  pathToFileURL(path.join(here, "pkg", "easyeyes_wasm.js")).href
);
wasm.initSync({
  module: fs.readFileSync(path.join(here, "pkg", "easyeyes_wasm_bg.wasm")),
});

// Extract ids ("af_Latn", "zlm_Latn", ...) from the TypeScript map source.
const mapSource = fs.readFileSync(
  path.join(here, "..", "preprocess", "easyeyesShaperglotLanguages.ts"),
  "utf8",
);
const ids = [
  ...new Set(
    [...mapSource.matchAll(/"([a-z]{2,3}_[A-Z][a-z]{3})"/g)].map((m) => m[1]),
  ),
];
if (ids.length === 0) {
  console.error("No language ids found in easyeyesShaperglotLanguages.ts");
  process.exit(1);
}

const fontBytes = new Uint8Array(
  fs.readFileSync(
    path.join(here, "..", "examples", "fonts", "IBMPlexSans.ttf"),
  ),
);

let failures = 0;
for (const id of ids) {
  const result = JSON.parse(wasm.check_font_language_support(fontBytes, id));
  if (!result.ok) {
    failures++;
    console.log(`FAIL ${id}: ${result.error}`);
  } else {
    console.log(`ok   ${id} (${result.support_level})`);
  }
}
console.log(
  failures === 0
    ? `ALL ${ids.length} IDS RESOLVED`
    : `${failures} of ${ids.length} FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
