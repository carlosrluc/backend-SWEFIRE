const { normalizeInventoryItem, normalizeServiceItem } = require('./cotizacionDto.service');

function buildObservacionFromSolicitud(solicitud) {
    const parts = [solicitud.ObsGenerales, solicitud.ObsEleccion].filter(Boolean);
    return parts.length ? parts.join('\n\n') : null;
}

function truncateNombre(text) {
    if (!text) return null;
    const trimmed = String(text).trim();
    return trimmed.length > 150 ? trimmed.slice(0, 147) + '...' : trimmed;
}

/**
 * Carga servicios, productos y datos comunes de una solicitud para crear una cotización.
 */
async function loadSolicitudDataForCotizacion(executor, idSolicitud) {
    const solicitudRows = await executor.query(
        `SELECT ID, Id_Cliente, descripcion, ubicacion, ObsGenerales, ObsEleccion,
                ProductoEnvio, CamionesEnvio
         FROM SOLICITUD WHERE ID = ?`,
        [idSolicitud],
    );
    if (!solicitudRows.length) {
        return null;
    }
    const solicitud = solicitudRows[0];

    const [servicioRows, inventarioRows] = await Promise.all([
        executor.query(
            `SELECT ss.ID_Servicio, ss.fecha_inicio_servicio, ss.fecha_fin_servicio, ss.horario_servicio,
                    s.precio_regular
             FROM SOLICITUD_SERVICIO ss
             LEFT JOIN SERVICIO s ON ss.ID_Servicio = s.ID_Servicio
             WHERE ss.ID_Solicitud = ? AND ss.ID_Servicio != 7
             ORDER BY ss.id ASC`,
            [idSolicitud],
        ),
        executor.query(
            `SELECT si.ID_Inventario, si.cantidad, si.intencion, si.dias_alquilados,
                    i.precio_comercial, i.nombre_objeto
             FROM SOLICITUD_INVENTARIO si
             LEFT JOIN INVENTARIO i ON si.ID_Inventario = i.Id_Objeto
             WHERE si.ID_Solicitud = ?
             ORDER BY si.id ASC`,
            [idSolicitud],
        ),
    ]);

    const servicios = servicioRows.map((row) => normalizeServiceItem({
        ID_Servicio: row.ID_Servicio,
        fecha_inicio: row.fecha_inicio_servicio,
        fecha_finalizacion: row.fecha_fin_servicio,
        jornada: row.horario_servicio,
        precio_comercial: row.precio_regular,
    }));

    const productos = inventarioRows.map((row) => normalizeInventoryItem({
        id: row.ID_Inventario,
        nombre: row.nombre_objeto,
        cantidad: row.cantidad,
        intencion: row.intencion,
        dias_alquilados: row.dias_alquilados,
        precio_comercial: row.precio_comercial,
    }));

    return {
        DNI_O_RUC: solicitud.Id_Cliente,
        nombre: truncateNombre(solicitud.descripcion),
        observacion: buildObservacionFromSolicitud(solicitud),
        direccion_recojo: solicitud.ubicacion || null,
        servicios,
        productos,
    };
}

function pickArrayFromSolicitud(bodyValue, solicitudValue) {
    if (Array.isArray(bodyValue) && bodyValue.length > 0) return bodyValue;
    if (bodyValue === undefined && Array.isArray(solicitudValue) && solicitudValue.length > 0) {
        return solicitudValue;
    }
    if (Array.isArray(bodyValue) && bodyValue.length === 0
        && Array.isArray(solicitudValue) && solicitudValue.length > 0) {
        return solicitudValue;
    }
    return bodyValue ?? solicitudValue ?? [];
}

function pickScalarFromSolicitud(bodyValue, solicitudValue) {
    if (bodyValue !== undefined && bodyValue !== null && bodyValue !== '') return bodyValue;
    return solicitudValue ?? bodyValue ?? null;
}

/**
 * Completa el payload de creación con datos de la solicitud cuando faltan en el body.
 */
async function mergeSolicitudIntoCotizacionCreate(executor, idSolicitud, normalized, rawBody = {}) {
    if (!idSolicitud) {
        return { merged: normalized, solicitudFound: false };
    }

    const solicitudData = await loadSolicitudDataForCotizacion(executor, idSolicitud);
    if (!solicitudData) {
        return { merged: normalized, solicitudFound: false };
    }

    const cond = normalized.condiciones ?? {};
    const costoRecojo = normalized.costoRecojo ?? {};

    const merged = {
        ...normalized,
        DNI_O_RUC: pickScalarFromSolicitud(rawBody.DNI_O_RUC ?? normalized.DNI_O_RUC, solicitudData.DNI_O_RUC),
        nombre: pickScalarFromSolicitud(rawBody.nombre ?? rawBody.name ?? normalized.nombre, solicitudData.nombre),
        productos: pickArrayFromSolicitud(normalized.productos, solicitudData.productos),
        servicios: pickArrayFromSolicitud(normalized.servicios, solicitudData.servicios),
        direccion_recojo: pickScalarFromSolicitud(
            normalized.direccion_recojo ?? costoRecojo.direccion_recojo ?? rawBody.direccion_recojo,
            solicitudData.direccion_recojo,
        ),
        condiciones: {
            ...cond,
            observaciones: pickScalarFromSolicitud(
                cond.observaciones,
                solicitudData.observacion,
            ),
        },
    };

    if (merged.costoRecojo && merged.direccion_recojo) {
        merged.costoRecojo = {
            ...merged.costoRecojo,
            direccion_recojo: pickScalarFromSolicitud(
                merged.costoRecojo.direccion_recojo,
                solicitudData.direccion_recojo,
            ),
        };
    }

    return { merged, solicitudFound: true };
}

module.exports = {
    loadSolicitudDataForCotizacion,
    mergeSolicitudIntoCotizacionCreate,
};
