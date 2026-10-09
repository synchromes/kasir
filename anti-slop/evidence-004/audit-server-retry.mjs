import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the existing action against an isolated database stub. No connection
// to MySQL and no real transaction is possible in this probe.
const probes=[];
let existingLookup=0;
const prisma={
  product:{findFirst:async()=>({id:5,name:'Sold-out audit product',active:true,stock:0,costPrice:3800,sellPrice:5500})},
  sale:{findUnique:async()=>{existingLookup++;return {id:38,ownerId:1,saleKey:'previously-committed'};}},
  $transaction:async callback=>callback(prisma),
};
const modules={
  'next/cache':{revalidatePath:()=>{}},
  'next/navigation':{redirect:url=>{throw new Error('REDIRECT:'+url);}},
  'bcryptjs':{},
  '@prisma/client':{NotificationType:{}},
  '@/lib/auth':{auth:async()=>({user:{id:'1',role:'ADMIN'}})},
  '@/lib/db':{prisma},
  '@/lib/qris':{convertQRIS:()=>'',validateQRIS:()=>({valid:true})},
  '@/lib/notifications':{createNotification:async()=>{},syncLowStockAlerts:async()=>{}},
  '@/lib/utils':{formatRupiah:String},
};
const compiled=ts.transpileModule(fs.readFileSync('lib/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={exports:{},require:name=>{if(!(name in modules))throw new Error('Unexpected import '+name);return modules[name];}};
vm.runInNewContext(compiled,sandbox,{filename:'lib/actions.ts (isolated stub)'});
const response=await sandbox.exports.checkout({items:[{productId:5,qty:1}],discountType:'FIXED',discountValue:0,paid:5500,paymentMethod:'CASH',customerId:null,usePoints:false,saleKey:'previously-committed'});
probes.push({name:'retry-committed-sale-after-stock-depleted',existingSale:{id:38,saleKey:'previously-committed'},response,existingLookup,scope:'isolated stub; no real database access'});
fs.writeFileSync('anti-slop/evidence-004/server-retry-results.json',JSON.stringify(probes,null,2));
console.log(JSON.stringify(probes));
