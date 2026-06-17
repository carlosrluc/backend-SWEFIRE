-- Migración: seguimiento incidencias (Linarez) + plazos de pago en cotizaciones
-- Ejecutar en swefire_db

-- ── 1. INFORME: implicancia + tiempo_perdido ─────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'INFORME' AND COLUMN_NAME = 'implicancia'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `INFORME` ADD COLUMN `implicancia` enum(''ninguno'',''colateral'',''principal'') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''ninguno'' AFTER `id_Proyecto`',
  'SELECT ''implicancia ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'INFORME' AND COLUMN_NAME = 'tiempo_perdido'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `INFORME` ADD COLUMN `tiempo_perdido` decimal(8,2) DEFAULT NULL COMMENT ''Horas aproximadas perdidas en el suceso'' AFTER `implicancia`',
  'SELECT ''tiempo_perdido ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `INFORME` SET `implicancia` = 'ninguno' WHERE `implicancia` IS NULL OR `implicancia` = '';

-- ── 2. COTIZACION_PLAZO_PAGO (varios plazos/porcentajes por cotización) ───────
CREATE TABLE IF NOT EXISTS `COTIZACION_PLAZO_PAGO` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ID_Cotizacion` int NOT NULL,
  `porcentaje` decimal(5,2) NOT NULL,
  `plazo_de_pago` int NOT NULL DEFAULT 0 COMMENT 'Días después de fecha_fin del proyecto; 0 = antes de iniciar',
  `orden` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_cotizacion_plazo_cotizacion` (`ID_Cotizacion`),
  CONSTRAINT `COTIZACION_PLAZO_PAGO_ibfk_1` FOREIGN KEY (`ID_Cotizacion`) REFERENCES `COTIZACION_COMERCIAL` (`ID`) ON DELETE CASCADE
);

-- ── 3. Seed INFORME (coherente, no destructivo) ───────────────────────────────
-- Sin incidencia → ninguno
UPDATE `INFORME`
SET `implicancia` = 'ninguno', `tiempo_perdido` = NULL
WHERE `id_incidencia` IS NULL AND (`implicancia` = 'ninguno' OR `implicancia` IS NULL);

-- Primer informe por incidencia → principal (evento que origina/dispara la incidencia)
UPDATE `INFORME` I
INNER JOIN (
  SELECT id_incidencia, MIN(id) AS primer_id
  FROM `INFORME`
  WHERE id_incidencia IS NOT NULL
  GROUP BY id_incidencia
) PR ON PR.primer_id = I.id
SET I.implicancia = 'principal',
    I.tiempo_perdido = COALESCE(I.tiempo_perdido, 1.00)
WHERE I.implicancia = 'ninguno';

-- Resto de informes ligados a incidencia → colateral (tiempo perdido por consecuencias)
UPDATE `INFORME` I
INNER JOIN (
  SELECT id_incidencia, MIN(id) AS primer_id
  FROM `INFORME`
  WHERE id_incidencia IS NOT NULL
  GROUP BY id_incidencia
) PR ON PR.id_incidencia = I.id_incidencia AND I.id <> PR.primer_id
SET I.implicancia = 'colateral',
    I.tiempo_perdido = COALESCE(I.tiempo_perdido, 2.50)
WHERE I.id_incidencia IS NOT NULL AND I.implicancia = 'ninguno';

-- ── 4. Seed plazos de pago en cotizaciones vigentes de proyecto ───────────────
-- Cotización principal del proyecto: 30% antes (plazo 0) + 70% a 30 días post-proyecto
INSERT INTO `COTIZACION_PLAZO_PAGO` (`ID_Cotizacion`, `porcentaje`, `plazo_de_pago`, `orden`)
SELECT P.id_cotizacion, 30.00, 0, 1
FROM `PROYECTO` P
WHERE P.id_cotizacion IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `COTIZACION_PLAZO_PAGO` CPP
    WHERE CPP.ID_Cotizacion = P.id_cotizacion AND CPP.orden = 1
  );

INSERT INTO `COTIZACION_PLAZO_PAGO` (`ID_Cotizacion`, `porcentaje`, `plazo_de_pago`, `orden`)
SELECT P.id_cotizacion, 70.00, 30, 2
FROM `PROYECTO` P
WHERE P.id_cotizacion IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `COTIZACION_PLAZO_PAGO` CPP
    WHERE CPP.ID_Cotizacion = P.id_cotizacion AND CPP.orden = 2
  );

-- Cotizaciones de incidencia: 100% a 15 días post-proyecto (plazo único)
INSERT INTO `COTIZACION_PLAZO_PAGO` (`ID_Cotizacion`, `porcentaje`, `plazo_de_pago`, `orden`)
SELECT CC.ID, 100.00, 15, 1
FROM `COTIZACION_COMERCIAL` CC
WHERE CC.Id_incidencia IS NOT NULL
  AND CC.desactualizado = 'NO'
  AND NOT EXISTS (
    SELECT 1 FROM `COTIZACION_PLAZO_PAGO` CPP WHERE CPP.ID_Cotizacion = CC.ID
  );
