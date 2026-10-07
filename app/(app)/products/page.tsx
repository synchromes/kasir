import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import { Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { Package } from "lucide-react";
import { ProductForm } from "@/components/product-form";
import { DeleteProductButton, ToggleActiveButton } from "@/components/product-actions";
import { GuideDialog } from "@/components/guide-dialog";
import { TablePagination } from "@/components/table-pagination";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PER_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PER = 20;
const statusLabel = { ok: "Tersedia", low: "Stok Rendah", out: "Habis" } as const;
type StatusKey = keyof typeof statusLabel;

function stockStatus(stock: number, minStock: number): StatusKey {
  if (stock <= 0) return "out";
  if (stock <= minStock) return "low";
  return "ok";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; low?: string; category?: string; status?: string; page?: string; per?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const sp = await searchParams;
  const q = sp.q;
  const categoryId = sp.category ? Number(sp.category) : null;
  const status: StatusKey | "all" = sp.status === "ok" || sp.status === "low" || sp.status === "out" ? sp.status : "all";
  const perRaw = Number(sp.per);
  const per = PER_OPTIONS.includes(perRaw) ? perRaw : DEFAULT_PER;
  const pageNumRaw = Math.max(1, Number(sp.page) || 1);
  const minStockRef = prisma.product.fields.minStock;
  const where = {
    ownerId,
    ...(q ? { name: { contains: q } } : {}),
    ...(categoryId && !Number.isNaN(categoryId) ? { categoryId } : {}),
    ...(status === "low" ? { stock: { gt: 0, lte: minStockRef } } : {}),
    ...(status === "out" ? { stock: 0 } : {}),
    ...(status === "ok" ? { stock: { gt: minStockRef } } : {}),
  };

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / per));
  const pageNum = Math.min(pageNumRaw, totalPages);

  const [products, categories, units] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, unit: true },
      orderBy: { name: "asc" },
      skip: (pageNum - 1) * per,
      take: per,
    }),
    prisma.category.findMany({ where: { ownerId }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { ownerId }, orderBy: { name: "asc" } }),
  ]);

  // Konsekuensi hapus per produk (untuk chip konfirmasi di tombol hapus):
  // riwayat transaksi (penjualan+pembelian — produk ini TIDAK bisa dihapus)
  // dan riwayat pergerakan stok (ikut terhapus saat produk dihapus).
  const pageIds = products.map((p) => p.id);
  const [saleCounts, purchaseCounts, movementCounts] = pageIds.length
    ? await Promise.all([
        prisma.saleItem.groupBy({ by: ["productId"], where: { productId: { in: pageIds } }, _count: true }),
        prisma.purchaseItem.groupBy({ by: ["productId"], where: { productId: { in: pageIds } }, _count: true }),
        prisma.stockMovement.groupBy({ by: ["productId"], where: { productId: { in: pageIds } }, _count: true }),
      ])
    : [[], [], []];
  const historyCounts = new Map<number, number>();
  const movementCountsMap = new Map<number, number>();
  for (const g of saleCounts) historyCounts.set(g.productId, (historyCounts.get(g.productId) ?? 0) + g._count);
  for (const g of purchaseCounts) historyCounts.set(g.productId, (historyCounts.get(g.productId) ?? 0) + g._count);
  for (const g of movementCounts) movementCountsMap.set(g.productId, g._count);

  const csvRows = [
    ["SKU", "Nama Produk", "Kategori", "Harga Beli", "Harga Jual", "Stok", "Stok Minimum", "Status"],
    ...products.map((p) => [
      p.sku,
      p.name,
      p.category?.name ?? "-",
      String(p.costPrice),
      String(p.sellPrice),
      String(p.stock),
      String(p.minStock),
      statusLabel[stockStatus(p.stock, p.minStock)],
    ]),
  ];
  const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const csvBlob = encodeURIComponent("\ufeff" + csv);

  return (
    <div className="space-y-5">
      {/* Header & actions */}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Manajemen Inventaris</h1>
          <p className="text-sm text-on-surface-variant">Kelola tingkat stok, harga, dan detail produk.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`data:text/csv;charset=utf-8,${csvBlob}`}
            download="inventaris.csv"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-4 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <Download className="h-4 w-4" />
            Ekspor CSV
          </a>
          <ProductForm categories={categories} units={units} />
          <GuideDialog variant="chip" initialCategory="products" />
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
        <form className="flex flex-col gap-3 md:flex-row md:items-end" action="/products">
          <input type="hidden" name="per" value={per} />
          <div className="flex-1">
            <label htmlFor="products-search" className="mb-1 block text-xs font-semibold text-on-surface-variant">Cari Produk</label>
            <Input id="products-search" name="q" defaultValue={q} placeholder="Cari berdasarkan nama atau SKU..." className="h-11 bg-surface" />
          </div>
          <div className="w-full md:w-52">
            <label htmlFor="products-category" className="mb-1 block text-xs font-semibold text-on-surface-variant">Kategori</label>
            <select
              id="products-category" name="category"
              defaultValue={sp.category ?? ""}
              className="h-11 w-full cursor-pointer rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-52">
            <label htmlFor="products-status" className="mb-1 block text-xs font-semibold text-on-surface-variant">Status Stok</label>
            <select
              id="products-status" name="status"
              defaultValue={status === "all" ? "" : status}
              className="h-11 w-full cursor-pointer rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Semua Status</option>
              <option value="ok">Tersedia</option>
              <option value="low">Stok Rendah</option>
              <option value="out">Habis</option>
            </select>
          </div>
          <Button type="submit" className="h-11 px-6">Terapkan</Button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nama Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Level Stok</TableHead>
                <TableHead className="text-right">Harga Jual</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const st = stockStatus(p.stock, p.minStock);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-on-surface-variant">{p.sku}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element -- data URL base64, tidak bisa dioptimasi next/image */
                          <img src={p.image} alt={p.name} className="h-10 w-10 shrink-0 rounded-lg border border-outline-variant object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
                            <Package className="h-5 w-5" />
                          </span>
                        )}
                        <span className="truncate">{p.name}</span>
                        {!p.active && (
                          <Badge variant="outline" className="shrink-0">nonaktif</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-on-surface-variant">{p.category?.name ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <span className={cn(st === "out" && "font-bold text-destructive")}>
                        {p.stock} {p.unit?.short ?? ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{formatRupiah(p.sellPrice)}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold",
                           st === "ok" && "bg-secondary-container text-on-secondary-container",
                          st === "low" && "bg-tertiary-fixed text-on-tertiary-fixed",
                          st === "out" && "bg-destructive-container text-on-destructive-container"
                        )}
                      >
                        {statusLabel[st]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ProductForm
                          key={p.id}
                          categories={categories}
                          units={units}
                          product={{
                            id: p.id,
                            sku: p.sku,
                            barcode: p.barcode,
                            name: p.name,
                            image: p.image,
                            categoryId: p.categoryId,
                            unitId: p.unitId,
                            costPrice: p.costPrice,
                            sellPrice: p.sellPrice,
                            stock: p.stock,
                            minStock: p.minStock,
                          }}
                          triggerLabel="Edit"
                          triggerVariant="outline"
                          triggerSize="sm"
                        />
                        <ToggleActiveButton id={p.id} active={p.active} />
                        <DeleteProductButton
                          id={p.id}
                          name={p.name}
                          historyCount={historyCounts.get(p.id) ?? 0}
                          movementCount={movementCountsMap.get(p.id) ?? 0}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-on-surface-variant">
                    Tidak ada produk yang cocok dengan filter
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        <TablePagination total={total} page={pageNum} per={per} unit="item" />
      </div>
    </div>
  );
}
