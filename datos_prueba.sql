-- ============================================================
-- SWEFIRE DB - DATOS DE PRUEBA
-- Empresa de Ingeniería Contra Incendios - Perú
-- ============================================================

USE swefire_db;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- FABRICANTE
-- ============================================================
INSERT INTO FABRICANTE (nombre_comercial, ubicacion, rubro, descripcion, comentarios, pago) VALUES
('Amerex Corporation', 'Birmingham, Alabama, EEUU', 'Fabricación de extintores', 'Fabricante líder mundial de extintores portátiles y sistemas fijos contra incendios', 'Proveedor confiable desde 2015', 'Transferencia bancaria internacional'),
('Kidde Fire Systems', 'Mebane, Carolina del Norte, EEUU', 'Sistemas de supresión de incendios', 'Especialistas en sistemas de supresión con agentes limpios y CO2', 'Requiere pedido mínimo de $5000', 'Carta de crédito'),
('Hochiki Corporation', 'Tokio, Japón', 'Detección de incendios', 'Fabricante japonés de detectores de humo, calor y sistemas de alarma contra incendios', 'Excelente soporte técnico', 'Transferencia bancaria internacional'),
('Viking Group Inc.', 'Hastings, Michigan, EEUU', 'Rociadores contra incendios', 'Fabricante de rociadores sprinklers y componentes para sistemas de supresión', 'Distribuidor exclusivo en Sudamérica', 'Transferencia bancaria'),
('Ansul (Johnson Controls)', 'Marinette, Wisconsin, EEUU', 'Sistemas de supresión en cocinas', 'Líder en sistemas de supresión para cocinas industriales y áreas de riesgo especial', 'Proveedor oficial certificado NFPA', 'Transferencia bancaria internacional');

-- ============================================================
-- FABRICANTE_CONTACTO
-- ============================================================
INSERT INTO FABRICANTE_CONTACTO (ID_Fabricante, persona_contacto, correo_contacto, numero_contacto, anexo_contacto, area_contacto, idioma) VALUES
(1, 'James Whitfield', 'jwhitfield@amerex-fire.com', '+12058336000', '105', 'Ventas Internacionales', 'Inglés'),
(2, 'Sandra Morales', 'smorales@kidde.com', '+19192103400', '212', 'Soporte Técnico', 'Español'),
(3, 'Hiroshi Tanaka', 'h.tanaka@hochiki.co.jp', '+81335422285', '301', 'Exportaciones', 'Japonés'),
(4, 'Michael Torres', 'm.torres@vikingcorp.com', '+16162458521', '118', 'Ventas Latinoamérica', 'Inglés/Español'),
(5, 'Patricia Linares', 'p.linares@ansul.com', '+17154353400', '220', 'Ventas Internacionales', 'Español');

-- ============================================================
-- PERFIL
-- ============================================================
INSERT INTO PERFIL (DNI, Nombre, Apellido, Genero, RUC, fecha_nacimiento, correo_contacto, telefono_contacto, estado_civil, distrito_residencia, seguro_vida_ley, aficiones, experiencia, comentarios, estado, alergias, condicion_medica, profesion, nro_cta_bancaria, cv, foto_perfil) VALUES
('47823561', 'Carlos Alberto', 'Quispe Huanca', 'Masculino', NULL, '1985-03-14', 'cquispe@gmail.com', '987654321', 'Casado', 'Miraflores', 'si', 'Fútbol, senderismo', '12 años en instalación de sistemas contra incendios', 'Personal confiable y puntual', 'disponible', 'Polvo de drywall', NULL, 'Ingeniero de Seguridad', '19204567890123456789', '/archivos/cv/cquispe_cv.pdf', '/archivos/fotos/cquispe.jpg'),
('52341789', 'María Elena', 'Vargas Torres', 'Femenino', NULL, '1990-07-22', 'mvargas@hotmail.com', '976543210', 'Soltera', 'San Isidro', 'si', 'Lectura, yoga', '8 años en diseño de sistemas de detección', 'Excelente manejo de AutoCAD y REVIT', 'disponible', NULL, NULL, 'Ingeniera Civil', '19204098765432109876', '/archivos/cv/mvargas_cv.pdf', '/archivos/fotos/mvargas.jpg'),
('63452198', 'Luis Fernando', 'Mamani Condori', 'Masculino', NULL, '1988-11-05', 'lfmamani@gmail.com', '965432109', 'Casado', 'La Victoria', 'si', 'Ciclismo, pesca', '10 años como técnico instalador', 'Certificado NFPA 10 y NFPA 13', 'en trabajo', NULL, 'Hipertensión controlada', 'Técnico en Instalaciones', '19205678901234567890', '/archivos/cv/lfmamani_cv.pdf', '/archivos/fotos/lfmamani.jpg'),
('74561023', 'Ana Lucía', 'Flores Mendoza', 'Femenino', NULL, '1993-04-18', 'aflores@gmail.com', '954321098', 'Soltera', 'Surco', 'si', 'Pintura, natación', '5 años en gestión administrativa RRHH', 'Especialista en liquidaciones y contratos', 'disponible', 'Látex', NULL, 'Administradora de Empresas', '19206789012345678901', '/archivos/cv/aflores_cv.pdf', '/archivos/fotos/aflores.jpg'),
('85672134', 'Roberto Enrique', 'Sánchez Pizarro', 'Masculino', NULL, '1980-09-30', 'rsanchez@gmail.com', '943210987', 'Divorciado', 'Jesús María', 'si', 'Ajedrez, gym', '18 años como supervisor de obras contra incendios', 'Jefe de proyectos con experiencia en minería y petróleo', 'disponible', NULL, NULL, 'Ingeniero Mecánico', '19207890123456789012', '/archivos/cv/rsanchez_cv.pdf', '/archivos/fotos/rsanchez.jpg'),
('96783245', 'Jorge Antonio', 'Paredes Villanueva', 'Masculino', NULL, '1995-01-12', 'jparedes@gmail.com', '932109876', 'Soltero', 'Callao', 'si', 'Gaming, música', '4 años como chofer de unidad pesada', 'Brevete A-IIb vigente', 'disponible', NULL, NULL, 'Conductor Profesional', '19208901234567890123', '/archivos/cv/jparedes_cv.pdf', '/archivos/fotos/jparedes.jpg'),
('10894356', 'Patricia Isabel', 'Gutiérrez Ramos', 'Femenino', NULL, '1987-06-25', 'pgutierrez@gmail.com', '921098765', 'Casada', 'San Borja', 'si', 'Cocina, viajes', '15 años en ventas y atención a clientes corporativos', 'Manejo de CRM y cotizaciones', 'disponible', NULL, NULL, 'Ejecutiva Comercial', '19209012345678901234', '/archivos/cv/pgutierrez_cv.pdf', '/archivos/fotos/pgutierrez.jpg'),
('21905467', 'Diego Alejandro', 'Romero Castillo', 'Masculino', NULL, '1992-12-08', 'dromero@gmail.com', '910987654', 'Soltero', 'Lince', 'si', 'Fotografía, trekking', '7 años en mantenimiento de equipos contra incendios', 'Técnico certificado por INDECI', 'en trabajo', NULL, NULL, 'Técnico en Equipos de Seguridad', '19200123456789012345', '/archivos/cv/dromero_cv.pdf', '/archivos/fotos/dromero.jpg');

-- ============================================================
-- PERFIL_EDUCACION
-- ============================================================
INSERT INTO PERFIL_EDUCACION (DNI_perfil, nombre_educacion, nivel_educacion, institucion) VALUES
('47823561', 'Ingeniería de Seguridad Industrial', 'Superior Universitaria', 'Universidad Nacional de Ingeniería'),
('52341789', 'Ingeniería Civil', 'Superior Universitaria', 'Pontificia Universidad Católica del Perú'),
('63452198', 'Técnico en Instalaciones Eléctricas y Sanitarias', 'Superior Técnica', 'SENATI'),
('74561023', 'Administración de Empresas', 'Superior Universitaria', 'Universidad de Lima'),
('85672134', 'Ingeniería Mecánica', 'Superior Universitaria', 'Universidad Nacional de Ingeniería'),
('96783245', 'Secundaria Completa', 'Secundaria', 'I.E. República de Chile'),
('10894356', 'Marketing y Negocios Internacionales', 'Superior Universitaria', 'Universidad del Pacífico'),
('21905467', 'Técnico en Electrónica Industrial', 'Superior Técnica', 'Instituto CIBERTEC');

-- ============================================================
-- PERFIL_BREVETE
-- ============================================================
INSERT INTO PERFIL_BREVETE (DNI_perfil, categoria, pdf_brevete, fecha_vencimiento) VALUES
('63452198', 'A-IIa', '/archivos/brevetes/lfmamani_brevete.pdf', '2026-08-15'),
('96783245', 'A-IIb', '/archivos/brevetes/jparedes_brevete.pdf', '2027-03-20'),
('85672134', 'A-IIa', '/archivos/brevetes/rsanchez_brevete.pdf', '2025-11-30'),
('47823561', 'A-I', '/archivos/brevetes/cquispe_brevete.pdf', '2026-05-10');

-- ============================================================
-- PERFIL_CERTIFICACION
-- ============================================================
INSERT INTO PERFIL_CERTIFICACION (DNI_perfil, nombre, institucion, fecha_validez, foto) VALUES
('47823561', 'NFPA 10 - Extintores Portátiles', 'National Fire Protection Association', '2026-12-31', '/archivos/cert/cquispe_nfpa10.jpg'),
('47823561', 'NFPA 13 - Sistemas de Rociadores', 'National Fire Protection Association', '2026-12-31', '/archivos/cert/cquispe_nfpa13.jpg'),
('52341789', 'AutoCAD Certified Professional', 'Autodesk', '2025-09-30', '/archivos/cert/mvargas_autocad.jpg'),
('85672134', 'NFPA 25 - Inspección de Sistemas Hidráulicos', 'National Fire Protection Association', '2027-06-15', '/archivos/cert/rsanchez_nfpa25.jpg'),
('63452198', 'Trabajo en Altura', 'INDECI', '2025-07-20', '/archivos/cert/lfmamani_altura.jpg'),
('21905467', 'Mantenimiento de Equipos Contra Incendios', 'INDECI', '2026-03-10', '/archivos/cert/dromero_indeci.jpg');

-- ============================================================
-- USUARIO
-- ============================================================
INSERT INTO USUARIO (dni_perfil, rol, contrasena, correo) VALUES
('85672134', 'Gerente de Proyectos', '$2b$10$hashedpassword1', 'rsanchez@swefire.com'),
('52341789', 'Diseñadora', '$2b$10$hashedpassword2', 'mvargas@swefire.com'),
('47823561', 'Supervisor de Campo', '$2b$10$hashedpassword3', 'cquispe@swefire.com'),
('74561023', 'RRHH / Administración', '$2b$10$hashedpassword4', 'aflores@swefire.com'),
('10894356', 'Ejecutiva Comercial', '$2b$10$hashedpassword5', 'pgutierrez@swefire.com'),
('96783245', 'Conductor', '$2b$10$hashedpassword6', 'jparedes@swefire.com'),
('63452198', 'Técnico Instalador', '$2b$10$hashedpassword7', 'lfmamani@swefire.com'),
('21905467', 'Técnico Mantenimiento', '$2b$10$hashedpassword8', 'dromero@swefire.com');

-- ============================================================
-- CLIENTE
-- ============================================================
INSERT INTO CLIENTE (DNI_O_RUC, nombre_comercial, razon_social, rubro, ubicacion_facturacion, observacion) VALUES
('20501234567', 'Mall Aventura Plaza', 'Aventura Plaza S.A.', 'Centro Comercial', 'Av. Javier Prado Este 4200, San Borja, Lima', 'Cliente frecuente, pago a 30 días'),
('20512345678', 'Hotel Casa Andina', 'Inversiones La Rioja S.A.', 'Hotelería', 'Av. La Paz 463, Miraflores, Lima', 'Requiere facturación mensual consolidada'),
('20523456789', 'Minera Antamina', 'Compañía Minera Antamina S.A.', 'Minería', 'Av. El Derby 254, Surco, Lima', 'Proyecto de gran envergadura, requiere certificación NFPA'),
('20534567890', 'Clínica Internacional', 'Clínica Internacional S.A.', 'Salud', 'Jr. Washington 1471, Lima Centro', 'Normas NFPA 101 obligatorias, cliente prioritario'),
('20545678901', 'Supermercados Wong', 'E. Wong S.A.', 'Retail / Supermercados', 'Av. Benavides 3400, Miraflores, Lima', 'Múltiples sedes, contrato anual de mantenimiento');

-- ============================================================
-- CLIENTE_CONTACTO
-- ============================================================
INSERT INTO CLIENTE_CONTACTO (DNI_O_RUC, DNI_perfil, cargo_en_empresa, lugar_trabajo) VALUES
('20501234567', NULL, 'Jefe de Seguridad', 'Mall Aventura Plaza - San Borja'),
('20512345678', NULL, 'Gerente de Operaciones', 'Hotel Casa Andina - Miraflores'),
('20523456789', NULL, 'Gerente de Seguridad y Medio Ambiente', 'Oficinas Lima - Surco'),
('20534567890', NULL, 'Director de Infraestructura', 'Clínica Internacional - Lima Centro'),
('20545678901', NULL, 'Coordinador de Mantenimiento Nacional', 'Sede Central - Miraflores');

-- ============================================================
-- CLIENTE_TELEFONO_MOVIL
-- ============================================================
INSERT INTO CLIENTE_TELEFONO_MOVIL (DNI_O_RUC, telefono, persona) VALUES
('20501234567', '987001122', 'Marco Delgado'),
('20512345678', '976002233', 'Sofía Reátegui'),
('20523456789', '965003344', 'Alejandro Bustamante'),
('20534567890', '954004455', 'Carmen Herrera'),
('20545678901', '943005566', 'Fernando Alvarado');

-- ============================================================
-- CLIENTE_CORREO
-- ============================================================
INSERT INTO CLIENTE_CORREO (DNI_O_RUC, correo, rama) VALUES
('20501234567', 'seguridad@aventuraplaza.com.pe', 'Seguridad'),
('20501234567', 'administracion@aventuraplaza.com.pe', 'Administración'),
('20512345678', 'operaciones@casaandina.com', 'Operaciones'),
('20523456789', 'ssoma@antamina.com', 'SSOMA'),
('20534567890', 'infraestructura@clinicainternacional.com.pe', 'Infraestructura'),
('20545678901', 'mantenimiento@wong.com.pe', 'Mantenimiento');

-- ============================================================
-- CLIENTE_TELEFONO_FIJO
-- ============================================================
INSERT INTO CLIENTE_TELEFONO_FIJO (DNI_O_RUC, numero, anexo, descripcion_anexo) VALUES
('20501234567', '016123400', '201', 'Gerencia de Seguridad'),
('20512345678', '014455600', '310', 'Operaciones'),
('20523456789', '012233400', '405', 'SSOMA Lima'),
('20534567890', '013345600', '102', 'Infraestructura y Mantenimiento'),
('20545678901', '014456700', '220', 'Mantenimiento Nacional');

-- ============================================================
-- INVENTARIO
-- ============================================================
INSERT INTO INVENTARIO (lugar_almacenaje, cantidad, nombre_objeto, ID_Fabricante, orden_compra, fecha_compra, garantia, numero_serial, ano_fabricacion, peso, estado, precio_compra, precio_envio, responsable_envio, precio_comercial, mant_requerimiento, mant_ultimo, mant_fecha_caducidad, mant_responsable, mant_contacto) VALUES
('Almacén Principal - Estante A1', 25, 'Extintor PQS 6kg ABC', 1, 'OC-2024-001', '2024-01-15', '2 años', 'AMX-PQS-001-2024', 2024, 6.50, 'disponible', 85.00, 15.00, 'DHL Express', 180.00, 'no', NULL, '2026-01-15', NULL, NULL),
('Almacén Principal - Estante A2', 10, 'Extintor CO2 5kg', 1, 'OC-2024-001', '2024-01-15', '2 años', 'AMX-CO2-002-2024', 2024, 14.00, 'disponible', 220.00, 20.00, 'DHL Express', 450.00, 'no', NULL, '2026-01-15', NULL, NULL),
('Almacén Principal - Estante B1', 50, 'Detector de Humo Iónico', 3, 'OC-2024-002', '2024-02-10', '3 años', 'HCK-DHI-001-2024', 2024, 0.35, 'disponible', 65.00, 5.00, 'FedEx', 130.00, 'no', NULL, '2027-02-10', NULL, NULL),
('Almacén Principal - Estante B2', 30, 'Detector de Calor Termovelocimétrico', 3, 'OC-2024-002', '2024-02-10', '3 años', 'HCK-DCT-002-2024', 2024, 0.28, 'disponible', 72.00, 5.00, 'FedEx', 145.00, 'no', NULL, '2027-02-10', NULL, NULL),
('Almacén Principal - Estante C1', 15, 'Rociador Sprinkler Colgante 68°C K=5.6', 4, 'OC-2024-003', '2024-03-05', '5 años', 'VKG-ROC-001-2024', 2024, 0.18, 'disponible', 18.00, 2.00, 'Cargo Express', 38.00, 'no', NULL, '2029-03-05', NULL, NULL),
('Almacén Secundario - Estante D1', 5, 'Central de Alarma Contra Incendios 8 Zonas', 3, 'OC-2024-004', '2024-03-20', '2 años', 'HCK-CAL-001-2024', 2024, 4.20, 'disponible', 850.00, 45.00, 'DHL Express', 1800.00, 'si', '2025-03-20', '2026-03-20', 'Diego Romero', '921098765'),
('Almacén Secundario - Estante D2', 8, 'Panel de Supresión Agente Limpio FM-200', 2, 'OC-2024-005', '2024-04-01', '2 años', 'KDD-SUP-001-2024', 2024, 12.50, 'disponible', 2200.00, 80.00, 'Cargo Express', 4500.00, 'si', '2025-04-01', '2026-04-01', 'Diego Romero', '921098765'),
('Almacén Principal - Estante E1', 100, 'Manguera Contra Incendios 45mm x 15m', 4, 'OC-2024-006', '2024-04-15', '1 año', 'VKG-MAN-001-2024', 2024, 3.80, 'disponible', 95.00, 8.00, 'Olva Courier', 190.00, 'si', '2025-01-10', '2026-01-10', 'Carlos Quispe', '987654321'),
('Almacén Secundario - Estante F1', 12, 'Gabinete Contra Incendios 90x60x25cm', 4, 'OC-2023-010', '2023-11-20', '2 años', 'VKG-GAB-001-2023', 2023, 18.00, 'disponible', 320.00, 30.00, 'Cargo Express', 650.00, 'no', NULL, '2025-11-20', NULL, NULL),
('Almacén Principal - Estante A3', 3, 'Extintor sobre Ruedas PQS 50kg', 1, 'OC-2023-008', '2023-09-12', '2 años', 'AMX-PQS-050-2023', 2023, 68.00, 'disponible', 580.00, 60.00, 'Cargo Express', 1200.00, 'si', '2025-02-15', '2026-02-15', 'Diego Romero', '921098765');

-- ============================================================
-- INVENTARIO_USO
-- ============================================================
INSERT INTO INVENTARIO_USO (Id_Objeto, uso) VALUES
(1, 'venta'), (1, 'alquiler'),
(2, 'venta'), (2, 'alquiler'),
(3, 'venta'), (3, 'uso en proyectos'),
(4, 'venta'), (4, 'uso en proyectos'),
(5, 'venta'), (5, 'uso en proyectos'),
(6, 'venta'), (6, 'uso en proyectos'),
(7, 'venta'),
(8, 'venta'), (8, 'alquiler'), (8, 'uso en proyectos'),
(9, 'venta'), (9, 'alquiler'),
(10, 'venta'), (10, 'alquiler');

-- ============================================================
-- CAMION
-- ============================================================
INSERT INTO CAMION (Placa, nombre, ano_fabricacion, modelo, color, caracteristicas, revision_tecnica, fecha_prox_revision, ID_Fabricante, tarjeta_propiedad, vencimiento_tarjeta, soat_n_poliza, soat_empresa, soat_precio, soat_dia_pago) VALUES
('ABC-123', 'Unidad 01 - Operaciones', 2019, 'Hyundai HD78', 'Blanco con rojo', 'Carrocería tipo furgón, capacidad 3.5 ton, equipado con sistema hidráulico trasero', '/archivos/camiones/abc123_revision.pdf', '2026-06-15', NULL, '/archivos/camiones/abc123_tarjeta.pdf', '2027-01-10', 'SOA-2025-441122', 'Mapfre Perú', 1850.00, '2025-06-01'),
('DEF-456', 'Unidad 02 - Logística', 2021, 'Toyota Hilux Cabina Doble 4x4', 'Blanco', 'Pickup 4x4, capacidad 1 ton, ideal para zonas de difícil acceso y minería', '/archivos/camiones/def456_revision.pdf', '2026-08-20', NULL, '/archivos/camiones/def456_tarjeta.pdf', '2028-03-15', 'SOA-2025-552233', 'Rímac Seguros', 1200.00, '2025-08-01'),
('GHI-789', 'Unidad 03 - Proyectos Grandes', 2018, 'Mercedes-Benz Atego 1726', 'Blanco con azul', 'Camión de 7 ton, plataforma con grúa hidráulica de 3 ton, ideal para tuberías y equipos pesados', '/archivos/camiones/ghi789_revision.pdf', '2026-04-30', NULL, '/archivos/camiones/ghi789_tarjeta.pdf', '2026-09-22', 'SOA-2025-663344', 'La Positiva Seguros', 2400.00, '2025-04-01');

-- ============================================================
-- CAMION_MANTENIMIENTO
-- ============================================================
INSERT INTO CAMION_MANTENIMIENTO (Placa, fecha_ultimo_mant, responsable, razon, contacto_responsable, pdf_mantenimiento) VALUES
('ABC-123', '2025-01-10', 'Taller Automotriz Los Andes', 'Cambio de aceite, filtros y revisión de frenos', '014445566', '/archivos/mantenimiento/abc123_mant01.pdf'),
('DEF-456', '2025-02-20', 'Toyota Service Center', 'Mantenimiento de 30,000 km - cambio de aceite y filtros', '014556677', '/archivos/mantenimiento/def456_mant01.pdf'),
('GHI-789', '2024-11-05', 'Taller Automotriz Los Andes', 'Revisión de sistema hidráulico de grúa y cambio de aceite', '014445566', '/archivos/mantenimiento/ghi789_mant01.pdf');

-- ============================================================
-- CAMION_INVENTARIO
-- ============================================================
INSERT INTO CAMION_INVENTARIO (Placa, Id_Objeto, cantidad_requerida, cantidad_actual, ubicacion_en_camion, requerido_legal) VALUES
('ABC-123', 1, 2, 2, 'Compartimento lateral derecho', 'si'),
('ABC-123', 8, 4, 4, 'Compartimento trasero', 'si'),
('DEF-456', 1, 1, 1, 'Maletero trasero', 'si'),
('GHI-789', 1, 2, 2, 'Compartimento lateral izquierdo', 'si'),
('GHI-789', 8, 6, 5, 'Plataforma trasera asegurada', 'si');

-- ============================================================
-- SERVICIO
-- ============================================================
INSERT INTO SERVICIO (nombre, descripcion, precio_regular, condicional_precio, observaciones) VALUES
('Instalación de Sistema de Rociadores (Sprinklers)', 'Diseño e instalación de sistemas de rociadores automáticos según NFPA 13. Incluye tuberías, accesorios y prueba hidrostática.', 85.00, 'Precio por m2. Descuento del 10% en proyectos mayores a 500 m2', 'Requiere planos aprobados por INDECI'),
('Instalación de Sistema de Detección y Alarma', 'Instalación de detectores de humo, calor, sirenas, luces estroboscópicas y central de alarma. Según NFPA 72.', 55.00, 'Precio por punto de detección. Cableado incluido.', 'Incluye certificado de instalación'),
('Mantenimiento de Extintores', 'Servicio de recarga, prueba hidrostática y mantenimiento preventivo de extintores según NFPA 10.', 35.00, 'Precio por unidad. Descuento del 15% para flotas mayores a 20 unidades', 'Incluye etiqueta de certificación INDECI'),
('Instalación de Sistema de Supresión con Agente Limpio', 'Diseño e instalación de sistemas de supresión con FM-200 o Novec 1230 para salas de servidores y cuartos eléctricos.', 320.00, 'Precio por m3 protegido. Incluye agente extintor.', 'Requiere cálculo de densidad de aplicación según NFPA 2001'),
('Inspección y Certificación de Sistemas Contra Incendios', 'Inspección técnica de sistemas existentes, emisión de informe y certificado para trámites ante INDECI y bomberos.', 1500.00, 'Precio fijo por instalación/planta. Precio adicional para sedes fuera de Lima.', 'Informe con validez de 1 año'),
('Diseño de Planos Contra Incendios', 'Elaboración de planos de instalaciones contra incendios para expediente ante INDECI, municipalidades y bomberos.', 2500.00, 'Precio por proyecto. Incluye memoria descriptiva y especificaciones técnicas.', 'Plazo estimado: 15 días útiles');

-- ============================================================
-- SERVICIO_PERSONAL_REQUERIDO
-- ============================================================
INSERT INTO SERVICIO_PERSONAL_REQUERIDO (ID_Servicio, profesion, cantidad, disponibilidad, requerimiento_legal) VALUES
(1, 'Ingeniero de Seguridad', 1, 'Lunes a Sábado', 'Colegiado CIP'),
(1, 'Técnico Instalador', 2, 'Lunes a Sábado', 'Certificación NFPA 13'),
(2, 'Ingeniero Electrónico', 1, 'Lunes a Sábado', 'Colegiado CIP'),
(2, 'Técnico en Electrónica', 1, 'Lunes a Sábado', 'Certificación NFPA 72'),
(3, 'Técnico en Equipos de Seguridad', 1, 'Lunes a Sábado', 'Certificación INDECI'),
(4, 'Ingeniero de Seguridad', 1, 'Lunes a Sábado', 'Colegiado CIP y Certificación NFPA 2001'),
(4, 'Técnico Instalador', 2, 'Lunes a Sábado', 'Certificación NFPA 2001'),
(5, 'Ingeniero de Seguridad', 1, 'Lunes a Viernes', 'Colegiado CIP y habilitación INDECI'),
(6, 'Ingeniero Civil o de Seguridad', 1, 'Lunes a Viernes', 'Colegiado CIP');

-- ============================================================
-- SOLICITUD
-- ============================================================
INSERT INTO SOLICITUD (Id_Cliente, descripcion, ubicacion) VALUES
('20501234567', 'Solicitud de instalación de sistema de rociadores y detección para nueva zona de expansión del mall, área aproximada 800 m2', 'Av. Javier Prado Este 4200, San Borja, Lima'),
('20534567890', 'Mantenimiento anual de extintores en todas las áreas de la clínica (35 unidades) e inspección general del sistema de alarma', 'Jr. Washington 1471, Lima Centro'),
('20523456789', 'Diseño e instalación de sistema de supresión con agente limpio para sala de servidores en oficinas Lima, volumen aprox 45 m3', 'Av. El Derby 254, Surco, Lima'),
('20545678901', 'Inspección y certificación de sistemas contra incendios en 3 tiendas de Lima para renovación de licencia municipal', 'Sedes: Miraflores, San Borja y La Molina'),
('20512345678', 'Elaboración de planos contra incendios para expediente INDECI del nuevo piso de habitaciones (pisos 8 al 12)', 'Av. La Paz 463, Miraflores, Lima');

-- ============================================================
-- SOLICITUD_MEDIO_COMUNICACION
-- ============================================================
INSERT INTO SOLICITUD_MEDIO_COMUNICACION (ID_Solicitud, cliente_email, cliente_telefono) VALUES
(1, 'seguridad@aventuraplaza.com.pe', '987001122'),
(2, 'infraestructura@clinicainternacional.com.pe', '954004455'),
(3, 'ssoma@antamina.com', '965003344'),
(4, 'mantenimiento@wong.com.pe', '943005566'),
(5, 'operaciones@casaandina.com', '976002233');

-- ============================================================
-- SOLICITUD_SERVICIO
-- ============================================================
INSERT INTO SOLICITUD_SERVICIO (ID_Solicitud, ID_Servicio, fecha_servicio, horario_servicio) VALUES
(1, 1, '2025-05-10', '08:00 - 17:00'),
(1, 2, '2025-05-10', '08:00 - 17:00'),
(2, 3, '2025-04-15', '09:00 - 13:00'),
(2, 5, '2025-04-15', '09:00 - 13:00'),
(3, 4, '2025-06-01', '08:00 - 17:00'),
(4, 5, '2025-04-20', '09:00 - 17:00'),
(5, 6, '2025-05-05', '09:00 - 17:00');

-- ============================================================
-- SOLICITUD_INVENTARIO
-- ============================================================
INSERT INTO SOLICITUD_INVENTARIO (ID_Solicitud, ID_Inventario, cantidad, intencion, dias_alquilados) VALUES
(1, 5, 120, 'comprar', NULL),
(1, 3, 40, 'comprar', NULL),
(1, 8, 10, 'comprar', NULL),
(2, 1, 35, 'comprar', NULL),
(3, 7, 1, 'comprar', NULL),
(4, 6, 3, 'alquilar', 3);

-- ============================================================
-- COTIZACION_COMERCIAL
-- ============================================================
INSERT INTO COTIZACION_COMERCIAL (version, nombre, id_solicitud, DNI_O_RUC, precio_total, estado, comentario_cliente) VALUES
(1, 'COT-2025-001 - Mall Aventura Plaza - Rociadores y Detección', 1, '20501234567', 98500.00, 'aprobado', 'Aprobado por gerencia. Solicitan inicio en mayo 2025.'),
(1, 'COT-2025-002 - Clínica Internacional - Mantenimiento Extintores', 2, '20534567890', 4250.00, 'aprobado', 'Aceptado. Prefieren servicio un sábado por la mañana.'),
(1, 'COT-2025-003 - Antamina - Supresión Agente Limpio', 3, '20523456789', 18500.00, 'aprobado', 'Aprobado con cargo a presupuesto SSOMA Q2 2025.'),
(1, 'COT-2025-004 - Wong - Inspección 3 Tiendas', 4, '20545678901', 5800.00, 'rechazado por cliente', 'Indican que el precio está por encima de su presupuesto. Solicitan nueva propuesta.'),
(2, 'COT-2025-004v2 - Wong - Inspección 3 Tiendas (Revisada)', 4, '20545678901', 4900.00, 'aprobado', 'Segunda versión aceptada con descuento negociado.'),
(1, 'COT-2025-005 - Casa Andina - Diseño de Planos', 5, '20512345678', 3200.00, 'aprobado', 'OK, requieren entrega en 20 días útiles.');

-- ============================================================
-- COTIZACION_SERVICIO
-- ============================================================
INSERT INTO COTIZACION_SERVICIO (ID_Cotizacion, ID_Servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial) VALUES
(1, 1, '2025-05-10', '2025-06-20', '8 horas diarias, L-S', 82000.00),
(1, 2, '2025-06-01', '2025-06-25', '8 horas diarias, L-S', 16500.00),
(2, 3, '2025-04-19', '2025-04-19', '4 horas, sábado', 3500.00),
(2, 5, '2025-04-19', '2025-04-19', '4 horas, sábado', 750.00),
(3, 4, '2025-06-05', '2025-06-15', '8 horas diarias, L-V', 18500.00),
(5, 5, '2025-04-25', '2025-04-27', '8 horas diarias', 4900.00),
(6, 6, '2025-05-08', '2025-05-30', '8 horas diarias, L-V', 3200.00);

-- ============================================================
-- COTIZACION_CAMION
-- ============================================================
INSERT INTO COTIZACION_CAMION (ID_Cotizacion, Placa, uso, fecha_hora_entrada, fecha_hora_salida, ID_Piloto) VALUES
(1, 'ABC-123', 'Transporte de materiales y equipos', '2025-05-10 07:00:00', '2025-06-20 18:00:00', 6),
(1, 'GHI-789', 'Transporte de tubería y equipos pesados', '2025-05-10 07:00:00', '2025-06-20 18:00:00', 6),
(3, 'DEF-456', 'Transporte de equipos de supresión', '2025-06-05 07:00:00', '2025-06-15 18:00:00', 6),
(5, 'ABC-123', 'Transporte de equipos de inspección', '2025-04-25 07:00:00', '2025-04-27 18:00:00', 6);

-- ============================================================
-- COTIZACION_INVENTARIO
-- ============================================================
INSERT INTO COTIZACION_INVENTARIO (ID_Cotizacion, ID_Inventario, cantidad, intencion, dias_alquilados, precio_comercial) VALUES
(1, 5, 120, 'comprar', NULL, 4560.00),
(1, 3, 40, 'comprar', NULL, 5200.00),
(1, 8, 10, 'comprar', NULL, 1900.00),
(2, 1, 35, 'comprar', NULL, 6300.00),
(3, 7, 1, 'comprar', NULL, 4500.00),
(5, 6, 3, 'alquilar', 3, 450.00);

-- ============================================================
-- COTIZACION_PERSONAL
-- ============================================================
INSERT INTO COTIZACION_PERSONAL (ID_Cotizacion, ID_Usuario, rol_en_trabajo, fecha_entrada, fecha_salida, dias_trabajados) VALUES
(1, 1, 'Supervisor de Proyecto', '2025-05-10', '2025-06-20', 35),
(1, 3, 'Supervisor de Campo', '2025-05-10', '2025-06-20', 35),
(1, 7, 'Técnico Instalador', '2025-05-10', '2025-06-20', 35),
(2, 3, 'Supervisor de Campo', '2025-04-19', '2025-04-19', 1),
(2, 8, 'Técnico de Mantenimiento', '2025-04-19', '2025-04-19', 1),
(3, 1, 'Supervisor de Proyecto', '2025-06-05', '2025-06-15', 9),
(3, 7, 'Técnico Instalador', '2025-06-05', '2025-06-15', 9),
(6, 2, 'Diseñadora a Cargo', '2025-05-08', '2025-05-30', 17);

-- ============================================================
-- PRESUPUESTO_INTERNO
-- ============================================================
INSERT INTO PRESUPUESTO_INTERNO (ID_Cotizacion, costos_indirectos, coste_total_estimado) VALUES
(1, 4500.00, 71000.00),
(2, 200.00, 2800.00),
(3, 800.00, 12000.00),
(5, 300.00, 3500.00),
(6, 150.00, 2200.00);

INSERT INTO PRESUPUESTO_MATERIAL_DIRECTO (ID_Presupuesto, nombre, costo) VALUES
(1, 'Rociadores sprinkler colgante 68°C x120', 2160.00),
(1, 'Tubería negra SCH40 1" x 200m', 4800.00),
(1, 'Detectores de humo x40', 2600.00),
(1, 'Gabinetes contra incendios x5', 2500.00),
(2, 'Extintores PQS 6kg x35 (recarga)', 1750.00),
(3, 'Panel de supresión FM-200', 2200.00),
(3, 'Agente FM-200 45kg', 3600.00),
(5, 'Materiales de inspección (placas, bridas)', 350.00);

INSERT INTO PRESUPUESTO_MANO_OBRA (ID_Presupuesto, profesion_ejercida, costo_x_hora, costo_general) VALUES
(1, 'Supervisor de Proyecto', 45.00, 12600.00),
(1, 'Supervisor de Campo', 35.00, 9800.00),
(1, 'Técnico Instalador', 25.00, 7000.00),
(2, 'Supervisor de Campo', 35.00, 280.00),
(2, 'Técnico de Mantenimiento', 25.00, 200.00),
(3, 'Supervisor de Proyecto', 45.00, 3240.00),
(3, 'Técnico Instalador', 25.00, 1800.00);

INSERT INTO PRESUPUESTO_SERVICIO (ID_Presupuesto, nombre_servicio, costo) VALUES
(1, 'Prueba hidrostática sistema sprinklers', 1500.00),
(1, 'Certificación final INDECI', 800.00),
(3, 'Prueba de descarga sistema FM-200', 600.00),
(5, 'Emisión de certificados por sede', 450.00);

INSERT INTO PRESUPUESTO_GASTO_ADMIN (ID_Presupuesto, nombre_gasto, costo) VALUES
(1, 'Transporte y combustible unidades', 3200.00),
(1, 'Viáticos personal de campo', 1400.00),
(2, 'Transporte y combustible', 180.00),
(3, 'Transporte y combustible', 600.00),
(5, 'Transporte y viáticos 3 sedes', 850.00),
(6, 'Software AutoCAD licencia mensual', 320.00);

-- ============================================================
-- PROYECTO
-- ============================================================
INSERT INTO PROYECTO (descripcion_servicio, Id_Cliente, ubicacion, id_cotizacion, orden_servicio, informe_final, factura, fecha_inicio, fecha_fin, observaciones, estado) VALUES
('Instalación de sistema de rociadores NFPA 13 y sistema de detección NFPA 72 en zona de expansión - 800 m2', '20501234567', 'Av. Javier Prado Este 4200, San Borja, Lima', 1, '/archivos/proyectos/proy001_os.pdf', NULL, NULL, '2025-05-10', '2025-06-20', 'Coordinación con administración del mall para acceso fuera de horario comercial', 'En Ejecución'),
('Mantenimiento de extintores e inspección de sistema de alarma en clínica', '20534567890', 'Jr. Washington 1471, Lima Centro', 2, '/archivos/proyectos/proy002_os.pdf', '/archivos/proyectos/proy002_informe.pdf', '/archivos/proyectos/proy002_factura.pdf', '2025-04-19', '2025-04-19', 'Servicio completado en turno mañana. Sin observaciones.', 'Completado'),
('Instalación de sistema de supresión con agente limpio FM-200 en sala de servidores', '20523456789', 'Av. El Derby 254, Surco, Lima', 3, '/archivos/proyectos/proy003_os.pdf', NULL, NULL, '2025-06-05', '2025-06-15', 'Coordinar con TI para ventana de mantenimiento nocturna', 'Pendiente'),
('Inspección y certificación de 3 tiendas para renovación de licencia municipal', '20545678901', 'Sedes Miraflores, San Borja y La Molina', 5, '/archivos/proyectos/proy004_os.pdf', '/archivos/proyectos/proy004_informe.pdf', '/archivos/proyectos/proy004_factura.pdf', '2025-04-25', '2025-04-27', 'Las 3 sedes aprobaron inspección. Certificados emitidos.', 'Completado'),
('Diseño de planos contra incendios para pisos 8 al 12 de hotel', '20512345678', 'Av. La Paz 463, Miraflores, Lima', 6, '/archivos/proyectos/proy005_os.pdf', NULL, NULL, '2025-05-08', '2025-05-30', 'Entrega de planos en formato dwg y pdf firmado por ingeniero colegiado', 'En Ejecución');

-- ============================================================
-- PROYECTO_CAMION
-- ============================================================
INSERT INTO PROYECTO_CAMION (id_Proyecto, Placa, personal_manejando, fecha_hora_entrada, fecha_hora_salida) VALUES
(1, 'ABC-123', 6, '2025-05-10 07:00:00', NULL),
(1, 'GHI-789', 6, '2025-05-10 07:00:00', NULL),
(2, 'DEF-456', 6, '2025-04-19 08:00:00', '2025-04-19 13:00:00'),
(4, 'ABC-123', 6, '2025-04-25 07:30:00', '2025-04-27 18:00:00');

-- ============================================================
-- PROYECTO_INVENTARIO
-- ============================================================
INSERT INTO PROYECTO_INVENTARIO (id_Proyecto, Id_Objeto, cantidad_objeto, estado_post, fecha_salida, fecha_retorno, metodo_traslado) VALUES
(1, 5, 80, 'aceptable', '2025-05-10', NULL, 'Unidad 03 GHI-789'),
(1, 3, 40, 'aceptable', '2025-05-10', NULL, 'Unidad 01 ABC-123'),
(2, 1, 35, 'aceptable', '2025-04-19', '2025-04-19', 'Unidad 02 DEF-456'),
(4, 6, 3, 'aceptable', '2025-04-25', '2025-04-27', 'Unidad 01 ABC-123');

-- ============================================================
-- TRABAJO
-- ============================================================
INSERT INTO TRABAJO (Id_Proyecto, fecha, horario, asistencia, comentario) VALUES
(1, '2025-05-10', '07:00 - 17:00', 'Completa', 'Inicio de obra. Descarga de materiales y replanteo en campo.'),
(2, '2025-04-19', '08:00 - 13:00', 'Completa', 'Servicio realizado sin incidencias. Todos los extintores recargados y etiquetados.'),
(4, '2025-04-25', '07:30 - 18:00', 'Completa', 'Inspección sede Miraflores completada.'),
(4, '2025-04-26', '07:30 - 18:00', 'Completa', 'Inspección sede San Borja completada.'),
(4, '2025-04-27', '07:30 - 18:00', 'Completa', 'Inspección sede La Molina completada. Proyecto finalizado.');

-- ============================================================
-- TRABAJO_JORNADA
-- ============================================================
INSERT INTO TRABAJO_JORNADA (Id_trabajo, DNI_Trabajador, dia, horario_entrada, horario_salida) VALUES
(1, '85672134', '2025-05-10', '07:00:00', '17:00:00'),
(1, '47823561', '2025-05-10', '07:00:00', '17:00:00'),
(1, '63452198', '2025-05-10', '07:00:00', '17:00:00'),
(2, '47823561', '2025-04-19', '08:00:00', '13:00:00'),
(2, '21905467', '2025-04-19', '08:00:00', '13:00:00'),
(3, '47823561', '2025-04-25', '07:30:00', '18:00:00'),
(4, '47823561', '2025-04-26', '07:30:00', '18:00:00'),
(5, '47823561', '2025-04-27', '07:30:00', '18:00:00');

-- ============================================================
-- TRABAJO_RRHH
-- ============================================================
INSERT INTO TRABAJO_RRHH (Id_trabajo, DNI_Trabajador, estado_pago) VALUES
(1, '85672134', 'no pagar aun'),
(1, '47823561', 'no pagar aun'),
(1, '63452198', 'no pagar aun'),
(2, '47823561', 'completado'),
(2, '21905467', 'completado'),
(3, '47823561', 'completado'),
(4, '47823561', 'completado'),
(5, '47823561', 'completado');

INSERT INTO INCIDENCIA 
(id_proyecto, empresa_involucrada, cotizacion_remuneracion, comentario, estado)
VALUES
(1, NULL, NULL, 'Falla en equipo durante instalación', 'abierto'),
(2, NULL, NULL, 'Pérdida de herramientas en obra', 'en proceso'),
(3, NULL, NULL, 'Robo de unidad en traslado', 'abierto'),
(4, NULL, NULL, 'Problema técnico en sistema', 'cerrado'),
(5, NULL, NULL, 'Falta de mantenimiento', 'pendiente'),
(6, NULL, NULL, 'Incidencia general sin detalle', 'abierto');

INSERT INTO INVOLUCRADO
(dni_involucrado, id_trabajo, id_incidencia, version_de_hechos, comentario)
VALUES
-- Incidencia 1
('85672134', 1, 21, 'Equipo ya presentaba fallas', 'Revisar mantenimiento'),
('63452198', 2, 21, 'Uso inadecuado del equipo', 'Capacitar personal'),

-- Incidencia 2
('21905467', 3, 22, 'No se reportó a tiempo', 'Falla operativa'),

-- Incidencia 3
('96783245', 4, 23, 'Robo durante traslado', 'Zona peligrosa'),

-- Incidencia 4
('47823561', 2, 24, 'Sistema falló inesperadamente', 'Revisar proveedor'),
('74561023', 5, 24, 'Falta de supervisión', 'Error administrativo'),

-- Incidencia 5
('10894356', 1, 25, 'Equipos sin revisión', 'Falta control'),

-- Incidencia 6
('52341789', 6, 25, 'Incidencia menor', 'Sin impacto grave');


INSERT INTO INCIDENCIA_OBJETOS
(id_incidencia, id_proyecto_inventario, id_proyecto_camion,
 ocurrencia_inventario, ocurrencia_camion,
 fecha_perdida, cantidad, ultima_ubicacion, comentario, precio_remunerar)
VALUES
-- Incidencia 1
(21, 1, NULL, 'averia', NULL, '2026-04-10 10:00:00', 2, 'Almacén', 'Extintor dañado', 200.00),
(21, 2, NULL, 'perdida', NULL, '2026-04-11 11:00:00', 1, 'Obra', 'Manguera perdida', 80.00),

-- Incidencia 2
(22, 3, NULL, 'robo', NULL, '2026-04-12 12:00:00', 3, 'Callao', 'Herramientas robadas', 500.00),

-- Incidencia 3
(23, NULL, 1, NULL, 'robo', '2026-04-13 20:00:00', 1, 'Ruta Lima', 'Camión robado', 25000.00),

-- Incidencia 4
(24, 4, NULL, 'averia', NULL, '2026-04-14 09:00:00', 2, 'Taller', 'Falla técnica', 300.00),
(24, NULL, 2, NULL, 'averia', '2026-04-14 10:00:00', 1, 'Taller', 'Camión con fallas', 1200.00),

-- Incidencia 5
(25, 1, NULL, 'por mantener', NULL, '2026-04-15 08:00:00', 5, 'Almacén', 'Equipos sin mantenimiento', 0.00),

-- Incidencia 6
(22, NULL, 3, NULL, 'ninguna', '2026-04-16 07:00:00', 1, 'Sin ubicación', 'Caso general', 50.00);

-- Actualizar FK de PROYECTO a TRABAJO
UPDATE PROYECTO SET ID_Trabajo = 1 WHERE id_Proyecto = 1;
UPDATE PROYECTO SET ID_Trabajo = 2 WHERE id_Proyecto = 2;
UPDATE PROYECTO SET ID_Trabajo = 5 WHERE id_Proyecto = 4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VERIFICACION FINAL
-- ============================================================
SELECT 'FABRICANTE' as Tabla, COUNT(*) as Registros FROM FABRICANTE
UNION ALL SELECT 'PERFIL', COUNT(*) FROM PERFIL
UNION ALL SELECT 'USUARIO', COUNT(*) FROM USUARIO
UNION ALL SELECT 'CLIENTE', COUNT(*) FROM CLIENTE
UNION ALL SELECT 'INVENTARIO', COUNT(*) FROM INVENTARIO
UNION ALL SELECT 'CAMION', COUNT(*) FROM CAMION
UNION ALL SELECT 'SERVICIO', COUNT(*) FROM SERVICIO
UNION ALL SELECT 'SOLICITUD', COUNT(*) FROM SOLICITUD
UNION ALL SELECT 'COTIZACION_COMERCIAL', COUNT(*) FROM COTIZACION_COMERCIAL
UNION ALL SELECT 'PROYECTO', COUNT(*) FROM PROYECTO
UNION ALL SELECT 'TRABAJO', COUNT(*) FROM TRABAJO;
