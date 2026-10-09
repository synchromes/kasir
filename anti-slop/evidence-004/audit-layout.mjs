import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';
import { scanDOM, login } from './audit-browser.mjs';
const output=path.dirname(fileURLToPath(import.meta.url));
const result=process.env.AUDIT_TAIL ? JSON.parse(fs.readFileSync(path.join(output,'layout-results.json'),'utf8')) : {checks:[],errors:[]};
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({baseURL:'http://localhost:3000',...devices['Pixel 7']});
const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(90000);
async function go(route){for(let i=0;i<3;i++){try{await page.goto(route);await page.locator('main').waitFor({timeout:10000});await page.waitForTimeout(1100);if(await page.locator('main').count())return;}catch(e){result.errors.push({route,message:e.message.slice(0,200)});}}throw new Error('Cannot load '+route);}
async function save(name,extra={}){await page.waitForTimeout(500);const dom=await page.evaluate(scanDOM);await page.screenshot({path:path.join(output,`layout-${name}.png`),fullPage:true});result.checks.push({name,...extra,dom});fs.writeFileSync(path.join(output,'layout-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({name,overflow:dom.scrollWidth-dom.width,...extra}));}
try{
  await login(page);
  for(const width of process.env.AUDIT_TAIL ? [] : [320,360,480,768,1024]){
    await page.setViewportSize({width,height:900});
    for(const route of ['/','/sales','/pos/success/38','/reports']){await go(route);await save(width+'-'+(route==='/'?'home':route.replaceAll('/','-')));}
  }
  await page.setViewportSize({width:393,height:851});
  for(const [route,name] of [['/products','+ Produk Baru'],['/categories','+ Tambah'],['/units','+ Tambah'],['/suppliers','+ Tambah'],['/customers','+ Tambah'],['/purchases','+ Pembelian Baru'],['/expenses','+ Catat Pengeluaran'],['/users','+ Tambah Pengguna']]){
    await go(route);await page.getByRole('button',{name,exact:true}).click();await page.getByRole('dialog').waitFor();await save('dialog-'+route.slice(1));
    await page.keyboard.press('Tab');const tabInside=await page.evaluate(()=>document.querySelector('[role=dialog]').contains(document.activeElement));
    await page.keyboard.press('Escape');result.checks.push({name:'dialog-keyboard-'+route.slice(1),tabInside,escapeClosed:await page.getByRole('dialog').count()===0});
  }
  await page.setViewportSize({width:320,height:800});await go('/purchases');await page.getByRole('button',{name:'+ Pembelian Baru',exact:true}).click();await page.waitForTimeout(500);
  const geometry=await page.getByRole('dialog').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,rect:el.getBoundingClientRect().toJSON(),controls:[...el.querySelectorAll('input,button,[role=combobox]')].map(c=>({text:c.textContent,placeholder:c.getAttribute('placeholder'),aria:c.getAttribute('aria-label'),rect:c.getBoundingClientRect().toJSON()}))}));
  await save('purchase-320-measured',{geometry});await page.keyboard.press('Escape');
  await page.setViewportSize({width:393,height:851});await go('/reports?custom=1');await page.getByLabel('Dari',{exact:true}).fill('2026-10-01');await page.getByLabel('Sampai',{exact:true}).fill('2026-10-08');
  await page.getByRole('button',{name:'Terapkan',exact:true}).click();await page.waitForURL(/from=2026-10-01/);await page.waitForTimeout(1000);await save('reports-custom');
  const d=page.waitForEvent('download');await page.getByRole('link',{name:'Ekspor',exact:true}).click();const download=await d;await download.saveAs(path.join(output,'report-export.csv'));await save('reports-export',{filename:download.suggestedFilename()});
  await go('/products');const exp=page.waitForEvent('download');await page.getByRole('link',{name:'Ekspor CSV',exact:true}).click();const inventory=await exp;await inventory.saveAs(path.join(output,'inventory-export.csv'));result.checks.push({name:'inventory-export',filename:inventory.suggestedFilename()});
  await go('/categories');await page.locator('main button').filter({has:page.locator('svg.lucide-trash-2')}).first().click();await save('delete-confirm-focus',{focused:await page.evaluate(()=>document.activeElement.textContent)});await page.getByRole('button',{name:'Batal',exact:true}).click();
  await page.getByRole('button',{name:'Bantuan, panduan aplikasi',exact:true}).filter({visible:true}).click();await save('guide-open');
  await page.getByRole('dialog',{name:'Panduan Aplikasi'}).getByRole('button',{name:'Kasir (POS)',exact:true}).filter({visible:true}).first().click();await save('guide-category');await page.keyboard.press('Escape');
  await page.route('**/api/notifications',r=>r.fulfill({status:500,body:'Audit simulated failure'}));await go('/notifications');await page.getByRole('button',{name:/^Notifikasi/}).filter({visible:true}).click();await page.getByRole('alert').filter({hasText:'Notifikasi gagal dimuat'}).waitFor();await save('notifications-error');
  await page.unroute('**/api/notifications');await page.route('**/api/notifications',r=>r.fulfill({json:{items:[],unread:0}}));await page.getByRole('button',{name:'Coba lagi',exact:true}).click();await page.getByText('Tidak ada notifikasi',{exact:true}).waitFor();await save('notifications-retry');await page.keyboard.press('Escape');await page.unroute('**/api/notifications');
  await go('/');await page.getByRole('searchbox',{name:'Cari menu',exact:true}).fill('supplier');await save('mobile-menu-search');await page.getByRole('button',{name:'Bersihkan pencarian',exact:true}).click();await save('mobile-menu-reset');
  await page.setViewportSize({width:720,height:900});await go('/settings');await page.evaluate(()=>{document.documentElement.style.fontSize='32px';});await save('settings-text-200');
}catch(e){result.errors.push({url:page.url(),message:e.message});console.error(e);}finally{fs.writeFileSync(path.join(output,'layout-results.json'),JSON.stringify(result,null,2));await browser.close();}
