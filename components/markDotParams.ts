import type { ParamReader } from "../parameters/paramReader";
import { inGlossary, isExplicitlySet } from "./explicitParams";

export interface DotSpec {
  xyDeg: [number, number];
  diameterDeg: number;
  colorRGBA: string;
  /** TRUE follows the current crosshair; FALSE uses nominal fixation. */
  trackFixationBool: boolean;
}

export type LegacyMarkDot = Omit<DotSpec, "trackFixationBool">;

const LEGACY_PARAM = "markDot";
const XY_PARAM = "markDotXYDeg";
const DIAMETER_PARAM = "markDotDiameterDeg";
const TRACK_PARAM = "markDotTrackFixationBool";
const COLOR_PARAM = "markDotColorRGBA";

const allFinite = (values: number[]): boolean =>
  values.every((value) => Number.isFinite(value));

const parseNumericList = (value: unknown): number[] => {
  const fields = Array.isArray(value) ? value : String(value).split(",");
  return fields.map((field) =>
    typeof field === "string" && field.trim() === "" ? NaN : Number(field),
  );
};

/** Parse the legacy x,y,diameter,r,g,b,a string. */
export const parseMarkDot = (value: string): LegacyMarkDot | undefined => {
  const fields = value.split(",").map((field) => field.trim());
  if (fields.length !== 7) return undefined;
  const numbers = parseNumericList(fields);
  if (!allFinite(numbers)) {
    console.warn(
      `parseMarkDot: skipping markDot, non-finite numeric field in "${value}".`,
    );
    return undefined;
  }
  return {
    xyDeg: [numbers[0], numbers[1]],
    diameterDeg: numbers[2],
    colorRGBA: numbers.slice(3).join(","),
  };
};

/**
 * Resolve each aspect independently: explicit new value, then legacy value,
 * then glossary default. A non-positive diameter or malformed vector means
 * no dot, rather than allowing NaN into stimulus construction.
 */
export const resolveDotSpec = (
  reader: ParamReader,
  bc: string,
): DotSpec | undefined => {
  const read = (name: string): unknown => reader.read(name, bc);
  const isExplicit = (name: string): boolean =>
    isExplicitlySet(reader, name, bc);

  const legacy = isExplicit(LEGACY_PARAM)
    ? parseMarkDot(String(read(LEGACY_PARAM)))
    : undefined;

  let diameterDeg: number;
  if (isExplicit(DIAMETER_PARAM)) diameterDeg = Number(read(DIAMETER_PARAM));
  else if (legacy) diameterDeg = legacy.diameterDeg;
  else if (inGlossary(DIAMETER_PARAM))
    diameterDeg = Number(read(DIAMETER_PARAM));
  else diameterDeg = 0;

  let xyValue: unknown;
  if (isExplicit(XY_PARAM)) xyValue = read(XY_PARAM);
  else if (legacy) xyValue = legacy.xyDeg;
  else if (inGlossary(XY_PARAM)) xyValue = read(XY_PARAM);
  else xyValue = [0, 0];
  const xyDeg = parseNumericList(xyValue);

  let colorValue: unknown;
  if (isExplicit(COLOR_PARAM)) colorValue = read(COLOR_PARAM);
  else if (legacy) colorValue = legacy.colorRGBA;
  else if (inGlossary(COLOR_PARAM)) colorValue = read(COLOR_PARAM);
  else colorValue = "0,0,0,1";
  const colorRGBA = parseNumericList(colorValue);

  const trackFixationBool =
    isExplicit(TRACK_PARAM) && read(TRACK_PARAM) === true;

  if (!Number.isFinite(diameterDeg)) {
    console.warn("resolveDotSpec: skipping dot, non-finite diameterDeg.");
    return undefined;
  }
  if (diameterDeg <= 0) return undefined;
  if (xyDeg.length !== 2 || !allFinite(xyDeg)) {
    console.warn("resolveDotSpec: skipping dot, XYDeg is not two numbers.");
    return undefined;
  }
  if (colorRGBA.length !== 4 || !allFinite(colorRGBA)) {
    console.warn(
      "resolveDotSpec: skipping dot, colorRGBA is not four numbers.",
    );
    return undefined;
  }

  return {
    xyDeg: [xyDeg[0], xyDeg[1]],
    diameterDeg,
    colorRGBA: colorRGBA.join(","),
    trackFixationBool,
  };
};
