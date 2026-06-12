import type { BrowserContext, Page, Browser } from "@playwright/test";
import { fixtureHtml } from "./mitm";

export const RESULTS_URL =
  "http://pavlovia.test/api/v2/experiments/test/sessions/tok1/results";
export const LOGS_URL =
  "http://pavlovia.test/api/v2/experiments/test/sessions/tok1/logs";

// A stable origin for the fixture so CORS Access-Control-Allow-Origin: * works
// (it does not apply to null-origin pages produced by page.setContent()).
const FIXTURE_ORIGIN = "http://fixture.test";

/**
 * Navigate the page to the inline fixture with the given upload URL.
 * Uses page.route() to serve the HTML from memory so the page gets a real
 * (non-null) origin, allowing the mitmproxy addon's ACAO: * header to pass.
 */
export async function loadFixture(page: Page, stubUrl: string): Promise<void> {
  await page.route(`${FIXTURE_ORIGIN}/`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: fixtureHtml(stubUrl),
    }),
  );
  await page.goto(`${FIXTURE_ORIGIN}/`);
}

/**
 * Create a browser context wired through the given proxy URL.
 * Pavlovia test traffic goes through mitmproxy; fixture.test is served
 * via page.route() before it even reaches the network stack.
 */
export async function contextWithProxy(
  browser: Browser,
  proxyUrl: string,
): Promise<BrowserContext> {
  return browser.newContext({
    proxy: { server: proxyUrl },
  });
}
