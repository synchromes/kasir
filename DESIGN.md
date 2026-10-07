# DESIGN.md — Aplikasi Kasir

Arah gaya aplikasi kasir toko retail (internal, bukan landing marketing). Ditulis untuk menutup temuan audit antislop #5 (R-37) dan #13 (R-31).

Dial: ENERGY 1 / RHYTHM 2 / MOTION 1

## Referensi mobile Kasirku (disetujui pemilik)

Beranda mengikuti gambar referensi pemilik: header Kasirku, hero penjualan biru, launcher empat kolom berwarna ceria, carousel produk, dan tab bawah putih dengan indikator aktif. Tile menu memakai ikon flat geometris 2D warna cerah sesuai fungsi tiap menu (kubus = Inventaris, truk = Supplier, dan seterusnya); watermark kartu Terlaris mengikuti kategori produk (mangkuk = makanan, gelas = minuman, box = lainnya) dengan nama produk sebagai cadangan bila kategori kosong; tombol hero dan pil harga memakai kaca putih (putih transfaran + blur); tooltip grafik selalu berlabel jelas (donat terlaris = jumlah terjual, spark laba = nominal rupiah); sidebar desktop tetap memakai Lucide yang seragam pada ukuran kecil. Peringatan stok hanya tampil sebagai lencana pada tombol Stok di hero (ikon + jumlah + tulisan Perlu restock); banner dan carousel restock terpisah dihapus agar tidak redundan. Logo resmi dari file pemilik dipasang sebagai `/logo-kasirku.png`; angka dan nama toko tetap berasal dari data aplikasi. Gradien biru menandai fokus penjualan, ikon struk menguatkan konteks kasir, dan ikon api hanya menandai produk terlaris. Warna tile mengikuti identitas menu; teks tetap gelap dan kartu berwarna memakai dasar yang cukup gelap untuk teks putih. Dial mobile ENERGY 2 / RHYTHM 2 / MOTION 1. Pencarian berlabel sesuai fungsi menu; tidak menampilkan dropdown toko atau badge notifikasi palsu.

- ENERGY 1 (tenang, ala alat kerja): tidak ada hero marketing, tidak ada gradien ungu-biru. Satu fokus per layar, mis. hero biru berisi omzet hari ini di mobile.
- RHYTHM 2 (konsisten dengan variasi): kartu memakai pola yang sama, tapi kepadatan beda antara dasbor desktop (grid 12 kolom) dan beranda mobile (hero + grid 4 kolom + carousel).
- MOTION 1 (hover saja): tanpa loop tak berujung. `animate-spin` hanya untuk loading nyata, `transition-transform active:scale` hanya umpan balik sentuh.

## Identitas

Material 3 terang seed biru + pola super-app di mobile (hero saldo, grid menu 4 kolom, carousel data asli). Bahasa Indonesia lugas. Font Inter karena keterbacaan angka struk dan tabel, bukan karena default AI.

## Palet terkunci (R-29)

Inti: `primary #004AC6`, `secondary #006C49` (hijau laba/stok aman), `tertiary #784B00` (amber peringatan). Aksen: `destructive #BA1A1A` (bahaya/habis). Netral: surface `#FAF8FF`, teks `#131B2E`, varian `#434655`, outline `#666979`. Tombol aksi memakai hijau gelap `accent #00714D` agar teks putih lolos AA. Menu mobile memakai palet tile ceria 7 warna (hash stabil per href) dan kartu Produk Terlaris memakai 6 warna solid berotasi — override pemilik: grid menu harus terlihat hidup/fun seperti super-app, bukan monokrom biru. Gunakan token semantik, bukan hex hardcode baru. Palet lama di grafik dan halaman desktop perlu mengikuti pemetaan yang sama saat disentuh.

## Tipografi (R-06)

Inter 400/500/600/700. Uppercase + tracking hanya untuk status nyata (Habis, Menipis), dengan alasan: status harus bisa dipindai sekilas. Judul section dan CTA memakai sentence-case.

## Ikon (R-04)

Satu set Lucide dipilih karena stroke konsisten untuk ikon fungsional kecil (bukan dekorasi). Relevansi: `Banknote` = Tunai, `QrCode` = QRIS, `ArrowLeftRight` = Transfer, `ShoppingCart` = Kasir, `Warehouse` = Stok, `Compass` = panduan onboarding. `Sparkles` dilarang sebagai ikon generik.

## Gerak (R-19)

Hanya umpan balik: hover, `active:scale`, loading spinner berteks. Tidak ada fade-up massal, float, atau pulse tanpa akhir.

## Radius (R-11)

Skala: input/button `rounded-lg`, kartu/dialog `rounded-xl`, status/badge `rounded-full`. Pill hanya untuk status, bukan untuk input teks dan tombol utama.

## Alasan per keputusan (R-31)

- Warna: versi gelap dipilih agar lolos WCAG AA 4.5:1 (terukur, bukan kira-kira).
- Warna data: CASH selalu accent, QRIS selalu primary, TRANSFER selalu tertiary; warna tidak mengikuti urutan nilai pada grafik.
- Grafik kategorikal: memakai token chart-1 sampai chart-6; warna batang data minimal punya kontras non-teks 3:1 terhadap permukaan.
- Aksi tambah data, simpan, dan bayar memakai accent hijau; navigasi dan filter memakai primary biru. Merah untuk bahaya dan kartu Pengeluaran Bulan Ini (override pemilik: pengeluaran tampil merah agar langsung terbaca sebagai arus keluar).
- Agregat Non-tunai memakai on-surface-variant, terpisah dari identitas QRIS/Transfer. Grafik kategorikal memakai biru, hijau, amber, abu, olive, dan teal gelap sebagai palet data tersendiri; label dan pemisah tetap diperlukan untuk membedakan seri.
- Layout: dasbor mengikuti narasi toko (ringkasan, tren, metode, mingguan, laba, tabel, transaksi, stok). Kartu Laba murni ringkasan angka; tren laba hanya ada di grafik Tren Pendapatan agar tidak ganda. Mobile memakai launcher grid karena kasir memegang HP saat jualan.
- POS: kolom pesanan, keranjang, dan total selebar 400px di desktop agar katalog mendapat ruang lebih; mobile mengikuti lebar layar.
- StatCard flagship: kartu Penjualan lebih besar karena itu angka yang dilihat tiap pagi.
- Panah: hanya untuk aksi yang butuh isyarat arah, sisanya teks polos.
- Badge: hanya status nyata (Habis/Menipis, hitungan panduan). `Hari Ini` dan `#1` duplikatif dihapus.
- Override yang dipertahankan: tile menu mobile + kartu Produk Terlaris memakai palet ceria multi-warna (bukan token monokrom) atas permintaan pemilik.
