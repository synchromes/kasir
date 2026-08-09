// Catatan polos di dalam dialog/form — memberi tahu konsekuensi sebelum aksi
// disimpan (mis. stok akan jatuh di bawah minimum, supplier tanpa kontak).
// Gaya konsisten dengan tip di dialog Panduan: teks polos tanpa background.
export function WarningNote({ children }: { children: React.ReactNode }) {
  return (
    // role=status: peringatan muncul dinamis (saat mengetik qty / memilih
    // supplier) — harus diumumkan ke pembaca layar.
    <div role="status" className="text-sm leading-relaxed text-on-surface-variant">
      <span className="font-semibold text-foreground">Catatan:</span> {children}
    </div>
  );
}
