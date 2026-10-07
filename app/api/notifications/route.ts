import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncLowStockAlerts } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/notifications — daftar notifikasi terbaru + jumlah belum dibaca.
// Dipanggil komponen bel (polling 30 detik) dan saat panel dibuka.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = Number(session.user.id);

  // Sinkronisasi idempoten: produk yang sudah di bawah minimum sejak awal
  // (mis. hasil seed/import) mendapat alert stok tanpa perlu menunggu aksi.
  // Dedupe di syncLowStockAlerts mencegah duplikat; aman dipanggil tiap poll.
  await syncLowStockAlerts(ownerId);

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({ where: { ownerId, read: false } }),
  ]);

  return NextResponse.json({
    unread,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

// POST /api/notifications — tandai dibaca.
// Body: { action: "read", id } | { action: "readAll" }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = Number(session.user.id);

  const body = (await req.json().catch(() => null)) as { action?: string; id?: number } | null;
  const action = body?.action;
  const id = Number(body?.id);

  if (action === "read" && Number.isInteger(id) && id > 0) {
    // Hanya notifikasi milik akun ini yang boleh ditandai.
    await prisma.notification.updateMany({ where: { id, ownerId }, data: { read: true } });
  } else if (action === "readAll") {
    await prisma.notification.updateMany({ where: { ownerId, read: false }, data: { read: true } });
  } else {
    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  }

  const unread = await prisma.notification.count({ where: { ownerId, read: false } });
  return NextResponse.json({ ok: true, unread });
}
