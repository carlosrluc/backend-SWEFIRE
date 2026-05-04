const db = require('../config/db');

// ── SOLICITUD ─────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        let query = 'SELECT S.*, C.nombre_comercial as Cliente_Nombre FROM SOLICITUD S LEFT JOIN CLIENTE C ON S.Id_Cliente = C.DNI_O_RUC';
        let countQuery = 'SELECT COUNT(*) as total FROM SOLICITUD S';
        let args = [];
        let countArgs = [];

        if (req.user && req.user.rolNormalizado === 'cliente') {
            const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [req.user.dni_perfil]);
            const clientIds = contactos.map(c => c.DNI_O_RUC);
            clientIds.push(req.user.dni_perfil); // Por si su DNI es directamente un cliente

            query += ` WHERE S.Id_Cliente IN (${clientIds.map(() => '?').join(',')})`;
            countQuery += ` WHERE S.Id_Cliente IN (${clientIds.map(() => '?').join(',')})`;
            args.push(...clientIds);
            countArgs.push(...clientIds);
        }

        query += ' LIMIT ? OFFSET ?';
        args.push(limit, offset);

        const rows = await db.query(query, args);
        const countResult = await db.query(countQuery, countArgs);
        
        res.json({
            data: rows,
            pagination: {
                total: countResult[0].total,
                page,
                limit,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
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
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { Id_Cliente, descripcion, ubicacion, productoenvio, camionesenvio, obsgenerales, obseleccion, Respuesta } = req.body;
    const estado = 'pendiente';
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

        const [result] = await db.query(
            'INSERT INTO SOLICITUD (Id_Cliente,descripcion,ubicacion,ProductoEnvio,CamionesEnvio,ObsGenerales,ObsEleccion,estado,Respuesta) VALUES (?,?,?,?,?,?,?,?,?)',
            [clientIdToUse, descripcion, ubicacion, productoenvio, camionesenvio, obsgenerales, obseleccion, estado, Respuesta]
        );
        res.status(201).json({ message: 'Solicitud creada', ID: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
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

        const [result] = await db.query(
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

        const [result] = await db.query(query, args);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado o no autorizado' });
        res.json({ message: 'Solicitud eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SOLICITUD_MEDIO_COMUNICACION ──────────────────────────────────────────────
exports.getMedios = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM SOLICITUD_MEDIO_COMUNICACION WHERE ID_Solicitud = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createMedio = async (req, res) => {
    const { cliente_email, cliente_telefono } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO SOLICITUD_MEDIO_COMUNICACION (ID_Solicitud,cliente_email,cliente_telefono) VALUES (?,?,?)',
            [req.params.id, cliente_email, cliente_telefono]
        );
        res.status(201).json({ message: 'Medio de comunicación creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateMedio = async (req, res) => {
    const { cliente_email, cliente_telefono } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE SOLICITUD_MEDIO_COMUNICACION SET cliente_email=?, cliente_telefono=? WHERE id=? AND ID_Solicitud=?',
            [cliente_email, cliente_telefono, req.params.mid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Medio de comunicación actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteMedio = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM SOLICITUD_MEDIO_COMUNICACION WHERE id=? AND ID_Solicitud=?', [req.params.mid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Medio de comunicación eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SOLICITUD_SERVICIO ────────────────────────────────────────────────────────
exports.getServicios = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM SOLICITUD_SERVICIO WHERE ID_Solicitud = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createServicio = async (req, res) => {
    const { ID_Servicio, fecha_inicio_servicio, fecha_fin_servicio, horario_servicio } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO SOLICITUD_SERVICIO (ID_Solicitud,ID_Servicio,fecha_inicio_servicio,fecha_fin_servicio,horario_servicio) VALUES (?,?,?,?,?)',
            [req.params.id, ID_Servicio, fecha_inicio_servicio, fecha_fin_servicio, horario_servicio]
        );
        res.status(201).json({ message: 'Servicio en solicitud creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateServicio = async (req, res) => {
    const { ID_Servicio, fecha_inicio_servicio, fecha_fin_servicio, horario_servicio } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE SOLICITUD_SERVICIO SET ID_Servicio=?, fecha_inicio_servicio=?, fecha_fin_servicio=?, horario_servicio=? WHERE id=? AND ID_Solicitud=?',
            [ID_Servicio, fecha_inicio_servicio, fecha_fin_servicio, horario_servicio, req.params.sid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio en solicitud actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteServicio = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM SOLICITUD_SERVICIO WHERE id=? AND ID_Solicitud=?', [req.params.sid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio en solicitud eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SOLICITUD_INVENTARIO ──────────────────────────────────────────────────────
exports.getInventario = async (req, res) => {
    try { res.json(await db.query('SELECT SI.*, I.nombre_objeto as Objeto_Nombre FROM SOLICITUD_INVENTARIO SI LEFT JOIN INVENTARIO I ON SI.ID_Inventario = I.Id_Objeto WHERE SI.ID_Solicitud = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createInventario = async (req, res) => {
    const { ID_Inventario, cantidad, intencion, dias_alquilados } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO SOLICITUD_INVENTARIO (ID_Solicitud,ID_Inventario,cantidad,intencion,dias_alquilados) VALUES (?,?,?,?,?)',
            [req.params.id, ID_Inventario, cantidad, intencion, dias_alquilados]
        );
        res.status(201).json({ message: 'Inventario en solicitud creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateInventario = async (req, res) => {
    const { ID_Inventario, cantidad, intencion, dias_alquilados } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE SOLICITUD_INVENTARIO SET ID_Inventario=?, cantidad=?, intencion=?, dias_alquilados=? WHERE id=? AND ID_Solicitud=?',
            [ID_Inventario, cantidad, intencion, dias_alquilados, req.params.iid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario en solicitud actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteInventario = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM SOLICITUD_INVENTARIO WHERE id=? AND ID_Solicitud=?', [req.params.iid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario en solicitud eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
