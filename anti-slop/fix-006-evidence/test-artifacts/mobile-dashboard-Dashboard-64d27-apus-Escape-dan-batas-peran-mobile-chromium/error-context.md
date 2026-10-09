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
  17  |   await page.context().clearCookies();
  18  |   const owners = [1, 2, ...fixtureOwners];
  19  |   await page.addInitScript(ids => {
  20  |     for (const id of ids) localStorage.setItem(`kasir-tour-v1-${id}`, "1");
  21  |   }, owners);
> 22  |   await page.goto("/login");
      |                                                   ^ Error: locator.fill: Test timeout of 60000ms exceeded.
  23  |   await page.getByLabel("Email", { exact: true }).fill(email);
  24  |   await page.getByLabel("Password", { exact: true }).fill(password);
  25  |   await page.getByRole("button", { name: "Masuk", exact: true }).click();
  26  |   await page.waitForURL("/", { waitUntil: "domcontentloaded" });
  27  | }
  28  | 
  29  | async function axe(page: Page, name: string) {
  30  |   await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  31  |   const result = await page.evaluate(async () => {
  32  |     const engine = (window as unknown as { axe: { run: (context: string, options: object) => Promise<{ violations: unknown[] }> } }).axe;
  33  |     return engine.run("main", { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  34  |   });
  35  |   await writeFile(path.join(evidenceDir, `${name}-axe.json`), JSON.stringify(result, null, 2));
  36  |   expect(result.violations).toEqual([]);
  37  | }
  38  | 
  39  | test.beforeAll(async ({}, info) => {
  40  |   await mkdir(evidenceDir, { recursive: true });
  41  |   const suffix = `${info.project.name}-${Date.now()}`;
  42  |   adminEmail = `dashboard-admin-${suffix}@example.test`;
  43  |   cashierEmail = `dashboard-cashier-${suffix}@example.test`;
  44  |   const password = await hash("DashboardTest123", 10);
  45  |   const admin = await prisma.user.create({ data: { name: "Uji Dashboard", email: adminEmail, password, role: "ADMIN" } });
  46  |   fixtureOwners.push(admin.id);
  47  |   const cashier = await prisma.user.create({ data: { name: "Kasir Uji", email: cashierEmail, password, role: "KASIR" } });
  48  |   fixtureOwners.push(cashier.id);
  49  |   await prisma.setting.create({ data: { ownerId: admin.id, storeName: "TokoDenganNamaPanjangTanpaSpasiUntukMemeriksaPembungkusanTeksPadaLayarMobileYangSempit" } });
  50  |   const category = await prisma.category.create({ data: { ownerId: admin.id, name: "Sembako" } });
  51  |   const product = await prisma.product.create({ data: { ownerId: admin.id, sku: "DASHBOARD-TEST-1", name: longProduct, categoryId: category.id, sellPrice: 1234567890123, stock: 100 } });
  52  |   const future = await prisma.product.create({ data: { ownerId: admin.id, sku: "DASHBOARD-TEST-2", name: "Produk Bulan Depan", sellPrice: 1000, stock: 100 } });
  53  |   const now = new Date();
  54  |   const total = 1234567890123;
  55  |   await prisma.sale.create({ data: { ownerId: admin.id, invoiceNo: "INV-DASHBOARD-CURRENT", createdAt: now, subtotal: total, total, paid: total, items: { create: { productId: product.id, qty: 1, price: total, cost: 1000 } } } });
  56  |   await prisma.sale.create({ data: { ownerId: admin.id, invoiceNo: "INV-DASHBOARD-NEXT-MONTH", createdAt: new Date(now.getFullYear(), now.getMonth() + 1, 1, 12), subtotal: 99000, total: 99000, paid: 99000, items: { create: { productId: future.id, qty: 99, price: 1000, cost: 100 } } } });
  57  | });
  58  | 
  59  | test.afterAll(async () => {
  60  |   for (const ownerId of fixtureOwners) {
  61  |     // SaleItem restricts product deletion; remove only this fixture's sales first.
  62  |     await prisma.sale.deleteMany({ where: { ownerId } });
  63  |     await prisma.user.delete({ where: { id: ownerId } });
  64  |   }
  65  |   await prisma.$disconnect();
  66  | });
  67  | 
  68  | test("Dashboard mobile: ukuran layar, label, ikon, fokus dan semua tujuan menu", async ({ page }, info) => {
  69  |   test.setTimeout(150_000);
  70  |   const errors: string[] = [];
  71  |   page.on("pageerror", error => errors.push(error.message));
  72  |   await login(page);
  73  |   const metrics = [];
  74  |   for (const width of [320, 360, 393, 430, 768]) {
  75  |     await page.setViewportSize({ width, height: 851 });
  76  |     const grid = page.getByRole("region", { name: "Menu utama", exact: true });
  77  |     await expect(grid).toBeVisible();
  78  |     expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  79  |     const searchBox = (await page.getByRole("searchbox", { name: "Cari menu", exact: true }).boundingBox())!;
  80  |     expect(searchBox.y).toBe(100);
  81  |     for (const label of ["Pengeluaran", "Pengaturan"]) {
  82  |       const el = grid.getByText(label, { exact: true });
  83  |       expect(await el.evaluate(node => node.scrollWidth <= node.clientWidth && getComputedStyle(node).textOverflow !== "ellipsis")).toBe(true);
  84  |     }
  85  |     for (const control of await page.locator("main a, main button").filter({ visible: true }).all()) {
  86  |       const box = (await control.boundingBox())!;
  87  |       expect(box.height).toBeGreaterThanOrEqual(44);
  88  |       expect(box.width).toBeGreaterThanOrEqual(44);
  89  |     }
  90  |     const glyphs = await grid.locator("svg").evaluateAll(nodes => nodes.map(node => {
  91  |       const svg = node as SVGSVGElement;
  92  |       const b = svg.getBBox();
  93  |       return { hidden: svg.getAttribute("aria-hidden"), x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height };
  94  |     }));
  95  |     expect(glyphs).toHaveLength(12);
  96  |     for (const glyph of glyphs) {
  97  |       expect(glyph.hidden).toBe("true");
  98  |       expect(glyph.x).toBeGreaterThanOrEqual(0);
  99  |       expect(glyph.y).toBeGreaterThanOrEqual(0);
  100 |       expect(glyph.right).toBeLessThanOrEqual(24);
  101 |       expect(glyph.bottom).toBeLessThanOrEqual(24);
  102 |     }
  103 |     metrics.push({ width, searchY: searchBox.y, glyphs });
  104 |     await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-${width}.png`) });
  105 |   }
  106 |   await page.setViewportSize({ width: 393, height: 851 });
  107 |   await axe(page, `${info.project.name}-default`);
  108 |   const hero = page.getByRole("region", { name: "Ringkasan penjualan hari ini", exact: true });
  109 |   const pos = hero.getByRole("link", { name: "Buka Kasir", exact: true });
  110 |   await page.keyboard.press("Tab");
  111 |   await pos.focus();
  112 |   expect(await pos.evaluate(node => getComputedStyle(node).boxShadow)).not.toBe("none");
  113 |   await pos.press("Enter");
  114 |   await expect(page).toHaveURL(/\/pos$/);
  115 |   await page.goto("/");
  116 |   const routes = ["/", "/products", "/categories", "/units", "/suppliers", "/customers", "/purchases", "/sales", "/expenses", "/notifications", "/users", "/settings"];
  117 |   for (const route of routes) {
  118 |     await page.getByRole("region", { name: "Menu utama", exact: true }).locator(`a[href="${route}"]`).click();
  119 |     await expect(page).toHaveURL(new RegExp(`${route === "/" ? "/" : route}$`));
  120 |     await page.goto("/");
  121 |   }
  122 |   for (const route of ["/reports", "/stock"]) {
```