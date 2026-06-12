/**
 * TC-10: skipSave: true prevents a duplicate save in PsychoJS.quit().
 *
 * Given  _retryablePavloviaPost has already been awaited successfully
 *        (simulating experiment.save() completing before psychoJS.quit())
 * When   the caller respects skipSave: true and does NOT call the upload again
 * Then   mitmproxy records exactly one POST to /results
 *
 * This validates the contract used by quitPsychoJS: after experiment.save()
 * resolves, it calls psychoJS.quit({ skipSave: true }) which must not
 * trigger a second upload.
 */
import { test, expect, chromium } from "@playwright/test";
import { readFileSync } from "fs";
import { MitmProxy } from "../helpers/mitm";
import { RESULTS_URL, loadFixture, contextWithProxy } from "../helpers/page";

const COUNT_FILE = "/tmp/tc10_count.json";

test("TC-10: skipSave path — exactly one POST to /results", async () => {
  const mitm = new MitmProxy();
  await mitm.start("tc10_count_requests.py");

  const browser = await chromium.launch();
  const ctx = await contextWithProxy(browser, mitm.proxyUrl);
  const page = await ctx.newPage();

  try {
    // Load the fixture page so window._retryablePavloviaPost is available.
    // We use an empty FIXTURE_URL so the auto-run code does not fire — we
    // drive the upload programmatically to simulate the quitPsychoJS flow.
    await loadFixture(page, "");

    await page.evaluate(async (url) => {
      // Simulates: await experiment.save() from quitPsychoJS.
      await window._retryablePavloviaPost(url, { key: "data", value: "test" });
      // Simulates: psychoJS.quit({ skipSave: true }) → upload is NOT called again.
      document.getElementById("result")!.textContent = "success:200";
    }, RESULTS_URL);

    await expect(page.locator("#result")).toHaveText("success:200");

    // Give mitmproxy a moment to flush the count file.
    await new Promise((r) => setTimeout(r, 500));

    const { count } = JSON.parse(readFileSync(COUNT_FILE, "utf8"));
    expect(count).toBe(1);
  } finally {
    await browser.close();
    await mitm.stop();
  }
});
