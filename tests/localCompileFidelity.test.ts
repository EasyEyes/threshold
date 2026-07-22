/**
 * Fidelity tests: the local compile used by `npm run examples` must surface
 * the same errors/warnings as the web compiler (easyeyes.app/compiler),
 * allowing only for resources being sourced from the local examples/
 * subfolders instead of the EasyEyesResources GitLab repo.
 *
 * RED: these resource-validation checks were previously skipped in node mode
 * (gated on space === "web"), so the "missing resource" tests failed against
 * the old code.
 *
 * @jest-environment node
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loadGlossaryForTests } from "./helpers/glossary";
import { loadPhrasesForTests } from "./helpers/phrases";
import { compileExperimentTableLocally } from "../examples/localCompile";

let tmpRoot: string;

// Valid minimal letter-condition rows (condition params), alphabetized.
const BASE_CONDITION_ROWS: Record<string, string> = {
  block: "1",
  calibrateDistanceBool: "FALSE",
  conditionName: "A",
  conditionTrials: "1",
  fontCharacterSet: "abc",
  targetDurationSec: "0.3",
  targetEccentricityXDeg: "-10",
  targetEccentricityYDeg: "0",
  targetKind: "letter",
  targetTask: "identify",
  thresholdParameter: "spacingDeg",
};

/**
 * Build a table CSV with correctly alphabetized rows: underscore params first
 * (among themselves), then condition params. `extra` adds/replaces rows.
 */
const makeTable = (extra: Record<string, string> = {}): string => {
  const merged: Record<string, string> = {
    _about: "fidelity test",
    ...BASE_CONDITION_ROWS,
    ...extra,
  };
  const names = Object.keys(merged).sort();
  return names
    .map((name) =>
      name.startsWith("_")
        ? `${name},${merged[name]},`
        : `${name},,${merged[name]}`,
    )
    .join("\n");
};

const writeTable = (name: string, csv: string): string => {
  const p = path.join(tmpRoot, "tables", name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, csv);
  return p;
};

const writeResource = (rel: string, content: string | Buffer): void => {
  const p = path.join(tmpRoot, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};

const compile = async (tablePath: string) =>
  compileExperimentTableLocally(tablePath, { resourcesRoot: tmpRoot });

const errorNames = (result: any): string[] =>
  result.blockingErrors.map((e: any) => e.name);

beforeAll(async () => {
  await loadGlossaryForTests();
  await loadPhrasesForTests();
});

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ee-local-compile-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("GREEN: valid tables compile clean (preserve current behavior)", () => {
  it("minimal letter table with no resource requests → no blocking errors", async () => {
    const table = writeTable("valid.csv", makeTable());
    const result = await compile(table);
    expect(errorNames(result)).toEqual([]);
    expect(result.fileStringList.length).toBeGreaterThan(0);
  });

  it("xlsx and csv of the same table compile identically", async () => {
    const { utils, write } = await import("xlsx");
    const csv = makeTable();
    const csvPath = writeTable("same.csv", csv);
    // Build an .xlsx whose first sheet holds the same rows.
    const rows = csv.split("\n").map((line) => line.split(","));
    const sheet = utils.aoa_to_sheet(rows);
    const book = utils.book_new();
    utils.book_append_sheet(book, sheet, "Sheet1");
    const xlsxPath = path.join(tmpRoot, "tables", "same.xlsx");
    fs.writeFileSync(
      xlsxPath,
      write(book, { type: "buffer", bookType: "xlsx" }),
    );
    const fromCsv = await compile(csvPath);
    const fromXlsx = await compile(xlsxPath);
    expect(errorNames(fromXlsx)).toEqual(errorNames(fromCsv));
    // Block CSVs embed !experimentFilename; normalize before comparing.
    const normalize = (files: string[][]) =>
      JSON.stringify(files).replaceAll("same.csv", "same.xlsx");
    expect(normalize(fromXlsx.fileStringList)).toEqual(
      normalize(fromCsv.fileStringList),
    );
  });

  it("table with file font present locally → no missing-font error", async () => {
    const fontBytes = fs.readFileSync(
      path.resolve(__dirname, "../examples/fonts/FiraSans.ttf"),
    );
    writeResource("fonts/FiraSans.ttf", fontBytes);
    const table = writeTable(
      "valid-font.csv",
      makeTable({ font: "FiraSans.ttf", fontSource: "file" }),
    );
    const result = await compile(table);
    expect(errorNames(result)).toEqual([]);
  }, 60000);
});

describe("RED: resource-presence checks must run locally (web parity)", () => {
  it("missing file-source font → Font file not found", async () => {
    const table = writeTable(
      "missing-font.csv",
      makeTable({ font: "NoSuchFont.woff2", fontSource: "file" }),
    );
    const result = await compile(table);
    expect(errorNames(result)).toContain("Font file not found");
  });

  it("missing consent form → Form file is missing", async () => {
    const table = writeTable(
      "missing-form.csv",
      makeTable({ _consentForm: "NoSuchConsent.pdf" }),
    );
    const result = await compile(table);
    expect(errorNames(result)).toContain("Form file is missing");
  });

  it("reading corpus present locally → no missing-text error", async () => {
    writeResource("texts/corpus.txt", "word ".repeat(500));
    const table = writeTable(
      "present-text.csv",
      makeTable({ readingCorpus: "corpus.txt" }),
    );
    const result = await compile(table);
    expect(errorNames(result)).not.toContain("Text file is missing");
  });

  it("missing reading corpus text → Text file is missing", async () => {
    const table = writeTable(
      "missing-text.csv",
      makeTable({ readingCorpus: "NoSuchCorpus.txt" }),
    );
    const result = await compile(table);
    expect(errorNames(result)).toContain("Text file is missing");
  });

  it("missing image → Image file not found", async () => {
    const table = writeTable(
      "missing-image.csv",
      makeTable({ showImage: "NoSuchImage.png" }),
    );
    const result = await compile(table);
    expect(errorNames(result)).toContain("Image file not found");
  });

  it("missing code file → JavaScript code file is missing", async () => {
    const table = writeTable(
      "missing-code.csv",
      makeTable({ movieComputeJS: "NoSuchCode.js" }),
    );
    const result = await compile(table);
    expect(errorNames(result)).toContain("JavaScript code file is missing");
  });

  it("missing sound folder zip → Sound folder is missing", async () => {
    const table = writeTable(
      "missing-sound-folder.csv",
      makeTable({ targetKind: "sound", targetSoundFolder: "NoSuchFolder" }),
    );
    const result = await compile(table);
    expect(errorNames(result)).toContain("Sound folder is missing");
  });

  it("missing impulse response → Impulse response file is missing", async () => {
    const table = writeTable(
      "missing-ir.csv",
      makeTable({
        _calibrateSoundSimulateLoudspeaker: "NoSuch.gainVTime.csv",
      }),
    );
    const result = await compile(table);
    expect(errorNames(result)).toContain("Impulse response file is missing");
  });

  it("missing frequency response → Frequency response file is missing", async () => {
    const table = writeTable(
      "missing-fr.csv",
      makeTable({
        _calibrateSoundSimulateMicrophone: "NoSuch.gainVFreq.csv",
      }),
    );
    const result = await compile(table);
    expect(errorNames(result)).toContain("Frequency response file is missing");
  });

  it("missing targetSoundList → Target sound list file is missing", async () => {
    // Folder-structure block (web parity) only runs when nothing else has
    // errored, so the sound folder zip must exist and be valid.
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("tone.wav", Buffer.alloc(44));
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    writeResource("folders/sounds.zip", zipBuffer);
    const table = writeTable(
      "missing-tsl.csv",
      makeTable({
        targetKind: "sound",
        targetSoundFolder: "sounds",
        targetSoundList: "NoSuch.targetSoundList.csv",
      }),
    );
    const result = await compile(table);
    expect(errorNames(result)).toContain("Target sound list file is missing");
  });

  it("missing image folder → Image folder is missing", async () => {
    const table = writeTable(
      "missing-image-folder.csv",
      makeTable({
        targetKind: "image",
        targetImageFolder: "NoSuchImageFolder",
      }),
    );
    const result = await compile(table);
    expect(errorNames(result)).toContain("Image folder is missing");
  });
});

describe("RED: environment-constrained checks are reported, not silently skipped", () => {
  it("Prolific participant-group validation is reported as skipped (needs experimenter account)", async () => {
    const table = writeTable(
      "prolific-groups.csv",
      makeTable({
        _prolific2CompletionPathAddToGroup: "someGroup",
        _prolific2AbortedAddToGroup: "otherGroup",
      }),
    );
    const result = await compile(table);
    // Must not fabricate an API error we cannot actually check locally…
    expect(errorNames(result).some((n) => /prolific api/i.test(n))).toBe(false);
    // …and must tell the experimenter the check was omitted.
    expect(result.skippedChecks.some((s: string) => /prolific/i.test(s))).toBe(
      true,
    );
  });
});
