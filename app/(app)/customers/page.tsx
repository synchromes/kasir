import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CustomersPage from "@/components/customers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pelanggan" };

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const customers = await prisma.customer.findMany({ where: { ownerId: Number(session.user.id) }, orderBy: { name: "asc" } });
  // Jumlah transaksi per pelanggan — konsekuensi hapus (transaksi tetap ada,
  // hanya referensi pelanggan hilang/SetNull).
  const saleGroup = await prisma.sale.groupBy({
    by: ["customerId"],
    where: { ownerId: Number(session.user.id), customerId: { not: null } },
    _count: true,
  });
  const saleCounts = Object.fromEntries(saleGroup.map((g) => [g.customerId!, g._count]));
  return <CustomersPage customers={customers} saleCounts={saleCounts} />;
}
