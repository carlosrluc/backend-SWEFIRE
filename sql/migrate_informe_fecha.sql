-- Día en que ocurrió el suceso (se combina con hora; NO es fecha_registro de subida)

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'INFORME'
    AND COLUMN_NAME = 'fecha'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE `INFORME` ADD COLUMN `fecha` date DEFAULT NULL AFTER `nombre`',
  'SELECT ''fecha ya existe'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
