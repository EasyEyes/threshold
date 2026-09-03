/**
 * e2e for the visual display-precision test
 * (_screenMeasurePrecision → components/displayPrecisionTest.js).
 *
 * Uses the compiled simulated example (like colorPipelineTestPage.e2e.
 * test.ts): the sim participant walks the compatibility page and RC
 * calibration; the precision page then appears before the first block and
 * SELF-DRIVES (types the two brightest levels' digits ~600 ms after mount —
 * the deterministic 8-bit answer). The published result object carries a
 * pipeline snapshot taken DURING the test, so the dither-suspension claim
 * is asserted without racing the auto-submit. URL overrides of _screen*
 * parameters require instrumentation mode (?colorPipelineProbe or the
 * ColorCAL page's parameter), which these tests use.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const EXPERIMENT_DIR = "examples/generated/PersianFontsCrwdngRdngCmfrtSim";
const EXPERIMENT = `/${EXPERIMENT_DIR}/index.html`;

const experimentExists = () =>
  fs.existsSync(path.join(__dirname, "..", "..", EXPERIMENT_DIR, "index.html"));

/** Boot with the probe, wait for the sim to reach the precision page and
 * auto-submit, and return the published result. */
const runToResult = async (page: any, urlParams: string) => {
  await page.goto(`${EXPERIMENT}?colorPipelineProbe=1&${urlParams}&seed=1`);
  await page.waitForFunction(
    () => typeof (window as any).__EEcolorProbe !== "undefined",
    null,
    { timeout: 60000 },
  );
  await page.waitForFunction(
    () => typeof (window as any).__EEdisplayPrecision !== "undefined",
    null,
    { timeout: 150000 },
  );
  return page.evaluate(() => (window as any).__EEdisplayPrecision);
};

test.describe("visual display-precision test", () => {
  test.beforeEach(() => {
    test.skip(
      !experimentExists(),
      `${EXPERIMENT_DIR} not compiled (run: npm run examples -- --simulate)`,
    );
  });

  test("test1Digit: dither suspends, sim reports two digits (8 bits), LSB chosen, dither resumes", async ({
    page,
  }) => {
    test.setTimeout(180000);
    const result = await runToResult(
      page,
      "_screenMeasurePrecision=test1Digit&_screenDitherBool=TRUE&_screenFloat16Bool=TRUE",
    );

    expect(result.mode).toBe("test1Digit");
    expect(result.digitsPerLevel).toBe(1);
    expect(result.targetString).toMatch(/^[0-9]{6}$/);
    expect(result.levelValues).toHaveLength(6);

    // Float16 guard passed (RGBA16F achieved), so the run is valid, and the
    // digits sit on the gray pedestal — float16(1/3) exactly, on the code
    // grid of every even bit depth (a mid-code pedestal would inflate the
    // measured precision).
    expect(result.valid).toBe(true);
    expect(result.float16Achieved).toBe(true);
    expect(result.pedestal).toBe(0.333251953125);

    // Deterministic sim answer: the two brightest digits → 8-bit bound.
    expect(result.simulated).toBe(true);
    expect(result.response).toBe(result.targetString.slice(0, 2));
    expect(result.digitsCorrect).toBe(2);
    expect(result.levelsCorrect).toBe(2);
    expect(result.effectiveBits).toBe(8);
    expect(result.chosenDitherLsb).toBeCloseTo(1 / 255, 9);

    // During the test our dither was OFF (it would synthesize the very
    // steps being measured) while still REQUESTED, and float16 stayed on.
    expect(result.ditherWasActive).toBe(true);
    expect(result.pipelineDuringTest.dither).toBe(false);
    expect(result.pipelineDuringTest.requested.ditherBool).toBe(true);

    // Browser hints were acquired.
    expect(result.hints.reportedRGBBits).toBeGreaterThan(0);

    // Afterwards: page gone, dither resumed at the chosen LSB.
    await expect(page.locator("[data-ee-display-precision-page]")).toHaveCount(
      0,
    );
    const after = await page.evaluate(() =>
      (window as any).__EEcolorProbe.report(),
    );
    expect(after.dither).toBe(true);
    expect(after.ditherLsb).toBeCloseTo(1 / 255, 9);
  });

  test("test2Digits: twelve digits, two per level; sim's four digits = two levels (8 bits)", async ({
    page,
  }) => {
    test.setTimeout(180000);
    const result = await runToResult(
      page,
      "_screenMeasurePrecision=test2Digits&_screenDitherBool=TRUE&_screenFloat16Bool=TRUE",
    );

    expect(result.mode).toBe("test2Digits");
    expect(result.digitsPerLevel).toBe(2);
    expect(result.targetString).toMatch(/^[0-9]{12}$/);
    expect(result.valid).toBe(true);
    expect(result.float16Achieved).toBe(true);
    expect(result.pedestal).toBe(0.333251953125);

    expect(result.response).toBe(result.targetString.slice(0, 4));
    expect(result.digitsCorrect).toBe(4);
    expect(result.levelsCorrect).toBe(2);
    expect(result.effectiveBits).toBe(8);
    expect(result.chosenDitherLsb).toBeCloseTo(1 / 255, 9);
  });

  test("float16 guard: test requested without float16 is skipped and marked invalid", async ({
    page,
  }) => {
    test.setTimeout(180000);
    // Request the test but NOT float16, so the RGBA16F buffer is absent.
    // (A compiled experiment can't reach this — the preprocess check blocks
    // it — but a browser that can't provide float16 would, so the runtime
    // guard must refuse rather than report a bogus precision.)
    const result = await runToResult(
      page,
      "_screenMeasurePrecision=test1Digit",
    );

    expect(result.valid).toBe(false);
    expect(result.float16Achieved).toBe(false);
    expect(result.skippedReason).toMatch(/float16/i);
    // The test never drew: the digits page must not have appeared.
    await expect(page.locator("[data-ee-display-precision-page]")).toHaveCount(
      0,
    );
  });

  test("dither alone does not trigger the test (default assume8Bit)", async ({
    page,
  }) => {
    test.setTimeout(180000);
    // The ColorCAL page (also instrumentation mode) is scheduled AFTER the
    // precision routine, so its appearance proves the routine ran and
    // declined even though dither is on.
    await page.goto(
      `${EXPERIMENT}?_screenColorCheckBool=TRUE&_screenDitherBool=TRUE&_screenFloat16Bool=TRUE&seed=1`,
    );
    await page
      .locator("[data-ee-color-pipeline-test-page]")
      .waitFor({ state: "attached", timeout: 150000 });
    await expect(page.locator("[data-ee-display-precision-page]")).toHaveCount(
      0,
    );
    expect(
      await page.evaluate(() => typeof (window as any).__EEdisplayPrecision),
    ).toBe("undefined");
    // Dither itself is on (the URL override took) — only the test is off.
    const report = await page.evaluate(() => (window as any).__EEcolorPipeline);
    expect(report.requested.ditherBool).toBe(true);
  });
});
