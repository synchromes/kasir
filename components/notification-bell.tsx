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
  const [error, setError] = React.useState<string | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const firstRender = React.useRef(true);
  // Urutan request: hanya respons fetch TERBARU yang diterapkan, agar polling
  // yang selesai lebih lambat tidak menimpa data yang lebih baru.
  const fetchSeq = React.useRef(0);

  const apply = React.useCallback((seq: number, data: { items?: NotificationItem[]; unread?: number }) => {
    if (seq !== fetchSeq.current) return;
    setItems(data.items ?? []);
    setUnread(data.unread ?? 0);
  }, []);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const seq = ++fetchSeq.current;
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        apply(seq, data);
        if (seq === fetchSeq.current) setError(null);
      } else {
        if (seq === fetchSeq.current) setError("Notifikasi gagal dimuat.");
      }
    } catch {
      if (seq === fetchSeq.current) setError("Notifikasi gagal dimuat.");
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, [apply]);

  // Muat saat mount + polling 30 detik + refresh tiap navigasi.
  React.useEffect(() => {
    let active = true;
    async function tick() {
      const seq = ++fetchSeq.current;
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (res.ok && active) {
          const data = await res.json();
          apply(seq, data);
          if (seq === fetchSeq.current) setError(null);
        } else if (active && seq === fetchSeq.current) {
          setError("Notifikasi gagal dimuat.");
        }
      } catch {
        if (active && seq === fetchSeq.current) setError("Notifikasi gagal dimuat.");
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
  }, [apply]);

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

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function markRead(id: number) {
    // Optimistic update; dikembalikan bila request gagal.
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", id }),
      });
      if (!res.ok) throw new Error();
      setError(null);
      return true;
    } catch {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
      setUnread((u) => u + 1);
      setError("Gagal menandai notifikasi. Coba lagi.");
      return false;
    }
  }

  async function markAllRead() {
    if (unread === 0) return;
    const previousItems = items;
    const previousUnread = unread;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "readAll" }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Gagal: kembalikan ke kondisi sebenarnya dari server.
      fetchSeq.current++;
      setItems(previousItems);
      setUnread(previousUnread);
      setError("Gagal menandai notifikasi. Coba lagi.");
    }
  }

  async function onItemClick(n: NotificationItem) {
    if (!n.read && !(await markRead(n.id))) return;
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div ref={panelRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load(true);
        }}
        aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`}
        aria-expanded={open}
        className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-surface-container-high hover:text-primary"
      >
        {unread > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-4 right-4 top-[76px] z-50 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[22rem]">
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
                  className="flex min-h-[44px] cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tandai semua dibaca
                </button>
              )}
              <button
                type="button"
                onClick={() => { setOpen(false); triggerRef.current?.focus(); }}
                aria-label="Tutup notifikasi"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high"
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
           {!loading && error && (
             <div className="flex flex-col items-center gap-3 py-10 text-center">
               <p role="alert" className="text-sm font-medium text-destructive">{error}</p>
               <button type="button" onClick={() => load()} className="min-h-11 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-primary hover:bg-surface-container-low">
                 Coba lagi
               </button>
             </div>
           )}
           {!loading && !error && items.length === 0 && (
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
                className="min-h-11 cursor-pointer px-3 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
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
