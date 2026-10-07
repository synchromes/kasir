"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import Image from "next/image";
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
      <div className="flex flex-wrap items-center justify-between gap-y-2 bg-surface px-4 py-4 lg:hidden">
        <Link href="/" className="flex min-h-11 items-center gap-2 font-display text-on-surface">
          <Image src="/logo-kasirku.png" alt="" width={44} height={44} className="rounded-xl" />
          <span><span className="block text-xl font-bold tracking-tight">Kasirku</span><span className="hidden text-[10px] font-medium text-on-surface-variant min-[480px]:block">Mudah · Cepat · Terpercaya</span></span>
        </Link>
        <div className="flex items-center gap-0.5">
          <NotificationBell className="[&>button]:h-11 [&>button]:w-11" />
          <GuideDialog userId={userId} />
          <Link
            href="/settings"
            aria-label="Pengaturan akun"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary transition-colors hover:bg-primary-fixed-dim"
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
