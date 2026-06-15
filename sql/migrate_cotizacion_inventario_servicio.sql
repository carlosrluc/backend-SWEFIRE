-- COTIZACION_INVENTARIO: vínculo opcional con COTIZACION_SERVICIO al alquilar
-- (misma idea que COTIZACION_CAMION.uso)

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'COTIZACION_INVENTARIO'
    AND COLUMN_NAME = 'servicio_a_alquilar'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `COTIZACION_INVENTARIO` ADD COLUMN `servicio_a_alquilar` int DEFAULT NULL AFTER `dias_alquilados`',
  'SELECT ''servicio_a_alquilar ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'COTIZACION_INVENTARIO'
    AND INDEX_NAME = 'COTIZACION_INVENTARIO_idx_servicio_a_alquilar'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `COTIZACION_INVENTARIO` ADD KEY `COTIZACION_INVENTARIO_idx_servicio_a_alquilar` (`servicio_a_alquilar`)',
  'SELECT ''índice servicio_a_alquilar ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'COTIZACION_INVENTARIO'
    AND CONSTRAINT_NAME = 'COTIZACION_INVENTARIO_ibfk_servicio_a_alquilar'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `COTIZACION_INVENTARIO` ADD CONSTRAINT `COTIZACION_INVENTARIO_ibfk_servicio_a_alquilar` FOREIGN KEY (`servicio_a_alquilar`) REFERENCES `COTIZACION_SERVICIO` (`id`) ON DELETE SET NULL',
  'SELECT ''FK servicio_a_alquilar ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- intencion comprar → sin vínculo
UPDATE `COTIZACION_INVENTARIO`
SET `servicio_a_alquilar` = NULL
WHERE `intencion` = 'comprar' AND `servicio_a_alquilar` IS NOT NULL;
