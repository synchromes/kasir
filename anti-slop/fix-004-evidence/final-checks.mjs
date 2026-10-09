import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
function ratio(a, b) {
  const luminance = c => c.map(n => n / 255).map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
try {
  for (const profile of ['desktop', 'mobile-320']) {
    const context = await browser.newContext({ baseURL: 'http://localhost:3000', ...(profile === 'desktop' ? { viewport: { width: 1440, height: 1000 } } : { ...devices['Pixel 7'], viewport: { width: 320, height: 740 } }) });
    await context.addInitScript(() => localStorage.setItem('kasir-tour-v1-1', '1'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/login');
    const inputBorder = await page.getByLabel('Email', { exact: true }).evaluate(el => getComputedStyle(el).borderBottomColor);
    assert.equal(inputBorder, 'rgb(102, 105, 121)');
    await page.getByLabel('Email', { exact: true }).fill('admin@kasir.com');
    await page.getByLabel('Password', { exact: true }).fill('admin123');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await page.waitForURL('http://localhost:3000/');
    await page.goto('/products');
    const link = page.getByRole('link', { name: 'Ekspor halaman ini', exact: true });
    const exportHeight = (await link.boundingBox()).height;
    assert.ok(exportHeight >= 44);
    const rows = await page.locator('main tbody tr').count();
    const downloadPromise = page.waitForEvent('download');
    await link.click();
    const download = await downloadPromise;
    const csvFile = `anti-slop/fix-004-evidence/${profile}-inventaris.csv`;
    await download.saveAs(csvFile);
    const csvRows = fs.readFileSync(csvFile, 'utf8').trim().split('\n').length - 1;
    assert.equal(csvRows, rows);
    await page.goto('/pos');
    await page.getByRole('button', { name: 'Tambah Coca Cola 390ml', exact: true }).first().click();
    await page.goto('/pos/rangkuman');
    const group = page.getByRole('group', { name: 'Jumlah Coca Cola 390ml', exact: true });
    const trigger = group.locator('[data-quantity-trigger]');
    await trigger.waitFor();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    await page.screenshot({ path: `anti-slop/fix-004-evidence/${profile}-stepper-closed.png`, fullPage: true });
    await trigger.click();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    await page.screenshot({ path: `anti-slop/fix-004-evidence/${profile}-stepper-open.png`, fullPage: true });
    await group.getByRole('button', { name: 'Tambah Coca Cola 390ml', exact: true }).click();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(await trigger.textContent(), '2');
    await page.screenshot({ path: `anti-slop/fix-004-evidence/${profile}-stepper-after-add.png`, fullPage: true });
    await trigger.click();
    await group.getByRole('button', { name: 'Kurangi Coca Cola 390ml', exact: true }).click();
    await page.getByRole('button', { name: 'Pas', exact: true }).click();
    assert.equal(await page.getByLabel('Dibayar', { exact: true }).inputValue(), '5.500');
    await page.getByRole('button', { name: 'Bantuan, panduan aplikasi', exact: true }).filter({ visible: true }).click();
    await page.getByRole('button', { name: 'Pengguna (Admin)', exact: true }).click();
    const guide = await page.getByRole('dialog').innerText();
    assert.ok(guide.includes('Akun baru memakai role Kasir'));
    assert.ok(!guide.includes('Tambah kasir atau admin baru'));
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []);
    results.push({ profile, status: 'PASS', csvRows, visibleTableRows: rows, exportHeight, inputBorder, stepper: ['collapsed initially', 'expanded on count', 'collapsed after add', 'collapsed after subtract'], exactPaid: 5500, guideMatchesRole: true, pageErrors: errors });
    await context.close();
  }
  const contrasts = {
    inputOnWhite: ratio([102, 105, 121], [255, 255, 255]),
    inputOnSurface: ratio([102, 105, 121], [250, 248, 255]),
    heroWhiteOnBrand: ratio([255, 255, 255], [37, 99, 235]),
    priceChipWorstCaseBlackBehind85PercentWhite: ratio([19, 27, 46], [217, 217, 217]),
  };
  assert.ok(contrasts.inputOnWhite >= 3 && contrasts.inputOnSurface >= 3 && contrasts.heroWhiteOnBrand >= 4.5 && contrasts.priceChipWorstCaseBlackBehind85PercentWhite >= 4.5);
  fs.writeFileSync('anti-slop/fix-004-evidence/final-results.json', JSON.stringify({ results, contrasts, scope: 'CSV download, local cart interactions, guide, and token contrast; no checkout POST' }, null, 2));
  console.log(JSON.stringify({ results, contrasts }, null, 2));
} finally {
  await browser.close();
}
