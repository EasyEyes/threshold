/**
 * TC-08: Both /results and /logs endpoints use the retry path.
 *
 * Given  mitmproxy returns 504 on the first POST to /results and /logs
 * When   the fixture calls _retryablePavloviaPost for both endpoints
 * Then   both eventually receive 200 and both promises resolve
 */
import { test, expect, chromium } from "@playwright/test";
import { MitmProxy } from "../helpers/mitm";
import { RESULTS_URL, LOGS_URL, loadFixture, contextWithProxy } from "../helpers/page";
import { fixtureHtml } from "../helpers/mitm";

test("TC-08: uploadData and uploadLog both retry independently on 504", async () => {
  const mitm = new MitmProxy();
  await mitm.start("tc08_both_endpoints.py");

  const browser = await chromium.launch();
  const ctx = await contextWithProxy(browser, mitm.proxyUrl);
  const page = await ctx.newPage();

  try {
    // Two-upload fixture: calls _retryablePavloviaPost for /results then /logs
    const twoUploadHtml = fixtureHtml(RESULTS_URL).replace(
      `<p id="result"></p>`,
      `<p id="result"></p><p id="result2"></p>`,
    ).replace(
      `window.FIXTURE_URL = ${JSON.stringify(RESULTS_URL)};`,
      `window.FIXTURE_URL = ${JSON.stringify(RESULTS_URL)};
window.FIXTURE_URL2 = ${JSON.stringify(LOGS_URL)};`,
    );

    await page.route("http://fixture.test/", (route) =>
      route.fulfill({ contentType: "text/html", body: twoUploadHtml }),
    );

    // Inject second upload after page load
    await page.goto("http://fixture.test/");
    await page.evaluate(
      async ([resultsUrl, logsUrl]) => {
        const fn = window._retryablePavloviaPost;
        const r1 = fn(resultsUrl, { key: "data", value: "test" });
        const r2 = fn(logsUrl, { filename: "test.log", logs: "logdata", compressed: false });
        await Promise.all([r1, r2]);
        document.getElementById("result")!.textContent = "success:200";
        document.getElementById("result2")!.textContent = "success:200";
      },
      [RESULTS_URL, LOGS_URL] as [string, string],
    );

    await expect(page.locator("#result")).toHaveText("success:200", { timeout: 30_000 });
    await expect(page.locator("#result2")).toHaveText("success:200", { timeout: 30_000 });
  } finally {
    await browser.close();
    await mitm.stop();
  }
});
