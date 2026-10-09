import Link from "next/link";
import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatRupiah, formatDate, formatDateShort, formatNumber } from "@/lib/utils";
import { Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button } from "@/components/ui";
import { TablePagination } from "@/components/table-pagination";
import { SalesFilters } from "@/components/sales-filters";
import { GuideDialog } from "@/components/guide-dialog";
import { ChartNoAxesColumnIncreasing, ChevronRight, Clock3, CreditCard, Eye, List, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Transaksi" };

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
  searchParams: Promise<{ q?: string; method?: string; from?: string; to?: string; page?: string; per?: string; sort?: string }>;
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
  const sort = sp.sort === "date" ? "date" : "invoice";
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
  const summary = await prisma.sale.aggregate({
    where,
    _count: true,
    _sum: { total: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
  });
  const total = summary._count;
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
    orderBy: sort === "date" ? [{ createdAt: "desc" }, { id: "desc" }] : [{ invoiceNo: "desc" }, { id: "desc" }],
    skip: (pageNum - 1) * per,
    take: per,
  });
  const pageTotal = sales.reduce((s, x) => s + x.total, 0);
  const pageQty = sales.reduce((s, x) => s + x.items.reduce((a, i) => a + i.qty, 0), 0);
  const periodStart = fromDate ?? summary._min.createdAt;
  const periodEnd = toDate ?? summary._max.createdAt;
  const shortDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
  const periodLabel = periodStart && periodEnd
    ? periodStart.getTime() === periodEnd.getTime()
      ? formatDateShort(periodStart)
      : `${periodStart.getFullYear() === periodEnd.getFullYear() ? shortDate.format(periodStart) : formatDateShort(periodStart)} – ${formatDateShort(periodEnd)}`
    : periodStart ? `Sejak ${formatDateShort(periodStart)}` : periodEnd ? `Hingga ${formatDateShort(periodEnd)}` : "Belum ada transaksi";

  function sortHref(value: string) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(sp)) {
      if (typeof val === "string" && val) params.set(key, val);
    }
    params.set("sort", value);
    params.set("page", "1");
    return `/sales?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Transaksi</h1>
          <p className="text-sm text-on-surface-variant">Riwayat penjualan toko Anda.</p>
        </div>
        <div className="hidden lg:block"><GuideDialog variant="chip" initialCategory="sales" /></div>
      </div>

      <Card role="region" aria-label="Ringkasan transaksi" className="flex items-center gap-3 bg-surface-container-low p-4 shadow-none lg:hidden">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <ReceiptText className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <p className="text-xs font-medium text-on-surface-variant">Total Transaksi</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-[10px] font-medium text-primary">
              <ChartNoAxesColumnIncreasing className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{periodLabel}
            </span>
          </div>
          <p className="mt-1 break-words font-display text-2xl font-bold tabular-nums">{formatRupiah(summary._sum.total ?? 0)}</p>
        </div>
      </Card>

      <Card className="overflow-hidden shadow-none">
        <SalesFilters q={q ?? ""} method={method ?? ""} from={fromDate ? sp.from : ""} to={toDate ? sp.to : ""} />
      </Card>

      <Card className="overflow-hidden shadow-none">
        <nav aria-label="Urutan transaksi" className="mx-4 grid grid-cols-2 border-b border-outline-variant lg:hidden">
          {([
            { value: "invoice", label: "ID Transaksi", Icon: List },
            { value: "date", label: "Tanggal & Waktu", Icon: Clock3 },
          ] as const).map(({ value, label, Icon }) => (
            <Link key={value} href={sortHref(value)} scroll={false} aria-current={sort === value ? "page" : undefined} aria-label={`Urutkan berdasarkan ${label}, terbaru lebih dulu`} className={cn("relative flex min-h-14 items-center justify-center gap-2 rounded-sm px-1 text-xs font-semibold transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:text-sm", sort === value ? "text-primary" : "text-on-surface-variant")}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{label}
              {sort === value && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden="true" />}
            </Link>
          ))}
        </nav>
        <ul aria-label="Daftar transaksi" className="space-y-2 p-3 sm:p-4 lg:hidden">
          {sales.map(sale => (
            <li key={sale.id}>
              <Link href={`/sales/${sale.id}`} className="flex items-center gap-3 rounded-lg border border-outline-variant px-3 py-3 transition-colors hover:bg-surface-container-low active:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-xs font-semibold text-on-surface sm:text-sm">{sale.invoiceNo}</span>
                  <time dateTime={sale.createdAt.toISOString()} className="mt-1 block text-xs text-on-surface-variant">{formatDate(sale.createdAt)}</time>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        {sales.length === 0 && (
          <div className="px-5 py-10 text-center lg:hidden">
            <p className="text-sm font-semibold">{q || method || fromDate || toDate ? "Tidak ada transaksi yang cocok" : "Belum ada transaksi"}</p>
            <p className="mt-1 text-sm text-on-surface-variant">{q || method || fromDate || toDate ? "Coba kata kunci lain atau reset filter." : "Penjualan yang selesai akan muncul di sini."}</p>
          </div>
        )}

        <div role="region" aria-label="Riwayat transaksi, tabel dapat digeser" tabIndex={0} className="hidden overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:block">
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
                  <TableCell className="text-xs font-medium text-primary">{s.invoiceNo}</TableCell>
                  <TableCell className="text-xs text-on-surface-variant">{formatDate(s.createdAt)}</TableCell>
                  <TableCell>{s.customer?.name ?? "Pelanggan Umum"}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full border border-outline-variant px-2.5 py-1 text-[10px] font-bold text-on-surface-variant">
                      {methodLabel[s.paymentMethod] ?? s.paymentMethod}
                    </span>
                  </TableCell>
                  <TableCell className="text-on-surface-variant">{s.cashier?.name ?? "-"}</TableCell>
                  <TableCell className="text-right text-xs font-semibold">{formatRupiah(s.total)}</TableCell>
                  <TableCell className="text-center">
                     <span className="inline-flex rounded-full bg-secondary-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-on-secondary-container">
                      Selesai
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/sales/${s.id}`} aria-label={`Lihat transaksi ${s.invoiceNo}`} className="text-on-surface-variant hover:text-primary">
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

        <div className="mx-3 mb-3 rounded-lg bg-surface-container-low sm:mx-4 sm:mb-4 lg:mx-0 lg:mb-0 lg:rounded-none lg:border-t lg:border-outline-variant lg:bg-surface">
          {sales.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 pt-3 lg:px-4 lg:py-3">
              <span className="hidden text-xs text-on-surface-variant lg:inline">{formatNumber(pageQty)} item terjual di halaman ini</span>
              <span className="flex items-center gap-2 text-xs text-on-surface-variant lg:font-display lg:text-sm lg:font-bold lg:text-on-surface">
                <ChartNoAxesColumnIncreasing className="h-4 w-4 text-primary lg:hidden" aria-hidden="true" />Total Halaman: <b className="font-bold text-on-surface">{formatRupiah(pageTotal)}</b>
              </span>
            </div>
          )}
          <TablePagination total={total} page={pageNum} per={per} unit="transaksi" compactOnMobile />
        </div>
      </Card>
    </div>
  );
}
