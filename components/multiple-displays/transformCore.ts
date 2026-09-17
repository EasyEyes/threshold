/**
 * Pure deg<->px perspective transforms, no dependencies (no Screens globals,
 * no DOM). This is the single source of truth for the transform math, used by
 * the runtime wrappers in ./utils.ts AND by the nearest-point-bug data-repair
 * tool — the tool must never reimplement this math.
 *
 * Conventions:
 * - px: psychoJS convention, origin at screen center, y up.
 * - deg: eccentricity relative to fixation, y up.
 * - The tan-warp is centered on the nearest point (the eye's perpendicular
 *   foot in the screen plane); the deg origin always lands on fixation
 *   because nearestPointXYDeg is derived from the fixation position.
 */

export interface TransformParams {
  pxPerCm: number;
  viewingDistanceCm: number;
  /** Fixation position in psychoJS px (deg coordinates are relative to it). */
  fixationXYPx: number[];
  /** Nearest point (eye's perpendicular foot) in psychoJS px. */
  nearestPointXYZPx: number[];
}

const isSinglePoint = (l: number[] | number[][]): boolean =>
  Array.isArray(l) &&
  l.length === 2 &&
  typeof l[0] === "number" &&
  typeof l[1] === "number";

/** Radial px->deg about the nearest point. Delta (not absolute) vectors. */
export const deltaXYDegOfPx = (
  deltaXYPx: number[],
  pxPerCm: number,
  viewingDistanceCm: number,
): number[] => {
  const rPx = Math.sqrt(
    deltaXYPx[0] * deltaXYPx[0] + deltaXYPx[1] * deltaXYPx[1],
  );
  if (rPx == 0) {
    return [0, 0];
  }
  const rRad = Math.atan2(rPx / pxPerCm, viewingDistanceCm);
  const rDeg = rRad * (180 / Math.PI);
  return [(deltaXYPx[0] * rDeg) / rPx, (deltaXYPx[1] * rDeg) / rPx];
};

/** Radial deg->px about the nearest point. Delta (not absolute) vectors. */
export const deltaXYPxOfDeg = (
  deltaXYDeg: number[],
  pxPerCm: number,
  viewingDistanceCm: number,
): number[] => {
  const rDeg = Math.sqrt(
    deltaXYDeg[0] * deltaXYDeg[0] + deltaXYDeg[1] * deltaXYDeg[1],
  );
  if (rDeg >= 90) {
    const rCompensation = 89.99999999 / rDeg;
    return deltaXYPxOfDeg(
      [deltaXYDeg[0] * rCompensation, deltaXYDeg[1] * rCompensation],
      pxPerCm,
      viewingDistanceCm,
    );
  }
  const rPx = pxPerCm * viewingDistanceCm * Math.tan((rDeg * Math.PI) / 180);
  if (rDeg == 0) {
    return [0, 0];
  }
  return [(deltaXYDeg[0] * rPx) / rDeg, (deltaXYDeg[1] * rPx) / rDeg];
};

const nearestPointXYDegOf = (p: TransformParams): number[] => {
  const deltaFixationXYDeg = deltaXYDegOfPx(
    [
      p.fixationXYPx[0] - p.nearestPointXYZPx[0],
      p.fixationXYPx[1] - p.nearestPointXYZPx[1],
    ],
    p.pxPerCm,
    p.viewingDistanceCm,
  );
  return [-deltaFixationXYDeg[0], -deltaFixationXYDeg[1]];
};

/**
 * Convert deg (relative to fixation) to psychoJS px, for one point or a list.
 * Inverse of xyDegOfPxCore under the same params.
 */
export const xyPxOfDegCore = (
  xyDeg: number[] | number[][],
  p: TransformParams,
): number[] | number[][] => {
  const nearestPointXYDeg = nearestPointXYDegOf(p);
  const getXY = (point: number[]): number[] => {
    const deltaXYDeg = [
      point[0] - nearestPointXYDeg[0],
      point[1] - nearestPointXYDeg[1],
    ];
    const deltaXYPx = deltaXYPxOfDeg(
      deltaXYDeg,
      p.pxPerCm,
      p.viewingDistanceCm,
    );
    return [
      deltaXYPx[0] + p.nearestPointXYZPx[0],
      deltaXYPx[1] + p.nearestPointXYZPx[1],
    ];
  };
  if (isSinglePoint(xyDeg)) return getXY(xyDeg as number[]);
  return (xyDeg as number[][]).map(getXY);
};

/**
 * Convert psychoJS px to deg (relative to fixation), for one point or a list.
 * Inverse of xyPxOfDegCore under the same params.
 */
export const xyDegOfPxCore = (
  xyPx: number[] | number[][],
  p: TransformParams,
): number[] | number[][] => {
  const nearestPointXYDeg = nearestPointXYDegOf(p);
  const getXY = (point: number[]): number[] => {
    const deltaXYPx = [
      point[0] - p.nearestPointXYZPx[0],
      point[1] - p.nearestPointXYZPx[1],
    ];
    const deltaXYDeg = deltaXYDegOfPx(
      deltaXYPx,
      p.pxPerCm,
      p.viewingDistanceCm,
    );
    return [
      deltaXYDeg[0] + nearestPointXYDeg[0],
      deltaXYDeg[1] + nearestPointXYDeg[1],
    ];
  };
  if (isSinglePoint(xyPx)) return getXY(xyPx as number[]);
  return (xyPx as number[][]).map(getXY);
};
