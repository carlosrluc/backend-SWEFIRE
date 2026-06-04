-- Migración: etapas y actividades de cotización en tablas normalizadas
-- Reemplaza el uso operativo de etapas_detalle (JSON) por filas individuales.
-- etapas_detalle se mantiene como caché/compatibilidad con el frontend.

-- ── COTIZACION_ETAPA ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `COTIZACION_ETAPA` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ID_Cotizacion` int NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `duracion` int NOT NULL DEFAULT 0,
  `orden` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_cotizacion_etapa_cotizacion` (`ID_Cotizacion`),
  CONSTRAINT `COTIZACION_ETAPA_ibfk_1` FOREIGN KEY (`ID_Cotizacion`) REFERENCES `COTIZACION_COMERCIAL` (`ID`) ON DELETE CASCADE
);

-- ── COTIZACION_ACTIVIDAD ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `COTIZACION_ACTIVIDAD` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_cotizacion_etapa` int NOT NULL,
  `ID_Cotizacion` int NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_cotizacion_act_etapa` (`id_cotizacion_etapa`),
  KEY `idx_cotizacion_act_cotizacion` (`ID_Cotizacion`),
  CONSTRAINT `COTIZACION_ACTIVIDAD_ibfk_1` FOREIGN KEY (`id_cotizacion_etapa`) REFERENCES `COTIZACION_ETAPA` (`id`) ON DELETE CASCADE,
  CONSTRAINT `COTIZACION_ACTIVIDAD_ibfk_2` FOREIGN KEY (`ID_Cotizacion`) REFERENCES `COTIZACION_COMERCIAL` (`ID`) ON DELETE CASCADE
);

-- Índices auxiliares 0..49 (máx. etapas/actividades por cotización en backfill)
CREATE TEMPORARY TABLE IF NOT EXISTS `_migrate_idx` (`idx` int NOT NULL PRIMARY KEY);
INSERT IGNORE INTO `_migrate_idx` (`idx`) VALUES
  (0),(1),(2),(3),(4),(5),(6),(7),(8),(9),
  (10),(11),(12),(13),(14),(15),(16),(17),(18),(19),
  (20),(21),(22),(23),(24),(25),(26),(27),(28),(29),
  (30),(31),(32),(33),(34),(35),(36),(37),(38),(39),
  (40),(41),(42),(43),(44),(45),(46),(47),(48),(49);

-- ── Backfill etapas desde etapas_detalle ─────────────────────────────────────

INSERT INTO `COTIZACION_ETAPA` (`ID_Cotizacion`, `nombre`, `descripcion`, `duracion`, `orden`)
SELECT
  cc.ID,
  COALESCE(
    NULLIF(JSON_UNQUOTE(JSON_EXTRACT(cc.etapas_detalle, CONCAT('$.items[', i.idx, '].name'))), ''),
    NULLIF(JSON_UNQUOTE(JSON_EXTRACT(cc.etapas_detalle, CONCAT('$.items[', i.idx, '].nombre'))), ''),
    ''
  ),
  NULLIF(COALESCE(
    JSON_UNQUOTE(JSON_EXTRACT(cc.etapas_detalle, CONCAT('$.items[', i.idx, '].description'))),
    JSON_UNQUOTE(JSON_EXTRACT(cc.etapas_detalle, CONCAT('$.items[', i.idx, '].descripcion')))
  ), 'null'),
  COALESCE(CAST(COALESCE(
    JSON_UNQUOTE(JSON_EXTRACT(cc.etapas_detalle, CONCAT('$.items[', i.idx, '].duration'))),
    JSON_UNQUOTE(JSON_EXTRACT(cc.etapas_detalle, CONCAT('$.items[', i.idx, '].duracion')))
  ) AS UNSIGNED), 0),
  i.idx + 1
FROM `COTIZACION_COMERCIAL` cc
CROSS JOIN `_migrate_idx` i
WHERE cc.etapas_detalle IS NOT NULL
  AND JSON_VALID(cc.etapas_detalle)
  AND JSON_EXTRACT(cc.etapas_detalle, CONCAT('$.items[', i.idx, ']')) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `COTIZACION_ETAPA` ce WHERE ce.ID_Cotizacion = cc.ID
  );

-- ── Backfill actividades (JSON_EXTRACT; JSON_TABLE no admite ruta dinámica) ──

INSERT INTO `COTIZACION_ACTIVIDAD` (`id_cotizacion_etapa`, `ID_Cotizacion`, `nombre`, `orden`)
SELECT
  ce.id,
  ce.ID_Cotizacion,
  COALESCE(
    NULLIF(JSON_UNQUOTE(JSON_EXTRACT(cc.etapas_detalle, CONCAT(
      '$.items[', ce.orden - 1, '].activities[', i.idx, '].name'
    ))), ''),
    NULLIF(JSON_UNQUOTE(JSON_EXTRACT(cc.etapas_detalle, CONCAT(
      '$.items[', ce.orden - 1, '].activities[', i.idx, '].nombre'
    ))), ''),
    ''
  ),
  i.idx + 1
FROM `COTIZACION_ETAPA` ce
INNER JOIN `COTIZACION_COMERCIAL` cc ON cc.ID = ce.ID_Cotizacion
CROSS JOIN `_migrate_idx` i
WHERE cc.etapas_detalle IS NOT NULL
  AND JSON_VALID(cc.etapas_detalle)
  AND JSON_EXTRACT(cc.etapas_detalle, CONCAT(
    '$.items[', ce.orden - 1, '].activities[', i.idx, ']'
  )) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `COTIZACION_ACTIVIDAD` ca WHERE ca.id_cotizacion_etapa = ce.id
  );

DROP TEMPORARY TABLE IF EXISTS `_migrate_idx`;
