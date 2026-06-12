/**
 * Regression tests for bugs found and fixed during ExperimentTable migration.
 *
 * @jest-environment node
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/experimentFileChecks";

beforeAll(async () => {
  await loadGlossaryForTests();
});

// ============================================================================
// Regression: colBBool default fallback
// ============================================================================

function tableFrom(csv: string): ExperimentTable {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  return new ExperimentTable(p.data as readonly (readonly string[])[]);
}

describe("colBBool glossary default fallback", () => {
  it("colBBool returns glossary default (TRUE) when param absent", () => {
    const t = tableFrom("_about,test,,\nblock,,1,1");
    expect(t.colBBool("_pavloviaPreferRunningModeBool")).toBe(true);
  });

  it("colBBool returns false when param is present and FALSE", () => {
    const t = tableFrom(
      "_about,test,,\nblock,,1,1\n_pavloviaPreferRunningModeBool,FALSE,,",
    );
    expect(t.colBBool("_pavloviaPreferRunningModeBool")).toBe(false);
  });

  it("colBBool returns true when param is present and TRUE", () => {
    const t = tableFrom(
      "_about,test,,\nblock,,1,1\n_pavloviaPreferRunningModeBool,TRUE,,",
    );
    expect(t.colBBool("_pavloviaPreferRunningModeBool")).toBe(true);
  });
});

// ============================================================================
// Regression: vernier/targetOffsetDeg collects all mismatches
// ============================================================================

function parse(csv: string): ExperimentTable {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  return new ExperimentTable(p.data as readonly (readonly string[])[]);
}

describe("vernier/targetOffsetDeg all-mismatch collection", () => {
  it("reports both errors when two conditions have mismatches", () => {
    const csv = `_about,test,,,
block,,1,1,1
conditionName,,A,B,C
targetKind,,vernier,letter,letter
thresholdParameter,,spacingDeg,spacingDeg,targetOffsetDeg`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    // Condition 0: vernier + spacingDeg
    // Condition 2: letter  + targetOffsetDeg
    expect(errors.filter((e) => e.name.includes("unsupported")).length).toBe(2);
  });

  it("reports no errors when all conditions are consistent", () => {
    const csv = `_about,test,,,
block,,1,1,1
conditionName,,A,B,C
targetKind,,vernier,letter,letter
thresholdParameter,,targetOffsetDeg,spacingDeg,spacingDeg`;
    const t = parse(csv);
    const errors = validateExperimentTable(t);
    expect(errors.filter((e) => e.name.includes("unsupported"))).toHaveLength(
      0,
    );
  });
});
