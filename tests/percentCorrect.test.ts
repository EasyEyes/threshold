/**
 * Spec (glossary, showPercentCorrectBool): if showPercentCorrectBool is TRUE
 * for ANY condition in this block, then at the end of the block EasyEyes
 * shows a popup reporting the overall percent correct ACROSS ALL CONDITIONS
 * FOR WHICH showPercentCorrectBool IS TRUE in that block.
 *
 * Corollary (bug card Dec 2024): never show the popup (or NaN%) when no
 * trials were completed in the flagged conditions.
 */
import { getBlockPercentCorrect } from "../components/percentCorrect";

describe("getBlockPercentCorrect", () => {
  const BC = ["1_1", "1_2", "1_3"];

  it("returns null when no condition in the block has the flag TRUE", () => {
    expect(
      getBlockPercentCorrect(
        () => false,
        BC,
        () => 3,
        () => 4,
      ),
    ).toBeNull();
  });

  it("returns null when flagged conditions have zero completed trials (no NaN%)", () => {
    expect(
      getBlockPercentCorrect(
        () => true,
        BC,
        () => 0,
        () => 0,
      ),
    ).toBeNull();
  });

  it("aggregates correct/completed across flagged conditions only", () => {
    // 1_1 flagged: 3/4; 1_2 NOT flagged: 0/10 (must be excluded);
    // 1_3 flagged: 1/4. Overall = 4/8 = 50%.
    expect(
      getBlockPercentCorrect(
        (bc) => bc !== "1_2",
        BC,
        (bc) => ({ "1_1": 3, "1_2": 0, "1_3": 1 })[bc]!,
        (bc) => ({ "1_1": 4, "1_2": 10, "1_3": 4 })[bc]!,
      ),
    ).toBe(50);
  });

  it("shows (non-null) when ANY one condition is flagged and has completions", () => {
    expect(
      getBlockPercentCorrect(
        (bc) => bc === "1_3",
        BC,
        (bc) => (bc === "1_3" ? 2 : 100),
        (bc) => (bc === "1_3" ? 4 : 100),
      ),
    ).toBe(50);
  });

  it("ignores completions in unflagged conditions when deciding to show", () => {
    // Flagged condition has 0 completed; unflagged has many → still null.
    expect(
      getBlockPercentCorrect(
        (bc) => bc === "1_1",
        BC,
        () => 5,
        (bc) => (bc === "1_1" ? 0 : 10),
      ),
    ).toBeNull();
  });

  it("rounds to the nearest integer percent", () => {
    expect(
      getBlockPercentCorrect(
        () => true,
        ["1_1"],
        () => 1,
        () => 3,
      ),
    ).toBe(33);
  });

  // Adversarial: the popup must NEVER print "NaN%", no matter what the
  // counter lookups yield (stale/missing map entries, bad wiring).
  it("returns null if a correct-count lookup yields NaN", () => {
    expect(
      getBlockPercentCorrect(
        () => true,
        ["1_1"],
        () => Number.NaN,
        () => 4,
      ),
    ).toBeNull();
  });

  it("returns null if a completed-count lookup yields NaN", () => {
    expect(
      getBlockPercentCorrect(
        () => true,
        ["1_1"],
        () => 3,
        () => Number.NaN,
      ),
    ).toBeNull();
  });

  it("returns null if a lookup yields undefined (missing map entry)", () => {
    expect(
      getBlockPercentCorrect(
        () => true,
        ["1_1"],
        () => undefined as unknown as number,
        () => 4,
      ),
    ).toBeNull();
    expect(
      getBlockPercentCorrect(
        () => true,
        ["1_1"],
        () => 3,
        () => undefined as unknown as number,
      ),
    ).toBeNull();
  });
});
