const db = require('../config/db');

// ── PRESUPUESTO_INTERNO ───────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await db.query(
            `SELECT PI.*, CC.nombre as Cotizacion_Nombre 
             FROM PRESUPUESTO_INTERNO PI 
             LEFT JOIN COTIZACION_COMERCIAL CC ON PI.ID_Cotizacion = CC.ID 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const countResult = await db.query('SELECT COUNT(*) as total FROM PRESUPUESTO_INTERNO');
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
        const rows = await db.query(
            `SELECT PI.*, CC.nombre as Cotizacion_Nombre 
             FROM PRESUPUESTO_INTERNO PI 
             LEFT JOIN COTIZACION_COMERCIAL CC ON PI.ID_Cotizacion = CC.ID 
             WHERE PI.ID = ?`, 
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { ID_Cotizacion, costos_indirectos, coste_total_estimado } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO PRESUPUESTO_INTERNO (ID_Cotizacion,costos_indirectos,coste_total_estimado) VALUES (?,?,?)',
            [ID_Cotizacion, costos_indirectos, coste_total_estimado]
        );
        res.status(201).json({ message: 'Presupuesto creado', ID: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { ID_Cotizacion, costos_indirectos, coste_total_estimado } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE PRESUPUESTO_INTERNO SET ID_Cotizacion=?,costos_indirectos=?,coste_total_estimado=? WHERE ID=?',
            [ID_Cotizacion, costos_indirectos, coste_total_estimado, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Presupuesto actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM PRESUPUESTO_INTERNO WHERE ID = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Presupuesto eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Sub-tablas de PRESUPUESTO ─────────────────────────────────────────────────

const makeSubCRUD = (table, idCol, fields, insertFields) => ({
    getAll: async (req, res) => {
        try { res.json(await db.query(`SELECT * FROM ${table} WHERE ${idCol} = ?`, [req.params.id])); }
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    create: async (req, res) => {
        const vals = fields.map(f => req.body[f]);
        try {
            const [result] = await db.query(
                `INSERT INTO ${table} (${idCol},${insertFields}) VALUES (${fields.map(() => '?').join(',')},${fields.map(() => '?').join(',')})`,
                [req.params.id, ...vals, req.params.id, ...vals]
            );
            res.status(201).json({ message: 'Creado', id: result.insertId });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    remove: async (req, res) => {
        try {
            const [result] = await db.query(`DELETE FROM ${table} WHERE id=? AND ${idCol}=?`, [req.params.sid, req.params.id]);
            if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
            res.json({ message: 'Eliminado' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }
});

// Material Directo
exports.getMaterialDirecto = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM PRESUPUESTO_MATERIAL_DIRECTO WHERE ID_Presupuesto = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};
exports.createMaterialDirecto = async (req, res) => {
    const { nombre, costo } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO PRESUPUESTO_MATERIAL_DIRECTO (ID_Presupuesto,nombre,costo) VALUES (?,?,?)',
            [req.params.id, nombre, costo]
        );
        res.status(201).json({ message: 'Material directo creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.deleteMaterialDirecto = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM PRESUPUESTO_MATERIAL_DIRECTO WHERE id=? AND ID_Presupuesto=?', [req.params.sid, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Material directo eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Mano de Obra
exports.getManoObra = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM PRESUPUESTO_MANO_OBRA WHERE ID_Presupuesto = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};
exports.createManoObra = async (req, res) => {
    const { profesion_ejercida, costo_x_hora, costo_general } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO PRESUPUESTO_MANO_OBRA (ID_Presupuesto,profesion_ejercida,costo_x_hora,costo_general) VALUES (?,?,?,?)',
            [req.params.id, profesion_ejercida, costo_x_hora, costo_general]
        );
        res.status(201).json({ message: 'Mano de obra creada', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.deleteManoObra = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM PRESUPUESTO_MANO_OBRA WHERE id=? AND ID_Presupuesto=?', [req.params.sid, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Mano de obra eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Servicio
exports.getServicio = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM PRESUPUESTO_SERVICIO WHERE ID_Presupuesto = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};
exports.createServicio = async (req, res) => {
    const { nombre_servicio, costo } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO PRESUPUESTO_SERVICIO (ID_Presupuesto,nombre_servicio,costo) VALUES (?,?,?)',
            [req.params.id, nombre_servicio, costo]
        );
        res.status(201).json({ message: 'Servicio de presupuesto creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.deleteServicio = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM PRESUPUESTO_SERVICIO WHERE id=? AND ID_Presupuesto=?', [req.params.sid, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio de presupuesto eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Costo Indirecto
exports.getCostoIndirecto = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM PRESUPUESTO_COSTO_INDIRECTO WHERE ID_Presupuesto = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};
exports.createCostoIndirecto = async (req, res) => {
    const { nombre_costo, costo } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO PRESUPUESTO_COSTO_INDIRECTO (ID_Presupuesto,nombre_costo,costo) VALUES (?,?,?)',
            [req.params.id, nombre_costo, costo]
        );
        res.status(201).json({ message: 'Costo indirecto creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.deleteCostoIndirecto = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM PRESUPUESTO_COSTO_INDIRECTO WHERE id=? AND ID_Presupuesto=?', [req.params.sid, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Costo indirecto eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Gasto Administrativo
exports.getGastoAdmin = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM PRESUPUESTO_GASTO_ADMIN WHERE ID_Presupuesto = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};
exports.createGastoAdmin = async (req, res) => {
    const { nombre_gasto, costo } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO PRESUPUESTO_GASTO_ADMIN (ID_Presupuesto,nombre_gasto,costo) VALUES (?,?,?)',
            [req.params.id, nombre_gasto, costo]
        );
        res.status(201).json({ message: 'Gasto admin creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.deleteGastoAdmin = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM PRESUPUESTO_GASTO_ADMIN WHERE id=? AND ID_Presupuesto=?', [req.params.sid, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Gasto admin eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
