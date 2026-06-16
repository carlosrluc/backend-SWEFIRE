const { getQuotationByID } = require('../repositories/quotation.repository');
const { QuotationStatus } = require('../enums/quotation.enums');
const { syncProyectoEtapasFromCotizacion } = require('./proyectoEtapas.service');
const { generarTrabajosDesdeCotizacion } = require('./proyectoTrabajo.service');
const db = require('../config/db');

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

/**
 * Aprueba una cotización con orden de compra adjunta y crea el proyecto heredando
 * inventario, servicios, camiones, etapas, personal asignado y trabajos (TRABAJO) desde la cotización.
 */
async function approveCotizacionById(quotationId) {
    const quotation = await getQuotationByID(quotationId);
    if (!quotation) {
        throw httpError(404, 'Cotización no encontrada');
    }
    if (quotation.estado === QuotationStatus.APPROVED) {
        throw httpError(409, `La cotización con ID ${quotationId} ya fue aprobada.`);
    }
    if (!quotation.Orden_compra) {
        throw httpError(400, 'La cotización no cuenta con orden de compra adjunta.');
    }
    if (quotation.estado !== QuotationStatus.PENDING) {
        throw httpError(400, `Solo se pueden aprobar cotizaciones en estado ${QuotationStatus.PENDING}.`);
    }

    const existingProyecto = await db.query(
        'SELECT id_Proyecto FROM PROYECTO WHERE id_cotizacion = ? LIMIT 1',
        [quotationId],
    );
    if (existingProyecto.length) {
        throw httpError(
            409,
            `Ya existe un proyecto (ID ${existingProyecto[0].id_Proyecto}) para esta cotización.`,
        );
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const exec = {
            query: async (sql, params) => {
                const [rows] = await conn.query(sql, params);
                return rows;
            },
        };

        const clienteId = quotation.DNI_O_RUC;
        const idSolicitud = quotation.id_solicitud;
        const nombreCot = quotation.nombre;
        const observaciones = quotation.observacion ?? null;
        const relativeUrl = quotation.Orden_compra;
        let ubicacion = null;
        let descripcionServicio = `Proyecto generado a partir de la cotización: ${nombreCot}`;

        if (idSolicitud) {
            const solData = await exec.query(
                'SELECT ubicacion, descripcion FROM SOLICITUD WHERE ID = ?',
                [idSolicitud],
            );
            if (solData.length) {
                ubicacion = solData[0].ubicacion;
                if (solData[0].descripcion) descripcionServicio = solData[0].descripcion;
            }
        }

        const serviciosCot = await exec.query(
            `SELECT id, ID_Servicio, fecha_inicio, fecha_finalizacion, jornada_comienzo, jornada_final,
                    precio_comercial, Principal, indicaciones, id_servicio_subservicio
             FROM COTIZACION_SERVICIO WHERE ID_Cotizacion = ? AND ID_Servicio != 7`,
            [quotationId],
        );

        const fechasInicio = serviciosCot.map((s) => s.fecha_inicio).filter(Boolean).sort();
        const fechasFin = serviciosCot.map((s) => s.fecha_finalizacion).filter(Boolean).sort();
        const fechaInicioProyecto = fechasInicio[0] ?? new Date().toISOString().slice(0, 10);
        const fechaFinProyecto = fechasFin.length ? fechasFin[fechasFin.length - 1] : null;

        const projResult = await exec.query(
            `INSERT INTO PROYECTO
                (Proyecto_Nombre, descripcion_servicio, ID_Trabajo, Id_Cliente, ubicacion, id_cotizacion, orden_servicio,
                 observaciones, estado, fecha_inicio, fecha_fin)
             VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'No iniciado', ?, ?)`,
            [
                nombreCot || null,
                descripcionServicio,
                clienteId,
                ubicacion,
                quotationId,
                relativeUrl,
                observaciones,
                fechaInicioProyecto,
                fechaFinProyecto,
            ],
        );
        const idProyecto = projResult.insertId;

        await syncProyectoEtapasFromCotizacion(exec, idProyecto, quotationId);

        const inventarios = await exec.query(
            'SELECT ID_Inventario, cantidad, observaciones AS razon FROM COTIZACION_INVENTARIO WHERE ID_Cotizacion = ?',
            [quotationId],
        );
        for (const inv of inventarios) {
            await exec.query(
                'INSERT INTO PROYECTO_INVENTARIO (id_Proyecto, Id_Objeto, cantidad_objeto, razon, estado) VALUES (?, ?, ?, ?, ?)',
                [idProyecto, inv.ID_Inventario, inv.cantidad, inv.razon, 'aceptable'],
            );
        }

        for (const svc of serviciosCot) {
            await exec.query(
                `INSERT INTO PROYECTO_SERVICIO
                    (id_Proyecto, ID_Servicio, id_cotizacion_servicio, fecha_inicio, fecha_finalizacion,
                     jornada_comienzo, jornada_final, precio_comercial, Principal, indicaciones, id_servicio_subservicio)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    idProyecto,
                    svc.ID_Servicio,
                    svc.id,
                    svc.fecha_inicio,
                    svc.fecha_finalizacion,
                    svc.jornada_comienzo,
                    svc.jornada_final,
                    svc.precio_comercial,
                    svc.Principal,
                    svc.indicaciones,
                    svc.id_servicio_subservicio,
                ],
            );
        }

        const camiones = await exec.query(
            `SELECT cc.Placa, cc.fecha_hora_entrada, cc.fecha_hora_salida, cc.uso, cs.ID_Servicio
             FROM COTIZACION_CAMION cc
             LEFT JOIN COTIZACION_SERVICIO cs ON cc.uso = cs.id
             WHERE cc.ID_Cotizacion = ?`,
            [quotationId],
        );
        for (const cam of camiones) {
            await exec.query(
                `INSERT INTO PROYECTO_CAMION
                    (id_Proyecto, Placa, fecha_hora_entrada, fecha_hora_salida, personal_manejando, razon, estado)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [idProyecto, cam.Placa, cam.fecha_hora_entrada, cam.fecha_hora_salida, null, cam.uso, 'aceptable'],
            );
        }

        const { trabajos_creados, id_trabajo_principal } = await generarTrabajosDesdeCotizacion(
            exec,
            idProyecto,
            quotationId,
            serviciosCot,
            {
                fechaInicioFallback: fechaInicioProyecto,
                fechaFinFallback: fechaFinProyecto,
            },
        );

        if (id_trabajo_principal) {
            await exec.query(
                'UPDATE PROYECTO SET ID_Trabajo = ? WHERE id_Proyecto = ?',
                [id_trabajo_principal, idProyecto],
            );
        }

        await exec.query(
            'UPDATE COTIZACION_COMERCIAL SET estado = ? WHERE ID = ? AND desactualizado = ?',
            [QuotationStatus.APPROVED, quotationId, 'NO'],
        );

        await conn.commit();
        return { id_proyecto: idProyecto, trabajos_creados };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

module.exports = { approveCotizacionById };
