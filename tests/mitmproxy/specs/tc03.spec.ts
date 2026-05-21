/**
 * TC-03: 502 then 503 then 200 — all three retryable codes handled.
 *
 * Given  mitmproxy returns 502, 503, then 200 in sequence
 * When   _retryablePavloviaPost is called
 * Then   all three requests are made and the promise resolves on the 200
 */
import { test, expect, chromium } from "@playwright/test";
import { MitmProxy } from "../helpers/mitm";
import { RESULTS_URL, loadFixture, contextWithProxy } from "../helpers/page";

test("TC-03: 502 then 503 are retried, resolves on 200", async () => {
  const mitm = new MitmProxy();
  await mitm.start("tc03_5xx_sequence.py");

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
