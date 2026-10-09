# Kasirku

Aplikasi kasir retail dengan Next.js 16, React 19, Prisma 7, dan MySQL. Satu akun memiliki satu toko; admin mengelola akun. Tampilan memakai Inter dan tema Material 3 terang sesuai `DESIGN.md`.

## Menjalankan lokal

Aktifkan MySQL dan gunakan Node.js yang mendukung Next.js 16.

```sh
npm ci
```

Salin `.env.example` menjadi `.env`, lalu isi:

| Variabel | Kegunaan |
|---|---|
| `DATABASE_URL` | Koneksi MySQL dan nama database |
| `AUTH_SECRET` | Secret acak autentikasi, berbeda per lingkungan |
| `AUTH_URL` | URL aplikasi termasuk port; lokal `http://localhost:3000` |

Buat secret dengan:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Siapkan schema pada database yang dipilih, kemudian jalankan aplikasi:

```sh
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Buka `http://localhost:3000`. Untuk database pengembangan baru yang membutuhkan contoh produk dan akun demo, jalankan `npx prisma db seed`. Audit/perbaikan tidak memerlukan seed pada database yang sudah terisi.

## Build dan produksi

```sh
npm run lint
npm run build
npm start
```

Tetapkan `AUTH_URL` ke URL publik aplikasi, misalnya `https://kasir.example.com`, dan gunakan `AUTH_SECRET` serta database produksi sendiri. Auth.js memakai URL ini untuk mengenali host dan membuat URL autentikasi. Jika memakai reverse proxy, teruskan host/protokol publik secara konsisten dan batasi akses langsung ke server aplikasi. `AUTH_TRUST_HOST=true` hanya digunakan bila deployment mempercayai header host dari proxy yang dikendalikan; URL publik tetap perlu dikonfigurasi.

`next start` membutuhkan hasil build. Build sukses perlu dilanjutkan dengan pemeriksaan login dan halaman dinamis.

## Validasi

```sh
npm run lint
npx tsc --noEmit --incremental false
npm run test:e2e
```

Playwright menjalankan desktop dan mobile di port 14786 dengan `AUTH_URL` yang sesuai. Pasang Chromium melalui `npx playwright install chromium`, atau set `PW_CHANNEL=msedge` untuk memakai Edge yang sudah terpasang pada Windows. Untuk memakai server yang sudah aktif, set `PW_BASE_URL` ke URL server tersebut; konfigurasi `AUTH_URL` server harus memakai URL yang sama.

Tes menggunakan akun demo di database pengembangan. `verify-fixes.spec.ts` menulis transaksi, produk, dan pengaturan, sehingga gunakan database khusus tes untuk keseluruhan suite. Regresi audit 004 memakai mock jaringan di `e2e/antislop-004.spec.ts`; probe checkout terisolasi ada di `scripts/check-checkout-retry.mjs`.

## Struktur

- `app/`: halaman App Router dan API.
- `components/pos/`: katalog, rangkuman, stepper, dan pembayaran.
- `lib/actions.ts`: operasi data dan checkout dengan isolasi owner serta idempotensi.
- `prisma/`: schema, migrasi, dan data demo.
- `anti-slop/`: laporan audit/perbaikan dan bukti pemeriksaan.
- `qris-dinamis/`: tool Vite terpisah dari build/lint/type check aplikasi utama.

Keranjang dan pembayaran yang belum selesai disimpan per akun di sessionStorage. Logout membersihkan state transaksi. Kunci transaksi bertahan saat pindah halaman/refresh dan dibersihkan setelah transaksi yang sama berhasil. Struk memakai media cetak 80 mm; hasil printer fisik bergantung konfigurasi driver.

Sesi diperiksa di server pada setiap request. Proxy tidak memperpanjang cookie sesi agar respons request latar yang terlambat tidak membatalkan logout. Masa berlaku JWT mengikuti waktu login dan batas bawaan Auth.js; aplikasi saat ini tidak memakai polling `SessionProvider` di klien.
