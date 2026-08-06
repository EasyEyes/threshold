/**
 * @jest-environment node
 *
 * Compiler support for vector and matrix parameter types, e.g.
 *   *numerical      comma-separated list of numbers, any nonzero length
 *   2*integer       comma-separated list of exactly 2 integers
 *   2x2*numerical   matrix: 2 rows, 2 columns, e.g. "1,2;3,4"
 *   x*numerical     matrix of any (rectangular) shape
 */
import {
  parseVectorType,
  isVectorType,
  checkVectorValue,
  describeVectorType,
} from "../preprocess/vectors";
import { getGlossary } from "../parameters/glossaryRegistry";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("parseVectorType: vector specifiers", () => {
  it.each(["*numerical", "*integer", "2*numerical", "2*integer", "12*integer"])(
    "accepts %s",
    (type) => {
      expect(isVectorType(type)).toBe(true);
    },
  );

  it("parses length and element type", () => {
    const spec = parseVectorType("2*integer");
    expect(spec).toMatchObject({
      shape: "vector",
      elementType: "integer",
      length: 2,
    });
  });

  it("parses unspecified length", () => {
    const spec = parseVectorType("*numerical");
    expect(spec).toMatchObject({ shape: "vector", elementType: "numerical" });
    expect(spec!.length).toBeUndefined();
  });

  it.each([
    "numerical", // plain scalar type, not a vector type
    "integer",
    "text",
    "2*float", // unrecognized element type
    "2*Numerical", // case-sensitive type keyword
    "0*numerical", // zero length
    "-2*numerical", // negative length
    "2.0*numerical", // non-integer length literal
    "02*numerical", // leading zero
    "2 *numerical", // spaces not allowed
    "2* numerical",
    "2 * numerical",
    "2*numerical ", // trailing space
    "2,2*numerical", // commas not allowed
    "2**numerical",
    "*",
    "2*",
    "",
  ])("rejects %s", (type) => {
    expect(isVectorType(type)).toBe(false);
    expect(parseVectorType(type)).toBeNull();
  });
});

describe("parseVectorType: matrix specifiers", () => {
  it.each([
    "2x2*numerical",
    "1x1*integer",
    "12x3*numerical",
    "2x*numerical", // fixed rows, any columns
    "x3*integer", // any rows, fixed columns
    "x*numerical", // any rectangular matrix
  ])("accepts %s", (type) => {
    expect(isVectorType(type)).toBe(true);
  });

  it("parses rows and columns", () => {
    expect(parseVectorType("2x2*numerical")).toMatchObject({
      shape: "matrix",
      elementType: "numerical",
      rows: 2,
      cols: 2,
    });
    const r = parseVectorType("2x*integer");
    expect(r).toMatchObject({ shape: "matrix", rows: 2 });
    expect(r!.cols).toBeUndefined();
    const c = parseVectorType("x3*numerical");
    expect(c).toMatchObject({ shape: "matrix", cols: 3 });
    expect(c!.rows).toBeUndefined();
  });

  it.each([
    "0x2*numerical", // zero rows
    "2x0*numerical", // zero columns
    "-2x2*numerical",
    "2x2x2*numerical", // 3D not supported
    "2 x2*numerical", // spaces
    "2x 2*numerical",
    "2,2x3*numerical", // commas
    "2x2*float",
    "x*numerical ", // trailing space
  ])("rejects %s", (type) => {
    expect(isVectorType(type)).toBe(false);
  });
});

describe("checkVectorValue: legal numbers", () => {
  const num = parseVectorType("*numerical")!;
  it.each([
    "17",
    "-17",
    "0x3A",
    "-0x3A",
    "0X3A",
    "-0XB5",
    "1.0",
    "-1.",
    ".5",
    "1.1e6",
    "-1.1e6",
    "1.1E6", // case-insensitive e
    "inf",
    "-inf",
    "INF",
    "nan",
    "NaN",
  ])("accepts %s", (v) => {
    expect(checkVectorValue(num, v).ok).toBe(true);
  });
  it.each([
    "--inf", // doubled sign
    "- 1", // sign must touch digits
    "1-1", // expression, not a number
    "oxB", // hex requires 0x prefix
    "A43",
    "0x", // bare prefix
    "1a",
    "abc",
  ])("rejects %s", (v) => {
    expect(checkVectorValue(num, v).ok).toBe(false);
  });
});

describe("checkVectorValue: legal integers", () => {
  const int = parseVectorType("*integer")!;
  it.each(["17", "-17", "0xA3", "-0xB5", "0X3A", "1.1e6"])(
    "accepts %s",
    (v) => {
      expect(checkVectorValue(int, v).ok).toBe(true);
    },
  );
  it.each(["1.5", "-1.5", "inf", "-inf", "nan", "1.1e-6", "- 12", "0x"])(
    "rejects %s",
    (v) => {
      const r = checkVectorValue(int, v);
      expect(r.ok).toBe(false);
    },
  );
});

describe("checkVectorValue: fixed-length vectors (2*numerical)", () => {
  const spec = parseVectorType("2*numerical")!;
  it.each([
    "1, 2",
    "1.1e5, 0xA3",
    "  -1.1 , 3  ", // whitespace around elements
    "inf, -inf",
    "nan, nan",
    "-1., 1.0",
  ])("accepts %s", (v) => {
    expect(checkVectorValue(spec, v).ok).toBe(true);
  });

  it("accepts empty cell (glossary default applies)", () => {
    expect(checkVectorValue(spec, "").ok).toBe(true);
    expect(checkVectorValue(spec, "   ").ok).toBe(true);
  });

  it("rejects too few values", () => {
    const r = checkVectorValue(spec, "1");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/expected 2 values, but found 1/);
  });

  it("rejects too many values", () => {
    const r = checkVectorValue(spec, "1, 2, 3");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/expected 2 values, but found 3/);
  });

  it("rejects expressions", () => {
    expect(checkVectorValue(spec, "1-1").ok).toBe(false);
  });

  it("rejects numbers with internal spaces", () => {
    const r = checkVectorValue(spec, "- 1, 1");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not a legal number/);
  });

  it("rejects hex without the 0x prefix", () => {
    expect(checkVectorValue(spec, "oxB, A43").ok).toBe(false);
  });

  it("rejects empty elements", () => {
    expect(checkVectorValue(spec, "1,,2").ok).toBe(false);
    expect(checkVectorValue(spec, "1,2,").ok).toBe(false);
  });

  it("rejects semicolons in vectors", () => {
    expect(checkVectorValue(spec, "1;2").ok).toBe(false);
  });

  it("accepts the smallest positive length (1*numerical)", () => {
    const one = parseVectorType("1*numerical")!;
    expect(one.length).toBe(1);
    expect(checkVectorValue(one, "5").ok).toBe(true);
    expect(checkVectorValue(one, "5, 6").ok).toBe(false);
  });

  it("uses singular grammar for length-1 reasons", () => {
    const one = parseVectorType("1*numerical")!;
    const r = checkVectorValue(one, "5, 6");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("expected 1 value,");
    expect(r.reason).not.toContain("1 values");
  });

  it("uses singular grammar for 1-row matrix reasons", () => {
    const spec = parseVectorType("1x2*numerical")!;
    const r = checkVectorValue(spec, "1,2;3,4");
    expect(r.reason).toContain("expected 1 row,");
    expect(r.reason).not.toContain("1 rows");
  });

  it("tolerates tab whitespace around elements", () => {
    expect(checkVectorValue(spec, "1\t,\t2").ok).toBe(true);
  });

  it("names ALL illegal elements, not just the first", () => {
    const r = checkVectorValue(parseVectorType("*numerical")!, "x, y, 1");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('"x"');
    expect(r.reason).toContain('"y"');
    expect(r.reason).toContain("element 1");
    expect(r.reason).toContain("element 2");
    expect(r.reason).not.toContain("element 3"); // 1 is legal
    expect(r.reason).toMatch(/are not legal numbers/);
  });

  it("keeps singular wording for a single illegal element", () => {
    const r = checkVectorValue(parseVectorType("*numerical")!, "x, 1");
    expect(r.reason).toMatch(/is not a legal number/);
  });
});

describe("checkVectorValue: unspecified-length vectors", () => {
  const spec = parseVectorType("*numerical")!;
  it.each(["5", "1,2,3", "1, 2, 3, 4, 5"])("accepts %s", (v) => {
    expect(checkVectorValue(spec, v).ok).toBe(true);
  });
  it.each(["1,,2", "a,b", "1, 2,"])("rejects %s", (v) => {
    expect(checkVectorValue(spec, v).ok).toBe(false);
  });

  it("2*integer rejects inf and nan", () => {
    const int2 = parseVectorType("2*integer")!;
    expect(checkVectorValue(int2, "inf, 2").ok).toBe(false);
    expect(checkVectorValue(int2, "2, nan").ok).toBe(false);
    expect(checkVectorValue(int2, "1.5, 2").ok).toBe(false);
    expect(checkVectorValue(int2, "17, -17").ok).toBe(true);
    expect(checkVectorValue(int2, "0xA3, -0xB5").ok).toBe(true);
  });
});

describe("checkVectorValue: matrices", () => {
  const m22 = parseVectorType("2x2*numerical")!;
  it.each([
    "1,2;3,4",
    "1, 2 ; 3 , 4", // whitespace tolerated
    "0x3A, -inf; nan, 1.1e6",
  ])("accepts %s", (v) => {
    expect(checkVectorValue(m22, v).ok).toBe(true);
  });

  it("rejects too few rows", () => {
    const r = checkVectorValue(m22, "1,2");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/expected 2 rows, but found 1/);
  });

  it("rejects too many rows", () => {
    expect(checkVectorValue(m22, "1,2;3,4;5,6").ok).toBe(false);
  });

  it("rejects ragged rows", () => {
    const r = checkVectorValue(m22, "1,2;3");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/row 2 has 1 value/);
  });

  it("rejects bad elements", () => {
    const r = checkVectorValue(m22, "1,x;3,4");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not a legal number/);
  });

  it("x2*integer: any number of rows, 2 columns", () => {
    const spec = parseVectorType("x2*integer")!;
    expect(checkVectorValue(spec, "1,2").ok).toBe(true);
    expect(checkVectorValue(spec, "1,2;3,4;5,6").ok).toBe(true);
    expect(checkVectorValue(spec, "1,2;3").ok).toBe(false); // ragged
    expect(checkVectorValue(spec, "1.5,2").ok).toBe(false); // not integer
  });

  it("2x*numerical: 2 rows, any consistent width", () => {
    const spec = parseVectorType("2x*numerical")!;
    expect(checkVectorValue(spec, "1;2").ok).toBe(true);
    expect(checkVectorValue(spec, "1,2,3;4,5,6").ok).toBe(true);
    expect(checkVectorValue(spec, "1,2;3").ok).toBe(false); // ragged
    expect(checkVectorValue(spec, "1").ok).toBe(false); // too few rows
  });

  it("x*numerical: any rectangular matrix", () => {
    const spec = parseVectorType("x*numerical")!;
    expect(checkVectorValue(spec, "5").ok).toBe(true);
    expect(checkVectorValue(spec, "1,2;3,4").ok).toBe(true);
    expect(checkVectorValue(spec, "1;2;3").ok).toBe(true);
    expect(checkVectorValue(spec, "1,2;3").ok).toBe(false); // ragged
    expect(checkVectorValue(spec, "a").ok).toBe(false);
  });

  it("accepts empty cell (glossary default applies)", () => {
    expect(checkVectorValue(m22, "").ok).toBe(true);
  });

  it("locates bad elements by (row, column), all at once", () => {
    const r = checkVectorValue(m22, "1,2;x,y");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('"x" (row 2, column 1)');
    expect(r.reason).toContain('"y" (row 2, column 2)');
    expect(r.reason).not.toContain("row 1");
    expect(r.reason).toMatch(/are not legal numbers/);
  });

  it("names ALL ragged rows, not just the first", () => {
    const r = checkVectorValue(parseVectorType("x*numerical")!, "1,2;3;4");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("row 2 has 1 value");
    expect(r.reason).toContain("row 3 has 1 value");
    expect(r.reason).not.toContain("value(s)");
  });

  it("reports column-count mismatch against the spec", () => {
    const spec = parseVectorType("2x3*numerical")!;
    const r = checkVectorValue(spec, "1,2;3,4");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("expected 3 columns, but found 2");
  });

  it("rejects a trailing semicolon (phantom third row)", () => {
    const r = checkVectorValue(m22, "1,2;3,4;");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("expected 2 rows, but found 3");
  });
});

describe("describeVectorType", () => {
  it("describes fixed vectors", () => {
    expect(describeVectorType(parseVectorType("2*numerical")!)).toBe(
      "a comma-separated list of 2 numbers",
    );
    expect(describeVectorType(parseVectorType("3*integer")!)).toBe(
      "a comma-separated list of 3 integers",
    );
  });
  it("describes unspecified vectors", () => {
    expect(describeVectorType(parseVectorType("*numerical")!)).toBe(
      "a comma-separated list of one or more numbers",
    );
  });
  it("describes matrices", () => {
    expect(describeVectorType(parseVectorType("2x2*numerical")!)).toBe(
      "a 2x2 matrix of numbers",
    );
    expect(describeVectorType(parseVectorType("2x*integer")!)).toBe(
      "a matrix of integers with 2 rows",
    );
    expect(describeVectorType(parseVectorType("x3*numerical")!)).toBe(
      "a matrix of numbers with 3 columns",
    );
    expect(describeVectorType(parseVectorType("x*numerical")!)).toBe(
      "a matrix of numbers",
    );
  });

  it("uses singular grammar for 1-element types", () => {
    expect(describeVectorType(parseVectorType("1*numerical")!)).toBe(
      "a comma-separated list of 1 number",
    );
    expect(describeVectorType(parseVectorType("1x*integer")!)).toBe(
      "a matrix of integers with 1 row",
    );
    expect(describeVectorType(parseVectorType("x1*integer")!)).toBe(
      "a matrix of integers with 1 column",
    );
  });
});

// ---------- compiler integration ----------

const TEST_PARAMS = [
  "testVec2Numerical",
  "testVecStarInteger",
  "testMat2x2Numerical",
  "_testVecGlobal",
  "testVecBadDefault",
  "testScalarBadDefault",
];

const addGlossaryEntry = (name: string, type: string, def = "") => {
  getGlossary()[name] = {
    name,
    availability: "test",
    type,
    default: def,
    explanation: "",
    example: "",
    categories: [],
  };
};

afterEach(() => {
  for (const n of TEST_PARAMS) delete getGlossary()[n];
});

const makeTable = (rows: string[][]): ExperimentTable =>
  new ExperimentTable([
    ["_about", "test", "", ""],
    ["block", "", "1", "1"],
    ["conditionName", "", "condA", "condB"],
    ...rows,
  ]);

const typeErrorsFor = (errors: any[], name: string) =>
  errors.filter(
    (e) =>
      e.name === "Parameter contains values of the wrong type" &&
      e.parameters.includes(name),
  );

describe("compiler: glossary type recognition", () => {
  it("accepts vector and matrix types in the glossary", () => {
    addGlossaryEntry("testVec2Numerical", "2*numerical");
    addGlossaryEntry("testMat2x2Numerical", "2x2*numerical");
    const t = makeTable([["testVec2Numerical", "", "1, 2", "3, 4"]]);
    const errors = validateExperimentTable(t);
    expect(
      errors.some((e) => e.name === "Type in glossary is unsupported"),
    ).toBe(false);
  });

  it("rejects an unrecognized vector-like type in the glossary (fatal)", () => {
    addGlossaryEntry("testVec2Numerical", "2*float");
    const t = makeTable([["testVec2Numerical", "", "1, 2", "3, 4"]]);
    const errors = validateExperimentTable(t);
    expect(
      errors.some((e) => e.name === "Type in glossary is unsupported"),
    ).toBe(true);
  });
});

describe("compiler: glossary defaults for vector-typed parameters", () => {
  const defaultErrors = (errors: any[], name: string) =>
    errors.filter(
      (e) =>
        e.name === "Vector default in glossary is invalid" &&
        e.parameters.includes(name),
    );

  it("passes a valid vector default", () => {
    addGlossaryEntry("testVecBadDefault", "2*numerical", "1, 2");
    const t = makeTable([["testVecBadDefault", "", "3, 4", "5, 6"]]);
    expect(
      defaultErrors(validateExperimentTable(t), "testVecBadDefault"),
    ).toHaveLength(0);
  });

  it("flags an invalid vector default, with the reason", () => {
    addGlossaryEntry("testVecBadDefault", "2*numerical", "1, 2, 3");
    const t = makeTable([["testVecBadDefault", "", "3, 4", "5, 6"]]);
    const errs = defaultErrors(validateExperimentTable(t), "testVecBadDefault");
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toContain("1, 2, 3");
    expect(errs[0].message).toMatch(/expected 2 values, but found 3/);
  });

  it("flags an empty vector default (runtime would NaN-fill)", () => {
    addGlossaryEntry("testVecBadDefault", "2*numerical", "");
    const t = makeTable([["testVecBadDefault", "", "3, 4", "5, 6"]]);
    expect(
      defaultErrors(validateExperimentTable(t), "testVecBadDefault"),
    ).toHaveLength(1);
  });

  it("flags an invalid matrix default", () => {
    addGlossaryEntry("testVecBadDefault", "2x2*integer", "1,2;3");
    const t = makeTable([["testVecBadDefault", "", "1,2;3,4", "1,2;3,4"]]);
    expect(
      defaultErrors(validateExperimentTable(t), "testVecBadDefault"),
    ).toHaveLength(1);
  });

  it("does NOT police scalar-type defaults (pre-existing glossary defects are out of scope)", () => {
    addGlossaryEntry("testScalarBadDefault", "numerical", "40, 70");
    const t = makeTable([["testScalarBadDefault", "", "5", "6"]]);
    const errors = validateExperimentTable(t);
    expect(
      errors.some((e) => e.name === "Vector default in glossary is invalid"),
    ).toBe(false);
  });
});

describe("compiler: value checking for vector-typed parameters", () => {
  it("passes valid 2*numerical values", () => {
    addGlossaryEntry("testVec2Numerical", "2*numerical");
    const t = makeTable([["testVec2Numerical", "", "1, 2", "1.1e5, 0xA3"]]);
    const errors = validateExperimentTable(t);
    expect(typeErrorsFor(errors, "testVec2Numerical")).toHaveLength(0);
  });

  it("passes empty cells (default applies)", () => {
    addGlossaryEntry("testVec2Numerical", "2*numerical", "0, 0");
    const t = makeTable([["testVec2Numerical", "", "", ""]]);
    const errors = validateExperimentTable(t);
    expect(typeErrorsFor(errors, "testVec2Numerical")).toHaveLength(0);
  });

  it("rejects too few values, with a count reason", () => {
    addGlossaryEntry("testVec2Numerical", "2*numerical");
    const t = makeTable([["testVec2Numerical", "", "1", "3, 4"]]);
    const errors = validateExperimentTable(t);
    const errs = typeErrorsFor(errors, "testVec2Numerical");
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toMatch(/comma-separated list of 2 numbers/);
    expect(errs[0].hint).toContain('"1"');
    expect(errs[0].hint).toMatch(/expected 2 values, but found 1/);
    expect(errs[0].hint).not.toContain('"3, 4"');
  });

  it("rejects malformed numbers, naming the bad element", () => {
    addGlossaryEntry("testVec2Numerical", "2*numerical");
    const t = makeTable([["testVec2Numerical", "", "- 1, 1", "oxB, A43"]]);
    const errors = validateExperimentTable(t);
    const errs = typeErrorsFor(errors, "testVec2Numerical");
    expect(errs).toHaveLength(1);
    expect(errs[0].hint).toContain("- 1");
    expect(errs[0].hint).toMatch(/not a legal number/);
  });

  it("checks every offending condition at once", () => {
    addGlossaryEntry("testVecStarInteger", "*integer");
    const t = makeTable([["testVecStarInteger", "", "1.5, 2", "inf"]]);
    const errors = validateExperimentTable(t);
    const errs = typeErrorsFor(errors, "testVecStarInteger");
    expect(errs).toHaveLength(1);
    expect(errs[0].hint).toContain("1.5, 2");
    expect(errs[0].hint).toContain("inf");
    expect(errs[0].hint).toMatch(/not a legal integer/);
  });

  it("checks matrix-typed parameters end to end", () => {
    addGlossaryEntry("testMat2x2Numerical", "2x2*numerical");
    const ok = makeTable([
      ["testMat2x2Numerical", "", "1,2;3,4", "0x3A, -inf; nan, 1.1e6"],
    ]);
    expect(
      typeErrorsFor(validateExperimentTable(ok), "testMat2x2Numerical"),
    ).toHaveLength(0);

    const ragged = makeTable([["testMat2x2Numerical", "", "1,2;3", "1,2;3,4"]]);
    const errs = typeErrorsFor(
      validateExperimentTable(ragged),
      "testMat2x2Numerical",
    );
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toMatch(/2x2 matrix of numbers/);
    expect(errs[0].hint).toContain('"1,2;3"');
    expect(errs[0].hint).toMatch(/row 2 has 1 value/);
  });

  it("checks underscore (experiment-scope) vector parameters in column B", () => {
    addGlossaryEntry("_testVecGlobal", "*integer");
    const ok = makeTable([["_testVecGlobal", "1, 2, 3", "", ""]]);
    expect(
      typeErrorsFor(validateExperimentTable(ok), "_testVecGlobal"),
    ).toHaveLength(0);

    const bad = makeTable([["_testVecGlobal", "1, x", "", ""]]);
    const errs = typeErrorsFor(validateExperimentTable(bad), "_testVecGlobal");
    expect(errs).toHaveLength(1);
    expect(errs[0].hint).toContain("1, x");
  });

  it("type-checks ALL instances of a duplicated condition param (not just the survivor)", () => {
    addGlossaryEntry("testVec2Numerical", "2*numerical");
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "condA", "condB"],
      // First instance is discarded by dedup — but its bad values must still
      // be reported, or the scientist could delete the wrong copy and meet a
      // hidden error on the next compile.
      ["testVec2Numerical", "", "bad, worse", "3, 4"],
      ["testVec2Numerical", "", "3, 4", "5, 6"],
    ]);
    const errors = validateExperimentTable(t);
    expect(
      errors.some(
        (e) =>
          e.name.includes("duplicated") &&
          e.parameters.includes("testVec2Numerical"),
      ),
    ).toBe(true);
    const errs = typeErrorsFor(errors, "testVec2Numerical");
    expect(errs).toHaveLength(1);
    expect(errs[0].hint).toContain("bad, worse");
    expect(errs[0].hint).toContain("(instance 1)");
  });

  it("reports bad values from EVERY duplicate instance at once", () => {
    addGlossaryEntry("testVec2Numerical", "2*numerical");
    const t = new ExperimentTable([
      ["_about", "test", "", ""],
      ["block", "", "1", "1"],
      ["conditionName", "", "condA", "condB"],
      ["testVec2Numerical", "", "bad, worse", "3, 4"],
      ["testVec2Numerical", "", "3, 4", "also, bad"],
    ]);
    const errs = typeErrorsFor(validateExperimentTable(t), "testVec2Numerical");
    expect(errs).toHaveLength(1);
    expect(errs[0].hint).toContain("bad, worse");
    expect(errs[0].hint).toContain("also, bad");
    expect(errs[0].hint).toContain("(instance 1)");
    expect(errs[0].hint).toContain("(instance 2)");
  });

  it("passes vector values through to compiled output unchanged", () => {
    addGlossaryEntry("testVec2Numerical", "2*numerical");
    addGlossaryEntry("testMat2x2Numerical", "2x2*numerical");
    const t = makeTable([
      ["testVec2Numerical", "", "1, 2", "1.1e5, 0xA3"],
      ["testMat2x2Numerical", "", "1,2;3,4", "0x3A, -inf; nan, 1.1e6"],
    ]);
    const m = t.toParamValuesMap();
    // Runtime parses the raw strings; the compiler must not transform them.
    expect(m.get("testVec2Numerical")).toEqual(["1, 2", "1.1e5, 0xA3"]);
    expect(m.get("testMat2x2Numerical")).toEqual([
      "1,2;3,4",
      "0x3A, -inf; nan, 1.1e6",
    ]);
  });
});
