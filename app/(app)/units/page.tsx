import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SimpleCrud } from "@/components/simple-crud";
import { saveUnit, deleteUnit } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const rows = await prisma.unit.findMany({
    where: { ownerId: Number(session.user.id) },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  // Konsekuensi hapus: produk yang memakai satuan ini kehilangan satuannya (SetNull).
  const consequences = Object.fromEntries(
    rows.filter((u) => u._count.products > 0).map((u) => [u.id, {
      chip: `${u._count.products} produk`,
      message: `${u._count.products} produk akan kehilangan satuannya (menjadi tanpa satuan).`,
    }])
  );
  return (
    <SimpleCrud
      title="Satuan"
      subtitle="Kelola satuan produk"
      fields={[
        { key: "name", label: "Nama Satuan" },
        { key: "short", label: "Singkatan" },
      ]}
      rows={rows}
      onSave={saveUnit}
      onDelete={deleteUnit}
      searchKey="name"
      consequences={consequences}
    />
  );
}