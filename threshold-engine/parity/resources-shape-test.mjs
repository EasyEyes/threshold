/**
 * Behavior test: contract resources must satisfy the production compiler's
 * existence checks, which compare resource *names* (issue #174).
 *
 * The shell only knows repo-hosted resources by name, so it passes
 * empty-content EngineFiles; the engine must surface them to the compiler
 * the way the production shell does (name lists), or every experiment that
 * uses a file-sourced font/form/text would fail with "missing" errors.
 *
 * Run: node parity/resources-shape-test.mjs   (after npm run build)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const thresholdDir = path.resolve(here, "../..");

const engine = (await import(path.join(here, "../dist/index.js"))).default;

const glossary = JSON.parse(
  readFileSync(
    path.join(thresholdDir, "tests/__cache__/glossary.json"),
    "utf8",
  ),
);
const phrases = JSON.parse(
  readFileSync(path.join(thresholdDir, "tests/__cache__/phrases.json"), "utf8"),
);

// minimalExperiment, switched to a file-sourced font.
const table = readFileSync(
  path.join(thresholdDir, "examples/tables/minimalExperiment.csv"),
  "utf8",
)
  .replace('fontSource,,"google"', 'fontSource,,"file"')
  .replace('font,,"Roboto Mono"', 'font,,"Sloan.woff2"');

const compile = (resourceFiles) =>
  engine.compile(
    { path: "minimalExperiment.csv", content: table },
    { files: resourceFiles },
    { mode: "web", data: { glossary, phrases } },
  );

const fontDiagnostics = (result) =>
  (result.manifest.diagnostics ?? []).filter((d) =>
    `${d.name} ${d.message}`.toLowerCase().includes("font"),
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

// 1. Without the font among the resources: the compile must report it missing.
const without = await compile([]);
check(
  "missing font file is diagnosed when absent from resources",
  fontDiagnostics(without).length > 0,
  `diagnostics: ${JSON.stringify(without.manifest.diagnostics ?? [])}`,
);

// 2. With the font present by name (empty content, as the shell passes
//    repo-hosted resources): no font diagnostic.
const withFont = await compile([{ path: "fonts/Sloan.woff2", content: "" }]);
check(
  "name-only font resource satisfies the existence check",
  fontDiagnostics(withFont).length === 0,
  `diagnostics: ${JSON.stringify(fontDiagnostics(withFont))}`,
);

if (failures > 0) {
  console.error(`resources-shape-test: ${failures} failure(s)`);
  process.exit(1);
}
console.log("resources-shape-test: all checks passed");
