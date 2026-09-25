/**
 * @jest-environment node
 *
 * Font-geometry CSV columns, on the REAL pipeline (browser measureText):
 * - Denis Pelli's insight (request 7, 2026-09-23): fontAverageWidthReNominal
 *   (mean per-character ink width) is "similar to, but less than"
 *   fontSpacingReNominal (joined characterSet string ink width / N). Letters
 *   with positive sidebearings make the joined string wider than the sum of
 *   ink widths. Enforced strictly on letter-sim's font (Roboto Mono, "abcd").
 * - Column layout (requests 4-6): renamed/new columns present, old name
 *   absent, and fontNominalSizePx/Pt immediately precede fontXHeightReNominal
 *   in first-appearance (header) order.
 *
 * Full E2E is opt-in: RUN_E2E=1 npm test (reuses cached builds).
 */

import { expect, describe, test } from "@jest/globals";
import { existsSync } from "fs";
import * as path from "path";

const RUN_E2E = process.env.RUN_E2E === "1";
const TABLE = "letter-sim";
const BUILT_INDEX = path.join(
  process.cwd(),
  "examples",
  "generated",
  TABLE,
  "index.html",
);
// Unique across sim e2e suites (coverage uses 5600+, showimage 5640,
// realRun 5651, chaos 5660+) — jest runs suites in parallel.
const PORT = 5678;

(RUN_E2E ? describe : describe.skip)("font geometry columns (e2e)", () => {
  test(`${TABLE}: avg ink width < spacing; column layout as requested`, async () => {
    expect(existsSync(BUILT_INDEX)).toBe(true);
    const { simulate } = await import("../../../server/simulate");
    const result = await simulate(TABLE, {
      port: PORT,
      seed: 1,
      stuckTimeoutMs: 45_000,
      headless: true,
    });
    expect(result.status).toBe("completed");

    const mainName = Object.keys(result.csvFiles).find(
      (n) => n.endsWith(".csv") && !/_(stimulus|cursor)\.csv$/.test(n),
    );
    expect(mainName).toBeDefined();
    const csv = result.csvFiles[mainName!];

    const Papa = (await import("papaparse")).default;
    const parsed = Papa.parse(csv.replace(/^\ufeff/, ""), {
      header: true,
    });
    expect(parsed.errors).toEqual([]);
    const fields = parsed.meta.fields!;
    const rows = parsed.data as Record<string, string>[];

    // Requests 5/6/7: renamed + new columns exist; old name is gone.
    expect(fields).toContain("fontBoundingBoxHeightReNominal");
    expect(fields).toContain("fontBoundingBoxWidthReNominal");
    expect(fields).toContain("fontAverageWidthReNominal");
    expect(fields).not.toContain("fontCharacterSetHeightReNominal");

    // Denis 2026-09-23 #3: rect, width, height adjacent in that order,
    // then the other …ReNominal params; nominal (not ReNominal) last.
    const iRect = fields.indexOf("fontBoundingBoxReNominalRect");
    const iW = fields.indexOf("fontBoundingBoxWidthReNominal");
    const iH = fields.indexOf("fontBoundingBoxHeightReNominal");
    const iXh = fields.indexOf("fontXHeightReNominal");
    const iPx = fields.indexOf("fontNominalSizePx");
    const iPt = fields.indexOf("fontNominalSizePt");
    expect(iW).toBe(iRect + 1);
    expect(iH).toBe(iW + 1);
    expect(iXh).toBe(iH + 1);
    expect(iPt).toBe(iPx + 1);
    expect(iPx).toBeGreaterThan(iXh);

    // EasyEyes version column (Denis 2026-09-23 #4): prepend group, right
    // after "experiment", before "date"; filled on the first data row
    // (constant per experiment, like URL). Local sim builds stamp "local".
    const iExp = fields.indexOf("experiment");
    const iV = fields.indexOf("easyEyesVersion");
    const iDate = fields.indexOf("date");
    expect(iV).toBe(iExp + 1);
    expect(iDate).toBe(iV + 1);
    expect(rows[0].easyEyesVersion).toBe("local");

    // Request 7 insight: mean per-char ink width is positive and
    // strictly less than average spacing, on every logged row.
    const withAvg = rows.filter((r) => r.fontAverageWidthReNominal);
    expect(withAvg.length).toBeGreaterThan(0);
    for (const r of withAvg) {
      const avg = Number(r.fontAverageWidthReNominal);
      const spacing = Number(r.fontSpacingReNominal);
      expect(avg).toBeGreaterThan(0);
      expect(avg).toBeLessThan(spacing);
    }
  }, 120_000);
});
