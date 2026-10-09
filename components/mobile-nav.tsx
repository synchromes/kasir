"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { clearPosStorage } from "@/lib/storage";
import { setCartBar } from "@/components/pos/cart-bar-store";
import { BottomNav } from "@/components/bottom-nav";
import { NotificationBell } from "@/components/notification-bell";
import { GuideDialog } from "@/components/guide-dialog";

// Header mobile: logo, avatar (ke Pengaturan), keluar. Bottom bar berisi
// 4 tab utama; menu lainnya dijangkau dari grid beranda.
export function MobileNav({ name, userId }: { name: string; userId: number }) {
  const initial = (name.trim().charAt(0) || "K").toUpperCase();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-y-2 bg-surface px-4 py-4 lg:hidden">
        <Link href="/" className="flex min-h-11 shrink-0 items-center gap-1.5 font-display text-on-surface min-[360px]:gap-2">
          <Image src="/logo-kasirku.png" alt="" width={44} height={44} className="h-8 w-8 rounded-xl min-[360px]:h-11 min-[360px]:w-11" />
          <span><span className="block text-base font-bold tracking-tight min-[360px]:text-xl">Kasirku</span><span className="hidden text-[10px] font-medium text-on-surface-variant min-[480px]:block">Mudah · Cepat · Terpercaya</span></span>
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
            onClick={() => { clearPosStorage(); setCartBar({ ownerId: null, count: 0, total: 0 }); void signOut({ callbackUrl: "/login" }); }}
            aria-label="Keluar"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-destructive"
          >
            <LogOut aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>

      <BottomNav userId={userId} />
    </>
  );
}
