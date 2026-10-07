import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import { Card, Button, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input } from "@/components/ui";
import { TrendBar, DonutChart, DONUT_COLORS } from "@/components/charts/report-charts";
import { MiniDonut, SparkArea, WeeklyBars } from "@/components/charts/dashboard-charts";
import { DeltaPill } from "@/components/delta-pill";
import { GuideDialog } from "@/components/guide-dialog";
import {
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  CalendarDays,
  Banknote,
  QrCode,
  TrendingUp,
  ReceiptText,
  PackageOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const methodLabel: Record<string, string> = { CASH: "Tunai", QRIS: "QRIS", TRANSFER: "Transfer" };
const methodIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  CASH: Banknote,
  QRIS: QrCode,
  TRANSFER: ArrowLeftRight,
};
import { paymentColors as methodStyle } from "@/lib/colors";

// Local YYYY-MM-DD key, timezone-safe (toISOString adalah UTC dan bisa
// menggeser hari jika dipakai untuk mengelompokkan tanggal).
function localKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function rupiahCompact(n: number) {
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

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
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">-</span>
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

  const [sales, expenses, productAgg, prevSales, prevItems, prevExpenses, lowStock] = await Promise.all([
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
    prisma.expense.aggregate({ where: { ownerId, createdAt: { gte: prevFrom, lte: prevTo } }, _sum: { amount: true } }),
    prisma.product.findMany({
      where: { ownerId, active: true, stock: { lte: prisma.product.fields.minStock } },
      include: { unit: true },
      orderBy: { stock: "asc" },
      take: 6,
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
  const expenseDelta = deltaPct(totalExpense, prevExpenses._sum.amount ?? 0);

  // Daily trend within the range (keyed by ISO date so ordering is chronological)
  const dayFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
  // Key lokal (bukan toISOString UTC) agar konsisten dengan kartu Transaksi
  // Mingguan & dashboard desktop, transaksi lewat tengah malam tidak terlempar
  // ke hari sebelumnya.
  const byDay = new Map<string, { key: string; total: number; cost: number }>();
  for (const s of sales) {
    const key = localKey(s.createdAt);
    const cur = byDay.get(key) ?? { key, total: 0, cost: 0 };
    cur.total += s.total;
    byDay.set(key, cur);
  }
  for (const i of productAgg) {
    const key = localKey(i.sale.createdAt);
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
  const methodData = [...byMethod.entries()]
    .map(([key, value]) => ({ key, name: methodLabel[key] ?? key, value }))
    .sort((a, b) => b.value - a.value);
  const topMethodRows = methodData.slice(0, 3);

  // Transaksi 7 hari terakhir (hingga akhir rentang): split Tunai vs Non-tunai,
  // zero-filled agar sumbu grafik kontinu, ala kartu Transaksi Mingguan di
  // dashboard desktop.
  const weekKeyFmt = new Intl.DateTimeFormat("id-ID", { weekday: "short" });
  const weekStart = endOfDay(new Date(toDate.getTime() - 6 * 86400000));
  const byWeek = new Map<string, { tunai: number; nontunai: number; count: number }>();
  for (const s of sales) {
    if (s.createdAt < weekStart) continue;
    const key = localKey(s.createdAt);
    const cur = byWeek.get(key) ?? { tunai: 0, nontunai: 0, count: 0 };
    if (s.paymentMethod === "CASH") cur.tunai += s.total;
    else cur.nontunai += s.total;
    cur.count += 1;
    byWeek.set(key, cur);
  }
  const weekData: { label: string; tunai: number; nontunai: number }[] = [];
  let weekTotal = 0;
  let weekCount = 0;
  for (let d = 6; d >= 0; d--) {
    const day = endOfDay(new Date(toDate.getTime() - d * 86400000));
    const cur = byWeek.get(localKey(day));
    const tunai = cur?.tunai ?? 0;
    const nontunai = cur?.nontunai ?? 0;
    weekTotal += tunai + nontunai;
    weekCount += cur?.count ?? 0;
    weekData.push({ label: weekKeyFmt.format(day), tunai, nontunai });
  }
  const weekTunai = weekData.reduce((s, d) => s + d.tunai, 0);
  const weekSum = weekTotal;

  // Series laba harian untuk sparkline (dari tren yang sudah dihitung).
  const profitSeries = trendData.map((d) => ({ value: d.profit }));

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
          "inline-flex min-h-11 shrink-0 items-center rounded-md px-4 py-2 text-xs font-semibold transition-colors",
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
                "flex min-h-11 shrink-0 items-center gap-1 rounded-r-md px-4 py-2 text-xs font-semibold transition-colors hover:bg-surface-container-low",
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
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <Download className="h-4 w-4" />
            Ekspor
          </a>
          <GuideDialog variant="chip" initialCategory="reports" />
        </div>
      </div>

      {/* Custom range form */}
      {custom && (
        <Card className="p-4">
          <form className="flex flex-wrap items-end gap-3" action="/reports">
              <div className="space-y-1">
                <label htmlFor="report-from" className="text-xs font-semibold text-on-surface-variant">Dari</label>
                <Input id="report-from" type="date" name="from" defaultValue={from ?? ""} />
            </div>
              <div className="space-y-1">
                <label htmlFor="report-to" className="text-xs font-semibold text-on-surface-variant">Sampai</label>
                <Input id="report-to" type="date" name="to" defaultValue={to ?? ""} />
            </div>
            <Button type="submit">
              Terapkan
            </Button>
          </form>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total pendapatan"
          value={formatRupiah(revenue)}
          icon={Banknote}
          delta={revDelta}
          sub={`${sales.length} transaksi · ${totalQty} item`}
        />
        <SummaryCard
          title="Laba kotor"
          value={formatRupiah(grossProfit)}
          icon={TrendingUp}
          delta={profitDelta}
          sub={`Pengeluaran: ${formatRupiah(totalExpense)} · Bersih: ${formatRupiah(netProfit)}`}
        />
        <SummaryCard
          title="Rata-rata nilai transaksi"
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
                <span className="text-xs font-medium">
                  {topQtyTotal ? Math.round((p.qty / topQtyTotal) * 100) : 0}%
                </span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-sm text-on-surface-variant">
                Tidak ada data. <Link href="/pos" className="font-semibold text-primary hover:underline">Mulai transaksi pertama di Kasir</Link>
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Metode pembayaran + transaksi mingguan + laba, analitik ala dashboard
          desktop, responsif: menumpuk di mobile, grid di desktop. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="flex flex-col p-5 lg:col-span-5">
          <h3 className="font-display text-base font-bold">Metode Pembayaran</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-4">
              {topMethodRows.map((m) => {
                const Icon = methodIcon[m.key] ?? Banknote;
                const st = methodStyle[m.key] ?? { bg: "bg-muted", text: "text-on-surface-variant" };
                const pct = revenue ? Math.round((m.value / revenue) * 100) : 0;
                return (
                  <div key={m.key} className="flex items-center gap-3">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", st.bg, st.text)}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-on-surface-variant">{m.name}</p>
                      <p className="truncate font-display text-base font-bold leading-tight">{formatRupiah(m.value)}</p>
                    </div>
                    <span className="text-xs font-semibold text-on-surface-variant">{pct}%</span>
                  </div>
                );
              })}
              {topMethodRows.length === 0 && <p className="text-sm text-on-surface-variant">Belum ada pembayaran di rentang ini</p>}
            </div>
            <div className="flex items-center justify-center">
              <MiniDonut
                data={topMethodRows.map((m) => ({ key: m.key, name: m.name, value: m.value }))}
                centerValue={rupiahCompact(revenue)}
                centerLabel="pendapatan"
              />
            </div>
          </div>
        </Card>

        <Card className="flex flex-col p-5 lg:col-span-3">
          <h3 className="font-display text-base font-bold">Transaksi Mingguan</h3>
          <div className="mt-3 flex items-center gap-2">
            <span className="font-display text-2xl font-bold leading-none">{weekCount}</span>
          </div>
          <p className="mt-1.5 text-sm text-on-surface-variant">transaksi · 7 hari terakhir</p>
          <div className="mt-4 flex-1">
            <WeeklyBars data={weekData} />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-on-surface-variant">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Tunai
              </span>
              <span className="text-xs font-medium">{weekSum ? Math.round((weekTunai / weekSum) * 100) : 0}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-on-surface-variant">
                <span className="h-2.5 w-2.5 rounded-full bg-on-surface-variant" /> Non-tunai
              </span>
              <span className="text-xs font-medium">{weekSum ? 100 - Math.round((weekTunai / weekSum) * 100) : 0}%</span>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col p-5 lg:col-span-4">
          <h3 className="font-display text-base font-bold">Laba</h3>
          <div className="mt-3 rounded-md bg-primary/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-on-surface-variant">Laba bersih</span>
              <span className="font-display text-lg font-bold">{formatRupiah(netProfit)}</span>
            </div>
            <div className="-mx-1 mt-2">
              <SparkArea data={profitSeries} />
            </div>
          </div>
          <div className="mt-4 flex flex-1 flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pendapatan</p>
                <span className="text-xs text-on-surface-variant">{formatRupiah(revenue)}</span>
              </div>
              <DeltaPill value={revDelta} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pengeluaran</p>
                <span className="text-xs text-on-surface-variant">{formatRupiah(totalExpense)}</span>
              </div>
              <DeltaPill value={expenseDelta} invert />
            </div>
          </div>
        </Card>
      </div>

      {/* Stok menipis */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-base font-bold">
            <PackageOpen className="h-4 w-4 text-tertiary" /> Stok Menipis
          </h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/stock">Kelola Stok</Link>
          </Button>
        </div>
        {lowStock.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            Semua stok aman. <Link href="/products" className="font-semibold text-primary hover:underline">Lihat produk</Link>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <Badge key={p.id} variant={p.stock === 0 ? "destructive" : "warning"} className="px-3 py-1.5">
                {p.name} · {p.stock} {p.unit?.short ?? ""}
              </Badge>
            ))}
          </div>
        )}
      </Card>

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
                <TableCell className="text-xs font-medium text-primary">{s.invoiceNo}</TableCell>
                <TableCell className="text-on-surface-variant">
                  {fmt(s.createdAt)}, {new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(s.createdAt)}
                </TableCell>
                <TableCell>{s.items.length} item</TableCell>
                <TableCell>{methodLabel[s.paymentMethod] ?? s.paymentMethod}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{formatRupiah(s.total)}</TableCell>
                <TableCell className="text-center">
                   <span className="inline-flex rounded-full bg-secondary-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-on-secondary-container">
                    Selesai
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-on-surface-variant">
                  Tidak ada data di rentang ini. <Link href="/pos" className="font-semibold text-primary hover:underline">Buat transaksi baru</Link>
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
