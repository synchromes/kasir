# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: reports-redesign.spec.ts >> Laporan: periode kosong, tanggal salah, nol harian, bulan dan nominal panjang
- Location: e2e\reports-redesign.spec.ts:185:5

# Error details

```
Error: Width 320: Rp 1.234.566.890.12311646857354.0%vs periode sebelumnya

Width 320: Rp 1.234.566.890.12311646857354.0%vs periode sebelumnya

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
```

# Test source

```ts
  119 |   await expect(page.getByText("Harga pokok penjualan (HPP)", { exact: true })).toBeVisible();
  120 |   await detail.press("Enter");
  121 |   const chart = page.locator("main summary").filter({ hasText: "Lihat angka grafik" });
  122 |   await chart.focus();
  123 |   await chart.press("Enter");
  124 |   await expect(page.getByRole("table", { name: "Omzet dan laba kotor per hari", exact: true })).toBeVisible();
  125 |   await chart.press("Enter");
  126 |   const guide = page.locator("main").getByRole("button", { name: "Bantuan, panduan Laporan", exact: true });
  127 |   await guide.click();
  128 |   await expect(page.getByRole("dialog")).toContainText("Pilih Hari Ini, 7 Hari, Bulan Ini, atau Kustom.");
  129 |   await page.keyboard.press("Escape");
  130 |   await expect(guide).toBeFocused();
  131 |   const download = page.waitForEvent("download");
  132 |   await page.getByRole("link", { name: "Ekspor", exact: true }).click();
  133 |   expect((await download).suggestedFilename()).toBe("laporan-penjualan.csv");
  134 |   const recent = page.getByRole("region", { name: "Transaksi terakhir", exact: true });
  135 |   const rowLink = recent.getByRole("link").filter({ visible: true }).first();
  136 |   const href = await rowLink.getAttribute("href");
  137 |   await rowLink.click();
  138 |   await expect(page).toHaveURL(new RegExp(`${href}$`));
  139 |   await page.goBack();
  140 |   const all = page.getByRole("link", { name: "Lihat semua", exact: true });
  141 |   const allHref = (await all.getAttribute("href"))!;
  142 |   await all.click();
  143 |   await expect(page).toHaveURL(new URL(allHref, page.url()).toString());
  144 |   const dates = new URL(page.url()).searchParams;
  145 |   await expect(page.getByLabel("Dari Tanggal", { exact: true })).toHaveValue(dates.get("from")!);
  146 |   await expect(page.getByLabel("Sampai Tanggal", { exact: true })).toHaveValue(dates.get("to")!);
  147 | });
  148 | 
  149 | test("Laporan: HPP, laba rugi, isolasi toko, CSV penuh dan lima transaksi terakhir", async ({ page }, info) => {
  150 |   await login(page, fixtureEmail, "ReportsTest123");
  151 |   await page.goto("/reports?from=2026-08-01&to=2026-08-03");
  152 |   await expect(page.locator('[data-report-value="revenue"]')).toHaveText(money(21000));
  153 |   await expect(page.locator('[data-report-value="expense"]')).toHaveText(money(22000));
  154 |   await expect(page.locator('[data-report-value="net"]')).toHaveText(money(-2200));
  155 |   await expect(page.locator('[data-report-value="net"]')).toHaveCSS("color", "rgb(186, 26, 26)");
  156 |   await expect(page.locator('[data-report-value="count"]')).toHaveText("6");
  157 |   await expect(page.locator('[data-report-value="qty"]')).toHaveText("6");
  158 |   await expect(page.locator('[data-report-value="average"]')).toHaveText(money(3500));
  159 |   await expect(page.getByRole("region", { name: "Ringkasan laporan", exact: true })).toContainText("10.0%");
  160 |   const summary = page.locator("main summary").filter({ hasText: "Rincian laba" });
  161 |   await summary.click();
  162 |   const calculation = summary.locator("..");
  163 |   await expect(calculation).toContainText(money(1200));
  164 |   await expect(calculation).toContainText(money(19800));
  165 |   await page.locator("main summary").filter({ hasText: "Lihat angka grafik" }).click();
  166 |   const table = page.getByRole("table", { name: "Omzet dan laba kotor per hari", exact: true });
  167 |   await expect(table.getByRole("row")).toHaveCount(4);
  168 |   await expect(table.getByRole("row").last()).toContainText(money(10600));
  169 |   const payments = page.getByRole("list", { name: "Rincian metode pembayaran", exact: true });
  170 |   await expect(payments.getByRole("listitem")).toHaveCount(3);
  171 |   await expect(payments).toContainText(money(9000));
  172 |   const csvUrl = (await page.getByRole("link", { name: "Ekspor", exact: true }).getAttribute("href"))!;
  173 |   const csv = decodeURIComponent(csvUrl.split(",").slice(1).join(","));
  174 |   expect(csv.trim().split("\n")).toHaveLength(7);
  175 |   expect(csv).toContain("INV-TEST-1");
  176 |   expect(csv).not.toContain("INV-TEST-PREVIOUS");
  177 |   expect(csv).not.toContain("INV-20261007");
  178 |   const recent = page.getByRole("region", { name: "Transaksi terakhir", exact: true });
  179 |   await expect(recent.getByRole("link").filter({ visible: true })).toHaveCount(5);
  180 |   await expect(recent).toContainText("5 transaksi terbaru dari 6 transaksi");
  181 |   await expect(recent).not.toContainText("INV-TEST-1");
  182 |   await axe(page, `${info.project.name}-fixture-expanded`);
  183 | });
  184 | 
  185 | test("Laporan: periode kosong, tanggal salah, nol harian, bulan dan nominal panjang", async ({ page }, info) => {
  186 |   await login(page, fixtureEmail, "ReportsTest123");
  187 |   await page.goto("/reports?from=2026-08-05&to=2026-08-05");
  188 |   await expect(page.locator('[data-report-value="revenue"]')).toHaveText(money(0));
  189 |   await expect(page.getByText("Belum ada penjualan pada periode ini.", { exact: true })).toBeVisible();
  190 |   const emptyCsv = (await page.getByRole("link", { name: "Ekspor", exact: true }).getAttribute("href"))!;
  191 |   expect(decodeURIComponent(emptyCsv.split(",").slice(1).join(",")).trim().split("\n")).toHaveLength(1);
  192 |   await axe(page, `${info.project.name}-empty`);
  193 |   await page.goto("/reports?from=2026-08-06&to=2026-08-01");
  194 |   await expect(page.locator("main").getByRole("alert")).toContainText("Tanggal akhir harus sama atau setelah tanggal awal.");
  195 |   await expect(page.getByRole("region", { name: "Ringkasan laporan", exact: true })).toHaveCount(0);
  196 |   await expect(page.getByRole("link", { name: "Ekspor", exact: true })).toHaveCount(0);
  197 |   await axe(page, `${info.project.name}-invalid`);
  198 |   await page.getByRole("link", { name: "Kembali ke bulan ini", exact: true }).click();
  199 |   await expect(page.getByRole("region", { name: "Ringkasan laporan", exact: true })).toBeVisible();
  200 |   for (const invalid of ["2026-02-30", "invalid"]) {
  201 |     await page.goto(`/reports?from=${invalid}&to=2026-08-01`);
  202 |     await expect(page.locator("main").getByRole("alert")).toContainText("Tanggal tidak valid.");
  203 |   }
  204 |   await page.goto("/reports?from=2026-08-01&to=2026-08-05");
  205 |   await page.locator("main summary").filter({ hasText: "Lihat angka grafik" }).click();
  206 |   const daily = page.getByRole("table", { name: "Omzet dan laba kotor per hari", exact: true });
  207 |   await expect(daily.getByRole("row")).toHaveCount(6);
  208 |   await expect(daily.getByRole("row").last()).toContainText(money(0));
  209 |   await page.goto("/reports?from=2026-07-01&to=2026-10-01");
  210 |   await page.locator("main summary").filter({ hasText: "Lihat angka grafik" }).click();
  211 |   await expect(page.getByRole("table", { name: "Omzet dan laba kotor per bulan", exact: true }).getByRole("row")).toHaveCount(5);
  212 |   await page.goto("/reports?from=2026-08-04&to=2026-08-04");
  213 |   await expect(page.locator('[data-report-value="revenue"]')).toHaveText(money(1234567890123));
  214 |   await page.evaluate(() => document.fonts.ready);
  215 |   for (const width of [320, 393, 768, 1024, 1440]) {
  216 |     await page.setViewportSize({ width, height: 851 });
  217 |     expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  218 |     for (const field of await page.locator("main p, main dd").filter({ visible: true }).all()) {
> 219 |       await expect.poll(() => field.evaluate(el => el.scrollWidth <= el.clientWidth + 1), { message: `Width ${width}: ${await field.textContent()}` }).toBe(true);
      |                                                                                                                                                        ^ Error: Width 320: Rp 1.234.566.890.12311646857354.0%vs periode sebelumnya
  220 |     }
  221 |   }
  222 |   await expect(page.locator('[data-report-value="revenue"]')).toHaveText(money(1234567890123));
  223 |   const recent = page.getByRole("region", { name: "Transaksi terakhir", exact: true });
  224 |   await expect(recent.getByRole("link").filter({ visible: true }).first()).toHaveAttribute("href", `/sales/${bigSaleId}`);
  225 | });
  226 | 
```