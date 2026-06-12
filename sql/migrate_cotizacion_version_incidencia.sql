-- Migración: Id_incidencia (FK INCIDENCIA) + desactualizado (versionado de cotizaciones)
-- Ejecutar en swefire_db

-- ── desactualizado ────────────────────────────────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_COMERCIAL' AND COLUMN_NAME = 'desactualizado'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `COTIZACION_COMERCIAL` ADD COLUMN `desactualizado` enum(''YES'',''NO'') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''NO'' AFTER `version`',
  'SELECT ''desactualizado ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `COTIZACION_COMERCIAL` SET `desactualizado` = 'NO' WHERE `desactualizado` IS NULL OR `desactualizado` = '';

-- ── Id_incidencia ─────────────────────────────────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_COMERCIAL' AND COLUMN_NAME = 'Id_incidencia'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `COTIZACION_COMERCIAL` ADD COLUMN `Id_incidencia` int DEFAULT NULL AFTER `direccion_recojo`',
  'SELECT ''Id_incidencia ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_COMERCIAL' AND INDEX_NAME = 'COTIZACION_ibfk_incidencia'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `COTIZACION_COMERCIAL` ADD KEY `COTIZACION_ibfk_incidencia` (`Id_incidencia`)',
  'SELECT ''índice Id_incidencia ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'COTIZACION_COMERCIAL'
    AND CONSTRAINT_NAME = 'COTIZACION_ibfk_incidencia'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `COTIZACION_COMERCIAL` ADD CONSTRAINT `COTIZACION_ibfk_incidencia` FOREIGN KEY (`Id_incidencia`) REFERENCES `INCIDENCIA` (`id_incidencia`) ON DELETE SET NULL ON UPDATE RESTRICT',
  'SELECT ''FK Id_incidencia ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
