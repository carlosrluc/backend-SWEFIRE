const {
    pagoPorDiaToBoolean,
    toPagoPorDiaEnum,
    enrichEtapasConFechas,
    enrichSubserviciosConFechas,
    getPrincipalFechasFromTimeline,
    buildEtapaTimeline,
} = require('./servicioFechas.service');

function principalToBoolean(value) {
    return value === 'YES' || value === true;
}

function toPrincipalEnum(value) {
    if (value === true || value === 'YES' || value === 'yes') return 'YES';
    if (value === false || value === 'NO' || value === 'no') return 'NO';
    return 'NO';
}

function countOccurrences(ids) {
    const map = new Map();
    for (const id of ids) {
        map.set(id, (map.get(id) || 0) + 1);
    }
    return map;
}

async function getNextActividadOrden(executor, idServicioEtapa) {
    const rows = await executor.query(
        'SELECT COALESCE(MAX(orden), 0) AS max_orden FROM SERVICIO_ACTIVIDAD WHERE id_servicio_etapa = ?',
        [idServicioEtapa],
    );
    return (rows[0]?.max_orden || 0) + 1;
}

async function syncActividadFromSubservicio(executor, subservicioId) {
    const rows = await executor.query(
        `SELECT ss.id, ss.ID_Servicio, ss.ID_Servicio_subservicio, ss.id_servicio_etapa,
                s.nombre AS nombre_subservicio
         FROM SERVICIO_SUBSERVICIO ss
         INNER JOIN SERVICIO s ON s.ID_Servicio = ss.ID_Servicio_subservicio
         WHERE ss.id = ?`,
        [subservicioId],
    );
    if (!rows.length) return;

    const sub = rows[0];
    let existing = await executor.query(
        `SELECT id FROM SERVICIO_ACTIVIDAD
         WHERE id_servicio_subservicio = ? AND origen = 'subservicio'
         ORDER BY id ASC`,
        [subservicioId],
    );

    if (!existing.length) {
        existing = await executor.query(
            `SELECT sa.id FROM SERVICIO_ACTIVIDAD sa
             WHERE sa.id_servicio_etapa = ? AND sa.ID_Servicio = ? AND sa.origen = 'subservicio'
               AND sa.nombre = ?
             ORDER BY sa.id ASC`,
            [sub.id_servicio_etapa, sub.ID_Servicio, sub.nombre_subservicio],
        );
    }

    if (existing.length > 1) {
        const removeIds = existing.slice(1).map((r) => r.id);
        const placeholders = removeIds.map(() => '?').join(',');
        await executor.query(
            `DELETE FROM SERVICIO_ACTIVIDAD WHERE id IN (${placeholders})`,
            removeIds,
        );
        existing = [existing[0]];
    }

    if (existing.length) {
        await executor.query(
            `UPDATE SERVICIO_ACTIVIDAD
             SET id_servicio_etapa = ?, nombre = ?, ID_Servicio = ?, id_servicio_subservicio = ?
             WHERE id = ?`,
            [sub.id_servicio_etapa, sub.nombre_subservicio, sub.ID_Servicio, subservicioId, existing[0].id],
        );
        return;
    }

    const orden = await getNextActividadOrden(executor, sub.id_servicio_etapa);
    await executor.query(
        `INSERT INTO SERVICIO_ACTIVIDAD
            (id_servicio_etapa, ID_Servicio, nombre, orden, origen, id_servicio_subservicio)
         VALUES (?,?,?,?, 'subservicio', ?)`,
        [sub.id_servicio_etapa, sub.ID_Servicio, sub.nombre_subservicio, orden, subservicioId],
    );
}

async function loadServicioEtapasTree(executor, idServicio) {
    const etapas = await executor.query(
        `SELECT id, ID_Servicio, nombre, descripcion, duracion, orden
         FROM SERVICIO_ETAPA
         WHERE ID_Servicio = ?
         ORDER BY orden ASC, id ASC`,
        [idServicio],
    );
    if (!etapas.length) return [];

    const actividades = await executor.query(
        `SELECT sa.id, sa.id_servicio_etapa, sa.ID_Servicio, sa.nombre, sa.orden, sa.origen,
                sa.id_servicio_subservicio, ss.ID_Servicio_subservicio
         FROM SERVICIO_ACTIVIDAD sa
         LEFT JOIN SERVICIO_SUBSERVICIO ss ON ss.id = sa.id_servicio_subservicio
         WHERE sa.ID_Servicio = ?
         ORDER BY sa.orden ASC, sa.id ASC`,
        [idServicio],
    );

    const actsByEtapa = new Map();
    for (const act of actividades) {
        if (!actsByEtapa.has(act.id_servicio_etapa)) actsByEtapa.set(act.id_servicio_etapa, []);
        actsByEtapa.get(act.id_servicio_etapa).push(act);
    }

    return etapas.map((e) => ({
        ...e,
        actividades: actsByEtapa.get(e.id) || [],
    }));
}

function mapActividadForResponse(act) {
    const base = {
        id: act.id,
        nombre: act.nombre,
        origen: act.origen === 'subservicio' ? 'subservicio' : 'servicio',
    };
    if (act.origen === 'subservicio' && act.ID_Servicio_subservicio != null) {
        base.ID_Servicio_Hijo = act.ID_Servicio_subservicio;
    }
    return base;
}

async function buildServicioDetalleFlujo(executor, idServicio, fechaInicioProyecto = null) {
    const etapasTree = await loadServicioEtapasTree(executor, idServicio);
    const subservicios = await executor.query(
        `SELECT ss.id, ss.ID_Servicio_subservicio, ss.id_servicio_etapa,
                s.nombre AS nombre_subservicio, s.pago_por_dia AS pago_por_dia_sub,
                se.nombre AS nombre_etapa, se.orden AS orden_etapa, se.duracion AS duracion_etapa
         FROM SERVICIO_SUBSERVICIO ss
         INNER JOIN SERVICIO s ON s.ID_Servicio = ss.ID_Servicio_subservicio
         INNER JOIN SERVICIO_ETAPA se ON se.id = ss.id_servicio_etapa
         WHERE ss.ID_Servicio = ?
         ORDER BY ss.id ASC`,
        [idServicio],
    );

    const etapasBase = etapasTree.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        descripcion: e.descripcion ?? null,
        duracion: e.duracion,
        orden: e.orden,
        actividades: e.actividades.map((a) => {
            const act = {
                id: a.id,
                nombre: a.nombre,
                orden: a.orden,
                origen: a.origen === 'subservicio' ? 'subservicio' : 'manual',
            };
            if (a.origen === 'subservicio') {
                act.id_servicio_subservicio = a.id_servicio_subservicio ?? null;
                if (a.ID_Servicio_subservicio != null) {
                    act.ID_Servicio_Hijo = a.ID_Servicio_subservicio;
                }
            }
            return act;
        }),
    }));

    const etapas = fechaInicioProyecto
        ? enrichEtapasConFechas(etapasBase, fechaInicioProyecto)
        : etapasBase;

    const subsBase = subservicios.map((ss) => ({
        id: ss.id,
        ID_Servicio_subservicio: ss.ID_Servicio_subservicio,
        id_servicio_etapa: ss.id_servicio_etapa,
        nombre_subservicio: ss.nombre_subservicio,
        pago_por_dia: pagoPorDiaToBoolean(ss.pago_por_dia_sub),
        orden_etapa: ss.orden_etapa,
        duracion_etapa: ss.duracion_etapa,
        ubicacion_etapa: {
            id: ss.id_servicio_etapa,
            nombre: ss.nombre_etapa,
            orden: ss.orden_etapa,
            duracion: ss.duracion_etapa,
        },
    }));

    const subserviciosOut = fechaInicioProyecto
        ? enrichSubserviciosConFechas(subsBase, etapasBase, fechaInicioProyecto)
        : subsBase;

    const timeline = fechaInicioProyecto ? buildEtapaTimeline(etapasBase, fechaInicioProyecto) : [];
    const fechasPrincipal = timeline.length ? getPrincipalFechasFromTimeline(timeline) : null;

    return {
        etapas,
        subservicios: subserviciosOut,
        fecha_inicio_proyecto: fechaInicioProyecto ?? null,
        fechas_servicio_principal: fechasPrincipal,
    };
}

async function buildPrincipalTemplate(executor, idServicio, fechaInicioProyecto = null) {
    const servicioRows = await executor.query(
        'SELECT ID_Servicio, nombre, pago_por_dia FROM SERVICIO WHERE ID_Servicio = ?',
        [idServicio],
    );
    if (!servicioRows.length) return null;

    const servicio = servicioRows[0];
    const detalle = await buildServicioDetalleFlujo(executor, idServicio, fechaInicioProyecto);

    return {
        servicio_principal: {
            ID_Servicio: servicio.ID_Servicio,
            nombre: servicio.nombre,
            Principal: true,
            pago_por_dia: pagoPorDiaToBoolean(servicio.pago_por_dia),
            fecha_inicio: detalle.fechas_servicio_principal?.fecha_inicio ?? null,
            fecha_finalizacion: detalle.fechas_servicio_principal?.fecha_finalizacion ?? null,
            etapas: detalle.etapas.map((e) => ({
                id: e.id,
                nombre: e.nombre,
                orden: e.orden,
                duracion: e.duracion,
                fecha_inicio: e.fecha_inicio ?? null,
                fecha_finalizacion: e.fecha_finalizacion ?? null,
                actividades: e.actividades.map(mapActividadForResponse),
            })),
        },
        servicios_secundarios: detalle.subservicios.map((ss) => ({
            id_subservicio: ss.id,
            ID_Servicio: ss.ID_Servicio_subservicio,
            nombre: ss.nombre_subservicio,
            Principal: false,
            pago_por_dia: ss.pago_por_dia ?? false,
            fecha_inicio: ss.fecha_inicio ?? null,
            fecha_finalizacion: ss.fecha_finalizacion ?? null,
            ubicacion_etapa: {
                ...ss.ubicacion_etapa,
                duracion: ss.duracion_etapa ?? ss.ubicacion_etapa?.duracion,
            },
        })),
        fecha_inicio_proyecto: fechaInicioProyecto ?? null,
    };
}

function filterSubservicioActivities(activities, secundarioCounts, subservicioIds = null) {
    if (subservicioIds && subservicioIds.size > 0) {
        return activities.filter((act) => {
            if (act.origen !== 'subservicio') return true;
            return act.id_servicio_subservicio != null
                && subservicioIds.has(act.id_servicio_subservicio);
        });
    }

    const consumed = new Map();
    const filtered = [];

    for (const act of activities) {
        if (act.origen !== 'subservicio') {
            filtered.push(act);
            continue;
        }
        const hijoId = act.ID_Servicio_subservicio;
        if (hijoId == null) continue;
        const allowed = secundarioCounts.get(hijoId) || 0;
        const used = consumed.get(hijoId) || 0;
        if (used < allowed) {
            filtered.push(act);
            consumed.set(hijoId, used + 1);
        }
    }
    return filtered;
}

function buildPhasesFromServicioTree(etapasTree, options = {}) {
    const {
        secundarioCounts = null,
        subservicioIds = null,
        onlyManualActivities = false,
    } = options;

    return {
        items: etapasTree.map((etapa) => {
            let acts = etapa.actividades;
            if (onlyManualActivities) {
                acts = acts.filter((a) => a.origen !== 'subservicio');
            } else if (subservicioIds && subservicioIds.size > 0) {
                acts = filterSubservicioActivities(acts, null, subservicioIds);
            } else if (secundarioCounts) {
                acts = filterSubservicioActivities(acts, secundarioCounts);
            }

            return {
                id: `srv-etapa-${etapa.id}`,
                name: etapa.nombre,
                description: etapa.descripcion ?? '',
                duration: Number(etapa.duracion) || 0,
                activities: acts.map((act, ai) => ({
                    id: `srv-act-${act.id}`,
                    name: act.nombre,
                    orden: ai + 1,
                })),
            };
        }).filter((item) => item.name),
    };
}

async function importServicioFlujoToCotizacion(executor, idCotizacion, idServicioPrincipal, options = {}) {
    const etapasTree = await loadServicioEtapasTree(executor, idServicioPrincipal);
    if (!etapasTree.length) return { imported: false, reason: 'no_etapas' };

    const phases = buildPhasesFromServicioTree(etapasTree, options);
    if (!phases.items.length) return { imported: false, reason: 'empty_phases' };

    await syncCotizacionEtapasFromPhases(executor, idCotizacion, phases);
    return { imported: true, etapas: phases.items.length };
}

async function assertSinglePrincipal(items, label = 'servicios') {
    const yesCount = items.filter((i) => toPrincipalEnum(i.Principal) === 'YES').length;
    if (yesCount > 1) {
        const err = new Error(`Solo puede haber un servicio principal en ${label}`);
        err.statusCode = 400;
        throw err;
    }
}

module.exports = {
    principalToBoolean,
    toPrincipalEnum,
    countOccurrences,
    syncActividadFromSubservicio,
    loadServicioEtapasTree,
    buildPrincipalTemplate,
    buildServicioDetalleFlujo,
    buildPhasesFromServicioTree,
    importServicioFlujoToCotizacion,
    assertSinglePrincipal,
    getNextActividadOrden,
    filterSubservicioActivities,
    mapActividadForResponse,
};
