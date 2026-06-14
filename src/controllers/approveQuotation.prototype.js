const { getQuotationByID } = require("../repositories/quotation.repository")
const { QuotationStatus } = require("../enums/quotation.enums");
const catchAsync = require("../utils/catchAsync");
const { syncProyectoEtapasFromCotizacion } = require("../services/proyectoEtapas.service");
const db = require("../config/db");

const approveQuotation = catchAsync(async (req, res) => {
    const QuotationID = req.params.id;
    // Verificar si ya existe un proyecto para esta cotización (cotizacion aprobada)
    const quotation = await getQuotationByID(QuotationID)
    if (!quotation) {
        return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    if (quotation.estado === QuotationStatus.APPROVED) {
        return res.status(401).json({ error: `La cotización con ID: ${QuotationID} ya fue aprobada.` })
    }
    if (quotation.Orden_compra === undefined) {
        return res.status(401).json({ error: `La cotización no cuenta con orden de compra adjunta.` })
    }

    /*==================================================STORED PROCEDURE====================================== */
    const clienteId = quotation.DNI_O_RUC;
    const idSolicitud = quotation.id_solicitud;
    const nombreCot = quotation.nombre;
    const observaciones = quotation.observacion ?? null;
    const relativeUrl = quotation.Orden_compra;
    let ubicacion = null;
    let descripcionServicio = `Proyecto generado a partir de la cotización: ${nombreCot}`;

    if (idSolicitud) {
        const solData = await db.query('SELECT ubicacion, descripcion FROM SOLICITUD WHERE ID = ?', [idSolicitud]);
        if (solData.length) {
            ubicacion = solData[0].ubicacion;
            if (solData[0].descripcion) {
                descripcionServicio = solData[0].descripcion;
            }
        }
    }

    // 1. Crear el Trabajo base
    const trabajoResult = await db.query(
        'INSERT INTO TRABAJO (comentario) VALUES (?)',
        [`Trabajo autogenerado para ${nombreCot}`]
    );
    const idTrabajo = trabajoResult.insertId;

    // 2. Crear el Proyecto
    const projResult = await db.query(
        `INSERT INTO PROYECTO (descripcion_servicio, ID_Trabajo, Id_Cliente, ubicacion, id_cotizacion, orden_servicio, observaciones, estado, fecha_inicio, fecha_fin) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, 'No iniciado', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY))`,
        [descripcionServicio, idTrabajo, clienteId, ubicacion, QuotationID, relativeUrl, observaciones]
    );
    const idProyecto = projResult.insertId;

    await syncProyectoEtapasFromCotizacion(db, idProyecto, QuotationID);

    // Actualizar Id_Proyecto en Trabajo
    await db.query('UPDATE TRABAJO SET Id_Proyecto = ? WHERE Id_trabajo = ?', [idProyecto, idTrabajo]);

    // 3. Migrar Inventario (COTIZACION_INVENTARIO -> PROYECTO_INVENTARIO)
    const inventarios = await db.query('SELECT ID_Inventario, cantidad, observaciones AS razon FROM COTIZACION_INVENTARIO WHERE ID_Cotizacion = ?', [QuotationID]);
    for (const inv of inventarios) {
        await db.query(
            'INSERT INTO PROYECTO_INVENTARIO (id_Proyecto, Id_Objeto, cantidad_objeto, razon, estado) VALUES (?, ?, ?, ?, ?)',
            [idProyecto, inv.ID_Inventario, inv.cantidad, inv.razon, 'aceptable']
        );
    }

    // 4. Migrar Servicios (COTIZACION_SERVICIO -> PROYECTO_SERVICIO)
    const serviciosCot = await db.query(
        `SELECT id, ID_Servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial, Principal, indicaciones
         FROM COTIZACION_SERVICIO WHERE ID_Cotizacion = ? AND ID_Servicio != 7`,
        [QuotationID],
    );
    for (const svc of serviciosCot) {
        await db.query(
            `INSERT INTO PROYECTO_SERVICIO
                (id_Proyecto, ID_Servicio, id_cotizacion_servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial, Principal, indicaciones)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [
                idProyecto,
                svc.ID_Servicio,
                svc.id,
                svc.fecha_inicio,
                svc.fecha_finalizacion,
                svc.jornada,
                svc.precio_comercial,
                svc.Principal,
                svc.indicaciones,
            ],
        );
    }

    // 5. Migrar Camiones (COTIZACION_CAMION -> PROYECTO_CAMION)
    const camiones = await db.query(
        `SELECT cc.Placa, cc.fecha_hora_entrada, cc.fecha_hora_salida, cc.uso, cs.ID_Servicio
                         FROM COTIZACION_CAMION cc
                         LEFT JOIN COTIZACION_SERVICIO cs ON cc.uso = cs.id
                         WHERE cc.ID_Cotizacion = ?`,
        [QuotationID],
    );
    for (const cam of camiones) {
        await db.query(
            'INSERT INTO PROYECTO_CAMION (id_Proyecto, Placa, fecha_hora_entrada, fecha_hora_salida, personal_manejando, razon, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [idProyecto, cam.Placa, cam.fecha_hora_entrada, cam.fecha_hora_salida, null, cam.uso, 'aceptable'],
        );
    }
    // 6. Migrar Personal ( -> TRABAJO_JORNADA)
    const personal = await db.query('SELECT ID_Usuario, fecha_entrada, fecha_salida FROM COTIZACION_PERSONAL WHERE ID_Cotizacion = ?', [QuotationID]);
    for (const pers of personal) {
        const user = await db.query('SELECT dni_perfil FROM USUARIO WHERE idusuario = ?', [pers.ID_Usuario]);
        if (user.length > 0) {
            const dni = user[0].dni_perfil;
            await db.query(
                'INSERT INTO TRABAJO_JORNADA (Id_trabajo, DNI_Trabajador, dia) VALUES (?, ?, ?)',
                [idTrabajo, dni, pers.fecha_entrada || new Date()]
            );
        }
    }
    await db.query('UPDATE COTIZACION_COMERCIAL SET estado = ? WHERE ID = ?', [QuotationStatus.APPROVED, QuotationID]);
    /*==============================================END OF STORED PROCEDURE====================================== */
})


module.exports = approveQuotation