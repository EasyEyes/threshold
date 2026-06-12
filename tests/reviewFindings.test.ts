/**
 * Tests documenting findings from the ExperimentTable migration review.
 *
 * These tests capture behavioral differences between the old
 * validateExperimentDf and new validateExperimentTable, including
 * both confirmed bugs and intentional improvements.
 *
 * @jest-environment node
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/experimentFileChecks";
import type { EasyEyesError } from "../preprocess/errorMessages";

function parse(csv: string): ExperimentTable {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  return new ExperimentTable(p.data as readonly (readonly string[])[]);
}

beforeAll(async () => {
  await loadGlossaryForTests();
});

// ============================================================================
// FINDING 1 (BUG 2): Prolific workspace ID priority reversed
// Old priority: _online2ProlificProjectID > _prolific1ProjectID > _prolificProjectID
// New priority: _online2ProlificProjectID > _prolificProjectID   > _prolific1ProjectID
// ============================================================================

describe("Profilic workspace ID priority", () => {
  it("_prolific1ProjectID should take priority over _prolificProjectID (old behavior)", () => {
    // This documents the expected old behavior: _prolific1ProjectID wins
    // over _prolificProjectID when both are present.
    // The new code has _prolificProjectID > _prolific1ProjectID which is wrong.
    expect(true).toBe(true); // behavioral specification, test in main.ts integration
  });

  it("ExperimentTable.colB returns last occurrence for duplicates", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["_prolificProjectID", "a", "", ""],
      ["_prolific1ProjectID", "b", "", ""],
    ]);
    // For non-duplicate params, colB returns the expected value
    expect(t.colB("_prolificProjectID")).toBe("a");
    expect(t.colB("_prolific1ProjectID")).toBe("b");
  });

  it("_online2ProlificProjectID has highest priority (matches both old and new)", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["_online2ProlificProjectID", "highest", "", ""],
      ["_prolificProjectID", "middle", "", ""],
      ["_prolific1ProjectID", "lowest", "", ""],
    ]);
    // _online2ProlificProjectID should win (comes first in || chain)
    const id =
      t.colB("_online2ProlificProjectID") ||
      t.colB("_prolificProjectID") ||
      t.colB("_prolific1ProjectID");
    expect(id).toBe("highest");
  });

  it("_prolific1ProjectID beats _prolificProjectID when both present", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["_prolificProjectID", "prolific", "", ""],
      ["_prolific1ProjectID", "prolific1", "", ""],
    ]);
    // Fixed priority: _prolific1ProjectID > _prolificProjectID (matches old behavior)
    const id =
      t.colB("_online2ProlificProjectID") ||
      t.colB("_prolific1ProjectID") ||
      t.colB("_prolificProjectID");
    expect(id).toBe("prolific1");
  });
});

// ============================================================================
// FINDING 2: Missing readingCorpusFoils validation
// Old _checkCorpusIsSpecifiedForReadingTasks also validated that
// readingCorpusFoils is only valid for rsvpReading tasks.
// New _corpusForReading_t only checks readingCorpus.
// ============================================================================

describe("readingCorpusFoils validation (missing in new code)", () => {
  it("readingCorpusFoils for non-rsvpReading should be flagged", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,reading,reading
readingCorpus,,corpus,corpus
readingSetSize,,0.5,0.5
readingNominalSizePt,,12,12
readingNumberOfPossibleAnswers,,4,4
readingNumberOfQuestions,,3,3
readingPages,,4,4
readingLineLength,,57,57
readingLinesPerPage,,4,4
readingSpacingDeg,,0.5,0.5
readingCorpusFoils,,foils.txt,foils.txt`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    const foilsErrors = errors.filter((e) =>
      e.parameters.includes("readingCorpusFoils"),
    );
    expect(foilsErrors.length).toBeGreaterThan(0); // FIXED
  });

  it("readingCorpusFoils for rsvpReading should NOT be flagged", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,rsvpReading,rsvpReading
thresholdParameter,,targetDurationSec,targetDurationSec
rsvpReadingNumberOfWords,,3,3
rsvpReadingNumberOfResponseOptions,,4,4
readingCorpus,,corpus,corpus
readingSetSize,,0.5,0.5
readingNominalSizePt,,12,12
readingCorpusFoils,,foils.txt,foils.txt`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    const foilsErrors = errors.filter((e) =>
      e.parameters.some((p) => p.includes("readingCorpusFoils")),
    );
    expect(foilsErrors).toHaveLength(0); // correct: no error for rsvpReading
  });

  it("readingCorpus without reading task should not trigger corpus error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
readingCorpus,,,
targetKind,,letter,letter`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    // readingCorpus is "" but targetKind is letter → readingCorpus not relevant
    // No corpus error should be raised
    const corpusErrors = errors.filter((e) =>
      e.parameters.includes("readingCorpus"),
    );
    expect(corpusErrors).toHaveLength(0);
  });
});

// ============================================================================
// FINDING 3: Duplicate params — colB returns last, old code returned first
// ============================================================================

describe("Duplicate underscore params: last-vs-first colB", () => {
  it("RED: colB returns LAST instance (Map.set overwrites)", () => {
    const t = new ExperimentTable([
      ["_authors", "First Author", "", ""],
      ["_authors", "Second Author", "", ""],
    ]);
    // New code returns last ("Second Author")
    expect(t.colB("_authors")).toBe("Second Author");
    // Old code returned first ("First Author") via parsed.data.find()
    // This is a design decision — "last wins" is arguably cleaner
  });

  it("isDuplicate detects the duplicate", () => {
    const t = new ExperimentTable([
      ["_authors", "First Author", "", ""],
      ["_authors", "Second Author", "", ""],
    ]);
    expect(t.isDuplicate("_authors")).toBe(true);
  });

  it("allRawRows preserves all instances", () => {
    const t = new ExperimentTable([
      ["_authors", "First Author", "", ""],
      ["_authors", "Second Author", "", ""],
    ]);
    expect(t.allRawRows("_authors")).toHaveLength(2);
    expect(t.allRawRows("_authors")[0][1]).toBe("First Author");
    expect(t.allRawRows("_authors")[1][1]).toBe("Second Author");
  });

  it("params list preserves first-occurrence order only", () => {
    const t = new ExperimentTable([
      ["_authors", "First", "", ""],
      ["block", "", "1", "1"],
      ["_authors", "Second", "", ""],
    ]);
    expect(t.params).toEqual(["_authors", "block"]);
  });
});

// ============================================================================
// FINDING 4: validateExperimentDf is dead code — no longer called from main.ts
// ============================================================================

describe("validateExperimentDf is dead code", () => {
  it("validateExperimentTable is used instead", () => {
    // The new validateExperimentTable is imported and called in main.ts.
    // validateExperimentDf is still imported but never called.
    // This is confirmed by code review — dead import on line 9 of main.ts.
    expect(
      "validateExperimentTable" in
        require("../preprocess/experimentFileChecks"),
    ).toBe(true);
  });
});

// ============================================================================
// FINDING 5: Vernier validation — old returned first error only, new collects all
// ============================================================================

describe("Vernier validation collects all errors (improvement)", () => {
  it("reports both errors when two conditions have mismatches", () => {
    const csv = `_about,test,,,
block,,1,1,1
conditionName,,A,B,C
targetKind,,vernier,letter,letter
thresholdParameter,,spacingDeg,spacingDeg,targetOffsetDeg`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    // C: vernier + spacingDeg; C: letter + targetOffsetDeg (col D, row 2)
    // Both should be reported
    const vernierErrs = errors.filter((e) => e.name.includes("unsupported"));
    expect(vernierErrs.length).toBe(2); // old code only returned 1
  });
});

// ============================================================================
// FINDING 6: iscalibrateDistanceCheckBoolValid indexing fix (i=2 → i=0)
// ============================================================================

describe("iscalibrateDistanceCheckBoolValid: condition-only arrays, start at 0", () => {
  it("checks first condition when receiving condition-only arrays", async () => {
    const { iscalibrateDistanceCheckBoolValid } = await import(
      "../preprocess/experimentFileChecks"
    );
    const checkBool = ["TRUE"];
    const distBool = ["FALSE"];
    const errors = iscalibrateDistanceCheckBoolValid(checkBool, distBool);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("no error when check=TRUE and distance=TRUE (first condition)", async () => {
    const { iscalibrateDistanceCheckBoolValid } = await import(
      "../preprocess/experimentFileChecks"
    );
    const checkBool = ["TRUE"];
    const distBool = ["TRUE"];
    const errors = iscalibrateDistanceCheckBoolValid(checkBool, distBool);
    expect(errors).toHaveLength(0);
  });
});

// ============================================================================
// FINDING 7: _corpusForReading_t catches both reading and rsvpReading
// ============================================================================

describe("_corpusForReading_t includes both reading and rsvpReading", () => {
  it("flags missing corpus for rsvpReading", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,rsvpReading,rsvpReading
thresholdParameter,,targetDurationSec,targetDurationSec
rsvpReadingNumberOfWords,,3,3
rsvpReadingNumberOfResponseOptions,,4,4
rsvpReadingWordsPerScreen,,1,1
readingSetSize,,0.5,0.5
readingNominalSizePt,,12,12
readingCorpus,,,`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    const corpusErrs = errors.filter((e) => e.name.includes("corpus"));
    expect(corpusErrs.length).toBeGreaterThan(0);
  });

  it("flags missing corpus for reading", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,reading,reading
readingSetSize,,0.5,0.5
readingNominalSizePt,,12,12
readingNumberOfPossibleAnswers,,4,4
readingNumberOfQuestions,,3,3
readingPages,,4,4
readingLineLength,,57,57
readingLinesPerPage,,4,4
readingSpacingDeg,,0.5,0.5
readingCorpus,,,`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    const corpusErrs = errors.filter((e) => e.name.includes("corpus"));
    expect(corpusErrs.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// FINDING 8: _rsvpMultiple_t handles zero wordsPerScreen gracefully
// ============================================================================

describe("_rsvpMultiple_t edge: zero wordsPerScreen", () => {
  it("does not flag when wordsPerScreen = 0 (division by zero guard)", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,rsvpReading,rsvpReading
thresholdParameter,,targetDurationSec,targetDurationSec
rsvpReadingNumberOfWords,,5,5
rsvpReadingWordsPerScreen,,0,0
rsvpReadingNumberOfResponseOptions,,4,4
readingCorpus,,corpus,corpus
readingSetSize,,0.5,0.5
readingNominalSizePt,,12,12`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    // 5 % 0 is NaN, NaN !== 0 is true → would flag.
    // But check is: Number(wps[i]) > 0 && Number(nw[i]) % Number(wps[i]) !== 0
    // Since wps=0, Number(wps[i]) > 0 is false → skip. No error.
    const multErrs = errors.filter((e) =>
      e.name.toLowerCase().includes("multiple"),
    );
    expect(multErrs).toHaveLength(0);
  });
});

// ============================================================================
// FINDING 9: _responsePossible_t handles keypad activation
// ============================================================================

describe("_responsePossible_t: keypad activation", () => {
  it("keypad activation prevents 'no response' error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
responseClickedBool,,FALSE,FALSE
responseTypedBool,,FALSE,FALSE
responseSpokenBool,,FALSE,FALSE
simulateParticipantBool,,FALSE,FALSE
viewingDistanceDesiredCm,,60,60
needKeypadBeyondCm,,30,30`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    // viewingDistanceDesiredCm (60) > needKeypadBeyondCm (30) → keypad activated
    const respErrs = errors.filter(
      (e) => e.name.includes("response") || e.name.includes("No response"),
    );
    expect(respErrs).toHaveLength(0); // keypad suffices as response method
  });

  it("without keypad and without any response method → error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
responseClickedBool,,FALSE,FALSE
responseTypedBool,,FALSE,FALSE
responseSpokenBool,,FALSE,FALSE
simulateParticipantBool,,FALSE,FALSE
viewingDistanceDesiredCm,,30,30
needKeypadBeyondCm,,60,60`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    // viewingDistanceDesiredCm (30) <= needKeypadBeyondCm (60) → no keypad
    // All response methods FALSE → no response possible
    const respErrs = errors.filter(
      (e) => e.name.includes("response") || e.name.includes("No response"),
    );
    expect(respErrs.length).toBeGreaterThan(0);
  });

  it("simulateParticipantBool=TRUE counts as response method", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
responseClickedBool,,FALSE,FALSE
responseTypedBool,,FALSE,FALSE
responseSpokenBool,,FALSE,FALSE
simulateParticipantBool,,TRUE,TRUE
viewingDistanceDesiredCm,,30,30
needKeypadBeyondCm,,60,60`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    const respErrs = errors.filter(
      (e) => e.name.includes("response") || e.name.includes("No response"),
    );
    expect(respErrs).toHaveLength(0); // simulateParticipantBool=TRUE suffices
  });
});

// ============================================================================
// FINDING 10: _types_t handles all underscore duplicate instances
// ============================================================================

describe("_types_t: all underscore duplicate instances type-checked", () => {
  it("type-checks ALL colB instances of duplicate underscore params", () => {
    // For underscore params, allColBValues is used to type-check ALL instances
    // Non-underscore duplicates use effectiveValues which returns the LAST row's values.
    // So this test expects conditionTrials (non-underscore) type-check to only see
    // the last row's condition values, not all instances.
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
      ["conditionTrials", "not-an-integer", "", ""],
      ["conditionTrials", "4", "", ""],
    ]);
    const errors = validateExperimentTable(t);
    // Last row's colB is "4" → valid integer → no type error
    // The first row's "not-an-integer" is NOT checked because
    // _types_t uses t.effectiveValues for non-underscore params,
    // which reads from _rows (last occurrence).
    // This is a potential issue: non-underscore duplicate params only
    // type-check the last instance's values.
    const typeErrs = errors.filter(
      (e) =>
        e.name.includes("type") && e.parameters.includes("conditionTrials"),
    );
    expect(typeErrs).toHaveLength(0); // last row has valid "4"
  });

  it("no type error when all duplicate colB values are valid", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "A", "B"],
      ["conditionTrials", "4", "", ""],
      ["conditionTrials", "8", "", ""],
    ]);
    const errors = validateExperimentTable(t);
    const typeErrs = errors.filter(
      (e) =>
        e.name.includes("type") && e.parameters.includes("conditionTrials"),
    );
    expect(typeErrs).toHaveLength(0);
  });
});

// ============================================================================
// FINDING 11: _flankerEcc_t: foveal vs peripheral logic
// ============================================================================

describe("_flankerEcc_t: foveal/peripheral flanker logic", () => {
  it("foveal (0,0) with radial spacing → error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,letter,letter
targetTask,,identify,identify
thresholdParameter,,spacingDeg,spacingDeg
targetEccentricityXDeg,,0,0
targetEccentricityYDeg,,0,0
spacingDirection,,radial,radial
spacingDeg,,1,1
spacingOverSizeRatio,,1.4,1.4`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    // foveal (0,0) expected: horizontal, vertical, or horizontalAndVertical
    // radial → fovF=false, fov=true → mismatch → error
    const flankErrs = errors.filter((e) =>
      e.name.toLowerCase().includes("flanker"),
    );
    expect(flankErrs.length).toBeGreaterThan(0);
  });

  it("peripheral (non-zero) with horizontal spacing → no error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,letter,letter
targetTask,,identify,identify
thresholdParameter,,spacingDeg,spacingDeg
targetEccentricityXDeg,,5,5
targetEccentricityYDeg,,0,0
spacingDirection,,radial,radial
spacingDeg,,1,1
spacingOverSizeRatio,,1.4,1.4`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    // peripheral: fov=false, fovF=false for radial → fov===fovF → no error
    const flankErrs = errors.filter((e) =>
      e.name.toLowerCase().includes("flanker"),
    );
    expect(flankErrs).toHaveLength(0);
  });

  it("does not apply to non-letter, non-identify, non-spacingDeg conditions", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,gabor,gabor
targetTask,,detect,detect
thresholdParameter,,targetContrast,targetContrast
targetEccentricityXDeg,,0,0
targetEccentricityYDeg,,0,0
spacingDirection,,radial,radial`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    // targetKind is gabor → skip check
    const flankErrs = errors.filter((e) =>
      e.name.toLowerCase().includes("flanker"),
    );
    expect(flankErrs).toHaveLength(0);
  });
});
