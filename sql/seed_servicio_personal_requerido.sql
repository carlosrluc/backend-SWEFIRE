-- Personal requerido por servicio (2 filas por servicio activo principal)
-- Ejecutar después de migrate_profesion_enums.sql

DELETE FROM `SERVICIO_PERSONAL_REQUERIDO`;

INSERT INTO `SERVICIO_PERSONAL_REQUERIDO` (`ID_Servicio`, `profesion`, `cantidad`, `disponibilidad`, `requerimiento_legal`) VALUES
(1, 'ingeniero de sistemas', 2, 'tiempo completo', 'Colegiatura vigente'),
(1, 'bombero', 1, 'tiempo completo', 'Certificación contra incendios'),

(2, 'ingeniero sanitario', 1, 'tiempo completo', 'Colegiatura vigente'),
(2, 'tecnico', 2, 'tiempo completo', NULL),

(3, 'ingeniero ambiental', 1, 'medio tiempo', 'Colegiatura vigente'),
(3, 'SSOMA', 1, 'tiempo completo', 'Certificación SSOMA'),

(4, 'arquitecto', 1, 'tiempo completo', 'Colegiatura vigente'),
(4, 'Supervisor de planta', 1, 'tiempo completo', NULL),

(5, 'mecanico', 2, 'tiempo completo', NULL),
(5, 'tecnico', 1, 'tiempo completo', NULL),

(6, 'bombero', 2, 'tiempo completo', 'Certificación contra incendios'),
(6, 'ingeniero de sistemas', 1, 'medio tiempo', NULL),

(8, 'piloto', 1, 'tiempo completo', 'Brevete vigente'),
(8, 'tecnico', 1, 'tiempo completo', NULL),

(9, 'piloto', 1, 'tiempo completo', 'Brevete vigente'),
(9, 'mecanico', 1, 'tiempo completo', NULL),

(15, 'ingeniero de sistemas', 2, 'tiempo completo', 'Colegiatura vigente'),
(15, 'bombero', 1, 'tiempo completo', 'Certificación contra incendios');
