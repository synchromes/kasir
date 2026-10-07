import { test, expect, type Page } from "@playwright/test";

// Akun demo dari prisma/seed.ts.
const ADMIN = { email: "admin@kasir.com", password: "admin123" };
const KASIR = { email: "kasir@kasir.com", password: "kasir123" };

async function login(page: Page, creds = ADMIN) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("/");
}

// Dialog walkthrough (aria-label = judul langkah) atau dialog Panduan (Radix).
const tourDialog = (page: Page) =>
  page.getByRole("dialog", { name: /Mulai dari Kasir|Kelola Produk & Inventaris|Atur Toko Anda|Panduan Pengguna \(Admin\)/ });

// Kotak sorotan: div absolut dengan box-shadow raksasa (backdrop 9999px).
async function spotlightBox(page: Page) {
  return page.evaluate(() => {
    const el = Array.from(document.querySelectorAll("div")).find((d) => (d.style.boxShadow || "").includes("9999px"));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
}

// Elemen [data-tour] yang TERLIHAT (sidebar desktop / tab & grid mobile).
async function visibleTargetBox(page: Page, tour: string) {
  return page.evaluate((t) => {
    for (const el of Array.from(document.querySelectorAll(`[data-tour="${t}"]`))) {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (r.width > 4 && r.height > 4 && st.display !== "none" && st.visibility !== "hidden") {
        return { x: r.x, y: r.y, width: r.width, height: r.height, tag: el.tagName };
      }
    }
    return null;
  }, tour);
}

// Sorotan harus mengelilingi elemen target yang terlihat (pusatnya di dalam).
// Dipoll sampai stabil — spotlight sempat berada di posisi tengah-scroll sesaat
// setelah klik "Berikutnya" (scrollIntoView + re-measure 60/300ms).
async function expectSpotlightOn(page: Page, tour: string, label: string) {
  await expect
    .poll(
      async () => {
        const spot = await spotlightBox(page);
        if (!spot) return false;
        const target = await visibleTargetBox(page, tour);
        if (!target) return false;
        const cx = spot.x + spot.width / 2;
        const cy = spot.y + spot.height / 2;
        return (
          cx >= target.x &&
          cx <= target.x + target.width &&
          cy >= target.y &&
          cy <= target.y + target.height
        );
      },
      { timeout: 10_000, message: `sorotan harus mengarah ke ${label}` }
    )
    .toBe(true);
}

async function nextStep(page: Page) {
  await page.getByRole("dialog").getByRole("button", { name: /Berikutnya|Buka Panduan|Selesai/ }).click();
}

async function tourFlag(page: Page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith("kasir-tour-v1"));
    return key ? localStorage.getItem(key) : null;
  });
}

test.describe("Walkthrough onboarding", () => {
  test("admin: tur 4 langkah, langkah terakhir membuka Panduan kategori Pengguna (Admin)", async ({ page }) => {
    await login(page);

    // Langkah 1-3: Kasir → Produk → Pengaturan
    await expect(tourDialog(page)).toHaveText(/Mulai dari Kasir/, { timeout: 45_000 });
    await expectSpotlightOn(page, "kasir", "menu Kasir");
    await nextStep(page);

    await expect(tourDialog(page)).toHaveText(/Kelola Produk & Inventaris/);
    await expectSpotlightOn(page, "products", "menu Inventaris");
    await nextStep(page);

    await expect(tourDialog(page)).toHaveText(/Atur Toko Anda/);
    await expectSpotlightOn(page, "settings", "menu Pengaturan");
    await nextStep(page);

    // Langkah 4 (khusus admin): serah-terima ke dialog Panduan.
    await expect(tourDialog(page)).toHaveText(/Panduan Pengguna \(Admin\)/);
    await expectSpotlightOn(page, "guide", "tombol Bantuan");
    await nextStep(page); // "Buka Panduan"

    // Tur selesai; dialog Panduan terbuka di kategori "Pengguna (Admin)".
    const guide = page.getByRole("dialog", { name: "Panduan Aplikasi" });
    await expect(guide).toBeVisible();
    await expect(guide.getByRole("button", { name: "Pengguna (Admin)", exact: true }).first()).toHaveAttribute("aria-current", "true");
    expect(await tourFlag(page)).toBe("1");

    // Reload: tur tidak muncul lagi.
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.getByRole("dialog", { name: /Mulai dari Kasir/ })).toHaveCount(0);
  });

  test("kasir: tur hanya 3 langkah tanpa langkah Pengguna (Admin)", async ({ page }) => {
    await login(page, KASIR);

    await expect(tourDialog(page)).toHaveText(/Mulai dari Kasir/, { timeout: 45_000 });
    await expectSpotlightOn(page, "kasir", "menu Kasir");
    await nextStep(page);
    await expect(tourDialog(page)).toHaveText(/Kelola Produk & Inventaris/);
    await nextStep(page);
    await expect(tourDialog(page)).toHaveText(/Atur Toko Anda/);

    // Langkah terakhir kasir: tombol "Selesai", BUKAN "Buka Panduan".
    await expect(page.getByRole("dialog").getByRole("button", { name: "Buka Panduan" })).toHaveCount(0);
    await page.getByRole("dialog").getByRole("button", { name: "Selesai" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await tourFlag(page)).toBe("1");

    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.getByRole("dialog", { name: /Mulai dari Kasir/ })).toHaveCount(0);
  });

  test("tombol Lewati menyimpan flag dan tur tidak muncul lagi setelah reload", async ({ page }) => {
    await login(page);
    await expect(tourDialog(page)).toHaveText(/Mulai dari Kasir/, { timeout: 45_000 });

    await page.getByRole("dialog").getByRole("button", { name: "Lewati" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await tourFlag(page)).toBe("1");

    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.getByRole("dialog", { name: /Mulai dari Kasir/ })).toHaveCount(0);
  });

  test("tombol 'Ulangi tur' di dialog Panduan memunculkan kembali walkthrough", async ({ page }) => {
    await login(page);
    await expect(tourDialog(page)).toHaveText(/Mulai dari Kasir/, { timeout: 45_000 });
    await page.getByRole("dialog").getByRole("button", { name: "Lewati" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Buka dialog Panduan dari header, lalu klik "Ulangi tur".
    await page.getByRole("button", { name: "Bantuan, panduan aplikasi" }).click();
    const guide = page.getByRole("dialog", { name: "Panduan Aplikasi" });
    await expect(guide).toBeVisible();
    await guide.getByRole("button", { name: "Ulangi tur" }).click();

    // Walkthrough tampil lagi dari langkah pertama.
    await expect(tourDialog(page)).toHaveText(/Mulai dari Kasir/, { timeout: 15_000 });
    expect(await tourFlag(page)).toBeNull();
  });

  test("di mobile sorotan menyasar tab bawah & tile grid (Kasir → Produk → Pengaturan)", async ({ page, isMobile }) => {
    // Khusus project mobile — di desktop target Kasir yang terlihat adalah sidebar.
    test.skip(!isMobile, "khusus project mobile-chromium");
    await login(page);

    // Langkah 1: Kasir harus menyorot TAB BAWAH (bukan sidebar — tidak ada sidebar di mobile).
    await expect(tourDialog(page)).toHaveText(/Mulai dari Kasir/, { timeout: 45_000 });
    await expectSpotlightOn(page, "kasir", "tab Kasir bawah");
    const kasirTarget = await visibleTargetBox(page, "kasir");
    const nearBottom = await page.evaluate((y) => y > window.innerHeight - 160, kasirTarget!.y);
    expect(nearBottom, "target Kasir mobile harus di tab bawah (dekat dasar layar)").toBe(true);
    await nextStep(page);

    // Langkah 2 & 3: tile grid beranda.
    await expect(tourDialog(page)).toHaveText(/Kelola Produk & Inventaris/);
    await expectSpotlightOn(page, "products", "tile Inventaris");
    await nextStep(page);

    await expect(tourDialog(page)).toHaveText(/Atur Toko Anda/);
    await expectSpotlightOn(page, "settings", "tile Pengaturan");
    await nextStep(page);

    // Langkah 4 (admin): tombol Bantuan di header mobile.
    await expect(tourDialog(page)).toHaveText(/Panduan Pengguna \(Admin\)/);
    await expectSpotlightOn(page, "guide", "tombol Bantuan");
    await nextStep(page); // "Buka Panduan"

    const guide = page.getByRole("dialog", { name: "Panduan Aplikasi" });
    await expect(guide).toBeVisible();
    await expect(guide.getByRole("button", { name: "Pengguna (Admin)", exact: true }).first()).toHaveAttribute("aria-current", "true");
  });
});
