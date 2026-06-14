-- =============================================================================
-- Seed: Poblar flujo por defecto de servicios y atributos Principal / indicaciones
-- Basado en datos existentes (cotizaciones 44, 45, 46, 47 con etapas manuales).
--
-- Ejecutar DESPUÉS de migrate_servicio_flujo_principal.sql
-- y con los datos de "todos los sql de la bd" ya cargados.
-- =============================================================================

-- ── 1. SERVICIO_ETAPA (plantillas por servicio) ───────────────────────────────
-- No todos los servicios tienen etapas; solo los que tenían flujo manual en cotizaciones.

-- ID_Servicio 1: flujo de cotización 45 (envío → instalación → despedida)
INSERT INTO `SERVICIO_ETAPA` (`ID_Servicio`, `nombre`, `descripcion`, `duracion`, `orden`) VALUES
(1, 'fase de envio de productos', 'salida del taller hasta el establecimiento', 1, 1),
(1, 'fase de instalacion', 'la instalacion de los productos', 1, 2),
(1, 'fase de despedida', 'final', 1, 3);

-- ID_Servicio 15: flujo de cotización 46 (Sistemas preventivos contra incendios)
INSERT INTO `SERVICIO_ETAPA` (`ID_Servicio`, `nombre`, `descripcion`, `duracion`, `orden`) VALUES
(15, 'Inicio y material', '', 15, 1);

-- ID_Servicio 9: flujo de cotización 47 (Alquiler de camiones)
INSERT INTO `SERVICIO_ETAPA` (`ID_Servicio`, `nombre`, `descripcion`, `duracion`, `orden`) VALUES
(9, 'fase de envio', 'se realiza el envio de camiones', 1, 1),
(9, 'fase de llegada', 'se llega al local', 1, 2);

-- ID_Servicio 1 (alternativa corta de cotización 44 — segunda plantilla de referencia)
-- Solo si quieres probar el flujo de 2 etapas; comentado para no duplicar en servicio 1.
-- Usamos el flujo de 3 etapas arriba como plantilla principal del servicio 1.


-- ── 2. SERVICIO_ACTIVIDAD (manuales) ─────────────────────────────────────────

-- Servicio 1 — etapa 1 (id_servicio_etapa = 1)
INSERT INTO `SERVICIO_ACTIVIDAD` (`id_servicio_etapa`, `ID_Servicio`, `nombre`, `orden`, `origen`) VALUES
(1, 1, 'manejar el camion hasta la instalacion', 1, 'manual'),
(1, 1, 'empacar todo lo requerido en el camion de envio', 2, 'manual'),
(1, 1, 'despachar toda la mercancia', 3, 'manual');

-- Servicio 1 — etapa 2 (id_servicio_etapa = 2)
INSERT INTO `SERVICIO_ACTIVIDAD` (`id_servicio_etapa`, `ID_Servicio`, `nombre`, `orden`, `origen`) VALUES
(2, 1, 'elegir los mejores lugares para instalar y planificar', 1, 'manual'),
(2, 1, 'realizar la instalacion', 2, 'manual'),
(2, 1, 'aclimatar al personal al lugar y estudiar la arquitectura', 3, 'manual');

-- Servicio 1 — etapa 3 (id_servicio_etapa = 3)
INSERT INTO `SERVICIO_ACTIVIDAD` (`id_servicio_etapa`, `ID_Servicio`, `nombre`, `orden`, `origen`) VALUES
(3, 1, 'el personal se retira', 1, 'manual');

-- Servicio 15 — etapa 4
INSERT INTO `SERVICIO_ACTIVIDAD` (`id_servicio_etapa`, `ID_Servicio`, `nombre`, `orden`, `origen`) VALUES
(4, 15, 'Traer el material a la planta', 1, 'manual');

-- Servicio 9 — etapa 5
INSERT INTO `SERVICIO_ACTIVIDAD` (`id_servicio_etapa`, `ID_Servicio`, `nombre`, `orden`, `origen`) VALUES
(5, 9, 'arrancar y dirigirse al lugar', 1, 'manual'),
(5, 9, 'cargar combustible', 2, 'manual');

-- Servicio 9 — etapa 6
INSERT INTO `SERVICIO_ACTIVIDAD` (`id_servicio_etapa`, `ID_Servicio`, `nombre`, `orden`, `origen`) VALUES
(6, 9, 'se estaciona el camion correctamente', 1, 'manual'),
(6, 9, 'se autoriza su ingreso', 2, 'manual'),
(6, 9, 'el camion llega al local', 3, 'manual');


-- ── 3. SERVICIO_SUBSERVICIO + actividades derivadas ───────────────────────────
-- Los subservicios recomendados generan actividades al final de su etapa.

-- Servicio 1: subservicios de cotización 45 (servicios 2, 4 y 8)
INSERT INTO `SERVICIO_SUBSERVICIO` (`ID_Servicio`, `ID_Servicio_subservicio`, `id_servicio_etapa`) VALUES
(1, 8, 1),   -- Alquiler Grupo Electrógeno en fase de envío
(1, 2, 2),   -- Detección y Alarma en fase de instalación
(1, 4, 2);   -- Supresión Agente Limpio en fase de instalación

INSERT INTO `SERVICIO_ACTIVIDAD` (`id_servicio_etapa`, `ID_Servicio`, `nombre`, `orden`, `origen`, `id_servicio_subservicio`) VALUES
(1, 1, 'Alquiler de Grupo Electrógeno MP-55', 4, 'subservicio', 1),
(2, 1, 'Instalación de Sistema de Detección y Alarma', 4, 'subservicio', 2),
(2, 1, 'Instalación de Sistema de Supresión con Agente Limpio', 5, 'subservicio', 3);

-- Servicio 15: subservicio camión en etapa de inicio (cotización 46)
INSERT INTO `SERVICIO_SUBSERVICIO` (`ID_Servicio`, `ID_Servicio_subservicio`, `id_servicio_etapa`) VALUES
(15, 9, 4);

INSERT INTO `SERVICIO_ACTIVIDAD` (`id_servicio_etapa`, `ID_Servicio`, `nombre`, `orden`, `origen`, `id_servicio_subservicio`) VALUES
(4, 15, 'Alquiler de camiones', 2, 'subservicio', 4);

-- Servicio 15: segundo subservicio camión (mismo servicio, otra recomendación — prueba duplicados)
INSERT INTO `SERVICIO_SUBSERVICIO` (`ID_Servicio`, `ID_Servicio_subservicio`, `id_servicio_etapa`) VALUES
(15, 9, 4);

INSERT INTO `SERVICIO_ACTIVIDAD` (`id_servicio_etapa`, `ID_Servicio`, `nombre`, `orden`, `origen`, `id_servicio_subservicio`) VALUES
(4, 15, 'Alquiler de camiones', 3, 'subservicio', 5);


-- ── 4. SOLICITUD_SERVICIO: Principal + indicaciones ───────────────────────────

-- Solicitud 1: rociadores (principal) + detección (secundario)
UPDATE `SOLICITUD_SERVICIO` SET `Principal` = 'YES', `indicaciones` = 'Servicio principal: instalación de rociadores en zona de expansión del mall.'
WHERE `ID_Solicitud` = 1 AND `ID_Servicio` = 1 LIMIT 1;

UPDATE `SOLICITUD_SERVICIO` SET `Principal` = 'NO', `indicaciones` = 'Sistema de detección complementario al servicio principal.'
WHERE `ID_Solicitud` = 1 AND `ID_Servicio` = 2 LIMIT 1;

-- Solicitud 2: mantenimiento extintores (principal) + inspección (secundario)
UPDATE `SOLICITUD_SERVICIO` SET `Principal` = 'YES', `indicaciones` = 'Mantenimiento anual de 35 extintores.'
WHERE `ID_Solicitud` = 2 AND `ID_Servicio` = 3 LIMIT 1;

UPDATE `SOLICITUD_SERVICIO` SET `Principal` = 'NO', `indicaciones` = 'Inspección general del sistema de alarma.'
WHERE `ID_Solicitud` = 2 AND `ID_Servicio` = 5 LIMIT 1;

-- Solicitud 3, 4, 5: un solo servicio cada una → principal
UPDATE `SOLICITUD_SERVICIO` SET `Principal` = 'YES', `indicaciones` = NULL
WHERE `ID_Solicitud` = 3 AND `ID_Servicio` = 4 LIMIT 1;

UPDATE `SOLICITUD_SERVICIO` SET `Principal` = 'YES', `indicaciones` = NULL
WHERE `ID_Solicitud` = 4 AND `ID_Servicio` = 5 LIMIT 1;

UPDATE `SOLICITUD_SERVICIO` SET `Principal` = 'YES', `indicaciones` = NULL
WHERE `ID_Solicitud` = 5 AND `ID_Servicio` = 6 LIMIT 1;

-- Solicitud 23: dos filas del mismo servicio 1 — solo la primera es principal
UPDATE `SOLICITUD_SERVICIO` ss
INNER JOIN (
    SELECT MIN(`id`) AS `min_id`
    FROM `SOLICITUD_SERVICIO`
    WHERE `ID_Solicitud` = 23 AND `ID_Servicio` = 1
) t ON ss.`id` = t.`min_id`
SET ss.`Principal` = 'YES', ss.`indicaciones` = 'Prueba principal';

UPDATE `SOLICITUD_SERVICIO` SET `Principal` = 'NO', `indicaciones` = 'Segunda línea del mismo servicio (no principal)'
WHERE `ID_Solicitud` = 23 AND `ID_Servicio` = 1 AND `Principal` = 'NO';

-- Solicitud 25
UPDATE `SOLICITUD_SERVICIO` SET `Principal` = 'YES', `indicaciones` = 'Servicio de prueba con jornada viernes feriado'
WHERE `ID_Solicitud` = 25 AND `ID_Servicio` = 1 LIMIT 1;


-- ── 5. COTIZACION_SERVICIO: Principal + indicaciones ──────────────────────────

-- Cotización 44 (etapas manuales — servicio 1 principal, 7 envío)
UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'YES', `indicaciones` = 'Instalación de rociadores — servicio principal del proyecto.'
WHERE `ID_Cotizacion` = 44 AND `ID_Servicio` = 1 LIMIT 1;

UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'NO', `indicaciones` = 'Costo de envío/recojo (servicio 7).'
WHERE `ID_Cotizacion` = 44 AND `ID_Servicio` = 7 LIMIT 1;

-- Cotización 45 (servicios 1, 2, 4, 8 — principal = 1)
UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'YES', `indicaciones` = 'Servicio principal con flujo de 3 etapas.'
WHERE `ID_Cotizacion` = 45 AND `ID_Servicio` = 1 LIMIT 1;

UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'NO', `indicaciones` = 'Subservicio recomendado: detección y alarma.'
WHERE `ID_Cotizacion` = 45 AND `ID_Servicio` = 2 LIMIT 1;

UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'NO', `indicaciones` = 'Subservicio recomendado: supresión agente limpio.'
WHERE `ID_Cotizacion` = 45 AND `ID_Servicio` = 4 LIMIT 1;

UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'NO', `indicaciones` = 'Subservicio recomendado: grupo electrógeno.'
WHERE `ID_Cotizacion` = 45 AND `ID_Servicio` = 8 LIMIT 1;

-- Cotización 46 (servicio 9 principal, 7 envío)
UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'YES', `indicaciones` = 'Alquiler de camiones para traslado de materiales.'
WHERE `ID_Cotizacion` = 46 AND `ID_Servicio` = 9 LIMIT 1;

UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'NO', `indicaciones` = 'Envío/recojo.'
WHERE `ID_Cotizacion` = 46 AND `ID_Servicio` = 7 LIMIT 1;

-- Cotización 47 (solo servicio 9)
UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'YES', `indicaciones` = 'Alquiler de camión bomberos — servicio principal.'
WHERE `ID_Cotizacion` = 47 AND `ID_Servicio` = 9 LIMIT 1;

-- Cotizaciones históricas 1–3 (aprobadas, sin etapas manuales)
UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'YES', `indicaciones` = NULL
WHERE `ID_Cotizacion` = 1 AND `ID_Servicio` = 1 LIMIT 1;

UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'NO', `indicaciones` = NULL
WHERE `ID_Cotizacion` = 1 AND `ID_Servicio` = 2 LIMIT 1;

UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'YES', `indicaciones` = NULL
WHERE `ID_Cotizacion` = 2 AND `ID_Servicio` = 3 LIMIT 1;

UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'NO', `indicaciones` = NULL
WHERE `ID_Cotizacion` = 2 AND `ID_Servicio` = 5 LIMIT 1;

UPDATE `COTIZACION_SERVICIO` SET `Principal` = 'YES', `indicaciones` = NULL
WHERE `ID_Cotizacion` = 3 AND `ID_Servicio` = 4 LIMIT 1;

-- Cotizaciones solo con servicio 7 (envío): ningún principal
-- (ya quedan en NO por defecto)

-- Resto de cotizaciones con varios servicios: el primero distinto de 7 como principal
UPDATE `COTIZACION_SERVICIO` AS `CS`
INNER JOIN (
    SELECT `ID_Cotizacion`, MIN(`id`) AS `primer_id`
    FROM `COTIZACION_SERVICIO`
    WHERE `ID_Servicio` != 7
    GROUP BY `ID_Cotizacion`
) AS `P` ON `CS`.`id` = `P`.`primer_id`
SET `CS`.`Principal` = 'YES'
WHERE `CS`.`Principal` = 'NO'
  AND `CS`.`ID_Cotizacion` NOT IN (44, 45, 46, 47, 1, 2, 3);


-- ── 6. PROYECTO_SERVICIO: backfill desde cotizaciones aprobadas ───────────────

INSERT INTO `PROYECTO_SERVICIO`
    (`id_Proyecto`, `ID_Servicio`, `id_cotizacion_servicio`,
     `fecha_inicio`, `fecha_finalizacion`, `jornada`, `precio_comercial`,
     `Principal`, `indicaciones`)
SELECT
    P.`id_Proyecto`,
    CS.`ID_Servicio`,
    CS.`id`,
    CS.`fecha_inicio`,
    CS.`fecha_finalizacion`,
    CS.`jornada`,
    CS.`precio_comercial`,
    CS.`Principal`,
    CS.`indicaciones`
FROM `PROYECTO` P
INNER JOIN `COTIZACION_SERVICIO` CS ON CS.`ID_Cotizacion` = P.`id_cotizacion`
WHERE CS.`ID_Servicio` != 7
  AND NOT EXISTS (
      SELECT 1 FROM `PROYECTO_SERVICIO` PS
      WHERE PS.`id_Proyecto` = P.`id_Proyecto`
        AND PS.`id_cotizacion_servicio` = CS.`id`
  );
