"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Settings, LogOut, Plus } from "lucide-react";
import { signOut } from "next-auth/react";
import { clearPosStorage } from "@/lib/storage";
import { setCartBar } from "@/components/pos/cart-bar-store";
import { cn } from "@/lib/utils";
import { navForRole } from "@/components/nav-items";

// Menu penuh untuk semua akun (kasir & admin) — sumbernya satu di
// components/nav-items.ts, dipakai bersama sidebar desktop & nav mobile.

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const nav = navForRole(role);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-outline-variant bg-surface lg:flex">
      <div className="px-5 pb-5 pt-6">
        <Link href="/" className="inline-block">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-primary"><Image src="/logo-kasirku.png" alt="" width={40} height={40} className="rounded-lg" />Kasirku</div>
        </Link>
      </div>

      <div className="mb-5 px-4">
        <Link
          href="/pos"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-container text-on-primary-container transition-all duration-200 hover:bg-surface-tint hover:text-on-primary active:scale-95"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs font-semibold">Penjualan Baru</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={item.tour}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition-colors duration-200",
                active
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-outline-variant px-2 py-3">
        <p className="px-3 pb-2 text-[11px] text-on-surface-variant">
          Masuk sebagai {role === "ADMIN" ? "Administrator" : "Stasiun Kasir"}
        </p>
        <Link
          href="/settings"
          data-tour="settings"
          className={cn(
            "mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition-colors duration-200",
            pathname.startsWith("/settings")
              ? "bg-primary-container text-on-primary-container"
              : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          Pengaturan
        </Link>
        <button
          onClick={() => { clearPosStorage(); setCartBar({ ownerId: null, count: 0, total: 0 }); void signOut({ callbackUrl: "/login" }); }}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide text-destructive transition-colors duration-200 hover:bg-destructive-container"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
