const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_swefire';

// Paginación y Ocultamiento de contraseñas
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await db.query(
            `SELECT U.idusuario, U.dni_perfil, U.rol, U.correo, P.Nombre as Perfil_Nombre, P.Apellido as Perfil_Apellido 
             FROM USUARIO U 
             LEFT JOIN PERFIL P ON U.dni_perfil = P.DNI 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        const countResult = await db.query('SELECT COUNT(*) as total FROM USUARIO');
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
            `SELECT U.idusuario, U.dni_perfil, U.rol, U.correo, P.Nombre as Perfil_Nombre, P.Apellido as Perfil_Apellido 
             FROM USUARIO U 
             LEFT JOIN PERFIL P ON U.dni_perfil = P.DNI 
             WHERE U.idusuario = ?`,
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Auto creación de perfil y hashing
exports.create = async (req, res) => {
    const { dni_perfil, rol, contrasena, correo, nombre, apellido } = req.body;
    try {
        if (!contrasena) {
            return res.status(400).json({ error: "La contraseña es requerida" });
        }
        
        // Crear perfil si no existe (con datos básicos o "Pendiente")
        await db.query(
            'INSERT IGNORE INTO PERFIL (DNI, nombre, apellidos, rol) VALUES (?, ?, ?, ?)',
            [dni_perfil, nombre || 'Pendiente', apellido || 'Pendiente', rol || 'Cliente']
        );

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

        const result = await db.query(
            'INSERT INTO USUARIO (dni_perfil,rol,contrasena,correo,temp_pass_unhashed) VALUES (?,?,?,?,?)',
            [dni_perfil, rol, hashedPassword, correo, contrasena]
        );
        res.status(201).json({ message: 'Usuario creado y perfil asegurado', idusuario: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { dni_perfil, rol, contrasena, correo } = req.body;
    try {
        let result;
        if (contrasena) {
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(contrasena, saltRounds);
            result = await db.query(
                'UPDATE USUARIO SET dni_perfil=?,rol=?,contrasena=?,correo=? WHERE idusuario=?',
                [dni_perfil, rol, hashedPassword, correo, req.params.id]
            );
        } else {
            result = await db.query(
                'UPDATE USUARIO SET dni_perfil=?,rol=?,correo=? WHERE idusuario=?',
                [dni_perfil, rol, correo, req.params.id]
            );
        }
        
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Usuario actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM USUARIO WHERE idusuario = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Usuario eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.login = async (req, res) => {
    const correo = req.body.correo || req.body.username;
    const contrasena = req.body.contrasena || req.body.password;
    try {
        const rows = await db.query('SELECT * FROM USUARIO WHERE correo = ?', [correo]);
        if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

        const user = rows[0];
        
        let match = false;
        // Check text password for backwards compatibility, otherwise bcrypt
        if (user.contrasena && !user.contrasena.startsWith('$2')) {
            match = (user.contrasena === contrasena);
        } else {
            match = await bcrypt.compare(contrasena, user.contrasena);
        }
        
        if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });

        const token = jwt.sign(
            { idusuario: user.idusuario, dni_perfil: user.dni_perfil, rol: user.rol, correo: user.correo },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const { contrasena: unneeded, temp_pass_unhashed: tempUnneeded, ...userData } = user;
        res.json({ message: 'Login exitoso', token, access_token: token, user: userData });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getTempPassword = async (req, res) => {
    try {
        const rows = await db.query('SELECT temp_pass_unhashed FROM USUARIO WHERE correo = ?', [req.params.correo]);
        if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ correo: req.params.correo, password: rows[0].temp_pass_unhashed });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
