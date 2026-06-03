-- Migración: INCIDENCIA.nombre_incidencia (varchar 100)
USE swefire_db;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'INCIDENCIA'
    AND COLUMN_NAME = 'nombre_incidencia'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE `INCIDENCIA` ADD COLUMN `nombre_incidencia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `id_incidencia`',
  'SELECT ''nombre_incidencia ya existe'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
