const db = require('../config/db');

// ── INCIDENCIA ──────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `SELECT INC.*, CC.nombre as Cotizacion_Nombre, C.nombre_comercial as Cliente_Nombre 
             FROM INCIDENCIA INC 
             LEFT JOIN COTIZACION_COMERCIAL CC ON INC.cotizacion_remuneracion = CC.ID 
             LEFT JOIN CLIENTE C ON INC.empresa_involucrada = C.DNI_O_RUC 
             LIMIT ? OFFSET ?`, 
            [limit, offset]
        );
        const [countResult] = await db.query('SELECT COUNT(*) as total FROM INCIDENCIA');
        const total = countResult.total;

        res.json({
            data: rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        const rows = await db.query(
            `SELECT INC.*, CC.nombre as Cotizacion_Nombre, C.nombre_comercial as Cliente_Nombre 
             FROM INCIDENCIA INC 
             LEFT JOIN COTIZACION_COMERCIAL CC ON INC.cotizacion_remuneracion = CC.ID 
             LEFT JOIN CLIENTE C ON INC.empresa_involucrada = C.DNI_O_RUC 
             WHERE INC.id_incidencia = ?`, 
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { id_proyecto, empresa_involucrada, cotizacion_remuneracion, comentario, estado } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO INCIDENCIA (id_proyecto, empresa_involucrada, cotizacion_remuneracion, comentario, estado) VALUES (?,?,?,?,?)',
            [id_proyecto, empresa_involucrada, cotizacion_remuneracion, comentario, estado]
        );
        res.status(201).json({ message: 'Incidencia creada', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { id_proyecto, empresa_involucrada, cotizacion_remuneracion, comentario, estado } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE INCIDENCIA SET id_proyecto=?, empresa_involucrada=?, cotizacion_remuneracion=?, comentario=?, estado=? WHERE id_incidencia=?',
            [id_proyecto, empresa_involucrada, cotizacion_remuneracion, comentario, estado, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Incidencia actualizada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM INCIDENCIA WHERE id_incidencia = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Incidencia eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── INCIDENCIA_OBJETOS ────────────────────────────────────────────────────────
exports.getObjetos = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM INCIDENCIA_OBJETOS WHERE id_incidencia = ?', [req.params.id]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createObjeto = async (req, res) => {
    const { id_proyecto_inventario, id_proyecto_camion, ocurrencia_inventario, ocurrencia_camion, fecha_perdida, cantidad, ultima_ubicacion, comentario, precio_remunerar } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO INCIDENCIA_OBJETOS (id_incidencia, id_proyecto_inventario, id_proyecto_camion, ocurrencia_inventario, ocurrencia_camion, fecha_perdida, cantidad, ultima_ubicacion, comentario, precio_remunerar) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [req.params.id, id_proyecto_inventario, id_proyecto_camion, ocurrencia_inventario, ocurrencia_camion, fecha_perdida, cantidad, ultima_ubicacion, comentario, precio_remunerar]
        );
        res.status(201).json({ message: 'Objeto/Camion de incidencia creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteObjeto = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM INCIDENCIA_OBJETOS WHERE id = ? AND id_incidencia = ?', [req.params.oid, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Objeto de incidencia eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── INVOLUCRADO ────────────────────────────────────────────────────────
exports.getInvolucrados = async (req, res) => {
    try {
        const rows = await db.query(
            `SELECT I.*, T.comentario as Trabajo_Comentario, P.Nombre as Involucrado_Nombre, P.Apellido as Involucrado_Apellido 
             FROM INVOLUCRADO I 
             LEFT JOIN TRABAJO T ON I.id_trabajo = T.Id_trabajo 
             LEFT JOIN PERFIL P ON I.dni_involucrado = P.DNI 
             WHERE I.id_incidencia = ?`, 
            [req.params.id]
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createInvolucrado = async (req, res) => {
    const { dni_involucrado, id_trabajo, version_de_hechos, comentario } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO INVOLUCRADO (dni_involucrado, id_trabajo, id_incidencia, version_de_hechos, comentario) VALUES (?,?,?,?,?)',
            [dni_involucrado, id_trabajo, req.params.id, version_de_hechos, comentario]
        );
        res.status(201).json({ message: 'Involucrado creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteInvolucrado = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM INVOLUCRADO WHERE id = ? AND id_incidencia = ?', [req.params.ivid, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Involucrado eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
