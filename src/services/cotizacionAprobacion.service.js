const db = require('../config/db');
const { QuotationStatus } = require('../enums/quotation.enums');

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

function isGerenteRole(rol) {
    return rol === 'gerente' || rol === 'adminproy';
}

function isAbogadoRole(rol) {
    return rol === 'abogado';
}

function resolveAprobacionOnCreate(rolNormalizado, isIncidencia) {
    const gerente = isGerenteRole(rolNormalizado);

    if (isIncidencia) {
        return {
            aprobado: 'NO',
            aprobado_por_abogado: 'NO',
            aprobado_por_gerente: gerente ? 'YES' : 'NO',
            estado: QuotationStatus.NOT_APPROVED,
        };
    }

    if (gerente) {
        return {
            aprobado: 'YES',
            aprobado_por_abogado: 'NO',
            aprobado_por_gerente: 'YES',
            estado: QuotationStatus.PENDING,
        };
    }

    return {
        aprobado: 'NO',
        aprobado_por_abogado: 'NO',
        aprobado_por_gerente: 'NO',
        estado: QuotationStatus.NOT_APPROVED,
    };
}

function computeFinalAprobacionIncidencia(aprobadoPorAbogado, aprobadoPorGerente) {
    if (aprobadoPorAbogado === 'YES' && aprobadoPorGerente === 'YES') {
        return { aprobado: 'YES', estado: QuotationStatus.PENDING };
    }
    return { aprobado: 'NO', estado: QuotationStatus.NOT_APPROVED };
}

async function getCotizacionVigente(cotizacionId) {
    const rows = await db.query(
        `SELECT * FROM COTIZACION_COMERCIAL WHERE ID = ? AND desactualizado = 'NO'`,
        [cotizacionId],
    );
    return rows[0] || null;
}

async function aprobarCotizacionInterna(cotizacionId, rolNormalizado) {
    const cotizacion = await getCotizacionVigente(cotizacionId);
    if (!cotizacion) throw httpError(404, 'Cotización no encontrada');

    const isIncidencia = Boolean(cotizacion.Id_incidencia);

    if (isIncidencia) {
        if (!isAbogadoRole(rolNormalizado) && !isGerenteRole(rolNormalizado)) {
            throw httpError(403, 'Solo abogado o gerente pueden aprobar cotizaciones de incidencia');
        }

        let aprobadoPorAbogado = cotizacion.aprobado_por_abogado || 'NO';
        let aprobadoPorGerente = cotizacion.aprobado_por_gerente || 'NO';

        if (isAbogadoRole(rolNormalizado)) {
            if (aprobadoPorAbogado === 'YES') {
                throw httpError(409, 'Esta cotización ya fue aprobada por abogado');
            }
            aprobadoPorAbogado = 'YES';
        }

        if (isGerenteRole(rolNormalizado)) {
            if (aprobadoPorGerente === 'YES') {
                throw httpError(409, 'Esta cotización ya fue aprobada por gerente');
            }
            aprobadoPorGerente = 'YES';
        }

        const finalState = computeFinalAprobacionIncidencia(aprobadoPorAbogado, aprobadoPorGerente);

        await db.query(
            `UPDATE COTIZACION_COMERCIAL
             SET aprobado = ?, aprobado_por_abogado = ?, aprobado_por_gerente = ?, estado = ?
             WHERE ID = ? AND desactualizado = 'NO'`,
            [
                finalState.aprobado,
                aprobadoPorAbogado,
                aprobadoPorGerente,
                finalState.estado,
                cotizacionId,
            ],
        );

        return {
            ID: cotizacionId,
            aprobado: finalState.aprobado,
            aprobado_por_abogado: aprobadoPorAbogado,
            aprobado_por_gerente: aprobadoPorGerente,
            estado: finalState.estado,
            esCotizacionIncidencia: true,
            aprobacion_completa: finalState.aprobado === 'YES',
        };
    }

    if (!isGerenteRole(rolNormalizado)) {
        throw httpError(403, 'Solo gerente puede aprobar cotizaciones comerciales');
    }

    if (cotizacion.aprobado === 'YES') {
        throw httpError(409, 'Esta cotización ya está aprobada');
    }

    await db.query(
        `UPDATE COTIZACION_COMERCIAL
         SET aprobado = 'YES', aprobado_por_gerente = 'YES', estado = ?
         WHERE ID = ? AND desactualizado = 'NO'`,
        [QuotationStatus.PENDING, cotizacionId],
    );

    return {
        ID: cotizacionId,
        aprobado: 'YES',
        aprobado_por_gerente: 'YES',
        estado: QuotationStatus.PENDING,
        esCotizacionIncidencia: false,
        aprobacion_completa: true,
    };
}

async function marcarIncidenciaPagada(cotizacionId) {
    const cotizacion = await getCotizacionVigente(cotizacionId);
    if (!cotizacion) throw httpError(404, 'Cotización no encontrada');
    if (!cotizacion.Id_incidencia) {
        throw httpError(400, 'Solo aplica a cotizaciones de incidencia');
    }
    if (cotizacion.aprobado !== 'YES') {
        throw httpError(400, 'La cotización debe estar aprobada antes de marcarla como pagada');
    }
    if (cotizacion.estado === QuotationStatus.INCIDENCE_PAID) {
        throw httpError(409, 'La cotización ya está marcada como Incidencia Pagada');
    }

    await db.query(
        `UPDATE COTIZACION_COMERCIAL SET estado = ? WHERE ID = ? AND desactualizado = 'NO'`,
        [QuotationStatus.INCIDENCE_PAID, cotizacionId],
    );

    return {
        ID: cotizacionId,
        estado: QuotationStatus.INCIDENCE_PAID,
        esCotizacionIncidencia: true,
    };
}

async function getCotizacionOriginalDeIncidencia(cotizacionId) {
    const cotizacion = await getCotizacionVigente(cotizacionId);
    if (!cotizacion) throw httpError(404, 'Cotización no encontrada');
    if (!cotizacion.Id_incidencia) {
        throw httpError(400, 'Solo aplica a cotizaciones de incidencia');
    }

    const rows = await db.query(
        `SELECT P.id_cotizacion, P.id_Proyecto, P.Proyecto_Nombre
         FROM INCIDENCIA INC
         INNER JOIN PROYECTO P ON INC.id_proyecto = P.id_Proyecto
         WHERE INC.id_incidencia = ?`,
        [cotizacion.Id_incidencia],
    );

    if (!rows.length || !rows[0].id_cotizacion) {
        throw httpError(404, 'No se encontró la cotización original del proyecto asociado a la incidencia');
    }

    return {
        id_cotizacion_original: rows[0].id_cotizacion,
        id_proyecto: rows[0].id_Proyecto,
        proyecto_nombre: rows[0].Proyecto_Nombre,
        id_incidencia: cotizacion.Id_incidencia,
        solo_lectura: true,
    };
}

module.exports = {
    resolveAprobacionOnCreate,
    computeFinalAprobacionIncidencia,
    aprobarCotizacionInterna,
    marcarIncidenciaPagada,
    getCotizacionOriginalDeIncidencia,
    isGerenteRole,
    isAbogadoRole,
};
