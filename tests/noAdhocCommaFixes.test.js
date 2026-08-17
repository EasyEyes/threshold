import { expect, describe, test } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// All results-CSV values are made Excel-safe centrally, at save time, by
// excelSafeRows() (psychojs/src/data/excelSafe.js), applied where rows
// become output in ExperimentHandler.save and .saveCSV. Ad-hoc
// replace(/,/g, ", ") fixes at individual call sites are redundant chaff.
// This test guards against them creeping back in.
const RUNTIME_FILES = [
  join(__dirname, "../threshold.js"),
  ...readdirSync(join(__dirname, "../components"), { recursive: true })
    .filter((f) => /\.[jt]s$/.test(f))
    .map((f) => join(__dirname, "../components", f)),
];

// Matches .replace( or .replaceAll( whose first arg is a regex literal
// starting with a comma, e.g. replace(/,/g, ", ") or replaceAll(/,\s*/gi, " ")
const ADHOC_COMMA_FIX = /\.replace(?:All)?\(\s*\/,[^/)]*\//g;

describe("no ad-hoc comma fixes in runtime code", () => {
  for (const file of RUNTIME_FILES) {
    test(`${file.split("/").pop()} has no ad-hoc comma replace`, () => {
      const src = readFileSync(file, "utf8");
      const matches =
        src
          .split("\n")
          .filter((line) => !line.trim().startsWith("//"))
          .join("\n")
          .match(ADHOC_COMMA_FIX) || [];
      expect(matches).toEqual([]);
    });
  }
});
