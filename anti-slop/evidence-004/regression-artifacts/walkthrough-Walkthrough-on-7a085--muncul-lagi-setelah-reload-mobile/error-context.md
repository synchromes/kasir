# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: walkthrough.spec.ts >> Walkthrough onboarding >> tombol Lewati menyimpan flag dan tur tidak muncul lagi setelah reload
- Location: e2e\walkthrough.spec.ts:134:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 60000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Kasirku" [level=1] [ref=e5]
      - paragraph [ref=e6]: Masuk ke akun Anda
    - generic [ref=e7]:
      - generic [ref=e8]:
        - text: Email
        - textbox "Email" [ref=e9]:
          - /placeholder: nama@email.com
          - text: admin@kasir.com
      - generic [ref=e10]:
        - text: Password
        - textbox "Password" [ref=e11]:
          - /placeholder: ••••••••
          - text: admin123
      - button "Masuk" [ref=e12] [cursor=pointer]
    - paragraph [ref=e13]: "Demo: admin@kasir.com / admin123 · kasir@kasir.com / kasir123"
  - button "Open Next.js Dev Tools" [ref=e19] [cursor=pointer]:
    - generic [ref=e22]:
      - text: Compiling
      - generic [ref=e23]:
        - generic [ref=e24]: .
        - generic [ref=e25]: .
        - generic [ref=e26]: .
  - alert [ref=e27]
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | 
  3   | // Akun demo dari prisma/seed.ts.
  4   | const ADMIN = { email: "admin@kasir.com", password: "admin123" };
  5   | const KASIR = { email: "kasir@kasir.com", password: "kasir123" };
  6   | 
  7   | async function login(page: Page, creds = ADMIN) {
  8   |   await page.goto("/login");
  9   |   await page.getByLabel("Email").fill(creds.email);
  10  |   await page.getByLabel("Password").fill(creds.password);
  11  |   await page.getByRole("button", { name: "Masuk" }).click();
> 12  |   await page.waitForURL("/");
      |              ^ Error: page.waitForURL: Test timeout of 60000ms exceeded.
  13  | }
  14  | 
  15  | // Dialog walkthrough (aria-label = judul langkah) atau dialog Panduan (Radix).
  16  | const tourDialog = (page: Page) =>
  17  |   page.getByRole("dialog", { name: /Mulai dari Kasir|Kelola Produk & Inventaris|Atur Toko Anda|Panduan Pengguna \(Admin\)/ });
  18  | 
  19  | // Kotak sorotan: div absolut dengan box-shadow raksasa (backdrop 9999px).
  20  | async function spotlightBox(page: Page) {
  21  |   return page.evaluate(() => {
  22  |     const el = Array.from(document.querySelectorAll("div")).find((d) => (d.style.boxShadow || "").includes("9999px"));
  23  |     if (!el) return null;
  24  |     const r = el.getBoundingClientRect();
  25  |     return { x: r.x, y: r.y, width: r.width, height: r.height };
  26  |   });
  27  | }
  28  | 
  29  | // Elemen [data-tour] yang TERLIHAT (sidebar desktop / tab & grid mobile).
  30  | async function visibleTargetBox(page: Page, tour: string) {
  31  |   return page.evaluate((t) => {
  32  |     for (const el of Array.from(document.querySelectorAll(`[data-tour="${t}"]`))) {
  33  |       const r = el.getBoundingClientRect();
  34  |       const st = getComputedStyle(el);
  35  |       if (r.width > 4 && r.height > 4 && st.display !== "none" && st.visibility !== "hidden") {
  36  |         return { x: r.x, y: r.y, width: r.width, height: r.height, tag: el.tagName };
  37  |       }
  38  |     }
  39  |     return null;
  40  |   }, tour);
  41  | }
  42  | 
  43  | // Sorotan harus mengelilingi elemen target yang terlihat (pusatnya di dalam).
  44  | // Dipoll sampai stabil — spotlight sempat berada di posisi tengah-scroll sesaat
  45  | // setelah klik "Berikutnya" (scrollIntoView + re-measure 60/300ms).
  46  | async function expectSpotlightOn(page: Page, tour: string, label: string) {
  47  |   await expect
  48  |     .poll(
  49  |       async () => {
  50  |         const spot = await spotlightBox(page);
  51  |         if (!spot) return false;
  52  |         const target = await visibleTargetBox(page, tour);
  53  |         if (!target) return false;
  54  |         const cx = spot.x + spot.width / 2;
  55  |         const cy = spot.y + spot.height / 2;
  56  |         return (
  57  |           cx >= target.x &&
  58  |           cx <= target.x + target.width &&
  59  |           cy >= target.y &&
  60  |           cy <= target.y + target.height
  61  |         );
  62  |       },
  63  |       { timeout: 10_000, message: `sorotan harus mengarah ke ${label}` }
  64  |     )
  65  |     .toBe(true);
  66  | }
  67  | 
  68  | async function nextStep(page: Page) {
  69  |   await page.getByRole("dialog").getByRole("button", { name: /Berikutnya|Buka Panduan|Selesai/ }).click();
  70  | }
  71  | 
  72  | async function tourFlag(page: Page) {
  73  |   return page.evaluate(() => {
  74  |     const key = Object.keys(localStorage).find((k) => k.startsWith("kasir-tour-v1"));
  75  |     return key ? localStorage.getItem(key) : null;
  76  |   });
  77  | }
  78  | 
  79  | test.describe("Walkthrough onboarding", () => {
  80  |   test("admin: tur 4 langkah, langkah terakhir membuka Panduan kategori Pengguna (Admin)", async ({ page }) => {
  81  |     await login(page);
  82  | 
  83  |     // Langkah 1-3: Kasir → Produk → Pengaturan
  84  |     await expect(tourDialog(page)).toHaveText(/Mulai dari Kasir/, { timeout: 45_000 });
  85  |     await expectSpotlightOn(page, "kasir", "menu Kasir");
  86  |     await nextStep(page);
  87  | 
  88  |     await expect(tourDialog(page)).toHaveText(/Kelola Produk & Inventaris/);
  89  |     await expectSpotlightOn(page, "products", "menu Inventaris");
  90  |     await nextStep(page);
  91  | 
  92  |     await expect(tourDialog(page)).toHaveText(/Atur Toko Anda/);
  93  |     await expectSpotlightOn(page, "settings", "menu Pengaturan");
  94  |     await nextStep(page);
  95  | 
  96  |     // Langkah 4 (khusus admin): serah-terima ke dialog Panduan.
  97  |     await expect(tourDialog(page)).toHaveText(/Panduan Pengguna \(Admin\)/);
  98  |     await expectSpotlightOn(page, "guide", "tombol Bantuan");
  99  |     await nextStep(page); // "Buka Panduan"
  100 | 
  101 |     // Tur selesai; dialog Panduan terbuka di kategori "Pengguna (Admin)".
  102 |     const guide = page.getByRole("dialog", { name: "Panduan Aplikasi" });
  103 |     await expect(guide).toBeVisible();
  104 |     await expect(guide.getByRole("button", { name: "Pengguna (Admin)", exact: true }).first()).toHaveAttribute("aria-current", "true");
  105 |     expect(await tourFlag(page)).toBe("1");
  106 | 
  107 |     // Reload: tur tidak muncul lagi.
  108 |     await page.reload();
  109 |     await page.waitForTimeout(2500);
  110 |     await expect(page.getByRole("dialog", { name: /Mulai dari Kasir/ })).toHaveCount(0);
  111 |   });
  112 | 
```