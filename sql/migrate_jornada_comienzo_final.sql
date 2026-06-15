-- Reemplaza jornada (varchar) por jornada_comienzo / jornada_final (TIME)

-- COTIZACION_SERVICIO
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_SERVICIO' AND COLUMN_NAME = 'jornada_comienzo');
SET @sql = IF(@col = 0,
  'ALTER TABLE `COTIZACION_SERVICIO` ADD COLUMN `jornada_comienzo` time DEFAULT NULL AFTER `fecha_finalizacion`',
  'SELECT ''jornada_comienzo ya existe en COTIZACION_SERVICIO'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_SERVICIO' AND COLUMN_NAME = 'jornada_final');
SET @sql = IF(@col = 0,
  'ALTER TABLE `COTIZACION_SERVICIO` ADD COLUMN `jornada_final` time DEFAULT NULL AFTER `jornada_comienzo`',
  'SELECT ''jornada_final ya existe en COTIZACION_SERVICIO'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE `COTIZACION_SERVICIO`
SET
  `jornada_comienzo` = COALESCE(
    `jornada_comienzo`,
    TIME(TRIM(SUBSTRING_INDEX(`jornada`, '-', 1)))
  ),
  `jornada_final` = COALESCE(
    `jornada_final`,
    TIME(TRIM(SUBSTRING_INDEX(`jornada`, '-', -1)))
  )
WHERE `jornada` IS NOT NULL AND TRIM(`jornada`) != '';

UPDATE `COTIZACION_SERVICIO`
SET `jornada_comienzo` = COALESCE(`jornada_comienzo`, '08:00:00'),
    `jornada_final` = COALESCE(`jornada_final`, '17:00:00')
WHERE `jornada_comienzo` IS NULL OR `jornada_final` IS NULL;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_SERVICIO' AND COLUMN_NAME = 'jornada');
SET @sql = IF(@col > 0,
  'ALTER TABLE `COTIZACION_SERVICIO` DROP COLUMN `jornada`',
  'SELECT ''jornada ya eliminada de COTIZACION_SERVICIO'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- PROYECTO_SERVICIO
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO_SERVICIO' AND COLUMN_NAME = 'jornada_comienzo');
SET @sql = IF(@col = 0,
  'ALTER TABLE `PROYECTO_SERVICIO` ADD COLUMN `jornada_comienzo` time DEFAULT NULL AFTER `fecha_finalizacion`',
  'SELECT ''jornada_comienzo ya existe en PROYECTO_SERVICIO'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO_SERVICIO' AND COLUMN_NAME = 'jornada_final');
SET @sql = IF(@col = 0,
  'ALTER TABLE `PROYECTO_SERVICIO` ADD COLUMN `jornada_final` time DEFAULT NULL AFTER `jornada_comienzo`',
  'SELECT ''jornada_final ya existe en PROYECTO_SERVICIO'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE `PROYECTO_SERVICIO`
SET
  `jornada_comienzo` = COALESCE(
    `jornada_comienzo`,
    TIME(TRIM(SUBSTRING_INDEX(`jornada`, '-', 1)))
  ),
  `jornada_final` = COALESCE(
    `jornada_final`,
    TIME(TRIM(SUBSTRING_INDEX(`jornada`, '-', -1)))
  )
WHERE `jornada` IS NOT NULL AND TRIM(`jornada`) != '';

UPDATE `PROYECTO_SERVICIO`
SET `jornada_comienzo` = COALESCE(`jornada_comienzo`, '08:00:00'),
    `jornada_final` = COALESCE(`jornada_final`, '17:00:00')
WHERE `jornada_comienzo` IS NULL OR `jornada_final` IS NULL;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO_SERVICIO' AND COLUMN_NAME = 'jornada');
SET @sql = IF(@col > 0,
  'ALTER TABLE `PROYECTO_SERVICIO` DROP COLUMN `jornada`',
  'SELECT ''jornada ya eliminada de PROYECTO_SERVICIO'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
