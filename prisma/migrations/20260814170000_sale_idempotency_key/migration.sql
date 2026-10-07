-- AlterTable
ALTER TABLE `Sale` ADD COLUMN `saleKey` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Sale_saleKey_key` ON `Sale`(`saleKey`);
