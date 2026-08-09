import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import POSClient from "@/components/pos/pos";

export const metadata = { title: "Kasir" };

export default async function POSPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const [products, customers, setting] = await Promise.all([
    prisma.product.findMany({
      where: { ownerId, active: true },
      include: { unit: true, category: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({ where: { ownerId }, orderBy: { name: "asc" } }),
    prisma.setting.findUnique({ where: { ownerId } }),
  ]);

  return (
    <POSClient
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        image: p.image,
        price: p.sellPrice,
        stock: p.stock,
        unit: p.unit?.short ?? "",
        category: p.category?.name ?? "",
      }))}
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