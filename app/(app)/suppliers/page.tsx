import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SimpleCrud } from "@/components/simple-crud";
import { GuideDialog } from "@/components/guide-dialog";
import { saveSupplier, deleteSupplier } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supplier" };

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const rows = await prisma.supplier.findMany({
    where: { ownerId: Number(session.user.id) },
    orderBy: { name: "asc" },
    include: { _count: { select: { purchases: true } } },
  });
  // Konsekuensi hapus: pembelian dari supplier ini kehilangan referensinya (SetNull).
  const consequences = Object.fromEntries(
    rows.filter((s) => s._count.purchases > 0).map((s) => [s.id, {
      chip: `${s._count.purchases} pembelian`,
      message: `${s._count.purchases} pembelian akan kehilangan data supplier ini (tetap tersimpan, hanya nama supplier hilang).`,
    }])
  );
  return (
    <SimpleCrud
      title="Supplier"
      subtitle="Kelola pemasok barang"
      fields={[
        { key: "name", label: "Nama Supplier" },
        { key: "phone", label: "Telepon" },
        { key: "address", label: "Alamat" },
      ]}
      rows={rows}
      onSave={saveSupplier}
      onDelete={deleteSupplier}
      searchKey="name"
      consequences={consequences}
      headerAction={<GuideDialog variant="chip" initialCategory="purchases" />}
    />
  );
}
