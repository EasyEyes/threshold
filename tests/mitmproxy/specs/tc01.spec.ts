/**
 * TC-01: Transient 504 is retried and eventually succeeds.
 *
 * Given  mitmproxy returns 504 on the first 2 POSTs to /results
 * When   the fixture calls _retryablePavloviaPost
 * Then   the third attempt receives 200, the promise resolves, and
 *        #result shows "success:200"
 */
import { test, expect, chromium } from "@playwright/test";
import { MitmProxy } from "../helpers/mitm";
import { RESULTS_URL, loadFixture, contextWithProxy } from "../helpers/page";

test("TC-01: transient 504 is retried and eventually succeeds", async () => {
  const mitm = new MitmProxy();
  await mitm.start("tc01_transient_504.py");

  const browser = await chromium.launch();
  const ctx = await contextWithProxy(browser, mitm.proxyUrl);
  const page = await ctx.newPage();

  try {
    await loadFixture(page, RESULTS_URL);
    await expect(page.locator("#result")).toHaveText("success:200", {
      timeout: 30_000,
    });
  } finally {
    await browser.close();
    await mitm.stop();
  }
});
