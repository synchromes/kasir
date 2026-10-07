"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  PackageOpen,
  Search,
  Settings,
  ShoppingCart,
  Store,
  TrendingUp,
  X,
} from "lucide-react";
import { navForRole } from "@/components/nav-items";
import { cn, formatRupiah, formatNumber } from "@/lib/utils";

// Biru untuk navigasi umum, hijau inventaris, amber pengeluaran.
const tilePalette = [
  { bg: "bg-primary-soft", text: "text-primary" },
  { bg: "bg-secondary-container", text: "text-on-secondary-container" },
  { bg: "bg-tertiary-soft", text: "text-tertiary" },
];

// Warna solid untuk kartu "Produk Terlaris" (gaya promo native).
const topColors = ["bg-primary"];

const noScrollbar = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// Kelompok tetap sama saat menu difilter.
function tileColor(href: string) {
  if (["/products", "/categories", "/units", "/suppliers", "/purchases"].includes(href)) return tilePalette[1];
  if (href === "/expenses") return tilePalette[2];
  return tilePalette[0];
}

export type HomeData = {
  todayTotal: number;
  todayCount: number;
  storeName: string;
  topProducts: { id: number; name: string; qty: number; revenue: number }[];
  lowStock: { id: number; name: string; stock: number; unit: string }[];
  lowStockCount: number;
};

// Beranda mobile bergaya aplikasi native (super-app): search + hero
// ringkasan + grid menu 4 kolom + banner stok + carousel data asli.
// Tujuan yang sudah punya tombol di kartu hero biru — jangan diduplikasi di grid.
const heroHrefs = new Set(["/pos", "/reports", "/stock"]);

export function HomeMobile({ role, data }: { role: string; data: HomeData }) {
  const nav = navForRole(role).filter((item) => !heroHrefs.has(item.href));
  const cards = [...nav, { href: "/settings", label: "Pengaturan", icon: Settings, tour: "settings" }];
  const [q, setQ] = React.useState("");
  const query = q.trim().toLowerCase();
  const filtered = query ? cards.filter((c) => c.label.toLowerCase().includes(query)) : cards;

  return (
    <div className="flex flex-col gap-5">
      {/* Search — memfilter menu grid secara real-time */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari menu..."
          aria-label="Cari menu"
          className="h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest pl-12 pr-10 text-sm text-on-surface shadow-sm outline-none transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            aria-label="Bersihkan pencarian"
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Hero: ringkasan hari ini (ala kartu saldo super-app) */}
      <section className="relative overflow-hidden rounded-3xl bg-primary-container p-5 text-on-primary-container shadow-md">
        <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 right-20 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <Store className="h-4 w-4" />
              {data.storeName}
            </span>
          </div>
          <div className="mt-3 font-display text-3xl font-bold leading-none tracking-tight">
            {formatRupiah(data.todayTotal)}
          </div>
          <p className="mt-1.5 text-xs text-on-primary-container/80">
            {formatNumber(data.todayCount)} transaksi selesai
          </p>
          <div className="mt-5 flex gap-3">
            <Link
              href="/pos"
              className="flex flex-1 flex-col items-center gap-1.5 rounded-xl bg-white/15 py-2.5 transition-colors hover:bg-white/25 active:scale-95"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-[10px] font-semibold">Kasir Baru</span>
            </Link>
            <Link
              href="/reports"
              className="flex flex-1 flex-col items-center gap-1.5 rounded-xl bg-white/15 py-2.5 transition-colors hover:bg-white/25 active:scale-95"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-[10px] font-semibold">Laporan</span>
            </Link>
            <Link
              href="/stock"
              className="flex flex-1 flex-col items-center gap-1.5 rounded-xl bg-white/15 py-2.5 transition-colors hover:bg-white/25 active:scale-95"
            >
              <PackageOpen className="h-5 w-5" />
              <span className="text-[10px] font-semibold">Stok</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Grid menu 4 kolom — tile ikon berwarna ala super-app */}
      <section>
        <div className="grid grid-cols-4 justify-items-center gap-y-6 gap-x-1">
          {filtered.map((item) => {
            const Icon = item.icon;
            const tile = tileColor(item.href);
            return (
              <Link key={item.href} href={item.href} data-tour={item.tour} className="flex w-full flex-col items-center gap-2">
                <span
                  className={cn(
                    "flex h-[60px] w-[60px] items-center justify-center rounded-[18px] transition-transform active:scale-90",
                    tile.bg
                  )}
                >
                  <Icon className={cn("h-8 w-8", tile.text)} strokeWidth={2} />
                </span>
                <span className="max-w-full truncate px-0.5 text-center text-[12px] font-medium leading-tight text-on-surface">
                  {item.label}
                </span>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-4 flex flex-col items-center gap-2 py-8 text-center">
              <Search className="h-8 w-8 text-outline" />
              <p className="text-sm text-on-surface-variant">Tidak ada menu &quot;{q}&quot;</p>
              <p className="max-w-[240px] text-xs text-on-surface-variant/80">
                Kasir, Laporan &amp; Stok ada di tab bawah atau tombol kartu biru
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Banner stok menipis */}
      {data.lowStockCount > 0 && (
        <Link
          href="/stock"
          className="group flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:bg-surface-container-low"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Stok menipis</span>
            <span className="block truncate text-xs text-on-surface-variant">
              {formatNumber(data.lowStockCount)} produk butuh restock
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-on-surface-variant opacity-60 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {/* Carousel: produk terlaris bulan ini */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold">Produk Terlaris</h2>
          <Link href="/reports" className="text-xs font-semibold text-primary">
            Lihat semua
          </Link>
        </div>
        {data.topProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
            Belum ada penjualan bulan ini. Mulai transaksi pertama di Kasir.
          </div>
        ) : (
          <div className={cn("-mx-4 flex gap-3 overflow-x-auto px-4 pb-1", noScrollbar)}>
            {data.topProducts.map((p, i) => (
              <Link
                key={p.id}
                href="/reports"
                className={cn(
                  "relative w-[190px] shrink-0 overflow-hidden rounded-2xl p-4 text-white shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.98]",
                  topColors[i % topColors.length]
                )}
              >
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/85">
                  <TrendingUp className="h-3.5 w-3.5" /> Terlaris
                </span>
                <h3 className="mt-2 line-clamp-2 font-bold leading-snug">{p.name}</h3>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <span>
                    <span className="block font-display text-lg font-bold leading-none">{formatNumber(p.qty)}</span>
                    <span className="text-[10px] text-white/80">terjual</span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-white/20 px-2 py-1 text-[10px] font-bold">
                    {formatRupiah(p.revenue)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Carousel: perlu restock */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold">Perlu Restock</h2>
          <Link href="/stock" className="text-xs font-semibold text-primary">
            Kelola stok
          </Link>
        </div>
        {data.lowStock.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 text-center text-sm text-on-surface-variant">
            Semua stok aman
          </div>
        ) : (
          <div className={cn("-mx-4 flex gap-3 overflow-x-auto px-4 pb-1", noScrollbar)}>
            {data.lowStock.map((p) => (
              <Link
                key={p.id}
                href="/stock"
                className="w-[160px] shrink-0 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
              >
                <span
                  className={cn(
                    "flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    p.stock === 0 ? "bg-destructive-container text-on-destructive-container" : "bg-tertiary-fixed text-on-tertiary-fixed"
                  )}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {p.stock === 0 ? "Habis" : "Menipis"}
                </span>
                <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span
                    className={cn("font-display text-lg font-bold leading-none", p.stock === 0 ? "text-on-destructive-container" : "text-tertiary")}
                  >
                    {formatNumber(p.stock)}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">{p.unit || "pcs"} tersisa</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
