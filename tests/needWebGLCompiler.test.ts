/**
 * Compiler-side validation of _needWebGL (type `text` in the glossary, so
 * the generic type check accepts anything): when provided, the cell must be
 * three comma-separated numbers — version, textureSize, portSize. A
 * malformed value silently falls back to the defaults at runtime, which the
 * compiler must catch up front (all errors at once).
 *
 * @jest-environment node
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";

function parse(csv: string): ExperimentTable {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  return new ExperimentTable(p.data as readonly (readonly string[])[]);
}

const tableWith = (webgl?: string) =>
  parse(`_about,test,,
_needWebGL,${webgl ? `"${webgl}"` : ""},,
block,,1,1
conditionName,,condA,condA
conditionTrials,,4,4`);

const webglErrors = (t: ExperimentTable) =>
  validateExperimentTable(t).filter(
    (e) => e.name.includes("_needWebGL") || e.parameters.includes("_needWebGL"),
  );

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("_needWebGL compiler validation", () => {
  it("accepts three numbers (the defaults)", () => {
    expect(webglErrors(tableWith("2, 8192, 16384"))).toHaveLength(0);
  });

  it("accepts other numeric triples and internal whitespace", () => {
    expect(webglErrors(tableWith("1, 16384,32768"))).toHaveLength(0);
    expect(webglErrors(tableWith("3,100, 200"))).toHaveLength(0);
  });

  it("accepts an empty cell (glossary defaults apply)", () => {
    expect(webglErrors(tableWith())).toHaveLength(0);
  });

  it("flags a non-numeric token", () => {
    const errs = webglErrors(tableWith("2, eight, 16384"));
    expect(errs).toHaveLength(1);
    expect(errs[0].parameters).toContain("_needWebGL");
    expect(errs[0].hint).toMatch(/eight/);
  });

  it("flags the wrong count", () => {
    expect(webglErrors(tableWith("2, 8192"))).toHaveLength(1);
    expect(webglErrors(tableWith("2, 8192, 16384, 999"))).toHaveLength(1);
  });

  it("flags a fully malformed cell", () => {
    expect(webglErrors(tableWith("fast graphics"))).toHaveLength(1);
  });
});
