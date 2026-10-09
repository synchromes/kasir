# Redesign Transaksi mobile: PASS

Laporan historis untuk rancangan sebelum referensi gambar dikoreksi. Hasil implementasi dan verifikasi terbaru ada di [laporan referensi yang benar](sales-reference-2026-10-09.md).

Cakupan: rancangan Transaksi mobile yang disetujui pemilik pada 9 Oktober 2026. Antislop core, antislop-ui, antislop-layoutmobile, dan pemeriksaan aksesibilitas dipakai untuk mengevaluasi hasil. Ini laporan perubahan yang disetujui, bukan audit ulang seluruh aplikasi.

Daftar vertikal menampilkan invoice, tanggal, nominal, metode pembayaran, pelanggan bila tersedia, dan jumlah item. Ketuk baris untuk detail. Metode/tanggal disunting dalam dialog Filter; Terapkan menjalankan satu navigasi dan mengembalikan halaman ke 1. Menutup dialog membuang draft. Reset di luar dialog mempertahankan pencarian. Ringkasan, bantuan, dan pagination dibuat lebih ringkas.

## Bukti verifikasi

- `npm run build`: PASS, termasuk pemeriksaan TypeScript Next 16.3.0.
- `npm run lint` dan `tsc --noEmit`: PASS.
- [Uji redesign](mobile-sales-evidence/test-results.json): 10 PASS, 0 gagal, 0 dilewati, dua profil browser.
- [Regresi](mobile-sales-evidence/regression-results.json): 4 PASS, termasuk auto-collapse stepper pembayaran dan label filter pada 320px.
- [Daftar mobile 393px](mobile-sales-evidence/mobile-chromium-393.png), [320px](mobile-sales-evidence/mobile-chromium-320.png), [tablet 768px](mobile-sales-evidence/mobile-chromium-768.png), [desktop 1440px](mobile-sales-evidence/desktop-chromium-1440.png).
- [Dialog filter](mobile-sales-evidence/mobile-chromium-filter-320.png), [layar pendek](mobile-sales-evidence/mobile-chromium-filter-short.png), [hasil kosong](mobile-sales-evidence/mobile-chromium-empty-320.png), [footer](mobile-sales-evidence/footer-320.png).
- Axe WCAG 2 A/AA dan 2.1 AA: 0 pelanggaran dalam `main` dan dialog. Hasil mentah: `mobile-sales-evidence/*-axe-list.json` dan `*-axe-filter.json`.

Pengujian menggunakan Microsoft Edge dengan profil desktop dan emulasi Pixel 7, serta lebar 320, 393, 640, 768, 1024, dan 1440px. Layar 320×420 memeriksa bahwa field tanggal dan tombol Terapkan dapat dijangkau saat ruang vertikal berkurang. Perangkat fisik, Safari, dan keyboard IME sungguhan belum diuji; hasil di sini terbatas pada lingkungan tersebut. Data daftar dan ringkasan berasal dari database lokal; tes tidak membuat transaksi atau mengubah stok.

## Delivery Gate: Hard Gate

| Item | Status dan bukti |
|---|---|
| R-02 tanda baca | PASS: teks UI yang ditambahkan tidak memakai em dash. |
| R-03 mobile | PASS: `scrollWidth <= innerWidth` pada enam lebar; isi baris tetap dalam batas link. |
| R-17 statistik | PASS: nominal, jumlah item, jumlah transaksi, dan total halaman dihitung dari hasil query Prisma. |
| R-18 testimoni | PASS: halaman tidak memuat testimoni. |
| R-23 aset | PASS: logo, Inter, navigasi, dan ikon fungsional memakai sistem yang sudah ada; tidak ada aset visual baru. |
| R-24 tautan | PASS: baris menautkan `/sales/{id}`; uji keyboard membuka detail sebenarnya. |
| R-25 kontras | PASS: axe tidak menemukan pelanggaran kontras; pengukuran token tercantum di bawah. |
| R-26 fungsi | PASS: pencarian, metode, kedua tanggal, Terapkan, Reset, tutup, bantuan, ukuran halaman, dan panah halaman diuji. |
| R-27 keadaan data | PASS: hasil kosong terlihat; loading diumumkan dengan `role=status`; tanggal terbalik memberi `role=alert`; kegagalan halaman memakai error boundary dan tombol Coba lagi yang sudah ada. |
| R-28 FAQ | PASS: bantuan menjelaskan pencarian, filter HP/desktop, dan detail transaksi; tidak ada FAQ tambahan. |
| R-32 keyboard | PASS: Tab menuju link, Enter membuka detail, Escape menutup dialog dan mengembalikan fokus; ring fokus link diperiksa di browser. |
| R-33 source | PASS: perubahan source/CSS ditulis dengan apply_patch; skrip browser hanya menguji dan menyimpan bukti. |
| R-34 tema | PASS: aplikasi tetap memakai tema terang dari DESIGN.md dan tidak menambahkan toggle tema. |
| R-35 runtime | PASS: build produksi dijalankan di browser; 10 uji interaksi dan 4 regresi berhasil. |
| R-36 klaim | PASS: UI tidak menambahkan klaim keamanan, kepatuhan, atau performa. |
| R-37 arah | PASS: rancangan disetujui pemilik; Design Read diumumkan sebelum perubahan dan dicatat di DESIGN.md. |
| R-38 data nyata | PASS: data ditampilkan langsung dari query yang sudah ada; tidak menambahkan data contoh ke UI. |

## Delivery Gate: Purpose Gate

| Item | Status dan alasan |
|---|---|
| R-01 gradien | PASS: tidak menambahkan gradien atau glow. |
| R-04 ikon | PASS: ListFilter membuka filter; chevron berpindah halaman; CircleHelp membuka panduan. Alasan tertulis di DESIGN.md. |
| R-06 tipografi | PASS: Inter untuk membaca angka struk; nominal memakai tabular-nums agar mudah dibandingkan. |
| R-07 pola latar | PASS: tidak menambahkan grid atau pola dekoratif. |
| R-08 panah | PASS: panah hanya untuk pagination yang benar-benar berpindah halaman. |
| R-09 badge | PASS: hitungan Filter berasal dari metode/tanggal aktif; metode diberi nama teks, bukan badge marketing. |
| R-10 kaca | PASS: tidak menambahkan glassmorphism. |
| R-12 bayangan | PASS: memakai Card yang ada dan elevasi dialog untuk membedakan modal; setiap transaksi tidak dibungkus kartu baru. |
| R-13 glow | PASS: tidak menambahkan glow. |
| R-14 pola berulang | PASS: baris transaksi konsisten untuk membandingkan nominal; filter dan footer punya komposisi berbeda sesuai fungsi. |
| R-19 gerak | PASS: transisi hanya umpan balik hover/sentuh dan pembukaan dialog; loading berteks hanya saat permintaan berjalan. |
| R-22 ilustrasi | PASS: tidak menambahkan ilustrasi generik. |

## Delivery Gate: Liveliness

| Item | Status dan bukti |
|---|---|
| Dial eksplisit | PASS: mobile ENERGY 2 / RHYTHM 2 / MOTION 1, sesuai DESIGN.md. |
| Konsistensi dial | PASS: identitas Kasirku dipertahankan; filter ringkas, daftar padat, footer ringan, tanpa animasi dekoratif. |
| Fokus | PASS: nominal di kanan memiliki bobot paling kuat pada setiap baris. |
| Ruang | PASS: divider memisahkan transaksi; padding memberi area ketuk, bukan section kosong tambahan. |
| Aksen | PASS: biru menandai invoice/filter; warna metode mengikuti identitas CASH/QRIS/TRANSFER dan selalu berlabel teks. |
| Identitas | PASS: header logo, tab bawah, Inter, dan palet Kasirku dipakai bersama. |
| Design Read | PASS: dinyatakan sebelum implementasi; keputusan mobile disimpan di DESIGN.md. |

## Delivery Gate: Craftsmanship dan Quality Locks

| Item | Status dan bukti |
|---|---|
| C-1 intent | PASS: setiap keputusan layout dijelaskan dalam DESIGN.md. |
| C-2 fungsi | PASS: seluruh kontrol baru mempunyai perilaku dan label; panah nonaktif diumumkan sebagai disabled serta diredupkan. |
| C-3 isi | PASS: layar berisi pencarian, transaksi, total, dan navigasi halaman yang diperlukan pengguna. |
| C-4 ketahanan | PASS: diuji pada enam lebar, hasil kosong, tanggal invalid, loading, dialog pendek, keyboard, dan browser Back. |
| C-5 bukti | PASS: tidak membuat angka toko, testimoni, atau klaim baru. |
| R-05 komposisi | PASS: daftar untuk membandingkan transaksi; tidak menambahkan hero, bento, atau kartu statistik. |
| R-11 radius | PASS: input/tombol rounded-lg, Card/dialog rounded-xl; tombol halaman tetap kontrol bulat yang sudah ada. |
| R-15 aksi | PASS: Filter, Terapkan, Reset filter, dan label halaman menyatakan tindakan sebenarnya. |
| R-16 copy | PASS: copy menjelaskan transaksi dan tindakan; tidak memakai buzzword marketing. |
| R-20 karakter | PASS: invoice rupiah, jumlah item, pelanggan, warna pembayaran, dan struk sesuai pekerjaan kasir. |
| R-21 tema | PASS: memakai tema terang yang sudah ditetapkan. |
| R-29 palet | PASS: seluruh warna baru memakai token semantik; tidak menambahkan hex warna. |
| R-30 orisinalitas | PASS: mengikuti referensi Kasirku milik pemilik dan konteks penjualan toko. |
| R-31 alasan | PASS: pencarian terlihat agar mudah menemukan invoice; filter disimpan dalam dialog agar daftar naik; nominal di kanan agar mudah dibandingkan; seluruh baris membuka detail agar mudah diketuk. |

## Pemeriksaan UI, mobile, dan aksesibilitas

- PASS reflow: di bawah 640px baris memakai ukuran teks/padding mobile; 640–1023px memakai teks dan gutter lebih besar; mulai 1024px tabel dan filter inline tampil. List tablet tetap satu urutan kronologis agar transaksi mudah dibandingkan.
- PASS ukuran dan jarak sentuh: kontrol utama serta link baris minimal 44px, diperiksa lewat bounding box. Panah berjarak; list dipisahkan divider.
- PASS overflow: halaman tidak bergeser horizontal pada semua lebar yang diuji; overflow desktop dibatasi pada region tabel.
- PASS interaksi sentuh: link baris, Filter, dan tombol memiliki feedback; tidak ada aksi yang hanya bisa di-hover.
- PASS navigasi: tab bawah yang sudah ada tetap aktif di Transaksi; kontrol paling akhir dapat di-scroll di atas tab bawah dan halaman menyediakan padding bawah.
- PASS label dan fokus: input memakai pasangan label/id, dialog memakai title/description, tanggal invalid memiliki aria-describedby; panah nonaktif memiliki role/label yang valid. Axe 0 pelanggaran pada daftar dan dialog.
- PASS keadaan: empty state memberi langkah selanjutnya; loading diuji dengan respons RSC tertunda; error rentang tanggal terlihat sebelum penerapan.
- PASS warna dan bentuk: metode selalu punya label teks; input dan tombol outline Filter/Reset memakai border-input; radius mengikuti DESIGN.md. Tidak ada emoji, status palsu, atau section pengisi.
- PASS reflow lebar efektif 320px (setara penyempitan viewport 640px pada zoom 200%) dan dialog pada viewport pendek. Ini pengujian layout, bukan klaim bahwa semua keyboard/perangkat fisik telah diuji.

Kontras dihitung dengan `antislop-human/contrast-check.py`, memakai token di `app/globals.css`:

| Pasangan | Rasio | Hasil |
|---|---:|---|
| on-surface / putih | 17.16:1 | PASS teks normal |
| on-surface-variant / putih | 9.35:1 | PASS teks normal |
| primary / putih | 7.51:1 | PASS teks normal dan tombol biru |
| accent / putih | 6.05:1 | PASS metode Tunai |
| tertiary / putih | 7.49:1 | PASS metode Transfer |
| input / surface | 5.16:1 | PASS batas kontrol, syarat 3:1 |

Cara mengulang uji: jalankan build/server lokal dengan database yang sudah ada, set `PW_BASE_URL` sesuai server dan `PW_CHANNEL=msedge`, lalu `playwright test e2e/mobile-sales.spec.ts`. Regresi yang dipakai: `playwright test e2e/antislop-004.spec.ts --grep="pembelian 320px|stepper rincian"`.
