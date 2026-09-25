// @ts-nocheck — CLI entry file. Uses .ts import paths for Node's
// --experimental-strip-types (see simulate.cli.ts).
/**
 * Repair CLI for the nearest-point coordinate bug.
 *   node --experimental-strip-types tools/repair/cli.ts <csv...> [--out=DIR]
 * Writes <name>-imputed.csv (corrected values imputed into the original
 * columns; audit/evidence columns appended, incl. repairImputedColumns)
 * and prints a per-file summary. Read-only on the inputs.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import * as path from "path";
import { parseCsv, repairCsv, toRepairedCsv } from "./engine.ts";

const args = process.argv.slice(2);
const outDir = args.find((a) => a.startsWith("--out="))?.slice(6) ?? ".";
const files = args.filter((a) => !a.startsWith("--"));
if (!files.length) {
  console.error("usage: cli.ts <csv...> [--out=DIR]");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

for (const f of files) {
  const text = readFileSync(f, "utf8");
  let result;
  try {
    result = repairCsv(text);
  } catch (e) {
    console.log(`${path.basename(f)}: ERROR ${e.message}`);
    continue;
  }
  const { header, rows } = parseCsv(text);
  const outPath = path.join(
    outDir,
    path.basename(f).replace(/\.csv$/, "") + "-imputed.csv",
  );
  writeFileSync(outPath, toRepairedCsv(text, result));
  const s = result.summary;
  console.log(
    `${path.basename(f)}: ${s.corrected} corrected / ${
      s.unaffected
    } unaffected / ${s.flagged} flagged (${s.total} rows) -> ${outPath}`,
  );
  // Magnitude summary over corrected rows: how far off was what was shown?
  const eccDeltas: number[] = [];
  const levelInflation: number[] = [];
  const { rows: parsedRows } = { rows };
  rows.forEach((r, i) => {
    const o = result.rows[i];
    if (o.status !== "CORRECTED") return;
    if (o.actualTargetEccentricityXDeg !== undefined) {
      const reqX = Number(r[header.indexOf("targetEccentricityXDeg")]);
      const reqY = Number(r[header.indexOf("targetEccentricityYDeg")]);
      if (Number.isFinite(reqX)) {
        const req = Math.hypot(reqX, reqY);
        const act = Math.hypot(
          o.actualTargetEccentricityXDeg,
          o.actualTargetEccentricityYDeg ?? 0,
        );
        if (req > 0) eccDeltas.push(((act - req) / req) * 100);
      }
    }
    if (o.actualLevelLog10Deg !== undefined && o.actualSpacingDeg) {
      const lvl = Number(r[header.indexOf("level")]);
      if (Number.isFinite(lvl))
        levelInflation.push(
          (Math.pow(10, o.actualLevelLog10Deg) / Math.pow(10, lvl) - 1) * 100,
        );
    }
  });
  const stat = (a: number[]) =>
    a.length
      ? `median ${a
          .sort((x, y) => x - y)
          [Math.floor(a.length / 2)].toFixed(1)}%, max ${Math.max(
          ...a.map(Math.abs),
        ).toFixed(1)}%`
      : "n/a";
  if (eccDeltas.length)
    console.log(
      `    eccentricity error: ${stat(eccDeltas)} (n=${eccDeltas.length})`,
    );
  if (levelInflation.length)
    console.log(
      `    size/spacing inflation: ${stat(levelInflation)} (n=${
        levelInflation.length
      })`,
    );
  // Per-condition corrected-level medians: the join key for offline
  // psychometric/QUEST re-fitting is (block_condition, actualLevelLog10Deg,
  // response) per trial.
  const byCondition = new Map();
  rows.forEach((r, i) => {
    const o = result.rows[i];
    if (o.status !== "CORRECTED" || o.actualLevelLog10Deg === undefined) return;
    const bcIdx = header.indexOf("block_condition");
    const bc = bcIdx >= 0 ? r[bcIdx] : "?";
    if (!byCondition.has(bc)) byCondition.set(bc, []);
    byCondition.get(bc).push(o.actualLevelLog10Deg);
  });
  for (const [bc, lvls] of byCondition) {
    const med = lvls.sort((a, b) => a - b)[Math.floor(lvls.length / 2)];
    console.log(
      `    ${bc}: ${
        lvls.length
      } corrected trials, median actual level 10^${med.toFixed(3)} = ${Math.pow(
        10,
        med,
      ).toFixed(3)} deg`,
    );
  }
  const reasons = {};
  for (const r of result.rows) {
    if (r.status === "FLAGGED")
      reasons[r.statusReason.replace(/\(.*\)/, "").trim()] =
        (reasons[r.statusReason.replace(/\(.*\)/, "").trim()] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(reasons))
    console.log(`    FLAG ${v}x: ${k}`);
}
