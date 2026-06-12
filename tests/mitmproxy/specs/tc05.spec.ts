/**
 * TC-05: Network TypeError (TCP RST) is treated as retryable.
 *
 * Given  mitmproxy kills the TCP connection on the first POST (flow.kill())
 * When   _retryablePavloviaPost is called
 * Then   the second attempt succeeds and the promise resolves
 */
import { test, expect, chromium } from "@playwright/test";
import { MitmProxy } from "../helpers/mitm";
import { RESULTS_URL, loadFixture, contextWithProxy } from "../helpers/page";

test("TC-05: TCP kill is retried as TypeError, resolves on second attempt", async () => {
  const mitm = new MitmProxy();
  await mitm.start("tc05_tcp_kill.py");

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
