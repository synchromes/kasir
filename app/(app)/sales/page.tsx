import Link from "next/link";
import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatRupiah, formatDate, formatNumber } from "@/lib/utils";
import { Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button } from "@/components/ui";
import { TablePagination } from "@/components/table-pagination";
import { SalesFilters } from "@/components/sales-filters";
import { Eye, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const methodLabel: Record<string, string> = { CASH: "Tunai", QRIS: "QRIS", TRANSFER: "Transfer" };
const METHOD_VALUES = ["CASH", "QRIS", "TRANSFER"];
const PER_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PER = 20;

function parseDate(v: string, endOfDay: boolean): Date | null {
  if (!v) return null;
  const d = new Date(endOfDay ? `${v}T23:59:59.999` : `${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; method?: string; from?: string; to?: string; page?: string; per?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const sp = await searchParams;
  const q = sp.q?.trim();
  const method = METHOD_VALUES.includes(sp.method ?? "") ? (sp.method as PaymentMethod) : null;
  const fromDate = parseDate(sp.from ?? "", false);
  const toDate = parseDate(sp.to ?? "", true);
  const perRaw = Number(sp.per);
  const per = PER_OPTIONS.includes(perRaw) ? perRaw : DEFAULT_PER;
  const where = {
    ownerId,
    ...(q
      ? {
          OR: [{ invoiceNo: { contains: q } }, { customer: { name: { contains: q } } }],
        }
      : {}),
    ...(method ? { paymentMethod: method } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
  };
  const total = await prisma.sale.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / per));
  const pageNum = Math.min(Math.max(1, Number(sp.page) || 1), totalPages);
  // Select eksplisit: kolom LONGTEXT (paymentProof/qrisPayload) tidak ikut
  // dimuat per baris — bisa ratusan KB base64 tiap transaksi.
  const sales = await prisma.sale.findMany({
    where,
    select: {
      id: true,
      invoiceNo: true,
      createdAt: true,
      total: true,
      paymentMethod: true,
      customer: { select: { name: true } },
      cashier: { select: { name: true } },
      items: { select: { qty: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (pageNum - 1) * per,
    take: per,
  });
  const pageTotal = sales.reduce((s, x) => s + x.total, 0);
  const pageQty = sales.reduce((s, x) => s + x.items.reduce((a, i) => a + i.qty, 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Transaksi</h1>
        <p className="text-sm text-on-surface-variant">Riwayat penjualan toko.</p>
      </div>

      <Card className="overflow-hidden">
        {/* Card header with search */}
        <div className="flex flex-col gap-3 border-b border-outline-variant bg-surface-container-low px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            <h2 className="font-display text-base font-bold">Riwayat Transaksi</h2>
          </div>
        </div>

        <SalesFilters q={q ?? ""} method={method ?? ""} from={sp.from ?? ""} to={sp.to ?? ""} />

        <div className="overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID Transaksi</TableHead>
                <TableHead>Tanggal &amp; Waktu</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Kasir</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs font-medium text-primary">{s.invoiceNo}</TableCell>
                  <TableCell className="text-xs text-on-surface-variant">{formatDate(s.createdAt)}</TableCell>
                  <TableCell>{s.customer?.name ?? "Pelanggan Umum"}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full border border-outline-variant px-2.5 py-1 text-[10px] font-bold text-on-surface-variant">
                      {methodLabel[s.paymentMethod] ?? s.paymentMethod}
                    </span>
                  </TableCell>
                  <TableCell className="text-on-surface-variant">{s.cashier?.name ?? "-"}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{formatRupiah(s.total)}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex rounded-full bg-secondary-container/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-on-secondary-container">
                      Selesai
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/sales/${s.id}`} className="text-on-surface-variant hover:text-primary">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-on-surface-variant">
                    {q || method || fromDate || toDate
                      ? "Tidak ada transaksi yang cocok dengan filter"
                      : "Belum ada transaksi"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer: page totals + pagination */}
        <div className="border-t border-outline-variant bg-surface">
          <div className="flex flex-col gap-1 px-4 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-on-surface-variant">{formatNumber(pageQty)} item terjual di halaman ini</span>
            <span className={cn("font-display text-sm font-bold", sales.length === 0 && "text-on-surface-variant")}>
              {sales.length > 0 && `Total halaman: ${formatRupiah(pageTotal)}`}
            </span>
          </div>
          <TablePagination total={total} page={pageNum} per={per} unit="transaksi" />
        </div>
      </Card>
    </div>
  );
}
