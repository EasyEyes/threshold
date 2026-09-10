/**
 * Unit tests for tilde-token expansion in the raw source export.
 * @jest-environment node
 */
import {
  buildSourceArchiveTokens,
  expandTildeTokens,
  findPhrasesSpreadsheetName,
  isResourceReferenced,
} from "../preprocess/exportBeforeCompile";
import type { PhraseTable } from "../../source/components/parsePhraseFile";

const makePhraseTable = (
  symbols: Record<string, Record<string, string>>,
): PhraseTable => {
  const table: PhraseTable = new Map();
  for (const [symbol, langs] of Object.entries(symbols))
    table.set(symbol, new Map(Object.entries(langs)));
  return table;
};

describe("expandTildeTokens", () => {
  it("adds every language's filename for each tilde key", () => {
    const tokens = new Set(["~readingcorpus1"]);
    expandTildeTokens(
      tokens,
      makePhraseTable({
        readingcorpus1: { en: "corpus-en.txt", ar: "corpus-ar.txt" },
      }),
    );
    expect(tokens).toContain("corpus-en.txt");
    expect(tokens).toContain("corpus-ar.txt");
  });

  it("splits comma-separated resolutions, like collectResourceTokens", () => {
    const tokens = new Set(["~fonts"]);
    expandTildeTokens(
      tokens,
      makePhraseTable({ fonts: { en: "a.woff2, b.woff2" } }),
    );
    expect(tokens).toContain("a.woff2");
    expect(tokens).toContain("b.woff2");
  });

  it("ignores tilde keys absent from the phrase table", () => {
    const tokens = new Set(["~unknown"]);
    expandTildeTokens(tokens, makePhraseTable({}));
    expect(tokens.size).toBe(1);
  });

  it("skips empty language values", () => {
    const tokens = new Set(["~key"]);
    expandTildeTokens(tokens, makePhraseTable({ key: { en: "", ar: " " } }));
    expect(tokens.size).toBe(1);
  });

  it("leaves non-tilde tokens untouched", () => {
    const tokens = new Set(["plain.txt"]);
    expandTildeTokens(tokens, makePhraseTable({ plain: { en: "other.txt" } }));
    expect([...tokens]).toEqual(["plain.txt"]);
  });
});

describe("buildSourceArchiveTokens", () => {
  const rows = [
    ["_about", "study"],
    ["_languagePhrasesSpreadsheet", "test.phrases.xlsx"],
    ["readingCorpus", "", "~readingCorpus1"],
  ];

  it("expands tilde cells so the resolved filenames match resources", () => {
    const tokens = buildSourceArchiveTokens(
      rows,
      makePhraseTable({ readingcorpus1: { en: "corpus-en.txt" } }),
    );
    expect(isResourceReferenced(tokens, "corpus-en.txt")).toBe(true);
    expect(isResourceReferenced(tokens, "test.phrases.xlsx")).toBe(true);
  });

  it("without a phrase table, tilde cells match no resource", () => {
    const tokens = buildSourceArchiveTokens(rows);
    expect(isResourceReferenced(tokens, "corpus-en.txt")).toBe(false);
  });
});

describe("findPhrasesSpreadsheetName", () => {
  it("reads column B of the _languagePhrasesSpreadsheet row", () => {
    expect(
      findPhrasesSpreadsheetName([
        ["_about", "study"],
        ["_languagePhrasesSpreadsheet", "test.phrases.xlsx"],
      ]),
    ).toBe("test.phrases.xlsx");
  });

  it("returns undefined when unset or empty", () => {
    expect(findPhrasesSpreadsheetName([["_about", "study"]])).toBeUndefined();
    expect(
      findPhrasesSpreadsheetName([["_languagePhrasesSpreadsheet", ""]]),
    ).toBeUndefined();
  });
});

describe("adversarial: case handling", () => {
  it("lowercases comma-split pieces, like collectResourceTokens does", () => {
    const tokens = new Set(["~fonts"]);
    expandTildeTokens(
      tokens,
      makePhraseTable({ fonts: { en: "Sloan.woff2, Noto.ttf" } }),
    );
    expect(isResourceReferenced(tokens, "Sloan.woff2")).toBe(true);
    expect(isResourceReferenced(tokens, "Noto.ttf")).toBe(true);
  });
});
