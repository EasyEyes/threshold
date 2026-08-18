/**
 * Shared parsing for vector and matrix parameter values — the single source
 * of truth used by BOTH the compiler (validation, via preprocess/vectors.ts)
 * and the runtime (ParamReader casting). Keeping one implementation here is
 * what guarantees "compiler-accepted" ≡ "runtime-parses".
 *
 * MUST STAY BUNDLE-SAFE: it is bundled into threshold.min.js, so it may
 * import only dependency-free leaves (preprocess/parameterName.ts is one).
 *
 * Blank rule for numeric lists: invisible blanks (NBSP, ZWSP, …) at the
 * ends of a cell or element are stripped (corruption overcome); interior
 * invisible blanks are preserved and rejected, so the compiler can explain.
 *
 * Value syntax (MATLAB-like): commas separate elements in a row, semicolons
 * separate rows: "1,2;3,4" is the 2x2 matrix [[1,2],[3,4]].
 * Elements: 17, -17, 0x3A, -0x3A, 1.0, -1., .5, 1.1e6, inf, -inf, nan
 * (x, e, inf, nan case-insensitive; inf/nan only for "numerical").
 */

import { stripBlankEnds } from "../preprocess/parameterName";

export type VectorElementType = "numerical" | "integer";

export interface VectorTypeSpec {
  shape: "vector" | "matrix";
  elementType: VectorElementType;
  /** Fixed vector length (vector shape only). */
  length?: number;
  /** Fixed row count (matrix shape only). */
  rows?: number;
  /** Fixed column count (matrix shape only). */
  cols?: number;
}

export interface VectorValueResult {
  ok: boolean;
  /** Human-readable explanation when !ok. */
  reason?: string;
}

export type VectorProblemHandler = (message: string) => void;

/** `plural(2, "row")` → "2 rows"; `plural(1, "row")` → "1 row". */
export const plural = (n: number, singular: string): string =>
  `${n} ${singular}${n === 1 ? "" : "s"}`;

/* ------------------------------ type specifiers ------------------------------ */
/* Glossary type strings: [length]*type | [rows]x[cols]*type. No spaces, no  */
/* commas; dimensions are positive nonzero integers.                            */

const DIMENSION = "([1-9]\\d*)";
const ELEMENT_TYPE = "(numerical|integer)";
const VECTOR_TYPE_RE = new RegExp(`^${DIMENSION}?\\*${ELEMENT_TYPE}$`);
const MATRIX_TYPE_RE = new RegExp(
  `^${DIMENSION}?x${DIMENSION}?\\*${ELEMENT_TYPE}$`,
);

/** Parse a glossary type string; null if it is not a vector/matrix type. */
export const parseVectorType = (type: string): VectorTypeSpec | null => {
  const v = VECTOR_TYPE_RE.exec(type);
  if (v) {
    return {
      shape: "vector",
      elementType: v[2] as VectorElementType,
      ...(v[1] ? { length: Number(v[1]) } : {}),
    };
  }
  const m = MATRIX_TYPE_RE.exec(type);
  if (m) {
    return {
      shape: "matrix",
      elementType: m[3] as VectorElementType,
      ...(m[1] ? { rows: Number(m[1]) } : {}),
      ...(m[2] ? { cols: Number(m[2]) } : {}),
    };
  }
  return null;
};

export const isVectorType = (type: string): boolean =>
  parseVectorType(type) !== null;

/* --------------------------------- elements --------------------------------- */

// inf/nan and signed hex need regexes: Number() rejects "inf"/"nan" and "-0x3A".
const INF_NAN_RE = /^[+-]?(inf|nan)$/i;
const HEX_RE = /^[+-]?0x[0-9a-f]+$/i;

// Same acceptance as the scalar numerical type: Number() parses the whole
// string; the parseFloat probe rejects empty/whitespace strings (Number("")===0).
const isPlainNumeric = (s: string): boolean =>
  !isNaN(Number(s)) && !isNaN(parseFloat(s));

export const isLegalVectorElement = (
  raw: string,
  elementType: VectorElementType,
): boolean => {
  const s = stripBlankEnds(raw);
  if (s === "") return false;
  if (elementType === "integer") {
    if (HEX_RE.test(s)) return true;
    if (INF_NAN_RE.test(s)) return false; // inf/nan are numerical-only
    const v = Number(s);
    return !isNaN(v) && Number.isInteger(v);
  }
  return isPlainNumeric(s) || HEX_RE.test(s) || INF_NAN_RE.test(s);
};

/** Parse one element. Illegal input parses to NaN (as does "nan" itself). */
export const parseVectorElement = (raw: string): number => {
  const s = stripBlankEnds(raw);
  if (s === "") return NaN;
  const infNan = INF_NAN_RE.exec(s);
  if (infNan) {
    return infNan[1].toLowerCase() === "nan"
      ? NaN
      : s.startsWith("-")
      ? -Infinity
      : Infinity;
  }
  if (HEX_RE.test(s)) {
    const v = parseInt(s.replace(/^[+-]?0x/i, ""), 16);
    return s.startsWith("-") ? -v : v;
  }
  return Number(s);
};

/* --------------------------------- MatrixValue ------------------------------- */

/**
 * A parsed matrix with explicit shape. Bounds-checked at(r, c)/row(r) catch
 * row/column transposition slips for non-square matrices; iteration yields
 * rows, so the common "list of points" use never touches indices.
 */
export class MatrixValue {
  readonly rowCount: number;
  readonly colCount: number;
  readonly data: number[][];

  constructor(data: number[][]) {
    this.data = data;
    this.rowCount = data.length;
    this.colCount = data.length > 0 ? data[0].length : 0;
  }

  at(r: number, c: number): number {
    if (!Number.isInteger(r) || r < 0 || r >= this.rowCount) {
      throw new RangeError(
        `MatrixValue.at: row ${r} out of range (rowCount ${this.rowCount})`,
      );
    }
    if (!Number.isInteger(c) || c < 0 || c >= this.data[r].length) {
      throw new RangeError(
        `MatrixValue.at: column ${c} out of range for row ${r} (length ${this.data[r].length})`,
      );
    }
    return this.data[r][c];
  }

  row(r: number): number[] {
    if (!Number.isInteger(r) || r < 0 || r >= this.rowCount) {
      throw new RangeError(
        `MatrixValue.row: row ${r} out of range (rowCount ${this.rowCount})`,
      );
    }
    return this.data[r];
  }

  *[Symbol.iterator](): IterableIterator<number[]> {
    yield* this.data;
  }

  toJSON(): number[][] {
    return this.data;
  }
}

/* ------------------------------ value validation ----------------------------- */

const elementWord = (spec: VectorTypeSpec): string =>
  spec.elementType === "integer" ? "integer" : "number";

// Report ALL illegal elements at once (never make the scientist recompile to
// discover the next one). `locate` describes position: vectors use flat
// element indices; matrices use (row, column) coordinates.
const checkElements = (
  spec: VectorTypeSpec,
  elements: string[],
  locate: (i: number) => string = (i) => `element ${i + 1}`,
): VectorValueResult => {
  const bad: string[] = [];
  for (let i = 0; i < elements.length; i++) {
    if (!isLegalVectorElement(elements[i], spec.elementType)) {
      bad.push(`"${elements[i]}" (${locate(i)})`);
    }
  }
  if (!bad.length) return { ok: true };
  const word = elementWord(spec);
  return {
    ok: false,
    reason:
      bad.length === 1
        ? `${bad[0]} is not a legal ${word}`
        : `${bad.join(", ")} are not legal ${word}s`,
  };
};

export const checkVectorValue = (
  spec: VectorTypeSpec,
  value: string,
): VectorValueResult => {
  const v = stripBlankEnds(value);
  // Empty cell requests the glossary default for the whole value.
  if (v === "") return { ok: true };

  if (spec.shape === "vector") {
    const elements = v.split(",").map((s) => s.trim());
    if (spec.length !== undefined && elements.length !== spec.length) {
      return {
        ok: false,
        reason: `expected ${plural(spec.length, "value")}, but found ${
          elements.length
        }`,
      };
    }
    return checkElements(spec, elements);
  }

  const rows = v.split(";").map((row) => row.split(",").map((s) => s.trim()));
  if (spec.rows !== undefined && rows.length !== spec.rows) {
    return {
      ok: false,
      reason: `expected ${plural(spec.rows, "row")}, but found ${rows.length}`,
    };
  }
  const width = rows[0].length;
  if (spec.cols !== undefined && width !== spec.cols) {
    return {
      ok: false,
      reason: `expected ${plural(spec.cols, "column")}, but found ${width}`,
    };
  }
  const ragged: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length !== width) {
      ragged.push(`row ${i + 1} has ${plural(rows[i].length, "value")}`);
    }
  }
  if (ragged.length) {
    return {
      ok: false,
      reason: `${ragged.join(", ")}, but row 1 has ${width}`,
    };
  }
  // Rectangular here, so flat index → (row, column) is exact.
  return checkElements(spec, rows.flat(), (i) => {
    const r = Math.floor(i / width) + 1;
    const c = (i % width) + 1;
    return `row ${r}, column ${c}`;
  });
};

/* ------------------------------ runtime parsing ------------------------------ */

/**
 * Cast a cell/default string to number[] (vector) or MatrixValue (matrix).
 * The compiler normally guarantees validity; on any problem this warns via
 * onProblem and yields NaN in the offending slots, preserving declared shape
 * so downstream length/index logic still works. Never throws.
 */
export const parseVectorValue = (
  spec: VectorTypeSpec,
  value: string,
  onProblem: VectorProblemHandler = (m) => console.warn(m),
): number[] | MatrixValue => {
  const v = stripBlankEnds(value ?? "");

  if (v === "") {
    onProblem(
      `[vectorParsing] Empty value for type ${spec.shape}; filling with NaN. The compiler should have applied a default.`,
    );
    if (spec.shape === "vector") {
      return spec.length !== undefined
        ? new Array<number>(spec.length).fill(NaN)
        : [];
    }
    return new MatrixValue(
      Array.from({ length: spec.rows ?? 0 }, () =>
        new Array<number>(spec.cols ?? 0).fill(NaN),
      ),
    );
  }

  const check = checkVectorValue(spec, v);
  if (!check.ok) {
    onProblem(`[vectorParsing] Invalid value "${v}": ${check.reason}`);
  }

  // Illegal elements parse to NaN — never to a misleading numeric value
  // (e.g. "1.5" under an integer spec must not come out as 1.5).
  const parseElement = (el: string): number =>
    isLegalVectorElement(el, spec.elementType) ? parseVectorElement(el) : NaN;

  if (spec.shape === "vector") {
    let elements = v.split(",").map(parseElement);
    // Honor the declared length: pad with NaN, truncate extras.
    if (spec.length !== undefined && elements.length !== spec.length) {
      elements = elements.slice(0, spec.length);
      while (elements.length < spec.length) elements.push(NaN);
    }
    return elements;
  }

  let rows = v.split(";").map((row) => row.split(",").map(parseElement));
  // Honor declared columns: pad/truncate each row.
  if (spec.cols !== undefined) {
    const cols = spec.cols;
    rows = rows.map((row) => {
      const r = row.slice(0, cols);
      while (r.length < cols) r.push(NaN);
      return r;
    });
  }
  // Honor declared rows: drop extras, pad with NaN rows.
  if (spec.rows !== undefined && rows.length !== spec.rows) {
    const width = spec.cols ?? rows[0]?.length ?? 0;
    rows = rows.slice(0, spec.rows);
    while (rows.length < spec.rows)
      rows.push(new Array<number>(width).fill(NaN));
  }
  return new MatrixValue(rows);
};

/**
 * Freeze a parsed vector/matrix in place (deeply: matrix rows too). Applied
 * to values STORED on conditions at load, so consumers that bypass read()'s
 * defensive copies via reader.conditions can't silently mutate shared state —
 * in strict-mode modules the mutation attempt throws a TypeError instead.
 * read() copies are fresh and unfrozen.
 */
export const freezeVectorValue = <T extends number[] | MatrixValue>(
  value: T,
): T => {
  if (value instanceof MatrixValue) {
    for (const row of value.data) Object.freeze(row);
    Object.freeze(value.data);
  }
  Object.freeze(value);
  return value;
};
