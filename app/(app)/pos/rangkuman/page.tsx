import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SummaryClient from "@/components/pos/summary";

export const metadata = { title: "Rangkuman Pesanan" };

export default async function SummaryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const [customers, setting, products] = await Promise.all([
    prisma.customer.findMany({ where: { ownerId }, orderBy: { name: "asc" } }),
    prisma.setting.findUnique({ where: { ownerId } }),
    prisma.product.findMany({ where: { ownerId, active: true }, select: { id: true, name: true, sellPrice: true, stock: true, unit: { select: { short: true } } } }),
  ]);

  return (
    <SummaryClient
      key={ownerId}
      ownerId={ownerId}
      products={products.map((p) => ({ id: p.id, name: p.name, price: p.sellPrice, stock: p.stock, unit: p.unit?.short ?? "" }))}
      customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, points: c.points, isMember: c.isMember }))}
      setting={{
        taxRate: setting?.taxRate ?? 0,
        pointsPer10k: setting?.pointsPer10k ?? 1,
        storeName: setting?.storeName ?? "",
        address: setting?.address ?? "",
        phone: setting?.phone ?? "",
        receiptTitle: setting?.receiptTitle ?? "",
        receiptFooter: setting?.receiptFooter ?? "",
        qrisStatic: setting?.qrisStatic ?? "",
      }}
    />
  );
}
