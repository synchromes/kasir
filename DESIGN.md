# DESIGN.md — Aplikasi Kasir

Arah gaya aplikasi kasir toko retail (internal, bukan landing marketing). Ditulis untuk menutup temuan audit antislop #5 (R-37) dan #13 (R-31).

Dial: ENERGY 1 / RHYTHM 2 / MOTION 1

- ENERGY 1 (tenang, ala alat kerja): tidak ada hero marketing, tidak ada gradien ungu-biru. Satu fokus per layar, mis. hero biru berisi omzet hari ini di mobile.
- RHYTHM 2 (konsisten dengan variasi): kartu memakai pola yang sama, tapi kepadatan beda antara dasbor desktop (grid 12 kolom) dan beranda mobile (hero + grid 4 kolom + carousel).
- MOTION 1 (hover saja): tanpa loop tak berujung. `animate-spin` hanya untuk loading nyata, `transition-transform active:scale` hanya umpan balik sentuh.

## Identitas

Material 3 terang seed biru + pola super-app di mobile (hero saldo, grid menu 4 kolom, carousel data asli). Bahasa Indonesia lugas. Font Inter karena keterbacaan angka struk dan tabel, bukan karena default AI.

## Palet terkunci (R-29)

Inti: `primary #004AC6`, `secondary #006C49` (hijau laba/stok aman), `tertiary #784B00` (amber peringatan). Aksen: `destructive #BA1A1A` (bahaya/habis). Netral: surface `#FAF8FF`, teks `#131B2E`, varian `#434655`, outline `#666979`. Tombol aksi memakai hijau gelap `accent #00714D` agar teks putih lolos AA. Menu mobile memakai token biru untuk navigasi umum, hijau untuk inventaris, amber untuk pengeluaran; merah hanya untuk kondisi bahaya. Kartu produk terlaris memakai primary, bukan warna acak per peringkat. Gunakan token semantik, bukan hex hardcode baru. Palet lama di grafik dan halaman desktop perlu mengikuti pemetaan yang sama saat disentuh.

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
- Layout: dasbor mengikuti narasi toko (ringkasan, tren, metode, mingguan, laba, tabel, transaksi, stok). Mobile memakai launcher grid karena kasir memegang HP saat jualan.
- POS: kolom pesanan, keranjang, dan total selebar 400px di desktop agar katalog mendapat ruang lebih; mobile mengikuti lebar layar.
- StatCard flagship: kartu Penjualan lebih besar karena itu angka yang dilihat tiap pagi.
- Panah: hanya untuk aksi yang butuh isyarat arah, sisanya teks polos.
- Badge: hanya status nyata (Habis/Menipis, hitungan panduan). `Hari Ini` dan `#1` duplikatif dihapus.
- Override yang dipertahankan: tidak ada pola bernama yang dipertahankan. Bila nanti ada, catat di sini satu baris.
