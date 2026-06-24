-- Migración: aprobación interna de cotizaciones + nuevos estados
-- Ejecutar en swefire_db

-- ── 1. Columna aprobado ───────────────────────────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_COMERCIAL' AND COLUMN_NAME = 'aprobado'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `COTIZACION_COMERCIAL` ADD COLUMN `aprobado` enum(''YES'',''NO'') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''NO'' AFTER `estado`',
  'SELECT ''aprobado ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 2. Aprobación dual para cotizaciones de incidencia ────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_COMERCIAL' AND COLUMN_NAME = 'aprobado_por_abogado'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `COTIZACION_COMERCIAL` ADD COLUMN `aprobado_por_abogado` enum(''YES'',''NO'') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''NO'' AFTER `aprobado`',
  'SELECT ''aprobado_por_abogado ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_COMERCIAL' AND COLUMN_NAME = 'aprobado_por_gerente'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `COTIZACION_COMERCIAL` ADD COLUMN `aprobado_por_gerente` enum(''YES'',''NO'') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''NO'' AFTER `aprobado_por_abogado`',
  'SELECT ''aprobado_por_gerente ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 3. Ampliar enum estado (No aprobado, Incidencia Pagada) ───────────────────
ALTER TABLE `COTIZACION_COMERCIAL`
  MODIFY COLUMN `estado` enum(
    'aprobado',
    'rechazado por cliente',
    'descartada',
    'Pendiente',
    'No aprobado',
    'Incidencia Pagada'
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL;

-- ── 4. Seed: cotizaciones vigentes existentes → aprobadas ─────────────────────
UPDATE `COTIZACION_COMERCIAL`
SET `aprobado` = 'YES',
    `aprobado_por_gerente` = 'YES'
WHERE `desactualizado` = 'NO'
  AND (`aprobado` IS NULL OR `aprobado` = 'NO');
