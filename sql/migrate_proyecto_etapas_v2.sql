-- Migración v2: tipo de etapa (pendiente / cotización / terminado) y vínculo con cotización
-- Ejecutar después de migrate_cotizacion_etapas.sql y migrate_proyecto_etapas.sql

-- ── PROYECTO_ETAPA: tipo + FK a cotización ───────────────────────────────────

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO_ETAPA' AND COLUMN_NAME = 'tipo'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `PROYECTO_ETAPA` ADD COLUMN `tipo` enum(''pendiente'',''cotizacion'',''terminado'') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''cotizacion'' AFTER `id_Proyecto`',
  'SELECT ''tipo ya existe en PROYECTO_ETAPA'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO_ETAPA' AND COLUMN_NAME = 'id_cotizacion_etapa'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `PROYECTO_ETAPA` ADD COLUMN `id_cotizacion_etapa` int DEFAULT NULL AFTER `tipo`',
  'SELECT ''id_cotizacion_etapa ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO_ETAPA' AND CONSTRAINT_NAME = 'PROYECTO_ETAPA_ibfk_cot_etapa'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `PROYECTO_ETAPA` ADD CONSTRAINT `PROYECTO_ETAPA_ibfk_cot_etapa` FOREIGN KEY (`id_cotizacion_etapa`) REFERENCES `COTIZACION_ETAPA` (`id`) ON DELETE SET NULL',
  'SELECT ''PROYECTO_ETAPA_ibfk_cot_etapa ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- codigo deja de ser obligatorio (identificador = id numérico)
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO_ETAPA' AND COLUMN_NAME = 'codigo'
    AND IS_NULLABLE = 'NO'
);
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE `PROYECTO_ETAPA` MODIFY COLUMN `codigo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL',
  'SELECT ''codigo PROYECTO_ETAPA ya nullable'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO_ETAPA' AND INDEX_NAME = 'uk_proyecto_etapa_codigo'
);
SET @sql = IF(@idx_exists > 0,
  'ALTER TABLE `PROYECTO_ETAPA` DROP INDEX `uk_proyecto_etapa_codigo`',
  'SELECT ''uk_proyecto_etapa_codigo no existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── PROYECTO_ACTIVIDAD: FK a cotización ──────────────────────────────────────

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO_ACTIVIDAD' AND COLUMN_NAME = 'id_cotizacion_actividad'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `PROYECTO_ACTIVIDAD` ADD COLUMN `id_cotizacion_actividad` int DEFAULT NULL AFTER `id_Proyecto`',
  'SELECT ''id_cotizacion_actividad ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO_ACTIVIDAD' AND CONSTRAINT_NAME = 'PROYECTO_ACTIVIDAD_ibfk_cot_act'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `PROYECTO_ACTIVIDAD` ADD CONSTRAINT `PROYECTO_ACTIVIDAD_ibfk_cot_act` FOREIGN KEY (`id_cotizacion_actividad`) REFERENCES `COTIZACION_ACTIVIDAD` (`id`) ON DELETE SET NULL',
  'SELECT ''PROYECTO_ACTIVIDAD_ibfk_cot_act ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO_ACTIVIDAD' AND COLUMN_NAME = 'codigo'
    AND IS_NULLABLE = 'NO'
);
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE `PROYECTO_ACTIVIDAD` MODIFY COLUMN `codigo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL',
  'SELECT ''codigo PROYECTO_ACTIVIDAD ya nullable'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO_ACTIVIDAD' AND INDEX_NAME = 'uk_proyecto_act_codigo'
);
SET @sql = IF(@idx_exists > 0,
  'ALTER TABLE `PROYECTO_ACTIVIDAD` DROP INDEX `uk_proyecto_act_codigo`',
  'SELECT ''uk_proyecto_act_codigo no existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Marcar etapas existentes importadas de cotización
UPDATE `PROYECTO_ETAPA` SET `tipo` = 'cotizacion' WHERE `tipo` = 'cotizacion';

-- Etapa "En pendientes" en proyectos que ya tenían etapas sin ella
INSERT INTO `PROYECTO_ETAPA` (`id_Proyecto`, `tipo`, `nombre`, `descripcion`, `duracion`, `orden`, `estado`)
SELECT
  P.id_Proyecto,
  'pendiente',
  'En pendientes',
  NULL,
  0,
  0,
  CASE
    WHEN P.estado IN ('Pendiente', 'No iniciado') AND P.etapa_actual_id IS NULL THEN 'en progreso'
    ELSE 'completada'
  END
FROM `PROYECTO` P
WHERE EXISTS (SELECT 1 FROM `PROYECTO_ETAPA` PE WHERE PE.id_Proyecto = P.id_Proyecto)
  AND NOT EXISTS (
    SELECT 1 FROM `PROYECTO_ETAPA` PE WHERE PE.id_Proyecto = P.id_Proyecto AND PE.tipo = 'pendiente'
  );

UPDATE `PROYECTO` P
INNER JOIN `PROYECTO_ETAPA` PE ON PE.id_Proyecto = P.id_Proyecto AND PE.tipo = 'pendiente'
SET P.etapa_actual_id = PE.id
WHERE P.estado IN ('Pendiente', 'No iniciado')
  AND P.etapa_actual_id IS NULL;
