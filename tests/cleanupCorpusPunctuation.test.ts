/**
 * Tests for cleanupCorpusPunctuation, which implements the
 * readingCorpusCleanupPunctuation parameter: for each character in the
 * parameter value, in order, globally remove a space preceding that character.
 *
 * @jest-environment node
 */

import { cleanupCorpusPunctuation } from "../components/cleanupCorpusPunctuation";

describe("cleanupCorpusPunctuation", () => {
  it("is a no-op when the parameter is empty (the default)", () => {
    expect(cleanupCorpusPunctuation("Hello , world .", "")).toBe(
      "Hello , world .",
    );
  });

  it("removes the space before every occurrence of a given character", () => {
    expect(cleanupCorpusPunctuation("a , b , c", ",")).toBe("a, b, c");
  });

  it("processes each character of the value string in order", () => {
    expect(cleanupCorpusPunctuation("One , two . Three !", ",.!")).toBe(
      "One, two. Three!",
    );
  });

  it("removes only one space per pass; repeating a character adds passes", () => {
    expect(cleanupCorpusPunctuation("word  ,", ",")).toBe("word ,");
    expect(cleanupCorpusPunctuation("word  ,", ",,")).toBe("word,");
  });

  it("handles regex special characters literally", () => {
    expect(cleanupCorpusPunctuation("End .", ".")).toBe("End.");
    expect(cleanupCorpusPunctuation("Why ?", "?")).toBe("Why?");
    expect(cleanupCorpusPunctuation("( wow )", ")")).toBe("( wow)");
  });

  it("supports Arabic-script punctuation", () => {
    // Arabic comma ، (U+060C), Arabic question mark ؟ (U+061F),
    // Urdu full stop ۔ (U+06D4)
    expect(cleanupCorpusPunctuation("سلام ، دنیا ؟", "،؟")).toBe("سلام، دنیا؟");
    expect(cleanupCorpusPunctuation("جملہ ۔", "۔")).toBe("جملہ۔");
  });

  it("supports non-BMP (surrogate-pair) characters as single characters", () => {
    // 𝄞 (U+1D11E) is outside the BMP and encoded as a surrogate pair.
    expect(cleanupCorpusPunctuation("note 𝄞 end", "𝄞")).toBe("note𝄞 end");
  });

  it("leaves already-correct text unchanged", () => {
    expect(cleanupCorpusPunctuation("Hello, world.", ",.")).toBe(
      "Hello, world.",
    );
  });
});
