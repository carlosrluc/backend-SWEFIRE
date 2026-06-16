-- =============================================================================
-- Purga de SOLICITUD con estado = 'pendiente' y todo su árbol dependiente:
--   SOLICITUD_* → COTIZACION_COMERCIAL (+ hijos) → PROYECTO (+ hijos) → TRABAJO
--
-- Uso en DBeaver:
--   1. Ejecutar primero solo el bloque "PREVISUALIZACIÓN" (opcional).
--   2. Ejecutar todo el script; revisar conteos.
--   3. Si está bien: COMMIT; si no: ROLLBACK;
--
-- No borra CLIENTE, SERVICIO, PERFIL, CAMION ni INVENTARIO del catálogo.
-- =============================================================================

START TRANSACTION;

-- ── IDs afectados ─────────────────────────────────────────────────────────────
DROP TEMPORARY TABLE IF EXISTS tmp_sol_pendiente;
CREATE TEMPORARY TABLE tmp_sol_pendiente (
    ID INT NOT NULL PRIMARY KEY
);

INSERT INTO tmp_sol_pendiente (ID)
SELECT s.ID
FROM SOLICITUD s
WHERE s.estado = 'pendiente';

DROP TEMPORARY TABLE IF EXISTS tmp_cotizaciones;
CREATE TEMPORARY TABLE tmp_cotizaciones (
    ID INT NOT NULL PRIMARY KEY
);

INSERT INTO tmp_cotizaciones (ID)
SELECT c.ID
FROM COTIZACION_COMERCIAL c
INNER JOIN tmp_sol_pendiente t ON c.id_solicitud = t.ID;

DROP TEMPORARY TABLE IF EXISTS tmp_proyectos;
CREATE TEMPORARY TABLE tmp_proyectos (
    id_Proyecto INT NOT NULL PRIMARY KEY
);

INSERT INTO tmp_proyectos (id_Proyecto)
SELECT p.id_Proyecto
FROM PROYECTO p
INNER JOIN tmp_cotizaciones c ON p.id_cotizacion = c.ID;

-- ── PREVISUALIZACIÓN (revisar antes del COMMIT) ───────────────────────────────
SELECT 'SOLICITUD pendiente' AS tabla, COUNT(*) AS filas FROM tmp_sol_pendiente;
SELECT 'COTIZACION_COMERCIAL' AS tabla, COUNT(*) AS filas FROM tmp_cotizaciones;
SELECT 'PROYECTO' AS tabla, COUNT(*) AS filas FROM tmp_proyectos;

SELECT 'SOLICITUD_CAMION' AS tabla, COUNT(*) AS filas
FROM SOLICITUD_CAMION sc INNER JOIN tmp_sol_pendiente t ON sc.ID_Solicitud = t.ID;

SELECT 'SOLICITUD_INVENTARIO' AS tabla, COUNT(*) AS filas
FROM SOLICITUD_INVENTARIO si INNER JOIN tmp_sol_pendiente t ON si.ID_Solicitud = t.ID;

SELECT 'SOLICITUD_SERVICIO' AS tabla, COUNT(*) AS filas
FROM SOLICITUD_SERVICIO ss INNER JOIN tmp_sol_pendiente t ON ss.ID_Solicitud = t.ID;

SELECT 'SOLICITUD_MEDIO_COMUNICACION' AS tabla, COUNT(*) AS filas
FROM SOLICITUD_MEDIO_COMUNICACION sm INNER JOIN tmp_sol_pendiente t ON sm.ID_Solicitud = t.ID;

SELECT 'TRABAJO (por proyecto)' AS tabla, COUNT(*) AS filas
FROM TRABAJO tr INNER JOIN tmp_proyectos p ON tr.Id_Proyecto = p.id_Proyecto;

-- ── 1) Desacoplar punteros en PROYECTO (evita RESTRICT) ───────────────────────
UPDATE PROYECTO p
INNER JOIN tmp_proyectos t ON p.id_Proyecto = t.id_Proyecto
SET p.etapa_actual_id = NULL,
    p.actividad_actual_id = NULL,
    p.ID_Trabajo = NULL;

-- ── 2) Desacoplar incidencias en cotizaciones ─────────────────────────────────
UPDATE COTIZACION_COMERCIAL c
INNER JOIN tmp_cotizaciones t ON c.ID = t.ID
SET c.Id_incidencia = NULL;

-- ── 3) Incidencias ligadas a proyectos o cotizaciones del árbol ───────────────
--      (cascade: INVOLUCRADO, INCIDENCIA_OBJETOS, INCIDENCIA_CAMIONES)
DELETE i FROM INCIDENCIA i
WHERE i.id_proyecto IN (SELECT id_Proyecto FROM tmp_proyectos)
   OR i.cotizacion_remuneracion IN (SELECT ID FROM tmp_cotizaciones);

-- ── 4) RRHH y jornadas (TRABAJO) antes de borrar PROYECTO ────────────────────
DELETE trr FROM TRABAJO_RRHH trr
INNER JOIN TRABAJO tr ON trr.Id_trabajo = tr.Id_trabajo
INNER JOIN tmp_proyectos p ON tr.Id_Proyecto = p.id_Proyecto;

DELETE tr FROM TRABAJO tr
INNER JOIN tmp_proyectos p ON tr.Id_Proyecto = p.id_Proyecto;

-- ── 5) Proyectos (cascade: etapas, actividades, servicios, camiones, inventario, informes, etc.)
DELETE p FROM PROYECTO p
INNER JOIN tmp_proyectos t ON p.id_Proyecto = t.id_Proyecto;

-- ── 6) Cotizaciones (cascade: inventario, servicios, camiones, etapas, chat, presupuesto, etc.)
DELETE c FROM COTIZACION_COMERCIAL c
INNER JOIN tmp_cotizaciones t ON c.ID = t.ID;

-- ── 7) Solicitudes pendientes (cascade: solicitud_camion, inventario, servicio, medio)
DELETE s FROM SOLICITUD s
INNER JOIN tmp_sol_pendiente t ON s.ID = t.ID;

-- ── Verificación final (debe dar 0 en todo) ───────────────────────────────────
SELECT 'SOLICITUD pendiente restantes' AS chequeo, COUNT(*) AS filas
FROM SOLICITUD WHERE estado = 'pendiente';

SELECT 'Cotizaciones huérfanas de solicitud pendiente' AS chequeo, COUNT(*) AS filas
FROM COTIZACION_COMERCIAL c
INNER JOIN SOLICITUD s ON c.id_solicitud = s.ID
WHERE s.estado = 'pendiente';

-- Si los números son los esperados:
-- COMMIT;
-- Si algo no cuadra:
-- ROLLBACK;
