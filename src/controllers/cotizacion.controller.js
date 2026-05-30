const db = require('../config/db');

/** Acepta un objeto, un array, o { [clave]: [...] } */
const normalizarMatrizBody = (body, claveEnvoltorio) => {
    if (Array.isArray(body)) return body;
    if (body && Array.isArray(body[claveEnvoltorio])) return body[claveEnvoltorio];
    if (body && typeof body === 'object' && !Array.isArray(body)) return [body];
    return [];
};

function toDateTimeInicio(fecha) {
    if (!fecha) return null;
    return `${String(fecha).slice(0, 10)} 00:00:00`;
}

function toDateTimeFin(fecha) {
    if (!fecha) return null;
    return `${String(fecha).slice(0, 10)} 23:59:59`;
}

async function obtenerFechasDesdeCotizacionServicio(dbConn, cotizacionId, cotizacionServicioId) {
    const rows = await dbConn.query(
        'SELECT id, fecha_inicio, fecha_finalizacion FROM COTIZACION_SERVICIO WHERE id = ? AND ID_Cotizacion = ?',
        [cotizacionServicioId, cotizacionId],
    );
    if (!rows.length) return null;
    return {
        id: rows[0].id,
        fecha_hora_entrada: toDateTimeInicio(rows[0].fecha_inicio),
        fecha_hora_salida: toDateTimeFin(rows[0].fecha_finalizacion),
    };
}

async function insertarCamionesCotizacion(dbConn, cotizacionId, camionesList, serviciosInsertados) {
    for (const c of camionesList) {
        const Placa = c.Placa || c.placa;
        if (!Placa) throw new Error('Cada camión requiere Placa');
        if (c.uso === undefined || c.uso === null) {
            throw new Error('Cada camión requiere uso (índice en servicios o id de COTIZACION_SERVICIO)');
        }

        const PrecioUnit = c.PrecioUnit ?? c.precioUnit ?? c.preciounit ?? null;
        const n = Number(c.uso);
        let cotizacionServicioId;
        let fecha_hora_entrada;
        let fecha_hora_salida;

        const svcLocal = serviciosInsertados?.[n] ?? serviciosInsertados?.find((s) => s.id === n);
        if (svcLocal) {
            cotizacionServicioId = svcLocal.id;
            fecha_hora_entrada = toDateTimeInicio(svcLocal.fecha_inicio);
            fecha_hora_salida = toDateTimeFin(svcLocal.fecha_finalizacion);
        } else {
            const fechasDb = await obtenerFechasDesdeCotizacionServicio(dbConn, cotizacionId, n);
            if (!fechasDb) {
                throw new Error(`uso ${c.uso} no corresponde a un servicio de la cotización ${cotizacionId}`);
            }
            cotizacionServicioId = fechasDb.id;
            fecha_hora_entrada = fechasDb.fecha_hora_entrada;
            fecha_hora_salida = fechasDb.fecha_hora_salida;
        }

        await dbConn.query(
            `INSERT INTO COTIZACION_CAMION
                (ID_Cotizacion, Placa, uso, fecha_hora_entrada, fecha_hora_salida, PrecioUnit)
             VALUES (?,?,?,?,?,?)`,
            [cotizacionId, Placa, cotizacionServicioId, fecha_hora_entrada, fecha_hora_salida, PrecioUnit],
        );
    }
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
        Tasa_Cambio: row.Tasa_Cambio
    };

    if (rol !== 'cliente' && row.Cliente_Nombre) {
        quotation.nombreCliente = row.Cliente_Nombre;
    }

    return quotation;
};

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

        const { estado, nombre } = req.query;
        let whereClauses = [];

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

        if (whereClauses.length > 0) {
            const condition = ' WHERE ' + whereClauses.join(' AND ');
            query += condition;
            countQuery += condition;
        }

        query += ' LIMIT ? OFFSET ?';
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
        let query = 'SELECT S.*, C.nombre_comercial as Cliente_Nombre FROM SOLICITUD S LEFT JOIN CLIENTE C ON S.Id_Cliente = C.DNI_O_RUC WHERE S.ID = ?';
        let args = [req.params.id];

        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil);

            query += ` AND S.Id_Cliente IN (${clientIds.map(() => '?').join(',')})`;
            args.push(...clientIds);
        }

        const rows = await db.query(query, args);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        const solicitud = rows[0];
        // Obtener datos de subtablas relacionadas
        const [medios, servicios, inventario] = await Promise.all([
            db.query('SELECT * FROM SOLICITUD_MEDIO_COMUNICACION WHERE ID_Solicitud = ?', [req.params.id]),
            db.query('SELECT * FROM SOLICITUD_SERVICIO WHERE ID_Solicitud = ?', [req.params.id]),
            db.query('SELECT SI.*, I.nombre_objeto as Objeto_Nombre FROM SOLICITUD_INVENTARIO SI LEFT JOIN INVENTARIO I ON SI.ID_Inventario = I.Id_Objeto WHERE SI.ID_Solicitud = ?', [req.params.id])
        ]);
        // Devolver la solicitud con sus sub‑arrays
        res.json({
            ...solicitud,
            medios,
            servicios,
            inventario
        });
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
                `SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND (DNI_O_RUC IN (${placeholders}) OR id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente IN (${placeholders})))`,
                [cotizacionId, ...clientIds, ...clientIds]
            );
            if (!check.length) return res.status(403).json({ error: 'No tienes permiso para ver esta cotización' });
        }

        // Obtener datos base de la cotización comercial
        const baseQuery = 'SELECT comentario_cliente, fecha_emision, fecha_vigencia, observacion FROM COTIZACION_COMERCIAL WHERE ID = ?';
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
            WHERE c.ID_Cotizacion = ?`;
        const inventarioResult = await db.query(invQuery, [cotizacionId]);

        // Obtener camiones
        const camQuery = `
            SELECT 
                c.Placa as placa, 
                p.Nombre as nombre_piloto 
            FROM COTIZACION_CAMION c 
            LEFT JOIN USUARIO u ON c.ID_Piloto = u.idusuario 
            LEFT JOIN PERFIL p ON u.dni_perfil = p.DNI 
            WHERE c.ID_Cotizacion = ?`;
        const camionesResult = await db.query(camQuery, [cotizacionId]);

        // Obtener servicios
        // Nota: se agregó 'NULL as placa' por requerimiento especificado, aunque no exista en los servicios
        const servQuery = `
            SELECT 
                NULL as placa,
                c.fecha_inicio, 
                c.fecha_finalizacion, 
                c.precio_comercial, 
                s.nombre as nombre_servicio 
            FROM COTIZACION_SERVICIO c 
            LEFT JOIN SERVICIO s ON c.ID_Servicio = s.ID_Servicio 
            WHERE c.ID_Cotizacion = ?`;
        const serviciosResult = await db.query(servQuery, [cotizacionId]);

        const mapByKey = (arr, key) => arr.reduce((obj, item) => {
            obj[item[key]] = item;
            return obj;
        }, {});
        const inventarioObj = mapByKey(inventarioResult, 'id');
        const camionesObj = mapByKey(camionesResult, 'placa');
        const serviciosObj = serviciosResult.reduce((obj, item, idx) => {
            obj[idx] = item;
            return obj;
        }, {});
        res.json({
            comentario_cliente: cotizacionBase.comentario_cliente,
            fecha_emision: cotizacionBase.fecha_emision,
            fecha_vigencia: cotizacionBase.fecha_vigencia,
            observacion: cotizacionBase.observacion,
            inventario: inventarioObj,
            camiones: camionesObj,
            servicios: serviciosObj
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
                `SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND (DNI_O_RUC IN (${placeholders}) OR id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente IN (${placeholders})))`,
                [cotizacionId, ...clientIds, ...clientIds]
            );
            if (!check.length) return res.status(403).json({ error: 'No tienes permiso para ver esta cotización' });
        }

        const { estado: estadoFiltro, nombre: nombreFiltro } = req.query;
        let baseQuery = 'SELECT * FROM COTIZACION_COMERCIAL WHERE ID = ?';
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
                c.ID_Inventario AS id, 
                i.nombre_objeto AS nombre, 
                c.cantidad,
                c.precio_comercial AS precioUnitario,
                c.intencion,
                c.dias_alquilados AS diasAlquilados
            FROM COTIZACION_INVENTARIO c 
            LEFT JOIN INVENTARIO i ON c.ID_Inventario = i.Id_Objeto 
            WHERE c.ID_Cotizacion = ?`;
        const inventarioResult = await db.query(invQuery, [cotizacionId]);
        const productos = inventarioResult.map(row => ({
            id: row.id,
            nombre: row.nombre,
            cantidad: row.cantidad,
            precioUnitario: row.precioUnitario,
            intencion: row.intencion,
            diasAlquilados: row.diasAlquilados
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
            WHERE cc.ID_Cotizacion = ?`;
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
                s.nombre as nombre_servicio,
                c.fecha_inicio,
                c.fecha_finalizacion,
                c.jornada,
                c.precio_comercial
            FROM COTIZACION_SERVICIO c
            LEFT JOIN SERVICIO s ON c.ID_Servicio = s.ID_Servicio
            WHERE c.ID_Cotizacion = ? AND c.ID_Servicio != 7`;
        const serviciosResult = await db.query(servQuery, [cotizacionId]);
        const servicios = serviciosResult.map(row => ({
            idCotizacionServicio: row.idCotizacionServicio,
            idServicio: row.idServicio,
            nombre: row.nombre_servicio,
            fecha_inicio: row.fecha_inicio,
            fecha_finalizacion: row.fecha_finalizacion,
            jornada: row.jornada,
            precio_comercial: row.precio_comercial,
        }));

        // Verificar si existen mensajes en el chat de la cotización
        const chatCheck = await db.query(
            'SELECT 1 FROM COTIZACION_CHAT_MENSAJE WHERE id_cotizacion = ? LIMIT 1',
            [cotizacionId]
        );
        const chat = chatCheck.length > 0 ? "si" : "no";

        // Construir respuesta
        res.json({
            id: base.ID,
            nombre: base.nombre || '',
            estado,
            version: base.version || 1,
            cliente,
            productos,
            camiones,
            costoRecojo,
            servicios,
            chat,
            condiciones: {
                fechaEmision: base.fecha_emision ? new Date(base.fecha_emision).toISOString().split('T')[0] : null,
                fechaVigencia: base.fecha_vigencia ? new Date(base.fecha_vigencia).toISOString().split('T')[0] : null,
                condiciones: base.condiciones || '',
                observaciones: base.observacion || ''
            },
            tipoCambio: {
                tasaCompra: base.tacaCompra || 0,
                tasaVenta: base.tasaVenta || 0
            },
            // Incluir campos adicionales si existen en la tabla
            etapas: base.etapas !== undefined ? base.etapas : null,
            duracion_etapas: base.duracion_etapas !== undefined ? base.duracion_etapas : null
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.create = async (req, res) => {
    const {
        id_solicitud,
        productos,
        servicios,
        camiones,
        costoRecojo,
        tasaCambio,
        condiciones: cond,
        // Campos legacy opcionales
        version, nombre, DNI_O_RUC, estado, comentario_cliente, Tasa_Cambio
    } = req.body;

    const serviciosList = normalizarMatrizBody(servicios, 'servicios');
    const camionesList = normalizarMatrizBody(camiones, 'camiones');

    try {
        // ── Calcular precio_total ────────────────────────────────────────────────
        let precioTotal = 0;
        if (Array.isArray(productos)) {
            precioTotal += productos.reduce((sum, p) => sum + ((p.precio_unitario || 0) * (p.cantidad || 0)), 0);
        }
        if (serviciosList.length) {
            precioTotal += serviciosList.reduce((sum, s) => sum + Number(s.precio_comercial || 0), 0);
        }
        if (camionesList.length) {
            precioTotal += camionesList.reduce(
                (sum, c) => sum + Number(c.PrecioUnit ?? c.precioUnit ?? c.preciounit ?? 0),
                0,
            );
        }
        if (costoRecojo && costoRecojo.costo) {
            precioTotal += Number(costoRecojo.costo);
        }

        // ── Insertar cabecera de COTIZACION_COMERCIAL ───────────────────────────
        const estadoCot = 'Pendiente';
        const result = await db.query(
            `INSERT INTO COTIZACION_COMERCIAL
                (version, nombre, id_solicitud, DNI_O_RUC, precio_total, estado,
                 comentario_cliente, fecha_emision, fecha_vigencia, observacion,
                 Tasa_Cambio, condiciones, tacaCompra, tasaVenta)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                version || 1,
                nombre || null,
                id_solicitud || null,
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
                tasaCambio?.tasaVenta || null
            ]
        );

        const newId = result.insertId;

        // ── Insertar COTIZACION_INVENTARIO ───────────────────────────────────────
        if (Array.isArray(productos)) {
            for (const p of productos) {
                await db.query(
                    'INSERT INTO COTIZACION_INVENTARIO (ID_Cotizacion, ID_Inventario, cantidad, intencion, precio_comercial) VALUES (?,?,?,?,?)',
                    [newId, p.id, p.cantidad, p.intencion, p.precio_unitario]
                );
            }
        }

        // ── Insertar COTIZACION_SERVICIO (matriz) ────────────────────────────────
        const serviciosInsertados = [];
        for (let i = 0; i < serviciosList.length; i++) {
            const s = serviciosList[i];
            if (!s.ID_Servicio) {
                return res.status(400).json({ error: `servicios[${i}].ID_Servicio es requerido` });
            }
            const ins = await db.query(
                `INSERT INTO COTIZACION_SERVICIO
                    (ID_Cotizacion, ID_Servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial)
                 VALUES (?,?,?,?,?,?)`,
                [
                    newId,
                    s.ID_Servicio,
                    s.fecha_inicio || null,
                    s.fecha_finalizacion || null,
                    s.jornada || null,
                    s.precio_comercial ?? null,
                ],
            );
            serviciosInsertados.push({
                id: ins.insertId,
                index: i,
                fecha_inicio: s.fecha_inicio,
                fecha_finalizacion: s.fecha_finalizacion,
            });
        }

        // ── Insertar COTIZACION_CAMION (matriz; uso → COTIZACION_SERVICIO.id) ───
        if (camionesList.length) {
            if (!serviciosInsertados.length) {
                return res.status(400).json({
                    error: 'Se requiere al menos un servicio en servicios[] para asociar camiones por uso',
                });
            }
            await insertarCamionesCotizacion(db, newId, camionesList, serviciosInsertados);
        }

        // ── Insertar servicio de recojo en COTIZACION_SERVICIO (ID_Servicio=7) ──
        if (costoRecojo && costoRecojo.costo) {
            await db.query(
                'INSERT INTO COTIZACION_SERVICIO (ID_Cotizacion, ID_Servicio, precio_comercial, fecha_inicio) VALUES (?,7,?,?)',
                [newId, costoRecojo.costo, costoRecojo.fechaRecojo || null]
            );
        }

        // ── Actualizar estado de SOLICITUD ───────────────────────────────────────
        if (id_solicitud) {
            await db.query(`UPDATE SOLICITUD SET estado = 'aceptado' WHERE ID = ?`, [id_solicitud]);
        }

        res.status(201).json({
            message: 'Cotización creada',
            ID: newId,
            precio_total: precioTotal,
            servicios_insertados: serviciosInsertados.map((s) => ({ id: s.id, index: s.index })),
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};


exports.update = async (req, res) => {
    const {
        id_solicitud,
        productos,
        id_camion,
        costoRecojo,
        tasaCambio,
        condiciones: cond,
        // Campos opcionales legacy que se mantienen
        version, nombre, DNI_O_RUC, estado, comentario_cliente, Tasa_Cambio
    } = req.body;

    try {
        // ── Verificar permiso si es cliente ─────────────────────────────────────
        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil);

            const placeholders = clientIds.map(() => '?').join(',');
            const check = await db.query(
                `SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND (DNI_O_RUC IN (${placeholders}) OR id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente IN (${placeholders})))`,
                [req.params.id, ...clientIds, ...clientIds]
            );
            if (!check.length) return res.status(403).json({ error: 'No tienes permiso para editar esta cotización' });
        }

        // ── Calcular precio_total ────────────────────────────────────────────────
        let precioTotal = 0;
        if (Array.isArray(productos)) {
            precioTotal += productos.reduce((sum, p) => sum + ((p.precio_unitario || 0) * (p.cantidad || 0)), 0);
        }
        if (costoRecojo && costoRecojo.costo) {
            precioTotal += Number(costoRecojo.costo);
        }

        // ── Actualizar cabecera de COTIZACION_COMERCIAL ─────────────────────────
        const updateFields = {
            precio_total: precioTotal,
        };
        if (id_solicitud !== undefined) updateFields.id_solicitud = id_solicitud;
        if (tasaCambio?.tasaCompra !== undefined) updateFields.tacaCompra = tasaCambio.tasaCompra;
        if (tasaCambio?.tasaVenta !== undefined) updateFields.tasaVenta = tasaCambio.tasaVenta;
        if (cond?.fechaEmision !== undefined) updateFields.fecha_emision = cond.fechaEmision;
        if (cond?.fechaVigencia !== undefined) updateFields.fecha_vigencia = cond.fechaVigencia;
        if (cond?.condiciones !== undefined) updateFields.condiciones = cond.condiciones;
        if (cond?.observaciones !== undefined) updateFields.observacion = cond.observaciones;
        // Campos legacy opcionales
        if (version !== undefined) updateFields.version = version;
        if (nombre !== undefined) updateFields.nombre = nombre;
        if (DNI_O_RUC !== undefined) updateFields.DNI_O_RUC = DNI_O_RUC;
        if (estado !== undefined) updateFields.estado = estado;
        if (comentario_cliente !== undefined) updateFields.comentario_cliente = comentario_cliente;
        if (Tasa_Cambio !== undefined) updateFields.Tasa_Cambio = Tasa_Cambio;

        const setClauses = Object.keys(updateFields).map(k => `${k}=?`).join(',');
        const setValues = Object.values(updateFields);

        const result = await db.query(
            `UPDATE COTIZACION_COMERCIAL SET ${setClauses} WHERE ID=?`,
            [...setValues, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Cotización no encontrada' });

        // ── Sincronizar COTIZACION_INVENTARIO (replace) ─────────────────────────
        if (Array.isArray(productos)) {
            await db.query('DELETE FROM COTIZACION_INVENTARIO WHERE ID_Cotizacion = ?', [req.params.id]);
            for (const p of productos) {
                await db.query(
                    'INSERT INTO COTIZACION_INVENTARIO (ID_Cotizacion, ID_Inventario, cantidad, intencion, precio_comercial) VALUES (?,?,?,?,?)',
                    [req.params.id, p.id, p.cantidad, p.intencion, p.precio_unitario]
                );
            }
        }

        // ── Sincronizar COTIZACION_CAMION (replace) ──────────────────────────────
        if (id_camion !== undefined) {
            await db.query('DELETE FROM COTIZACION_CAMION WHERE ID_Cotizacion = ?', [req.params.id]);
            if (id_camion) {
                await db.query(
                    'INSERT INTO COTIZACION_CAMION (ID_Cotizacion, Placa) VALUES (?,?)',
                    [req.params.id, id_camion]
                );
            }
        }

        // ── Sincronizar servicio de recojo en COTIZACION_SERVICIO (ID_Servicio=7) ─
        if (costoRecojo !== undefined) {
            await db.query(
                'DELETE FROM COTIZACION_SERVICIO WHERE ID_Cotizacion = ? AND ID_Servicio = 7',
                [req.params.id]
            );
            if (costoRecojo && costoRecojo.costo) {
                await db.query(
                    'INSERT INTO COTIZACION_SERVICIO (ID_Cotizacion, ID_Servicio, precio_comercial, fecha_inicio) VALUES (?,7,?,?)',
                    [req.params.id, costoRecojo.costo, costoRecojo.fechaRecojo || null]
                );
            }
        }

        // ── Sincronizar estados de SOLICITUD ─────────────────────────────────────
        await db.query(`UPDATE SOLICITUD SET estado = 'aceptado' WHERE ID IN (SELECT id_solicitud FROM COTIZACION_COMERCIAL WHERE id_solicitud IS NOT NULL)`);
        await db.query(`UPDATE SOLICITUD SET estado = 'pendiente' WHERE ID NOT IN (SELECT id_solicitud FROM COTIZACION_COMERCIAL WHERE id_solicitud IS NOT NULL)`);

        res.json({ message: 'Cotización actualizada', precio_total: precioTotal });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM COTIZACION_COMERCIAL WHERE ID = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });

        await db.query(`UPDATE SOLICITUD SET estado = 'pendiente' WHERE ID NOT IN (SELECT id_solicitud FROM COTIZACION_COMERCIAL WHERE id_solicitud IS NOT NULL)`);

        res.json({ message: 'Cotización eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── COTIZACION_SERVICIO ───────────────────────────────────────────────────────
exports.getServicios = async (req, res) => {
    try { res.json(await db.query('SELECT CS.*, S.nombre as Servicio_Nombre FROM COTIZACION_SERVICIO CS LEFT JOIN SERVICIO S ON CS.ID_Servicio = S.ID_Servicio WHERE CS.ID_Cotizacion = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createServicio = async (req, res) => {
    const { ID_Servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO COTIZACION_SERVICIO (ID_Cotizacion,ID_Servicio,fecha_inicio,fecha_finalizacion,jornada,precio_comercial) VALUES (?,?,?,?,?,?)',
            [req.params.id, ID_Servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial]
        );
        res.status(201).json({ message: 'Servicio en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateServicio = async (req, res) => {
    const { ID_Servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial } = req.body;
    try {
        const result = await db.query(
            'UPDATE COTIZACION_SERVICIO SET ID_Servicio=?, fecha_inicio=?, fecha_finalizacion=?, jornada=?, precio_comercial=? WHERE id=? AND ID_Cotizacion=?',
            [ID_Servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial, req.params.sid, req.params.id]
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
        res.json(await db.query(
            `SELECT CC.*, C.nombre as Camion_Nombre,
                    CS.fecha_inicio AS servicio_fecha_inicio,
                    CS.fecha_finalizacion AS servicio_fecha_finalizacion
             FROM COTIZACION_CAMION CC
             LEFT JOIN CAMION C ON CC.Placa = C.Placa
             LEFT JOIN COTIZACION_SERVICIO CS ON CC.uso = CS.id
             WHERE CC.ID_Cotizacion = ?`,
            [req.params.id],
        ));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createCamion = async (req, res) => {
    const { Placa, uso, PrecioUnit, preciounit } = req.body;
    const precio = PrecioUnit ?? preciounit ?? null;
    try {
        const fechas = await obtenerFechasDesdeCotizacionServicio(db, req.params.id, uso);
        if (!fechas) {
            return res.status(400).json({ error: 'uso debe ser el id de un COTIZACION_SERVICIO de esta cotización' });
        }
        const result = await db.query(
            `INSERT INTO COTIZACION_CAMION
                (ID_Cotizacion, Placa, uso, fecha_hora_entrada, fecha_hora_salida, PrecioUnit)
             VALUES (?,?,?,?,?,?)`,
            [req.params.id, Placa, uso, fechas.fecha_hora_entrada, fechas.fecha_hora_salida, precio],
        );
        res.status(201).json({ message: 'Camión en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateCamion = async (req, res) => {
    const { Placa, uso, PrecioUnit, preciounit } = req.body;
    const precio = PrecioUnit ?? preciounit ?? null;
    try {
        const fechas = await obtenerFechasDesdeCotizacionServicio(db, req.params.id, uso);
        if (!fechas) {
            return res.status(400).json({ error: 'uso debe ser el id de un COTIZACION_SERVICIO de esta cotización' });
        }
        const result = await db.query(
            `UPDATE COTIZACION_CAMION
             SET Placa=?, uso=?, fecha_hora_entrada=?, fecha_hora_salida=?, PrecioUnit=?
             WHERE id=? AND ID_Cotizacion=?`,
            [Placa, uso, fechas.fecha_hora_entrada, fechas.fecha_hora_salida, precio, req.params.cid, req.params.id],
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

// ── COTIZACION_INVENTARIO ─────────────────────────────────────────────────────
exports.getInventario = async (req, res) => {
    try { res.json(await db.query('SELECT CI.*, I.nombre_objeto as Objeto_Nombre FROM COTIZACION_INVENTARIO CI LEFT JOIN INVENTARIO I ON CI.ID_Inventario = I.Id_Objeto WHERE CI.ID_Cotizacion = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createInventario = async (req, res) => {
    const { ID_Inventario, cantidad, intencion, dias_alquilados, precio_comercial, costo_comercial, fecha_salida_taller, fecha_ingreso_taller, observaciones } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO COTIZACION_INVENTARIO (ID_Cotizacion,ID_Inventario,cantidad,intencion,dias_alquilados,precio_comercial,costo_comercial,fecha_salida_taller,fecha_ingreso_taller,observaciones) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [req.params.id, ID_Inventario, cantidad, intencion, dias_alquilados, precio_comercial, costo_comercial, fecha_salida_taller, fecha_ingreso_taller, observaciones]
        );
        res.status(201).json({ message: 'Inventario en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateInventario = async (req, res) => {
    const { ID_Inventario, cantidad, intencion, dias_alquilados, precio_comercial, costo_comercial, fecha_salida_taller, fecha_ingreso_taller, observaciones } = req.body;
    try {
        const result = await db.query(
            'UPDATE COTIZACION_INVENTARIO SET ID_Inventario=?, cantidad=?, intencion=?, dias_alquilados=?, precio_comercial=?, costo_comercial=?, fecha_salida_taller=?, fecha_ingreso_taller=?, observaciones=? WHERE id=? AND ID_Cotizacion=?',
            [ID_Inventario, cantidad, intencion, dias_alquilados, precio_comercial, costo_comercial, fecha_salida_taller, fecha_ingreso_taller, observaciones, req.params.iid, req.params.id]
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
    try { res.json(await db.query('SELECT CP.*, P.Nombre as Personal_Nombre, P.Apellido as Personal_Apellido FROM COTIZACION_PERSONAL CP LEFT JOIN USUARIO U ON CP.ID_Usuario = U.idusuario LEFT JOIN PERFIL P ON U.dni_perfil = P.DNI WHERE CP.ID_Cotizacion = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
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

        // Validar permisos si es cliente
        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil);

            const placeholders = clientIds.map(() => '?').join(',');
            const check = await db.query(
                `SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND (DNI_O_RUC IN (${placeholders}) OR id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente IN (${placeholders})))`,
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

        // Validar permisos si es cliente
        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil);

            const placeholders = clientIds.map(() => '?').join(',');
            const check = await db.query(
                `SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND (DNI_O_RUC IN (${placeholders}) OR id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente IN (${placeholders})))`,
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

exports.uploadOrdenCompra = async (req, res) => {
    try {
        const cotizacionId = req.params.id;
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        // Obtener la cotización actual para ver si ya tenía un PDF y borrarlo
        const rows = await db.query('SELECT Orden_compra FROM COTIZACION_COMERCIAL WHERE ID = ?', [cotizacionId]);
        if (!rows.length) {
            // Si la cotización no existe, borrar el archivo recién subido
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Cotización no encontrada' });
        }

        const oldUrl = rows[0].Orden_compra;
        if (oldUrl) {
            // Borrar el archivo viejo (la BD guarda URL relativa, lo convertimos a ruta absoluta)
            const oldAbsPath = path.join(__dirname, '../../', oldUrl);
            try {
                if (fs.existsSync(oldAbsPath)) fs.unlinkSync(oldAbsPath);
            } catch (err) {
                console.error("No se pudo borrar el PDF antiguo:", err);
            }
        }

        // Guardar URL relativa en la base de datos (ej: /uploads/cotizaciones/orden_compra_xxx.pdf)
        const relativeUrl = `/uploads/cotizaciones/${req.file.filename}`;
        await db.query('UPDATE COTIZACION_COMERCIAL SET Orden_compra = ? WHERE ID = ?', [relativeUrl, cotizacionId]);

        // === AUTO-CREACIÓN DEL PROYECTO ===
        try {
            // Verificar si ya existe un proyecto para esta cotización
            const projCheck = await db.query('SELECT id_Proyecto FROM PROYECTO WHERE id_cotizacion = ?', [cotizacionId]);
            
            if (projCheck.length === 0) {
                // Obtener datos de la cotización
                const cotData = await db.query('SELECT DNI_O_RUC, id_solicitud, nombre FROM COTIZACION_COMERCIAL WHERE ID = ?', [cotizacionId]);
                if (cotData.length > 0) {
                    const clienteId = cotData[0].DNI_O_RUC;
                    const idSolicitud = cotData[0].id_solicitud;
                    const nombreCot = cotData[0].nombre;
                    let ubicacion = null;
                    let descripcionServicio = `Proyecto autogenerado a partir de la cotización: ${nombreCot}`;

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

                    // URL de redireccionamiento para descargar el PDF desde el front
                    const urlDescargaPdf = `/api/cotizaciones/${cotizacionId}/orden-compra`;

                    // 2. Crear el Proyecto
                    const projResult = await db.query(
                        `INSERT INTO PROYECTO (descripcion_servicio, ID_Trabajo, Id_Cliente, ubicacion, id_cotizacion, orden_servicio, estado, fecha_inicio, fecha_fin) 
                         VALUES (?, ?, ?, ?, ?, ?, 'No iniciado', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY))`,
                        [descripcionServicio, idTrabajo, clienteId, ubicacion, cotizacionId, urlDescargaPdf]
                    );
                    const idProyecto = projResult.insertId;

                    // Actualizar Id_Proyecto en Trabajo
                    await db.query('UPDATE TRABAJO SET Id_Proyecto = ? WHERE Id_trabajo = ?', [idProyecto, idTrabajo]);

                    // 3. Migrar Inventario (COTIZACION_INVENTARIO -> PROYECTO_INVENTARIO)
                    const inventarios = await db.query('SELECT ID_Inventario, cantidad, observaciones AS razon FROM COTIZACION_INVENTARIO WHERE ID_Cotizacion = ?', [cotizacionId]);
                    for (const inv of inventarios) {
                        await db.query(
                            'INSERT INTO PROYECTO_INVENTARIO (id_Proyecto, Id_Objeto, cantidad_objeto, razon, estado) VALUES (?, ?, ?, ?, ?)',
                            [idProyecto, inv.ID_Inventario, inv.cantidad, inv.razon, 'aceptable']
                        );
                    }

                    // 4. Migrar Camiones (COTIZACION_CAMION -> PROYECTO_CAMION)
                    const camiones = await db.query(
                        `SELECT cc.Placa, cc.fecha_hora_entrada, cc.fecha_hora_salida, cc.uso, cs.ID_Servicio
                         FROM COTIZACION_CAMION cc
                         LEFT JOIN COTIZACION_SERVICIO cs ON cc.uso = cs.id
                         WHERE cc.ID_Cotizacion = ?`,
                        [cotizacionId],
                    );
                    for (const cam of camiones) {
                        await db.query(
                            'INSERT INTO PROYECTO_CAMION (id_Proyecto, Placa, fecha_hora_entrada, fecha_hora_salida, personal_manejando, razon, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [idProyecto, cam.Placa, cam.fecha_hora_entrada, cam.fecha_hora_salida, null, cam.uso, 'aceptable'],
                        );
                    }

                    // 5. Migrar Personal (COTIZACION_PERSONAL -> TRABAJO_JORNADA)
                    const personal = await db.query('SELECT ID_Usuario, fecha_entrada, fecha_salida FROM COTIZACION_PERSONAL WHERE ID_Cotizacion = ?', [cotizacionId]);
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
                }
            }
        } catch (err) {
            console.error("Error al autogenerar el proyecto:", err);
        }
        // ==================================

        res.json({ message: 'Orden de compra subida correctamente. Proyecto sincronizado.', url: relativeUrl });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.getOrdenCompra = async (req, res) => {
    try {
        const rows = await db.query('SELECT Orden_compra FROM COTIZACION_COMERCIAL WHERE ID = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Cotización no encontrada' });

        const fileUrl = rows[0].Orden_compra;
        if (!fileUrl) {
            return res.status(404).json({ error: 'No hay ninguna orden de compra guardada para esta cotización' });
        }

        // Redirigir a la URL pública (servida por express.static)
        res.redirect(fileUrl);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

