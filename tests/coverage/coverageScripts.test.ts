/**
 * @jest-environment node
 *
 * The `npm run coverage` umbrella must be self-sufficient: jest, a fixed
 * canonical set of simulated tables, then the merged report with automatic
 * tracking — no arguments, nothing to remember. These tests pin the wiring in
 * package.json and that the canonical set stays buildable and diverse.
 */

import { expect, describe, test } from "@jest/globals";
import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import Papa from "papaparse";

const ROOT = path.resolve(__dirname, "../../");
const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
const scripts = pkg.scripts;

const simInvocation = scripts["coverage:sim"] ?? "";
const tableArgs =
  simInvocation
    .match(/simulate\.cli\.ts (.*?) --/)?.[1]
    .split(/\s+/)
    .filter(Boolean) ?? [];

describe("npm run coverage wiring", () => {
  test("the umbrella chains jest, the sim tier, and the tracked report", () => {
    expect(scripts.coverage).toBe(
      "npm run coverage:jest && npm run coverage:sim && npm run coverage:report",
    );
  });

  test("the jest tier is runnable alone and does not track by itself", () => {
    expect(scripts["coverage:jest"]).toContain("jest --coverage");
    expect(scripts["coverage:jest"]).not.toContain("coverage:track");
  });

  test("the report is what tracks, so tracking is never forgotten", () => {
    expect(scripts["coverage:report"]).toContain("coverageReport.ts");
    expect(scripts["coverage:report"]).toContain("coverage:track");
  });

  test("the sim tier wipes stale browser dumps before harvesting", () => {
    expect(scripts["coverage:sim"]).toMatch(
      /^rm -f coverage\/browser\/\*\.json/,
    );
  });

  test("the sim tier is sequential and skips the broken auto-build", () => {
    expect(scripts["coverage:sim"]).toContain("--jobs=1");
    expect(scripts["coverage:sim"]).toContain("--no-build");
  });

  test("a failed sim tier degrades to the jest tier, not a silent stop", () => {
    expect(scripts["coverage:sim"]).toContain("|| echo");
  });
});

describe("canonical sim set", () => {
  test("at least three tables", () => {
    expect(tableArgs.length).toBeGreaterThanOrEqual(3);
  });

  test("every table is built under examples/generated/ (run npm run examples)", () => {
    for (const table of tableArgs) {
      const dir = path.join(ROOT, "examples", "generated", table);
      expect(existsSync(path.join(dir, "index.html"))).toBe(true);
      expect(readdirSync(path.join(dir, "conditions"))).not.toHaveLength(0);
    }
  });

  test("spans at least three distinct targetKinds", () => {
    const kinds = new Set<string>();
    for (const table of tableArgs) {
      const files = readdirSync(
        path.join(ROOT, "examples", "generated", table, "conditions"),
      ).filter((f) => /^block_.*\.csv$/.test(f));
      for (const f of files) {
        const rows = Papa.parse(
          readFileSync(
            path.join(ROOT, "examples", "generated", table, "conditions", f),
            "utf8",
          ),
          { header: true },
        ).data as Record<string, string>[];
        for (const row of rows) kinds.add(row.targetKind ?? "");
      }
    }
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });
});
