/**
 * fontFeatureSettings compiler validation — RED tests.
 *
 * Architectural requirement (per spec): typos and non-existent feature tags
 * MUST be caught at COMPILE TIME and reported clearly. The runtime Rust bake
 * must never receive an invalid string.
 *
 * Mirrors the compilerPipeline.test.ts harness: load real glossary, parse a
 * minimal CSV, run validateExperimentTable, assert on the returned error names.
 * @jest-environment node
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/experimentFileChecks";
import { validateFeatureSettingsString } from "../preprocess/opentypeFeatures";
import type { EasyEyesError } from "../preprocess/errorMessages";

function parse(csv: string): ExperimentTable {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  return new ExperimentTable(p.data as readonly (readonly string[])[]);
}

/** Quote a raw cell value for CSV if it contains a comma or quote. */
function csvField(raw: string): string {
  if (raw.includes(",") || raw.includes('"')) {
    return '"' + raw.replace(/"/g, '""') + '"';
  }
  return raw;
}

beforeAll(async () => {
  await loadGlossaryForTests();
});

/** Build a minimal valid experiment table that sets fontFeatureSettings. */
function table(featureValues: string[]): ExperimentTable {
  // col B (underscore default) left blank; values go in condition cols C..
  const csv = `_about,test,${featureValues.length > 1 ? "," : ""}
block,,1,1
conditionName,,A,B
fontFeatureSettings,,${featureValues.map(csvField).join(",")}`;
  return parse(csv);
}

function featureErrors(t: ExperimentTable): EasyEyesError[] {
  return validateExperimentTable(t).filter((e) =>
    e.parameters.includes("fontFeatureSettings"),
  );
}

describe("validateExperimentTable — fontFeatureSettings compile-time validation", () => {
  it("passes a valid single feature", () => {
    const t = table(['"calt" 1', ""]);
    expect(featureErrors(t)).toHaveLength(0);
  });

  it("passes a valid feature without an explicit value (defaults to on)", () => {
    const t = table(['"smcp"', ""]);
    expect(featureErrors(t)).toHaveLength(0);
  });

  it("passes an unquoted tag (lenient, like CSS)", () => {
    const t = table(["liga 1", ""]);
    expect(featureErrors(t)).toHaveLength(0);
  });

  it("passes a comma-separated list of valid features", () => {
    const t = table(['"calt" 1, "smcp", "zero"', ""]);
    expect(featureErrors(t)).toHaveLength(0);
  });

  it("passes stylistic-set and character-variant tags (generated ranges)", () => {
    const t = table(['"ss01", "cv05" 1', ""]);
    expect(featureErrors(t)).toHaveLength(0);
  });

  it("passes a value of on/off", () => {
    const t = table(['"dlig" on, "liga" off', ""]);
    expect(featureErrors(t)).toHaveLength(0);
  });

  it("passes an empty string (default, no-op)", () => {
    const t = table(["", ""]);
    expect(featureErrors(t)).toHaveLength(0);
  });

  // --- RED: typos & unknown tags must be compile errors ---

  it("rejects a typo (liag) and suggests the closest registered tag (liga)", () => {
    const t = table(['"liag"', ""]);
    const errs = featureErrors(t);
    expect(errs).toHaveLength(1);
    expect(errs[0].kind).toBe("error");
    // hint should name the offending tag and suggest 'liga'
    expect(errs[0].hint.toLowerCase()).toContain("liag");
    expect(errs[0].hint.toLowerCase()).toContain("liga");
  });

  it("rejects an unknown (non-existent) tag", () => {
    const t = table(['"zzzz"', ""]);
    const errs = featureErrors(t);
    expect(errs).toHaveLength(1);
    expect(errs[0].kind).toBe("error");
  });

  it("rejects a malformed tag (too many characters)", () => {
    const t = table(['"ligaa"', ""]); // 5 chars
    const errs = featureErrors(t);
    expect(errs).toHaveLength(1);
    expect(errs[0].kind).toBe("error");
  });

  it("rejects a malformed tag (illegal characters)", () => {
    const t = table(['"li@g"', ""]);
    const errs = featureErrors(t);
    expect(errs).toHaveLength(1);
    expect(errs[0].kind).toBe("error");
  });

  it("rejects a bad value (non-integer / non on-off)", () => {
    const t = table(['"calt" 2.5', ""]);
    const errs = featureErrors(t);
    expect(errs).toHaveLength(1);
    expect(errs[0].kind).toBe("error");
  });

  it("reports ALL bad tags in a single cell in one error", () => {
    const t = table(['"liag", "zzzz", "calt" 2.5', ""]);
    const errs = featureErrors(t);
    expect(errs).toHaveLength(1);
    // the single error should mention every bad tag
    expect(errs[0].hint.toLowerCase()).toContain("liag");
    expect(errs[0].hint.toLowerCase()).toContain("zzzz");
    expect(errs[0].hint.toLowerCase()).toContain("calt"); // calt valid, but 2.5 is a bad value
  });

  it("reports bad tags across MULTIPLE conditions in one error", () => {
    const t = table(['"liag"', '"zzzz"']);
    const errs = featureErrors(t);
    expect(errs).toHaveLength(1);
    expect(errs[0].hint.toLowerCase()).toContain("liag");
    expect(errs[0].hint.toLowerCase()).toContain("zzzz");
  });

  it("labels columns with spreadsheet letters (precedent: fontLanguage)", () => {
    // condition 0 -> column C, condition 1 -> column D
    const t = table(['"liag"', '"zzzz"']);
    const errs = featureErrors(t);
    expect(errs[0].hint).toContain("column C");
    expect(errs[0].hint).toContain("column D");
    expect(errs[0].hint).not.toContain("column 1");
  });

  it("does not reject a valid feature alongside the glossary default (blank condition)", () => {
    // condition C valid, condition D blank (uses glossary default "")
    const t = table(['"dlig" 1', ""]);
    expect(featureErrors(t)).toHaveLength(0);
  });
});

describe("validateFeatureSettingsString — pure unit validation", () => {
  it("returns no offenders for valid strings", () => {
    expect(validateFeatureSettingsString('"calt" 1')).toHaveLength(0);
    expect(validateFeatureSettingsString("smcp")).toHaveLength(0);
    expect(validateFeatureSettingsString('"ss01", "cv05" 1')).toHaveLength(0);
    expect(validateFeatureSettingsString("")).toHaveLength(0);
  });

  it("accepts CSS 'normal' keyword as a no-op (same as empty)", () => {
    expect(validateFeatureSettingsString("normal")).toHaveLength(0);
    expect(validateFeatureSettingsString('"normal"')).toHaveLength(0);
    expect(validateFeatureSettingsString("  normal  ")).toHaveLength(0);
  });

  it("flags an unknown tag with a suggestion", () => {
    const o = validateFeatureSettingsString('"liag"');
    expect(o).toHaveLength(1);
    expect(o[0].reason).toBe("unknown-tag");
    expect(o[0].suggestion).toBe("liga");
  });

  it("flags a malformed tag (length)", () => {
    const o = validateFeatureSettingsString('"ligaa"');
    expect(o).toHaveLength(1);
    expect(o[0].reason).toBe("malformed-tag");
  });

  it("flags a bad value", () => {
    const o = validateFeatureSettingsString('"calt" x');
    expect(o).toHaveLength(1);
    expect(o[0].reason).toBe("bad-value");
  });

  it("reports multiple offenders from one string", () => {
    const o = validateFeatureSettingsString('"liag", "zzzz"');
    expect(o).toHaveLength(2);
  });
});
