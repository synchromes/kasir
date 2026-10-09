import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PW_BASE_URL || "http://localhost:14786";

// E2E walkthrough onboarding.
//
// Prasyarat sekali saja:
//   1. npm i -D @playwright/test && npx playwright install chromium
//   2. Database sudah di-seed (akun demo: admin@kasir.com / admin123) —
//      npx prisma db seed
//
// Menjalankan: npm run test:e2e
//
// Test memakai dev server yang sudah berjalan (reuseExistingServer) atau
// memulai sendiri jika belum ada. URL webServer diset ke "/" agar route
// dashboard (berat: query + chart) ikut di-warm saat cold start, sehingga
// test pertama tidak kalah balap dengan kompilasi dev.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) },
    },
    {
      // UA perangkat mobile Android → beranda super-app (HomeMobile) + tab bawah.
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"], ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) },
    },
  ],
  webServer: {
    command: `node node_modules/next/dist/bin/next dev --webpack --port ${new URL(baseURL).port || "3000"}`,
    env: { AUTH_URL: baseURL },
    // Redirect ke /login (3xx) tetap dianggap siap oleh Playwright.
    url: `${baseURL}/`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
