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

Inter 400/500/600/700. Uppercase + tracking hanya untuk status nyata (Habis, Menipis), dengan alasan: status harus bisa dipindai sekilas. Judul section dan CTA memakai sentence-case. Monospace tidak dipakai di UI (angka memakai Inter); monospace hanya untuk string data teknis dan struk cetak.

Persentase perubahan Laporan memakai format ringkas saat mencapai 1.000% agar tetap muat di kolom mobile; nilai penuh tersedia pada label aksesibilitas dan title. Pada desktop mulai 1280px, ringkasan Laporan dan grafik berdampingan agar lebar layar dipakai untuk membaca angka dan trennya sekaligus.

## Ikon (R-04)

Watermark produk dan dekor hero mobile memakai on-surface transparan, sehingga bentuk tetap terbaca tanpa memutihkan latar di belakang teks putih. Ini menjaga kontras teks pada seluruh palet kartu, termasuk nama yang panjang.

Koreksi pemilik 9 Oktober 2026: bagian Nilai penjualan pada kartu Produk terlaris tampil langsung di permukaan warna tanpa background kaca, agar kartu lebih lega. Label dan nominal memakai putih; kaca hanya dipertahankan pada tombol hero.

Satu set Lucide dipilih karena stroke konsisten untuk ikon fungsional kecil (bukan dekorasi). Relevansi: `Banknote` = Tunai, `QrCode` = QRIS, `ArrowLeftRight` = Transfer, `ShoppingCart` = Kasir, `Warehouse` = Stok, `Compass` = panduan onboarding. `Sparkles` dilarang sebagai ikon generik.

## Gerak (R-19)

Hanya umpan balik: hover, `active:scale`, loading spinner berteks. Tidak ada fade-up massal, float, atau pulse tanpa akhir.

## Radius (R-11)

Skala: input/button `rounded-lg`, kartu/dialog `rounded-xl`, status/badge `rounded-full`. Pill hanya untuk status, bukan untuk input teks dan tombol utama.

## Alasan per keputusan (R-31)

- Pelanggan mobile (audit 007, temuan 1–4 disetujui pemilik 9 Oktober 2026): daftar kontak menampilkan nama, telepon, status member, poin, serta jumlah transaksi terkait dalam satu baris bertingkat tanpa geser horizontal. Satu menu tiga titik menampung Edit/Hapus; label menu tetap menyebut pelanggan dan hapus memakai konfirmasi konsekuensi yang sudah ada. Pencarian mencakup nama dan telepon, merapikan spasi query serta pemisah nomor telepon. Form memakai satu kolom di bawah 1024px, tipe tel dan autocomplete kontak, serta area label member minimal 44px; desktop mempertahankan tabel dan dua kolom kontak. Tidak menambahkan hero atau statistik ringkasan. Inter untuk nama/angka, surface putih dengan divider untuk pemisah kontak, hijau untuk Tambah/Simpan, biru untuk fokus, merah hanya Hapus. Search = pencarian, MoreVertical = aksi pelanggan, Pencil = edit, Trash2 = hapus, Coins = poin. Dial ENERGY 1 / RHYTHM 2 / MOTION 1; fokus pada mencari dan mengelola pelanggan, jarak memisahkan kontak, gerak hanya respons kontrol. Fokus kembali ke pemicu setelah menutup menu/form; setelah pelanggan dihapus, fokus menuju pencarian.
- Dashboard mobile (audit 006, temuan 1–4 disetujui pemilik 9 Oktober 2026): pertahankan hero biru, launcher empat kolom berwarna, carousel, dan tab bawah. Tombol hero memakai kaca putih 65%, teks on-surface 12px, serta ikon primary agar kontras terbaca. Pencarian menjangkau semua tujuan menu yang tersedia bagi peran pengguna; hasil memakai daftar berlabel, sedangkan grid awal tetap menghindari duplikasi tombol hero. Header pada layar di bawah 360px merampingkan logo dan nama aplikasi, dengan kontrol tetap 44px; label grid membungkus tanpa ellipsis. Produk terlaris menyebut Bulan ini dan Nilai penjualan sebelum diskon/pajak, diurutkan berdasarkan jumlah terjual. Ikon kategori mempunyai penghubung yang menyentuh node; ikon produk mengenali kata utuh dan nama produk lebih dahulu agar Chair tidak dianggap minuman dan beras/tepung mendapat simbol makanan. Ikon struk menandai jumlah transaksi, Warehouse menandai Stok, dan batang menandai peringkat produk; tidak memakai panah naik untuk jumlah tanpa perbandingan. Seluruh perubahan visual berlaku pada mobile; komposisi desktop tetap. Dial ENERGY 2 / RHYTHM 2 / MOTION 1.
- Warna: versi gelap dipilih agar lolos WCAG AA 4.5:1 (terukur, bukan kira-kira).
- Warna data: CASH selalu accent, QRIS selalu primary, TRANSFER selalu tertiary; warna tidak mengikuti urutan nilai pada grafik.
- Grafik kategorikal: memakai token chart-1 sampai chart-6; warna batang data minimal punya kontras non-teks 3:1 terhadap permukaan.
- Aksi tambah data, simpan, dan bayar memakai accent hijau; navigasi dan filter memakai primary biru. Merah untuk bahaya dan kartu Pengeluaran Bulan Ini (override pemilik: pengeluaran tampil merah agar langsung terbaca sebagai arus keluar).
- Agregat Non-tunai memakai on-surface-variant, terpisah dari identitas QRIS/Transfer. Grafik kategorikal memakai biru, hijau, amber, abu, olive, dan teal gelap sebagai palet data tersendiri; label dan pemisah tetap diperlukan untuk membedakan seri.
- Layout: dasbor mengikuti narasi toko (ringkasan, tren, metode, mingguan, laba, tabel, transaksi, stok). Kartu Laba murni ringkasan angka; tren laba hanya ada di grafik Tren Pendapatan agar tidak ganda. Mobile memakai launcher grid karena kasir memegang HP saat jualan.
- Laporan (audit 005, redesign disetujui pemilik 9 Oktober 2026): satu ringkasan omzet berukuran utama, laba bersih dan pengeluaran dua kolom, lalu statistik transaksi/item/rata-rata yang lebih kecil. Laba bersih hijau saat positif dan merah saat rugi; pengeluaran merah sebagai arus keluar. Rincian perhitungan laba memakai disclosure agar HPP tetap dapat dibaca tanpa memperpanjang tampilan awal. Empat pilihan periode memakai grid agar Kustom tetap terlihat di layar 320px. Satu grafik omzet/laba kotor mengisi hari tanpa transaksi dengan nol; periode panjang memakai bulan agar label terbaca. Label laba kotor menjelaskan bahwa pengeluaran belum dikurangkan; sparkline laba bersih dan grafik mingguan terpisah dihapus agar tidak berulang. Produk terlaris memakai peringkat, jumlah, dan nilai sebelum diskon/pajak; metode pembayaran memakai ikon identitas dan rincian angka, tanpa donat yang mengulang angka. Transaksi terakhir dibatasi lima baris, setiap baris dapat dibuka, dan Lihat semua mempertahankan tanggal laporan. Stok diakses dari menu Stok yang sudah ada. Desktop mempertahankan kepadatan melalui dua kolom produk/pembayaran dan tabel transaksi. Card tanpa bayangan, radius dan palet tetap mengikuti halaman Transaksi; Banknote = omzet, CalendarDays = periode, CreditCard = transaksi, Download = CSV, chevron = detail/disclosure. Dial ENERGY 2 / RHYTHM 2 / MOTION 1; angka omzet dan aksen biru membentuk fokus, jarak 20px memisahkan pekerjaan, dan gerak hanya umpan balik kontrol.
- POS: kolom pesanan, keranjang, dan total selebar 400px di desktop agar katalog mendapat ruang lebih; mobile mengikuti lebar layar.
- POS mobile ala GrabFood: daftar produk scroll di area sendiri; tab bawah diganti bar kasir (Beranda + ringkasan) saat keranjang berisi, dengan slide 200ms; seluruh pembayaran ada di halaman Rangkuman Pesanan yang memakai hook dan panel yang sama dengan kolom desktop.
- Kartu produk POS: tanpa pil harga dan tanpa teks kategori/stok; harga di bawah nama dengan font biasa; tombol bulat + bila kosong; bila terisi hanya lingkaran angka, ketuk untuk membuka stepper (qty 1 = hapus + tambah, qty > 1 = kurang + tambah); setiap aksi atau ketukan di luar menutup stepper; label Habis hanya saat stok nol. Tombol aksi kartu di kanan atas; ukuran dirampingkan di mobile (44px penuh di desktop) atas permintaan pemilik. Kartu Rangkuman tanpa outline di mobile (border penuh di desktop). Baris item Rangkuman: nama + subtotal di atas stepper pil putih yang selalu tampil (qty 1 = hapus + tambah, qty > 1 = kurang + tambah), sama seperti kartu Kasir.
- StatCard flagship: kartu Penjualan lebih besar karena itu angka yang dilihat tiap pagi.
- Panah: hanya untuk aksi yang butuh isyarat arah, sisanya teks polos.
- Badge: hanya status nyata (Habis/Menipis, hitungan panduan). `Hari Ini` dan `#1` duplikatif dihapus.
- Override yang dipertahankan: tile menu mobile + kartu Produk Terlaris memakai palet ceria multi-warna (bukan token monokrom) atas permintaan pemilik.
- Perubahan disetujui pemilik 8 Oktober 2026: stepper Rangkuman Pesanan mengikuti katalog. Angka jumlah membuka kontrol; tambah/kurang/hapus, ketukan di luar, perpindahan fokus, dan Escape menutupnya. Arahan ini menggantikan ketentuan stepper Rangkuman yang selalu tampil.
- Batas input memakai outline `#666979` agar kontras kontrol mencapai 3:1; divider dan border kartu tetap memakai outline-variant. Nominal chip kaca Terlaris memakai teks on-surface di atas kaca putih lebih opak agar terbaca pada seluruh warna kartu.
- Transaksi mobile (referensi dikoreksi pemilik 9 Oktober 2026): kartu Total Transaksi menjadi fokus di atas dengan periode dari tanggal filter atau rentang data nyata. Total menghitung seluruh hasil filter; footer Total Halaman menghitung baris halaman aktif. Kartu Riwayat Transaksi menampilkan pencarian, metode, dan kedua tanggal secara langsung dengan pembaruan otomatis; tanpa dialog Terapkan. Kartu daftar terpisah memakai pilihan ID Transaksi/Tanggal & Waktu yang benar-benar mengurutkan hasil, baris berisi ikon pembayaran, invoice, waktu, dan chevron untuk membuka detail. Footer bernuansa biru berisi total halaman, rentang hasil, dan ukuran halaman. Icon ReceiptText = ringkasan transaksi, SlidersHorizontal = filter, CreditCard = transaksi pembayaran, CalendarDays = tanggal, List/Clock3 = urutan daftar, chevron = detail atau halaman. Border input mengikuti kontras token outline, walaupun referensi memakai border lebih pucat. Tablet memakai filter dua kolom; desktop empat kolom dan tabel. Dial ENERGY 2 / RHYTHM 2 / MOTION 1; biru adalah aksen ringkasan/navigasi dan jarak kartu memisahkan tiga pekerjaan berbeda.
