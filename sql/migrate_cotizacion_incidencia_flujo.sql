-- Migración: flujo de cotizaciones de incidencia
-- Ejecutar en swefire_db (después de migrate_cotizacion_version_incidencia.sql)

-- ── 1. id_solicitud nullable (cotizaciones de incidencia no tienen solicitud) ──
SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'COTIZACION_COMERCIAL'
    AND CONSTRAINT_NAME = 'COTIZACION_COMERCIAL_ibfk_1'
);
SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE `COTIZACION_COMERCIAL` DROP FOREIGN KEY `COTIZACION_COMERCIAL_ibfk_1`',
  'SELECT ''FK id_solicitud no existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE `COTIZACION_COMERCIAL`
  MODIFY COLUMN `id_solicitud` int NULL;

ALTER TABLE `COTIZACION_COMERCIAL`
  ADD CONSTRAINT `COTIZACION_COMERCIAL_ibfk_1`
  FOREIGN KEY (`id_solicitud`) REFERENCES `SOLICITUD` (`ID`)
  ON DELETE SET NULL ON UPDATE RESTRICT;

-- ── 2. servicio_de_incidencia en SERVICIO ─────────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SERVICIO' AND COLUMN_NAME = 'servicio_de_incidencia'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `SERVICIO` ADD COLUMN `servicio_de_incidencia` enum(''YES'',''NO'') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''NO'' AFTER `Estado`',
  'SELECT ''servicio_de_incidencia ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `SERVICIO` SET `servicio_de_incidencia` = 'NO' WHERE `servicio_de_incidencia` IS NULL;

-- Envío (PK 7) sigue con NO pero se expone en el catálogo de incidencia vía API
UPDATE `SERVICIO` SET `servicio_de_incidencia` = 'NO' WHERE `ID_Servicio` = 7;

-- ── 3. Cliente dummy para destinatarios sin DNI/perfil ────────────────────────
INSERT INTO `CLIENTE` (`DNI_O_RUC`, `nombre_comercial`, `razon_social`, `ubicacion_facturacion`, `observacion`)
SELECT '00000000000', 'Cliente no especificado', 'Cliente no especificado', 'Ubicación no especificada',
       'Cliente placeholder para cotizaciones de incidencia sin destinatario identificado'
WHERE NOT EXISTS (SELECT 1 FROM `CLIENTE` WHERE `DNI_O_RUC` = '00000000000');

-- ── 4. Servicios exclusivos para cotizaciones de incidencia ───────────────────
INSERT INTO `SERVICIO` (`nombre`, `descripcion`, `Estado`, `servicio_de_incidencia`)
SELECT 'REPARACION', 'Servicio de reparación asociado a incidencias', 'Activo', 'YES'
WHERE NOT EXISTS (SELECT 1 FROM `SERVICIO` WHERE `nombre` = 'REPARACION' AND `servicio_de_incidencia` = 'YES');

INSERT INTO `SERVICIO` (`nombre`, `descripcion`, `Estado`, `servicio_de_incidencia`)
SELECT 'MANTENIMIENTO', 'Servicio de mantenimiento asociado a incidencias', 'Activo', 'YES'
WHERE NOT EXISTS (SELECT 1 FROM `SERVICIO` WHERE `nombre` = 'MANTENIMIENTO' AND `servicio_de_incidencia` = 'YES');

INSERT INTO `SERVICIO` (`nombre`, `descripcion`, `Estado`, `servicio_de_incidencia`)
SELECT 'TRASLADO', 'Servicio de traslado asociado a incidencias', 'Activo', 'YES'
WHERE NOT EXISTS (SELECT 1 FROM `SERVICIO` WHERE `nombre` = 'TRASLADO' AND `servicio_de_incidencia` = 'YES');

INSERT INTO `SERVICIO` (`nombre`, `descripcion`, `Estado`, `servicio_de_incidencia`)
SELECT 'RETRIBUCION DE COSTE DE PRODUCTO', 'Retribución de coste de producto por incidencia', 'Activo', 'YES'
WHERE NOT EXISTS (SELECT 1 FROM `SERVICIO` WHERE `nombre` = 'RETRIBUCION DE COSTE DE PRODUCTO' AND `servicio_de_incidencia` = 'YES');

INSERT INTO `SERVICIO` (`nombre`, `descripcion`, `Estado`, `servicio_de_incidencia`)
SELECT 'ACCIONES MEDICAS', 'Acciones médicas asociadas a incidencias', 'Activo', 'YES'
WHERE NOT EXISTS (SELECT 1 FROM `SERVICIO` WHERE `nombre` = 'ACCIONES MEDICAS' AND `servicio_de_incidencia` = 'YES');
