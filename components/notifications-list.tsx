"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationTypeIcon, NotificationTypeStyle, timeAgoLabel, type NotificationItem } from "@/components/notification-shared";

export function NotificationsList({
  initial,
  initialUnread,
}: {
  initial: NotificationItem[];
  initialUnread: number;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [unread, setUnread] = React.useState(initialUnread);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function markRead(id: number) {
    if (saving) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", id }),
    });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
      return true;
    } catch {
      setError("Notifikasi gagal diperbarui. Coba lagi.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function markAllRead() {
    if (unread === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "readAll" }),
    });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      setError("Notifikasi gagal diperbarui. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function onItemClick(n: NotificationItem) {
    if (!n.read && !(await markRead(n.id))) return;
    if (n.link) router.push(n.link);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <p className="text-sm font-medium text-on-surface-variant">
          {items.length} notifikasi{unread > 0 && ` · ${unread} belum dibaca`}
        </p>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={saving}
            className="flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tandai semua dibaca
          </button>
        )}
      </div>
      {error && <p role="alert" className="border-b border-destructive-container bg-destructive-container/40 px-4 py-2 text-sm text-on-destructive-container">{error}</p>}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Inbox className="h-10 w-10 text-outline" />
          <p className="text-sm font-medium">Tidak ada notifikasi</p>
          <p className="text-xs text-on-surface-variant">Transaksi, pembelian, dan alert stok akan muncul di sini.</p>
        </div>
      ) : (
        <ul className="divide-y divide-outline-variant">
          {items.map((n) => {
            const Icon = NotificationTypeIcon[n.type];
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onItemClick(n)}
                  disabled={saving}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-container-low",
                    !n.read && "bg-primary-fixed-dim/20"
                  )}
                >
                  <span className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", NotificationTypeStyle[n.type])}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{n.title}</span>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-0.5 block text-sm text-on-surface-variant">{n.message}</span>
                    <span className="mt-1 block text-xs font-medium text-outline">{timeAgoLabel(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
