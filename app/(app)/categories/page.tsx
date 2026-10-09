import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SimpleCrud } from "@/components/simple-crud";
import { GuideDialog } from "@/components/guide-dialog";
import { saveCategory, deleteCategory } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kategori" };

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const rows = await prisma.category.findMany({
    where: { ownerId: Number(session.user.id) },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  // Konsekuensi hapus: produk di kategori ini kehilangan kategorinya (SetNull).
  const consequences = Object.fromEntries(
    rows.filter((c) => c._count.products > 0).map((c) => [c.id, {
      chip: `${c._count.products} produk`,
      message: `${c._count.products} produk akan kehilangan kategorinya (menjadi "tanpa kategori").`,
    }])
  );
  return (
    <SimpleCrud
      title="Kategori"
      subtitle="Kelola kategori produk"
      fields={[{ key: "name", label: "Nama Kategori" }]}
      rows={rows}
      onSave={saveCategory}
      onDelete={deleteCategory}
      searchKey="name"
      consequences={consequences}
      headerAction={<GuideDialog variant="chip" initialCategory="categories" />}
    />
  );
}
