import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real checkout action with isolated dependencies, without MySQL.
const compiled = ts.transpileModule(fs.readFileSync('lib/actions.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const data = {
  items: [{ productId: 5, qty: 1 }], discountType: 'FIXED', discountValue: 0,
  paid: 5500, paymentMethod: 'CASH', customerId: null, usePoints: false, saleKey: 'committed-order',
};
const existing = { id: 38, ownerId: 1, invoiceNo: 'INV-existing' };

function load({ early, atomic, failure, afterFailure, stock = 0 }) {
  const calls = { lookup: 0, product: 0, transaction: 0, create: 0, notification: 0 };
  const tx = {
    sale: {
      findUnique: async () => atomic,
      create: async () => { calls.create++; throw new Error('Unexpected new sale'); },
    },
  };
  const prisma = {
    sale: {
      findUnique: async () => ++calls.lookup === 1 ? early : afterFailure,
      count: async () => 0,
    },
    product: { findFirst: async () => {
      calls.product++;
      return { id: 5, name: 'Produk', active: true, stock, costPrice: 3800, sellPrice: 5500 };
    } },
    setting: { findUnique: async () => ({ taxRate: 0 }) },
    $transaction: async callback => {
      calls.transaction++;
      if (failure) throw failure;
      return callback(tx);
    },
  };
  const modules = {
    'next/cache': { revalidatePath() {} },
    'next/navigation': { redirect(url) { throw new Error(`REDIRECT:${url}`); } },
    'bcryptjs': {}, '@prisma/client': { NotificationType: {} },
    '@/lib/auth': { auth: async () => ({ user: { id: '1', role: 'ADMIN' } }) },
    '@/lib/db': { prisma },
    '@/lib/qris': { convertQRIS() {}, validateQRIS: () => ({ valid: true }) },
    '@/lib/notifications': {
      createNotification: async () => { calls.notification++; }, syncLowStockAlerts: async () => {},
    },
    '@/lib/utils': { formatRupiah: String },
  };
  const sandbox = { exports: {}, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected dependency ${name}`);
    return modules[name];
  } };
  vm.runInNewContext(compiled, sandbox, { filename: 'lib/actions.ts (isolated)' });
  return { checkout: sandbox.exports.checkout, calls };
}

const results = [];
async function check(name, config, expected) {
  const { checkout, calls } = load(config);
  if (expected === 'redirect') await assert.rejects(checkout(data), /REDIRECT:\/pos\/success\/38/);
  else assert.equal((await checkout(data)).error, expected);
  assert.equal(calls.create, 0);
  assert.equal(calls.notification, 0);
  if (config.early) {
    assert.equal(calls.product, 0);
    assert.equal(calls.transaction, 0);
  }
  results.push({ name, status: 'PASS', calls });
}
await check('Committed retry succeeds despite depleted stock', { early: existing }, 'redirect');
await check('Another owner cannot reuse a sale key', { early: { ...existing, ownerId: 2 } }, 'Identitas transaksi tidak valid');
await check('Atomic dedupe avoids repeated notifications', { early: null, atomic: existing, stock: 10 }, 'redirect');
await check('Concurrent commit recovered after unique conflict', {
  early: null, afterFailure: existing, stock: 10, failure: Object.assign(new Error('unique'), { code: 'P2002' }),
}, 'redirect');
await check('Concurrent commit recovered after guarded stock failure', {
  early: null, afterFailure: existing, stock: 10, failure: new Error('CHECKOUT_ERROR:Stok tidak mencukupi'),
}, 'redirect');
await check('Conflicting owner rejected during atomic dedupe', {
  early: null, atomic: { ...existing, ownerId: 2 }, stock: 10,
}, 'Identitas transaksi tidak valid');
const report = JSON.stringify({ scope: 'isolated action; no database connection or business writes', results }, null, 2);
if (process.argv[2]) fs.writeFileSync(process.argv[2], report + '\n', 'utf8');
console.log(report);
