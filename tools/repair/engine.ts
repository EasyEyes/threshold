// @ts-nocheck — CLI-shared module. Uses .ts import paths for Node's
// --experimental-strip-types (see simulate.cli.ts).
/**
 * Repair engine for the nearest-point coordinate bug
 * (commits 683256fe..43c5fc8e, ~2025-08-30..2026-09: rc's top-left/y-down
 * nearestXYPx was used verbatim as psychoJS center-origin/y-up px).
 *
 * PURE module — no DOM, no node APIs. Consumed by jest tests, the CLI, and
 * the bundled web page. All transform math comes from
 * components/multiple-displays/transformCore (single source of truth).
 *
 * Design:
 * - What was SHOWN is determined by `nearestUsed` = the value fed to the
 *   transforms. Recovered per row from TWO independent logged sources:
 *   1. nearpointXYPxAppleCoords = floor([nx + W'/2, H'/2 - ny]) of the used
 *      value. W' (window size) is NOT logged, so this source alone is
 *      ambiguous for non-fullscreen runs — EXCEPT when it equals the screen
 *      center exactly, which implies nearestUsed=[0,0] under every
 *      interpretation.
 *   2. screenBoundingRectDeg = XYDegOfPx of the screen corners through the
 *   same (possibly buggy) transform, using LOGGED screen dims. A 2-parameter
 *   numeric fit of the nearest point reproduces this value; its residual is
 *   the acceptance test.
 * - Correction applies only when the row is confidently BUGGY:
 *   - nearestUsed != [0,0], AND
 *   - version evidence says the value was RAW rc (buggy code):
 *     * nearestXYPx column == nearestUsed -> the column logged the raw
 *       value and it was used raw (S2 buggy). (S4 logs the converted value,
 *       which would equal nearestUsed only if nearestUsed is small —
 *       excluded by the raw-plausibility band.)
 *     * nearestXYPx column == raw-of(nearestUsed) (i.e. nearestUsed ==
 *       convert(column)) -> fix1 code (S3): transform already used the
 *       converted value -> UNAFFECTED by this bug.
 *     * no nearestXYPx column -> band + rect evidence only; if both
 *       interpretations are plausible, FLAG (ambiguous).
 * - Conservative by construction: any missing/inconsistent input -> FLAG
 *   with the reason named. Original columns are never modified; corrected
 *   values are appended.
 */

import {
  xyPxOfDegCore,
  xyDegOfPxCore,
  type TransformParams,
} from "../../components/multiple-displays/transformCore.ts";

export interface ParsedCsv {
  header: string[];
  rows: string[][];
}

/** Quote-aware CSV parsing. Handles commas AND newlines inside quoted
 * cells (the exporter writes multi-line strings, eg instructions). */
export const parseCsv = (text: string): ParsedCsv => {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const pushCell = () => {
    row.push(cur.trim());
    cur = "";
  };
  const pushRow = () => {
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") pushCell();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      pushCell();
      pushRow();
    } else cur += ch;
  }
  pushCell();
  pushRow();
  return { header: rows[0] ?? [], rows: rows.slice(1) };
};

export type RowStatus = "CORRECTED" | "UNAFFECTED" | "FLAGGED";

export interface RowOutcome {
  status: RowStatus;
  statusReason: string;
  nearestUsedXY?: [number, number];
  nearestCorrectXY?: [number, number];
  actualTargetEccentricityXDeg?: number;
  actualTargetEccentricityYDeg?: number;
  actualSpacingDeg?: number;
  actualSizeDeg?: number;
  actualLevelLog10Deg?: number;
  /** Extra columns to append to the output CSV (never modify originals). */
  columns: Record<string, string>;
}

export interface FileResult {
  rows: RowOutcome[];
  summary: {
    total: number;
    corrected: number;
    unaffected: number;
    flagged: number;
  };
}

const num = (s: string | undefined): number | undefined => {
  if (s === undefined) return undefined;
  const v = Number(s);
  return Number.isFinite(v) ? v : undefined;
};

/** "1380, 60" -> [1380, 60] */
const parseXY = (s: string): [number, number] | undefined => {
  const m = s.match(/(-?[\d.]+)\s*,\s*(-?[\d.]+)/);
  if (!m) return undefined;
  const x = Number(m[1]);
  const y = Number(m[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : undefined;
};

/** "[(-12.79, -7.44), (15.64, 8.91)]" -> [[blx,bly],[trx,try]] */
const parseRectDeg = (
  s: string,
): [[number, number], [number, number]] | undefined => {
  const m = s.match(
    /\[\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)\s*,\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)\s*\]/,
  );
  if (!m) return undefined;
  const v = m.slice(1).map(Number);
  return v.every(Number.isFinite)
    ? [
        [v[0], v[1]],
        [v[2], v[3]],
      ]
    : undefined;
};

const convertRcToPsychoJS = (
  raw: number[],
  screenW: number,
  screenH: number,
): [number, number] => [raw[0] - screenW / 2, screenH / 2 - raw[1]];

/**
 * Fit the nearest point (center-origin px) to the logged screenBoundingRectDeg,
 * by minimizing corner residuals of xyDegOfPxCore over the screen corners.
 * Coordinate descent with shrinking steps; deterministic.
 */
export const fitNearestFromRect = (
  rectDeg: [[number, number], [number, number]],
  base: {
    pxPerCm: number;
    viewingDistanceCm: number;
    screenW: number;
    screenH: number;
    fixationXYPx?: number[];
  },
  initialGuesses: Array<[number, number]> = [],
  varyDistance = false,
): {
  nearest: [number, number];
  viewingDistanceCm: number;
  residualDeg: number;
} => {
  const corners: Array<[number, number]> = [
    [-base.screenW / 2, -base.screenH / 2],
    [base.screenW / 2, base.screenH / 2],
  ];
  // State: [nx, ny] or [nx, ny, distCm] when varyDistance.
  const dims = varyDistance ? 3 : 2;
  const paramsOf = (n: number[]): TransformParams => ({
    pxPerCm: base.pxPerCm,
    viewingDistanceCm: varyDistance ? n[2] : base.viewingDistanceCm,
    fixationXYPx: base.fixationXYPx ?? [0, 0],
    nearestPointXYZPx: [n[0], n[1]],
  });
  const residual = (n: number[]): number => {
    let sum = 0;
    for (let i = 0; i < 2; i++) {
      const pred = xyDegOfPxCore(corners[i], paramsOf(n)) as number[];
      const dx = pred[0] - rectDeg[i][0];
      const dy = pred[1] - rectDeg[i][1];
      sum += dx * dx + dy * dy;
    }
    return Math.sqrt(sum);
  };
  const toState = (g: number[]): number[] =>
    varyDistance ? [...g, base.viewingDistanceCm] : [...g];
  const guesses: number[][] = [
    ...initialGuesses.map((g) => toState([...g] as number[])),
    toState([0, 0]),
    toState([base.screenW / 2, base.screenH / 2]),
    toState([base.screenW / 4, base.screenH / 4]),
  ];
  let best = guesses[0];
  let bestR = residual(best);
  for (const g of guesses.slice(1)) {
    const r = residual(g);
    if (r < bestR) {
      bestR = r;
      best = g;
    }
  }
  let step = Math.max(base.screenW, base.screenH) / 8;
  while (step >= 0.25) {
    let improved = true;
    while (improved) {
      improved = false;
      for (let axis = 0; axis < dims; axis++) {
        for (const dir of [1, -1]) {
          const cand = [...best];
          cand[axis] += dir * step;
          const r = residual(cand);
          if (r < bestR - 1e-12) {
            bestR = r;
            best = cand;
            improved = true;
          }
        }
      }
    }
    step /= 2;
  }
  return {
    nearest: [best[0], best[1]],
    viewingDistanceCm: best[2] ?? base.viewingDistanceCm,
    residualDeg: bestR,
  };
};

const RECT_ACCEPT_DEG = 0.15;
// Same session, different moments: the eye drifts between the condition row
// (apple/rect) and a trial row (nearestXYPx). Beyond this, "inconsistent".
const SESSION_EYE_DRIFT_PX = 150;
const APPLE_CENTER_TOL_PX = 2.5;
const PX_AGREE = 3;

/** rc raw values live near [screenW/2, ~from-top] — structural band. */
const plausibleRawRc = (v: number[], SW: number, SH: number): boolean =>
  v[0] > 0.1 * SW && v[0] < 0.9 * SW && v[1] > -0.25 * SH && v[1] < 0.95 * SH;
/** Converted (center-origin) eye offsets are small compared to the screen. */
const plausibleConverted = (v: number[], SW: number, SH: number): boolean =>
  Math.abs(v[0]) < 0.4 * SW && Math.abs(v[1]) < 0.4 * SH;

/**
 * Nominal fixation position in px (center-origin, y up), replicating
 * components/fixation.ts getFixationPos: non-centerFixation strategies fall
 * back to [0,0] (as the runtime does); otherwise the origin fractions map
 * to [(2x-1)W/2, (2y-1)H/2] (rounded), with the image target-section remap
 * when a spare fraction is configured. Window assumed == screen (the
 * window size is not logged; discrepancy is caught by the rect residual).
 */
const nominalFixationPxOf = (
  rowCell: (name: string) => string | undefined,
  screenW: number,
  screenH: number,
): number[] => {
  const strategy = rowCell("fixationLocationStrategy") ?? "centerFixation";
  if (strategy !== "centerFixation") return [0, 0];
  const m = (rowCell("fixationOriginXYScreen") ?? "0.5, 0.5").match(
    /([\d.]+)\s*,\s*([\d.]+)/,
  );
  if (!m) return [0, 0];
  let fx = Number(m[1]);
  let fy = Number(m[2]);
  const spare = num(rowCell("targetImageSpareFraction") ?? "");
  if (spare && spare > 0) {
    const where = rowCell("targetImageWhere") ?? "top";
    let xMin = 0,
      xMax = 1,
      yMin = 0,
      yMax = 1;
    if (where === "top") yMin = spare;
    else if (where === "bottom") yMax = 1 - spare;
    else if (where === "left") xMax = 1 - spare;
    else xMin = spare;
    fx = xMin + fx * (xMax - xMin);
    fy = yMin + fy * (yMax - yMin);
  }
  return [
    Math.round((2 * fx - 1) * (screenW / 2)),
    Math.round((2 * fy - 1) * (screenH / 2)),
  ];
};

const flagged = (reason: string): RowOutcome => ({
  status: "FLAGGED",
  statusReason: reason,
  columns: { repairStatus: "FLAGGED", repairStatusReason: reason },
});

export const repairCsv = (csvText: string): FileResult => {
  const { header, rows } = parseCsv(csvText);
  const col = (name: string) => header.indexOf(name);
  const cell = (row: string[], name: string): string | undefined => {
    const i = col(name);
    if (i < 0) return undefined;
    const v = row[i];
    return v === "" ? undefined : v;
  };
  const firstCell = (name: string): string | undefined => {
    for (const r of rows) {
      const v = cell(r, name);
      if (v !== undefined) return v;
    }
    return undefined;
  };

  const screenW = num(firstCell("screenWidthPx"));
  const screenH = num(firstCell("screenHeightPx"));
  const pxPerCm = num(firstCell("pxPerCm"));

  // Files dated before the bug was introduced (2025-08-30, commit 683256fe)
  // are unaffected regardless of anything else: that code hardcoded the
  // nearest point at [0,0]. A lower bound only — deployment lag can delay
  // the bug's appearance, never predate its commit.
  const BUG_INTRODUCED_YYYYMMDD = "2025-08-30";
  // Files dated before the fix commit cannot contain the fix (deployment can
  // only delay the fix's appearance, never predate the commit).
  const BUG_FIXED_YYYYMMDD = "2026-09-15";
  const dateRaw = firstCell("date") ?? "";
  const fileDate = dateRaw.match(/(\d{4})-(\d{2})-(\d{2})/);
  const ymd = fileDate ? `${fileDate[1]}-${fileDate[2]}-${fileDate[3]}` : "";
  const predatesBug = !!ymd && ymd < BUG_INTRODUCED_YYYYMMDD;
  const predatesFix = !!ymd && ymd < BUG_FIXED_YYYYMMDD;

  // The exporter writes session/condition-level columns (apparatus info,
  // appleCoords, screenBoundingRectDeg, condition parameters) only on SOME
  // rows; trial rows inherit them. Forward-fill every column we consume.
  // NB nearestXYPx is deliberately NOT forward-filled: it is a
  // stimulus-time value and its absence on a row is meaningful (the live
  // nearest point for that trial is unknown once tracking is updating).
  const consumed = [
    "nearpointXYPxAppleCoords",
    "screenBoundingRectDeg",
    "targetEccentricityXDeg",
    "targetEccentricityYDeg",
    "markingFixationMotionRadiusDeg",
    "thresholdParameter",
    "level",
    "targetKind",
    "fixationOriginXYScreen",
    "fixationLocationStrategy",
    "spacingDirection",
    "targetSizeIsHeightBool",
    "targetImageSpareFraction",
    "targetImageWhere",
    "spacingDeg",
    "targetSizeDeg",
    "flankerSpacingDeg",
    "distanceCm",
    "viewingDistancePredictedCm",
    "viewingDistanceDesiredCm",
    "pxPerCm",
    "screenWidthPx",
    "screenHeightPx",
  ];
  const filled: string[][] = rows.map((r) => [...r]);
  const last = new Map<string, string>();
  filled.forEach((r) => {
    for (const name of consumed) {
      const i = col(name);
      if (i < 0) continue;
      const v = r[i];
      if (v !== "" && v !== undefined) last.set(name, v);
      else if (last.has(name)) r[i] = last.get(name)!;
    }
  });
  const rowCell = (row: string[], name: string): string | undefined => {
    const i = col(name);
    if (i < 0) return undefined;
    const v = row[i];
    return v === "" ? undefined : v;
  };

  const out: RowOutcome[] = rows.map(() => flagged("not assessed"));
  let corrected = 0;
  let unaffected = 0;
  let flaggedCount = 0;

  rows.forEach((row0, idx) => {
    const row = filled[idx];
    const appleRaw = rowCell(row, "nearpointXYPxAppleCoords");
    const rectRaw = rowCell(row, "screenBoundingRectDeg");
    const nearestColRaw = rowCell(row, "nearestXYPx");
    const eccX = num(rowCell(row, "targetEccentricityXDeg"));
    const eccY = num(rowCell(row, "targetEccentricityYDeg"));
    const motionRadius = num(rowCell(row, "markingFixationMotionRadiusDeg"));
    const thresholdParameter = rowCell(row, "thresholdParameter");
    const level = num(rowCell(row, "level"));

    // Distance for the transform: tracked > predicted > desired.
    const dist =
      num(rowCell(row, "distanceCm")) ??
      num(rowCell(row, "viewingDistancePredictedCm")) ??
      num(firstCell("viewingDistanceDesiredCm"));
    const fixation = nominalFixationPxOf(
      (name) => rowCell(row, name),
      screenW,
      screenH,
    );

    if (predatesBug) {
      out[idx] = {
        status: "UNAFFECTED",
        statusReason: `run predates the bug (date ${dateRaw.slice(
          0,
          10,
        )} < 2025-08-30; code hardcoded nearest [0,0])`,
        nearestUsedXY: [0, 0],
        columns: {
          repairStatus: "UNAFFECTED",
          repairStatusReason: "predates bug",
        },
      };
      return;
    }

    if (
      !(screenW && screenW > 0) ||
      !(screenH && screenH > 0) ||
      !(pxPerCm && pxPerCm > 0) ||
      !(dist && dist > 0)
    ) {
      out[idx] = flagged(
        "missing apparatus columns (pxPerCm/screenWidthPx/screenHeightPx/distance)",
      );
      return;
    }

    // --- Recover nearestUsed -------------------------------------------
    const apple = appleRaw ? parseXY(appleRaw) : undefined;
    const rect = rectRaw ? parseRectDeg(rectRaw) : undefined;

    // Case 1: apple exactly at screen center -> nearestUsed [0,0] under
    // EVERY window-size interpretation (any nonzero nearest would require
    // an off-center apple for SOME window size; at screen center the value
    // is [0,0] for both the fullscreen and the centered-window readings,
    // and any residual discrepancy is bounded by the window/screen
    // difference — negligible).
    if (
      apple &&
      !nearestColRaw &&
      Math.abs(apple[0] - screenW / 2) <= APPLE_CENTER_TOL_PX &&
      Math.abs(apple[1] - screenH / 2) <= APPLE_CENTER_TOL_PX
    ) {
      out[idx] = {
        status: "UNAFFECTED",
        statusReason: "nearest point at screen center [0,0]; bug never active",
        nearestUsedXY: [0, 0],
        columns: {
          repairStatus: "UNAFFECTED",
          repairStatusReason: "nearest point at screen center [0,0]",
        },
      };
      return;
    }

    if (!rect) {
      out[idx] = flagged(
        apple
          ? "no screenBoundingRectDeg, non-center apple — window size unknown"
          : "no nearest-point data on this row or prior (metadata row?)",
      );
      return;
    }

    const appleInverted: [number, number] | undefined = apple
      ? [apple[0] - screenW / 2, screenH / 2 - apple[1]]
      : undefined;
    const fitBase = {
      pxPerCm,
      viewingDistanceCm: dist,
      screenW,
      screenH,
      fixationXYPx: fixation,
    };
    let fit = fitNearestFromRect(
      rect,
      fitBase,
      appleInverted ? [appleInverted] : [],
    );
    let distUsed = dist;
    let distNote = "";
    // The rect was computed with the LIVE viewing distance, which may differ
    // from the logged one. Retry with distance free; accept only if the
    // fitted distance stays plausible (within 25% of the logged value).
    if (fit.residualDeg > RECT_ACCEPT_DEG) {
      const flex = fitNearestFromRect(
        rect,
        fitBase,
        appleInverted ? [appleInverted] : [],
        true,
      );
      if (
        flex.residualDeg <= RECT_ACCEPT_DEG &&
        flex.viewingDistanceCm >= 15 &&
        flex.viewingDistanceCm <= 250
      ) {
        fit = flex;
        distUsed = flex.viewingDistanceCm;
        distNote = `; rect fit moved viewing distance ${dist.toFixed(
          1,
        )}->${distUsed.toFixed(1)} cm`;
      }
    }
    if (fit.residualDeg > RECT_ACCEPT_DEG) {
      out[idx] = flagged(
        `screenBoundingRectDeg not reproducible (fit residual ${fit.residualDeg.toFixed(
          3,
        )} deg). Likely cause: viewing distance at logging time differed, or the (unlogged) random fixation offset was nonzero — neither recoverable from this file.`,
      );
      return;
    }
    const nearestUsed = fit.nearest;
    // Corroborate with apple when the window == screen (the common case).
    let appleAgrees = true;
    if (appleInverted) {
      appleAgrees =
        Math.abs(appleInverted[0] - nearestUsed[0]) <= PX_AGREE &&
        Math.abs(appleInverted[1] - nearestUsed[1]) <= PX_AGREE;
    }
    const appleNote = appleAgrees
      ? ""
      : " (appleCoords disagrees — non-fullscreen window; rect fit used)";

    if (
      !nearestColRaw &&
      Math.abs(nearestUsed[0]) <= 5 &&
      Math.abs(nearestUsed[1]) <= 5
    ) {
      out[idx] = {
        status: "UNAFFECTED",
        statusReason:
          "nearest point at screen center [0,0]; bug never active" + appleNote,
        nearestUsedXY: [0, 0],
        columns: {
          repairStatus: "UNAFFECTED",
          repairStatusReason: "nearest point at screen center [0,0]",
        },
      };
      return;
    }
    // --- Version determination ------------------------------------------
    // Condition-time verdict from the rect fit (bands; apple corroborates).
    const rawBand = plausibleRawRc(nearestUsed, screenW, screenH);
    const convBand = plausibleConverted(nearestUsed, screenW, screenH);
    let isBuggy: boolean;
    let nearestForRow: [number, number] = nearestUsed;
    if (nearestColRaw) {
      // nearestXYPx is logged at STIMULUS time (per trial) — a different
      // moment than the condition-row apple/rect, so the eye may have
      // drifted. Check drift under the MATCHING hypothesis:
      //   S2 buggy: condition value IS raw; trial raw should drift-match it.
      //   S3 fix1: condition value is CONVERTED; raw-of-it should match.
      const nearestCol = parseXY(nearestColRaw);
      if (!nearestCol) {
        out[idx] = flagged("nearestXYPx column unparseable");
        return;
      }
      const driftA = Math.hypot(
        nearestCol[0] - nearestUsed[0],
        nearestCol[1] - nearestUsed[1],
      );
      const rawOfCond: [number, number] = [
        nearestUsed[0] + screenW / 2,
        screenH / 2 - nearestUsed[1],
      ];
      const driftB = Math.hypot(
        nearestCol[0] - rawOfCond[0],
        nearestCol[1] - rawOfCond[1],
      );
      const condWasCenter =
        Math.abs(nearestUsed[0]) <= 5 && Math.abs(nearestUsed[1]) <= 5;
      if (predatesFix) {
        // This file predates the fix commit: the only buggy-window code that
        // logs a stimulus-time nearestXYPx used it RAW — the column is
        // verbatim what the transform consumed. Drift-check only when the
        // condition row actually had a nearest point (tracking already
        // running); if tracking started mid-session there is nothing to
        // compare against.
        if (
          !condWasCenter &&
          driftA > SESSION_EYE_DRIFT_PX &&
          driftB > SESSION_EYE_DRIFT_PX
        ) {
          out[idx] = flagged(
            `nearestXYPx (trial time) inconsistent with condition-row geometry (drift ${Math.min(
              driftA,
              driftB,
            ).toFixed(0)} px)`,
          );
          return;
        }
        isBuggy = true;
        nearestForRow = nearestCol; // stimulus-time raw value
      } else if (rawBand && !convBand) {
        if (driftA > SESSION_EYE_DRIFT_PX) {
          out[idx] = flagged(
            `nearestXYPx (trial time) inconsistent with condition-row geometry (drift ${driftA.toFixed(
              0,
            )} px)`,
          );
          return;
        }
        isBuggy = true;
        nearestForRow = nearestCol; // stimulus-time raw value
      } else if (convBand && !rawBand) {
        if (driftB > SESSION_EYE_DRIFT_PX) {
          out[idx] = flagged(
            `trial-time nearestXYPx inconsistent with condition geometry (drift ${driftB.toFixed(
              0,
            )} px)`,
          );
          return;
        }
        isBuggy = false; // fix1/fixed: transform used the converted value
      } else {
        out[idx] = flagged(
          "ambiguous: nearest fits raw rc (buggy) and converted (fixed) equally" +
            appleNote,
        );
        return;
      }
    } else {
      if (rawBand && !convBand) isBuggy = true;
      else if (convBand && !rawBand) isBuggy = false;
      else {
        out[idx] = flagged(
          "ambiguous: nearest fits raw rc (buggy) and converted (fixed) equally" +
            appleNote,
        );
        return;
      }
    }
    if (
      isBuggy &&
      !predatesFix &&
      !plausibleRawRc(nearestForRow, screenW, screenH)
    ) {
      out[idx] = flagged(
        "nearest outside plausible rc band — not corrected" + appleNote,
      );
      return;
    }
    if (isBuggy && !nearestColRaw && nearestUsed.some((v) => v !== 0)) {
      // No stimulus-time value: the live nearest point during these trials
      // is only known at condition granularity. Letter runs log it per
      // trial; its absence with a nonzero condition value means an unknown
      // live eye position.
      out[idx] = flagged(
        "buggy session; no stimulus-time nearestXYPx on this row — live eye unknown" +
          appleNote,
      );
      return;
    }

    if (!isBuggy) {
      out[idx] = {
        status: "UNAFFECTED",
        statusReason:
          "fix already applied (converted nearest used)" + appleNote,
        nearestUsedXY: nearestUsed,
        columns: {
          repairStatus: "UNAFFECTED",
          repairStatusReason: "fixed-code run",
        },
      };
      return;
    }

    // --- Moving crosshair / static-fixation caveat -----------------------
    if (motionRadius !== undefined && motionRadius > 0) {
      out[idx] = flagged(
        "moving crosshair (markingFixationMotionRadiusDeg > 0); per-frame fixation unknown",
      );
      return;
    }

    // --- Corrections ------------------------------------------------------
    const nearestCorrect = convertRcToPsychoJS(nearestForRow, screenW, screenH);
    // The transform at stimulus time ran with the LIVE viewing distance;
    // the per-trial tracked distanceCm column is that value (same update
    // tick), so prefer it over the condition-time rect-fitted distance.
    const distForCorrection = num(rowCell(row, "distanceCm")) ?? distUsed;
    const buggyParams: TransformParams = {
      pxPerCm,
      viewingDistanceCm: distForCorrection,
      fixationXYPx: fixation,
      nearestPointXYZPx: nearestForRow,
    };
    const correctParams: TransformParams = {
      ...buggyParams,
      nearestPointXYZPx: nearestCorrect,
    };
    const columns: Record<string, string> = {};
    const result: RowOutcome = {
      status: "CORRECTED",
      statusReason:
        "nearest recovered; corrected (static fixation assumed — random offset not logged)" +
        appleNote +
        distNote,
      nearestUsedXY: nearestForRow,
      nearestCorrectXY: nearestCorrect,
      columns,
    };

    /** Actual deg length of a requested deg vector at the target position,
     * along an arbitrary direction. */
    const actualLength = (
      t: number[],
      direction: number[],
      requested: number,
    ): number | undefined => {
      if (!(requested > 0) || !Number.isFinite(requested)) return undefined;
      const p1 = xyPxOfDegCore(t, buggyParams) as number[];
      const p2 = xyPxOfDegCore(
        [t[0] + direction[0] * requested, t[1] + direction[1] * requested],
        buggyParams,
      ) as number[];
      const d1 = xyDegOfPxCore(p1, correctParams) as number[];
      const d2 = xyDegOfPxCore(p2, correctParams) as number[];
      return Math.hypot(d2[0] - d1[0], d2[1] - d1[1]);
    };

    const t =
      eccX !== undefined && eccY !== undefined ? [eccX, eccY] : undefined;
    if (t) {
      const px = xyPxOfDegCore(t, buggyParams) as number[];
      const actual = xyDegOfPxCore(px, correctParams) as number[];
      result.actualTargetEccentricityXDeg = actual[0];
      result.actualTargetEccentricityYDeg = actual[1];
      columns.actualTargetEccentricityXDeg = actual[0].toFixed(4);
      columns.actualTargetEccentricityYDeg = actual[1].toFixed(4);
      columns.drawnTargetXYPx = `${px[0].toFixed(1)}, ${px[1].toFixed(1)}`;
      const correctedPx = xyPxOfDegCore(t, correctParams) as number[];
      columns.correctedTargetXYPx = `${correctedPx[0].toFixed(
        1,
      )}, ${correctedPx[1].toFixed(1)}`;
    }

    // Directions at the target: radial (from fixation) & tangential.
    const radial = t
      ? (() => {
          const r = Math.hypot(t[0], t[1]) || 1;
          return [t[0] / r, t[1] / r];
        })()
      : [1, 0];
    const tangential = [-radial[1], radial[0]];

    const requestedLevelDeg = level === undefined ? NaN : Math.pow(10, level);

    if (t && thresholdParameter === "spacingDeg") {
      const spacingDirection = rowCell(row, "spacingDirection") ?? "radial";
      const dirFor = (d: string): number[] => {
        if (d.includes("horizontal")) return [1, 0];
        if (d.includes("vertical")) return [0, 1];
        if (d.includes("tangential")) return tangential;
        return radial;
      };
      const primary = actualLength(
        t,
        dirFor(spacingDirection),
        requestedLevelDeg,
      );
      if (primary !== undefined) {
        result.actualSpacingDeg = primary;
        result.actualLevelLog10Deg = Math.log10(primary);
        columns.actualSpacingDeg = primary.toFixed(4);
        columns.actualLevelLog10Deg = result.actualLevelLog10Deg.toFixed(4);
      }
      if (/And/.test(spacingDirection)) {
        const secondaryDir = spacingDirection.includes("radial")
          ? tangential
          : [1, 0];
        const secondary = actualLength(t, secondaryDir, requestedLevelDeg);
        if (secondary !== undefined)
          columns.actualSpacingSecondaryDeg = secondary.toFixed(4);
      }
    }

    if (t && thresholdParameter === "targetSizeDeg") {
      // Size is height when targetSizeIsHeightBool (default FALSE = width).
      const isHeight = /true/i.test(
        rowCell(row, "targetSizeIsHeightBool") ?? "FALSE",
      );
      const sizeDir = isHeight ? [0, 1] : [1, 0];
      const actualSize = actualLength(t, sizeDir, requestedLevelDeg);
      if (actualSize !== undefined) {
        result.actualSizeDeg = actualSize;
        result.actualLevelLog10Deg = Math.log10(actualSize);
        columns.actualSizeDeg = actualSize.toFixed(4);
        columns.actualLevelLog10Deg = result.actualLevelLog10Deg.toFixed(4);
      }
    }

    if (
      t &&
      thresholdParameter === "targetEccentricityXDeg" &&
      result.actualTargetEccentricityXDeg !== undefined
    ) {
      const actualEcc = Math.hypot(
        result.actualTargetEccentricityXDeg,
        result.actualTargetEccentricityYDeg ?? 0,
      );
      result.actualLevelLog10Deg = Math.log10(actualEcc);
      columns.actualLevelLog10Deg = result.actualLevelLog10Deg.toFixed(4);
    }

    if (t && thresholdParameter === "targetOffsetDeg") {
      // Vernier: horizontal offset between two vertical colinear lines.
      const actualOffset = actualLength(t, [1, 0], requestedLevelDeg);
      if (actualOffset !== undefined) {
        result.actualLevelLog10Deg = Math.log10(actualOffset);
        columns.actualLevelLog10Deg = result.actualLevelLog10Deg.toFixed(4);
      }
    }

    // Nominal deg columns are geometric facts regardless of how the
    // experiment combined parameters: what a gap/extent of the nominal size
    // at the target position actually measured.
    const spacingDirForNominal = (() => {
      const d = rowCell(row, "spacingDirection") ?? "radial";
      if (d.includes("horizontal")) return [1, 0];
      if (d.includes("vertical")) return [0, 1];
      if (d.includes("tangential")) return tangential;
      return radial;
    })();
    const nominalSpacing = num(rowCell(row, "spacingDeg") ?? "");
    if (
      t &&
      nominalSpacing !== undefined &&
      nominalSpacing > 0 &&
      thresholdParameter !== "spacingDeg"
    ) {
      const a = actualLength(t, spacingDirForNominal, nominalSpacing);
      if (a !== undefined) columns.actualSpacingDegNominal = a.toFixed(4);
    }
    const nominalSize = num(rowCell(row, "targetSizeDeg") ?? "");
    if (
      t &&
      nominalSize !== undefined &&
      nominalSize > 0 &&
      thresholdParameter !== "targetSizeDeg"
    ) {
      const isHeight = /true/i.test(
        rowCell(row, "targetSizeIsHeightBool") ?? "FALSE",
      );
      const a = actualLength(t, isHeight ? [0, 1] : [1, 0], nominalSize);
      if (a !== undefined) columns.actualSizeDegNominal = a.toFixed(4);
    }
    const flankerSpacing = num(rowCell(row, "flankerSpacingDeg") ?? "");
    if (t && flankerSpacing !== undefined && flankerSpacing > 0) {
      const a = actualLength(t, radial, flankerSpacing);
      if (a !== undefined) columns.actualFlankerSpacingDeg = a.toFixed(4);
    }

    // What the CORRECT screen bounding rect would have been.
    {
      const bl = xyDegOfPxCore(
        [-screenW / 2, -screenH / 2],
        correctParams,
      ) as number[];
      const tr = xyDegOfPxCore(
        [screenW / 2, screenH / 2],
        correctParams,
      ) as number[];
      columns.screenBoundingRectDegCorrected = `[(${bl[0].toFixed(
        4,
      )}, ${bl[1].toFixed(4)}), (${tr[0].toFixed(4)}, ${tr[1].toFixed(4)})]`;
    }

    // --- Gaze columns ---------------------------------------------------
    // Logged gaze deg was computed through the same buggy transform at
    // response time. Recover the true deg: logged deg -> px (buggy
    // params) -> deg (correct params). The pivot at gaze time was not
    // logged, so the stimulus-time recovered nearest is used (noted).
    const hasGaze =
      rowCell(row, "gazeMeasuredXDeg") !== "" ||
      rowCell(row, "gazeMeasuredYDeg") !== "" ||
      rowCell(row, "gazeMeasuredRawDeg") !== "";
    if (hasGaze) {
      if (!appleAgrees) {
        // Gaze px were scaled by the (unknown) browser-window size; the
        // rect fit resolved the window only for the nearest point.
        result.statusReason += "; gaze left as logged (window size unknown)";
      } else {
        const fixGaze = (d: number[]): number[] => {
          const px = xyPxOfDegCore(d, buggyParams) as number[];
          return xyDegOfPxCore(px, correctParams) as number[];
        };
        const gx = num(rowCell(row, "gazeMeasuredXDeg"));
        const gy = num(rowCell(row, "gazeMeasuredYDeg"));
        let cx: number[] | undefined, cy: number[] | undefined;
        if (gx !== undefined) {
          cx = fixGaze([gx, gy ?? 0]);
          columns.gazeMeasuredXDeg = cx[0].toFixed(5);
        }
        if (gy !== undefined) {
          cy = fixGaze([gx ?? 0, gy]);
          columns.gazeMeasuredYDeg = cy[1].toFixed(5);
        }
        if (cx !== undefined || cy !== undefined) {
          const rx = cx ? cx[0] : gx!;
          const ry = cy ? cy[1] : gy!;
          columns.gazeMeasuredRDeg = Math.hypot(rx, ry).toFixed(5);
        }
        let gazeFixed = cx !== undefined || cy !== undefined;
        const rawGaze = rowCell(row, "gazeMeasuredRawDeg");
        if (rawGaze !== "") {
          try {
            const arr = JSON.parse(rawGaze);
            if (Array.isArray(arr) && arr.length > 0) {
              columns.gazeMeasuredRawDeg = JSON.stringify(
                arr.map((pt) => {
                  const c = fixGaze([Number(pt[0]), Number(pt[1])]);
                  return [Number(c[0].toFixed(5)), Number(c[1].toFixed(5))];
                }),
              );
              gazeFixed = true;
            }
          } catch {
            /* leave as logged */
          }
        }
        if (gazeFixed)
          result.statusReason +=
            "; gaze corrected via stimulus-time eye position (gaze-time position not logged)";
      }
    }

    columns.repairStatus = "CORRECTED";
    columns.repairStatusReason = result.statusReason;
    columns.nearestUsedXY = `${nearestForRow[0].toFixed(
      1,
    )}, ${nearestForRow[1].toFixed(1)}`;
    columns.nearestCorrectXY = `${nearestCorrect[0].toFixed(
      1,
    )}, ${nearestCorrect[1].toFixed(1)}`;
    out[idx] = result;
  });

  for (const r of out) {
    if (r.status === "CORRECTED") corrected++;
    else if (r.status === "UNAFFECTED") unaffected++;
    else flaggedCount++;
  }
  return {
    rows: out,
    summary: {
      total: out.length,
      corrected,
      unaffected,
      flagged: flaggedCount,
    },
  };
};

/** Column names the engine may append, in emission order. */
export const REPAIR_COLUMN_ORDER = [
  "repairStatus",
  "repairStatusReason",
  "repairImputedColumns",
  "nearestUsedXY",
  "nearestCorrectXY",
  "actualTargetEccentricityXDeg",
  "actualTargetEccentricityYDeg",
  "drawnTargetXYPx",
  "correctedTargetXYPx",
  "actualSpacingDeg",
  "actualSpacingSecondaryDeg",
  "actualSpacingDegNominal",
  "actualSizeDeg",
  "actualSizeDegNominal",
  "actualFlankerSpacingDeg",
  "actualLevelLog10Deg",
  "screenBoundingRectDegCorrected",
];

const csvCell = (v: string) =>
  /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

/**
 * Appended value -> original column it imputes IN PLACE, so existing
 * analysis pipelines work on the repaired file without changes. Applies
 * only when the original column exists; otherwise the value is appended
 * under its actual* name instead. Evidence columns (nearestXYPx, apple,
 * …) are never overwritten.
 */
const IMPUTE_OF: Record<string, string> = {
  actualTargetEccentricityXDeg: "targetEccentricityXDeg",
  actualTargetEccentricityYDeg: "targetEccentricityYDeg",
  actualLevelLog10Deg: "level",
  actualSpacingDeg: "spacingDeg",
  actualSpacingDegNominal: "spacingDeg",
  actualSizeDeg: "targetSizeDeg",
  actualSizeDegNominal: "targetSizeDeg",
  actualFlankerSpacingDeg: "flankerSpacingDeg",
  screenBoundingRectDegCorrected: "screenBoundingRectDeg",
  // Gaze corrections impute into their own (identically named) columns.
  gazeMeasuredXDeg: "gazeMeasuredXDeg",
  gazeMeasuredYDeg: "gazeMeasuredYDeg",
  gazeMeasuredRDeg: "gazeMeasuredRDeg",
  gazeMeasuredRawDeg: "gazeMeasuredRawDeg",
};

/**
 * Re-emit the input CSV with corrected values imputed into their original
 * columns (level, targetEccentricity*Deg, spacingDeg, targetSizeDeg,
 * flankerSpacingDeg, screenBoundingRectDeg). Audit and evidence columns
 * (repairStatus, nearest*, drawn/corrected px) are appended. Rows without
 * corrections keep every original cell untouched.
 */
export const toRepairedCsv = (csvText: string, result: FileResult): string => {
  const { header, rows } = parseCsv(csvText);
  const outRows = rows.map((r) => [...r]);
  const imputed = new Set<string>();
  rows.forEach((_, i) => {
    const cols = result.rows[i].columns;
    const altered: string[] = [];
    for (const [k, orig] of Object.entries(IMPUTE_OF)) {
      if (!(k in cols)) continue;
      const j = header.indexOf(orig);
      if (j >= 0) {
        outRows[i][j] = cols[k];
        imputed.add(k);
        if (!altered.includes(orig)) altered.push(orig);
      }
    }
    if (altered.length) cols.repairImputedColumns = altered.join("; ");
  });
  const newCols0 = REPAIR_COLUMN_ORDER.filter(
    (c) => !imputed.has(c) && rows.some((_, i) => c in result.rows[i].columns),
  );
  // Don't shadow original columns: prefix the name if it already exists.
  const newCols = newCols0.map((c) =>
    header.includes(c) ? `repair${c[0].toUpperCase()}${c.slice(1)}` : c,
  );
  const outLines = [
    [...header, ...newCols].join(","),
    ...outRows.map((r, i) =>
      [
        ...r.map(csvCell),
        ...newCols.map((c, k) =>
          csvCell(result.rows[i].columns[newCols0[k]] ?? ""),
        ),
      ].join(","),
    ),
  ];
  return outLines.join("\n");
};

export interface MagnitudeSummary {
  correctedTrials: number;
  /** % error of shown vs requested eccentricity: [median, maxAbs]. */
  eccentricityErrPct?: [number, number];
  /** % inflation of shown vs requested size/spacing: [median, maxAbs]. */
  sizeSpacingInflationPct?: [number, number];
}

const medianOf = (a: number[]) =>
  a.sort((x, y) => x - y)[Math.floor(a.length / 2)];

/** How wrong was what was shown, over the corrected rows of one file? */
export const summarizeMagnitudes = (
  csvText: string,
  result: FileResult,
): MagnitudeSummary => {
  const { header, rows } = parseCsv(csvText);
  const iX = header.indexOf("targetEccentricityXDeg");
  const iY = header.indexOf("targetEccentricityYDeg");
  const iL = header.indexOf("level");
  const ecc: number[] = [];
  const infl: number[] = [];
  let correctedTrials = 0;
  rows.forEach((r, i) => {
    const o = result.rows[i];
    if (o.status !== "CORRECTED") return;
    correctedTrials++;
    if (iX >= 0 && o.actualTargetEccentricityXDeg !== undefined) {
      const req = Math.hypot(Number(r[iX]), Number(r[iY]));
      const act = Math.hypot(
        o.actualTargetEccentricityXDeg,
        o.actualTargetEccentricityYDeg ?? 0,
      );
      if (req > 0 && Number.isFinite(req)) ecc.push(((act - req) / req) * 100);
    }
    if (iL >= 0 && o.actualLevelLog10Deg !== undefined) {
      const req = Math.pow(10, Number(r[iL]));
      const act = Math.pow(10, o.actualLevelLog10Deg);
      if (req > 0 && Number.isFinite(req)) infl.push(((act - req) / req) * 100);
    }
  });
  const out: MagnitudeSummary = { correctedTrials };
  if (ecc.length)
    out.eccentricityErrPct = [medianOf(ecc), Math.max(...ecc.map(Math.abs))];
  if (infl.length)
    out.sizeSpacingInflationPct = [
      medianOf(infl),
      Math.max(...infl.map(Math.abs)),
    ];
  return out;
};
