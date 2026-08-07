/**
 * Snapshot suite: pins the behavior of validateExperimentTable
 * (preprocess/validateExperimentTable.ts — TABLE_CHECKS registry).
 *
 * Any refactor must leave every snapshot here byte-identical.
 *
 * Part A: every example table in examples/tables/ → full error output.
 * Part B: one handcrafted scenario per registered check → full error output
 *         + named assertion that the target check fired. The scenario-count
 *         guard enforces one scenario per TABLE_CHECKS entry: adding a check
 *         to the registry without a scenario fails the suite.
 * Part C: aggregation contract (sort order, no falsy entries, error shape).
 * Part D: per-check crash isolation (runSafely).
 *
 * If a snapshot legitimately needs to change, that is a behavior change —
 * discuss before `jest -u`.
 *
 * @jest-environment node
 */
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import {
  validateExperimentTable,
  runSafely,
  TABLE_CHECKS,
} from "../preprocess/validateExperimentTable";
import type { EasyEyesError } from "../preprocess/errorMessages";

const parse = (csv: string): ExperimentTable => {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  return new ExperimentTable(p.data as readonly (readonly string[])[]);
};

const normalize = (errors: EasyEyesError[]) =>
  errors.map((e) => ({
    name: e.name,
    kind: e.kind,
    context: e.context,
    parameters: e.parameters,
    message: e.message,
    hint: e.hint,
  }));

const errorsFor = (csv: string) =>
  normalize(validateExperimentTable(parse(csv)));

const BASE = `_about,green snapshot,
block,,1
conditionName,,A`;

beforeAll(async () => {
  await loadGlossaryForTests();
});

// ============================================================================
// Part A: example tables — real-world behavior, pinned wholesale
// ============================================================================
describe("Part A: example tables", () => {
  const dir = path.resolve(__dirname, "../examples/tables");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".csv"))
    .sort();
  // Guard against silently losing coverage if the folder changes.
  expect(files.length).toBeGreaterThanOrEqual(20);
  for (const f of files) {
    it(`${f} — error output is unchanged`, () => {
      const csv = fs.readFileSync(path.join(dir, f), "utf8");
      expect(errorsFor(csv)).toMatchSnapshot();
    });
  }
});

// ============================================================================
// Part B: one scenario per aggregated check
// ============================================================================
describe("Part B: per-check trigger scenarios", () => {
  const scenarios: Array<{
    label: string;
    csv: string;
    expectName: RegExp;
  }> = [
    {
      label: "alphabetical",
      csv: `_about,green,,
conditionName,,A
block,,1`,
      expectName: /alphabetical/i,
    },
    {
      label: "duplicates",
      csv: `${BASE}
block,,1`,
      expectName: /duplicated/i,
    },
    {
      label: "recognized",
      csv: `${BASE}
zzzNotARealParam,,x`,
      expectName: /unrecognized/i,
    },
    {
      label: "authorEmails",
      csv: `_about,green,,
_authorEmails,not-an-email,,
_calibrateMicrophonesBool,TRUE,,
block,,1
conditionName,,A`,
      expectName: /author email/i,
    },
    {
      label: "commaLength",
      csv: `${BASE}
fixationOriginXYScreen,,0.5,0.5,0.5`,
      expectName: /comma-separated string of the incorrect length/i,
    },
    {
      label: "trackingFixation",
      csv: `${BASE}
markingFixationMotionRadiusDeg,,2`,
      expectName: /Tracking required for moving fixation/i,
    },
    {
      label: "colBPlacement",
      csv: `_about,green,,
block,,1
conditionName,,A
viewingDistanceDesiredCm,50,`,
      expectName: /underscore parameter column/i,
    },
    {
      label: "underscoreFormat",
      csv: `_about,green,,
_language,English,x
block,,1
conditionName,,A`,
      expectName: /Underscore parameter incorrectly formatted/i,
    },
    {
      label: "types",
      csv: `${BASE}
viewingDistanceDesiredCm,,abc`,
      expectName: /wrong type/i,
    },
    {
      label: "responsePossible",
      csv: `${BASE}
responseClickedBool,,FALSE
responseTypedBool,,FALSE`,
      expectName: /lacks any response/i,
    },
    {
      label: "blockUnique",
      csv: `_about,green,,
block,,1,1
conditionName,,A,B
targetKind,,letter,image
targetTask,,identify,identify
thresholdParameter,,targetSizeDeg,targetSizeDeg`,
      expectName: /not unique within blocks/i,
    },
    {
      label: "shuffleContiguous",
      csv: `_about,green,,,
block,,1,2,3
blockShuffleGroups1,,A,B,A
conditionName,,A,B,C`,
      expectName: /aren't contiguous/i,
    },
    {
      label: "shuffleSubsets",
      csv: `_about,green,
block,,1
blockShuffleGroups1,,
blockShuffleGroups2,,X
conditionName,,A`,
      expectName: /not a subset/i,
    },
    {
      label: "mutuallyExclusive",
      csv: `${BASE}
responseMustClickCrosshairBool,,TRUE
responseMustTrackContinuouslyBool,,TRUE`,
      expectName: /mutually exclusive/i,
    },
    {
      label: "crosshair: negative stroke thickening",
      csv: `${BASE}
markingFixationStrokeThickening,,-1`,
      expectName: /Negative marking fixation stroke thickening/i,
    },
    {
      label: "crosshair: ill-defined tracking interval",
      csv: `${BASE}
responseMustTrackMaxSec,,0.5
responseMustTrackMinSec,,0.75`,
      expectName: /Ill-defined fixation tracking interval/i,
    },
    {
      label: "fixationLoc",
      csv: `${BASE}
fixationOriginXYScreen,,1.5,0.5`,
      expectName: /Invalid fixation location/i,
    },
    {
      label: "rsvpThreshold",
      csv: `${BASE}
targetKind,,rsvpReading`,
      expectName: /No thresholdParameter provided for rsvpReading/i,
    },
    {
      label: "detectIdentifyThreshold",
      csv: `${BASE}
targetKind,,letter
targetTask,,identify`,
      expectName: /No thresholdParameter provided for detect or identify/i,
    },
    {
      label: "targetTaskPresent",
      csv: BASE,
      expectName: /No targetTask provided/i,
    },
    {
      label: "targetKindRequired",
      csv: `${BASE}
targetTask,,identify`,
      expectName: /No targetKind provided/i,
    },
    {
      label: "rsvpMultiple",
      csv: `${BASE}
readingCorpus,,some.txt
rsvpReadingNumberOfWords,,4
rsvpReadingWordsPerScreen,,3
targetKind,,rsvpReading
targetTask,,identify
thresholdParameter,,targetSizeDeg`,
      expectName: /not a multiple/i,
    },
    {
      label: "flankerEcc",
      csv: `${BASE}
targetKind,,letter
targetTask,,identify
thresholdParameter,,spacingDeg`,
      expectName: /flanker type/i,
    },
    {
      label: "corpusForReading: corpus missing",
      csv: `${BASE}
targetKind,,reading
targetTask,,identify
thresholdParameter,,targetSizeDeg`,
      expectName: /No corpus specified/i,
    },
    {
      label: "corpusForReading: foils without rsvpReading",
      csv: `${BASE}
readingCorpusFoils,,foil
targetKind,,letter
targetTask,,identify
thresholdParameter,,targetSizeDeg`,
      expectName: /Invalid reading corpus foils/i,
    },
    {
      label: "thresholdRatio",
      csv: `${BASE}
thresholdAllowedTrialRatio,,0.5`,
      expectName: /thresholdAllowedTrialRatio is less than one/i,
    },
    {
      label: "calibrationTimes",
      csv: `${BASE}
calibrateScreenSizeTimes,,0`,
      expectName: /Calibration times cannot be zero/i,
    },
    {
      label: "imageTargetKind: folder unspecified",
      csv: `${BASE}
targetImageFolder,,
targetKind,,image
targetTask,,identify
thresholdParameter,,targetSizeDeg`,
      expectName: /Image folder is not specified/i,
    },
    {
      label: "imageTargetKind: invalid target task",
      csv: `${BASE}
targetImageFolder,,images
targetKind,,image
targetTask,,detect
thresholdParameter,,targetSizeDeg`,
      expectName: /Invalid target task/i,
    },
    {
      label: "showImageSpareFraction",
      csv: `${BASE}
questionAndAnswer01,,NICK||Q?
showImage,,img.png`,
      expectName: /showImageSpareFraction must be > 0/i,
    },
    {
      label: "targetImageSpareFraction: out of range",
      csv: `${BASE}
targetImageSpareFraction,,1.5`,
      expectName: /at least 0 and less than 1/i,
    },
    {
      label: "targetImageSpareFractionTooSmall",
      csv: `${BASE}
questionAndAnswer01,,BEAUTY||Q|a|b
targetImageFolder,,images
targetImageSpareFraction,,0.1
targetKind,,image
targetTask,,identify
thresholdParameter,,targetSizeDeg`,
      expectName: /targetImageSpareFraction CAUTION/i,
    },
    {
      label: "screenSize",
      csv: `${BASE}
targetMinPhysicalPx,,0`,
      expectName: /Screen size parameters are not positive/i,
    },
    {
      label: "vernierThreshold: offset without vernier",
      csv: `${BASE}
targetKind,,letter
targetTask,,identify
thresholdParameter,,targetOffsetDeg`,
      expectName: /targetOffsetDeg requires targetKind=vernier/i,
    },
    {
      label: "vernierThreshold: vernier without offset",
      csv: `${BASE}
targetKind,,vernier
targetTask,,identify
thresholdParameter,,targetSizeDeg`,
      expectName:
        /vernier targetKind requires thresholdParameter=targetOffsetDeg/i,
    },
    {
      label: "questionsProvidedForQA",
      csv: `${BASE}
questionAndAnswer01,,NICK||Q?
targetKind,,letter
targetTask,,detect
thresholdParameter,,targetSizeDeg`,
      expectName: /questionAndAnswer parameters not allowed/i,
    },
    {
      // A leading separator (|) makes the first field — the nickname — empty.
      // (A leading blank line can't trigger this: cells are trimmed.)
      label: "questionAndAnswerNicknameMissing",
      csv: `${BASE}
questionAndAnswer01,,|maybe|Is this a question?|Yes|No`,
      expectName: /nickname missing/i,
    },
    {
      // targetTask=questionAnswer with no question parameters would run a
      // zero-trial block at runtime, showing nothing.
      label: "questionAnswerTaskHasQuestions",
      csv: `${BASE}
targetTask,,questionAnswer`,
      expectName: /condition without questions/i,
    },
    {
      // New questionAnswer format: a value precedes each answer and must be
      // numeric (or empty = zero). "abc" is not numeric.
      label: "questionAnswerValuesNumeric",
      csv: `${BASE}
questionAnswer01,,NICK|Q?|abc|apple|1|banana`,
      expectName: /values must be numeric/i,
    },
    {
      // Exactly one answer is an error: none (free-form) or two+ (choice).
      label: "questionAnswerSingleAnswer",
      csv: `${BASE}
questionAndAnswer01,,NICK|apple|Q?|apple`,
      expectName: /just one answer/i,
    },
    {
      label: "easyEyesLettersVersion: spacingDirection constraint",
      csv: `${BASE}
EasyEyesLettersVersion,,2
spacingDirection,,horizontalAndVertical
targetKind,,letter
targetTask,,identify
thresholdParameter,,targetSizeDeg`,
      expectName: /Unsupported combination/i,
    },
    {
      label: "fontDirectionVertical",
      csv: `${BASE}
fontDirection,,vertical-rl`,
      expectName: /vertical not yet implemented/i,
    },
    {
      label: "fontFeatureSettings",
      csv: `${BASE}
fontFeatureSettings,,"zzzz"`,
      expectName: /Invalid fontFeatureSettings/i,
    },
    {
      label: "fontVariantLigatures",
      csv: `${BASE}
fontVariantLigatures,,"normal,common-ligatures"`,
      expectName: /Contradictory fontVariantLigatures/i,
    },
    {
      label: "fontFeatureBrowserGate",
      csv: `${BASE}
fontFeatureSettings,,"kern"
fontSource,,browser`,
      expectName: /fontSource=browser does not support/i,
    },
    {
      label: "typeSquareGate",
      csv: `${BASE}
fontSource,,typesquare`,
      expectName: /typesquare/i,
    },
    {
      label: "calibrateDistanceCheckRequiresDistance",
      csv: `${BASE}
_calibrateDistanceCheckBool,TRUE,
calibrateDistanceBool,,FALSE`,
      expectName: /invalid combination of parameters/i,
    },
    {
      label: "viewMonitorsXYDeg",
      csv: `${BASE}
viewMonitorsXYDeg,,999,999`,
      expectName: /invalid parameter value/i,
    },
    {
      label: "markingOffsetPeripheral",
      csv: `${BASE}
markingOffsetBeforeTargetOnsetSecs,,0.5
targetEccentricityXDeg,,5.1
targetEccentricityYDeg,,0`,
      expectName:
        /markingOffsetBeforeTargetOnsetSecs set for peripheral target/i,
    },
    {
      label: "markingOffsetPeripheralY",
      csv: `${BASE}
markingOffsetBeforeTargetOnsetSecs,,0.5
targetEccentricityXDeg,,0
targetEccentricityYDeg,,-4`,
      expectName:
        /markingOffsetBeforeTargetOnsetSecs set for peripheral target/i,
    },
    {
      label: "fontWeightWghtConflict",
      csv: `${BASE}
fontWeight,,700
fontVariableSettings,,"wght" 400`,
      expectName: /fontWeight and fontVariableSettings/i,
    },
    {
      label: "blackoutOnBlackScreen",
      csv: `${BASE}
screenColorRGBA,,"0,0,0,1"`,
      expectName: /Background color conflicts with blackout detection/i,
    },
    {
      label: "impulseResponsePairs",
      csv: `${BASE}
_calibrateSoundSimulateLoudspeaker,ir.wav,`,
      expectName: /Missing paired impulse response file/i,
    },
    {
      label: "viewMonitorsXYDegInvalid",
      csv: `${BASE}
viewMonitorsXYDeg,,"95,abc"`,
      expectName: /Invalid parameter value/i,
    },
  ];

  for (const s of scenarios) {
    it(`${s.label} — fires its check, output unchanged`, () => {
      const errors = validateExperimentTable(parse(s.csv));
      expect(errors.map((e) => e.name)).toEqual(
        expect.arrayContaining([expect.stringMatching(s.expectName)]),
      );
      expect(normalize(errors)).toMatchSnapshot();
    });
  }

  it("scenario count matches the checks aggregated in validateExperimentTable", () => {
    // One scenario per TABLE_CHECKS entry, except the two glossary self-checks
    // (untriggerable by any table: -2), plus 6 checks with a second scenario
    // (crosshair, corpusForReading, imageTargetKind, vernierThreshold,
    // viewMonitorsXYDeg, markingOffset: +6).
    // Guards against adding a check without adding a scenario.
    expect(scenarios.length).toBe(TABLE_CHECKS.length + 4);
  });
});

// ============================================================================
// Part C: aggregation contract
// ============================================================================
describe("Part D: per-check crash isolation", () => {
  it("a throwing check becomes one reportable error, not a validation outage", () => {
    const t = parse(`${BASE}\ntargetTask,,identify`);
    const errors = runSafely(() => {
      throw new Error("boom");
    }, t);
    expect(errors).toHaveLength(1);
    expect(errors[0].name).toMatch(/compiler bug/i);
    expect(errors[0].message).toContain("boom");
    expect(errors[0].kind).toBe("error");
  });

  it("a throwing registered check does not suppress the other checks' errors", () => {
    const t = parse(`${BASE}\nzebraLastParam,,x\ntargetTask,,identify`);
    const idx = TABLE_CHECKS.findIndex((c) => c.name === "checkParameterTypes");
    const original = TABLE_CHECKS[idx];
    (TABLE_CHECKS as any)[idx] = () => {
      throw new Error("saboteur");
    };
    let errors: ReturnType<typeof validateExperimentTable> = [];
    try {
      errors = validateExperimentTable(t);
    } finally {
      (TABLE_CHECKS as any)[idx] = original;
    }
    // The crash report is present…
    expect(errors.some((e) => /compiler bug/i.test(e.name))).toBe(true);
    // …and the other checks still ran.
    expect(errors.some((e) => /alphabetical/i.test(e.name))).toBe(true);
    expect(errors.some((e) => /unrecognized/i.test(e.name))).toBe(true);
  });
});

describe("Part C: aggregation contract", () => {
  const messyCsv = `_about,green,,
_language,English,x
block,,1,1
zzzNotARealParam,,q,q
conditionName,,A,B
viewingDistanceDesiredCm,,abc,50
targetKind,,letter,image
targetTask,,identify,identify
thresholdParameter,,targetSizeDeg,targetSizeDeg`;

  it("errors are sorted by first parameter, with no falsy entries", () => {
    const errors = validateExperimentTable(parse(messyCsv));
    expect(errors.every(Boolean)).toBe(true);
    const keys = errors.map((e) => e.parameters[0]);
    const sorted = [...keys].sort((a, b) => (a > b ? 1 : -1));
    expect(keys).toEqual(sorted);
  });

  it("every error has the full EasyEyesError shape", () => {
    const errors = validateExperimentTable(parse(messyCsv));
    for (const e of errors) {
      expect(typeof e.name).toBe("string");
      expect(typeof e.message).toBe("string");
      expect(typeof e.hint).toBe("string");
      expect(typeof e.context).toBe("string");
      expect(["error", "warning"]).toContain(e.kind);
      expect(Array.isArray(e.parameters)).toBe(true);
      expect(e.parameters.length).toBeGreaterThan(0);
    }
  });

  it("messy table — full error output pinned", () => {
    expect(errorsFor(messyCsv)).toMatchSnapshot();
  });

  it("a fully valid table yields zero errors", () => {
    const csv = `${BASE}
targetKind,,letter
targetTask,,identify
thresholdParameter,,targetSizeDeg`;
    expect(validateExperimentTable(parse(csv))).toEqual([]);
  });
});
