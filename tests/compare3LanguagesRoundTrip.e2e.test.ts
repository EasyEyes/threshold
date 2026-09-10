/**
 * E2E round trip on a real experiment: Compare3Languages (4 conditions,
 * 4 languages, file+Google fonts, consent/debrief PDFs, phrases spreadsheet,
 * and tilde-referenced reading corpora).
 *
 * This is the experiment that exposed the raw-source tilde gap: its real
 * raw.source archive contained the fonts, PDFs, and phrases spreadsheet but
 * NONE of the ~1.BiomesStory / ~2.MiceStory corpus text files.
 *
 * Flow: read the real table → export a source archive with the production
 * token pipeline → recompile from the archive alone → zero errors.
 *
 * @jest-environment node
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import JSZip from "jszip";

import { loadGlossaryForTests } from "./helpers/glossary";
import { loadPhrasesForTests } from "./helpers/phrases";
import {
  addReferencedResources,
  compileFromArchive,
} from "./helpers/sourceArchive";
import {
  buildSourceArchiveTokens,
  collectResourceTokens,
  findPhrasesSpreadsheetName,
  parseSpreadsheetRows,
} from "../preprocess/exportBeforeCompile";
import { parsePhraseFile } from "../../source/components/parsePhraseFile";
import type { EasyEyesError } from "../preprocess/errorMessages";

const FIXTURES = path.resolve(__dirname, "fixtures/compare3languages");
const EXAMPLE_TEXTS = path.resolve(__dirname, "../examples/texts");
const TABLE = "Compare3Languages.xlsx";
const PHRASES = "Compare3Languages.phrases.xlsx";

// Every corpus the phrases spreadsheet maps the table's readingCorpus /
// readingCorpusFoils tilde keys to, across all 4 languages, that exists in
// examples/texts (a few other-language files were never added there; the
// export is best-effort and the experiment itself runs in Urdu).
const CORPORA = [
  "1.Biomes.Arabic.txt",
  "1.Biomes.English.txt",
  "1.Biomes.Persian.txt",
  "1.Biomes.Urdu.txt",
  "2.Mice.Arabic.txt",
  "2.Mice.English.txt",
  "2.Mice.Urdu.txt",
  "3.Beaver.Arabic.txt",
  "3.Beaver.English.txt",
  "3.Beaver.Urdu.txt",
  "4.Trees.Arabic.txt",
  "4.Trees.Urdu.txt",
  "EnglishFoils.txt",
  "Urdu word list.txt",
  "UrduTargets1.txt",
  "UrduTargets2.txt",
  "UrduTargets3.txt",
  "UrduTargets4.txt",
  "Lorem-ipsum.txt",
  "Urdu beauty text.txt",
];
// The experiment runs in Urdu (_language: ur): every corpus the compile needs.
const URDU_CORPORA = [
  "1.Biomes.Urdu.txt",
  "2.Mice.Urdu.txt",
  "3.Beaver.Urdu.txt",
  "4.Trees.Urdu.txt",
  "Urdu word list.txt",
  "UrduTargets1.txt",
  "UrduTargets2.txt",
  "UrduTargets3.txt",
  "UrduTargets4.txt",
  "Urdu beauty text.txt",
];

const FILE_FONTS = [
  "BadeenDisplay-Regular.ttf",
  "Kufi LT Regular.woff2",
  "NotoNaskhArabic-Regular.ttf",
  "NotoNastaliqUrdu-Regular.woff2",
];
const FORMS = ["consent.pdf", "debrief.pdf"];

let tmpRoot: string;

/** Lay out a fake EasyEyesResources dir from the real folder + corpora. */
const assembleResourcesRoot = (): void => {
  const copy = (sub: string, name: string) => {
    fs.mkdirSync(path.join(tmpRoot, sub), { recursive: true });
    fs.copyFileSync(path.join(FIXTURES, name), path.join(tmpRoot, sub, name));
  };
  for (const name of FILE_FONTS) copy("fonts", name);
  for (const name of FORMS) copy("forms", name);
  copy("phrases", PHRASES);
  fs.mkdirSync(path.join(tmpRoot, "texts"), { recursive: true });
  for (const name of CORPORA)
    fs.copyFileSync(
      path.join(EXAMPLE_TEXTS, name),
      path.join(tmpRoot, "texts", name),
    );
};

/**
 * Offline mirror of exportStudyBeforeCompiling: spreadsheet + every
 * EasyEyesResources file the tokens reference, zipped flat.
 */
const buildSourceArchive = async (expandTilde = true): Promise<Buffer> => {
  const tableFile = new File(
    [fs.readFileSync(path.join(FIXTURES, TABLE))],
    TABLE,
  );
  const rows = await parseSpreadsheetRows(tableFile);

  expect(findPhrasesSpreadsheetName(rows)).toBe(PHRASES);

  let tokens: Set<string>;
  if (expandTilde) {
    const phraseFile = new File(
      [fs.readFileSync(path.join(FIXTURES, PHRASES))],
      PHRASES,
    );
    const { phraseTable } = await parsePhraseFile(phraseFile);
    tokens = buildSourceArchiveTokens(rows, phraseTable);
  } else {
    tokens = collectResourceTokens(rows);
  }

  const zip = new JSZip();
  zip.file(TABLE, fs.readFileSync(path.join(FIXTURES, TABLE)));
  await addReferencedResources(zip, tokens, tmpRoot);
  return zip.generateAsync({ type: "nodebuffer" });
};

beforeAll(async () => {
  await loadGlossaryForTests();
  await loadPhrasesForTests();
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "compare3languages-"));
  assembleResourcesRoot();
}, 120000);

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("Compare3Languages source archive round trip", () => {
  it("export includes every tilde-referenced corpus, in every language", async () => {
    const zipBuffer = await buildSourceArchive(true);
    const zip = await JSZip.loadAsync(zipBuffer);
    const names = Object.keys(zip.files);

    expect(names).toEqual(
      expect.arrayContaining([
        TABLE,
        PHRASES,
        ...CORPORA, // all 7 available Biomes/Mice corpora
        ...FILE_FONTS,
        ...FORMS,
      ]),
    );
  });

  it("the old (pre-fix) export omitted all tilde corpora", async () => {
    // Documents the original bug: without expansion, no corpus matched.
    const zipBuffer = await buildSourceArchive(false);
    const zip = await JSZip.loadAsync(zipBuffer);
    const names = Object.keys(zip.files);
    for (const corpus of CORPORA) expect(names).not.toContain(corpus);
    expect(names).toEqual(expect.arrayContaining([TABLE, PHRASES]));
  });

  it("recompiles from the exported archive with no errors", async () => {
    const zipBuffer = await buildSourceArchive(true);
    const result = await compileFromArchive(zipBuffer, TABLE);
    expect(result.blockingErrors).toEqual([]);
    expect(result.requestedTextList).toEqual(
      expect.arrayContaining(URDU_CORPORA),
    );
  }, 60000);

  it("recompile from a corpus-less archive fails loudly, naming the corpora", async () => {
    const zipBuffer = await buildSourceArchive(false);
    const result = await compileFromArchive(zipBuffer, TABLE);
    expect(result.blockingErrors.length).toBeGreaterThan(0);
    for (const corpus of URDU_CORPORA)
      expect(
        result.blockingErrors.some((e) => e.message.includes(corpus)),
      ).toBe(true);
  }, 60000);
});
