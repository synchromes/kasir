import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NotificationsList } from "@/components/notifications-list";
import { GuideDialog } from "@/components/guide-dialog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifikasi" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count({ where: { ownerId, read: false } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">Notifikasi</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Aktivitas transaksi, pembelian, dan peringatan stok toko Anda.
          </p>
        </div>
        <GuideDialog variant="chip" initialCategory="notifications" />
      </div>
      <NotificationsList
        initial={items.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
        }))}
        initialUnread={unread}
      />
    </div>
  );
}
