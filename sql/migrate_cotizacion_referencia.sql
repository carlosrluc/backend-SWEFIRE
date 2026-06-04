-- Referencia estable del frontend (fase-1, act-2, phase_1_1780...) para orden y reordenamiento en PUT

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_ETAPA' AND COLUMN_NAME = 'referencia'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `COTIZACION_ETAPA` ADD COLUMN `referencia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `ID_Cotizacion`',
  'SELECT ''referencia ya existe en COTIZACION_ETAPA'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_ETAPA' AND INDEX_NAME = 'uk_cotizacion_etapa_referencia'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `COTIZACION_ETAPA` ADD UNIQUE KEY `uk_cotizacion_etapa_referencia` (`ID_Cotizacion`,`referencia`)',
  'SELECT ''uk_cotizacion_etapa_referencia ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_ACTIVIDAD' AND COLUMN_NAME = 'referencia'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `COTIZACION_ACTIVIDAD` ADD COLUMN `referencia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `ID_Cotizacion`',
  'SELECT ''referencia ya existe en COTIZACION_ACTIVIDAD'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_ACTIVIDAD' AND INDEX_NAME = 'uk_cotizacion_act_referencia'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `COTIZACION_ACTIVIDAD` ADD UNIQUE KEY `uk_cotizacion_act_referencia` (`ID_Cotizacion`,`referencia`)',
  'SELECT ''uk_cotizacion_act_referencia ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
