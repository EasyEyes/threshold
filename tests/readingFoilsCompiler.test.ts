/**
 * Compile-time check for sufficient reading foils — RED tests.
 *
 * A reading block whose corpus cannot supply enough unique, non-displayed
 * foil words currently crashes MID-STUDY ("Failed to construct a new
 * question. [not enough foils]", thrown by prepareReadingQuestions during
 * blockSchedulerFinalRoutineBegin). The corpus text is available at compile
 * time, so the compiler must reject such tables up front.
 *
 * Mirrors the checkReadingCorpusLength harness: Papa-parse a minimal table,
 * build the df via dataframeFromPapaParsed, call checkReadingFoils directly.
 *
 * @jest-environment node
 */
import Papa from "papaparse";
import { describe, it, expect, beforeAll } from "@jest/globals";
import { loadGlossaryForTests } from "./helpers/glossary";
import { dataframeFromPapaParsed } from "../preprocess/utils";
import { checkReadingFoils } from "../preprocess/experimentFileChecks";

beforeAll(async () => {
  await loadGlossaryForTests();
});

/** One condition per CSV column (col B left empty, as in real tables). */
const makeDf = (conditionColumns: string[]) => {
  const cols = conditionColumns.map((c) => c).join("\n");
  const csv = `_about,test
block,1
${cols}`;
  return dataframeFromPapaParsed(Papa.parse(csv, { skipEmptyLines: true }));
};

/** Build one condition column's rows: "param,,value" per line. */
const condition = (o: Record<string, string>) =>
  Object.entries(o)
    .map(([k, v]) => `${k},,${v}`)
    .join("\n");

const WORDS_30 = Array.from(
  { length: 30 },
  (_, i) => `word${String(i).padStart(2, "0")}x`,
).join(" ");

describe("checkReadingFoils — compile-time foil supply validation", () => {
  it("errors when unique words can't cover foils + displayed words", () => {
    // 6 unique words; needs 2×(4−1)=6 foils, and ~4 are displayed in the
    // first 20 characters. Supply = 6 − 4 = 2 < 6 → must error.
    const df = makeDf([
      condition({
        targetKind: "reading",
        readingCorpus: "small.txt",
        readingNumberOfQuestions: "2",
        readingNumberOfPossibleAnswers: "4",
        readingPages: "1",
        readingLinesPerPage: "1",
        readingLineLength: "20",
      }),
    ]);
    const errors = checkReadingFoils(df, {
      "small.txt": "alpha beta gamma delta epsilon zeta",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].parameters).toEqual(
      expect.arrayContaining([
        "readingCorpus",
        "readingNumberOfQuestions",
        "readingNumberOfPossibleAnswers",
      ]),
    );
    expect(errors[0].hint).toContain("small.txt");
  });

  it("passes when the corpus has ample unique words", () => {
    const df = makeDf([
      condition({
        targetKind: "reading",
        readingCorpus: "big.txt",
        readingNumberOfQuestions: "2",
        readingNumberOfPossibleAnswers: "4",
        readingPages: "1",
        readingLinesPerPage: "1",
        readingLineLength: "20",
      }),
    ]);
    expect(checkReadingFoils(df, { "big.txt": WORDS_30 })).toHaveLength(0);
  });

  it("errors when the whole corpus is displayed (no non-displayed words)", () => {
    // 8 unique words, all displayed (page budget exceeds corpus length) →
    // zero foil supply for the 6 needed.
    const df = makeDf([
      condition({
        targetKind: "reading",
        readingCorpus: "allshown.txt",
        readingNumberOfQuestions: "2",
        readingNumberOfPossibleAnswers: "4",
        readingPages: "1",
        readingLinesPerPage: "10",
        readingLineLength: "100",
      }),
    ]);
    const errors = checkReadingFoils(df, {
      "allshown.txt": "alpha beta gamma delta epsilon zeta eta theta",
    });
    expect(errors).toHaveLength(1);
  });

  it("ignores one-character words when counting foil supply", () => {
    // Zero words with ≥2 chars → zero supply, even though 10 "words" exist.
    const df = makeDf([
      condition({
        targetKind: "reading",
        readingCorpus: "tiny.txt",
        readingNumberOfQuestions: "1",
        readingNumberOfPossibleAnswers: "2",
        readingPages: "1",
        readingLinesPerPage: "1",
        readingLineLength: "20",
      }),
    ]);
    const errors = checkReadingFoils(df, {
      "tiny.txt": "a b c d e f g h i j",
    });
    expect(errors).toHaveLength(1);
  });

  it("counts words case-insensitively (Alpha/ALPHA/alpha are one word)", () => {
    // Only 2 unique canonical words → 0 supply for the 2 foils needed.
    const df = makeDf([
      condition({
        targetKind: "reading",
        readingCorpus: "caps.txt",
        readingNumberOfQuestions: "1",
        readingNumberOfPossibleAnswers: "3",
        readingPages: "1",
        readingLinesPerPage: "1",
        readingLineLength: "200",
      }),
    ]);
    const errors = checkReadingFoils(df, {
      "caps.txt": "Alpha ALPHA alpha beta Beta BETA",
    });
    expect(errors).toHaveLength(1);
  });

  it("skips rsvpReading conditions (own word management)", () => {
    const df = makeDf([
      condition({
        targetKind: "rsvpReading",
        readingCorpus: "small.txt",
        readingNumberOfQuestions: "2",
        readingNumberOfPossibleAnswers: "4",
      }),
    ]);
    expect(
      checkReadingFoils(df, { "small.txt": "alpha beta gamma" }),
    ).toHaveLength(0);
  });

  it("skips conditions with no questions or a single answer", () => {
    const df = makeDf([
      condition({
        targetKind: "reading",
        readingCorpus: "small.txt",
        readingNumberOfQuestions: "0",
        readingNumberOfPossibleAnswers: "4",
      }),
    ]);
    expect(
      checkReadingFoils(df, { "small.txt": "alpha beta gamma" }),
    ).toHaveLength(0);
    const df2 = makeDf([
      condition({
        targetKind: "reading",
        readingCorpus: "small.txt",
        readingNumberOfQuestions: "2",
        readingNumberOfPossibleAnswers: "1",
      }),
    ]);
    expect(
      checkReadingFoils(df2, { "small.txt": "alpha beta gamma" }),
    ).toHaveLength(0);
  });

  it("skips conditions whose corpus content is unavailable", () => {
    const df = makeDf([
      condition({
        targetKind: "reading",
        readingCorpus: "missing.txt",
        readingNumberOfQuestions: "2",
        readingNumberOfPossibleAnswers: "4",
      }),
    ]);
    expect(checkReadingFoils(df, {})).toHaveLength(0);
  });

  it("reports each offending condition (all errors at once)", () => {
    // Two reading conditions; only the small corpus offends.
    const csv = `_about,test
block,1,1
targetKind,,reading,reading
readingCorpus,,big.txt,small.txt
readingNumberOfQuestions,,2,2
readingNumberOfPossibleAnswers,,4,4
readingPages,,1,1
readingLinesPerPage,,1,1
readingLineLength,,20,20`;
    const df = dataframeFromPapaParsed(
      Papa.parse(csv, { skipEmptyLines: true }),
    );
    const errors = checkReadingFoils(df, {
      "big.txt": WORDS_30,
      "small.txt": "alpha beta gamma delta epsilon zeta",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].hint).toContain("small.txt");
  });
});

describe("checkReadingFoils — readingCorpusFoilsExclude cumulative consumption", () => {
  // Corpus: 8 unique words; first 20 chars "alpha beta gamma del" display ~4.
  // Q=1, A=3 → 2 foils per condition; per-condition supply = 8 − 4 = 4.
  const CORPUS8 = "alpha beta gamma delta epsilon zeta eta theta";
  const readingCond = (
    corpus: string,
    exclude: string,
    extra: Record<string, string> = {},
  ) => ({
    targetKind: "reading",
    readingCorpus: corpus,
    readingNumberOfQuestions: "1",
    readingNumberOfPossibleAnswers: "3",
    readingPages: "1",
    readingLinesPerPage: "1",
    readingLineLength: "20",
    readingCorpusFoilsExclude: exclude,
    ...extra,
  });
  const tableFromConditions = (conds: Record<string, string>[]) => {
    const params = [...new Set(conds.flatMap((c) => Object.keys(c)))];
    const rows = params.map(
      (p) => `${p},${conds.map((c) => c[p] ?? "").join(",")}`,
    );
    const csv = `_about,test\nblock,${conds
      .map((_, i) => i + 1)
      .join(",")}\n${rows.join("\n")}`;
    return dataframeFromPapaParsed(Papa.parse(csv, { skipEmptyLines: true }));
  };

  it("pastTargetsAndFoils: foils consumed by earlier conditions shrink later supply", () => {
    // Each condition passes alone (supply 4 ≥ 2), but conditions 1+2 consume
    // 4 foils cumulatively → condition 3 has 8 − 4(displayed) − 4(pastFoils) = 0.
    const df = tableFromConditions([
      readingCond("shared.txt", "none"),
      readingCond("shared.txt", "pastTargetsAndFoils"),
      readingCond("shared.txt", "pastTargetsAndFoils"),
    ]);
    const errors = checkReadingFoils(df, { "shared.txt": CORPUS8 });
    expect(errors).toHaveLength(1);
    expect(errors[0].hint).toContain("shared.txt");
    expect(errors[0].parameters).toContain("readingCorpusFoilsExclude");
  });

  it("exclude=none: conditions never constrain each other", () => {
    const df = tableFromConditions([
      readingCond("shared.txt", "none"),
      readingCond("shared.txt", "none"),
      readingCond("shared.txt", "none"),
    ]);
    expect(checkReadingFoils(df, { "shared.txt": CORPUS8 })).toHaveLength(0);
  });

  it("pastTargets: cross-corpus past targets consume supply only if they land in the pool", () => {
    // A displays "alpha beta gamma del…"; B's only non-displayed eligible
    // word is "alpha" — a past A target. Consumption = min(Q, pool overlap)
    // = 1 → B's supply 0 < 1 → error.
    const df = tableFromConditions([
      readingCond("a.txt", "none", {
        readingNumberOfPossibleAnswers: "2",
      }),
      readingCond("b.txt", "pastTargets", {
        readingNumberOfPossibleAnswers: "2",
      }),
    ]);
    const errors = checkReadingFoils(df, {
      "a.txt": "alpha beta gamma delta epsilon zeta",
      "b.txt": "one two three four alpha",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].hint).toContain("b.txt");
  });

  it("pastTargets: no false alarm when past targets are NOT in this corpus", () => {
    // Same shape as above, but B's pool word ("five") never appears in A —
    // A's targets can't consume from B, so B must pass. (A flat per-count
    // subtraction would false-alarm here, eg English block followed by a
    // Chinese block sharing no vocabulary.)
    const df = tableFromConditions([
      readingCond("a.txt", "none", {
        readingNumberOfPossibleAnswers: "2",
      }),
      readingCond("b.txt", "pastTargets", {
        readingNumberOfPossibleAnswers: "2",
      }),
    ]);
    const errors = checkReadingFoils(df, {
      "a.txt": "alpha beta gamma delta epsilon zeta",
      "b.txt": "one two three four five",
    });
    expect(errors).toHaveLength(0);
  });

  it("pastTargets: same-corpus past targets are re-displayed, NOT consumed", () => {
    // Same corpus restarts per condition (per-block_condition cursor), so
    // condition 1's targets appear on condition 2's pages → excluded as
    // displayed already; counting them again would false-alarm.
    const df = tableFromConditions([
      readingCond("shared.txt", "none", {
        readingNumberOfPossibleAnswers: "2",
      }),
      readingCond("shared.txt", "pastTargets", {
        readingNumberOfPossibleAnswers: "2",
      }),
    ]);
    expect(
      checkReadingFoils(df, {
        "shared.txt": "alpha beta gamma delta epsilon zeta",
      }),
    ).toHaveLength(0);
  });

  it("pastTargets: shuffled corpus breaks the re-display assumption", () => {
    // With readingCorpusShuffleBool, displayed words are a random sample, so
    // a same-corpus past target may NOT be re-displayed → real consumption.
    const df = tableFromConditions([
      readingCond("shared.txt", "none", {
        readingNumberOfPossibleAnswers: "2",
        readingCorpusShuffleBool: "TRUE",
      }),
      readingCond("shared.txt", "pastTargets", {
        readingNumberOfPossibleAnswers: "2",
      }),
    ]);
    const errors = checkReadingFoils(df, {
      "shared.txt": "alpha beta gamma delta epsilon",
    });
    expect(errors).toHaveLength(1);
  });

  it("readingCorpusEndlessBool: cumulative check stays lenient (no false alarm)", () => {
    const df = tableFromConditions([
      readingCond("shared.txt", "none"),
      readingCond("shared.txt", "pastTargetsAndFoils"),
      readingCond("shared.txt", "pastTargetsAndFoils", {
        readingCorpusEndlessBool: "TRUE",
      }),
    ]);
    expect(checkReadingFoils(df, { "shared.txt": CORPUS8 })).toHaveLength(0);
  });

  it("consumption follows block execution order, not table order", () => {
    // Table lists the block-2 condition first; execution is block 1 then 2,
    // so only the block-2 condition sees cumulative consumption.
    const df = tableFromConditions([
      readingCond("shared.txt", "pastTargetsAndFoils"),
      readingCond("shared.txt", "none"),
      readingCond("shared.txt", "pastTargetsAndFoils"),
    ]);
    // blocks default to 1,2,3 in tableFromConditions — remap: make the FIRST
    // row execute LAST by overriding the block column.
    const csv = `_about,test
block,3,1,2
targetKind,reading,reading,reading
readingCorpus,shared.txt,shared.txt,shared.txt
readingNumberOfQuestions,1,1,1
readingNumberOfPossibleAnswers,3,3,3
readingPages,1,1,1
readingLinesPerPage,1,1,1
readingLineLength,20,20,20
readingCorpusFoilsExclude,pastTargetsAndFoils,none,pastTargetsAndFoils`;
    const df2 = dataframeFromPapaParsed(
      Papa.parse(csv, { skipEmptyLines: true }),
    );
    expect(df).toBeDefined();
    // Execution order: row2 (block1, none) → row3 (block2, pT&F, supply
    // 4−2=2 ≥ 2 passes) → row1 (block3, pT&F, supply 8−4−4=0 < 2 ERRORS).
    const errors = checkReadingFoils(df2, { "shared.txt": CORPUS8 });
    expect(errors).toHaveLength(1);
  });
});
