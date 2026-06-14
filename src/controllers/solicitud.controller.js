const db = require('../config/db');
const {
    parseServiciosInput,
    insertarServiciosSolicitud,
    listarServiciosSolicitud,
    enriquecerFlujoSolicitud,
} = require('../services/solicitudServicio.service');

/** Acepta un objeto, un array, o { servicios: [...] } */
const normalizarMatrizBody = (body, claveEnvoltorio) => {
    if (Array.isArray(body)) return body;
    if (body && Array.isArray(body[claveEnvoltorio])) return body[claveEnvoltorio];
    if (body && typeof body === 'object') return [body];
    return [];
};

async function obtenerServiciosSolicitud(idSolicitud) {
    return db.query(
        'SELECT id, Principal FROM SOLICITUD_SERVICIO WHERE ID_Solicitud = ?',
        [idSolicitud],
    );
}

async function cargarDetalleSolicitud(idSolicitud) {
    const [medios, servicios, inventario, camiones] = await Promise.all([
        db.query('SELECT * FROM SOLICITUD_MEDIO_COMUNICACION WHERE ID_Solicitud = ? ORDER BY id DESC', [idSolicitud]),
        listarServiciosSolicitud(db, idSolicitud),
        db.query(
            'SELECT SI.*, I.nombre_objeto as nombre, I.precio_comercial as precio_unitario FROM SOLICITUD_INVENTARIO SI LEFT JOIN INVENTARIO I ON SI.ID_Inventario = I.Id_Objeto WHERE SI.ID_Solicitud = ? ORDER BY SI.id DESC',
            [idSolicitud],
        ),
        db.query(
            `SELECT SC.*, C.nombre as camion_nombre, C.modelo as camion_modelo
             FROM SOLICITUD_CAMION SC
             LEFT JOIN CAMION C ON SC.id_camion = C.Placa
             WHERE SC.ID_Solicitud = ?
             ORDER BY SC.id DESC`,
            [idSolicitud],
        ),
    ]);
    const flujo = await enriquecerFlujoSolicitud(db, servicios);
    return {
        medios,
        servicios,
        inventario,
        camiones,
        etapas: flujo.etapas,
        servicio_principal: flujo.servicio_principal,
        servicios_secundarios: flujo.servicios_secundarios,
    };
}

// ── SOLICITUD ─────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        let query = 'SELECT S.*, C.nombre_comercial as Cliente_Nombre, C.razon_social as Razon_Social FROM SOLICITUD S LEFT JOIN CLIENTE C ON S.Id_Cliente = C.DNI_O_RUC';
        let countQuery = 'SELECT COUNT(*) as total FROM SOLICITUD S LEFT JOIN CLIENTE C ON S.Id_Cliente = C.DNI_O_RUC';
        let args = [];
        let countArgs = [];

        const { estado, nombre } = req.query;
        let whereClauses = [];

        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil); // Por si su DNI es directamente un cliente

            whereClauses.push(`S.Id_Cliente IN (${clientIds.map(() => '?').join(',')})`);
            args.push(...clientIds);
            countArgs.push(...clientIds);
        }

        if (estado) {
            whereClauses.push('S.estado = ?');
            args.push(estado);
            countArgs.push(estado);
        }

        if (nombre) {
            whereClauses.push('C.nombre_comercial LIKE ?');
            args.push(`%${nombre}%`);
            countArgs.push(`%${nombre}%`);
        }

        if (whereClauses.length > 0) {
            const condition = ' WHERE ' + whereClauses.join(' AND ');
            query += condition;
            countQuery += condition;
        }

        query += ' ORDER BY S.ID DESC LIMIT ? OFFSET ?';
        args.push(limit, offset);

        const rows = await db.query(query, args);
        const countResult = await db.query(countQuery, countArgs);
        const total = countResult[0].total;

        const detailedRows = await Promise.all(rows.map(async (solicitud) => {
            const detalle = await cargarDetalleSolicitud(solicitud.ID);
            return { ...solicitud, ...detalle };
        }));

        res.json({
            data: detailedRows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getByEstado = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const estado = req.params.estado;

        let query = 'SELECT S.*, C.nombre_comercial as Cliente_Nombre, C.razon_social as Razon_Social FROM SOLICITUD S LEFT JOIN CLIENTE C ON S.Id_Cliente = C.DNI_O_RUC WHERE S.estado = ?';
        let countQuery = 'SELECT COUNT(*) as total FROM SOLICITUD S WHERE S.estado = ?';
        let args = [estado];
        let countArgs = [estado];

        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil); 

            query += ` AND S.Id_Cliente IN (${clientIds.map(() => '?').join(',')})`;
            countQuery += ` AND S.Id_Cliente IN (${clientIds.map(() => '?').join(',')})`;
            args.push(...clientIds);
            countArgs.push(...clientIds);
        }

        query += ' ORDER BY S.ID DESC LIMIT ? OFFSET ?';
        args.push(limit, offset);

        const rows = await db.query(query, args);
        const countResult = await db.query(countQuery, countArgs);
        const total = countResult[0].total;

        const detailedRows = await Promise.all(rows.map(async (solicitud) => {
            const detalle = await cargarDetalleSolicitud(solicitud.ID);
            return { ...solicitud, ...detalle };
        }));

        res.json({
            data: detailedRows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        let query = 'SELECT S.*, C.nombre_comercial as Cliente_Nombre, C.razon_social as Razon_Social FROM SOLICITUD S LEFT JOIN CLIENTE C ON S.Id_Cliente = C.DNI_O_RUC WHERE S.ID = ?';
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
        const detalle = await cargarDetalleSolicitud(req.params.id);
        res.json({ ...solicitud, ...detalle });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { Id_Cliente, descripcion, ubicacion, productoenvio, camionesenvio, obsgenerales, obseleccion, Respuesta } = req.body;
    const estado = 'pendiente';
    const serviciosItems = parseServiciosInput(req.body);
    try {
        let clientIdToUse = Id_Cliente;
        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            if (contactos.length > 0) {
                clientIdToUse = contactos[0].DNI_O_RUC;
            } else {
                clientIdToUse = req.user.dni_perfil;
            }
        }

        const result = await db.query(
            'INSERT INTO SOLICITUD (Id_Cliente,descripcion,ubicacion,ProductoEnvio,CamionesEnvio,ObsGenerales,ObsEleccion,estado,Respuesta) VALUES (?,?,?,?,?,?,?,?,?)',
            [clientIdToUse, descripcion, ubicacion, productoenvio, camionesenvio, obsgenerales, obseleccion, estado, Respuesta]
        );
        const newId = result.insertId;

        let serviciosInsertados = [];
        if (serviciosItems.length) {
            await insertarServiciosSolicitud(db, newId, serviciosItems);
            serviciosInsertados = await listarServiciosSolicitud(db, newId);
        }

        res.status(201).json({
            message: 'Solicitud creada',
            ID: newId,
            servicios: serviciosInsertados,
        });
    } catch (e) {
        if (e.statusCode === 400) return res.status(400).json({ error: e.message });
        res.status(500).json({ error: e.message });
    }
};

exports.update = async (req, res) => {
    const { Id_Cliente, descripcion, ubicacion, productoenvio, camionesenvio, obsgenerales, obseleccion, estado, Respuesta, FechaCreacion } = req.body;
    try {
        let clientIdToUse = Id_Cliente;
        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            if (contactos.length > 0) {
                clientIdToUse = contactos[0].DNI_O_RUC;
            } else {
                clientIdToUse = req.user.dni_perfil;
            }
            const check = await db.query('SELECT ID FROM SOLICITUD WHERE ID = ? AND Id_Cliente = ?', [req.params.id, clientIdToUse]);
            if (!check.length) return res.status(403).json({ error: 'No autorizado' });
        }

        const result = await db.query(
            'UPDATE SOLICITUD SET Id_Cliente=?,descripcion=?,ubicacion=?,ProductoEnvio=?,CamionesEnvio=?,ObsGenerales=?,ObsEleccion=?,estado=?,Respuesta=?,FechaCreacion=? WHERE ID=?',
            [clientIdToUse, descripcion, ubicacion, productoenvio, camionesenvio, obsgenerales, obseleccion, estado, Respuesta, FechaCreacion, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Solicitud actualizada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        let query = 'DELETE FROM SOLICITUD WHERE ID = ?';
        let args = [req.params.id];

        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil);

            query += ` AND Id_Cliente IN (${clientIds.map(() => '?').join(',')})`;
            args.push(...clientIds);
        }

        const result = await db.query(query, args);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado o no autorizado' });
        res.json({ message: 'Solicitud eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SOLICITUD_MEDIO_COMUNICACION ──────────────────────────────────────────────
exports.getMedios = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM SOLICITUD_MEDIO_COMUNICACION WHERE ID_Solicitud = ? ORDER BY id DESC', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createMedio = async (req, res) => {
    const { cliente_email, cliente_telefono } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO SOLICITUD_MEDIO_COMUNICACION (ID_Solicitud,cliente_email,cliente_telefono) VALUES (?,?,?)',
            [req.params.id, cliente_email, cliente_telefono]
        );
        res.status(201).json({ message: 'Medio de comunicación creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateMedio = async (req, res) => {
    const { cliente_email, cliente_telefono } = req.body;
    try {
        const result = await db.query(
            'UPDATE SOLICITUD_MEDIO_COMUNICACION SET cliente_email=?, cliente_telefono=? WHERE id=? AND ID_Solicitud=?',
            [cliente_email, cliente_telefono, req.params.mid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Medio de comunicación actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteMedio = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM SOLICITUD_MEDIO_COMUNICACION WHERE id=? AND ID_Solicitud=?', [req.params.mid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Medio de comunicación eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SOLICITUD_SERVICIO ────────────────────────────────────────────────────────
exports.getServicios = async (req, res) => {
    try {
        res.json(await listarServiciosSolicitud(db, req.params.id));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createServicio = async (req, res) => {
    try {
        const items = parseServiciosInput(req.body);
        if (!items.length) {
            return res.status(400).json({ error: 'Se requiere un servicio o un arreglo de servicios' });
        }

        const existentes = await obtenerServiciosSolicitud(req.params.id);
        const yaTienePrincipal = existentes.some((e) => e.Principal === 'YES');

        const insertados = await insertarServiciosSolicitud(db, req.params.id, items, { yaTienePrincipal });
        const todos = await listarServiciosSolicitud(db, req.params.id);
        const nuevos = todos.filter((s) => insertados.some((i) => i.id === s.id));

        if (nuevos.length === 1) {
            return res.status(201).json({ message: 'Servicio en solicitud creado', ...nuevos[0] });
        }
        res.status(201).json({ message: 'Servicios en solicitud creados', data: nuevos });
    } catch (e) {
        if (e.statusCode === 400) return res.status(400).json({ error: e.message });
        res.status(500).json({ error: e.message });
    }
};

exports.updateServicio = async (req, res) => {
    if (req.body.Principal !== undefined) {
        return res.status(400).json({ error: 'No se puede modificar Principal después de crear la solicitud' });
    }

    const { ID_Servicio, fecha_inicio_servicio, fecha_fin_servicio, horario_servicio, indicaciones } = req.body;
    try {
        const result = await db.query(
            `UPDATE SOLICITUD_SERVICIO
             SET ID_Servicio=?, fecha_inicio_servicio=?, fecha_fin_servicio=?, horario_servicio=?, indicaciones=?
             WHERE id=? AND ID_Solicitud=?`,
            [ID_Servicio, fecha_inicio_servicio, fecha_fin_servicio, horario_servicio, indicaciones ?? null, req.params.sid, req.params.id],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio en solicitud actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteServicio = async (req, res) => {
    try {
        const actual = await db.query(
            'SELECT Principal FROM SOLICITUD_SERVICIO WHERE id=? AND ID_Solicitud=?',
            [req.params.sid, req.params.id],
        );
        if (!actual.length) return res.status(404).json({ error: 'No encontrado' });
        if (actual[0].Principal === 'YES') {
            return res.status(400).json({ error: 'No se puede eliminar el servicio principal de la solicitud' });
        }

        const result = await db.query(
            'DELETE FROM SOLICITUD_SERVICIO WHERE id=? AND ID_Solicitud=?',
            [req.params.sid, req.params.id],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio en solicitud eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SOLICITUD_INVENTARIO ──────────────────────────────────────────────────────
exports.getInventario = async (req, res) => {
    try { res.json(await db.query('SELECT SI.*, I.nombre_objeto as nombre, I.precio_comercial as precio_unitario FROM SOLICITUD_INVENTARIO SI LEFT JOIN INVENTARIO I ON SI.ID_Inventario = I.Id_Objeto WHERE SI.ID_Solicitud = ? ORDER BY SI.id DESC', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createInventario = async (req, res) => {
    const { ID_Inventario, cantidad, intencion, dias_alquilados } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO SOLICITUD_INVENTARIO (ID_Solicitud,ID_Inventario,cantidad,intencion,dias_alquilados) VALUES (?,?,?,?,?)',
            [req.params.id, ID_Inventario, cantidad, intencion, dias_alquilados]
        );
        res.status(201).json({ message: 'Inventario en solicitud creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateInventario = async (req, res) => {
    const { ID_Inventario, cantidad, intencion, dias_alquilados } = req.body;
    try {
        const result = await db.query(
            'UPDATE SOLICITUD_INVENTARIO SET ID_Inventario=?, cantidad=?, intencion=?, dias_alquilados=? WHERE id=? AND ID_Solicitud=?',
            [ID_Inventario, cantidad, intencion, dias_alquilados, req.params.iid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario en solicitud actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteInventario = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM SOLICITUD_INVENTARIO WHERE id=? AND ID_Solicitud=?', [req.params.iid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario en solicitud eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SOLICITUD_CAMION ──────────────────────────────────────────────────────────
exports.getCamiones = async (req, res) => {
    try {
        const rows = await db.query(
            `SELECT SC.*, C.nombre as camion_nombre, C.modelo as camion_modelo
             FROM SOLICITUD_CAMION SC
             LEFT JOIN CAMION C ON SC.id_camion = C.Placa
             WHERE SC.ID_Solicitud = ?
             ORDER BY SC.id DESC`,
            [req.params.id]
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createCamion = async (req, res) => {
    try {
        const items = normalizarMatrizBody(req.body, 'camiones');
        if (!items.length) {
            return res.status(400).json({ error: 'Se requiere un camión o un arreglo de camiones' });
        }

        const insertados = [];
        for (const item of items) {
            const id_camion = item.id_camion || item.Placa;
            const { numero_dias } = item;
            if (!id_camion || numero_dias === undefined || numero_dias === null) {
                return res.status(400).json({ error: 'Cada camión debe incluir id_camion (placa) y numero_dias' });
            }
            const result = await db.query(
                'INSERT INTO SOLICITUD_CAMION (ID_Solicitud, id_camion, numero_dias) VALUES (?,?,?)',
                [req.params.id, id_camion, numero_dias]
            );
            insertados.push({
                id: result.insertId,
                ID_Solicitud: Number(req.params.id),
                id_camion,
                numero_dias,
            });
        }

        if (insertados.length === 1) {
            return res.status(201).json({ message: 'Camión en solicitud creado', ...insertados[0] });
        }
        res.status(201).json({ message: 'Camiones en solicitud creados', data: insertados });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateCamion = async (req, res) => {
    const id_camion = req.body.id_camion || req.body.Placa;
    const { numero_dias } = req.body;
    try {
        const result = await db.query(
            'UPDATE SOLICITUD_CAMION SET id_camion=?, numero_dias=? WHERE id=? AND ID_Solicitud=?',
            [id_camion, numero_dias, req.params.cid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Camión en solicitud actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteCamion = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM SOLICITUD_CAMION WHERE id=? AND ID_Solicitud=?',
            [req.params.cid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Camión en solicitud eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
