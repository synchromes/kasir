import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const output = path.dirname(fileURLToPath(import.meta.url));
const baseURL = 'http://localhost:3000';
const results = { pages: [], interactions: [], errors: [] };
const routes = ['/', '/pos', '/products', '/categories', '/units', '/suppliers', '/customers', '/purchases', '/stock', '/sales', '/expenses', '/reports', '/notifications', '/users', '/settings', '/pos/rangkuman', '/pos/confirm'];

function scanDOM() {
  const visible = el => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const describe = el => ({ tag: el.tagName, text: (el.innerText || el.textContent || '').trim().slice(0, 100), aria: el.getAttribute('aria-label'), placeholder: el.getAttribute('placeholder'), id: el.id, cls: typeof el.className === 'string' ? el.className.slice(0, 220) : '' });
  const controls = [...document.querySelectorAll('button,a,input:not([type=hidden]),select,textarea,[role=combobox]')].filter(visible).map(el => {
    const r = el.getBoundingClientRect();
    const name = el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') || '').split(' ').map(id => document.getElementById(id)?.textContent || '').join(' ').trim() || [...(el.labels || [])].map(l => l.textContent).join(' ').trim() || (['BUTTON','A'].includes(el.tagName) ? el.innerText?.trim() : '') || el.getAttribute('title') || '';
    return { ...describe(el), name, width: Math.round(r.width), height: Math.round(r.height), disabled: !!el.disabled, href: el.getAttribute('href') };
  });
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const rgba = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1); const d = [...ctx.getImageData(0,0,1,1).data]; return [d[0],d[1],d[2],d[3]/255]; };
  const over = (a,b) => [0,1,2].map(i => a[i]*a[3]+b[i]*(1-a[3])).concat(1);
  const lum = c => c.slice(0,3).map(v => {const n=v/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
  const contrast = [];
  for(const el of document.querySelectorAll('body *')) {
    if(!visible(el) || ['SCRIPT','STYLE','SVG','PATH','NEXTJS-PORTAL'].includes(el.tagName) || el.closest('nextjs-portal,svg') || el.disabled) continue;
    const txt = [...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim();
    if(!txt) continue;
    const ancestors=[];let cursor=el,skip=false;
    while(cursor instanceof Element){const s=getComputedStyle(cursor);if(s.backgroundImage!=='none')skip=true;ancestors.unshift(cursor);cursor=cursor.parentElement;}
    if(skip)continue;
    let bg=[255,255,255,1], opacity=1;
    for(const a of ancestors){const s=getComputedStyle(a);bg=over(rgba(s.backgroundColor),bg);opacity*=Number(s.opacity);}
    const s=getComputedStyle(el);const fg=rgba(s.color);fg[3]*=opacity;const rendered=over(fg,bg);
    const l1=lum(rendered),l2=lum(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
    const size=parseFloat(s.fontSize),weight=parseInt(s.fontWeight,10),minimum=size>=24||(size>=18.666&&weight>=700)?3:4.5;
    if(ratio<minimum-.03)contrast.push({text:txt.slice(0,100),ratio:Number(ratio.toFixed(2)),minimum,color:s.color,bg:bg.slice(0,3).map(Math.round),size,weight,opacity,cls:describe(el).cls});
  }
  const clipped = [...document.querySelectorAll('main input,main button,[role=dialog] input,[role=dialog] button')].filter(visible).filter(el=>{const r=el.getBoundingClientRect();return r.right>innerWidth+2||r.left< -2;}).map(describe);
  return { title: document.title, heading: document.querySelector('main h1')?.textContent || document.querySelector('h1')?.textContent, width: innerWidth, scrollWidth:document.documentElement.scrollWidth, controls, contrast, clipped, rows:document.querySelectorAll('main tbody tr').length, bodyText:document.body.innerText.slice(-1100), links:[...document.querySelectorAll('main a[href]')].map(a=>a.getAttribute('href')) };
}

async function record(page, profile, route, label='') {
  const data = await page.evaluate(scanDOM);
  const slug=(route==='/'?'home':route.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,''))+(label?'-'+label:'');
  const filename=`${profile}-${slug}.png`;
  await page.screenshot({path:path.join(output,filename),fullPage:true});
  results.pages.push({profile,route,label,screenshot:filename,...data});
  fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({profile,route,label,heading:data.heading,overflow:data.scrollWidth-data.width,unnamed:data.controls.filter(c=>!c.name&&!c.disabled).length,contrast:data.contrast.length}));
  return data;
}

async function login(page) {
  await page.goto('/login');
  await page.getByLabel('Email',{exact:true}).fill('admin@kasir.com');
  await page.getByLabel('Password',{exact:true}).fill('admin123');
  await page.getByRole('button',{name:'Masuk',exact:true}).click();
  await page.waitForURL(baseURL+'/',{timeout:90000});
  const skip=page.getByRole('button',{name:'Lewati',exact:true});
  await skip.waitFor({state:'visible',timeout:15000}).catch(()=>{});
  if(await skip.isVisible())await skip.click();
}

async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    for(const profile of ['desktop','mobile']){
      const context=await browser.newContext({baseURL,...(profile==='mobile'?devices['Pixel 7']:{viewport:{width:1440,height:1000}})});
      const page=await context.newPage();page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(90000);
      page.on('pageerror',e=>results.errors.push({profile,url:page.url(),message:e.message}));
      page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')results.errors.push({profile,url:page.url(),type:m.type(),message:m.text().slice(0,800)});});
      await page.goto('/login'); await record(page,profile,'/login');
      await login(page);
      let saleLink;
      for(const route of routes){
        try{
          const response=await page.goto(route,{timeout:90000});
          await page.waitForTimeout(450);
          const data=await record(page,profile,route);
          if(route==='/sales')saleLink=data.links.find(l=>/^\/sales\/\d+$/.test(l));
          if(response&&response.status()>=400)results.interactions.push({profile,route,status:response.status()});
        }catch(e){results.errors.push({profile,route,message:e.message});console.log('ROUTE ERROR',profile,route,e.message.slice(0,150));}
      }
      if(saleLink){for(const route of [saleLink,saleLink.replace('/sales/','/pos/success/')]){await page.goto(route);await record(page,profile,route);}}
      for(const width of (profile==='mobile'?[320,360,480,768]:[768,1024,1280])){
        await page.setViewportSize({width,height:900});
        for(const route of ['/','/pos','/products','/purchases','/sales']){await page.goto(route);await page.waitForTimeout(150);await record(page,`${profile}-${width}`,route);}
      }
      await page.setViewportSize(profile==='mobile'?{width:393,height:851}:{width:1440,height:1000});
      for(const [route,trigger] of [['/products','+ Produk Baru'],['/categories','+ Tambah'],['/units','+ Tambah'],['/suppliers','+ Tambah'],['/customers','+ Tambah'],['/purchases','+ Pembelian Baru'],['/expenses','+ Catat Pengeluaran'],['/users','+ Tambah Pengguna']]){
        await page.goto(route);await page.getByRole('button',{name:trigger,exact:true}).click();
        await record(page,profile,route,'dialog');
        await page.keyboard.press('Escape');
        results.interactions.push({profile,route,action:trigger,opened:true,escapeClosed:await page.getByRole('dialog').count()===0});
      }
      await context.close();
    }
  } finally {fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(results,null,2));await browser.close();}
}
export { scanDOM, login };
if(process.argv[1] === fileURLToPath(import.meta.url))main().catch(e=>{console.error(e);process.exitCode=1;});
