import { chromium, devices } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

const directory = "anti-slop/fix-005-evidence";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext({ ...devices["Pixel 7"], deviceScaleFactor: 1, viewport: { width: 393, height: 851 } });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("kasir-tour-v1-1", "1"));
  await page.goto("http://localhost:3001/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@kasir.com");
  await page.getByLabel("Password", { exact: true }).fill("admin123");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("http://localhost:3001/");
  await page.goto("http://localhost:3001/reports");
  await page.getByRole("heading", { name: "Tren penjualan", exact: true }).waitFor();
  await page.locator(".recharts-bar").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${directory}/mobile-viewport.png` });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 393, height });
  await page.screenshot({ path: `${directory}/mobile-preview.png` });
  let tooltip;
  for (const bar of await page.locator(".recharts-bar-rectangle").all()) {
    const box = await bar.boundingBox();
    if (!box || box.height < 2) continue;
    await bar.hover();
    tooltip = await page.locator(".recharts-tooltip-wrapper").innerText();
    await page.screenshot({ path: `${directory}/chart-tooltip.png` });
    break;
  }
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: await context.storageState() });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto("http://localhost:3001/reports");
  await desktopPage.getByRole("heading", { name: "Tren penjualan", exact: true }).waitFor();
  await desktopPage.locator(".recharts-bar").first().waitFor();
  await desktopPage.evaluate(() => document.fonts.ready);
  await desktopPage.screenshot({ path: `${directory}/desktop-preview.png`, fullPage: true });
  await desktopPage.goto("http://localhost:3001/");
  await desktopPage.getByRole("heading").first().waitFor();
  await desktopPage.screenshot({ path: `${directory}/desktop-dashboard-regression.png`, fullPage: true });
  const prior = JSON.parse(await readFile(`${directory}/preview-info.json`, "utf8"));
  await writeFile(`${directory}/preview-info.json`, JSON.stringify({ ...prior, previewViewport: { width: 393, height }, tooltip }, null, 2));
  console.log(JSON.stringify({ height, tooltip }));
} finally {
  await browser.close();
}
