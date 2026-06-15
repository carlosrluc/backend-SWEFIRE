-- Enum de profesión + profesion_clasificacion en PERFIL

SET @enum_sql = CONCAT(
  'ENUM(',
  '''bombero'',',
  '''ingeniero de sistemas'',',
  '''ingeniero sanitario'',',
  '''SSOMA'',',
  '''Supervisor de planta'',',
  '''ingeniero ambiental'',',
  '''mecanico'',',
  '''tecnico'',',
  '''arquitecto'',',
  '''piloto'',',
  '''otros''',
  ') COLLATE utf8mb4_unicode_ci'
);

-- PERFIL.profesion_clasificacion
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PERFIL' AND COLUMN_NAME = 'profesion_clasificacion');
SET @sql = IF(@col = 0,
  CONCAT('ALTER TABLE `PERFIL` ADD COLUMN `profesion_clasificacion` ', @enum_sql, ' DEFAULT NULL AFTER `profesion`'),
  'SELECT ''profesion_clasificacion ya existe'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Backfill desde profesion (texto libre) → enum
UPDATE `PERFIL` SET `profesion_clasificacion` = 'bombero'
WHERE `profesion_clasificacion` IS NULL AND LOWER(`profesion`) LIKE '%bombero%';

UPDATE `PERFIL` SET `profesion_clasificacion` = 'ingeniero de sistemas'
WHERE `profesion_clasificacion` IS NULL AND LOWER(`profesion`) LIKE '%ingeniero de sistema%';

UPDATE `PERFIL` SET `profesion_clasificacion` = 'ingeniero sanitario'
WHERE `profesion_clasificacion` IS NULL AND LOWER(`profesion`) LIKE '%ingeniero sanitario%';

UPDATE `PERFIL` SET `profesion_clasificacion` = 'SSOMA'
WHERE `profesion_clasificacion` IS NULL AND LOWER(`profesion`) LIKE '%ssoma%';

UPDATE `PERFIL` SET `profesion_clasificacion` = 'Supervisor de planta'
WHERE `profesion_clasificacion` IS NULL AND LOWER(`profesion`) LIKE '%supervisor%planta%';

UPDATE `PERFIL` SET `profesion_clasificacion` = 'ingeniero ambiental'
WHERE `profesion_clasificacion` IS NULL AND LOWER(`profesion`) LIKE '%ingeniero ambiental%';

UPDATE `PERFIL` SET `profesion_clasificacion` = 'mecanico'
WHERE `profesion_clasificacion` IS NULL AND LOWER(`profesion`) LIKE '%mecan%';

UPDATE `PERFIL` SET `profesion_clasificacion` = 'tecnico'
WHERE `profesion_clasificacion` IS NULL AND LOWER(`profesion`) LIKE '%tecnico%';

UPDATE `PERFIL` SET `profesion_clasificacion` = 'arquitecto'
WHERE `profesion_clasificacion` IS NULL AND LOWER(`profesion`) LIKE '%arquitect%';

UPDATE `PERFIL` SET `profesion_clasificacion` = 'piloto'
WHERE `profesion_clasificacion` IS NULL AND (
  LOWER(`profesion`) LIKE '%piloto%' OR LOWER(`profesion`) LIKE '%conductor%'
);

UPDATE `PERFIL` SET `profesion_clasificacion` = 'otros'
WHERE `profesion_clasificacion` IS NULL AND `profesion` IS NOT NULL AND TRIM(`profesion`) != '';

-- Perfiles con brevete sin clasificación → piloto
UPDATE `PERFIL` p
SET p.`profesion_clasificacion` = 'piloto'
WHERE p.`profesion_clasificacion` IS NULL
  AND EXISTS (SELECT 1 FROM `PERFIL_BREVETE` b WHERE b.`DNI_perfil` = p.`DNI`);

-- SERVICIO_PERSONAL_REQUERIDO.profesion → enum
ALTER TABLE `SERVICIO_PERSONAL_REQUERIDO`
  MODIFY COLUMN `profesion` ENUM(
    'bombero',
    'ingeniero de sistemas',
    'ingeniero sanitario',
    'SSOMA',
    'Supervisor de planta',
    'ingeniero ambiental',
    'mecanico',
    'tecnico',
    'arquitecto',
    'piloto',
    'otros'
  ) COLLATE utf8mb4_unicode_ci DEFAULT NULL;
