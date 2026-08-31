/**
 * measureLuminance (off | measure | pretend) replaced the retired boolean
 * pair measureLuminanceBool / measureLuminancePretendBool with NO runtime
 * fallback: the old names are being deleted from the glossary, so any
 * surviving reference in code or example tables would either dead-code or
 * fail compilation. These source contracts keep them from creeping back.
 *
 * @jest-environment node
 */
import { readFileSync, readdirSync } from "fs";
import * as path from "path";

const RUNTIME_FILES = [
  "threshold.js",
  path.join("components", "photometry.js"),
  path.join("components", "instructions.js"),
];

describe("measureLuminance categorical parameter (no legacy names)", () => {
  test("no runtime file references the retired Bool pair", () => {
    for (const file of RUNTIME_FILES) {
      const src = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(src).not.toMatch(/measureLuminance(Bool|PretendBool)/);
    }
  });

  test("the runtime reads the categorical parameter", () => {
    // The three call sites of the merged API: photometer init (threshold.js
    // and instructions.js gate on "measure"), and photometry.js gates
    // sampling/CSV on "off"/"pretend".
    for (const file of RUNTIME_FILES) {
      const src = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(src).toMatch(/read\(\s*["']measureLuminance["']/);
    }
  });

  test("no example table uses the retired names", () => {
    const tablesDir = path.join(process.cwd(), "examples", "tables");
    const offenders = readdirSync(tablesDir)
      .filter((f) => f.endsWith(".csv"))
      .filter((f) =>
        readFileSync(path.join(tablesDir, f), "utf8").match(
          /^measureLuminance(Bool|PretendBool),/m,
        ),
      );
    expect(offenders).toEqual([]);
  });
});
