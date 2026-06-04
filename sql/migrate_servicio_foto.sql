-- Migración: columna foto en SERVICIO (URL relativa PNG/JPEG)
-- Ejecutar en la base swefire_db si el servidor ya existía antes de actualizar schema.sql

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'SERVICIO'
    AND COLUMN_NAME = 'foto'
);
SET @sql_servicio_foto = IF(
  @col_exists = 0,
  'ALTER TABLE `SERVICIO` ADD COLUMN `foto` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL',
  'SELECT ''foto ya existe'' AS info'
);
PREPARE stmt FROM @sql_servicio_foto;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
