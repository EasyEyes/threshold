import type { ParamReader } from "../parameters/paramReader";
import { getGlossary } from "../parameters/glossaryRegistry";
import { parseVectorType, parseVectorValue } from "./vectorParsing";

export const inGlossary = (name: string): boolean => {
  try {
    return name in getGlossary();
  } catch {
    return false;
  }
};

const parseScalarDefault = (value: string): unknown => {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  if (trimmed !== "" && !isNaN(Number(trimmed))) return Number(trimmed);
  return trimmed;
};

/** Parse defaults into the same scalar/vector shapes returned by ParamReader. */
const parseGlossaryDefault = (name: string): unknown => {
  const entry = getGlossary()[name];
  const vectorSpec = parseVectorType(entry.type);
  return vectorSpec
    ? parseVectorValue(vectorSpec, entry.default, () => {})
    : parseScalarDefault(entry.default);
};

const differsFromDefault = (value: unknown, defaultValue: unknown): boolean => {
  if (Array.isArray(value) || Array.isArray(defaultValue))
    return JSON.stringify(value) !== JSON.stringify(defaultValue);
  if (typeof value === "string" && typeof defaultValue === "string")
    return value.trim() !== defaultValue;
  return value !== defaultValue;
};

/**
 * The compiler materializes default-filled cells, so runtime can identify an
 * entered value only when it differs from the glossary default.
 */
export const isExplicitlySet = (
  reader: ParamReader,
  name: string,
  bc: string,
): boolean => {
  if (!inGlossary(name)) return false;
  const value = reader.read(name, bc);
  return (
    value !== undefined && differsFromDefault(value, parseGlossaryDefault(name))
  );
};
