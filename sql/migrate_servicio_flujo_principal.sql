-- =============================================================================
-- Migración: Servicios con flujo por defecto (etapas, actividades, subservicios)
-- y atributo Principal en solicitud / cotización / proyecto.
--
-- Ejecutar una sola vez sobre swefire_db.
-- =============================================================================

-- ── 1. Etapas por defecto del servicio ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS `SERVICIO_ETAPA` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ID_Servicio` int NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `duracion` int NOT NULL DEFAULT 0,
  `orden` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_servicio_etapa_servicio` (`ID_Servicio`),
  CONSTRAINT `SERVICIO_ETAPA_ibfk_1`
    FOREIGN KEY (`ID_Servicio`) REFERENCES `SERVICIO` (`ID_Servicio`)
    ON DELETE CASCADE ON UPDATE RESTRICT
);

-- ── 2. Subservicios recomendados del servicio principal ──────────────────────
-- Un mismo ID_Servicio_subservicio puede repetirse (sin UNIQUE en el par).

CREATE TABLE IF NOT EXISTS `SERVICIO_SUBSERVICIO` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ID_Servicio` int NOT NULL COMMENT 'Servicio principal',
  `ID_Servicio_subservicio` int NOT NULL COMMENT 'Otro servicio recomendado como secundario',
  `id_servicio_etapa` int NOT NULL COMMENT 'Etapa del principal donde ocurre',
  PRIMARY KEY (`id`),
  KEY `idx_servicio_subservicio_principal` (`ID_Servicio`),
  KEY `idx_servicio_subservicio_sub` (`ID_Servicio_subservicio`),
  KEY `idx_servicio_subservicio_etapa` (`id_servicio_etapa`),
  CONSTRAINT `SERVICIO_SUBSERVICIO_ibfk_1`
    FOREIGN KEY (`ID_Servicio`) REFERENCES `SERVICIO` (`ID_Servicio`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `SERVICIO_SUBSERVICIO_ibfk_2`
    FOREIGN KEY (`ID_Servicio_subservicio`) REFERENCES `SERVICIO` (`ID_Servicio`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `SERVICIO_SUBSERVICIO_ibfk_3`
    FOREIGN KEY (`id_servicio_etapa`) REFERENCES `SERVICIO_ETAPA` (`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT
);

-- ── 3. Actividades por defecto (manuales + generadas por subservicios) ───────

CREATE TABLE IF NOT EXISTS `SERVICIO_ACTIVIDAD` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_servicio_etapa` int NOT NULL,
  `ID_Servicio` int NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` int NOT NULL DEFAULT 1,
  `origen` enum('manual','subservicio') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `id_servicio_subservicio` int DEFAULT NULL COMMENT 'Vínculo si origen=subservicio',
  PRIMARY KEY (`id`),
  KEY `idx_servicio_act_etapa` (`id_servicio_etapa`),
  KEY `idx_servicio_act_servicio` (`ID_Servicio`),
  KEY `idx_servicio_act_subservicio` (`id_servicio_subservicio`),
  CONSTRAINT `SERVICIO_ACTIVIDAD_ibfk_1`
    FOREIGN KEY (`id_servicio_etapa`) REFERENCES `SERVICIO_ETAPA` (`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `SERVICIO_ACTIVIDAD_ibfk_2`
    FOREIGN KEY (`ID_Servicio`) REFERENCES `SERVICIO` (`ID_Servicio`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `SERVICIO_ACTIVIDAD_ibfk_3`
    FOREIGN KEY (`id_servicio_subservicio`) REFERENCES `SERVICIO_SUBSERVICIO` (`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT
);

-- ── 4. SOLICITUD_SERVICIO: Principal + indicaciones ────────────────────────

ALTER TABLE `SOLICITUD_SERVICIO`
  ADD COLUMN `Principal` enum('YES','NO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NO'
    AFTER `horario_servicio`,
  ADD COLUMN `indicaciones` text COLLATE utf8mb4_unicode_ci DEFAULT NULL
    AFTER `Principal`;

-- ── 5. COTIZACION_SERVICIO: Principal + indicaciones ───────────────────────

ALTER TABLE `COTIZACION_SERVICIO`
  ADD COLUMN `Principal` enum('YES','NO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NO'
    AFTER `jornada`,
  ADD COLUMN `indicaciones` text COLLATE utf8mb4_unicode_ci DEFAULT NULL
    AFTER `Principal`;

-- ── 6. PROYECTO_SERVICIO (hereda de cotización) ─────────────────────────────

CREATE TABLE IF NOT EXISTS `PROYECTO_SERVICIO` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_Proyecto` int NOT NULL,
  `ID_Servicio` int NOT NULL,
  `id_cotizacion_servicio` int DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_finalizacion` date DEFAULT NULL,
  `jornada` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `precio_comercial` decimal(12,2) DEFAULT NULL,
  `Principal` enum('YES','NO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NO',
  `indicaciones` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_proyecto_servicio_proyecto` (`id_Proyecto`),
  KEY `idx_proyecto_servicio_servicio` (`ID_Servicio`),
  KEY `idx_proyecto_servicio_cot_svc` (`id_cotizacion_servicio`),
  CONSTRAINT `PROYECTO_SERVICIO_ibfk_1`
    FOREIGN KEY (`id_Proyecto`) REFERENCES `PROYECTO` (`id_Proyecto`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `PROYECTO_SERVICIO_ibfk_2`
    FOREIGN KEY (`ID_Servicio`) REFERENCES `SERVICIO` (`ID_Servicio`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `PROYECTO_SERVICIO_ibfk_3`
    FOREIGN KEY (`id_cotizacion_servicio`) REFERENCES `COTIZACION_SERVICIO` (`id`)
    ON DELETE SET NULL ON UPDATE RESTRICT
);
