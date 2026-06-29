/**
 * RED tests for paramReader.readMatching — Bug A (root cause).
 *
 * `readMatching` filtered glossary keys by reusing a caller-supplied `/g`-flagged
 * regex across `Array.filter`'s `.test()` calls. A `/g` regex is STATEFUL
 * (`lastIndex` advances after each successful match), so reusing one object
 * across many `.test(str)` calls silently skips ~half the matches.
 *
 * This is the root cause of `getNumberOfQuestionsInThisCondition` undercounting
 * questions, which makes showCounterBool display "Trial 1 of 1" (or similar
 * wrong denominators) on questionAndAnswer pages.
 *
 * Desired behavior: regardless of whether the caller passes a `/g`-flagged regex,
 * `readMatching` must return ALL glossary params whose name matches the pattern.
 */

// Minimal glossary fixture. Key insertion order is preserved by JS objects, and
// the /g bug depends on consecutive matching keys, so this order matters.
const qaEntry = (name: string) => ({
  name,
  availability: "now",
  type: "text",
  default: "",
  explanation: "",
  example: "",
  categories: [],
});

const fixture = {
  version: "test",
  glossary: {
    questionAndAnswer01: qaEntry("questionAndAnswer01"),
    questionAndAnswer02: qaEntry("questionAndAnswer02"),
    questionAndAnswer03: qaEntry("questionAndAnswer03"),
    questionAnswer01: qaEntry("questionAnswer01"),
    // non-matching noise to ensure the filter is selective
    showCounterBool: qaEntry("showCounterBool"),
  },
  glossaryFull: [],
  superMatchingParams: [],
};

describe("ParamReader.readMatching — /g regex statefulness (Bug A)", () => {
  beforeEach(() => {
    jest.resetModules();
    // Papa.parse does file I/O; no-op it like paramReader.test.ts does.
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: { parse: () => {} },
    }));
  });

  const buildReader = async () => {
    const { initGlossary } = await import("../parameters/glossaryRegistry");
    const { ParamReader } = await import("../parameters/paramReader");
    initGlossary(fixture as any);
    const reader = new ParamReader("conditions");
    // Bypass file I/O; inject conditions directly (mirrors _loadFile output).
    (reader as any)._experiment = [
      {
        block_condition: "1_1",
        questionAndAnswer01: "CHOICE|q1|a|b",
        questionAndAnswer02: "TEXT|q2",
        questionAndAnswer03: "YESNO|q3|Yes|No",
        questionAnswer01: "CHOICE|q4|c|d",
        showCounterBool: true,
      },
    ];
    return reader;
  };

  it("returns ALL matching params when the regex is /g-flagged", async () => {
    const reader = await buildReader();
    // This is EXACTLY how questionAndAnswer.ts calls it.
    const re = /(questionAndAnswer|questionAnswer)(\d*|\@\@)$/g;
    const result = reader.readMatching(re, "1_1");

    const matchedKeys = [...result.keys()].sort();
    expect(matchedKeys).toEqual(
      [
        "questionAndAnswer01",
        "questionAndAnswer02",
        "questionAndAnswer03",
        "questionAnswer01",
      ].sort(),
    );
  });

  it("returns ALL matching params when the regex is NOT /g-flagged (control)", async () => {
    const reader = await buildReader();
    const re = /(questionAndAnswer|questionAnswer)(\d*|\@\@)$/;
    const result = reader.readMatching(re, "1_1");

    const matchedKeys = [...result.keys()].sort();
    expect(matchedKeys).toEqual(
      [
        "questionAndAnswer01",
        "questionAndAnswer02",
        "questionAndAnswer03",
        "questionAnswer01",
      ].sort(),
    );
  });

  it("returns the correct VALUE for each matched param, including the /g-skipped one", async () => {
    const reader = await buildReader();
    const re = /(questionAndAnswer|questionAnswer)(\d*|\@\@)$/g;
    const result = reader.readMatching(re, "1_1");

    // questionAndAnswer02 is the one the /g bug skips.
    expect(result.get("questionAndAnswer02")).toBe("TEXT|q2");
  });
});
