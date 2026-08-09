import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate, formatRupiah, formatNumber } from "@/lib/utils";
import { Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { TablePagination } from "@/components/table-pagination";
import { AdjustStockDialog } from "@/components/adjust-stock";
import { GuideDialog } from "@/components/guide-dialog";
import { Package, Warehouse, CircleDollarSign, AlertTriangle, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PER_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PER = 20;

type StockState = "ok" | "low" | "out";

function stockState(stock: number, minStock: number): StockState {
  if (stock <= 0) return "out";
  if (stock <= minStock) return "low";
  return "ok";
}

const stockLabel: Record<StockState, string> = { ok: "Tersedia", low: "Stok Rendah", out: "Habis" };

function StockPill({ stock, minStock }: { stock: number; minStock: number }) {
  const st = stockState(stock, minStock);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold",
        st === "ok" && "bg-secondary-container/50 text-on-secondary-container",
        st === "low" && "bg-tertiary-fixed text-on-tertiary-fixed",
        st === "out" && "bg-destructive-container text-on-destructive-container"
      )}
    >
      {stockLabel[st]}
    </span>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="relative overflow-hidden p-5 transition-shadow hover:shadow-md">
      <div className="pointer-events-none absolute -right-5 -top-5 opacity-15">
        <Icon className="h-24 w-24" />
      </div>
      <p className="text-[11px] font-semibold tracking-wider text-on-surface-variant">{title}</p>
      <p className="mt-1 truncate font-display text-2xl font-bold">{value}</p>
      <p className="mt-1 text-[11px] text-on-surface-variant">{sub}</p>
    </Card>
  );
}

export default async function StockPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string; per?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const sp = await searchParams;
  const view = sp.tab === "movements" ? "movements" : "products";
  const perRaw = Number(sp.per);
  const per = PER_OPTIONS.includes(perRaw) ? perRaw : DEFAULT_PER;
  const pageNumRaw = Math.max(1, Number(sp.page) || 1);

  // Lightweight fetch of every product just for the stat cards.
  const [allProducts, productTotal, movementTotal] = await Promise.all([
    prisma.product.findMany({ where: { ownerId }, select: { stock: true, costPrice: true, minStock: true } }),
    prisma.product.count({ where: { ownerId } }),
    prisma.stockMovement.count({ where: { product: { ownerId } } }),
  ]);

  const totalStock = allProducts.reduce((s, p) => s + p.stock, 0);
  const stockValue = allProducts.reduce((s, p) => s + p.stock * p.costPrice, 0);
  const lowCount = allProducts.filter((p) => p.stock <= p.minStock).length;
  const outCount = allProducts.filter((p) => p.stock <= 0).length;

  const productPages = Math.max(1, Math.ceil(productTotal / per));
  const movementPages = Math.max(1, Math.ceil(movementTotal / per));
  const productPage = Math.min(pageNumRaw, productPages);
  const movementPage = Math.min(pageNumRaw, movementPages);

  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { ownerId },
      include: { unit: true },
      orderBy: { name: "asc" },
      skip: (productPage - 1) * per,
      take: per,
    }),
    prisma.stockMovement.findMany({
      where: { product: { ownerId } },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      skip: (movementPage - 1) * per,
      take: per,
    }),
  ]);

  return (
    <div className="space-y-5">
      {/* Header & tabs */}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Manajemen Stok</h1>
          <p className="text-sm text-on-surface-variant">Pantau tingkat stok dan riwayat mutasi produk.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex max-w-full overflow-x-auto rounded-md border border-outline-variant bg-surface-container-lowest">
            <Link
              href="/stock"
              className={cn(
                "shrink-0 px-4 py-2 text-xs font-semibold tracking-wide transition-colors",
                view === "products" ? "bg-surface-container-high" : "hover:bg-surface-container-low"
              )}
            >
              Stok Produk
            </Link>
            <Link
              href="/stock?tab=movements"
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-r-md border-l border-outline-variant px-4 py-2 text-xs font-semibold tracking-wide transition-colors",
                view === "movements" ? "bg-surface-container-high" : "hover:bg-surface-container-low"
              )}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Riwayat Mutasi
            </Link>
          </div>
          <GuideDialog variant="chip" initialCategory="stock" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="TOTAL PRODUK" value={formatNumber(products.length)} sub="produk tercatat" icon={Package} />
        <StatCard title="TOTAL STOK" value={formatNumber(totalStock)} sub="unit gabungan semua produk" icon={Warehouse} />
        <StatCard title="NILAI STOK" value={formatRupiah(stockValue)} sub="berdasarkan harga beli (HPP)" icon={CircleDollarSign} />
        <StatCard
          title="STOK MENIPIS"
          value={formatNumber(lowCount)}
          sub={outCount > 0 ? `${formatNumber(outCount)} produk habis` : "butuh perhatian"}
          icon={AlertTriangle}
        />
      </div>

      {view === "products" ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Level Stok</TableHead>
                <TableHead className="text-center">Minimum</TableHead>
                <TableHead className="text-right">Nilai Stok</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="font-mono text-xs text-on-surface-variant">{p.sku}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <StockPill stock={p.stock} minStock={p.minStock} />
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-sm font-semibold", p.stock <= 0 && "text-destructive")}>
                    {formatNumber(p.stock)} {p.unit?.short ?? ""}
                  </TableCell>
                  <TableCell className="text-center text-on-surface-variant">{formatNumber(p.minStock)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatRupiah(p.stock * p.costPrice)}</TableCell>
                  <TableCell className="text-right">
                    <AdjustStockDialog product={{ id: p.id, name: p.name, stock: p.stock, minStock: p.minStock, unit: p.unit?.short ?? "" }} />
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-on-surface-variant">
                    Belum ada produk
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          <div className="border-t border-outline-variant bg-surface">
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="text-xs font-semibold text-on-surface">
                Total stok: {formatNumber(totalStock)} unit · Nilai: {formatRupiah(stockValue)}
              </span>
            </div>
            <TablePagination total={productTotal} page={productPage} per={per} unit="produk" />
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs text-on-surface-variant">{formatDate(m.createdAt)}</TableCell>
                  <TableCell className="font-medium">{m.product.name}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold",
                        m.type === "IN" && "bg-secondary-container/50 text-on-secondary-container",
                        m.type === "OUT" && "bg-destructive-container text-on-destructive-container",
                        m.type !== "IN" && m.type !== "OUT" && "bg-tertiary-fixed text-on-tertiary-fixed"
                      )}
                    >
                      {m.type === "IN" ? "Masuk" : m.type === "OUT" ? "Keluar" : "Penyesuaian"}
                    </span>
                  </TableCell>
                  <TableCell className={cn("text-center font-mono text-sm font-semibold", m.qty < 0 && "text-destructive")}>
                    {m.qty > 0 ? `+${m.qty}` : m.qty}
                  </TableCell>
                  <TableCell className="text-on-surface-variant">{m.note || "-"}</TableCell>
                </TableRow>
              ))}
              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-on-surface-variant">
                    Belum ada mutasi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          <TablePagination total={movementTotal} page={movementPage} per={per} unit="mutasi" />
        </Card>
      )}
    </div>
  );
}
