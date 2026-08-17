/**
 * @jest-environment node
 *
 * Leading/trailing whitespace in a column-A parameter name is invisible in
 * error messages and previously produced baffling cascades ("Parameters
 * aren't alphabetical", "Parameter is unrecognized", "Non-underscore
 * parameters provided in underscore parameter column"). Parameter names are
 * identifiers — whitespace around them is never meaningful — so the compiler
 * trims them once, at the parse boundary, before any check or raw row scan
 * runs.
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";
import { isBlockPresentAndProper } from "../preprocess/experimentFileChecks";
import {
  dataframeFromPapaParsed,
  getDesiredSamplingRate,
  trimParameterNames,
} from "../preprocess/utils";

beforeAll(async () => {
  await loadGlossaryForTests();
});

const parseRows = (csv: string): string[][] =>
  Papa.parse(csv, { skipEmptyLines: true }).data as string[][];

describe("trimParameterNames", () => {
  it("trims leading and trailing spaces, tabs, and NBSP from parameter names", () => {
    const rows = parseRows(
      " block,,1\n\tconditionName\t,,condA\n _language ,en,",
    );
    trimParameterNames(rows);
    expect(rows[0][0]).toBe("block");
    expect(rows[1][0]).toBe("conditionName");
    expect(rows[2][0]).toBe("_language");
  });

  it("strips invisible characters (ZWSP, BOM…) from the ENDS of parameter names", () => {
    const rows = parseRows(
      "\u200Bblock,,1\n\uFEFF_language\u200B,en,\n\u200DtargetKind\u200C,,letter",
    );
    trimParameterNames(rows);
    expect(rows[0][0]).toBe("block");
    expect(rows[1][0]).toBe("_language");
    expect(rows[2][0]).toBe("targetKind");
  });

  it("never strips invisible characters from the MIDDLE of a name", () => {
    // A hidden character inside a name makes it a genuinely different
    // identifier; stripping it would silently merge two names. Interior
    // cases are surfaced by the "Parameter is unrecognized" check instead.
    const rows = parseRows("blo\u200Bck,,1\ntarg\u200DetKind,,letter");
    trimParameterNames(rows);
    expect(rows[0][0]).toBe("blo\u200Bck");
    expect(rows[1][0]).toBe("targ\u200DetKind");
  });

  it("never touches value cells — ZWNJ in a value is legitimate", () => {
    // Persian/Arabic text uses ZWNJ (U+200C) meaningfully; only column A
    // parameter names are identifiers.
    const rows = parseRows("targetCharacter,\u200C\u0645,\u200C\u0645");
    trimParameterNames(rows);
    expect(rows[0][1]).toBe("\u200C\u0645");
    expect(rows[0][2]).toBe("\u200C\u0645");
  });

  it("a name made only of invisible characters becomes empty", () => {
    const rows = parseRows("\u200B\u200D,,1");
    trimParameterNames(rows);
    expect(rows[0][0]).toBe("");
  });

  it("does not touch value cells", () => {
    const rows = parseRows("targetKind, letter ,word");
    trimParameterNames(rows);
    expect(rows[0][1]).toBe(" letter ");
    expect(rows[0][2]).toBe("word");
  });

  it("leaves rows with empty column A alone", () => {
    const rows: string[][] = [[""], ["block", "", "1"]];
    trimParameterNames(rows);
    expect(rows[0][0]).toBe("");
  });

  it("returns the rows for chaining", () => {
    const rows = parseRows("block,,1");
    expect(trimParameterNames(rows)).toBe(rows);
  });
});

describe("whitespace-padded parameter names downstream", () => {
  it("block row with leading space is still found by isBlockPresentAndProper", () => {
    // Simulates the compiler pipeline: boundary trim, then dataframe checks.
    const parsed = Papa.parse(" block,,1,1\nconditionName,,a,b", {
      skipEmptyLines: true,
    });
    trimParameterNames(parsed.data as string[][]);
    const errors = isBlockPresentAndProper(dataframeFromPapaParsed(parsed));
    expect(errors).toHaveLength(0);
  });

  it("raw row scans find trimmed parameter names", () => {
    const parsed = Papa.parse(" _calibrateSoundSamplingDesiredHz,22050", {
      skipEmptyLines: true,
    });
    trimParameterNames(parsed.data as string[][]);
    expect(getDesiredSamplingRate(parsed)).toBe("22050");
  });

  it("leading-space _pavloviaNewExperimentBool produces no validation errors", () => {
    const csv = ` _pavloviaNewExperimentBool,TRUE,
block,,1,1
conditionName,,condA,condB
targetKind,,letter,letter`;
    const p = Papa.parse(csv, { skipEmptyLines: true });
    trimParameterNames(p.data as string[][]);
    const t = new ExperimentTable(p.data as readonly (readonly string[])[]);
    const errors = validateExperimentTable(t);
    const names = errors.map((e) => e.name);
    expect(names).not.toContain("Parameter is unrecognized");
    expect(names).not.toContain("Parameters aren't alphabetical");
    expect(names).not.toContain(
      "Non-underscore parameters provided in underscore parameter column",
    );
  });

  it("trimmed names flow into the map used to generate block CSVs", () => {
    const csv = ` _pavloviaNewExperimentBool,TRUE,
block,,1
 targetKind,,letter`;
    const p = Papa.parse(csv, { skipEmptyLines: true });
    trimParameterNames(p.data as string[][]);
    const t = new ExperimentTable(p.data as readonly (readonly string[])[]);
    // _tableToNormalizedDf (main.ts) builds the block-file dataframe from
    // this map; its keys become the block CSV header read by the runtime.
    const keys = [...t.toParamValuesMap().keys()];
    expect(keys).toContain("_pavloviaNewExperimentBool");
    expect(keys).toContain("targetKind");
    expect(keys.every((k) => k === k.trim())).toBe(true);
  });

  it("duplicates created by trimming are still flagged, not silently merged", () => {
    const csv = `block,,1,1
conditionName,,condA,condB
 targetKind,,letter,letter
targetKind,,letter,letter`;
    const p = Papa.parse(csv, { skipEmptyLines: true });
    trimParameterNames(p.data as string[][]);
    const t = new ExperimentTable(p.data as readonly (readonly string[])[]);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.name.includes("duplicated"))).toBe(true);
  });

  it("duplicates created by stripping invisible characters are still flagged", () => {
    const csv = `block,,1,1\nconditionName,,condA,condB\ntargetKind,,letter,letter\n\u200BtargetKind,,letter,letter`;
    const p = Papa.parse(csv, { skipEmptyLines: true });
    trimParameterNames(p.data as string[][]);
    const t = new ExperimentTable(p.data as readonly (readonly string[])[]);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.name === "Parameter is duplicated")).toBe(true);
  });

  it("hidden-character twin of a valid parameter raises no unrecognized error (direct construction)", () => {
    // ExperimentTable must normalize on its own too: some callers construct
    // it straight from PapaParse without the pipeline's trim step.
    const csv = `block,,1\nconditionName,,A\n\u200BtargetKind,,letter`;
    const p = Papa.parse(csv, { skipEmptyLines: true });
    const t = new ExperimentTable(p.data as readonly (readonly string[])[]);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.name === "Parameter is unrecognized")).toBe(
      false,
    );
    // And the param is READ as its clean self
    expect(t.effectiveValue("targetKind", 0)).toBe("letter");
  });

  it("trim-created duplicate underscore param: non-surviving instance's col B still type-checked", () => {
    // The LAST row of a name wins (ExperimentTable._rows), so the bad value
    // below is in the non-surviving row. If only the surviving instance were
    // type-checked, NOTABOOL would vanish silently.
    const csv = `block,,1,1
conditionName,,condA,condB
targetKind,,letter,letter
_pavloviaNewExperimentBool,NOTABOOL,
 _pavloviaNewExperimentBool,TRUE,`;
    const p = Papa.parse(csv, { skipEmptyLines: true });
    trimParameterNames(p.data as string[][]);
    const t = new ExperimentTable(p.data as readonly (readonly string[])[]);
    const errors = validateExperimentTable(t);
    expect(errors.some((e) => e.name === "Parameter is duplicated")).toBe(true);
    const typeError = errors.find(
      (e) => e.name === "Parameter contains values of the wrong type",
    );
    expect(typeError).toBeDefined();
    // Surviving instance's col B is TRUE, so NOTABOOL in the hint proves
    // the NON-surviving (first) row was checked too.
    expect(typeError!.hint).toContain("NOTABOOL");
  });
});
