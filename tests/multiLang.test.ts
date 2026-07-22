// Tests for replacePlaceholders (components/multiLang.js)
// Covers the [[XXX]]/[[N11]] single-arg trial-count replacement
// (notes/TODO-arabic-urdu-persian-bugs.md, Bug 5).
import { replacePlaceholders } from "../components/multiLang";

describe("replacePlaceholders — single-arg (trial count)", () => {
  it("replaces uppercase [[XXX]]", () => {
    expect(replacePlaceholders("block of [[XXX]] trials", 10)).toBe(
      "block of 10 trials",
    );
  });

  it("replaces lowercase [[xxx]]", () => {
    expect(replacePlaceholders("block of [[xxx]] trials", 10)).toBe(
      "block of 10 trials",
    );
  });

  it("replaces uppercase [[N11]]", () => {
    expect(replacePlaceholders("block of [[N11]] trials", 10)).toBe(
      "block of 10 trials",
    );
  });

  it("replaces lowercase [[n11]] (case-insensitive, like [[xxx]])", () => {
    expect(replacePlaceholders("block of [[n11]] trials", 10)).toBe(
      "block of 10 trials",
    );
  });

  it("replaces every occurrence, not just the first", () => {
    expect(replacePlaceholders("[[XXX]] trials, [[XXX]] pages", 10)).toBe(
      "10 trials, 10 pages",
    );
  });
});
