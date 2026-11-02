/** @jest-environment node */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loadLocalAnalysisIndex } from "../examples/localAnalysisIndex";

let root: string;
let source: string;
let indexFile: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "ee-local-analysis-"));
  const website = path.resolve(__dirname, "../../../..");
  for (const dir of [
    "scripts/phrase-analysis",
    "netlify/functions/study-phrase-analysis",
    "docs/experiment/threshold/components",
  ])
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  for (const file of ["build.mjs", "source-index.cjs"])
    fs.copyFileSync(
      path.join(website, "scripts/phrase-analysis", file),
      path.join(root, "scripts/phrase-analysis", file),
    );
  fs.writeFileSync(path.join(root, "package.json"), "{}");
  fs.symlinkSync(
    path.join(website, "node_modules"),
    path.join(root, "node_modules"),
    "dir",
  );
  fs.writeFileSync(
    path.join(root, "docs/experiment/threshold/threshold.js"),
    "",
  );
  source = path.join(root, "docs/experiment/threshold/components/study.js");
  fs.writeFileSync(
    source,
    'readi18nPhrases("EE_before"); paramReader.read("font");',
  );
  indexFile = path.join(
    root,
    "netlify/functions/study-phrase-analysis/source-index.json",
  );
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

it("A1/A2 rebuilds both reader indexes when local source changes", () => {
  const first = loadLocalAnalysisIndex(root);
  expect(first.sites.flatMap((site) => site.keys)).toContain("EE_before");
  fs.writeFileSync(
    source,
    'readi18nPhrases("EE_after"); paramReader.read("targetKind");',
  );
  const second = loadLocalAnalysisIndex(root);
  expect(second.fingerprint).not.toBe(first.fingerprint);
  expect(second.sites.flatMap((site) => site.keys)).toEqual(["EE_after"]);
  expect(second.glossarySites?.flatMap((site) => site.keys)).toEqual([
    "targetKind",
  ]);
});

it("A3 repairs a modified generated index rather than trusting its fingerprint", () => {
  const first = loadLocalAnalysisIndex(root);
  fs.writeFileSync(
    indexFile,
    JSON.stringify({ ...first, sites: [], glossarySites: [] }),
  );
  const repaired = loadLocalAnalysisIndex(root);
  expect(repaired.sites).toEqual(first.sites);
  expect(repaired.glossarySites).toEqual(first.glossarySites);
});

it("A4 rejects an unparsable source even when a previous valid index exists", () => {
  loadLocalAnalysisIndex(root);
  fs.writeFileSync(source, "const broken = ;");
  expect(() => loadLocalAnalysisIndex(root)).toThrow(
    /Local source analysis unavailable/,
  );
});

it("A4 blocks when the local index builder is unavailable", () => {
  fs.rmSync(path.join(root, "scripts/phrase-analysis/build.mjs"));
  expect(() => loadLocalAnalysisIndex(root)).toThrow(
    /Local source analysis unavailable/,
  );
});
