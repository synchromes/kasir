"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, BellRing, CheckCheck, Inbox, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NotificationTypeIcon,
  NotificationTypeStyle,
  timeAgoLabel,
  type NotificationItem,
} from "@/components/notification-shared";

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const firstRender = React.useRef(true);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setUnread(data.unread ?? 0);
      }
    } catch {
      // abaikan error polling; tetap tampilkan data lama
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat saat mount + polling 30 detik + refresh tiap navigasi.
  React.useEffect(() => {
    let active = true;
    async function tick() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (res.ok && active) {
          const data = await res.json();
          setItems(data.items ?? []);
          setUnread(data.unread ?? 0);
        }
      } catch {
        // abaikan error polling; tetap tampilkan data lama
      } finally {
        if (active) setLoading(false);
      }
    }
    tick();
    const t = setInterval(tick, 30_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  // Muat ulang setelah navigasi (pathname berubah), kecuali mount pertama.
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    load(true);
  }, [pathname, load]);

  // Tutup panel saat klik di luar.
  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function markRead(id: number) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", id }),
    });
  }

  async function markAllRead() {
    if (unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "readAll" }),
    });
  }

  function onItemClick(n: NotificationItem) {
    if (!n.read) markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div ref={panelRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load(true);
        }}
        aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`}
        aria-expanded={open}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-surface-container-high hover:text-primary"
      >
        {unread > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-lg">
          {/* Header panel */}
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <div>
              <h3 className="font-display text-sm font-bold">Notifikasi</h3>
              {unread > 0 && <p className="text-xs text-on-surface-variant">{unread} belum dibaca</p>}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tandai semua dibaca
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup notifikasi"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Daftar notifikasi */}
          <div className="max-h-[min(24rem,60dvh)] overflow-y-auto">
            {loading && items.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-on-surface-variant">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
                Memuat...
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Inbox className="h-8 w-8 text-outline" />
                <p className="text-sm font-medium">Tidak ada notifikasi</p>
                <p className="text-xs text-on-surface-variant">Aktivitas transaksi &amp; stok akan muncul di sini.</p>
              </div>
            )}
            {items.map((n) => {
              const Icon = NotificationTypeIcon[n.type];
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onItemClick(n)}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low",
                    !n.read && "bg-primary-fixed-dim/20"
                  )}
                >
                  <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", NotificationTypeStyle[n.type])}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{n.title}</span>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-on-surface-variant">{n.message}</span>
                    <span className="mt-1 block text-[11px] font-medium text-outline">{timeAgoLabel(n.createdAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {items.length > 0 && (
            <div className="border-t border-outline-variant px-4 py-2.5 text-center">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/notifications");
                }}
                className="cursor-pointer text-xs font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Lihat semua notifikasi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
