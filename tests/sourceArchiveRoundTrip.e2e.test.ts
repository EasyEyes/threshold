/**
 * E2E: compile an experiment, export its source archive, then recompile
 * directly from the archive. The archive must be complete — every resource
 * the experiment needs must ride along, so the recompile succeeds with no
 * EasyEyesResources repo.
 *
 * RED: a readingCorpus given as a tilde value (~key, resolved per-language
 * via the phrases spreadsheet) produced no filename token, so the raw source
 * export omitted the corpus text files and the archive could not recompile.
 *
 * @jest-environment node
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import JSZip from "jszip";

import { loadGlossaryForTests } from "./helpers/glossary";
import { loadPhrasesForTests } from "./helpers/phrases";
import {
  addReferencedResources,
  compileFromArchive,
} from "./helpers/sourceArchive";
import { compileExperimentTableLocally } from "../examples/localCompile";
import {
  buildSourceArchiveTokens,
  collectResourceTokens,
} from "../preprocess/exportBeforeCompile";
import { parsePhraseFile } from "../../source/components/parsePhraseFile";

const CORPUS_EN = "corpus-en.txt";
const CORPUS_AR = "corpus-ar.txt";
const PHRASES = "test.phrases.xlsx";
const TABLE = "tildeReading.csv";

const CORPUS_TEXT =
  "The quick brown fox jumps over the lazy dog. " +
  "Pack my box with five dozen liquor jugs. ".repeat(20);

let tmpRoot: string;

const writeTable = (phrasesName = PHRASES): string => {
  const rows: Record<string, string> = {
    _about: "tilde corpus source-archive round trip",
    _authors: "Test",
    _language: "en",
    _languagePhrasesSpreadsheet: phrasesName,
    block: "1",
    calibrateDistanceBool: "FALSE",
    conditionName: "reading",
    conditionTrials: "1",
    font: "Roboto Mono",
    fontCharacterSet: "abcdefghijklmnopqrstuvwxyz ",
    fontSource: "google",
    readingCorpus: "~readingCorpus1",
    readingLineLength: "40",
    readingLineLengthUnit: "character",
    readingPages: "1",
    targetKind: "reading",
    targetTask: "identify",
    thresholdParameter: "targetSizeDeg",
  };
  const csv = Object.keys(rows)
    .sort()
    .map((name) =>
      name.startsWith("_")
        ? `${name},"${rows[name]}"`
        : `${name},,"${rows[name]}"`,
    )
    .join("\n");
  const tablePath = path.join(tmpRoot, TABLE);
  fs.writeFileSync(tablePath, csv);
  return tablePath;
};

const writeResources = (phrasesName = PHRASES): void => {
  fs.mkdirSync(path.join(tmpRoot, "texts"), { recursive: true });
  fs.mkdirSync(path.join(tmpRoot, "phrases"), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, "texts", CORPUS_EN), CORPUS_TEXT);
  fs.writeFileSync(path.join(tmpRoot, "texts", CORPUS_AR), CORPUS_TEXT);

  const sheet = XLSX.utils.aoa_to_sheet([
    ["~LanguageCode", "en", "ar"],
    ["~readingCorpus1", CORPUS_EN, CORPUS_AR],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  fs.writeFileSync(
    path.join(tmpRoot, "phrases", phrasesName),
    XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }),
  );
};

/** Archive builder with selectable token pipeline (to mimic old/broken exports).
 *  With expandTilde=true this mirrors the web export (exportStudyBeforeCompiling). */
const buildSourceArchive = async (
  tablePath: string,
  expandTilde = true,
  phrasesName = PHRASES,
): Promise<Buffer> => {
  const csvText = fs.readFileSync(tablePath, "utf8");
  const rows = Papa.parse(csvText, { skipEmptyLines: true }).data as string[][];

  let tokens: Set<string>;
  if (expandTilde) {
    const phraseFile = new File(
      [fs.readFileSync(path.join(tmpRoot, "phrases", phrasesName))],
      phrasesName,
    );
    const { phraseTable } = await parsePhraseFile(phraseFile);
    tokens = buildSourceArchiveTokens(rows, phraseTable);
  } else {
    tokens = collectResourceTokens(rows);
  }

  const zip = new JSZip();
  zip.file(TABLE, csvText);
  await addReferencedResources(zip, tokens, tmpRoot);
  return zip.generateAsync({ type: "nodebuffer" });
};

beforeAll(async () => {
  await loadGlossaryForTests();
  await loadPhrasesForTests();
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "source-archive-"));
  writeResources();
});

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("source archive round trip", () => {
  it("compiles, exports, and recompiles from the archive with no errors", async () => {
    const tablePath = writeTable();

    // 1. The experiment itself compiles cleanly.
    const first = await compileExperimentTableLocally(tablePath, {
      resourcesRoot: tmpRoot,
    });
    expect(first.blockingErrors).toEqual([]);
    expect(first.requestedTextList).toContain(CORPUS_EN);

    // 2. Export the source archive.
    const zipBuffer = await buildSourceArchive(tablePath);

    // The archive must carry the tilde-referenced corpus (all languages).
    const zip = await JSZip.loadAsync(zipBuffer);
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([TABLE, PHRASES, CORPUS_EN, CORPUS_AR]),
    );

    // 3. Recompile directly from the archive: no EasyEyesResources needed.
    const second = await compileFromArchive(zipBuffer, TABLE);
    expect(second.blockingErrors).toEqual([]);
    expect(second.requestedTextList).toContain(CORPUS_EN);
    expect(second.blockFileCount).toBeGreaterThan(0);
  });

  it("round-trips when the phrases spreadsheet does not follow the *.phrases.xlsx naming convention", async () => {
    const OTHER_NAME = "translations.xlsx";
    writeResources(OTHER_NAME);
    const tablePath = writeTable(OTHER_NAME);

    const zipBuffer = await buildSourceArchive(tablePath, true, OTHER_NAME);
    const zip = await JSZip.loadAsync(zipBuffer);
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([TABLE, OTHER_NAME, CORPUS_EN]),
    );

    const result = await compileFromArchive(zipBuffer, TABLE);
    expect(result.blockingErrors).toEqual([]);
    expect(result.requestedTextList).toContain(CORPUS_EN);
    expect(result.blockFileCount).toBeGreaterThan(0);
  });

  it("recompile fails loudly when the archive lacks the tilde corpus", async () => {
    const tablePath = writeTable();
    // Mimic the old export: tilde values never matched, so the corpus files
    // are missing from the archive.
    const zipBuffer = await buildSourceArchive(tablePath, false);
    const zip = await JSZip.loadAsync(zipBuffer);
    expect(Object.keys(zip.files)).not.toContain(CORPUS_EN);

    const result = await compileFromArchive(zipBuffer, TABLE);
    expect(result.blockingErrors.length).toBeGreaterThan(0);
    expect(
      result.blockingErrors.some((e) => e.message.includes(CORPUS_EN)),
    ).toBe(true);
  });
});
