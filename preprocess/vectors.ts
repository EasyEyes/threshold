// Compiler-side face of vector/matrix parameter types. All parsing logic
// lives in components/vectorParsing.ts — shared with the runtime so that
// "compiler-accepted" ≡ "runtime-parses". This module adds compiler-only
// error-message wording and re-exports the shared API for existing callers.
//
// Type specifiers (in the glossary; no spaces or commas allowed):
//   *numerical, *integer     comma-separated list, any nonzero length
//   2*numerical, 2*integer   comma-separated list of exactly 2 values
//   2x2*numerical            matrix: rows separated by ";", e.g. "1,2;3,4"
//   2x*numerical, x3*integer, x*numerical   matrices with optional dimensions
//
// An empty cell always passes: the glossary default then applies to the
// whole value, as with every other parameter type.

import { plural } from "../components/vectorParsing";
import type { VectorTypeSpec } from "../components/vectorParsing";

export {
  parseVectorType,
  isVectorType,
  checkVectorValue,
  isLegalVectorElement,
} from "../components/vectorParsing";
export type {
  VectorTypeSpec,
  VectorElementType,
  VectorValueResult,
} from "../components/vectorParsing";

/** Human-readable description of the type, for error messages. */
export const describeVectorType = (spec: VectorTypeSpec): string => {
  const singular = spec.elementType === "integer" ? "integer" : "number";
  const noun = `${singular}s`;
  if (spec.shape === "vector") {
    return spec.length !== undefined
      ? `a comma-separated list of ${plural(spec.length, singular)}`
      : `a comma-separated list of one or more ${noun}`;
  }
  if (spec.rows !== undefined && spec.cols !== undefined) {
    return `a ${spec.rows}x${spec.cols} matrix of ${noun}`;
  }
  if (spec.rows !== undefined) {
    return `a matrix of ${noun} with ${plural(spec.rows, "row")}`;
  }
  if (spec.cols !== undefined) {
    return `a matrix of ${noun} with ${plural(spec.cols, "column")}`;
  }
  return `a matrix of ${noun}`;
};
