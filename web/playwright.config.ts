import "dotenv/config";
import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./tests/e2e/spec",
  timeout: 20_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: false,
  retries: 0,
  workers: 2,
  reporter: "list",
  use: {
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
};

export default defineConfig(config);


