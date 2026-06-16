/**
 * Column label correctness tests.
 *
 * For every validator in validateExperimentTable that produces column
 * references in its error messages, verify that the column label matches
 * the original spreadsheet column (A=param name, B=colB, C=condition 1, …).
 *
 * Strategy: place the offending value in a specific condition column (C, D,
 * or E), run validateExperimentTable, extract column labels from the error
 * text, and assert they match expectations.
 *
 * @jest-environment node
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/experimentFileChecks";
import type { EasyEyesError } from "../preprocess/errorMessages";

beforeAll(async () => {
  await loadGlossaryForTests();
});

function parse(csv: string): ExperimentTable {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  return new ExperimentTable(p.data as readonly (readonly string[])[]);
}

/** Extract column labels from an error's message + hint strings. */
function columnLabels(errors: EasyEyesError[]): string[] {
  const labels = new Set<string>();
  const text = errors
    .map((e) => `${e.message ?? ""} ${e.hint ?? ""}`)
    .join(" ");
  // Match patterns like "column C", "column is: C", "columns C, D"
  // Also match span-wrapped: [column C], [column is: C], (column C)
  const re =
    /\bcolumn(?:s| is)?\s*:?\s*([A-Z]+(?:\s*,\s*[A-Z]+)*(?:\s+and\s+[A-Z]+)*)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const parts = m[1].split(/\s*,\s*|\s+and\s+/);
    for (const p of parts) labels.add(p.trim());
  }
  return [...labels].sort();
}

// ---------------------------------------------------------------------------
// Helpers: minimal valid CSVs that we extend with error-triggering values.
// ---------------------------------------------------------------------------

/** A minimal 2-condition table with all necessary params so only the targeted
 *  check triggers. */
const base2 = `_about,test,,
block,,1,1
conditionName,,A,B
conditionTrials,,10,10
conditionEnabledBool,,TRUE,TRUE
responseClickedBool,,TRUE,TRUE
responseTypedBool,,TRUE,TRUE
targetKind,,letter,letter
targetTask,,identify,identify
thresholdParameter,,targetSizeDeg,targetSizeDeg
font,,Roboto Mono,Roboto Mono
fontSource,,google,google`;

function csv(extraRows: string): string {
  return base2 + "\n" + extraRows;
}

// ---------------------------------------------------------------------------
// _commaLength_t — markDot expects 7 comma-separated values
// ---------------------------------------------------------------------------

describe("_commaLength_t (mark parameters)", () => {
  it("reports column C when error in first condition", () => {
    const t = parse(csv(`markDot,,"bad","0,0,0,0,0,0,1"`));
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("comma-separated"),
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(columnLabels(errs)).toEqual(["C"]);
  });

  it("reports column E when error in third condition", () => {
    const t = parse(
      csv(`_about,test,,,,
block,,1,1,1,1
conditionName,,A,B,C,D
conditionTrials,,10,10,10,10
conditionEnabledBool,,TRUE,TRUE,TRUE,TRUE
responseClickedBool,,TRUE,TRUE,TRUE,TRUE
responseTypedBool,,TRUE,TRUE,TRUE,TRUE
targetKind,,letter,letter,letter,letter
targetTask,,identify,identify,identify,identify
thresholdParameter,,targetSizeDeg,targetSizeDeg,targetSizeDeg,targetSizeDeg
font,,Roboto Mono,Roboto Mono,Roboto Mono,Roboto Mono
fontSource,,google,google,google,google
markDot,,"0,0,0,0,0,0,1","0,0,0,0,0,0,1","bad","0,0,0,0,0,0,1"`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("comma-separated"),
    );
    expect(columnLabels(errs)).toEqual(["E"]);
  });
});

// ---------------------------------------------------------------------------
// _trackingFixation_t
// ---------------------------------------------------------------------------

describe("_trackingFixation_t", () => {
  it("reports correct column for moving fixation without tracking", () => {
    // need markingFixationMotionRadiusDeg>0 AND responseMustTrackContinuouslyBool != TRUE
    const t = parse(
      csv(`
markingFixationMotionRadiusDeg,,0,1
responseMustTrackContinuouslyBool,,FALSE,FALSE
markingFixationMotionSpeedDegPerSec,,0.3,0.3
markingFixationHotSpotRadiusDeg,,0.1,0.1
responseMustTrackMinSec,,0.75,0.75
responseMustTrackMaxSec,,1.25,1.25`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("Tracking"),
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(columnLabels(errs)).toEqual(["D"]);
  });
});

// ---------------------------------------------------------------------------
// _types_t — type errors produce column labels
// ---------------------------------------------------------------------------

describe("_types_t", () => {
  it("reports column C for non-integer conditionTrials in first condition", () => {
    const t = parse(csv(`conditionTrials,,bad,10`));
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("type"),
    );
    expect(columnLabels(errs)).toContain("C");
  });
});

// ---------------------------------------------------------------------------
// _crosshair_t (stroke thickening + tracking intervals)
// ---------------------------------------------------------------------------

describe("_crosshair_t", () => {
  it("reports correct column for negative stroke thickening", () => {
    const t = parse(
      csv(`
markingFixationStrokeThickening,,1.4,-0.5
responseMustTrackMinSec,,0.75,0.75
responseMustTrackMaxSec,,1.25,1.25`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("Negative"),
    );
    expect(columnLabels(errs)).toEqual(["D"]);
  });

  it("reports correct column for ill-defined tracking interval", () => {
    const t = parse(
      csv(`
markingFixationStrokeThickening,,1.4,1.4
responseMustTrackMinSec,,2,1
responseMustTrackMaxSec,,1,2`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("Ill-defined"),
    );
    expect(columnLabels(errs)).toEqual(["C"]);
  });
});

// ---------------------------------------------------------------------------
// _fixationLoc_t
// ---------------------------------------------------------------------------

describe("_fixationLoc_t", () => {
  it("reports correct column for offscreen fixation not allowed", () => {
    const t = parse(
      csv(`
fixationOriginXYScreen,,"0.5, 0.5","2, 0.5"
fixationRequestedOffscreenBool,,FALSE,FALSE`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("fixation location"),
    );
    expect(columnLabels(errs)).toEqual(["D"]);
  });
});

// ---------------------------------------------------------------------------
// _rsvpThreshold_t
// ---------------------------------------------------------------------------

describe("_rsvpThreshold_t", () => {
  it("reports correct column for missing thresholdParameter with rsvpReading", () => {
    const t = parse(
      csv(`
targetKind,,letter,rsvpReading
thresholdParameter,,targetSizeDeg,
rsvpReadingNumberOfWords,,3,3
rsvpReadingNumberOfResponseOptions,,4,4
readingCorpus,,,corpus
readingSetSize,,,0.5
readingNominalSizePt,,12,12`),
    );
    const errs = validateExperimentTable(t).filter(
      (e) =>
        e.name.includes("thresholdParameter") && e.name.includes("rsvpReading"),
    );
    expect(columnLabels(errs)).toEqual(["D"]);
  });
});

// ---------------------------------------------------------------------------
// _detectIdentifyThreshold_t
// ---------------------------------------------------------------------------

describe("_detectIdentifyThreshold_t", () => {
  it("reports correct column for missing thresholdParameter with detect task", () => {
    const t = parse(
      csv(`
targetTask,,identify,detect
thresholdParameter,,spacingDeg,`),
    );
    const errs = validateExperimentTable(t).filter(
      (e) =>
        e.name.includes("thresholdParameter") &&
        (e.message.includes("detect") || e.message.includes("identify")),
    );
    expect(columnLabels(errs)).toEqual(["D"]);
  });
});

// ---------------------------------------------------------------------------
// _rsvpMultiple_t
// ---------------------------------------------------------------------------

describe("_rsvpMultiple_t", () => {
  it("reports correct column when rsvpReadingNumberOfWords not multiple", () => {
    const t = parse(
      csv(`
targetKind,,rsvpReading,rsvpReading
thresholdParameter,,targetDurationSec,targetDurationSec
rsvpReadingNumberOfWords,,5,6
rsvpReadingWordsPerScreen,,2,4
rsvpReadingNumberOfResponseOptions,,4,4
readingCorpus,,corpus,corpus
readingSetSize,,0.5,0.5
readingNominalSizePt,,12,12`),
    );
    // Both conditions: 5%2≠0 and 6%4≠0, so both columns should be reported
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.toLowerCase().includes("multiple"),
    );
    expect(columnLabels(errs)).toEqual(["C", "D"]);
  });
});

// ---------------------------------------------------------------------------
// _flankerEcc_t
// ---------------------------------------------------------------------------

describe("_flankerEcc_t", () => {
  it("reports correct column for foveal radial spacing direction", () => {
    const t = parse(
      csv(`
targetEccentricityXDeg,,0,0
targetEccentricityYDeg,,0,0
thresholdParameter,,spacingDeg,spacingDeg
spacingDirection,,radial,horizontal
spacingDeg,,2,2
spacingOverSizeRatio,,1.4,1.4`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.toLowerCase().includes("flanker"),
    );
    expect(columnLabels(errs)).toEqual(["C"]);
  });
});

// ---------------------------------------------------------------------------
// _corpusForReading_t
// ---------------------------------------------------------------------------

describe("_corpusForReading_t", () => {
  it("reports correct column for reading without corpus", () => {
    const t = parse(
      csv(`
targetKind,,letter,reading
readingSetSize,,0.5,0.5
readingNominalSizePt,,12,12
readingNumberOfPossibleAnswers,,4,4
readingNumberOfQuestions,,3,3
readingPages,,,4
readingLineLength,,,57
readingLinesPerPage,,,4
readingSpacingDeg,,0.5,0.5
readingCorpus,,,`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("corpus"),
    );
    expect(columnLabels(errs)).toEqual(["D"]);
  });
});

// ---------------------------------------------------------------------------
// _thresholdRatio_t
// ---------------------------------------------------------------------------

describe("_thresholdRatio_t", () => {
  it("reports correct column for thresholdAllowedTrialRatio < 1", () => {
    const t = parse(
      csv(`
thresholdAllowedTrialRatio,,1.5,0.5`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("thresholdAllowedTrialRatio"),
    );
    expect(columnLabels(errs)).toEqual(["D"]);
  });
});

// ---------------------------------------------------------------------------
// _calibrationTimes_t
// ---------------------------------------------------------------------------

describe("_calibrationTimes_t", () => {
  it("reports correct column for calibrateScreenSizeTimes = 0", () => {
    const t = parse(
      csv(`
calibrateScreenSizeTimes,,2,0`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("Calibration times"),
    );
    expect(columnLabels(errs)).toEqual(["D"]);
  });
});

// ---------------------------------------------------------------------------
// _screenSize_t
// ---------------------------------------------------------------------------

describe("_screenSize_t", () => {
  it("reports correct column for non-positive targetMinPhysicalPx", () => {
    const t = parse(
      csv(`
targetMinPhysicalPx,,8,0
needTargetAsSmallAsDeg,,1,1
needScreenWidthDeg,,0,0
needScreenHeightDeg,,0,0`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.toLowerCase().includes("screen size"),
    );
    expect(columnLabels(errs)).toEqual(["D"]);
  });

  it("reports correct column for negative needScreenWidthDeg", () => {
    const t = parse(
      csv(`
targetMinPhysicalPx,,8,8
needTargetAsSmallAsDeg,,1,1
needScreenWidthDeg,,-1,0
needScreenHeightDeg,,0,0`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.toLowerCase().includes("screen size"),
    );
    expect(columnLabels(errs)).toEqual(["C"]);
  });
});

// ---------------------------------------------------------------------------
// _vernierThreshold_t
// ---------------------------------------------------------------------------

describe("_vernierThreshold_t", () => {
  it("reports correct column for vernier with wrong thresholdParameter", () => {
    const t = parse(
      csv(`
targetKind,,vernier,letter
thresholdParameter,,spacingDeg,targetOffsetDeg`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("unsupported"),
    );
    // Two errors: C (vernier+spacingDeg) and D (letter+targetOffsetDeg)
    expect(columnLabels(errs)).toContain("C");
    expect(columnLabels(errs)).toContain("D");
  });
});

// ---------------------------------------------------------------------------
// _questionsProvidedForQA_t
// ---------------------------------------------------------------------------

describe("_questionsProvidedForQA_t", () => {
  it("reports correct column for QA with invalid targetTask", () => {
    const t = parse(
      csv(`
targetKind,,letter,letter
targetTask,,detect,identify
questionAndAnswer01,,NICK||Q?,`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("questionAndAnswer"),
    );
    expect(columnLabels(errs)).toEqual(["C"]);
  });
});

// ---------------------------------------------------------------------------
// _showImageSpareFraction_t
// ---------------------------------------------------------------------------

describe("_showImageSpareFraction_t", () => {
  it("reports correct column for showImage+QA without spare fraction", () => {
    const t = parse(
      csv(`
showImage,,pic.png,
showImageSpareFraction,,0,0
questionAndAnswer01,,NICK||Q?,`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("showImageSpareFraction"),
    );
    expect(columnLabels(errs)).toEqual(["C"]);
  });
});

// ---------------------------------------------------------------------------
// _targetImageSpareFraction_t
// ---------------------------------------------------------------------------

describe("_targetImageSpareFraction_t", () => {
  it("reports correct column for out-of-range targetImageSpareFraction", () => {
    const t = parse(
      csv(`
targetImageSpareFraction,,1,0.3`),
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("targetImageSpareFraction"),
    );
    expect(columnLabels(errs)).toEqual(["C"]);
  });
});

// ---------------------------------------------------------------------------
// _targetImageSpareFractionTooSmall_t
// ---------------------------------------------------------------------------

describe("_targetImageSpareFractionTooSmall_t", () => {
  // base2 hardcodes targetKind=letter, so build standalone image tables here.
  it("warns when image+questionAndAnswer has a too-small spare fraction", () => {
    const t = parse(`_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,image,image
targetTask,,,
targetImageFolder,,Foo,Foo
questionAndAnswer01,,BEAUTY||Q|a|b,BEAUTY||Q|a|b
targetImageSpareFraction,,0,0.3`);
    const errs = validateExperimentTable(t).filter(
      (e) =>
        e.kind === "warning" && e.name.includes("targetImageSpareFraction"),
    );
    // Column C (fraction 0) is too small; D (0.3) is fine.
    expect(columnLabels(errs)).toEqual(["C"]);
  });

  it("does not warn when there is no questionAndAnswer", () => {
    const t = parse(`_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,image,image
targetImageFolder,,Foo,Foo
targetImageSpareFraction,,0,0.2`);
    const errs = validateExperimentTable(t).filter(
      (e) =>
        e.kind === "warning" && e.name.includes("targetImageSpareFraction"),
    );
    expect(errs).toEqual([]);
  });
});
