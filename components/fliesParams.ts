/**
 * markFlies parameter resolution (transparent-naming migration).
 *
 * The flies can be specified two ways:
 *  - legacy: the single parameter `markFlies`, a 10-value comma-separated
 *    string (n, radiusDeg, degPerSec, centeredOnNominalFixationBool,
 *    thicknessDeg, lengthDeg, colorRGBA);
 *  - new: one scalar parameter per aspect — markFliesNumber,
 *    markFliesRadiusDeg, markFliesDegPerSec, markFliesTrackFixationBool,
 *    markFliesThicknessDeg, markFliesLengthDeg, markFliesColorRGBA — plus
 *    the master switch markFliesBool and the already-implemented
 *    markFliesGravity.
 *
 * Each aspect resolves independently: a new parameter whose value differs
 * from its glossary default wins, then the legacy field (when the legacy
 * string's value differs from its default), then the glossary default.
 * Value-vs-default — not column presence — defines "explicitly set",
 * because the compiler materializes every table-mentioned parameter into
 * every condition, filling blank cells with glossary defaults (see
 * ExperimentTable.effectiveValue); at runtime a default-filled cell is
 * otherwise indistinguishable from an experimenter-entered one. (Same
 * approach as readNeedSoundOutput's "" fallback in components/soundOutput.ts.)
 * Consequence: writing a value that EQUALS the glossary default is treated
 * as unset — e.g. markFliesNumber 0 cannot switch off a legacy markFlies n,
 * and markFliesBool FALSE (the default) is indistinguishable from absent.
 * markFliesBool's FALSE arm therefore coincides with the no-flies default
 * state; its gate becomes operational whenever its glossary default is not
 * FALSE. ABSENT, markFliesBool neither enables nor disables, so legacy
 * markFlies tables behave exactly as before the rename.
 *
 * The speed parameter is markFliesDegPerSec (glossary 36.0); glossaries
 * before 36.0 named it markFliesSpeedDegPerSec, and studies compiled then
 * still carry that name in their block CSVs — both are read (the current
 * name wins when both are set). Names absent from the glossary contribute
 * nothing — never a throw.
 */
import type { ParamReader } from "../parameters/paramReader";
import { getGlossary } from "../parameters/glossaryRegistry";
import { parseVectorType, parseVectorValue } from "./vectorParsing";

export interface FliesSpec {
  n: number;
  radiusDeg: number;
  degPerSec: number;
  /** TRUE: confining circle follows the (possibly moving) crosshair; FALSE: nominal fixation. */
  trackFixationBool: boolean;
  thicknessDeg: number;
  lengthDeg: number;
  colorRGBA: string;
  gravity: number;
}

export type LegacyMarkFlies = Omit<FliesSpec, "gravity">;

const LEGACY_PARAM = "markFlies";
const BOOL_PARAM = "markFliesBool";
const NUMBER_PARAM = "markFliesNumber";
const RADIUS_PARAM = "markFliesRadiusDeg";
const TRACK_PARAM = "markFliesTrackFixationBool";
const THICKNESS_PARAM = "markFliesThicknessDeg";
const LENGTH_PARAM = "markFliesLengthDeg";
const COLOR_PARAM = "markFliesColorRGBA";
const GRAVITY_PARAM = "markFliesGravity";
/** Current name first (preferred), pre-36.0 name second. */
const SPEED_PARAMS = ["markFliesDegPerSec", "markFliesSpeedDegPerSec"];

const allFinite = (...values: number[]): boolean =>
  values.every((v) => typeof v === "number" && Number.isFinite(v));

/** A usable colorRGBA: exactly four finite numbers (r, g, b, a). */
const isColorRGBA = (s: string): boolean => {
  const parts = s.split(",").map((p) => Number(p.trim()));
  return parts.length === 4 && allFinite(...parts);
};

const inGlossary = (name: string): boolean => {
  try {
    return name in getGlossary();
  } catch {
    return false; // registry not initialized: nothing is set
  }
};

/** Parse a scalar glossary default the way ParamReader.parse would. */
const parseScalarDefault = (s: string): unknown => {
  const trimmed = s.trim();
  const t = trimmed.toLowerCase();
  if (t === "true") return true;
  if (t === "false") return false;
  if (trimmed !== "" && !isNaN(Number(trimmed))) return Number(trimmed);
  return trimmed;
};

/**
 * Parse a glossary default the way ParamReader.parse would — vector/matrix
 * types (e.g. markFliesColorRGBA 4*numerical since glossary 36.0) parse to
 * number[], so comparisons against read values are like-for-like.
 */
const parseGlossaryDefault = (name: string): unknown => {
  const entry = getGlossary()[name];
  const vectorSpec = parseVectorType(entry.type);
  return vectorSpec
    ? parseVectorValue(vectorSpec, entry.default, () => {})
    : parseScalarDefault(entry.default);
};

/** True when a read value differs from its glossary default. */
const differsFromDefault = (v: unknown, d: unknown): boolean => {
  if (Array.isArray(v) || Array.isArray(d))
    return JSON.stringify(v) !== JSON.stringify(d);
  if (typeof v === "string" && typeof d === "string") return v.trim() !== d;
  return v !== d;
};

/**
 * Parse the legacy 10-value markFlies string. Wrong field count → undefined
 * (silently, as before); non-finite numeric field → warn + undefined.
 */
export const parseMarkFlies = (value: string): LegacyMarkFlies | undefined => {
  // Trim per-field: the glossary recommends comma-adjacent spaces
  // ("0, 1, 0.3, TRUE, …"), and the raw split would leave " TRUE" ≠ "true".
  const fields = value.split(",").map((f) => f.trim());
  // NOTE update preprocess/experimentFileChecks.ts commaSeparatedParamLengths
  // and preprocess/validateExperimentTable.ts _COMMA_PARAMS if this changes.
  if (fields.length !== 10) return undefined;
  const [
    n,
    radiusDeg,
    degPerSec,
    centeredOnNominalFixationBool,
    thicknessDeg,
    lengthDeg,
    ...colorRGBA
  ] = fields;
  if (
    !allFinite(
      Number(n),
      Number(radiusDeg),
      Number(degPerSec),
      Number(thicknessDeg),
      Number(lengthDeg),
    )
  ) {
    console.warn(
      `parseMarkFlies: skipping markFlies, non-finite numeric field in "${value}".`,
    );
    return undefined;
  }
  return {
    n: Number(n),
    radiusDeg: Number(radiusDeg),
    degPerSec: Number(degPerSec),
    // Legacy centered-on-nominal flag inverts into the new track flag.
    trackFixationBool: !(
      centeredOnNominalFixationBool.toLowerCase() === "true"
    ),
    thicknessDeg: Number(thicknessDeg),
    lengthDeg: Number(lengthDeg),
    colorRGBA: colorRGBA.join(","),
  };
};

/**
 * Resolve the per-aspect flies specification for one condition. Returns
 * undefined when the resolved configuration has no flies (n ≤ 0) or a
 * malformed field — a bad marking spec is skipped, not allowed to crash
 * the experiment.
 */
export const resolveFliesSpec = (
  reader: ParamReader,
  bc: string,
): FliesSpec | undefined => {
  const read = (name: string): unknown => reader.read(name, bc);

  // "Explicitly set": the read value differs from the glossary default —
  // the only runtime-distinguishable sign of an experimenter-entered value
  // (default-filled cells read identically to entered defaults).
  const isExplicit = (name: string): boolean => {
    if (!inGlossary(name)) return false;
    const v = read(name);
    return v !== undefined && differsFromDefault(v, parseGlossaryDefault(name)); // unknown condition → undefined → not set
  };

  const legacy = isExplicit(LEGACY_PARAM)
    ? parseMarkFlies(String(read(LEGACY_PARAM)))
    : undefined;

  // Per-aspect resolution: an explicitly-set new parameter wins, then the
  // legacy field, then the glossary default.
  const resolveNumber = (
    name: string,
    legacyValue: number | undefined,
  ): number => {
    if (isExplicit(name)) return Number(read(name));
    if (legacyValue !== undefined) return legacyValue;
    if (inGlossary(name)) return Number(read(name));
    return 0; // name unknown to the glossary
  };

  const explicitSpeed = SPEED_PARAMS.find((name) => isExplicit(name));
  let degPerSec: number;
  if (explicitSpeed) degPerSec = Number(read(explicitSpeed));
  else if (legacy) degPerSec = legacy.degPerSec;
  else {
    const knownSpeed = SPEED_PARAMS.find((name) => inGlossary(name));
    degPerSec = knownSpeed ? Number(read(knownSpeed)) : 0.3; // card default
  }

  let trackFixationBool: boolean;
  if (isExplicit(TRACK_PARAM)) trackFixationBool = read(TRACK_PARAM) === true;
  else if (legacy) trackFixationBool = legacy.trackFixationBool;
  else
    trackFixationBool = inGlossary(TRACK_PARAM) && read(TRACK_PARAM) === true;

  let colorRGBA: string;
  if (isExplicit(COLOR_PARAM)) colorRGBA = String(read(COLOR_PARAM));
  else if (legacy) colorRGBA = legacy.colorRGBA;
  else if (inGlossary(COLOR_PARAM)) colorRGBA = String(read(COLOR_PARAM));
  else colorRGBA = "0, 0, 1, 1";

  let n = resolveNumber(NUMBER_PARAM, legacy?.n);
  // markFliesBool FALSE ≡ markFliesNumber 0. Operational only when FALSE is
  // not the glossary default (a default-filled FALSE is indistinguishable
  // from absent, in which case the n=0 default already means no flies).
  if (isExplicit(BOOL_PARAM) && read(BOOL_PARAM) !== true) n = 0;

  const spec: FliesSpec = {
    n,
    radiusDeg: resolveNumber(RADIUS_PARAM, legacy?.radiusDeg),
    degPerSec,
    trackFixationBool,
    thicknessDeg: resolveNumber(THICKNESS_PARAM, legacy?.thicknessDeg),
    lengthDeg: resolveNumber(LENGTH_PARAM, legacy?.lengthDeg),
    colorRGBA,
    gravity: inGlossary(GRAVITY_PARAM) ? Number(read(GRAVITY_PARAM)) : 0,
  };

  const numericFields = [
    spec.n,
    spec.radiusDeg,
    spec.degPerSec,
    spec.thicknessDeg,
    spec.lengthDeg,
    spec.gravity,
  ];
  if (!allFinite(...numericFields)) {
    console.warn(
      `resolveFliesSpec: skipping flies, non-finite numeric field in resolved spec ${JSON.stringify(
        spec,
      )}.`,
    );
    return undefined;
  }
  // The legacy 10-field count check guaranteed four color components; the
  // free-text new parameter does not. A malformed color would Number() to NaN
  // inside Fly (color/opacity) and flow into ShapeStim — skip instead.
  if (!isColorRGBA(spec.colorRGBA)) {
    console.warn(
      `resolveFliesSpec: skipping flies, colorRGBA "${spec.colorRGBA}" is not four numbers.`,
    );
    return undefined;
  }
  if (spec.n <= 0 || !Number.isInteger(spec.n)) return undefined;
  return spec;
};
