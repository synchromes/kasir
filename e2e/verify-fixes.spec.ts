import { test, expect, type Page } from "@playwright/test";

// Verifikasi perbaikan audit (batch 2): validasi server, clamp, idempotensi,
// keamanan role, dan sanitasi parameter API. Dijalankan mandiri — tanpa
// walkthrough onboarding (dilewati dengan tombol "Lewati").
const ADMIN = { email: "admin@kasir.com", password: "admin123" };

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("/");
  const skip = page.getByRole("dialog").getByRole("button", { name: "Lewati" });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

test.describe("Verifikasi perbaikan audit", () => {
  test("POS: checkout tunai tetap berfungsi end-to-end", async ({ page }) => {
    await login(page);
    await page.goto("/pos");
    await page.getByRole("button", { name: /Beras Premium 5kg/ }).click();
    await page.getByLabel("Dibayar").fill("70000");
    await page.getByRole("button", { name: /Bayar/ }).click();
    await page.waitForURL(/\/pos\/success\//);
    await expect(page.getByText("Bukti Pembayaran (Tunai)")).toBeVisible();
  });

  test("users: tanpa tombol hapus untuk akun sendiri; role Admin hanya untuk akun sendiri", async ({ page }) => {
    await login(page);
    await page.goto("/users");

    // Baris akun sendiri (admin@kasir.com) hanya punya tombol Edit — tanpa hapus.
    const myRow = page.getByRole("row").filter({ hasText: "admin@kasir.com" });
    await expect(myRow.getByRole("button")).toHaveCount(1);

    // Dialog tambah pengguna: pilihan role Admin disabled (akun toko = KASIR).
    await page.getByRole("button", { name: "+ Tambah Pengguna" }).click();
    await page.getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "Admin" })).toBeDisabled();
    await expect(page.getByRole("option", { name: "Kasir" })).toBeEnabled();
    await page.keyboard.press("Escape");
  });

  test("settings: pajak di atas 100% dipotong menjadi 100", async ({ page }) => {
    await login(page);
    await page.goto("/settings");
    const tax = page.getByLabel("Pajak (%)");
    await tax.fill("150");
    await page.getByRole("button", { name: "Simpan Pengaturan" }).click();
    await expect(tax).toHaveValue("100", { timeout: 20_000 });
    await page.reload();
    await expect(page.getByLabel("Pajak (%)")).toHaveValue("100");
  });

  test("produk: harga jual negatif diklamp ke 0 oleh server", async ({ page }) => {
    await login(page);
    await page.goto("/products");
    await page.getByRole("button", { name: "+ Produk Baru" }).click();
    await page.getByLabel("SKU *").fill("AUDIT-NEG-1");
    await page.getByLabel("Nama Produk *").fill("Produk Uji Negatif");
    await page.getByLabel("Harga Jual *").fill("-5000");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    const row = page.getByRole("row").filter({ hasText: "Produk Uji Negatif" });
    await expect(row).toContainText("Rp 0");
  });

  test("stok: penyesuaian melewati 0 ditolak dengan pesan jelas", async ({ page }) => {
    await login(page);
    // Produk dengan stok awal 0.
    await page.goto("/products");
    await page.getByRole("button", { name: "+ Produk Baru" }).click();
    await page.getByLabel("SKU *").fill("AUDIT-STOK-0");
    await page.getByLabel("Nama Produk *").fill("Produk Stok Nol");
    await page.getByLabel("Harga Jual *").fill("10000");
    await page.getByLabel("Stok Awal").fill("0");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.goto("/stock");
    const row = page.getByRole("row").filter({ hasText: "Produk Stok Nol" });
    await row.getByRole("button", { name: "Sesuaikan" }).click();
    await page.getByLabel("Perubahan (+/-)").fill("-5");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Stok sudah 0. Tidak bisa dikurangi lagi")).toBeVisible();
  });

  test("api: parameter rusak tidak lagi memicu 500", async ({ page }) => {
    await login(page);
    const r1 = await page.request.get("/api/products/search?take=abc");
    expect(r1.status()).toBe(200);
    const r2 = await page.request.post("/api/notifications", { data: { action: "read", id: "abc" } });
    expect(r2.status()).toBe(400);
  });
});
