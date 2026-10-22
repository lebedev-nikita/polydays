import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3400",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun scripts/+test-server.ts",
    url: "http://localhost:3400/api/health",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
