// Chip amber yang menampilkan konsekuensi penghapusan (jumlah data terkait yang
// ikut terhapus/berubah) di samping tombol hapus. Murni dekoratif — informasi
// lengkapnya selalu ada di dialog konfirmasi, jadi chip tidak dibaca screen
// reader (aria-hidden) agar tidak bingung dengan tombol di sekitarnya.
export function ConsequenceChip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      title={title}
      className="inline-flex max-w-[10rem] items-center gap-1 truncate rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 shadow-sm ring-1 ring-amber-200"
    >
      {children}
    </span>
  );
}
