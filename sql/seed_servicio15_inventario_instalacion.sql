-- Inventario requerido (herramientas de instalación) para servicio 15:
--   "Instalacion de Sistemas de Detección de incendios"
--
-- Solo herramientas/equipos de apoyo al montaje (escalera, taladro, etc.).
-- NO incluye detectores, cables ni paneles que formen parte del sistema instalado.
--
-- Requiere: FABRICANTE ID 1 (ver sql/servicio_inventario_seed.sql)
-- estancia: 'para inventario' = sale del taller al asignar al proyecto

USE swefire_db;

-- ── Fabricante demo (si no existe) ───────────────────────────────────────────
INSERT INTO FABRICANTE (ID_Fabricante, nombre_comercial, ubicacion, rubro, descripcion, pago)
VALUES (1, 'Proveedor SWEFIRE Demo', 'Lima', 'Herramientas y EPI', 'Fabricante demo para seeds', 'contado')
ON DUPLICATE KEY UPDATE nombre_comercial = VALUES(nombre_comercial);

-- ── Herramientas nuevas (IDs 26-36) ─────────────────────────────────────────
INSERT INTO INVENTARIO (Id_Objeto, nombre_objeto, ID_Fabricante, cantidad, lugar_almacenaje, precio_compra, precio_comercial, estado)
VALUES
  (26, 'Escalera extensible aluminio 6 m', 1, 4, 'Patio herramientas', 420.00, 580.00, 'disponible'),
  (27, 'Escalera tijera fibra de vidrio 3 m', 1, 3, 'Patio herramientas', 280.00, 390.00, 'disponible'),
  (28, 'Andamio portátil ajustable (par)', 1, 2, 'Patio herramientas', 650.00, 900.00, 'disponible'),
  (29, 'Taladro percutor 800 W', 1, 4, 'Taller eléctrico', 185.00, 260.00, 'disponible'),
  (30, 'Juego brocas SDS para concreto (5 pzas)', 1, 6, 'Taller eléctrico', 45.00, 70.00, 'disponible'),
  (31, 'Pelacables y crimpadora para cable alarmado', 1, 5, 'Taller eléctrico', 55.00, 85.00, 'disponible'),
  (32, 'Multímetro digital industrial', 1, 4, 'Taller eléctrico', 95.00, 140.00, 'disponible'),
  (33, 'Nivel láser de línea', 1, 3, 'Taller eléctrico', 120.00, 175.00, 'disponible'),
  (34, 'Sierra caladora eléctrica', 1, 2, 'Taller eléctrico', 210.00, 295.00, 'disponible'),
  (35, 'Set destornilladores aislados (6 pzas)', 1, 8, 'Taller eléctrico', 35.00, 55.00, 'disponible'),
  (36, 'Arnés de seguridad tipo paracaídas', 1, 6, 'EPI', 180.00, 250.00, 'disponible'),
  (37, 'Foco LED recargable de trabajo 1000 lm', 1, 8, 'Taller eléctrico', 42.00, 65.00, 'disponible')
ON DUPLICATE KEY UPDATE
  nombre_objeto = VALUES(nombre_objeto),
  cantidad = VALUES(cantidad),
  lugar_almacenaje = VALUES(lugar_almacenaje),
  precio_compra = VALUES(precio_compra),
  precio_comercial = VALUES(precio_comercial),
  estado = VALUES(estado);

-- ── Servicio 15 (verificar nombre) ───────────────────────────────────────────
-- Si el servicio no existe, descomenta y ajusta el nombre:
-- INSERT INTO SERVICIO (ID_Servicio, nombre, Estado)
-- VALUES (15, 'Instalacion de Sistemas de Detección de incendios', 'Activo')
-- ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- ── Inventario requerido para servicio 15 ────────────────────────────────────
DELETE FROM SERVICIO_INVENTARIO_REQUERIDO WHERE ID_Servicio = 15;

INSERT INTO SERVICIO_INVENTARIO_REQUERIDO (ID_Servicio, Id_Objeto, cantidad, estancia) VALUES
  -- Herramientas nuevas (montaje en altura y acceso)
  (15, 26, 2, 'para inventario'),   -- Escalera extensible
  (15, 27, 1, 'para inventario'),   -- Escalera tijera
  (15, 28, 1, 'para inventario'),   -- Andamio
  (15, 36, 2, 'para inventario'),   -- Arnés
  -- Perforación y corte (canaletas / fijaciones)
  (15, 29, 2, 'para inventario'),   -- Taladro
  (15, 30, 2, 'para inventario'),   -- Brocas SDS
  (15, 34, 1, 'para inventario'),   -- Sierra caladora
  -- Cableado y verificación eléctrica
  (15, 31, 2, 'para inventario'),   -- Pelacables / crimpadora
  (15, 32, 1, 'para inventario'),   -- Multímetro
  (15, 35, 2, 'para inventario'),   -- Destornilladores aislados
  -- Medición y trazado
  (15, 33, 1, 'para inventario'),   -- Nivel láser
  (15, 37, 2, 'para inventario'),   -- Foco de trabajo
  -- Reutiliza herramientas ya existentes en catálogo (sql/servicio_inventario_seed.sql)
  (15, 10, 1, 'para inventario'),   -- Cinta métrica láser 50 m
  (15, 19, 1, 'para inventario');   -- Ranuradora (apertura de surcos para cable)

-- ── Verificación ─────────────────────────────────────────────────────────────
SELECT s.ID_Servicio, s.nombre AS servicio
FROM SERVICIO s
WHERE s.ID_Servicio = 15;

SELECT sir.ID_Servicio, sir.Id_Objeto, i.nombre_objeto, sir.cantidad, sir.estancia
FROM SERVICIO_INVENTARIO_REQUERIDO sir
JOIN INVENTARIO i ON i.Id_Objeto = sir.Id_Objeto
WHERE sir.ID_Servicio = 15
ORDER BY i.nombre_objeto;
