import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import { Card, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input } from "@/components/ui";
import { TrendBar, DonutChart, DONUT_COLORS } from "@/components/charts/report-charts";
import { Download, ArrowUpRight, ArrowDownRight, CalendarDays, Banknote, TrendingUp, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const methodLabel: Record<string, string> = { CASH: "Tunai", QRIS: "QRIS", TRANSFER: "Transfer" };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function fmt(date: string | Date) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}
function deltaPct(current: number, prev: number) {
  if (!prev) return null;
  return ((current - prev) / prev) * 100;
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  delta,
  sub,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  delta: number | null;
  sub: string;
}) {
  return (
    <Card className="relative overflow-hidden p-5 transition-shadow hover:shadow-md">
      <div className="pointer-events-none absolute -right-5 -top-5 opacity-15">
        <Icon className="h-24 w-24" />
      </div>
      <p className="text-[11px] font-semibold tracking-wider text-on-surface-variant">{title}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
              delta >= 0
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-destructive-container text-on-destructive-container"
            )}
          >
            {delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">—</span>
        )}
        <span className="text-on-surface-variant">vs periode sebelumnya</span>
      </div>
      <p className="mt-1 text-[11px] text-on-surface-variant">{sub}</p>
    </Card>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string; custom?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const { from, to, preset, custom: customParam } = await searchParams;

  const now = new Date();
  const presets: Record<string, { label: string; from: Date; to: Date }> = {
    day: { label: "Hari Ini", from: startOfDay(now), to: endOfDay(now) },
    week: { label: "Minggu", from: startOfDay(new Date(now.getTime() - 6 * 86400000)), to: endOfDay(now) },
    month: { label: "Bulan", from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) },
  };

  const custom = customParam === "1" || !!from || !!to;
  const activePreset = custom ? "" : preset && presets[preset] ? preset : "month";

  let fromDate: Date;
  let toDate: Date;
  if (custom) {
    const fp = from ? new Date(from + "T00:00:00") : null;
    const tp = to ? new Date(to + "T23:59:59") : null;
    fromDate = fp && !Number.isNaN(fp.getTime()) ? fp : new Date(0);
    toDate = tp && !Number.isNaN(tp.getTime()) ? tp : new Date();
  } else {
    fromDate = presets[activePreset].from;
    toDate = presets[activePreset].to;
  }

  // Previous period of the same length, for comparison chips
  const rangeLen = Math.max(toDate.getTime() - fromDate.getTime(), 86400000);
  const prevTo = new Date(fromDate.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - rangeLen);

  const [sales, expenses, productAgg, prevSales, prevItems] = await Promise.all([
    prisma.sale.findMany({
      where: { ownerId, createdAt: { gte: fromDate, lte: toDate } },
      // Select eksplisit: jangan muat LONGTEXT paymentProof/qrisPayload per baris.
      select: {
        id: true,
        invoiceNo: true,
        createdAt: true,
        paymentMethod: true,
        subtotal: true,
        discount: true,
        tax: true,
        total: true,
        paid: true,
        change: true,
        customer: { select: { name: true } },
        items: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.findMany({ where: { ownerId, createdAt: { gte: fromDate, lte: toDate } } }),
    prisma.saleItem.findMany({
      where: { sale: { ownerId, createdAt: { gte: fromDate, lte: toDate } } },
      include: { product: { include: { category: true } }, sale: { select: { createdAt: true } } },
    }),
    prisma.sale.aggregate({ where: { ownerId, createdAt: { gte: prevFrom, lte: prevTo } }, _sum: { total: true }, _count: true }),
    prisma.saleItem.findMany({
      where: { sale: { ownerId, createdAt: { gte: prevFrom, lte: prevTo } } },
      select: { qty: true, cost: true },
    }),
  ]);

  const revenue = sales.reduce((s, x) => s + x.total, 0);
  const cost = productAgg.reduce((s, i) => s + i.cost * i.qty, 0);
  const grossProfit = revenue - cost;
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - totalExpense;
  const totalQty = productAgg.reduce((s, i) => s + i.qty, 0);
  const avgTransaction = sales.length ? revenue / sales.length : 0;

  const prevRevenue = prevSales._sum.total ?? 0;
  const prevCost = prevItems.reduce((s, i) => s + i.cost * i.qty, 0);
  const prevProfit = prevRevenue - prevCost;
  const prevAvg = prevSales._count ? prevRevenue / prevSales._count : 0;

  const revDelta = deltaPct(revenue, prevRevenue);
  const profitDelta = deltaPct(grossProfit, prevProfit);
  const avgDelta = deltaPct(avgTransaction, prevAvg);

  // Daily trend within the range (keyed by ISO date so ordering is chronological)
  const dayFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
  const byDay = new Map<string, { key: string; total: number; cost: number }>();
  for (const s of sales) {
    const key = s.createdAt.toISOString().slice(0, 10);
    const cur = byDay.get(key) ?? { key, total: 0, cost: 0 };
    cur.total += s.total;
    byDay.set(key, cur);
  }
  for (const i of productAgg) {
    const key = i.sale.createdAt.toISOString().slice(0, 10);
    const cur = byDay.get(key);
    if (cur) cur.cost += i.cost * i.qty;
  }
  const trendData = [...byDay.values()]
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((v) => ({ label: dayFmt.format(new Date(v.key + "T12:00:00")), total: v.total, profit: v.total - v.cost }));

  // Top products by qty
  const byProduct = new Map<string, { qty: number; revenue: number }>();
  for (const i of productAgg) {
    const cur = byProduct.get(i.product.name) ?? { qty: 0, revenue: 0 };
    cur.qty += i.qty;
    cur.revenue += i.price * i.qty;
    byProduct.set(i.product.name, cur);
  }
  const topProducts = [...byProduct.entries()]
    .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  const topQtyTotal = topProducts.reduce((s, p) => s + p.qty, 0);

  const byMethod = new Map<string, number>();
  for (const s of sales) byMethod.set(s.paymentMethod, (byMethod.get(s.paymentMethod) ?? 0) + s.total);

  const csvRows = [
    ["Invoice", "Tanggal", "Pelanggan", "Metode", "Subtotal", "Diskon", "Pajak", "Total", "Bayar", "Kembalian"],
    ...sales.map((s) => [
      s.invoiceNo,
      s.createdAt.toISOString(),
      s.customer?.name ?? "Umum",
      methodLabel[s.paymentMethod],
      String(s.subtotal),
      String(s.discount),
      String(s.tax),
      String(s.total),
      String(s.paid),
      String(s.change),
    ]),
  ];
  const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const csvBlob = encodeURIComponent("\ufeff" + csv);

  const presetBtn = (id: string) => {
    const p = presets[id];
    const active = activePreset === id;
    return (
      <Link
        key={id}
        href={`/reports?preset=${id}`}
        className={cn(
          "shrink-0 rounded-md px-4 py-2 text-xs font-semibold tracking-wide transition-colors",
          id !== "month" && "border-r border-outline-variant",
          active ? "bg-surface-container-high" : "hover:bg-surface-container-low"
        )}
      >
        {p.label}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & actions */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Analitik Penjualan</h1>
          <p className="text-sm text-on-surface-variant">Gambaran menyeluruh tentang performa toko.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* overflow-x-auto (bukan overflow-hidden): di layar sempit grup tetap
              bisa digeser alih-alih memotong tombol terakhir. */}
          <div className="flex max-w-full overflow-x-auto rounded-md border border-outline-variant bg-surface-container-lowest">
            {presetBtn("day")}
            {presetBtn("week")}
            {presetBtn("month")}
            <Link
              href="/reports?custom=1"
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-r-md px-4 py-2 text-xs font-semibold tracking-wide transition-colors hover:bg-surface-container-low",
                custom ? "bg-surface-container-high" : ""
              )}
            >
              <CalendarDays className="h-4 w-4" />
              Kustom
            </Link>
          </div>
          <a
            href={`data:text/csv;charset=utf-8,${csvBlob}`}
            download="laporan-penjualan.csv"
            className="inline-flex items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <Download className="h-4 w-4" />
            Ekspor
          </a>
        </div>
      </div>

      {/* Custom range form */}
      {custom && (
        <Card className="p-4">
          <form className="flex flex-wrap items-end gap-3" action="/reports">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-on-surface-variant">Dari</span>
              <Input type="date" name="from" defaultValue={from ?? ""} className="h-9" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-on-surface-variant">Sampai</span>
              <Input type="date" name="to" defaultValue={to ?? ""} className="h-9" />
            </div>
            <Button type="submit" className="h-9">
              Terapkan
            </Button>
          </form>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="TOTAL PENDAPATAN"
          value={formatRupiah(revenue)}
          icon={Banknote}
          delta={revDelta}
          sub={`${sales.length} transaksi · ${totalQty} item`}
        />
        <SummaryCard
          title="LABA KOTOR"
          value={formatRupiah(grossProfit)}
          icon={TrendingUp}
          delta={profitDelta}
          sub={`Pengeluaran: ${formatRupiah(totalExpense)} · Bersih: ${formatRupiah(netProfit)}`}
        />
        <SummaryCard
          title="RATA-RATA NILAI TRANSAKSI"
          value={formatRupiah(avgTransaction)}
          icon={ReceiptText}
          delta={avgDelta}
          sub={`HPP: ${formatRupiah(cost)}`}
        />
      </div>

      {/* Trend + top products */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="flex flex-col p-5 lg:col-span-8">
          <div className="mb-4 flex items-center justify-between border-b border-outline-variant pb-3">
            <h3 className="font-display text-base font-bold">Tren Pendapatan</h3>
            <div className="flex items-center gap-4 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-primary" /> Pendapatan</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-accent" /> Laba</span>
            </div>
          </div>
          <TrendBar data={trendData} />
        </Card>

        <Card className="flex flex-col p-5 lg:col-span-4">
          <div className="mb-4 border-b border-outline-variant pb-3">
            <h3 className="font-display text-base font-bold">Produk Terlaris</h3>
          </div>
          <DonutChart
            data={topProducts.map((p) => ({ name: p.name, value: p.qty }))}
            centerValue={String(topQtyTotal)}
            centerLabel="item"
          />
          <div className="mt-4 space-y-2">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="truncate text-on-surface-variant">{p.name}</span>
                </span>
                <span className="font-mono text-xs font-medium">
                  {topQtyTotal ? Math.round((p.qty / topQtyTotal) * 100) : 0}%
                </span>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-sm text-on-surface-variant">Tidak ada data</p>}
          </div>
        </Card>
      </div>

      {/* Transactions table */}
      <Card className="overflow-hidden">          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-5 py-4">
          <h3 className="font-display text-base font-bold">Transaksi Terakhir</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sales">Lihat Semua</Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Transaksi</TableHead>
              <TableHead>Tanggal &amp; Waktu</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((s) => (
              <TableRow key={s.id} className="text-sm">
                <TableCell className="font-mono text-xs font-medium text-primary">{s.invoiceNo}</TableCell>
                <TableCell className="text-on-surface-variant">
                  {fmt(s.createdAt)}, {new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(s.createdAt)}
                </TableCell>
                <TableCell>{s.items.length} item</TableCell>
                <TableCell>{methodLabel[s.paymentMethod] ?? s.paymentMethod}</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold">{formatRupiah(s.total)}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex rounded-full bg-secondary-container/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-on-secondary-container">
                    Selesai
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-on-surface-variant">
                  Tidak ada data di rentang ini
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  );
}
