const db = require('../config/db');

// ── CLIENTE ───────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM CLIENTE')); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM CLIENTE WHERE DNI_O_RUC = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { DNI_O_RUC, nombre_comercial, razon_social, rubro, ubicacion_facturacion, observacion } = req.body;
    try {
        await db.query(
            'INSERT INTO CLIENTE (DNI_O_RUC,nombre_comercial,razon_social,rubro,ubicacion_facturacion,observacion) VALUES (?,?,?,?,?,?)',
            [DNI_O_RUC, nombre_comercial, razon_social, rubro, ubicacion_facturacion, observacion]
        );
        res.status(201).json({ message: 'Cliente creado', DNI_O_RUC });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { nombre_comercial, razon_social, rubro, ubicacion_facturacion, observacion } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE CLIENTE SET nombre_comercial=?,razon_social=?,rubro=?,ubicacion_facturacion=?,observacion=? WHERE DNI_O_RUC=?',
            [nombre_comercial, razon_social, rubro, ubicacion_facturacion, observacion, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Cliente actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM CLIENTE WHERE DNI_O_RUC = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Cliente eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── CLIENTE_CONTACTO ──────────────────────────────────────────────────────────
exports.getContactos = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM CLIENTE_CONTACTO WHERE DNI_O_RUC = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createContacto = async (req, res) => {
    const { DNI_perfil, cargo_en_empresa, lugar_trabajo } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO CLIENTE_CONTACTO (DNI_O_RUC,DNI_perfil,cargo_en_empresa,lugar_trabajo) VALUES (?,?,?,?)',
            [req.params.id, DNI_perfil, cargo_en_empresa, lugar_trabajo]
        );
        res.status(201).json({ message: 'Contacto creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateContacto = async (req, res) => {
    const { DNI_perfil, cargo_en_empresa, lugar_trabajo } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE CLIENTE_CONTACTO SET DNI_perfil=?,cargo_en_empresa=?,lugar_trabajo=? WHERE id=? AND DNI_O_RUC=?',
            [DNI_perfil, cargo_en_empresa, lugar_trabajo, req.params.cid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Contacto actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteContacto = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM CLIENTE_CONTACTO WHERE id=? AND DNI_O_RUC=?', [req.params.cid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Contacto eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── CLIENTE_TELEFONO_MOVIL ────────────────────────────────────────────────────
exports.getTelefonosMovil = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM CLIENTE_TELEFONO_MOVIL WHERE DNI_O_RUC = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createTelefonoMovil = async (req, res) => {
    const { telefono, persona } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO CLIENTE_TELEFONO_MOVIL (DNI_O_RUC,telefono,persona) VALUES (?,?,?)',
            [req.params.id, telefono, persona]
        );
        res.status(201).json({ message: 'Teléfono móvil creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteTelefonoMovil = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM CLIENTE_TELEFONO_MOVIL WHERE id=? AND DNI_O_RUC=?', [req.params.cid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Teléfono móvil eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── CLIENTE_CORREO ────────────────────────────────────────────────────────────
exports.getCorreos = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM CLIENTE_CORREO WHERE DNI_O_RUC = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createCorreo = async (req, res) => {
    const { correo, rama } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO CLIENTE_CORREO (DNI_O_RUC,correo,rama) VALUES (?,?,?)',
            [req.params.id, correo, rama]
        );
        res.status(201).json({ message: 'Correo creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteCorreo = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM CLIENTE_CORREO WHERE id=? AND DNI_O_RUC=?', [req.params.cid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Correo eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── CLIENTE_TELEFONO_FIJO ─────────────────────────────────────────────────────
exports.getTelefonosFijo = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM CLIENTE_TELEFONO_FIJO WHERE DNI_O_RUC = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createTelefonoFijo = async (req, res) => {
    const { numero, anexo, descripcion_anexo } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO CLIENTE_TELEFONO_FIJO (DNI_O_RUC,numero,anexo,descripcion_anexo) VALUES (?,?,?,?)',
            [req.params.id, numero, anexo, descripcion_anexo]
        );
        res.status(201).json({ message: 'Teléfono fijo creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteTelefonoFijo = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM CLIENTE_TELEFONO_FIJO WHERE id=? AND DNI_O_RUC=?', [req.params.cid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Teléfono fijo eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
