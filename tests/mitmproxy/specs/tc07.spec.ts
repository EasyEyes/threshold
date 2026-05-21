/**
 * TC-07: Retry-After on 503 is honoured without jitter.
 *
 * Given  mitmproxy returns 503 + Retry-After: 3 on the first POST
 * When   _retryablePavloviaPost processes the response
 * Then   the second attempt arrives ≥ 3 000 ms after the 503 and
 *        no jitter is applied to the server-supplied value (≤ 3 100 ms window)
 */
import { test, expect, chromium } from "@playwright/test";
import { readFileSync } from "fs";
import { MitmProxy } from "../helpers/mitm";
import { RESULTS_URL, loadFixture, contextWithProxy } from "../helpers/page";

const TIMESTAMPS_FILE = "/tmp/tc07_timestamps.json";

test("TC-07: 503 Retry-After: 3 → second attempt ≥ 3000 ms later, no jitter", async () => {
  const mitm = new MitmProxy();
  await mitm.start("tc07_503_retry_after.py");

  const browser = await chromium.launch();
  const ctx = await contextWithProxy(browser, mitm.proxyUrl);
  const page = await ctx.newPage();

  try {
    await loadFixture(page, RESULTS_URL);
    await expect(page.locator("#result")).toHaveText("success:200", {
      timeout: 30_000,
    });

    const times: number[] = JSON.parse(readFileSync(TIMESTAMPS_FILE, "utf8"));
    expect(times).toHaveLength(2);

    const gapMs = (times[1] - times[0]) * 1000;
    expect(gapMs).toBeGreaterThanOrEqual(3_000);
    // 100 ms upper margin: no jitter on server-supplied value
    expect(gapMs).toBeLessThan(3_100);
  } finally {
    await browser.close();
    await mitm.stop();
  }
});
