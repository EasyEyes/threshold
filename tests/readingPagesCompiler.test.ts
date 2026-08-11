/**
 * Compile-time handling of readingPages = -1 (read to the end of the corpus).
 *
 *   - checkReadingCorpusLength: a positive readingPages requires a corpus of
 *     at least (pages − 0.9) × readingLineLength × readingLinesPerPage
 *     characters; -1 has no minimum, since it takes whatever the corpus has.
 *   - checkReadingFoils: -1 displays the WHOLE corpus, so none of its words
 *     can serve as a foil (foils must not appear in the passage read).
 *   - checkReadingPagesValid (table check): only whole numbers ≥ 0 and -1 are
 *     meaningful, and -1 contradicts readingCorpusEndlessBool.
 *
 * @jest-environment node
 */
import Papa from "papaparse";
import { describe, it, expect, beforeAll } from "@jest/globals";
import { loadGlossaryForTests } from "./helpers/glossary";
import { dataframeFromPapaParsed } from "../preprocess/utils";
import {
  checkReadingCorpusLength,
  checkReadingFoils,
} from "../preprocess/experimentFileChecks";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";

beforeAll(async () => {
  await loadGlossaryForTests();
});

/** Build one condition column's rows: "param,,value" per line. */
const condition = (o: Record<string, string>) =>
  Object.entries(o)
    .map(([k, v]) => `${k},,${v}`)
    .join("\n");

const csvOf = (conditionColumns: string[]) => `_about,test
block,1
${conditionColumns.join("\n")}`;

const makeDf = (conditionColumns: string[]) =>
  dataframeFromPapaParsed(
    Papa.parse(csvOf(conditionColumns), { skipEmptyLines: true }),
  );

const makeTable = (conditionColumns: string[]) =>
  new ExperimentTable(
    Papa.parse(csvOf(conditionColumns), { skipEmptyLines: true })
      .data as readonly (readonly string[])[],
  );

// 40 characters of text, well under one 4×57-character page.
const SHORT_STORY = "The quick brown fox jumps over a lazy dog";

describe("checkReadingCorpusLength — readingPages = -1", () => {
  const readingCondition = (pages: string) =>
    condition({
      targetKind: "reading",
      readingCorpus: "story.txt",
      readingPages: pages,
      readingLinesPerPage: "4",
      readingLineLength: "57",
      readingLineLengthUnit: "character",
    });

  it("asks for no minimum length when readingPages is -1", () => {
    const errors = checkReadingCorpusLength(makeDf([readingCondition("-1")]), {
      "story.txt": SHORT_STORY,
    });
    expect(errors).toEqual([]);
  });

  it("accepts even a one-word corpus when readingPages is -1", () => {
    const errors = checkReadingCorpusLength(makeDf([readingCondition("-1")]), {
      "story.txt": "Hello",
    });
    expect(errors).toEqual([]);
  });

  it("still requires (pages − 0.9) × lineLength × linesPerPage characters when pages ≥ 0", () => {
    // 4 pages × 4 lines × 57 characters needs (4 − 0.9) × 228 ≈ 707.
    const errors = checkReadingCorpusLength(makeDf([readingCondition("4")]), {
      "story.txt": SHORT_STORY,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].parameters).toContain("readingPages");
    // The error points the scientist at the new option.
    expect(errors[0].hint).toContain("readingPages=-1");
  });

  it("passes a corpus long enough for the requested pages", () => {
    const errors = checkReadingCorpusLength(makeDf([readingCondition("2")]), {
      "story.txt": "x".repeat(1000),
    });
    expect(errors).toEqual([]);
  });

  it("asks for no minimum when readingPages is 0", () => {
    const errors = checkReadingCorpusLength(makeDf([readingCondition("0")]), {
      "story.txt": SHORT_STORY,
    });
    expect(errors).toEqual([]);
  });
});

describe("checkReadingFoils — readingPages = -1 displays the whole corpus", () => {
  // 8 unique words. With 1 question of 3 answers we need 2 foils, which must
  // not appear in the passage the participant read.
  const CORPUS8 = "alpha beta gamma delta epsilon zeta eta theta";
  const foilCondition = (pages: string) =>
    condition({
      targetKind: "reading",
      readingCorpus: "story.txt",
      readingNumberOfQuestions: "1",
      readingNumberOfPossibleAnswers: "3",
      readingPages: pages,
      readingLinesPerPage: "1",
      readingLineLength: "20",
    });

  it("errors when the whole corpus is read, leaving no word to serve as a foil", () => {
    const errors = checkReadingFoils(makeDf([foilCondition("-1")]), {
      "story.txt": CORPUS8,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].hint).toContain("story.txt");
  });

  it("leaves no spare words even in a long corpus, since -1 reads all of it", () => {
    const spare = Array.from({ length: 20 }, (_, i) => `spare${i}`).join(" ");
    const errors = checkReadingFoils(makeDf([foilCondition("-1")]), {
      "story.txt": `${CORPUS8} ${spare}`,
    });
    expect(errors).toHaveLength(1);
  });

  it("counts only the pages actually shown when readingPages ≥ 0", () => {
    // One 20-character page shows ~4 words, leaving 4 as foils for the 2 needed.
    const errors = checkReadingFoils(makeDf([foilCondition("1")]), {
      "story.txt": CORPUS8,
    });
    expect(errors).toEqual([]);
  });
});

describe("checkReadingPagesValid — which values readingPages accepts", () => {
  const namesOf = (columns: string[]) =>
    validateExperimentTable(makeTable(columns)).map((e) => e.name);

  const readingCondition = (extra: Record<string, string>) =>
    condition({
      targetKind: "reading",
      targetTask: "identify",
      readingCorpus: "story.txt",
      ...extra,
    });

  it("accepts -1", () => {
    expect(namesOf([readingCondition({ readingPages: "-1" })])).not.toContain(
      "Invalid readingPages",
    );
  });

  it("accepts a whole number of pages", () => {
    expect(namesOf([readingCondition({ readingPages: "4" })])).not.toContain(
      "Invalid readingPages",
    );
  });

  it("rejects other negative numbers", () => {
    expect(namesOf([readingCondition({ readingPages: "-2" })])).toContain(
      "Invalid readingPages",
    );
  });

  it("rejects a fraction of a page", () => {
    expect(namesOf([readingCondition({ readingPages: "2.5" })])).toContain(
      "Invalid readingPages",
    );
  });

  it("rejects -1 combined with an endless corpus, which has no end to read to", () => {
    expect(
      namesOf([
        readingCondition({
          readingPages: "-1",
          readingCorpusEndlessBool: "TRUE",
        }),
      ]),
    ).toContain("readingPages=-1 conflicts with readingCorpusEndlessBool");
  });

  it("allows an endless corpus with a specific number of pages", () => {
    expect(
      namesOf([
        readingCondition({
          readingPages: "4",
          readingCorpusEndlessBool: "TRUE",
        }),
      ]),
    ).not.toContain("readingPages=-1 conflicts with readingCorpusEndlessBool");
  });

  it("ignores readingPages for other kinds of target", () => {
    expect(
      namesOf([
        condition({
          targetKind: "rsvpReading",
          readingCorpus: "story.txt",
          readingPages: "-2",
        }),
      ]),
    ).not.toContain("Invalid readingPages");
  });
});
