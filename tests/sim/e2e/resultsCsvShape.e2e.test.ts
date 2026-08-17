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

const RUN_E2E = process.env.RUN_E2E === "1";
const BUILT_INDEX = (table: string) =>
  path.join(process.cwd(), "examples", "generated", table, "index.html");
const E2E_PORT = 5598;

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
    }, 120_000);
  }
});
