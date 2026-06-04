const db = require('../config/db');

const INCIDENCIA_SELECT = `
    SELECT INC.*, CC.nombre AS Cotizacion_Nombre, C.nombre_comercial AS Cliente_Nombre
    FROM INCIDENCIA INC
    LEFT JOIN COTIZACION_COMERCIAL CC ON INC.cotizacion_remuneracion = CC.ID
    LEFT JOIN CLIENTE C ON INC.empresa_involucrada = C.DNI_O_RUC
`;

// ── INCIDENCIA ──────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { nombre, estado } = req.query;

        let query = `${INCIDENCIA_SELECT} WHERE 1=1`;
        const params = [];
        if (nombre) {
            query += ' AND INC.nombre_incidencia LIKE ?';
            params.push(`%${nombre}%`);
        }
        if (estado) {
            query += ' AND INC.estado = ?';
            params.push(estado);
        }
        query += ' ORDER BY INC.id_incidencia DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const rows = await db.query(query, params);

        let countQuery = 'SELECT COUNT(*) AS total FROM INCIDENCIA INC WHERE 1=1';
        const countParams = [];
        if (nombre) {
            countQuery += ' AND INC.nombre_incidencia LIKE ?';
            countParams.push(`%${nombre}%`);
        }
        if (estado) {
            countQuery += ' AND INC.estado = ?';
            countParams.push(estado);
        }
        const countResult = await db.query(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            data: rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        const rows = await db.query(
            `${INCIDENCIA_SELECT} WHERE INC.id_incidencia = ?`,
            [req.params.id],
        );
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getByProyecto = async (req, res) => {
    try {
        const idProyecto = Number(req.params.id_proyecto ?? req.params.id);
        const { estado, nombre } = req.query;

        const proyectoRows = await db.query(
            'SELECT id_Proyecto, Proyecto_Nombre FROM PROYECTO WHERE id_Proyecto = ?',
            [idProyecto],
        );
        if (!proyectoRows.length) return res.status(404).json({ error: 'Proyecto no encontrado' });

        let query = `${INCIDENCIA_SELECT} WHERE INC.id_proyecto = ?`;
        const params = [idProyecto];

        if (nombre) {
            query += ' AND INC.nombre_incidencia LIKE ?';
            params.push(`%${nombre}%`);
        }
        if (estado) {
            query += ' AND INC.estado = ?';
            params.push(estado);
        }
        query += ' ORDER BY INC.id_incidencia DESC';

        const rows = await db.query(query, params);

        res.json({
            id_Proyecto: idProyecto,
            Proyecto_Nombre: proyectoRows[0].Proyecto_Nombre,
            total: rows.length,
            data: rows,
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const {
        nombre_incidencia,
        id_proyecto,
        empresa_involucrada,
        cotizacion_remuneracion,
        comentario,
        estado,
    } = req.body;

    if (nombre_incidencia && String(nombre_incidencia).length > 100) {
        return res.status(400).json({ error: 'nombre_incidencia máximo 100 caracteres' });
    }

    try {
        const result = await db.query(
            `INSERT INTO INCIDENCIA
                (nombre_incidencia, id_proyecto, empresa_involucrada, cotizacion_remuneracion, comentario, estado)
             VALUES (?,?,?,?,?,?)`,
            [
                nombre_incidencia || null,
                id_proyecto,
                empresa_involucrada,
                cotizacion_remuneracion,
                comentario,
                estado,
            ],
        );
        res.status(201).json({
            message: 'Incidencia creada',
            id: result.insertId,
            nombre_incidencia: nombre_incidencia || null,
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const {
        nombre_incidencia,
        id_proyecto,
        empresa_involucrada,
        cotizacion_remuneracion,
        comentario,
        estado,
    } = req.body;

    if (nombre_incidencia !== undefined && nombre_incidencia !== null && String(nombre_incidencia).length > 100) {
        return res.status(400).json({ error: 'nombre_incidencia máximo 100 caracteres' });
    }

    try {
        const actual = await db.query('SELECT * FROM INCIDENCIA WHERE id_incidencia = ?', [req.params.id]);
        if (!actual.length) return res.status(404).json({ error: 'No encontrado' });

        const row = actual[0];
        const result = await db.query(
            `UPDATE INCIDENCIA SET
                nombre_incidencia = ?,
                id_proyecto = ?,
                empresa_involucrada = ?,
                cotizacion_remuneracion = ?,
                comentario = ?,
                estado = ?
             WHERE id_incidencia = ?`,
            [
                nombre_incidencia !== undefined ? nombre_incidencia : row.nombre_incidencia,
                id_proyecto !== undefined ? id_proyecto : row.id_proyecto,
                empresa_involucrada !== undefined ? empresa_involucrada : row.empresa_involucrada,
                cotizacion_remuneracion !== undefined ? cotizacion_remuneracion : row.cotizacion_remuneracion,
                comentario !== undefined ? comentario : row.comentario,
                estado !== undefined ? estado : row.estado,
                req.params.id,
            ],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Incidencia actualizada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM INCIDENCIA WHERE id_incidencia = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Incidencia eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── INCIDENCIA_OBJETOS ────────────────────────────────────────────────────────
exports.getObjetos = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM INCIDENCIA_OBJETOS WHERE id_incidencia = ? ORDER BY id DESC', [req.params.id]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createObjeto = async (req, res) => {
    const { id_proyecto_inventario, id_proyecto_camion, ocurrencia_inventario, ocurrencia_camion, fecha_perdida, cantidad, ultima_ubicacion, comentario, precio_remunerar } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO INCIDENCIA_OBJETOS (id_incidencia, id_proyecto_inventario, id_proyecto_camion, ocurrencia_inventario, ocurrencia_camion, fecha_perdida, cantidad, ultima_ubicacion, comentario, precio_remunerar) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [req.params.id, id_proyecto_inventario, id_proyecto_camion, ocurrencia_inventario, ocurrencia_camion, fecha_perdida, cantidad, ultima_ubicacion, comentario, precio_remunerar]
        );
        res.status(201).json({ message: 'Objeto/Camion de incidencia creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteObjeto = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM INCIDENCIA_OBJETOS WHERE id = ? AND id_incidencia = ?', [req.params.oid, req.params.id]);
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
             WHERE I.id_incidencia = ?
             ORDER BY I.id DESC`, 
            [req.params.id]
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createInvolucrado = async (req, res) => {
    const { dni_involucrado, id_trabajo, version_de_hechos, comentario } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO INVOLUCRADO (dni_involucrado, id_trabajo, id_incidencia, version_de_hechos, comentario) VALUES (?,?,?,?,?)',
            [dni_involucrado, id_trabajo, req.params.id, version_de_hechos, comentario]
        );
        res.status(201).json({ message: 'Involucrado creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteInvolucrado = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM INVOLUCRADO WHERE id = ? AND id_incidencia = ?', [req.params.ivid, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Involucrado eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
