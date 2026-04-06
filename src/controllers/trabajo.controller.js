const db = require('../config/db');

// ── TRABAJO ───────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM TRABAJO')); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM TRABAJO WHERE Id_trabajo = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { Id_Proyecto, fecha, horario, asistencia, comentario } = req.body;
    try {
        const [r] = await db.query(
            'INSERT INTO TRABAJO (Id_Proyecto,fecha,horario,asistencia,comentario) VALUES (?,?,?,?,?)',
            [Id_Proyecto, fecha, horario, asistencia, comentario]
        );
        res.status(201).json({ message: 'Trabajo creado', Id_trabajo: r.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { Id_Proyecto, fecha, horario, asistencia, comentario } = req.body;
    try {
        const [r] = await db.query(
            'UPDATE TRABAJO SET Id_Proyecto=?,fecha=?,horario=?,asistencia=?,comentario=? WHERE Id_trabajo=?',
            [Id_Proyecto, fecha, horario, asistencia, comentario, req.params.id]
        );
        if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Trabajo actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const [r] = await db.query('DELETE FROM TRABAJO WHERE Id_trabajo = ?', [req.params.id]);
        if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Trabajo eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── TRABAJO_JORNADA ───────────────────────────────────────────────────────────
exports.getJornadas = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM TRABAJO_JORNADA WHERE Id_trabajo = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};
exports.createJornada = async (req, res) => {
    const { DNI_Trabajador, dia, horario_entrada, horario_salida } = req.body;
    try {
        const [r] = await db.query(
            'INSERT INTO TRABAJO_JORNADA (Id_trabajo,DNI_Trabajador,dia,horario_entrada,horario_salida) VALUES (?,?,?,?,?)',
            [req.params.id, DNI_Trabajador, dia, horario_entrada, horario_salida]
        );
        res.status(201).json({ message: 'Jornada creada', id: r.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.deleteJornada = async (req, res) => {
    try {
        const [r] = await db.query('DELETE FROM TRABAJO_JORNADA WHERE id=? AND Id_trabajo=?', [req.params.jid, req.params.id]);
        if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Jornada eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── TRABAJO_RRHH ──────────────────────────────────────────────────────────────
exports.getRRHH = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM TRABAJO_RRHH WHERE Id_trabajo = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};
exports.createRRHH = async (req, res) => {
    const { DNI_Trabajador, estado_pago } = req.body;
    try {
        const [r] = await db.query(
            'INSERT INTO TRABAJO_RRHH (Id_trabajo,DNI_Trabajador,estado_pago) VALUES (?,?,?)',
            [req.params.id, DNI_Trabajador, estado_pago]
        );
        res.status(201).json({ message: 'RRHH creado', id: r.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.deleteRRHH = async (req, res) => {
    try {
        const [r] = await db.query('DELETE FROM TRABAJO_RRHH WHERE id=? AND Id_trabajo=?', [req.params.rid, req.params.id]);
        if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'RRHH eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── TRABAJO_RRHH_PDF ──────────────────────────────────────────────────────────
exports.getRRHHPdfs = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM TRABAJO_RRHH_PDF WHERE ID_RRHH = ?', [req.params.rid])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};
exports.createRRHHPdf = async (req, res) => {
    const { pdf_url } = req.body;
    try {
        const [r] = await db.query(
            'INSERT INTO TRABAJO_RRHH_PDF (ID_RRHH,pdf_url) VALUES (?,?)',
            [req.params.rid, pdf_url]
        );
        res.status(201).json({ message: 'PDF RRHH creado', id: r.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.deleteRRHHPdf = async (req, res) => {
    try {
        const [r] = await db.query('DELETE FROM TRABAJO_RRHH_PDF WHERE id=? AND ID_RRHH=?', [req.params.pid, req.params.rid]);
        if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'PDF RRHH eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
