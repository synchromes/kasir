import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftRight, Banknote, CalendarDays, ChevronRight, CreditCard, Download, QrCode } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cn, formatDate, formatNumber, formatRupiah } from "@/lib/utils";
import { paymentColors } from "@/lib/colors";
import { Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { TrendBar } from "@/components/charts/report-charts";
import { DeltaPill } from "@/components/delta-pill";
import { GuideDialog } from "@/components/guide-dialog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Laporan" };

const methodLabel: Record<string, string> = { CASH: "Tunai", QRIS: "QRIS", TRANSFER: "Transfer" };
const methodIcon = { CASH: Banknote, QRIS: QrCode, TRANSFER: ArrowLeftRight };
const presetLabels = { day: "Hari Ini", week: "7 Hari", month: "Bulan Ini" };
type Preset = keyof typeof presetLabels;

// Date inputs and report links use local dates, not UTC dates from toISOString.
function localKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function parseDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && localKey(date) === value ? date : null;
}

function deltaPct(current: number, previous: number) {
  return previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;
}

function Comparison({ value, invert = false }: { value: number | null; invert?: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-on-surface-variant">
      {value === null ? "Belum ada pembanding" : <><DeltaPill value={value} invert={invert} compact /><span>vs periode sebelumnya</span></>}
    </div>
  );
}

function PeriodPicker({ active, custom, from, to }: { active: Preset; custom: boolean; from: string; to: string }) {
  return (
    <div className="space-y-3">
      <nav aria-label="Periode laporan" className="grid grid-cols-4 gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-1 sm:max-w-lg">
        {(Object.entries(presetLabels) as [Preset, string][]).map(([id, label]) => (
          <Link key={id} href={`/reports?preset=${id}`} scroll={false} aria-current={!custom && active === id ? "page" : undefined}
            className={cn("flex min-h-11 items-center justify-center rounded-lg px-1 text-center text-xs font-semibold transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3", !custom && active === id ? "bg-primary-soft text-primary" : "text-on-surface-variant")}>
            {label}
          </Link>
        ))}
        <Link href={`/reports?custom=1&from=${from}&to=${to}`} scroll={false} aria-current={custom ? "page" : undefined}
          className={cn("flex min-h-11 items-center justify-center rounded-lg px-1 text-xs font-semibold transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3", custom ? "bg-primary-soft text-primary" : "text-on-surface-variant")}>
          Kustom
        </Link>
      </nav>
      {custom && (
        <Card className="p-4 shadow-none">
          <form action="/reports" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <input type="hidden" name="custom" value="1" />
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="report-from" className="text-xs font-semibold text-on-surface-variant">Dari</label>
              <Input key={`from-${from}`} id="report-from" type="date" name="from" defaultValue={from} required className="min-w-0" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="report-to" className="text-xs font-semibold text-on-surface-variant">Sampai</label>
              <Input key={`to-${to}`} id="report-to" type="date" name="to" defaultValue={to} required className="min-w-0" />
            </div>
            <Button type="submit">Terapkan</Button>
          </form>
        </Card>
      )}
    </div>
  );
}

export default async function ReportsPage({ searchParams }: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string; custom?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const { from, to, preset, custom: customParam } = await searchParams;
  const now = new Date();
  const weekStart = startOfDay(now);
  weekStart.setDate(weekStart.getDate() - 6);
  const presets = {
    day: { from: startOfDay(now), to: endOfDay(now) },
    week: { from: weekStart, to: endOfDay(now) },
    month: { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) },
  };
  const activePreset: Preset = preset === "day" || preset === "week" ? preset : "month";
  const custom = customParam === "1" || !!from || !!to;
  const parsedFrom = parseDate(from);
  const parsedTo = parseDate(to);
  const fromDate = custom ? parsedFrom ?? presets[activePreset].from : presets[activePreset].from;
  const toDate = custom ? endOfDay(parsedTo ?? presets[activePreset].to) : presets[activePreset].to;
  const dateError = (from && !parsedFrom) || (to && !parsedTo)
    ? "Tanggal tidak valid. Pilih tanggal awal dan akhir yang benar."
    : fromDate > toDate ? "Tanggal akhir harus sama atau setelah tanggal awal." : null;

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold">Laporan</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Penjualan dan keuntungan toko Anda.</p>
      </div>
      <GuideDialog variant="chip" initialCategory="reports" />
    </div>
  );
  const periodPicker = <PeriodPicker active={activePreset} custom={custom} from={from ?? localKey(fromDate)} to={to ?? localKey(toDate)} />;
  if (dateError) {
    return (
      <div className="space-y-5">
        {header}{periodPicker}
        <Card role="alert" className="space-y-3 border-destructive p-4 shadow-none">
          <p className="text-sm font-semibold text-destructive">{dateError}</p>
          <p className="text-sm text-on-surface-variant">Perbaiki periode untuk menampilkan laporan.</p>
          <Button variant="outline" asChild><Link href="/reports?preset=month">Kembali ke bulan ini</Link></Button>
        </Card>
      </div>
    );
  }

  const range = { gte: fromDate, lte: toDate };
  const rangeLen = toDate.getTime() - fromDate.getTime() + 1;
  const previousTo = new Date(fromDate.getTime() - 1);
  const previousFrom = new Date(fromDate.getTime() - rangeLen);
  const previousRange = { gte: previousFrom, lte: previousTo };
  const [sales, expense, items, previousSales, previousItems, previousExpense] = await Promise.all([
    prisma.sale.findMany({
      where: { ownerId, createdAt: range },
      // Payment proofs and QR payloads can be large; CSV only needs these fields.
      select: { id: true, invoiceNo: true, createdAt: true, paymentMethod: true, subtotal: true, discount: true, tax: true, total: true, paid: true, change: true, customer: { select: { name: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.expense.aggregate({ where: { ownerId, createdAt: range }, _sum: { amount: true } }),
    prisma.saleItem.findMany({
      where: { sale: { ownerId, createdAt: range } },
      select: { qty: true, price: true, cost: true, product: { select: { id: true, name: true } }, sale: { select: { createdAt: true } } },
    }),
    prisma.sale.aggregate({ where: { ownerId, createdAt: previousRange }, _sum: { total: true } }),
    prisma.saleItem.findMany({ where: { sale: { ownerId, createdAt: previousRange } }, select: { qty: true, cost: true } }),
    prisma.expense.aggregate({ where: { ownerId, createdAt: previousRange }, _sum: { amount: true } }),
  ]);
  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const cost = items.reduce((sum, item) => sum + item.cost * item.qty, 0);
  const grossProfit = revenue - cost;
  const totalExpense = expense._sum.amount ?? 0;
  const netProfit = grossProfit - totalExpense;
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
  const average = sales.length ? revenue / sales.length : 0;
  const previousRevenue = previousSales._sum.total ?? 0;
  const previousCost = previousItems.reduce((sum, item) => sum + item.cost * item.qty, 0);
  const previousExpenseTotal = previousExpense._sum.amount ?? 0;
  const previousNet = previousRevenue - previousCost - previousExpenseTotal;

  // Long custom periods use monthly buckets so the same chart stays readable.
  const monthly = rangeLen > 62 * 86400000;
  const bucketKey = (date: Date) => monthly ? localKey(date).slice(0, 7) : localKey(date);
  const buckets = new Map<string, { total: number; cost: number }>();
  for (const sale of sales) {
    const key = bucketKey(sale.createdAt);
    const bucket = buckets.get(key) ?? { total: 0, cost: 0 };
    bucket.total += sale.total;
    buckets.set(key, bucket);
  }
  for (const item of items) {
    const bucket = buckets.get(bucketKey(item.sale.createdAt));
    if (bucket) bucket.cost += item.cost * item.qty;
  }
  const trendData: { label: string; total: number; profit: number }[] = [];
  const dateLabel = new Intl.DateTimeFormat("id-ID", monthly
    ? { month: "short", year: "numeric" }
    : { day: "numeric", month: "short", ...(fromDate.getFullYear() !== toDate.getFullYear() ? { year: "numeric" } : {}) });
  const cursor = monthly ? new Date(fromDate.getFullYear(), fromDate.getMonth(), 1) : startOfDay(fromDate);
  while (cursor <= toDate) {
    const bucket = buckets.get(bucketKey(cursor));
    trendData.push({ label: dateLabel.format(cursor), total: bucket?.total ?? 0, profit: (bucket?.total ?? 0) - (bucket?.cost ?? 0) });
    if (monthly) cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }

  const products = new Map<number, { id: number; name: string; qty: number; revenue: number }>();
  for (const item of items) {
    const product = products.get(item.product.id) ?? { ...item.product, qty: 0, revenue: 0 };
    product.qty += item.qty;
    product.revenue += item.price * item.qty;
    products.set(item.product.id, product);
  }
  const topProducts = [...products.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue || a.id - b.id).slice(0, 5);
  const methods = new Map<string, { key: string; total: number; count: number }>();
  for (const sale of sales) {
    const method = methods.get(sale.paymentMethod) ?? { key: sale.paymentMethod, total: 0, count: 0 };
    method.total += sale.total;
    method.count += 1;
    methods.set(sale.paymentMethod, method);
  }
  const methodData = [...methods.values()].sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  const latestSales = sales.slice(0, 5);
  const salesHref = `/sales?${new URLSearchParams({ from: localKey(fromDate), to: localKey(toDate), sort: "date" })}`;
  const periodFormat = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const periodLabel = localKey(fromDate) === localKey(toDate) ? periodFormat.format(fromDate) : `${periodFormat.format(fromDate)} – ${periodFormat.format(toDate)}`;
  const csvRows = [
    ["Invoice", "Tanggal", "Pelanggan", "Metode", "Subtotal", "Diskon", "Pajak", "Total", "Bayar", "Kembalian"],
    ...sales.map(sale => [sale.invoiceNo, sale.createdAt.toISOString(), sale.customer?.name ?? "Umum", methodLabel[sale.paymentMethod], sale.subtotal, sale.discount, sale.tax, sale.total, sale.paid, sale.change]),
  ];
  const csv = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  return (
    <div className="space-y-5">
      {header}
      {periodPicker}
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-xs text-on-surface-variant"><CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{periodLabel}</span></p>
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent("\ufeff" + csv)}`} download="laporan-penjualan.csv"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-input bg-surface-container-lowest px-3 text-xs font-semibold transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Download className="h-4 w-4" aria-hidden="true" />Ekspor
        </a>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)]">
      <Card role="region" aria-label="Ringkasan laporan" className="overflow-hidden bg-surface-container-low p-4 shadow-none sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Banknote className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-on-surface-variant">Omzet</p>
            <p data-report-value="revenue" className="break-words font-display text-3xl font-bold tabular-nums text-on-surface">{formatRupiah(revenue)}</p>
          </div>
        </div>
        <Comparison value={deltaPct(revenue, previousRevenue)} />
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-outline-variant pt-4">
          <div className="min-w-0">
            <dt className="text-xs font-medium text-on-surface-variant">Laba bersih</dt>
            <dd className="mt-1">
              <span data-report-value="net" className={cn("block break-words font-display text-lg font-bold tabular-nums sm:text-2xl", netProfit < 0 ? "text-destructive" : "text-accent")}>{formatRupiah(netProfit)}</span>
              <Comparison value={deltaPct(netProfit, previousNet)} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-on-surface-variant">Pengeluaran</dt>
            <dd className="mt-1">
              <span data-report-value="expense" className="block break-words font-display text-lg font-bold tabular-nums text-destructive sm:text-2xl">{formatRupiah(totalExpense)}</span>
              <Comparison value={deltaPct(totalExpense, previousExpenseTotal)} invert />
            </dd>
          </div>
        </dl>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-outline-variant pt-4">
          {([{ label: "Transaksi", value: formatNumber(sales.length), key: "count" }, { label: "Item terjual", value: formatNumber(totalQty), key: "qty" }, { label: "Rata-rata", value: formatRupiah(average), key: "average" }]).map(stat => (
            <div key={stat.key} className="min-w-0"><dt className="text-[11px] text-on-surface-variant">{stat.label}</dt><dd data-report-value={stat.key} className="mt-1 break-words text-sm font-semibold tabular-nums">{stat.value}</dd></div>
          ))}
        </dl>
        <details className="mt-2 [&[open]>summary>svg]:rotate-90">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Rincian laba<ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" /></summary>
          <dl className="space-y-2 border-t border-outline-variant pt-3 text-xs">
            {([{ label: "Omzet", value: revenue }, { label: "Harga pokok penjualan (HPP)", value: cost }, { label: "Laba kotor", value: grossProfit }, { label: "Pengeluaran", value: totalExpense }, { label: "Laba bersih", value: netProfit }]).map(row => (
              <div key={row.label} className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt className="text-on-surface-variant">{row.label}</dt><dd className="font-semibold tabular-nums">{formatRupiah(row.value)}</dd></div>
            ))}
          </dl>
        </details>
      </Card>

      <Card className="min-w-0 p-4 shadow-none sm:p-5">
        <h2 className="font-display text-base font-bold">Tren penjualan</h2>
        <p className="mb-4 mt-1 text-xs text-on-surface-variant">Omzet dan laba kotor per {monthly ? "bulan" : "hari"}. Laba kotor belum dikurangi pengeluaran.</p>
        {sales.length ? <TrendBar data={trendData} /> : <p className="rounded-lg bg-surface-container-low px-4 py-8 text-center text-sm text-on-surface-variant">Belum ada penjualan pada periode ini.</p>}
        {sales.length > 0 && (
          <details className="mt-2 [&[open]>summary>svg]:rotate-90">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Lihat angka grafik<ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" /></summary>
            <div role="region" aria-label="Angka grafik, tabel dapat digeser" tabIndex={0} className="overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <Table className="text-xs">
                <caption className="sr-only">Omzet dan laba kotor per {monthly ? "bulan" : "hari"}</caption>
                <TableHeader><TableRow><TableHead>{monthly ? "Bulan" : "Tanggal"}</TableHead><TableHead className="text-right">Omzet</TableHead><TableHead className="text-right">Laba kotor</TableHead></TableRow></TableHeader>
                <TableBody>{trendData.map(point => <TableRow key={point.label}><TableCell>{point.label}</TableCell><TableCell className="text-right tabular-nums">{formatRupiah(point.total)}</TableCell><TableCell className="text-right tabular-nums">{formatRupiah(point.profit)}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </details>
        )}
      </Card>

      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="min-w-0 p-4 shadow-none sm:p-5">
          <h2 className="font-display text-base font-bold">Produk terlaris</h2>
          <p className="mt-1 text-xs text-on-surface-variant">Peringkat berdasarkan jumlah terjual.</p>
          {topProducts.length ? (
            <>
              <ol aria-label="Produk terlaris" className="mt-4 divide-y divide-outline-variant">
                {topProducts.map((product, index) => (
                  <li key={product.id} className="flex items-start gap-3 py-3 first:pt-0">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums", index === 0 ? "bg-primary-soft text-primary" : "bg-surface-container-low text-on-surface-variant")}>{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold">{product.name}</p>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><p className="text-xs text-on-surface-variant">{formatNumber(product.qty)} terjual</p><p className="break-words text-sm font-semibold tabular-nums">{formatRupiah(product.revenue)}</p></div>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-[11px] text-on-surface-variant">Nilai produk sebelum diskon dan pajak.</p>
            </>
          ) : <p className="mt-4 text-sm text-on-surface-variant">Belum ada produk terjual pada periode ini.</p>}
        </Card>
        <Card className="min-w-0 p-4 shadow-none sm:p-5">
          <h2 className="font-display text-base font-bold">Metode pembayaran</h2>
          <p className="mt-1 text-xs text-on-surface-variant">Rincian omzet berdasarkan pembayaran.</p>
          {methodData.length ? (
            <ul aria-label="Rincian metode pembayaran" className="mt-4 divide-y divide-outline-variant">
              {methodData.map(method => {
                const Icon = methodIcon[method.key as keyof typeof methodIcon] ?? CreditCard;
                const style = paymentColors[method.key];
                return (
                  <li key={method.key} className="flex items-start gap-3 py-3 first:pt-0">
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", style?.bg, style?.text)}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><p className="text-sm font-semibold">{methodLabel[method.key] ?? method.key}</p><p className="break-words text-sm font-semibold tabular-nums">{formatRupiah(method.total)}</p></div>
                      <p className="mt-1 text-xs text-on-surface-variant">{formatNumber(method.count)} transaksi · {revenue ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(method.total / revenue * 100) : "0"}% omzet</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <p className="mt-4 text-sm text-on-surface-variant">Belum ada pembayaran pada periode ini.</p>}
        </Card>
      </div>

      <Card className="overflow-hidden shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-outline-variant px-4 py-3 sm:px-5">
          <h2 className="font-display text-base font-bold">Transaksi terakhir</h2>
          <Link href={salesHref} className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-primary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Lihat semua<ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <div role="region" aria-label="Transaksi terakhir" tabIndex={0} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          {latestSales.length ? (
            <>
              <ul aria-label="Transaksi terakhir" className="divide-y divide-outline-variant px-4 lg:hidden">
                {latestSales.map(sale => (
                  <li key={sale.id}>
                    <Link href={`/sales/${sale.id}`} className="flex items-center gap-3 rounded-lg py-3 transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><CreditCard className="h-5 w-5" aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-xs font-semibold">{sale.invoiceNo}</span>
                        <span className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><time dateTime={sale.createdAt.toISOString()} className="text-[11px] text-on-surface-variant">{formatDate(sale.createdAt)}</time><span className="break-words text-sm font-semibold tabular-nums">{formatRupiah(sale.total)}</span></span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto lg:block">
                <Table>
                  <TableHeader><TableRow><TableHead>ID Transaksi</TableHead><TableHead>Tanggal &amp; Waktu</TableHead><TableHead>Metode</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Detail</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {latestSales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-xs font-semibold">{sale.invoiceNo}</TableCell>
                        <TableCell className="text-xs text-on-surface-variant">{formatDate(sale.createdAt)}</TableCell>
                        <TableCell>{methodLabel[sale.paymentMethod]}</TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">{formatRupiah(sale.total)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/sales/${sale.id}`} aria-label={`Lihat transaksi ${sale.invoiceNo}`}>
                              <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="border-t border-outline-variant bg-surface-container-low px-4 py-3 text-xs text-on-surface-variant sm:px-5">{formatNumber(latestSales.length)} transaksi terbaru dari {formatNumber(sales.length)} transaksi pada periode ini.</p>
            </>
          ) : <p className="px-4 py-6 text-sm text-on-surface-variant">Belum ada transaksi pada periode ini. Pilih periode lain untuk melihat penjualan.</p>}
        </div>
      </Card>
    </div>
  );
}
