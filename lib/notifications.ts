import { prisma } from "@/lib/db";

// Notifikasi in-app milik akun (ownerId). Semua akses DB, tanpa auth — pemanggil
// (server action / route API) yang memastikan ownerId berasal dari sesi login.
export type NotifType = "STOCK" | "SALE" | "PURCHASE" | "SYSTEM";

// Tipe yang bisa dimatikan pengguna di Pengaturan. SYSTEM (selamat datang,
// dll.) selalu aktif.
type ToggleableType = Exclude<NotifType, "SYSTEM">;
const NOTIF_PREF_KEY: Record<ToggleableType, "notifyStock" | "notifySale" | "notifyPurchase"> = {
  STOCK: "notifyStock",
  SALE: "notifySale",
  PURCHASE: "notifyPurchase",
};

// Cek preferensi akun untuk tipe notifikasi (baca pengaturan sekali, cache
// per request via WeakMap tidak diperlukan — dipanggil jarang).
async function isTypeEnabled(ownerId: number, type: NotifType): Promise<boolean> {
  if (type === "SYSTEM") return true;
  const setting = await prisma.setting.findUnique({
    where: { ownerId },
    select: { notifyStock: true, notifySale: true, notifyPurchase: true },
  });
  // Akun tanpa pengaturan tersimpan = default aktif semua.
  if (!setting) return true;
  return setting[NOTIF_PREF_KEY[type as ToggleableType]];
}

export async function createNotification(data: {
  ownerId: number;
  type: NotifType;
  title: string;
  message: string;
  link?: string;
  refId?: number;
}) {
  if (!(await isTypeEnabled(data.ownerId, data.type))) return;
  await prisma.notification.create({
    data: {
      ownerId: data.ownerId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link ?? null,
      refId: data.refId ?? null,
    },
  });
}

// Sinkronisasi alert stok. Alur episodik agar tidak ada duplikat dan tidak
// "muncul lagi" setelah dibaca:
//  1. Produk di bawah minimum & BELUM punya alert (read apa pun) → buat baru.
//  2. Sudah punya alert → jangan buat ulang, jangan reset read (unik per produk
//     via (ownerId, type, refId); create melempar P2002 → diabaikan).
//  3. Stok direstok di atas minimum → alert lama DIHAPUS, sehingga episode
//     menipis berikutnya menghasilkan alert baru yang sah.
export async function syncLowStockAlerts(ownerId: number, productIds?: number[]) {
  // Akun mematikan notifikasi stok → tidak ada alert baru. Catatan: early
  // return ini juga melewati resolusi (hapus) alert lama saat produk direstok —
  // dapat diterima karena pengguna memang tidak ingin diganggu alert stok;
  // alert lama tetap tampil sampai ditandai dibaca/dihapus manual.
  if (!(await isTypeEnabled(ownerId, "STOCK"))) return;

    // Produk di bawah minimum (dibatasi ke productIds bila diberikan — polling
  // GET /api/notifications tidak membatasi, memanggil sync penuh).
  const low = await prisma.product.findMany({
    where: {
      ownerId,
      active: true,
      stock: { lte: prisma.product.fields.minStock },
      ...(productIds ? { id: { in: productIds } } : {}),
    },
    select: { id: true, name: true, stock: true },
  });
  const lowIds = new Set(low.map((p) => p.id));

  // Produk yang kini di atas minimum: hapus alert lama (episode selesai).
  if (productIds) {
    const resolved = productIds.filter((id) => !lowIds.has(id));
    if (resolved.length) {
      await prisma.notification.deleteMany({
        where: { ownerId, type: "STOCK", refId: { in: resolved } },
      });
    }
  }

  for (const p of low) {
    if (productIds && !productIds.includes(p.id)) continue;
    const habis = p.stock === 0;
    const title = habis ? `Stok habis: ${p.name}` : `Stok menipis: ${p.name}`;
    const message = habis
      ? `Stok ${p.name} habis. Segera lakukan pembelian.`
      : `Sisa ${p.stock} unit. Segera lakukan pembelian ulang.`;

    const existing = await prisma.notification.findFirst({
      where: { ownerId, type: "STOCK", refId: p.id },
      select: { id: true, title: true, message: true },
    });
    if (existing) {
      // Alert sudah ada → update in-place HANYA jika konten berubah
      // (mis. menipis → habis, atau jumlah stok berubah). Status read TIDAK
      // di-reset agar alert yang sudah dibaca tidak "muncul lagi".
      if (existing.title !== title || existing.message !== message) {
        await prisma.notification.update({
          where: { id: existing.id },
          data: { title, message, createdAt: new Date() },
        });
      }
      continue;
    }

    try {
      await prisma.notification.create({
        data: { ownerId, type: "STOCK", refId: p.id, title, message, link: "/stock", read: false },
      });
    } catch (e) {
      // Race dengan poller lain: alert baru saja dibuat — abaikan.
      if ((e as { code?: string })?.code !== "P2002") throw e;
    }
  }
}
