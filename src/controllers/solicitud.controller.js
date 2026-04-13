const db = require('../config/db');

// ── SOLICITUD ─────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM SOLICITUD')); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM SOLICITUD WHERE ID = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { Id_Cliente, descripcion, ubicacion } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO SOLICITUD (Id_Cliente,descripcion,ubicacion) VALUES (?,?,?)',
            [Id_Cliente, descripcion, ubicacion]
        );
        res.status(201).json({ message: 'Solicitud creada', ID: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { Id_Cliente, descripcion, ubicacion } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE SOLICITUD SET Id_Cliente=?,descripcion=?,ubicacion=? WHERE ID=?',
            [Id_Cliente, descripcion, ubicacion, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Solicitud actualizada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM SOLICITUD WHERE ID = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
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
    const { ID_Servicio, fecha_servicio, horario_servicio } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO SOLICITUD_SERVICIO (ID_Solicitud,ID_Servicio,fecha_servicio,horario_servicio) VALUES (?,?,?,?)',
            [req.params.id, ID_Servicio, fecha_servicio, horario_servicio]
        );
        res.status(201).json({ message: 'Servicio en solicitud creado', id: result.insertId });
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
    try { res.json(await db.query('SELECT * FROM SOLICITUD_INVENTARIO WHERE ID_Solicitud = ?', [req.params.id])); }
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

exports.deleteInventario = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM SOLICITUD_INVENTARIO WHERE id=? AND ID_Solicitud=?', [req.params.iid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario en solicitud eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
