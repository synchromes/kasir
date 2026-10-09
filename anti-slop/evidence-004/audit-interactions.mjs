import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';
import { scanDOM, login } from './audit-browser.mjs';

const output=path.dirname(fileURLToPath(import.meta.url));
const result={checks:[],errors:[]};
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({baseURL:'http://localhost:3000',viewport:{width:1440,height:1000}});
const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(90000);
page.on('pageerror',e=>result.errors.push({url:page.url(),message:e.message}));
async function save(name,extra={}){
  const dom=await page.evaluate(scanDOM);
  await page.screenshot({path:path.join(output,`interaction-${name}.png`),fullPage:true});
  result.checks.push({name,url:page.url(),...extra,dom});
  fs.writeFileSync(path.join(output,'interaction-results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({name,...extra,overflow:dom.scrollWidth-dom.width}));
}
try{
  await login(page);
  for(const [route,trigger] of [['/categories','+ Tambah'],['/units','+ Tambah'],['/suppliers','+ Tambah'],['/customers','+ Tambah'],['/expenses','+ Catat Pengeluaran'],['/products','+ Produk Baru'],['/users','+ Tambah Pengguna']]){
    await page.goto(route);
    const opener=page.getByRole('button',{name:trigger,exact:true});
    try{await opener.waitFor({timeout:6000});}catch{await page.reload();}
    await opener.click();
    const dialog=page.getByRole('dialog');
    for(const input of await dialog.locator('input').all()){
      if(!(await input.isVisible()))continue;
      const type=await input.getAttribute('type');const id=await input.getAttribute('id');
      if(type==='checkbox'||type==='file')continue;
      await input.fill(type==='number'?'1000':type==='email'?'audit@example.invalid':type==='password'?'AuditPassword123':id==='sku'?'AUDIT-NETWORK-ONLY':'Audit koneksi');
    }
    let blocked=0;
    const reject=async route=>{if(route.request().method()==='POST'){blocked++;await route.abort('failed');}else await route.continue();};
    await page.route('**/*',reject);
    await dialog.getByRole('button',{name:/^Simpan/}).click();
    await page.waitForTimeout(1700);
    await save('save-failure-'+route.slice(1),{blockedPosts:blocked,submitDisabled:await dialog.getByRole('button',{name:/Menyimpan|Simpan/}).first().isDisabled(),alerts:await dialog.getByRole('alert').count()});
    await page.unroute('**/*',reject);
    await page.keyboard.press('Escape');
  }
  await page.goto('/customers');
  await page.locator('input[placeholder="Cari pelanggan..."]').fill('zzzz-audit-no-result');
  await save('customers-empty-filter');

  await page.goto('/purchases');await page.getByRole('button',{name:'+ Pembelian Baru',exact:true}).click();
  const purchase=page.getByRole('dialog');
  await purchase.getByRole('combobox').nth(1).click();
  await page.getByRole('option').first().click();
  await page.setViewportSize({width:320,height:800});
  await save('purchase-320');
  await purchase.getByRole('button',{name:'Tambah item',exact:true}).click();
  await save('purchase-320-two-rows');
  await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:1000});

  await page.goto('/pos');
  await page.getByRole('button',{name:'Tambah Beras Premium 5kg',exact:true}).first().click();
  await page.getByRole('button',{name:'Tambah Beras Premium 5kg',exact:true}).first().click();
  await save('pos-add');
  await page.getByRole('button',{name:'Pas',exact:true}).click();await save('pos-cash-pas');
  await page.getByRole('button',{name:'%',exact:true}).click();await page.getByLabel('Diskon',{exact:true}).fill('10');
  await save('pos-discount');
  await page.getByRole('button',{name:'QRIS',exact:true}).click();await save('pos-qris');
  await page.getByRole('button',{name:'Transfer',exact:true}).click();await save('pos-transfer');
  await page.setViewportSize({width:393,height:851});
  await page.getByRole('link',{name:/Lihat rangkuman pesanan/}).click();await save('pos-summary');
  await page.getByRole('button',{name:'Tambah Beras Premium 5kg',exact:true}).click();await save('summary-stepper');
  await page.setViewportSize({width:1440,height:1000});

  await page.goto('/sales');
  await page.locator('main input[type=search]').fill('zzzz-audit-no-result');await page.waitForTimeout(700);
  await save('sales-filter');
  await page.getByRole('button',{name:'Reset',exact:true}).click();await page.waitForTimeout(500);await save('sales-reset');
  await page.goto('/reports?custom=1');await page.getByLabel('Dari',{exact:true}).fill('2026-10-01');await page.getByLabel('Sampai',{exact:true}).fill('2026-10-08');
  await page.getByRole('button',{name:'Terapkan',exact:true}).click();await page.waitForTimeout(500);await save('reports-custom');
  const exportLink=page.getByRole('link',{name:'Ekspor',exact:true});const downloadPromise=page.waitForEvent('download');await exportLink.click();const download=await downloadPromise;await download.saveAs(path.join(output,'report-export.csv'));await save('reports-export',{filename:download.suggestedFilename()});

  await page.goto('/categories');
  const trash=page.locator('main button').filter({has:page.locator('svg.lucide-trash-2')}).first();await trash.click();
  await save('delete-confirm-focus',{focused:await page.evaluate(()=>document.activeElement?.textContent)});
  await page.getByRole('button',{name:'Batal',exact:true}).click();await save('delete-cancel');
  await page.getByRole('button',{name:'Bantuan, panduan aplikasi',exact:true}).filter({visible:true}).click();
  await save('guide-open');
  const guide=page.getByRole('dialog',{name:'Panduan Aplikasi'});
  await guide.getByRole('button',{name:'Kasir (POS)',exact:true}).filter({visible:true}).first().click();await save('guide-category');
  await page.keyboard.press('Escape');await save('guide-escape');

  await page.route('**/api/notifications',route=>route.fulfill({status:500,body:'Audit simulated failure'}));
  await page.reload();await page.getByRole('button',{name:/^Notifikasi/}).filter({visible:true}).click();await page.getByRole('alert').filter({hasText:'Notifikasi gagal dimuat'}).waitFor();await save('notifications-error');
  await page.unroute('**/api/notifications');
  await page.route('**/api/notifications',route=>route.fulfill({json:{items:[],unread:0}}));
  await page.getByRole('button',{name:'Coba lagi',exact:true}).click();await save('notifications-retry-empty');
  await page.keyboard.press('Escape');await page.unroute('**/api/notifications');

  const mobileContext=await browser.newContext({baseURL:'http://localhost:3000',...devices['Pixel 7']});
  const mobile=await mobileContext.newPage();mobile.setDefaultNavigationTimeout(90000);await login(mobile);
  await mobile.goto('/');await mobile.getByRole('searchbox',{name:'Cari menu'}).fill('supplier');
  result.checks.push({name:'mobile-menu-search',dom:await mobile.evaluate(scanDOM)});
  await mobileContext.close();
}catch(e){result.errors.push({url:page.url(),fatal:e.message});console.error(e);}finally{
  fs.writeFileSync(path.join(output,'interaction-results.json'),JSON.stringify(result,null,2));await browser.close();
}

const loginBrowser=await chromium.launch({channel:'msedge',headless:true});
try{
  const loginContext=await loginBrowser.newContext({baseURL:'http://localhost:3000'});const p=await loginContext.newPage();
  p.setDefaultNavigationTimeout(90000);await p.goto('/login');
  await p.getByLabel('Email',{exact:true}).fill('admin@kasir.com');await p.getByLabel('Password',{exact:true}).fill('admin123');
  await p.route('**/api/auth/callback/**',route=>route.abort('failed'));
  await p.getByRole('button',{name:'Masuk',exact:true}).click();await p.waitForTimeout(1800);
  result.checks.push({name:'login-network-failure',dom:await p.evaluate(scanDOM)});
  await p.screenshot({path:path.join(output,'interaction-login-network-failure.png')});
}finally{fs.writeFileSync(path.join(output,'interaction-results.json'),JSON.stringify(result,null,2));await loginBrowser.close();}
