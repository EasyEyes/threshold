/**
 * End-to-end tests for conditionEnabledBool filtering using real CSV files
 * parsed by actual PapaParse.  These tests parse real CSV experiment tables
 * and run them through the actual compile-time filter pipeline.
 *
 * RED tests assert DESIRED behavior (fail on current broken code).
 * GREEN tests verify behavior after the fix (padding before filter).
 *
 * @jest-environment node
 */

import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import { filterDisabledConditionsFromParsed } from "../preprocess/main";

const TABLES_DIR = path.resolve(__dirname, "../examples/tables");

function parseCsvFile(filename: string): string[][] {
  const filePath = path.join(TABLES_DIR, filename);
  const csv = fs.readFileSync(filePath, "utf8");
  const result = Papa.parse(csv, { skipEmptyLines: true });
  return result.data as string[][];
}

const getBlocks = (data: string[][]): string[] => {
  const row = data.find((r) => r[0] === "block");
  return row ? row.slice(2).filter(Boolean) : [];
};

const conditionCount = (data: string[][]): number => {
  const maxLen = Math.max(...data.map((r) => r.length));
  return maxLen - 2;
};

const padToLongestLength = (data: string[][], padValue = ""): string[][] => {
  const maxLen = Math.max(...data.map((r) => r.length));
  return data.map((row) => [
    ...row,
    ...new Array(maxLen - row.length).fill(padValue),
  ]);
};

// ── RED: data[0].length bug — filter is a no-op on real CSV ──
// These assert the DESIRED outcome and FAIL against the current code.

describe("E2E RED: filterDisabledConditionsFromParsed on real CSV", () => {
  it("RED: should reduce conditionCount from 6 to 2 (disabled blocks removed)", () => {
    const data = parseCsvFile("test-conditionEnabled-e2e.csv");
    expect(data[0][0]).toBe("_about");
    expect(data[0].length).toBe(2); // proves row-length variance

    const filtered = filterDisabledConditionsFromParsed(data);

    // DESIRED: disabled blocks 2 & 3 removed → only 2 conditions remain
    // CURRENT: returns 6 due to data[0].length bug
    expect(conditionCount(filtered)).toBe(2);
  });

  it("RED: should have no FALSE values in conditionEnabledBool row after filter", () => {
    const data = parseCsvFile("test-conditionEnabled-e2e.csv");
    const filtered = filterDisabledConditionsFromParsed(data);
    const padded = padToLongestLength(filtered);

    const cebRow = padded.find((r) => r[0] === "conditionEnabledBool")!;
    const values = cebRow.slice(2);
    // DESIRED: all TRUE, no FALSE
    // CURRENT: contains "FALSE" values
    expect(values.some((v) => v.trim().toUpperCase() === "FALSE")).toBe(false);
  });

  it("RED: should remove disabled blocks from the block row", () => {
    const data = parseCsvFile("test-conditionEnabled-e2e.csv");
    const filtered = filterDisabledConditionsFromParsed(data);
    const padded = padToLongestLength(filtered);
    const blocks = getBlocks(padded);

    // DESIRED: only block 1
    // CURRENT: blocks 1, 2, 3 all present
    expect([...new Set(blocks)]).toEqual(["1"]);
  });
});

// ── RED: whitespace in param name ──

describe("E2E RED: whitespace in param name", () => {
  it("RED: 'conditionEnabledBool ' (trailing space) should still be found", () => {
    // Pad first to isolate this bug from the data[0].length bug
    const rawData = parseCsvFile("test-conditionEnabled-whitespace-bug.csv");
    const data = padToLongestLength(rawData);

    // Verify the param name has trailing space
    const cebRow = data.find((r) => r[0]?.startsWith("conditionEnabledBool"));
    expect(cebRow![0]).toBe("conditionEnabledBool ");
    expect(cebRow![0]).not.toBe("conditionEnabledBool");

    // DESIRED: filter should find and process the row despite whitespace
    const filtered = filterDisabledConditionsFromParsed(data);
    // Should have removed the FALSE column → 1 condition
    expect(conditionCount(filtered)).toBe(1);
  });

  it("RED: no FALSE values should remain in output", () => {
    const rawData = parseCsvFile("test-conditionEnabled-whitespace-bug.csv");
    const data = padToLongestLength(rawData);
    const filtered = filterDisabledConditionsFromParsed(data);

    const cebRow = filtered.find(
      (r) => r[0]?.startsWith("conditionEnabledBool"),
    )!;
    // DESIRED: no FALSE
    // CURRENT: "FALSE" survives because filter missed the row
    expect(
      cebRow.slice(2).some((v) => v.trim().toUpperCase() === "FALSE"),
    ).toBe(false);
  });
});

// ── GREEN: after padding (what the fix will do), the filter works ──

describe("E2E GREEN: filter works after padding rows to uniform length", () => {
  it("filters disabled conditions from a padded real CSV", () => {
    const rawData = parseCsvFile("test-conditionEnabled-e2e.csv");
    const data = padToLongestLength(rawData);
    expect(conditionCount(data)).toBe(6);

    const filtered = filterDisabledConditionsFromParsed(data);
    expect(conditionCount(filtered)).toBe(2);
    expect(getBlocks(filtered)).toEqual(["1", "1"]);
  });

  it("results in no FALSE values after filtering", () => {
    const rawData = parseCsvFile("test-conditionEnabled-e2e.csv");
    const data = padToLongestLength(rawData);
    const filtered = filterDisabledConditionsFromParsed(data);

    const cebRow = filtered.find((r) => r[0] === "conditionEnabledBool")!;
    expect(cebRow.slice(2).some((v) => v.toUpperCase() === "FALSE")).toBe(
      false,
    );
  });

  it("conserves block numbers after filter", () => {
    const rawData = parseCsvFile("test-conditionEnabled-e2e.csv");
    const data = padToLongestLength(rawData);
    const filtered = filterDisabledConditionsFromParsed(data);
    expect(getBlocks(filtered)).toEqual(["1", "1"]);
  });
});
