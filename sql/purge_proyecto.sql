-- =============================================================================
-- Purga de UN proyecto por id_Proyecto (incluye TRABAJO, TRABAJO_RRHH y subtablas).
-- NO borra COTIZACION_COMERCIAL ni datos del catálogo (CLIENTE, SERVICIO, etc.).
--
-- Uso:
--   1. Ajustar @id_proyecto abajo (ej. 30).
--   2. Ejecutar PREVISUALIZACIÓN y revisar conteos.
--   3. Si cuadra: COMMIT; si no: ROLLBACK;
-- =============================================================================

SET @id_proyecto = 30;

START TRANSACTION;

-- Cotización origen (se conserva)
SELECT @id_cotizacion := p.id_cotizacion
FROM PROYECTO p
WHERE p.id_Proyecto = @id_proyecto;

-- Comparar id de proyecto sin mezclar collations (origen_id/destino_id son VARCHAR)
-- ── PREVISUALIZACIÓN ───────────────────────────────────────────────────────────
SELECT 'PROYECTO' AS tabla, COUNT(*) AS filas
FROM PROYECTO WHERE id_Proyecto = @id_proyecto;

SELECT 'id_cotizacion (no se borrará)' AS info, @id_cotizacion AS id_cotizacion;

SELECT 'TRABAJO' AS tabla, COUNT(*) AS filas
FROM TRABAJO WHERE Id_Proyecto = @id_proyecto;

SELECT 'TRABAJO_RRHH' AS tabla, COUNT(*) AS filas
FROM TRABAJO_RRHH trr
INNER JOIN TRABAJO tr ON trr.Id_trabajo = tr.Id_trabajo
WHERE tr.Id_Proyecto = @id_proyecto;

SELECT 'INFORME' AS tabla, COUNT(*) AS filas
FROM INFORME WHERE id_Proyecto = @id_proyecto;

SELECT 'PROYECTO_ETAPA' AS tabla, COUNT(*) AS filas
FROM PROYECTO_ETAPA WHERE id_Proyecto = @id_proyecto;

SELECT 'PROYECTO_ACTIVIDAD' AS tabla, COUNT(*) AS filas
FROM PROYECTO_ACTIVIDAD WHERE id_Proyecto = @id_proyecto;

SELECT 'PROYECTO_SERVICIO' AS tabla, COUNT(*) AS filas
FROM PROYECTO_SERVICIO WHERE id_Proyecto = @id_proyecto;

SELECT 'PROYECTO_CAMION' AS tabla, COUNT(*) AS filas
FROM PROYECTO_CAMION WHERE id_Proyecto = @id_proyecto;

SELECT 'PROYECTO_INVENTARIO' AS tabla, COUNT(*) AS filas
FROM PROYECTO_INVENTARIO WHERE id_Proyecto = @id_proyecto;

SELECT 'PROYECTO_DOCUMENTACION' AS tabla, COUNT(*) AS filas
FROM PROYECTO_DOCUMENTACION WHERE id_Proyecto = @id_proyecto;

SELECT 'INCIDENCIA (id_proyecto)' AS tabla, COUNT(*) AS filas
FROM INCIDENCIA WHERE id_proyecto = @id_proyecto;

SELECT 'INVENTARIO_MOVIMIENTO (proyecto)' AS tabla, COUNT(*) AS filas
FROM INVENTARIO_MOVIMIENTO
WHERE (origen_tipo = 'proyecto' AND CAST(origen_id AS UNSIGNED) = @id_proyecto)
   OR (destino_tipo = 'proyecto' AND CAST(destino_id AS UNSIGNED) = @id_proyecto);

-- ── 1) Desacoplar punteros en PROYECTO (evita RESTRICT con TRABAJO / etapas) ──
UPDATE PROYECTO
SET etapa_actual_id = NULL,
    actividad_actual_id = NULL,
    ID_Trabajo = NULL
WHERE id_Proyecto = @id_proyecto;

-- ── 2) Incidencias ligadas al proyecto (cascade: INVOLUCRADO, INCIDENCIA_OBJETOS, etc.)
DELETE i FROM INCIDENCIA i
WHERE i.id_proyecto = @id_proyecto;

-- ── 3) Historial de movimientos de inventario referenciando este proyecto ─────
DELETE FROM INVENTARIO_MOVIMIENTO
WHERE (origen_tipo = 'proyecto' AND CAST(origen_id AS UNSIGNED) = @id_proyecto)
   OR (destino_tipo = 'proyecto' AND CAST(destino_id AS UNSIGNED) = @id_proyecto);

-- ── 4) TRABAJO_RRHH y TRABAJO (RESTRICT si quedan antes de borrar PROYECTO) ───
DELETE trr FROM TRABAJO_RRHH trr
INNER JOIN TRABAJO tr ON trr.Id_trabajo = tr.Id_trabajo
WHERE tr.Id_Proyecto = @id_proyecto;

DELETE tr FROM TRABAJO tr
WHERE tr.Id_Proyecto = @id_proyecto;

-- ── 5) Proyecto (CASCADE: etapas, actividades, servicios, camiones,
--      inventario, documentación, informes) ───────────────────────────────────
DELETE FROM PROYECTO
WHERE id_Proyecto = @id_proyecto;

-- ── Verificación final ───────────────────────────────────────────────────────
SELECT 'PROYECTO restante' AS chequeo, COUNT(*) AS filas
FROM PROYECTO WHERE id_Proyecto = @id_proyecto;

SELECT 'TRABAJO restante' AS chequeo, COUNT(*) AS filas
FROM TRABAJO WHERE Id_Proyecto = @id_proyecto;

SELECT 'COTIZACION conservada' AS chequeo, c.ID, c.estado, c.nombre
FROM COTIZACION_COMERCIAL c
WHERE c.ID = @id_cotizacion;

-- Si todo cuadra:
-- COMMIT;
-- Si algo no cuadra:
-- ROLLBACK;
