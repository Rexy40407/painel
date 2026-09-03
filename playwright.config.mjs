import { defineConfig } from "@playwright/test";

const previewOrigin = process.env.PREVIEW_ORIGIN || "http://127.0.0.1:4173";
const config = {
  testDir: "./tests",
  testMatch: "*.spec.mjs",
  timeout: 45_000,
  fullyParallel: true,
  // Eight Chromium workers can exhaust small CI/dev machines before a page is
  // created. Keep the same bounded concurrency locally and in CI.
  workers: 2,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: previewOrigin,
    headless: true,
    trace: "retain-on-failure",
  },
};

if (process.env.PREVIEW_SERVER_MANAGED !== "1") {
  config.webServer = {
    command: "node tests/serve-site.mjs",
    url: `${previewOrigin}/tests/preview-harness.html?module=management.polls`,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  };
}

export default defineConfig(config);
