"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { NotificationType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { convertQRIS, validateQRIS } from "@/lib/qris";
import { createNotification, syncLowStockAlerts } from "@/lib/notifications";
import { formatRupiah } from "@/lib/utils";

export type CartItem = {
  productId: number;
  name: string;
  price: number;
  qty: number;
  stock: number;
};

// Setiap akun = 1 toko (data terisolasi). Helper ini mengembalikan id akun
// yang sedang login; semua query di bawah dibatasi dengan ownerId ini.
async function requireOwnerId(): Promise<number> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return Number(session.user.id);
}

// Batas data URL base64 (≈225 KB biner). Client sudah meresize: foto produk
// ±40 KB chars, bukti transfer ±180 KB chars — limit ini jadi jaring pengaman
// terhadap client yang tidak mengikuti aturan (kirim gambar mentah).
const MAX_IMAGE_LEN = 300_000;

const PAYMENT_METHODS = ["CASH", "QRIS", "TRANSFER"] as const;
const METHOD_LABEL: Record<string, string> = { CASH: "Tunai", QRIS: "QRIS", TRANSFER: "Transfer" };

export async function checkout(data: {
  items: CartItem[];
  discountType: "FIXED" | "PERCENT";
  discountValue: number;
  paid: number | null;
  paymentMethod: string;
  customerId: number | null;
  usePoints: boolean;
  paymentProof?: string | null;
  // Identitas transaksi tetap sama selama retry, termasuk setelah refresh.
  saleKey?: string;
  // Poin yang dipakai — dibekukan client saat QR dibuat; diverifikasi ulang
  // di sini agar nominal QR selalu sama dengan total yang tercatat.
  pointsUsed?: number;
}) {
  const ownerId = await requireOwnerId();
  if (data.saleKey) {
    if (typeof data.saleKey !== "string" || data.saleKey.length > 128) return { error: "Identitas transaksi tidak valid" };
    const existing = await prisma.sale.findUnique({ where: { saleKey: data.saleKey }, select: { id: true, ownerId: true } });
    if (existing) {
      if (existing.ownerId !== ownerId) return { error: "Identitas transaksi tidak valid" };
      redirect(`/pos/success/${existing.id}`);
    }
  }
  if (!data.items.length) return { error: "Keranjang kosong" };
  if (!Number.isFinite(data.discountValue) || data.discountValue < 0) {
    return { error: "Nilai diskon tidak valid" };
  }
  if (data.paid !== null && (!Number.isFinite(data.paid) || data.paid < 0)) {
    return { error: "Nominal pembayaran tidak valid" };
  }

  const method = data.paymentMethod as (typeof PAYMENT_METHODS)[number];
  if (!PAYMENT_METHODS.includes(method)) return { error: "Metode pembayaran tidak valid" };

  // Bukti pembayaran HANYA untuk QRIS/Transfer (Tunai tidak relevan meski
  // client mengirimkannya — mis. kasir upload lalu pindah metode).
  let paymentProof: string | null = null;
  if ((method === "QRIS" || method === "TRANSFER") && data.paymentProof) {
    if (!/^data:image\/(jpeg|png|webp);base64,/i.test(data.paymentProof)) {
      return { error: "Format bukti pembayaran tidak valid" };
    }
    if (data.paymentProof.length > MAX_IMAGE_LEN) return { error: "Ukuran bukti pembayaran terlalu besar" };
    paymentProof = data.paymentProof;
  }

  // Merge duplicate product lines and validate quantities server-side.
  const lines = new Map<number, number>();
  for (const item of data.items) {
    if (!Number.isInteger(item.productId) || !Number.isInteger(item.qty) || item.qty <= 0) {
      return { error: "Jumlah item tidak valid" };
    }
    lines.set(item.productId, (lines.get(item.productId) ?? 0) + item.qty);
  }

  // Load products from the DB and validate stock. Prices always come from the
  // DB (never from the client), so the sale total cannot be tampered with.
  // Only the owner's own products can be sold.
  const products = new Map<number, { stock: number; cost: number; price: number }>();
  for (const [productId, qty] of lines) {
    const product = await prisma.product.findFirst({ where: { id: productId, ownerId } });
    if (!product || !product.active) return { error: `Produk tidak ditemukan: ${productId}` };
    if (product.stock < qty) return { error: `Stok ${product.name} tidak mencukupi (tersisa ${product.stock})` };
    products.set(productId, { stock: product.stock, cost: product.costPrice, price: product.sellPrice });
  }

  const subtotal = [...lines.entries()].reduce((s, [id, qty]) => s + (products.get(id)?.price ?? 0) * qty, 0);
  // Discount is recomputed server-side so a percent value can never exceed
  // 100% and a fixed value can never exceed the subtotal.
  const discountRaw =
    data.discountType === "PERCENT"
      ? Math.round((subtotal * Math.min(Math.max(data.discountValue, 0), 100)) / 100)
      : data.discountValue;
  const discount = Math.min(Math.max(discountRaw, 0), subtotal);
  const afterDiscount = subtotal - discount;

  const setting = await prisma.setting.findUnique({ where: { ownerId } });
  const taxRate = setting?.taxRate ?? 0;
  // Pajak dibulatkan ke rupiah penuh agar tidak ada artefak desimal (0.999...)
  // yang mengotori laporan.
  const tax = Math.round((afterDiscount * taxRate) / 100);
  const total = Math.round(afterDiscount + tax);
  const pointsPer10k = setting?.pointsPer10k ?? 1;

  // QRIS dinamis butuh QRIS statis toko; divalidasi sekali sebelum transaksi.
  if (method === "QRIS") {
    const staticQris = setting?.qrisStatic?.trim() ?? "";
    if (!staticQris) return { error: "QRIS statis belum diatur. Tambahkan di menu Pengaturan." };
    const v = validateQRIS(staticQris);
    if (!v.valid) return { error: "QRIS statis tidak valid: " + (v.errors[0] ?? "") };
  }

  const paid = data.paid ?? total;

  // Retry the whole transaction on an invoice-number collision (concurrent
  // checkouts producing the same INV-... number).
  let saleId = 0;
  let invoiceNo = "";
  let created = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      invoiceNo = await generateInvoiceNo(ownerId);
      const result = await prisma.$transaction(async (tx) => {
        // Idempotensi: retry client (timeout/network) memakai saleKey yang sama
        // → kembalikan sale yang sudah dibuat, JANGAN buat sale baru.
        if (data.saleKey) {
          const existing = await tx.sale.findUnique({ where: { saleKey: data.saleKey } });
          if (existing) {
            if (existing.ownerId !== ownerId) throw new Error("CHECKOUT_ERROR:Identitas transaksi tidak valid");
            return { id: existing.id, invoiceNo: existing.invoiceNo, created: false };
          }
        }
        const customer = data.customerId
          ? await tx.customer.findFirst({ where: { id: data.customerId, ownerId } })
          : null;

        // Poin yang dipakai memakai nilai yang dibekukan client (nominal QR
        // konsisten dengan sale). Divalidasi terhadap saldo saat ini; jika
        // pelanggan kehabisan poin di antara → batalkan dan minta ulang.
        let pointsUsed = 0;
        if (data.usePoints && customer?.isMember && customer.points > 0) {
          const maxPoints = Math.min(customer.points, Math.floor(total / 100));
          const frozen = Number(data.pointsUsed) || 0;
          if (!Number.isInteger(frozen) || frozen > maxPoints) {
            throw new Error("CHECKOUT_ERROR:Poin pelanggan berubah. Kembali ke kasir lalu ulangi konfirmasi.");
          }
          pointsUsed = frozen;
        }
        const finalTotal = Math.max(total - pointsUsed, 0);
        if (paid < finalTotal) throw new Error("CHECKOUT_ERROR:Pembayaran kurang dari total");
        const change = Math.max(paid - finalTotal, 0);
        const pointsEarned = Math.floor(finalTotal / 10000) * pointsPer10k;

        // QRIS dinamis: payload digenerate SERVER dari total final (bukan dari
        // client) agar nominal di QR tidak bisa diubah/dipalsukan. Disimpan
        // untuk audit dengan nominal final setelah penggunaan poin.
        const qrisPayload =
          method === "QRIS" ? convertQRIS(setting?.qrisStatic?.trim() ?? "", { amount: Math.round(finalTotal) }) : null;

        const sale = await tx.sale.create({
          data: {
            invoiceNo,
            ownerId,
            cashierId: ownerId,
            customerId: customer?.id ?? null,
            subtotal,
            discount,
            tax,
            pointsUsed,
            total: finalTotal,
            paid,
            change,
            paymentMethod: method,
            paymentProof,
            qrisPayload,
            pointsEarned,
            saleKey: data.saleKey ?? null,
            items: {
              create: [...lines.entries()].map(([productId, qty]) => ({
                productId,
                qty,
                price: products.get(productId)?.price ?? 0,
                cost: products.get(productId)?.cost ?? 0,
              })),
            },
          },
        });

        for (const [productId, qty] of lines) {
          // Guarded decrement: never lets stock go negative even if another
          // checkout reduced it between our check and this update.
          const updated = await tx.product.updateMany({
            where: { id: productId, ownerId, stock: { gte: qty } },
            data: { stock: { decrement: qty } },
          });
          if (updated.count === 0) {
            const p = await tx.product.findFirst({ where: { id: productId, ownerId } });
            throw new Error("CHECKOUT_ERROR:" + (p ? `Stok ${p.name} tidak mencukupi (tersisa ${p.stock})` : `Produk tidak ditemukan: ${productId}`));
          }
          await tx.stockMovement.create({
            data: {
              productId,
              type: "OUT",
              qty,
              note: "Penjualan " + invoiceNo,
              userId: ownerId,
              saleId: sale.id,
            },
          });
        }

        if (customer && pointsUsed > 0) {
          // Guarded decrement: kalau poin sudah dipakai transaksi lain secara
          // bersamaan dan sisa kurang dari pointsUsed → batalkan (rollback),
          // mencegah saldo poin negatif.
          const dec = await tx.customer.updateMany({
            where: { id: customer.id, ownerId, points: { gte: pointsUsed } },
            data: { points: { decrement: pointsUsed } },
          });
          if (dec.count === 0) {
            throw new Error("CHECKOUT_ERROR:Poin pelanggan berubah. Kembali ke kasir lalu ulangi konfirmasi.");
          }
        }
        if (customer && pointsEarned > 0) {
          await tx.customer.update({
            where: { id: customer.id },
            data: { points: { increment: pointsEarned } },
          });
        }
        return { id: sale.id, invoiceNo: sale.invoiceNo, created: true };
      });
      saleId = result.id;
      invoiceNo = result.invoiceNo;
      created = result.created;
      break;
    } catch (e) {
      // Request serentak dapat sudah commit saat guarded decrement/unique gagal.
      if (data.saleKey) {
        const existing = await prisma.sale.findUnique({ where: { saleKey: data.saleKey }, select: { id: true, ownerId: true } });
        if (existing) {
          if (existing.ownerId !== ownerId) return { error: "Identitas transaksi tidak valid" };
          redirect(`/pos/success/${existing.id}`);
        }
      }
      // Business errors thrown inside the transaction are reported to the user.
      if (e instanceof Error && e.message.startsWith("CHECKOUT_ERROR:")) {
        return { error: e.message.slice("CHECKOUT_ERROR:".length) };
      }
      if (attempt >= 4 || (e as { code?: string })?.code !== "P2002") throw e;
    }
  }

  // Notifikasi: transaksi baru + cek stok menipis setelah stok berkurang.
  // Best-effort — kegagalan membuat notifikasi TIDAK boleh menggagalkan
  // transaksi yang sudah ter-commit (jika dilempar, kasir akan retry dan
  // transaksi dobel!).
  if (created) {
    try {
      await createNotification({
        ownerId,
        type: "SALE",
        title: `Transaksi baru ${invoiceNo}`,
        message: `${METHOD_LABEL[method] ?? method} · ${formatRupiah(total)}`,
        link: `/sales/${saleId}`,
      });
      await syncLowStockAlerts(ownerId, [...lines.keys()]);
    } catch {
      // Transaksi utama sudah commit; notifikasi tidak menggagalkan retry.
    }
  }

  revalidatePath("/");
  redirect(`/pos/success/${saleId}`);
}

async function generateInvoiceNo(ownerId: number) {
  const now = new Date();
  const ymd =
    now.getFullYear() + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
  const count = await prisma.sale.count({
    where: { ownerId, invoiceNo: { startsWith: `INV-${ymd}` } },
  });
  return `INV-${ymd}-${String(count + 1).padStart(4, "0")}`;
}


export async function saveProduct(data: {
  id?: number;
  sku: string;
  barcode?: string;
  name: string;
  image?: string | null;
  categoryId?: number | null;
  unitId?: number | null;
  costPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
}) {
  const ownerId = await requireOwnerId();

  // Validasi referensi FK: kategori & satuan harus milik akun ini, agar tidak
  // bisa menautkan data toko lain ke produk sendiri.
  if (data.categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: data.categoryId, ownerId } });
    if (!cat) return { error: "Kategori tidak ditemukan" };
  }
  if (data.unitId) {
    const unt = await prisma.unit.findFirst({ where: { id: data.unitId, ownerId } });
    if (!unt) return { error: "Satuan tidak ditemukan" };
  }

  // Foto produk: hanya terima data URL gambar; batasi ukurannya di server
  // sebagai pengaman terakhir (client sudah meresize).
  let image: string | null = null;
  if (data.image) {
    // Hanya data URL raster (JPEG/PNG/WebP) — menolak SVG dan tipe lain yang
    // bukan foto, sejalan dengan accept="image/*" dan resize di client.
    if (!/^data:image\/(jpeg|png|webp);base64,/i.test(data.image)) {
      return { error: "Format gambar tidak valid" };
    }
    if (data.image.length > MAX_IMAGE_LEN) return { error: "Ukuran gambar terlalu besar" };
    image = data.image;
  }

  const payload = {
    sku: data.sku,
    barcode: data.barcode || null,
    name: data.name,
    image,
    categoryId: data.categoryId || null,
    unitId: data.unitId || null,
    // Harga tidak boleh negatif — client bisa kirim -5000 melalui payload.
    costPrice: Math.max(Number(data.costPrice) || 0, 0),
    sellPrice: Math.max(Number(data.sellPrice) || 0, 0),
    minStock: Math.max(Number(data.minStock) || 0, 0),
  };

  if (data.id) {
    const owned = await prisma.product.findFirst({ where: { id: data.id, ownerId } });
    if (!owned) return { error: "Produk tidak ditemukan" };
    await prisma.product.update({ where: { id: data.id }, data: payload });
    try {
      await syncLowStockAlerts(ownerId, [data.id]);
    } catch {
      // best-effort
    }
  } else {
    const created = await prisma.product.create({ data: { ...payload, ownerId, stock: Math.max(Number(data.stock) || 0, 0) } });
    try {
      await syncLowStockAlerts(ownerId, [created.id]);
    } catch {
      // best-effort
    }
  }
  revalidatePath("/products");
}

export async function deleteProduct(id: number) {
  const ownerId = await requireOwnerId();
  // Produk yang sudah pernah terjual/dibeli TIDAK boleh dihapus (FK Restrict
  // di SaleItem/PurchaseItem). Cek dulu agar kasir dapat pesan jelas, bukan
  // error mentah dari database.
  const [sold, purchased] = await Promise.all([
    prisma.saleItem.count({ where: { productId: id, sale: { ownerId } } }),
    prisma.purchaseItem.count({ where: { productId: id, purchase: { ownerId } } }),
  ]);
  if (sold + purchased > 0) {
    return {
      error: `Produk sudah tercatat dalam ${sold + purchased} item transaksi sehingga tidak dapat dihapus. Nonaktifkan saja agar tidak muncul di kasir.`,
    };
  }
  try {
    await prisma.product.deleteMany({ where: { id, ownerId } });
  } catch (e) {
    // Race saat ini: transaksi masuk setelah cek di atas (TOCTOU) — tangkap
    // FK violation dan beri pesan yang sama alih-alih 500 mentah.
    if ((e as { code?: string })?.code === "P2003" || (e as { code?: string })?.code === "P2014") {
      return {
        error: "Produk sudah tercatat dalam transaksi sehingga tidak dapat dihapus. Nonaktifkan saja agar tidak muncul di kasir.",
      };
    }
    throw e;
  }
  revalidatePath("/products");
  revalidatePath("/stock");
}

export async function toggleProductActive(id: number, active: boolean) {
  const ownerId = await requireOwnerId();
  await prisma.product.updateMany({ where: { id, ownerId }, data: { active } });
  revalidatePath("/products");
}

export async function saveCategory(data: Record<string, unknown>) {
  const ownerId = await requireOwnerId();
  const id = data.id ? Number(data.id) : undefined;
  const name = String(data.name ?? "");
  if (id) {
    const owned = await prisma.category.findFirst({ where: { id, ownerId } });
    if (!owned) return { error: "Kategori tidak ditemukan" };
    await prisma.category.update({ where: { id }, data: { name } });
  } else {
    await prisma.category.create({ data: { name, ownerId } });
  }
  revalidatePath("/categories");
}

export async function deleteCategory(id: number) {
  const ownerId = await requireOwnerId();
  await prisma.category.deleteMany({ where: { id, ownerId } });
  revalidatePath("/categories");
}

export async function saveUnit(data: Record<string, unknown>) {
  const ownerId = await requireOwnerId();
  const id = data.id ? Number(data.id) : undefined;
  const name = String(data.name ?? "");
  const short = String(data.short ?? "");
  if (id) {
    const owned = await prisma.unit.findFirst({ where: { id, ownerId } });
    if (!owned) return { error: "Satuan tidak ditemukan" };
    await prisma.unit.update({ where: { id }, data: { name, short } });
  } else {
    await prisma.unit.create({ data: { name, short, ownerId } });
  }
  revalidatePath("/units");
}

export async function deleteUnit(id: number) {
  const ownerId = await requireOwnerId();
  await prisma.unit.deleteMany({ where: { id, ownerId } });
  revalidatePath("/units");
}

export async function saveSupplier(data: Record<string, unknown>) {
  const ownerId = await requireOwnerId();
  const id = data.id ? Number(data.id) : undefined;
  const name = String(data.name ?? "");
  const phone = data.phone ? String(data.phone) : null;
  const address = data.address ? String(data.address) : null;
  const payload = { name, phone, address };
  if (id) {
    const owned = await prisma.supplier.findFirst({ where: { id, ownerId } });
    if (!owned) return { error: "Supplier tidak ditemukan" };
    await prisma.supplier.update({ where: { id }, data: payload });
  } else {
    await prisma.supplier.create({ data: { ...payload, ownerId } });
  }
  revalidatePath("/suppliers");
}

export async function deleteSupplier(id: number) {
  const ownerId = await requireOwnerId();
  await prisma.supplier.deleteMany({ where: { id, ownerId } });
  revalidatePath("/suppliers");
}

export async function saveCustomer(data: { id?: number; name: string; phone?: string; email?: string; address?: string; isMember: boolean }) {
  const ownerId = await requireOwnerId();
  const payload = { name: data.name, phone: data.phone || null, email: data.email || null, address: data.address || null, isMember: data.isMember };
  if (data.id) {
    const owned = await prisma.customer.findFirst({ where: { id: data.id, ownerId } });
    if (!owned) return { error: "Pelanggan tidak ditemukan" };
    await prisma.customer.update({ where: { id: data.id }, data: payload });
  } else {
    await prisma.customer.create({ data: { ...payload, ownerId } });
  }
  revalidatePath("/customers");
}

export async function deleteCustomer(id: number) {
  const ownerId = await requireOwnerId();
  await prisma.customer.deleteMany({ where: { id, ownerId } });
  revalidatePath("/customers");
}

export async function adjustStock(productId: number, qty: number, note: string) {
  const ownerId = await requireOwnerId();
  if (!Number.isInteger(productId) || !Number.isInteger(qty)) {
    return { error: "Jumlah penyesuaian harus bilangan bulat" };
  }
  if (qty === 0) return { error: "Jumlah penyesuaian tidak boleh 0" };

  return await prisma.$transaction(async (tx) => {
    const current = await tx.product.findFirst({ where: { id: productId, ownerId } });
    if (!current) return { error: "Produk tidak ditemukan" };

    // Catat delta yang BENAR-BENAR diterapkan (stok tidak boleh negatif).
    // Karena perhitungan & penulisan ada dalam satu transaksi, penyesuaian
    // yang berjalan bersamaan tidak lagi saling menimpa.
    if (qty < 0) {
      const updated = await tx.product.updateMany({
        where: { id: productId, ownerId, stock: { gte: -qty } },
        data: { stock: { increment: qty } },
      });
      if (updated.count === 0) {
        if (current.stock === 0) return { error: "Stok sudah 0. Tidak bisa dikurangi lagi" };
        const applied = -current.stock;
        await tx.product.update({ where: { id: productId }, data: { stock: 0 } });
        await tx.stockMovement.create({ data: { productId, type: "ADJUST", qty: applied, note, userId: ownerId } });
      } else {
        await tx.stockMovement.create({ data: { productId, type: "ADJUST", qty, note, userId: ownerId } });
      }
    } else {
      await tx.product.updateMany({ where: { id: productId, ownerId }, data: { stock: { increment: qty } } });
      await tx.stockMovement.create({ data: { productId, type: "ADJUST", qty, note, userId: ownerId } });
    }
  }).then(async () => {
    try {
      await syncLowStockAlerts(ownerId, [productId]);
    } catch {
      // best-effort
    }
    revalidatePath("/stock");
    revalidatePath("/products");
    return null;
  });
}

export async function createPurchase(data: { supplierId?: number | null; note?: string; items: { productId: number; qty: number; cost: number }[] }) {
  const ownerId = await requireOwnerId();
  if (!data.items.length) return { error: "Minimal satu item" };

  // Validasi item milik akun ini dulu (jangan izinkan mengubah produk toko lain).
  const products = new Map<number, number>();
  for (const i of data.items) {
    if (!Number.isInteger(i.productId) || !Number.isInteger(i.qty) || i.qty <= 0) return { error: "Jumlah item tidak valid" };
    if (!Number.isFinite(i.cost) || i.cost < 0) return { error: "Harga beli tidak valid" };
    const p = await prisma.product.findFirst({ where: { id: i.productId, ownerId } });
    if (!p) return { error: `Produk tidak ditemukan: ${i.productId}` };
    products.set(i.productId, i.cost);
  }

  // Supplier juga harus milik akun ini.
  const supplierId = data.supplierId || null;
  if (supplierId) {
    const sup = await prisma.supplier.findFirst({ where: { id: supplierId, ownerId } });
    if (!sup) return { error: "Supplier tidak ditemukan" };
  }

  const total = data.items.reduce((s, i) => s + i.qty * i.cost, 0);
  await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        supplierId,
        ownerId,
        userId: ownerId,
        note: data.note || "",
        total,
        items: {
          create: data.items.map((i) => ({ productId: i.productId, qty: i.qty, cost: i.cost })),
        },
      },
    });
    for (const i of data.items) {
      await tx.product.updateMany({
        where: { id: i.productId, ownerId },
        data: { stock: { increment: i.qty }, costPrice: i.cost },
      });
      await tx.stockMovement.create({
        data: { productId: i.productId, type: "IN", qty: i.qty, note: "Pembelian", userId: ownerId, purchaseId: purchase.id },
      });
    }
  });

  // Notifikasi: pembelian baru + alert stok menipis otomatis ter-resolve.
  try {
    await createNotification({
      ownerId,
      type: "PURCHASE",
      title: "Pembelian baru",
      message: `${data.items.length} item · ${formatRupiah(total)}`,
      link: "/purchases",
    });
    await syncLowStockAlerts(ownerId, data.items.map((i) => i.productId));
  } catch {
    // best-effort — pembelian sudah ter-commit
  }
  revalidatePath("/purchases");
  revalidatePath("/stock");
}

export async function saveExpense(data: { id?: number; amount: number; note: string }) {
  const ownerId = await requireOwnerId();
  if (!Number.isFinite(data.amount) || data.amount < 0) {
    return { error: "Jumlah pengeluaran tidak valid" };
  }
  if (data.id) {
    const owned = await prisma.expense.findFirst({ where: { id: data.id, ownerId } });
    if (!owned) return { error: "Pengeluaran tidak ditemukan" };
    await prisma.expense.update({ where: { id: data.id }, data: { amount: data.amount, note: data.note } });
  } else {
    await prisma.expense.create({ data: { amount: data.amount, note: data.note, ownerId, userId: ownerId } });
  }
  revalidatePath("/expenses");
}

export async function deleteExpense(id: number) {
  const ownerId = await requireOwnerId();
  await prisma.expense.deleteMany({ where: { id, ownerId } });
  revalidatePath("/expenses");
}

export async function saveSettings(data: {
  storeName: string;
  address: string;
  phone: string;
  receiptTitle: string;
  receiptFooter: string;
  taxRate: number;
  pointsPer10k: number;
  qrisStatic?: string;
  notifyStock?: boolean;
  notifySale?: boolean;
  notifyPurchase?: boolean;
}) {
  const ownerId = await requireOwnerId();

  // QRIS statis: wajib string QRIS valid bila diisi (dikonversi jadi dinamis
  // per transaksi di POS).
  let qrisStatic: string | null = null;
  const rawQris = (data.qrisStatic ?? "").trim();
  if (rawQris) {
    const v = validateQRIS(rawQris);
    if (!v.valid) return { error: "QRIS statis tidak valid: " + (v.errors[0] ?? "") };
    qrisStatic = rawQris;
  }

  // Baca nilai preferensi LAMA dulu — untuk mendeteksi transisi toggle
  // (mis. notifikasi stok dinyalakan kembali) setelah upsert di bawah.
  const prevSetting = await prisma.setting.findUnique({
    where: { ownerId },
    select: { notifyStock: true, notifySale: true, notifyPurchase: true },
  });

  await prisma.setting.upsert({
    where: { ownerId },
    update: {
      storeName: data.storeName,
      address: data.address,
      phone: data.phone,
      receiptTitle: data.receiptTitle,
      receiptFooter: data.receiptFooter,
      // Pajak dibatasi 0–100% dan poin tidak boleh negatif.
      taxRate: Math.min(Math.max(Number(data.taxRate) || 0, 0), 100),
      pointsPer10k: Math.max(Number(data.pointsPer10k) || 0, 0),
      qrisStatic,
      notifyStock: data.notifyStock ?? true,
      notifySale: data.notifySale ?? true,
      notifyPurchase: data.notifyPurchase ?? true,
    },
    create: {
      ownerId,
      storeName: data.storeName,
      address: data.address,
      phone: data.phone,
      receiptTitle: data.receiptTitle,
      receiptFooter: data.receiptFooter,
      taxRate: Math.min(Math.max(Number(data.taxRate) || 0, 0), 100),
      pointsPer10k: Math.max(Number(data.pointsPer10k) || 0, 0),
      qrisStatic,
      notifyStock: data.notifyStock ?? true,
      notifySale: data.notifySale ?? true,
      notifyPurchase: data.notifyPurchase ?? true,
    },
  });

  // Tipe yang dimatikan: hapus notifikasi lama tipe tsb agar panel benar-benar
  // bersih — bukan hanya berhenti membuat yang baru.
  const typesToClean: NotificationType[] = [];
  if (data.notifyStock === false) typesToClean.push("STOCK");
  if (data.notifySale === false) typesToClean.push("SALE");
  if (data.notifyPurchase === false) typesToClean.push("PURCHASE");
  if (typesToClean.length) {
    try {
      await prisma.notification.deleteMany({ where: { ownerId, type: { in: typesToClean } } });
    } catch {
      // best-effort — pengaturan sudah tersimpan; pembersihan panel tidak
      // boleh membuat penyimpanan terlihat gagal.
    }
  }

  // Toggle stok dinyalakan KEMBALI (transisi false → true): buat ulang alert
  // stok menipis untuk semua produk yang masih di bawah minimum — alert lama
  // sudah terhapus saat toggle dimatikan, dan syncLowStockAlerts bersifat
  // idempoten (dedupe via unique (ownerId, type, refId)), aman dipanggil kapan
  // pun. SALE/PURCHASE tidak dibuat ulang karena kejadian lampau tidak bisa
  // direkonstruksi dari kondisi stok.
  // (data.notifyStock ?? true) dipakai agar kondisi sama dengan nilai yang
  // benar-benar disimpan di upsert di atas.
  if ((data.notifyStock ?? true) && prevSetting?.notifyStock === false) {
    try {
      await syncLowStockAlerts(ownerId);
    } catch {
      // best-effort — pengaturan sudah tersimpan
    }
  }
  revalidatePath("/settings");
}

export async function saveUser(data: { id?: number; name: string; email: string; role: string; active: boolean; password?: string }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Akses ditolak" };

  // Aturan aplikasi: 1 akun = 1 toko, role toko hanya KASIR. ADMIN adalah akun
  // developer (satu-satunya) — tidak ada role lain yang boleh diberi ADMIN.
  const isSelf = data.id === Number(session.user.id);
  const role: "ADMIN" | "KASIR" = isSelf && data.role === "ADMIN" ? "ADMIN" : "KASIR";
  // Normalisasi email agar konsisten dengan lookup login (lowercase).
  const email = data.email.trim().toLowerCase();

  try {
    if (data.id) {
      if (isSelf && role !== "ADMIN") return { error: "Tidak dapat mengubah role akun sendiri" };
      if (isSelf && !data.active) return { error: "Tidak dapat menonaktifkan akun sendiri" };
      const payload: { name: string; email: string; role: "ADMIN" | "KASIR"; active: boolean; password?: string } = {
        name: data.name,
        email,
        role,
        active: data.active,
      };
      if (data.password) payload.password = await bcrypt.hash(data.password, 10);
      await prisma.user.update({ where: { id: data.id }, data: payload });
    } else {
      if (!data.password) return { error: "Password wajib diisi" };
      const password = data.password;
      // Akun baru = toko baru: langsung buat pengaturan default agar struk & pajak
      // tidak kosong saat akun dipakai pertama kali.
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: data.name,
            email,
            password: await bcrypt.hash(password, 10),
            role,
            active: data.active,
          },
        });
        await tx.setting.create({
          data: {
            ownerId: user.id,
            storeName: `Toko ${data.name}`,
            address: "",
            phone: "",
            receiptTitle: "STRUK PENJUALAN",
            receiptFooter: "Terima kasih atas kunjungan Anda",
            taxRate: 0,
            pointsPer10k: 1,
          },
        });
        // Selamat datang: akun baru mendapat notifikasi pertama agar tahu bahwa
        // pengaturan toko perlu dilengkapi.
        await tx.notification.create({
          data: {
            ownerId: user.id,
            type: "SYSTEM",
            title: "Selamat datang di Aplikasi Kasir 🎉",
            message: "Lengkapi pengaturan toko Anda (nama toko, pajak, QRIS) agar struk tercetak benar.",
            link: "/settings",
          },
        });
      });
    }
  } catch (e) {
    // Email duplikat → pesan jelas, bukan 500 mentah.
    if ((e as { code?: string })?.code === "P2002") {
      return { error: "Email sudah terdaftar" };
    }
    throw e;
  }
  revalidatePath("/users");
}

export async function deleteUser(id: number) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Akses ditolak" };
  if (id === Number(session.user.id)) return { error: "Tidak dapat menghapus akun sendiri" };
  // onDelete: Cascade — menghapus akun berarti menghapus seluruh data tokonya.
  await prisma.user.delete({ where: { id } });
  revalidatePath("/users");
}
