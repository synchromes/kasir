import { AlertTriangle } from "lucide-react";

// Kotak peringatan amber di dalam dialog/form — memberi tahu konsekuensi
// sebelum aksi disimpan (mis. stok akan jatuh di bawah minimum, supplier
// tanpa kontak). Gaya konsisten dengan chip konsekuensi penghapusan.
export function WarningNote({ children }: { children: React.ReactNode }) {
  return (
    // role=status: peringatan muncul dinamis (saat mengetik qty / memilih
    // supplier) — harus diumumkan ke pembaca layar.
    <div role="status" className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
      <p className="flex-1 leading-relaxed text-amber-800">{children}</p>
    </div>
  );
}
