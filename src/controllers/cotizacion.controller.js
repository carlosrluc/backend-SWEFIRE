const db = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const { aggregateInventarioPorCotizacion } = require('../services/inventarioPorServicio.service');
const { syncProyectoEtapasFromCotizacion } = require('../services/proyectoEtapas.service');
const {
    loadCotizacionEtapasTree,
    syncCotizacionEtapasFromPhases,
    ensureCotizacionEtapasFromJson,
    summarizePhases,
} = require('../services/cotizacionEtapas.service');
const {
    normalizarMatrizBody,
    normalizeInventoryItem,
    inventoryItemToServicioLookup,
    calcularCostoComercialAlquiler,
    normalizeServiceItem,
    normalizeTruckItem,
    resolverServicioCotizacionParaCamion,
    normalizeCotizacionPayload,
    calcularPrecioTotal,
    buildUpsertQuotationResponse,
    mapCotizacionServicioRow,
    splitServiciosPrincipalSecundarios,
    toDateTimeInicio,
    toDateTimeFin,
    serializeEtapasDetalleForDb,
    serializePhasesBodyForDb,
} = require('../services/cotizacionDto.service');
const { mergeSolicitudIntoCotizacionCreate, loadSolicitudDataForCotizacion } = require('../services/solicitudCotizacionImport.service');
const {
    toPrincipalEnum,
    countOccurrences,
    importServicioFlujoToCotizacion,
    assertSinglePrincipal,
    principalToBoolean,
} = require('../services/servicioFlujo.service');
const {
    aplicarFechasServiciosCotizacion,
    calcularPrecioLineaServicios,
    obtenerFechasDesdeCotizacionServicio,
    calcularDiasEntreFechas,
    sincronizarFechasCamionesCotizacion,
    sincronizarInventarioAlquilerCotizacion,
} = require('../services/cotizacionFechas.service');
const {
    archiveCotizacionSnapshot,
    assertCotizacionVigente,
    DESACTUALIZADO_VIGENTE,
} = require('../services/cotizacionVersion.service');

async function ensureCotizacionVigente(cotizacionId, res) {
    const ok = await assertCotizacionVigente(db, cotizacionId);
    if (!ok) {
        res.status(404).json({ error: 'Cotización no encontrada' });
        return false;
    }
    return true;
}

const INVENTARIO_COTIZACION_SELECT = `
    SELECT CI.*, I.nombre_objeto AS Objeto_Nombre,
           CS.fecha_inicio AS servicio_fecha_inicio,
           CS.fecha_finalizacion AS servicio_fecha_fin
    FROM COTIZACION_INVENTARIO CI
    LEFT JOIN INVENTARIO I ON CI.ID_Inventario = I.Id_Objeto
    LEFT JOIN COTIZACION_SERVICIO CS ON CI.servicio_a_alquilar = CS.id
`;
const COTIZACION_VIGENTE_SQL = `desactualizado = '${DESACTUALIZADO_VIGENTE}'`;
const COTIZACION_LISTADO_NORMAL_SQL = `${COTIZACION_VIGENTE_SQL} AND Id_incidencia IS NULL`;
const {
    isServicioPermitidoIncidencia,
    isCotizacionIncidencia,
} = require('../services/cotizacionIncidencia.service');
const {
    listPlazosByCotizacion,
    replacePlazosCotizacion,
    getPagoInicial,
} = require('../services/cotizacionPlazoPago.service');
const { approveCotizacionById } = require('../services/approveCotizacion.service');

async function recalcularCotizacionFechasYPrecio(executor, cotizacionId, {
    fechaInicioProyecto,
    productos = [],
    camiones = [],
    costoRecojo = null,
} = {}) {
    if (fechaInicioProyecto) {
        await aplicarFechasServiciosCotizacion(executor, cotizacionId, fechaInicioProyecto);
        await sincronizarFechasCamionesCotizacion(executor, cotizacionId);
        await sincronizarInventarioAlquilerCotizacion(executor, cotizacionId);
    }
    const { total: serviciosTotal, lineas } = await calcularPrecioLineaServicios(executor, cotizacionId);
    const precioTotal = calcularPrecioTotal({
        productos,
        servicios: lineas.map((l) => ({ precio_linea: l.precio_linea })),
        camiones,
        costoRecojo,
    });
    await executor.query(
        'UPDATE COTIZACION_COMERCIAL SET precio_total = ? WHERE ID = ?',
        [precioTotal, cotizacionId],
    );
    return { precioTotal, lineas_servicios: lineas };
}

function resolverFechaInicioCotizacion(merged, serviciosList) {
    const principal = (serviciosList || []).find((s) => toPrincipalEnum(s.Principal) === 'YES');
    return merged.fecha_inicio_proyecto
        ?? principal?.fecha_inicio
        ?? principal?.startDate
        ?? null;
}

async function loadServiciosInsertadosParaCotizacion(dbConn, cotizacionId) {
    const rows = await dbConn.query(
        `SELECT id, ID_Servicio, Principal, id_servicio_subservicio, fecha_inicio, fecha_finalizacion
         FROM COTIZACION_SERVICIO WHERE ID_Cotizacion = ? AND ID_Servicio != 7 ORDER BY id`,
        [cotizacionId],
    );
    return rows.map((row, index) => ({
        id: row.id,
        index,
        ID_Servicio: row.ID_Servicio,
        Principal: row.Principal,
        id_servicio_subservicio: row.id_servicio_subservicio,
        fecha_inicio: row.fecha_inicio,
        fecha_finalizacion: row.fecha_finalizacion,
    }));
}

async function prepareInventarioAlquilerFields(dbConn, cotizacionId, item, index, serviciosInsertados) {
    if (item.intencion !== 'alquilar') {
        return {
            servicio_a_alquilar: null,
            dias_alquilados: null,
            fecha_salida_taller: null,
            fecha_ingreso_taller: null,
            Costo_Comercial: null,
        };
    }

    const lookup = inventoryItemToServicioLookup(item, index);
    const svc = serviciosInsertados?.length
        ? resolverServicioCotizacionParaCamion(lookup, index, serviciosInsertados, { toPrincipalEnum })
        : null;

    let servicioId = null;
    let fechaInicio = null;
    let fechaFin = null;

    if (svc) {
        servicioId = svc.id;
        fechaInicio = svc.fecha_inicio;
        fechaFin = svc.fecha_finalizacion;
        if ((!fechaInicio || !fechaFin) && dbConn) {
            const fechasDb = await obtenerFechasDesdeCotizacionServicio(dbConn, cotizacionId, svc.id);
            if (fechasDb) {
                fechaInicio = fechasDb.fecha_inicio ?? fechaInicio;
                fechaFin = fechasDb.fecha_finalizacion ?? fechaFin;
            }
        }
    } else if (item.servicio_a_alquilar && dbConn) {
        servicioId = Number(item.servicio_a_alquilar);
        const fechasDb = await obtenerFechasDesdeCotizacionServicio(dbConn, cotizacionId, servicioId);
        if (fechasDb) {
            fechaInicio = fechasDb.fecha_inicio;
            fechaFin = fechasDb.fecha_finalizacion;
        }
    }

    const diasExplicit = item.dias_alquilados != null && item.dias_alquilados !== ''
        ? Number(item.dias_alquilados)
        : null;
    const dias = diasExplicit
        ?? (fechaInicio && fechaFin ? calcularDiasEntreFechas(fechaInicio, fechaFin) : null)
        ?? 0;

    const costo = item.costo_comercial != null
        ? Number(item.costo_comercial)
        : calcularCostoComercialAlquiler(item.precio_unitario, dias);

    return {
        servicio_a_alquilar: servicioId,
        dias_alquilados: dias,
        fecha_salida_taller: fechaInicio
            ? toDateTimeInicio(fechaInicio)
            : (item.fecha_salida_taller ? toDateTimeInicio(item.fecha_salida_taller) : null),
        fecha_ingreso_taller: fechaFin
            ? toDateTimeFin(fechaFin)
            : (item.fecha_ingreso_taller ? toDateTimeFin(item.fecha_ingreso_taller) : null),
        Costo_Comercial: costo,
    };
}

async function updateCamionMetadataIfPresent(dbConn, truck) {
    const placa = truck.Placa ?? truck.placa ?? truck.plate;
    if (!placa) return;

    const sets = [];
    const vals = [];
    const model = truck.model ?? truck.modelo;
    if (model) { sets.push('modelo=?'); vals.push(model); }
    if (truck.color) { sets.push('color=?'); vals.push(truck.color); }
    const maint = truck.maintenanceDate ?? truck.fecha_prox_revision;
    if (maint) { sets.push('fecha_prox_revision=?'); vals.push(maint); }
    const desc = truck.description ?? truck.caracteristicas;
    if (desc) { sets.push('caracteristicas=?'); vals.push(desc); }
    if (!sets.length) return;

    vals.push(placa);
    await dbConn.query(`UPDATE CAMION SET ${sets.join(', ')} WHERE Placa=?`, vals);
}

async function insertarCamionesCotizacion(dbConn, cotizacionId, camionesList, serviciosInsertados) {
    for (let i = 0; i < camionesList.length; i++) {
        const c = camionesList[i];
        const normalized = normalizeTruckItem(c, i);
        const Placa = normalized.Placa;
        if (!Placa) throw new Error('Cada camión requiere plate / Placa / placa');

        await updateCamionMetadataIfPresent(dbConn, normalized);

        const PrecioUnit = normalized.PrecioUnit ?? null;
        const svcLocal = resolverServicioCotizacionParaCamion(
            normalized, i, serviciosInsertados, { toPrincipalEnum },
        );
        if (!svcLocal) {
            throw new Error(
                `Camión ${Placa}: no se pudo vincular a un servicio. `
                + 'Use serviceIndex (índice en services[]), ID_Servicio del catálogo, o uso=id de COTIZACION_SERVICIO',
            );
        }

        let fecha_hora_entrada = toDateTimeInicio(svcLocal.fecha_inicio);
        let fecha_hora_salida = toDateTimeFin(svcLocal.fecha_finalizacion);
        if (!fecha_hora_entrada || !fecha_hora_salida) {
            const fechasDb = await obtenerFechasDesdeCotizacionServicio(dbConn, cotizacionId, svcLocal.id);
            if (fechasDb) {
                fecha_hora_entrada = fechasDb.fecha_hora_entrada;
                fecha_hora_salida = fechasDb.fecha_hora_salida;
            }
        }

        await dbConn.query(
            `INSERT INTO COTIZACION_CAMION
                (ID_Cotizacion, Placa, uso, fecha_hora_entrada, fecha_hora_salida, PrecioUnit)
             VALUES (?,?,?,?,?,?)`,
            [cotizacionId, Placa, svcLocal.id, fecha_hora_entrada, fecha_hora_salida, PrecioUnit],
        );
    }
}

async function insertarInventarioCotizacion(dbConn, cotizacionId, productos, serviciosInsertados = []) {
    for (let i = 0; i < productos.length; i++) {
        const p = normalizeInventoryItem({ ...productos[i], _itemIndex: i });
        if (!p.id) throw new Error('Cada ítem de inventario requiere id');
        const alquiler = await prepareInventarioAlquilerFields(dbConn, cotizacionId, p, i, serviciosInsertados);
        await dbConn.query(
            `INSERT INTO COTIZACION_INVENTARIO
                (ID_Cotizacion, ID_Inventario, cantidad, intencion, dias_alquilados, servicio_a_alquilar,
                 precio_comercial, Costo_Comercial, fecha_salida_taller, fecha_ingreso_taller, observaciones)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [
                cotizacionId,
                p.id,
                p.cantidad,
                p.intencion,
                alquiler.dias_alquilados,
                alquiler.servicio_a_alquilar,
                p.precio_unitario,
                alquiler.Costo_Comercial,
                alquiler.fecha_salida_taller,
                alquiler.fecha_ingreso_taller,
                p.observaciones,
            ],
        );
    }
}

async function insertarServiciosCotizacion(dbConn, cotizacionId, serviciosList) {
    const serviciosInsertados = [];
    const normalizados = serviciosList.map((raw) => ({
        ...normalizeServiceItem(raw),
        Principal: toPrincipalEnum(raw.Principal),
    }));

    await assertSinglePrincipal(normalizados, 'la cotización');

    for (let i = 0; i < normalizados.length; i++) {
        const s = normalizados[i];
        if (!s.ID_Servicio) {
            throw new Error(`servicios[${i}].id / ID_Servicio es requerido`);
        }
        const ins = await dbConn.query(
            `INSERT INTO COTIZACION_SERVICIO
                (ID_Cotizacion, ID_Servicio, fecha_inicio, fecha_finalizacion, jornada_comienzo, jornada_final, precio_comercial, Principal, indicaciones, id_servicio_subservicio)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [
                cotizacionId,
                s.ID_Servicio,
                s.fecha_inicio || null,
                s.fecha_finalizacion || null,
                s.jornada_comienzo || null,
                s.jornada_final || null,
                s.precio_comercial ?? null,
                s.Principal,
                s.indicaciones ?? null,
                s.id_servicio_subservicio ?? null,
            ],
        );
        serviciosInsertados.push({
            id: ins.insertId,
            index: i,
            ID_Servicio: s.ID_Servicio,
            Principal: s.Principal,
            id_servicio_subservicio: s.id_servicio_subservicio ?? null,
            fecha_inicio: s.fecha_inicio,
            fecha_finalizacion: s.fecha_finalizacion,
        });
    }
    return serviciosInsertados;
}

async function aplicarFlujoDesdeSolicitud(dbConn, cotizacionId, idSolicitud, serviciosList, phasesProvided) {
    if (phasesProvided) return { applied: false, reason: 'phases_provided' };

    const solicitudData = await loadSolicitudDataForCotizacion(dbConn, idSolicitud);
    if (!solicitudData) return { applied: false, reason: 'no_solicitud' };

    if (solicitudData.servicioPrincipal) {
        const subservicioIdSet = solicitudData.subservicioIds?.length
            ? new Set(solicitudData.subservicioIds)
            : null;
        const secundarioCounts = subservicioIdSet
            ? null
            : countOccurrences(solicitudData.serviciosSecundariosIds);
        return importServicioFlujoToCotizacion(
            dbConn,
            cotizacionId,
            solicitudData.servicioPrincipal.ID_Servicio,
            subservicioIdSet ? { subservicioIds: subservicioIdSet } : { secundarioCounts },
        );
    }

    const cotPrincipal = (serviciosList || []).find((s) => toPrincipalEnum(s.Principal) === 'YES');
    if (cotPrincipal) {
        const idServicio = cotPrincipal.ID_Servicio ?? cotPrincipal.idServicio ?? cotPrincipal.id;
        return importServicioFlujoToCotizacion(dbConn, cotizacionId, idServicio, {
            onlyManualActivities: true,
        });
    }

    return { applied: false, reason: 'no_principal' };
}

exports.formatQuotation = (row, rol) => {
    let estadoFormateado = "pendiente";
    if (row.estado === "aprobado") estadoFormateado = "aprobado";
    else if (row.estado === "rechazado por cliente" || row.estado === "descartada") estadoFormateado = "rechazado";

    const quotation = {
        ID: row.ID,
        nombre: row.nombre || "",
        precioTotal: row.precio_total ? row.precio_total.toString() : "0.00",
        version: row.version || 1,
        condiciones: {
            fechaEmision: row.fecha_emision ? new Date(row.fecha_emision).toISOString().split('T')[0] : "",
            fechaVigencia: row.fecha_vigencia ? new Date(row.fecha_vigencia).toISOString().split('T')[0] : "",
            condiciones: row.condiciones || "",
            observaciones: row.observacion || ""
        },
        estado: estadoFormateado,
        tasaCambio: {
            tasaCompra: row.tacaCompra || 0,
            tasaVenta: row.tasaVenta || 0
        },
        mensajes: {
            comentarioCliente: row.comentario_cliente || ""
        },
        // Atributos originales no mencionados en el JSON
        id_solicitud: row.id_solicitud,
        DNI_O_RUC: row.DNI_O_RUC,
        Id_incidencia: row.Id_incidencia ?? null,
        esCotizacionIncidencia: Boolean(row.Id_incidencia),
        desactualizado: row.desactualizado ?? DESACTUALIZADO_VIGENTE,
        Tasa_Cambio: row.Tasa_Cambio,
        ordenCompra: row.Orden_compra || null,
        pendienteAprobacionOrden: Boolean(
            row.Orden_compra && row.estado === 'Pendiente',
        ),
    };

    if (rol !== 'cliente' && row.Cliente_Nombre) {
        quotation.nombreCliente = row.Cliente_Nombre;
    }

    return quotation;
};

async function attachPlazosPago(quotation, cotizacionId) {
    const plazos = await listPlazosByCotizacion(cotizacionId);
    quotation.plazos_pago = plazos.map((p) => ({
        id: p.id,
        porcentaje: Number(p.porcentaje),
        plazo_de_pago: Number(p.plazo_de_pago),
        orden: p.orden,
    }));
    quotation.pago_inicial = getPagoInicial(quotation.plazos_pago);
    quotation.requiere_confirmacion_pago_inicial = Boolean(quotation.pago_inicial);
    return quotation;
}

// ── COTIZACION_COMERCIAL ──────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        let query = 'SELECT C_C.*, C.nombre_comercial as Cliente_Nombre FROM COTIZACION_COMERCIAL C_C LEFT JOIN CLIENTE C ON C_C.DNI_O_RUC = C.DNI_O_RUC';
        let countQuery = 'SELECT COUNT(*) as total FROM COTIZACION_COMERCIAL C_C';
        let args = [];
        let countArgs = [];

        const { estado, nombre, con_orden_compra, pendiente_aprobacion } = req.query;
        let whereClauses = [`C_C.${COTIZACION_LISTADO_NORMAL_SQL}`];

        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil);

            const placeholders = clientIds.map(() => '?').join(',');
            whereClauses.push(`(C_C.DNI_O_RUC IN (${placeholders}) OR C_C.id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente IN (${placeholders})))`);
            args.push(...clientIds, ...clientIds);
            countArgs.push(...clientIds, ...clientIds);
        }

        if (estado) {
            whereClauses.push('C_C.estado = ?');
            args.push(estado);
            countArgs.push(estado);
        }

        if (nombre) {
            whereClauses.push('C_C.nombre LIKE ?');
            args.push(`%${nombre}%`);
            countArgs.push(`%${nombre}%`);
        }

        const hasOrdenCompraSql = "(C_C.Orden_compra IS NOT NULL AND C_C.Orden_compra != '')";
        if (con_orden_compra === 'true' || con_orden_compra === '1') {
            whereClauses.push(hasOrdenCompraSql);
        }
        if (pendiente_aprobacion === 'true' || pendiente_aprobacion === '1') {
            whereClauses.push(hasOrdenCompraSql);
            whereClauses.push('C_C.estado = ?');
            args.push('Pendiente');
            countArgs.push('Pendiente');
        }

        if (whereClauses.length > 0) {
            const condition = ' WHERE ' + whereClauses.join(' AND ');
            query += condition;
            countQuery += condition;
        }

        query += ' ORDER BY C_C.ID DESC LIMIT ? OFFSET ?';
        args.push(limit, offset);

        const rows = await db.query(query, args);
        const countResult = await db.query(countQuery, countArgs);
        const total = countResult[0].total;

        res.json({
            data: rows.map(r => exports.formatQuotation(r, req.user ? req.user.rolNormalizado : null)),
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        let query = `SELECT C_C.*, C.nombre_comercial as Cliente_Nombre FROM COTIZACION_COMERCIAL C_C LEFT JOIN CLIENTE C ON C_C.DNI_O_RUC = C.DNI_O_RUC WHERE C_C.ID = ? AND (C_C.${COTIZACION_VIGENTE_SQL} OR C_C.Id_incidencia IS NOT NULL)`;
        let args = [req.params.id];

        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil);

            query += ` AND (C_C.DNI_O_RUC IN (${clientIds.map(() => '?').join(',')}) OR C_C.id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente IN (${clientIds.map(() => '?').join(',')})))`;
            args.push(...clientIds, ...clientIds);
        }

        const rows = await db.query(query, args);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        const quotation = exports.formatQuotation(rows[0], req.user ? req.user.rolNormalizado : null);
        await attachPlazosPago(quotation, req.params.id);
        res.json(quotation);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getDetalles = async (req, res) => {
    try {
        const cotizacionId = req.params.id;

        // Validar permisos si es cliente
        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil);

            const placeholders = clientIds.map(() => '?').join(',');
            const check = await db.query(
                `SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND ${COTIZACION_VIGENTE_SQL} AND (DNI_O_RUC IN (${placeholders}) OR id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente IN (${placeholders})))`,
                [cotizacionId, ...clientIds, ...clientIds]
            );
            if (!check.length) return res.status(403).json({ error: 'No tienes permiso para ver esta cotización' });
        }

        // Obtener datos base de la cotización comercial
        const baseQuery = `SELECT comentario_cliente, fecha_emision, fecha_vigencia, observacion FROM COTIZACION_COMERCIAL WHERE ID = ? AND (${COTIZACION_VIGENTE_SQL} OR Id_incidencia IS NOT NULL)`;
        const baseResult = await db.query(baseQuery, [cotizacionId]);
        if (!baseResult.length) return res.status(404).json({ error: 'Cotización no encontrada' });

        const cotizacionBase = baseResult[0];

        // Obtener inventario
        const invQuery = `
            SELECT 
                c.ID_Inventario AS id, 
                i.nombre_objeto as nombre_producto, 
                c.cantidad,
                c.precio_comercial AS precio_unitario,
                c.intencion,
                c.dias_alquilados
            FROM COTIZACION_INVENTARIO c 
            LEFT JOIN INVENTARIO i ON c.ID_Inventario = i.Id_Objeto 
            WHERE c.ID_Cotizacion = ?
            ORDER BY c.id DESC`;
        const inventarioResult = await db.query(invQuery, [cotizacionId]);

        // Obtener camiones
        const camQuery = `
            SELECT 
                c.Placa as placa, 
                p.Nombre as nombre_piloto 
            FROM COTIZACION_CAMION c 
            LEFT JOIN USUARIO u ON c.ID_Piloto = u.idusuario 
            LEFT JOIN PERFIL p ON u.dni_perfil = p.DNI 
            WHERE c.ID_Cotizacion = ?
            ORDER BY c.id DESC`;
        const camionesResult = await db.query(camQuery, [cotizacionId]);

        // Obtener servicios
        // Nota: se agregó 'NULL as placa' por requerimiento especificado, aunque no exista en los servicios
        const servQuery = `
            SELECT 
                c.id AS idCotizacionServicio,
                c.ID_Servicio as idServicio,
                c.Principal,
                c.indicaciones,
                c.id_servicio_subservicio,
                c.fecha_inicio, 
                c.fecha_finalizacion, 
                c.jornada_comienzo,
                c.jornada_final,
                c.precio_comercial, 
                s.nombre as nombre_servicio 
            FROM COTIZACION_SERVICIO c 
            LEFT JOIN SERVICIO s ON c.ID_Servicio = s.ID_Servicio 
            WHERE c.ID_Cotizacion = ?
            ORDER BY c.Principal ASC, c.id ASC`;
        const serviciosResult = await db.query(servQuery, [cotizacionId]);

        const mapByKey = (arr, key) => arr.reduce((obj, item) => {
            obj[item[key]] = item;
            return obj;
        }, {});
        const inventarioObj = mapByKey(inventarioResult, 'id');
        const camionesObj = mapByKey(camionesResult, 'placa');
        const serviciosMapped = serviciosResult.map((row) => mapCotizacionServicioRow(row));
        const serviciosObj = serviciosMapped.reduce((obj, item, idx) => {
            obj[idx] = item;
            return obj;
        }, {});
        const { servicio_principal, servicios_secundarios } = splitServiciosPrincipalSecundarios(serviciosMapped);
        res.json({
            comentario_cliente: cotizacionBase.comentario_cliente,
            fecha_emision: cotizacionBase.fecha_emision,
            fecha_vigencia: cotizacionBase.fecha_vigencia,
            observacion: cotizacionBase.observacion,
            inventario: inventarioObj,
            camiones: camionesObj,
            servicios: serviciosObj,
            servicio_principal,
            servicios_secundarios,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// ── COTIZACION DETALLES FRANCO ────────────────────────────────────────────────
exports.getDetallesFranco = async (req, res) => {
    try {
        const cotizacionId = req.params.id;

        // Validar permisos si es cliente
        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil);
            const placeholders = clientIds.map(() => '?').join(',');
            const check = await db.query(
                `SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND ${COTIZACION_VIGENTE_SQL} AND (DNI_O_RUC IN (${placeholders}) OR id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente IN (${placeholders})))`,
                [cotizacionId, ...clientIds, ...clientIds]
            );
            if (!check.length) return res.status(403).json({ error: 'No tienes permiso para ver esta cotización' });
        }

        const { estado: estadoFiltro, nombre: nombreFiltro } = req.query;
        let baseQuery = `SELECT * FROM COTIZACION_COMERCIAL WHERE ID = ? AND (${COTIZACION_VIGENTE_SQL} OR Id_incidencia IS NOT NULL)`;
        const baseArgs = [cotizacionId];
        if (estadoFiltro) {
            baseQuery += ' AND estado = ?';
            baseArgs.push(estadoFiltro);
        }
        if (nombreFiltro) {
            baseQuery += ' AND nombre LIKE ?';
            baseArgs.push(`%${nombreFiltro}%`);
        }
        const baseResult = await db.query(baseQuery, baseArgs);
        if (!baseResult.length) return res.status(404).json({ error: 'Cotización no encontrada' });
        const base = baseResult[0];

        // Calcular estado formateado
        let estado = 'pendiente';
        if (base.estado === 'aprobado') estado = 'aprobado';
        else if (base.estado === 'rechazado por cliente' || base.estado === 'descartada') estado = 'rechazado';

        // Obtener información del cliente
        const clienteResult = await db.query(
            'SELECT DNI_O_RUC as documentoIdentidad, nombre_comercial as nombreComercial, razon_social as razonSocial FROM CLIENTE WHERE DNI_O_RUC = ?',
            [base.DNI_O_RUC]
        );
        const cliente = clienteResult[0] || {};

        // Obtener inventario (productos cotizados)
        const invQuery = `
            SELECT 
                c.id,
                c.ID_Inventario AS id_inventario, 
                i.nombre_objeto AS nombre, 
                c.cantidad,
                c.precio_comercial AS precioUnitario,
                c.Costo_Comercial AS costoComercial,
                c.intencion,
                c.dias_alquilados AS diasAlquilados,
                c.servicio_a_alquilar,
                c.fecha_salida_taller AS fechaSalidaTaller,
                c.fecha_ingreso_taller AS fechaIngresoTaller,
                cs.fecha_inicio AS servicioFechaInicio,
                cs.fecha_finalizacion AS servicioFechaFin
            FROM COTIZACION_INVENTARIO c 
            LEFT JOIN INVENTARIO i ON c.ID_Inventario = i.Id_Objeto 
            LEFT JOIN COTIZACION_SERVICIO cs ON c.servicio_a_alquilar = cs.id
            WHERE c.ID_Cotizacion = ?
            ORDER BY c.id DESC`;
        const inventarioResult = await db.query(invQuery, [cotizacionId]);
        const productos = inventarioResult.map(row => ({
            id: row.id_inventario,
            idCotizacionInventario: row.id,
            nombre: row.nombre,
            cantidad: row.cantidad,
            precioUnitario: row.precioUnitario,
            costoComercial: row.costoComercial,
            intencion: row.intencion,
            diasAlquilados: row.diasAlquilados,
            servicio_a_alquilar: row.servicio_a_alquilar,
            idCotizacionServicio: row.servicio_a_alquilar,
            fechaSalidaTaller: row.fechaSalidaTaller,
            fechaIngresoTaller: row.fechaIngresoTaller,
            servicioFechaInicio: row.servicioFechaInicio,
            servicioFechaFin: row.servicioFechaFin,
        }));

        // Obtener camiones con todos sus detalles (se retorna como array)
        const camionesQuery = `
            SELECT 
                cam.Placa AS placa,
                cam.nombre AS nombre,
                cam.ano_fabricacion AS anoFabricacion,
                cam.modelo AS modelo,
                cam.color AS color,
                cam.caracteristicas AS caracteristicas,
                cam.revision_tecnica AS revisionTecnica,
                cam.fecha_prox_revision AS fechaProximaRevision,
                cam.tarjeta_propiedad AS tarjetaPropiedad,
                cam.vencimiento_tarjeta AS vencimientoTarjeta,
                cam.soat_n_poliza AS soatPoliza,
                cam.soat_empresa AS soatEmpresa,
                cam.soat_precio AS soatPrecio,
                cam.soat_dia_pago AS soatDiaPago,
                cc.uso AS uso,
                cc.PrecioUnit AS precioUnit,
                cc.fecha_hora_entrada AS fechaEntrada,
                cc.fecha_hora_salida AS fechaSalida,
                cs.fecha_inicio AS servicioFechaInicio,
                cs.fecha_finalizacion AS servicioFechaFin
            FROM COTIZACION_CAMION cc
            LEFT JOIN CAMION cam ON cc.Placa = cam.Placa
            LEFT JOIN COTIZACION_SERVICIO cs ON cc.uso = cs.id
            WHERE cc.ID_Cotizacion = ?
            ORDER BY cc.id DESC`;
        const camionesResult = await db.query(camionesQuery, [cotizacionId]);
        const camiones = camionesResult.map(cam => ({
            placa: cam.placa,
            nombre: cam.nombre,
            anoFabricacion: cam.anoFabricacion,
            modelo: cam.modelo,
            color: cam.color,
            caracteristicas: cam.caracteristicas,
            revisionTecnica: cam.revisionTecnica,
            fechaProximaRevision: cam.fechaProximaRevision,
            tarjetaPropiedad: cam.tarjetaPropiedad,
            vencimientoTarjeta: cam.vencimientoTarjeta,
            soatPoliza: cam.soatPoliza,
            soatEmpresa: cam.soatEmpresa,
            soatPrecio: cam.soatPrecio,
            soatDiaPago: cam.soatDiaPago,
            uso: cam.uso,
            precioUnit: cam.precioUnit,
            fechaEntrada: cam.fechaEntrada,
            fechaSalida: cam.fechaSalida,
            servicioFechaInicio: cam.servicioFechaInicio,
            servicioFechaFin: cam.servicioFechaFin,
        }));

        // Obtener costo de recojo (COTIZACION_SERVICIO con ID_Servicio = 7)
        const recojoResult = await db.query(
            `SELECT precio_comercial AS costo, fecha_inicio AS fechaRecojo
             FROM COTIZACION_SERVICIO
             WHERE ID_Cotizacion = ? AND ID_Servicio = 7
             LIMIT 1`,
            [cotizacionId]
        );
        const costoRecojo = recojoResult.length > 0 ? {
            costo: recojoResult[0].costo,
            fechaRecojo: recojoResult[0].fechaRecojo,
        } : null;

        // Obtener todos los servicios asociados a la cotización
        const servQuery = `
            SELECT 
                c.id AS idCotizacionServicio,
                c.ID_Servicio as idServicio,
                c.Principal,
                c.indicaciones,
                c.id_servicio_subservicio,
                s.nombre as nombre_servicio,
                s.pago_por_dia,
                c.fecha_inicio,
                c.fecha_finalizacion,
                c.jornada_comienzo,
                c.jornada_final,
                c.precio_comercial
            FROM COTIZACION_SERVICIO c
            LEFT JOIN SERVICIO s ON c.ID_Servicio = s.ID_Servicio
            WHERE c.ID_Cotizacion = ? AND c.ID_Servicio != 7
            ORDER BY c.Principal ASC, c.id ASC`;
        const serviciosResult = await db.query(servQuery, [cotizacionId]);
        const { lineas } = await calcularPrecioLineaServicios(db, cotizacionId);
        const lineasById = new Map(lineas.map((l) => [l.id, l]));
        const servicios = serviciosResult.map((row) => mapCotizacionServicioRow({
            ...row,
            dias: lineasById.get(row.idCotizacionServicio)?.dias,
            precio_linea: lineasById.get(row.idCotizacionServicio)?.precio_linea,
            pago_por_dia: row.pago_por_dia,
        }));
        const { servicio_principal, servicios_secundarios } = splitServiciosPrincipalSecundarios(servicios);

        // Verificar si existen mensajes en el chat de la cotización
        const chatCheck = await db.query(
            'SELECT 1 FROM COTIZACION_CHAT_MENSAJE WHERE id_cotizacion = ? LIMIT 1',
            [cotizacionId]
        );
        const chat = chatCheck.length > 0 ? "si" : "no";

        await ensureCotizacionEtapasFromJson(db, cotizacionId);
        const etapasTree = await loadCotizacionEtapasTree(db, cotizacionId);

        // Construir respuesta (formato UpsertQuotationDTO + legacy)
        const upsertDto = buildUpsertQuotationResponse({
            base,
            etapasTree,
            productosRows: productos.map((p) => ({
                id: p.id,
                nombre: p.nombre,
                cantidad: p.cantidad,
                precio_unitario: p.precioUnitario,
                intencion: p.intencion,
                dias_alquilados: p.diasAlquilados,
                servicio_a_alquilar: p.servicio_a_alquilar,
                idCotizacionServicio: p.idCotizacionServicio,
                costo_comercial: p.costoComercial,
                fecha_salida_taller: p.fechaSalidaTaller,
                fecha_ingreso_taller: p.fechaIngresoTaller,
            })),
            serviciosRows: servicios,
            camionesRows: camiones,
            costoRecojo: costoRecojo ? {
                ...costoRecojo,
                pickupAddress: base.direccion_recojo,
            } : null,
        });

        const phaseSummary = etapasTree.length ? summarizePhases(etapasTree) : null;
        const plazosPayload = await attachPlazosPago({}, base.ID);

        res.json({
            id: base.ID,
            id_solicitud: base.id_solicitud ?? null,
            Id_incidencia: base.Id_incidencia ?? null,
            id_incidencia: base.Id_incidencia ?? null,
            esCotizacionIncidencia: Boolean(base.Id_incidencia),
            plazos_pago: plazosPayload.plazos_pago,
            pago_inicial: plazosPayload.pago_inicial,
            requiere_confirmacion_pago_inicial: plazosPayload.requiere_confirmacion_pago_inicial,
            ...upsertDto,
            // Legacy (compatibilidad con consumidores existentes)
            nombre: base.nombre || '',
            estado,
            version: base.version || 1,
            cliente,
            productos,
            camiones,
            costoRecojo,
            servicios,
            servicio_principal,
            servicios_secundarios,
            chat,
            condiciones: {
                fechaEmision: base.fecha_emision ? new Date(base.fecha_emision).toISOString().split('T')[0] : null,
                fechaVigencia: base.fecha_vigencia ? new Date(base.fecha_vigencia).toISOString().split('T')[0] : null,
                condiciones: base.condiciones || '',
                observaciones: base.observacion || '',
            },
            tipoCambio: {
                tasaCompra: base.tacaCompra || 0,
                tasaVenta: base.tasaVenta || 0,
            },
            etapas: phaseSummary?.etapas ?? base.etapas ?? null,
            duracion_etapa: phaseSummary?.duracion_etapa ?? base.duracion_etapa ?? null,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.create = async (req, res) => {
    const normalized = normalizeCotizacionPayload(req.body);
    const id_solicitud = req.body.id_solicitud ?? normalized.id_solicitud;

    if (!id_solicitud) {
        return res.status(400).json({ error: 'id_solicitud es requerido para crear una cotización' });
    }

    const { merged, solicitudFound } = await mergeSolicitudIntoCotizacionCreate(
        db, id_solicitud, normalized, req.body,
    );
    if (!solicitudFound) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const {
        DNI_O_RUC,
        version,
        comentario_cliente,
        Tasa_Cambio,
        estado,
    } = { ...req.body, ...merged };

    const productos = merged.productos ?? [];
    let serviciosList = merged.servicios ?? [];
    const camionesList = merged.camiones ?? [];
    const costoRecojo = merged.costoRecojo;
    const cond = merged.condiciones;
    const tasaCambio = merged.tasaCambio;
    const nombre = merged.nombre;
    const direccionRecojo = merged.direccion_recojo
        ?? costoRecojo?.direccion_recojo
        ?? null;

    const Id_incidencia = req.body.Id_incidencia ?? normalized.Id_incidencia ?? null;
    if (Id_incidencia) {
        return res.status(400).json({
            error: 'Use POST /api/incidencias/:id/cotizaciones para crear cotizaciones de incidencia',
        });
    }

    const solicitudParaFlujo = await loadSolicitudDataForCotizacion(db, id_solicitud);
    if (solicitudParaFlujo?.servicioPrincipal) {
        const principalId = solicitudParaFlujo.servicioPrincipal.ID_Servicio;
        serviciosList = serviciosList.map((s) => {
            const norm = normalizeServiceItem(s);
            const src = solicitudParaFlujo.servicios.find((x) => x.ID_Servicio === norm.ID_Servicio
                && toPrincipalEnum(x.Principal) === toPrincipalEnum(norm.Principal ?? (norm.ID_Servicio === principalId ? 'YES' : 'NO')));
            const match = src || solicitudParaFlujo.servicios.find((x) => x.ID_Servicio === norm.ID_Servicio);
            return {
                ...norm,
                Principal: norm.ID_Servicio === principalId ? 'YES' : 'NO',
                indicaciones: match?.indicaciones ?? norm.indicaciones,
                id_servicio_subservicio: match?.id_servicio_subservicio ?? s.id_servicio_subservicio ?? s.id_subservicio ?? null,
            };
        });
    }

    try {
        const precioTotal = calcularPrecioTotal({
            productos,
            servicios: serviciosList,
            camiones: camionesList,
            costoRecojo,
        });

        const estadoCot = 'Pendiente';
        const result = await db.query(
            `INSERT INTO COTIZACION_COMERCIAL
                (version, desactualizado, nombre, id_solicitud, DNI_O_RUC, precio_total, estado,
                 comentario_cliente, fecha_emision, fecha_vigencia, observacion,
                 Tasa_Cambio, condiciones, tacaCompra, tasaVenta,
                 etapas, duracion_etapa, etapas_detalle, direccion_recojo, Id_incidencia)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                version || 1,
                DESACTUALIZADO_VIGENTE,
                nombre || null,
                id_solicitud,
                DNI_O_RUC || null,
                precioTotal,
                estadoCot,
                comentario_cliente || null,
                cond?.fechaEmision || null,
                cond?.fechaVigencia || null,
                cond?.observaciones || null,
                Tasa_Cambio || null,
                cond?.condiciones || null,
                tasaCambio?.tasaCompra || null,
                tasaCambio?.tasaVenta || null,
                merged.etapas ?? null,
                merged.duracion_etapa ?? null,
                serializePhasesBodyForDb(merged.phases)
                    ?? serializeEtapasDetalleForDb(merged.etapas_detalle),
                direccionRecojo,
                Id_incidencia,
            ],
        );

        const newId = result.insertId;

        const serviciosInsertados = serviciosList.length
            ? await insertarServiciosCotizacion(db, newId, serviciosList)
            : [];

        if (Array.isArray(productos) && productos.length) {
            await insertarInventarioCotizacion(db, newId, productos, serviciosInsertados);
        }

        if (camionesList.length) {
            if (!serviciosInsertados.length) {
                return res.status(400).json({
                    error: 'Se requiere al menos un servicio en services[] / servicios[] para asociar camiones',
                });
            }
            await insertarCamionesCotizacion(db, newId, camionesList, serviciosInsertados);
        }

        if (costoRecojo?.costo) {
            await db.query(
                'INSERT INTO COTIZACION_SERVICIO (ID_Cotizacion, ID_Servicio, precio_comercial, fecha_inicio) VALUES (?,7,?,?)',
                [newId, costoRecojo.costo, costoRecojo.fechaRecojo || null],
            );
        }

        if (id_solicitud) {
            await db.query(`UPDATE SOLICITUD SET estado = 'aceptado' WHERE ID = ?`, [id_solicitud]);
        }

        if (merged.phasesProvided) {
            await syncCotizacionEtapasFromPhases(db, newId, merged.phases ?? { items: [] });
        } else {
            const flujo = await aplicarFlujoDesdeSolicitud(
                db, newId, id_solicitud, serviciosList, false,
            );
            if (!flujo.imported && merged.etapas_detalle) {
                await ensureCotizacionEtapasFromJson(db, newId);
            }
        }

        const fechaInicioProyecto = resolverFechaInicioCotizacion(merged, serviciosList);
        const { precioTotal: precioFinal } = await recalcularCotizacionFechasYPrecio(db, newId, {
            fechaInicioProyecto,
            productos,
            camiones: camionesList,
            costoRecojo,
        });

        res.status(201).json({
            message: 'Cotización creada',
            ID: newId,
            precio_total: precioFinal,
            fecha_inicio_proyecto: fechaInicioProyecto,
            servicios_insertados: serviciosInsertados.map((s) => ({
                id: s.id,
                index: s.index,
                ID_Servicio: s.ID_Servicio,
                Principal: s.Principal,
                id_servicio_subservicio: s.id_servicio_subservicio,
            })),
            importado_desde_solicitud: true,
        });
    } catch (e) {
        if (e.statusCode === 400) return res.status(400).json({ error: e.message });
        res.status(500).json({ error: e.message });
    }
};

exports.update = async (req, res) => {
    const normalized = normalizeCotizacionPayload(req.body);
    const cotizacionId = req.params.id;
    const {
        id_solicitud,
        id_camion,
        nombre,
        DNI_O_RUC,
        estado,
        comentario_cliente,
        Tasa_Cambio,
    } = { ...req.body, ...normalized };
    const Id_incidencia = req.body.Id_incidencia ?? normalized.Id_incidencia;

    const conn = await db.getConnection();
    const exec = {
        query: async (sql, params) => {
            const [rows] = await conn.query(sql, params);
            return rows;
        },
    };

    try {
        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil);

            const placeholders = clientIds.map(() => '?').join(',');
            const check = await db.query(
                `SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND ${COTIZACION_VIGENTE_SQL} AND (DNI_O_RUC IN (${placeholders}) OR id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente IN (${placeholders})))`,
                [cotizacionId, ...clientIds, ...clientIds],
            );
            if (!check.length) {
                conn.release();
                return res.status(403).json({ error: 'No tienes permiso para editar esta cotización' });
            }
        }

        await conn.beginTransaction();

        const currentRows = await exec.query(
            `SELECT * FROM COTIZACION_COMERCIAL WHERE ID = ? AND ${COTIZACION_VIGENTE_SQL}`,
            [cotizacionId],
        );
        if (!currentRows || !currentRows.length) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ error: 'Cotización no encontrada' });
        }

        const archiveInfo = await archiveCotizacionSnapshot(exec, cotizacionId, currentRows[0]);

        const tieneDatosPrecio = ['productos', 'servicios', 'camiones', 'costoRecojo'].some(
            (k) => normalized[k] !== undefined,
        );
        const precioTotal = tieneDatosPrecio
            ? calcularPrecioTotal({
                productos: normalized.productos,
                servicios: normalized.servicios,
                camiones: normalized.camiones,
                costoRecojo: normalized.costoRecojo,
            })
            : undefined;

        const cond = normalized.condiciones;
        const tasaCambio = normalized.tasaCambio;
        const updateFields = {
            version: archiveInfo.nextVersion,
            desactualizado: DESACTUALIZADO_VIGENTE,
        };
        if (precioTotal !== undefined) updateFields.precio_total = precioTotal;
        if (id_solicitud !== undefined) updateFields.id_solicitud = id_solicitud;
        if (tasaCambio?.tasaCompra !== undefined) updateFields.tacaCompra = tasaCambio.tasaCompra;
        if (tasaCambio?.tasaVenta !== undefined) updateFields.tasaVenta = tasaCambio.tasaVenta;
        if (cond?.fechaEmision !== undefined) updateFields.fecha_emision = cond.fechaEmision;
        if (cond?.fechaVigencia !== undefined) updateFields.fecha_vigencia = cond.fechaVigencia;
        if (cond?.condiciones !== undefined) updateFields.condiciones = cond.condiciones;
        if (cond?.observaciones !== undefined) updateFields.observacion = cond.observaciones;
        if (nombre !== undefined) updateFields.nombre = nombre;
        if (DNI_O_RUC !== undefined) updateFields.DNI_O_RUC = DNI_O_RUC;
        if (estado !== undefined) updateFields.estado = estado;
        if (comentario_cliente !== undefined) updateFields.comentario_cliente = comentario_cliente;
        if (Tasa_Cambio !== undefined) updateFields.Tasa_Cambio = Tasa_Cambio;
        if (normalized.etapas !== undefined) updateFields.etapas = normalized.etapas;
        if (normalized.duracion_etapa !== undefined) updateFields.duracion_etapa = normalized.duracion_etapa;
        if (normalized.phasesProvided) {
            updateFields.etapas_detalle = serializePhasesBodyForDb(normalized.phases ?? { items: [] });
        } else if (normalized.etapas_detalle !== undefined) {
            updateFields.etapas_detalle = serializeEtapasDetalleForDb(normalized.etapas_detalle);
        }
        if (normalized.direccion_recojo !== undefined) updateFields.direccion_recojo = normalized.direccion_recojo;
        if (Id_incidencia !== undefined) updateFields.Id_incidencia = Id_incidencia;

        const setClauses = Object.keys(updateFields).map((k) => `${k}=?`).join(',');
        await exec.query(
            `UPDATE COTIZACION_COMERCIAL SET ${setClauses} WHERE ID=?`,
            [...Object.values(updateFields), cotizacionId],
        );

        let serviciosInsertados = null;

        if (normalized.servicios !== undefined) {
            await exec.query('DELETE FROM COTIZACION_CAMION WHERE ID_Cotizacion = ?', [cotizacionId]);
            await exec.query('DELETE FROM COTIZACION_INVENTARIO WHERE ID_Cotizacion = ?', [cotizacionId]);
            await exec.query(
                'DELETE FROM COTIZACION_SERVICIO WHERE ID_Cotizacion = ? AND ID_Servicio != 7',
                [cotizacionId],
            );
            serviciosInsertados = normalized.servicios.length
                ? await insertarServiciosCotizacion(exec, cotizacionId, normalized.servicios)
                : [];
        }

        if (normalized.productos !== undefined) {
            if (serviciosInsertados === null) {
                await exec.query('DELETE FROM COTIZACION_INVENTARIO WHERE ID_Cotizacion = ?', [cotizacionId]);
            }
            if (normalized.productos.length) {
                const svcParaInventario = serviciosInsertados
                    ?? await loadServiciosInsertadosParaCotizacion(exec, cotizacionId);
                await insertarInventarioCotizacion(exec, cotizacionId, normalized.productos, svcParaInventario);
            }
        }

        if (normalized.camiones !== undefined) {
            if (serviciosInsertados === null) {
                await exec.query('DELETE FROM COTIZACION_CAMION WHERE ID_Cotizacion = ?', [cotizacionId]);
                const existingSvc = await exec.query(
                    `SELECT id, ID_Servicio, Principal, id_servicio_subservicio, fecha_inicio, fecha_finalizacion
                     FROM COTIZACION_SERVICIO
                     WHERE ID_Cotizacion = ? AND ID_Servicio != 7
                     ORDER BY id`,
                    [cotizacionId],
                );
                serviciosInsertados = existingSvc.map((row, index) => ({
                    id: row.id,
                    index,
                    ID_Servicio: row.ID_Servicio,
                    Principal: row.Principal,
                    id_servicio_subservicio: row.id_servicio_subservicio,
                    fecha_inicio: row.fecha_inicio,
                    fecha_finalizacion: row.fecha_finalizacion,
                }));
            }
            if (normalized.camiones.length) {
                if (!serviciosInsertados?.length) {
                    await conn.rollback();
                    conn.release();
                    return res.status(400).json({
                        error: 'Se requiere al menos un servicio para asociar camiones',
                    });
                }
                await insertarCamionesCotizacion(exec, cotizacionId, normalized.camiones, serviciosInsertados);
            }
        } else if (id_camion !== undefined) {
            await exec.query('DELETE FROM COTIZACION_CAMION WHERE ID_Cotizacion = ?', [cotizacionId]);
            if (id_camion) {
                await exec.query(
                    'INSERT INTO COTIZACION_CAMION (ID_Cotizacion, Placa) VALUES (?,?)',
                    [cotizacionId, id_camion],
                );
            }
        }

        if (normalized.phasesProvided) {
            await syncCotizacionEtapasFromPhases(exec, cotizacionId, normalized.phases ?? { items: [] });
        } else if (normalized.servicios !== undefined) {
            const cotRow = currentRows[0];
            const flujo = await aplicarFlujoDesdeSolicitud(
                exec, cotizacionId, cotRow.id_solicitud, normalized.servicios, false,
            );
            if (!flujo.imported && normalized.etapas_detalle !== undefined) {
                await ensureCotizacionEtapasFromJson(exec, cotizacionId);
            }
        } else if (normalized.etapas_detalle !== undefined) {
            await ensureCotizacionEtapasFromJson(exec, cotizacionId);
        }

        if (normalized.costoRecojo !== undefined) {
            await exec.query(
                'DELETE FROM COTIZACION_SERVICIO WHERE ID_Cotizacion = ? AND ID_Servicio = 7',
                [cotizacionId],
            );
            if (normalized.costoRecojo?.costo) {
                await exec.query(
                    'INSERT INTO COTIZACION_SERVICIO (ID_Cotizacion, ID_Servicio, precio_comercial, fecha_inicio) VALUES (?,7,?,?)',
                    [cotizacionId, normalized.costoRecojo.costo, normalized.costoRecojo.fechaRecojo || null],
                );
            }
        }

        await exec.query(`UPDATE SOLICITUD SET estado = 'aceptado' WHERE ID IN (SELECT id_solicitud FROM COTIZACION_COMERCIAL WHERE id_solicitud IS NOT NULL AND ${COTIZACION_VIGENTE_SQL})`);
        await exec.query(`UPDATE SOLICITUD SET estado = 'pendiente' WHERE ID NOT IN (SELECT id_solicitud FROM COTIZACION_COMERCIAL WHERE id_solicitud IS NOT NULL AND ${COTIZACION_VIGENTE_SQL})`);

        const fechaInicioProyecto = resolverFechaInicioCotizacion(
            normalized,
            normalized.servicios ?? [],
        );
        const debeRecalcularFechas = fechaInicioProyecto && (
            normalized.phasesProvided
            || normalized.servicios !== undefined
            || normalized.fecha_inicio_proyecto !== undefined
        );
        let precioFinal = precioTotal;
        if (debeRecalcularFechas || normalized.servicios !== undefined || normalized.phasesProvided) {
            const recalculo = await recalcularCotizacionFechasYPrecio(exec, cotizacionId, {
                fechaInicioProyecto: debeRecalcularFechas ? fechaInicioProyecto : null,
                productos: normalized.productos,
                camiones: normalized.camiones,
                costoRecojo: normalized.costoRecojo,
            });
            precioFinal = recalculo.precioTotal;
        }

        await conn.commit();
        conn.release();

        const response = {
            message: 'Cotización actualizada',
            precio_total: precioFinal,
            fecha_inicio_proyecto: fechaInicioProyecto ?? undefined,
            version: archiveInfo.nextVersion,
            version_archivada: archiveInfo.archivedVersion,
            id_cotizacion_archivada: archiveInfo.archiveId,
        };
        if (serviciosInsertados !== null) {
            response.servicios_insertados = serviciosInsertados.map((s) => ({
                id: s.id,
                index: s.index,
                ID_Servicio: s.ID_Servicio,
                Principal: s.Principal,
                id_servicio_subservicio: s.id_servicio_subservicio,
            }));
            response.nota_servicios = 'Si reemplazaste services[], los id de COTIZACION_SERVICIO cambiaron; usa servicios_insertados o serviceIndex en trucks.';
        }
        res.json(response);
    } catch (e) {
        try { await conn.rollback(); } catch (_) {}
        conn.release();
        if (e.statusCode === 400) return res.status(400).json({ error: e.message });
        if (e.statusCode === 404) return res.status(404).json({ error: e.message });
        res.status(500).json({ error: e.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const result = await db.query(
            `DELETE FROM COTIZACION_COMERCIAL WHERE ID = ? AND ${COTIZACION_VIGENTE_SQL}`,
            [req.params.id],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });

        await db.query(`UPDATE SOLICITUD SET estado = 'pendiente' WHERE ID NOT IN (SELECT id_solicitud FROM COTIZACION_COMERCIAL WHERE id_solicitud IS NOT NULL AND ${COTIZACION_VIGENTE_SQL})`);

        res.json({ message: 'Cotización eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.approve = catchAsync(async (req, res) => {
    const result = await approveCotizacionById(req.params.id);
    res.status(201).json({
        message: 'Cotización aprobada y proyecto creado',
        ...result,
    });
});

// ── COTIZACION_SERVICIO ───────────────────────────────────────────────────────
exports.getServicios = async (req, res) => {
    try {
        if (!(await ensureCotizacionVigente(req.params.id, res))) return;
        const rows = await db.query(
            `SELECT CS.*, S.nombre as Servicio_Nombre, SS.ID_Servicio_subservicio AS subservicio_id_servicio
             FROM COTIZACION_SERVICIO CS
             LEFT JOIN SERVICIO S ON CS.ID_Servicio = S.ID_Servicio
             LEFT JOIN SERVICIO_SUBSERVICIO SS ON CS.id_servicio_subservicio = SS.id
             WHERE CS.ID_Cotizacion = ?
             ORDER BY CS.Principal ASC, CS.id ASC`,
            [req.params.id],
        );
        res.json(rows.map((r) => ({
            ...r,
            Principal: principalToBoolean(r.Principal),
            id_subservicio: r.id_servicio_subservicio ?? null,
        })));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createServicio = async (req, res) => {
    const s = normalizeServiceItem(req.body);
    try {
        if (!(await ensureCotizacionVigente(req.params.id, res))) return;
        if (req.body.Principal !== undefined) {
            return res.status(400).json({ error: 'Principal se asigna al crear la cotización, no al agregar servicios sueltos' });
        }
        if (await isCotizacionIncidencia(db, req.params.id)) {
            if (req.body.Principal === 'YES') {
                return res.status(400).json({ error: 'Las cotizaciones de incidencia no pueden tener servicio principal' });
            }
            const permitido = await isServicioPermitidoIncidencia(db, s.ID_Servicio);
            if (!permitido) {
                return res.status(400).json({ error: 'Servicio no permitido en cotizaciones de incidencia' });
            }
        }
        const result = await db.query(
            `INSERT INTO COTIZACION_SERVICIO
                (ID_Cotizacion, ID_Servicio, fecha_inicio, fecha_finalizacion, jornada_comienzo, jornada_final, precio_comercial, Principal, indicaciones, id_servicio_subservicio)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [req.params.id, s.ID_Servicio, s.fecha_inicio, s.fecha_finalizacion, s.jornada_comienzo, s.jornada_final, s.precio_comercial, 'NO', s.indicaciones ?? null, s.id_servicio_subservicio ?? null],
        );
        res.status(201).json({ message: 'Servicio en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateServicio = async (req, res) => {
    if (req.body.Principal !== undefined) {
        return res.status(400).json({ error: 'No se puede modificar Principal en servicios de cotización' });
    }
    const s = normalizeServiceItem(req.body);
    try {
        if (await isCotizacionIncidencia(db, req.params.id)) {
            const permitido = await isServicioPermitidoIncidencia(db, s.ID_Servicio);
            if (!permitido) {
                return res.status(400).json({ error: 'Servicio no permitido en cotizaciones de incidencia' });
            }
        }
        const result = await db.query(
            `UPDATE COTIZACION_SERVICIO
             SET ID_Servicio=?, fecha_inicio=?, fecha_finalizacion=?, jornada_comienzo=?, jornada_final=?, precio_comercial=?, indicaciones=?, id_servicio_subservicio=?
             WHERE id=? AND ID_Cotizacion=?`,
            [s.ID_Servicio, s.fecha_inicio, s.fecha_finalizacion, s.jornada_comienzo, s.jornada_final, s.precio_comercial, s.indicaciones ?? null, s.id_servicio_subservicio ?? null, req.params.sid, req.params.id],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio en cotización actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteServicio = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM COTIZACION_SERVICIO WHERE id=? AND ID_Cotizacion=?', [req.params.sid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio en cotización eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── COTIZACION_CAMION ─────────────────────────────────────────────────────────
exports.getCamiones = async (req, res) => {
    try {
        if (!(await ensureCotizacionVigente(req.params.id, res))) return;
        res.json(await db.query(
            `SELECT CC.*, C.nombre as Camion_Nombre,
                    CS.fecha_inicio AS servicio_fecha_inicio,
                    CS.fecha_finalizacion AS servicio_fecha_finalizacion
             FROM COTIZACION_CAMION CC
             LEFT JOIN CAMION C ON CC.Placa = C.Placa
             LEFT JOIN COTIZACION_SERVICIO CS ON CC.uso = CS.id
             WHERE CC.ID_Cotizacion = ?
             ORDER BY CC.id DESC`,
            [req.params.id],
        ));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createCamion = async (req, res) => {
    const truck = normalizeTruckItem(req.body, 0);
    const Placa = truck.Placa;
    const precio = truck.PrecioUnit ?? null;
    try {
        await updateCamionMetadataIfPresent(db, truck);
        const svcRows = await db.query(
            `SELECT id, ID_Servicio, Principal, id_servicio_subservicio, fecha_inicio, fecha_finalizacion
             FROM COTIZACION_SERVICIO WHERE ID_Cotizacion = ? AND ID_Servicio != 7 ORDER BY id`,
            [req.params.id],
        );
        const serviciosInsertados = svcRows.map((row, index) => ({
            id: row.id,
            index,
            ID_Servicio: row.ID_Servicio,
            Principal: row.Principal,
            id_servicio_subservicio: row.id_servicio_subservicio,
            fecha_inicio: row.fecha_inicio,
            fecha_finalizacion: row.fecha_finalizacion,
        }));
        const svcLocal = resolverServicioCotizacionParaCamion(truck, 0, serviciosInsertados, { toPrincipalEnum });
        if (!svcLocal) {
            return res.status(400).json({
                error: 'No se pudo vincular el camión. Use serviceIndex, ID_Servicio o uso=id de COTIZACION_SERVICIO',
            });
        }
        const fechas = await obtenerFechasDesdeCotizacionServicio(db, req.params.id, svcLocal.id);
        if (!fechas) {
            return res.status(400).json({ error: 'Servicio de cotización no encontrado para este camión' });
        }
        const result = await db.query(
            `INSERT INTO COTIZACION_CAMION
                (ID_Cotizacion, Placa, uso, fecha_hora_entrada, fecha_hora_salida, PrecioUnit)
             VALUES (?,?,?,?,?,?)`,
            [req.params.id, Placa, fechas.id, fechas.fecha_hora_entrada, fechas.fecha_hora_salida, precio],
        );
        res.status(201).json({ message: 'Camión en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateCamion = async (req, res) => {
    const truck = normalizeTruckItem(req.body, 0);
    const Placa = truck.Placa;
    const precio = truck.PrecioUnit ?? null;
    try {
        await updateCamionMetadataIfPresent(db, truck);
        const svcRows = await db.query(
            `SELECT id, ID_Servicio, Principal, id_servicio_subservicio, fecha_inicio, fecha_finalizacion
             FROM COTIZACION_SERVICIO WHERE ID_Cotizacion = ? AND ID_Servicio != 7 ORDER BY id`,
            [req.params.id],
        );
        const serviciosInsertados = svcRows.map((row, index) => ({
            id: row.id,
            index,
            ID_Servicio: row.ID_Servicio,
            Principal: row.Principal,
            id_servicio_subservicio: row.id_servicio_subservicio,
            fecha_inicio: row.fecha_inicio,
            fecha_finalizacion: row.fecha_finalizacion,
        }));
        const svcLocal = resolverServicioCotizacionParaCamion(truck, 0, serviciosInsertados, { toPrincipalEnum });
        if (!svcLocal) {
            return res.status(400).json({
                error: 'No se pudo vincular el camión. Use serviceIndex, ID_Servicio o uso=id de COTIZACION_SERVICIO',
            });
        }
        const fechas = await obtenerFechasDesdeCotizacionServicio(db, req.params.id, svcLocal.id);
        if (!fechas) {
            return res.status(400).json({ error: 'Servicio de cotización no encontrado para este camión' });
        }
        const result = await db.query(
            `UPDATE COTIZACION_CAMION
             SET Placa=?, uso=?, fecha_hora_entrada=?, fecha_hora_salida=?, PrecioUnit=?
             WHERE id=? AND ID_Cotizacion=?`,
            [Placa, fechas.id, fechas.fecha_hora_entrada, fechas.fecha_hora_salida, precio, req.params.cid, req.params.id],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Camión en cotización actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteCamion = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM COTIZACION_CAMION WHERE id=? AND ID_Cotizacion=?', [req.params.cid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Camión en cotización eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Inventario agregado por servicios de la cotización (COTIZACION_SERVICIO) ──
exports.getInventarioPorServicio = async (req, res) => {
    try {
        if (!(await ensureCotizacionVigente(req.params.id, res))) return;
        const idCotizacion = Number(req.params.id);
        const { cotizacion, items, servicios } = await aggregateInventarioPorCotizacion(db, idCotizacion);

        if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' });

        const data = items.map(({ faltante, costo, ...rest }) => ({
            ...rest,
            costo,
        }));

        res.json({
            ID_Cotizacion: idCotizacion,
            servicios_de_cotizacion: servicios.map((s) => ({
                ID_Servicio: s.ID_Servicio,
                nombre: s.nombre,
            })),
            total_objetos: data.length,
            costo_total_faltante: Math.round(
                data.filter((x) => x.estancia === 'para inventario').reduce((sum, x) => sum + x.costo, 0) * 100,
            ) / 100,
            data,
        });
    } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE' && /SERVICIO_INVENTARIO_REQUERIDO/i.test(e.message)) {
            return res.status(500).json({
                error: 'Tabla SERVICIO_INVENTARIO_REQUERIDO no existe. Ejecute la migración en schema.sql',
            });
        }
        res.status(500).json({ error: e.message });
    }
};

// ── COTIZACION_INVENTARIO ─────────────────────────────────────────────────────
exports.getInventario = async (req, res) => {
    try {
        if (!(await ensureCotizacionVigente(req.params.id, res))) return;
        res.json(await db.query(
            `${INVENTARIO_COTIZACION_SELECT} WHERE CI.ID_Cotizacion = ? ORDER BY CI.id DESC`,
            [req.params.id],
        ));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createInventario = async (req, res) => {
    const p = normalizeInventoryItem(req.body);
    try {
        const serviciosInsertados = await loadServiciosInsertadosParaCotizacion(db, req.params.id);
        const alquiler = await prepareInventarioAlquilerFields(db, req.params.id, p, 0, serviciosInsertados);
        const result = await db.query(
            `INSERT INTO COTIZACION_INVENTARIO
                (ID_Cotizacion, ID_Inventario, cantidad, intencion, dias_alquilados, servicio_a_alquilar,
                 precio_comercial, Costo_Comercial, fecha_salida_taller, fecha_ingreso_taller, observaciones)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [
                req.params.id,
                p.id,
                p.cantidad,
                p.intencion,
                alquiler.dias_alquilados,
                alquiler.servicio_a_alquilar,
                p.precio_unitario,
                alquiler.Costo_Comercial,
                alquiler.fecha_salida_taller,
                alquiler.fecha_ingreso_taller,
                p.observaciones,
            ],
        );
        res.status(201).json({ message: 'Inventario en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateInventario = async (req, res) => {
    const p = normalizeInventoryItem(req.body);
    try {
        const serviciosInsertados = await loadServiciosInsertadosParaCotizacion(db, req.params.id);
        const alquiler = await prepareInventarioAlquilerFields(db, req.params.id, p, 0, serviciosInsertados);
        const result = await db.query(
            `UPDATE COTIZACION_INVENTARIO SET
                ID_Inventario=?, cantidad=?, intencion=?, dias_alquilados=?, servicio_a_alquilar=?,
                precio_comercial=?, Costo_Comercial=?, fecha_salida_taller=?, fecha_ingreso_taller=?, observaciones=?
             WHERE id=? AND ID_Cotizacion=?`,
            [
                p.id,
                p.cantidad,
                p.intencion,
                alquiler.dias_alquilados,
                alquiler.servicio_a_alquilar,
                p.precio_unitario,
                alquiler.Costo_Comercial,
                alquiler.fecha_salida_taller,
                alquiler.fecha_ingreso_taller,
                p.observaciones,
                req.params.iid,
                req.params.id,
            ],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario en cotización actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteInventario = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM COTIZACION_INVENTARIO WHERE id=? AND ID_Cotizacion=?', [req.params.iid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario en cotización eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── COTIZACION_PERSONAL ───────────────────────────────────────────────────────
exports.getPersonal = async (req, res) => {
    try {
        if (!(await ensureCotizacionVigente(req.params.id, res))) return;
        res.json(await db.query('SELECT CP.*, P.Nombre as Personal_Nombre, P.Apellido as Personal_Apellido FROM COTIZACION_PERSONAL CP LEFT JOIN USUARIO U ON CP.ID_Usuario = U.idusuario LEFT JOIN PERFIL P ON U.dni_perfil = P.DNI WHERE CP.ID_Cotizacion = ? ORDER BY CP.id DESC', [req.params.id]));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createPersonal = async (req, res) => {
    const { ID_Usuario, rol_en_trabajo, fecha_entrada, fecha_salida, dias_trabajados } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO COTIZACION_PERSONAL (ID_Cotizacion,ID_Usuario,rol_en_trabajo,fecha_entrada,fecha_salida,dias_trabajados) VALUES (?,?,?,?,?,?)',
            [req.params.id, ID_Usuario, rol_en_trabajo, fecha_entrada, fecha_salida, dias_trabajados]
        );
        res.status(201).json({ message: 'Personal en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updatePersonal = async (req, res) => {
    const { ID_Usuario, rol_en_trabajo, fecha_entrada, fecha_salida, dias_trabajados } = req.body;
    try {
        const result = await db.query(
            'UPDATE COTIZACION_PERSONAL SET ID_Usuario=?, rol_en_trabajo=?, fecha_entrada=?, fecha_salida=?, dias_trabajados=? WHERE id=? AND ID_Cotizacion=?',
            [ID_Usuario, rol_en_trabajo, fecha_entrada, fecha_salida, dias_trabajados, req.params.pid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Personal en cotización actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deletePersonal = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM COTIZACION_PERSONAL WHERE id=? AND ID_Cotizacion=?', [req.params.pid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Personal en cotización eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── COTIZACION_CHAT ───────────────────────────────────────────────────────────
exports.getChatHistory = async (req, res) => {
    try {
        const cotizacionId = req.params.id;
        if (!(await ensureCotizacionVigente(cotizacionId, res))) return;

        // Validar permisos si es cliente
        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil);

            const placeholders = clientIds.map(() => '?').join(',');
            const check = await db.query(
                `SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND ${COTIZACION_VIGENTE_SQL} AND (DNI_O_RUC IN (${placeholders}) OR id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente IN (${placeholders})))`,
                [cotizacionId, ...clientIds, ...clientIds]
            );
            if (!check.length) return res.status(403).json({ error: 'No tienes permiso para ver este chat' });
        }

        const messages = await db.query(
            'SELECT * FROM COTIZACION_CHAT_MENSAJE WHERE id_cotizacion = ? ORDER BY fecha_hora ASC',
            [cotizacionId]
        );

        res.json(messages);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.sendChatMessage = async (req, res) => {
    try {
        const cotizacionId = req.params.id;
        const { mensaje, nombre_remitente } = req.body;

        if (!mensaje) {
            return res.status(400).json({ error: 'El mensaje es requerido' });
        }
        if (!(await ensureCotizacionVigente(cotizacionId, res))) return;

        // Validar permisos si es cliente
        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil);

            const placeholders = clientIds.map(() => '?').join(',');
            const check = await db.query(
                `SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND ${COTIZACION_VIGENTE_SQL} AND (DNI_O_RUC IN (${placeholders}) OR id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente IN (${placeholders})))`,
                [cotizacionId, ...clientIds, ...clientIds]
            );
            if (!check.length) return res.status(403).json({ error: 'No tienes permiso para enviar mensajes en este chat' });
        }

        const tipo_remitente = req.user.rolNormalizado === 'cliente' ? 'cliente' : 'empleado';
        const remitenteId = req.user.dni_perfil || 'sistema';

        const result = await db.query(
            'INSERT INTO COTIZACION_CHAT_MENSAJE (id_cotizacion, id_remitente, tipo_remitente, nombre_remitente, mensaje) VALUES (?, ?, ?, ?, ?)',
            [cotizacionId, remitenteId, tipo_remitente, nombre_remitente || req.user.correo || 'Usuario', mensaje]
        );

        const newMsg = {
            id_mensaje: result.insertId,
            id_cotizacion: Number(cotizacionId),
            id_remitente: remitenteId,
            tipo_remitente,
            nombre_remitente: nombre_remitente || req.user.correo || 'Usuario',
            mensaje,
            fecha_hora: new Date()
        };

        // Emitir por Socket.io si está conectado
        const io = req.app.get('socketio');
        if (io) {
            io.to(cotizacionId).emit('receive_message', newMsg);
        }

        res.status(201).json(newMsg);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// ── ORDEN DE COMPRA (PDF) ───────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const { getQuotationByID, upsertPurchaseOrderFileURL } = require('../repositories/quotation.repository');
const deleteFile = require('../utils/deleteFile');
const { QuotationStatus } = require('../enums/quotation.enums');

exports.uploadOrdenCompra = catchAsync(async (req, res) => {
    const QuotationID = req.params.id;
    if (!QuotationID) {
        return res.status(400).json({ error: 'quotationID no recibido.' });
    }
    const quotation = await getQuotationByID(QuotationID);
    if (!quotation) {
        // Si la cotización no existe, borrar el archivo recién subido
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    if (quotation.estado !== QuotationStatus.PENDING) {
        fs.unlinkSync(req.file.path);
        return res.status(401).json({ error: `Solo se pueden subir ordenes de compra para cotizaciones con el estado: ${QuotationStatus.PENDING}` });
    }

    // Borrar PDF viejo de orden de compra (si existe)
    if (quotation.Orden_compra) {
        deleteFile(quotation.Orden_compra);
    }
    // Actualizar nueva URL relativa en la base de datos
    const NewRelativeUrl = await upsertPurchaseOrderFileURL(req.file.filename, QuotationID);
    res.status(200).json({
        message: 'Orden de compra subida correctamente.',
        url: NewRelativeUrl,
        ruta: NewRelativeUrl,
    });
})

exports.getOrdenCompra = async (req, res) => {
    try {
        const rows = await db.query(
            `SELECT Orden_compra FROM COTIZACION_COMERCIAL WHERE ID = ? AND ${COTIZACION_VIGENTE_SQL}`,
            [req.params.id],
        );
        if (!rows.length) return res.status(404).json({ error: 'Cotización no encontrada' });

        const fileUrl = rows[0].Orden_compra;
        if (!fileUrl) {
            return res.status(404).json({ error: 'No hay ninguna orden de compra guardada para esta cotización' });
        }

        if (req.query.format === 'json') {
            return res.json({
                cotizacionId: Number(req.params.id),
                url: fileUrl,
            });
        }

        // Redirigir a la URL pública (servida por express.static)
        res.redirect(fileUrl);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.getPlazosPago = async (req, res) => {
    try {
        const cotizacionId = Number(req.params.id);
        const rows = await db.query(
            `SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND (desactualizado = 'NO' OR Id_incidencia IS NOT NULL)`,
            [cotizacionId],
        );
        if (!rows.length) return res.status(404).json({ error: 'Cotización no encontrada' });
        const payload = await attachPlazosPago({}, cotizacionId);
        res.json(payload);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.setPlazosPago = async (req, res) => {
    try {
        const cotizacionId = Number(req.params.id);
        const rows = await db.query(
            `SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND desactualizado = 'NO'`,
            [cotizacionId],
        );
        if (!rows.length) return res.status(404).json({ error: 'Cotización no encontrada' });
        const plazos = await replacePlazosCotizacion(cotizacionId, req.body.plazos_pago ?? req.body);
        const payload = await attachPlazosPago({}, cotizacionId);
        res.json({ message: 'Plazos de pago actualizados', plazos_pago: plazos, ...payload });
    } catch (e) { res.status(400).json({ error: e.message }); }
};

