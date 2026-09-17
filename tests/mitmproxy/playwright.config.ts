import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  workers: 1, // run serially — each test owns mitmproxy on port 8080
  timeout: 90_000,
  reporter: [["list"]],
  use: {
    headless: true,
    // proxy and bypass are set per-test via browser.newContext({ proxy })
  },
});
