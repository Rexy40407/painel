import { defineConfig } from "@playwright/test";

const config = {
  testDir: "./tests",
  testMatch: "*.spec.mjs",
  timeout: 45_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    trace: "retain-on-failure",
  },
};

if (process.env.PREVIEW_SERVER_MANAGED !== "1") {
  config.webServer = {
    command: "node tests/serve-site.mjs",
    url: "http://127.0.0.1:4173/tests/preview-harness.html?module=management.polls",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  };
}

export default defineConfig(config);
