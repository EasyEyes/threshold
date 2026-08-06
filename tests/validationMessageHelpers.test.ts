import {
  makeCaution,
  makeError,
  param,
  columnsHint,
  valueAtColumn,
  valuesAtColumns,
} from "../preprocess/validateExperimentTable";

describe("validation message helpers", () => {
  it("param wraps name in the error-parameter span", () => {
    expect(param("targetKind")).toBe(
      `<span class="error-parameter">targetKind</span>`,
    );
  });

  it("makeError fills kind/context defaults and passes fields through", () => {
    expect(
      makeError({
        name: "N",
        message: "M",
        hint: "H",
        parameters: ["a", "b"],
      }),
    ).toEqual({
      name: "N",
      kind: "error",
      context: "preprocessor",
      message: "M",
      hint: "H",
      parameters: ["a", "b"],
    });
  });

  it("makeCaution uses kind warning", () => {
    expect(
      makeCaution({ name: "N", message: "M", hint: "H", parameters: [] }).kind,
    ).toBe("warning");
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
    expect(valueAtColumn("abc", 0)).toBe("abc (column C)");
    expect(valueAtColumn(5.1, 2)).toBe("5.1 (column E)");
  });

  it("valuesAtColumns enumerates value/column pairs", () => {
    expect(
      valuesAtColumns([
        ["abc", 0],
        ["5", 2],
      ]),
    ).toBe("abc (column C) and 5 (column E)");
  });
});
