/**
 * @jest-environment node
 *
 * The shared marking-frame owner must move a real PsychoJS/Pixi dot when the
 * fixation origin changes. A standalone harness isolates rendering from
 * RemoteCalibrator and experiment compilation; phrase responses are stubbed.
 *
 * Opt in: RUN_E2E=1 npx jest markDot.e2e
 */

import { expect, describe, test } from "@jest/globals";
import { chromium, type Browser } from "playwright";
import { spawnDevServer, stopDevServer } from "../../../server/devServer";
import { simE2EPort } from "./helpers/ports";

const RUN_E2E = process.env.RUN_E2E === "1";
const PORT = simE2EPort("markDot");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface BrowserResult {
  before: { dot: [number, number]; pixiX: number };
  after: { dot: [number, number]; pixiX: number };
}

(RUN_E2E ? describe : describe.skip)("markDot frame owner (e2e)", () => {
  test("moves the real Pixi polygon when fixation origin changes", async () => {
    const server = spawnDevServer({
      port: PORT,
      cwd: process.cwd(),
      development: true,
    });
    let browser: Browser | undefined;
    try {
      const serverDeadline = Date.now() + 60_000;
      for (;;) {
        try {
          const response = await fetch(`http://localhost:${PORT}`);
          if (response.status < 500) break;
        } catch {}
        if (Date.now() > serverDeadline) throw new Error("dev server not up");
        await sleep(250);
      }

      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (!url.pathname.endsWith("/.netlify/functions/phrases"))
          return route.continue();
        const body = url.searchParams.has("pinned")
          ? { version: "test" }
          : { version: "test", phrases: {} };
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      });
      await page.goto(
        `http://localhost:${PORT}/tests/e2e/pages/mark-dot.html?preview-deploy=https%3A%2F%2Feasyeyes.app`,
        { waitUntil: "domcontentloaded", timeout: 60_000 },
      );
      await page.waitForFunction(
        () =>
          Boolean(
            (window as any).__markDotResult ?? (window as any).__markDotError,
          ),
        undefined,
        { timeout: 60_000 },
      );
      const harnessError = await page.evaluate(
        "(window.__markDotError ?? undefined)",
      );
      expect(harnessError).toBeUndefined();
      const result = (await page.evaluate(
        "window.__markDotResult",
      )) as BrowserResult;

      expect(result.before.dot[0]).toBeCloseTo(100, 6);
      expect(result.after.dot[0]).toBeCloseTo(220, 6);
      expect(result.after.pixiX - result.before.pixiX).toBeCloseTo(120, 6);
    } finally {
      await browser?.close();
      await stopDevServer(server, PORT);
    }
  }, 120_000);
});
