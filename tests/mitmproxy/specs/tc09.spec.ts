/**
 * TC-09: Status message is shown during retries.
 *
 * Given  two 504s then a 200 (same network conditions as TC-01)
 * When   the fixture uploads
 * Then   the DOM shows "Saving your results, please wait…" immediately after
 *        the upload starts, and the message disappears once the upload succeeds
 */
import { test, expect, chromium } from "@playwright/test";
import { MitmProxy } from "../helpers/mitm";
import { RESULTS_URL, loadFixture, contextWithProxy } from "../helpers/page";

test("TC-09: status message visible during retries, clears on success", async () => {
  const mitm = new MitmProxy();
  // Reuses the TC-01 addon (2 × 504 then 200) — same network, different assertion.
  await mitm.start("tc01_transient_504.py");

  const browser = await chromium.launch();
  const ctx = await contextWithProxy(browser, mitm.proxyUrl);
  const page = await ctx.newPage();

  try {
    await loadFixture(page, RESULTS_URL);

    // Status message must be present immediately (set synchronously before async upload).
    await expect(page.locator("#status")).toHaveText(
      "Saving your results, please wait…",
    );

    // Wait for upload to finish.
    await expect(page.locator("#result")).toHaveText("success:200", {
      timeout: 30_000,
    });

    // Status message clears after successful upload.
    await expect(page.locator("#status")).toHaveText("");
  } finally {
    await browser.close();
    await mitm.stop();
  }
});
