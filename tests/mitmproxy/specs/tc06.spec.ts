/**
 * TC-06: Per-attempt 15-second AbortController timeout triggers retry.
 *
 * Given  mitmproxy holds the first connection open for 60 s (no response)
 * When   _retryablePavloviaPost is called
 * Then   after ≥ 15 000 ms the first attempt is aborted and a second attempt
 *        is made; the second attempt receives 200 and the promise resolves
 *
 * Note: this test deliberately takes ~15 s.
 */
import { test, expect, chromium } from "@playwright/test";
import { readFileSync } from "fs";
import { MitmProxy } from "../helpers/mitm";
import { RESULTS_URL, loadFixture, contextWithProxy } from "../helpers/page";

const TIMESTAMPS_FILE = "/tmp/tc06_timestamps.json";

test("TC-06: stalled connection aborted after 15 s, second attempt succeeds", async () => {
  const mitm = new MitmProxy();
  await mitm.start("tc06_stall_15s.py");

  const browser = await chromium.launch();
  const ctx = await contextWithProxy(browser, mitm.proxyUrl);
  const page = await ctx.newPage();

  try {
    await loadFixture(page, RESULTS_URL);
    // Wait up to 60 s — the abort fires at 15 s then a quick retry follows
    await expect(page.locator("#result")).toHaveText("success:200", {
      timeout: 60_000,
    });

    const times: number[] = JSON.parse(readFileSync(TIMESTAMPS_FILE, "utf8"));
    expect(times.length).toBeGreaterThanOrEqual(2);
    const gapMs = (times[1] - times[0]) * 1000;
    expect(gapMs).toBeGreaterThanOrEqual(15_000);
  } finally {
    await browser.close();
    await mitm.stop();
  }
});
