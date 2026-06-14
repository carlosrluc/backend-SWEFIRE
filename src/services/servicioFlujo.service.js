const { syncCotizacionEtapasFromPhases } = require('./cotizacionEtapas.service');

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
    const existing = await executor.query(
        `SELECT id FROM SERVICIO_ACTIVIDAD
         WHERE id_servicio_subservicio = ? AND origen = 'subservicio'`,
        [subservicioId],
    );

    if (existing.length) {
        await executor.query(
            `UPDATE SERVICIO_ACTIVIDAD
             SET id_servicio_etapa = ?, nombre = ?, ID_Servicio = ?
             WHERE id = ?`,
            [sub.id_servicio_etapa, sub.nombre_subservicio, sub.ID_Servicio, existing[0].id],
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

async function buildPrincipalTemplate(executor, idServicio) {
    const servicioRows = await executor.query(
        'SELECT ID_Servicio, nombre FROM SERVICIO WHERE ID_Servicio = ?',
        [idServicio],
    );
    if (!servicioRows.length) return null;

    const servicio = servicioRows[0];
    const etapasTree = await loadServicioEtapasTree(executor, idServicio);

    const subservicios = await executor.query(
        `SELECT ss.id, ss.ID_Servicio_subservicio, ss.id_servicio_etapa,
                s.nombre AS nombre_subservicio,
                se.nombre AS nombre_etapa, se.orden AS orden_etapa
         FROM SERVICIO_SUBSERVICIO ss
         INNER JOIN SERVICIO s ON s.ID_Servicio = ss.ID_Servicio_subservicio
         INNER JOIN SERVICIO_ETAPA se ON se.id = ss.id_servicio_etapa
         WHERE ss.ID_Servicio = ?
         ORDER BY ss.id ASC`,
        [idServicio],
    );

    return {
        servicio_principal: {
            ID_Servicio: servicio.ID_Servicio,
            nombre: servicio.nombre,
            Principal: true,
            etapas: etapasTree.map((e) => ({
                id: e.id,
                nombre: e.nombre,
                orden: e.orden,
                actividades: e.actividades.map(mapActividadForResponse),
            })),
        },
        servicios_secundarios: subservicios.map((ss) => ({
            id_subservicio: ss.id,
            ID_Servicio: ss.ID_Servicio_subservicio,
            nombre: ss.nombre_subservicio,
            Principal: false,
            ubicacion_etapa: {
                id: ss.id_servicio_etapa,
                nombre: ss.nombre_etapa,
                orden: ss.orden_etapa,
            },
        })),
    };
}

function filterSubservicioActivities(activities, secundarioCounts) {
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
    const { secundarioCounts = null, onlyManualActivities = false } = options;

    return {
        items: etapasTree.map((etapa, ei) => {
            let acts = etapa.actividades;
            if (onlyManualActivities) {
                acts = acts.filter((a) => a.origen !== 'subservicio');
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
    buildPhasesFromServicioTree,
    importServicioFlujoToCotizacion,
    assertSinglePrincipal,
    getNextActividadOrden,
};
