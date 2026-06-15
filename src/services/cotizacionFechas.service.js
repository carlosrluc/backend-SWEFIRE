const {
    buildEtapaTimeline,
    getPrincipalFechasFromTimeline,
    getEtapaFechasFromTimeline,
    calcularPrecioServicio,
    pagoPorDiaToBoolean,
} = require('./servicioFechas.service');
const { toPrincipalEnum } = require('./servicioFlujo.service');
const { toDateOnly, toDateTimeInicio, toDateTimeFin } = require('./cotizacionDto.service');

/**
 * Calcula y persiste fecha_inicio / fecha_finalizacion en COTIZACION_SERVICIO
 * según duración de COTIZACION_ETAPA y fecha de inicio del proyecto.
 */
async function aplicarFechasServiciosCotizacion(executor, cotizacionId, fechaInicioProyecto) {
    const inicio = toDateOnly(fechaInicioProyecto);
    if (!inicio) return { applied: false, reason: 'sin_fecha_inicio' };

    const etapas = await executor.query(
        `SELECT id, orden, duracion, nombre
         FROM COTIZACION_ETAPA
         WHERE ID_Cotizacion = ?
         ORDER BY orden ASC, id ASC`,
        [cotizacionId],
    );
    if (!etapas.length) return { applied: false, reason: 'sin_etapas' };

    const timeline = buildEtapaTimeline(etapas, inicio);
    const principalFechas = getPrincipalFechasFromTimeline(timeline);

    const servicios = await executor.query(
        `SELECT cs.id, cs.ID_Servicio, cs.Principal, cs.id_servicio_subservicio
         FROM COTIZACION_SERVICIO cs
         WHERE cs.ID_Cotizacion = ? AND cs.ID_Servicio != 7`,
        [cotizacionId],
    );

    let updated = 0;
    for (const svc of servicios) {
        let fechas;
        if (toPrincipalEnum(svc.Principal) === 'YES') {
            fechas = principalFechas;
        } else if (svc.id_servicio_subservicio) {
            const subRows = await executor.query(
                `SELECT ss.id_servicio_etapa, se.orden AS orden_etapa
                 FROM SERVICIO_SUBSERVICIO ss
                 INNER JOIN SERVICIO_ETAPA se ON se.id = ss.id_servicio_etapa
                 WHERE ss.id = ?`,
                [svc.id_servicio_subservicio],
            );
            if (subRows.length) {
                const ordenEtapa = subRows[0].orden_etapa;
                const cotEtapa = etapas.find((e) => Number(e.orden) === Number(ordenEtapa));
                fechas = getEtapaFechasFromTimeline(timeline, {
                    idEtapa: cotEtapa?.id,
                    ordenEtapa,
                });
            } else {
                fechas = { fecha_inicio: null, fecha_finalizacion: null };
            }
        } else {
            fechas = principalFechas;
        }

        await executor.query(
            `UPDATE COTIZACION_SERVICIO
             SET fecha_inicio = ?, fecha_finalizacion = ?
             WHERE id = ?`,
            [fechas.fecha_inicio, fechas.fecha_finalizacion, svc.id],
        );
        updated += 1;
    }

    return { applied: true, servicios_actualizados: updated, timeline };
}

async function loadServiciosCotizacionParaPrecio(executor, cotizacionId) {
    return executor.query(
        `SELECT cs.id, cs.ID_Servicio, cs.Principal, cs.precio_comercial,
                cs.fecha_inicio, cs.fecha_finalizacion, cs.id_servicio_subservicio,
                s.pago_por_dia
         FROM COTIZACION_SERVICIO cs
         LEFT JOIN SERVICIO s ON s.ID_Servicio = cs.ID_Servicio
         WHERE cs.ID_Cotizacion = ? AND cs.ID_Servicio != 7`,
        [cotizacionId],
    );
}

async function calcularDiasServicioCotizacion(executor, cotizacionId, svc, etapas) {
    if (toPrincipalEnum(svc.Principal) === 'YES') {
        return etapas.reduce((sum, e) => sum + (Number(e.duracion) || 0), 0);
    }
    if (svc.id_servicio_subservicio) {
        const subRows = await executor.query(
            `SELECT se.orden AS orden_etapa
             FROM SERVICIO_SUBSERVICIO ss
             INNER JOIN SERVICIO_ETAPA se ON se.id = ss.id_servicio_etapa
             WHERE ss.id = ?`,
            [svc.id_servicio_subservicio],
        );
        if (subRows.length) {
            const etapa = etapas.find((e) => Number(e.orden) === Number(subRows[0].orden_etapa));
            return Number(etapa?.duracion) || 0;
        }
    }
    if (svc.fecha_inicio && svc.fecha_finalizacion) {
        const start = new Date(`${toDateOnly(svc.fecha_inicio)}T00:00:00Z`);
        const end = new Date(`${toDateOnly(svc.fecha_finalizacion)}T00:00:00Z`);
        const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
        return Math.max(0, diff);
    }
    return 0;
}

async function calcularPrecioLineaServicios(executor, cotizacionId, serviciosOverride = null) {
    const etapas = await executor.query(
        `SELECT orden, duracion FROM COTIZACION_ETAPA WHERE ID_Cotizacion = ? ORDER BY orden ASC`,
        [cotizacionId],
    );
    const servicios = serviciosOverride
        || await loadServiciosCotizacionParaPrecio(executor, cotizacionId);

    let total = 0;
    const lineas = [];
    for (const svc of servicios) {
        const dias = await calcularDiasServicioCotizacion(executor, cotizacionId, svc, etapas);
        const pagoPorDia = pagoPorDiaToBoolean(svc.pago_por_dia);
        const precioLinea = calcularPrecioServicio(svc.precio_comercial, pagoPorDia, dias);
        total += precioLinea;
        lineas.push({
            id: svc.id,
            ID_Servicio: svc.ID_Servicio,
            dias,
            pago_por_dia: pagoPorDia,
            precio_comercial: svc.precio_comercial,
            precio_linea: precioLinea,
        });
    }
    return { total, lineas };
}

async function sincronizarFechasCamionesCotizacion(executor, cotizacionId) {
    const camiones = await executor.query(
        `SELECT cc.id, cc.uso, cs.fecha_inicio, cs.fecha_finalizacion
         FROM COTIZACION_CAMION cc
         INNER JOIN COTIZACION_SERVICIO cs ON cc.uso = cs.id
         WHERE cc.ID_Cotizacion = ? AND cs.fecha_inicio IS NOT NULL AND cs.fecha_finalizacion IS NOT NULL`,
        [cotizacionId],
    );
    let updated = 0;
    for (const row of camiones) {
        await executor.query(
            `UPDATE COTIZACION_CAMION
             SET fecha_hora_entrada = ?, fecha_hora_salida = ?
             WHERE id = ?`,
            [
                toDateTimeInicio(row.fecha_inicio),
                toDateTimeFin(row.fecha_finalizacion),
                row.id,
            ],
        );
        updated += 1;
    }
    return { camiones_actualizados: updated };
}

module.exports = {
    aplicarFechasServiciosCotizacion,
    calcularPrecioLineaServicios,
    loadServiciosCotizacionParaPrecio,
    sincronizarFechasCamionesCotizacion,
};
