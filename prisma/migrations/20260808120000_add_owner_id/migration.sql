-- Isolasi data per-akun (1 toko = 1 akun).
-- Tambah kolom ownerId (nullable dulu), backfill ke akun ADMIN pertama,
-- lalu jadikan NOT NULL + tambah FK & unique per-owner.

-- AddOwnerId: tambahkan kolom (nullable untuk backfill)
ALTER TABLE `Category` ADD COLUMN `ownerId` INTEGER NULL;
ALTER TABLE `Unit` ADD COLUMN `ownerId` INTEGER NULL;
ALTER TABLE `Supplier` ADD COLUMN `ownerId` INTEGER NULL;
ALTER TABLE `Product` ADD COLUMN `ownerId` INTEGER NULL;
ALTER TABLE `Customer` ADD COLUMN `ownerId` INTEGER NULL;
ALTER TABLE `Sale` ADD COLUMN `ownerId` INTEGER NULL;
ALTER TABLE `Purchase` ADD COLUMN `ownerId` INTEGER NULL;
ALTER TABLE `Expense` ADD COLUMN `ownerId` INTEGER NULL;
ALTER TABLE `Setting` ADD COLUMN `ownerId` INTEGER NULL;

-- Backfill: seluruh data lama menjadi milik akun ADMIN pertama
UPDATE `Category` SET `ownerId` = (SELECT `id` FROM `User` WHERE `role` = 'ADMIN' ORDER BY `id` ASC LIMIT 1);
UPDATE `Unit` SET `ownerId` = (SELECT `id` FROM `User` WHERE `role` = 'ADMIN' ORDER BY `id` ASC LIMIT 1);
UPDATE `Supplier` SET `ownerId` = (SELECT `id` FROM `User` WHERE `role` = 'ADMIN' ORDER BY `id` ASC LIMIT 1);
UPDATE `Product` SET `ownerId` = (SELECT `id` FROM `User` WHERE `role` = 'ADMIN' ORDER BY `id` ASC LIMIT 1);
UPDATE `Customer` SET `ownerId` = (SELECT `id` FROM `User` WHERE `role` = 'ADMIN' ORDER BY `id` ASC LIMIT 1);
UPDATE `Sale` SET `ownerId` = (SELECT `id` FROM `User` WHERE `role` = 'ADMIN' ORDER BY `id` ASC LIMIT 1);
UPDATE `Purchase` SET `ownerId` = (SELECT `id` FROM `User` WHERE `role` = 'ADMIN' ORDER BY `id` ASC LIMIT 1);
UPDATE `Expense` SET `ownerId` = (SELECT `id` FROM `User` WHERE `role` = 'ADMIN' ORDER BY `id` ASC LIMIT 1);
UPDATE `Setting` SET `ownerId` = (SELECT `id` FROM `User` WHERE `role` = 'ADMIN' ORDER BY `id` ASC LIMIT 1);

-- Jadikan NOT NULL
ALTER TABLE `Category` MODIFY `ownerId` INTEGER NOT NULL;
ALTER TABLE `Unit` MODIFY `ownerId` INTEGER NOT NULL;
ALTER TABLE `Supplier` MODIFY `ownerId` INTEGER NOT NULL;
ALTER TABLE `Product` MODIFY `ownerId` INTEGER NOT NULL;
ALTER TABLE `Customer` MODIFY `ownerId` INTEGER NOT NULL;
ALTER TABLE `Sale` MODIFY `ownerId` INTEGER NOT NULL;
ALTER TABLE `Purchase` MODIFY `ownerId` INTEGER NOT NULL;
ALTER TABLE `Expense` MODIFY `ownerId` INTEGER NOT NULL;
ALTER TABLE `Setting` MODIFY `ownerId` INTEGER NOT NULL;

-- Ganti unique global menjadi unique per-owner
DROP INDEX `Category_name_key` ON `Category`;
DROP INDEX `Unit_name_key` ON `Unit`;
DROP INDEX `Product_sku_key` ON `Product`;
DROP INDEX `Sale_invoiceNo_key` ON `Sale`;

CREATE UNIQUE INDEX `Category_ownerId_name_key` ON `Category`(`ownerId`, `name`);
CREATE UNIQUE INDEX `Unit_ownerId_name_key` ON `Unit`(`ownerId`, `name`);
CREATE UNIQUE INDEX `Product_ownerId_sku_key` ON `Product`(`ownerId`, `sku`);
CREATE UNIQUE INDEX `Sale_ownerId_invoiceNo_key` ON `Sale`(`ownerId`, `invoiceNo`);
CREATE UNIQUE INDEX `Setting_ownerId_key` ON `Setting`(`ownerId`);

-- Foreign keys ke User (hapus akun = hapus tokonya)
ALTER TABLE `Category` ADD CONSTRAINT `Category_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Unit` ADD CONSTRAINT `Unit_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Product` ADD CONSTRAINT `Product_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Setting` ADD CONSTRAINT `Setting_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
