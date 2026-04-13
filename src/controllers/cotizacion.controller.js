const db = require('../config/db');

// ── COTIZACION_COMERCIAL ──────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM COTIZACION_COMERCIAL')); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM COTIZACION_COMERCIAL WHERE ID = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { version, nombre, id_solicitud, DNI_O_RUC, precio_total, estado, comentario_cliente } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO COTIZACION_COMERCIAL (version,nombre,id_solicitud,DNI_O_RUC,precio_total,estado,comentario_cliente) VALUES (?,?,?,?,?,?,?)',
            [version, nombre, id_solicitud, DNI_O_RUC, precio_total, estado, comentario_cliente]
        );
        res.status(201).json({ message: 'Cotización creada', ID: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { version, nombre, id_solicitud, DNI_O_RUC, precio_total, estado, comentario_cliente } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE COTIZACION_COMERCIAL SET version=?,nombre=?,id_solicitud=?,DNI_O_RUC=?,precio_total=?,estado=?,comentario_cliente=? WHERE ID=?',
            [version, nombre, id_solicitud, DNI_O_RUC, precio_total, estado, comentario_cliente, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Cotización actualizada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM COTIZACION_COMERCIAL WHERE ID = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Cotización eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── COTIZACION_SERVICIO ───────────────────────────────────────────────────────
exports.getServicios = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM COTIZACION_SERVICIO WHERE ID_Cotizacion = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createServicio = async (req, res) => {
    const { ID_Servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO COTIZACION_SERVICIO (ID_Cotizacion,ID_Servicio,fecha_inicio,fecha_finalizacion,jornada,precio_comercial) VALUES (?,?,?,?,?,?)',
            [req.params.id, ID_Servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial]
        );
        res.status(201).json({ message: 'Servicio en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteServicio = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM COTIZACION_SERVICIO WHERE id=? AND ID_Cotizacion=?', [req.params.sid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio en cotización eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── COTIZACION_CAMION ─────────────────────────────────────────────────────────
exports.getCamiones = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM COTIZACION_CAMION WHERE ID_Cotizacion = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createCamion = async (req, res) => {
    const { Placa, uso, fecha_hora_entrada, fecha_hora_salida, ID_Piloto } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO COTIZACION_CAMION (ID_Cotizacion,Placa,uso,fecha_hora_entrada,fecha_hora_salida,ID_Piloto) VALUES (?,?,?,?,?,?)',
            [req.params.id, Placa, uso, fecha_hora_entrada, fecha_hora_salida, ID_Piloto]
        );
        res.status(201).json({ message: 'Camión en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteCamion = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM COTIZACION_CAMION WHERE id=? AND ID_Cotizacion=?', [req.params.cid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Camión en cotización eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── COTIZACION_INVENTARIO ─────────────────────────────────────────────────────
exports.getInventario = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM COTIZACION_INVENTARIO WHERE ID_Cotizacion = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createInventario = async (req, res) => {
    const { ID_Inventario, cantidad, intencion, dias_alquilados, precio_comercial } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO COTIZACION_INVENTARIO (ID_Cotizacion,ID_Inventario,cantidad,intencion,dias_alquilados,precio_comercial) VALUES (?,?,?,?,?,?)',
            [req.params.id, ID_Inventario, cantidad, intencion, dias_alquilados, precio_comercial]
        );
        res.status(201).json({ message: 'Inventario en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteInventario = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM COTIZACION_INVENTARIO WHERE id=? AND ID_Cotizacion=?', [req.params.iid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario en cotización eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── COTIZACION_PERSONAL ───────────────────────────────────────────────────────
exports.getPersonal = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM COTIZACION_PERSONAL WHERE ID_Cotizacion = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createPersonal = async (req, res) => {
    const { ID_Usuario, rol_en_trabajo, fecha_entrada, fecha_salida, dias_trabajados } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO COTIZACION_PERSONAL (ID_Cotizacion,ID_Usuario,rol_en_trabajo,fecha_entrada,fecha_salida,dias_trabajados) VALUES (?,?,?,?,?,?)',
            [req.params.id, ID_Usuario, rol_en_trabajo, fecha_entrada, fecha_salida, dias_trabajados]
        );
        res.status(201).json({ message: 'Personal en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deletePersonal = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM COTIZACION_PERSONAL WHERE id=? AND ID_Cotizacion=?', [req.params.pid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Personal en cotización eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
