-- Setting.id sebelumnya `INTEGER NOT NULL DEFAULT 1` (bukan AUTO_INCREMENT),
-- sehingga akun baru yang belum punya row pengaturan selalu gagal membuat
-- row (id bertabrakan dengan row id=1 milik admin). Ubah menjadi AUTO_INCREMENT.
ALTER TABLE `Setting` MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT;
