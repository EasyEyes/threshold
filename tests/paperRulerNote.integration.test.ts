/**
 * Integration test for the paper/ruler compatibility note, using the REAL
 * ParamReader, the REAL glossary cache (so `_calibrateDistance`'s default
 * 'paper' is genuinely exercised), and the REAL English phrases.
 *
 * Verifies the fix for the bug where "⚠️ You'll need a piece of paper 📄"
 * appeared on the final compatibility page even when no block enabled
 * distance calibration — and that the note still appears in intended cases.
 */

import * as fs from "fs";
import * as path from "path";
import type { GlossaryData } from "../../source/components/types";

const glossaryData: GlossaryData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "__cache__", "glossary.json"), "utf-8"),
);
const phrasesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "__cache__", "phrases.json"), "utf-8"),
);

// Serve the REAL phrases, like the production readi18nPhrases does.
jest.mock("../components/readPhrases.js", () => ({
  readi18nPhrases: jest.fn((key: string, lang: string) => {
    const entry = phrasesData.phrases[key];
    if (!entry) throw new Error(`Unknown phrase: ${key}`);
    return entry[lang] ?? entry["en"];
  }),
}));

jest.mock("../components/markdownInline.js", () => ({
  renderMarkdown: jest.fn((s: string) => s),
}));

// ParamReader's constructor fetches block CSVs via Papa.parse — stub it out;
// tests inject conditions directly via `reader._experiment`.
jest.mock("papaparse", () => ({
  __esModule: true,
  default: { parse: jest.fn() },
}));

import { initGlossary } from "../parameters/glossaryRegistry";
import { ParamReader } from "../parameters/paramReader";
import { getPaperRulerNote } from "../components/compatibilityUI.js";

// Build a reader with conditions as ParamReader._loadFile would have stored
// them (cell values already passed through ParamReader.parse).
const makeReader = (conditions: Record<string, any>[]): ParamReader => {
  const reader = new ParamReader("conditions", () => {});
  reader._experiment = conditions.map((c) => ({ ...c }));
  return reader;
};

// A condition shaped like minimalExperiment's: distance calibration
// explicitly FALSE, and _calibrateDistance NOT set (column absent), so reads
// fall through to the glossary default 'paper' — the exact bug scenario.
const noDistanceCalibratonCondition = {
  block: 1,
  block_condition: "1_1",
  conditionName: "triplet",
  calibrateDistanceBool: false,
};

beforeAll(() => {
  initGlossary(glossaryData);
});

describe("getPaperRulerNote with real ParamReader + glossary + phrases", () => {
  it("bug case: returns null when calibrateDistanceBool is FALSE and _calibrateDistance defaults to 'paper'", () => {
    const reader = makeReader([noDistanceCalibratonCondition]);
    expect(reader.read("_calibrateDistance")[0]).toBe("paper"); // default confirmed
    expect(getPaperRulerNote(reader, "en")).toBeNull();
  });

  it("bug case, multi-block: returns null when calibrateDistanceBool is FALSE in every block", () => {
    const reader = makeReader([
      noDistanceCalibratonCondition,
      { ...noDistanceCalibratonCondition, block: 2, block_condition: "2_1" },
    ]);
    expect(getPaperRulerNote(reader, "en")).toBeNull();
  });

  it("intended case: shows the real paper phrase when calibrateDistanceBool is TRUE and method defaults to 'paper'", () => {
    const reader = makeReader([
      { ...noDistanceCalibratonCondition, calibrateDistanceBool: true },
    ]);
    const note = getPaperRulerNote(reader, "en");
    expect(note).toContain("You'll need a piece of paper");
    expect(note).toContain("8.5×11 inches or A4");
    expect(note).not.toContain("measuring stick");
  });

  it("intended case, multi-block: shows the note when ANY block enables distance calibration", () => {
    const reader = makeReader([
      noDistanceCalibratonCondition,
      {
        ...noDistanceCalibratonCondition,
        block: 2,
        block_condition: "2_1",
        calibrateDistanceBool: true,
      },
    ]);
    expect(getPaperRulerNote(reader, "en")).toContain(
      "You'll need a piece of paper",
    );
  });

  it("intended case: shows paper-and-ruler with real ruler length when _calibrateDistanceCheckBool is TRUE", () => {
    const reader = makeReader([
      {
        ...noDistanceCalibratonCondition,
        calibrateDistanceBool: true,
        _calibrateDistanceCheckBool: true,
        _calibrateDistanceCheckMinRulerCm: 60,
      },
    ]);
    const note = getPaperRulerNote(reader, "en")!;
    expect(note).toContain("You'll need a piece of paper");
    expect(note).toContain("measuring stick");
    expect(note).toContain("at least 24 inches (60 cm) long");
    expect(note).not.toContain("[[Nin]]");
    expect(note).not.toContain("[[Ncm]]");
  });

  it("intended case: shows ruler-only note when method is paperOrRuler and check is TRUE", () => {
    const reader = makeReader([
      {
        ...noDistanceCalibratonCondition,
        calibrateDistanceBool: true,
        _calibrateDistance: "paperOrRuler",
        _calibrateDistanceCheckBool: true,
        _calibrateDistanceCheckMinRulerCm: 60,
      },
    ]);
    const note = getPaperRulerNote(reader, "en")!;
    expect(note).toContain("measuring stick");
    expect(note).toContain("at least 24 inches (60 cm) long");
    expect(note).not.toContain("piece of paper");
  });

  it("no note for non-paper distance methods (blindspot), even when enabled", () => {
    const reader = makeReader([
      {
        ...noDistanceCalibratonCondition,
        calibrateDistanceBool: true,
        _calibrateDistance: "blindspot",
      },
    ]);
    expect(getPaperRulerNote(reader, "en")).toBeNull();
  });
});
