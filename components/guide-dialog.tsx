"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  CircleHelp,
  LayoutDashboard,
  Package,
  ReceiptText,
  RotateCcw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Tags,
  UserCog,
  Users,
  Warehouse,
} from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { firstVisible } from "@/lib/dom";

// Event yang dipakai walkthrough onboarding untuk membuka dialog Panduan di
// kategori tertentu (mis. "users" untuk langkah terakhir admin).
export const OPEN_GUIDE_EVENT = "kasir:open-guide";
// Event yang dipicu tombol "Ulangi tur" di dalam dialog Panduan.
export const RESTART_TOUR_EVENT = "kasir:restart-tour";

type GuideItem = {
  title: string;
  desc: string;
  steps: string[];
  tip?: string;
};

type GuideCategory = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  chipClass: string;
  items: GuideItem[];
};

// Kartu panduan: ikon kategori + judul + deskripsi + langkah bernomor + tip.
function ItemCard({ item, cat }: { item: GuideItem; cat: GuideCategory }) {
  const Icon = cat.icon;
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", cat.chipClass)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h4 className="font-semibold text-on-surface">{item.title}</h4>
          <p className="mt-0.5 text-sm text-on-surface-variant">{item.desc}</p>
        </div>
      </div>
      <ol className="mt-3 space-y-2">
        {item.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-on-surface-variant">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim/50 text-[11px] font-bold text-primary">
              {i + 1}
            </span>
            <span className="leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>
      {item.tip && (
        <p className="mt-3 text-xs font-medium text-on-surface-variant">Catatan: {item.tip}</p>
      )}
    </div>
  );
}

// Panduan lengkap semua fitur aplikasi. Dipakai di dialog "Bantuan" (ikon ?)
// di header desktop & mobile. Konten disusun per kategori agar mudah dicari.
const GUIDE: GuideCategory[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    chipClass: "bg-primary-soft text-primary",
    items: [
      {
        title: "Menjelajahi aplikasi",
        desc: "Cara berpindah antar halaman di desktop dan HP.",
        steps: [
          "Masuk dengan akun toko Anda (1 akun = 1 toko).",
          "Di desktop, gunakan menu sidebar di kiri untuk berpindah halaman.",
          "Di HP, gunakan tab bawah (Beranda, Kasir, Transaksi, Laporan), menu lainnya ada di grid halaman beranda.",
          "Menu Pengguna hanya tampil untuk akun admin.",
        ],
        tip: "Kotak pencarian di header desktop mencari produk & SKU dengan cepat.",
      },
    ],
  },
  {
    id: "pos",
    label: "Kasir (POS)",
    icon: ShoppingCart,
    chipClass: "bg-primary-soft text-primary",
    items: [
      {
        title: "Menjual produk",
        desc: "Alur transaksi dari memilih produk hingga pembayaran.",
        steps: [
          "Buka menu Kasir.",
          "Ketuk produk untuk menambahkan ke keranjang (atau ketuk gambar untuk lihat detail).",
          "Ubah jumlah item langsung di keranjang.",
          "Klik Bayar untuk masuk ke halaman pembayaran.",
        ],
      },
      {
        title: "Diskon penjualan",
        desc: "Diskon bisa berupa nominal (Rp) atau persen (%).",
        steps: [
          "Di halaman pembayaran, pilih jenis diskon: nominal atau persen.",
          "Isi nilai diskon, total otomatis dihitung ulang.",
          "Diskon dihitung ulang di server, jadi tidak bisa melebihi total.",
        ],
      },
      {
        title: "Metode pembayaran",
        desc: "Tunai, QRIS dinamis, atau transfer bank.",
        steps: [
          "Tunai: masukkan nominal dibayar, kembalian dihitung otomatis.",
          "QRIS: klik Lanjutkan Pembayaran, QRIS dinamis berisi nominal transaksi muncul besar untuk dipindai pelanggan.",
          "Transfer: pilih metode Transfer, lampirkan foto bukti transfer.",
        ],
        tip: "QRIS & Transfer membutuhkan foto bukti pembayaran agar transaksi bisa diverifikasi.",
      },
      {
        title: "Poin member",
        desc: "Pelanggan member mengumpulkan & memakai poin.",
        steps: [
          "Pilih pelanggan member di keranjang.",
          "Centang 'Gunakan poin' untuk memotong total dengan poin.",
          "Poin baru otomatis ditambahkan setelah transaksi (aturan poin di Pengaturan).",
        ],
      },
      {
        title: "Struk & cetak",
        desc: "Cetak struk setelah transaksi selesai.",
        steps: [
          "Setelah pembayaran sukses, halaman sukses menampilkan ringkasan & struk.",
          "Klik Cetak Struk untuk mencetak ke printer thermal 80 mm (atau simpan sebagai PDF).",
          "Struk memakai judul, footer, dan lebar yang diatur di Pengaturan.",
        ],
      },
    ],
  },
  {
    id: "products",
    label: "Produk & Inventaris",
    icon: Package,
    chipClass: "bg-secondary-container text-on-secondary-container",
    items: [
      {
        title: "Menambah produk",
        desc: "Lengkapi data produk baru lengkap dengan foto.",
        steps: [
          "Buka menu Produk → + Tambah Produk.",
          "Isi SKU, nama, kategori, satuan, harga beli & harga jual.",
          "Upload foto produk (dikompres otomatis agar hemat penyimpanan).",
          "Atur stok awal dan stok minimum untuk peringatan.",
        ],
      },
      {
        title: "Edit & nonaktifkan produk",
        desc: "Produk yang pernah terjual tidak bisa dihapus, tapi bisa dinonaktifkan.",
        steps: [
          "Klik Edit pada baris produk untuk mengubah data.",
          "Gunakan tombol daya untuk menonaktifkan/mengaktifkan produk.",
          "Produk nonaktif tidak muncul di kasir, tapi riwayatnya tetap aman.",
          "Cek chip peringatan di tombol hapus, produk berriwayat transaksi diblokir dari penghapusan.",
        ],
      },
      {
        title: "Filter & ekspor CSV",
        desc: "Cari dan unduh data produk.",
        steps: [
          "Gunakan kolom cari atau filter kategori/status stok.",
          "Klik Ekspor CSV untuk mengunduh daftar produk saat ini.",
        ],
      },
    ],
  },
  {
    id: "stock",
    label: "Stok",
    icon: Warehouse,
    chipClass: "bg-secondary-container text-on-secondary-container",
    items: [
      {
        title: "Memantau status stok",
        desc: "Status Tersedia, Stok Rendah, dan Habis.",
        steps: [
          "Buka menu Stok, kartu statistik menampilkan total produk, total stok, nilai stok, dan produk menipis.",
          "Pill status di tabel menandai produk yang perlu perhatian.",
        ],
      },
      {
        title: "Menyesuaikan stok",
        desc: "Opname atau koreksi stok manual.",
        steps: [
          "Klik Sesuaikan pada baris produk.",
          "Isi perubahan positif (+) atau negatif (-) dan catatan.",
          "Aplikasi memperingatkan jika stok baru jatuh di bawah minimum atau habis.",
        ],
      },
      {
        title: "Riwayat mutasi",
        desc: "Semua pergerakan stok tercatat.",
        steps: [
          "Buka tab Riwayat Mutasi di halaman Stok.",
          "Lihat waktu, produk, tipe (masuk/keluar/penyesuaian), dan catatan.",
        ],
      },
    ],
  },
  {
    id: "purchases",
    label: "Pembelian & Supplier",
    icon: ShoppingBag,
    chipClass: "bg-secondary-container text-on-secondary-container",
    items: [
      {
        title: "Mencatat pembelian",
        desc: "Stok masuk dari supplier otomatis menambah stok.",
        steps: [
          "Buka menu Pembelian → + Pembelian Baru.",
          "Pilih supplier (atau kosongkan untuk pembelian umum).",
          "Tambah item: produk, qty, dan harga beli.",
          "Simpan, stok bertambah & harga beli terbaru dipakai untuk nilai stok.",
        ],
        tip: "Peringatan muncul jika supplier terpilih belum punya kontak (telepon/alamat).",
      },
      {
        title: "Kelola supplier",
        desc: "Lengkapi kontak agar mudah dihubungi.",
        steps: [
          "Buka menu Supplier → + Tambah.",
          "Isi nama, telepon, dan alamat.",
          "Supplier tanpa kontak ditandai peringatan saat dipakai di pembelian.",
        ],
      },
    ],
  },
  {
    id: "customers",
    label: "Pelanggan",
    icon: Users,
    chipClass: "bg-primary-soft text-primary",
    items: [
      {
        title: "Member & poin",
        desc: "Pelanggan member mendapat dan memakai poin.",
        steps: [
          "Buka menu Pelanggan → + Tambah, centang Jadikan member.",
          "Poin didapat dari total belanja (aturan di Pengaturan, default 1 poin per Rp 10.000).",
          "Saat kasir, pilih pelanggan ini untuk memakai/ mengumpulkan poin.",
        ],
      },
    ],
  },
  {
    id: "categories",
    label: "Kategori & Satuan",
    icon: Tags,
    chipClass: "bg-secondary-container text-on-secondary-container",
    items: [
      {
        title: "Kelola kategori & satuan",
        desc: "Kelompokkan dan ukur produk.",
        steps: [
          "Buka menu Kategori atau Satuan.",
          "Tambah/edit nama dengan tombol + Tambah.",
          "Saat menghapus, cek chip amber: produk yang memakainya akan kehilangan kategori/satuan.",
        ],
      },
    ],
  },
  {
    id: "sales",
    label: "Transaksi",
    icon: ReceiptText,
    chipClass: "bg-primary-soft text-primary",
    items: [
      {
        title: "Melihat transaksi",
        desc: "Daftar penjualan lengkap dengan filter real-time.",
        steps: [
          "Buka menu Transaksi, daftar terurut dari yang terbaru.",
          "Gunakan filter (tanggal, metode, status), hasil berubah real-time tanpa tombol Terapkan.",
          "Klik transaksi untuk melihat detail, item, dan bukti pembayaran.",
          "Cetak ulang struk dari halaman detail.",
        ],
      },
    ],
  },
  {
    id: "reports",
    label: "Laporan",
    icon: BarChart3,
    chipClass: "bg-primary-soft text-primary",
    items: [
      {
        title: "Ringkasan & tren penjualan",
        desc: "Pantau performa toko.",
        steps: [
          "Buka menu Laporan.",
          "Lihat ringkasan penjualan, laba, dan pengeluaran.",
          "Gunakan grafik tren untuk melihat pola penjualan harian.",
        ],
      },
    ],
  },
  {
    id: "settings",
    label: "Pengaturan",
    icon: Settings,
    chipClass: "bg-primary-soft text-primary",
    items: [
      {
        title: "Info toko & struk",
        desc: "Data toko, pajak, dan tampilan struk.",
        steps: [
          "Buka menu Pengaturan.",
          "Isi nama toko, alamat, telepon, judul & footer struk.",
          "Atur pajak (%) dan poin per Rp 10.000.",
          "Klik Simpan Pengaturan (tombol di bar aksi bawah, bukan di dalam kartu).",
        ],
      },
      {
        title: "QRIS dinamis",
        desc: "Ubah QRIS statis menjadi dinamis berisi nominal.",
        steps: [
          "Di kartu QRIS Pembayaran, scan QRIS statis dengan kamera ATAU upload gambar QRIS ATAU tempel stringnya.",
          "Verifikasi pratinjau besar QR sebelum disimpan.",
          "Saat kasir memilih QRIS, aplikasi menyuntikkan nominal transaksi ke payload QR otomatis.",
          "Gunakan tombol Hapus jika toko berganti penyedia pembayaran.",
        ],
      },
    ],
  },
  {
    id: "notifications",
    label: "Notifikasi",
    icon: Bell,
    chipClass: "bg-primary-soft text-primary",
    items: [
      {
        title: "Lonceng & halaman notifikasi",
        desc: "Transaksi baru, pembelian, dan alert stok.",
        steps: [
          "Klik lonceng di header untuk melihat notifikasi terbaru.",
          "Klik notifikasi untuk langsung menuju halaman terkait.",
          "Buka halaman Notifikasi untuk daftar lengkap & tandai semua dibaca.",
        ],
      },
      {
        title: "Preferensi notifikasi",
        desc: "Aktifkan/matikan jenis notifikasi per akun.",
        steps: [
          "Di Pengaturan → kartu Notifikasi, matikan jenis yang tidak diinginkan.",
          "Saat mematikan, konfirmasi muncul, notif lama jenis itu ikut terhapus (cek chip amber).",
          "Nyalakan kembali notifikasi stok: alert untuk produk yang masih di bawah minimum dibuat ulang otomatis.",
        ],
      },
    ],
  },
  {
    id: "users",
    label: "Pengguna (Admin)",
    icon: UserCog,
    chipClass: "bg-primary-soft text-primary",
    items: [
      {
        title: "Kelola akun pengguna",
        desc: "Tambah kasir atau admin baru. Khusus akun admin.",
        steps: [
          "Buka menu Pengguna (hanya admin yang bisa).",
          "Klik + Tambah Pengguna, isi nama, email, password, role (Kasir/Admin), dan status.",
          "Setiap akun = 1 toko dengan datanya sendiri.",
          "Saat menghapus akun, periksa chip amber, seluruh data tokonya ikut terhapus permanen.",
        ],
      },
    ],
  },
];

export function GuideDialog({
  triggerClassName,
  initialCategory,
  variant = "icon",
  label = "Bantuan",
  userId,
}: {
  triggerClassName?: string;
  // Kategori yang langsung aktif saat dialog dibuka (tautan kontekstual per
  // halaman, mis. halaman Stok → kategori "stock").
  initialCategory?: string;
  // icon = tombol bulat ? (header); chip = tombol bertuliskan label (header halaman).
  variant?: "icon" | "chip";
  label?: string;
  // Dikirim dari layout, untuk tombol "Ulangi tur" (menghapus flag per akun).
  userId?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState<string>(() =>
    GUIDE.some((c) => c.id === initialCategory) ? (initialCategory as string) : GUIDE[0].id
  );
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  // Baris chips kategori di mobile: ref + status scroll untuk fade di tepi -
  // tanpa itu, chip yang terpotong di tepi kanan terlihat seperti bug padahal
  // barisnya bisa digeser.
  const chipsRef = React.useRef<HTMLDivElement>(null);
  const [chipEdge, setChipEdge] = React.useState<"none" | "left" | "right" | "both">("none");

  const updateChipEdge = React.useCallback(() => {
    const el = chipsRef.current;
    if (!el) return;
    const atLeft = el.scrollLeft <= 4;
    const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setChipEdge(atLeft && atRight ? "none" : atLeft ? "right" : atRight ? "left" : "both");
  }, []);

  // Buka dari luar (walkthrough onboarding): hanya instance dengan trigger
  // VISIBEL pertama yang merespons, mencegah dialog menumpuk (header desktop,
  // header mobile, dan chip halaman semuanya memasang listener).
  React.useEffect(() => {
    const onOpenGuide = (e: Event) => {
      // Instance yang trigger-nya terlihat pertama (header desktop/mobile atau
      // chip halaman) yang merespons, cegah dialog menumpuk.
      if (firstVisible("[data-guide-trigger]") !== triggerRef.current) return;
      const detail = (e as CustomEvent<{ category?: string }>).detail;
      if (detail?.category) {
        setActive(detail.category);
        setQ("");
      }
      setOpen(true);
    };
    window.addEventListener(OPEN_GUIDE_EVENT, onOpenGuide);
    return () => window.removeEventListener(OPEN_GUIDE_EVENT, onOpenGuide);
  }, []);

  // Ulangi tur pengenalan: hapus flag per-akun, tutup dialog, lalu beri tahu
  // walkthrough (di beranda) untuk tampil kembali dari langkah pertama.
  function restartTour() {
    try {
      localStorage.removeItem(`kasir-tour-v1-${userId}`);
    } catch {
      /* abaikan */
    }
    setOpen(false);
    window.dispatchEvent(new CustomEvent(RESTART_TOUR_EVENT));
    if (window.location.pathname !== "/") router.push("/");
  }

  const query = q.trim().toLowerCase();
  const results = React.useMemo(() => {
    if (!query) return null;
    // Cocokkan juga label kategori (mis. ketik "POS" atau "Laporan").
    return GUIDE.flatMap((cat) => {
      if (cat.label.toLowerCase().includes(query)) return cat.items.map((it) => ({ cat, item: it }));
      const hits = cat.items.filter(
        (it) =>
          it.title.toLowerCase().includes(query) ||
          it.desc.toLowerCase().includes(query) ||
          it.steps.some((s) => s.toLowerCase().includes(query))
      );
      return hits.length ? hits.map((it) => ({ cat, item: it })) : [];
    });
  }, [query]);

  // Saat pencarian aktif, klik kategori = bersihkan pencarian & pindah kategori
  // (chip tidak boleh terasa "mati" selama pencarian).
  function selectCategory(id: string) {
    setQ("");
    setActive(id);
  }

  const activeCat = GUIDE.find((c) => c.id === active) ?? GUIDE[0];
  const shownCats = query ? GUIDE.filter((c) => results?.some((r) => r.cat.id === c.id)) : null;

  // Saat dialog dibuka atau kategori berubah: bawa chip aktif ke tengah baris
  // (mobile) agar tidak pernah terpotong di tepi kanan; perbarui juga status
  // fade setelah posisi settle + saat layar berubah (rotasi).
  React.useEffect(() => {
    if (!open) return;
    // Ditunda sebentar: konten dialog di-mount Radix Presence satu render
    // setelah efek parent berjalan, ref baris chips masih null di titik ini.
    const t = window.setTimeout(() => {
      const el = chipsRef.current;
      if (!el) return;
      const chip = el.querySelector<HTMLButtonElement>('[aria-current="true"]');
      // Scroll ke tengah tanpa animasi: scrollIntoView smooth memakai rAF yang
      // bisa macet (webview throttled / tab background), hitung langsung saja.
      // Catatan: offsetLeft diukur relatif ke wrapper (relative) sehingga sudah
      // termasuk padding px-4 baris, angka itu ikut ter-scan di target dan
      // saling menghapus, jadi hasilnya tetap presisi tengah.
      if (chip) {
        const target = chip.offsetLeft - el.clientWidth / 2 + chip.offsetWidth / 2;
        el.scrollTo({ left: Math.max(0, target) });
      }
      updateChipEdge();
    }, 100);
    window.addEventListener("resize", updateChipEdge);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", updateChipEdge);
    };
  }, [open, active, updateChipEdge]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          data-guide-trigger
          data-tour="guide"
          aria-label={variant === "chip" ? `${label}, panduan ${activeCat.label}` : "Bantuan, panduan aplikasi"}
          className={cn(
            variant === "chip"
              ? "inline-flex h-11 min-h-[44px] shrink-0 cursor-pointer items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-4 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high hover:text-primary"
              : "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary",
            triggerClassName
          )}
        >
          <CircleHelp className="h-5 w-5 shrink-0" />
          {variant === "chip" && <span className="whitespace-nowrap">{label}</span>}
        </button>
      </DialogTrigger>
      {/* Lebar & gutter sudah ditangani di DialogContent dasar (ui.tsx), di
          sini cukup perbesar batas maksimum untuk desktop. */}
      <DialogContent
        className="max-w-3xl overflow-hidden p-0"
        onOpenAutoFocus={(e) => {
          // Samakan dengan pencarian POS: di HP jangan rebut fokus ke kolom
          // pencarian agar keyboard tidak terbuka sendiri saat dialog dibuka.
          if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
            e.preventDefault();
          }
        }}
      >
        <div className="flex max-h-[85dvh] flex-col">
          <DialogHeader className="border-b border-outline-variant px-6 pb-4 pt-6">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5 text-primary" /> Panduan Aplikasi
            </DialogTitle>
            <DialogDescription>Cara menggunakan semua fitur Aplikasi Kasir.</DialogDescription>
            <div className="relative mt-3">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari panduan... (mis. QRIS, diskon, stok)"
                aria-label="Cari panduan"
                className="h-10 bg-surface-container-lowest pl-4"
              />
            </div>
          </DialogHeader>

          {/* Kategori: chips horizontal geser (mobile) / sidebar (sm+) */}
          <div className="relative md:hidden">
            <div
              ref={chipsRef}
              onScroll={updateChipEdge}
              className="flex gap-2 overflow-x-auto overscroll-x-contain border-b border-outline-variant px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {GUIDE.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCategory(c.id)}
                  aria-current={active === c.id && !query ? "true" : undefined}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors min-h-[44px] inline-flex items-center",
                    active === c.id && !query
                      ? "bg-primary text-primary-foreground"
                      : "border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {/* Fade tepi: indikasi baris masih bisa digeser ke kiri/kanan */}
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-surface-container-lowest to-transparent",
                chipEdge === "left" || chipEdge === "both" ? "opacity-100" : "opacity-0"
              )}
            />
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-surface-container-lowest to-transparent",
                chipEdge === "right" || chipEdge === "both" ? "opacity-100" : "opacity-0"
              )}
            />
          </div>

          <div className="flex min-h-0 flex-1">
            <nav className="hidden w-56 shrink-0 overflow-y-auto border-r border-outline-variant p-3 md:block">
              {GUIDE.map((c) => {
                const Icon = c.icon;
                const hitCount = query ? results?.filter((r) => r.cat.id === c.id).length ?? 0 : 0;
                const dimmed = query && hitCount === 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCategory(c.id)}
                    aria-current={active === c.id && !query ? "true" : undefined}
                    className={cn(
                      "mb-1 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                      active === c.id && !query
                        ? "bg-primary-fixed-dim/40 text-primary"
                        : "text-on-surface-variant hover:bg-surface-container-high",
                      dimmed && "opacity-40"
                    )}
                  >
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", c.chipClass)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 truncate">{c.label}</span>
                    {query && hitCount > 0 && (
                      <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{hitCount}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {query ? (
                results && results.length > 0 ? (
                  <div className="space-y-5">
                    {shownCats?.map((c) => (
                      <div key={c.id}>
                        <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                          <c.icon className="h-4 w-4" /> {c.label}
                        </h3>
                        <div className="space-y-3">
                          {results.filter((r) => r.cat.id === c.id).map((r, i) => (
                            <ItemCard key={i} item={r.item} cat={r.cat} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-14 text-center text-sm text-on-surface-variant">
                    Tidak ada panduan yang cocok dengan &quot;{q}&quot;.
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                    <activeCat.icon className="h-4 w-4" /> {activeCat.label}
                  </h3>
                  {activeCat.items.map((it) => (
                    <ItemCard key={it.title} item={it} cat={activeCat} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ulangi tur pengenalan, hanya jika userId tersedia (layout beranda). */}
          {userId !== undefined && (
            <div className="flex items-center justify-between gap-3 border-t border-outline-variant px-5 py-2.5">
              <p className="text-xs text-on-surface-variant">Ingin melihat panduan singkat langkah demi langkah lagi?</p>
              <button
                type="button"
                onClick={restartTour}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high hover:text-primary"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Ulangi tur
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
