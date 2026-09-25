/**
 * RED: repair engine — CSV in, per-row verdict + corrections out.
 *
 * Fixtures are built SYNTHETICALLY with transformCore itself (known ground
 * truth), plus the real E2E buggy run (gold-standard, produced by
 * `npm run verify:repair`): sim vs commit c382d63b with injected
 * nearestXYPx [740,300], screenshot-verified rendering.
 */
import {
  parseCsv,
  repairCsv,
  summarizeMagnitudes,
  toRepairedCsv,
  type RowOutcome,
} from "../tools/repair/engine";
import {
  xyPxOfDegCore,
  xyDegOfPxCore,
  type TransformParams,
} from "../components/multiple-displays/transformCore";
import { readFileSync } from "fs";
import * as path from "path";

const SW = 1280;
const SH = 720;
const PX_PER_CM = 44.76;
const DIST = 50;

const buggyParams = (nearest: number[]): TransformParams => ({
  pxPerCm: PX_PER_CM,
  viewingDistanceCm: DIST,
  fixationXYPx: [0, 0],
  nearestPointXYZPx: nearest,
});
const convert = (raw: number[]): number[] => [raw[0] - SW / 2, SH / 2 - raw[1]];

/** Build a minimal synthetic results-CSV row set. */
const makeCsv = (rows: Record<string, string>[]) => {
  const header = [
    "nearpointXYPxAppleCoords",
    "screenBoundingRectDeg",
    "pxPerCm",
    "screenWidthPx",
    "screenHeightPx",
    "viewingDistancePredictedCm",
    "fixationOriginXYScreen",
    "targetEccentricityXDeg",
    "targetEccentricityYDeg",
    "markingFixationMotionRadiusDeg",
    "thresholdParameter",
    "level",
    "targetKind",
    "date",
    "fixationLocationStrategy",
    "spacingDirection",
    "targetSizeIsHeightBool",
    "distanceCm",
    "spacingDeg",
    "targetSizeDeg",
    "flankerSpacingDeg",
    ...(rows.some((r) => "nearestXYPx" in r) ? ["nearestXYPx"] : []),
    ...(rows.some(
      (r) =>
        "gazeMeasuredXDeg" in r ||
        "gazeMeasuredYDeg" in r ||
        "gazeMeasuredRDeg" in r ||
        "gazeMeasuredRawDeg" in r,
    )
      ? [
          "gazeMeasuredXDeg",
          "gazeMeasuredYDeg",
          "gazeMeasuredRDeg",
          "gazeMeasuredRawDeg",
        ]
      : []),
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      header
        .map((h) => {
          const v = r[h] ?? "";
          return v.includes(",") ? `"${v}"` : v;
        })
        .join(","),
    );
  }
  return lines.join("\n");
};

const appleOf = (nearestUsed: number[]) =>
  `${Math.floor(nearestUsed[0] + SW / 2)}, ${Math.floor(
    SH / 2 - nearestUsed[1],
  )}`;

const rectOf = (nearestUsed: number[]) => {
  const bl = xyDegOfPxCore(
    [-SW / 2, -SH / 2],
    buggyParams(nearestUsed),
  ) as number[];
  const tr = xyDegOfPxCore(
    [SW / 2, SH / 2],
    buggyParams(nearestUsed),
  ) as number[];
  return `[(${bl[0].toFixed(4)}, ${bl[1].toFixed(4)}), (${tr[0].toFixed(
    4,
  )}, ${tr[1].toFixed(4)})]`;
};

const IN_WINDOW_DATE = "2026-06-01_12h00.00.000";
const baseRow = {
  date: IN_WINDOW_DATE,
  fixationLocationStrategy: "centerFixation",
  spacingDirection: "radial",
  targetSizeIsHeightBool: "TRUE",
  pxPerCm: String(PX_PER_CM),
  screenWidthPx: String(SW),
  screenHeightPx: String(SH),
  viewingDistancePredictedCm: String(DIST),
  fixationOriginXYScreen: "0.5, 0.5",
  markingFixationMotionRadiusDeg: "0",
  thresholdParameter: "spacingDeg",
  level: "0.3010299957", // log10(2)
  targetKind: "letter",
  targetEccentricityXDeg: "-10",
  targetEccentricityYDeg: "0",
};

const outcomes = (csv: string): RowOutcome[] =>
  repairCsv(csv).rows.filter((r) => r.status !== "SKIPPED-HEADER-ROW");

describe("repairCsv — classification & recovery", () => {
  test("parseCsv handles quoted cells", () => {
    const p = parseCsv('a,b\n"x, y",2');
    expect(p.rows[0][0]).toBe("x, y");
    expect(p.rows[0][1]).toBe("2");
  });

  test("E2E gold-standard buggy run: recovers injected [740,300], corrects rows", () => {
    const csv = readFileSync(
      path.join(__dirname, "fixtures/repair/e2e-buggy-run.csv"),
      "utf8",
    );
    const rows = outcomes(csv);
    const corrected = rows.filter((r) => r.status === "CORRECTED");
    expect(corrected.length).toBeGreaterThan(0);
    // nearestUsed recovered from the file (rect fit corroborated by apple)
    const nu = corrected[0].nearestUsedXY!;
    expect(Math.abs(nu[0] - 740)).toBeLessThanOrEqual(3);
    expect(Math.abs(nu[1] - 300)).toBeLessThanOrEqual(3);
    // Actual eccentricity matches independent computation
    const px = xyPxOfDegCore([-10, 0], buggyParams(nu)) as number[];
    const actual = xyDegOfPxCore(px, buggyParams(convert(nu))) as number[];
    expect(corrected[0].actualTargetEccentricityXDeg!).toBeCloseTo(
      actual[0],
      4,
    );
  });

  test("buggy synthetic: exact recovery and corrections", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("CORRECTED");
    expect(row.nearestUsedXY).toEqual(raw);
    // Requested -10 deg actually shown farther out (blast-radius known value)
    expect(row.actualTargetEccentricityXDeg!).toBeLessThan(-11.5);
    expect(row.actualTargetEccentricityYDeg).toBeDefined();
  });

  test("unaffected (nearest [0,0], symmetric rect) — no correction", () => {
    const csv = makeCsv([
      {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf([0, 0]),
        screenBoundingRectDeg: rectOf([0, 0]),
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("UNAFFECTED");
    expect(row.statusReason).toMatch(/nearest point at screen center/i);
  });

  test("fix1 code (S3: nearestXYPx logs raw, transform used converted) — unaffected by bug", () => {
    const raw = [740, 300];
    const used = convert(raw); // what fixed code fed the transform
    const csv = makeCsv([
      {
        ...baseRow,
        date: "2026-09-20_10h00.00.000", // S3 code exists only after the fix
        nearpointXYPxAppleCoords: appleOf(used),
        screenBoundingRectDeg: rectOf(used),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("UNAFFECTED");
    expect(row.statusReason).toMatch(/fix/i);
  });

  test("moving crosshair rows are FLAGGED, never corrected", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        markingFixationMotionRadiusDeg: "1",
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("FLAGGED");
    expect(row.statusReason).toMatch(/moving/i);
  });

  test("apple-only file without rect, non-center apple — FLAGGED (window-size ambiguity)", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf(raw),
        // screenBoundingRectDeg intentionally absent
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("FLAGGED");
    expect(row.statusReason).toMatch(/ambig|rect/i);
  });

  test("file dated before the bug — UNAFFECTED even with non-center apple, no rect", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        date: "2024-06-06_17h47.10.037",
        nearpointXYPxAppleCoords: appleOf(raw),
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("UNAFFECTED");
    expect(row.statusReason).toMatch(/predates the bug/i);
  });

  test("apple exactly at screen center, no rect — UNAFFECTED (both interpretations agree)", () => {
    const csv = makeCsv([
      { ...baseRow, nearpointXYPxAppleCoords: appleOf([0, 0]) },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("UNAFFECTED");
  });

  test("missing apparatus columns — FLAGGED with reason", () => {
    const csv = makeCsv([{ ...baseRow, pxPerCm: "", screenWidthPx: "" }]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("FLAGGED");
    expect(row.statusReason).toMatch(/missing/i);
  });

  test("forward-fill: trial rows inherit condition/apparatus values", () => {
    const raw = [740, 300];
    const conditionRow = {
      ...baseRow,
      nearpointXYPxAppleCoords: appleOf(raw),
      screenBoundingRectDeg: rectOf(raw),
      nearestXYPx: `${raw[0]}, ${raw[1]}`,
    };
    // Trial row: only trial-level values present; everything else inherited.
    const trialRow = { level: "0.45" };
    const csv = makeCsv([conditionRow, trialRow]);
    const rows = outcomes(csv);
    expect(rows[0].status).toBe("CORRECTED");
    // The trial row has no stimulus-time nearestXYPx of its own: the live
    // eye position during it is unknown -> flagged, never guessed.
    expect(rows[1].status).toBe("FLAGGED");
    expect(rows[1].statusReason).toMatch(/stimulus-time/);
  });

  test("tracking started mid-session: center apple but trial-time raw — CORRECTED with trial value", () => {
    const rawCond = [0, 0]; // nearest [0,0] at condition time (rect symmetric)
    const rawTrial = [740, 300]; // tracking delivered data by trial time
    const csv = makeCsv([
      {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf(rawCond),
        screenBoundingRectDeg: rectOf(rawCond),
      },
      { nearestXYPx: `${rawTrial[0]}, ${rawTrial[1]}`, level: "0.4" },
    ]);
    const rows = outcomes(csv);
    // The condition row itself: nearest [0,0] at that moment -> unaffected.
    expect(rows[0].status).toBe("UNAFFECTED");
    // The trial row carries its own stimulus-time raw value.
    expect(rows[1].status).toBe("CORRECTED");
    expect(rows[1].nearestUsedXY).toEqual(rawTrial);
  });

  test("buggy session, row without stimulus-time nearestXYPx — FLAGGED (live eye unknown)", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
      // Trial row WITHOUT nearestXYPx: live eye position at that trial unknown
      { level: "0.45", targetKind: "image" },
    ]);
    const rows = outcomes(csv);
    expect(rows[0].status).toBe("CORRECTED");
    expect(rows[1].status).toBe("FLAGGED");
    expect(rows[1].statusReason).toMatch(/stimulus-time/);
  });

  test("off-center fixation origin is honored in recovery and correction", () => {
    const raw = [740, 300];
    // Nominal fixation px = [(2*0.7-1)*SW/2, (2*0.5-1)*SH/2] = [256, 0].
    const fixation = [256, 0];
    const params = (nearest: number[]): TransformParams => ({
      pxPerCm: PX_PER_CM,
      viewingDistanceCm: DIST,
      fixationXYPx: fixation,
      nearestPointXYZPx: nearest,
    });
    const bl = xyDegOfPxCore([-SW / 2, -SH / 2], params(raw)) as number[];
    const tr = xyDegOfPxCore([SW / 2, SH / 2], params(raw)) as number[];
    const csv = makeCsv([
      {
        ...baseRow,
        fixationOriginXYScreen: "0.7, 0.5",
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: `[(${bl[0].toFixed(4)}, ${bl[1].toFixed(
          4,
        )}), (${tr[0].toFixed(4)}, ${tr[1].toFixed(4)})]`,
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("CORRECTED");
    expect(row.nearestUsedXY).toEqual(raw);
    const px = xyPxOfDegCore([-10, 0], params(raw)) as number[];
    const actual = xyDegOfPxCore(px, params(convert(raw))) as number[];
    expect(row.actualTargetEccentricityXDeg).toBeCloseTo(actual[0], 4);
  });

  test("non-centerFixation strategy falls back to screen center (as the code does)", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        fixationLocationStrategy: "centerTargets",
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw), // computed with fixation [0,0]
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("CORRECTED");
    expect(row.nearestUsedXY).toEqual(raw);
  });

  test("per-trial tracked distanceCm is preferred for corrections", () => {
    const raw = [740, 300];
    const distTrial = 60; // differs from predicted/rect-time 50
    const params = (nearest: number[], d = DIST): TransformParams => ({
      pxPerCm: PX_PER_CM,
      viewingDistanceCm: d,
      fixationXYPx: [0, 0],
      nearestPointXYZPx: nearest,
    });
    const csv = makeCsv([
      {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
        distanceCm: String(distTrial),
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("CORRECTED");
    const px = xyPxOfDegCore([-10, 0], params(raw, distTrial)) as number[];
    const actual = xyDegOfPxCore(
      px,
      params(convert(raw), distTrial),
    ) as number[];
    expect(row.actualTargetEccentricityXDeg).toBeCloseTo(actual[0], 4);
  });

  test("spacingDirection=horizontal corrects spacing along x at the target", () => {
    const raw = [740, 300];
    const reqSpacing = Math.pow(10, 0.30103); // = 2 deg
    const csv = makeCsv([
      {
        ...baseRow,
        spacingDirection: "horizontal",
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const [row] = outcomes(csv);
    const buggy = buggyParams(raw);
    const correct = buggyParams(convert(raw));
    const p1 = xyPxOfDegCore([-10, 0], buggy) as number[];
    const p2 = xyPxOfDegCore([-10 + reqSpacing, 0], buggy) as number[];
    const d1 = xyDegOfPxCore(p1, correct) as number[];
    const d2 = xyDegOfPxCore(p2, correct) as number[];
    // True deg length of the drawn (px-horizontal) segment: full hypot.
    const expected = Math.hypot(d2[0] - d1[0], d2[1] - d1[1]);
    expect(row.actualSpacingDeg!).toBeCloseTo(expected, 4);
  });

  test("targetSizeDeg level corrected vertically when height-defined", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        thresholdParameter: "targetSizeDeg",
        targetSizeIsHeightBool: "TRUE",
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("CORRECTED");
    expect(row.actualSizeDeg).toBeDefined();
    expect(row.actualLevelLog10Deg!).toBeCloseTo(
      Math.log10(row.actualSizeDeg!),
      6,
    );
  });

  test("targetEccentricityXDeg threshold: level corrected from actual eccentricity", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        thresholdParameter: "targetEccentricityXDeg",
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("CORRECTED");
    const actualEcc = Math.hypot(
      row.actualTargetEccentricityXDeg!,
      row.actualTargetEccentricityYDeg!,
    );
    expect(row.actualLevelLog10Deg!).toBeCloseTo(Math.log10(actualEcc), 6);
  });

  test("correctedTargetXYPx and screenBoundingRectDegCorrected are emitted", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.columns.correctedTargetXYPx).toBeDefined();
    expect(row.columns.screenBoundingRectDegCorrected).toMatch(/^\[\(/);
  });

  test("nominal spacingDeg/sizeDeg columns corrected even when not the thresholded param", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        thresholdParameter: "targetSizeDeg", // spacingDeg nominal drives spacing
        spacingDeg: "2",
        targetSizeDeg: "1",
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("CORRECTED");
    expect(row.columns.actualSpacingDegNominal).toBeDefined();
    expect(Number(row.columns.actualSpacingDegNominal)).toBeGreaterThan(2);
    // targetSizeDeg IS the thresholded param here: covered by the
    // level-based actualSizeDeg column instead of the nominal one.
    expect(row.actualSizeDeg).toBeDefined();
    expect(row.actualSizeDeg!).toBeGreaterThan(1);
  });

  test("targetOffsetDeg (vernier) level corrected horizontally", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        thresholdParameter: "targetOffsetDeg",
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("CORRECTED");
    expect(row.actualLevelLog10Deg).toBeDefined();
    // Independent: horizontal length of 10^level at the target.
    const req = Math.pow(10, 0.3010299957);
    const buggy = buggyParams(raw);
    const correct = buggyParams(convert(raw));
    const p1 = xyPxOfDegCore([-10, 0], buggy) as number[];
    const p2 = xyPxOfDegCore([-10 + req, 0], buggy) as number[];
    const d1 = xyDegOfPxCore(p1, correct) as number[];
    const d2 = xyDegOfPxCore(p2, correct) as number[];
    const expected = Math.hypot(d2[0] - d1[0], d2[1] - d1[1]);
    expect(row.actualLevelLog10Deg!).toBeCloseTo(Math.log10(expected), 4);
  });

  test("flankerSpacingDeg nominal corrected radially when present", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        flankerSpacingDeg: "3",
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("CORRECTED");
    expect(row.columns.actualFlankerSpacingDeg).toBeDefined();
    expect(Number(row.columns.actualFlankerSpacingDeg)).toBeGreaterThan(3);
  });

  test("toRepairedCsv round-trips: non-imputed cells untouched, imputed columns carry actuals", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const result = repairCsv(csv);
    const out = toRepairedCsv(csv, result);
    const reparsed = parseCsv(out);
    const inParsed = parseCsv(csv);
    expect(reparsed.header.length).toBeGreaterThan(inParsed.header.length);
    // every column that is NOT imputed survives byte-identical
    const imputedCols = new Set([
      "targetEccentricityXDeg",
      "targetEccentricityYDeg",
      "level",
      "screenBoundingRectDeg",
      "spacingDeg",
      "targetSizeDeg",
      "flankerSpacingDeg",
    ]);
    inParsed.header.forEach((h, k) => {
      if (!imputedCols.has(h))
        expect(reparsed.rows[0][k]).toBe(inParsed.rows[0][k]);
    });
    // imputed columns carry the actuals (metacharacters re-escaped)
    expect(
      Number(
        reparsed.rows[0][reparsed.header.indexOf("targetEccentricityXDeg")],
      ),
    ).toBeCloseTo(result.rows[0].actualTargetEccentricityXDeg!, 4);
    expect(
      reparsed.rows[0][reparsed.header.indexOf("screenBoundingRectDeg")],
    ).toBe(result.rows[0].columns.screenBoundingRectDegCorrected);
    const rawLine = out.split("\n")[1];
    expect(rawLine).toContain(
      `"${result.rows[0].columns.screenBoundingRectDegCorrected}"`,
    );
  });

  describe("toRepairedCsv — imputed-in-place output", () => {
    const raw = [740, 300];
    const csvOf = (rows) =>
      makeCsv(
        rows.map((r) => ({
          ...baseRow,
          nearpointXYPxAppleCoords: appleOf(raw),
          screenBoundingRectDeg: rectOf(raw),
          nearestXYPx: `${raw[0]}, ${raw[1]}`,
          ...r,
        })),
      );

    test("corrected values overwrite the original columns, not append", () => {
      const csv = csvOf([{}]);
      const result = repairCsv(csv);
      const p = parseCsv(toRepairedCsv(csv, result));
      const iX = p.header.indexOf("targetEccentricityXDeg");
      const iY = p.header.indexOf("targetEccentricityYDeg");
      const iL = p.header.indexOf("level");
      const iR = p.header.indexOf("screenBoundingRectDeg");
      expect(Number(p.rows[0][iX])).toBeCloseTo(
        result.rows[0].actualTargetEccentricityXDeg!,
        4,
      );
      expect(Number(p.rows[0][iY])).toBeCloseTo(
        result.rows[0].actualTargetEccentricityYDeg!,
        4,
      );
      expect(Number(p.rows[0][iL])).toBeCloseTo(
        result.rows[0].actualLevelLog10Deg!,
        4,
      );
      expect(p.rows[0][iR]).toBe(
        result.rows[0].columns.screenBoundingRectDegCorrected,
      );
      // no duplicate appended copies of the imputed values
      expect(p.header).not.toContain("actualTargetEccentricityXDeg");
      expect(p.header).not.toContain("actualLevelLog10Deg");
      // audit + evidence columns are still appended
      for (const c of [
        "repairStatus",
        "repairStatusReason",
        "nearestUsedXY",
        "nearestCorrectXY",
        "drawnTargetXYPx",
        "correctedTargetXYPx",
      ])
        expect(p.header).toContain(c);
    });

    test("evidence columns are never overwritten (nearestXYPx stays as logged)", () => {
      const csv = csvOf([{}]);
      const p = parseCsv(toRepairedCsv(csv, repairCsv(csv)));
      expect(p.rows[0][p.header.indexOf("nearestXYPx")]).toBe(
        `${raw[0]}, ${raw[1]}`,
      );
    });

    test("unaffected and flagged rows keep every original cell", () => {
      const csv = csvOf([
        { date: "2025-01-01_10-00" }, // predates bug -> UNAFFECTED
        {}, // corrected
      ]);
      const inP = parseCsv(csv);
      const outP = parseCsv(toRepairedCsv(csv, repairCsv(csv)));
      inP.header.forEach((h, k) => {
        if (
          [
            "targetEccentricityXDeg",
            "targetEccentricityYDeg",
            "level",
            "screenBoundingRectDeg",
          ].includes(h)
        )
          return;
        expect(outP.rows[0][k]).toBe(inP.rows[0][k]);
      });
    });

    test("repairImputedColumns lists exactly the columns imputed on each row", () => {
      const raw = [740, 300];
      const csv = makeCsv([
        // unaffected: apple exactly at screen center -> nearest [0,0]
        { ...baseRow, nearpointXYPxAppleCoords: appleOf([0, 0]) },
        {
          ...baseRow,
          nearpointXYPxAppleCoords: appleOf(raw),
          screenBoundingRectDeg: rectOf(raw),
          nearestXYPx: `${raw[0]}, ${raw[1]}`,
        },
      ]);
      const statuses = repairCsv(csv).rows.map((r) => r.status);
      expect(statuses).toEqual(["UNAFFECTED", "CORRECTED"]);
      const p = parseCsv(toRepairedCsv(csv, repairCsv(csv)));
      const iImp = p.header.indexOf("repairImputedColumns");
      expect(iImp).toBeGreaterThan(0);
      // corrected row: exactly the imputed originals, no more, no fewer
      const imputed = p.rows[1][iImp].split("; ").map((x) => x.trim());
      for (const c of imputed) {
        const j = p.header.indexOf(c);
        expect(j).toBeGreaterThan(-1);
        expect(p.rows[1][j]).not.toBe(""); // imputed value present
      }
      expect(imputed).toContain("level");
      expect(imputed).toContain("targetEccentricityXDeg");
      expect(imputed).toContain("screenBoundingRectDeg");
      expect(imputed).not.toContain("nearestXYPx"); // evidence, never imputed
      // unaffected row: empty cell
      expect(p.rows[0][iImp]).toBe("");
    });

    test("repairImputedColumns is omitted when nothing is imputed", () => {
      const csv = makeCsv([{ ...baseRow, date: "2025-01-01_10-00" }]);
      const p = parseCsv(toRepairedCsv(csv, repairCsv(csv)));
      expect(p.header).not.toContain("repairImputedColumns");
    });

    test("values with no original column (e.g. secondary spacing) stay appended", () => {
      const csv = csvOf([{ spacingDirection: "radialAndTangential" }]);
      const result = repairCsv(csv);
      const p = parseCsv(toRepairedCsv(csv, result));
      // secondary direction has no original column: it must not be dropped
      if (result.rows[0].columns.actualSpacingSecondaryDeg !== undefined)
        expect(p.header).toContain("actualSpacingSecondaryDeg");
    });
  });

  describe("gaze column correction", () => {
    const raw = [740, 300];
    const gazePx = [95.5, -40.25]; // psychoJS px, as the app saw
    const loggedGazeDeg = (params) => xyDegOfPxCore(gazePx, params) as number[];
    const csvOf = (extra = {}) =>
      makeCsv([
        {
          ...baseRow,
          nearpointXYPxAppleCoords: appleOf(raw),
          screenBoundingRectDeg: rectOf(raw),
          nearestXYPx: `${raw[0]}, ${raw[1]}`,
          ...extra,
        },
      ]);

    test("gazeMeasuredX/YDeg are corrected through the double transform", () => {
      const buggy = loggedGazeDeg(buggyParams(raw));
      const csv = csvOf({
        gazeMeasuredXDeg: String(buggy[0]),
        gazeMeasuredYDeg: String(buggy[1]),
      });
      const result = repairCsv(csv);
      expect(result.rows[0].status).toBe("CORRECTED");
      const truth = loggedGazeDeg(buggyParams(convert(raw)));
      expect(Number(result.rows[0].columns.gazeMeasuredXDeg)).toBeCloseTo(
        truth[0],
        4,
      );
      expect(Number(result.rows[0].columns.gazeMeasuredYDeg)).toBeCloseTo(
        truth[1],
        4,
      );
    });

    test("gazeMeasuredRDeg is recomputed from the corrected X/Y", () => {
      const buggy = loggedGazeDeg(buggyParams(raw));
      const csv = csvOf({
        gazeMeasuredXDeg: String(buggy[0]),
        gazeMeasuredYDeg: String(buggy[1]),
        gazeMeasuredRDeg: String(Math.hypot(buggy[0], buggy[1])),
      });
      const result = repairCsv(csv);
      const truth = loggedGazeDeg(buggyParams(convert(raw)));
      expect(Number(result.rows[0].columns.gazeMeasuredRDeg)).toBeCloseTo(
        Math.hypot(truth[0], truth[1]),
        4,
      );
    });

    test("gazeMeasuredRawDeg arrays are corrected elementwise", () => {
      const p1 = xyDegOfPxCore([10, 5], buggyParams(raw)) as number[];
      const p2 = xyDegOfPxCore([-20, 8], buggyParams(raw)) as number[];
      const csv = csvOf({
        gazeMeasuredRawDeg: JSON.stringify([
          [Number(p1[0].toFixed(5)), Number(p1[1].toFixed(5))],
          [Number(p2[0].toFixed(5)), Number(p2[1].toFixed(5))],
        ]),
      });
      const result = repairCsv(csv);
      const corrected = JSON.parse(result.rows[0].columns.gazeMeasuredRawDeg);
      const t1 = xyDegOfPxCore([10, 5], buggyParams(convert(raw))) as number[];
      const t2 = xyDegOfPxCore([-20, 8], buggyParams(convert(raw))) as number[];
      expect(corrected[0][0]).toBeCloseTo(t1[0], 4);
      expect(corrected[0][1]).toBeCloseTo(t1[1], 4);
      expect(corrected[1][0]).toBeCloseTo(t2[0], 4);
      expect(corrected[1][1]).toBeCloseTo(t2[1], 4);
    });

    test("gaze is left as logged when the window size is unknown (apple disagrees)", () => {
      const buggy = loggedGazeDeg(buggyParams(raw));
      const csv = csvOf({
        nearpointXYPxAppleCoords: appleOf([raw[0] + 40, raw[1]]),
        gazeMeasuredXDeg: String(buggy[0]),
        gazeMeasuredYDeg: String(buggy[1]),
      });
      const result = repairCsv(csv);
      expect(result.rows[0].status).toBe("CORRECTED"); // positions still corrected
      expect(result.rows[0].columns.gazeMeasuredXDeg).toBeUndefined();
      expect(result.rows[0].statusReason).toMatch(/gaze/i);
    });

    test("corrected gaze values are imputed into the original columns", () => {
      const buggy = loggedGazeDeg(buggyParams(raw));
      const csv = csvOf({
        gazeMeasuredXDeg: String(buggy[0]),
        gazeMeasuredYDeg: String(buggy[1]),
        gazeMeasuredRDeg: String(Math.hypot(buggy[0], buggy[1])),
      });
      const p = parseCsv(toRepairedCsv(csv, repairCsv(csv)));
      const truth = loggedGazeDeg(buggyParams(convert(raw)));
      expect(
        Number(p.rows[0][p.header.indexOf("gazeMeasuredXDeg")]),
      ).toBeCloseTo(truth[0], 4);
      expect(
        Number(p.rows[0][p.header.indexOf("gazeMeasuredRDeg")]),
      ).toBeCloseTo(Math.hypot(truth[0], truth[1]), 4);
    });
  });

  test("summarizeMagnitudes: median/max wrongness over corrected rows", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const m = summarizeMagnitudes(csv, repairCsv(csv));
    expect(m.correctedTrials).toBe(1);
    expect(m.eccentricityErrPct![0]).toBeGreaterThan(0);
    expect(m.eccentricityErrPct![1]).toBeGreaterThanOrEqual(
      m.eccentricityErrPct![0],
    );
    expect(m.sizeSpacingInflationPct![0]).toBeGreaterThan(0);
  });

  describe("adversarial pass", () => {
    // The exporter writes condition-level parameter columns on the FIRST
    // row(s) of a condition only; trial rows leave them empty and must
    // inherit them by forward-fill. Build such a file: put the
    // condition-level values ONLY on row 1 (a non-trial row), and the
    // stimulus-time nearestXYPx + level ONLY on the trial row.
    const twoRowCsv = (
      condExtras: Record<string, string>,
      trialExtras: Record<string, string> = {},
    ) => {
      const raw = [740, 300];
      const condRow = {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        ...condExtras,
      };
      const trialRow = {
        ...baseRow,
        nearpointXYPxAppleCoords: "",
        screenBoundingRectDeg: "",
        // Condition-level columns empty on the trial row:
        thresholdParameter: "",
        fixationLocationStrategy: "",
        fixationOriginXYScreen: "",
        spacingDirection: "",
        targetSizeIsHeightBool: "",
        spacingDeg: "",
        targetSizeDeg: "",
        flankerSpacingDeg: "",
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
        ...trialExtras,
      };
      return makeCsv([condRow, trialRow]);
    };

    test("condition-row-only off-center fixation still applies to trial rows", () => {
      const fixation = [256, 0];
      const raw = [740, 300];
      const params = (nearest: number[]): TransformParams => ({
        pxPerCm: PX_PER_CM,
        viewingDistanceCm: DIST,
        fixationXYPx: fixation,
        nearestPointXYZPx: nearest,
      });
      const bl = xyDegOfPxCore([-SW / 2, -SH / 2], params(raw)) as number[];
      const tr = xyDegOfPxCore([SW / 2, SH / 2], params(raw)) as number[];
      const csv = twoRowCsv(
        {
          fixationOriginXYScreen: "0.7, 0.5",
          screenBoundingRectDeg: `[(${bl[0].toFixed(4)}, ${bl[1].toFixed(
            4,
          )}), (${tr[0].toFixed(4)}, ${tr[1].toFixed(4)})]`,
        },
        { fixationOriginXYScreen: "" },
      );
      const rows = outcomes(csv);
      const trial = rows[1];
      expect(trial.status).toBe("CORRECTED");
      // Must equal the value computed WITH the off-center fixation.
      const px = xyPxOfDegCore([-10, 0], params(raw)) as number[];
      const actual = xyDegOfPxCore(px, params(convert(raw))) as number[];
      expect(trial.actualTargetEccentricityXDeg).toBeCloseTo(actual[0], 4);
    });

    test("condition-row-only spacingDirection=horizontal applies to trial rows", () => {
      const csv = twoRowCsv({ spacingDirection: "horizontal" });
      const trial = outcomes(csv)[1];
      expect(trial.status).toBe("CORRECTED");
      const req = Math.pow(10, 0.3010299957);
      const buggy = buggyParams([740, 300]);
      const correct = buggyParams(convert([740, 300]));
      const p1 = xyPxOfDegCore([-10, 0], buggy) as number[];
      const p2 = xyPxOfDegCore([-10 + req, 0], buggy) as number[];
      const d1 = xyDegOfPxCore(p1, correct) as number[];
      const d2 = xyDegOfPxCore(p2, correct) as number[];
      expect(trial.actualSpacingDeg!).toBeCloseTo(
        Math.hypot(d2[0] - d1[0], d2[1] - d1[1]),
        4,
      );
    });

    test("condition-row-only targetSizeIsHeightBool=FALSE sizes horizontally", () => {
      const csv = twoRowCsv({
        thresholdParameter: "targetSizeDeg",
        targetSizeIsHeightBool: "FALSE",
      });
      const trial = outcomes(csv)[1];
      expect(trial.status).toBe("CORRECTED");
      // Horizontal length of the requested size at the target.
      const req = Math.pow(10, 0.3010299957);
      const buggy = buggyParams([740, 300]);
      const correct = buggyParams(convert([740, 300]));
      const p1 = xyPxOfDegCore([-10, 0], buggy) as number[];
      const p2 = xyPxOfDegCore([-10 + req, 0], buggy) as number[];
      const d1 = xyDegOfPxCore(p1, correct) as number[];
      const d2 = xyDegOfPxCore(p2, correct) as number[];
      expect(trial.actualSizeDeg!).toBeCloseTo(
        Math.hypot(d2[0] - d1[0], d2[1] - d1[1]),
        4,
      );
    });

    test("condition-row-only nominal spacingDeg still corrected on trial rows", () => {
      const csv = twoRowCsv({
        thresholdParameter: "targetSizeDeg",
        spacingDeg: "2",
      });
      const trial = outcomes(csv)[1];
      expect(trial.status).toBe("CORRECTED");
      expect(trial.columns.actualSpacingDegNominal).toBeDefined();
    });

    test("negative pxPerCm is rejected, never corrected", () => {
      const csv = makeCsv([
        {
          ...baseRow,
          pxPerCm: "-45",
          nearpointXYPxAppleCoords: appleOf([740, 300]),
          screenBoundingRectDeg: rectOf([740, 300]),
          nearestXYPx: "740, 300",
        },
      ]);
      const [row] = outcomes(csv);
      expect(row.status).not.toBe("CORRECTED");
    });

    test("BOM at file start does not break column lookups", () => {
      const csv =
        "\uFEFF" +
        makeCsv([
          {
            ...baseRow,
            date: "2025-01-15_12h00.00.000",
            nearpointXYPxAppleCoords: appleOf([740, 300]),
            nearestXYPx: "740, 300",
          },
        ]);
      const [row] = outcomes(csv);
      // Pre-bug date => UNAFFECTED; requires the date column to parse,
      // which fails if a BOM clings to the first header cell.
      expect(row.status).toBe("UNAFFECTED");
    });

    test("blank lines do not shift row alignment", () => {
      const raw = [740, 300];
      const good = {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      };
      const csv = makeCsv([good, good, good]).replace(/\n(?=[^\n]*$)/, "\n\n");
      const rows = outcomes(csv);
      expect(rows).toHaveLength(3);
      rows.forEach((r) => expect(r.status).toBe("CORRECTED"));
      // And the repaired CSV's appended values sit on the right rows.
      const out = toRepairedCsv(csv, repairCsv(csv));
      const reparsed = parseCsv(out);
      const ax = reparsed.header.indexOf("targetEccentricityXDeg");
      expect(reparsed.rows).toHaveLength(3);
      reparsed.rows.forEach((r) => expect(Number(r[ax])).toBeLessThan(-9));
    });
  });

  test("corrected rows emit eye-point evidence columns in the CSV", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const out = toRepairedCsv(csv, repairCsv(csv));
    const reparsed = parseCsv(out);
    const iu = reparsed.header.indexOf("nearestUsedXY");
    const ic = reparsed.header.indexOf("nearestCorrectXY");
    expect(iu).toBeGreaterThan(0);
    expect(ic).toBeGreaterThan(0);
    expect(reparsed.rows[0][iu]).toBe("740.0, 300.0");
    expect(reparsed.rows[0][ic]).toBe("100.0, 60.0");
  });

  test("ambiguous nearest band (cannot distinguish buggy vs fixed) — FLAGGED", () => {
    // A nearest value that is plausible BOTH as raw rc and as converted.
    const raw = [300, 100]; // plausible as raw rc AND small as converted
    const csv = makeCsv([
      {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        // no nearestXYPx column to disambiguate
      },
    ]);
    const [row] = outcomes(csv);
    expect(row.status).toBe("FLAGGED");
    expect(row.statusReason).toMatch(/ambig/i);
  });
});

describe("repairCsv — level corrections", () => {
  test("spacingDeg level (log10) corrected along radial direction", () => {
    const raw = [740, 300];
    const csv = makeCsv([
      {
        ...baseRow,
        nearpointXYPxAppleCoords: appleOf(raw),
        screenBoundingRectDeg: rectOf(raw),
        nearestXYPx: `${raw[0]}, ${raw[1]}`,
      },
    ]);
    const [row] = outcomes(csv);
    // Independent: radial spacing drawn between target and target+2deg radial
    const buggy = buggyParams(raw);
    const correct = buggyParams(convert(raw));
    const t = [-10, 0];
    const dir = [Math.sign(t[0]), Math.sign(t[1])]; // radial unit-ish
    const p1 = xyPxOfDegCore(t, buggy) as number[];
    const p2 = xyPxOfDegCore(
      [t[0] + dir[0] * 2, t[1] + dir[1] * 2],
      buggy,
    ) as number[];
    const d1 = xyDegOfPxCore(p1, correct) as number[];
    const d2 = xyDegOfPxCore(p2, correct) as number[];
    const actualSpacing = Math.hypot(d2[0] - d1[0], d2[1] - d1[1]);
    expect(row.actualLevelLog10Deg!).toBeCloseTo(Math.log10(actualSpacing), 4);
    expect(row.actualSpacingDeg!).toBeCloseTo(actualSpacing, 4);
  });
});
