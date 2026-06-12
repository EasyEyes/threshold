/**
 * @jest-environment node
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/experimentFileChecks";
import {
  DUPLICATE_PARAMETER,
  INCORRECT_PARAMETER_TYPE,
} from "../preprocess/errorMessages";
import type { EasyEyesError } from "../preprocess/errorMessages";

function parse(csv: string): ExperimentTable {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  return new ExperimentTable(p.data as readonly (readonly string[])[]);
}

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("duplicate param detection", () => {
  it("flags DUPLICATE_PARAMETER for duplicated param", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,condA,condA
block,,1,1`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    const dupErr = errors.find((e) => e.name.includes("duplicated"));
    expect(dupErr).toBeDefined();
    expect(dupErr!.parameters).toContain("block");
  });

  it("does not flag non-duplicated params", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,condA,condB`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    const dupErrs = errors.filter((e) => e.name.includes("duplicated"));
    expect(dupErrs).toHaveLength(0);
  });

  it("flags DUPLICATE + TYPE_ERROR for duplicate underscore with mismatching types", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,condA,condB
_language,English,,
_language,NotEnglish,,`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.name.includes("duplicated"))).toBe(true);
    expect(errors.some((e) => e.name.includes("type"))).toBe(true);
  });

  it("does not crash on duplicate underscore param", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,condA,condB
conditionTrials,4,,
conditionTrials,NotANumber,,`;
    const t = parse(csv);
    // Should not crash (may or may not have type errors depending on glossary)
    expect(() => validateExperimentTable(t)).not.toThrow();
  });

  it("type-checks ALL instances of duplicate underscore params (not just last)", () => {
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "condA", "condB"],
      ["_needBrowser", "Chrome", "", ""],
      ["_needBrowser", "Firefox", "", ""],
    ]);
    const errors = validateExperimentTable(t);
    // _needBrowser is categorical, so Chrome and Firefox are both valid categories.
    // Type check on ALL instances should pass (no type error for valid categories).
    const typeErrs = errors.filter(
      (e) => e.name.includes("type") && e.parameters.includes("_needBrowser"),
    );
    expect(typeErrs.length).toBe(0);
    // But duplicate should be flagged
    const dupErrs = errors.filter(
      (e) =>
        e.name.includes("duplicated") && e.parameters.includes("_needBrowser"),
    );
    expect(dupErrs.length).toBeGreaterThan(0);
  });

  it("reports multiple duplicates simultaneously", () => {
    const csv = `_about,test,,
block,,1,1
conditionName,,condA,condA
block,,1,1
conditionName,,condB,condB`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    const dupErrs = errors.filter((e) => e.name.includes("duplicated"));
    expect(dupErrs.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps last instance when deduplicating (last colB wins)", () => {
    const t = new ExperimentTable([
      ["_foo", "first", "", ""],
      ["_foo", "last", "", ""],
    ]);
    // colB returns the LAST instance (current DF behavior)
    expect(t.colB("_foo")).toBe("last");
  });
});
