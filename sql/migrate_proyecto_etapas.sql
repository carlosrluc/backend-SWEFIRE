-- Migración: seguimiento de etapas/actividades en PROYECTO + vínculo en INFORME
-- La cotización conserva etapas_detalle (JSON plantilla).
-- El proyecto usa tablas normalizadas para estado en tiempo real.

-- ── PROYECTO: hora de inicio y punteros a etapa/actividad actual ─────────────

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO' AND COLUMN_NAME = 'hora_inicio'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `PROYECTO` ADD COLUMN `hora_inicio` time DEFAULT NULL AFTER `fecha_inicio`',
  'SELECT ''hora_inicio ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO' AND COLUMN_NAME = 'etapa_actual_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `PROYECTO` ADD COLUMN `etapa_actual_id` int DEFAULT NULL AFTER `Proyecto_Nombre`',
  'SELECT ''etapa_actual_id ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO' AND COLUMN_NAME = 'actividad_actual_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `PROYECTO` ADD COLUMN `actividad_actual_id` int DEFAULT NULL AFTER `etapa_actual_id`',
  'SELECT ''actividad_actual_id ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── PROYECTO_ETAPA ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `PROYECTO_ETAPA` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Proyecto` int NOT NULL,
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `duracion` int NOT NULL DEFAULT 0,
  `orden` int NOT NULL DEFAULT 1,
  `estado` enum('no comenzado','en progreso','completada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'no comenzado',
  `fecha_inicio` datetime DEFAULT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_proyecto_etapa_codigo` (`id_Proyecto`,`codigo`),
  KEY `idx_proyecto_etapa_proyecto` (`id_Proyecto`),
  CONSTRAINT `PROYECTO_ETAPA_ibfk_1` FOREIGN KEY (`id_Proyecto`) REFERENCES `PROYECTO` (`id_Proyecto`) ON DELETE CASCADE
);

-- ── PROYECTO_ACTIVIDAD ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `PROYECTO_ACTIVIDAD` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_proyecto_etapa` int NOT NULL,
  `id_Proyecto` int NOT NULL,
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` int NOT NULL DEFAULT 1,
  `estado` enum('no comenzado','en progreso','completada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'no comenzado',
  `fecha_inicio` datetime DEFAULT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_proyecto_act_codigo` (`id_proyecto_etapa`,`codigo`),
  KEY `idx_proyecto_act_etapa` (`id_proyecto_etapa`),
  KEY `idx_proyecto_act_proyecto` (`id_Proyecto`),
  CONSTRAINT `PROYECTO_ACTIVIDAD_ibfk_1` FOREIGN KEY (`id_proyecto_etapa`) REFERENCES `PROYECTO_ETAPA` (`id`) ON DELETE CASCADE,
  CONSTRAINT `PROYECTO_ACTIVIDAD_ibfk_2` FOREIGN KEY (`id_Proyecto`) REFERENCES `PROYECTO` (`id_Proyecto`) ON DELETE CASCADE
);

-- FKs en PROYECTO (después de crear tablas hijas)
SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO' AND CONSTRAINT_NAME = 'PROYECTO_ibfk_etapa_actual'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `PROYECTO` ADD CONSTRAINT `PROYECTO_ibfk_etapa_actual` FOREIGN KEY (`etapa_actual_id`) REFERENCES `PROYECTO_ETAPA` (`id`) ON DELETE SET NULL',
  'SELECT ''PROYECTO_ibfk_etapa_actual ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO' AND CONSTRAINT_NAME = 'PROYECTO_ibfk_actividad_actual'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `PROYECTO` ADD CONSTRAINT `PROYECTO_ibfk_actividad_actual` FOREIGN KEY (`actividad_actual_id`) REFERENCES `PROYECTO_ACTIVIDAD` (`id`) ON DELETE SET NULL',
  'SELECT ''PROYECTO_ibfk_actividad_actual ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── INFORME: vínculo con etapa y actividad del proyecto ──────────────────────

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'INFORME' AND COLUMN_NAME = 'id_proyecto_etapa'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `INFORME` ADD COLUMN `id_proyecto_etapa` int DEFAULT NULL AFTER `id_incidencia`',
  'SELECT ''id_proyecto_etapa ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'INFORME' AND COLUMN_NAME = 'id_proyecto_actividad'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `INFORME` ADD COLUMN `id_proyecto_actividad` int DEFAULT NULL AFTER `id_proyecto_etapa`',
  'SELECT ''id_proyecto_actividad ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'INFORME' AND CONSTRAINT_NAME = 'INFORME_ibfk_etapa'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `INFORME` ADD CONSTRAINT `INFORME_ibfk_etapa` FOREIGN KEY (`id_proyecto_etapa`) REFERENCES `PROYECTO_ETAPA` (`id`) ON DELETE SET NULL',
  'SELECT ''INFORME_ibfk_etapa ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'INFORME' AND CONSTRAINT_NAME = 'INFORME_ibfk_actividad'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `INFORME` ADD CONSTRAINT `INFORME_ibfk_actividad` FOREIGN KEY (`id_proyecto_actividad`) REFERENCES `PROYECTO_ACTIVIDAD` (`id`) ON DELETE SET NULL',
  'SELECT ''INFORME_ibfk_actividad ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
