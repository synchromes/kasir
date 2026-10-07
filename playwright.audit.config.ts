import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "antislop-002.spec.ts",
  timeout: 60000,
  workers: 1,
  use: { baseURL: "http://localhost:3000", channel: "msedge" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
