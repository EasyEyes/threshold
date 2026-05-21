/**
 * TC-02: 429 with Retry-After: 2 uses server-directed delay (no jitter).
 *
 * Given  mitmproxy returns 429 + Retry-After: 2 on the first POST
 * When   _retryablePavloviaPost processes the response
 * Then   the second attempt arrives ≥ 2 000 ms after the 429, and
 *        jitter must not have been applied (≤ 2 100 ms window)
 */
import { test, expect, chromium } from "@playwright/test";
import { readFileSync } from "fs";
import { MitmProxy } from "../helpers/mitm";
import { RESULTS_URL, loadFixture, contextWithProxy } from "../helpers/page";

const TIMESTAMPS_FILE = "/tmp/tc02_timestamps.json";

test("TC-02: 429 Retry-After: 2 → second attempt ≥ 2000 ms later, no jitter", async () => {
  const mitm = new MitmProxy();
  await mitm.start("tc02_429_retry_after.py");

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
    expect(gapMs).toBeGreaterThanOrEqual(2_000);
    // 100 ms upper margin: no jitter applied to server-supplied delay
    expect(gapMs).toBeLessThan(2_100);
  } finally {
    await browser.close();
    await mitm.stop();
  }
});
