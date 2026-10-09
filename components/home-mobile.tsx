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
  TrendingUp,
  X,
  ReceiptText,
  Flame,
  ArrowUp,
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

// Warna tile stabil per menu (hash href) — tidak bergeser saat grid difilter.
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

// Watermark kartu Terlaris mengikuti kategori: makanan = mangkuk,
// minuman = gelas, selainnya = box. Nama produk dipakai cadangan bila
// kategori kosong, karena data seed memakai nama seperti Teh/Kopi.
const foodWords = ["makan", "food", "kuliner", "snack", "jajan", "mie", "roti", "kue", "nasi", "ayam", "bakso", "soto", "sate", "burger", "pizza", "donat", "martabak", "goreng", "indomie"];
const drinkWords = ["minum", "drink", "beverage", "kopi", "teh", "jus", "juice", "susu", "soda", "aqua", "air", "es ", "boba", "matcha", "sirup", "pucuk", "botol"];
function foodKind(category: string, name: string): "food" | "drink" | "other" {
  const text = `${category} ${name}`.toLowerCase();
  if (drinkWords.some((w) => text.includes(w))) return "drink";
  if (foodWords.some((w) => text.includes(w))) return "food";
  return "other";
}

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
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Beranda Kasirku</h1>
      {/* Search — memfilter menu grid secara real-time */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari menu..."
          aria-label="Cari menu"
           className="h-12 w-full rounded-2xl border border-input bg-surface-container-lowest pl-12 pr-12 text-sm text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary"
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
      <section className="relative overflow-hidden rounded-3xl bg-[linear-gradient(125deg,#2563eb,#0053c6)] p-4 text-white shadow-md sm:p-6">
        <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full border-[32px] border-white/5" />
        <ReceiptText aria-hidden="true" className="pointer-events-none absolute right-5 top-16 h-20 w-20 rotate-12 text-white/20 sm:h-28 sm:w-28" strokeWidth={1.5} />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <Store className="h-4 w-4" />
              {data.storeName}
            </span>
          </div>
          <p className="mt-5 text-xs font-medium sm:text-sm">Total Penjualan Hari Ini</p>
          <div className="relative mt-2 break-words font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {formatRupiah(data.todayTotal)}
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold">
            <ArrowUp aria-hidden="true" className="h-4 w-4" />
            {formatNumber(data.todayCount)} transaksi selesai
          </p>
          <div className="mt-5 flex gap-3">
            <Link
              href="/pos"
              className="flex min-w-0 flex-1 flex-col items-start gap-2 rounded-xl border border-white/30 bg-white/20 p-3 backdrop-blur-md transition-colors hover:bg-white/30 active:scale-95"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-[10px] font-semibold">Kasir Baru</span>
            </Link>
            <Link
              href="/reports"
              className="flex min-w-0 flex-1 flex-col items-start gap-2 rounded-xl border border-white/30 bg-white/20 p-3 backdrop-blur-md transition-colors hover:bg-white/30 active:scale-95"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-[10px] font-semibold">Laporan</span>
            </Link>
            <Link
              href="/stock"
              className="relative flex min-w-0 flex-1 flex-col items-start gap-2 rounded-xl border border-white/30 bg-white/20 p-3 backdrop-blur-md transition-colors hover:bg-white/30 active:scale-95"
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
              <PackageOpen className="h-5 w-5" />
              <span className="text-[10px] font-semibold">Stok</span>
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
      <section>
        <div className="grid grid-cols-4 justify-items-center gap-y-6 gap-x-1">
          {filtered.map((item) => {
            const Icon = item.icon;
            const Flat = flatIcon[item.href];
            const tile = tileColor(item.href);
            return (
              <Link key={item.href} href={item.href} data-tour={item.tour} className="flex w-full flex-col items-center gap-2">
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-[18px] transition-transform active:scale-95 min-[375px]:h-16 min-[375px]:w-16 sm:h-20 sm:w-20",
                    tile.bg
                  )}
                >
                  {Flat ? (
                    <Flat className="h-8 w-8 sm:h-10 sm:w-10" />
                  ) : (
                    <Icon className={cn("h-8 w-8", tile.text)} strokeWidth={2} />
                  )}
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

      {/* Carousel: produk terlaris bulan ini */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Flame aria-hidden="true" className="h-5 w-5 text-destructive" />Produk Terlaris</h2>
          <Link href="/reports" className="inline-flex min-h-11 items-center text-xs font-semibold text-primary">
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
                  "relative w-[190px] shrink-0 overflow-hidden rounded-2xl p-4 text-white shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.98] sm:w-[220px]",
                  topColors[i % topColors.length]
                )}
              >
                {foodKind(p.category, p.name) === "food" ? (
                  <MarkFood aria-hidden="true" className="pointer-events-none absolute -right-2 top-4 h-24 w-24 -rotate-12 opacity-25" />
                ) : foodKind(p.category, p.name) === "drink" ? (
                  <MarkDrink aria-hidden="true" className="pointer-events-none absolute -right-2 top-4 h-24 w-24 -rotate-12 opacity-25" />
                ) : (
                  <PackageOpen aria-hidden="true" className="pointer-events-none absolute -right-1 top-5 h-20 w-20 -rotate-12 text-white/10" />
                )}
                <span className="relative flex items-center gap-1.5 text-[11px] font-semibold">
                  <TrendingUp className="h-3.5 w-3.5" /> Terlaris
                </span>
                <h3 className="mt-2 line-clamp-2 font-bold leading-snug">{p.name}</h3>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <span>
                    <span className="block font-display text-lg font-bold leading-none">{formatNumber(p.qty)}</span>
                    <span className="text-[10px]">terjual</span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-white/85 px-2 py-1 text-[10px] font-bold text-on-surface backdrop-blur-sm">
                    {formatRupiah(p.revenue)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
