import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';
import { scanDOM, login } from './audit-browser.mjs';

const output=path.dirname(fileURLToPath(import.meta.url));
const result={pages:[],checks:[],errors:[]};
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({baseURL:'http://localhost:3000',...devices['Pixel 7']});
const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(90000);
async function go(route){
  for(let attempt=0;attempt<3;attempt++){
    try{
      await page.goto(route);await page.locator('main').waitFor({state:'visible',timeout:12000});await page.waitForTimeout(1300);
      if(await page.getByRole('dialog',{name:/Mulai dari Kasir/}).isVisible().catch(()=>false))await page.getByRole('button',{name:'Lewati',exact:true}).click();
      if(await page.locator('main').count())return;
    }catch(e){result.errors.push({route,attempt,message:e.message.slice(0,250)});}
  }
  throw new Error(`Halaman ${route} tidak stabil setelah 3 percobaan`);
}
async function shot(name){await page.waitForTimeout(500);await page.screenshot({path:path.join(output,`accessibility-${name}.png`),fullPage:true});}
try{
  await login(page);
  for(const route of ['/','/pos','/products','/categories','/units','/suppliers','/customers','/purchases','/stock','/sales','/expenses','/reports','/notifications','/users','/settings','/sales/38','/pos/success/38']){
    try{
    await go(route);
    await page.addScriptTag({path:path.resolve('node_modules/axe-core/axe.min.js')});
    const violations=await page.evaluate(async()=>{
      const r=await window.axe.run(document.querySelector('main'),{rules:{'color-contrast':{enabled:false}}});
      return r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,html:n.html.slice(0,700),summary:n.failureSummary}))}));
    });
    result.pages.push({route,violations});
    console.log(JSON.stringify({route,violations:violations.map(v=>({id:v.id,count:v.nodes.length}))}));
    fs.writeFileSync(path.join(output,'accessibility-results.json'),JSON.stringify(result,null,2));
    }catch(e){result.errors.push({route,message:e.message.slice(0,400)});}
  }
  await go('/products');const trash=page.locator('main button').filter({has:page.locator('svg.lucide-trash-2')}).first();await trash.focus();await page.keyboard.press('Enter');await page.getByRole('dialog',{name:'Hapus Produk'}).waitFor();
  result.checks.push({name:'product-delete-keyboard',opened:true});await page.keyboard.press('Escape');result.checks.push({name:'product-delete-focus-return',triggerFocused:await trash.evaluate(e=>e===document.activeElement),activeTag:await page.evaluate(()=>document.activeElement.tagName)});
  await go('/pos');await page.getByRole('button',{name:'Tambah Coca Cola 390ml',exact:true}).first().click();
  await page.getByRole('link',{name:/Lihat rangkuman pesanan/}).click();
  await page.waitForURL('**/pos/rangkuman');await page.getByRole('heading',{name:'Rangkuman Pesanan',exact:true}).waitFor();
  await page.getByRole('button',{name:'Pas',exact:true}).click();
  result.checks.push({name:'cash-pas',paid:await page.getByLabel('Dibayar',{exact:true}).inputValue(),dom:await page.evaluate(scanDOM)});await shot('cash-pas');
  await page.getByRole('combobox').click();await page.getByRole('option',{name:/Budi Santoso/}).click();
  await page.getByRole('combobox').click();result.checks.push({name:'customer-reset-options',options:await page.getByRole('option').allTextContents()});await page.keyboard.press('Escape');
  const payloads=[];
  const blockCheckout=async route=>{if(route.request().method()==='POST'){payloads.push(route.request().postData());await route.abort('failed');}else await route.continue();};
  await page.getByRole('button',{name:'Transfer',exact:true}).click();await page.route('**/*',blockCheckout);
  await page.getByRole('button',{name:/^Bayar/}).click();await page.waitForTimeout(1200);await page.unroute('**/*',blockCheckout);
  await page.reload();await page.getByRole('button',{name:'Transfer',exact:true}).click();await page.route('**/*',blockCheckout);await page.getByRole('button',{name:/^Bayar/}).click();await page.waitForTimeout(1200);await page.unroute('**/*',blockCheckout);
  const keys=payloads.map(b=>b?.match(/"saleKey":"([^"]+)"/)?.[1]).filter(Boolean);
  result.checks.push({name:'checkout-key-after-reload',blockedPosts:payloads.length,keys,uniqueKeys:new Set(keys).size});
  await go('/pos');const before=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('kasir-cart')));
  await page.getByRole('button',{name:'Keluar',exact:true}).filter({visible:true}).click();await page.waitForURL('**/login');
  await page.getByLabel('Email',{exact:true}).fill('kasir@kasir.com');await page.getByLabel('Password',{exact:true}).fill('kasir123');await page.getByRole('button',{name:'Masuk',exact:true}).click();await page.waitForURL('http://localhost:3000/');
  await page.waitForTimeout(700);const skip=page.getByRole('button',{name:'Lewati',exact:true});if(await skip.isVisible())await skip.click();
  await go('/pos');await shot('cart-after-account-switch');
  result.checks.push({name:'cart-after-account-switch',before,after:await page.evaluate(()=>JSON.parse(sessionStorage.getItem('kasir-cart'))),dom:await page.evaluate(scanDOM)});
  await go('/users');result.checks.push({name:'cashier-admin-route',url:page.url()});
  const api=await page.request.get('/api/products/search?take=abc');result.checks.push({name:'api-invalid-take',status:api.status()});
}catch(e){result.errors.push({url:page.url(),message:e.message});console.error(e);}finally{
  fs.writeFileSync(path.join(output,'accessibility-results.json'),JSON.stringify(result,null,2));await browser.close();
}
