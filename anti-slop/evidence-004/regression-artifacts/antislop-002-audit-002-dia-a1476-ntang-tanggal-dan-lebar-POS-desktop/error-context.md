# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: antislop-002.spec.ts >> audit 002: dialog, notifikasi gagal, rentang tanggal, dan lebar POS
- Location: e2e\antislop-002.spec.ts:3:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 60000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/" until "load"
  navigated to "http://localhost:3000/"
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "commit" event fired
============================================================
```

# Page snapshot

```yaml
- button "Open Next.js Dev Tools" [ref=f30e6] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("audit 002: dialog, notifikasi gagal, rentang tanggal, dan lebar POS", async ({ page, isMobile }) => {
  4  |   await page.goto("/login");
  5  |   await page.getByLabel("Email").fill("admin@kasir.com");
  6  |   await page.getByLabel("Password").fill("admin123");
  7  |   await page.getByRole("button", { name: "Masuk", exact: true }).click();
> 8  |   await page.waitForURL("/");
     |              ^ Error: page.waitForURL: Test timeout of 60000ms exceeded.
  9  |   await page.getByRole("button", { name: "Lewati", exact: true }).click({ timeout: 45000 });
  10 |   await page.goto("/products");
  11 |   await expect(page.getByRole("button", { name: "+ Produk Baru", exact: true })).toHaveCSS("background-color", "rgb(0, 113, 77)");
  12 |   await page.getByRole("button", { name: "+ Produk Baru", exact: true }).click();
  13 |   const close = page.getByRole("button", { name: "Tutup dialog", exact: true });
  14 |   await expect(close).toBeVisible();
  15 |   await page.keyboard.press("Tab");
  16 |   await close.focus();
  17 |   expect(await close.evaluate(e => getComputedStyle(e).boxShadow)).not.toBe("none");
  18 |   const upload = page.getByRole("button", { name: "Upload foto produk", exact: true });
  19 |   await upload.focus();
  20 |   await expect(upload).toBeFocused();
  21 |   const chooser = page.waitForEvent("filechooser");
  22 |   if (isMobile) await upload.tap();
  23 |   else await upload.press("Enter");
  24 |   await chooser;
  25 |   await page.keyboard.press("Escape");
  26 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  27 |   await page.route("**/api/notifications", route => route.fulfill({ status: 500, body: "error" }));
  28 |   await page.reload();
  29 |   const bell = page.getByRole("button", { name: /^Notifikasi/ }).filter({ visible: true });
  30 |   await bell.click();
  31 |   await expect(page.getByRole("alert").filter({ hasText: "Notifikasi gagal dimuat" })).toBeVisible();
  32 |   await expect(page.getByText("Tidak ada notifikasi", { exact: true })).toHaveCount(0);
  33 |   await page.route("**/api/notifications", route => route.fulfill({ json: { items: [], unread: 0 } }));
  34 |   await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
  35 |   await expect(page.getByText("Tidak ada notifikasi", { exact: true })).toBeVisible();
  36 |   await page.keyboard.press("Escape");
  37 |   await expect(bell).toBeFocused();
  38 |   await expect(page.getByRole("button", { name: "Tutup notifikasi" })).toHaveCount(0);
  39 |   await page.goto("/reports?custom=1");
  40 |   for (const name of ["Dari", "Sampai"]) {
  41 |     const input = page.getByLabel(name, { exact: true });
  42 |     await expect(input).toBeVisible();
  43 |     expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  44 |   }
  45 |   await page.goto("/pos");
  46 |   await expect(page.getByRole("button", { name: "Semua Item", exact: true })).toHaveCSS("color", "rgb(19, 27, 46)");
  47 |   const card = page.getByRole("heading", { name: "Pesanan Saat Ini" }).locator("../..");
  48 |   if (!isMobile) expect((await card.boundingBox())!.width).toBe(400);
  49 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  50 | });
  51 | 
```