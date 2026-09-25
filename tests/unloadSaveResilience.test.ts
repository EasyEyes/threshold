/**
 * Source contracts for the unload-save resilience fixes (the 25 unexplained
 * incompletes, Acuity24Fonts5-12):
 *
 * 1. ServerManager's synchronous (page-closing) upload must route through
 *    the beacon→sync-XHR fallback, never a bare navigator.sendBeacon whose
 *    over-quota refusal silently drops the whole results file.
 * 2. threshold must run the periodic partial-save scheduler (honoring
 *    _pavloviaSavePartialResultsBool), and quitPsychoJS must stop it before
 *    the final save, so the final upload is always the last one.
 */

import { readFileSync } from "fs";
import path from "path";
import { describe, expect, test } from "@jest/globals";

const ROOT = path.join(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("close-time upload resilience wiring", () => {
  test("threshold starts the partial-save scheduler (gated on _pavloviaSavePartialResultsBool)", () => {
    const src = read("threshold.js");
    expect(src).toMatch(/startPartialSaveScheduler\(/);
    expect(src).toMatch(/_pavloviaSavePartialResultsBool/);
  });

  test("quitPsychoJS stops (awaiting any in-flight save) before its final save", () => {
    const src = read(path.join("components", "lifetime.js"));
    expect(src).toMatch(/await stopPartialSaveScheduler\(\)/);
  });
});
