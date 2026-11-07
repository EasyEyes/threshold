import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

const header = [
  "nearpointXYPxAppleCoords",
  "screenBoundingRectDeg",
  "pxPerCm",
  "screenWidthPx",
  "screenHeightPx",
  "distanceCm",
  "viewingDistancePredictedCm",
  "fixationOriginXYScreen",
  "targetEccentricityXDeg",
  "targetEccentricityYDeg",
  "markingFixationMotionRadiusDeg",
  "markingFixationMotionPath",
  "markingFixationAfterTargetOnset",
  "markingFixationMotionSpeedDegPerSec",
  "thresholdParameter",
  "level",
  "targetKind",
  "date",
  "fixationLocationStrategy",
  "spacingDirection",
  "spacingRelationToSize",
  "targetSizeIsHeightBool",
  "targetBoundingBox",
  "fontSizePx",
  "fontMaxPx",
  "fontPadding",
  "nearestXYPx",
];
const values = [
  "1380, 60",
  "",
  "44.76",
  "1280",
  "720",
  "50",
  "50",
  "0.5, 0.5",
  "5",
  "0",
  "1",
  "circle",
  "freeze",
  "0.2",
  "spacingDeg",
  "0.3010299957",
  "letter",
  "2026-06-01_12h00.00.000",
  "centerFixation",
  "radial",
  "typographic",
  "FALSE",
  "height : 200, width : 600, x: 0, y: 0",
  "600",
  "1000",
  "0.5",
  "740, 300",
];

describe("repair CLI", () => {
  test("writes a repaired CSV when the useful output is RANGED", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "repair-cli-"));
    try {
      const input = path.join(dir, "moving.csv");
      const output = path.join(dir, "moving-repaired.csv");
      const sensitivity = path.join(dir, "moving-sensitivity.csv");
      const quote = (v: string) => (v.includes(",") ? `"${v}"` : v);
      writeFileSync(
        input,
        [header.join(","), values.map(quote).join(",")].join("\n"),
      );
      const run = spawnSync(
        process.execPath,
        [
          "--experimental-strip-types",
          "tools/repair/cli.ts",
          input,
          `--out=${dir}`,
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );
      expect(run.status).toBe(0);
      expect(run.stdout).toMatch(/1 ranged/);
      expect(existsSync(output)).toBe(true);
      const repaired = readFileSync(output, "utf8");
      expect(repaired).toContain("RANGED");
      expect(repaired).toContain("approximateSpacingDegMin");
      expect(repaired).toContain("approximateSpacingDegMax");
      expect(existsSync(sensitivity)).toBe(true);
      const sensitivityText = readFileSync(sensitivity, "utf8");
      expect(sensitivityText).toContain("actualLevelLog10DegLower");
      expect(sensitivityText).toContain("response");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
