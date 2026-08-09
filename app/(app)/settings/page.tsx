import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const setting = await prisma.setting.findUnique({ where: { ownerId } });
  // Jumlah notifikasi lama per tipe — dipakai untuk konfirmasi saat kasir
  // mematikan toggle (notif lama akan ikut terhapus saat pengaturan disimpan).
  const [stockCount, saleCount, purchaseCount] = await Promise.all([
    prisma.notification.count({ where: { ownerId, type: "STOCK" } }),
    prisma.notification.count({ where: { ownerId, type: "SALE" } }),
    prisma.notification.count({ where: { ownerId, type: "PURCHASE" } }),
  ]);
  return (
    <SettingsForm
      hasSettings={!!setting}
      oldNotifyCounts={{ stock: stockCount, sale: saleCount, purchase: purchaseCount }}
      initial={{
        storeName: setting?.storeName ?? "",
        address: setting?.address ?? "",
        phone: setting?.phone ?? "",
        receiptTitle: setting?.receiptTitle ?? "",
        receiptFooter: setting?.receiptFooter ?? "",
        taxRate: setting?.taxRate ?? 0,
        pointsPer10k: setting?.pointsPer10k ?? 1,
        qrisStatic: setting?.qrisStatic ?? "",
        notifyStock: setting?.notifyStock ?? true,
        notifySale: setting?.notifySale ?? true,
        notifyPurchase: setting?.notifyPurchase ?? true,
      }}
    />
  );
}