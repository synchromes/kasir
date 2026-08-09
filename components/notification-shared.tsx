import { Bell, PackageSearch, ReceiptText, ShoppingBag, type LucideIcon } from "lucide-react";

export type NotificationType = "STOCK" | "SALE" | "PURCHASE" | "SYSTEM";

export type NotificationItem = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export const NotificationTypeIcon: Record<NotificationType, LucideIcon> = {
  STOCK: PackageSearch,
  SALE: ReceiptText,
  PURCHASE: ShoppingBag,
  SYSTEM: Bell,
};

export const NotificationTypeStyle: Record<NotificationType, string> = {
  STOCK: "bg-[#FFF4E5] text-[#FF9800]",
  SALE: "bg-[#E8F0FF] text-[#0085FF]",
  PURCHASE: "bg-[#E6FFFA] text-[#00C292]",
  SYSTEM: "bg-surface-container-high text-on-surface-variant",
};

// Waktu relatif dalam Bahasa Indonesia, tanpa library.
export function timeAgoLabel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d === 1) return "kemarin";
  if (d < 7) return `${d} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(iso));
}
