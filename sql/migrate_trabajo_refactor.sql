-- TRABAJO absorbe TRABAJO_JORNADA; elimina tabla TRABAJO_JORNADA

-- Desvincular PROYECTO del TRABAJO contenedor legacy
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PROYECTO' AND CONSTRAINT_NAME = 'fk_proyecto_trabajo');
SET @sql = IF(@fk > 0,
  'ALTER TABLE `PROYECTO` DROP FOREIGN KEY `fk_proyecto_trabajo`',
  'SELECT ''fk_proyecto_trabajo ya eliminada'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE `PROYECTO` SET `ID_Trabajo` = NULL WHERE `ID_Trabajo` IS NOT NULL;

-- Nuevas columnas en TRABAJO
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TRABAJO' AND COLUMN_NAME = 'dia');
SET @sql = IF(@col = 0,
  'ALTER TABLE `TRABAJO` ADD COLUMN `dia` date DEFAULT NULL AFTER `Id_Proyecto`',
  'SELECT ''dia ya existe'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TRABAJO' AND COLUMN_NAME = 'horario_entrada');
SET @sql = IF(@col = 0,
  'ALTER TABLE `TRABAJO` ADD COLUMN `horario_entrada` time DEFAULT NULL AFTER `dia`',
  'SELECT ''horario_entrada ya existe'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TRABAJO' AND COLUMN_NAME = 'horario_salida');
SET @sql = IF(@col = 0,
  'ALTER TABLE `TRABAJO` ADD COLUMN `horario_salida` time DEFAULT NULL AFTER `horario_entrada`',
  'SELECT ''horario_salida ya existe'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TRABAJO' AND COLUMN_NAME = 'DNI_Trabajador');
SET @sql = IF(@col = 0,
  'ALTER TABLE `TRABAJO` ADD COLUMN `DNI_Trabajador` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `horario_salida`',
  'SELECT ''DNI_Trabajador ya existe'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TRABAJO' AND COLUMN_NAME = 'profesion');
SET @sql = IF(@col = 0,
  'ALTER TABLE `TRABAJO` ADD COLUMN `profesion` ENUM(
    ''bombero'',''ingeniero de sistemas'',''ingeniero sanitario'',''SSOMA'',''Supervisor de planta'',
    ''ingeniero ambiental'',''mecanico'',''tecnico'',''arquitecto'',''piloto'',''otros''
  ) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `DNI_Trabajador`',
  'SELECT ''profesion ya existe'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TRABAJO' AND COLUMN_NAME = 'ID_Servicio');
SET @sql = IF(@col = 0,
  'ALTER TABLE `TRABAJO` ADD COLUMN `ID_Servicio` int DEFAULT NULL AFTER `profesion`',
  'SELECT ''ID_Servicio ya existe'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Migrar TRABAJO_JORNADA → TRABAJO (si la tabla legacy existe)
SET @tj = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TRABAJO_JORNADA');
SET @sql = IF(@tj > 0,
  'INSERT INTO `TRABAJO` (`Id_Proyecto`, `dia`, `horario_entrada`, `horario_salida`, `DNI_Trabajador`, `asistencia`, `comentario`, `profesion`)
   SELECT t.`Id_Proyecto`, tj.`dia`, tj.`horario_entrada`, tj.`horario_salida`, tj.`DNI_Trabajador`, t.`asistencia`, t.`comentario`, NULL
   FROM `TRABAJO_JORNADA` tj
   INNER JOIN `TRABAJO` t ON tj.`Id_trabajo` = t.`Id_trabajo`',
  'SELECT ''TRABAJO_JORNADA no existe, omitiendo migración'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Filas TRABAJO legacy sin jornadas: fecha → dia
UPDATE `TRABAJO` SET `dia` = `fecha`
WHERE `dia` IS NULL AND `fecha` IS NOT NULL;

-- Eliminar TRABAJO contenedores que tenían jornadas hijas
SET @sql = IF(@tj > 0,
  'DELETE t FROM `TRABAJO` t
   WHERE EXISTS (SELECT 1 FROM `TRABAJO_JORNADA` tj WHERE tj.`Id_trabajo` = t.`Id_trabajo`)',
  'SELECT ''sin TRABAJO_JORNADA'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- FK DNI_Trabajador (nullable)
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TRABAJO' AND CONSTRAINT_NAME = 'TRABAJO_ibfk_dni_trabajador');
SET @sql = IF(@fk = 0,
  'ALTER TABLE `TRABAJO` ADD CONSTRAINT `TRABAJO_ibfk_dni_trabajador` FOREIGN KEY (`DNI_Trabajador`) REFERENCES `PERFIL` (`DNI`) ON DELETE SET NULL',
  'SELECT ''FK DNI_Trabajador ya existe'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TRABAJO' AND CONSTRAINT_NAME = 'TRABAJO_ibfk_servicio');
SET @sql = IF(@fk = 0,
  'ALTER TABLE `TRABAJO` ADD CONSTRAINT `TRABAJO_ibfk_servicio` FOREIGN KEY (`ID_Servicio`) REFERENCES `SERVICIO` (`ID_Servicio`) ON DELETE SET NULL',
  'SELECT ''FK ID_Servicio ya existe'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TRABAJO' AND INDEX_NAME = 'TRABAJO_idx_dia');
SET @sql = IF(@idx = 0,
  'ALTER TABLE `TRABAJO` ADD KEY `TRABAJO_idx_dia` (`dia`)',
  'SELECT ''índice dia ya existe'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Eliminar columnas legacy
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TRABAJO' AND COLUMN_NAME = 'fecha');
SET @sql = IF(@col > 0, 'ALTER TABLE `TRABAJO` DROP COLUMN `fecha`', 'SELECT ''fecha ya eliminada'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TRABAJO' AND COLUMN_NAME = 'horario');
SET @sql = IF(@col > 0, 'ALTER TABLE `TRABAJO` DROP COLUMN `horario`', 'SELECT ''horario ya eliminado'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Eliminar TRABAJO_JORNADA
SET @sql = IF(@tj > 0, 'DROP TABLE `TRABAJO_JORNADA`', 'SELECT ''TRABAJO_JORNADA ya eliminada'' AS info');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- profesion enum en TRABAJO (por si la columna ya existía como varchar)
ALTER TABLE `TRABAJO`
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
