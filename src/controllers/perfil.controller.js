const db = require('../config/db');

// ── PERFIL ────────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await db.query(
            'SELECT * FROM PERFIL LIMIT ? OFFSET ?',
            [limit, offset]
        );

        const countResult = await db.query('SELECT COUNT(*) as total FROM PERFIL');
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
        const rows = await db.query('SELECT * FROM PERFIL WHERE DNI = ?', [req.params.dni]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { DNI, Nombre, Apellido, Genero, RUC, fecha_nacimiento, correo_contacto,
        telefono_contacto, estado_civil, distrito_residencia, seguro_vida_ley,
        aficiones, experiencia, comentarios, estado, alergias, condicion_medica,
        profesion, nro_cta_bancaria, cv, foto_perfil } = req.body;
    try {
        await db.query(
            `INSERT INTO PERFIL (DNI,Nombre,Apellido,Genero,RUC,fecha_nacimiento,
             correo_contacto,telefono_contacto,estado_civil,distrito_residencia,
             seguro_vida_ley,aficiones,experiencia,comentarios,estado,alergias,
             condicion_medica,profesion,nro_cta_bancaria,cv,foto_perfil)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [DNI, Nombre, Apellido, Genero, RUC, fecha_nacimiento, correo_contacto,
             telefono_contacto, estado_civil, distrito_residencia, seguro_vida_ley,
             aficiones, experiencia, comentarios, estado, alergias, condicion_medica,
             profesion, nro_cta_bancaria, cv, foto_perfil]
        );
        res.status(201).json({ message: 'Perfil creado', DNI });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { Nombre, Apellido, Genero, RUC, fecha_nacimiento, correo_contacto,
        telefono_contacto, estado_civil, distrito_residencia, seguro_vida_ley,
        aficiones, experiencia, comentarios, estado, alergias, condicion_medica,
        profesion, nro_cta_bancaria, cv, foto_perfil } = req.body;
    try {
        const [result] = await db.query(
            `UPDATE PERFIL SET Nombre=?,Apellido=?,Genero=?,RUC=?,fecha_nacimiento=?,
             correo_contacto=?,telefono_contacto=?,estado_civil=?,distrito_residencia=?,
             seguro_vida_ley=?,aficiones=?,experiencia=?,comentarios=?,estado=?,
             alergias=?,condicion_medica=?,profesion=?,nro_cta_bancaria=?,cv=?,foto_perfil=?
             WHERE DNI=?`,
            [Nombre, Apellido, Genero, RUC, fecha_nacimiento, correo_contacto,
             telefono_contacto, estado_civil, distrito_residencia, seguro_vida_ley,
             aficiones, experiencia, comentarios, estado, alergias, condicion_medica,
             profesion, nro_cta_bancaria, cv, foto_perfil, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Perfil actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM PERFIL WHERE DNI = ?', [req.params.dni]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Perfil eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── PERFIL_EDUCACION ──────────────────────────────────────────────────────────
exports.getEducacion = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM PERFIL_EDUCACION WHERE DNI_perfil = ?', [req.params.dni]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createEducacion = async (req, res) => {
    const { nombre_educacion, nivel_educacion, institucion } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO PERFIL_EDUCACION (DNI_perfil,nombre_educacion,nivel_educacion,institucion) VALUES (?,?,?,?)',
            [req.params.dni, nombre_educacion, nivel_educacion, institucion]
        );
        res.status(201).json({ message: 'Educación creada', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateEducacion = async (req, res) => {
    const { nombre_educacion, nivel_educacion, institucion } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE PERFIL_EDUCACION SET nombre_educacion=?,nivel_educacion=?,institucion=? WHERE id=? AND DNI_perfil=?',
            [nombre_educacion, nivel_educacion, institucion, req.params.id, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Educación actualizada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteEducacion = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM PERFIL_EDUCACION WHERE id=? AND DNI_perfil=?', [req.params.id, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Educación eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── PERFIL_BREVETE ────────────────────────────────────────────────────────────
exports.getBrevete = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM PERFIL_BREVETE WHERE DNI_perfil = ?', [req.params.dni]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createBrevete = async (req, res) => {
    const { categoria, pdf_brevete, fecha_vencimiento } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO PERFIL_BREVETE (DNI_perfil,categoria,pdf_brevete,fecha_vencimiento) VALUES (?,?,?,?)',
            [req.params.dni, categoria, pdf_brevete, fecha_vencimiento]
        );
        res.status(201).json({ message: 'Brevete creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateBrevete = async (req, res) => {
    const { categoria, pdf_brevete, fecha_vencimiento } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE PERFIL_BREVETE SET categoria=?,pdf_brevete=?,fecha_vencimiento=? WHERE id=? AND DNI_perfil=?',
            [categoria, pdf_brevete, fecha_vencimiento, req.params.id, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Brevete actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteBrevete = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM PERFIL_BREVETE WHERE id=? AND DNI_perfil=?', [req.params.id, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Brevete eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── PERFIL_CERTIFICACION ──────────────────────────────────────────────────────
exports.getCertificacion = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM PERFIL_CERTIFICACION WHERE DNI_perfil = ?', [req.params.dni]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createCertificacion = async (req, res) => {
    const { nombre, institucion, fecha_validez, foto } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO PERFIL_CERTIFICACION (DNI_perfil,nombre,institucion,fecha_validez,foto) VALUES (?,?,?,?,?)',
            [req.params.dni, nombre, institucion, fecha_validez, foto]
        );
        res.status(201).json({ message: 'Certificación creada', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateCertificacion = async (req, res) => {
    const { nombre, institucion, fecha_validez, foto } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE PERFIL_CERTIFICACION SET nombre=?,institucion=?,fecha_validez=?,foto=? WHERE id=? AND DNI_perfil=?',
            [nombre, institucion, fecha_validez, foto, req.params.id, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Certificación actualizada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteCertificacion = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM PERFIL_CERTIFICACION WHERE id=? AND DNI_perfil=?', [req.params.id, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Certificación eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
