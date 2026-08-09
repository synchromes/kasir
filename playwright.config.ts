import { defineConfig, devices } from "@playwright/test";

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
    baseURL: "http://localhost:14786",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // UA perangkat mobile Android → beranda super-app (HomeMobile) + tab bawah.
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "npm run dev -- -p 14786",
    // Redirect ke /login (3xx) tetap dianggap siap oleh Playwright.
    url: "http://localhost:14786/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
