-- Hapus duplikat alert stok (race antar poller): pertahankan id terbesar
-- per (ownerId, type, refId, read) sebelum unique index ditambahkan.
-- (createdAt bisa identik untuk duplikat yang dibuat dalam satu transaksi,
-- jadi id dipakai sebagai tiebreaker deterministik.)
DELETE n1 FROM `Notification` n1
INNER JOIN `Notification` n2
  ON n1.`ownerId` = n2.`ownerId`
 AND n1.`type` = n2.`type`
 AND n1.`read` = n2.`read`
 AND ((n1.`refId` IS NULL AND n2.`refId` IS NULL) OR n1.`refId` = n2.`refId`)
 AND n1.`id` < n2.`id`;

-- CreateIndex
CREATE UNIQUE INDEX `Notification_ownerId_type_refId_read_key` ON `Notification`(`ownerId`, `type`, `refId`, `read`);
