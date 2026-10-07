"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, ReceiptText, BarChart3, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs: { href: string; label: string; icon: LucideIcon; tour?: string }[] = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/pos", label: "Kasir", icon: ShoppingCart, tour: "kasir" },
  { href: "/sales", label: "Transaksi", icon: ReceiptText },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
];

// Tab bar bawah ala aplikasi native: 4 shortcut utama. Menu lainnya
// dijangkau lewat grid beranda. Hanya tampil di viewport mobile.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] lg:hidden"
    >
      <div className="grid grid-cols-4">
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
                "flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors",
                active ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  active ? "bg-primary-fixed-dim/40" : ""
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
