import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { hash } from "bcryptjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/db";

const evidenceDir = path.resolve("anti-slop/fix-005-evidence");
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
let ownerId: number | undefined;
let fixtureEmail: string;
let bigSaleId: number;

async function login(page: Page, email = "admin@kasir.com", password = "admin123") {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("/", { waitUntil: "domcontentloaded" });
  // Each fixture has its own owner; mark that account's tour complete.
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) if (key.startsWith("kasir-tour-v1-")) localStorage.setItem(key, "1");
  });
  const skip = page.getByRole("button", { name: "Lewati", exact: true });
  if (await skip.isVisible()) await skip.click();
}

async function axe(page: Page, name: string) {
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const result = await page.evaluate(async () => {
    const engine = (window as unknown as { axe: { run: (context: string, options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return engine.run("main", { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  });
  await writeFile(path.join(evidenceDir, `${name}-axe.json`), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
}

test.beforeAll(async ({}, info) => {
  await mkdir(evidenceDir, { recursive: true });
  fixtureEmail = `reports-${info.project.name}-${Date.now()}@example.test`;
  const user = await prisma.user.create({ data: { name: "Uji Laporan", email: fixtureEmail, password: await hash("ReportsTest123", 10), role: "ADMIN" } });
  ownerId = user.id;
  const product = await prisma.product.create({ data: { ownerId, sku: "REPORT-TEST-1", name: "ProdukDenganNamaPanjangTanpaSpasiUntukMengujiPembungkusanTeksPadaLayarMobileYangSempit", sellPrice: 1000, costPrice: 200, stock: 100 } });
  for (let index = 0; index < 6; index++) {
    const total = (index + 1) * 1000;
    await prisma.sale.create({ data: { ownerId, invoiceNo: `INV-TEST-${index + 1}`, createdAt: new Date(`2026-08-0${Math.floor(index / 2) + 1}T${index === 5 ? "23:59:59.999" : "12:00:00"}`), subtotal: total, total, paid: total, paymentMethod: (["CASH", "QRIS", "TRANSFER"] as const)[index % 3], items: { create: { productId: product.id, qty: 1, price: total, cost: 200 } } } });
  }
  await prisma.expense.create({ data: { ownerId, amount: 22000, note: "Biaya uji laporan", createdAt: new Date("2026-08-02T12:00:00") } });
  await prisma.sale.create({ data: { ownerId, invoiceNo: "INV-TEST-PREVIOUS", createdAt: new Date("2026-07-30T12:00:00"), subtotal: 10000, total: 10000, paid: 10000, items: { create: { productId: product.id, qty: 1, price: 10000, cost: 4000 } } } });
  await prisma.expense.create({ data: { ownerId, amount: 8000, note: "Biaya periode sebelumnya", createdAt: new Date("2026-07-30T12:00:00") } });
  const bigSale = await prisma.sale.create({ data: { ownerId, invoiceNo: "INV-TEST-NOMINAL-BESAR-UNTUK-LEBAR-320PX", createdAt: new Date("2026-08-04T12:00:00"), subtotal: 1234567890123, total: 1234567890123, paid: 1234567890123, paymentMethod: "TRANSFER", items: { create: { productId: product.id, qty: 1, price: 1234567890123, cost: 1_000_000 } } } });
  bigSaleId = bigSale.id;
});

test.afterAll(async () => {
  if (ownerId !== undefined) {
    // SaleItem restricts product deletion; remove this fixture's sales first.
    await prisma.sale.deleteMany({ where: { ownerId } });
    await prisma.user.delete({ where: { id: ownerId } });
  }
  await prisma.$disconnect();
});

test("Laporan: komposisi mobile, desktop, target sentuh dan aksesibilitas", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("kasir-tour-v1-1", "1"));
  await login(page);
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Laporan", exact: true })).toBeVisible();
  for (const width of [320, 393, 640, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 851 });
    await expect(page.getByRole("region", { name: "Ringkasan laporan", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const chart = page.locator(".recharts-wrapper");
    await expect(chart).toBeVisible();
    const chartBox = (await chart.boundingBox())!;
    for (const tick of await chart.locator(".recharts-yAxis text").all()) {
      const tickBox = (await tick.boundingBox())!;
      expect(tickBox.x).toBeGreaterThanOrEqual(chartBox.x);
      expect(tickBox.x + tickBox.width).toBeLessThanOrEqual(chartBox.x + chartBox.width);
    }
    for (const control of await page.locator("main a, main button, main summary").filter({ visible: true }).all()) {
      const box = (await control.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    if (width < 1024) {
      await expect(page.getByRole("list", { name: "Transaksi terakhir", exact: true })).toBeVisible();
      const net = (await page.locator('[data-report-value="net"]').boundingBox())!;
      expect(net.y + net.height).toBeLessThan(750);
    } else {
      await expect(page.getByRole("region", { name: "Transaksi terakhir", exact: true }).getByRole("table")).toBeVisible();
    }
    await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-${width}.png`) });
  }
  await page.setViewportSize({ width: 393, height: 851 });
  await axe(page, `${info.project.name}-default`);
  const metrics = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, headings: [...document.querySelectorAll("main h1, main h2")].map(el => ({ title: el.textContent, y: Math.round(el.getBoundingClientRect().top + scrollY) })) }));
  await writeFile(path.join(evidenceDir, `${info.project.name}-metrics.json`), JSON.stringify(metrics, null, 2));
  expect(metrics.height).toBeLessThan(2600);
  await page.setViewportSize({ width: 320, height: 420 });
  await page.getByRole("link", { name: "Kustom", exact: true }).click();
  await expect(page.getByLabel("Sampai", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Terapkan", exact: true }).click();
  await expect(page.getByRole("region", { name: "Ringkasan laporan", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  expect(errors).toEqual([]);
});

test("Laporan: periode, disclosure, bantuan, ekspor, detail dan daftar lengkap", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("kasir-tour-v1-1", "1"));
  await login(page);
  await page.goto("/reports");
  const nav = page.getByRole("navigation", { name: "Periode laporan", exact: true });
  for (const [label, preset] of [["Hari Ini", "day"], ["7 Hari", "week"], ["Bulan Ini", "month"]]) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`preset=${preset}`));
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
  }
  const detail = page.locator("main summary").filter({ hasText: "Rincian laba" });
  await page.keyboard.press("Tab");
  await detail.focus();
  expect(await detail.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe("none");
  await detail.press("Enter");
  await expect(page.getByText("Harga pokok penjualan (HPP)", { exact: true })).toBeVisible();
  await detail.press("Enter");
  const chart = page.locator("main summary").filter({ hasText: "Lihat angka grafik" });
  await chart.focus();
  await chart.press("Enter");
  await expect(page.getByRole("table", { name: "Omzet dan laba kotor per hari", exact: true })).toBeVisible();
  await chart.press("Enter");
  const guide = page.locator("main").getByRole("button", { name: "Bantuan, panduan Laporan", exact: true });
  await guide.click();
  await expect(page.getByRole("dialog")).toContainText("Pilih Hari Ini, 7 Hari, Bulan Ini, atau Kustom.");
  await page.keyboard.press("Escape");
  await expect(guide).toBeFocused();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Ekspor", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("laporan-penjualan.csv");
  const recent = page.getByRole("region", { name: "Transaksi terakhir", exact: true });
  const rowLink = recent.getByRole("link").filter({ visible: true }).first();
  const href = await rowLink.getAttribute("href");
  await rowLink.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await page.goBack();
  const all = page.getByRole("link", { name: "Lihat semua", exact: true });
  const allHref = (await all.getAttribute("href"))!;
  await all.click();
  await expect(page).toHaveURL(new URL(allHref, page.url()).toString());
  const dates = new URL(page.url()).searchParams;
  await expect(page.getByLabel("Dari Tanggal", { exact: true })).toHaveValue(dates.get("from")!);
  await expect(page.getByLabel("Sampai Tanggal", { exact: true })).toHaveValue(dates.get("to")!);
});

test("Laporan: HPP, laba rugi, isolasi toko, CSV penuh dan lima transaksi terakhir", async ({ page }, info) => {
  await login(page, fixtureEmail, "ReportsTest123");
  await page.goto("/reports?from=2026-08-01&to=2026-08-03");
  await expect(page.locator('[data-report-value="revenue"]')).toHaveText(money(21000));
  await expect(page.locator('[data-report-value="expense"]')).toHaveText(money(22000));
  await expect(page.locator('[data-report-value="net"]')).toHaveText(money(-2200));
  await expect(page.locator('[data-report-value="net"]')).toHaveCSS("color", "rgb(186, 26, 26)");
  await expect(page.locator('[data-report-value="count"]')).toHaveText("6");
  await expect(page.locator('[data-report-value="qty"]')).toHaveText("6");
  await expect(page.locator('[data-report-value="average"]')).toHaveText(money(3500));
  await expect(page.getByRole("region", { name: "Ringkasan laporan", exact: true })).toContainText("10.0%");
  const summary = page.locator("main summary").filter({ hasText: "Rincian laba" });
  await summary.click();
  const calculation = summary.locator("..");
  await expect(calculation).toContainText(money(1200));
  await expect(calculation).toContainText(money(19800));
  await page.locator("main summary").filter({ hasText: "Lihat angka grafik" }).click();
  const table = page.getByRole("table", { name: "Omzet dan laba kotor per hari", exact: true });
  await expect(table.getByRole("row")).toHaveCount(4);
  await expect(table.getByRole("row").last()).toContainText(money(10600));
  const payments = page.getByRole("list", { name: "Rincian metode pembayaran", exact: true });
  await expect(payments.getByRole("listitem")).toHaveCount(3);
  await expect(payments).toContainText(money(9000));
  const csvUrl = (await page.getByRole("link", { name: "Ekspor", exact: true }).getAttribute("href"))!;
  const csv = decodeURIComponent(csvUrl.split(",").slice(1).join(","));
  expect(csv.trim().split("\n")).toHaveLength(7);
  expect(csv).toContain("INV-TEST-1");
  expect(csv).not.toContain("INV-TEST-PREVIOUS");
  expect(csv).not.toContain("INV-20261007");
  const recent = page.getByRole("region", { name: "Transaksi terakhir", exact: true });
  await expect(recent.getByRole("link").filter({ visible: true })).toHaveCount(5);
  await expect(recent).toContainText("5 transaksi terbaru dari 6 transaksi");
  await expect(recent).not.toContainText("INV-TEST-1");
  await axe(page, `${info.project.name}-fixture-expanded`);
});

test("Laporan: periode kosong, tanggal salah, nol harian, bulan dan nominal panjang", async ({ page }, info) => {
  await login(page, fixtureEmail, "ReportsTest123");
  await page.goto("/reports?from=2026-08-05&to=2026-08-05");
  await expect(page.locator('[data-report-value="revenue"]')).toHaveText(money(0));
  await expect(page.getByText("Belum ada penjualan pada periode ini.", { exact: true })).toBeVisible();
  const emptyCsv = (await page.getByRole("link", { name: "Ekspor", exact: true }).getAttribute("href"))!;
  expect(decodeURIComponent(emptyCsv.split(",").slice(1).join(",")).trim().split("\n")).toHaveLength(1);
  await axe(page, `${info.project.name}-empty`);
  await page.goto("/reports?from=2026-08-06&to=2026-08-01");
  await expect(page.locator("main").getByRole("alert")).toContainText("Tanggal akhir harus sama atau setelah tanggal awal.");
  await expect(page.getByRole("region", { name: "Ringkasan laporan", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ekspor", exact: true })).toHaveCount(0);
  await axe(page, `${info.project.name}-invalid`);
  await page.getByRole("link", { name: "Kembali ke bulan ini", exact: true }).click();
  await expect(page.getByRole("region", { name: "Ringkasan laporan", exact: true })).toBeVisible();
  for (const invalid of ["2026-02-30", "invalid"]) {
    await page.goto(`/reports?from=${invalid}&to=2026-08-01`);
    await expect(page.locator("main").getByRole("alert")).toContainText("Tanggal tidak valid.");
  }
  await page.goto("/reports?from=2026-08-01&to=2026-08-05");
  await page.locator("main summary").filter({ hasText: "Lihat angka grafik" }).click();
  const daily = page.getByRole("table", { name: "Omzet dan laba kotor per hari", exact: true });
  await expect(daily.getByRole("row")).toHaveCount(6);
  await expect(daily.getByRole("row").last()).toContainText(money(0));
  await page.goto("/reports?from=2026-07-01&to=2026-10-01");
  await page.locator("main summary").filter({ hasText: "Lihat angka grafik" }).click();
  await expect(page.getByRole("table", { name: "Omzet dan laba kotor per bulan", exact: true }).getByRole("row")).toHaveCount(5);
  await page.goto("/reports?from=2026-08-04&to=2026-08-04");
  await expect(page.locator('[data-report-value="revenue"]')).toHaveText(money(1234567890123));
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 393, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 851 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    for (const field of await page.locator("main p, main dd").filter({ visible: true }).all()) {
      await expect.poll(() => field.evaluate(el => el.scrollWidth <= el.clientWidth + 1), { message: `Width ${width}: ${await field.textContent()}` }).toBe(true);
    }
  }
  await expect(page.locator('[data-report-value="revenue"]')).toHaveText(money(1234567890123));
  const recent = page.getByRole("region", { name: "Transaksi terakhir", exact: true });
  await expect(recent.getByRole("link").filter({ visible: true }).first()).toHaveAttribute("href", `/sales/${bigSaleId}`);
});
