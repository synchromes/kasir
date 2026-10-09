import fs from 'node:fs';
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ baseURL: 'http://localhost:3000' });
await context.addInitScript(() => localStorage.setItem('kasir-tour-v1-1', '1'));
const page = await context.newPage();
const result = { requests: [], responses: [] };
page.on('request', req => {
  if (req.url().includes('/api/auth/')) {
    const fields = new URLSearchParams(req.postData() || '');
    result.requests.push({ url: req.url(), method: req.method(), csrfLength: fields.get('csrfToken')?.length, callback: fields.get('callbackUrl') });
  }
});
await page.route('**/api/auth/signout', async route => {
  const response = await route.fetch();
  result.responses.push({ url: response.url(), status: response.status(), body: await response.json() });
  await route.fulfill({ response });
});
try {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@kasir.com');
  await page.getByLabel('Password', { exact: true }).fill('admin123');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.waitForURL('http://localhost:3000/');
  result.beforeCookies = (await context.cookies()).map(c => c.name);
  await page.getByRole('button', { name: 'Keluar', exact: true }).filter({ visible: true }).click();
  await page.waitForTimeout(2000);
  result.afterCookies = (await context.cookies()).map(c => c.name);
  result.url = page.url();
  const session = await (await page.request.get('/api/auth/session')).json();
  result.sessionUser = session?.user?.id || null;
} finally {
  fs.writeFileSync('anti-slop/fix-004-evidence/logout-diagnostic.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  await browser.close();
}
