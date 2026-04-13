const db = require('../config/db');

// ── INVENTARIO ────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await db.query(
            'SELECT * FROM INVENTARIO LIMIT ? OFFSET ?',
            [limit, offset]
        );

        const countResult = await db.query('SELECT COUNT(*) as total FROM INVENTARIO');
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
        const rows = await db.query('SELECT * FROM INVENTARIO WHERE Id_Objeto = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { lugar_almacenaje, cantidad, nombre_objeto, ID_Fabricante, orden_compra,
        fecha_compra, factura, garantia, numero_serial, ano_fabricacion, peso,
        estado, precio_compra, precio_envio, responsable_envio, precio_comercial,
        mant_requerimiento, mant_ultimo, mant_fecha_caducidad, mant_responsable, mant_contacto } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO INVENTARIO (lugar_almacenaje,cantidad,nombre_objeto,ID_Fabricante,orden_compra,
             fecha_compra,factura,garantia,numero_serial,ano_fabricacion,peso,estado,precio_compra,
             precio_envio,responsable_envio,precio_comercial,mant_requerimiento,mant_ultimo,
             mant_fecha_caducidad,mant_responsable,mant_contacto)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [lugar_almacenaje, cantidad, nombre_objeto, ID_Fabricante, orden_compra,
             fecha_compra, factura, garantia, numero_serial, ano_fabricacion, peso,
             estado, precio_compra, precio_envio, responsable_envio, precio_comercial,
             mant_requerimiento, mant_ultimo, mant_fecha_caducidad, mant_responsable, mant_contacto]
        );
        res.status(201).json({ message: 'Inventario creado', Id_Objeto: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { lugar_almacenaje, cantidad, nombre_objeto, ID_Fabricante, orden_compra,
        fecha_compra, factura, garantia, numero_serial, ano_fabricacion, peso,
        estado, precio_compra, precio_envio, responsable_envio, precio_comercial,
        mant_requerimiento, mant_ultimo, mant_fecha_caducidad, mant_responsable, mant_contacto } = req.body;
    try {
        const [result] = await db.query(
            `UPDATE INVENTARIO SET lugar_almacenaje=?,cantidad=?,nombre_objeto=?,ID_Fabricante=?,orden_compra=?,
             fecha_compra=?,factura=?,garantia=?,numero_serial=?,ano_fabricacion=?,peso=?,estado=?,precio_compra=?,
             precio_envio=?,responsable_envio=?,precio_comercial=?,mant_requerimiento=?,mant_ultimo=?,
             mant_fecha_caducidad=?,mant_responsable=?,mant_contacto=? WHERE Id_Objeto=?`,
            [lugar_almacenaje, cantidad, nombre_objeto, ID_Fabricante, orden_compra,
             fecha_compra, factura, garantia, numero_serial, ano_fabricacion, peso,
             estado, precio_compra, precio_envio, responsable_envio, precio_comercial,
             mant_requerimiento, mant_ultimo, mant_fecha_caducidad, mant_responsable, mant_contacto,
             req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM INVENTARIO WHERE Id_Objeto = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── INVENTARIO_USO ────────────────────────────────────────────────────────────
exports.getUsos = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM INVENTARIO_USO WHERE Id_Objeto = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createUso = async (req, res) => {
    const { uso } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO INVENTARIO_USO (Id_Objeto, uso) VALUES (?,?)',
            [req.params.id, uso]
        );
        res.status(201).json({ message: 'Uso creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteUso = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM INVENTARIO_USO WHERE id=? AND Id_Objeto=?', [req.params.uid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Uso eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
