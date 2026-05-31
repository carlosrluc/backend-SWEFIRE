-- Seed: más objetos en INVENTARIO + materiales requeridos por servicio (IDs 1-13)
-- Requiere FABRICANTE con ID_Fabricante = 1
-- estancia: 'para inventario' = sale del taller al asignar; 'para proyecto' = referencia sin descontar taller

INSERT INTO FABRICANTE (ID_Fabricante, nombre_comercial, ubicacion, rubro, descripcion, comentarios, pago)
VALUES (1, 'Proveedor SWEFIRE Demo', 'Lima', 'Contra incendios', 'Fabricante demo para seeds', NULL, 'contado')
ON DUPLICATE KEY UPDATE nombre_comercial = VALUES(nombre_comercial);

-- Objetos 1-13 (actualizar si ya existen)
INSERT INTO INVENTARIO (Id_Objeto, nombre_objeto, ID_Fabricante, cantidad, lugar_almacenaje, precio_compra, precio_comercial, estado)
VALUES
  (1, 'Rociador tipo spray K=5.6', 1, 120, 'Estante A1', 45.00, 65.00, 'disponible'),
  (2, 'Tubería galvanizada 1"', 1, 80, 'Estante A2', 28.50, 42.00, 'disponible'),
  (3, 'Detector de humo fotoeléctrico', 1, 60, 'Estante B1', 38.00, 55.00, 'disponible'),
  (4, 'Cable alarmado 2x1.5 mm', 1, 200, 'Estante B2', 3.20, 5.50, 'disponible'),
  (5, 'Extintor PQS 6 kg', 1, 40, 'Estante C1', 85.00, 120.00, 'disponible'),
  (6, 'Manómetro de prueba', 1, 15, 'Estante C2', 120.00, 180.00, 'disponible'),
  (7, 'Agente limpio HFC-227ea (botella)', 1, 10, 'Bodega D', 450.00, 620.00, 'disponible'),
  (8, 'Válvula de control FM200', 1, 8, 'Bodega D', 320.00, 480.00, 'disponible'),
  (9, 'Formulario inspección NFPA', 1, 500, 'Oficina', 0.50, 2.00, 'disponible'),
  (10, 'Cinta métrica láser 50m', 1, 5, 'Herramientas', 180.00, 250.00, 'disponible'),
  (11, 'Lápiz plano contra incendios (set)', 1, 25, 'Oficina técnica', 35.00, 55.00, 'disponible'),
  (12, 'Plotter planos A0 (hora equipo)', 1, 1, 'Sala diseño', 0.00, 150.00, 'disponible'),
  (13, 'Caja embalaje reforzada', 1, 100, 'Despacho', 8.00, 15.00, 'disponible')
ON DUPLICATE KEY UPDATE
  nombre_objeto = VALUES(nombre_objeto),
  cantidad = VALUES(cantidad),
  precio_compra = VALUES(precio_compra),
  precio_comercial = VALUES(precio_comercial);

-- Objetos adicionales 14-25
INSERT INTO INVENTARIO (Id_Objeto, nombre_objeto, ID_Fabricante, cantidad, lugar_almacenaje, precio_compra, precio_comercial, estado)
VALUES
  (14, 'Llave para rociadores', 1, 30, 'Herramientas', 22.00, 35.00, 'disponible'),
  (15, 'Sello teflón industrial', 1, 200, 'Estante A3', 2.50, 4.00, 'disponible'),
  (16, 'Panel de alarma direccionable', 1, 6, 'Estante B3', 890.00, 1200.00, 'disponible'),
  (17, 'Módulo de control zona', 1, 12, 'Estante B3', 145.00, 210.00, 'disponible'),
  (18, 'Bomba de prueba hidrostática', 1, 4, 'Taller', 650.00, 900.00, 'disponible'),
  (19, 'Ranuradora de tubería', 1, 3, 'Taller', 420.00, 580.00, 'disponible'),
  (20, 'Panel contra incendio convencional', 1, 5, 'Estante B4', 520.00, 750.00, 'disponible'),
  (21, 'Bomba contra incendio 250 GPM', 1, 2, 'Patio', 2800.00, 3500.00, 'disponible'),
  (22, 'Kit capacitación SSOMA', 1, 20, 'Capacitación', 75.00, 110.00, 'disponible'),
  (23, 'Proyector + laptop capacitación', 1, 2, 'Capacitación', 950.00, 1200.00, 'disponible'),
  (24, 'Grupo electrógeno MP-55 (día alquiler ref.)', 1, 1, 'Patio', 0.00, 800.00, 'disponible'),
  (25, 'Abrazadera U 1" (pack 10)', 1, 50, 'Estante A2', 12.00, 18.00, 'disponible')
ON DUPLICATE KEY UPDATE
  nombre_objeto = VALUES(nombre_objeto),
  cantidad = VALUES(cantidad),
  precio_compra = VALUES(precio_compra);

-- Asegurar nombres de servicios 1-13 (opcional si ya existen)
INSERT INTO SERVICIO (ID_Servicio, nombre, Estado)
VALUES
  (1, 'Instalación de Sistema de Rociadores (Sprinklers)', 'Activo'),
  (2, 'Instalación de Sistema de Detección y Alarma', 'Activo'),
  (3, 'Mantenimiento de Extintores', 'Activo'),
  (4, 'Instalación de Sistema de Supresión con Agente Limpio', 'Activo'),
  (5, 'Inspección y Certificación de Sistemas Contra Incendios', 'Activo'),
  (6, 'Diseño de Planos Contra Incendios', 'Activo'),
  (7, 'Envios', 'Activo'),
  (8, 'Alquiler de Grupo Electrógeno MP-55', 'Activo'),
  (9, 'Alquiler de camiones', 'Activo'),
  (10, 'Servicio de Ranurado', 'Activo'),
  (11, 'Instalación de panel contra incendio', 'Activo'),
  (12, 'capacitacion de personal SSOMA', 'Activo'),
  (13, 'Instalación de bomba contra incendio', 'Activo')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Materiales requeridos por servicio (referencia; no descuenta taller hasta PROYECTO_INVENTARIO)
DELETE FROM SERVICIO_INVENTARIO_REQUERIDO WHERE ID_Servicio BETWEEN 1 AND 13;

INSERT INTO SERVICIO_INVENTARIO_REQUERIDO (ID_Servicio, Id_Objeto, cantidad, estancia) VALUES
  -- 1 Rociadores (materiales de taller)
  (1, 1, 25, 'para inventario'), (1, 2, 40, 'para inventario'), (1, 14, 2, 'para inventario'),
  (1, 15, 10, 'para inventario'), (1, 25, 8, 'para inventario'),
  -- 2 Detección y alarma
  (2, 3, 15, 'para inventario'), (2, 4, 100, 'para inventario'), (2, 16, 1, 'para inventario'),
  (2, 17, 2, 'para inventario'),
  -- 3 Mantenimiento extintores
  (3, 5, 8, 'para inventario'), (3, 6, 2, 'para inventario'), (3, 9, 5, 'para proyecto'),
  -- 4 Agente limpio
  (4, 7, 2, 'para inventario'), (4, 8, 2, 'para inventario'), (4, 6, 1, 'para inventario'),
  -- 5 Inspección y certificación
  (5, 9, 10, 'para proyecto'), (5, 10, 1, 'para inventario'), (5, 6, 1, 'para inventario'),
  (5, 18, 1, 'para inventario'),
  -- 6 Diseño planos (insumos de proyecto / oficina)
  (6, 11, 2, 'para proyecto'), (6, 12, 1, 'para proyecto'), (6, 9, 5, 'para proyecto'),
  -- 7 Envíos (sin materiales)
  -- 8 Grupo electrógeno
  (8, 24, 1, 'para proyecto'), (8, 15, 2, 'para inventario'),
  -- 9 Alquiler camiones (sin materiales de taller)
  -- 10 Ranurado
  (10, 19, 1, 'para inventario'), (10, 2, 15, 'para inventario'), (10, 14, 1, 'para inventario'),
  -- 11 Panel contra incendio
  (11, 20, 1, 'para inventario'), (11, 4, 30, 'para inventario'), (11, 17, 1, 'para inventario'),
  (11, 3, 4, 'para inventario'),
  -- 12 Capacitación SSOMA
  (12, 22, 15, 'para proyecto'), (12, 23, 1, 'para proyecto'), (12, 9, 3, 'para proyecto'),
  -- 13 Bomba contra incendio
  (13, 21, 1, 'para inventario'), (13, 2, 20, 'para inventario'), (13, 18, 1, 'para inventario'),
  (13, 15, 5, 'para inventario');
