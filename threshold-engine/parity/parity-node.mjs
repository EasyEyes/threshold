/**
 * Node-mode parity harness: drives the production compiler (parity oracle)
 * and the built engine package (dist/index.js) on every example table and
 * compares outputs byte-for-byte:
 *
 *   - the compiled file set (root table, conditions/*, generated config)
 *   - diagnostics (the compiler's error/warning objects)
 *   - the experiment configuration (user.currentExperiment vs
 *     manifest.experiment)
 *
 * Run: node parity/parity-node.mjs   (after npm run build && node parity/build-oracle.mjs)
 */
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const thresholdDir = path.resolve(here, "../..");
const require = createRequire(path.join(thresholdDir, "package.json"));
const XLSX = require("xlsx");
const Papa = require("papaparse");

const oracle = await import(path.join(here, "dist/oracle.mjs"));
const engine = await import(path.join(here, "../dist/index.js"));

const glossary = JSON.parse(
  readFileSync(path.join(thresholdDir, "tests/__cache__/glossary.json"), "utf8"),
);
const phrases = JSON.parse(
  readFileSync(path.join(thresholdDir, "tests/__cache__/phrases.json"), "utf8"),
);
oracle.initGlossary(glossary);
oracle.initPhrases(phrases);

// Fixed stand-in for the shell-fetched Netlify deploy date.
const COMPILER_UPDATE_DATE = "2026-07-07T00:00:00.000Z";

/** Exactly preprocessExperimentFile's table parsing. */
const parseTable = (name, bytes) => {
  if (name.includes("xlsx")) {
    const book = XLSX.read(new Uint8Array(bytes), { type: "array" });
    for (const sheet in book.Sheets) {
      const csv = XLSX.utils.sheet_to_csv(book.Sheets[sheet]);
      return Papa.parse(csv, { skipEmptyLines: true, encoding: "UTF-8" });
    }
    throw new Error("no sheets");
  }
  return Papa.parse(new TextDecoder().decode(new Uint8Array(bytes)), {
    skipEmptyLines: true,
    encoding: "UTF-8",
  });
};

/** Exactly fileUtils.readXLSXFile's serialization (what the shell commits). */
const serializeRootTable = (name, bytes) => {
  if (!name.includes("xlsx")) return new TextDecoder().decode(new Uint8Array(bytes));
  const workbook = XLSX.read(new Uint8Array(bytes), { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return JSON.stringify(XLSX.utils.sheet_to_json(worksheet, { header: 1 }));
};

const emptyResources = () => {
  const kinds = [
    "fonts", "forms", "texts", "folders", "images", "code",
    "impulseResponses", "frequencyResponses", "targetSoundLists", "phrases",
  ];
  const r = {};
  for (const k of kinds) r[k] = [];
  r.textContents = {};
  return r;
};

/** Drive the production compiler the way the shell does; assemble the
 *  file set the way gitlabUtils would commit it. */
const runLegacy = async (name, bytes) => {
  const parsed = parseTable(name, bytes);
  const user = { currentExperiment: {} };
  const errors = [];
  let cap;
  await oracle.prepareExperimentFileForThreshold(
    parsed,
    user,
    errors,
    emptyResources(),
    (...args) => (cap = args),
    "node",
    false,
    name,
    false,
  );
  const [cbUser, , , , , , , fileList, errorList] = cap;
  const hasBlockingError = errorList.some((e) => e.kind === "error");
  const files = [];
  if (!hasBlockingError) {
    files.push({ path: name, content: serializeRootTable(name, bytes) });
    for (const [csv, blockName] of fileList)
      files.push({ path: `conditions/${blockName}`, content: csv });
    // gatherThresholdCoreFileActions / getGitlabBodyFor* equivalents:
    files.push({
      path: "CompatibilityRequirements.txt",
      content: JSON.stringify({
        ...oracle.compatibilityRequirements.parsedInfo,
        compilerUpdateDate: COMPILER_UPDATE_DATE,
      }),
    });
    if (oracle.typekit.kitId !== "") {
      files.push({
        path: "typekit.json",
        content: JSON.stringify({
          kitId: oracle.typekit.kitId,
          fonts: Object.fromEntries(oracle.typekit.fonts),
        }),
      });
    }
    files.push({
      path: "Duration.txt",
      content: JSON.stringify(oracle.durations),
    });
    const language =
      cbUser.currentExperiment?._language ??
      oracle.getGlossary()["_language"]?.default ??
      "English";
    const direction = cbUser.currentExperiment?.languageDirection ?? "ltr";
    files.push({
      path: "js/experimentLanguage.js",
      content: `const experimentLanguage = "${language}";\nconst experimentLanguageDirection = "${direction}";`,
    });
  }
  return { files, diagnostics: errorList, experiment: cbUser.currentExperiment };
};

const runEngine = async (name, bytes) => {
  const result = await engine.compile(
    { path: name, content: new Uint8Array(bytes) },
    { files: [] },
    {
      mode: "node",
      data: { glossary, phrases, compilerUpdateDate: COMPILER_UPDATE_DATE },
    },
  );
  return {
    files: result.files,
    diagnostics: result.manifest.diagnostics ?? [],
    experiment: result.manifest.experiment ?? {},
  };
};

const tables = readdirSync(path.join(thresholdDir, "examples/tables")).filter(
  (f) => f.endsWith(".csv") || f.endsWith(".xlsx"),
);

let failures = 0;
for (const name of tables) {
  const bytes = readFileSync(path.join(thresholdDir, "examples/tables", name));
  const legacy = await runLegacy(name, bytes);
  const eng = await runEngine(name, bytes);
  const problems = [];

  const legacyPaths = legacy.files.map((f) => f.path).sort();
  const enginePaths = eng.files.map((f) => f.path).sort();
  if (JSON.stringify(legacyPaths) !== JSON.stringify(enginePaths)) {
    problems.push(
      `file sets differ:\n  legacy: ${legacyPaths}\n  engine: ${enginePaths}`,
    );
  } else {
    for (const lf of legacy.files) {
      const ef = eng.files.find((f) => f.path === lf.path);
      if (ef.content !== lf.content)
        problems.push(`content differs: ${lf.path}`);
    }
  }

  if (JSON.stringify(legacy.diagnostics) !== JSON.stringify(eng.diagnostics)) {
    problems.push(
      `diagnostics differ:\n  legacy(${legacy.diagnostics.length}): ${JSON.stringify(legacy.diagnostics).slice(0, 300)}\n  engine(${eng.diagnostics.length}): ${JSON.stringify(eng.diagnostics).slice(0, 300)}`,
    );
  }

  // manifest.experiment must carry currentExperiment verbatim (plus
  // engine-defined extras, ignored here).
  for (const [k, v] of Object.entries(legacy.experiment)) {
    if (JSON.stringify(eng.experiment[k]) !== JSON.stringify(v))
      problems.push(`experiment["${k}"] differs`);
  }

  const errorCount = legacy.diagnostics.filter((d) => d.kind === "error").length;
  if (problems.length === 0) {
    console.log(
      `PASS  ${name}  (${legacy.files.length} files, ${legacy.diagnostics.length} diagnostics, ${errorCount} blocking)`,
    );
  } else {
    failures++;
    console.log(`FAIL  ${name}`);
    for (const p of problems) console.log(`  - ${p}`);
  }
}

console.log(failures === 0 ? "\nALL TABLES BYTE-IDENTICAL" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
