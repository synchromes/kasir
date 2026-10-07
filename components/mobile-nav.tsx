"use client";

import Link from "next/link";
import { LogOut, ShoppingCart } from "lucide-react";
import { signOut } from "next-auth/react";
import { BottomNav } from "@/components/bottom-nav";
import { NotificationBell } from "@/components/notification-bell";
import { GuideDialog } from "@/components/guide-dialog";

// Header mobile: logo, avatar (ke Pengaturan), keluar. Bottom bar berisi
// 4 tab utama; menu lainnya dijangkau dari grid beranda.
export function MobileNav({ name, userId }: { name: string; userId?: number }) {
  const initial = (name.trim().charAt(0) || "K").toUpperCase();

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-outline-variant bg-surface px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-primary">
          <ShoppingCart className="h-5 w-5" />
          Aplikasi Kasir
        </Link>
        <div className="flex items-center gap-1.5">
          <NotificationBell className="[&>button]:h-11 [&>button]:w-11" />
          <GuideDialog userId={userId} />
          <Link
            href="/settings"
            aria-label="Pengaturan akun"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-sm font-bold text-primary transition-colors hover:border-primary/50"
          >
            {initial}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Keluar"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Bottom tab bar (native): Beranda / Kasir / Transaksi / Laporan */}
      <BottomNav />
    </>
  );
}
