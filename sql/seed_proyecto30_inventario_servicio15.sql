-- Inventario en PROYECTO 30: herramientas requeridas por servicio 15
-- (Instalacion de Sistemas de Detección de incendios)
--
-- Solo inserta en PROYECTO_INVENTARIO (recursos del proyecto).
-- NO descuenta INVENTARIO.cantidad ni crea INVENTARIO_MOVIMIENTO.
-- NO toca PRESUPUESTO (ya lo importaste aparte).
--
-- Los 4 últimos objetos (34, 35, 36, 37) suelen tener stock insuficiente;
-- aquí se asigna la cantidad REQUERIDA por servicio (no se limita al stock).

USE swefire_db;

SET @id_proyecto = 30;
SET @id_servicio = 15;

START TRANSACTION;

-- ── Previsualización: requerido vs stock en taller ───────────────────────────
SELECT
    sir.Id_Objeto,
    i.nombre_objeto,
    sir.cantidad AS cantidad_requerida,
    i.cantidad AS stock_taller,
    CASE
        WHEN i.cantidad < sir.cantidad THEN 'stock insuficiente'
        ELSE 'ok'
    END AS estado_stock
FROM SERVICIO_INVENTARIO_REQUERIDO sir
JOIN INVENTARIO i ON i.Id_Objeto = sir.Id_Objeto
WHERE sir.ID_Servicio = @id_servicio
ORDER BY sir.Id_Objeto;

-- ── Quitar lotes previos de ESTOS objetos en el proyecto (evita duplicados) ───
DELETE pi
FROM PROYECTO_INVENTARIO pi
INNER JOIN SERVICIO_INVENTARIO_REQUERIDO sir
    ON sir.Id_Objeto = pi.Id_Objeto
   AND sir.ID_Servicio = @id_servicio
WHERE pi.id_Proyecto = @id_proyecto;

-- ── Insertar recursos del proyecto desde servicio 15 ───────────────────────────
INSERT INTO PROYECTO_INVENTARIO (
    id_Proyecto,
    Id_Objeto,
    cantidad_objeto,
    devolucion_pendiente,
    estado,
    fecha_salida,
    fecha_retorno,
    razon,
    estancia
)
SELECT
    @id_proyecto,
    sir.Id_Objeto,
    sir.cantidad,
    sir.cantidad,
    'aceptable',
    p.fecha_inicio,
    p.fecha_fin,
    'Importación inventario requerido servicio 15',
    sir.estancia
FROM SERVICIO_INVENTARIO_REQUERIDO sir
INNER JOIN PROYECTO p ON p.id_Proyecto = @id_proyecto
WHERE sir.ID_Servicio = @id_servicio;

-- ── Verificación en proyecto 30 ───────────────────────────────────────────────
SELECT
    pi.id,
    pi.Id_Objeto,
    i.nombre_objeto,
    pi.cantidad_objeto,
    pi.estancia,
    pi.estado,
    pi.fecha_salida,
    pi.fecha_retorno,
    i.cantidad AS stock_taller_actual
FROM PROYECTO_INVENTARIO pi
JOIN INVENTARIO i ON i.Id_Objeto = pi.Id_Objeto
WHERE pi.id_Proyecto = @id_proyecto
ORDER BY pi.Id_Objeto;

-- Si cuadra:
-- COMMIT;
-- Si no:
-- ROLLBACK;
