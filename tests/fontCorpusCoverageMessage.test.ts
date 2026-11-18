/**
 * FONT_READING_CORPUS_CHARACTERS_MISSING wording.
 *
 * The scientist reading this error may not know which parameters are
 * involved, so parameter names must appear as their exact table spelling
 * (readingCorpus, fontTolerateFaults), never as prose ("reading corpus"),
 * and the fix instructions must name each remedy exactly once.
 */

import { FONT_READING_CORPUS_CHARACTERS_MISSING } from "../preprocess/errorMessages";
import { diagnosticValue } from "../preprocess/diagnosticHtml";

const error = (offendingConditions: number[]) =>
  FONT_READING_CORPUS_CHARACTERS_MISSING(
    "SomeFont.ttf",
    "corpus.txt",
    "你好",
    3,
    offendingConditions,
  );

describe("message", () => {
  it("states font, count, corpus, and a sample", () => {
    expect(error([2]).message).toBe(
      `The font ${diagnosticValue(
        "SomeFont.ttf",
      )} is missing 3 characters required by <span class="error-parameter">readingCorpus</span> ${diagnosticValue(
        "corpus.txt",
      )} (for example: ${diagnosticValue("你好")}).`,
    );
  });

  it("singularizes one character", () => {
    expect(
      FONT_READING_CORPUS_CHARACTERS_MISSING("F", "c", "x", 1, [0]).message,
    ).toBe(
      `The font ${diagnosticValue(
        "F",
      )} is missing 1 character required by <span class="error-parameter">readingCorpus</span> ${diagnosticValue(
        "c",
      )} (for example: ${diagnosticValue("x")}).`,
    );
  });
});

describe("name", () => {
  it("uses the parameter spelling readingCorpus", () => {
    expect(error([0]).name).toBe("Font missing readingCorpus characters");
  });
});

describe("hint", () => {
  it("offers each remedy exactly once: better font, or trim the corpus", () => {
    expect(error([0]).hint).toContain(
      `Fix this either by choosing a font that supports every character in <span class="error-parameter">readingCorpus</span>, or by removing unsupported characters from <span class="error-parameter">readingCorpus</span>.`,
    );
  });

  it("documents the tolerate escape hatch with the empty-box consequence", () => {
    expect(error([0]).hint).toContain(
      `To use the font despite missing characters, add ${diagnosticValue(
        "missingCharacters",
      )} to <span class="error-parameter">fontTolerateFaults</span> for the affected condition. Unsupported characters may appear as empty boxes, e.g. □.`,
    );
  });

  it("pluralizes condition for several offending columns", () => {
    expect(error([0, 1]).hint).toContain(
      `<span class="error-parameter">fontTolerateFaults</span> for the affected conditions.`,
    );
  });

  it("keeps pointing at the offending columns", () => {
    expect(error([0]).hint).toContain("Check column C. ");
    expect(error([0, 1]).hint).toContain("Check columns C and D. ");
  });
});

describe("no prose spelling of parameter names", () => {
  it.each(["name", "message", "hint"] as const)(
    "%s never says 'reading corpus'",
    (field) => {
      expect(error([0, 1])[field]).not.toMatch(/reading corpus/i);
    },
  );
});

describe("relevant parameters row", () => {
  it("lists font, readingCorpus, fontTolerateFaults", () => {
    expect(error([0]).parameters).toEqual([
      "font",
      "readingCorpus",
      "fontTolerateFaults",
    ]);
  });
});
