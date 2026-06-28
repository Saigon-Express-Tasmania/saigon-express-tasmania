import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3099";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 600_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: reuseExistingServer
    ? undefined
    : {
        command: `npm run dev -- --port ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
