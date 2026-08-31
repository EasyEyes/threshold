/**
 * e2e smoke test for the in-app ColorCAL test page
 * (_screenColorCheckBool → components/colorPipelineTestPage.js).
 *
 * Uses the compiled simulated example (like color-pipeline.e2e.test.ts): the
 * sim participant self-drives through the compatibility page and RC
 * calibration; the test page then appears before the first block. No
 * ColorCAL hardware is needed — the page renders and Continue dismisses it;
 * running an actual sweep requires the device and stays manual.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const EXPERIMENT_DIR = "examples/generated/PersianFontsCrwdngRdngCmfrtSim";
const EXPERIMENT = `/${EXPERIMENT_DIR}/index.html`;

const experimentExists = () =>
  fs.existsSync(path.join(__dirname, "..", "..", EXPERIMENT_DIR, "index.html"));

test.describe("color pipeline test page", () => {
  test.beforeEach(() => {
    test.skip(
      !experimentExists(),
      `${EXPERIMENT_DIR} not compiled (run: npm run examples -- --simulate)`,
    );
  });

  test("page appears before the first block; Continue dismisses it", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await page.goto(`${EXPERIMENT}?_screenColorCheckBool=TRUE&seed=1`);

    // The probe must be installed WITHOUT ?colorPipelineProbe (force path).
    await page.waitForFunction(
      () => typeof (window as any).__EEcolorProbe !== "undefined",
      null,
      { timeout: 60000 },
    );

    // The sim participant walks the compatibility + calibration flow; the
    // test page then appears.
    const testPage = page.locator("[data-ee-color-pipeline-test-page]");
    await testPage.waitFor({ state: "attached", timeout: 150000 });

    // Connect button, center target square, and one Run button per test.
    await expect(
      page.getByText("Connect ColorCAL", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("Rest the ColorCAL photocell here"),
    ).toBeVisible();
    const runButtons = page.locator("[data-ee-run-test]");
    await expect(runButtons).toHaveCount(2);
    // Run buttons are disabled until the device connects.
    for (const b of await runButtons.all()) await expect(b).toBeDisabled();

    // Parameter fields render with defaults.
    await expect(
      page.locator('[data-ee-field="bitDepth.stepDenominator"]'),
    ).toHaveValue("1023");
    await expect(
      page.locator('[data-ee-field="chromaticity.colors"]'),
    ).toHaveValue("1,0,0; 0,1,0; 0,0,1; 1,1,1");

    // Continue dismisses the page and the experiment proceeds.
    await page.locator("[data-ee-color-test-continue]").click();
    await expect(testPage).toHaveCount(0);
  });

  test("without the parameter the page never appears", async ({ page }) => {
    await page.goto(`${EXPERIMENT}?colorPipelineProbe=1&seed=1`);
    await page.waitForFunction(
      () => typeof (window as any).__EEcolorProbe !== "undefined",
      null,
      { timeout: 60000 },
    );
    // Give the flow a moment; the page element must not exist.
    await page.waitForTimeout(3000);
    await expect(
      page.locator("[data-ee-color-pipeline-test-page]"),
    ).toHaveCount(0);
  });
});
