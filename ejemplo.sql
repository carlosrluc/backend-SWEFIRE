-- =============================================================================
-- SWEFIRE — Reset y seed de INCIDENCIAS
-- Proyectos objetivo: estado "En Ejecución" y "Completado" (IDs 18–25 en BD actual)
-- Ejecutar sobre swefire_db. Revisar en copia antes de producción.
-- =============================================================================

START TRANSACTION;

-- ── 1. Desvincular informes (FK: ON DELETE SET NULL; esto evita huérfanos visibles) ──
UPDATE INFORME
SET id_incidencia = NULL
WHERE id_incidencia IS NOT NULL;

-- ── 2. Vaciar subtablas de incidencias ───────────────────────────────────────
DELETE FROM INVOLUCRADO;
DELETE FROM INCIDENCIA_OBJETOS;
DELETE FROM INCIDENCIA_CAMIONES;

-- ── 3. Vaciar incidencias ────────────────────────────────────────────────────
DELETE FROM INCIDENCIA;

-- ── 4. Reiniciar autoincrement (opcional, deja IDs consecutivos desde 1) ─────
ALTER TABLE INCIDENCIA AUTO_INCREMENT = 1;
ALTER TABLE INCIDENCIA_OBJETOS AUTO_INCREMENT = 1;
ALTER TABLE INCIDENCIA_CAMIONES AUTO_INCREMENT = 1;
ALTER TABLE INVOLUCRADO AUTO_INCREMENT = 1;

-- ── 5. Incidencias nuevas (más completas: nombre, proyecto, cliente, estado) ─
INSERT INTO INCIDENCIA
    (nombre_incidencia, id_proyecto, empresa_involucrada, cotizacion_remuneracion, comentario, estado)
VALUES
    (
        'Pérdida detectores humo - Pasillo B',
        20,
        '20501234567',
        1,
        'Durante la instalación de rociadores en Mall Aventura Plaza se extraviaron 3 detectores fotoeléctricos del lote asignado al pasillo B. Se requiere cotización de reposición al cliente.',
        'Pago por recibir'
    ),
    (
        'Avería panel alarma direccionable',
        20,
        '20501234567',
        NULL,
        'El panel de alarma direccionable presentó falla en módulo de zona 2 tras prueba de integración. Equipo enviado a revisión técnica del fabricante.',
        'Cotizacion sin respuesta'
    ),
    (
        'Robo extintor PQS - Cuarto técnico Antamina',
        19,
        '20545678901',
        3,
        'Extintor PQS 6 kg sustraído del cuarto técnico en sede San Borja durante horario nocturno. Denuncia policial registrada.',
        'Material recuperado'
    ),
    (
        'Incumplimiento plazo mantenimiento extintores',
        18,
        '20534567890',
        2,
        'El cliente reporta retraso en la segunda visita de mantenimiento programada en Clínica Internacional. Se gestiona compensación vía cotización de servicio.',
        'Pago realizado'
    ),
    (
        'Avería unidad mantenimiento en ruta',
        25,
        '20999999991',
        46,
        'Camión XYZ-987 sufrió avería mecánica en ruta hacia almacén Ate Vitarte. Unidad detenida en Panamericana Sur km 12.',
        'Cotizacion disputada'
    ),
    (
        'Hurto herramientas almacén Z',
        25,
        '20999999991',
        NULL,
        'Faltante de herramientas menores (llaves, sellos) en almacén Z al cierre del proyecto. Inventario físico en conciliación.',
        'Sin enviar'
    ),
    (
        'Disputa facturación mantenimiento extintores',
        22,
        '20512345678',
        2,
        'Cliente cuestiona ítems facturados no ejecutados en restaurante Miraflores. Pendiente revisión legal y comercial.',
        'Cotizacion sin respuesta'
    ),
    (
        'Fuga agente limpio post-instalación',
        19,
        '20545678901',
        3,
        'Se detectó fuga menor en botella de agente limpio HFC-227ea tras puesta en marcha en sede San Borja.',
        'Pago por recibir'
    );

-- IDs generados: 1..8 (tras reset AUTO_INCREMENT)

-- ── 6. Objetos de incidencia (PROYECTO_INVENTARIO real del proyecto) ─────────
INSERT INTO INCIDENCIA_OBJETOS
    (id_incidencia, id_proyecto_inventario, ocurrencia_inventario, fecha_ocurrencia, cantidad, ultima_ubicacion, comentario, precio_remunerar)
VALUES
    (
        1,
        84,
        'perdida',
        '2026-05-12 14:30:00',
        3,
        'Mall Aventura Plaza - Pasillo B, nivel 2',
        'Detectores de humo fotoeléctricos no localizados tras conteo de fin de jornada.',
        165.00
    ),
    (
        2,
        87,
        'averia',
        '2026-05-18 09:15:00',
        1,
        'Sala de bombas - Sede Industrial Callao',
        'Panel direccionable sin comunicación con módulo zona 2; LED de falla activo.',
        1200.00
    ),
    (
        3,
        31,
        'robo',
        '2026-04-02 23:45:00',
        1,
        'Cuarto técnico - Sede San Borja',
        'Extintor PQS 6 kg con precinto violado; cámara sin cobertura en ese ángulo.',
        120.00
    ),
    (
        2,
        86,
        'averia',
        '2026-05-18 09:20:00',
        1,
        'Sala de bombas - Sede Industrial Callao',
        'Módulo de control zona asociado al panel con falla intermitente.',
        210.00
    ),
    (
        8,
        30,
        'otro',
        '2026-03-28 16:00:00',
        1,
        'Sede San Borja - Cuarto agente limpio',
        'Fuga en válvula de botella HFC-227ea; agente parcialmente recuperado.',
        620.00
    );

-- ── 7. Camiones de incidencia (PROYECTO_CAMION id=33, proyecto 25) ───────────
INSERT INTO INCIDENCIA_CAMIONES
    (id_incidencia, id_proyecto_camion, ocurrencia_camion, fecha_ocurrencia, ultima_ubicacion, comentario, precio_remunerar)
VALUES
    (
        5,
        33,
        'averia',
        '2026-06-01 07:40:00',
        'Panamericana Sur km 12 - dirección sur',
        'Unidad 04 (XYZ-987) con falla de transmisión; grúa solicitada para traslado a taller.',
        850.00
    ),
    (
        5,
        33,
        'por mantener',
        '2026-06-02 11:00:00',
        'Taller SWEFIRE - Ate Vitarte',
        'Costo estimado de mano de obra y repuestos por mantenimiento correctivo.',
        1200.00
    );

-- ── 8. Involucrados (perfiles existentes en PERFIL) ──────────────────────────
INSERT INTO INVOLUCRADO
    (dni_involucrado, id_incidencia, descargo, comentario, nombre, Perfil_Registrado, cargo)
VALUES
    ('21905467', 1, 'Se entregó el lote completo al supervisor de obra según acta firmada.', 'Supervisor de campo responsable del resguardo del material.', 'Diego Alejandro Romero Castillo', 1, 'Supervisor de campo'),
    ('10894356', 1, 'No participé en el conteo del día del incidente.', 'Testigo del traslado de cajas al pasillo B.', 'Patricia Isabel Gutiérrez Ramos', 1, 'Técnico instalador'),
    ('63452198', 2, 'La falla se detectó en prueba de aceptación, no por mal uso.', 'Reportó la alarma en panel durante commissioning.', NULL, 1, 'Técnico electricista'),
    ('96783245', 3, 'El área no contaba con custodia nocturna contratada por el cliente.', 'Guardia de seguridad del edificio en turno noche.', NULL, 1, 'Guardia de seguridad'),
    ('47823561', 4, 'El retraso obedece a cambio de cronograma solicitado por el cliente.', 'Coordinador comercial del proyecto.', NULL, 1, 'Coordinador comercial'),
    ('74561023', 5, 'Conducción dentro de límites; la avería es mecánica preexistente.', 'Conductor asignado a la unidad XYZ-987.', NULL, 1, 'Conductor'),
    ('12345688', 6, 'El almacén Z no tenía cerradura reforzada instalada.', 'Encargado de almacén temporal del proyecto.', 'Juan Pérez', 1, 'Almacenero'),
    ('21905467', 7, 'Los ítems disputados corresponden a visita adicional no incluida en OC.', 'Referente técnico en sitio del cliente.', 'Diego Alejandro Romero Castillo', 1, 'Supervisor de campo'),
    ('10894356', 8, 'La fuga se originó en conexión no apretada durante prueba de presión.', 'Técnico que ejecutó la puesta en marcha.', 'Patricia Isabel Gutiérrez Ramos', 1, 'Técnico especialista');

COMMIT;

-- ── Verificación rápida ──────────────────────────────────────────────────────
-- SELECT i.id_incidencia, i.nombre_incidencia, p.Proyecto_Nombre, p.estado, i.estado
-- FROM INCIDENCIA i
-- JOIN PROYECTO p ON i.id_proyecto = p.id_Proyecto
-- ORDER BY p.estado, i.id_incidencia;
--
-- SELECT i.id_incidencia, COUNT(DISTINCT io.id) AS objetos, COUNT(DISTINCT ic.id) AS camiones, COUNT(DISTINCT v.id) AS involucrados
-- FROM INCIDENCIA i
-- LEFT JOIN INCIDENCIA_OBJETOS io ON io.id_incidencia = i.id_incidencia
-- LEFT JOIN INCIDENCIA_CAMIONES ic ON ic.id_incidencia = i.id_incidencia
-- LEFT JOIN INVOLUCRADO v ON v.id_incidencia = i.id_incidencia
-- GROUP BY i.id_incidencia;
