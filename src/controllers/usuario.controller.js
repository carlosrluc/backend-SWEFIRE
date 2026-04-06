const db = require('../config/db');

exports.getAll = async (req, res) => {
    try {
        const rows = await db.query('SELECT idusuario,dni_perfil,rol,correo FROM USUARIO');
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        const rows = await db.query(
            'SELECT idusuario,dni_perfil,rol,correo FROM USUARIO WHERE idusuario = ?',
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { dni_perfil, rol, contrasena, correo } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO USUARIO (dni_perfil,rol,contrasena,correo) VALUES (?,?,?,?)',
            [dni_perfil, rol, contrasena, correo]
        );
        res.status(201).json({ message: 'Usuario creado', idusuario: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { dni_perfil, rol, contrasena, correo } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE USUARIO SET dni_perfil=?,rol=?,contrasena=?,correo=? WHERE idusuario=?',
            [dni_perfil, rol, contrasena, correo, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Usuario actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM USUARIO WHERE idusuario = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Usuario eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
