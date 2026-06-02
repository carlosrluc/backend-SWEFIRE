-- Migración: COTIZACION_COMERCIAL — etapas_detalle + direccion_recojo
-- Ejecutar una vez en la BD swefire_db (compatible MySQL / MariaDB).
-- Si el tipo JSON no es soportado, descomenta la variante LONGTEXT al final.

USE swefire_db;

-- ── etapas_detalle ───────────────────────────────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'COTIZACION_COMERCIAL'
    AND COLUMN_NAME = 'etapas_detalle'
);
SET @sql_etapas = IF(
  @col_exists = 0,
  'ALTER TABLE `COTIZACION_COMERCIAL` ADD COLUMN `etapas_detalle` JSON DEFAULT NULL',
  'SELECT ''Columna etapas_detalle ya existe'' AS info'
);
PREPARE stmt FROM @sql_etapas;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── direccion_recojo ─────────────────────────────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'COTIZACION_COMERCIAL'
    AND COLUMN_NAME = 'direccion_recojo'
);
SET @sql_recojo = IF(
  @col_exists = 0,
  'ALTER TABLE `COTIZACION_COMERCIAL` ADD COLUMN `direccion_recojo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL',
  'SELECT ''Columna direccion_recojo ya existe'' AS info'
);
PREPARE stmt FROM @sql_recojo;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── Alternativa si JSON falla (MariaDB/MySQL muy antiguo) ─────────────────────
-- ALTER TABLE `COTIZACION_COMERCIAL` ADD COLUMN `etapas_detalle` LONGTEXT DEFAULT NULL;
