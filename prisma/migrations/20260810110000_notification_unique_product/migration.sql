-- DropIndex
DROP INDEX `Notification_ownerId_type_refId_read_key` ON `Notification`;

-- Hapus duplikat alert stok: pertahankan id terbesar per (ownerId, type, refId).
-- Duplikat muncul karena index lama menyertakan kolom read, sehingga baris read
-- dan unread untuk produk yang sama bisa hidup berdampingan.
DELETE n1 FROM `Notification` n1
INNER JOIN `Notification` n2
  ON n1.`ownerId` = n2.`ownerId`
 AND n1.`type` = n2.`type`
 AND n1.`refId` = n2.`refId`
 AND n1.`refId` IS NOT NULL
 AND n1.`id` < n2.`id`;

-- CreateIndex
CREATE UNIQUE INDEX `Notification_ownerId_type_refId_key` ON `Notification`(`ownerId`, `type`, `refId`);
