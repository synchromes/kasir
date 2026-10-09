import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';
import { scanDOM } from '../evidence-004/audit-browser.mjs';

const output = path.dirname(fileURLToPath(import.meta.url));
const baseURL = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const result = { pages: [], errors: [], scope: 'read-only browser checks; no business form submissions' };
const routes = ['/', '/pos', '/products', '/categories', '/units', '/suppliers', '/customers', '/purchases', '/stock', '/sales', '/expenses', '/reports', '/notifications', '/users', '/settings', '/pos/rangkuman', '/pos/confirm', '/sales/38', '/pos/success/38'];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const profile of ['desktop', 'mobile-320']) {
    const context = await browser.newContext({ baseURL, ...(profile === 'desktop' ? { viewport: { width: 1440, height: 1000 } } : { ...devices['Pixel 7'], viewport: { width: 320, height: 740 } }) });
    await context.addInitScript(() => localStorage.setItem('kasir-tour-v1-1', '1'));
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(90000);
    page.on('pageerror', error => result.errors.push({ profile, route: page.url(), message: error.message }));
    async function record(route, dialog = false) {
      await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => {
        const data = await window.axe.run(document.querySelector('[role=dialog]') || document.querySelector('main') || document.body, { rules: { 'color-contrast': { enabled: false } } });
        return data.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
      });
      const dom = await page.evaluate(scanDOM);
      const slug = (route === '/' ? 'home' : route.replaceAll('/', '-').replace(/^-/, '')) + (dialog ? '-dialog' : '');
      const screenshot = `${profile}-${slug}.png`;
      await page.screenshot({ path: path.join(output, screenshot), fullPage: true });
      result.pages.push({ profile, route, dialog, screenshot, violations, ...dom });
      fs.writeFileSync(path.join(output, 'ui-results.json'), JSON.stringify(result, null, 2));
      console.log(JSON.stringify({ profile, route, dialog, overflow: dom.scrollWidth - dom.width, contrast: dom.contrast, violations: violations.map(v => v.id) }));
    }
    await page.goto('/login');
    await record('/login');
    await page.getByLabel('Email', { exact: true }).fill('admin@kasir.com');
    await page.getByLabel('Password', { exact: true }).fill('admin123');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await page.waitForURL(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
    for (const route of routes) {
      const response = await page.goto(route);
      if (response?.status() !== 200) result.errors.push({ profile, route, status: response?.status() });
      await record(route);
    }
    for (const [route, trigger] of [['/products', '+ Produk Baru'], ['/categories', '+ Tambah'], ['/units', '+ Tambah'], ['/suppliers', '+ Tambah'], ['/customers', '+ Tambah'], ['/purchases', '+ Pembelian Baru'], ['/expenses', '+ Catat Pengeluaran'], ['/users', '+ Tambah Pengguna']]) {
      await page.goto(route);
      await page.getByRole('button', { name: trigger, exact: true }).click();
      await record(route, true);
      await page.keyboard.press('Escape');
    }
    await context.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, 'ui-results.json'), JSON.stringify(result, null, 2));
}
if (result.errors.length || result.pages.some(p => p.violations.length || p.contrast.length || p.scrollWidth > p.width)) process.exitCode = 1;
