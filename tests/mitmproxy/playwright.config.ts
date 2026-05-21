import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  workers: 1, // run serially — each test owns mitmproxy on port 8080
  globalSetup: "./global-setup.ts",
  timeout: 90_000, // TC-06 waits 15 s for the abort; allow plenty of headroom
  reporter: [["list"]],
  use: {
    headless: true,
    // proxy and bypass are set per-test via browser.newContext({ proxy })
  },
});
