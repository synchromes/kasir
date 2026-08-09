-- Metode pembayaran: DEBIT & CREDIT dihapus, diganti TRANSFER.
-- Urutan 3 langkah agar baris lama ber-nilai DEBIT/CREDIT tidak menjadi
-- string kosong saat enum diganti (MySQL membuang nilai yang tidak dikenal
-- pada saat MODIFY):
--   1) tambah TRANSFER ke enum dulu (nilai lama tetap valid)
--   2) pindahkan data lama ke TRANSFER
--   3) buang DEBIT/CREDIT dari enum
ALTER TABLE `sale` MODIFY `paymentMethod` ENUM('CASH','QRIS','DEBIT','CREDIT','TRANSFER') NOT NULL DEFAULT 'CASH';
UPDATE `sale` SET `paymentMethod` = 'TRANSFER' WHERE `paymentMethod` IN ('DEBIT','CREDIT');
ALTER TABLE `sale` MODIFY `paymentMethod` ENUM('CASH','QRIS','TRANSFER') NOT NULL DEFAULT 'CASH';

-- Bukti pembayaran (QRIS/Transfer) & payload QRIS dinamis per transaksi
-- Catatan: tanpa server DEFAULT — MariaDB menolak DEFAULT pada LONGTEXT;
-- Prisma client yang mengisi default di sisi aplikasi.
ALTER TABLE `sale` ADD COLUMN `paymentProof` LONGTEXT NULL,
    ADD COLUMN `qrisPayload` LONGTEXT NULL;

-- QRIS statis milik toko (dikonversi menjadi QRIS dinamis per transaksi)
ALTER TABLE `setting` ADD COLUMN `qrisStatic` LONGTEXT NULL;
