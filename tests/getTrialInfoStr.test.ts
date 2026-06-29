/**
 * GREEN regression tests for getTrialInfoStr (components/trialCounter.js).
 *
 * Written BEFORE the Bug B call-site change (passing totalTrialsThisBlock.current
 * instead of the question count as the Q&A counter denominator)
 * to lock in getTrialInfoStr's current, correct behavior: it faithfully renders
 * WHATEVER (currentTrialIndex, currentTrialLength) it is given.
 *
 * The Bug B fix is a call-site change in threshold.js (not unit-testable); this
 * suite guarantees the unit we feed those args into behaves as expected.
 *
 * Importing trialCounter.js pulls global.js -> phrases-loader (top-level await +
 * fetch), so we mock the readPhrases/multiLang deps and the phrases-loader
 * network import. We DON'T exercise the showViewingDistanceBool branch, so the
 * Screens/rc/viewingDistanceCm deps are left undefined (untouched).
 */

// Track readi18nPhrases calls so we can assert which template is selected.
const phraseStore: Record<string, string> = {
  // Real replacePlaceholders (multiLang.js) substitutes [[N11]]..[[N44]]
  // (doubled digit = (index+1) repeated twice).
  T_counterTrialBlock: "Trial [[N11]] of [[N22]]. Block [[N33]] of [[N44]].",
  T_counterReadingPageBlock:
    "Page [[N11]] of [[N22]]. Block [[N33]] of [[N44]].",
  T_counterBlock: "Block [[N11]] of [[N22]].",
};

describe("getTrialInfoStr (GREEN regression)", () => {
  beforeEach(() => {
    jest.resetModules();
    // phrases-loader / global.js do top-level await + fetch at import; the
    // showViewingDistanceBool branch (which we don't test) is the only place
    // getTrialInfoStr touches rc/status/viewingDistanceCm/Screens, so stub them.
    jest.doMock("../components/global.js", () => ({
      __esModule: true,
      rc: {},
      status: {},
      viewingDistanceCm: { current: undefined, desired: undefined },
    }));
    jest.doMock("../components/multiple-displays/globals.ts", () => ({
      __esModule: true,
      Screens: [],
    }));
    jest.doMock("../preprocess/phrases-loader", () => ({
      __esModule: true,
      phrasesData: { version: "test", phrases: {} },
    }));
    jest.doMock("../components/readPhrases", () => ({
      __esModule: true,
      readi18nPhrases: (name: string) => phraseStore[name] ?? "",
    }));
    // multiLang.replacePlaceholders is pure (no heavy deps) — use the REAL one.
  });

  it("renders 'Trial X of Y' from the passed (index, length) args", async () => {
    const { getTrialInfoStr } = await import("../components/trialCounter");
    const out = getTrialInfoStr(
      "en-US",
      true, // showCounterBool
      false, // showViewingDistanceBool
      3, // currentTrialIndex
      10, // currentTrialLength  <- this is the denominator Bug B concerns
      2, // currentBlockIndex
      4, // blockCount
      undefined, // viewingDistanceCm
      "letter", // taskKind
    );
    expect(out).toContain("Trial 3 of 10");
    expect(out).toContain("Block 2 of 4");
  });

  it("uses the reading template when taskKind === 'reading'", async () => {
    const { getTrialInfoStr } = await import("../components/trialCounter");
    const out = getTrialInfoStr(
      "en-US",
      true,
      false,
      1,
      5,
      1,
      1,
      undefined,
      "reading",
    );
    expect(out).toContain("Page 1 of 5");
  });

  it("returns '' when showCounterBool is false", async () => {
    const { getTrialInfoStr } = await import("../components/trialCounter");
    const out = getTrialInfoStr(
      "en-US",
      false, // showCounterBool
      false,
      1,
      1,
      1,
      1,
      undefined,
      "letter",
    );
    expect(out).toBe("");
  });

  it("renders a length of 1 honestly (the image+QA 'Trial 1 of 1' case)", async () => {
    // Documents WHY Bug B is a call-site issue, not a getTrialInfoStr issue:
    // if the caller passes 1 as the denominator, the unit correctly prints
    // "of 1". The caller must pass the right denominator (totalTrialsThisBlock).
    const { getTrialInfoStr } = await import("../components/trialCounter");
    const out = getTrialInfoStr(
      "en-US",
      true,
      false,
      1,
      1, // denominator the caller hands in
      1,
      1,
      undefined,
      "image",
    );
    expect(out).toContain("Trial 1 of 1");
  });
});
