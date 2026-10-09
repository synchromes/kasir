import fs from 'node:fs';
import { chromium } from '@playwright/test';
import { login } from './audit-browser.mjs';

const result={pages:[],checks:[],errors:[]};
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({baseURL:'http://localhost:3000'});
const page=await context.newPage();
page.on('pageerror',e=>result.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
page.on('response',r=>{if(r.request().isNavigationRequest())result.pages.push({url:r.url(),status:r.status()});});
try{
  await login(page);
  for(const route of ['/','/pos','/products','/reports']){
    await page.goto(route,{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('main').waitFor({timeout:15000});
    await page.waitForTimeout(300);
  }
  await page.goto('/pos/success/38',{waitUntil:'domcontentloaded',timeout:30000});
  await page.getByRole('button',{name:'Cetak Struk',exact:true}).waitFor();
  await page.evaluate(()=>{window.auditPrintCalled=false;window.print=()=>{window.auditPrintCalled=true;};});
  await page.getByRole('button',{name:'Cetak Struk',exact:true}).click();
  result.checks.push({name:'print-button',windowPrintCalled:await page.evaluate(()=>window.auditPrintCalled)});
  await page.emulateMedia({media:'print'});
  await page.pdf({path:'anti-slop/evidence-004/receipt-print.pdf',width:'70mm',height:'220mm',printBackground:true,preferCSSPageSize:true});
  result.checks.push({name:'receipt-pdf',file:'receipt-print.pdf',scope:'browser print media; physical printer not tested'});
}catch(e){result.errors.push(e.message);}finally{
  fs.writeFileSync('anti-slop/evidence-004/production-results.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
  await browser.close();
}
