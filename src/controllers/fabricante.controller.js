const db = require('../config/db');

// ── FABRICANTE ────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await db.query(
            'SELECT * FROM FABRICANTE LIMIT ? OFFSET ?',
            [limit, offset]
        );

        const countResult = await db.query('SELECT COUNT(*) as total FROM FABRICANTE');
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
        const rows = await db.query('SELECT * FROM FABRICANTE WHERE ID_Fabricante = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { nombre_comercial, ubicacion, rubro, descripcion, comentarios, pago } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO FABRICANTE (nombre_comercial,ubicacion,rubro,descripcion,comentarios,pago) VALUES (?,?,?,?,?,?)',
            [nombre_comercial, ubicacion, rubro, descripcion, comentarios, pago]
        );
        res.status(201).json({ message: 'Fabricante creado', ID_Fabricante: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { nombre_comercial, ubicacion, rubro, descripcion, comentarios, pago } = req.body;
    try {
        const result = await db.query(
            'UPDATE FABRICANTE SET nombre_comercial=?,ubicacion=?,rubro=?,descripcion=?,comentarios=?,pago=? WHERE ID_Fabricante=?',
            [nombre_comercial, ubicacion, rubro, descripcion, comentarios, pago, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Fabricante actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM FABRICANTE WHERE ID_Fabricante = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Fabricante eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── FABRICANTE_CONTACTO ───────────────────────────────────────────────────────
exports.getContactos = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM FABRICANTE_CONTACTO WHERE ID_Fabricante = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createContacto = async (req, res) => {
    const { persona_contacto, correo_contacto, numero_contacto, anexo_contacto, area_contacto, idioma } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO FABRICANTE_CONTACTO (ID_Fabricante,persona_contacto,correo_contacto,numero_contacto,anexo_contacto,area_contacto,idioma) VALUES (?,?,?,?,?,?,?)',
            [req.params.id, persona_contacto, correo_contacto, numero_contacto, anexo_contacto, area_contacto, idioma]
        );
        res.status(201).json({ message: 'Contacto creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateContacto = async (req, res) => {
    const { persona_contacto, correo_contacto, numero_contacto, anexo_contacto, area_contacto, idioma } = req.body;
    try {
        const result = await db.query(
            'UPDATE FABRICANTE_CONTACTO SET persona_contacto=?,correo_contacto=?,numero_contacto=?,anexo_contacto=?,area_contacto=?,idioma=? WHERE id=? AND ID_Fabricante=?',
            [persona_contacto, correo_contacto, numero_contacto, anexo_contacto, area_contacto, idioma, req.params.cid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Contacto actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteContacto = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM FABRICANTE_CONTACTO WHERE id=? AND ID_Fabricante=?', [req.params.cid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Contacto eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
