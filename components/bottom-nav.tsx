"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, ReceiptText, BarChart3, ChevronRight, type LucideIcon } from "lucide-react";
import { cn, formatRupiah, formatNumber } from "@/lib/utils";
import { useCartBar } from "@/components/pos/cart-bar-store";

const tabs: { href: string; label: string; icon: LucideIcon; tour?: string }[] = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/pos", label: "Kasir", icon: ShoppingCart, tour: "kasir" },
  { href: "/sales", label: "Transaksi", icon: ReceiptText },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
];

// Tab bar bawah ala aplikasi native: 4 shortcut utama. Menu lainnya
// dijangkau lewat grid beranda. Hanya tampil di viewport mobile.
// Khusus di halaman Kasir saat keranjang berisi: tab diganti bar kasir
// (Beranda + ringkasan belanja) dengan animasi slide ke atas.
export function BottomNav() {
  const pathname = usePathname();
  const cart = useCartBar();
  const showCartBar = pathname === "/pos" && cart.count > 0;

  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-outline-variant/40 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] lg:hidden"
    >
      {showCartBar ? (
        <div key="cartbar" className="flex animate-in items-stretch gap-2 px-4 pb-3 pt-3 slide-in-from-bottom-8 duration-200">
          <Link
            href="/"
            aria-label="Beranda"
            className="flex min-h-[56px] w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <Home className="h-6 w-6" />
            <span className="text-[10px] font-semibold">Beranda</span>
          </Link>
          <Link
            href="/pos/rangkuman"
            aria-label={`Lihat rangkuman pesanan, ${formatNumber(cart.count)} item, total ${formatRupiah(cart.total)}`}
            className="flex min-h-[56px] min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl bg-primary px-4 text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <ShoppingCart className="h-6 w-6 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold leading-tight">
                  {formatNumber(cart.count)} item · {formatRupiah(cart.total)}
                </span>
                <span className="block text-[11px] opacity-90">Lihat rangkuman pesanan</span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0" />
          </Link>
        </div>
      ) : (
      <div key="tabs" className="grid animate-in grid-cols-4 slide-in-from-bottom-8 duration-200">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              data-tour={tab.tour}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[68px] cursor-pointer flex-col items-center justify-center gap-1 pb-3 pt-2 text-[11px] font-semibold transition-colors",
                active ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  active ? "text-primary" : ""
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              {tab.label}
              {active && <span aria-hidden="true" className="absolute bottom-1 h-1 w-7 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
      )}
    </nav>
  );
}
