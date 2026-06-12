/**
 * TC-11: POST /api/v4/projects returns 400 "already been taken" →
 *        retry loop increments the name suffix and succeeds on the second attempt.
 *
 * Given  mitmproxy returns 400 "has already been taken" for name "myExp1"
 *        and 201 for any other name
 * When   the inline harness runs the name-conflict retry loop
 * Then   the loop resolves with repoName "myExp2" after exactly 2 POSTs
 *
 * The inline harness mirrors the incrementNameSuffix + retry logic in
 * _createExperimentTask_prepareRepo (preprocess/gitlabUtils.ts) and sends
 * real HTTP requests through mitmproxy, validating the network-level contract.
 */
import { test, expect, chromium } from "@playwright/test";
import { readFileSync } from "fs";
import { MitmProxy } from "../helpers/mitm";
import { contextWithProxy } from "../helpers/page";

const COUNT_FILE = "/tmp/tc11_count.json";
const GITLAB_URL = "http://gitlab.pavlovia.test/api/v4";

test("TC-11: name conflict on POST /projects retries with incremented suffix", async () => {
  const mitm = new MitmProxy();
  await mitm.start("tc11_name_conflict_retry.py");

  const browser = await chromium.launch();
  const ctx = await contextWithProxy(browser, mitm.proxyUrl);
  const page = await ctx.newPage();

  try {
    // Serve a minimal fixture page from a stable origin so CORS ACAO:* applies.
    await page.route("http://fixture.test/", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!DOCTYPE html><html><body><p id="result"></p></body></html>`,
      }),
    );
    await page.goto("http://fixture.test/");

    // Run the name-conflict retry algorithm in the browser context.
    // All fetch() calls are routed through mitmproxy via the proxy config.
    const result = await page.evaluate(async (gitlabUrl: string) => {
      function incrementSuffix(name: string): string {
        const m = name.match(/^(.*?)(\d+)$/);
        return m ? m[1] + String(parseInt(m[2], 10) + 1) : name + "2";
      }

      const CAP = 10;
      let currentName = "myExp1";

      for (let i = 0; i < CAP; i++) {
        const resp = await fetch(`${gitlabUrl}/projects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: currentName }),
        });

        if (resp.status === 400) {
          const data: any = await resp.json().catch(() => ({}));
          const errs: string[] = data?.message?.name ?? [];
          if (errs.some((e: string) => e.includes("already been taken"))) {
            currentName = incrementSuffix(currentName);
            continue;
          }
        }

        if (resp.ok) {
          const repo: any = await resp.json();
          return { repoName: currentName, repoPath: repo.path };
        }

        return { error: `status:${resp.status}` };
      }

      return { error: "cap_exceeded" };
    }, GITLAB_URL);

    expect((result as any).error).toBeUndefined();
    expect(result.repoName).toBe("myExp2");
    expect(result.repoPath).toBe("myExp2");

    // Give mitmproxy a moment to flush the count file.
    await new Promise((r) => setTimeout(r, 500));

    const { count, lastName } = JSON.parse(readFileSync(COUNT_FILE, "utf8"));
    expect(count).toBe(2);
    expect(lastName).toBe("myExp2");
  } finally {
    await browser.close();
    await mitm.stop();
  }
});
