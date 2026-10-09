import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const evidenceDir = path.resolve("anti-slop/sales-reference-evidence");

async function login(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("kasir-tour-v1-1", "1");
    localStorage.removeItem("kasir-per-page");
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@kasir.com");
  await page.getByLabel("Password", { exact: true }).fill("admin123");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("/", { waitUntil: "domcontentloaded" });
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test("referensi: ringkasan, filter terlihat, detail, responsive dan aksesibilitas", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await mkdir(evidenceDir, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await login(page);
  await page.goto("/sales?per=10");
  for (const width of [320, 393, 640, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await expectNoOverflow(page);
    if (width < 1024) {
      const list = page.getByRole("list", { name: "Daftar transaksi", exact: true });
      await expect(list).toBeVisible();
      await expect(list.getByRole("link").first()).toContainText("INV-");
      await expect(page.getByRole("region", { name: "Ringkasan transaksi" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Riwayat Transaksi", exact: true })).toBeVisible();
      for (const name of ["Cari Transaksi", "Metode Pembayaran", "Dari Tanggal", "Sampai Tanggal"]) await expect(page.getByLabel(name, { exact: true })).toBeVisible();
      const link = list.getByRole("link").first();
      const rect = (await link.boundingBox())!;
      expect(rect.height).toBeGreaterThanOrEqual(44);
      for (const child of await link.locator("span, time").all()) {
        const childRect = (await child.boundingBox())!;
        expect(childRect.x).toBeGreaterThanOrEqual(rect.x);
        expect(childRect.x + childRect.width).toBeLessThanOrEqual(rect.x + rect.width + 1);
        expect(await child.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      }
      for (const control of await page.locator("main button, main input, main select").filter({ visible: true }).all()) {
        const size = (await control.boundingBox())!;
        expect(size.height).toBeGreaterThanOrEqual(44);
        expect(size.width).toBeGreaterThanOrEqual(44);
      }
    } else {
      await expect(page.getByRole("table")).toBeVisible();
      for (const label of ["Metode Pembayaran", "Dari Tanggal", "Sampai Tanggal"]) {
        await expect(page.getByLabel(label, { exact: true })).toBeVisible();
      }
    }
    await page.screenshot({ path: path.join(evidenceDir, `${testInfo.project.name}-${width}.png`) });
  }
  await page.setViewportSize({ width: 393, height: 850 });
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const axe = await page.evaluate(async () => {
    const engine = (window as unknown as { axe: { run: (context: string, options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return engine.run("main", { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  });
  await writeFile(path.join(evidenceDir, `${testInfo.project.name}-axe-list.json`), JSON.stringify(axe, null, 2));
  expect(axe.violations).toEqual([]);
  const link = page.getByRole("list", { name: "Daftar transaksi" }).getByRole("link").first();
  const href = await link.getAttribute("href");
  await page.getByRole("link", { name: "Urutkan berdasarkan Tanggal & Waktu, terbaru lebih dulu" }).focus();
  await page.keyboard.press("Tab");
  await expect(link).toBeFocused();
  expect(await link.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe("none");
  await link.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  expect(errors).toEqual([]);
});

test("referensi: filter langsung berlaku, validasi tanggal, reset dan hasil kosong", async ({ page }, testInfo) => {
  await login(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/sales?per=10&page=2&q=INV");
  await page.getByLabel("Metode Pembayaran").selectOption("CASH");
  await expect(page).toHaveURL(/method=CASH/);
  expect(new URL(page.url()).searchParams.get("page")).toBe("1");
  await page.getByLabel("Dari Tanggal").fill("2026-10-09");
  await expect(page).toHaveURL(/from=2026-10-09/);
  await page.getByLabel("Sampai Tanggal").fill("2026-10-01");
  await expect(page.locator("main").getByRole("alert")).toContainText("Tanggal akhir");
  await expect(page.getByLabel("Sampai Tanggal")).toHaveAttribute("aria-invalid", "true");
  await expect(page).not.toHaveURL(/to=2026-10-01/);
  await expectNoOverflow(page);
  const filter = page.getByRole("region", { name: "Riwayat Transaksi" });
  const geometry = await filter.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.client);
  await page.getByLabel("Dari Tanggal").fill("2026-01-01");
  await expect(page).toHaveURL(/from=2026-01-01/);
  await expect(page).toHaveURL(/to=2026-10-01/);
  await page.getByLabel("Sampai Tanggal").fill("2026-12-31");
  await expect(page).toHaveURL(/to=2026-12-31/);
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const axe = await page.evaluate(async () => {
    const engine = (window as unknown as { axe: { run: (context: string, options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return engine.run("main", { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  });
  await writeFile(path.join(evidenceDir, `${testInfo.project.name}-axe-filter.json`), JSON.stringify(axe, null, 2));
  expect(axe.violations).toEqual([]);
  await page.screenshot({ path: path.join(evidenceDir, `${testInfo.project.name}-filter-320.png`), fullPage: true });
  const params = new URL(page.url()).searchParams;
  expect(params.get("q")).toBe("INV");
  expect(params.get("per")).toBe("10");
  expect(params.get("page")).toBe("1");
  expect(params.get("from")).toBe("2026-01-01");
  expect(params.get("to")).toBe("2026-12-31");
  const list = page.getByRole("list", { name: "Daftar transaksi" });
  await expect(list.getByRole("link").first()).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Metode Pembayaran")).toHaveValue("CASH");
  await expect(page.getByLabel("Dari Tanggal")).toHaveValue("2026-01-01");
  await page.getByRole("button", { name: "Reset filter", exact: true }).click();
  await expect(page).not.toHaveURL(/method=|from=|to=|q=/);
  await expect(page.getByLabel("Cari Transaksi")).toHaveValue("");
  await page.getByLabel("Cari Transaksi").fill("tidak-ada-invoice-xyz");
  await expect(page.getByText("Tidak ada transaksi yang cocok", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ringkasan transaksi" })).toContainText("Rp 0");
  await page.screenshot({ path: path.join(evidenceDir, `${testInfo.project.name}-empty-320.png`), fullPage: true });
  await page.getByLabel("Cari Transaksi").fill("");
  await expect(list.getByRole("link").first()).toBeVisible();
  await page.goto("/sales?from=invalid&to=invalid");
  await expect(list.getByRole("link").first()).toBeVisible();
});

test("referensi: pencarian memberi status loading dan field terjangkau saat layar pendek", async ({ page }, testInfo) => {
  await login(page);
  await page.setViewportSize({ width: 393, height: 850 });
  await page.goto("/sales?per=10");
  await page.route("**/sales?**", async route => {
    if (route.request().headers().rsc === "1") await new Promise(resolve => setTimeout(resolve, 1_000));
    await route.continue();
  });
  await page.getByLabel("Cari Transaksi").fill("INV");
  await expect(page.getByRole("status").filter({ hasText: "Memuat transaksi" })).toBeVisible();
  await expect(page).toHaveURL(/q=INV/);
  await expect(page.getByRole("status").filter({ hasText: "Memuat transaksi" })).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 420 });
  const date = page.getByLabel("Sampai Tanggal");
  await date.scrollIntoViewIfNeeded();
  await date.fill("2026-12-31");
  const bounds = (await date.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  const nav = (await page.getByRole("navigation", { name: "Menu utama" }).boundingBox())!;
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(nav.y);
  await expectNoOverflow(page);
  await page.screenshot({ path: path.join(evidenceDir, `${testInfo.project.name}-filter-short.png`) });
});

test("transaksi: pagination menyimpan filter, ukuran halaman dan riwayat", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 393, height: 850 });
  await page.goto("/sales?per=10&q=INV&from=2026-01-01");
  const list = page.getByRole("list", { name: "Daftar transaksi" });
  const firstHref = await list.getByRole("link").first().getAttribute("href");
  const previous = page.getByRole("link", { name: "Halaman sebelumnya", exact: true });
  await expect(previous).toHaveAttribute("aria-disabled", "true");
  expect(await previous.evaluate(el => getComputedStyle(el).opacity)).toBe("0.4");
  await page.getByRole("link", { name: "Halaman berikutnya", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(list.getByRole("link").first()).not.toHaveAttribute("href", firstHref!);
  expect(new URL(page.url()).searchParams.get("q")).toBe("INV");
  expect(new URL(page.url()).searchParams.get("from")).toBe("2026-01-01");
  await page.goBack();
  await expect(list.getByRole("link").first()).toHaveAttribute("href", firstHref!);
  await page.getByRole("combobox", { name: "Baris per halaman" }).selectOption("20");
  await expect(page).toHaveURL(/per=20/);
  expect(new URL(page.url()).searchParams.get("page")).toBe("1");
  expect(new URL(page.url()).searchParams.get("q")).toBe("INV");
  await page.getByRole("link", { name: "Halaman berikutnya", exact: true }).click();
  await page.getByRole("link", { name: "Halaman sebelumnya", exact: true }).click();
  await expect(page).toHaveURL(/page=1/);
  await page.getByRole("combobox", { name: "Baris per halaman" }).selectOption("100");
  await expect(page).toHaveURL(/per=100/);
  await expect(page.getByRole("link", { name: "Halaman berikutnya", exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Baris per halaman" }).scrollIntoViewIfNeeded();
  const select = (await page.getByRole("combobox", { name: "Baris per halaman" }).boundingBox())!;
  const nav = (await page.getByRole("navigation", { name: "Menu utama" }).boundingBox())!;
  expect(select.y + select.height).toBeLessThanOrEqual(nav.y);
});

test("transaksi: filter desktop langsung bekerja dan bantuan sesuai layout", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sales?per=10");
  await page.getByLabel("Cari Transaksi").fill("INV");
  await page.getByLabel("Metode Pembayaran").selectOption("QRIS");
  await expect(page).toHaveURL(/method=QRIS/);
  await expect(page).toHaveURL(/q=INV/);
  await page.getByLabel("Dari Tanggal").fill("2026-01-01");
  await expect(page).toHaveURL(/from=2026-01-01/);
  await page.getByRole("button", { name: "Reset filter", exact: true }).click();
  await expect(page).not.toHaveURL(/method=|from=|q=/);
  await expect(page.getByLabel("Cari Transaksi")).toHaveValue("");
  await page.setViewportSize({ width: 393, height: 850 });
  await page.getByRole("button", { name: "Bantuan, panduan aplikasi", exact: true }).filter({ visible: true }).click();
  const guide = page.getByRole("dialog");
  await guide.getByRole("button", { name: "Transaksi", exact: true }).click();
  await expect(guide).toContainText("Total Transaksi menghitung seluruh hasil filter");
  await page.keyboard.press("Escape");
});

test("referensi: total seluruh hasil terpisah dari total halaman dan pengurutan mempertahankan filter", async ({ page }, testInfo) => {
  await login(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sales?per=100");
  await expect(page.getByRole("table").locator("tbody tr").first()).toBeVisible();
  const rows = await page.getByRole("table").locator("tbody tr").evaluateAll(elements => elements.map(el => {
    const cells = el.querySelectorAll("td");
    return { invoice: cells[0].textContent?.trim() ?? "", method: cells[3].textContent?.trim() ?? "", total: Number(cells[5].textContent?.replace(/\D/g, "")) };
  }));
  const money = (value: string) => Number(value.replace(/\D/g, ""));
  const sum = rows.reduce((total, row) => total + row.total, 0);
  await page.setViewportSize({ width: 393, height: 850 });
  const summary = page.getByRole("region", { name: "Ringkasan transaksi" });
  const total = summary.locator("p").filter({ hasText: /^Rp/ });
  expect(money((await total.textContent())!)).toBe(sum);
  await page.getByRole("combobox", { name: "Baris per halaman" }).selectOption("10");
  await expect(page).toHaveURL(/per=10/);
  expect(money((await total.textContent())!)).toBe(sum);
  const list = page.getByRole("list", { name: "Daftar transaksi" });
  await expect(list.getByRole("link")).toHaveCount(10);
  const visibleInvoices = await list.locator("time").evaluateAll(elements => elements.map(el => el.previousElementSibling?.textContent ?? ""));
  const pageSum = rows.filter(row => visibleInvoices.includes(row.invoice)).reduce((value, row) => value + row.total, 0);
  expect(money((await page.getByText("Total Halaman:", { exact: false }).filter({ visible: true }).textContent())!)).toBe(pageSum);
  expect(pageSum).toBeLessThan(sum);
  await page.getByRole("link", { name: "Halaman berikutnya", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  expect(money((await total.textContent())!)).toBe(sum);
  await page.getByRole("link", { name: "Urutkan berdasarkan Tanggal & Waktu, terbaru lebih dulu" }).click();
  await expect(page).toHaveURL(/sort=date/);
  await expect(page.getByRole("link", { name: "Urutkan berdasarkan Tanggal & Waktu, terbaru lebih dulu" })).toHaveAttribute("aria-current", "page");
  expect(new URL(page.url()).searchParams.get("page")).toBe("1");
  const dates = await list.locator("time").evaluateAll(elements => elements.map(el => el.getAttribute("datetime")!));
  expect(dates).toEqual([...dates].sort().reverse());
  await page.getByLabel("Metode Pembayaran").selectOption("CASH");
  await expect(page).toHaveURL(/method=CASH/);
  expect(new URL(page.url()).searchParams.get("sort")).toBe("date");
  await expect.poll(async () => money((await total.textContent())!)).toBe(rows.filter(row => row.method === "Tunai").reduce((value, row) => value + row.total, 0));
  const byInvoice = page.getByRole("link", { name: "Urutkan berdasarkan ID Transaksi, terbaru lebih dulu" });
  await byInvoice.focus();
  await byInvoice.press("Enter");
  await expect(page).toHaveURL(/sort=invoice/);
  await expect(byInvoice).toHaveAttribute("aria-current", "page");
  expect(new URL(page.url()).searchParams.get("method")).toBe("CASH");
  const invoices = await list.locator("time").evaluateAll(elements => elements.map(el => el.previousElementSibling?.textContent ?? ""));
  expect(invoices).toEqual([...invoices].sort().reverse());
  await page.getByRole("combobox", { name: "Baris per halaman" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(evidenceDir, `${testInfo.project.name}-footer-393.png`) });
});
