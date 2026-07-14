import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.test.ts",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:5500",
    headless: true,
  },
  webServer: {
    // Start Vite directly — `npm start` requires interactive example
    // selection (--name) and would hang in a test environment.
    // reuseExistingServer handles the case where the user already has a
    // dev server running on 5500 (Vite serves all files from project root
    // regardless of which experiment is loaded, so test pages work).
    command: "npx vite",
    url: "http://localhost:5500",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
