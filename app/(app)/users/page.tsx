import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import UsersPage from "@/components/users";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengguna" };

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Menu Pengguna hanya untuk ADMIN (menambah akun kasir/admin baru).
  if (session.user.role !== "ADMIN") redirect("/");
  const users = await prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, active: true } });
  // Jumlah data toko per akun — konsekuensi hapus akun (cascade seluruh data).
  const [prodGroup, saleGroup, purchaseGroup] = await Promise.all([
    prisma.product.groupBy({ by: ["ownerId"], _count: true }),
    prisma.sale.groupBy({ by: ["ownerId"], _count: true }),
    prisma.purchase.groupBy({ by: ["ownerId"], _count: true }),
  ]);
  const dataCounts: Record<number, { products: number; sales: number; purchases: number }> = {};
  for (const g of prodGroup) dataCounts[g.ownerId] = { ...dataCounts[g.ownerId], products: g._count };
  for (const g of saleGroup) dataCounts[g.ownerId] = { ...dataCounts[g.ownerId], sales: g._count };
  for (const g of purchaseGroup) dataCounts[g.ownerId] = { ...dataCounts[g.ownerId], purchases: g._count };
  return <UsersPage users={users} currentUserId={Number(session.user.id)} dataCounts={dataCounts} />;
}
