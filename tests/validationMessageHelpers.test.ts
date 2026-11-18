import {
  columnsHint,
  valueAtColumn,
  valuesAtColumns,
} from "../preprocess/validateExperimentTable";
import { makeAlert } from "../preprocess/alerts";
import { alertParameter, alertValue } from "../preprocess/alertHtml";

describe("validation message helpers", () => {
  it("alertParameter wraps a name in the standard span", () => {
    expect(alertParameter("targetKind")).toBe(
      `<span class="alert-parameter">targetKind</span>`,
    );
  });

  it("makeAlert supplies defaults without boilerplate", () => {
    expect(makeAlert({ name: "N" })).toEqual({
      name: "N",
      kind: "error",
      context: "preprocessor",
      message: "",
      hint: "",
      parameters: [],
    });
  });

  it("makeAlert accepts kind and context overrides", () => {
    expect(
      makeAlert({ name: "N", kind: "warning", context: "media" }),
    ).toMatchObject({ kind: "warning", context: "media" });
  });

  it("columnsHint singular", () => {
    expect(columnsHint([0])).toBe("Check column C");
  });

  it("columnsHint plural pair", () => {
    expect(columnsHint([0, 1])).toBe("Check columns C and D");
  });

  it("columnsHint three columns", () => {
    expect(columnsHint([0, 1, 2])).toBe("Check columns C, D, and E");
  });

  it("valueAtColumn reports value with column letter", () => {
    expect(valueAtColumn("abc", 0)).toBe(`${alertValue("abc")} (column C)`);
    expect(valueAtColumn(5.1, 2)).toBe(`${alertValue(5.1)} (column E)`);
  });

  it("valuesAtColumns enumerates value/column pairs", () => {
    expect(
      valuesAtColumns([
        ["abc", 0],
        ["5", 2],
      ]),
    ).toBe(`${alertValue("abc")} (column C) and ${alertValue(5)} (column E)`);
  });
});
