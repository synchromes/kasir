-- Preferensi notifikasi per akun (semua default aktif)
ALTER TABLE `Setting` ADD COLUMN `notifyStock` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `Setting` ADD COLUMN `notifySale` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `Setting` ADD COLUMN `notifyPurchase` BOOLEAN NOT NULL DEFAULT true;
