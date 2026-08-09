-- Foto produk (data URL base64, di-resize di client sebelum disimpan)
ALTER TABLE `Product` ADD COLUMN `image` LONGTEXT NULL;
