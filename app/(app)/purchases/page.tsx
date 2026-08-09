import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate, formatRupiah } from "@/lib/utils";
import { Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { TablePagination } from "@/components/table-pagination";
import { PurchaseForm } from "@/components/purchase-form";
import { GuideDialog } from "@/components/guide-dialog";

export const dynamic = "force-dynamic";

const PER_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PER = 20;

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ page?: string; per?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const sp = await searchParams;
  const perRaw = Number(sp.per);
  const per = PER_OPTIONS.includes(perRaw) ? perRaw : DEFAULT_PER;
  const total = await prisma.purchase.count({ where: { ownerId } });
  const totalPages = Math.max(1, Math.ceil(total / per));
  const pageNum = Math.min(Math.max(1, Number(sp.page) || 1), totalPages);

  const [purchases, suppliers, products] = await Promise.all([
    prisma.purchase.findMany({
      where: { ownerId },
      include: { supplier: true, user: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * per,
      take: per,
    }),
    prisma.supplier.findMany({ where: { ownerId }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { ownerId, active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Pembelian</h1>
          <p className="text-sm text-muted-foreground">Stok masuk dari supplier</p>
        </div>
        <div className="flex items-center gap-2">
          <PurchaseForm suppliers={suppliers} products={products} />
          <GuideDialog variant="chip" initialCategory="purchases" />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-xs">{formatDate(p.createdAt)}</TableCell>
                <TableCell>{p.supplier?.name ?? "-"}</TableCell>
                <TableCell>{p.user?.name ?? "-"}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {p.items.map((it) => (
                      <div key={it.id} className="text-xs text-muted-foreground">
                        {it.product.name} × {it.qty}
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">{formatRupiah(p.total)}</TableCell>
              </TableRow>
            ))}
            {purchases.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Belum ada pembelian</TableCell></TableRow>}
          </TableBody>
        </Table>
        </div>
        <TablePagination total={total} page={pageNum} per={per} unit="pembelian" />
      </Card>
    </div>
  );
}