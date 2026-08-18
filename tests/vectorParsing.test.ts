/**
 * @jest-environment node
 *
 * Shared vector/matrix value parsing (components/vectorParsing.ts) — the
 * single source of truth used by BOTH the compiler (validation) and the
 * runtime (ParamReader casting). The core invariant: any value the compiler
 * accepts must parse cleanly at runtime, to the intended numbers.
 */
import {
  parseVectorType,
  isVectorType,
  parseVectorElement,
  isLegalVectorElement,
  checkVectorValue,
  parseVectorValue,
  MatrixValue,
} from "../components/vectorParsing";

describe("parseVectorElement: legal conversions", () => {
  it.each([
    ["17", 17],
    ["-17", -17],
    ["1.0", 1],
    ["-1.", -1],
    [".5", 0.5],
    ["1.1e6", 1100000],
    ["-1.1e6", -1100000],
    ["1.1E6", 1100000],
    ["0x3A", 58],
    ["-0x3A", -58],
    ["0XB5", 181],
    ["-0xB5", -181],
    ["inf", Infinity],
    ["INF", Infinity],
    ["+inf", Infinity],
    ["-inf", -Infinity],
    ["-Inf", -Infinity],
  ])("parses %s to %s", (s, expected) => {
    expect(parseVectorElement(s)).toBe(expected);
  });

  it.each(["nan", "NaN", "-nan", "+NAN"])("parses %s to NaN", (s) => {
    expect(Number.isNaN(parseVectorElement(s))).toBe(true);
  });

  it("overflow parses to Infinity (JS/MATLAB semantics), and is legal", () => {
    expect(parseVectorElement("1e400")).toBe(Infinity);
    expect(parseVectorElement("-1e400")).toBe(-Infinity);
    expect(isLegalVectorElement("1e400", "numerical")).toBe(true);
    // ...but not for integer (Infinity is not an integer)
    expect(isLegalVectorElement("1e400", "integer")).toBe(false);
  });

  it("parses tab-separated elements", () => {
    const spec = parseVectorType("2*numerical")!;
    expect(parseVectorValue(spec, "1\t,\t2", () => {})).toEqual([1, 2]);
  });

  it.each(["", "abc", "- 12", "1-1", "0x", "--inf", "oxB", "A43", "1,2"])(
    "parses illegal %s to NaN",
    (s) => {
      expect(Number.isNaN(parseVectorElement(s))).toBe(true);
    },
  );
});

describe("isLegalVectorElement", () => {
  it.each([
    "17",
    "-17",
    "0xA3",
    "-0xB5",
    "1.0",
    ".5",
    "1.1e6",
    "inf",
    "-inf",
    "nan",
    "NaN",
  ])("numerical accepts %s", (s) => {
    expect(isLegalVectorElement(s, "numerical")).toBe(true);
  });
  it.each(["", "abc", "- 1", "1-1", "oxB", "0x", "--inf"])(
    "numerical rejects %s",
    (s) => {
      expect(isLegalVectorElement(s, "numerical")).toBe(false);
    },
  );
  it.each(["17", "-17", "0xA3", "-0xB5", "1.1e6"])(
    "integer accepts %s",
    (s) => {
      expect(isLegalVectorElement(s, "integer")).toBe(true);
    },
  );
  it.each(["1.5", "-1.5", "inf", "-inf", "nan", "1.1e-6", "", "- 12"])(
    "integer rejects %s",
    (s) => {
      expect(isLegalVectorElement(s, "integer")).toBe(false);
    },
  );
});

describe("MatrixValue", () => {
  const m = new MatrixValue([
    [1, 2],
    [3, 4],
  ]);

  it("exposes shape and data", () => {
    expect(m.rowCount).toBe(2);
    expect(m.colCount).toBe(2);
    expect(m.data).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("at(r, c) indexes row-first", () => {
    expect(m.at(0, 0)).toBe(1);
    expect(m.at(0, 1)).toBe(2);
    expect(m.at(1, 0)).toBe(3);
    expect(m.at(1, 1)).toBe(4);
  });

  it("at() throws loudly on out-of-range access", () => {
    expect(() => m.at(2, 0)).toThrow(RangeError);
    expect(() => m.at(0, 2)).toThrow(RangeError);
    expect(() => m.at(-1, 0)).toThrow(RangeError);
    expect(() => m.at(0, -1)).toThrow(RangeError);
    expect(() => m.at(0.5, 0)).toThrow(RangeError);
  });

  it("row(r) returns the row, bounds-checked", () => {
    expect(m.row(1)).toEqual([3, 4]);
    expect(() => m.row(2)).toThrow(RangeError);
  });

  it("iterates over rows", () => {
    const rows = [...m];
    expect(rows).toEqual([
      [1, 2],
      [3, 4],
    ]);
    const flat = [];
    for (const [x, y] of m) flat.push(x, y);
    expect(flat).toEqual([1, 2, 3, 4]);
  });

  it("JSON-serializes as the plain 2D array", () => {
    expect(JSON.stringify(m)).toBe("[[1,2],[3,4]]");
  });

  it("non-square matrices catch transposed access", () => {
    const wide = new MatrixValue([[1, 2, 3]]); // 1x3
    expect(wide.at(0, 2)).toBe(3);
    expect(() => wide.at(2, 0)).toThrow(RangeError); // transposed slip
  });
});

describe("parseVectorValue", () => {
  it("parses vectors to number[]", () => {
    const spec = parseVectorType("2*numerical")!;
    expect(parseVectorValue(spec, "1, 2")).toEqual([1, 2]);
    expect(parseVectorValue(spec, "1.1e5, 0xA3")).toEqual([110000, 163]);
  });

  it("parses inf/nan/hex elements", () => {
    const spec = parseVectorType("*numerical")!;
    const v = parseVectorValue(spec, "0x3A, -inf, nan") as number[];
    expect(v[0]).toBe(58);
    expect(v[1]).toBe(-Infinity);
    expect(Number.isNaN(v[2])).toBe(true);
  });

  it("parses matrices to MatrixValue", () => {
    const spec = parseVectorType("2x2*numerical")!;
    const m = parseVectorValue(spec, "1,2;3,4") as MatrixValue;
    expect(m).toBeInstanceOf(MatrixValue);
    expect(m.data).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(m.at(1, 0)).toBe(3);
  });

  it("fires onProblem and yields NaN for illegal elements, preserving shape", () => {
    const spec = parseVectorType("2x2*numerical")!;
    const problems: string[] = [];
    const m = parseVectorValue(spec, "1,x;3,4", (msg) =>
      problems.push(msg),
    ) as MatrixValue;
    expect(problems.length).toBeGreaterThan(0);
    expect(m.rowCount).toBe(2);
    expect(m.data[0][0]).toBe(1);
    expect(Number.isNaN(m.data[0][1])).toBe(true);
    expect(m.data[1]).toEqual([3, 4]);
  });

  it("yields NaN (not the numeric parse) for elements illegal under the spec", () => {
    // "1.5" and "inf" parse as numbers but are illegal for *integer —
    // the slot must be NaN, not the misleading numeric value.
    const spec = parseVectorType("3*integer")!;
    const problems: string[] = [];
    const v = parseVectorValue(spec, "1.5, 2, inf", (msg) =>
      problems.push(msg),
    ) as number[];
    expect(problems.length).toBeGreaterThan(0);
    expect(Number.isNaN(v[0])).toBe(true);
    expect(v[1]).toBe(2);
    expect(Number.isNaN(v[2])).toBe(true);
  });

  it("preserves declared vector length on wrong-count input", () => {
    const spec = parseVectorType("2*numerical")!;
    const problems: string[] = [];
    const onProblem = (msg: string) => problems.push(msg);
    // Too few: pad with NaN so destructuring never yields undefined.
    const short = parseVectorValue(spec, "1", onProblem) as number[];
    expect(short).toEqual([1, NaN]);
    // Too many: truncate to the declared length.
    const long = parseVectorValue(spec, "1, 2, 3", onProblem) as number[];
    expect(long).toEqual([1, 2]);
    expect(problems.length).toBe(2);
  });

  it("preserves declared matrix shape on wrong-count input", () => {
    const spec = parseVectorType("2x2*numerical")!;
    const onProblem = () => {};
    const shortRows = parseVectorValue(spec, "1,2", onProblem) as MatrixValue;
    expect(shortRows.rowCount).toBe(2);
    expect(shortRows.colCount).toBe(2);
    expect(shortRows.data[0]).toEqual([1, 2]);
    expect(shortRows.data[1]).toEqual([NaN, NaN]);
    const ragged = parseVectorValue(spec, "1,2,3;4", onProblem) as MatrixValue;
    expect(ragged.data).toEqual([
      [1, 2],
      [4, NaN],
    ]);
    const extraRows = parseVectorValue(
      spec,
      "1,2;3,4;5,6",
      onProblem,
    ) as MatrixValue;
    expect(extraRows.rowCount).toBe(2);
    expect(extraRows.data[1]).toEqual([3, 4]);
  });

  it("warns and preserves declared shape on empty values", () => {
    const problems: string[] = [];
    const onProblem = (msg: string) => problems.push(msg);
    const v = parseVectorValue(parseVectorType("3*integer")!, "", onProblem);
    expect(v).toEqual([NaN, NaN, NaN]);
    expect(problems.length).toBeGreaterThan(0);
  });

  it("parses ragged input without crashing (compiler normally prevents this)", () => {
    const spec = parseVectorType("x*numerical")!;
    const problems: string[] = [];
    const m = parseVectorValue(spec, "1,2;3", (msg) =>
      problems.push(msg),
    ) as MatrixValue;
    expect(problems.length).toBeGreaterThan(0);
    expect(m.rowCount).toBe(2);
    expect(m.at(0, 1)).toBe(2);
    expect(() => m.at(1, 1)).toThrow(RangeError);
  });
});

/**
 * SYMMETRY: values are labeled by INTENT (accepted or not, and to what).
 * The compiler's checkVectorValue must agree with the intent, and the
 * runtime's parseVectorValue must parse accepted values cleanly to the
 * intended numbers — with zero onProblem calls.
 */
describe("compiler/runtime symmetry", () => {
  const spec2n = parseVectorType("2*numerical")!;
  const specStarI = parseVectorType("*integer")!;
  const spec2x2 = parseVectorType("2x2*numerical")!;

  const accepted: Array<[any, string, number[] | number[][]]> = [
    [spec2n, "1, 2", [1, 2]],
    [spec2n, "1.1e5, 0xA3", [110000, 163]],
    [spec2n, "inf, -inf", [Infinity, -Infinity]],
    [specStarI, "17, -17, 0xA3", [17, -17, 163]],
    [specStarI, "1.1e6", [1100000]],
    [
      spec2x2,
      "1,2;3,4",
      [
        [1, 2],
        [3, 4],
      ],
    ],
    [
      spec2x2,
      "0x3A, -inf; nan, 1.1e6",
      [
        [58, -Infinity],
        [NaN, 1100000],
      ],
    ],
  ];

  it.each(accepted.map(([s, v, e]) => [v, s, v, e]))(
    "accepted value parses cleanly: %s",
    (_label, spec, value, expected) => {
      expect(checkVectorValue(spec, value).ok).toBe(true);
      const problems: string[] = [];
      const parsed = parseVectorValue(spec, value, (m) => problems.push(m));
      expect(problems).toEqual([]);
      const data = parsed instanceof MatrixValue ? parsed.data : parsed;
      expect(data).toEqual(expected);
    },
  );

  const rejected: Array<[any, string]> = [
    [spec2n, "1"],
    [spec2n, "1, 2, 3"],
    [spec2n, "1-1"],
    [spec2n, "- 1, 1"],
    [spec2n, "oxB, A43"],
    [spec2n, "1,,2"],
    [specStarI, "1.5"],
    [specStarI, "inf"],
    [specStarI, "nan"],
    [spec2x2, "1,2;3"],
    [spec2x2, "1,2;3,4;5,6"],
  ];

  it.each(rejected.map(([s, v]) => [v, s, v]))(
    "rejected value is flagged at runtime too: %s",
    (_label, spec, value) => {
      expect(checkVectorValue(spec, value).ok).toBe(false);
      const problems: string[] = [];
      parseVectorValue(spec, value, (m) => problems.push(m));
      expect(problems.length).toBeGreaterThan(0);
    },
  );
});

describe("re-exports keep preprocess/vectors API stable", () => {
  it("isVectorType is shared", () => {
    expect(isVectorType("2*numerical")).toBe(true);
    expect(isVectorType("2x2*integer")).toBe(true);
    expect(isVectorType("text")).toBe(false);
  });
});

describe("blank characters at element and cell ends are overcome, interiors flagged", () => {
  // Unified blank rule for machine-parsed numeric lists: invisible blanks
  // (NBSP, ZWSP, …) at the ENDS of a cell or element are stripped by the
  // shared parser, so a spreadsheet-app corruption there is overcome; an
  // INTERIOR invisible blank is preserved and rejected (the compiler then
  // explains it). Plain whitespace around separators was always accepted.
  const spec = parseVectorType("3*numerical")!;

  it("accepts and correctly parses a ZWSP-ended element", () => {
    expect(isLegalVectorElement("2\u200B", "numerical")).toBe(true);
    expect(parseVectorElement("2\u200B")).toBe(2);
    expect(checkVectorValue(spec, "1, 2\u200B, 3").ok).toBe(true);
    expect(parseVectorValue(spec, "1, 2\u200B, 3", () => {})).toEqual([
      1, 2, 3,
    ]);
  });

  it("accepts and correctly parses an NBSP-led element", () => {
    expect(parseVectorValue(spec, "1, \u00A02, 3", () => {})).toEqual([
      1, 2, 3,
    ]);
  });

  it("strips invisible blanks at cell ends (runtime reads raw CSV cells)", () => {
    expect(parseVectorValue(spec, "\u200B1, 2, 3\u200B", () => {})).toEqual([
      1, 2, 3,
    ]);
    expect(checkVectorValue(spec, "\u00A0 1, 2, 3").ok).toBe(true);
  });

  it("matrix: blank-ended elements parse to the intended numbers", () => {
    const m = parseVectorType("2x2*numerical")!;
    const parsed = parseVectorValue(
      m,
      "1,2\u200B;3,4",
      () => {},
    ) as MatrixValue;
    expect(parsed.data).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("interior invisible blanks remain illegal (flag, don't strip)", () => {
    expect(isLegalVectorElement("4\u200B2", "numerical")).toBe(false);
    expect(checkVectorValue(spec, "1, 4\u200B2, 3").ok).toBe(false);
  });
});
