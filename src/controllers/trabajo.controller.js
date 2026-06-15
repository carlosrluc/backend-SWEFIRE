const db = require('../config/db');
const { assertProfesionClasificacion } = require('../constants/profesionClasificacion');

const TRABAJO_SELECT = `
    SELECT t.*, p.Nombre AS Trabajador_Nombre, p.Apellido AS Trabajador_Apellido
    FROM TRABAJO t
    LEFT JOIN PERFIL p ON t.DNI_Trabajador = p.DNI
`;

// ── TRABAJO ───────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const { Id_Proyecto, dia, profesion, DNI_Trabajador } = req.query;

        const where = [];
        const params = [];
        if (Id_Proyecto) { where.push('t.Id_Proyecto = ?'); params.push(Id_Proyecto); }
        if (dia) { where.push('t.dia = ?'); params.push(dia); }
        if (profesion) { where.push('t.profesion = ?'); params.push(profesion); }
        if (DNI_Trabajador) { where.push('t.DNI_Trabajador = ?'); params.push(DNI_Trabajador); }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const rows = await db.query(
            `${TRABAJO_SELECT} ${whereSql} ORDER BY t.Id_trabajo DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset],
        );

        const countResult = await db.query(
            `SELECT COUNT(*) as total FROM TRABAJO t ${whereSql}`,
            params,
        );
        const total = countResult[0].total;

        res.json({
            data: rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        const rows = await db.query(`${TRABAJO_SELECT} WHERE t.Id_trabajo = ?`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getByProyecto = async (req, res) => {
    try {
        const rows = await db.query(
            `${TRABAJO_SELECT} WHERE t.Id_Proyecto = ? ORDER BY t.dia ASC, t.horario_entrada ASC, t.Id_trabajo ASC`,
            [req.params.proyectoId],
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const {
        Id_Proyecto, ID_Servicio, dia, horario_entrada, horario_salida,
        DNI_Trabajador, profesion, asistencia, comentario,
    } = req.body;
    try {
        const profesionNorm = assertProfesionClasificacion(profesion, { required: false });
        const r = await db.query(
            `INSERT INTO TRABAJO
                (Id_Proyecto, ID_Servicio, dia, horario_entrada, horario_salida, DNI_Trabajador, profesion, asistencia, comentario)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [
                Id_Proyecto,
                ID_Servicio ?? null,
                dia,
                horario_entrada ?? null,
                horario_salida ?? null,
                DNI_Trabajador ?? null,
                profesionNorm,
                asistencia ?? 'Programada',
                comentario ?? null,
            ],
        );
        res.status(201).json({ message: 'Trabajo creado', Id_trabajo: r.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const {
        Id_Proyecto, ID_Servicio, dia, horario_entrada, horario_salida,
        DNI_Trabajador, profesion, asistencia, comentario,
    } = req.body;
    try {
        const profesionNorm = profesion !== undefined
            ? assertProfesionClasificacion(profesion, { required: false })
            : undefined;
        const r = await db.query(
            `UPDATE TRABAJO SET
                Id_Proyecto=?, ID_Servicio=?, dia=?, horario_entrada=?, horario_salida=?,
                DNI_Trabajador=?, profesion=?, asistencia=?, comentario=?
             WHERE Id_trabajo=?`,
            [
                Id_Proyecto,
                ID_Servicio ?? null,
                dia,
                horario_entrada ?? null,
                horario_salida ?? null,
                DNI_Trabajador ?? null,
                profesion !== undefined ? profesionNorm : undefined,
                asistencia,
                comentario ?? null,
                req.params.id,
            ],
        );
        if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Trabajo actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const r = await db.query('DELETE FROM TRABAJO WHERE Id_trabajo = ?', [req.params.id]);
        if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Trabajo eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── TRABAJO_RRHH ──────────────────────────────────────────────────────────────
exports.getRRHH = async (req, res) => {
    try {
        res.json(await db.query(
            'SELECT TR.*, P.Nombre as Trabajador_Nombre, P.Apellido as Trabajador_Apellido FROM TRABAJO_RRHH TR LEFT JOIN PERFIL P ON TR.DNI_Trabajador = P.DNI WHERE TR.Id_trabajo = ? ORDER BY TR.id DESC',
            [req.params.id],
        ));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createRRHH = async (req, res) => {
    const { DNI_Trabajador, estado_pago } = req.body;
    try {
        const r = await db.query(
            'INSERT INTO TRABAJO_RRHH (Id_trabajo,DNI_Trabajador,estado_pago) VALUES (?,?,?)',
            [req.params.id, DNI_Trabajador, estado_pago],
        );
        res.status(201).json({ message: 'RRHH creado', id: r.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteRRHH = async (req, res) => {
    try {
        const r = await db.query('DELETE FROM TRABAJO_RRHH WHERE id=? AND Id_trabajo=?', [req.params.rid, req.params.id]);
        if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'RRHH eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── ARCHIVOS DE TRABAJO_RRHH (PDFs) ──────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const handleFileUpload = async (req, res, table, idColumn, idValue, fileColumn, successMsg, subdir) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

        const rows = await db.query(`SELECT ${fileColumn} FROM ${table} WHERE ${idColumn} = ?`, [idValue]);
        if (!rows.length) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Registro no encontrado' });
        }

        const oldUrl = rows[0][fileColumn];
        if (oldUrl) {
            const oldAbsPath = path.join(__dirname, '../../', oldUrl);
            if (fs.existsSync(oldAbsPath)) {
                try { fs.unlinkSync(oldAbsPath); } catch (err) { console.error('No se pudo borrar el archivo antiguo:', err); }
            }
        }

        const relativeUrl = `/uploads/${subdir}/${req.file.filename}`;
        await db.query(`UPDATE ${table} SET ${fileColumn} = ? WHERE ${idColumn} = ?`, [relativeUrl, idValue]);
        res.status(200).json({ message: successMsg, url: relativeUrl });
    } catch (e) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: e.message });
    }
};

const handleFileGet = async (req, res, table, idColumn, idValue, fileColumn) => {
    try {
        const rows = await db.query(`SELECT ${fileColumn} FROM ${table} WHERE ${idColumn} = ?`, [idValue]);
        if (!rows.length) return res.status(404).json({ error: 'Registro no encontrado' });

        const fileUrl = rows[0][fileColumn];
        if (!fileUrl) return res.status(404).json({ error: 'Archivo no encontrado' });
        res.redirect(fileUrl);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.uploadRRHHPDF = (req, res) => handleFileUpload(req, res, 'TRABAJO_RRHH', 'id', req.params.rid, 'pdf_RRHH', 'PDF de RRHH subido', 'pdfs');
exports.getRRHHPDF = (req, res) => handleFileGet(req, res, 'TRABAJO_RRHH', 'id', req.params.rid, 'pdf_RRHH');
