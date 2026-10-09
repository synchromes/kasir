import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, account = "admin") {
  await page.addInitScript(() => {
    localStorage.setItem("kasir-tour-v1-1", "1");
    localStorage.setItem("kasir-tour-v1-2", "1");
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`${account}@kasir.com`);
  await page.getByLabel("Password", { exact: true }).fill(`${account}123`);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("/", { waitUntil: "domcontentloaded" });
}

async function addProduct(page: Page) {
  await page.goto("/pos");
  await page.getByRole("button", { name: "Tambah Coca Cola 390ml", exact: true }).first().click();
  const group = page.getByRole("group", { name: "Jumlah Coca Cola 390ml", exact: true }).first();
  const trigger = group.locator("[data-quantity-trigger]");
  await trigger.click();
  await group.getByRole("button", { name: "Tambah Coca Cola 390ml", exact: true }).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await group.getByRole("button", { name: "Kurangi Coca Cola 390ml", exact: true }).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.goto("/pos/rangkuman");
  await expect(page.getByRole("button", { name: /Ubah jumlah Coca Cola/ })).toBeVisible();
}

test("004: halaman merespons 200 dan memiliki judul yang berbeda", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await login(page);
  const routes = ["/", "/products", "/categories", "/units", "/suppliers", "/customers", "/purchases", "/stock", "/sales", "/expenses", "/reports", "/notifications", "/users", "/settings", "/pos", "/pos/rangkuman", "/pos/confirm"];
  const titles: string[] = [];
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    titles.push(await page.title());
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
  }
  expect(new Set(titles).size).toBe(routes.length);
  expect(errors).toEqual([]);
});

test("004: stepper rincian otomatis tutup sesudah aksi, Escape, keluar fokus dan klik luar", async ({ page }) => {
  await login(page);
  await addProduct(page);
  const group = page.getByRole("group", { name: "Jumlah Coca Cola 390ml", exact: true });
  const trigger = group.locator("[data-quantity-trigger]");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await group.getByRole("button", { name: "Tambah Coca Cola 390ml", exact: true }).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toContainText("2");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await group.getByRole("button", { name: "Kurangi Coca Cola 390ml", exact: true }).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toContainText("1");
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("heading", { name: "Rangkuman Pesanan" }).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await page.getByRole("button", { name: "Pas", exact: true }).focus();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.reload();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await group.getByRole("button", { name: "Hapus Coca Cola 390ml", exact: true }).click();
  await expect(page.getByText("Keranjang masih kosong", { exact: true })).toBeVisible();
});

test("004: key checkout tetap sama setelah refresh dan pada konfirmasi QRIS", async ({ page }) => {
  await login(page);
  await addProduct(page);
  await page.getByRole("button", { name: "Pas", exact: true }).click();
  await expect(page.getByLabel("Dibayar", { exact: true })).toHaveValue("5.500");
  const keys: string[] = [];
  await page.route("**/pos/**", route => {
    if (route.request().method() !== "POST") return route.continue();
    const key = route.request().postData()?.match(/"saleKey":"([^"]+)"/)?.[1];
    if (key) keys.push(key);
    return route.abort("failed");
  });
  await page.getByRole("button", { name: /^Bayar / }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Gagal memproses pembayaran" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Bayar / }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Gagal memproses pembayaran" })).toBeVisible();
  expect(keys.length).toBe(2);
  expect(keys[0]).toBe(keys[1]);
  await page.getByRole("button", { name: "QRIS", exact: true }).click();
  await page.getByRole("button", { name: "Lanjutkan Pembayaran", exact: true }).click();
  await page.waitForURL("/pos/confirm");
  const pendingKey = await page.evaluate(() => JSON.parse(sessionStorage.getItem("kasir-pending-payment:1")!).saleKey);
  const confirm = page.getByRole("button", { name: /Konfirmasi|Sudah/ }).last();
  await confirm.click();
  await expect(page.getByRole("alert").filter({ hasText: "Terjadi kesalahan" })).toBeVisible();
  await page.reload();
  await confirm.click();
  await expect(page.getByRole("alert").filter({ hasText: "Terjadi kesalahan" })).toBeVisible();
  expect(keys.slice(-2)).toEqual([pendingKey, pendingKey]);
});

test("004: form pulih dari POST gagal tanpa menyimpan data", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  await page.route("**/*", route => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  for (const route of ["/categories", "/units", "/suppliers", "/customers", "/expenses", "/purchases"]) {
    await page.goto(route);
    await page.getByRole("button", { name: /^\+ (Tambah|Catat Pengeluaran|Pembelian Baru)/ }).click();
    const dialog = page.getByRole("dialog");
    if (route === "/expenses") {
      await dialog.getByLabel("Jumlah (Rp) *", { exact: true }).fill("1234");
      await dialog.getByLabel("Catatan *", { exact: true }).fill("Uji koneksi terputus");
    } else if (route === "/purchases") {
      await dialog.getByLabel("Produk 1", { exact: true }).click();
      await page.getByRole("option", { name: /Coca Cola/ }).click();
    } else {
      for (const input of await dialog.locator("input[required]").all()) {
        await input.fill(await input.getAttribute("type") === "email" ? "audit@example.test" : "Uji koneksi terputus");
      }
    }
    const save = dialog.getByRole("button", { name: route === "/purchases" ? "Simpan Pembelian" : "Simpan", exact: true });
    await save.click();
    await expect(dialog.getByRole("alert"), route).toContainText("Gagal menyimpan");
    await expect(save, route).toBeEnabled();
    if (route !== "/purchases") await expect(dialog.locator("input[required]").last()).not.toHaveValue("");
    await page.keyboard.press("Escape");
  }
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@kasir.com");
  await page.getByLabel("Password", { exact: true }).fill("admin123");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Masuk", exact: true })).toBeEnabled();
});

test("004: pembelian 320px, label filter, fokus hapus dan pelanggan opsional", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/purchases");
  await page.getByRole("button", { name: "+ Pembelian Baru", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Produk 1", { exact: true }).click();
  await page.getByRole("option", { name: /Coca Cola/ }).click();
  const geometry = await dialog.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, right: el.getBoundingClientRect().right }));
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.width);
  for (const el of await dialog.locator("input, button[aria-label^='Hapus']").all()) {
    expect((await el.boundingBox())!.x + (await el.boundingBox())!.width).toBeLessThanOrEqual(geometry.right);
  }
  await page.keyboard.press("Escape");
  await page.goto("/products");
  const remove = page.getByRole("button", { name: "Hapus Coca Cola 390ml", exact: true });
  await remove.focus();
  await remove.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(remove).toBeFocused();
  expect((await remove.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  await page.goto("/sales");
  await expect(page.getByLabel("Cari Transaksi", { exact: true })).toBeVisible();
  for (const name of ["Metode Pembayaran", "Dari Tanggal", "Sampai Tanggal"]) await expect(page.getByLabel(name, { exact: true })).toBeVisible();
  await page.goto("/reports");
  const table = page.getByRole("region", { name: /Transaksi terakhir/ });
  await table.focus();
  await expect(table).toBeFocused();
  await addProduct(page);
  const customer = page.getByRole("combobox", { name: "Pelanggan pesanan", exact: true });
  await customer.click();
  await page.getByRole("option", { name: /Budi Santoso/ }).click();
  await page.getByRole("button", { name: "Pakai poin", exact: true }).click();
  await customer.click();
  await page.getByRole("option", { name: "Tanpa pelanggan", exact: true }).click();
  await expect(customer).toContainText("Tanpa pelanggan");
  await expect(page.getByRole("button", { name: /^Pakai poin/ })).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("kasir-cart:1")!));
  expect(saved.customerId).toBe("");
  expect(saved.usePoints).toBe(false);
});

test("004: keluar akun membersihkan keranjang dan akun berikutnya mendapat empty state", async ({ page }) => {
  await login(page);
  await addProduct(page);
  const prefetched = await page.request.get("/settings", { headers: { "next-router-prefetch": "1", purpose: "prefetch" } });
  expect(prefetched.status()).toBe(200);
  expect(prefetched.headers()["set-cookie"] || "").not.toMatch(/authjs\.session-token(?:\.\d+)?=/);
  await page.getByRole("button", { name: "Keluar", exact: true }).filter({ visible: true }).click();
  await page.waitForURL("/login");
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith("kasir-cart") || key.startsWith("kasir-pending-payment")))).toEqual([]);
  await login(page, "kasir");
  await page.goto("/pos/rangkuman");
  await expect(page.getByText("Keranjang masih kosong", { exact: true })).toBeVisible();
  await expect(page.getByText("Coca Cola 390ml", { exact: true })).toHaveCount(0);
  await page.goto("/customers");
  await expect(page.getByText("Belum ada pelanggan. Tambahkan pelanggan pertama.", { exact: true })).toBeVisible();
  await page.goto("/expenses");
  await expect(page.getByText("Belum ada pengeluaran. Catat biaya operasional pertama.", { exact: true })).toBeVisible();
  await page.goto("/users");
  await expect(page).not.toHaveURL(/\/users$/);
});

test("004: storage gagal mencegah pembayaran dan struk lama tidak menghapus pesanan baru", async ({ page }) => {
  await login(page);
  await addProduct(page);
  const before = await page.evaluate(() => JSON.parse(sessionStorage.getItem("kasir-cart:1")!).saleKey);
  await page.goto("/pos/success/38");
  await page.goto("/pos/rangkuman");
  await expect(page.getByRole("button", { name: /Ubah jumlah Coca Cola/ })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("kasir-cart:1")!).saleKey)).toBe(before);
  await page.getByRole("button", { name: "Pas", exact: true }).click();
  let posts = 0;
  await page.route("**/pos/**", route => {
    if (route.request().method() !== "POST") return route.continue();
    posts++;
    return route.abort("failed");
  });
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
  });
  await page.getByRole("button", { name: /^Bayar / }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Pesanan tidak dapat disimpan" })).toBeVisible();
  expect(posts).toBe(0);
  await expect(page.getByRole("button", { name: /^Bayar / })).toBeEnabled();
  await page.getByRole("button", { name: "QRIS", exact: true }).click();
  await page.getByRole("button", { name: "Lanjutkan Pembayaran", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Pesanan tidak dapat disimpan" })).toBeVisible();
  await expect(page).toHaveURL(/\/pos\/rangkuman$/);
});
