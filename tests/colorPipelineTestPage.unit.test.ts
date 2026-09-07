/**
 * _screenColorCheckBool — in-app ColorCAL test page for the color
 * pipeline. Source contracts: the page is scheduled after the compatibility
 * page and RC calibration (both inside displayNeedsPage) and after sound
 * calibration, before experimentInit; the probe installs when the parameter
 * requests it (no URL parameter needed); the page registers its tests in an
 * extensible registry and packages each run as a zip (CSV + report.html).
 *
 * @jest-environment node
 */
import { readFileSync } from "fs";
import * as path from "path";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

describe("color pipeline test page (source contracts)", () => {
  test("threshold.js schedules the page between sound calibration and experimentInit", () => {
    const src = read("threshold.js");
    const order = [
      "flowScheduler.add(displayNeedsPage)",
      "flowScheduler.add(startSoundCalibration)",
      "flowScheduler.add(colorPipelineTestPageRoutine)",
      "flowScheduler.add(experimentInit)",
    ].map((s) => src.indexOf(s));
    expect(order.every((i) => i !== -1)).toBe(true);
    expect([...order]).toEqual([...order].sort((a, b) => a - b));
    // The routine is gated on the parameter and shows the page.
    expect(src).toMatch(/colorPipelineTestRequested\(paramReader\)/);
    expect(src).toMatch(/showColorPipelineTestPage\(\{ rc \}\)/);
  });

  test("the probe installs when the test parameter requests it", () => {
    const src = read("threshold.js");
    expect(src).toMatch(
      /installColorPipelineProbe\(psychoJS,\s*\{\s*force:\s*colorPipelineTestRequested\(paramReader\),?\s*\}\s*\)/,
    );
  });

  test("screenColorPipeline resolves the parameter and unlocks URL overrides for it", () => {
    const src = read(path.join("components", "screenColorPipeline.js"));
    expect(src).toMatch(/export const colorPipelineTestRequested/);
    expect(src).toMatch(/_screenColorCheckBool/);
    expect(src).toMatch(
      /instrumentationActive\(\)\s*\|\|\s*colorPipelineTestRequested\(paramReader\)/,
    );
  });

  test("the page registers Tests 3, 6 and 9 in an extensible registry", () => {
    const src = read(path.join("components", "colorPipelineTestPage.js"));
    expect(src).toMatch(/const TESTS = \[/);
    expect(src).toMatch(/id: "bitDepth"/);
    expect(src).toMatch(/id: "chromaticity"/);
    expect(src).toMatch(/id: "transferFunction"/);
    // Every test declares explained, parseable fields.
    expect(src).toMatch(/fields: \[/);
    expect(src).toMatch(/explain:/);
  });

  test("Test 9 measures the visual test's exact codes with EasyEyes' dither suspended", () => {
    const src = read(path.join("components", "colorPipelineTestPage.js"));
    // Same step series and pedestal as the digit test: one source of truth.
    expect(src).toMatch(
      /import \{\s*DISPLAY_PRECISION_LEVELS,\s*PEDESTAL_CODE,?\s*\} from "\.\/displayPrecisionScoring\.js"/,
    );
    expect(src).toMatch(/default: `0; \$\{PEDESTAL_CODE\}; 0\.08`/);
    // Dither off for the run (as in the digit test), restored in finally,
    // and the report documents the state DURING the run.
    const suspendAt = src.indexOf("suspendDither()");
    const measureAt = src.indexOf("probe.measureTextWithColorCAL", suspendAt);
    const resumeAt = src.indexOf("resumeDither()", measureAt);
    expect(suspendAt).toBeGreaterThan(-1);
    expect(measureAt).toBeGreaterThan(suspendAt);
    expect(resumeAt).toBeGreaterThan(measureAt);
    expect(src).toMatch(
      /finally\s*\{\s*if \(ditherSuspended\) resumeDither\(\);/,
    );
    expect(src).toMatch(/report: out\.pipelineReport \?\? probe\.report\(\)/);
    // The three plots: transfer function, Δ nits per base, normalized steps.
    expect(src).toMatch(/Display transfer function/);
    expect(src).toMatch(/Light added by each precision step/);
    expect(src).toMatch(/units of the 1\/255 step/);
    // The new CSV columns are in the glossary.
    for (const col of ["series", "baseCode", "stepCode", "stepLabel"])
      expect(src).toContain(`"${col} (Test 9 only)"`);
  });

  test("each run downloads a zip holding the CSV and a report with a labeled plot", () => {
    const src = read(path.join("components", "colorPipelineTestPage.js"));
    expect(src).toMatch(/from "jszip"/);
    expect(src).toMatch(/zip\.file\(`\$\{out\.baseName\}\.csv`/);
    expect(src).toMatch(/zip\.file\(\s*"report\.html"/);
    // The report's plots are self-describing: title + axis labels + legend.
    expect(src).toMatch(/svgLineChart/);
    expect(src).toMatch(/svgChromaticityPlot/);
    expect(src).toMatch(/xLabel/);
    expect(src).toMatch(/yLabel/);
    expect(src).toMatch(/CSV_COLUMN_GLOSSARY/);
  });

  test("sweeps support zip packaging (no forced download) and progress callbacks", () => {
    const src = read(path.join("components", "colorPipelineProbe.js"));
    expect(src).toMatch(/download = true/);
    expect(src).toMatch(/onProgress/);
    expect(src).toMatch(/export const ensureColorCAL/);
    expect(src).toMatch(/export const csvFromRecords/);
  });
});
