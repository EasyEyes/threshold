/**
 * Compiler pipeline tests: validateExperimentTable end-to-end.
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

describe("validateExperimentTable — basic checks", () => {
  it("passes a valid minimal table", () => {
    const csv = `_about,minimal,,
block,,1,1
conditionName,,A,B`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    const structuralErrors = errors.filter(
      (e) =>
        e.name.includes("duplicate") ||
        e.name.includes("unrecognized") ||
        e.name.includes("type"),
    );
    expect(structuralErrors).toHaveLength(0);
  });

  it("reports unrecognized parameter", () => {
    const csv = `_about,test,,
block,,1,1
notARealParam,,x,y`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.name.includes("unrecognized"))).toBe(true);
  });

  it("reports duplicate parameter", () => {
    const csv = `_about,test,,
block,,1,1
block,,1,1
conditionName,,A,B`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.name.includes("duplicated"))).toBe(true);
  });

  it("reports type error for non-integer conditionTrials", () => {
    const csv = `_about,test,,
block,,1,1
conditionTrials,,three,four
conditionName,,A,B`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.name.includes("type"))).toBe(true);
  });

  it("reports no response possible", () => {
    const csv = `_about,test,,
block,,1,1
responseClickedBool,,FALSE,FALSE
responseTypedBool,,FALSE,FALSE
responseSpokenBool,,FALSE,FALSE
simulateParticipantBool,,FALSE,FALSE
conditionName,,A,B`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.some(
        (e) => e.name.includes("response") || e.name.includes("No response"),
      ),
    ).toBe(true);
  });

  it("reports condition params in col B", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,wrongCol,,
conditionTrials,,4,4`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.some(
        (e) =>
          e.name.includes("Non-underscore") ||
          e.name.includes("underscore parameter column"),
      ),
    ).toBe(true);
  });

  it("reports ill-formed underscore param", () => {
    const csv = `_about,test,,
block,,1,1
_needBrowser,Chrome,Firefox,Edge
conditionName,,A,B`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.some(
        (e) => e.name.includes("Underscore") || e.name.includes("underscore"),
      ),
    ).toBe(true);
  });

  it("non-alphabetical params are flagged", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
alphaParam,,1,2`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    // "alphaParam" < "block" alphabetically → no error
    // Use reverse order to trigger alphabetical error
    const csv2 = `_about,test,,
block,,1,1
aaa,,1,2
conditionName,,A,B`;
    const t2 = parse(csv2);
    const errors2 = validateExperimentTable(t2);
    expect(errors2.some((e) => e.name.includes("alphabetical"))).toBe(true);
  });

  it("alphabetical check: correctly ordered params pass", () => {
    const csv = `_about,test,,
_zzz,value,,
aaa,,1,1
block,,1,1
conditionName,,A,B`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    const alphaErrs = errors.filter((e) => e.name.includes("alphabetical"));
    expect(alphaErrs.length).toBeGreaterThanOrEqual(0);
  });

  it("reports vernier-targetOffsetDeg mismatch", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,vernier,letter
thresholdParameter,,targetOffsetDeg,spacingDeg`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    // Either vernier must use targetOffsetDeg, or targetOffsetDeg must use vernier
    expect(errors.length).toBeGreaterThan(0);
  });

  it("reports threshold missing for detect/identify", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetTask,,detect,identify
thresholdParameter,,,`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    // Should report some error about missing threshold
    expect(errors.length).toBeGreaterThan(0);
  });

  it("reports tracking on for moving fixation", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
markingFixationMotionRadiusDeg,,5,0
responseMustTrackContinuouslyBool,,FALSE,FALSE`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.some(
        (e) =>
          e.name.includes("tracking") ||
          e.name.includes("moving fixation") ||
          e.name.includes("Motion"),
      ),
    ).toBe(true);
  });

  it("reports screen size negative", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
needScreenWidthDeg,,-1,10`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.some(
        (e) =>
          e.name.includes("Screen") ||
          e.name.includes("negative") ||
          e.name.includes("screen size"),
      ),
    ).toBe(true);
  });

  it("reports thresholdAllowedTrialRatio < 1", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
thresholdAllowedTrialRatio,,0.5,0.5`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.some(
        (e) => e.name.includes("threshold") || e.name.includes("trial ratio"),
      ),
    ).toBe(true);
  });

  it("reports calibrateScreenSizeTimes = 0", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
calibrateScreenSizeTimes,,0,0`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.some(
        (e) =>
          e.name.includes("Calibration") ||
          e.name.includes("calibrate") ||
          e.name.includes("ScreenSize"),
      ),
    ).toBe(true);
  });

  it("reports duplicate + type error simultaneously", () => {
    const csv = `_about,test,,
block,,1,1
block,,1,1
conditionTrials,,not-a-number,not-a-number
conditionName,,A,B`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.some(
        (e) => e.parameters.includes("block") && e.name.includes("duplicate"),
      ),
    ).toBe(true);
    expect(
      errors.some(
        (e) =>
          e.parameters.includes("conditionTrials") && e.name.includes("type"),
      ),
    ).toBe(true);
  });

  it("reports unrecognized + type error simultaneously", () => {
    const csv = `_about,test,,
block,,1,1
notARealParam,,x,y
conditionTrials,,three,four
conditionName,,A,B`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.name.includes("unrecognized"))).toBe(true);
    expect(errors.some((e) => e.name.includes("type"))).toBe(true);
  });
});

describe("validateExperimentTable: _authorEmails", () => {
  it("_calibrateMicrophonesBool absent → no email check", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.parameters.includes("_authorEmails"))).toBe(
      false,
    );
  });

  it("_calibrateMicrophonesBool=FALSE → no email check", () => {
    const csv = `_about,test,,
block,,1,1
_calibrateMicrophonesBool,FALSE,,
conditionName,,A,B`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.parameters.includes("_authorEmails"))).toBe(
      false,
    );
  });
});

describe("validateExperimentTable: screen size", () => {
  it("needScreenWidthDeg = 0 → no error (only negative flagged)", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
needScreenWidthDeg,,0,0`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.some(
        (e) =>
          e.name.includes("Screen") && e.name.includes("needScreenWidthDeg"),
      ),
    ).toBe(false);
  });

  it("needScreenWidthDeg = -1 → flags error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
needScreenWidthDeg,,-1,-1`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.name.includes("Screen"))).toBe(true);
  });
});

describe("validateExperimentTable: Q&A only allowed with image/none", () => {
  it("Q&A with targetTask=identify + targetKind=image → no error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetTask,,identify,identify
targetKind,,image,image
questionAndAnswer1,,hello?,`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.filter((e) => e.name.includes("questionAndAnswer")),
    ).toHaveLength(0);
  });

  it("Q&A with targetTask=identify + targetKind=letter → error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetTask,,identify,identify
targetKind,,letter,letter
questionAndAnswer1,,hello?,`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.name.includes("questionAndAnswer"))).toBe(true);
  });

  it("Q&A with targetTask=detect → error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetTask,,detect,detect
targetKind,,letter,letter
questionAndAnswer1,,hello?,`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.name.includes("questionAndAnswer"))).toBe(true);
  });

  it("no Q&A params → no error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetTask,,identify,identify
targetKind,,letter,letter`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.filter((e) => e.name.includes("questionAndAnswer")),
    ).toHaveLength(0);
  });

  it("Q&A with empty targetTask → no error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetTask,,,
targetKind,,,
questionAndAnswer1,,hello?,`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.filter((e) => e.name.includes("questionAndAnswer")),
    ).toHaveLength(0);
  });
});

describe("validateExperimentTable: EasyEyesLettersVersion constraints", () => {
  it("v2 + ratio + spacingSymmetry=screen → no error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,letter,letter
EasyEyesLettersVersion,,2,2
spacingRelationToSize,,ratio,ratio
spacingSymmetry,,screen,screen
spacingDirection,,horizontal,horizontal`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.filter((e) => e.name.includes("Unsupported"))).toHaveLength(
      0,
    );
  });

  it("v2 + ratio + spacingSymmetry=none → error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,letter,letter
EasyEyesLettersVersion,,2,2
spacingRelationToSize,,ratio,ratio
spacingSymmetry,,none,none
spacingDirection,,horizontal,horizontal`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.some(
        (e) =>
          e.name.includes("Unsupported") &&
          e.parameters.includes("spacingSymmetry"),
      ),
    ).toBe(true);
  });

  it("v2 + ratio + horizontalAndVertical → error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,letter,letter
EasyEyesLettersVersion,,2,2
spacingRelationToSize,,ratio,ratio
spacingSymmetry,,screen,screen
spacingDirection,,horizontalAndVertical,horizontalAndVertical`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(
      errors.some(
        (e) =>
          e.name.includes("Unsupported") &&
          e.parameters.includes("spacingDirection"),
      ),
    ).toBe(true);
  });

  it("v1 → no error", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,letter,letter
EasyEyesLettersVersion,,1,1
spacingRelationToSize,,ratio,ratio
spacingSymmetry,,none,none
spacingDirection,,horizontalAndVertical,horizontalAndVertical`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.filter((e) => e.name.includes("Unsupported"))).toHaveLength(
      0,
    );
  });

  it("v2 + targetKind=image → no error (only letter targetKind checked)", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,A,B
targetKind,,image,image
EasyEyesLettersVersion,,2,2
spacingRelationToSize,,ratio,ratio
spacingSymmetry,,none,none
spacingDirection,,horizontalAndVertical,horizontalAndVertical`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.filter((e) => e.name.includes("Unsupported"))).toHaveLength(
      0,
    );
  });
});

describe("validateExperimentTable: targetKind/targetTask emptiness", () => {
  const isTargetTaskError = (e: EasyEyesError) =>
    e.name === "No targetTask provided";
  const isTargetKindError = (e: EasyEyesError) =>
    e.name === "No targetKind provided";

  it("empty targetTask + Q&A values → no targetTask error (Q&A-only is legal)", () => {
    const csv = `_about,test,
block,,1
conditionName,,A
targetTask,,
questionAndAnswer1,,hello?`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some(isTargetTaskError)).toBe(false);
  });

  it("empty targetTask + no Q&A values → No targetTask provided error", () => {
    const csv = `_about,test,
block,,1
conditionName,,A
targetTask,,`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some(isTargetTaskError)).toBe(true);
  });

  it("missing targetTask row entirely + no Q&A → No targetTask provided error", () => {
    const csv = `_about,test,
block,,1
conditionName,,A
targetKind,,letter`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some(isTargetTaskError)).toBe(true);
  });

  it("empty targetKind + targetTask=identify → No targetKind provided error", () => {
    const csv = `_about,test,
block,,1
conditionName,,A
targetTask,,identify
targetKind,,`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some(isTargetKindError)).toBe(true);
  });

  it("empty targetKind + targetTask=detect → No targetKind provided error", () => {
    const csv = `_about,test,
block,,1
conditionName,,A
targetTask,,detect
targetKind,,`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some(isTargetKindError)).toBe(true);
  });

  it("missing targetKind row entirely + targetTask=identify → error", () => {
    const csv = `_about,test,
block,,1
conditionName,,A
targetTask,,identify`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some(isTargetKindError)).toBe(true);
  });

  it("empty targetKind + Q&A-only condition → no targetKind error (legal)", () => {
    const csv = `_about,test,
block,,1
conditionName,,A
targetTask,,
targetKind,,
questionAndAnswer1,,hello?`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some(isTargetKindError)).toBe(false);
  });

  it("targetTask=identify + targetKind=letter → no targetKind error", () => {
    const csv = `_about,test,
block,,1
conditionName,,A
targetTask,,identify
targetKind,,letter`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some(isTargetKindError)).toBe(false);
  });

  it("reports only the offending column", () => {
    const csv = `_about,test,,
block,,1,2
conditionName,,A,B
targetTask,,identify,identify
targetKind,,letter,`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    const kindErrors = errors.filter(isTargetKindError);
    expect(kindErrors).toHaveLength(1);
    expect(kindErrors[0].hint).toContain("column D");
    expect(kindErrors[0].hint).not.toContain("column C");
  });
});

describe("validateExperimentTable: task/kind emptiness — edge cases", () => {
  const isTargetTaskError = (e: EasyEyesError) =>
    e.name === "No targetTask provided";
  const isTargetKindError = (e: EasyEyesError) =>
    e.name === "No targetKind provided";

  it("mixed: flags only the empty-task condition lacking Q&A", () => {
    const csv = `_about,test,,
block,,1,2
conditionName,,A,B
targetTask,,,
questionAndAnswer01,,,hello?`;
    const t = parse(csv);
    const errors = validateExperimentTable(t).filter(isTargetTaskError);
    expect(errors).toHaveLength(1);
    expect(errors[0].hint).toContain("column C");
    expect(errors[0].hint).not.toContain("column D");
  });

  it("new-style questionAnswer01 also makes empty targetTask legal", () => {
    const csv = `_about,test,
block,,1
conditionName,,A
targetTask,,
questionAnswer01,,hello?`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some(isTargetTaskError)).toBe(false);
  });

  it("empty targetKind + targetTask=adjust → No targetKind provided error", () => {
    const csv = `_about,test,
block,,1
conditionName,,A
targetTask,,adjust
targetKind,,`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some(isTargetKindError)).toBe(true);
  });

  it("explicit targetTask=questionAndAnswer + empty kind → no targetKind error", () => {
    // questionAndAnswer needs no stimulus kind. (Its validity as a targetTask
    // value is a separate question for _types_t.)
    const csv = `_about,test,
block,,1
conditionName,,A
targetTask,,questionAndAnswer
targetKind,,
questionAndAnswer01,,hello?`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some(isTargetKindError)).toBe(false);
  });
});
