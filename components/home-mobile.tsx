"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  PackageOpen,
  Search,
  Settings,
  ShoppingCart,
  Store,
  X,
  ReceiptText,
  Flame,
  ChevronRight,
  Warehouse,
} from "lucide-react";
import { navForRole } from "@/components/nav-items";
import {
  FlatCategory,
  FlatCustomer,
  FlatDashboard,
  FlatExpense,
  FlatInventory,
  FlatNotification,
  FlatPurchase,
  FlatSettings,
  FlatSupplier,
  FlatTransaction,
  FlatUnit,
  FlatUser,
  MarkDrink,
  MarkFood,
} from "@/components/flat-icons";
import { cn, formatRupiah, formatNumber } from "@/lib/utils";
import { productIconKind } from "@/lib/product-icon-kind";

// Palet tile lembut Material (tanpa gradient) — satu warna per menu,
// dipakai berurutan agar grid terlihat hidup seperti super-app.
const tilePalette = [
  { bg: "bg-[#E8F0FF]", text: "text-[#0068D9]" },
  { bg: "bg-[#E6FFFA]", text: "text-[#008660]" },
  { bg: "bg-[#E5E7FF]", text: "text-[#6B46C1]" },
  { bg: "bg-[#FFF4E5]", text: "text-[#B96500]" },
  { bg: "bg-[#FFE5E5]", text: "text-[#CC2448]" },
  { bg: "bg-[#F3E5F5]", text: "text-[#8E24AA]" },
  { bg: "bg-[#E0F2F1]", text: "text-[#00897B]" },
];

// Warna solid untuk kartu "Produk Terlaris" (gaya promo native).
const topColors = [
  "bg-[#007F68]",
  "bg-[#0067DB]",
  "bg-[#6B46C1]",
  "bg-[#986000]",
  "bg-[#BA1A1A]",
  "bg-[#006F65]",
];

const noScrollbar = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// Ikon flat per menu: bentuk dan warna mengikuti fungsi menu. Sidebar
// desktop tetap memakai Lucide yang seragam pada ukuran kecil.
const flatIcon: Record<string, (props: { className?: string }) => React.ReactNode> = {
  "/": FlatDashboard,
  "/products": FlatInventory,
  "/categories": FlatCategory,
  "/units": FlatUnit,
  "/suppliers": FlatSupplier,
  "/customers": FlatCustomer,
  "/purchases": FlatPurchase,
  "/sales": FlatTransaction,
  "/expenses": FlatExpense,
  "/notifications": FlatNotification,
  "/settings": FlatSettings,
  "/users": FlatUser,
};

// Warna tile stabil per menu, mengikuti identitas launcher yang disetujui.
function tileColor(href: string) {
  const palette: Record<string, number> = { "/": 2, "/products": 0, "/categories": 3, "/units": 1, "/suppliers": 3, "/customers": 1, "/purchases": 6, "/sales": 2, "/expenses": 4, "/notifications": 0, "/users": 5 };
  return href === "/settings" ? { bg: "bg-surface-container-high", text: "text-on-surface-variant" } : tilePalette[palette[href] ?? 0];
}

export type HomeData = {
  todayTotal: number;
  todayCount: number;
  storeName: string;
  topProducts: { id: number; name: string; category: string; qty: number; revenue: number }[];
  lowStock: { id: number; name: string; stock: number; unit: string }[];
  lowStockCount: number;
};

// Beranda mobile bergaya aplikasi native (super-app): search + hero
// ringkasan + grid menu 4 kolom + banner stok + carousel data asli.
// Tujuan yang sudah punya tombol di kartu hero biru — jangan diduplikasi di grid.
const heroHrefs = new Set(["/pos", "/reports", "/stock"]);
const heroButton = "flex min-w-0 flex-1 flex-col items-start gap-2 rounded-xl border border-white/30 bg-white/65 p-2 text-on-surface backdrop-blur-md transition-colors hover:bg-white/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary min-[360px]:p-2.5";

export function HomeMobile({ role, data }: { role: string; data: HomeData }) {
  const allCards = [...navForRole(role), { href: "/settings", label: "Pengaturan", icon: Settings, tour: "settings" }];
  const cards = allCards.filter(item => !heroHrefs.has(item.href));
  const [q, setQ] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);
  const query = q.trim().toLowerCase();
  const filtered = allCards.filter(item => {
    const aliases = item.href === "/" ? "beranda" : item.href === "/pos" ? "buka kasir kasir baru" : item.href === "/products" ? "produk" : "";
    return `${item.label} ${aliases}`.toLowerCase().includes(query);
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Beranda Kasirku</h1>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
        <input
          ref={searchRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(event) => { if (event.key === "Escape") setQ(""); }}
          placeholder="Cari menu..."
          aria-label="Cari menu"
          className="h-12 w-full rounded-2xl border border-input bg-surface-container-lowest pl-12 pr-12 text-sm text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary [&::-webkit-search-cancel-button]:appearance-none"
        />
        {q && (
          <button
            onClick={() => { setQ(""); searchRef.current?.focus(); }}
            aria-label="Bersihkan pencarian"
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>

      {query ? (
        <section aria-label="Hasil pencarian menu" className="space-y-3">
          <p role="status" className="text-sm text-on-surface-variant">
            {filtered.length ? `${filtered.length} menu ditemukan` : `Tidak ada menu “${q.trim()}”`}
          </p>
          {filtered.length ? (
            <ul className="divide-y divide-outline-variant rounded-2xl border border-outline-variant bg-surface-container-lowest">
              {filtered.map(item => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} className="flex min-h-14 items-center gap-3 rounded-xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 break-words text-sm font-medium">{item.label}</span>
                      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-on-surface-variant" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-on-surface-variant">Coba nama menu lain, seperti Kasir, Laporan, atau Stok.</p>}
        </section>
      ) : (
        <>
      {/* Hero: ringkasan hari ini (ala kartu saldo super-app) */}
      <section aria-label="Ringkasan penjualan hari ini" className="relative overflow-hidden rounded-3xl bg-[linear-gradient(125deg,#2563eb,#0053c6)] p-4 text-white shadow-md sm:p-6">
        <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-on-surface/10" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full border-[32px] border-on-surface/5" />
        <ReceiptText aria-hidden="true" className="pointer-events-none absolute right-5 top-16 h-20 w-20 rotate-12 text-on-surface/15 sm:h-28 sm:w-28" strokeWidth={1.5} />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
              <Store aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{data.storeName}</span>
            </span>
          </div>
          <p className="mt-5 text-xs font-medium sm:text-sm">Total Penjualan Hari Ini</p>
          <div className="relative mt-2 break-words font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {formatRupiah(data.todayTotal)}
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold">
            <ReceiptText aria-hidden="true" className="h-4 w-4" />
            {formatNumber(data.todayCount)} transaksi selesai
          </p>
          <div className="mt-5 flex gap-2 min-[360px]:gap-3">
            <Link
              href="/pos"
              className={heroButton}
            >
              <ShoppingCart aria-hidden="true" className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold">Buka Kasir</span>
            </Link>
            <Link
              href="/reports"
              className={heroButton}
            >
              <BarChart3 aria-hidden="true" className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold">Laporan</span>
            </Link>
            <Link
              href="/stock"
              className={cn("relative", heroButton)}
            >
              {data.lowStockCount > 0 && (
                <span
                  role="img"
                  aria-label={`${formatNumber(data.lowStockCount)} produk perlu restock`}
                  className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center gap-0.5 rounded-full bg-tertiary-fixed px-1.5 text-[11px] font-bold text-on-tertiary-fixed ring-2 ring-white/40"
                >
                  <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
                  {formatNumber(data.lowStockCount)}
                </span>
              )}
              <Warehouse aria-hidden="true" className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold">Stok</span>
            </Link>
          </div>
          {data.lowStockCount > 0 && (
            <Link
              href="/stock"
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold"
            >
              <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
              {formatNumber(data.lowStockCount)} produk perlu restock
            </Link>
          )}
        </div>
      </section>

      {/* Grid menu 4 kolom — tile ikon berwarna ala super-app */}
      <section aria-label="Menu utama">
        <div className="grid grid-cols-4 justify-items-center gap-y-6 gap-x-1">
          {cards.map((item) => {
            const Icon = item.icon;
            const Flat = flatIcon[item.href];
            const tile = tileColor(item.href);
            return (
              <Link key={item.href} href={item.href} data-tour={item.tour} className="flex min-w-0 w-full flex-col items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-[18px] transition-transform active:scale-95 min-[375px]:h-16 min-[375px]:w-16 sm:h-20 sm:w-20",
                    tile.bg
                  )}
                >
                  {Flat ? (
                    <Flat className="h-8 w-8 sm:h-10 sm:w-10" />
                  ) : (
                    <Icon aria-hidden="true" className={cn("h-8 w-8", tile.text)} strokeWidth={2} />
                  )}
                </span>
                <span className="max-w-full break-words text-center text-[11px] font-medium leading-tight text-on-surface min-[360px]:text-xs">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Carousel: produk terlaris bulan ini */}
      <section aria-labelledby="top-products-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="top-products-title" className="flex items-center gap-2 font-display text-lg font-bold"><Flame aria-hidden="true" className="h-5 w-5 text-destructive" />Produk terlaris</h2>
          <Link href="/reports?preset=month" className="inline-flex min-h-11 shrink-0 items-center text-xs font-semibold text-primary">
            Lihat semua
          </Link>
        </div>
        <p className="mb-3 text-xs text-on-surface-variant">Bulan ini · Berdasarkan jumlah terjual</p>
        {data.topProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
            Belum ada penjualan bulan ini. Mulai transaksi pertama di Kasir.
          </div>
        ) : (
          <div className={cn("-mx-4 flex gap-3 overflow-x-auto px-4 pb-1", noScrollbar)}>
            {data.topProducts.map((p, i) => (
              <Link
                key={p.id}
                href="/reports?preset=month"
                className={cn(
                  "relative w-[190px] shrink-0 overflow-hidden rounded-2xl p-4 text-white shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white sm:w-[220px]",
                  topColors[i % topColors.length]
                )}
              >
                {productIconKind(p.category, p.name) === "food" ? (
                  <MarkFood aria-hidden="true" className="pointer-events-none absolute -right-2 top-4 h-24 w-24 -rotate-12 text-on-surface/20" />
                ) : productIconKind(p.category, p.name) === "drink" ? (
                  <MarkDrink aria-hidden="true" className="pointer-events-none absolute -right-2 top-4 h-24 w-24 -rotate-12 text-on-surface/20" />
                ) : (
                  <PackageOpen aria-hidden="true" className="pointer-events-none absolute -right-1 top-5 h-20 w-20 -rotate-12 text-on-surface/20" />
                )}
                <span className="relative flex items-center gap-1.5 text-[11px] font-semibold">
                  <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" /> Terlaris
                </span>
                <h3 className="relative mt-2 break-words line-clamp-2 font-bold leading-snug">{p.name}</h3>
                <div className="relative mt-4">
                  <span>
                    <span className="block font-display text-lg font-bold leading-none">{formatNumber(p.qty)}</span>
                    <span className="text-[10px]">terjual</span>
                  </span>
                  <span className="mt-3 block">
                    <span className="block text-[11px]">Nilai penjualan</span>
                    <span className="block break-words text-xs font-bold">{formatRupiah(p.revenue)}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {data.topProducts.length > 0 && <p className="mt-2 text-xs text-on-surface-variant">Nilai produk sebelum diskon dan pajak.</p>}
      </section>
        </>
      )}
    </div>
  );
}
