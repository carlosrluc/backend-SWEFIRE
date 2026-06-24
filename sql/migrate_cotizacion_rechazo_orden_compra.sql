-- Migración: rechazo de orden de compra en cotizaciones
-- Ejecutar en swefire_db

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_COMERCIAL' AND COLUMN_NAME = 'orden_compra_rechazada'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `COTIZACION_COMERCIAL` ADD COLUMN `orden_compra_rechazada` enum(''YES'',''NO'') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''NO'' AFTER `Orden_compra`',
  'SELECT ''orden_compra_rechazada ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_COMERCIAL' AND COLUMN_NAME = 'motivo_rechazo_orden_compra'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `COTIZACION_COMERCIAL` ADD COLUMN `motivo_rechazo_orden_compra` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `orden_compra_rechazada`',
  'SELECT ''motivo_rechazo_orden_compra ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
