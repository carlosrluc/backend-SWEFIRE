const { serializeEtapasDetalleForDb } = require('./cotizacionDto.service');

const DESACTUALIZADO_VIGENTE = 'NO';
const DESACTUALIZADO_ARCHIVO = 'YES';

const COTIZACION_BASE_COLUMNS = `
    version, nombre, id_solicitud, DNI_O_RUC, precio_total, estado,
    comentario_cliente, fecha_emision, fecha_vigencia, observacion,
    Tasa_Cambio, condiciones, tacaCompra, tasaVenta, Orden_compra,
    duracion_etapa, etapas, etapas_detalle, direccion_recojo, Id_incidencia, desactualizado
`;

function rowToInsertValues(row, desactualizado) {
    return [
        row.version ?? 1,
        row.nombre,
        row.id_solicitud,
        row.DNI_O_RUC,
        row.precio_total,
        row.estado,
        row.comentario_cliente,
        row.fecha_emision,
        row.fecha_vigencia,
        row.observacion,
        row.Tasa_Cambio,
        row.condiciones,
        row.tacaCompra,
        row.tasaVenta,
        row.Orden_compra,
        row.duracion_etapa,
        row.etapas,
        serializeEtapasDetalleForDb(row.etapas_detalle),
        row.direccion_recojo,
        row.Id_incidencia ?? null,
        desactualizado,
    ];
}

async function copyCotizacionChildren(executor, sourceId, targetId) {
    const servicios = await executor.query(
        'SELECT * FROM COTIZACION_SERVICIO WHERE ID_Cotizacion = ? ORDER BY id',
        [sourceId],
    );
    const svcMap = {};
    for (const s of servicios) {
        const ins = await executor.query(
            `INSERT INTO COTIZACION_SERVICIO
                (ID_Cotizacion, ID_Servicio, fecha_inicio, fecha_finalizacion, jornada_comienzo, jornada_final, precio_comercial)
             VALUES (?,?,?,?,?,?,?)`,
            [targetId, s.ID_Servicio, s.fecha_inicio, s.fecha_finalizacion, s.jornada_comienzo, s.jornada_final, s.precio_comercial],
        );
        svcMap[s.id] = ins.insertId;
    }

    const inventarios = await executor.query(
        'SELECT * FROM COTIZACION_INVENTARIO WHERE ID_Cotizacion = ? ORDER BY id',
        [sourceId],
    );
    for (const inv of inventarios) {
        const nuevoServicioAlquiler = inv.servicio_a_alquilar != null && svcMap[inv.servicio_a_alquilar] != null
            ? svcMap[inv.servicio_a_alquilar]
            : inv.servicio_a_alquilar;
        await executor.query(
            `INSERT INTO COTIZACION_INVENTARIO
                (ID_Cotizacion, ID_Inventario, cantidad, intencion, dias_alquilados, servicio_a_alquilar,
                 precio_comercial, fecha_salida_taller, fecha_ingreso_taller, observaciones, Costo_Comercial)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [
                targetId, inv.ID_Inventario, inv.cantidad, inv.intencion, inv.dias_alquilados,
                nuevoServicioAlquiler, inv.precio_comercial, inv.fecha_salida_taller, inv.fecha_ingreso_taller,
                inv.observaciones, inv.Costo_Comercial,
            ],
        );
    }

    const camiones = await executor.query(
        'SELECT * FROM COTIZACION_CAMION WHERE ID_Cotizacion = ? ORDER BY id',
        [sourceId],
    );
    for (const cam of camiones) {
        const nuevoUso = cam.uso != null && svcMap[cam.uso] != null ? svcMap[cam.uso] : cam.uso;
        await executor.query(
            `INSERT INTO COTIZACION_CAMION
                (ID_Cotizacion, Placa, uso, fecha_hora_entrada, fecha_hora_salida, PrecioUnit)
             VALUES (?,?,?,?,?,?)`,
            [targetId, cam.Placa, nuevoUso, cam.fecha_hora_entrada, cam.fecha_hora_salida, cam.PrecioUnit],
        );
    }

    const personal = await executor.query(
        'SELECT * FROM COTIZACION_PERSONAL WHERE ID_Cotizacion = ? ORDER BY id',
        [sourceId],
    );
    for (const p of personal) {
        await executor.query(
            `INSERT INTO COTIZACION_PERSONAL
                (ID_Cotizacion, ID_Usuario, rol_en_trabajo, fecha_entrada, fecha_salida, dias_trabajados)
             VALUES (?,?,?,?,?,?)`,
            [targetId, p.ID_Usuario, p.rol_en_trabajo, p.fecha_entrada, p.fecha_salida, p.dias_trabajados],
        );
    }

    const etapas = await executor.query(
        'SELECT * FROM COTIZACION_ETAPA WHERE ID_Cotizacion = ? ORDER BY id',
        [sourceId],
    );
    const etapaMap = {};
    for (const e of etapas) {
        const ins = await executor.query(
            `INSERT INTO COTIZACION_ETAPA
                (ID_Cotizacion, referencia, nombre, descripcion, duracion, orden)
             VALUES (?,?,?,?,?,?)`,
            [targetId, e.referencia, e.nombre, e.descripcion, e.duracion, e.orden],
        );
        etapaMap[e.id] = ins.insertId;
    }

    const actividades = await executor.query(
        'SELECT * FROM COTIZACION_ACTIVIDAD WHERE ID_Cotizacion = ? ORDER BY id',
        [sourceId],
    );
    for (const a of actividades) {
        const nuevaEtapa = etapaMap[a.id_cotizacion_etapa] ?? a.id_cotizacion_etapa;
        await executor.query(
            `INSERT INTO COTIZACION_ACTIVIDAD
                (id_cotizacion_etapa, ID_Cotizacion, referencia, nombre, orden)
             VALUES (?,?,?,?,?)`,
            [nuevaEtapa, targetId, a.referencia, a.nombre, a.orden],
        );
    }

    const mensajes = await executor.query(
        'SELECT * FROM COTIZACION_CHAT_MENSAJE WHERE id_cotizacion = ? ORDER BY id_mensaje',
        [sourceId],
    );
    for (const m of mensajes) {
        await executor.query(
            `INSERT INTO COTIZACION_CHAT_MENSAJE
                (id_cotizacion, id_remitente, id_cliente, tipo_remitente, nombre_remitente, mensaje, fecha_hora)
             VALUES (?,?,?,?,?,?,?)`,
            [
                targetId, m.id_remitente, m.id_cliente, m.tipo_remitente,
                m.nombre_remitente, m.mensaje, m.fecha_hora,
            ],
        );
    }
}

/**
 * Guarda una copia archivada (desactualizado=YES) con la versión actual antes de un PUT.
 */
async function archiveCotizacionSnapshot(executor, cotizacionId, currentRow) {
    const row = currentRow ?? (await executor.query(
        'SELECT * FROM COTIZACION_COMERCIAL WHERE ID = ? AND desactualizado = ?',
        [cotizacionId, DESACTUALIZADO_VIGENTE],
    ))[0];

    if (!row) {
        const err = new Error('Cotización no encontrada o archivada');
        err.statusCode = 404;
        throw err;
    }

    const archivedVersion = Number(row.version || 1);
    const result = await executor.query(
        `INSERT INTO COTIZACION_COMERCIAL (${COTIZACION_BASE_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        rowToInsertValues(row, DESACTUALIZADO_ARCHIVO),
    );
    const archiveId = result.insertId;
    await copyCotizacionChildren(executor, cotizacionId, archiveId);

    return {
        archiveId,
        archivedVersion,
        nextVersion: archivedVersion + 1,
    };
}

async function assertCotizacionVigente(executor, cotizacionId) {
    const rows = await executor.query(
        'SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND desactualizado = ?',
        [cotizacionId, DESACTUALIZADO_VIGENTE],
    );
    return rows.length > 0;
}

module.exports = {
    DESACTUALIZADO_VIGENTE,
    DESACTUALIZADO_ARCHIVO,
    archiveCotizacionSnapshot,
    assertCotizacionVigente,
};
