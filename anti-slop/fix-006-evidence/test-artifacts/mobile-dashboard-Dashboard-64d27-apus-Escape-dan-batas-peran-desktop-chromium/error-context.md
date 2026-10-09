# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-dashboard.spec.ts >> Dashboard mobile: pencarian semua menu, hapus, Escape dan batas peran
- Location: e2e\mobile-dashboard.spec.ts:136:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.fill: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByLabel('Email', { exact: true })

```

# Test source

```ts
  1   | import "dotenv/config";
  2   | import { test, expect, type Page } from "@playwright/test";
  3   | import { hash } from "bcryptjs";
  4   | import { mkdir, writeFile } from "node:fs/promises";
  5   | import path from "node:path";
  6   | import { prisma } from "../lib/db";
  7   | import { productIconKind } from "../lib/product-icon-kind";
  8   | 
  9   | const evidenceDir = path.resolve("anti-slop/fix-006-evidence");
  10  | const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
  11  | const fixtureOwners: number[] = [];
  12  | let adminEmail: string;
  13  | let cashierEmail: string;
  14  | const longProduct = "BerasPremiumDenganNamaPanjangTanpaSpasiUntukMemeriksaTampilanKartuProdukPadaLayarSempit";
  15  | 
  16  | async function login(page: Page, email = "admin@kasir.com", password = "admin123") {
  17  |   const owners = [1, 2, ...fixtureOwners];
  18  |   await page.addInitScript(ids => {
  19  |     for (const id of ids) localStorage.setItem(`kasir-tour-v1-${id}`, "1");
  20  |   }, owners);
  21  |   await page.goto("/login");
> 22  |   await page.getByLabel("Email", { exact: true }).fill(email);
      |                                                   ^ Error: locator.fill: Test timeout of 60000ms exceeded.
  23  |   await page.getByLabel("Password", { exact: true }).fill(password);
  24  |   await page.getByRole("button", { name: "Masuk", exact: true }).click();
  25  |   await page.waitForURL("/", { waitUntil: "domcontentloaded" });
  26  | }
  27  | 
  28  | async function axe(page: Page, name: string) {
  29  |   await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  30  |   const result = await page.evaluate(async () => {
  31  |     const engine = (window as unknown as { axe: { run: (context: string, options: object) => Promise<{ violations: unknown[] }> } }).axe;
  32  |     return engine.run("main", { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  33  |   });
  34  |   await writeFile(path.join(evidenceDir, `${name}-axe.json`), JSON.stringify(result, null, 2));
  35  |   expect(result.violations).toEqual([]);
  36  | }
  37  | 
  38  | test.beforeAll(async ({}, info) => {
  39  |   await mkdir(evidenceDir, { recursive: true });
  40  |   const suffix = `${info.project.name}-${Date.now()}`;
  41  |   adminEmail = `dashboard-admin-${suffix}@example.test`;
  42  |   cashierEmail = `dashboard-cashier-${suffix}@example.test`;
  43  |   const password = await hash("DashboardTest123", 10);
  44  |   const admin = await prisma.user.create({ data: { name: "Uji Dashboard", email: adminEmail, password, role: "ADMIN" } });
  45  |   fixtureOwners.push(admin.id);
  46  |   const cashier = await prisma.user.create({ data: { name: "Kasir Uji", email: cashierEmail, password, role: "KASIR" } });
  47  |   fixtureOwners.push(cashier.id);
  48  |   await prisma.setting.create({ data: { ownerId: admin.id, storeName: "TokoDenganNamaPanjangTanpaSpasiUntukMemeriksaPembungkusanTeksPadaLayarMobileYangSempit" } });
  49  |   const category = await prisma.category.create({ data: { ownerId: admin.id, name: "Sembako" } });
  50  |   const product = await prisma.product.create({ data: { ownerId: admin.id, sku: "DASHBOARD-TEST-1", name: longProduct, categoryId: category.id, sellPrice: 1234567890123, stock: 100 } });
  51  |   const future = await prisma.product.create({ data: { ownerId: admin.id, sku: "DASHBOARD-TEST-2", name: "Produk Bulan Depan", sellPrice: 1000, stock: 100 } });
  52  |   const now = new Date();
  53  |   const total = 1234567890123;
  54  |   await prisma.sale.create({ data: { ownerId: admin.id, invoiceNo: "INV-DASHBOARD-CURRENT", createdAt: now, subtotal: total, total, paid: total, items: { create: { productId: product.id, qty: 1, price: total, cost: 1000 } } } });
  55  |   await prisma.sale.create({ data: { ownerId: admin.id, invoiceNo: "INV-DASHBOARD-NEXT-MONTH", createdAt: new Date(now.getFullYear(), now.getMonth() + 1, 1, 12), subtotal: 99000, total: 99000, paid: 99000, items: { create: { productId: future.id, qty: 99, price: 1000, cost: 100 } } } });
  56  | });
  57  | 
  58  | test.afterAll(async () => {
  59  |   for (const ownerId of fixtureOwners) {
  60  |     // SaleItem restricts product deletion; remove only this fixture's sales first.
  61  |     await prisma.sale.deleteMany({ where: { ownerId } });
  62  |     await prisma.user.delete({ where: { id: ownerId } });
  63  |   }
  64  |   await prisma.$disconnect();
  65  | });
  66  | 
  67  | test("Dashboard mobile: ukuran layar, label, ikon, fokus dan semua tujuan menu", async ({ page }, info) => {
  68  |   test.setTimeout(150_000);
  69  |   const errors: string[] = [];
  70  |   page.on("pageerror", error => errors.push(error.message));
  71  |   await login(page);
  72  |   const metrics = [];
  73  |   for (const width of [320, 360, 393, 430, 768]) {
  74  |     await page.setViewportSize({ width, height: 851 });
  75  |     const grid = page.getByRole("region", { name: "Menu utama", exact: true });
  76  |     await expect(grid).toBeVisible();
  77  |     expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  78  |     const searchBox = (await page.getByRole("searchbox", { name: "Cari menu", exact: true }).boundingBox())!;
  79  |     expect(searchBox.y).toBe(100);
  80  |     for (const label of ["Pengeluaran", "Pengaturan"]) {
  81  |       const el = grid.getByText(label, { exact: true });
  82  |       expect(await el.evaluate(node => node.scrollWidth <= node.clientWidth && getComputedStyle(node).textOverflow !== "ellipsis")).toBe(true);
  83  |     }
  84  |     for (const control of await page.locator("main a, main button").filter({ visible: true }).all()) {
  85  |       const box = (await control.boundingBox())!;
  86  |       expect(box.height).toBeGreaterThanOrEqual(44);
  87  |       expect(box.width).toBeGreaterThanOrEqual(44);
  88  |     }
  89  |     const glyphs = await grid.locator("svg").evaluateAll(nodes => nodes.map(node => {
  90  |       const svg = node as SVGSVGElement;
  91  |       const b = svg.getBBox();
  92  |       return { hidden: svg.getAttribute("aria-hidden"), x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height };
  93  |     }));
  94  |     expect(glyphs).toHaveLength(12);
  95  |     for (const glyph of glyphs) {
  96  |       expect(glyph.hidden).toBe("true");
  97  |       expect(glyph.x).toBeGreaterThanOrEqual(0);
  98  |       expect(glyph.y).toBeGreaterThanOrEqual(0);
  99  |       expect(glyph.right).toBeLessThanOrEqual(24);
  100 |       expect(glyph.bottom).toBeLessThanOrEqual(24);
  101 |     }
  102 |     metrics.push({ width, searchY: searchBox.y, glyphs });
  103 |     await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-${width}.png`) });
  104 |   }
  105 |   await page.setViewportSize({ width: 393, height: 851 });
  106 |   await axe(page, `${info.project.name}-default`);
  107 |   const hero = page.getByRole("region", { name: "Ringkasan penjualan hari ini", exact: true });
  108 |   const pos = hero.getByRole("link", { name: "Buka Kasir", exact: true });
  109 |   await page.keyboard.press("Tab");
  110 |   await pos.focus();
  111 |   expect(await pos.evaluate(node => getComputedStyle(node).boxShadow)).not.toBe("none");
  112 |   await pos.press("Enter");
  113 |   await expect(page).toHaveURL(/\/pos$/);
  114 |   await page.goto("/");
  115 |   const routes = ["/", "/products", "/categories", "/units", "/suppliers", "/customers", "/purchases", "/sales", "/expenses", "/notifications", "/users", "/settings"];
  116 |   for (const route of routes) {
  117 |     await page.getByRole("region", { name: "Menu utama", exact: true }).locator(`a[href="${route}"]`).click();
  118 |     await expect(page).toHaveURL(new RegExp(`${route === "/" ? "/" : route}$`));
  119 |     await page.goto("/");
  120 |   }
  121 |   for (const route of ["/reports", "/stock"]) {
  122 |     await page.getByRole("region", { name: "Ringkasan penjualan hari ini", exact: true }).locator(`a[href="${route}"]`).first().click();
```