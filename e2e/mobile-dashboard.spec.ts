import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { hash } from "bcryptjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/db";
import { productIconKind } from "../lib/product-icon-kind";

const evidenceDir = path.resolve("anti-slop/fix-006-evidence");
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const fixtureOwners: number[] = [];
let adminEmail: string;
let cashierEmail: string;
const longProduct = "BerasPremiumDenganNamaPanjangTanpaSpasiUntukMemeriksaTampilanKartuProdukPadaLayarSempit";

async function login(page: Page, email = "admin@kasir.com", password = "admin123") {
  await page.context().clearCookies();
  const owners = [1, 2, ...fixtureOwners];
  await page.addInitScript(ids => {
    for (const id of ids) localStorage.setItem(`kasir-tour-v1-${id}`, "1");
  }, owners);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("/", { waitUntil: "domcontentloaded" });
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
  const suffix = `${info.project.name}-${Date.now()}`;
  adminEmail = `dashboard-admin-${suffix}@example.test`;
  cashierEmail = `dashboard-cashier-${suffix}@example.test`;
  const password = await hash("DashboardTest123", 10);
  const admin = await prisma.user.create({ data: { name: "Uji Dashboard", email: adminEmail, password, role: "ADMIN" } });
  fixtureOwners.push(admin.id);
  const cashier = await prisma.user.create({ data: { name: "Kasir Uji", email: cashierEmail, password, role: "KASIR" } });
  fixtureOwners.push(cashier.id);
  await prisma.setting.create({ data: { ownerId: admin.id, storeName: "TokoDenganNamaPanjangTanpaSpasiUntukMemeriksaPembungkusanTeksPadaLayarMobileYangSempit" } });
  const category = await prisma.category.create({ data: { ownerId: admin.id, name: "Sembako" } });
  const product = await prisma.product.create({ data: { ownerId: admin.id, sku: "DASHBOARD-TEST-1", name: longProduct, categoryId: category.id, sellPrice: 1234567890123, stock: 100 } });
  const future = await prisma.product.create({ data: { ownerId: admin.id, sku: "DASHBOARD-TEST-2", name: "Produk Bulan Depan", sellPrice: 1000, stock: 100 } });
  const now = new Date();
  const total = 1234567890123;
  await prisma.sale.create({ data: { ownerId: admin.id, invoiceNo: "INV-DASHBOARD-CURRENT", createdAt: now, subtotal: total, total, paid: total, items: { create: { productId: product.id, qty: 1, price: total, cost: 1000 } } } });
  await prisma.sale.create({ data: { ownerId: admin.id, invoiceNo: "INV-DASHBOARD-NEXT-MONTH", createdAt: new Date(now.getFullYear(), now.getMonth() + 1, 1, 12), subtotal: 99000, total: 99000, paid: 99000, items: { create: { productId: future.id, qty: 99, price: 1000, cost: 100 } } } });
});

test.afterAll(async () => {
  for (const ownerId of fixtureOwners) {
    // SaleItem restricts product deletion; remove only this fixture's sales first.
    await prisma.sale.deleteMany({ where: { ownerId } });
    await prisma.user.delete({ where: { id: ownerId } });
  }
  await prisma.$disconnect();
});

test("Dashboard mobile: ukuran layar, label, ikon, fokus dan semua tujuan menu", async ({ page }, info) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await login(page);
  const metrics = [];
  for (const width of [320, 360, 393, 430, 768]) {
    await page.setViewportSize({ width, height: 851 });
    const grid = page.getByRole("region", { name: "Menu utama", exact: true });
    await expect(grid).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const searchBox = (await page.getByRole("searchbox", { name: "Cari menu", exact: true }).boundingBox())!;
    expect(searchBox.y).toBe(100);
    for (const label of ["Pengeluaran", "Pengaturan"]) {
      const el = grid.getByText(label, { exact: true });
      expect(await el.evaluate(node => node.scrollWidth <= node.clientWidth && getComputedStyle(node).textOverflow !== "ellipsis")).toBe(true);
    }
    for (const control of await page.locator("main a, main button").filter({ visible: true }).all()) {
      const box = (await control.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    const glyphs = await grid.locator("svg").evaluateAll(nodes => nodes.map(node => {
      const svg = node as SVGSVGElement;
      const b = svg.getBBox();
      return { hidden: svg.getAttribute("aria-hidden"), x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height };
    }));
    expect(glyphs).toHaveLength(12);
    for (const glyph of glyphs) {
      expect(glyph.hidden).toBe("true");
      expect(glyph.x).toBeGreaterThanOrEqual(0);
      expect(glyph.y).toBeGreaterThanOrEqual(0);
      expect(glyph.right).toBeLessThanOrEqual(24);
      expect(glyph.bottom).toBeLessThanOrEqual(24);
    }
    metrics.push({ width, searchY: searchBox.y, glyphs });
    await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-${width}.png`) });
  }
  await page.setViewportSize({ width: 393, height: 851 });
  await axe(page, `${info.project.name}-default`);
  const help = page.getByRole("button", { name: "Bantuan, panduan aplikasi", exact: true }).filter({ visible: true });
  await help.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(help).toBeFocused();
  const bell = page.getByRole("button", { name: /^Notifikasi/ }).filter({ visible: true });
  await bell.click();
  await expect(page.getByRole("button", { name: "Tutup notifikasi", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Tutup notifikasi", exact: true })).not.toBeVisible();
  await expect(bell).toBeFocused();
  await page.getByRole("link", { name: "Pengaturan akun", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.goto("/");
  const hero = page.getByRole("region", { name: "Ringkasan penjualan hari ini", exact: true });
  const pos = hero.getByRole("link", { name: "Buka Kasir", exact: true });
  await page.keyboard.press("Tab");
  await pos.focus();
  expect(await pos.evaluate(node => getComputedStyle(node).boxShadow)).not.toBe("none");
  await pos.press("Enter");
  await expect(page).toHaveURL(/\/pos$/);
  await page.goto("/");
  const routes = ["/", "/products", "/categories", "/units", "/suppliers", "/customers", "/purchases", "/sales", "/expenses", "/notifications", "/users", "/settings"];
  for (const route of routes) {
    await page.getByRole("region", { name: "Menu utama", exact: true }).locator(`a[href="${route}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${route === "/" ? "/" : route}$`));
    await page.goto("/");
  }
  for (const route of ["/reports", "/stock"]) {
    await page.getByRole("region", { name: "Ringkasan penjualan hari ini", exact: true }).locator(`a[href="${route}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await page.goto("/");
  }
  await page.getByRole("region", { name: "Ringkasan penjualan hari ini", exact: true }).getByRole("link", { name: /produk perlu restock/ }).last().click();
  await expect(page).toHaveURL(/\/stock$/);
  await page.goto("/");
  const products = page.getByRole("region", { name: "Produk terlaris", exact: true });
  await products.getByRole("link", { name: "Lihat semua", exact: true }).click();
  await expect(page).toHaveURL(/\/reports\?preset=month$/);
  await page.goto("/");
  const productLinks = page.getByRole("region", { name: "Produk terlaris", exact: true }).locator("a");
  const productCount = await productLinks.count();
  for (let index = 1; index < productCount; index++) {
    await productLinks.nth(index).click();
    await expect(page).toHaveURL(/\/reports\?preset=month$/);
    await page.goto("/");
  }
  await page.getByRole("button", { name: "Keluar", exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(errors).toEqual([]);
  await writeFile(path.join(evidenceDir, `${info.project.name}-metrics.json`), JSON.stringify({ metrics, errors, clickedRoutes: [...routes, "/pos", "/reports", "/stock", "/reports?preset=month"] }, null, 2));
});

test("Dashboard mobile: pencarian semua menu, hapus, Escape dan batas peran", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 851 });
  await login(page);
  const input = page.getByRole("searchbox", { name: "Cari menu", exact: true });
  for (const [label, href] of [["Kasir", "/pos"], ["Laporan", "/reports"], ["Stok", "/stock"], ["Inventaris", "/products"]]) {
    await input.fill(label);
    const result = page.getByRole("region", { name: "Hasil pencarian menu", exact: true });
    await expect(result.getByRole("status")).toHaveText("1 menu ditemukan");
    await expect(result.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", href);
    await result.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await page.goto("/");
  }
  await input.fill("Laporan");
  await axe(page, `${info.project.name}-search`);
  await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-search.png`) });
  await page.getByRole("button", { name: "Bersihkan pencarian", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await expect(page.getByRole("region", { name: "Menu utama", exact: true })).toBeVisible();
  await input.fill("qwertyxyz");
  await expect(page.getByRole("status")).toHaveText("Tidak ada menu “qwertyxyz”");
  await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-search-empty.png`) });
  await input.press("Escape");
  await expect(input).toHaveValue("");
  await login(page, cashierEmail, "DashboardTest123");
  await expect(page.getByRole("region", { name: "Produk terlaris", exact: true })).toContainText("Belum ada penjualan bulan ini");
  await input.fill("Pengguna");
  await expect(page.getByRole("region", { name: "Hasil pencarian menu", exact: true }).getByRole("link")).toHaveCount(0);
  await input.press("Escape");
  await expect(page.getByRole("region", { name: "Menu utama", exact: true }).getByRole("link", { name: "Pengguna", exact: true })).toHaveCount(0);
  await axe(page, `${info.project.name}-empty`);
});

test("Dashboard mobile: bulan berjalan, angka besar, nama panjang dan jenis ikon produk", async ({ page }, info) => {
  const cases = [
    ["Sembako", "Beras Premium 5kg", "food"],
    ["", "Tepung Terigu 1kg", "food"],
    ["Makanan & Minuman", "Roti Kopi", "food"],
    ["Makanan & Minuman", "Air Mineral", "drink"],
    ["Furniture", "Chair", "other"],
    ["Elektronik", "Airfryer", "other"],
    ["Minuman", "Produk tanpa jenis", "drink"],
  ] as const;
  for (const [category, name, expected] of cases) expect(productIconKind(category, name), name).toBe(expected);
  await page.setViewportSize({ width: 320, height: 851 });
  await login(page, adminEmail, "DashboardTest123");
  const products = page.getByRole("region", { name: "Produk terlaris", exact: true });
  await expect(products.getByRole("heading", { name: longProduct, exact: true })).toBeVisible();
  await expect(products).toContainText("Bulan ini · Berdasarkan jumlah terjual");
  await expect(products).toContainText("Nilai penjualan");
  await expect(products).toContainText(money(1234567890123));
  await expect(products).toContainText("Nilai produk sebelum diskon dan pajak.");
  await expect(products).not.toContainText("Produk Bulan Depan");
  await expect(page.getByRole("region", { name: "Ringkasan penjualan hari ini", exact: true })).toContainText("1 transaksi selesai");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const moneyLabel = products.getByText(money(1234567890123), { exact: true });
  expect(await moneyLabel.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await moneyLabel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-long-data.png`) });
  await axe(page, `${info.project.name}-long-data`);
});

test("Dashboard desktop mempertahankan komposisi terpisah", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chromium", "Komposisi desktop memakai UA desktop.");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  await expect(page.getByRole("heading", { name: /^Selamat datang,/ })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Cari menu", exact: true })).not.toBeVisible();
  await expect(page.locator(".recharts-wrapper").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1440);
  await page.screenshot({ path: path.join(evidenceDir, "desktop-1440.png") });
});
