/**
 * TC-04: Non-retryable 403 causes immediate hard stop.
 *
 * Given  mitmproxy always returns 403 Forbidden
 * When   _retryablePavloviaPost is called
 * Then   no retries are made, the promise rejects, and
 *        mitmproxy records exactly one POST
 */
import { test, expect, chromium } from "@playwright/test";
import { readFileSync } from "fs";
import { MitmProxy } from "../helpers/mitm";
import { RESULTS_URL, loadFixture, contextWithProxy } from "../helpers/page";

const COUNT_FILE = "/tmp/tc04_count.json";

test("TC-04: 403 hard stop — rejects immediately, exactly one request", async () => {
  const mitm = new MitmProxy();
  await mitm.start("tc04_403_hard_stop.py");

  const browser = await chromium.launch();
  const ctx = await contextWithProxy(browser, mitm.proxyUrl);
  const page = await ctx.newPage();

  try {
    await loadFixture(page, RESULTS_URL);
    await expect(page.locator("#result")).toHaveText("error:403", {
      timeout: 10_000,
    });

    const { count } = JSON.parse(readFileSync(COUNT_FILE, "utf8"));
    expect(count).toBe(1);
  } finally {
    await browser.close();
    await mitm.stop();
  }
});
