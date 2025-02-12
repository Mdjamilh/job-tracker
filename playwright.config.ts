import { defineConfig, devices } from "@playwright/test";

const PORT = 47260;
// Set BASE_URL to run the suite against a deployed site instead of a local server.
const BASE_URL = process.env.BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: BASE_URL
    ? undefined
    : {
        command: `npm run start -- --port ${PORT}`,
        url: `http://localhost:${PORT}/login`,
        reuseExistingServer: false,
        // Fresh in-memory demo database per run, so tests never depend on leftover state.
        env: { PGLITE_IN_MEMORY: "1", DATABASE_URL: "" },
        timeout: 120_000,
      },
});
