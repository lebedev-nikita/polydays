import { env } from "node:process";
import { defineConfig } from "@playwright/test";
const port = env.POLYDAYS_TEST_PORT || "3400";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun scripts/+test-server.ts",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 30000,
  },
});
