# Validasi audit 004

Perintah dan hasil yang diamati pada 8 Oktober 2026:

| Perintah | Hasil |
|---|---|
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit 0 |
| `npm run lint` | Exit 0 setelah helper audit memakai ESM |
| `node node_modules/eslint/bin/eslint.js anti-slop/evidence-004/*.mjs` | Exit 0 setelah semua helper audit selesai ditambahkan |
| `npm run build` | Exit 0, log di `build.log` |
| `node node_modules/next/dist/bin/next start --port 3000` | Server hidup; autentikasi gagal `UntrustedHost` |
| `next start` dengan env proses `AUTH_URL=http://localhost:3000` | Login bekerja; dokumen halaman autentikasi tetap HTTP 500 karena snapshot server tidak tersedia |
| `node node_modules/@playwright/test/cli.js test --config anti-slop/evidence-004/playwright-readonly.config.mjs` | 9 lulus, 2 gagal, 1 dilewati; exit 1 |
| `node anti-slop/evidence-004/audit-server-retry.mjs` | Probe terisolasi menghasilkan error stok sebelum lookup penjualan idempoten; tidak ada akses DB |

Server dev dihentikan sebelum build untuk menghindari konflik direktori `.next`. AUTH_URL hanya override proses audit; `.env` dan kode aplikasi tidak diedit. Tidak menjalankan seed, migrasi, atau submit transaksi baru. Runtime/browser probes memakai akun yang sudah ada dan Edge headless. Rute sukses/struk memakai penjualan yang sudah ada, ID 38.

Server produksi dan MySQL yang dinyalakan untuk audit sudah dihentikan. MySQL menerima perintah SHUTDOWN dan mencatat `Normal shutdown` serta `Shutdown complete`.

Temuan dan batas verifikasi dijelaskan di `../audit-004-2026-10-08.md`. Helper adalah alat audit dengan recovery/retry terbatas; error yang dicatat tidak otomatis dianggap sebagai assertion lulus.
