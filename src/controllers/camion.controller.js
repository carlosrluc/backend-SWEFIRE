const db = require('../config/db');

// ── CAMION ────────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await db.query(
            `SELECT C.*, F.nombre_comercial as Fabricante_Nombre 
             FROM CAMION C 
             LEFT JOIN FABRICANTE F ON C.ID_Fabricante = F.ID_Fabricante 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const countResult = await db.query('SELECT COUNT(*) as total FROM CAMION');
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

exports.getByPlaca = async (req, res) => {
    try {
        const rows = await db.query(
            `SELECT C.*, F.nombre_comercial as Fabricante_Nombre 
             FROM CAMION C 
             LEFT JOIN FABRICANTE F ON C.ID_Fabricante = F.ID_Fabricante 
             WHERE C.Placa = ?`, 
            [req.params.placa]
        );
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { Placa, nombre, ano_fabricacion, modelo, color, caracteristicas,
        revision_tecnica, fecha_prox_revision, ID_Fabricante, tarjeta_propiedad,
        vencimiento_tarjeta, soat_n_poliza, soat_empresa, soat_precio, soat_dia_pago } = req.body;
    try {
        await db.query(
            `INSERT INTO CAMION (Placa,nombre,ano_fabricacion,modelo,color,caracteristicas,revision_tecnica,
             fecha_prox_revision,ID_Fabricante,tarjeta_propiedad,vencimiento_tarjeta,soat_n_poliza,
             soat_empresa,soat_precio,soat_dia_pago) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [Placa, nombre, ano_fabricacion, modelo, color, caracteristicas, revision_tecnica,
             fecha_prox_revision, ID_Fabricante, tarjeta_propiedad, vencimiento_tarjeta,
             soat_n_poliza, soat_empresa, soat_precio, soat_dia_pago]
        );
        res.status(201).json({ message: 'Camión creado', Placa });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { nombre, ano_fabricacion, modelo, color, caracteristicas, revision_tecnica,
        fecha_prox_revision, ID_Fabricante, tarjeta_propiedad, vencimiento_tarjeta,
        soat_n_poliza, soat_empresa, soat_precio, soat_dia_pago } = req.body;
    try {
        const [result] = await db.query(
            `UPDATE CAMION SET nombre=?,ano_fabricacion=?,modelo=?,color=?,caracteristicas=?,revision_tecnica=?,
             fecha_prox_revision=?,ID_Fabricante=?,tarjeta_propiedad=?,vencimiento_tarjeta=?,soat_n_poliza=?,
             soat_empresa=?,soat_precio=?,soat_dia_pago=? WHERE Placa=?`,
            [nombre, ano_fabricacion, modelo, color, caracteristicas, revision_tecnica,
             fecha_prox_revision, ID_Fabricante, tarjeta_propiedad, vencimiento_tarjeta,
             soat_n_poliza, soat_empresa, soat_precio, soat_dia_pago, req.params.placa]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Camión actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM CAMION WHERE Placa = ?', [req.params.placa]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Camión eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── CAMION_MANTENIMIENTO ──────────────────────────────────────────────────────
exports.getMantenimientos = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM CAMION_MANTENIMIENTO WHERE Placa = ?', [req.params.placa])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createMantenimiento = async (req, res) => {
    const { fecha_ultimo_mant, responsable, razon, contacto_responsable, pdf_mantenimiento } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO CAMION_MANTENIMIENTO (Placa,fecha_ultimo_mant,responsable,razon,contacto_responsable,pdf_mantenimiento) VALUES (?,?,?,?,?,?)',
            [req.params.placa, fecha_ultimo_mant, responsable, razon, contacto_responsable, pdf_mantenimiento]
        );
        res.status(201).json({ message: 'Mantenimiento creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteMantenimiento = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM CAMION_MANTENIMIENTO WHERE id=? AND Placa=?', [req.params.mid, req.params.placa]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Mantenimiento eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── CAMION_INVENTARIO ─────────────────────────────────────────────────────────
exports.getCamionInventario = async (req, res) => {
    try { res.json(await db.query('SELECT CI.*, I.nombre_objeto as Objeto_Nombre FROM CAMION_INVENTARIO CI LEFT JOIN INVENTARIO I ON CI.Id_Objeto = I.Id_Objeto WHERE CI.Placa = ?', [req.params.placa])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createCamionInventario = async (req, res) => {
    const { Id_Objeto, cantidad_requerida, cantidad_actual, ubicacion_en_camion, requerido_legal } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO CAMION_INVENTARIO (Placa,Id_Objeto,cantidad_requerida,cantidad_actual,ubicacion_en_camion,requerido_legal) VALUES (?,?,?,?,?,?)',
            [req.params.placa, Id_Objeto, cantidad_requerida, cantidad_actual, ubicacion_en_camion, requerido_legal]
        );
        res.status(201).json({ message: 'Ítem de inventario añadido al camión', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteCamionInventario = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM CAMION_INVENTARIO WHERE id=? AND Placa=?', [req.params.iid, req.params.placa]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Ítem de inventario eliminado del camión' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
