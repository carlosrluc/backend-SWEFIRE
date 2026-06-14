const {
    toPrincipalEnum,
    principalToBoolean,
    assertSinglePrincipal,
    loadServicioEtapasTree,
    filterSubservicioActivities,
    mapActividadForResponse,
    countOccurrences,
} = require('./servicioFlujo.service');

/** Acepta array, { servicios }, o formato de GET /servicios/:id/principal */
function parseServiciosInput(body) {
    if (!body || typeof body !== 'object') return [];

    if (body.servicio_principal || body.servicios_secundarios) {
        const items = [];
        if (body.servicio_principal) {
            items.push({
                ...body.servicio_principal,
                Principal: true,
            });
        }
        if (Array.isArray(body.servicios_secundarios)) {
            for (const sec of body.servicios_secundarios) {
                items.push({
                    ...sec,
                    Principal: false,
                });
            }
        }
        return items;
    }

    if (Array.isArray(body)) return body;
    if (Array.isArray(body.servicios)) return body.servicios;
    if (body.ID_Servicio != null) return [body];
    return [];
}

function normalizeServicioItem(item) {
    const idSub = item.id_subservicio ?? item.id_servicio_subservicio ?? null;
    return {
        ID_Servicio: item.ID_Servicio != null ? Number(item.ID_Servicio) : null,
        Principal: toPrincipalEnum(item.Principal),
        indicaciones: item.indicaciones ?? null,
        fecha_inicio_servicio: item.fecha_inicio_servicio ?? null,
        fecha_fin_servicio: item.fecha_fin_servicio ?? null,
        horario_servicio: item.horario_servicio ?? null,
        id_servicio_subservicio: idSub != null ? Number(idSub) : null,
        ubicacion_etapa: item.ubicacion_etapa ?? null,
    };
}

async function validarSubservicios(executor, items) {
    const principal = items.find((i) => i.Principal === 'YES');
    if (!principal) return;

    for (const item of items) {
        if (item.Principal === 'YES') continue;
        if (!item.id_servicio_subservicio) continue;

        const rows = await executor.query(
            `SELECT ss.id, ss.ID_Servicio, ss.ID_Servicio_subservicio, ss.id_servicio_etapa,
                    se.nombre AS nombre_etapa, se.orden AS orden_etapa
             FROM SERVICIO_SUBSERVICIO ss
             INNER JOIN SERVICIO_ETAPA se ON se.id = ss.id_servicio_etapa
             WHERE ss.id = ? AND ss.ID_Servicio = ?`,
            [item.id_servicio_subservicio, principal.ID_Servicio],
        );
        if (!rows.length) {
            const err = new Error(
                `id_subservicio ${item.id_servicio_subservicio} no pertenece al servicio principal ${principal.ID_Servicio}`,
            );
            err.statusCode = 400;
            throw err;
        }
        if (item.ID_Servicio !== rows[0].ID_Servicio_subservicio) {
            const err = new Error(
                `ID_Servicio ${item.ID_Servicio} no coincide con el subservicio ${item.id_servicio_subservicio}`,
            );
            err.statusCode = 400;
            throw err;
        }
        if (item.ubicacion_etapa?.id != null
            && Number(item.ubicacion_etapa.id) !== rows[0].id_servicio_etapa) {
            const err = new Error(
                `ubicacion_etapa.id no coincide con el subservicio ${item.id_servicio_subservicio}`,
            );
            err.statusCode = 400;
            throw err;
        }
    }
}

async function insertarServiciosSolicitud(executor, idSolicitud, rawItems, options = {}) {
    const { yaTienePrincipal = false } = options;
    const items = rawItems.map(normalizeServicioItem);

    if (!items.length) return [];

    await assertSinglePrincipal(items, 'la solicitud');

    if (yaTienePrincipal && items.some((i) => i.Principal === 'YES')) {
        const err = new Error('La solicitud ya tiene un servicio principal; no se puede asignar otro');
        err.statusCode = 400;
        throw err;
    }

    await validarSubservicios(executor, items);

    const insertados = [];
    for (const item of items) {
        if (!item.ID_Servicio) {
            const err = new Error('Cada servicio debe incluir ID_Servicio');
            err.statusCode = 400;
            throw err;
        }
        const result = await executor.query(
            `INSERT INTO SOLICITUD_SERVICIO
                (ID_Solicitud, ID_Servicio, fecha_inicio_servicio, fecha_fin_servicio,
                 horario_servicio, Principal, indicaciones, id_servicio_subservicio)
             VALUES (?,?,?,?,?,?,?,?)`,
            [
                idSolicitud,
                item.ID_Servicio,
                item.fecha_inicio_servicio,
                item.fecha_fin_servicio,
                item.horario_servicio,
                item.Principal,
                item.indicaciones,
                item.Principal === 'YES' ? null : item.id_servicio_subservicio,
            ],
        );
        insertados.push({
            id: result.insertId,
            ID_Solicitud: Number(idSolicitud),
            ...item,
        });
    }
    return insertados;
}

const SERVICIO_SOLICITUD_SELECT = `
    SELECT ss.*, s.nombre AS nombre_servicio,
           sub.id_servicio_etapa,
           se.nombre AS nombre_etapa, se.orden AS orden_etapa
    FROM SOLICITUD_SERVICIO ss
    LEFT JOIN SERVICIO s ON s.ID_Servicio = ss.ID_Servicio
    LEFT JOIN SERVICIO_SUBSERVICIO sub ON sub.id = ss.id_servicio_subservicio
    LEFT JOIN SERVICIO_ETAPA se ON se.id = sub.id_servicio_etapa
`;

function mapServicioSolicitudResponse(row) {
    const base = {
        id: row.id,
        ID_Solicitud: row.ID_Solicitud,
        ID_Servicio: row.ID_Servicio,
        nombre: row.nombre_servicio ?? null,
        fecha_inicio_servicio: row.fecha_inicio_servicio,
        fecha_fin_servicio: row.fecha_fin_servicio,
        horario_servicio: row.horario_servicio,
        Principal: principalToBoolean(row.Principal),
        indicaciones: row.indicaciones,
        id_subservicio: row.id_servicio_subservicio ?? null,
    };
    if (row.id_servicio_subservicio && row.id_servicio_etapa) {
        base.ubicacion_etapa = {
            id: row.id_servicio_etapa,
            nombre: row.nombre_etapa,
            orden: row.orden_etapa,
        };
    }
    return base;
}

async function listarServiciosSolicitud(executor, idSolicitud) {
    const rows = await executor.query(
        `${SERVICIO_SOLICITUD_SELECT}
         WHERE ss.ID_Solicitud = ?
         ORDER BY ss.Principal DESC, ss.id ASC`,
        [idSolicitud],
    );
    return rows.map(mapServicioSolicitudResponse);
}

function filtrarActividadesParaSolicitud(actividades, servicios) {
    const secundarios = servicios.filter((s) => !s.Principal);
    if (!secundarios.length) {
        return actividades.filter((a) => a.origen !== 'subservicio');
    }
    const subservicioIds = secundarios
        .map((s) => s.id_subservicio)
        .filter((id) => id != null);
    if (subservicioIds.length) {
        return filterSubservicioActivities(actividades, null, new Set(subservicioIds));
    }
    return filterSubservicioActivities(
        actividades,
        countOccurrences(secundarios.map((s) => s.ID_Servicio)),
    );
}

async function buildEtapasFlujoSolicitud(executor, servicios) {
    const principal = servicios.find((s) => s.Principal === true);
    if (!principal) return null;

    const etapasTree = await loadServicioEtapasTree(executor, principal.ID_Servicio);
    if (!etapasTree.length) return [];

    return etapasTree.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        descripcion: e.descripcion ?? null,
        duracion: e.duracion,
        orden: e.orden,
        actividades: filtrarActividadesParaSolicitud(e.actividades, servicios).map(mapActividadForResponse),
    }));
}

/** Etapas/actividades del flujo según servicios elegidos en la solicitud */
async function enriquecerFlujoSolicitud(executor, servicios) {
    const etapas = await buildEtapasFlujoSolicitud(executor, servicios);
    const principal = servicios.find((s) => s.Principal === true);
    const secundarios = servicios.filter((s) => !s.Principal);

    return {
        etapas,
        servicio_principal: principal
            ? { ...principal, etapas: etapas ?? [] }
            : null,
        servicios_secundarios: secundarios,
    };
}

module.exports = {
    parseServiciosInput,
    normalizeServicioItem,
    insertarServiciosSolicitud,
    listarServiciosSolicitud,
    mapServicioSolicitudResponse,
    buildEtapasFlujoSolicitud,
    enriquecerFlujoSolicitud,
};
