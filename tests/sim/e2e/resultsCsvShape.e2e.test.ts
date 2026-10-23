/**
 * @jest-environment node
 *
 * Verifies the simulator captures the results CSV and that its shape is
 * Excel-safe: every comma inside a cell is followed by a space, so Excel
 * does not misread vectors like "1000,625" as 1,000,625.
 *
 * Two tables, two cell origins:
 * - letter-sim: array-typed params (JSON.stringify'd by addData) — tests
 *   the array→JSON branch at the save-time chokepoint.
 * - movie-identify-sim: text-typed params whose block-CSV cells are raw
 *   UNspaced (screenColorRGBA "0.735,0.735,0.735,1") — tests the string
 *   branch end-to-end. (letter-sim has no such cells; without this table
 *   the string branch would be untested below the unit level.)
 *
 * Full E2E is opt-in: RUN_E2E=1 npm test (reuses cached builds).
 */

import { expect, describe, test } from "@jest/globals";
import { readFileSync, existsSync } from "fs";
import * as path from "path";
import { simE2EPort } from "./helpers/ports";

const RUN_E2E = process.env.RUN_E2E === "1";
const BUILT_INDEX = (table: string) =>
  path.join(process.cwd(), "examples", "generated", table, "index.html");
const E2E_PORT = simE2EPort("resultsCsvShape");

describe("simulate captures results CSV (unit)", () => {
  test("simulate.ts records downloaded CSV content into the result", () => {
    const src = readFileSync(
      path.join(process.cwd(), "server", "simulate.ts"),
      "utf8",
    );
    expect(src).toMatch(/csvFiles/);
  });
});

(RUN_E2E ? describe : describe.skip)("results CSV data shape (e2e)", () => {
  const TABLES = ["letter-sim", "movie-identify-sim"] as const;
  let port = E2E_PORT;

  for (const TABLE_NAME of TABLES) {
    it(`${TABLE_NAME} results CSV is Excel-safe and JSON-parseable`, async () => {
      expect(existsSync(BUILT_INDEX(TABLE_NAME))).toBe(true);

      const { simulate } = await import("../../../server/simulate");
      const result = await simulate(TABLE_NAME, {
        port: port++,
        seed: 1,
        stuckTimeoutMs: 45_000,
        headless: true,
      });

      expect(result.status).toBe("completed");

      // Main results file: a .csv with no sidecar label in the name.
      const mainName = Object.keys(result.csvFiles).find(
        (n) => n.endsWith(".csv") && !/_(stimulus|cursor)\.csv$/.test(n),
      );
      expect(mainName).toBeDefined();
      const csv = result.csvFiles[mainName!];
      expect(csv.length).toBeGreaterThan(0);

      // Parse CSV (header + rows); XLSX quoting means cells may contain commas.
      const Papa = (await import("papaparse")).default;
      const parsed = Papa.parse(csv.replace(/^\ufeff/, ""), { header: true });
      expect(parsed.errors).toEqual([]);
      expect(parsed.data.length).toBeGreaterThan(0);

      for (const row of parsed.data as Record<string, string>[]) {
        for (const [col, value] of Object.entries(row)) {
          if (typeof value !== "string") continue;
          // Every comma inside a cell must be followed by a space.
          expect(value).not.toMatch(/,(\S)/);
        }
      }

      // Spot-check string-branch coverage: on the movie table, a text-typed
      // condition cell must arrive spaced (raw "a,b" → "a, b").
      if (TABLE_NAME === "movie-identify-sim") {
        const row = (parsed.data as Record<string, string>[]).find(
          (r) => r.screenColorRGBA,
        );
        expect(row?.screenColorRGBA).toMatch(/^[\d.]+(, [\d.]+)+$/);
        expect(() =>
          JSON.parse("[" + row?.screenColorRGBA + "]"),
        ).not.toThrow();
      }

      // Cells we produce via JSON.stringify must remain JSON.parse()able.
      // (Legacy bracket formats like screenBoundingRectDeg were never JSON.)
      const first = parsed.data[0] as Record<string, string>;
      if (first.psychojsWindowDimensions) {
        expect(first.psychojsWindowDimensions).toMatch(/^\[\d+, \d+\]$/);
        expect(() => JSON.parse(first.psychojsWindowDimensions)).not.toThrow();
      }

      // Spot-check: at least one cell actually exercised a ", " separator,
      // so the test isn't vacuously passing on comma-free data.
      const hasSpacedComma = (parsed.data as Record<string, string>[]).some(
        (row) =>
          Object.values(row).some((v) => typeof v === "string" && /, /.test(v)),
      );
      expect(hasSpacedComma).toBe(true);

      // Memory telemetry: the heap validity flag and the texture-cache
      // columns must be present for EVERY targetKind (letter AND movie —
      // long reading/rsvp/image experiments need them just as much). The
      // sim browser reports live heap samples (simulate launches with
      // --enable-precise-memory-info), so the flag must be TRUE.
      {
        const header = parsed.meta.fields ?? [];
        for (const col of [
          "heapSampleLiveBool",
          "textureCacheCount",
          "textureCacheMB",
        ])
          expect(header).toContain(col);
        const rows = parsed.data as Record<string, string>[];
        const nonEmpty = (v: string | undefined): v is string =>
          v !== undefined && v !== "";
        const live = rows.map((r) => r.heapSampleLiveBool).filter(nonEmpty);
        expect(live.length).toBeGreaterThan(0);
        expect(live.every((v) => v === "TRUE")).toBe(true);
        const counts = rows
          .map((r) => r.textureCacheCount)
          .filter(nonEmpty)
          .map(Number);
        expect(counts.length).toBeGreaterThan(0);
        expect(Math.max(...counts)).toBeGreaterThan(0);

        // Heap columns are the field observability for hour-long runs —
        // they must exist and be populated for EVERY targetKind, not just
        // letters (a long reading/movie study is exactly the case at risk).
        for (const col of [
          "heapUsedBeforeDrawing (MB)",
          "heapTotalBeforeDrawing (MB)",
          "heapLimitBeforeDrawing (MB)",
        ])
          expect(header).toContain(col);

        // Consolidated unit-suffixed names (replacement set; the legacy
        // " (MB)" names dual-write until the Analyzer reads these).
        for (const col of [
          "heapUsedBeforeDrawingMB",
          "heapTotalBeforeDrawingMB",
          "heapLimitMB",
        ])
          expect(header).toContain(col);
        const limitsNew = rows
          .map((r) => r.heapLimitMB)
          .filter(nonEmpty)
          .map(Number);
        expect(limitsNew.length).toBeGreaterThan(0);
        // jsHeapSizeLimit is constant per page load: one distinct value.
        expect(new Set(limitsNew).size).toBe(1);
        const heapUsedNew = rows
          .map((r) => r.heapUsedBeforeDrawingMB)
          .filter(nonEmpty)
          .map(Number);
        expect(heapUsedNew.length).toBeGreaterThan(0);
        expect(heapUsedNew.every((v) => Number.isFinite(v) && v > 0)).toBe(
          true,
        );

        // Dual-write contract: new names carry the SAME samples as the
        // legacy names. If these ever drift, the Analyzer would read
        // inconsistent numbers across old/new columns mid-campaign.
        const pairs: [string, string][] = [
          ["heapUsedBeforeDrawingMB", "heapUsedBeforeDrawing (MB)"],
          ["heapTotalBeforeDrawingMB", "heapTotalBeforeDrawing (MB)"],
          ["heapLimitMB", "heapLimitBeforeDrawing (MB)"],
        ];
        for (const [newName, legacyName] of pairs) {
          const both = rows.filter(
            (r) => nonEmpty(r[newName]) && nonEmpty(r[legacyName]),
          );
          expect(both.length).toBeGreaterThan(0);
          expect(
            both.every((r) => Number(r[newName]) === Number(r[legacyName])),
          ).toBe(true);
        }
        const heapUsed = rows
          .map((r) => r["heapUsedBeforeDrawing (MB)"])
          .filter(nonEmpty)
          .map(Number);
        expect(heapUsed.length).toBeGreaterThan(0);
        expect(heapUsed.every((v) => Number.isFinite(v) && v > 0)).toBe(true);

        // Letter trials ALSO populate the after-drawing columns: the
        // per-trial reset at the before-drawing sampling point must not
        // clobber the mid-trial letter sampling before trialRoutineEnd
        // writes it.
        if (TABLE_NAME === "letter-sim") {
          const afterDrawing = rows
            .map((r) => r["heapUsedAfterDrawing (MB)"])
            .filter(nonEmpty)
            .map(Number);
          expect(afterDrawing.length).toBeGreaterThan(0);
          expect(afterDrawing.every((v) => Number.isFinite(v) && v > 0)).toBe(
            true,
          );
          // New consolidated names, letter-sampled trio: draw-request pair
          // plus the confirmed-drawn total (renamed from PostLateness).
          for (const col of [
            "heapUsedAfterDrawingMB",
            "heapTotalAfterDrawingMB",
            "heapTotalDrawnConfirmedMB",
          ])
            expect(header).toContain(col);
          const confirmed = rows
            .map((r) => r.heapTotalDrawnConfirmedMB)
            .filter(nonEmpty)
            .map(Number);
          expect(confirmed.length).toBeGreaterThan(0);
          expect(confirmed.every((v) => Number.isFinite(v) && v > 0)).toBe(
            true,
          );
          // Dual-write: the renamed confirmed-drawn column carries the same
          // sample as its legacy PostLateness twin.
          const twins = rows.filter(
            (r) =>
              nonEmpty(r.heapTotalDrawnConfirmedMB) &&
              nonEmpty(r["heapTotalPostLateness (MB)"]),
          );
          expect(
            twins.every(
              (r) =>
                Number(r.heapTotalDrawnConfirmedMB) ===
                Number(r["heapTotalPostLateness (MB)"]),
            ),
          ).toBe(true);
        }
      }
    }, 120_000);
  }
});
