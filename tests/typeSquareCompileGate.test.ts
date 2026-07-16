/**
 * Compile-time gate for fontSource=typeSquare (EXPANDED 2026-07-15).
 *
 * typeSquare support is gated behind _typeSquareDistributionKey (a pending
 * glossary add). Until that param exists, ANY condition with
 * fontSource=typeSquare is rejected at compile time — not just conditions
 * that also use fontFeatureSettings/fontVariableSettings/fontStylisticSets.
 *
 * This test exercises the new `_typeSquareGate_t` validator. Once the param
 * is added, the gate flips to a CONDITIONAL check (key required iff
 * typeSquare used).
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

function parse(csv: string): ExperimentTable {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  return new ExperimentTable(p.data as readonly (readonly string[])[]);
}

const baseCsv = `_about,test,,
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

describe("_typeSquareGate_t (compile-time gate for fontSource=typeSquare)", () => {
  it("no typeSquare conditions → no gate error", () => {
    const t = parse(baseCsv);
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("typeSquare support is in progress"),
    );
    expect(errs).toHaveLength(0);
  });

  it("any fontSource=typeSquare condition → gate error (regardless of other settings)", () => {
    // CRITICAL: even WITHOUT fontFeatureSettings / fontVariableSettings /
    // fontStylisticSets, the gate must fire. This is the EXPANDED gate
    // (per user 2026-07-15).
    const t = parse(baseCsv + "\nfontSource,,google,typeSquare");
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("typeSquare support is in progress"),
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0].kind).toBe("error");
    expect(errs[0].parameters).toEqual(["fontSource"]);
    // The message tells the experimenter what to do.
    expect(errs[0].message).toMatch(/fontSource=file/);
  });

  it("fontSource=typeSquare WITH fontFeatureSettings → gate error (no special case)", () => {
    const t = parse(
      baseCsv +
        '\nfontSource,,google,typeSquare\nfontFeatureSettings,,"calt" 1,"calt" 1',
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("typeSquare support is in progress"),
    );
    expect(errs.length).toBeGreaterThan(0);
  });

  it("multiple typeSquare conditions → single consolidated error (all errors at once principle)", () => {
    const t = parse(
      `_about,test,,,,
block,,1,1,1
conditionName,,A,B,C
conditionTrials,,10,10,10
conditionEnabledBool,,TRUE,TRUE,TRUE
responseClickedBool,,TRUE,TRUE,TRUE
responseTypedBool,,TRUE,TRUE,TRUE
targetKind,,letter,letter,letter
targetTask,,identify,identify,identify
thresholdParameter,,targetSizeDeg,targetSizeDeg,targetSizeDeg
font,,Roboto Mono,Roboto Mono,Roboto Mono
fontSource,,typeSquare,typeSquare,typeSquare`,
    );
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("typeSquare support is in progress"),
    );
    // All three offenders reported in a single error (all-errors-at-once
    // principle from AGENTS.md).
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toMatch(/Affected blocks:\s*1,\s*2,\s*3/);
  });

  it("non-typeSquare values → no gate error", () => {
    const t = parse(baseCsv + "\nfontSource,,adobe,browser");
    const errs = validateExperimentTable(t).filter((e) =>
      e.name.includes("typeSquare support is in progress"),
    );
    expect(errs).toHaveLength(0);
  });
});
