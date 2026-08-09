import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Ruler,
  Truck,
  Users,
  ClipboardList,
  Warehouse,
  ReceiptText,
  Wallet,
  BarChart3,
  UserRound,
  BellRing,
  type LucideIcon,
} from "lucide-react";

// Satu sumber menu untuk sidebar desktop DAN navigasi mobile, agar keduanya
// tidak bisa tidak sinkron. Menu penuh untuk semua akun (kasir & admin);
// satu-satunya pembeda: "Pengguna" (kelola akun kasir/admin baru) hanya ADMIN.
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const allNav: NavItem[] = [
  { href: "/", label: "Dasbor", icon: LayoutDashboard },
  { href: "/pos", label: "Kasir", icon: ShoppingCart },
  { href: "/products", label: "Inventaris", icon: Package },
  { href: "/categories", label: "Kategori", icon: Boxes },
  { href: "/units", label: "Satuan", icon: Ruler },
  { href: "/suppliers", label: "Supplier", icon: Truck },
  { href: "/customers", label: "Pelanggan", icon: Users },
  { href: "/purchases", label: "Pembelian", icon: ClipboardList },
  { href: "/stock", label: "Stok", icon: Warehouse },
  { href: "/sales", label: "Transaksi", icon: ReceiptText },
  { href: "/expenses", label: "Pengeluaran", icon: Wallet },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
  { href: "/notifications", label: "Notifikasi", icon: BellRing },
  { href: "/users", label: "Pengguna", icon: UserRound, adminOnly: true },
];

export function navForRole(role: string): NavItem[] {
  return allNav.filter((item) => role === "ADMIN" || !item.adminOnly);
}
