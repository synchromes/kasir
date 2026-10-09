# Transaksi mobile sesuai referensi pemilik: PASS

Cakupan: halaman Transaksi sesuai gambar yang dikoreksi pemilik pada 9 Oktober 2026. Komposisi dan alasan desain dicatat di DESIGN.md. Dial tetap ENERGY 2 / RHYTHM 2 / MOTION 1, dengan ringkasan nominal sebagai fokus.

Kartu Total Transaksi menampilkan jumlah seluruh hasil filter dan periode dari filter/data nyata. Kartu Riwayat Transaksi menampilkan pencarian, metode, dan kedua tanggal secara langsung. Perubahan valid langsung memperbarui hasil. Kartu daftar terpisah memiliki pengurutan ID Transaksi atau Tanggal & Waktu, baris invoice/waktu, ikon pembayaran, dan chevron detail. Footer menghitung total halaman, rentang hasil, serta ukuran halaman. Input tetap memiliki area sentuh minimal 44px.

## Bukti

- [Preview lengkap](sales-reference-evidence/mobile-reference.png). Viewport preview ditinggikan agar seluruh komposisi dan tab bawah terlihat; [ukuran preview](sales-reference-evidence/preview-info.json). Data tetap berasal dari database lokal.
- [320px](sales-reference-evidence/mobile-chromium-320.png), [393px](sales-reference-evidence/mobile-chromium-393.png), [tablet 768px](sales-reference-evidence/mobile-chromium-768.png), [desktop 1440px](sales-reference-evidence/desktop-chromium-1440.png), [footer](sales-reference-evidence/mobile-chromium-footer-393.png), dan [hasil kosong](sales-reference-evidence/mobile-chromium-empty-320.png).
- `npm run build`: PASS, termasuk pemeriksaan TypeScript produksi.
- `npm run lint` dan `tsc --noEmit`: PASS.
- [Uji UI](sales-reference-evidence/test-results.json): 12 PASS, 0 gagal, 0 dilewati.
- [Regresi](sales-reference-evidence/regression-results.json): 4 PASS, termasuk auto-collapse stepper pembayaran dan label filter 320px.
- Axe WCAG A/AA: 0 pelanggaran pada `main`, baik daftar awal maupun filter aktif. Bukti: `sales-reference-evidence/*-axe-list.json` dan `*-axe-filter.json`.

Pengujian produksi memakai Edge dengan profil desktop dan emulasi Pixel 7, pada lebar 320, 393, 640, 768, 1024, serta 1440px. Viewport pendek 320×420 memeriksa field tanggal dapat di-scroll di atas tab bawah. Perangkat fisik, keyboard IME sungguhan, dan Safari belum diuji. Tes tidak membuat transaksi atau mengubah stok. Server produksi pengujian terpisah dari server dev pemilik.

## Delivery Gate: Hard Gate

| Item | Status dan bukti |
|---|---|
| R-02 copy | PASS: teks UI baru tidak memakai em dash. |
| R-03 mobile | PASS: `scrollWidth <= innerWidth` pada enam lebar; teks baris tidak keluar dari link dan ukuran kontrol diukur. |
| R-17 angka | PASS: count, sum, min/max tanggal memakai aggregate Prisma dengan `where` yang sama dan ownerId pengguna. |
| R-18 testimoni | PASS: tidak ada testimoni. |
| R-23 aset | PASS: logo resmi, Inter, serta navigasi yang sudah ada dipakai; ikon fungsional sesuai referensi dan DESIGN.md. Tidak membuat logo/avatar baru. |
| R-24 tautan | PASS: invoice membuka `/sales/{id}`; pengurutan memiliki URL nyata yang mempertahankan filter. |
| R-25 kontras | PASS: axe 0 pelanggaran; token baru diukur dengan contrast-check.py, hasil di bawah. |
| R-26 kontrol | PASS: pencarian, tiga metode, tanggal awal/akhir, reset, urutan, link detail, pagination, ukuran halaman, dan bantuan mempunyai tindakan nyata. |
| R-27 keadaan | PASS: hasil kosong dan Rp 0 ditampilkan; loading RSC tertunda diumumkan; tanggal terbalik memberi error serta tidak diterapkan; error boundary aplikasi tetap menyediakan Coba lagi. |
| R-28 panduan | PASS: panduan menerangkan filter langsung, pengurutan, dan perbedaan total hasil vs halaman. |
| R-32 keyboard | PASS: Tab menuju invoice, ring fokus terlihat, Enter membuka detail dan memilih pengurutan, Escape menutup bantuan. |
| R-33 source | PASS: source ditulis melalui apply_patch; skrip browser hanya menyimpan bukti. |
| R-34 tema | PASS: tema terang sesuai DESIGN.md; tidak menambahkan mode atau toggle tema. |
| R-35 verifikasi | PASS: build produksi berjalan; 12 uji UI dan 4 regresi berhasil dengan catatan tindakan di bawah. |
| R-36 klaim | PASS: tidak menambahkan klaim keamanan, kepatuhan, atau performa. |
| R-37 arah | PASS: gambar koreksi pemilik menjadi acuan; komposisi diumumkan sebelum implementasi dan dicatat di DESIGN.md. |
| R-38 isi | PASS: invoice, tanggal, total, dan jumlah transaksi berasal dari data sebenarnya; angka/tanggal contoh gambar tidak disalin sebagai data aplikasi. |

## Delivery Gate: Purpose Gate

| Item | Status dan alasan |
|---|---|
| R-01 gradien | PASS: memakai permukaan biru muda solid sesuai referensi; tanpa gradien atau glow baru. |
| R-04 ikon | PASS: ReceiptText untuk ringkasan, SlidersHorizontal untuk filter, CalendarDays untuk tanggal, CreditCard untuk pembayaran, List/Clock3 untuk urutan, chevron untuk navigasi. |
| R-06 font | PASS: Inter mempertahankan keterbacaan invoice dan rupiah; nominal ringkasan memakai tabular-nums. |
| R-07 pola | PASS: tanpa grid dekoratif atau blueprint. |
| R-08 panah | PASS: chevron hanya menunjukkan detail dan perpindahan halaman. |
| R-09 pil | PASS: pil periode menyatakan rentang nyata; tidak memuat label marketing atau duplikasi judul. |
| R-10 kaca | PASS: tidak menambahkan kaca. |
| R-12 shadow | PASS: tiga bagian memakai Card tanpa shadow tambahan; baris memakai border ringan sesuai referensi. |
| R-13 glow | PASS: tidak menambahkan glow. |
| R-14 konsistensi | PASS: baris seragam untuk memindai invoice; ringkasan, filter, daftar, dan footer memiliki komposisi sesuai tugas masing-masing. |
| R-19 motion | PASS: hover/sentuh, fokus, dan loading nyata; tanpa animasi dekoratif atau loop baru. |
| R-22 ilustrasi | PASS: tanpa ilustrasi generik. |

## Delivery Gate: Liveliness

| Item | Status dan bukti |
|---|---|
| Dial eksplisit | PASS: ENERGY 2 / RHYTHM 2 / MOTION 1 dalam DESIGN.md. |
| Konsistensi dial | PASS: aksen biru Kasirku, variasi tiga kartu menurut fungsi, dan gerak hanya feedback. |
| Fokus | PASS: nominal Total Transaksi paling menonjol di area ringkasan. |
| Ruang | PASS: jarak antar kartu memisahkan ringkasan, filter, dan daftar; input/baris menyediakan ruang sentuh. |
| Aksen | PASS: biru menandai ringkasan, urutan aktif, ikon pembayaran, serta navigasi. |
| Identitas | PASS: Kasirku, Inter, rupiah, invoice, dan tab bawah tetap menjadi motif aplikasi kasir. |
| Design Read | PASS: rancangan dibaca sebagai riwayat penjualan toko dengan komposisi yang diberikan pemilik; arah dan alasan tertulis di DESIGN.md. |

## Delivery Gate: Craftsmanship dan Quality Locks

| Item | Status dan bukti |
|---|---|
| C-1 intent | PASS: total di atas untuk membaca seluruh hasil, filter terlihat untuk menyesuaikan riwayat, serta daftar invoice terpisah untuk membuka detail. |
| C-2 fungsi | PASS: pengurutan mengubah orderBy server; panah nonaktif berlabel, disabled, dan diredupkan. |
| C-3 komposisi | PASS: semua bagian berasal dari pekerjaan pengguna dan referensi yang dikoreksi. |
| C-4 ketahanan | PASS: enam lebar, filter invalid/valid, loading, hasil kosong, reload, Back, dan keyboard diuji. |
| C-5 bukti | PASS: angka nyata; hasil tes dan screenshot disimpan. |
| R-05 layout | PASS: ringkasan/filter/daftar mengikuti referensi; tidak menambahkan hero marketing, bento, atau grafik dekoratif. |
| R-11 radius | PASS: input/tombol/baris rounded-lg, kartu rounded-xl; lingkaran hanya panel ikon dan kontrol halaman yang sudah ada. |
| R-15 CTA | PASS: Reset filter dan label navigasi menyatakan tindakan sebenarnya. |
| R-16 bahasa | PASS: copy berisi penjualan, invoice, tanggal, dan halaman; tanpa buzzword marketing. |
| R-20 karakter | PASS: ringkasan rupiah, periode transaksi, invoice, metode pembayaran, serta struk/detail sesuai kasir retail. |
| R-21 tema | PASS: tema terang yang sudah ditetapkan. |
| R-29 palet | PASS: memakai token primary, primary-soft, surface-container-low, on-surface, dan outline; tidak menambahkan hex baru ke source. |
| R-30 gaya | PASS: mengacu pada gambar Kasirku pemilik; tidak meniru produk lain. |
| R-31 alasan | PASS: keputusan visual, fungsi ikon, total lintas halaman, dan pembagian filter menurut lebar ditulis di DESIGN.md. |

## UI, mobile, dan aksesibilitas

- PASS palet, aksen, copy, komposisi, radius, dan motion mengikuti arah tertulis; tidak menambahkan emoji, status palsu, angka buatan, atau dekorasi pengisi.
- PASS mobile satu kolom, tablet filter dua kolom mulai 640px, desktop empat kolom dan tabel mulai 1024px. Tabel desktop memiliki overflow dalam region sendiri.
- PASS semua kontrol form dan link invoice minimal 44px; ikon di dalam link tidak dihitung sebagai tombol terpisah.
- PASS hover mempunyai tindakan klik/sentuh yang sama. Pilihan urutan adalah link navigasi berlabel, bukan tab ARIA tanpa perilaku keyboard.
- PASS bottom nav memakai safe-area yang sudah ada; field pada viewport pendek dan footer terakhir dapat di-scroll di atasnya.
- PASS label/id input, aria-invalid/describedby error tanggal, aria-current urutan aktif, ring fokus, serta label panah nonaktif diperiksa.
- PASS keadaan kosong memberi tindakan selanjutnya; loading berteks diuji dengan penundaan respons RSC; pesan error tanggal terbaca tanpa bergantung pada warna.
- PASS reflow pada lebar efektif 320px dan viewport pendek; batas pengujian perangkat dinyatakan di bagian Bukti.

## Catatan tindakan yang diuji

| Kontrol/perilaku | Bukti hasil |
|---|---|
| Cari Transaksi | Kata kunci masuk URL; hasil kosong muncul, menghapus kata kunci memulihkan daftar. |
| Metode | CASH/QRIS dipilih melalui select, query diperbarui dan pencarian dipertahankan; seluruh opsi memiliki nilai metode enum yang valid. |
| Tanggal | Rentang valid masuk URL; rentang terbalik memberi pesan, aria-invalid, dan tidak mengganti filter server. Memperbaiki rentang menerapkan kedua tanggal. |
| Reset filter | Pencarian, metode, dan tanggal dibersihkan; input serta hasil kembali sesuai URL. |
| Ukuran halaman | 10, 20, dan 100 mengganti baris serta kembali ke halaman 1, mempertahankan filter. |
| Total Transaksi | Dibandingkan dengan jumlah nominal seluruh baris tabel per=100; tidak berubah ketika ukuran/nomor halaman berubah. |
| Total Halaman | Dibandingkan dengan nominal hanya invoice yang tampil pada halaman aktif; berbeda dari total seluruh hasil. |
| ID/Tanggal | URL sort berubah, aria-current berganti, page kembali ke 1, dan invoice/timestamp benar-benar berurutan menurun; filter tetap tersimpan. |
| Invoice | Tab memberi fokus dan ring terlihat; Enter membuka detail `/sales/{id}`. |
| Pagination | Berikutnya/sebelumnya mengubah isi dan nomor halaman; Back memulihkan halaman; panah nonaktif memiliki opacity 0.4. |
| Bantuan | Terbuka, kategori Transaksi menjelaskan perilaku terbaru, Escape menutupnya. |
| Stepper pembayaran | Tambah/kurang, Escape, klik luar, perpindahan fokus, dan reload mempertahankan auto-collapse. |

Kontras diukur dengan `antislop-human/contrast-check.py`:

| Pasangan | Rasio | Status |
|---|---:|---|
| on-surface / surface-container-low | 15.56:1 | PASS nominal |
| primary / primary-soft | 6.56:1 | PASS periode dan ikon |
| on-surface-variant / putih | 9.35:1 | PASS label/tanggal |
| on-surface-variant / surface-container-low | 8.48:1 | PASS footer |
| input / putih | 5.44:1 | PASS batas kontrol, minimum 3:1 |
| primary / putih | 7.51:1 | PASS urutan dan fokus |
| destructive / putih | 6.46:1 | PASS error tanggal |

Uji dapat diulang dengan server/database lokal yang sudah ada, `PW_BASE_URL` sesuai server, `PW_CHANNEL=msedge`, lalu `playwright test e2e/mobile-sales.spec.ts`. Regresi: `playwright test e2e/antislop-004.spec.ts --grep="pembelian 320px|stepper rincian"`.
