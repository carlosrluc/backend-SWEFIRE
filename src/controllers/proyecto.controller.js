const db = require('../config/db');

// ── PROYECTO ──────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await db.query(
            'SELECT * FROM PROYECTO LIMIT ? OFFSET ?',
            [limit, offset]
        );

        const countResult = await db.query('SELECT COUNT(*) as total FROM PROYECTO');
        const total = countResult[0].total;

        res.json({
            data: rows,
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
        const rows = await db.query('SELECT * FROM PROYECTO WHERE id_Proyecto = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { descripcion_servicio, ID_Trabajo, Id_Cliente, ubicacion, id_cotizacion,
        orden_servicio, informe_final, factura, fecha_inicio, fecha_fin, observaciones, estado } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO PROYECTO (descripcion_servicio,ID_Trabajo,Id_Cliente,ubicacion,id_cotizacion,
             orden_servicio,informe_final,factura,fecha_inicio,fecha_fin,observaciones,estado)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [descripcion_servicio, ID_Trabajo, Id_Cliente, ubicacion, id_cotizacion,
             orden_servicio, informe_final, factura, fecha_inicio, fecha_fin, observaciones, estado]
        );
        res.status(201).json({ message: 'Proyecto creado', id_Proyecto: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { descripcion_servicio, ID_Trabajo, Id_Cliente, ubicacion, id_cotizacion,
        orden_servicio, informe_final, factura, fecha_inicio, fecha_fin, observaciones, estado } = req.body;
    try {
        const [result] = await db.query(
            `UPDATE PROYECTO SET descripcion_servicio=?,ID_Trabajo=?,Id_Cliente=?,ubicacion=?,id_cotizacion=?,
             orden_servicio=?,informe_final=?,factura=?,fecha_inicio=?,fecha_fin=?,observaciones=?,estado=?
             WHERE id_Proyecto=?`,
            [descripcion_servicio, ID_Trabajo, Id_Cliente, ubicacion, id_cotizacion,
             orden_servicio, informe_final, factura, fecha_inicio, fecha_fin, observaciones, estado, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Proyecto actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM PROYECTO WHERE id_Proyecto = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Proyecto eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── PROYECTO_CAMION ───────────────────────────────────────────────────────────
exports.getCamiones = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM PROYECTO_CAMION WHERE id_Proyecto = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};
exports.createCamion = async (req, res) => {
    const { Placa, personal_manejando, fecha_hora_entrada, fecha_hora_salida } = req.body;
    try {
        const [r] = await db.query(
            'INSERT INTO PROYECTO_CAMION (id_Proyecto,Placa,personal_manejando,fecha_hora_entrada,fecha_hora_salida) VALUES (?,?,?,?,?)',
            [req.params.id, Placa, personal_manejando, fecha_hora_entrada, fecha_hora_salida]
        );
        res.status(201).json({ message: 'Camión en proyecto creado', id: r.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.deleteCamion = async (req, res) => {
    try {
        const [r] = await db.query('DELETE FROM PROYECTO_CAMION WHERE id=? AND id_Proyecto=?', [req.params.cid, req.params.id]);
        if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Camión en proyecto eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── PROYECTO_DOCUMENTACION ────────────────────────────────────────────────────
exports.getDocumentacion = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM PROYECTO_DOCUMENTACION WHERE id_Proyecto = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};
exports.createDocumentacion = async (req, res) => {
    const { pdf_url } = req.body;
    try {
        const [r] = await db.query('INSERT INTO PROYECTO_DOCUMENTACION (id_Proyecto,pdf_url) VALUES (?,?)', [req.params.id, pdf_url]);
        res.status(201).json({ message: 'Documentación creada', id: r.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.deleteDocumentacion = async (req, res) => {
    try {
        const [r] = await db.query('DELETE FROM PROYECTO_DOCUMENTACION WHERE id=? AND id_Proyecto=?', [req.params.did, req.params.id]);
        if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Documentación eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── PROYECTO_INVENTARIO ───────────────────────────────────────────────────────
exports.getInventario = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM PROYECTO_INVENTARIO WHERE id_Proyecto = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};
exports.createInventario = async (req, res) => {
    const { Id_Objeto, cantidad_objeto, estado_post, fecha_salida, fecha_retorno, metodo_traslado } = req.body;
    try {
        const [r] = await db.query(
            'INSERT INTO PROYECTO_INVENTARIO (id_Proyecto,Id_Objeto,cantidad_objeto,estado_post,fecha_salida,fecha_retorno,metodo_traslado) VALUES (?,?,?,?,?,?,?)',
            [req.params.id, Id_Objeto, cantidad_objeto, estado_post, fecha_salida, fecha_retorno, metodo_traslado]
        );
        res.status(201).json({ message: 'Inventario en proyecto creado', id: r.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.deleteInventario = async (req, res) => {
    try {
        const [r] = await db.query('DELETE FROM PROYECTO_INVENTARIO WHERE id=? AND id_Proyecto=?', [req.params.iid, req.params.id]);
        if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario en proyecto eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
