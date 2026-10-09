import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cn, formatRupiah, formatNumber, todayRange } from "@/lib/utils";
import { Card, Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import {
  ArrowLeftRight,
  ArrowRight,
  Banknote,
  CircleDollarSign,
  QrCode,
  ReceiptText,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { DonutChart, DONUT_COLORS } from "@/components/charts/report-charts";
import { TrendArea, MiniDonut, WeeklyBars } from "@/components/charts/dashboard-charts";
import { DeltaPill } from "@/components/delta-pill";
import { HomeMobile } from "@/components/home-mobile";
import { OnboardingTour } from "@/components/onboarding-tour";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dasbor" };

const methodLabel: Record<string, string> = { CASH: "Tunai", QRIS: "QRIS", TRANSFER: "Transfer" };
const methodIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  CASH: Banknote,
  QRIS: QrCode,
  TRANSFER: ArrowLeftRight,
};
import { paymentColors as methodStyle } from "@/lib/colors";
const rankColors = [
  "bg-primary-soft text-primary",
];
const categoryColors = [
  "bg-secondary-container text-on-secondary-container",
];

function rupiahCompact(n: number) {
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
function deltaPct(current: number, prev: number) {
  if (!prev) return null;
  return ((current - prev) / prev) * 100;
}
// Local YYYY-MM-DD key — timezone-safe (toISOString is UTC and would shift days off-server).
function localKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function categoryColor(name: string) {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return categoryColors[h % categoryColors.length];
}

function StatCard({
  bg,
  iconBg,
  tint,
  icon: Icon,
  value,
  badge,
  label,
  sub,
  featured = false,
}: {
  bg: string;
  iconBg: string;
  tint: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  badge: React.ReactNode;
  label: string;
  sub: string;
  featured?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl p-5 transition-shadow hover:shadow-md", bg)}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-15" style={{ background: tint }} />
      <div className={cn("mb-3 flex items-center justify-center rounded-full text-white", featured ? "h-14 w-14" : "h-12 w-12", iconBg)}>
        <Icon className={featured ? "h-7 w-7" : "h-6 w-6"} />
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("truncate font-display font-bold leading-none", featured ? "text-xl" : "text-lg")}>{value}</span>
        {badge}
      </div>
      <p className="mt-1.5 text-sm font-medium text-on-surface-variant">{label}</p>
      <p className="mt-0.5 text-xs text-on-surface-variant/80">{sub}</p>
    </div>
  );
}

// Halaman beranda di mobile = launcher grid menu (native), tanpa query berat.
function isMobileUA(ua: string) {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const ownerId = Number(session.user.id);
  const { start, end } = todayRange();
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const nextMonthStart = new Date(start.getFullYear(), start.getMonth() + 1, 1);

  // Data ringan beranda mobile (hero ringkasan, terlaris, restock) — jauh
  // lebih murah daripada 13 query dasbor desktop.
  const [mobileSales, topByQty, mobileLowStock, storeSetting, lowStockTotal] = await Promise.all([
    prisma.sale.aggregate({ where: { ownerId, createdAt: { gte: start, lt: end } }, _sum: { total: true }, _count: true }),
    // Top 6 produk by qty — dibatasi lewat groupBy, tanpa memuat semua item bulan ini.
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: { sale: { ownerId, createdAt: { gte: monthStart, lt: nextMonthStart } } },
      _sum: { qty: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 6,
    }),
    prisma.product.findMany({
      where: { ownerId, active: true, stock: { lte: prisma.product.fields.minStock } },
      select: { id: true, name: true, stock: true, unit: { select: { short: true } } },
      orderBy: { stock: "asc" },
      take: 6,
    }),
    prisma.setting.findUnique({ where: { ownerId } }),
    prisma.product.count({ where: { ownerId, active: true, stock: { lte: prisma.product.fields.minStock } } }),
  ]);

  const topIds = topByQty.map((t) => t.productId).filter((id): id is number => id != null);
  const [topRevenueItems, topProductsInfo] = await Promise.all([
    topIds.length
      ? prisma.saleItem.findMany({
          where: { sale: { ownerId, createdAt: { gte: monthStart, lt: nextMonthStart } }, productId: { in: topIds } },
          select: { productId: true, qty: true, price: true },
        })
      : Promise.resolve([] as { productId: number; qty: number; price: number }[]),
    topIds.length
      ? prisma.product.findMany({ where: { id: { in: topIds } }, select: { id: true, name: true, category: { select: { name: true } } } })
      : Promise.resolve([] as { id: number; name: string; category: { name: string } | null }[]),
  ]);
  const nameById = new Map(topProductsInfo.map((p) => [p.id, p.name]));
  const categoryById = new Map(topProductsInfo.map((p) => [p.id, p.category?.name ?? ""]));
  const revenueById = new Map<number, number>();
  for (const i of topRevenueItems) revenueById.set(i.productId, (revenueById.get(i.productId) ?? 0) + i.price * i.qty);
  const mobileTopProducts = topByQty.map((t) => ({
    id: t.productId,
    name: nameById.get(t.productId) ?? "Produk",
    category: categoryById.get(t.productId) ?? "",
    qty: t._sum.qty ?? 0,
    revenue: revenueById.get(t.productId) ?? 0,
  }));

  const homeData = {
    todayTotal: mobileSales._sum.total ?? 0,
    todayCount: mobileSales._count,
    storeName: storeSetting?.storeName ?? "Kasir Saya",
    topProducts: mobileTopProducts,
    lowStock: mobileLowStock.map((p) => ({ id: p.id, name: p.name, stock: p.stock, unit: p.unit?.short ?? "" })),
    lowStockCount: lowStockTotal,
  };

  // Mobile: beranda super-app (hero + grid + carousel), tanpa chart dasbor.
  // Tanpa wrapper lg:hidden — tablet/wide dengan UA mobile tetap menampilkan grid.
  const ua = (await headers()).get("user-agent") ?? "";
  if (isMobileUA(ua)) {
    return (
      <>
        <HomeMobile role={session.user.role} data={homeData} />
        {/* Walkthrough pertama kali masuk — sorot Kasir, Inventaris, Pengaturan (+ admin: Panduan Pengguna) */}
        <OnboardingTour userId={Number(session.user.id)} isAdmin={session.user.role === "ADMIN"} />
      </>
    );
  }

  const yStart = new Date(start.getTime() - 86400000);
  const daysAgo30 = new Date(start.getTime() - 29 * 86400000);
  const prevMonthStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);

  const [
    todaySales,
    yesterdaySales,
    monthSales,
    prevMonthSales,
    monthExpenses,
    prevMonthExpenses,
    lowStock,
    recentSales,
    totalProducts,
    trendSales,
    trendItems,
    monthItems,
    monthSalesList,
  ] = await Promise.all([
    prisma.sale.aggregate({ where: { ownerId, createdAt: { gte: start, lt: end } }, _sum: { total: true }, _count: true }),
    prisma.sale.aggregate({ where: { ownerId, createdAt: { gte: yStart, lt: start } }, _sum: { total: true }, _count: true }),
    prisma.sale.aggregate({ where: { ownerId, createdAt: { gte: monthStart } }, _sum: { total: true }, _count: true }),
    prisma.sale.aggregate({ where: { ownerId, createdAt: { gte: prevMonthStart, lt: monthStart } }, _sum: { total: true }, _count: true }),
    prisma.expense.aggregate({ where: { ownerId, createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { ownerId, createdAt: { gte: prevMonthStart, lt: monthStart } }, _sum: { amount: true } }),
    prisma.product.findMany({
      where: { ownerId, active: true, stock: { lte: prisma.product.fields.minStock } },
      include: { unit: true },
      orderBy: { stock: "asc" },
      take: 6,
    }),
    prisma.sale.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      take: 6,
      // Select eksplisit: jangan muat LONGTEXT paymentProof/qrisPayload.
      select: {
        id: true,
        invoiceNo: true,
        createdAt: true,
        total: true,
        paymentMethod: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.product.count({ where: { ownerId, active: true } }),
    prisma.sale.findMany({
      where: { ownerId, createdAt: { gte: daysAgo30 } },
      select: { createdAt: true, total: true, paymentMethod: true },
    }),
    prisma.saleItem.findMany({
      where: { sale: { ownerId, createdAt: { gte: daysAgo30 } } },
      select: { qty: true, cost: true, sale: { select: { createdAt: true } } },
    }),
    prisma.saleItem.findMany({
      where: { sale: { ownerId, createdAt: { gte: monthStart } } },
      include: { product: { include: { category: true } } },
    }),
    prisma.sale.findMany({ where: { ownerId, createdAt: { gte: monthStart } }, select: { paymentMethod: true, total: true } }),
  ]);

  const todayTotal = todaySales._sum.total ?? 0;
  const yesterdayTotal = yesterdaySales._sum.total ?? 0;
  const monthTotal = monthSales._sum.total ?? 0;
  const monthCount = monthSales._count;
  const prevMonthCount = prevMonthSales._count;
  const prevMonthRevenue = prevMonthSales._sum.total ?? 0;
  const monthExpense = monthExpenses._sum.amount ?? 0;
  const prevMonthExpense = prevMonthExpenses._sum.amount ?? 0;

  const todayDelta = deltaPct(todayTotal, yesterdayTotal);
  const monthCountDelta = deltaPct(monthCount, prevMonthCount);
  const expenseDelta = deltaPct(monthExpense, prevMonthExpense);
  const revenueDelta = deltaPct(monthTotal, prevMonthRevenue);

  // 30-day trend (zero-filled so the axis is continuous)
  const dayFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
  const weekKeyFmt = new Intl.DateTimeFormat("id-ID", { weekday: "short" });
  const byDay = new Map<string, { total: number; cost: number }>();
  for (const s of trendSales) {
    const key = localKey(s.createdAt);
    const cur = byDay.get(key) ?? { total: 0, cost: 0 };
    cur.total += s.total;
    byDay.set(key, cur);
  }
  for (const i of trendItems) {
    const key = localKey(i.sale.createdAt);
    const cur = byDay.get(key);
    if (cur) cur.cost += i.cost * i.qty;
  }
  const trendData = [];
  for (let d = 29; d >= 0; d--) {
    const day = new Date(start.getTime() - d * 86400000);
    const cur = byDay.get(localKey(day));
    const total = cur?.total ?? 0;
    trendData.push({ label: dayFmt.format(day), total, profit: total - (cur?.cost ?? 0) });
  }

  // Last 7 days: Tunai vs Non-tunai split (count aligns with the 7 bars)
  const byWeek = new Map<string, { tunai: number; nontunai: number; count: number }>();
  for (const s of trendSales) {
    const key = localKey(s.createdAt);
    const cur = byWeek.get(key) ?? { tunai: 0, nontunai: 0, count: 0 };
    if (s.paymentMethod === "CASH") cur.tunai += s.total;
    else cur.nontunai += s.total;
    cur.count += 1;
    byWeek.set(key, cur);
  }
  const weekData = [];
  let weekTotal = 0;
  let weekCount = 0;
  for (let d = 6; d >= 0; d--) {
    const day = new Date(start.getTime() - d * 86400000);
    const cur = byWeek.get(localKey(day));
    const tunai = cur?.tunai ?? 0;
    const nontunai = cur?.nontunai ?? 0;
    weekTotal += tunai + nontunai;
    weekCount += cur?.count ?? 0;
    weekData.push({ label: weekKeyFmt.format(day), tunai, nontunai });
  }
  const prevWeekCount = trendSales.filter((s) => {
    const diff = start.getTime() - s.createdAt.getTime();
    return diff > 7 * 86400000 && diff <= 14 * 86400000;
  }).length;
  const weekCountDelta = deltaPct(weekCount, prevWeekCount);
  const weekTunai = weekData.reduce((s, d) => s + d.tunai, 0);
  const weekSum = weekTunai + weekData.reduce((s, d) => s + d.nontunai, 0);

  // Top products by quantity (month)
  const byProduct = new Map<number, { id: number; name: string; sku: string; category: string; qty: number; revenue: number }>();
  for (const i of monthItems) {
    const p = i.product;
    const cur = byProduct.get(p.id) ?? { id: p.id, name: p.name, sku: p.sku, category: p.category?.name ?? "-", qty: 0, revenue: 0 };
    cur.qty += i.qty;
    cur.revenue += i.price * i.qty;
    byProduct.set(p.id, cur);
  }
  const topProducts = [...byProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  const topQtyTotal = topProducts.reduce((s, p) => s + p.qty, 0);

  // Payment method split (month)
  const byMethod = new Map<string, number>();
  for (const s of monthSalesList) byMethod.set(s.paymentMethod, (byMethod.get(s.paymentMethod) ?? 0) + s.total);
  const methodData = [...byMethod.entries()]
    .map(([key, value]) => ({ key, name: methodLabel[key] ?? key, value }))
    .sort((a, b) => b.value - a.value);
  const topMethodRows = methodData.slice(0, 3);

  const monthCost = monthItems.reduce((s, i) => s + i.cost * i.qty, 0);
  const netProfit = monthTotal - monthCost - monthExpense;

  return (
    <>
      {/* Mobile (fallback jika UA tidak terdeteksi): beranda super-app. */}
      <div className="lg:hidden">
        <HomeMobile role={session.user.role} data={homeData} />
      </div>
      <div className="hidden space-y-6 lg:block">
      {/* Row 1: welcome + stat cards */}
      <div className="grid grid-cols-12 gap-4">
        <div className="relative col-span-12 flex min-h-[180px] flex-col justify-between overflow-hidden rounded-xl bg-brand p-6 text-on-brand xl:col-span-6">
          <div className="relative z-10">
            <h1 className="font-display text-xl font-bold">Selamat datang, {session.user.name}</h1>
            <p className="mt-1 text-sm font-medium text-on-brand">Pantau performa toko Anda hari ini.</p>
            <div className="mt-4 inline-flex items-center overflow-hidden rounded-full bg-black/15">
              <div className="px-6 py-3 text-center">
                <div className="font-display text-lg font-bold leading-none">{todaySales._count}</div>
                <div className="mt-1 text-xs font-medium text-on-brand">Transaksi Hari Ini</div>
              </div>
              <div className="border-l border-white/20 px-6 py-3 text-center">
                <div className="font-display text-lg font-bold leading-none">{totalProducts}</div>
                <div className="mt-1 text-xs font-medium text-on-brand">Produk Aktif</div>
              </div>
            </div>
          </div>
          <Store className="pointer-events-none absolute -right-6 top-1/2 h-44 w-44 -translate-y-1/2 rotate-6 text-white/10" />
          <div className="pointer-events-none absolute -bottom-12 -right-10 h-52 w-52 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -top-14 right-24 h-28 w-28 rounded-full bg-white/10" />
        </div>

        <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-3 xl:col-span-6">
          <StatCard
            featured
            bg="bg-secondary-container"
            iconBg="bg-accent"
            tint="var(--accent)"
            icon={CircleDollarSign}
            value={formatRupiah(todayTotal)}
            badge={<DeltaPill value={todayDelta} />}
            label="Penjualan Hari Ini"
            sub={`${todaySales._count} transaksi`}
          />
          <StatCard
            bg="bg-primary-soft"
            iconBg="bg-primary"
            tint="var(--primary)"
            icon={ReceiptText}
            value={formatNumber(monthCount)}
            badge={<DeltaPill value={monthCountDelta} />}
            label="Transaksi Bulan Ini"
            sub={formatRupiah(monthTotal)}
          />
          <StatCard
            bg="bg-destructive-container"
            iconBg="bg-destructive"
            tint="var(--destructive)"
            icon={Wallet}
            value={formatRupiah(monthExpense)}
            badge={<DeltaPill value={expenseDelta} invert />}
            label="Pengeluaran Bulan Ini"
            sub="operasional"
          />
        </div>
      </div>

      {/* Row 2: trend + product donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="flex flex-col p-5 lg:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold">Tren Pendapatan</h2>
              <p className="text-xs text-on-surface-variant">30 hari terakhir</p>
            </div>
          </div>
          <TrendArea data={trendData} />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant pt-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-base font-semibold leading-tight">
                  {formatRupiah(monthTotal)}
                  <span className="ml-1.5 text-xs font-semibold text-on-surface-variant">laba {formatRupiah(monthTotal - monthCost)}</span>
                </p>
                <p className="text-xs text-on-surface-variant">Pendapatan bulan ini · {monthCount} transaksi</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/reports">
                Lihat Laporan
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col p-5 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Produk Terlaris</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2.5 py-1 text-[10px] font-bold text-on-secondary-container">
              <TrendingUp className="h-3 w-3" /> Terlaris
            </span>
          </div>
          <div className="mt-4">
            <DonutChart
              data={topProducts.map((p) => ({ name: p.name, value: p.qty }))}
              centerValue={String(topQtyTotal)}
              centerLabel="item terjual"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {topProducts.map((p, i) => {
              const pct = topQtyTotal ? Math.round((p.qty / topQtyTotal) * 100) : 0;
              return (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="truncate text-on-surface-variant">{p.name}</span>
                  <span className="ml-auto text-xs font-medium">{pct}%</span>
                </div>
              );
            })}
            {topProducts.length === 0 && (
              <p className="col-span-2 text-sm text-on-surface-variant">
                Belum ada penjualan bulan ini. <Link href="/pos" className="font-semibold text-primary hover:underline">Mulai di Kasir</Link>
              </p>
            )}
          </div>
          <p className="mt-auto pt-4 text-center text-xs text-on-surface-variant">Ringkasan produk paling laku bulan ini</p>
        </Card>
      </div>

      {/* Row 3: payment methods + weekly transactions + profit */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="flex flex-col p-5 lg:col-span-5">
          <h2 className="font-display text-base font-bold">Metode Pembayaran</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-4">
              {topMethodRows.map((m) => {
                const Icon = methodIcon[m.key] ?? Banknote;
                const st = methodStyle[m.key] ?? { bg: "bg-muted", text: "text-on-surface-variant" };
                const pct = monthTotal ? Math.round((m.value / monthTotal) * 100) : 0;
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
              {topMethodRows.length === 0 && <p className="text-sm text-on-surface-variant">Belum ada pembayaran bulan ini</p>}
            </div>
            <div className="flex items-center justify-center">
              <MiniDonut
                data={topMethodRows.map((m) => ({ key: m.key, name: m.name, value: m.value }))}
                centerValue={rupiahCompact(monthTotal)}
                centerLabel="bulan ini"
              />
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between rounded-xl bg-muted px-4 py-3 pt-3">
            <p className="text-sm text-on-surface-variant">Lihat rincian pembayaran</p>
            <Link
              href="/sales"
              aria-label="Lihat semua transaksi"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col p-5 lg:col-span-3">
          <h2 className="font-display text-base font-bold">Transaksi Mingguan</h2>
          <div className="mt-3 flex items-center gap-2">
            <span className="font-display text-2xl font-bold leading-none">{formatNumber(weekCount)}</span>
            <DeltaPill value={weekCountDelta} />
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
          <p className="mt-3 border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
            Total 7 hari: <span className="font-semibold text-foreground">{formatRupiah(weekTotal)}</span>
          </p>
        </Card>

        <Card className="flex flex-col p-5 lg:col-span-4">
          <h2 className="font-display text-base font-bold">Laba Bulan Ini</h2>
          <div className="mt-3 rounded-md bg-primary/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-on-surface-variant">Laba bersih</span>
              <span className="font-display text-lg font-bold">{formatRupiah(netProfit)}</span>
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">
              Lihat trennya di grafik <span className="font-semibold">Tren Pendapatan</span> mode Laba
            </p>
          </div>
          <div className="mt-4 flex flex-1 flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pendapatan</p>
                <span className="text-xs text-on-surface-variant">{formatRupiah(monthTotal)}</span>
              </div>
              <DeltaPill value={revenueDelta} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pengeluaran</p>
                <span className="text-xs text-on-surface-variant">{formatRupiah(monthExpense)}</span>
              </div>
              <DeltaPill value={expenseDelta} invert />
            </div>
          </div>
        </Card>
      </div>

      {/* Row 4: top products table + recent transactions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="overflow-hidden lg:col-span-8">
          <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
            <h2 className="font-display text-base font-bold">Produk Terlaris</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/reports">
                Lihat Semua
              </Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p, i) => (
                  <TableRow key={p.id} className="text-sm">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${rankColors[i % rankColors.length]}`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium leading-tight">{p.name}</p>
                          <span className="text-xs text-on-surface-variant">{p.sku}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold", categoryColor(p.category))}>
                        {p.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(p.qty)} item</TableCell>
                    <TableCell className="text-right font-semibold">{formatRupiah(p.revenue)}</TableCell>
                  </TableRow>
                ))}
                {topProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-on-surface-variant">
                      Belum ada penjualan bulan ini. <Link href="/pos" className="font-semibold text-primary hover:underline">Mulai di Kasir</Link>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="flex flex-col p-5 lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Transaksi Terbaru</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sales">
                Lihat Semua
              </Link>
            </Button>
          </div>
          <div className="flex-1 space-y-4">
            {recentSales.map((s) => {
              const st = methodStyle[s.paymentMethod] ?? { bg: "bg-muted", text: "text-on-surface-variant" };
              const Icon = methodIcon[s.paymentMethod] ?? Banknote;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", st.bg, st.text)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.customer?.name ?? "Pelanggan Umum"}</p>
                    <p className="truncate text-xs text-on-surface-variant">
                      {s.invoiceNo} · {new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(s.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{formatRupiah(s.total)}</span>
                </div>
              );
            })}
            {recentSales.length === 0 && <p className="py-6 text-center text-sm text-on-surface-variant">Belum ada transaksi</p>}
          </div>
        </Card>
      </div>

      {/* Low stock strip */}
      <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Stok Menipis</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/stock">
                Kelola Stok
              </Link>
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
      </div>
      {/* Walkthrough pertama kali masuk — sorot Kasir, Inventaris, Pengaturan (+ admin: Panduan Pengguna) */}
      <OnboardingTour userId={Number(session.user.id)} isAdmin={session.user.role === "ADMIN"} />
    </>
  );
}
