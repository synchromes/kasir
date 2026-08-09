import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { ConfirmProvider } from "@/components/confirm-dialog";
import { NotificationBell } from "@/components/notification-bell";
import { GuideDialog } from "@/components/guide-dialog";
import { Search } from "lucide-react";
import { Input } from "@/components/ui";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role as string;
  const name = session.user.name ?? "Pengguna";
  const initial = (name.trim().charAt(0) || "K").toUpperCase();
  const userId = Number(session.user.id);

  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-background">
        {/* Shell aplikasi disembunyikan saat cetak (print:hidden = display:none) —
            bila hanya visibility:hidden, layout shell tetap terhitung sehingga
            halaman @page auto menjadi tinggi kosong setelah struk. */}
        <div className="print:hidden">
          <Sidebar role={role} />
        </div>
        <div className="lg:pl-60">
          <header className="print:hidden sticky top-0 z-40 hidden h-16 items-center justify-between gap-4 border-b border-outline-variant bg-surface px-6 lg:flex">
            <form action="/products" className="relative w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <Input
                name="q"
                placeholder="Cari produk, SKU..."
                className="h-9 rounded-md border-outline-variant bg-surface-container-lowest pl-9 text-sm shadow-none"
              />
            </form>
            <div className="flex items-center gap-1 text-on-surface-variant">
              <NotificationBell />
              <GuideDialog userId={userId} />
              <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high text-sm font-bold text-primary">
                {initial}
              </div>
            </div>
          </header>
          <div className="print:hidden">
            <MobileNav name={name} userId={userId} />
          </div>
          {/* pb-24 memberi ruang agar konten tidak tertutup bottom tab bar di mobile;
              padding dinetralkan saat cetak agar tinggi halaman @page mengikuti struk */}
          <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8 print:px-0 print:py-0 print:pb-0">{children}</main>
        </div>
      </div>
    </ConfirmProvider>
  );
}
