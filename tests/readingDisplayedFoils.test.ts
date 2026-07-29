/**
 * Reading foils must never be words that were displayed in the passage.
 *
 * RED tests for the `displayedCanonicalWords` bug in components/reading.ts:
 * `Set.add(array)` added the whole word ARRAY as one Set element, so
 * `.has(word)` was always false and displayed words were eligible foils —
 * violating the glossary spec that foils "were not in that passage".
 *
 * The probe harness mirrors the runtime call in threshold.js
 * (blockSchedulerFinalRoutineBegin): freqToWords is built from the WHOLE
 * corpus, while textPages is only the displayed pages.
 *
 * @jest-environment node
 */
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

jest.mock("../components/errorHandling", () => ({
  warning: jest.fn(),
}));
const mockPastFoils = new Set<string>();
const mockPastTargets = new Set<string>();
jest.mock("../components/global", () => ({
  readingCorpusFoilsArchive: new Map(),
  readingCorpusPastFoils: mockPastFoils,
  readingCorpusPastTargets: mockPastTargets,
}));
jest.mock("../components/utils", () => ({
  logger: jest.fn(),
  sampleWithoutReplacement: (arr: any[], n: number) => arr.slice(0, n),
  sampleWithReplacement: (arr: any[], n: number) => arr.slice(0, n),
}));

import { prepareReadingQuestions } from "../components/reading";

// Displayed pages: first/last pages are fillers; the middle page carries the
// "passage" words. All displayed words must be ineligible as foils.
const PAGES = ["zz yy", "alpha beta gamma", "xx ww"];
const DISPLAYED = new Set(["zz", "yy", "alpha", "beta", "gamma", "xx", "ww"]);

const freqToWordsFrom = (words: string[]) => ({ 1: words });

beforeEach(() => {
  mockPastFoils.clear();
  mockPastTargets.clear();
});

describe("prepareReadingQuestions — displayed words are not foils", () => {
  it("throws [not enough foils] when every corpus word was displayed", () => {
    // All 3 corpus words are displayed; the correct answer consumes one, so
    // zero foil-eligible words remain. Must throw, not serve a displayed word.
    expect(() =>
      prepareReadingQuestions(
        1,
        2,
        PAGES,
        freqToWordsFrom(["alpha", "beta", "gamma"]),
        "mouse",
        "reading",
      ),
    ).toThrow(/not enough foils/);
  });

  it("never offers a displayed word as a foil (40 samples)", () => {
    // Supply: delta/epsilon (not displayed). alpha/beta/gamma are displayed.
    for (let trial = 0; trial < 40; trial++) {
      const questions = prepareReadingQuestions(
        1,
        2,
        PAGES,
        freqToWordsFrom(["alpha", "beta", "gamma", "delta", "epsilon"]),
        "mouse",
        "reading",
      );
      expect(questions).toHaveLength(1);
      for (const foil of questions[0].foils) {
        expect(DISPLAYED.has(foil.toLowerCase())).toBe(false);
      }
    }
  });

  it("does not throw when the foil is found in the walk's edge bucket", () => {
    // RED for the freqToTest walk bug: the foil quota is filled in bucket 1
    // (the walk's downward edge), then the walk falls off the bucket range
    // and the exhausted-walk throw fires DESPITE the quota being met.
    // Answers come from the displayed page (bucket 100); all other bucket-100
    // words are displayed, so the only foil candidates live in bucket 1.
    const questions = prepareReadingQuestions(
      1,
      2,
      PAGES,
      { 1: ["delta", "epsilon"], 100: ["alpha", "beta", "gamma"] },
      "mouse",
      "reading",
    );
    expect(questions).toHaveLength(1);
    expect(questions[0].foils).toHaveLength(1);
    expect(["delta", "epsilon"]).toContain(questions[0].foils[0]);
  });

  it("still constructs questions normally when foils are ample", () => {
    // GREEN preservation: structural contract unchanged by the fix.
    const questions = prepareReadingQuestions(
      2,
      3,
      PAGES,
      freqToWordsFrom([
        "alpha",
        "beta",
        "gamma",
        "delta",
        "epsilon",
        "zeta",
        "eta",
        "theta",
      ]),
      "mouse",
      "reading",
    );
    expect(questions).toHaveLength(2);
    const answers = questions.map((q) => q.correctAnswer.toLowerCase());
    // Correct answers come from the displayed (middle) page and are distinct.
    for (const a of answers) expect(["alpha", "beta", "gamma"]).toContain(a);
    expect(new Set(answers).size).toBe(2);
    const allFoils = questions.flatMap((q) => q.foils);
    expect(allFoils).toHaveLength(4); // 2 questions × (3 answers − 1)
    for (const q of questions) {
      expect(q.foils).toHaveLength(2);
      expect(q.foils.map((f) => f.toLowerCase())).not.toContain(
        q.correctAnswer.toLowerCase(),
      );
    }
  });
});
