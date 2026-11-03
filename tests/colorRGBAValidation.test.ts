/** @jest-environment node */

import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { getGlossary } from "../parameters/glossaryRegistry";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";

const ERROR_NAME = "ColorRGBA component out of range";
const STANDALONE = [
  "fontColorRGBA",
  "instructionFontColorRGBA",
  "markDotColorRGBA",
  "markFliesColorRGBA",
  "markingColorRGBA",
  "screenColorRGBA",
  "targetColorRGBA",
];

const table = (rows: readonly (readonly string[])[]): ExperimentTable =>
  new ExperimentTable([
    ["_about", "RGBA range test"],
    ["block", "", ...rows[0].slice(2).map(() => "1")],
    ["conditionName", "", ...rows[0].slice(2).map((_, i) => `C${i}`)],
    ...rows,
  ]);

const one = (name: string, value: string): ExperimentTable =>
  table([[name, "", value]]);

const rangeErrors = (t: ExperimentTable) =>
  validateExperimentTable(t).filter((error) => error.name === ERROR_NAME);

beforeAll(async () => loadGlossaryForTests());

describe("ColorRGBA compiler range validation", () => {
  test("coverage includes every glossary parameter whose name ends in ColorRGBA", () => {
    expect(getGlossary()["markDotColorRGBA"].type).toBe("4*numerical");
    expect(getGlossary()["markDotXYDeg"].type).toBe("2*numerical");
    expect(
      Object.keys(getGlossary())
        .filter((name) => name.endsWith("ColorRGBA"))
        .sort(),
    ).toEqual(STANDALONE);
  });

  test.each(STANDALONE)(
    "%s accepts endpoint and intermediate values",
    (name) => {
      expect(rangeErrors(one(name, "0, 1, 0.5, 1"))).toEqual([]);
    },
  );

  test.each(STANDALONE)("%s rejects values below 0 and above 1", (name) => {
    const errors = rangeErrors(
      table([[name, "", "-0.01,0,0,1", "0,0,0,1.01"]]),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].parameters).toEqual([name]);
    expect(errors[0].hint).toContain("column C");
    expect(errors[0].hint).toContain("column D");
  });

  test.each([
    ["R", "1.2,0,0,1"],
    ["G", "0,-0.2,0,1"],
    ["B", "0,0,2,1"],
    ["A", "0,0,0,-1"],
  ])(
    "markDotColorRGBA rejects an out-of-range %s channel",
    (channel, value) => {
      const errors = rangeErrors(one("markDotColorRGBA", value));
      expect(errors).toHaveLength(1);
      expect(errors[0].hint).toContain(channel);
    },
  );

  test.each(["NaN,0,0,1", "Infinity,0,0,1", "0,0,0,-Infinity"])(
    "markDotColorRGBA rejects non-finite component %s",
    (value) => {
      expect(rangeErrors(one("markDotColorRGBA", value))).toHaveLength(1);
    },
  );

  test("malformed vector values produce the type error, not a duplicate range error", () => {
    const errors = validateExperimentTable(one("markDotColorRGBA", "red"));
    expect(errors.some((e) => e.name === ERROR_NAME)).toBe(false);
    expect(
      errors.some(
        (e) =>
          e.name === "Parameter contains values of the wrong type" &&
          e.parameters.includes("markDotColorRGBA"),
      ),
    ).toBe(true);
  });

  test.each([
    "fontColorRGBA",
    "instructionFontColorRGBA",
    "markingColorRGBA",
    "screenColorRGBA",
    "targetColorRGBA",
  ])(
    "%s reports an out-of-range component even when alpha is missing",
    (name) => {
      const errors = rangeErrors(one(name, "2,0,0"));
      expect(errors).toHaveLength(1);
      expect(errors[0].hint).toContain("R=2");
    },
  );

  test("vector type and range errors are both reported in one pass", () => {
    const t = one("markDotColorRGBA", "2,0,0");
    const allErrors = validateExperimentTable(t);
    expect(
      allErrors.some(
        (e) =>
          e.name === "Parameter contains values of the wrong type" &&
          e.parameters.includes("markDotColorRGBA"),
      ),
    ).toBe(true);
    expect(rangeErrors(t)).toHaveLength(1);
  });

  test("a non-numeric component does not hide another component's range error", () => {
    const errors = rangeErrors(one("fontColorRGBA", "0,2,banana,1"));
    expect(errors).toHaveLength(1);
    expect(errors[0].hint).toContain("G=2");
    expect(errors[0].hint).not.toContain("banana (column");
  });

  test("legacy count and range errors are both reported in one pass", () => {
    const t = one("markDot", "1,-2,0.3,0,0,2");
    const allErrors = validateExperimentTable(t);
    expect(
      allErrors.some((e) =>
        /comma-separated string of the incorrect length/i.test(e.name),
      ),
    ).toBe(true);
    const colorErrors = rangeErrors(t);
    expect(colorErrors).toHaveLength(1);
    expect(colorErrors[0].hint).toContain("B=2");
  });

  test.each([
    ["markDot", "1,-2,0.3,0,0,0,1.2"],
    ["markGrid", "0.5,0.05,1,0,0,0,-0.1"],
    ["markFlies", "3,1,0.4,TRUE,0.05,2,0,0,1,2"],
  ])("legacy %s validates its embedded RGBA fields", (name, value) => {
    const errors = rangeErrors(one(name, value));
    expect(errors).toHaveLength(1);
    expect(errors[0].parameters).toEqual([name]);
  });

  test.each([
    ["markDot", "1,-2,0.3,0,0,0,1"],
    ["markGrid", "0.5,0.05,1,0,0,0,1"],
    ["markFlies", "3,1,0.4,TRUE,0.05,2,0,0,1,1"],
  ])("legacy %s accepts an in-range embedded RGBA", (name, value) => {
    expect(rangeErrors(one(name, value))).toEqual([]);
  });

  test("checks every duplicate row, including the shadowed instance", () => {
    const t = table([
      ["fontColorRGBA", "", "0,0,0,1"],
      ["fontColorRGBA", "", "0,0,0,2"],
    ]);
    expect(rangeErrors(t)).toHaveLength(1);
  });

  test("reports all color parameters in one validation pass", () => {
    const errors = rangeErrors(
      table([
        ["fontColorRGBA", "", "0,0,0,2"],
        ["targetColorRGBA", "", "-1,0,0,1"],
      ]),
    );
    expect(errors.map((e) => e.parameters[0]).sort()).toEqual([
      "fontColorRGBA",
      "targetColorRGBA",
    ]);
  });
});
