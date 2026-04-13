const db = require('../config/db');

// ── SERVICIO ──────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM SERVICIO')); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM SERVICIO WHERE ID_Servicio = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { nombre, descripcion, precio_regular, condicional_precio, observaciones } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO SERVICIO (nombre,descripcion,precio_regular,condicional_precio,observaciones) VALUES (?,?,?,?,?)',
            [nombre, descripcion, precio_regular, condicional_precio, observaciones]
        );
        res.status(201).json({ message: 'Servicio creado', ID_Servicio: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { nombre, descripcion, precio_regular, condicional_precio, observaciones } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE SERVICIO SET nombre=?,descripcion=?,precio_regular=?,condicional_precio=?,observaciones=? WHERE ID_Servicio=?',
            [nombre, descripcion, precio_regular, condicional_precio, observaciones, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM SERVICIO WHERE ID_Servicio = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SERVICIO_PERSONAL_REQUERIDO ───────────────────────────────────────────────
exports.getPersonal = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM SERVICIO_PERSONAL_REQUERIDO WHERE ID_Servicio = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createPersonal = async (req, res) => {
    const { profesion, cantidad, disponibilidad, requerimiento_legal } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO SERVICIO_PERSONAL_REQUERIDO (ID_Servicio,profesion,cantidad,disponibilidad,requerimiento_legal) VALUES (?,?,?,?,?)',
            [req.params.id, profesion, cantidad, disponibilidad, requerimiento_legal]
        );
        res.status(201).json({ message: 'Personal requerido creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deletePersonal = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM SERVICIO_PERSONAL_REQUERIDO WHERE id=? AND ID_Servicio=?', [req.params.pid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Personal requerido eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
