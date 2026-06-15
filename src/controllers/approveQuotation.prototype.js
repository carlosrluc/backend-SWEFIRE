const { getQuotationByID } = require('../repositories/quotation.repository');
const { QuotationStatus } = require('../enums/quotation.enums');
const catchAsync = require('../utils/catchAsync');
const { syncProyectoEtapasFromCotizacion } = require('../services/proyectoEtapas.service');
const { generarTrabajosDesdeServiciosProyecto } = require('../services/proyectoTrabajo.service');
const db = require('../config/db');

const approveQuotation = catchAsync(async (req, res) => {
    const QuotationID = req.params.id;
    const quotation = await getQuotationByID(QuotationID);
    if (!quotation) {
        return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    if (quotation.estado === QuotationStatus.APPROVED) {
        return res.status(401).json({ error: `La cotización con ID: ${QuotationID} ya fue aprobada.` });
    }
    if (quotation.Orden_compra === undefined) {
        return res.status(401).json({ error: 'La cotización no cuenta con orden de compra adjunta.' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const exec = { query: (...args) => conn.query(...args) };

        const clienteId = quotation.DNI_O_RUC;
        const idSolicitud = quotation.id_solicitud;
        const nombreCot = quotation.nombre;
        const observaciones = quotation.observacion ?? null;
        const relativeUrl = quotation.Orden_compra;
        let ubicacion = null;
        let descripcionServicio = `Proyecto generado a partir de la cotización: ${nombreCot}`;

        if (idSolicitud) {
            const solData = await exec.query('SELECT ubicacion, descripcion FROM SOLICITUD WHERE ID = ?', [idSolicitud]);
            if (solData.length) {
                ubicacion = solData[0].ubicacion;
                if (solData[0].descripcion) descripcionServicio = solData[0].descripcion;
            }
        }

        const serviciosCot = await exec.query(
            `SELECT id, ID_Servicio, fecha_inicio, fecha_finalizacion, jornada_comienzo, jornada_final,
                    precio_comercial, Principal, indicaciones, id_servicio_subservicio
             FROM COTIZACION_SERVICIO WHERE ID_Cotizacion = ? AND ID_Servicio != 7`,
            [QuotationID],
        );

        const fechasInicio = serviciosCot.map((s) => s.fecha_inicio).filter(Boolean).sort();
        const fechasFin = serviciosCot.map((s) => s.fecha_finalizacion).filter(Boolean).sort();
        const fechaInicioProyecto = fechasInicio[0] ?? new Date().toISOString().slice(0, 10);
        const fechaFinProyecto = fechasFin.length ? fechasFin[fechasFin.length - 1] : null;

        const projResult = await exec.query(
            `INSERT INTO PROYECTO
                (descripcion_servicio, ID_Trabajo, Id_Cliente, ubicacion, id_cotizacion, orden_servicio,
                 observaciones, estado, fecha_inicio, fecha_fin)
             VALUES (?, NULL, ?, ?, ?, ?, ?, 'No iniciado', ?, ?)`,
            [
                descripcionServicio,
                clienteId,
                ubicacion,
                QuotationID,
                relativeUrl,
                observaciones,
                fechaInicioProyecto,
                fechaFinProyecto,
            ],
        );
        const idProyecto = projResult.insertId;

        await syncProyectoEtapasFromCotizacion(exec, idProyecto, QuotationID);

        const inventarios = await exec.query(
            'SELECT ID_Inventario, cantidad, observaciones AS razon FROM COTIZACION_INVENTARIO WHERE ID_Cotizacion = ?',
            [QuotationID],
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
            [QuotationID],
        );
        for (const cam of camiones) {
            await exec.query(
                `INSERT INTO PROYECTO_CAMION
                    (id_Proyecto, Placa, fecha_hora_entrada, fecha_hora_salida, personal_manejando, razon, estado)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [idProyecto, cam.Placa, cam.fecha_hora_entrada, cam.fecha_hora_salida, null, cam.uso, 'aceptable'],
            );
        }

        const { trabajos_creados } = await generarTrabajosDesdeServiciosProyecto(exec, idProyecto, serviciosCot);

        await exec.query('UPDATE COTIZACION_COMERCIAL SET estado = ? WHERE ID = ?', [QuotationStatus.APPROVED, QuotationID]);

        await conn.commit();
        res.status(201).json({
            message: 'Cotización aprobada y proyecto creado',
            id_proyecto: idProyecto,
            trabajos_creados,
        });
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
});

module.exports = approveQuotation;
